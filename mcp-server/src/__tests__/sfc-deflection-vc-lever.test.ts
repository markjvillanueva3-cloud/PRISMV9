/**
 * sfc-deflection-vc-lever.test.ts
 * ============================================================================
 * [SFC-PAGE-CLOSED-LOOP]/U-SFC-DEFLECTION-VC-LEVER (slot:oscar)
 *
 * Regression lock for the corpus-corrupting "Vc-collapse" bug in
 * SpeedFeedOrchestratorEngine's proportional-reduction block (lines ~3082-3153).
 *
 * THE BUG (physics-reviewer adjudicated FAIL/CRITICAL):
 *   The engine resolved a FAILED safety check by collapsing cutting speed Vc:
 *       reductionFactor = min over failed checks of (limit/value)
 *       Vc *= reductionFactor                 // <-- wrong for force-driven checks
 *       fz *= Math.sqrt(reductionFactor)      // <-- wrong exponent, under-reduces
 *   But deflection (delta = Fc*L^3/3EI), workholding (Fc), and torque
 *   (T = Fc*D/2000 -- Vc cancels since rpm proportional Vc) are ALL independent
 *   of cutting speed. Reducing Vc does NOTHING to relieve them; only the
 *   fz/ap force lever does. Live evidence: a 12mm/36mm-stickout cut in 1045
 *   (deflection 291% over, the SOLE failing check) had Vc collapsed 204 -> 33.4
 *   m/min (6x, far below the 110-200 published carbide band) while deflection
 *   STILL ended at 291% (under-protection). This contaminated the 11.2M
 *   variability corpus and sfc_nine_axis.
 *
 * THE FIX: route each binding check to its physically effective lever --
 *   force-driven (deflection/workholding/torque) -> reduce fz by r^(1/(1-mc));
 *   feed-rate -> reduce fz; rpm -> clamp Vc; power (the ONLY true Vc lever,
 *   P = Fc*Vc/60000) -> reduce Vc, resolved LAST after fz settles.
 *
 * KEY INVARIANT under test (R9 -- encodes WHY, fails if the bug returns):
 *   A deflection-limited slender tool must NOT have its cutting speed reduced.
 *   We prove this by comparing the SAME cut at a short (stiff, no deflection
 *   bind) vs long (slender, deflection-bound) stickout: Vc must be ~equal;
 *   the long case must instead absorb the constraint via a smaller fz; and the
 *   deflection check must actually CLEAR (not stay critical). The power lever
 *   is separately verified to still clamp over-power cuts.
 *
 * Reference: Kienzle Fc = kc1_1*ap*fz^(1-mc) (ISO 3685); deflection
 *   delta = F*L^3/3EI (Euler-Bernoulli cantilever).
 *
 * @module __tests__/sfc-deflection-vc-lever
 */

import { describe, it, expect, beforeAll } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";

// ---------------------------------------------------------------------------
// Named constants (no magic literals in assertions)
// ---------------------------------------------------------------------------

/** compute() is heavy (MC trials + tribal load); allow generous beforeAll budget. */
const BEFORE_ALL_TIMEOUT_MS = 180_000;

/** Short stickout (mm): stiff -> deflection does NOT bind (baseline Vc). */
const STICKOUT_STIFF_MM = 18;

/** Long stickout (mm): slender -> deflection binds (the bug trigger). */
const STICKOUT_SLENDER_MM = 36;

/** A deflection violation must not move Vc more than this fraction. */
const VC_PRESERVE_FLOOR = 0.85;

/** Deflection limiting-factor utilization must clear to within this % of limit. */
const DEFL_UTIL_CLEARED_PCT = 115;

/** The pre-fix Vc collapse (~33 m/min for 1045); a passing fix must stay well above. */
const VC_COLLAPSE_CEILING_MPM = 80;

/** Machine power-limit factor the engine applies (80% of nameplate). */
const POWER_LIMIT_FACTOR = 0.8;

type CoreInput = Parameters<typeof speedFeedOrchestratorEngine.compute>[0];

/**
 * Canonical milling fixture; override material / stickout / tool to span configs.
 * Mirrors the real page-path input the parity probe uses.
 */
function makeInput(overrides: Partial<CoreInput> = {}): CoreInput {
  return {
    machine_name: "VMC-03",
    machine_type: "vertical_mill",
    machine_power_kw: 22.4,
    machine_max_rpm: 8100,
    machine_rigidity: "medium",
    machine_guideway: "box",
    machine_age_years: 3,
    machine_axis_accel_m_s2: 2,
    machine_axis_jerk_m_s3: 10,
    spindle_taper: "BT40",
    spindle_bearing_preload: "medium",
    controller: "fanuc-30i",
    coolant_type: "flood",
    coolant_pressure_bar: 1,
    coolant_concentration_pct: 5,
    material: "1045",
    iso_group: "P",
    hardness_hb: 180,
    operation: "milling",
    cut_type: "roughing",
    strategy: "conventional",
    holder_type: "ER_collet",
    holder_gauge_length_mm: 60,
    holder_tir_mm: 2,
    holder_balanced_g: 2.5,
    tool_diameter_mm: 12,
    flutes: 4,
    tool_material: "carbide",
    tool_coating: "AlCrN",
    helix_angle_deg: 45,
    corner_radius_mm: 0.4,
    tool_stickout_mm: STICKOUT_SLENDER_MM,
    ap_mm: 6,
    ae_mm: 6,
    workholding_type: "vise",
    workholding_stiffness: "high",
    clamping_force_kN: 20,
    spindle_torque_curve_archetype: "constant-torque",
    optimize_for: "balanced",
    ...overrides,
  } as CoreInput;
}

interface Unwrapped {
  cutting_speed_mpm: number;
  feed_per_tooth_mm: number;
  power_kw: number;
  limiting_factors?: Array<{ parameter: string; utilization_pct: number; severity: string }>;
}

function run(overrides: Partial<CoreInput> = {}): Unwrapped {
  const out = speedFeedOrchestratorEngine.compute(makeInput(overrides));
  const v = (out && typeof out === "object" && "value" in out ? (out as { value: unknown }).value : out) as Unwrapped;
  return v;
}

const deflUtil = (r: Unwrapped): number =>
  r.limiting_factors?.find((f) => f.parameter === "deflection_mm")?.utilization_pct ?? 0;

// ---------------------------------------------------------------------------
// Pre-computed fixtures
// ---------------------------------------------------------------------------

let stiff1045: Unwrapped;     // short stickout -> no deflection bind (baseline)
let slender1045: Unwrapped;   // long stickout  -> deflection binds (bug trigger)
let stiff316: Unwrapped;      // spanning ISO M
let slender316: Unwrapped;
let slenderAl: Unwrapped;     // spanning ISO N (aluminum)
let extremeTol: Unwrapped;    // adversarial: tiny tolerance -> huge deflection over-limit
let heavyLowPower: Unwrapped; // power-bound (stiff tool, low-power machine)

beforeAll(() => {
  stiff1045   = run({ tool_stickout_mm: STICKOUT_STIFF_MM });
  slender1045 = run({ tool_stickout_mm: STICKOUT_SLENDER_MM });

  stiff316    = run({ material: "316", iso_group: "M", hardness_hb: 170, tool_stickout_mm: STICKOUT_STIFF_MM });
  slender316  = run({ material: "316", iso_group: "M", hardness_hb: 170, tool_stickout_mm: STICKOUT_SLENDER_MM });

  slenderAl   = run({ material: "6061", iso_group: "N", hardness_hb: 95, tool_stickout_mm: STICKOUT_SLENDER_MM });

  // Adversarial: 5 micron feature tolerance -> tol/3 ~ 1.7um -> deflection wildly over.
  extremeTol  = run({ tool_stickout_mm: STICKOUT_SLENDER_MM, feature_tolerance_mm: 0.005 } as Partial<CoreInput>);

  // Power-bound: stiff 20mm tool (low deflection), big cut, low-power machine.
  heavyLowPower = run({
    tool_diameter_mm: 20, tool_stickout_mm: 40, ap_mm: 12, ae_mm: 18,
    machine_power_kw: 5.5, machine_max_rpm: 6000,
  });
}, BEFORE_ALL_TIMEOUT_MS);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SFC deflection -> fz lever (NOT Vc) — orchestrator reduction physics (oscar)", () => {
  it("A: a deflection violation does NOT collapse Vc (1045) — Vc stays ~equal to the stiff-tool baseline", () => {
    // Deflection is independent of Vc (delta = Fc*L^3/3EI). The slender case binds
    // on deflection; the stiff case does not. Fixed engine keeps Vc the same.
    expect(slender1045.cutting_speed_mpm).toBeGreaterThan(stiff1045.cutting_speed_mpm * VC_PRESERVE_FLOOR);
    // Pre-fix this collapsed to ~33 m/min. A correct fix stays well above the collapse ceiling.
    expect(slender1045.cutting_speed_mpm).toBeGreaterThan(VC_COLLAPSE_CEILING_MPM);
  });

  it("B: the deflection constraint is absorbed by a SMALLER fz (the force lever), not by Vc", () => {
    // The slender tool must cut chip-load (fz) to relieve Fc/deflection.
    expect(slender1045.feed_per_tooth_mm).toBeLessThan(stiff1045.feed_per_tooth_mm);
  });

  it("C: the deflection check actually CLEARS after the fz reduction (no under-protection)", () => {
    // Pre-fix the final deflection util stayed at ~291% (critical) — the fz lever
    // was too weak (sqrt exponent). Correct exponent r^(1/(1-mc)) must clear it.
    expect(deflUtil(slender1045)).toBeLessThanOrEqual(DEFL_UTIL_CLEARED_PCT);
  });

  it("D (spanning ISO M): 316 stainless deflection violation also preserves Vc + clears deflection", () => {
    expect(slender316.cutting_speed_mpm).toBeGreaterThan(stiff316.cutting_speed_mpm * VC_PRESERVE_FLOOR);
    expect(deflUtil(slender316)).toBeLessThanOrEqual(DEFL_UTIL_CLEARED_PCT);
  });

  it("E (spanning ISO N): 6061 aluminum slender cut yields a sane, finite, non-collapsed Vc", () => {
    expect(Number.isFinite(slenderAl.cutting_speed_mpm)).toBe(true);
    expect(slenderAl.cutting_speed_mpm).toBeGreaterThan(VC_COLLAPSE_CEILING_MPM); // Al bands are far higher
    expect(deflUtil(slenderAl)).toBeLessThanOrEqual(DEFL_UTIL_CLEARED_PCT);
  });

  it("F (adversarial): a 5um tolerance (extreme deflection over-limit) yields finite outputs, no NaN, Vc not collapsed", () => {
    expect(Number.isFinite(extremeTol.cutting_speed_mpm)).toBe(true);
    expect(Number.isNaN(extremeTol.cutting_speed_mpm)).toBe(false);
    expect(Number.isFinite(extremeTol.feed_per_tooth_mm)).toBe(true);
    expect(extremeTol.feed_per_tooth_mm).toBeGreaterThan(0);
    // Even an impossible deflection target must reduce fz, never crush Vc to fix deflection.
    expect(extremeTol.cutting_speed_mpm).toBeGreaterThan(VC_COLLAPSE_CEILING_MPM);
  });

  it("G (regression guard): the power lever STILL clamps an over-power cut to within the machine limit", () => {
    // Power (P = Fc*Vc/60000) is the one constraint where Vc reduction IS correct.
    // The fix must not break it: a heavy cut on a 5.5 kW machine must end <= 80% nameplate.
    const powerLimit = 5.5 * POWER_LIMIT_FACTOR;
    expect(heavyLowPower.power_kw).toBeLessThanOrEqual(powerLimit * 1.05);
  });
});
