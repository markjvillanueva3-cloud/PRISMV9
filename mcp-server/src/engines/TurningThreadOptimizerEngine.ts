/**
 * TurningThreadOptimizerEngine — LATHE-PRO-MS4a capstone.
 *
 * Unifies the three MS4a advanced threading intelligence engines into a
 * single optimize() call that delivers a shop-ready recommendation:
 *
 *   1. Sensitivity     — TurningThreadSensitivityEngine
 *      OAT apportionment of force + safe_fraction across 6 parameters,
 *      ranks dominant drivers by |elasticity_safe|.
 *   2. Baseline plan   — TurningThreadStochasticPlanEngine
 *      MC envelope (P5/P50/P95) of the user-supplied thread spec.
 *   3. Robust design   — TurningThreadRobustOptimizerEngine
 *      Sensitivity-driven grid × MC search over top-2 drivers maximising
 *      safe_fraction (with optional time penalty).
 *   4. Pitch-diameter check
 *      Computes external/internal d2 per ISO 68-1 (metric) or ASME B1.1
 *      (UN) and reports the ISO 965-1 class-tolerance margin for the
 *      user-supplied class (default 6g external / 6H internal).
 *   5. Plain-text reasoning trace the operator can read.
 *
 * The capstone delegates — every physics call comes from the existing
 * shipped engines. No formulas are re-derived here.
 *
 * Shipped source of truth — dispatcher action `turning_thread_optimize`
 * delegates here. Tests import directly AND invoke through the
 * dispatcher.
 */
import {
  turningThreadSensitivityEngine,
  type ThreadSensitivityResult,
} from "./TurningThreadSensitivityEngine.js";
import {
  turningThreadStochasticPlanEngine,
  type ThreadStochasticResult,
} from "./TurningThreadStochasticPlanEngine.js";
import {
  turningThreadRobustOptimizerEngine,
  type ThreadRobustResult,
  type ThreadGridPoint,
} from "./TurningThreadRobustOptimizerEngine.js";
import type { SPTInput } from "./SinglePointThreadEngine.js";

// ============================================================================
// ISO 965-1 pitch-diameter class tolerances (T_d2, μm) — coarse pitch range
// External tolerance T_d2 ≈ C × P^0.5 × d^0.333 (simplified fit per ISO 965-3).
// We ship a lookup for the common class/pitch combinations seen on JM Die
// work and fall back to the simplified formula outside.
// Refs:
//   ISO 965-1:2013  — Metric thread tolerances, general plan
//   ISO 68-1:1998   — Metric thread basic profile
//   ASME B1.1-2019  — Unified inch threads
//   Machinery's Handbook 31, Ch.17 — Thread tolerance tables
// ============================================================================

/** Base tolerance T_d2 (μm) for class 6g external (IT6) — interpolated. */
const T_D2_6G_UM: Array<{ pitch: number; t_d2_um: number }> = [
  { pitch: 0.5, t_d2_um: 80 },
  { pitch: 0.7, t_d2_um: 95 },
  { pitch: 0.8, t_d2_um: 100 },
  { pitch: 1.0, t_d2_um: 112 },
  { pitch: 1.25, t_d2_um: 125 },
  { pitch: 1.5, t_d2_um: 140 },
  { pitch: 1.75, t_d2_um: 150 },
  { pitch: 2.0, t_d2_um: 160 },
  { pitch: 2.5, t_d2_um: 180 },
  { pitch: 3.0, t_d2_um: 200 },
];

/** Fundamental deviation es (μm) for class 6g external (negative below basic). */
const ES_6G_UM: Array<{ pitch: number; es_um: number }> = [
  { pitch: 0.5, es_um: -20 },
  { pitch: 0.7, es_um: -22 },
  { pitch: 0.8, es_um: -24 },
  { pitch: 1.0, es_um: -26 },
  { pitch: 1.25, es_um: -28 },
  { pitch: 1.5, es_um: -32 },
  { pitch: 1.75, es_um: -34 },
  { pitch: 2.0, es_um: -38 },
  { pitch: 2.5, es_um: -42 },
  { pitch: 3.0, es_um: -48 },
];

function interpolateTableByPitch(
  table: Array<{ pitch: number }>,
  pitchMm: number,
  key: "t_d2_um" | "es_um",
): number {
  if (table.length === 0) return 0;
  const sorted = [...table].sort((a, b) => a.pitch - b.pitch);
  const below = [...sorted].reverse().find((r) => r.pitch <= pitchMm);
  const above = sorted.find((r) => r.pitch >= pitchMm);
  // biome-ignore lint: intentional any-cast for lookup-table polymorphism
  const lookup = (r: Record<string, unknown>): number =>
    Number(r[key] ?? 0);
  if (below && above && below.pitch !== above.pitch) {
    const t = (pitchMm - below.pitch) / (above.pitch - below.pitch);
    return (
      lookup(below as unknown as Record<string, unknown>) * (1 - t) +
      lookup(above as unknown as Record<string, unknown>) * t
    );
  }
  const hit = below ?? above ?? sorted[0];
  return lookup(hit as unknown as Record<string, unknown>);
}

export type ThreadTolClass = "6g" | "6H" | "4g" | "4H" | "2A" | "3A" | "2B" | "3B";

export interface PitchDiameterCheck {
  thread_form: SPTInput["thread_form"];
  internal: boolean;
  class_used: ThreadTolClass;
  nominal_major_mm: number;
  pitch_mm: number;
  basic_pitch_diameter_mm: number;
  max_allowed_pitch_diameter_mm: number;
  min_allowed_pitch_diameter_mm: number;
  tolerance_band_um: number;
  pass: boolean;
  margin_um: number;
  notes: string[];
}

// ============================================================================
// CAPSTONE INPUT / OUTPUT
// ============================================================================

export interface ThreadOptimizeInput {
  /** Base thread spec — every MC / grid point starts here. */
  thread: SPTInput;
  /** ISO 965-1 (metric) or ASME B1.1 (UN) tolerance class. */
  tolerance_class?: ThreadTolClass;
  /** Assumed manufactured pitch-diameter offset from basic (mm).
   *  Default 0 → manufacturing lands exactly on basic d2. Operators can set
   *  this to the tool-wear-induced offset they see on the floor. */
  manufactured_pitch_offset_mm?: number;
  /** Shared noise + MC parameters (fall through to each sub-engine). */
  n_trials?: number;
  seed?: number;
  sigma_rpm_rel?: number;
  sigma_od_abs_mm?: number;
  sigma_pitch_abs_mm?: number;
  sigma_lead_rel?: number;
  force_limit_N?: number;
  /** Robust optimizer knobs. */
  adjust_range?: number;
  grid_steps?: number;
  time_weight?: number;
  min_feasibility_rate?: number;
  /** Sensitivity OAT perturbation magnitude. */
  oat_delta?: number;
}

export interface ThreadOptimizeResult {
  sensitivity: ThreadSensitivityResult;
  baseline: ThreadStochasticResult;
  robust: ThreadRobustResult;
  best_plan: ThreadGridPoint | null;
  pitch_diameter_check: PitchDiameterCheck;
  safe_fraction_lift: number;
  force_p95_reduction_pct: number;
  reasoning: string[];
  source: string;
}

class TurningThreadOptimizerEngine {
  // -------------------------------------------------------------------------
  // Input validation — fail loudly, never silently.
  // -------------------------------------------------------------------------
  private validateInput(input: ThreadOptimizeInput): void {
    if (!input || typeof input !== "object") {
      throw new Error("TurningThreadOptimizerEngine: input is required");
    }
    if (!input.thread || typeof input.thread !== "object") {
      throw new Error("TurningThreadOptimizerEngine: input.thread is required");
    }
    const t = input.thread;
    const numChecks: Array<[string, number]> = [
      ["pitch_mm", t.pitch_mm],
      ["major_diameter_mm", t.major_diameter_mm],
      ["total_depth_mm", t.total_depth_mm],
      ["spindle_rpm", t.spindle_rpm],
      ["num_passes", t.num_passes],
      ["thread_length_mm", t.thread_length_mm],
      ["material_tensile_MPa", t.material_tensile_MPa],
    ];
    for (const [k, v] of numChecks) {
      if (!Number.isFinite(v)) {
        throw new Error(
          `TurningThreadOptimizerEngine: thread.${k} must be finite, got ${v}`,
        );
      }
    }
    if (t.pitch_mm <= 0) {
      throw new Error("TurningThreadOptimizerEngine: pitch_mm must be positive");
    }
    if (t.major_diameter_mm <= 0) {
      throw new Error(
        "TurningThreadOptimizerEngine: major_diameter_mm must be positive",
      );
    }
    if (t.num_passes < 1) {
      throw new Error("TurningThreadOptimizerEngine: num_passes must be ≥ 1");
    }
    if (t.spindle_rpm <= 0) {
      throw new Error("TurningThreadOptimizerEngine: spindle_rpm must be positive");
    }
    if (
      input.manufactured_pitch_offset_mm !== undefined &&
      !Number.isFinite(input.manufactured_pitch_offset_mm)
    ) {
      throw new Error(
        "TurningThreadOptimizerEngine: manufactured_pitch_offset_mm must be finite",
      );
    }
  }

  // -------------------------------------------------------------------------
  // Pitch-diameter check — ISO 965-1 / ASME B1.1 class tolerance gate.
  // -------------------------------------------------------------------------

  /** Basic pitch diameter per form. d2 = d - k*P where k depends on the form.
   *  Ref: ISO 68-1 (metric k=0.6495), ASME B1.1 (UN k=0.6495),
   *       DIN 103 (trapezoidal k=0.5), ACME k=0.5 (29° flanks). */
  private basicPitchDiameter(t: SPTInput): number {
    const factorMap: Record<SPTInput["thread_form"], number> = {
      metric: 0.6495,
      UN: 0.6495,
      ACME: 0.5,
      trapezoidal: 0.5,
      buttress: 0.6634, // ANSI B1.9 (7°/45° flanks)
    };
    const k = factorMap[t.thread_form] ?? 0.6495;
    const nominal_d2 = t.major_diameter_mm - k * t.pitch_mm;
    return nominal_d2;
  }

  /** Resolve tolerance band (μm) and deviation (μm) for the requested class.
   *  For classes outside the lookup we apply a conservative fallback of
   *  T_d2 = 120 * P^0.5 (μm) — close to ISO 965-1 IT6 coarse fit. */
  private resolveToleranceUm(
    cls: ThreadTolClass,
    pitchMm: number,
    internal: boolean,
  ): { band_um: number; es_um: number; notes: string[] } {
    const notes: string[] = [];
    // Classes 6g (external) and 6H (internal) — most common.
    if (cls === "6g" || cls === "6H") {
      const band_um = interpolateTableByPitch(T_D2_6G_UM, pitchMm, "t_d2_um");
      const es_um = internal ? 0 : interpolateTableByPitch(ES_6G_UM, pitchMm, "es_um");
      return { band_um, es_um, notes };
    }
    // Class 4g/4H — tighter. ISO 965-1 IT4 ≈ 0.63 × IT6.
    if (cls === "4g" || cls === "4H") {
      const it6 = interpolateTableByPitch(T_D2_6G_UM, pitchMm, "t_d2_um");
      const es_um = internal
        ? 0
        : interpolateTableByPitch(ES_6G_UM, pitchMm, "es_um");
      notes.push("Class 4 band = 0.63 × class 6 (ISO 965-1 IT4/IT6 ratio)");
      return { band_um: Math.round(it6 * 0.63), es_um, notes };
    }
    // ASME B1.1 UN classes 2A/2B/3A/3B — empirical ratios from B1.1 tables.
    if (cls === "2A" || cls === "2B") {
      const it6 = interpolateTableByPitch(T_D2_6G_UM, pitchMm, "t_d2_um");
      notes.push("UN class 2 ≈ ISO 6g/6H band (ASME B1.1 table 5 general fit)");
      return { band_um: it6, es_um: internal ? 0 : -20, notes };
    }
    if (cls === "3A" || cls === "3B") {
      const it6 = interpolateTableByPitch(T_D2_6G_UM, pitchMm, "t_d2_um");
      notes.push("UN class 3 ≈ 0.75 × class 2 (ASME B1.1 precision fit)");
      return {
        band_um: Math.round(it6 * 0.75),
        es_um: internal ? 0 : -10,
        notes,
      };
    }
    // Fallback.
    const fallback = Math.round(120 * Math.sqrt(pitchMm));
    notes.push(
      `Class ${cls} not in lookup — fallback T_d2 = 120·√P μm (ISO 965-1 IT6 approx)`,
    );
    return { band_um: fallback, es_um: 0, notes };
  }

  /** Public: compute ISO 965-1 / ASME B1.1 class-tolerance pitch-diameter
   *  check for a given thread spec, class, and manufactured offset.
   *  Used by both the capstone optimize() flow and thread-class-gate hook. */
  checkPitchDiameter(
    t: SPTInput,
    cls: ThreadTolClass,
    manufacturedOffsetMm: number,
  ): PitchDiameterCheck {
    const basic_d2 = this.basicPitchDiameter(t);
    const { band_um, es_um, notes } = this.resolveToleranceUm(cls, t.pitch_mm, t.internal);

    // For external threads, tolerance band lies below basic (es..ei, negative).
    // For internal threads (class 6H), tolerance band lies above basic (EI..ES, positive).
    let max_d2: number;
    let min_d2: number;
    if (t.internal) {
      // Internal: basic + [0 .. band]
      min_d2 = basic_d2;
      max_d2 = basic_d2 + band_um / 1000;
    } else {
      // External: basic + [es .. es-band] with es typically negative
      max_d2 = basic_d2 + es_um / 1000;
      min_d2 = max_d2 - band_um / 1000;
    }

    const manufactured_d2 = basic_d2 + manufacturedOffsetMm;
    const pass = manufactured_d2 >= min_d2 - 1e-9 && manufactured_d2 <= max_d2 + 1e-9;
    // margin = distance from manufactured to the nearer bound (μm).
    const margin_um = pass
      ? Math.round(
          Math.min(manufactured_d2 - min_d2, max_d2 - manufactured_d2) * 1000,
        )
      : Math.round(
          (manufactured_d2 < min_d2
            ? min_d2 - manufactured_d2
            : manufactured_d2 - max_d2) * -1000,
        );

    return {
      thread_form: t.thread_form,
      internal: t.internal,
      class_used: cls,
      nominal_major_mm: Math.round(t.major_diameter_mm * 1000) / 1000,
      pitch_mm: Math.round(t.pitch_mm * 1000) / 1000,
      basic_pitch_diameter_mm: Math.round(basic_d2 * 10000) / 10000,
      max_allowed_pitch_diameter_mm: Math.round(max_d2 * 10000) / 10000,
      min_allowed_pitch_diameter_mm: Math.round(min_d2 * 10000) / 10000,
      tolerance_band_um: Math.round(band_um),
      pass,
      margin_um,
      notes,
    };
  }

  // -------------------------------------------------------------------------
  // Main capstone
  // -------------------------------------------------------------------------
  optimize(input: ThreadOptimizeInput): ThreadOptimizeResult {
    this.validateInput(input);

    const commonNoise = {
      n_trials: input.n_trials ?? 50,
      seed: input.seed ?? 1,
      sigma_rpm_rel: input.sigma_rpm_rel ?? 0.02,
      sigma_od_abs_mm: input.sigma_od_abs_mm ?? 0.05,
      sigma_pitch_abs_mm: input.sigma_pitch_abs_mm ?? 0.01,
      sigma_lead_rel: input.sigma_lead_rel ?? 0.05,
      force_limit_N: input.force_limit_N ?? 500,
    };

    // Stage 1: sensitivity — dominant drivers.
    const sensitivity = turningThreadSensitivityEngine.run({
      thread: input.thread,
      oat_delta: input.oat_delta ?? 0.10,
      ...commonNoise,
    });

    // Stage 2: baseline stochastic envelope.
    const baseline = turningThreadStochasticPlanEngine.run({
      thread: input.thread,
      ...commonNoise,
    });

    // Stage 3: robust grid × MC on top-2 drivers.
    const robust = turningThreadRobustOptimizerEngine.run({
      thread: input.thread,
      adjust_range: input.adjust_range ?? 0.15,
      grid_steps: input.grid_steps ?? 5,
      time_weight: input.time_weight ?? 0,
      min_feasibility_rate: input.min_feasibility_rate ?? 0.5,
      ...commonNoise,
    });

    // Stage 4: pitch-diameter check against class tolerance.
    // IMPORTANT: class compliance is checked against the user-supplied DESIGNED
    // thread spec — not the robust optimizer's perturbed point. The robust
    // grid adjusts operating parameters (RPM, pass count, lead) to maximise
    // safe_fraction; pitch and major diameter are fixed by the thread
    // designation and must meet the ISO 965-1 / ASME B1.1 class band.
    const cls: ThreadTolClass =
      input.tolerance_class ?? (input.thread.internal ? "6H" : "6g");
    const pitch_check = this.checkPitchDiameter(
      input.thread,
      cls,
      input.manufactured_pitch_offset_mm ?? 0,
    );

    // Derived deltas.
    const best = robust.best_point;
    const safe_lift = robust.safe_fraction_lift;
    const force_reduction_pct =
      baseline.force_peak_p95 > 0 && best
        ? Math.round(
            ((baseline.force_peak_p95 - best.force_p95) /
              baseline.force_peak_p95) *
              1000,
          ) / 10
        : 0;

    // Stage 5: plain-language reasoning for the operator.
    const reasoning = this.buildReasoning(
      sensitivity,
      baseline,
      robust,
      pitch_check,
      safe_lift,
      force_reduction_pct,
    );

    return {
      sensitivity,
      baseline,
      robust,
      best_plan: best,
      pitch_diameter_check: pitch_check,
      safe_fraction_lift: safe_lift,
      force_p95_reduction_pct: force_reduction_pct,
      reasoning,
      source:
        "TurningThreadOptimizerEngine.optimize (capstone: Sensitivity + Stochastic + Robust + ISO 965-1 pitch-dia gate)",
    };
  }

  private buildReasoning(
    sens: ThreadSensitivityResult,
    base: ThreadStochasticResult,
    rob: ThreadRobustResult,
    pitch: PitchDiameterCheck,
    safeLift: number,
    forceReductionPct: number,
  ): string[] {
    const lines: string[] = [];
    lines.push(
      `Baseline: safe_fraction=${base.safe_fraction.toFixed(3)}, force_P95=${base.force_peak_p95.toFixed(1)} N, time_P50=${base.time_p50.toFixed(1)} s (over ${base.trials_feasible}/${base.trials_attempted} feasible trials).`,
    );
    if (sens.dominant_safe_driver) {
      lines.push(
        `Sensitivity: dominant safety driver = ${sens.dominant_safe_driver}; dominant force driver = ${sens.dominant_force_driver ?? "n/a"}.`,
      );
    }
    if (rob.best_point) {
      const factors = Object.entries(rob.best_point.factors)
        .map(([k, v]) => `${k}×${v.toFixed(2)}`)
        .join(", ");
      lines.push(
        `Robust best point [${factors}] → safe_fraction=${rob.best_point.safe_fraction.toFixed(3)} (lift +${safeLift.toFixed(3)}), force_P95=${rob.best_point.force_p95.toFixed(1)} N (${forceReductionPct >= 0 ? "-" : "+"}${Math.abs(forceReductionPct).toFixed(1)}%).`,
      );
    } else {
      lines.push(
        "Robust grid produced no feasible point — relax adjust_range or lower min_feasibility_rate.",
      );
    }
    lines.push(
      `Pitch diameter (class ${pitch.class_used}): basic=${pitch.basic_pitch_diameter_mm.toFixed(3)} mm, allowed [${pitch.min_allowed_pitch_diameter_mm.toFixed(3)}, ${pitch.max_allowed_pitch_diameter_mm.toFixed(3)}] mm (band ${pitch.tolerance_band_um} μm) → ${pitch.pass ? `PASS (margin ${pitch.margin_um} μm)` : `FAIL (over by ${Math.abs(pitch.margin_um)} μm)`}.`,
    );
    if (pitch.notes.length > 0) {
      for (const n of pitch.notes) lines.push(`  • ${n}`);
    }
    return lines;
  }
}

export const turningThreadOptimizerEngine = new TurningThreadOptimizerEngine();
export { TurningThreadOptimizerEngine };
