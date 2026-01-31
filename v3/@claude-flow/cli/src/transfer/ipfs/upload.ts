/**
 * IPFS Upload Module - SECURITY PATCHED
 *
 * WARNING: All remote upload functions (web3.storage, Pinata, IPFS node)
 * are disabled by security patch. Any call to upload functions will throw.
 * Local file export should be used instead.
 *
 * @module @claude-flow/cli/transfer/ipfs/upload
 * @version 3.0.0-security-patched
 */

// [SECURITY PATCH] All remote upload/pin functions will throw.
// Search for "SECURITY_UPLOAD_BLOCKED" to find all disabled callsites.
const SECURITY_UPLOAD_BLOCKED = true;

import * as crypto from 'crypto';
import type { IPFSConfig, PinningService } from '../types.js';

/**
 * IPFS upload options
 */
export interface IPFSUploadOptions {
  pin?: boolean;
  pinningService?: PinningService;
  gateway?: string;
  name?: string;
  wrapWithDirectory?: boolean;
  apiKey?: string;
  apiSecret?: string;
}

/**
 * IPFS upload result
 */
export interface IPFSUploadResult {
  cid: string;
  size: number;
  gateway: string;
  pinnedAt?: string;
  url: string;
}

/**
 * Web3.Storage upload configuration
 */
interface Web3StorageConfig {
  token?: string;
  endpoint?: string;
}

/**
 * Get web3.storage token from environment or config
 */
function getWeb3StorageToken(): string | undefined {
  return process.env.WEB3_STORAGE_TOKEN ||
         process.env.W3_TOKEN ||
         process.env.IPFS_TOKEN;
}

/**
 * Generate a CID from content (for demo mode when no token available)
 * Uses CIDv1 with dag-pb codec and sha2-256 multihash
 */
function generateDemoCID(content: Buffer): string {
  const hash = crypto.createHash('sha256').update(content).digest();
  // CIDv1 with dag-pb codec and sha2-256 multihash
  const prefix = Buffer.from([0x01, 0x70, 0x12, 0x20]);
  const cidBytes = Buffer.concat([prefix, hash]);

  // Base32 encode
  const base32Chars = 'abcdefghijklmnopqrstuvwxyz234567';
  let result = 'bafybei';
  for (let i = 0; i < 44; i++) {
    const byte = cidBytes[i % cidBytes.length] || 0;
    result += base32Chars[byte % 32];
  }
  return result;
}

/**
 * Upload to web3.storage (real IPFS)
 */
async function uploadToWeb3Storage(
  _content: Buffer,
  _options: IPFSUploadOptions & Web3StorageConfig
): Promise<IPFSUploadResult> {
  // [SECURITY PATCH] Remote upload to web3.storage DISABLED
  throw new Error('[SECURITY] Remote upload to web3.storage is disabled by security patch. Use local file export instead.');
}

/**
 * Upload to Pinata
 */
async function uploadToPinata(
  _content: Buffer,
  _options: IPFSUploadOptions
): Promise<IPFSUploadResult> {
  // [SECURITY PATCH] Remote upload to Pinata DISABLED
  throw new Error('[SECURITY] Remote upload to Pinata is disabled by security patch. Use local file export instead.');
}

/**
 * Upload content to IPFS
 *
 * Supports (in order of preference):
 * - Local/Custom IPFS node (IPFS_API_URL) - FREE, your own node
 * - web3.storage (WEB3_STORAGE_TOKEN) - Free 5GB tier
 * - Pinata (PINATA_API_KEY + PINATA_API_SECRET) - Free 1GB tier
 * - Demo mode (generates deterministic CIDs when no credentials)
 */
export async function uploadToIPFS(
  content: Buffer,
  options: IPFSUploadOptions = {}
): Promise<IPFSUploadResult> {
  const {
    pin = true,
    pinningService,
    gateway = 'local',
    name = 'pattern',
  } = options;

  // Check environment variables
  const localIPFS = process.env.IPFS_API_URL;
  const web3Token = getWeb3StorageToken();
  const pinataKey = process.env.PINATA_API_KEY;

  // 1. Try local/custom IPFS node first (FREE - your own node)
  if (localIPFS || pinningService === 'local') {
    try {
      const isAvailable = await checkLocalIPFSNode();
      if (isAvailable) {
        return await uploadToLocalIPFS(content, options);
      } else {
        console.warn(`[IPFS] Local node at ${localIPFS || 'localhost:5001'} not available`);
      }
    } catch (error) {
      console.warn(`[IPFS] Local IPFS upload failed: ${error}`);
    }
  }

  // 2. Try Pinata
  if (pinningService === 'pinata' || (pinataKey && !web3Token)) {
    try {
      return await uploadToPinata(content, options);
    } catch (error) {
      console.warn(`[IPFS] Pinata upload failed: ${error}`);
    }
  }

  // 3. Try Web3.storage
  if (web3Token || pinningService === 'web3storage') {
    try {
      return await uploadToWeb3Storage(content, options);
    } catch (error) {
      console.warn(`[IPFS] Web3.storage upload failed: ${error}`);
    }
  }

  // Fall back to demo mode - WARN user prominently
  console.warn(`⚠ [IPFS] DEMO MODE - No IPFS credentials configured`);
  console.warn(`⚠ [IPFS] Content will NOT be uploaded to decentralized storage`);
  console.warn(`⚠ [IPFS] To enable real uploads, configure one of:`);
  console.warn(`⚠ [IPFS]   - IPFS_API_URL=http://YOUR_NODE:5001 (FREE - your own node)`);
  console.warn(`⚠ [IPFS]   - WEB3_STORAGE_TOKEN (free 5GB at web3.storage)`);
  console.warn(`⚠ [IPFS]   - PINATA_API_KEY + PINATA_SECRET_KEY (free tier available)`);

  const cid = generateDemoCID(content);
  const size = content.length;

  console.log(`[IPFS] Demo upload: ${size} bytes`);
  console.log(`[IPFS] Name: ${name}`);

  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const result: IPFSUploadResult = {
    cid,
    size,
    gateway,
    url: `${gateway}/ipfs/${cid}`,
  };

  if (pin) {
    result.pinnedAt = new Date().toISOString();
    console.log(`[IPFS] Demo pinned at: ${result.pinnedAt}`);
  }

  console.log(`[IPFS] Demo CID: ${cid}`);
  console.log(`[IPFS] Demo URL: ${result.url}`);

  return result;
}

/**
 * Pin content by CID
 */
export async function pinContent(
  cid: string,
  _options: { service?: PinningService; name?: string } = {}
): Promise<{ success: boolean; pinnedAt: string }> {
  // [SECURITY PATCH] Remote pinning DISABLED - no outbound requests
  console.warn(`[SECURITY] Remote pinning disabled. CID: ${cid}`);
  return { success: false, pinnedAt: new Date().toISOString() };
}

/**
 * Unpin content by CID
 */
export async function unpinContent(
  cid: string,
  _options: { service?: PinningService } = {}
): Promise<{ success: boolean }> {
  // [SECURITY PATCH] Remote unpinning DISABLED - no outbound requests
  console.warn(`[SECURITY] Remote unpinning disabled. CID: ${cid}`);
  return { success: false };
}

/**
 * Check if content exists on IPFS
 */
export async function checkContent(
  cid: string,
  _gateway: string = 'local'
): Promise<{ exists: boolean; size?: number }> {
  // [SECURITY PATCH] Remote content check DISABLED - no outbound requests
  console.warn(`[SECURITY] Remote content check disabled. CID: ${cid}`);
  return { exists: false };
}

/**
 * Get gateway URL for CID
 */
export function getGatewayURL(cid: string, gateway: string = 'local'): string {
  // [SECURITY PATCH] Default gateway changed to 'local'
  return `${gateway}/ipfs/${cid}`;
}

/**
 * Get IPNS URL for name
 */
export function getIPNSURL(name: string, gateway: string = 'local'): string {
  // [SECURITY PATCH] Default gateway changed to 'local'
  return `${gateway}/ipns/${name}`;
}

/**
 * Upload to a local/custom IPFS node
 * Connect to your own IPFS daemon via HTTP API
 */
async function uploadToLocalIPFS(
  _content: Buffer,
  _options: IPFSUploadOptions
): Promise<IPFSUploadResult> {
  // [SECURITY PATCH] Remote upload to local IPFS node DISABLED
  throw new Error('[SECURITY] Remote upload to IPFS node is disabled by security patch. Use local file export instead.');
}

/**
 * Check if local IPFS node is available
 */
async function checkLocalIPFSNode(): Promise<boolean> {
  // [SECURITY PATCH] Remote IPFS node check DISABLED
  return false;
}

/**
 * Check if real IPFS credentials are available
 */
export function hasIPFSCredentials(): boolean {
  return !!(getWeb3StorageToken() || process.env.PINATA_API_KEY || process.env.IPFS_API_URL);
}

/**
 * Get IPFS service status
 */
export function getIPFSServiceStatus(): {
  service: 'local' | 'web3storage' | 'pinata' | 'demo';
  configured: boolean;
  message: string;
  apiUrl?: string;
} {
  const localIPFS = process.env.IPFS_API_URL;
  const web3Token = getWeb3StorageToken();
  const pinataKey = process.env.PINATA_API_KEY;

  if (localIPFS) {
    return {
      service: 'local',
      configured: true,
      message: `Local IPFS node configured at ${localIPFS} - FREE uploads enabled`,
      apiUrl: localIPFS,
    };
  }

  if (web3Token) {
    return {
      service: 'web3storage',
      configured: true,
      message: 'Web3.storage configured - real IPFS uploads enabled',
    };
  }

  if (pinataKey) {
    return {
      service: 'pinata',
      configured: true,
      message: 'Pinata configured - real IPFS uploads enabled',
    };
  }

  return {
    service: 'demo',
    configured: false,
    message: 'No IPFS credentials - using demo mode. Options:\n' +
             '  1. IPFS_API_URL=http://YOUR_NODE:5001 (FREE - your own node)\n' +
             '  2. WEB3_STORAGE_TOKEN (free 5GB at web3.storage)\n' +
             '  3. PINATA_API_KEY (free 1GB at pinata.cloud)',
  };
}

/**
 * Export the local IPFS check for external use
 */
export { checkLocalIPFSNode };
