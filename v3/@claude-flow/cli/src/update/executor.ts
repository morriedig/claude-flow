/**
 * Update executor - performs actual package updates
 * Includes rollback capability
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { UpdateCheckResult } from './checker.js';
import { validateUpdate, ValidationResult } from './validator.js';

export interface UpdateHistoryEntry {
  timestamp: string;
  package: string;
  fromVersion: string;
  toVersion: string;
  success: boolean;
  error?: string;
  rollbackAvailable: boolean;
}

export interface UpdateExecutionResult {
  success: boolean;
  package: string;
  version: string;
  error?: string;
  validation: ValidationResult;
}

const HISTORY_FILE = path.join(os.homedir(), '.claude-flow', 'update-history.json');
const MAX_HISTORY_ENTRIES = 100;

function ensureDir(): void {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadHistory(): UpdateHistoryEntry[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(content) as UpdateHistoryEntry[];
    }
  } catch {
    // Corrupted file
  }
  return [];
}

function saveHistory(history: UpdateHistoryEntry[]): void {
  ensureDir();
  // Keep only last N entries
  const trimmed = history.slice(-MAX_HISTORY_ENTRIES);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
}

function recordUpdate(entry: UpdateHistoryEntry): void {
  const history = loadHistory();
  history.push(entry);
  saveHistory(history);
}

export async function executeUpdate(
  update: UpdateCheckResult,
  installedPackages: Record<string, string>,
  dryRun = false
): Promise<UpdateExecutionResult> {
  // Validate first
  const validation = validateUpdate(
    update.package,
    update.currentVersion,
    update.latestVersion,
    installedPackages
  );

  if (!validation.valid) {
    return {
      success: false,
      package: update.package,
      version: update.latestVersion,
      error: `Validation failed: ${validation.incompatibilities.join(', ')}`,
      validation,
    };
  }

  if (dryRun) {
    return {
      success: true,
      package: update.package,
      version: update.latestVersion,
      validation,
    };
  }

  try {
    // SECURITY PATCHED: Auto npm install is BLOCKED.
    // Users must manually run: npm install <package>@<version> --save-exact
    const installCmd = `npm install ${update.package}@${update.latestVersion} --save-exact`;
    console.error(`[SECURITY] Automatic npm install is DISABLED. To update manually, run:\n  ${installCmd}`);
    throw new Error('[SECURITY] Auto-update execution blocked. Manual installation required.');

    // Original code (disabled):
    // execSync(installCmd, {
    //   encoding: 'utf-8',
    //   stdio: 'pipe',
    //   timeout: 60000,
    // });

    // Record successful update
    recordUpdate({
      timestamp: new Date().toISOString(),
      package: update.package,
      fromVersion: update.currentVersion,
      toVersion: update.latestVersion,
      success: true,
      rollbackAvailable: true,
    });

    return {
      success: true,
      package: update.package,
      version: update.latestVersion,
      validation,
    };
  } catch (error) {
    const err = error as Error;

    // Record failed update
    recordUpdate({
      timestamp: new Date().toISOString(),
      package: update.package,
      fromVersion: update.currentVersion,
      toVersion: update.latestVersion,
      success: false,
      error: err.message,
      rollbackAvailable: false,
    });

    return {
      success: false,
      package: update.package,
      version: update.latestVersion,
      error: err.message,
      validation,
    };
  }
}

export async function executeMultipleUpdates(
  updates: UpdateCheckResult[],
  installedPackages: Record<string, string>,
  dryRun = false
): Promise<UpdateExecutionResult[]> {
  const results: UpdateExecutionResult[] = [];

  // Execute updates sequentially to avoid conflicts
  for (const update of updates) {
    const result = await executeUpdate(update, installedPackages, dryRun);
    results.push(result);

    // Update installed packages for next validation
    if (result.success) {
      installedPackages[update.package] = update.latestVersion;
    }

    // Stop on critical failures
    if (!result.success && update.priority === 'critical') {
      break;
    }
  }

  return results;
}

export async function rollbackUpdate(
  packageName?: string
): Promise<{ success: boolean; message: string }> {
  const history = loadHistory();

  if (history.length === 0) {
    return { success: false, message: 'No update history available' };
  }

  // Find the last successful update for this package (or any if not specified)
  const lastUpdate = packageName
    ? history
        .reverse()
        .find((h) => h.package === packageName && h.success && h.rollbackAvailable)
    : history.reverse().find((h) => h.success && h.rollbackAvailable);

  if (!lastUpdate) {
    return {
      success: false,
      message: packageName
        ? `No rollback available for ${packageName}`
        : 'No rollback available',
    };
  }

  // SECURITY PATCHED: Auto rollback npm install is BLOCKED.
  const installCmd = `npm install ${lastUpdate!.package}@${lastUpdate!.fromVersion} --save-exact`;
  console.error(`[SECURITY] Automatic npm rollback is DISABLED. To rollback manually, run:\n  ${installCmd}`);
  return {
    success: false,
    message: '[SECURITY] Auto-rollback execution blocked. Manual installation required.',
  };
}

export function getUpdateHistory(limit = 20): UpdateHistoryEntry[] {
  const history = loadHistory();
  return history.slice(-limit).reverse();
}

export function clearHistory(): void {
  if (fs.existsSync(HISTORY_FILE)) {
    fs.unlinkSync(HISTORY_FILE);
  }
}
