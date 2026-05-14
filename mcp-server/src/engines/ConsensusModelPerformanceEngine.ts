// WIRE-EXEMPT: build-unblock stub for MultiModelConsensusEngine's missing dependency.
//   The real implementation was never committed (CLEANUP-MS0/U-ENGINE-FOSSIL-2
//   absorbed the consumer without its deps). loadState/recommendVendors throw
//   so any code path that actually invokes consensus fails fast with a clear
//   message — wiring this stub into a dispatcher would be misleading. Replace
//   with the real engine + tests + dispatcher wiring when it surfaces.
/**
 * ConsensusModelPerformanceEngine — STUB (build unblock).
 *
 * MultiModelConsensusEngine imports this engine but the actual implementation
 * was never committed (CLEANUP-MS0/U-ENGINE-FOSSIL-2 absorbed the consumer
 * without its dependencies). This stub exists only so `npm run build:fast`
 * resolves the import; calling either method throws so callers fail fast
 * with a clear message rather than silent-broken consensus runs.
 *
 * Remove + replace with the real implementation when it surfaces.
 */
export interface ConsensusPerformanceState {
  // shape unknown without the real implementation; carried as opaque blob.
  readonly _stub: true;
}

export interface VendorRecommendation {
  vendors: string[];
  rationale: string;
}

class ConsensusModelPerformanceEngineStub {
  loadState(_path?: string): ConsensusPerformanceState {
    throw new Error(
      "ConsensusModelPerformanceEngine: real implementation missing (stub only). " +
      "MultiModelConsensusEngine.runConsensus() called loadState — populate the engine before invoking consensus.",
    );
  }
  recommendVendors(
    _state: ConsensusPerformanceState,
    _taskType: unknown,
    _available: readonly string[],
    _opts?: { floor?: number },
  ): VendorRecommendation {
    throw new Error(
      "ConsensusModelPerformanceEngine: real implementation missing (stub only). " +
      "MultiModelConsensusEngine.runConsensus() called recommendVendors — populate the engine before invoking consensus.",
    );
  }
}

export const consensusModelPerformanceEngine = new ConsensusModelPerformanceEngineStub();
export const ConsensusModelPerformanceEngine = ConsensusModelPerformanceEngineStub;
