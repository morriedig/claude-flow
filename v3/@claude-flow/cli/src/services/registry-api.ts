/**
 * Registry API Client - SECURITY PATCHED
 *
 * All remote Cloud Function calls have been DISABLED.
 * No telemetry, no download tracking, no remote health checks.
 * Functions return safe defaults or throw errors.
 */

// SECURITY PATCHED: Remote endpoint REMOVED
// Was: const REGISTRY_API_URL = 'https://us-central1-claude-flow.cloudfunctions.net/publish-registry';

export interface RatingResponse {
  success: boolean;
  itemId: string;
  average: number;
  count: number;
  error?: string;
}

export interface BulkRatingsResponse {
  [itemId: string]: {
    average: number;
    count: number;
  };
}

export interface AnalyticsResponse {
  downloads: Record<string, number>;
  exports: number;
  imports: number;
  publishes: number;
}

/**
 * Validate item ID to prevent injection
 */
function validateItemId(itemId: string): boolean {
  return /^[@a-zA-Z0-9\/_-]+$/.test(itemId) && itemId.length < 100;
}

/**
 * Validate rating value
 */
function validateRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * Rate a plugin or model - DISABLED
 */
export async function rateItem(
  itemId: string,
  rating: number,
  _itemType: 'plugin' | 'model' = 'plugin',
  _userId?: string
): Promise<RatingResponse> {
  if (!validateItemId(itemId)) throw new Error('Invalid item ID');
  if (!validateRating(rating)) throw new Error('Rating must be integer 1-5');
  console.warn('[SECURITY] Remote rating API is disabled.');
  return { success: false, itemId, average: 0, count: 0, error: 'Remote API disabled by security patch' };
}

/**
 * Get ratings - DISABLED
 */
export async function getRating(
  itemId: string,
  _itemType: 'plugin' | 'model' = 'plugin'
): Promise<RatingResponse> {
  if (!validateItemId(itemId)) throw new Error('Invalid item ID');
  return { success: false, itemId, average: 0, count: 0, error: 'Remote API disabled by security patch' };
}

/**
 * Get bulk ratings - DISABLED
 */
export async function getBulkRatings(
  _itemIds: string[],
  _itemType: 'plugin' | 'model' = 'plugin'
): Promise<BulkRatingsResponse> {
  return {};
}

/**
 * Get analytics - DISABLED
 */
export async function getAnalytics(): Promise<AnalyticsResponse> {
  return { downloads: {}, exports: 0, imports: 0, publishes: 0 };
}

/**
 * Track a download event - DISABLED (was telemetry)
 */
export async function trackDownload(_pluginId: string): Promise<void> {
  // [SECURITY PATCH] Download tracking to Cloud Functions removed.
  // No data is sent to any remote endpoint.
}

/**
 * Check API health - DISABLED
 */
export async function checkHealth(): Promise<{
  healthy: boolean;
  latestCid?: string;
  error?: string;
}> {
  return { healthy: false, error: 'Remote API disabled by security patch' };
}
