/**
 * WetRunDeviationRegistryEngine
 * ------------------------------------------------------------
 * Append-only registry of programmatic deviations from the
 * approved pilot plan. Operators frequently need to swap a
 * tool, bump feed/speed, or tweak a fixture mid-run. Each such
 * change is a deviation from the signed plan and must be
 * tracked so auditors can reconstruct what actually ran.
 *
 * States
 *   • pending_justification — CRITICAL deviation that fired
 *     mid-run with no pre-approval yet; justification window
 *     is 24h from occurrence or the deviation enters
 *     unjustified_overdue (a hard stop for pilot promotion).
 *   • justified — retroactively justified by a named approver
 *     distinct from the requester (four-eyes).
 *   • approved — pre-approved deviation; requester and approver
 *     must still differ.
 *   • rejected — approver rejected the deviation; future runs
 *     must not repeat it.
 *
 * Promotion check
 *   promotionReadiness(pilot_id, nowTs) returns a reason-ed
 *   verdict. Any unjustified_overdue deviation is a hard stop;
 *   a configurable cap on majors (default 3) and a zero cap on
 *   critical rejections are enforced.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-DEVIATION
 */

// ============================================================================
// Constants
// ============================================================================

const HOUR_MS = 60 * 60 * 1000;
const CRITICAL_JUSTIFICATION_WINDOW_MS = 24 * HOUR_MS;

const MIN_REASON_CHARS = 30;
const MIN_JUSTIFICATION_CHARS = 40;
const MIN_REJECTION_CHARS = 30;
const MIN_NAME_CHARS = 2;

const DEFAULT_MAX_MAJORS = 3;

// ============================================================================
// Types
// ============================================================================

export type DeviationKind =
  | "tool_substitution"
  | "feed_override"
  | "speed_override"
  | "material_substitution"
  | "scope_change"
  | "fixture_change"
  | "inspection_skip"
  | "coolant_change";

export type Severity = "minor" | "major" | "critical";

export type DeviationState =
  | "pending_justification"
  | "justified"
  | "approved"
  | "rejected"
  | "unjustified_overdue";

export interface DeviationEntry {
  id: string;
  pilot_id: string;
  seq: number;
  occurred_at: number;
  kind: DeviationKind;
  severity: Severity;
  state: DeviationState;
  requester: string;
  approver?: string;
  reason: string; // describes the deviation itself
  justification?: string; // retroactive justification text
  rejection_reason?: string;
  recorded_at: number; // when request/approval recorded
  resolution_at?: number;
}

export interface RecordInput {
  pilot_id: string;
  occurred_at: number;
  recorded_at: number;
  kind: DeviationKind;
  severity: Severity;
  requester: string;
  reason: string;
  pre_approval?: {
    approver: string;
  };
}

export interface JustifyInput {
  deviation_id: string;
  approver: string;
  justification: string;
  resolution_at: number;
}

export interface RejectInput {
  deviation_id: string;
  approver: string;
  rejection_reason: string;
  resolution_at: number;
}

export interface PromotionVerdict {
  ready: boolean;
  reasons: string[];
  overdue_critical: number;
  major_count: number;
  rejected_critical: number;
  pending_justification: number;
}

export interface DeviationStats {
  total: number;
  by_kind: Record<DeviationKind, number>;
  by_severity: Record<Severity, number>;
  by_state: Record<DeviationState, number>;
}

export interface Snapshot {
  schemaVersion: 1;
  entries: DeviationEntry[];
  last_seq_by_pilot: Record<string, number>;
  max_majors: number;
}

// ============================================================================
// Engine
// ============================================================================

export class WetRunDeviationRegistryEngine {
  private entries: DeviationEntry[] = [];
  private lastSeqByPilot = new Map<string, number>();
  private maxMajors: number = DEFAULT_MAX_MAJORS;

  // --------------------------------------------------------------------
  // configure
  // --------------------------------------------------------------------
  configure(opts: { max_majors?: number }): void {
    if (opts.max_majors !== undefined) {
      if (!Number.isInteger(opts.max_majors) || opts.max_majors < 0) {
        throw new Error(`max_majors must be a non-negative integer`);
      }
      this.maxMajors = opts.max_majors;
    }
  }

  maxMajorsConfigured(): number {
    return this.maxMajors;
  }

  // --------------------------------------------------------------------
  // record — register a deviation (pre-approved or pending)
  // --------------------------------------------------------------------
  record(input: RecordInput): DeviationEntry {
    this.validateString(input.pilot_id, "pilot_id");
    this.validateString(input.requester, "requester", MIN_NAME_CHARS);
    this.validateKind(input.kind);
    this.validateSeverity(input.severity);
    this.validateTs(input.occurred_at, "occurred_at");
    this.validateTs(input.recorded_at, "recorded_at");
    if (input.recorded_at < input.occurred_at) {
      throw new Error(
        `recorded_at cannot precede occurred_at: recorded=${input.recorded_at} occurred=${input.occurred_at}`,
      );
    }
    this.validateReason(input.reason, MIN_REASON_CHARS, "reason");

    let state: DeviationState;
    let approver: string | undefined;
    if (input.pre_approval) {
      this.validateString(
        input.pre_approval.approver,
        "pre_approval.approver",
        MIN_NAME_CHARS,
      );
      if (input.pre_approval.approver === input.requester) {
        throw new Error(`approver must differ from requester (four-eyes)`);
      }
      approver = input.pre_approval.approver;
      state = "approved";
    } else {
      state =
        input.severity === "critical" ? "pending_justification" : "approved";
      // minor/major without explicit approver are auto-approved by the
      // "implicit shop floor authority" — but a reason is still required,
      // and critical always requires an explicit approval path.
    }

    const prevSeq = this.lastSeqByPilot.get(input.pilot_id) ?? 0;
    const seq = prevSeq + 1;
    const id = `dev:${input.pilot_id}:${seq.toString().padStart(6, "0")}`;
    const entry: DeviationEntry = {
      id,
      pilot_id: input.pilot_id,
      seq,
      occurred_at: input.occurred_at,
      kind: input.kind,
      severity: input.severity,
      state,
      requester: input.requester,
      approver,
      reason: input.reason.trim(),
      recorded_at: input.recorded_at,
      resolution_at: state === "approved" ? input.recorded_at : undefined,
    };
    this.entries.push(entry);
    this.lastSeqByPilot.set(input.pilot_id, seq);
    return { ...entry };
  }

  // --------------------------------------------------------------------
  // justify — retroactively justify a critical deviation
  // --------------------------------------------------------------------
  justify(input: JustifyInput): DeviationEntry {
    const entry = this.mustGet(input.deviation_id);
    if (
      entry.state !== "pending_justification" &&
      entry.state !== "unjustified_overdue"
    ) {
      throw new Error(
        `deviation ${entry.id} is not awaiting justification (state=${entry.state})`,
      );
    }
    this.validateString(input.approver, "approver", MIN_NAME_CHARS);
    this.validateReason(
      input.justification,
      MIN_JUSTIFICATION_CHARS,
      "justification",
    );
    this.validateTs(input.resolution_at, "resolution_at");
    if (input.resolution_at < entry.occurred_at) {
      throw new Error(
        `resolution_at cannot precede occurred_at`,
      );
    }
    if (input.approver === entry.requester) {
      throw new Error(`approver must differ from requester (four-eyes)`);
    }

    entry.state = "justified";
    entry.approver = input.approver;
    entry.justification = input.justification.trim();
    entry.resolution_at = input.resolution_at;
    return { ...entry };
  }

  // --------------------------------------------------------------------
  // reject — approver refuses the deviation; future runs must not repeat
  // --------------------------------------------------------------------
  reject(input: RejectInput): DeviationEntry {
    const entry = this.mustGet(input.deviation_id);
    if (
      entry.state !== "pending_justification" &&
      entry.state !== "unjustified_overdue"
    ) {
      throw new Error(
        `deviation ${entry.id} is not awaiting review (state=${entry.state})`,
      );
    }
    this.validateString(input.approver, "approver", MIN_NAME_CHARS);
    this.validateReason(
      input.rejection_reason,
      MIN_REJECTION_CHARS,
      "rejection_reason",
    );
    this.validateTs(input.resolution_at, "resolution_at");
    if (input.resolution_at < entry.occurred_at) {
      throw new Error(`resolution_at cannot precede occurred_at`);
    }
    if (input.approver === entry.requester) {
      throw new Error(`approver must differ from requester (four-eyes)`);
    }

    entry.state = "rejected";
    entry.approver = input.approver;
    entry.rejection_reason = input.rejection_reason.trim();
    entry.resolution_at = input.resolution_at;
    return { ...entry };
  }

  // --------------------------------------------------------------------
  // sweepOverdue — promote pending_justification to unjustified_overdue
  // --------------------------------------------------------------------
  sweepOverdue(nowTs: number): DeviationEntry[] {
    this.validateTs(nowTs, "nowTs");
    const swept: DeviationEntry[] = [];
    for (const entry of this.entries) {
      if (entry.state !== "pending_justification") continue;
      const deadline = entry.occurred_at + CRITICAL_JUSTIFICATION_WINDOW_MS;
      if (nowTs > deadline) {
        entry.state = "unjustified_overdue";
        swept.push({ ...entry });
      }
    }
    return swept;
  }

  // --------------------------------------------------------------------
  // promotionReadiness — verdict + reasons for pilot promotion
  // --------------------------------------------------------------------
  promotionReadiness(pilotId: string, nowTs: number): PromotionVerdict {
    this.validateTs(nowTs, "nowTs");
    // Surface pending→overdue before judging
    this.sweepOverdue(nowTs);

    const mine = this.entries.filter((e) => e.pilot_id === pilotId);
    const overdueCritical = mine.filter(
      (e) => e.state === "unjustified_overdue",
    ).length;
    const pendingJustification = mine.filter(
      (e) => e.state === "pending_justification",
    ).length;
    const rejectedCritical = mine.filter(
      (e) => e.state === "rejected" && e.severity === "critical",
    ).length;
    const majorCount = mine.filter(
      (e) =>
        e.severity === "major" &&
        (e.state === "approved" || e.state === "justified"),
    ).length;

    const reasons: string[] = [];
    if (overdueCritical > 0) {
      reasons.push(
        `${overdueCritical} critical deviation(s) overdue justification`,
      );
    }
    if (rejectedCritical > 0) {
      reasons.push(
        `${rejectedCritical} critical deviation(s) rejected by approver`,
      );
    }
    if (majorCount > this.maxMajors) {
      reasons.push(
        `major deviation count ${majorCount} exceeds threshold ${this.maxMajors}`,
      );
    }
    if (pendingJustification > 0) {
      reasons.push(
        `${pendingJustification} critical deviation(s) still pending justification`,
      );
    }

    return {
      ready: reasons.length === 0,
      reasons,
      overdue_critical: overdueCritical,
      major_count: majorCount,
      rejected_critical: rejectedCritical,
      pending_justification: pendingJustification,
    };
  }

  // --------------------------------------------------------------------
  // stats
  // --------------------------------------------------------------------
  stats(pilotId?: string): DeviationStats {
    const mine = pilotId
      ? this.entries.filter((e) => e.pilot_id === pilotId)
      : this.entries;
    const byKind: Record<DeviationKind, number> = {
      tool_substitution: 0,
      feed_override: 0,
      speed_override: 0,
      material_substitution: 0,
      scope_change: 0,
      fixture_change: 0,
      inspection_skip: 0,
      coolant_change: 0,
    };
    const bySeverity: Record<Severity, number> = {
      minor: 0,
      major: 0,
      critical: 0,
    };
    const byState: Record<DeviationState, number> = {
      pending_justification: 0,
      justified: 0,
      approved: 0,
      rejected: 0,
      unjustified_overdue: 0,
    };
    for (const e of mine) {
      byKind[e.kind] += 1;
      bySeverity[e.severity] += 1;
      byState[e.state] += 1;
    }
    return {
      total: mine.length,
      by_kind: byKind,
      by_severity: bySeverity,
      by_state: byState,
    };
  }

  // --------------------------------------------------------------------
  // Readers
  // --------------------------------------------------------------------
  getEntry(id: string): DeviationEntry | undefined {
    const e = this.entries.find((x) => x.id === id);
    return e ? { ...e } : undefined;
  }

  listEntries(pilotId?: string): DeviationEntry[] {
    const mine = pilotId
      ? this.entries.filter((e) => e.pilot_id === pilotId)
      : this.entries;
    return mine.map((e) => ({ ...e }));
  }

  snapshot(): Snapshot {
    const last: Record<string, number> = {};
    for (const [k, v] of this.lastSeqByPilot) last[k] = v;
    return {
      schemaVersion: 1,
      entries: this.entries.map((e) => ({ ...e })),
      last_seq_by_pilot: last,
      max_majors: this.maxMajors,
    };
  }

  static criticalJustificationWindowMs(): number {
    return CRITICAL_JUSTIFICATION_WINDOW_MS;
  }

  // --------------------------------------------------------------------
  // Validators
  // --------------------------------------------------------------------
  private validateString(
    v: string,
    label: string,
    minChars = 1,
  ): void {
    if (typeof v !== "string" || v.trim().length < minChars) {
      throw new Error(
        `${label} must be a string of at least ${minChars} characters`,
      );
    }
  }

  private validateReason(
    v: string,
    minChars: number,
    label: string,
  ): void {
    if (typeof v !== "string" || v.trim().length < minChars) {
      throw new Error(
        `${label} must be at least ${minChars} characters (got ${
          typeof v === "string" ? v.trim().length : 0
        })`,
      );
    }
  }

  private validateKind(k: DeviationKind): void {
    const allowed: DeviationKind[] = [
      "tool_substitution",
      "feed_override",
      "speed_override",
      "material_substitution",
      "scope_change",
      "fixture_change",
      "inspection_skip",
      "coolant_change",
    ];
    if (!allowed.includes(k)) {
      throw new Error(`invalid deviation kind: ${k}`);
    }
  }

  private validateSeverity(s: Severity): void {
    if (s !== "minor" && s !== "major" && s !== "critical") {
      throw new Error(`invalid severity: ${s}`);
    }
  }

  private validateTs(ts: number, label: string): void {
    if (!Number.isFinite(ts)) {
      throw new Error(`${label} must be a finite number`);
    }
  }

  private mustGet(id: string): DeviationEntry {
    const e = this.entries.find((x) => x.id === id);
    if (!e) throw new Error(`deviation not found: ${id}`);
    return e;
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const wetRunDeviationRegistryEngine =
  new WetRunDeviationRegistryEngine();
