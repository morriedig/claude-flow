/**
 * Security Circuit Breaker
 * Intercepts all network requests and enforces a domain whitelist.
 * Any request to a non-whitelisted domain is blocked with an error.
 *
 * Usage: import this module at application entry point to activate.
 */

const ALLOWED_DOMAINS = [
  'api.anthropic.com',
  'anthropic.com',
  // Add other trusted domains here as needed
];

/**
 * Check if a URL is allowed by the whitelist
 */
export function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(
      (domain) =>
        parsed.hostname === domain ||
        parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Guarded fetch that blocks non-whitelisted domains
 */
export async function guardedFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (!isUrlAllowed(url)) {
    throw new Error(
      `[SECURITY CIRCUIT BREAKER] Blocked outbound request to non-whitelisted domain: ${url}\n` +
      `Allowed domains: ${ALLOWED_DOMAINS.join(', ')}\n` +
      `To allow this domain, add it to config/security-circuit-breaker.ts ALLOWED_DOMAINS.`
    );
  }
  return globalThis.fetch(input, init);
}

/**
 * Install the circuit breaker globally (monkey-patch fetch).
 * Call this once at startup to enforce the whitelist on ALL fetch calls.
 */
export function installCircuitBreaker(): void {
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!isUrlAllowed(url)) {
      throw new Error(
        `[SECURITY CIRCUIT BREAKER] Blocked outbound request to non-whitelisted domain: ${url}\n` +
        `Allowed domains: ${ALLOWED_DOMAINS.join(', ')}`
      );
    }
    return originalFetch(input, init);
  };
  console.log('[SECURITY] Circuit breaker installed. Only whitelisted domains are allowed.');
}

/**
 * Require manual confirmation before executing any shell command.
 * Returns true only if the user confirms via stdin.
 */
export async function requireManualConfirmation(command: string): Promise<boolean> {
  // In non-interactive environments, always deny
  if (!process.stdin.isTTY) {
    console.error(`[SECURITY] Blocked shell command in non-interactive mode: ${command}`);
    return false;
  }

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<boolean>((resolve) => {
    rl.question(
      `\n[SECURITY] Shell command requires manual approval:\n  > ${command}\nAllow execution? (y/N): `,
      (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() === 'y');
      }
    );
  });
}
