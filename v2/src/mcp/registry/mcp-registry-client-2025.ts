/**
 * MCP 2025-11 Registry Client
 *
 * Implements server registration and health reporting
 * per MCP 2025-11 specification
 */

import type { ILogger } from '../../interfaces/logger.js';
import type { MCPVersion, MCPCapability } from '../protocol/version-negotiation.js';

/**
 * MCP Registry entry (2025-11 format)
 */
export interface MCPRegistryEntry {
  server_id: string;
  version: MCPVersion;
  endpoint: string;
  tools: string[];
  auth: 'bearer' | 'mutual_tls' | 'none';
  capabilities: MCPCapability[];
  metadata: {
    name: string;
    description: string;
    author: string;
    homepage?: string;
    documentation?: string;
    repository?: string;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    last_check: string; // ISO 8601
    latency_ms: number;
  };
}

/**
 * Registry search query
 */
export interface RegistrySearchQuery {
  category?: string;
  tags?: string[];
  capabilities?: MCPCapability[];
  limit?: number;
}

/**
 * Registry configuration
 */
export interface RegistryConfig {
  enabled: boolean;
  registryUrl?: string;
  apiKey?: string;
  serverId: string;
  serverEndpoint: string;
  authMethod: 'bearer' | 'mutual_tls' | 'none';
  metadata: MCPRegistryEntry['metadata'];
  healthCheckInterval?: number; // milliseconds
}

/**
 * MCP 2025-11 Registry Client
 */
export class MCPRegistryClient {
  private registryUrl: string;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    private config: RegistryConfig,
    private logger: ILogger,
    private getTools: () => Promise<string[]>,
    private getCapabilities: () => MCPCapability[],
    private getHealth: () => Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latency_ms: number }>
  ) {
    // [SECURITY PATCH] Default registry URL blocked - was 'https://registry.mcp.anthropic.com/api/v1'
    this.registryUrl = config.registryUrl || 'disabled://registry-blocked';
  }

  /**
   * Register server with MCP Registry
   */
  async register(): Promise<void> {
    // [SECURITY PATCH] Remote registry registration DISABLED
    this.logger.info('[SECURITY] Registry registration is disabled by security patch');
    return;
  }

  /**
   * Update server metadata in registry
   */
  async updateMetadata(_updates: Partial<MCPRegistryEntry>): Promise<void> {
    // [SECURITY PATCH] Remote metadata update DISABLED
    this.logger.info('[SECURITY] Registry metadata update is disabled by security patch');
    return;
  }

  /**
   * Report health status to registry
   */
  async reportHealth(): Promise<void> {
    // [SECURITY PATCH] Remote health reporting DISABLED
    return;
  }

  /**
   * Search for servers in registry
   */
  async searchServers(_query: RegistrySearchQuery): Promise<MCPRegistryEntry[]> {
    // [SECURITY PATCH] Remote server search DISABLED
    this.logger.info('[SECURITY] Registry search is disabled by security patch');
    return [];
  }

  /**
   * Unregister from registry
   */
  async unregister(): Promise<void> {
    // [SECURITY PATCH] Remote unregistration DISABLED
    this.stopHealthReporting();
    this.logger.info('[SECURITY] Registry unregistration is disabled by security patch');
    return;
  }

  /**
   * Build registry entry from current server state
   */
  private async buildRegistryEntry(): Promise<MCPRegistryEntry> {
    const tools = await this.getTools();
    const capabilities = this.getCapabilities();
    const health = await this.getHealth();

    return {
      server_id: this.config.serverId,
      version: '2025-11',
      endpoint: this.config.serverEndpoint,
      tools,
      auth: this.config.authMethod,
      capabilities,
      metadata: this.config.metadata,
      health: {
        status: health.status,
        last_check: new Date().toISOString(),
        latency_ms: health.latency_ms,
      },
    };
  }

  /**
   * Start periodic health reporting
   */
  private startHealthReporting(): void {
    const interval = this.config.healthCheckInterval || 60000; // Default: 60 seconds

    this.healthCheckInterval = setInterval(async () => {
      await this.reportHealth();
    }, interval);

    this.logger.info('Health reporting started', {
      interval_ms: interval,
    });
  }

  /**
   * Stop health reporting
   */
  private stopHealthReporting(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      this.logger.info('Health reporting stopped');
    }
  }
}
