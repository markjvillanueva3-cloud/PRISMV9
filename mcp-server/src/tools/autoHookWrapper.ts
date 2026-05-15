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

// Stub returns [] but the return TYPE matches HookExecution so callers
// (guardDispatcher.autohook_status) can read .timestamp/.success/.hook_id/.tool_name
// without union narrowing. The optional limit param mirrors what the real
// hook-history reader (autoHookWrapper rev > stub) will expose.
export interface HookHistoryEntry {
  timestamp: string;
  hook_id: string;
  tool_name: string;
  event: string;
  success: boolean;
  duration_ms: number;
  data?: unknown;
}
export function getHookHistory(_limit?: number): HookHistoryEntry[] { return []; }
export function registerAutoHookTools(_server: unknown): void { /* no-op */ }

