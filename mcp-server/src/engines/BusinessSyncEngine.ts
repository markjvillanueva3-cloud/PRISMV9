/**
 * BusinessSyncEngine — cross-target ERP/accounting sync status aggregator.
 *
 * STUB-RESCUE (slot:bravo 2026-05-26, U-STUB-HUNT-01).  Original lost to
 * exFAT corruption 2026-04-10 left a 320-byte stub returning hardcoded zeros.
 * Replaced with a real implementation modeled on sibling ERP* engines
 * (ERPCostFeedbackEngine, ERPImportEngine, ERPIntegrationEngine,
 * ERPQualityEngine, ERPToolInventoryEngine, ERPWorkOrderEngine).
 *
 * Responsibility: a single PRISM-side surface that records "I just synced N
 * items to target X" events from every ERP-side engine + reports a unified
 * fleet status.  The dispatcher action `business_sync_stats` (already wired
 * in businessDispatcher.ts) returns this surface.  Per-target state lives in
 * memory; persistence is the caller's job (mirrors AISystemSynchronizerEngine
 * + FusionPostSyncEngine convention — they don't persist either).
 *
 * @version 2.0.0 — restored from stub
 */

export type SyncStatus =
  | "not_configured"
  | "idle"
  | "syncing"
  | "ok"
  | "degraded"
  | "failed";

export interface SyncTargetState {
  target: string;
  status: SyncStatus;
  itemsSynced: number;
  itemsPending: number;
  lastSync: string | null;        // ISO 8601 timestamp
  lastError: string | null;
  syncCount: number;              // monotonic counter, # of recordSync calls
}

export interface RecordSyncInput {
  target: string;
  itemsSynced?: number;
  itemsPending?: number;
  status?: SyncStatus;
  error?: string | null;
  timestamp?: string;             // override (default: now)
}

export interface AggregateStats {
  targetCount: number;
  totalSynced: number;
  totalPending: number;
  lastSync: string | null;        // newest across all targets
  worstStatus: SyncStatus;        // failed > degraded > syncing > ok > idle > not_configured
  byTarget: SyncTargetState[];
}

const STATUS_SEVERITY: Record<SyncStatus, number> = {
  not_configured: 0,
  idle: 1,
  ok: 2,
  syncing: 3,
  degraded: 4,
  failed: 5,
};

function blankState(target: string): SyncTargetState {
  return {
    target,
    status: "not_configured",
    itemsSynced: 0,
    itemsPending: 0,
    lastSync: null,
    lastError: null,
    syncCount: 0,
  };
}

export class BusinessSyncEngine {
  private readonly _targets = new Map<string, SyncTargetState>();
  private readonly _now: () => Date;

  constructor(opts: { now?: () => Date } = {}) {
    this._now = opts.now ?? (() => new Date());
  }

  /** Register a target (idempotent — preserves existing state). */
  registerTarget(target: string): SyncTargetState {
    if (!this._targets.has(target)) this._targets.set(target, blankState(target));
    return { ...this._targets.get(target)! };
  }

  /** Record a sync event and update target state. */
  recordSync(input: RecordSyncInput): SyncTargetState {
    if (!input?.target) throw new Error("BusinessSyncEngine.recordSync: target is required");
    if (!this._targets.has(input.target)) this._targets.set(input.target, blankState(input.target));
    const state = this._targets.get(input.target)!;
    const ts = input.timestamp ?? this._now().toISOString();
    state.itemsSynced = (input.itemsSynced ?? 0) >= 0 ? (input.itemsSynced ?? state.itemsSynced) : state.itemsSynced;
    state.itemsPending = (input.itemsPending ?? 0) >= 0 ? (input.itemsPending ?? state.itemsPending) : state.itemsPending;
    state.status = input.status ?? (input.error ? "failed" : "ok");
    state.lastError = input.error ?? null;
    state.lastSync = ts;
    state.syncCount += 1;
    return { ...state };
  }

  /** Get state for one target, or null if unknown. */
  getTarget(target: string): SyncTargetState | null {
    const s = this._targets.get(target);
    return s ? { ...s } : null;
  }

  /** Mark a target as failed without changing item counts. */
  markFailed(target: string, error: string): SyncTargetState {
    return this.recordSync({ target, status: "failed", error });
  }

  /** Reset one target back to blank state. */
  resetTarget(target: string): boolean {
    return this._targets.delete(target);
  }

  /** Aggregate stats across every registered target. */
  getStats(): AggregateStats {
    const targets = [...this._targets.values()].map((s) => ({ ...s }));
    if (targets.length === 0) {
      return {
        targetCount: 0,
        totalSynced: 0,
        totalPending: 0,
        lastSync: null,
        worstStatus: "not_configured",
        byTarget: [],
      };
    }
    let totalSynced = 0;
    let totalPending = 0;
    let lastSync: string | null = null;
    let worstStatus: SyncStatus = "not_configured";
    let worstSev = STATUS_SEVERITY.not_configured;
    for (const t of targets) {
      totalSynced += t.itemsSynced;
      totalPending += t.itemsPending;
      if (t.lastSync && (!lastSync || t.lastSync > lastSync)) lastSync = t.lastSync;
      const sev = STATUS_SEVERITY[t.status];
      if (sev > worstSev) { worstSev = sev; worstStatus = t.status; }
    }
    return {
      targetCount: targets.length,
      totalSynced,
      totalPending,
      lastSync,
      worstStatus,
      byTarget: targets.sort((a, b) => a.target.localeCompare(b.target)),
    };
  }
}

export const businessSyncEngine = new BusinessSyncEngine();
