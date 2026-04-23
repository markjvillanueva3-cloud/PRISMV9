/**
 * WetRunRetentionPolicyEngine
 * ------------------------------------------------------------
 * Enforces data-retention rules for wet-run pilot artifacts
 * (programs, session logs, NCRs, FAI reports, comms logs, scrap
 * ledger rows, etc.). Every registered artifact gets a
 * retention_class that pins its purge_eligible_at timestamp
 * based on the most stringent regulatory regime that applies.
 *
 * Regime windows (days, most common shop regimes):
 *   ITAR                5 × 365
 *   AS9100              2 × 365
 *   ISO_9001            3 × 365
 *   IATF_16949          15 × 365  (automotive — lifetime + 15y)
 *   FDA_21CFR820        7 × 365   (medical device)
 *   INTERNAL_RND         1 × 365
 *
 * When multiple regimes apply to a single artifact, the
 * effective retention is the maximum window. Legal hold takes
 * absolute precedence: a held artifact cannot be purged
 * regardless of regime expiry, and hold release is itself
 * four-eyes-approved.
 *
 * Purge workflow
 *   schedulePurge   proposes a purge with four-eyes approval
 *                   and a target_purge_at ≥ purge_eligible_at.
 *   executePurge    marks the artifact purged once the target
 *                   timestamp is reached. Re-purging is a no-op
 *                   with a clear error.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-RETENTION
 */

// ============================================================================
// Constants
// ============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

const REGIME_WINDOW_DAYS: Record<Regime, number> = {
  ITAR: 5 * 365,
  AS9100: 2 * 365,
  ISO_9001: 3 * 365,
  IATF_16949: 15 * 365,
  FDA_21CFR820: 7 * 365,
  INTERNAL_RND: 1 * 365,
};

const MIN_REASON_CHARS = 40;
const MIN_NAME_CHARS = 2;

// ============================================================================
// Types
// ============================================================================

export type Regime =
  | "ITAR"
  | "AS9100"
  | "ISO_9001"
  | "IATF_16949"
  | "FDA_21CFR820"
  | "INTERNAL_RND";

export type ArtifactKind =
  | "program_revision"
  | "session_log"
  | "ncr_record"
  | "fai_report"
  | "comms_log_entry"
  | "scrap_ledger_row"
  | "deviation_record"
  | "post_mortem_doc"
  | "tool_library_snapshot";

export type ArtifactState =
  | "retained"
  | "purge_scheduled"
  | "purged"
  | "legal_hold";

export interface RegisteredArtifact {
  artifact_id: string;
  pilot_id: string;
  kind: ArtifactKind;
  regimes: Regime[];
  created_at: number;
  purge_eligible_at: number; // created_at + max regime window
  state: ArtifactState;
  purge_target_at?: number;
  purge_scheduled_by?: string;
  purge_scheduled_approver?: string;
  purge_schedule_reason?: string;
  purged_at?: number;
  legal_hold_reason?: string;
  legal_hold_set_by?: string;
  legal_hold_approver?: string;
  legal_hold_set_at?: number;
  legal_hold_released_at?: number;
  legal_hold_release_reason?: string;
}

export interface RegisterInput {
  artifact_id: string;
  pilot_id: string;
  kind: ArtifactKind;
  regimes: Regime[];
  created_at: number;
}

export interface SchedulePurgeInput {
  artifact_id: string;
  target_purge_at: number;
  scheduled_by: string;
  approver: string;
  reason: string;
}

export interface LegalHoldInput {
  artifact_id: string;
  set_by: string;
  approver: string;
  reason: string;
  set_at: number;
}

export interface HoldReleaseInput {
  artifact_id: string;
  released_by: string;
  approver: string;
  reason: string;
  released_at: number;
}

export interface PurgeCheck {
  allowed: boolean;
  reason: string;
}

export interface Snapshot {
  schemaVersion: 1;
  artifacts: RegisteredArtifact[];
}

// ============================================================================
// Engine
// ============================================================================

export class WetRunRetentionPolicyEngine {
  private artifacts = new Map<string, RegisteredArtifact>();

  // --------------------------------------------------------------------
  // register
  // --------------------------------------------------------------------
  register(input: RegisterInput): RegisteredArtifact {
    this.validateString(input.artifact_id, "artifact_id");
    this.validateString(input.pilot_id, "pilot_id");
    this.validateKind(input.kind);
    this.validateTs(input.created_at, "created_at");
    this.validateRegimes(input.regimes);
    if (this.artifacts.has(input.artifact_id)) {
      throw new Error(`artifact already registered: ${input.artifact_id}`);
    }
    const windowDays = Math.max(
      ...input.regimes.map((r) => REGIME_WINDOW_DAYS[r]),
    );
    const art: RegisteredArtifact = {
      artifact_id: input.artifact_id,
      pilot_id: input.pilot_id,
      kind: input.kind,
      regimes: [...input.regimes].sort(),
      created_at: input.created_at,
      purge_eligible_at: input.created_at + windowDays * DAY_MS,
      state: "retained",
    };
    this.artifacts.set(input.artifact_id, art);
    return { ...art, regimes: [...art.regimes] };
  }

  // --------------------------------------------------------------------
  // canPurge — query whether an artifact may be purged now
  // --------------------------------------------------------------------
  canPurge(artifactId: string, nowTs: number): PurgeCheck {
    const art = this.mustGet(artifactId);
    this.validateTs(nowTs, "nowTs");
    if (art.state === "purged") {
      return { allowed: false, reason: "already purged" };
    }
    if (art.state === "legal_hold") {
      return {
        allowed: false,
        reason: `legal hold in effect: ${art.legal_hold_reason ?? "(no reason recorded)"}`,
      };
    }
    if (nowTs < art.purge_eligible_at) {
      const daysLeft = Math.ceil(
        (art.purge_eligible_at - nowTs) / DAY_MS,
      );
      return {
        allowed: false,
        reason: `retention window not yet expired (${daysLeft} days remain)`,
      };
    }
    if (
      art.state === "purge_scheduled" &&
      art.purge_target_at !== undefined &&
      nowTs < art.purge_target_at
    ) {
      const daysLeft = Math.ceil(
        (art.purge_target_at - nowTs) / DAY_MS,
      );
      return {
        allowed: false,
        reason: `scheduled purge not yet reached (${daysLeft} days remain)`,
      };
    }
    return { allowed: true, reason: "eligible for purge" };
  }

  // --------------------------------------------------------------------
  // schedulePurge — four-eyes approval required
  // --------------------------------------------------------------------
  schedulePurge(input: SchedulePurgeInput): RegisteredArtifact {
    const art = this.mustGet(input.artifact_id);
    if (art.state !== "retained") {
      throw new Error(
        `cannot schedule purge in state ${art.state} (artifact=${art.artifact_id})`,
      );
    }
    this.validateTs(input.target_purge_at, "target_purge_at");
    if (input.target_purge_at < art.purge_eligible_at) {
      throw new Error(
        `target_purge_at ${input.target_purge_at} precedes retention window end ${art.purge_eligible_at}`,
      );
    }
    this.validateString(input.scheduled_by, "scheduled_by", MIN_NAME_CHARS);
    this.validateString(input.approver, "approver", MIN_NAME_CHARS);
    if (input.scheduled_by === input.approver) {
      throw new Error(`four-eyes: scheduled_by must differ from approver`);
    }
    if (input.reason.trim().length < MIN_REASON_CHARS) {
      throw new Error(
        `purge reason must be at least ${MIN_REASON_CHARS} characters`,
      );
    }

    art.state = "purge_scheduled";
    art.purge_target_at = input.target_purge_at;
    art.purge_scheduled_by = input.scheduled_by;
    art.purge_scheduled_approver = input.approver;
    art.purge_schedule_reason = input.reason.trim();
    return { ...art, regimes: [...art.regimes] };
  }

  // --------------------------------------------------------------------
  // cancelScheduledPurge
  // --------------------------------------------------------------------
  cancelScheduledPurge(input: {
    artifact_id: string;
    cancelled_by: string;
    reason: string;
  }): RegisteredArtifact {
    const art = this.mustGet(input.artifact_id);
    if (art.state !== "purge_scheduled") {
      throw new Error(
        `cannot cancel purge in state ${art.state} (artifact=${art.artifact_id})`,
      );
    }
    this.validateString(input.cancelled_by, "cancelled_by", MIN_NAME_CHARS);
    if (input.reason.trim().length < MIN_REASON_CHARS) {
      throw new Error(
        `cancellation reason must be at least ${MIN_REASON_CHARS} characters`,
      );
    }
    art.state = "retained";
    art.purge_target_at = undefined;
    art.purge_scheduled_by = undefined;
    art.purge_scheduled_approver = undefined;
    art.purge_schedule_reason = undefined;
    return { ...art, regimes: [...art.regimes] };
  }

  // --------------------------------------------------------------------
  // executePurge — perform the actual purge
  // --------------------------------------------------------------------
  executePurge(input: {
    artifact_id: string;
    purged_at: number;
  }): RegisteredArtifact {
    const art = this.mustGet(input.artifact_id);
    this.validateTs(input.purged_at, "purged_at");
    const check = this.canPurge(input.artifact_id, input.purged_at);
    if (!check.allowed) {
      throw new Error(`cannot execute purge: ${check.reason}`);
    }
    if (art.state !== "purge_scheduled") {
      throw new Error(
        `purge must be scheduled before execution (state=${art.state})`,
      );
    }
    art.state = "purged";
    art.purged_at = input.purged_at;
    return { ...art, regimes: [...art.regimes] };
  }

  // --------------------------------------------------------------------
  // setLegalHold — pin artifact regardless of retention window
  // --------------------------------------------------------------------
  setLegalHold(input: LegalHoldInput): RegisteredArtifact {
    const art = this.mustGet(input.artifact_id);
    if (art.state === "purged") {
      throw new Error(`cannot place legal hold on already-purged artifact`);
    }
    if (art.state === "legal_hold") {
      throw new Error(`artifact already on legal hold`);
    }
    this.validateString(input.set_by, "set_by", MIN_NAME_CHARS);
    this.validateString(input.approver, "approver", MIN_NAME_CHARS);
    if (input.set_by === input.approver) {
      throw new Error(`four-eyes: set_by must differ from approver`);
    }
    if (input.reason.trim().length < MIN_REASON_CHARS) {
      throw new Error(
        `legal hold reason must be at least ${MIN_REASON_CHARS} characters`,
      );
    }
    this.validateTs(input.set_at, "set_at");

    // Remember prior state — a held artifact with a scheduled purge drops
    // the schedule entirely (legal hold supersedes).
    art.state = "legal_hold";
    art.purge_target_at = undefined;
    art.purge_scheduled_by = undefined;
    art.purge_scheduled_approver = undefined;
    art.purge_schedule_reason = undefined;
    art.legal_hold_reason = input.reason.trim();
    art.legal_hold_set_by = input.set_by;
    art.legal_hold_approver = input.approver;
    art.legal_hold_set_at = input.set_at;
    return { ...art, regimes: [...art.regimes] };
  }

  // --------------------------------------------------------------------
  // releaseLegalHold
  // --------------------------------------------------------------------
  releaseLegalHold(input: HoldReleaseInput): RegisteredArtifact {
    const art = this.mustGet(input.artifact_id);
    if (art.state !== "legal_hold") {
      throw new Error(
        `artifact ${art.artifact_id} is not on legal hold (state=${art.state})`,
      );
    }
    this.validateString(input.released_by, "released_by", MIN_NAME_CHARS);
    this.validateString(input.approver, "approver", MIN_NAME_CHARS);
    if (input.released_by === input.approver) {
      throw new Error(`four-eyes: released_by must differ from approver`);
    }
    if (input.reason.trim().length < MIN_REASON_CHARS) {
      throw new Error(
        `hold release reason must be at least ${MIN_REASON_CHARS} characters`,
      );
    }
    this.validateTs(input.released_at, "released_at");
    if (
      art.legal_hold_set_at !== undefined &&
      input.released_at < art.legal_hold_set_at
    ) {
      throw new Error(`released_at cannot precede legal_hold_set_at`);
    }
    art.state = "retained";
    art.legal_hold_released_at = input.released_at;
    art.legal_hold_release_reason = input.reason.trim();
    return { ...art, regimes: [...art.regimes] };
  }

  // --------------------------------------------------------------------
  // dueForPurge — list artifacts past eligibility not yet purged
  // --------------------------------------------------------------------
  dueForPurge(nowTs: number): RegisteredArtifact[] {
    this.validateTs(nowTs, "nowTs");
    const out: RegisteredArtifact[] = [];
    for (const art of this.artifacts.values()) {
      if (art.state === "purged") continue;
      if (art.state === "legal_hold") continue;
      if (nowTs >= art.purge_eligible_at) {
        out.push({ ...art, regimes: [...art.regimes] });
      }
    }
    return out;
  }

  // --------------------------------------------------------------------
  // Readers
  // --------------------------------------------------------------------
  get(id: string): RegisteredArtifact | undefined {
    const art = this.artifacts.get(id);
    return art ? { ...art, regimes: [...art.regimes] } : undefined;
  }

  listArtifacts(pilotId?: string): RegisteredArtifact[] {
    const out: RegisteredArtifact[] = [];
    for (const art of this.artifacts.values()) {
      if (pilotId !== undefined && art.pilot_id !== pilotId) continue;
      out.push({ ...art, regimes: [...art.regimes] });
    }
    return out;
  }

  snapshot(): Snapshot {
    return {
      schemaVersion: 1,
      artifacts: this.listArtifacts(),
    };
  }

  static regimeWindowDays(regime: Regime): number {
    return REGIME_WINDOW_DAYS[regime];
  }

  // --------------------------------------------------------------------
  // Validators
  // --------------------------------------------------------------------
  private validateString(v: string, label: string, minChars = 1): void {
    if (typeof v !== "string" || v.trim().length < minChars) {
      throw new Error(
        `${label} must be a string of at least ${minChars} characters`,
      );
    }
  }

  private validateKind(k: ArtifactKind): void {
    const allowed: ArtifactKind[] = [
      "program_revision",
      "session_log",
      "ncr_record",
      "fai_report",
      "comms_log_entry",
      "scrap_ledger_row",
      "deviation_record",
      "post_mortem_doc",
      "tool_library_snapshot",
    ];
    if (!allowed.includes(k)) throw new Error(`invalid artifact kind: ${k}`);
  }

  private validateRegimes(regimes: Regime[]): void {
    if (!Array.isArray(regimes) || regimes.length === 0) {
      throw new Error(`at least one regime required`);
    }
    const seen = new Set<Regime>();
    for (const r of regimes) {
      if (!(r in REGIME_WINDOW_DAYS)) {
        throw new Error(`invalid regime: ${r}`);
      }
      if (seen.has(r)) {
        throw new Error(`duplicate regime: ${r}`);
      }
      seen.add(r);
    }
  }

  private validateTs(ts: number, label: string): void {
    if (!Number.isFinite(ts)) throw new Error(`${label} must be finite`);
  }

  private mustGet(id: string): RegisteredArtifact {
    const art = this.artifacts.get(id);
    if (!art) throw new Error(`artifact not registered: ${id}`);
    return art;
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const wetRunRetentionPolicyEngine = new WetRunRetentionPolicyEngine();
