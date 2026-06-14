/**
 * JointSpeedFeedOptimizer — finds the (Vc, f) pair that maximizes
 * material-removal-rate subject to tool-life + spindle-power constraints.
 *
 * SAFETY POSTURE: this algorithm contains NO physics formulas. All cutting
 * mechanics are delegated to the canonical KienzleForceModel + ExtendedTaylorModel
 * (composition over reimplementation, per R8 + dont-reinvent). The optimizer's
 * sole responsibility is the search + constraint logic. Editing this file does
 * NOT alter Kienzle/Taylor outputs — those live in their owning models.
 *
 * Closes Speed-Feed Calculator algorithm #8.1 from the 58-algorithm scope
 * enumeration (slot:tango 2026-05-26 /goal /loop). Previously Vc and f were
 * picked serially: operator picks Vc from material table → derives f → checks
 * power → iterates manually. This solver returns the JOINT optimum.
 *
 * CONSTRAINTS
 *   C1.  Tool life T(Vc, f, ap) ≥ T_target_min            (Taylor)
 *   C2.  Spindle power P(Vc, f, ap) ≤ P_max_W              (Kienzle)
 *   C3.  Vc ∈ [Vc_min, Vc_max], f ∈ [f_min, f_max]         (machine/tool bounds)
 *
 * ARGUMENT FOR THE STRATEGY
 *
 * For fixed ap (the operator-decided depth of cut), MRR = Vc · f · ap. Along
 * the Taylor isoline (the locus where T = T_target exactly), MRR is monotonic
 * increasing in f for the standard regime (0 < a·n < 1 for P-K-N-M ISO groups).
 * Therefore the optimum is: push f to the largest value where both Vc-on-isoline
 * lies in [Vc_min, Vc_max] AND power ≤ P_max. The solver bisects f to find this
 * boundary.
 *
 * Why this is sound even though the canonical models include nonlinear
 * corrections (rake/edge for Kienzle; coating/temperature/hardness for Taylor):
 * the bisection treats P and T as black-box functions of (Vc, f), so the
 * monotonicity is established empirically by the bisection itself, not derived
 * from the closed-form. R12 fail-loud: when bisection cannot converge inside
 * the input bounds, the result reports `feasible=false` with `binding_constraint`
 * telling the operator which bound is the culprit.
 *
 * @module JointSpeedFeedOptimizer
 * @version 1.0.0
 */

import { KienzleForceModel, type KienzleInput, type KienzleOutput } from "./KienzleForceModel.js";
import { ExtendedTaylorModel, type TaylorInput, type TaylorOutput } from "./ExtendedTaylorModel.js";

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  uncertainty: number;
  source: string;
  confidence?: number;
}

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/** ISO material group — drives Taylor exponents in the canonical model. */
export type IsoGroupLabel = "P" | "M" | "K" | "N" | "S" | "H";

export interface JointOptimizerInput {
  /** ISO group (P/M/K/N/S/H) — forwarded to ExtendedTaylorModel. */
  iso_group: IsoGroupLabel;
  /** Operation context — affects Kienzle force ratios + MRR convention. */
  operation: "turning" | "milling";
  /** Axial depth of cut [mm] — held fixed by this solver. */
  ap_mm: number;
  /** Reference rake angle [°] forwarded to Kienzle (default 6°). */
  rake_angle_deg?: number;
  /** Lead angle [°] forwarded to Kienzle (default 90°). */
  lead_angle_deg?: number;
  /** Tool coating — forwarded to Taylor coating multiplier. */
  coating?: string;
  /** Coolant — forwarded to Taylor coolant derating. */
  coolant?: "dry" | "flood" | "mist" | "MQL" | "cryogenic";

  // ── CONSTRAINTS ──
  /** Target minimum tool life [min]. Solver guarantees T ≥ this. */
  T_target_min: number;
  /** Spindle power upper bound [W]. */
  P_max_W: number;
  /** Vc lower bound [m/min]. */
  Vc_min_m_min: number;
  /** Vc upper bound [m/min]. */
  Vc_max_m_min: number;
  /** Feed lower bound [mm]. */
  f_min_mm: number;
  /** Feed upper bound [mm]. */
  f_max_mm: number;
}

export type BindingConstraint =
  | "tool_life"      // active at the Taylor isoline
  | "power"          // active at the Kienzle power ceiling
  | "Vc_upper"       // f-search hit the Vc upper bound
  | "Vc_lower"       // f-search hit the Vc lower bound
  | "f_upper"        // f-search hit f_max with no binding constraint
  | "f_lower"        // power binds even at f_min → infeasible
  | "infeasible";    // invalid input or no feasible region

export interface JointOptimizerResult {
  feasible: boolean;
  Vc_m_min: AtomicValue;
  f_mm: AtomicValue;
  MRR_mm3_min: AtomicValue;
  P_W_at_solution: AtomicValue;
  T_min_at_solution: AtomicValue;
  binding_constraint: BindingConstraint;
  iterations: number;
  notes: string[];
  source: string;
}

// ============================================================================
// CONSTANTS (search-tuning only — no physics)
// ============================================================================

const MAX_BISECTION_ITERATIONS = 64;
const FEED_BISECTION_TOL_MM = 1e-5;
const POWER_TOLERANCE_W = 1.0;
const MRR_VC_TO_MM_PER_MIN = 1000;     // m/min → mm/min unit-bridge for MRR
const DEFAULT_RAKE_DEG = 6;
const DEFAULT_LEAD_DEG = 90;
const MIN_TOOL_LIFE_FLOOR_MIN = 1.0;
const NUMERIC_EPS = 1e-9;

// ============================================================================
// PURE DELEGATIONS (compose canonical models)
// ============================================================================

/**
 * Returns the spindle power [W] at (Vc, f, ap) by invoking KienzleForceModel.
 * NO PHYSICS HERE — KienzleForceModel.calculate() owns the math.
 *
 * Chip-thickness/chip-width derivation follows the canonical convention
 * documented in KienzleForceModel's `chip_thickness_mm` / `chip_width_mm` JSDoc
 * (turning: h = f · sin(κr); b = ap / sin(κr)).
 */
export function computePower_W(args: {
  Vc_m_min: number;
  f_mm: number;
  ap_mm: number;
  operation: "turning" | "milling";
  rake_deg: number;
  lead_deg: number;
}): { power_W: number; force_N: number; output: KienzleOutput | null } {
  const { Vc_m_min, f_mm, ap_mm, operation, rake_deg, lead_deg } = args;
  if (![Vc_m_min, f_mm, ap_mm, rake_deg, lead_deg].every(Number.isFinite)) {
    return { power_W: Number.POSITIVE_INFINITY, force_N: Number.POSITIVE_INFINITY, output: null };
  }
  if (Vc_m_min <= 0 || f_mm <= 0 || ap_mm <= 0) {
    return { power_W: 0, force_N: 0, output: null };
  }
  const leadRad = (lead_deg * Math.PI) / 180;
  const sinLead = Math.max(NUMERIC_EPS, Math.sin(leadRad));
  const kIn: KienzleInput = {
    chip_thickness_mm: f_mm * sinLead,
    chip_width_mm: ap_mm / sinLead,
    rake_angle_deg: rake_deg,
    lead_angle_deg: lead_deg,
    operation,
  };
  try {
    const out = KienzleForceModel.calculate(kIn);
    const Fc = out.Fc.value;
    const power_W = (Fc * Vc_m_min) / 60;
    return { power_W, force_N: Fc, output: out };
  } catch {
    // Validation in KienzleForceModel throws — treat as unreachable region
    // (R12 fail-loud at the caller via Infinity-power = constraint binds).
    return { power_W: Number.POSITIVE_INFINITY, force_N: Number.POSITIVE_INFINITY, output: null };
  }
}

/**
 * Returns the tool life [min] at (Vc, f, ap) by invoking ExtendedTaylorModel.
 * NO PHYSICS HERE — ExtendedTaylorModel.calculate() owns the math.
 */
export function computeToolLife_min(args: {
  Vc_m_min: number;
  f_mm: number;
  ap_mm: number;
  iso_group: IsoGroupLabel;
  coating?: string;
  coolant?: JointOptimizerInput["coolant"];
}): { life_min: number; output: TaylorOutput | null } {
  const { Vc_m_min, f_mm, ap_mm, iso_group, coating, coolant } = args;
  if (![Vc_m_min, f_mm, ap_mm].every(Number.isFinite)) {
    return { life_min: 0, output: null };
  }
  if (Vc_m_min <= 0 || f_mm <= 0 || ap_mm <= 0) {
    return { life_min: 0, output: null };
  }
  const tIn: TaylorInput = {
    Vc_m_min,
    f_mm,
    ap_mm,
    iso_group,
    coating,
    coolant,
  };
  try {
    const out = ExtendedTaylorModel.calculate(tIn);
    return { life_min: out.tool_life_min.value, output: out };
  } catch {
    // ExtendedTaylorModel.calculate() throws on validation failure — treat
    // as "no life" so the bisection sees this region as infeasible and
    // gravitates back into the valid range (R12 fail-loud via 0-life).
    return { life_min: 0, output: null };
  }
}

/** Material-removal rate [mm³/min]. Pure unit-bridge — no physics. */
export function computeMRR_mm3_min(Vc_m_min: number, f_mm: number, ap_mm: number): number {
  if (![Vc_m_min, f_mm, ap_mm].every(Number.isFinite)) return 0;
  if (Vc_m_min <= 0 || f_mm <= 0 || ap_mm <= 0) return 0;
  return Vc_m_min * MRR_VC_TO_MM_PER_MIN * f_mm * ap_mm;
}

// ============================================================================
// SEARCH LOGIC (no physics; calls black-box delegations above)
// ============================================================================

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

function infeasible(reason: string, binding: BindingConstraint = "infeasible", extra: string[] = []): JointOptimizerResult {
  return {
    feasible: false,
    Vc_m_min: { value: 0, unit: "m/min", uncertainty: 0, source: "infeasible", confidence: 0 },
    f_mm: { value: 0, unit: "mm", uncertainty: 0, source: "infeasible", confidence: 0 },
    MRR_mm3_min: { value: 0, unit: "mm³/min", uncertainty: 0, source: "infeasible", confidence: 0 },
    P_W_at_solution: { value: 0, unit: "W", uncertainty: 0, source: "infeasible", confidence: 0 },
    T_min_at_solution: { value: 0, unit: "min", uncertainty: 0, source: "infeasible", confidence: 0 },
    binding_constraint: binding,
    iterations: 0,
    notes: [reason, ...extra],
    source: "JointSpeedFeedOptimizer v1.0.0",
  };
}

function validate(input: JointOptimizerInput): JointOptimizerResult | null {
  const finite = [
    input.ap_mm, input.T_target_min, input.P_max_W,
    input.Vc_min_m_min, input.Vc_max_m_min, input.f_min_mm, input.f_max_mm,
  ];
  if (!finite.every(Number.isFinite)) return infeasible("non-finite input parameter (NaN/Infinity)");
  if (input.ap_mm <= 0 || input.T_target_min <= 0 || input.P_max_W <= 0) {
    return infeasible("non-positive ap / T_target / P_max");
  }
  if (input.Vc_min_m_min <= 0 || input.f_min_mm <= 0) {
    return infeasible("Vc_min and f_min must be > 0");
  }
  if (input.Vc_min_m_min >= input.Vc_max_m_min) return infeasible("Vc range collapsed");
  if (input.f_min_mm >= input.f_max_mm) return infeasible("feed range collapsed");
  if (input.T_target_min < MIN_TOOL_LIFE_FLOOR_MIN) {
    return infeasible(`T_target_min ${input.T_target_min} below floor ${MIN_TOOL_LIFE_FLOOR_MIN}`);
  }
  if (!["P","M","K","N","S","H"].includes(input.iso_group)) {
    return infeasible(`unknown iso_group: ${input.iso_group}`);
  }
  return null;
}

/**
 * For a given f, finds the Vc in [Vc_min, Vc_max] that exactly meets the
 * T_target_min tool-life isoline via Brent-bisection on the canonical Taylor
 * function. Returns the clamped Vc + a flag describing which boundary (if any)
 * pinned the result.
 *
 * Tool life is MONOTONIC DECREASING in Vc (faster Vc → shorter life) for any
 * fixed f, ap — so a single bisection suffices.
 */
function vcOnTaylorIsoline(args: {
  f_mm: number;
  ap_mm: number;
  iso_group: IsoGroupLabel;
  coating?: string;
  coolant?: JointOptimizerInput["coolant"];
  T_target_min: number;
  Vc_min_m_min: number;
  Vc_max_m_min: number;
}): { Vc: number; binding: "tool_life" | "Vc_upper" | "Vc_lower"; iterations: number } {
  const { f_mm, ap_mm, iso_group, coating, coolant, T_target_min, Vc_min_m_min, Vc_max_m_min } = args;

  const lifeAtVc = (Vc: number) => computeToolLife_min({ Vc_m_min: Vc, f_mm, ap_mm, iso_group, coating, coolant }).life_min;

  const lifeAtMin = lifeAtVc(Vc_min_m_min);
  const lifeAtMax = lifeAtVc(Vc_max_m_min);

  // If even at Vc_min life is below target → would need a yet-smaller Vc → bound binds.
  if (lifeAtMin < T_target_min) {
    return { Vc: Vc_min_m_min, binding: "Vc_lower", iterations: 0 };
  }
  // If even at Vc_max life still exceeds target → could go faster → bound binds.
  if (lifeAtMax > T_target_min) {
    return { Vc: Vc_max_m_min, binding: "Vc_upper", iterations: 0 };
  }

  // Strict-monotone-decreasing → bisect.
  let lo = Vc_min_m_min;
  let hi = Vc_max_m_min;
  let iter = 0;
  for (; iter < MAX_BISECTION_ITERATIONS; iter++) {
    const mid = (lo + hi) / 2;
    const lifeMid = lifeAtVc(mid);
    if (lifeMid > T_target_min) lo = mid;       // life too long → push Vc up
    else hi = mid;                              // life too short → push Vc down
    if (hi - lo < 0.01) break;                   // 0.01 m/min ≈ shop-floor resolution
  }
  return { Vc: (lo + hi) / 2, binding: "tool_life", iterations: iter };
}

/**
 * Joint solver entry. Pure: deterministic on identical inputs.
 *
 * Algorithm:
 *  1. Validate input.
 *  2. Try f = f_max. Compute Vc on Taylor isoline. Check power.
 *  3. If power exceeded at f_max: bisect f downward.
 *  4. If Vc clamped to bound: report which bound bound the optimum.
 *  5. R12 fail-loud on edge cases — never silent-pass infeasibility.
 */
export function optimizeJoint(input: JointOptimizerInput): JointOptimizerResult {
  const v = validate(input);
  if (v) return v;

  const rake_deg = input.rake_angle_deg ?? DEFAULT_RAKE_DEG;
  const lead_deg = input.lead_angle_deg ?? DEFAULT_LEAD_DEG;
  const ap = input.ap_mm;
  let totalIters = 0;
  const notes: string[] = [];

  // Step 1: At f = f_max, compute Vc on Taylor isoline.
  let f = input.f_max_mm;
  let iso = vcOnTaylorIsoline({
    f_mm: f, ap_mm: ap, iso_group: input.iso_group,
    coating: input.coating, coolant: input.coolant,
    T_target_min: input.T_target_min,
    Vc_min_m_min: input.Vc_min_m_min, Vc_max_m_min: input.Vc_max_m_min,
  });
  totalIters += iso.iterations;
  let Vc = iso.Vc;
  let binding: BindingConstraint = iso.binding;

  // If at f_max we cannot reach the Taylor isoline within Vc-range, that's infeasible.
  if (iso.binding === "Vc_lower") {
    return infeasible("at f_max, Vc on Taylor isoline is below Vc_min — raise Vc_max or reduce T_target",
      "Vc_lower",
      [`Vc_isoline_at_f_max would need to be < ${input.Vc_min_m_min}`]);
  }

  // Step 2: power check at (Vc, f_max).
  const pow0 = computePower_W({ Vc_m_min: Vc, f_mm: f, ap_mm: ap, operation: input.operation, rake_deg, lead_deg });
  if (pow0.power_W > input.P_max_W + POWER_TOLERANCE_W) {
    // Bisect f in [f_min, f_max] for largest f s.t. P(Vc(f), f) ≤ P_max.
    let lo = input.f_min_mm;
    let hi = input.f_max_mm;
    let bisectIters = 0;
    for (; bisectIters < MAX_BISECTION_ITERATIONS; bisectIters++) {
      const fMid = (lo + hi) / 2;
      const isoMid = vcOnTaylorIsoline({
        f_mm: fMid, ap_mm: ap, iso_group: input.iso_group,
        coating: input.coating, coolant: input.coolant,
        T_target_min: input.T_target_min,
        Vc_min_m_min: input.Vc_min_m_min, Vc_max_m_min: input.Vc_max_m_min,
      });
      const pMid = computePower_W({ Vc_m_min: isoMid.Vc, f_mm: fMid, ap_mm: ap, operation: input.operation, rake_deg, lead_deg }).power_W;
      if (pMid > input.P_max_W) hi = fMid;
      else lo = fMid;
      if (hi - lo < FEED_BISECTION_TOL_MM) break;
    }
    totalIters += bisectIters;
    f = lo;
    const isoFinal = vcOnTaylorIsoline({
      f_mm: f, ap_mm: ap, iso_group: input.iso_group,
      coating: input.coating, coolant: input.coolant,
      T_target_min: input.T_target_min,
      Vc_min_m_min: input.Vc_min_m_min, Vc_max_m_min: input.Vc_max_m_min,
    });
    Vc = isoFinal.Vc;
    binding = "power";

    if (f <= input.f_min_mm + NUMERIC_EPS) {
      return infeasible("power constraint unsatisfiable even at f_min — reduce ap or raise P_max",
        "f_lower",
        [`P_at_f_min=${computePower_W({Vc_m_min:Vc,f_mm:f,ap_mm:ap,operation:input.operation,rake_deg,lead_deg}).power_W.toFixed(0)} W > P_max=${input.P_max_W} W`]);
    }
  } else {
    binding = iso.binding;
    if (binding === "Vc_upper") notes.push("Vc clamped to upper bound — tool life will exceed target");
  }

  // Step 3: gather final metrics from canonical models (no physics here).
  Vc = clamp(Vc, input.Vc_min_m_min, input.Vc_max_m_min);
  const powFinal = computePower_W({ Vc_m_min: Vc, f_mm: f, ap_mm: ap, operation: input.operation, rake_deg, lead_deg });
  const lifeFinal = computeToolLife_min({ Vc_m_min: Vc, f_mm: f, ap_mm: ap, iso_group: input.iso_group, coating: input.coating, coolant: input.coolant });
  const MRR = computeMRR_mm3_min(Vc, f, ap);
  const conf = binding === "tool_life" ? 0.9 : binding === "power" ? 0.85 : 0.75;

  return {
    feasible: true,
    Vc_m_min: { value: Vc, unit: "m/min", uncertainty: Vc * 0.05, source: "JointSpeedFeedOptimizer v1.0.0", confidence: conf },
    f_mm: { value: f, unit: "mm", uncertainty: f * 0.05, source: "JointSpeedFeedOptimizer v1.0.0", confidence: conf },
    MRR_mm3_min: { value: MRR, unit: "mm³/min", uncertainty: MRR * 0.1, source: "JointSpeedFeedOptimizer v1.0.0", confidence: conf },
    P_W_at_solution: { value: powFinal.power_W, unit: "W", uncertainty: powFinal.power_W * 0.05, source: "KienzleForceModel v1.0.0", confidence: conf },
    T_min_at_solution: { value: lifeFinal.life_min, unit: "min", uncertainty: lifeFinal.life_min * 0.15, source: "ExtendedTaylorModel v1.0.0", confidence: conf },
    binding_constraint: binding,
    iterations: totalIters,
    notes,
    source: "JointSpeedFeedOptimizer v1.0.0",
  };
}

export const JointSpeedFeedOptimizer = {
  version: "1.0.0" as const,
  optimizeJoint,
  computePower_W,
  computeToolLife_min,
  computeMRR_mm3_min,
};
