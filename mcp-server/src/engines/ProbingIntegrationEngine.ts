/**
 * ProbingIntegrationEngine — End-to-End Probing Integration (U-MIO36)
 * ===================================================================
 *
 * Integration engine composing probing subroutines into a complete
 * closed-loop measurement→compensation flow for the orchestrator.
 *
 * Responsibilities:
 *   1. Build a probing PLAN per setup (WCS find, tool length verify,
 *      in-process feature probe, post-op verify).
 *   2. Render controller-agnostic probe G-code snippets (Renishaw
 *      Inspection Plus canonical P-codes: G65 P9810 move, P9811 XY plane,
 *      P9812 ID bore, P9814 pocket centre, P9815 Y axis, P9820 tool length).
 *   3. Consume measured probe results (actual - nominal deltas) and
 *      compute OFFSET COMPENSATION recommendations (work offset shift,
 *      wear offset delta) plus PASS/FAIL dispositions vs tolerance.
 *
 * Key decisions (rationale):
 *   - Canonical Renishaw P-code set chosen because it's the most widely
 *     implemented macro library (Fanuc, Haas, Mazak all support via
 *     vendor packages) — single dialect → renderer, controller-specific
 *     translation handled downstream by PPProbeCycleValidatorEngine.
 *   - Compensation recommendations stop at the *suggestion* — applying
 *     them is a human-loop action (tracked by ProbeRecordEngine).
 *   - Deltas that exceed tolerance are FAIL → never auto-compensated.
 *
 * References:
 *   - Renishaw "Inspection Plus" macro guide (H-2000-2323)
 *   - ISO 230-10 Part 10: test code for machine tools — probing
 *   - Smith & Schmitz, "Mach Tool Analysis" — probe calibration
 *
 * @module engines/ProbingIntegrationEngine
 * @milestone MIO-MS0 U-MIO36
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type ProbeRoutineKind =
  | "wcs_find"            // locate datum, set G54-G59
  | "tool_length_verify"  // re-measure length, update offset
  | "feature_probe"       // in-process feature check
  | "post_op_verify"      // after-cut dimensional check
  | "calibration";        // probe sphere calibration

export type ProbeAxis = "X" | "Y" | "Z" | "XY" | "XYZ";

export interface ProbingRoutineInput {
  routine_id?: string;
  kind: ProbeRoutineKind;
  /** Which op in the routing does this probe run in/after */
  op_num: number;
  /** Feature reference for traceability */
  feature_id?: string;
  feature_name?: string;
  /** Nominal (expected) value — mm or in */
  nominal?: number;
  /** Tolerance window — symmetric +/- or asymmetric */
  tolerance_plus?: number;
  tolerance_minus?: number;
  unit?: "mm" | "in";
  axis?: ProbeAxis;
  /** Tool offset to update on verify (D or H word for Fanuc-dialect) */
  offset_register?: string;
  /** Approach/retract, mm */
  approach_mm?: number;
  retract_mm?: number;
}

export interface ProbingRoutine extends ProbingRoutineInput {
  routine_id: string;
  gcode: string;
  canned_cycle: string;   // e.g., "G65 P9811 X10. Y20."
  estimated_time_s: number;
}

export interface ProbingResultInput {
  routine_id: string;
  /** Measured (actual) value returned by probe */
  measured: number;
  /** Optional — controller-reported uncertainty */
  measurement_uncertainty?: number;
}

export type ProbeDisposition = "PASS" | "FAIL" | "MARGINAL" | "UNKNOWN";

export interface ProbingResult {
  routine_id: string;
  feature_id?: string;
  feature_name?: string;
  nominal: number;
  measured: number;
  /** Signed delta (measured - nominal), same unit as nominal */
  delta: number;
  tolerance_plus: number;
  tolerance_minus: number;
  unit: string;
  disposition: ProbeDisposition;
  /** Recommendation. action=apply_offset → delta can be used to shift
   *  the named offset register. action=hold → gate production. */
  compensation: {
    action: "apply_offset" | "hold" | "none";
    offset_register?: string;
    delta_to_apply?: number;
    rationale: string;
  };
}

export interface ProbingIntegrationPlanInput {
  setup_id?: string;
  part_number: string;
  revision: string;
  routines: ProbingRoutineInput[];
}

export interface ProbingIntegrationPlanSummary {
  total_routines: number;
  by_kind: Record<ProbeRoutineKind, number>;
  estimated_total_time_s: number;
  warnings: string[];
}

export interface ProbingIntegrationPlan {
  probing_id: string;
  setup_id: string;
  part_number: string;
  revision: string;
  created: string;
  routines: ProbingRoutine[];
  summary: ProbingIntegrationPlanSummary;
}

// ── Canonical Renishaw P-code map ──────────────────────────────────────────

const P_CODE: Record<ProbeRoutineKind, (axis: ProbeAxis) => string> = {
  wcs_find: a => (a === "X" || a === "Y" || a === "Z" ? "G65 P9811" : "G65 P9814"),
  tool_length_verify: () => "G65 P9820",
  feature_probe: a => (a === "Z" ? "G65 P9810" : "G65 P9811"),
  post_op_verify: a => (a === "Z" ? "G65 P9810" : "G65 P9811"),
  calibration: () => "G65 P9801",
};

const TIME_EST_S: Record<ProbeRoutineKind, number> = {
  wcs_find: 25,
  tool_length_verify: 15,
  feature_probe: 20,
  post_op_verify: 20,
  calibration: 60,
};

// ── Engine ─────────────────────────────────────────────────────────────────

export class ProbingIntegrationEngine {
  private store: Map<string, ProbingIntegrationPlan> = new Map();
  private results: Map<string, ProbingResult> = new Map();
  private counter = 0;

  /**
   * Build a probing plan for a setup.
   */
  generate(input: ProbingIntegrationPlanInput): ProbingIntegrationPlan {
    if (!input.routines || input.routines.length === 0) {
      throw new Error("ProbingIntegration: at least one routine required");
    }

    const warnings: string[] = [];
    const byKind: Record<ProbeRoutineKind, number> = {
      wcs_find: 0,
      tool_length_verify: 0,
      feature_probe: 0,
      post_op_verify: 0,
      calibration: 0,
    };

    const routines: ProbingRoutine[] = input.routines.map((r, idx) => {
      const routineId = r.routine_id ?? `PR-${String(idx + 1).padStart(3, "0")}`;
      const axis = r.axis ?? (r.kind === "tool_length_verify" ? "Z" : "XYZ");
      const canned = P_CODE[r.kind](axis);
      const time = TIME_EST_S[r.kind];
      byKind[r.kind]++;

      // Validation — rationale: the probe routine is useless if its
      // intended compensation can't be resolved downstream.
      if (r.kind === "tool_length_verify" && !r.offset_register) {
        warnings.push(
          `Routine ${routineId}: tool_length_verify has no offset_register to update`,
        );
      }
      if ((r.kind === "feature_probe" || r.kind === "post_op_verify") && r.nominal === undefined) {
        warnings.push(
          `Routine ${routineId}: ${r.kind} has no nominal to compare measurements against`,
        );
      }
      const tolBand = (r.tolerance_plus ?? 0) - (r.tolerance_minus ?? 0);
      if ((r.kind === "feature_probe" || r.kind === "post_op_verify") && tolBand <= 0) {
        warnings.push(
          `Routine ${routineId}: zero/negative tolerance band — no disposition possible`,
        );
      }

      // Render canonical G-code snippet
      const gcode = this.renderGCode({
        canned,
        axis,
        nominal: r.nominal,
        feature_name: r.feature_name,
        offset_register: r.offset_register,
        approach_mm: r.approach_mm ?? 5,
        retract_mm: r.retract_mm ?? 5,
      });

      return {
        ...r,
        routine_id: routineId,
        axis,
        gcode,
        canned_cycle: canned,
        estimated_time_s: time,
      };
    });

    this.counter++;
    const probingId = `PB-${String(this.counter).padStart(5, "0")}`;

    const plan: ProbingIntegrationPlan = {
      probing_id: probingId,
      setup_id: input.setup_id ?? "N/A",
      part_number: input.part_number,
      revision: input.revision,
      created: new Date().toISOString(),
      routines,
      summary: {
        total_routines: routines.length,
        by_kind: byKind,
        estimated_total_time_s: routines.reduce((acc, r) => acc + r.estimated_time_s, 0),
        warnings,
      },
    };

    this.store.set(probingId, plan);
    return plan;
  }

  /**
   * Record and evaluate a probe result. Returns disposition + compensation
   * recommendation.
   */
  recordResult(probing_id: string, input: ProbingResultInput): ProbingResult {
    const plan = this.store.get(probing_id);
    if (!plan) {
      throw new Error(`ProbingIntegration: unknown probing_id '${probing_id}'`);
    }
    const routine = plan.routines.find(r => r.routine_id === input.routine_id);
    if (!routine) {
      throw new Error(
        `ProbingIntegration: routine '${input.routine_id}' not found in plan ${probing_id}`,
      );
    }

    const nominal = routine.nominal ?? 0;
    const tolPlus = routine.tolerance_plus ?? 0;
    const tolMinus = routine.tolerance_minus ?? 0;
    const delta = input.measured - nominal;
    const unit = routine.unit ?? "mm";

    let disposition: ProbeDisposition = "UNKNOWN";
    const band = tolPlus - tolMinus;
    if (band > 0) {
      if (delta <= tolPlus && delta >= tolMinus) {
        disposition = "PASS";
        // Marginal: outer 20% of tolerance band
        const outerLimit = 0.8 * Math.max(tolPlus, Math.abs(tolMinus));
        if (Math.abs(delta) > outerLimit) disposition = "MARGINAL";
      } else {
        disposition = "FAIL";
      }
    }

    // Compensation recommendation — apply only for tool-length verify
    // (which literally exists to drift-correct length offsets) or marginal
    // features with an offset register assigned. FAIL → always hold.
    let compensation: ProbingResult["compensation"];
    if (disposition === "FAIL") {
      compensation = {
        action: "hold",
        rationale: `Measured ${input.measured.toFixed(4)} ${unit} outside tolerance [${tolMinus}, ${tolPlus}]. Human disposition required.`,
      };
    } else if (routine.kind === "tool_length_verify" && routine.offset_register) {
      compensation = {
        action: "apply_offset",
        offset_register: routine.offset_register,
        delta_to_apply: delta,
        rationale: `Tool length drift ${delta.toFixed(4)} ${unit} → shift ${routine.offset_register} by ${delta.toFixed(4)}.`,
      };
    } else if (disposition === "MARGINAL" && routine.offset_register) {
      compensation = {
        action: "apply_offset",
        offset_register: routine.offset_register,
        delta_to_apply: delta,
        rationale: `Feature ${routine.feature_id ?? routine.routine_id} marginal (Δ=${delta.toFixed(4)} ${unit}) — nudge ${routine.offset_register} to re-centre.`,
      };
    } else {
      compensation = {
        action: "none",
        rationale:
          disposition === "UNKNOWN"
            ? "No nominal/tolerance configured — cannot evaluate."
            : "Within nominal tolerance — no compensation required.",
      };
    }

    const result: ProbingResult = {
      routine_id: input.routine_id,
      feature_id: routine.feature_id,
      feature_name: routine.feature_name,
      nominal,
      measured: input.measured,
      delta,
      tolerance_plus: tolPlus,
      tolerance_minus: tolMinus,
      unit,
      disposition,
      compensation,
    };
    this.results.set(`${probing_id}::${input.routine_id}`, result);
    return result;
  }

  /** Retrieve a probing plan by id */
  get(probing_id: string): ProbingIntegrationPlan | null {
    return this.store.get(probing_id) ?? null;
  }

  /** Retrieve the recorded result for a given routine, if any */
  getResult(probing_id: string, routine_id: string): ProbingResult | null {
    return this.results.get(`${probing_id}::${routine_id}`) ?? null;
  }

  /** Retrieve all recorded results for a plan */
  listResults(probing_id: string): ProbingResult[] {
    const out: ProbingResult[] = [];
    for (const [k, v] of this.results.entries()) {
      if (k.startsWith(`${probing_id}::`)) out.push(v);
    }
    return out;
  }

  renderMarkdown(plan: ProbingIntegrationPlan): string {
    const out: string[] = [];
    out.push(`# Probing Plan ${plan.probing_id}`);
    out.push("");
    out.push(`**Part:** ${plan.part_number} Rev ${plan.revision}  |  **Setup:** ${plan.setup_id}`);
    out.push("");
    out.push(`| # | Kind | Op | Feature | Axis | Nominal | ± Tol | Reg | Canned | Time (s) |`);
    out.push(`|---|------|----|---------|------|---------|-------|-----|--------|----------|`);
    for (const r of plan.routines) {
      out.push(
        `| ${r.routine_id} | ${r.kind} | ${r.op_num} | ${r.feature_name ?? "—"} | ${r.axis ?? "—"} | ${r.nominal ?? "—"} ${r.unit ?? ""} | +${r.tolerance_plus ?? 0}/${r.tolerance_minus ?? 0} | ${r.offset_register ?? "—"} | ${r.canned_cycle} | ${r.estimated_time_s} |`,
      );
    }
    out.push("");
    out.push(`## Summary`);
    out.push(`- **Total routines:** ${plan.summary.total_routines}`);
    out.push(`- **WCS find:** ${plan.summary.by_kind.wcs_find}`);
    out.push(`- **Tool length verify:** ${plan.summary.by_kind.tool_length_verify}`);
    out.push(`- **Feature probe:** ${plan.summary.by_kind.feature_probe}`);
    out.push(`- **Post-op verify:** ${plan.summary.by_kind.post_op_verify}`);
    out.push(`- **Calibration:** ${plan.summary.by_kind.calibration}`);
    out.push(`- **Estimated total time:** ${plan.summary.estimated_total_time_s} s`);
    if (plan.summary.warnings.length > 0) {
      out.push("");
      out.push(`## Warnings`);
      for (const w of plan.summary.warnings) out.push(`- ⚠ ${w}`);
    }
    return out.join("\n");
  }

  /** Clear store + results */
  reset(): void {
    this.store.clear();
    this.results.clear();
    this.counter = 0;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private renderGCode(opts: {
    canned: string;
    axis: ProbeAxis;
    nominal?: number;
    feature_name?: string;
    offset_register?: string;
    approach_mm: number;
    retract_mm: number;
  }): string {
    const lines: string[] = [];
    if (opts.feature_name) lines.push(`(${opts.feature_name})`);
    lines.push(`G90 G40 G80 (ABS, no comp, no canned)`);
    lines.push(`G65 P9810 Z${opts.approach_mm.toFixed(3)} F500. (approach)`);
    let cycle = opts.canned;
    if (opts.nominal !== undefined) cycle += ` ${opts.axis.includes("X") ? "X" : opts.axis.includes("Y") ? "Y" : "Z"}${opts.nominal.toFixed(3)}`;
    if (opts.offset_register) cycle += ` H${opts.offset_register}`;
    lines.push(cycle);
    lines.push(`G65 P9810 Z${opts.retract_mm.toFixed(3)} F500. (retract)`);
    return lines.join("\n");
  }
}

export const probingIntegrationEngine = new ProbingIntegrationEngine();
