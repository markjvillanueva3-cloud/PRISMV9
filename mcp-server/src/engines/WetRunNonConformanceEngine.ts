/**
 * WetRunNonConformanceEngine
 * ------------------------------------------------------------
 * Non-Conformance Report (NCR) tracking for wet-run pilots.
 * Every part or process that fails inspection produces an NCR
 * that must be dispositioned by a qualified inspector, and —
 * for functional or safety severity — approved by an MRB
 * (Material Review Board) quorum.
 *
 * Severity semantics
 *   • cosmetic   — accept-as-is possible; 1 inspector signature
 *   • functional — may affect fit/function; requires ≥2 MRB
 *                  approvers distinct from the inspector
 *   • safety     — affects end-use safety; requires ≥3 MRB
 *                  approvers, sets pilot_halt_required, cannot
 *                  be dispositioned "use_as_is" without unanimous
 *                  MRB consent (≥3 approvers AND disposition
 *                  != use_as_is OR unanimous_consent=true)
 *
 * Disposition kinds (standard MRB outcomes):
 *   scrap, rework, use_as_is, return_to_supplier,
 *   MRB_review_required (placeholder when quorum not yet met)
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-NCR
 */

// ============================================================================
// Constants
// ============================================================================

const MIN_REASON_CHARS = 40;
const MIN_DISPOSITION_REASON_CHARS = 50;
const MIN_NAME_CHARS = 2;

const MRB_QUORUM_FUNCTIONAL = 2;
const MRB_QUORUM_SAFETY = 3;

// ============================================================================
// Types
// ============================================================================

export type NCRKind =
  | "dimensional_out_of_spec"
  | "surface_finish_fail"
  | "material_defect"
  | "tooling_damage"
  | "fixture_shift"
  | "process_excursion";

export type NCRSeverity = "cosmetic" | "functional" | "safety";

export type NCRState =
  | "open"
  | "awaiting_mrb"
  | "dispositioned"
  | "closed";

export type Disposition =
  | "scrap"
  | "rework"
  | "use_as_is"
  | "return_to_supplier"
  | "MRB_review_required";

export interface MRBApproval {
  approver: string;
  approved_at: number;
  note?: string;
}

export interface NCRRecord {
  id: string;
  pilot_id: string;
  seq: number;
  opened_at: number;
  kind: NCRKind;
  severity: NCRSeverity;
  state: NCRState;
  inspector: string;
  observation: string;
  affected_quantity: number;
  pilot_halt_required: boolean;
  disposition?: Disposition;
  disposition_reason?: string;
  disposition_at?: number;
  mrb_approvals: MRBApproval[];
  unanimous_consent: boolean; // for safety use_as_is
  closed_at?: number;
  closed_by?: string;
  car_id?: string;
}

export interface OpenInput {
  pilot_id: string;
  opened_at: number;
  kind: NCRKind;
  severity: NCRSeverity;
  inspector: string;
  observation: string;
  affected_quantity: number;
}

export interface MRBInput {
  ncr_id: string;
  approver: string;
  approved_at: number;
  note?: string;
}

export interface DispositionInput {
  ncr_id: string;
  disposition: Disposition;
  reason: string;
  disposition_at: number;
  unanimous_consent?: boolean;
}

export interface CloseInput {
  ncr_id: string;
  closed_at: number;
  closed_by: string;
  car_id?: string;
}

export interface Snapshot {
  schemaVersion: 1;
  records: NCRRecord[];
  last_seq_by_pilot: Record<string, number>;
}

// ============================================================================
// Engine
// ============================================================================

export class WetRunNonConformanceEngine {
  private records: NCRRecord[] = [];
  private lastSeqByPilot = new Map<string, number>();

  // --------------------------------------------------------------------
  // open — raise an NCR
  // --------------------------------------------------------------------
  open(input: OpenInput): NCRRecord {
    this.validateString(input.pilot_id, "pilot_id");
    this.validateString(input.inspector, "inspector", MIN_NAME_CHARS);
    this.validateKind(input.kind);
    this.validateSeverity(input.severity);
    this.validateTs(input.opened_at, "opened_at");
    this.validateReason(input.observation, MIN_REASON_CHARS, "observation");
    if (
      !Number.isInteger(input.affected_quantity) ||
      input.affected_quantity < 1
    ) {
      throw new Error(`affected_quantity must be a positive integer`);
    }

    const prevSeq = this.lastSeqByPilot.get(input.pilot_id) ?? 0;
    const seq = prevSeq + 1;
    const id = `ncr:${input.pilot_id}:${seq.toString().padStart(6, "0")}`;

    const record: NCRRecord = {
      id,
      pilot_id: input.pilot_id,
      seq,
      opened_at: input.opened_at,
      kind: input.kind,
      severity: input.severity,
      state:
        input.severity === "cosmetic" ? "open" : "awaiting_mrb",
      inspector: input.inspector,
      observation: input.observation.trim(),
      affected_quantity: input.affected_quantity,
      pilot_halt_required: input.severity === "safety",
      mrb_approvals: [],
      unanimous_consent: false,
    };
    this.records.push(record);
    this.lastSeqByPilot.set(input.pilot_id, seq);
    return this.snapshotRecord(record);
  }

  // --------------------------------------------------------------------
  // addMRBApproval — accumulate toward quorum
  // --------------------------------------------------------------------
  addMRBApproval(input: MRBInput): NCRRecord {
    const ncr = this.mustGet(input.ncr_id);
    if (ncr.state !== "awaiting_mrb" && ncr.state !== "open") {
      throw new Error(
        `cannot add MRB approval in state ${ncr.state} (ncr=${ncr.id})`,
      );
    }
    if (ncr.severity === "cosmetic") {
      throw new Error(`cosmetic NCRs do not require MRB approval`);
    }
    this.validateString(input.approver, "approver", MIN_NAME_CHARS);
    this.validateTs(input.approved_at, "approved_at");
    if (input.approved_at < ncr.opened_at) {
      throw new Error(
        `approved_at cannot precede opened_at (ncr=${ncr.id})`,
      );
    }
    if (input.approver === ncr.inspector) {
      throw new Error(
        `MRB approver must differ from inspector (four-eyes violated)`,
      );
    }
    if (ncr.mrb_approvals.some((a) => a.approver === input.approver)) {
      throw new Error(`approver ${input.approver} already approved this NCR`);
    }
    ncr.mrb_approvals.push({
      approver: input.approver,
      approved_at: input.approved_at,
      note: input.note,
    });
    return this.snapshotRecord(ncr);
  }

  // --------------------------------------------------------------------
  // disposition — record the final MRB outcome
  // --------------------------------------------------------------------
  disposition(input: DispositionInput): NCRRecord {
    const ncr = this.mustGet(input.ncr_id);
    if (ncr.state !== "open" && ncr.state !== "awaiting_mrb") {
      throw new Error(
        `cannot disposition NCR in state ${ncr.state} (ncr=${ncr.id})`,
      );
    }
    this.validateDisposition(input.disposition);
    this.validateReason(
      input.reason,
      MIN_DISPOSITION_REASON_CHARS,
      "disposition reason",
    );
    this.validateTs(input.disposition_at, "disposition_at");
    if (input.disposition_at < ncr.opened_at) {
      throw new Error(`disposition_at cannot precede opened_at`);
    }
    if (input.disposition === "MRB_review_required") {
      throw new Error(
        `MRB_review_required is a holding state, not a terminal disposition`,
      );
    }

    // Quorum enforcement
    if (ncr.severity === "functional" || ncr.severity === "safety") {
      const required =
        ncr.severity === "safety" ? MRB_QUORUM_SAFETY : MRB_QUORUM_FUNCTIONAL;
      if (ncr.mrb_approvals.length < required) {
        throw new Error(
          `insufficient MRB quorum for ${ncr.severity} NCR: have ${ncr.mrb_approvals.length}, need ${required}`,
        );
      }
    }

    // Safety + use_as_is needs unanimous consent flag
    if (ncr.severity === "safety" && input.disposition === "use_as_is") {
      if (input.unanimous_consent !== true) {
        throw new Error(
          `safety NCR use_as_is requires unanimous_consent=true`,
        );
      }
    }
    // But unanimous_consent is only meaningful for safety + use_as_is
    if (
      input.unanimous_consent === true &&
      !(ncr.severity === "safety" && input.disposition === "use_as_is")
    ) {
      throw new Error(
        `unanimous_consent is only meaningful for safety NCRs dispositioned use_as_is`,
      );
    }

    ncr.state = "dispositioned";
    ncr.disposition = input.disposition;
    ncr.disposition_reason = input.reason.trim();
    ncr.disposition_at = input.disposition_at;
    ncr.unanimous_consent = input.unanimous_consent ?? false;
    return this.snapshotRecord(ncr);
  }

  // --------------------------------------------------------------------
  // close — after disposition carried out
  // --------------------------------------------------------------------
  close(input: CloseInput): NCRRecord {
    const ncr = this.mustGet(input.ncr_id);
    if (ncr.state !== "dispositioned") {
      throw new Error(
        `cannot close NCR ${ncr.id} in state ${ncr.state} (must be dispositioned)`,
      );
    }
    this.validateString(input.closed_by, "closed_by", MIN_NAME_CHARS);
    this.validateTs(input.closed_at, "closed_at");
    if (input.closed_at < (ncr.disposition_at ?? ncr.opened_at)) {
      throw new Error(
        `closed_at cannot precede disposition_at`,
      );
    }
    // functional and safety require a linked CAR
    if (ncr.severity === "functional" || ncr.severity === "safety") {
      if (!input.car_id || input.car_id.trim().length === 0) {
        throw new Error(
          `${ncr.severity} NCR requires a linked CAR (car_id) before close`,
        );
      }
    }
    ncr.state = "closed";
    ncr.closed_at = input.closed_at;
    ncr.closed_by = input.closed_by;
    if (input.car_id) ncr.car_id = input.car_id.trim();
    return this.snapshotRecord(ncr);
  }

  // --------------------------------------------------------------------
  // pilotHaltRequired — scan for any open safety NCR
  // --------------------------------------------------------------------
  pilotHaltRequired(pilotId: string): boolean {
    return this.records.some(
      (r) =>
        r.pilot_id === pilotId &&
        r.pilot_halt_required &&
        r.state !== "closed",
    );
  }

  // --------------------------------------------------------------------
  // openCounts
  // --------------------------------------------------------------------
  openCounts(pilotId?: string): {
    total_open: number;
    by_severity: Record<NCRSeverity, number>;
  } {
    const mine = pilotId
      ? this.records.filter((r) => r.pilot_id === pilotId)
      : this.records;
    const bySev: Record<NCRSeverity, number> = {
      cosmetic: 0,
      functional: 0,
      safety: 0,
    };
    let total = 0;
    for (const r of mine) {
      if (r.state !== "closed") {
        total += 1;
        bySev[r.severity] += 1;
      }
    }
    return { total_open: total, by_severity: bySev };
  }

  // --------------------------------------------------------------------
  // Readers
  // --------------------------------------------------------------------
  getRecord(id: string): NCRRecord | undefined {
    const r = this.records.find((x) => x.id === id);
    return r ? this.snapshotRecord(r) : undefined;
  }

  listRecords(pilotId?: string): NCRRecord[] {
    const mine = pilotId
      ? this.records.filter((r) => r.pilot_id === pilotId)
      : this.records;
    return mine.map((r) => this.snapshotRecord(r));
  }

  snapshot(): Snapshot {
    const last: Record<string, number> = {};
    for (const [k, v] of this.lastSeqByPilot) last[k] = v;
    return {
      schemaVersion: 1,
      records: this.records.map((r) => this.snapshotRecord(r)),
      last_seq_by_pilot: last,
    };
  }

  static mrbQuorum(severity: NCRSeverity): number {
    if (severity === "safety") return MRB_QUORUM_SAFETY;
    if (severity === "functional") return MRB_QUORUM_FUNCTIONAL;
    return 0;
  }

  // --------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------
  private snapshotRecord(r: NCRRecord): NCRRecord {
    return {
      ...r,
      mrb_approvals: r.mrb_approvals.map((a) => ({ ...a })),
    };
  }

  private mustGet(id: string): NCRRecord {
    const r = this.records.find((x) => x.id === id);
    if (!r) throw new Error(`NCR not found: ${id}`);
    return r;
  }

  private validateString(v: string, label: string, minChars = 1): void {
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

  private validateKind(k: NCRKind): void {
    const allowed: NCRKind[] = [
      "dimensional_out_of_spec",
      "surface_finish_fail",
      "material_defect",
      "tooling_damage",
      "fixture_shift",
      "process_excursion",
    ];
    if (!allowed.includes(k)) throw new Error(`invalid NCR kind: ${k}`);
  }

  private validateSeverity(s: NCRSeverity): void {
    if (s !== "cosmetic" && s !== "functional" && s !== "safety") {
      throw new Error(`invalid NCR severity: ${s}`);
    }
  }

  private validateDisposition(d: Disposition): void {
    const allowed: Disposition[] = [
      "scrap",
      "rework",
      "use_as_is",
      "return_to_supplier",
      "MRB_review_required",
    ];
    if (!allowed.includes(d)) throw new Error(`invalid disposition: ${d}`);
  }

  private validateTs(ts: number, label: string): void {
    if (!Number.isFinite(ts)) throw new Error(`${label} must be a finite number`);
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const wetRunNonConformanceEngine = new WetRunNonConformanceEngine();
