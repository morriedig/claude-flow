/**
 * Stub type declarations for external packages not installed locally.
 * These allow TypeScript compilation without requiring the actual packages.
 */

declare module '@noble/ed25519' {
  export function verifyAsync(
    signature: Uint8Array,
    message: Uint8Array,
    publicKey: Uint8Array
  ): Promise<boolean>;
  export function signAsync(
    message: Uint8Array,
    privateKey: Uint8Array
  ): Promise<Uint8Array>;
  export function getPublicKeyAsync(privateKey: Uint8Array): Promise<Uint8Array>;
}

declare module '@ruvector/learning-wasm' {
  export class WasmMicroLoRA {
    constructor(dim: number, alpha: number, lr: number);
    adapt_array(gradient: Float32Array): void;
    adapt_with_reward(improvement: number): void;
    get_adapted(): Float32Array;
    forward_array(input: Float32Array): Float32Array;
    delta_norm(): number;
    adapt_count(): bigint;
    param_count(): number;
    forward_count(): bigint;
    dim(): number;
    reset(): void;
    free(): void;
  }
  export class WasmScopedLoRA {
    constructor(dim: number, alpha: number, lr: number);
    set_category_fallback(value: boolean): void;
    adapt(gradient: Float32Array, scope: number): void;
    adapt_array(operatorType: number, gradient: Float32Array): void;
    adapt_with_reward(operatorType: number, improvement: number): void;
    forward_array(operatorType: number, input: Float32Array): Float32Array;
    delta_norm(operatorType: number): number;
    adapt_count(operatorType: number): bigint;
    total_adapt_count(): bigint;
    total_forward_count(): bigint;
    reset_all(): void;
    free(): void;
  }
  export class WasmTrajectoryBuffer {
    constructor(capacity: number, dim?: number);
    push(state: Float32Array, action: number, reward: number): void;
    record(embedding: Float32Array, operatorType: number, attentionType: number, executionMs: number, baselineMs: number): void;
    sample(batchSize: number): { states: Float32Array; actions: Int32Array; rewards: Float32Array };
    is_empty(): boolean;
    success_rate(): number;
    mean_improvement(): number;
    best_improvement(): number;
    total_count(): bigint;
    high_quality_count(threshold: number): number;
    variance(): number;
    reset(): void;
    free(): void;
  }
  export function initSync(options: { module: ArrayBuffer | Uint8Array }): void;
}

declare module 'agentic-flow/core' {
  export * from 'agentic-flow';
}
