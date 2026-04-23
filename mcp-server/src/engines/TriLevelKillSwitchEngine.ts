/**
 * TriLevelKillSwitchEngine (U-LPR-KILL-SWITCH)
 *
 * Three-layer kill-switch cascade for the lathe pilot wet-run. Each layer
 * is independently tripable; the strongest active layer dominates. All
 * trips are latency-measured against published SLAs so the MOU kill-switch
 * protocol is continuously auditable.
 *
 *   L1 PHYSICAL E-STOP
 *     Operator-initiated mechanical switch on the machine. Cuts power to
 *     spindle + axes directly via the CNC control. Reaction time limited
 *     only by operator and CNC hardware; PRISM can only record the event
 *     (e.g. via MTConnect EMERGENCY signal) — never initiate.
 *     SLA: acknowledgment logged ≤ 1000 ms of physical press detection.
 *     Mode on trip: HARD_STOP (no program-resume permitted).
 *
 *   L2 MTConnect REMOTE FEEDHOLD + E-STOP
 *     PRISM sends MTConnect EMERGENCY_STOP + feedhold commands. Useful
 *     when a collision is predicted or an alarm pattern is detected.
 *     SLA: trip→ack ≤ 500 ms (plan target).
 *     Mode on trip: SOFT_STOP (feedhold; recoverable with operator).
 *
 *   L3 SOFTWARE DISPATCHER HALT
 *     AUTO_ROLLBACK fires via the U-LPR-AUTOROLLBACK POT/GPD trigger or
 *     U-LPR-OBS3 runbook escalation. Halts the dispatcher; no further
 *     programs can be released from PRISM to the machine.
 *     SLA: trip→ack ≤ 2000 ms (plan target).
 *     Mode on trip: GATE_CLOSED (machine itself continues whatever it
 *     was doing; further PRISM outputs blocked).
 *
 * Every trip records source, reason, wall-clock latency, and the runbook
 * reference that must be executed. getActiveState() returns the dominant
 * active layer (L1 > L2 > L3 > OK). reset() requires explicit authorization
 * + evidence that the triggering condition is cleared.
 *
 * Pure calculation engine. State is in-memory; callers persist via
 * U-LPR-SEC04 audit log / U-LPR-OBS3 PagerDuty.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-KILL-SWITCH — Tri-level kill-switch cascade
 */

// ============================================================================
// TYPES
// ============================================================================

export type KillLevel = "L1_PHYSICAL" | "L2_MTCONNECT" | "L3_SOFTWARE" | "OK";

export type TripSource =
  | "operator"
  | "mtconnect_alarm"
  | "mtconnect_watchdog"
  | "collision_predicted"
  | "auto_rollback"
  | "runbook_escalation"
  | "manual_api";

export interface KillSla {
  level: Exclude<KillLevel, "OK">;
  /** Maximum acceptable trip→ack latency in ms. */
  ack_sla_ms: number;
  /** Runbook id operator must follow after the trip. */
  runbook_id: string;
  /** Whether trip is recoverable without removing the workpiece. */
  recoverable: boolean;
}

export interface KillEvent {
  seq: number;
  level: Exclude<KillLevel, "OK">;
  source: TripSource;
  reason: string;
  /** Wall-clock ms when the trip was initiated. */
  tripped_at: number;
  /** Wall-clock ms when PRISM acknowledged (recorded) the trip. */
  acknowledged_at: number;
  /** acknowledged_at − tripped_at. */
  ack_latency_ms: number;
  /** True if ack_latency_ms ≤ SLA for this level. */
  within_sla: boolean;
  runbook_id: string;
  /** Optional operator / runbook executor identity. */
  triggered_by?: string;
  /** Arbitrary metadata (alarm code, predicted-collision pair, etc.). */
  metadata?: Record<string, unknown>;
}

export interface KillResetEvent {
  seq: number;
  level_reset: Exclude<KillLevel, "OK">;
  trip_seq: number;
  reset_at: number;
  authorized_by: string;
  evidence: string;
  runbook_completed: boolean;
}

export interface ActiveState {
  level: KillLevel;
  last_trip: KillEvent | null;
  /** Active trips across all levels (indexed by level). */
  active_by_level: Partial<Record<Exclude<KillLevel, "OK">, KillEvent>>;
  gate_open: boolean;
}

export interface KillSwitchStats {
  total_trips: number;
  trips_by_level: Record<Exclude<KillLevel, "OK">, number>;
  trips_by_source: Record<TripSource, number>;
  sla_violations: number;
  average_ack_latency_ms_by_level: Record<Exclude<KillLevel, "OK">, number>;
  resets_total: number;
  gate_open: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_SLA: Record<Exclude<KillLevel, "OK">, KillSla> = {
  L1_PHYSICAL: {
    level: "L1_PHYSICAL",
    ack_sla_ms: 1000,
    runbook_id: "RUNBOOK-L1-PHYSICAL-ESTOP",
    recoverable: false, // workpiece must be cleared after physical stop
  },
  L2_MTCONNECT: {
    level: "L2_MTCONNECT",
    ack_sla_ms: 500, // plan target
    runbook_id: "RUNBOOK-L2-MTCONNECT-FEEDHOLD",
    recoverable: true,
  },
  L3_SOFTWARE: {
    level: "L3_SOFTWARE",
    ack_sla_ms: 2000, // plan target
    runbook_id: "RUNBOOK-L3-AUTO-ROLLBACK",
    recoverable: true,
  },
};

// Dominance order: higher index = dominates lower.
const LEVEL_ORDER: Record<Exclude<KillLevel, "OK">, number> = {
  L3_SOFTWARE: 1,
  L2_MTCONNECT: 2,
  L1_PHYSICAL: 3,
};

// ============================================================================
// ENGINE
// ============================================================================

export class TriLevelKillSwitchEngine {
  private slas: Record<Exclude<KillLevel, "OK">, KillSla> = { ...DEFAULT_SLA };
  private trips: KillEvent[] = [];
  private resets: KillResetEvent[] = [];
  private activeByLevel: Partial<Record<Exclude<KillLevel, "OK">, KillEvent>> = {};
  private seq = 0;

  // ──────────────────────────────────────────────────────────────────────
  // SLA configuration
  // ──────────────────────────────────────────────────────────────────────

  setSla(level: Exclude<KillLevel, "OK">, sla: Partial<KillSla>): KillSla {
    const current = this.slas[level];
    if (sla.ack_sla_ms !== undefined && sla.ack_sla_ms <= 0) {
      throw new Error("ack_sla_ms must be positive");
    }
    if (sla.runbook_id !== undefined && !sla.runbook_id.trim()) {
      throw new Error("runbook_id required");
    }
    const updated: KillSla = { ...current, ...sla, level };
    this.slas[level] = updated;
    return updated;
  }

  getSla(level: Exclude<KillLevel, "OK">): KillSla {
    return { ...this.slas[level] };
  }

  listSlas(): KillSla[] {
    return (Object.keys(this.slas) as Array<Exclude<KillLevel, "OK">>).map(l => ({ ...this.slas[l] }));
  }

  // ──────────────────────────────────────────────────────────────────────
  // Trip handling
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Record a kill-switch trip. `tripped_at` is the wall-clock time the
   * physical/MTConnect/software event fired; `now` defaults to Date.now()
   * and represents PRISM's acknowledgment time. Latency is the delta.
   */
  trip(input: {
    level: Exclude<KillLevel, "OK">;
    source: TripSource;
    reason: string;
    tripped_at: number;
    now?: number;
    triggered_by?: string;
    metadata?: Record<string, unknown>;
  }): KillEvent {
    if (!input.reason.trim()) throw new Error("reason required");
    const sla = this.slas[input.level];
    const ack = input.now ?? Date.now();
    if (ack < input.tripped_at) {
      throw new Error("acknowledged_at cannot precede tripped_at");
    }
    const ack_latency_ms = ack - input.tripped_at;
    const ev: KillEvent = {
      seq: ++this.seq,
      level: input.level,
      source: input.source,
      reason: input.reason,
      tripped_at: input.tripped_at,
      acknowledged_at: ack,
      ack_latency_ms,
      within_sla: ack_latency_ms <= sla.ack_sla_ms,
      runbook_id: sla.runbook_id,
      triggered_by: input.triggered_by,
      metadata: input.metadata,
    };
    this.trips.push(ev);
    // Overwrites any prior active trip at the same level (newer trip
    // supersedes — operator still must reset it explicitly).
    this.activeByLevel[input.level] = ev;
    return ev;
  }

  /**
   * Clear an active trip. Requires authorization + evidence that the
   * triggering condition is resolved. runbook_completed=false is still
   * accepted but flagged — policy decides whether to escalate.
   */
  reset(input: {
    level: Exclude<KillLevel, "OK">;
    authorized_by: string;
    evidence: string;
    runbook_completed: boolean;
  }): KillResetEvent {
    const active = this.activeByLevel[input.level];
    if (!active) throw new Error(`no active trip at ${input.level}`);
    if (!input.authorized_by.trim()) throw new Error("authorized_by required");
    if (input.evidence.trim().length < 10) {
      throw new Error("evidence must be ≥10 chars (audit requirement)");
    }
    const ev: KillResetEvent = {
      seq: ++this.seq,
      level_reset: input.level,
      trip_seq: active.seq,
      reset_at: Date.now(),
      authorized_by: input.authorized_by,
      evidence: input.evidence,
      runbook_completed: input.runbook_completed,
    };
    this.resets.push(ev);
    delete this.activeByLevel[input.level];
    return ev;
  }

  // ──────────────────────────────────────────────────────────────────────
  // State inspection
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Returns the dominant active level (L1 > L2 > L3 > OK), the last trip
   * event (any level), and a gate-open boolean (true iff no active trips).
   */
  getActiveState(): ActiveState {
    let dominantLevel: KillLevel = "OK";
    let dominantScore = 0;
    for (const level of Object.keys(this.activeByLevel) as Array<Exclude<KillLevel, "OK">>) {
      if (LEVEL_ORDER[level] > dominantScore) {
        dominantScore = LEVEL_ORDER[level];
        dominantLevel = level;
      }
    }
    return {
      level: dominantLevel,
      last_trip: this.trips.length ? this.trips[this.trips.length - 1] : null,
      active_by_level: { ...this.activeByLevel },
      gate_open: dominantLevel === "OK",
    };
  }

  /**
   * True iff the software gate (L3) would admit a dispatcher write. The
   * gate closes on any active L3 trip. L1/L2 do not block PRISM outputs
   * directly (the machine does), but do block program release at the
   * runbook level — callers should check getActiveState().gate_open for
   * the full cascade.
   */
  dispatcherGateOpen(): boolean {
    return !this.activeByLevel.L3_SOFTWARE;
  }

  listTrips(filter?: {
    level?: Exclude<KillLevel, "OK">;
    source?: TripSource;
    since?: number;
    limit?: number;
  }): KillEvent[] {
    let out = this.trips.slice();
    if (filter?.level) out = out.filter(t => t.level === filter.level);
    if (filter?.source) out = out.filter(t => t.source === filter.source);
    if (filter?.since !== undefined) {
      const since = filter.since;
      out = out.filter(t => t.tripped_at >= since);
    }
    if (filter?.limit !== undefined) out = out.slice(-filter.limit);
    return out;
  }

  listResets(limit = 100): KillResetEvent[] {
    return this.resets.slice(-limit);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Stats
  // ──────────────────────────────────────────────────────────────────────

  getStats(): KillSwitchStats {
    const byLevel: Record<Exclude<KillLevel, "OK">, number> = {
      L1_PHYSICAL: 0, L2_MTCONNECT: 0, L3_SOFTWARE: 0,
    };
    const bySource: Record<TripSource, number> = {
      operator: 0, mtconnect_alarm: 0, mtconnect_watchdog: 0,
      collision_predicted: 0, auto_rollback: 0, runbook_escalation: 0,
      manual_api: 0,
    };
    const latencySum: Record<Exclude<KillLevel, "OK">, number> = {
      L1_PHYSICAL: 0, L2_MTCONNECT: 0, L3_SOFTWARE: 0,
    };
    const latencyCount: Record<Exclude<KillLevel, "OK">, number> = {
      L1_PHYSICAL: 0, L2_MTCONNECT: 0, L3_SOFTWARE: 0,
    };
    let violations = 0;
    for (const t of this.trips) {
      byLevel[t.level]++;
      bySource[t.source]++;
      latencySum[t.level] += t.ack_latency_ms;
      latencyCount[t.level]++;
      if (!t.within_sla) violations++;
    }
    const averages: Record<Exclude<KillLevel, "OK">, number> = {
      L1_PHYSICAL: latencyCount.L1_PHYSICAL ? latencySum.L1_PHYSICAL / latencyCount.L1_PHYSICAL : 0,
      L2_MTCONNECT: latencyCount.L2_MTCONNECT ? latencySum.L2_MTCONNECT / latencyCount.L2_MTCONNECT : 0,
      L3_SOFTWARE: latencyCount.L3_SOFTWARE ? latencySum.L3_SOFTWARE / latencyCount.L3_SOFTWARE : 0,
    };
    return {
      total_trips: this.trips.length,
      trips_by_level: byLevel,
      trips_by_source: bySource,
      sla_violations: violations,
      average_ack_latency_ms_by_level: averages,
      resets_total: this.resets.length,
      gate_open: this.getActiveState().gate_open,
    };
  }

  /**
   * Compliance posture: returns violations per level + overall pass/fail
   * against the plan targets (L1 ≤1s, L2 ≤500ms, L3 ≤2s).
   */
  complianceReport(since?: number): {
    per_level: Record<Exclude<KillLevel, "OK">, { trips: number; violations: number; p95_latency_ms: number }>;
    overall_pass: boolean;
    violation_rate: number;
  } {
    const filtered = since === undefined
      ? this.trips
      : this.trips.filter(t => t.tripped_at >= since);
    const levels: Array<Exclude<KillLevel, "OK">> = ["L1_PHYSICAL", "L2_MTCONNECT", "L3_SOFTWARE"];
    const per_level = {} as Record<Exclude<KillLevel, "OK">, { trips: number; violations: number; p95_latency_ms: number }>;
    for (const level of levels) {
      const forLevel = filtered.filter(t => t.level === level);
      const lats = forLevel.map(t => t.ack_latency_ms).sort((a, b) => a - b);
      const p95 = lats.length
        ? this.quantileR7(lats, 0.95)
        : 0;
      per_level[level] = {
        trips: forLevel.length,
        violations: forLevel.filter(t => !t.within_sla).length,
        p95_latency_ms: p95,
      };
    }
    const totalTrips = filtered.length;
    const totalViolations = filtered.filter(t => !t.within_sla).length;
    return {
      per_level,
      overall_pass: totalViolations === 0,
      violation_rate: totalTrips === 0 ? 0 : totalViolations / totalTrips,
    };
  }

  clearAll(): void {
    this.trips.length = 0;
    this.resets.length = 0;
    this.activeByLevel = {};
    this.seq = 0;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────────────

  /**
   * R-7 (Hyndman-Fan Type 7) quantile, matching numpy default. Same
   * method used by U-LPR-PERF-SLO for SLO dashboards, keeping percentile
   * math consistent across PRISM.
   */
  private quantileR7(sortedAsc: number[], q: number): number {
    if (!sortedAsc.length) return 0;
    if (q <= 0) return sortedAsc[0];
    if (q >= 1) return sortedAsc[sortedAsc.length - 1];
    const h = (sortedAsc.length - 1) * q;
    const lo = Math.floor(h);
    const hi = Math.ceil(h);
    if (lo === hi) return sortedAsc[lo];
    return sortedAsc[lo] + (h - lo) * (sortedAsc[hi] - sortedAsc[lo]);
  }
}

export const triLevelKillSwitchEngine = new TriLevelKillSwitchEngine();
