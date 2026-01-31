/**
 * IPFS Client Module - SECURITY PATCHED
 *
 * All remote IPFS gateway calls have been removed.
 * Registry/pattern data is now read exclusively from local /config files.
 * See: config/security-circuit-breaker.ts for the network whitelist.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * IPFS gateways - DISABLED. Kept as empty array for interface compat.
 */
export const IPFS_GATEWAYS: string[] = [];

/**
 * IPNS resolvers - DISABLED.
 */
export const IPNS_RESOLVERS: string[] = [];

/**
 * Gateway configuration
 */
export interface GatewayConfig {
  url: string;
  timeout?: number;
  headers?: Record<string, string>;
  priority?: number;
}

/**
 * Fetch result with metadata
 */
export interface FetchResult<T> {
  data: T;
  gateway: string;
  cid: string;
  cached: boolean;
  latencyMs: number;
}

/**
 * Resolve IPNS name - DISABLED. Always returns null.
 */
export async function resolveIPNS(
  _ipnsName: string,
  _preferredGateway?: string
): Promise<string | null> {
  console.warn('[SECURITY] IPNS resolution is disabled. Remote IPFS gateways are blocked.');
  return null;
}

/**
 * Fetch content from IPFS by CID - PATCHED to read from local /config.
 * Falls back to null if no local file exists.
 */
export async function fetchFromIPFS<T>(
  cid: string,
  _preferredGateway?: string
): Promise<T | null> {
  console.warn('[SECURITY] Remote IPFS fetch is disabled. Attempting local config lookup.');
  return readLocalRegistry<T>(cid);
}

/**
 * Fetch with full result metadata - PATCHED to read from local /config.
 */
export async function fetchFromIPFSWithMetadata<T>(
  cid: string,
  _preferredGateway?: string
): Promise<FetchResult<T> | null> {
  const data = await readLocalRegistry<T>(cid);
  if (!data) return null;
  return {
    data,
    gateway: 'local',
    cid,
    cached: true,
    latencyMs: 0,
  };
}

/**
 * Check if CID is pinned - DISABLED. Always returns false.
 */
export async function isPinned(
  _cid: string,
  _gateway?: string
): Promise<boolean> {
  return false;
}

/**
 * Check availability - DISABLED. Returns all unavailable.
 */
export async function checkAvailability(_cid: string): Promise<{
  available: boolean;
  gateways: Array<{ url: string; available: boolean; latencyMs: number }>;
}> {
  return { available: false, gateways: [] };
}

/**
 * Get IPFS gateway URL for a CID - returns local path instead.
 */
export function getGatewayUrl(cid: string, _gateway?: string): string {
  return getLocalConfigPath(cid);
}

/**
 * Get multiple gateway URLs - returns single local path.
 */
export function getGatewayUrls(cid: string): string[] {
  return [getLocalConfigPath(cid)];
}

/**
 * Validate CID format (CIDv0 and CIDv1)
 */
export function isValidCID(cid: string): boolean {
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|f[0-9a-f]{50,})$/i.test(cid);
}

/**
 * Validate IPNS name format
 */
export function isValidIPNS(ipnsName: string): boolean {
  return /^(k51[a-z0-9]{59,}|[a-z0-9.-]+\.[a-z]{2,})$/i.test(ipnsName);
}

/**
 * Generate content hash for verification
 */
export function hashContent(content: Buffer | string): string {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Verify Ed25519 signature (async import to avoid bundling issues)
 */
export async function verifyEd25519Signature(
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    const ed = await import('@noble/ed25519');
    const pubKeyHex = publicKey.replace(/^ed25519:/, '');
    const isValid = await ed.verifyAsync(
      Buffer.from(signature, 'hex'),
      new TextEncoder().encode(message),
      Buffer.from(pubKeyHex, 'hex')
    );
    return isValid;
  } catch (error) {
    console.warn('[IPFS] Signature verification failed:', error);
    return false;
  }
}

/**
 * Parse CID to extract metadata
 */
export function parseCID(cid: string): {
  version: 0 | 1;
  codec: string;
  hash: string;
} | null {
  if (!isValidCID(cid)) return null;
  if (cid.startsWith('Qm')) {
    return { version: 0, codec: 'dag-pb', hash: cid };
  }
  return { version: 1, codec: 'dag-cbor', hash: cid };
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ---------- Local file helpers ----------

function getLocalConfigPath(cid: string): string {
  // Walk up to project root from this file's location
  const projectRoot = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
  return path.join(projectRoot, 'config', 'registries', `${cid}.json`);
}

function readLocalRegistry<T>(cid: string): T | null {
  const filePath = getLocalConfigPath(cid);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (error) {
    console.warn(`[SECURITY] Failed to read local registry file: ${filePath}`, error);
  }
  console.warn(`[SECURITY] No local registry found for CID: ${cid}. Place a JSON file at: ${filePath}`);
  return null;
}
