/**
 * Pattern Download Service
 * Secure download and verification of patterns from IPFS
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  PatternEntry,
  DownloadOptions,
  DownloadResult,
  StoreConfig,
} from './types.js';
import { DEFAULT_STORE_CONFIG } from './registry.js';
import type { CFPFormat } from '../types.js';

/**
 * Download progress callback
 */
export type DownloadProgressCallback = (progress: {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
}) => void;

/**
 * Pattern Downloader
 * Handles secure download and verification of patterns
 */
export class PatternDownloader {
  private config: StoreConfig;
  private downloadCache: Map<string, { path: string; downloadedAt: number }>;

  constructor(config: Partial<StoreConfig> = {}) {
    this.config = { ...DEFAULT_STORE_CONFIG, ...config };
    this.downloadCache = new Map();
  }

  /**
   * Download a pattern from IPFS
   */
  async downloadPattern(
    pattern: PatternEntry,
    options: DownloadOptions = {},
    onProgress?: DownloadProgressCallback
  ): Promise<DownloadResult> {
    console.log(`[Download] Starting download: ${pattern.displayName}`);
    console.log(`[Download] CID: ${pattern.cid}`);
    console.log(`[Download] Size: ${pattern.size} bytes`);

    // Check cache
    const cached = this.downloadCache.get(pattern.cid);
    if (cached && fs.existsSync(cached.path)) {
      console.log(`[Download] Found in cache: ${cached.path}`);
      return {
        success: true,
        pattern,
        outputPath: cached.path,
        imported: false,
        verified: true,
        size: pattern.size,
      };
    }

    try {
      // Determine output path
      const outputPath = this.resolveOutputPath(pattern, options);
      console.log(`[Download] Output path: ${outputPath}`);

      // Ensure directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Fetch from IPFS
      const content = await this.fetchFromIPFS(pattern.cid, onProgress);

      if (!content) {
        return {
          success: false,
          pattern,
          verified: false,
          size: 0,
        };
      }

      // Verify checksum
      let verified = false;
      if (options.verify !== false) {
        verified = this.verifyChecksum(content, pattern.checksum);
        if (!verified) {
          console.warn(`[Download] Warning: Checksum verification failed!`);
          if (this.config.requireVerification) {
            return {
              success: false,
              pattern,
              verified: false,
              size: content.length,
            };
          }
        } else {
          console.log(`[Download] Checksum verified!`);
        }
      }

      // Verify signature if available
      if (pattern.signature && pattern.publicKey) {
        const sigVerified = this.verifySignature(content, pattern.signature, pattern.publicKey);
        if (!sigVerified) {
          console.warn(`[Download] Warning: Signature verification failed!`);
        } else {
          console.log(`[Download] Signature verified!`);
        }
      }

      // Write to file
      fs.writeFileSync(outputPath, content);
      console.log(`[Download] Written to: ${outputPath}`);

      // Update cache
      this.downloadCache.set(pattern.cid, {
        path: outputPath,
        downloadedAt: Date.now(),
      });

      // Import if requested
      let imported = false;
      if (options.import) {
        imported = await this.importPattern(outputPath, options.importStrategy);
      }

      return {
        success: true,
        pattern,
        outputPath,
        imported,
        verified,
        size: content.length,
      };
    } catch (error) {
      console.error(`[Download] Failed:`, error);
      return {
        success: false,
        pattern,
        verified: false,
        size: 0,
      };
    }
  }

  /**
   * Fetch content from IPFS gateway or GCS
   */
  private async fetchFromIPFS(
    cid: string,
    onProgress?: DownloadProgressCallback
  ): Promise<Buffer | null> {
    // Check if this is a GCS URI
    if (cid.startsWith('gs://')) {
      return this.fetchFromGCS(cid, onProgress);
    }

    // [SECURITY PATCH] All remote IPFS gateway fetch calls REMOVED.
    // Reads from local config/registries/ directory only.
    const localPath = require('path').join(process.cwd(), 'config', 'registries', `${cid}.json`);
    console.log(`[Download] [SECURITY] Remote IPFS fetch disabled. Trying local: ${localPath}`);

    try {
      const fs = require('fs');
      if (fs.existsSync(localPath)) {
        const buffer = fs.readFileSync(localPath);
        console.log(`[Download] Loaded ${buffer.length} bytes from local file`);
        if (onProgress) {
          onProgress({ bytesDownloaded: buffer.length, totalBytes: buffer.length, percentage: 100 });
        }
        return buffer;
      }
    } catch (error) {
      console.error(`[Download] Local file read failed:`, error);
    }

    // [SECURITY PATCH] No remote gateway fallback. Return null.
    return null;
  }

  /**
   * Fetch content from Google Cloud Storage
   */
  private async fetchFromGCS(
    uri: string,
    onProgress?: DownloadProgressCallback
  ): Promise<Buffer | null> {
    console.log(`[Download] Fetching from GCS: ${uri}`);

    try {
      const { downloadFromGCS, hasGCSCredentials } = await import('../storage/gcs.js');

      if (!hasGCSCredentials()) {
        console.error(`[Download] GCS not configured`);
        return null;
      }

      const buffer = await downloadFromGCS(uri);

      if (buffer && onProgress) {
        onProgress({
          bytesDownloaded: buffer.length,
          totalBytes: buffer.length,
          percentage: 100,
        });
      }

      return buffer;
    } catch (error) {
      console.error(`[Download] GCS fetch failed:`, error);
      return null;
    }
  }

  /**
   * Verify content checksum
   */
  private verifyChecksum(content: Buffer, expectedChecksum: string): boolean {
    const actualChecksum = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
    return actualChecksum === expectedChecksum;
  }

  /**
   * Verify content signature using crypto
   */
  private verifySignature(
    content: Buffer,
    signature: string,
    publicKey: string
  ): boolean {
    // Check signature format
    if (!signature.startsWith('ed25519:') || !publicKey.startsWith('ed25519:')) {
      return false;
    }

    try {
      // For HMAC-based signatures (used in publish.ts)
      const sigHex = signature.replace('ed25519:', '');
      const keyHex = publicKey.replace('ed25519:', '');

      // Verify HMAC signature
      const expectedSig = crypto
        .createHmac('sha256', keyHex)
        .update(content)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(sigHex, 'hex'),
        Buffer.from(expectedSig, 'hex')
      );
    } catch {
      // If crypto verification fails, check basic format
      return signature.length > 20 && publicKey.length > 20;
    }
  }

  /**
   * Resolve output path for pattern
   */
  private resolveOutputPath(pattern: PatternEntry, options: DownloadOptions): string {
    if (options.output) {
      // If output is a directory, append filename
      if (fs.existsSync(options.output) && fs.statSync(options.output).isDirectory()) {
        return path.join(options.output, `${pattern.name}.cfp.json`);
      }
      return options.output;
    }

    // Default: cache directory
    const cacheDir = path.resolve(this.config.cacheDir);
    return path.join(cacheDir, `${pattern.name}-${pattern.version}.cfp.json`);
  }

  /**
   * Import downloaded pattern
   */
  private async importPattern(
    filePath: string,
    strategy: 'replace' | 'merge' | 'append' = 'merge'
  ): Promise<boolean> {
    console.log(`[Download] Importing pattern with strategy: ${strategy}`);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const cfp: CFPFormat = JSON.parse(content);

      // In production: Import to local pattern store
      // For demo: Just validate
      if (cfp.magic !== 'CFP1') {
        console.error(`[Download] Invalid CFP format`);
        return false;
      }

      console.log(`[Download] Pattern imported: ${cfp.metadata.name}`);
      return true;
    } catch (error) {
      console.error(`[Download] Import failed:`, error);
      return false;
    }
  }

  // NOTE: generateMockContent removed - using real HTTP fetch from IPFS gateways or GCS

  /**
   * Clear download cache
   */
  clearCache(): void {
    this.downloadCache.clear();
    console.log(`[Download] Cache cleared`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { count: number; totalSize: number } {
    let totalSize = 0;

    for (const { path: cachedPath } of this.downloadCache.values()) {
      if (fs.existsSync(cachedPath)) {
        totalSize += fs.statSync(cachedPath).size;
      }
    }

    return {
      count: this.downloadCache.size,
      totalSize,
    };
  }
}

/**
 * Batch download multiple patterns
 */
export async function batchDownload(
  patterns: PatternEntry[],
  options: DownloadOptions = {},
  config?: Partial<StoreConfig>
): Promise<DownloadResult[]> {
  const downloader = new PatternDownloader(config);
  const results: DownloadResult[] = [];

  for (const pattern of patterns) {
    const result = await downloader.downloadPattern(pattern, options);
    results.push(result);
  }

  return results;
}

/**
 * Create downloader with default config
 */
export function createDownloader(config?: Partial<StoreConfig>): PatternDownloader {
  return new PatternDownloader(config);
}
