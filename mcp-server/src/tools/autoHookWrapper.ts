type ReconState = {
  firstCallReconDone: boolean;
  compactionRecoveryCallsRemaining: number;
  compactionRecoverySurvival: unknown;
  lastCallTimestamp: number;
};

let firstCallReconDone = false;
let compactionRecoveryCallsRemaining = 0;
let compactionRecoverySurvival: unknown = null;
let lastCallTimestamp = 0;

export function resetReconFlag(): void {
  firstCallReconDone = false;
  compactionRecoveryCallsRemaining = 0;
  compactionRecoverySurvival = null;
  lastCallTimestamp = 0;
}

export function getReconState(): ReconState {
  return {
    firstCallReconDone,
    compactionRecoveryCallsRemaining,
    compactionRecoverySurvival,
    lastCallTimestamp,
  };
}

// Backward-compat shims (esbuild fix 2026-04-25)
export const AUTO_HOOK_CONFIG = {
  calcTools: [] as readonly string[],
  enabled: false,
};
type AnyHandler = (args: any) => any | Promise<any>;
export function wrapWithUniversalHooks<T extends AnyHandler>(toolName: string, handler: T): T {
  return handler;
}
export function wrapToolWithAutoHooks<T extends AnyHandler>(toolName: string, handler: T): T {
  return handler;
}
let _dispatchCount = 0;
export function getDispatchCount(): number { return _dispatchCount; }
export function getHookHistory(): Array<{ tool: string; ts: number }> { return []; }
export function registerAutoHookTools(_server: unknown): void { /* no-op */ }

