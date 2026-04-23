/**
 * MOUStallGateEngine (U-LPR-STALL-MOU, Delivery B2)
 *
 * Contractual-blocker tracker for the Lathe-Prod pilot. If the MOU (or
 * any other dependency marked with a T+N deadline) is still unsigned at
 * `kickoff_ts + deadline_ms`, this engine auto-flips the affected work
 * into `dry_run_only` mode and records the list of units that get
 * deferred to the post-MS0 backlog. When the blocker signs, the engine
 * clears the stall and re-activates the deferred units for an explicit
 * "resume" decision (resume is not automatic — ops has to acknowledge).
 *
 * States per blocker:
 *
 *   open          — registered, waiting on signature before T+deadline.
 *   stalled       — T+deadline elapsed, status still unsigned. All
 *                   dependent units are deferred. New reads against the
 *                   gate report `mode=dry_run_only`.
 *   signed        — signed before deadline OR signed after stall (which
 *                   auto-clears stall but leaves deferred units flagged
 *                   for ops review).
 *   waived        — legal authorised running without signature;
 *                   requires justification ≥50 chars + named approver.
 *   cancelled     — blocker withdrawn entirely; units move to 'cancelled'.
 *
 * Gate mode the caller reads before allowing wet-run work:
 *   full          — all blockers signed or waived.
 *   dry_run_only  — at least one blocker stalled/open past deadline.
 *   blocked       — at least one blocker cancelled without waiver.
 *
 * Pure engine. Caller persists via `toSnapshot()` to
 * `data/state/DELIVERY_STALLS.json` (schemaVersion 1).
 *
 * Refs:
 *   - ANSI/PMI PMBOK 7th ed. §2.8 on contractual dependency tracking.
 *   - SRE "error budget" pattern adapted to contractual-risk budgets.
 */

export type BlockerStatus =
  | "open"
  | "stalled"
  | "signed"
  | "waived"
  | "cancelled";

export type GateMode = "full" | "dry_run_only" | "blocked";

export interface BlockerRegistration {
  blocker_id: string;
  title: string;                   // e.g. "JM Die MOU v2"
  kickoff_ts: number;              // epoch ms — when the clock starts
  deadline_ms: number;             // relative deadline (e.g. 10·24·3600·1000)
  owner: string;                   // responsible owner
  dependent_units: string[];       // e.g. ["U-LPR-WETRUN-*"]
  criticality: "critical" | "high" | "medium" | "low";
  notes?: string;
}

export interface BlockerRecord {
  blocker_id: string;
  title: string;
  status: BlockerStatus;
  kickoff_ts: number;
  deadline_ts: number;              // kickoff_ts + deadline_ms
  signed_at?: number;
  signed_by?: string;
  signature_uri?: string;
  waived_at?: number;
  waived_by?: string;
  waiver_reason?: string;
  stalled_at?: number;
  cleared_at?: number;
  cancelled_at?: number;
  cancelled_reason?: string;
  owner: string;
  dependent_units: string[];
  deferred_units: string[];         // units currently sitting in backlog
  criticality: BlockerRegistration["criticality"];
  notes?: string;
}

export interface GateDecision {
  mode: GateMode;
  reasons: string[];
  stalled_blockers: string[];
  blocked_blockers: string[];
  waived_blockers: string[];
  deferred_units: string[];
}

export class MOUStallGateEngine {
  private blockers = new Map<string, BlockerRecord>();

  register(input: BlockerRegistration): BlockerRecord {
    if (!input.blocker_id.trim()) throw new Error("blocker_id required");
    if (!input.title.trim()) throw new Error("title required");
    if (!input.owner.trim()) throw new Error("owner required");
    if (!Number.isFinite(input.kickoff_ts) || input.kickoff_ts <= 0) {
      throw new Error("kickoff_ts must be a positive epoch-ms");
    }
    if (input.deadline_ms <= 0) {
      throw new Error("deadline_ms must be >0");
    }
    if (this.blockers.has(input.blocker_id)) {
      throw new Error(`blocker ${input.blocker_id} already registered`);
    }
    if (input.dependent_units.length === 0) {
      throw new Error("at least one dependent_unit required");
    }
    const rec: BlockerRecord = {
      blocker_id: input.blocker_id.trim(),
      title: input.title.trim(),
      status: "open",
      kickoff_ts: input.kickoff_ts,
      deadline_ts: input.kickoff_ts + input.deadline_ms,
      owner: input.owner.trim(),
      dependent_units: [...input.dependent_units],
      deferred_units: [],
      criticality: input.criticality,
      notes: input.notes?.trim() || undefined,
    };
    this.blockers.set(rec.blocker_id, rec);
    return this.snapshot(rec);
  }

  sign(input: {
    blocker_id: string;
    signed_at: number;
    signed_by: string;
    signature_uri?: string;
  }): BlockerRecord {
    const b = this.mustFind(input.blocker_id);
    if (b.status === "signed") {
      throw new Error(`blocker ${b.blocker_id} already signed`);
    }
    if (b.status === "cancelled") {
      throw new Error(`blocker ${b.blocker_id} cancelled — cannot sign`);
    }
    if (!input.signed_by.trim()) throw new Error("signed_by required");
    if (input.signed_at < b.kickoff_ts) {
      throw new Error("signed_at cannot precede kickoff_ts");
    }
    const wasStalled = b.status === "stalled";
    b.status = "signed";
    b.signed_at = input.signed_at;
    b.signed_by = input.signed_by.trim();
    b.signature_uri = input.signature_uri?.trim() || undefined;
    if (wasStalled) {
      b.cleared_at = input.signed_at;
      // Deferred units stay flagged; ops must explicitly re-activate
      // via resumeDeferredUnits().
    }
    return this.snapshot(b);
  }

  /** Legal-approved bypass. Requires ≥50 char justification + named approver. */
  waive(input: {
    blocker_id: string;
    waived_at: number;
    waived_by: string;
    reason: string;
  }): BlockerRecord {
    const b = this.mustFind(input.blocker_id);
    if (b.status === "signed" || b.status === "cancelled") {
      throw new Error(`cannot waive blocker in status=${b.status}`);
    }
    if (!input.waived_by.trim()) throw new Error("waived_by required");
    if (!input.reason || input.reason.trim().length < 50) {
      throw new Error("waiver reason must be ≥50 chars");
    }
    b.status = "waived";
    b.waived_at = input.waived_at;
    b.waived_by = input.waived_by.trim();
    b.waiver_reason = input.reason.trim();
    if (b.stalled_at !== undefined) b.cleared_at = input.waived_at;
    return this.snapshot(b);
  }

  cancel(input: {
    blocker_id: string;
    cancelled_at: number;
    reason: string;
  }): BlockerRecord {
    const b = this.mustFind(input.blocker_id);
    if (b.status === "signed") {
      throw new Error("signed blocker cannot be cancelled");
    }
    if (!input.reason || input.reason.trim().length < 20) {
      throw new Error("cancellation reason must be ≥20 chars");
    }
    b.status = "cancelled";
    b.cancelled_at = input.cancelled_at;
    b.cancelled_reason = input.reason.trim();
    // Mark all dependents as deferred (their fate in backlog)
    b.deferred_units = [...b.dependent_units];
    return this.snapshot(b);
  }

  /** Re-activate deferred units after a stall clears. Returns count moved. */
  resumeDeferredUnits(blocker_id: string): number {
    const b = this.mustFind(blocker_id);
    if (b.status !== "signed" && b.status !== "waived") {
      throw new Error(
        `blocker ${blocker_id} status=${b.status}; resume requires signed|waived`,
      );
    }
    const n = b.deferred_units.length;
    b.deferred_units = [];
    return n;
  }

  /**
   * Sweep all open blockers past deadline → stalled. Returns list of
   * blockers that just transitioned.
   */
  sweepDeadlines(now: number): BlockerRecord[] {
    const transitioned: BlockerRecord[] = [];
    for (const b of this.blockers.values()) {
      if (b.status !== "open") continue;
      if (now >= b.deadline_ts) {
        b.status = "stalled";
        b.stalled_at = now;
        b.deferred_units = [...b.dependent_units];
        transitioned.push(this.snapshot(b));
      }
    }
    return transitioned;
  }

  /** Caller reads this before allowing wet-run work. */
  computeGate(now?: number): GateDecision {
    const ts = now ?? Date.now();
    const reasons: string[] = [];
    const stalled: string[] = [];
    const blocked: string[] = [];
    const waived: string[] = [];
    const deferred = new Set<string>();
    for (const b of this.blockers.values()) {
      // Late sweep: callers typically call sweepDeadlines first; be
      // defensive and treat any open past-deadline as stalled for
      // the purposes of this read.
      const effective_status =
        b.status === "open" && ts >= b.deadline_ts ? "stalled" : b.status;
      switch (effective_status) {
        case "stalled":
          stalled.push(b.blocker_id);
          reasons.push(
            `${b.blocker_id} (${b.title}) stalled past ${new Date(b.deadline_ts).toISOString()}`,
          );
          for (const u of b.deferred_units.length > 0 ? b.deferred_units : b.dependent_units) {
            deferred.add(u);
          }
          break;
        case "cancelled":
          blocked.push(b.blocker_id);
          reasons.push(`${b.blocker_id} cancelled: ${b.cancelled_reason}`);
          for (const u of b.deferred_units) deferred.add(u);
          break;
        case "waived":
          waived.push(b.blocker_id);
          break;
        case "signed":
          // no gate impact
          break;
        case "open":
          // within deadline — does not gate work
          break;
      }
    }
    let mode: GateMode;
    if (blocked.length > 0) mode = "blocked";
    else if (stalled.length > 0) mode = "dry_run_only";
    else mode = "full";
    return {
      mode,
      reasons,
      stalled_blockers: stalled,
      blocked_blockers: blocked,
      waived_blockers: waived,
      deferred_units: Array.from(deferred),
    };
  }

  getBlocker(blocker_id: string): BlockerRecord | null {
    const b = this.blockers.get(blocker_id);
    return b ? this.snapshot(b) : null;
  }

  listBlockers(filter?: { status?: BlockerStatus }): BlockerRecord[] {
    const out: BlockerRecord[] = [];
    for (const b of this.blockers.values()) {
      if (filter?.status && b.status !== filter.status) continue;
      out.push(this.snapshot(b));
    }
    return out;
  }

  toSnapshot(): { schemaVersion: 1; blockers: BlockerRecord[] } {
    return { schemaVersion: 1, blockers: this.listBlockers() };
  }

  loadSnapshot(snap: { schemaVersion: number; blockers: BlockerRecord[] }): void {
    if (snap.schemaVersion !== 1) {
      throw new Error(`unsupported schemaVersion ${snap.schemaVersion}`);
    }
    this.blockers.clear();
    for (const b of snap.blockers) {
      this.blockers.set(b.blocker_id, this.snapshot(b));
    }
  }

  clearAll(): void {
    this.blockers.clear();
  }

  private mustFind(id: string): BlockerRecord {
    const b = this.blockers.get(id);
    if (!b) throw new Error(`blocker ${id} not found`);
    return b;
  }

  private snapshot(b: BlockerRecord): BlockerRecord {
    return {
      ...b,
      dependent_units: [...b.dependent_units],
      deferred_units: [...b.deferred_units],
    };
  }
}

export const mouStallGateEngine = new MOUStallGateEngine();
