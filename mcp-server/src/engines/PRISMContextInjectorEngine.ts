// WIRE-EXEMPT: build-unblock stub for MultiModelConsensusEngine's missing dependency.
//   The real implementation was never committed (CLEANUP-MS0/U-ENGINE-FOSSIL-2
//   absorbed the consumer without its deps). buildContext() throws so any code
//   path that actually invokes consensus fails fast with a clear message —
//   wiring this stub into a dispatcher would be misleading. Replace with the
//   real engine + tests + dispatcher wiring when it surfaces.
/**
 * PRISMContextInjectorEngine — STUB (build unblock).
 *
 * MultiModelConsensusEngine imports this engine but the actual implementation
 * was never committed (CLEANUP-MS0/U-ENGINE-FOSSIL-2 absorbed the consumer
 * without its dependencies). This stub exists only so `npm run build:fast`
 * resolves the import; calling `buildContext` throws so callers fail fast
 * with a clear message rather than silent-broken consensus runs.
 *
 * Remove + replace with the real implementation when it surfaces.
 */
export interface ContextInjectorOpts {
  modelBudget?: number;
}

export interface InjectedContext {
  prompt: string;
  facts: string[];
  budget: number;
}

class PRISMContextInjectorEngineStub {
  async buildContext(_prompt: string, _opts?: ContextInjectorOpts): Promise<InjectedContext> {
    throw new Error(
      "PRISMContextInjectorEngine: real implementation missing (stub only). " +
      "MultiModelConsensusEngine.runConsensus() called this — populate the engine before invoking consensus.",
    );
  }
}

export const prismContextInjectorEngine = new PRISMContextInjectorEngineStub();
export const PRISMContextInjectorEngine = PRISMContextInjectorEngineStub;
