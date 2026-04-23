/**
 * WetRunSampleInspectionPlanEngine
 * ------------------------------------------------------------
 * AQL-based sample-inspection plan per ANSI/ASQ Z1.4 (single
 * sampling, inspection level II). The engine derives sample
 * size and accept/reject numbers from batch size + AQL, tracks
 * inspection outcomes per pilot, and drives the switching rules
 * that move a pilot between tightened / normal / reduced
 * regimes:
 *
 *   Normal:    5 consecutive accepts → Reduced
 *              2 of 5 consecutive rejects → Tightened
 *   Tightened: 5 consecutive accepts → Normal
 *              5 consecutive rejects → inspection_halted (a
 *              hard stop on pilot production)
 *   Reduced:   any reject → Normal
 *
 * Lookups
 *   Sample-size code letters and sample sizes follow ANSI/ASQ
 *   Z1.4 Table I for inspection level II. Accept/reject numbers
 *   use the closest single-sampling Z1.4 normal-inspection
 *   master-table entries we care about (AQL 1.0, 1.5, 2.5, 4.0).
 *   Batches outside the supported range throw a clear error so
 *   callers know they must fall back to Z1.4 directly.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-AQL
 */

// ============================================================================
// Tables (ANSI/ASQ Z1.4, Inspection Level II)
// ============================================================================

/** batch-size window → {code letter, sample size} */
const CODE_LETTER_TABLE: Array<{
  min: number;
  max: number;
  letter: string;
  n: number;
}> = [
  { min: 2, max: 8, letter: "A", n: 2 },
  { min: 9, max: 15, letter: "B", n: 3 },
  { min: 16, max: 25, letter: "C", n: 5 },
  { min: 26, max: 50, letter: "D", n: 8 },
  { min: 51, max: 90, letter: "E", n: 13 },
  { min: 91, max: 150, letter: "F", n: 20 },
  { min: 151, max: 280, letter: "G", n: 32 },
  { min: 281, max: 500, letter: "H", n: 50 },
  { min: 501, max: 1200, letter: "J", n: 80 },
  { min: 1201, max: 3200, letter: "K", n: 125 },
  { min: 3201, max: 10000, letter: "L", n: 200 },
];

/** Z1.4 single-sampling normal-inspection Ac/Re by (letter, AQL). */
const AC_RE_TABLE: Record<
  string,
  Record<string, { ac: number; re: number }>
> = {
  // AQL → letter → Ac/Re
  "1.0": {
    D: { ac: 0, re: 1 },
    E: { ac: 0, re: 1 },
    F: { ac: 0, re: 1 },
    G: { ac: 1, re: 2 },
    H: { ac: 1, re: 2 },
    J: { ac: 2, re: 3 },
    K: { ac: 3, re: 4 },
    L: { ac: 5, re: 6 },
  },
  "1.5": {
    D: { ac: 0, re: 1 },
    E: { ac: 1, re: 2 },
    F: { ac: 1, re: 2 },
    G: { ac: 1, re: 2 },
    H: { ac: 2, re: 3 },
    J: { ac: 3, re: 4 },
    K: { ac: 5, re: 6 },
    L: { ac: 7, re: 8 },
  },
  "2.5": {
    D: { ac: 1, re: 2 },
    E: { ac: 1, re: 2 },
    F: { ac: 1, re: 2 },
    G: { ac: 2, re: 3 },
    H: { ac: 3, re: 4 },
    J: { ac: 5, re: 6 },
    K: { ac: 7, re: 8 },
    L: { ac: 10, re: 11 },
  },
  "4.0": {
    D: { ac: 1, re: 2 },
    E: { ac: 2, re: 3 },
    F: { ac: 2, re: 3 },
    G: { ac: 3, re: 4 },
    H: { ac: 5, re: 6 },
    J: { ac: 7, re: 8 },
    K: { ac: 10, re: 11 },
    L: { ac: 14, re: 15 },
  },
};

const SUPPORTED_AQLS: readonly number[] = [1.0, 1.5, 2.5, 4.0];

// ============================================================================
// Types
// ============================================================================

export type InspectionLevel = "I" | "II" | "III"; // (II supported; I/III scaled)

export type InspectionRegime =
  | "reduced"
  | "normal"
  | "tightened"
  | "inspection_halted";

export type BatchDecision = "accept" | "reject";

export interface PilotInspectionState {
  pilot_id: string;
  regime: InspectionRegime;
  aql: number;
  inspection_level: InspectionLevel;
  consecutive_accepts: number;
  consecutive_rejects: number;
  rolling_last_5: BatchDecision[];
  history: InspectionResult[];
}

export interface InspectionResult {
  batch_id: string;
  sampled_at: number;
  batch_size: number;
  code_letter: string;
  sample_size: number;
  ac: number;
  re: number;
  defects_found: number;
  decision: BatchDecision;
  regime_before: InspectionRegime;
  regime_after: InspectionRegime;
}

export interface SamplingPlan {
  code_letter: string;
  sample_size: number;
  ac: number;
  re: number;
  aql: number;
  regime: InspectionRegime;
  inspection_level: InspectionLevel;
}

export interface ResultInput {
  pilot_id: string;
  batch_id: string;
  sampled_at: number;
  batch_size: number;
  defects_found: number;
}

export interface Snapshot {
  schemaVersion: 1;
  pilots: Record<string, PilotInspectionState>;
}

// ============================================================================
// Engine
// ============================================================================

export class WetRunSampleInspectionPlanEngine {
  private pilots = new Map<string, PilotInspectionState>();

  // --------------------------------------------------------------------
  // startPilot — register a pilot with AQL + level
  // --------------------------------------------------------------------
  startPilot(input: {
    pilot_id: string;
    aql: number;
    inspection_level?: InspectionLevel;
  }): PilotInspectionState {
    if (!input.pilot_id || input.pilot_id.trim().length === 0) {
      throw new Error(`pilot_id required`);
    }
    this.validateAql(input.aql);
    const level = input.inspection_level ?? "II";
    if (level !== "I" && level !== "II" && level !== "III") {
      throw new Error(`invalid inspection_level: ${level}`);
    }
    if (this.pilots.has(input.pilot_id)) {
      throw new Error(`pilot ${input.pilot_id} already started`);
    }
    const state: PilotInspectionState = {
      pilot_id: input.pilot_id,
      regime: "normal",
      aql: input.aql,
      inspection_level: level,
      consecutive_accepts: 0,
      consecutive_rejects: 0,
      rolling_last_5: [],
      history: [],
    };
    this.pilots.set(input.pilot_id, state);
    return this.snapshotState(state);
  }

  // --------------------------------------------------------------------
  // planFor — derive the plan for the next batch
  // --------------------------------------------------------------------
  planFor(pilotId: string, batchSize: number): SamplingPlan {
    const state = this.mustGet(pilotId);
    this.validateBatchSize(batchSize);
    const code = this.codeLetterFor(batchSize, state.inspection_level);
    const aqlKey = state.aql.toFixed(1);
    const acRe = AC_RE_TABLE[aqlKey]?.[code.letter];
    if (!acRe) {
      throw new Error(
        `no Ac/Re entry for AQL ${state.aql} code letter ${code.letter} — batch size ${batchSize} falls below supported minimum`,
      );
    }
    // tightened adjusts Ac down by 1 (never below 0) and reduces tolerance;
    // reduced expands tolerance (we keep Ac but use a smaller sample via the
    // nearest-lower code letter to mimic Z1.4 Table VIII behavior).
    let letter = code.letter;
    let n = code.n;
    let ac = acRe.ac;
    let re = acRe.re;
    if (state.regime === "tightened") {
      ac = Math.max(0, ac - 1);
      re = ac + 1;
    } else if (state.regime === "reduced") {
      const prevIdx = CODE_LETTER_TABLE.findIndex((c) => c.letter === letter);
      if (prevIdx > 0) {
        const smaller = CODE_LETTER_TABLE[prevIdx - 1]!;
        letter = smaller.letter;
        n = smaller.n;
        const smallerAcRe = AC_RE_TABLE[aqlKey]?.[letter];
        if (smallerAcRe) {
          ac = smallerAcRe.ac;
          re = smallerAcRe.re;
        }
      }
    }

    return {
      code_letter: letter,
      sample_size: n,
      ac,
      re,
      aql: state.aql,
      regime: state.regime,
      inspection_level: state.inspection_level,
    };
  }

  // --------------------------------------------------------------------
  // recordResult — submit a batch inspection outcome
  // --------------------------------------------------------------------
  recordResult(input: ResultInput): InspectionResult {
    const state = this.mustGet(input.pilot_id);
    if (state.regime === "inspection_halted") {
      throw new Error(
        `pilot ${input.pilot_id} is inspection_halted — cannot record further results until reset`,
      );
    }
    if (!input.batch_id || input.batch_id.trim().length === 0) {
      throw new Error(`batch_id required`);
    }
    if (!Number.isFinite(input.sampled_at)) {
      throw new Error(`sampled_at must be finite`);
    }
    if (
      !Number.isInteger(input.defects_found) ||
      input.defects_found < 0
    ) {
      throw new Error(`defects_found must be a non-negative integer`);
    }
    const plan = this.planFor(input.pilot_id, input.batch_size);
    if (input.defects_found > plan.sample_size) {
      throw new Error(
        `defects_found ${input.defects_found} exceeds sample_size ${plan.sample_size}`,
      );
    }
    const regimeBefore = state.regime;
    const decision: BatchDecision =
      input.defects_found <= plan.ac ? "accept" : "reject";

    // Update switching counters
    if (decision === "accept") {
      state.consecutive_accepts += 1;
      state.consecutive_rejects = 0;
    } else {
      state.consecutive_rejects += 1;
      state.consecutive_accepts = 0;
    }
    // Rolling last-5 sliding window (only used in normal regime for 2-of-5)
    state.rolling_last_5.push(decision);
    if (state.rolling_last_5.length > 5) state.rolling_last_5.shift();

    // Apply switching rules
    state.regime = this.nextRegime(state);

    // If regime changed, reset the counters so the new regime's rules apply
    // to fresh data. rolling_last_5 is only meaningful in normal regime.
    if (state.regime !== regimeBefore) {
      state.consecutive_accepts = 0;
      state.consecutive_rejects = 0;
      state.rolling_last_5 = [];
    }

    const result: InspectionResult = {
      batch_id: input.batch_id,
      sampled_at: input.sampled_at,
      batch_size: input.batch_size,
      code_letter: plan.code_letter,
      sample_size: plan.sample_size,
      ac: plan.ac,
      re: plan.re,
      defects_found: input.defects_found,
      decision,
      regime_before: regimeBefore,
      regime_after: state.regime,
    };
    state.history.push(result);
    return { ...result };
  }

  // --------------------------------------------------------------------
  // resetFromHalt — manual operator-authorized reset from inspection_halted
  // --------------------------------------------------------------------
  resetFromHalt(input: {
    pilot_id: string;
    reset_by: string;
    approver: string;
    reason: string;
  }): PilotInspectionState {
    const state = this.mustGet(input.pilot_id);
    if (state.regime !== "inspection_halted") {
      throw new Error(
        `pilot ${input.pilot_id} is not halted (regime=${state.regime})`,
      );
    }
    if (!input.reset_by || input.reset_by.trim().length < 2) {
      throw new Error(`reset_by required`);
    }
    if (!input.approver || input.approver.trim().length < 2) {
      throw new Error(`approver required`);
    }
    if (input.reset_by === input.approver) {
      throw new Error(`four-eyes: reset_by must differ from approver`);
    }
    if (!input.reason || input.reason.trim().length < 40) {
      throw new Error(`reason must be at least 40 characters`);
    }
    state.regime = "tightened";
    state.consecutive_accepts = 0;
    state.consecutive_rejects = 0;
    state.rolling_last_5 = [];
    return this.snapshotState(state);
  }

  // --------------------------------------------------------------------
  // Readers
  // --------------------------------------------------------------------
  getState(pilotId: string): PilotInspectionState | undefined {
    const s = this.pilots.get(pilotId);
    return s ? this.snapshotState(s) : undefined;
  }

  snapshot(): Snapshot {
    const out: Record<string, PilotInspectionState> = {};
    for (const [k, v] of this.pilots) out[k] = this.snapshotState(v);
    return { schemaVersion: 1, pilots: out };
  }

  static supportedAqls(): readonly number[] {
    return SUPPORTED_AQLS;
  }

  // --------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------
  private nextRegime(state: PilotInspectionState): InspectionRegime {
    if (state.regime === "normal") {
      if (state.consecutive_accepts >= 5) return "reduced";
      const rejectsIn5 = state.rolling_last_5.filter(
        (d) => d === "reject",
      ).length;
      if (rejectsIn5 >= 2) return "tightened";
      return "normal";
    }
    if (state.regime === "tightened") {
      if (state.consecutive_accepts >= 5) return "normal";
      if (state.consecutive_rejects >= 5) return "inspection_halted";
      return "tightened";
    }
    if (state.regime === "reduced") {
      const last = state.rolling_last_5[state.rolling_last_5.length - 1];
      if (last === "reject") return "normal";
      return "reduced";
    }
    return state.regime;
  }

  private codeLetterFor(
    batchSize: number,
    level: InspectionLevel,
  ): { letter: string; n: number } {
    const row = CODE_LETTER_TABLE.find(
      (r) => batchSize >= r.min && batchSize <= r.max,
    );
    if (!row) {
      throw new Error(
        `batch_size ${batchSize} is outside the supported table range [2, 10000]`,
      );
    }
    // Inspection Level I shifts down one letter; III shifts up one letter.
    const idx = CODE_LETTER_TABLE.indexOf(row);
    let shifted = idx;
    if (level === "I") shifted = Math.max(0, idx - 1);
    if (level === "III") shifted = Math.min(CODE_LETTER_TABLE.length - 1, idx + 1);
    const target = CODE_LETTER_TABLE[shifted]!;
    return { letter: target.letter, n: target.n };
  }

  private validateAql(aql: number): void {
    if (!Number.isFinite(aql)) throw new Error(`aql must be finite`);
    const key = aql.toFixed(1);
    if (!SUPPORTED_AQLS.map((a) => a.toFixed(1)).includes(key)) {
      throw new Error(
        `unsupported AQL ${aql} — engine supports ${SUPPORTED_AQLS.join(", ")}`,
      );
    }
  }

  private validateBatchSize(n: number): void {
    if (!Number.isInteger(n) || n < 2) {
      throw new Error(`batch_size must be an integer ≥ 2`);
    }
    if (n > 10000) {
      throw new Error(
        `batch_size ${n} exceeds table — please fall back to Z1.4 directly`,
      );
    }
  }

  private snapshotState(s: PilotInspectionState): PilotInspectionState {
    return {
      ...s,
      rolling_last_5: [...s.rolling_last_5],
      history: s.history.map((h) => ({ ...h })),
    };
  }

  private mustGet(id: string): PilotInspectionState {
    const s = this.pilots.get(id);
    if (!s) throw new Error(`pilot not started: ${id}`);
    return s;
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const wetRunSampleInspectionPlanEngine =
  new WetRunSampleInspectionPlanEngine();
