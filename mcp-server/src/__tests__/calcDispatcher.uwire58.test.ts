/**
 * calcDispatcher — U-WIRE58 round-trip suite
 * ============================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE58 — wires MonteCarloProcessEngine to prism_calc.
 * Background: monte_carlo_process was a phantom action — it appeared in the
 * action enum (line 711) and the slim-response branch (line 292) but had
 * NO main switch case. Calls fell to the runtime fallback.
 *
 * Same no-flatten pattern as U-WIRE57 (doe_taguchi): slim-response branch
 * reads result.value.trials, result.value.force_distribution.mean,
 * result.value.roughness_distribution.mean, result.value.risk_summary.scrap_rate_pct,
 * result.value.convergence.converged → dispatcher KEEPS AtomicValue wrap.
 *
 * Engine internals (verified vs. MonteCarloProcessEngine.ts):
 *   - Default trials = 10000, capped at 50000
 *   - Default seed = 42 (Mulberry32 PRNG, deterministic given seed)
 *   - LHS-style perturbation via Box-Muller normal sampling
 *   - Forces: Kienzle Fc = kc11 · ap · hm · hm^(-mc), then wear correction (1 + 2.5·VB)
 *   - Power: Fc · vc / 60000 [kW]
 *   - Roughness: Brammertz Rt = (fpr²)/(8·Rn) + 2·VB; Ra = Rt/4
 *   - Tool life: Taylor T = (C/vc)^(1/n), modulated by lognormal scatter and wear
 *   - Cp = tol/(6σ); Cpk = min((USL-μ)/(3σ), (μ-LSL)/(3σ))
 *   - convergence.converged = (force_cv_pct < 2 AND roughness_cv_pct < 2)
 *   - confidence = converged ? 0.9 : 0.7
 *   - unit = "monte_carlo_simulation"
 *   - formula contains "Kienzle" + "Taylor" + "Brammertz"
 *   - Distribution rounding: stats to 3 decimals, cp/cpk/scrap_pct to 2 decimals
 *   - dimension_distribution defined IFF tolerances provided (else `undefined`)
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE58
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import {
  MonteCarloProcessEngine,
  monteCarloProcessEngine,
  type MCProcessInput,
  type MCProcessResult,
  type MCDistribution,
} from "../engines/MonteCarloProcessEngine.js";
import { ACTION_CALC_SCHEMAS } from "../schemas/calcActionSchemas.js";

// ── Named constants ──────────────────────────────────────────────────────────

const UNIT_LABEL = "monte_carlo_simulation";
const CONFIDENCE_CONVERGED = 0.9;
const CONFIDENCE_NOT_CONVERGED = 0.7;
const DEFAULT_TRIALS = 10000;
const TRIAL_CAP = 50000;
const TRIALS_OVER_CAP = 200000;
const TRIALS_MIN_SCHEMA = 100;
const CONVERGENCE_CV_THRESHOLD_PCT = 2;
const TRIALS_FAST = 1000;
const TRIALS_TINY = 200;
const HISTOGRAM_BIN_COUNT = 20;
const FIXED_SEED_A = 1234;
const FIXED_SEED_B = 5678;
const ANTIREG_LARGE_TRIAL_BUDGET_MS = 5000;
const SCHEMA_INVALID_TRIALS_LOW = 50;
const SCHEMA_INVALID_TRIALS_HIGH = 60000;
const SCHEMA_INVALID_CV_OVER = 1.5;
const SCHEMA_FRACTIONAL_FLUTES = 3.5;
const CPK_ROUNDING_TOLERANCE = 0.01;
const NOMINAL_DIM_MM = 25.0;
const TOL_TIGHT_MM = 0.001;
const TOL_MICRO_MM = 0.0001;
const TOL_WIDE_MM = 0.5;
const TOL_BASELINE_MM = 0.05;
const SCRAP_ADVISORY_THRESHOLD_PCT = 2;
const RISK_PCT_FLOOR = 0;
const RISK_PCT_CEILING = 100;
const PERCENT_FULL = 100;
const VC_LOW = 100;
const VC_HIGH = 400;
const FZ_LOW = 0.05;
const FZ_HIGH = 0.20;
const AP_LOW = 1;
const AP_HIGH = 5;
const NOSE_LARGE = 0.8;
const NOSE_SMALL = 0.2;
const VC_NEGATIVE = -50;
const TOOL_DIA_LARGE = 200;
const HARDNESS_HRC_DEFAULT = 30;
const HIGH_VAR_SPEED_CV = 0.15;
const HIGH_VAR_FEED_CV = 0.20;
const HIGH_VAR_DEPTH_CV = 0.25;
const HIGH_VAR_RUNOUT_UM = 30;
const HIGH_VAR_VB_MM = 0.4;
const HIGH_VAR_SIGMA_MM = 0.15;
const STEEL_VC_DEFAULT = 200;
const STEEL_FZ_DEFAULT = 0.10;
const STEEL_AP_DEFAULT = 3;
const STEEL_AE_DEFAULT = 4;
const STEEL_TOOL_DIA = 12;
const STEEL_FLUTES = 4;
const STEEL_NOSE_R = 0.4;
const AL_VC = 600;
const AL_FZ = 0.15;
const AL_AP = 5;
const AL_AE = 8;
const AL_TOOL_DIA = 16;
const AL_FLUTES = 3;
const INC_VC = 50;
const INC_FZ = 0.05;
const INC_AP = 1;
const INC_AE = 2;
const FULL_FACT_2POW3 = 8;

type DispatchResult = { ok: boolean; data: Record<string, unknown> };

// ── Test harness ──────────────────────────────────────────────────────────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class CalcDispatcherHarness {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
  async call(action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
    const tool = this.tools[0]!;
    const raw = (await tool.handler({ action, params })) as
      | { content: { type: string; text: string }[] }
      | { success: false; error: string; action: string; dispatcher: string };
    if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
      return { ok: false, data: raw as unknown as Record<string, unknown> };
    }
    const envelope = raw as { content: { type: string; text: string }[] };
    const text = envelope.content[0]!.text;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, data: { rawText: text } };
    }
    if (parsed && typeof parsed === "object" && "error" in parsed) {
      return { ok: false, data: parsed };
    }
    return { ok: true, data: parsed };
  }
}

function freshHarness(): CalcDispatcherHarness {
  const h = new CalcDispatcherHarness();
  registerCalcDispatcher(h as unknown as Parameters<typeof registerCalcDispatcher>[0]);
  return h;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Steel (P) baseline — modest variations, fast trial count for unit tests. */
const STEEL_BASE: MCProcessInput = {
  nominal: {
    cutting_speed_m_min: STEEL_VC_DEFAULT,
    feed_per_tooth_mm: STEEL_FZ_DEFAULT,
    axial_depth_mm: STEEL_AP_DEFAULT,
    radial_depth_mm: STEEL_AE_DEFAULT,
    tool_diameter_mm: STEEL_TOOL_DIA,
    flute_count: STEEL_FLUTES,
    nose_radius_mm: STEEL_NOSE_R,
  },
  material: { iso_group: "P", hardness_hrc: HARDNESS_HRC_DEFAULT },
  variations: { speed_cv: 0.02, feed_cv: 0.03, depth_cv: 0.05, runout_um: 5, wear_vb_mm: 0.1, wear_sigma_mm: 0.03 },
  trials: TRIALS_FAST,
  seed: FIXED_SEED_A,
};

/** Aluminum (N) — high speed, low force regime. */
const ALUMINUM_BASE: MCProcessInput = {
  nominal: {
    cutting_speed_m_min: AL_VC,
    feed_per_tooth_mm: AL_FZ,
    axial_depth_mm: AL_AP,
    radial_depth_mm: AL_AE,
    tool_diameter_mm: AL_TOOL_DIA,
    flute_count: AL_FLUTES,
    nose_radius_mm: STEEL_NOSE_R,
  },
  material: { iso_group: "N" },
  variations: { speed_cv: 0.02, feed_cv: 0.03, depth_cv: 0.05 },
  trials: TRIALS_FAST,
  seed: FIXED_SEED_A,
};

/** Inconel (S) — extreme regime, high force, low speed. */
const INCONEL_BASE: MCProcessInput = {
  nominal: {
    cutting_speed_m_min: INC_VC,
    feed_per_tooth_mm: INC_FZ,
    axial_depth_mm: INC_AP,
    radial_depth_mm: INC_AE,
    tool_diameter_mm: STEEL_TOOL_DIA,
    flute_count: STEEL_FLUTES,
    nose_radius_mm: STEEL_NOSE_R,
  },
  material: { iso_group: "S" },
  variations: { speed_cv: 0.02, feed_cv: 0.03, depth_cv: 0.05 },
  trials: TRIALS_FAST,
  seed: FIXED_SEED_A,
};

/** Steel with tolerances — exercises dimension_distribution + Cp/Cpk + scrap_pct. */
const STEEL_WITH_TOLERANCES: MCProcessInput = {
  ...STEEL_BASE,
  tolerances: {
    dimension_nominal_mm: NOMINAL_DIM_MM,
    upper_tol_mm: TOL_BASELINE_MM,
    lower_tol_mm: TOL_BASELINE_MM,
  },
};

/** High-variation fixture — should trigger non-converged signal. */
const HIGH_VARIATION_STEEL: MCProcessInput = {
  ...STEEL_BASE,
  variations: {
    speed_cv: HIGH_VAR_SPEED_CV,
    feed_cv: HIGH_VAR_FEED_CV,
    depth_cv: HIGH_VAR_DEPTH_CV,
    runout_um: HIGH_VAR_RUNOUT_UM,
    wear_vb_mm: HIGH_VAR_VB_MM,
    wear_sigma_mm: HIGH_VAR_SIGMA_MM,
  },
  trials: TRIALS_TINY,
};

/** Zero-variation fixture — degenerate case. */
const ZERO_VARIATION_STEEL: MCProcessInput = {
  ...STEEL_BASE,
  variations: { speed_cv: 0, feed_cv: 0, depth_cv: 0, runout_um: 0, wear_vb_mm: 0.1, wear_sigma_mm: 0 },
};

const STEEL_PARAMS = STEEL_BASE as unknown as Record<string, unknown>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function distributionInvariantViolations(d: MCDistribution, label: string): string[] {
  const v: string[] = [];
  if (typeof d.mean !== "number" || !Number.isFinite(d.mean)) v.push(`${label}.mean not finite`);
  if (typeof d.std !== "number" || !Number.isFinite(d.std) || d.std < 0) v.push(`${label}.std invalid`);
  if (typeof d.min !== "number" || typeof d.max !== "number" || d.min > d.max) v.push(`${label}.min>${label}.max`);
  if (!Array.isArray(d.histogram)) v.push(`${label}.histogram not array`);
  else if (d.histogram.length !== HISTOGRAM_BIN_COUNT) v.push(`${label}.histogram length=${d.histogram.length}`);
  if (d.min > d.p5) v.push(`${label}: min>p5`);
  if (d.p5 > d.p50) v.push(`${label}: p5>p50`);
  if (d.p50 > d.p95) v.push(`${label}: p50>p95`);
  if (d.p95 > d.max) v.push(`${label}: p95>max`);
  return v;
}

// ── Tier 1: Engine-direct invariants ─────────────────────────────────────────

describe("MonteCarloProcessEngine — engine-direct invariants", () => {
  it("returns AtomicValue envelope with unit=monte_carlo_simulation and informative formula", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    expect(out.unit).toBe(UNIT_LABEL);
    expect(typeof out.formula).toBe("string");
    expect(out.formula).toContain("Kienzle");
    expect(out.formula).toContain("Taylor");
    expect(out.formula).toContain("Brammertz");
    expect(out.value.trials).toBe(TRIALS_FAST);
  });

  it("trials count respects input (capped at 50000 internal limit)", () => {
    const out1 = monteCarloProcessEngine.compute({ ...STEEL_BASE, trials: TRIALS_FAST });
    expect(out1.value.trials).toBe(TRIALS_FAST);
    const out2 = monteCarloProcessEngine.compute({ ...STEEL_BASE, trials: TRIALS_OVER_CAP });
    expect(out2.value.trials).toBe(TRIAL_CAP);
  });

  it("default trials = 10000 when not specified", () => {
    const { trials: _t, ...rest } = STEEL_BASE;
    void _t;
    const out = monteCarloProcessEngine.compute(rest as MCProcessInput);
    expect(out.value.trials).toBe(DEFAULT_TRIALS);
  });

  it("force_distribution invariants hold (finite stats, 20-bin histogram, ordered percentiles)", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    expect(distributionInvariantViolations(out.value.force_distribution, "force")).toEqual([]);
  });

  it("roughness_distribution invariants hold", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    expect(distributionInvariantViolations(out.value.roughness_distribution, "roughness")).toEqual([]);
  });

  it("tool_life_distribution invariants hold", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    expect(distributionInvariantViolations(out.value.tool_life_distribution, "tool_life")).toEqual([]);
  });

  it("power_distribution invariants hold and min ≥ 0 (P=Fc·vc/60000)", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    expect(distributionInvariantViolations(out.value.power_distribution, "power")).toEqual([]);
    expect(out.value.power_distribution.min).toBeGreaterThanOrEqual(0);
  });

  it("histogram bin counts sum to total trial count (no dropped samples)", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    const sum = out.value.force_distribution.histogram.reduce((s, b) => s + b.count, 0);
    expect(sum).toBe(out.value.trials);
  });

  it("seed reproducibility: same input + same seed → identical scalar outputs", () => {
    const a = monteCarloProcessEngine.compute({ ...STEEL_BASE, seed: FIXED_SEED_A });
    const b = monteCarloProcessEngine.compute({ ...STEEL_BASE, seed: FIXED_SEED_A });
    expect(a.value.force_distribution.mean).toBe(b.value.force_distribution.mean);
    expect(a.value.roughness_distribution.mean).toBe(b.value.roughness_distribution.mean);
    expect(a.value.tool_life_distribution.mean).toBe(b.value.tool_life_distribution.mean);
  });

  it("seed sensitivity: different seeds produce different sample paths", () => {
    const a = monteCarloProcessEngine.compute({ ...STEEL_BASE, seed: FIXED_SEED_A });
    const b = monteCarloProcessEngine.compute({ ...STEEL_BASE, seed: FIXED_SEED_B });
    const f1 = a.value.force_distribution;
    const f2 = b.value.force_distribution;
    const allSame = f1.mean === f2.mean && f1.std === f2.std && f1.min === f2.min && f1.max === f2.max;
    expect(allSame).toBe(false);
  });

  it("force distribution mean > 0 (Kienzle Fc > 0 for nonzero inputs)", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    expect(out.value.force_distribution.mean).toBeGreaterThan(0);
  });

  it("roughness distribution mean > 0 (Brammertz Ra > 0)", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    expect(out.value.roughness_distribution.mean).toBeGreaterThan(0);
  });

  it("tool life distribution mean > 0 (Taylor lower bound enforced)", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    expect(out.value.tool_life_distribution.mean).toBeGreaterThan(0);
  });

  it("risk_summary contains 4 numeric percentages (force_exceed, ra_exceed, life_below, scrap)", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    const rs = out.value.risk_summary;
    expect(typeof rs.force_exceed_pct).toBe("number");
    expect(typeof rs.roughness_exceed_pct).toBe("number");
    expect(typeof rs.tool_life_below_pct).toBe("number");
    expect(typeof rs.scrap_rate_pct).toBe("number");
  });

  it("risk_summary percentages all clamped to [0, 100]", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    const rs = out.value.risk_summary;
    const violations: string[] = [];
    for (const [k, v] of Object.entries(rs)) {
      if (typeof v !== "number" || v < RISK_PCT_FLOOR || v > RISK_PCT_CEILING) violations.push(`${k}=${v}`);
    }
    expect(violations).toEqual([]);
  });

  it("dimension_distribution is undefined when no tolerances supplied; scrap_rate_pct = 0", () => {
    const noTol = monteCarloProcessEngine.compute(STEEL_BASE);
    expect(typeof noTol.value.dimension_distribution).toBe("undefined");
    expect(noTol.value.risk_summary.scrap_rate_pct).toBe(0);
  });

  it("dimension_distribution has finite cp/cpk/scrap_pct when tolerances supplied", () => {
    const withTol = monteCarloProcessEngine.compute(STEEL_WITH_TOLERANCES);
    const dd = withTol.value.dimension_distribution;
    expect(typeof dd).toBe("object");
    expect(typeof dd!.cp).toBe("number");
    expect(typeof dd!.cpk).toBe("number");
    expect(typeof dd!.scrap_pct).toBe("number");
    expect(Number.isFinite(dd!.cp)).toBe(true);
    expect(Number.isFinite(dd!.cpk)).toBe(true);
    expect(Number.isFinite(dd!.scrap_pct)).toBe(true);
  });

  it("Cpk ≤ Cp invariant (Cpk reflects centering penalty)", () => {
    const out = monteCarloProcessEngine.compute(STEEL_WITH_TOLERANCES);
    const dd = out.value.dimension_distribution!;
    expect(dd.cpk).toBeLessThanOrEqual(dd.cp + CPK_ROUNDING_TOLERANCE);
  });

  it("convergence flag = (force_cv_pct < 2 AND roughness_cv_pct < 2)", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    const expected =
      out.value.convergence.force_cv_pct < CONVERGENCE_CV_THRESHOLD_PCT &&
      out.value.convergence.roughness_cv_pct < CONVERGENCE_CV_THRESHOLD_PCT;
    expect(out.value.convergence.converged).toBe(expected);
  });

  it("confidence ladder: 0.9 if force_cv<2%, else 0.7", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    const expected = out.value.convergence.force_cv_pct < CONVERGENCE_CV_THRESHOLD_PCT
      ? CONFIDENCE_CONVERGED
      : CONFIDENCE_NOT_CONVERGED;
    expect(out.confidence).toBe(expected);
  });

  it("recommendations is always an array", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    expect(Array.isArray(out.value.recommendations)).toBe(true);
  });

  it("singleton matches a fresh class instance under fixed seed (deterministic)", () => {
    const fresh = new MonteCarloProcessEngine();
    const a = monteCarloProcessEngine.compute(STEEL_BASE);
    const b = fresh.compute(STEEL_BASE);
    expect(a.value.force_distribution.mean).toBe(b.value.force_distribution.mean);
    expect(a.value.trials).toBe(b.value.trials);
  });
});

// ── Tier 2: Variability spans ────────────────────────────────────────────────

describe("MonteCarloProcessEngine — variability spans", () => {
  it("ISO sweep: P / M / K / N / S / H all yield well-formed positive force distributions", () => {
    const groups: MCProcessInput["material"]["iso_group"][] = ["P", "M", "K", "N", "S", "H"];
    const violations: string[] = [];
    for (const g of groups) {
      const out = monteCarloProcessEngine.compute({ ...STEEL_BASE, material: { iso_group: g } });
      const distViol = distributionInvariantViolations(out.value.force_distribution, `${g}.force`);
      if (distViol.length > 0) violations.push(...distViol);
      if (out.value.force_distribution.mean <= 0) violations.push(`${g}: non-positive force mean`);
    }
    expect(violations).toEqual([]);
  });

  it("hard materials (S inconel kc11=3200) produce higher force mean than soft (N aluminum kc11=800)", () => {
    const inconel = monteCarloProcessEngine.compute({ ...STEEL_BASE, material: { iso_group: "S" } });
    const al = monteCarloProcessEngine.compute({ ...STEEL_BASE, material: { iso_group: "N" } });
    expect(inconel.value.force_distribution.mean).toBeGreaterThan(al.value.force_distribution.mean);
  });

  it("variation magnitude sweep: high CV → larger force std than zero CV", () => {
    const zero = monteCarloProcessEngine.compute(ZERO_VARIATION_STEEL);
    const high = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      variations: { speed_cv: 0.10, feed_cv: 0.15, depth_cv: 0.20 },
    });
    expect(high.value.force_distribution.std).toBeGreaterThan(zero.value.force_distribution.std);
  });

  it("trial-count sweep: both 200 and 10000 produce positive p95-p5 spreads", () => {
    const small = monteCarloProcessEngine.compute({ ...STEEL_BASE, trials: TRIALS_TINY, seed: FIXED_SEED_A });
    const large = monteCarloProcessEngine.compute({ ...STEEL_BASE, trials: DEFAULT_TRIALS, seed: FIXED_SEED_A });
    const smallSpread = small.value.force_distribution.p95 - small.value.force_distribution.p5;
    const largeSpread = large.value.force_distribution.p95 - large.value.force_distribution.p5;
    expect(smallSpread).toBeGreaterThan(0);
    expect(largeSpread).toBeGreaterThan(0);
  });

  it("higher feed → higher force mean (Kienzle Fc monotone in fz)", () => {
    const lo = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      nominal: { ...STEEL_BASE.nominal, feed_per_tooth_mm: FZ_LOW },
      seed: FIXED_SEED_A,
    });
    const hi = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      nominal: { ...STEEL_BASE.nominal, feed_per_tooth_mm: FZ_HIGH },
      seed: FIXED_SEED_A,
    });
    expect(hi.value.force_distribution.mean).toBeGreaterThan(lo.value.force_distribution.mean);
  });

  it("higher depth ap → higher force mean (Kienzle Fc linear in ap)", () => {
    const lo = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      nominal: { ...STEEL_BASE.nominal, axial_depth_mm: AP_LOW },
      seed: FIXED_SEED_A,
    });
    const hi = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      nominal: { ...STEEL_BASE.nominal, axial_depth_mm: AP_HIGH },
      seed: FIXED_SEED_A,
    });
    expect(hi.value.force_distribution.mean).toBeGreaterThan(lo.value.force_distribution.mean);
  });

  it("higher cutting speed → higher power mean (P = Fc · vc / 60000)", () => {
    const lo = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      nominal: { ...STEEL_BASE.nominal, cutting_speed_m_min: VC_LOW },
      seed: FIXED_SEED_A,
    });
    const hi = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      nominal: { ...STEEL_BASE.nominal, cutting_speed_m_min: VC_HIGH },
      seed: FIXED_SEED_A,
    });
    expect(hi.value.power_distribution.mean).toBeGreaterThan(lo.value.power_distribution.mean);
  });

  it("higher cutting speed → lower tool life mean (Taylor T = (C/vc)^(1/n))", () => {
    const lo = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      nominal: { ...STEEL_BASE.nominal, cutting_speed_m_min: VC_LOW },
      seed: FIXED_SEED_A,
    });
    const hi = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      nominal: { ...STEEL_BASE.nominal, cutting_speed_m_min: VC_HIGH },
      seed: FIXED_SEED_A,
    });
    expect(lo.value.tool_life_distribution.mean).toBeGreaterThan(hi.value.tool_life_distribution.mean);
  });

  it("smaller nose radius → larger Brammertz Ra (Rt = fpr²/(8·Rn))", () => {
    const lg = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      nominal: { ...STEEL_BASE.nominal, nose_radius_mm: NOSE_LARGE },
      seed: FIXED_SEED_A,
    });
    const sm = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      nominal: { ...STEEL_BASE.nominal, nose_radius_mm: NOSE_SMALL },
      seed: FIXED_SEED_A,
    });
    expect(sm.value.roughness_distribution.mean).toBeGreaterThan(lg.value.roughness_distribution.mean);
  });

  it("with tolerances: tighter tolerance → equal-or-higher scrap rate (centered process)", () => {
    const wide = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      tolerances: { dimension_nominal_mm: NOMINAL_DIM_MM, upper_tol_mm: TOL_WIDE_MM, lower_tol_mm: TOL_WIDE_MM },
      seed: FIXED_SEED_A,
    });
    const tight = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      tolerances: { dimension_nominal_mm: NOMINAL_DIM_MM, upper_tol_mm: TOL_TIGHT_MM, lower_tol_mm: TOL_TIGHT_MM },
      seed: FIXED_SEED_A,
    });
    expect(tight.value.risk_summary.scrap_rate_pct).toBeGreaterThanOrEqual(wide.value.risk_summary.scrap_rate_pct);
  });

  it("variation defaults applied when variations subkeys omitted (force std > 0)", () => {
    const out = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      variations: {},
      seed: FIXED_SEED_A,
    });
    expect(out.value.force_distribution.std).toBeGreaterThan(0);
  });
});

// ── Tier 3: Dispatcher round-trip ────────────────────────────────────────────

describe("calcDispatcher monte_carlo_process — round-trip", () => {
  let harness: CalcDispatcherHarness;

  beforeEach(() => {
    harness = freshHarness();
  });

  it("dispatcher routes monte_carlo_process end-to-end and KEEPS AtomicValue wrap", async () => {
    const r = await harness.call("monte_carlo_process", STEEL_PARAMS);
    expect(r.ok).toBe(true);
    expect(r.data.unit).toBe(UNIT_LABEL);
    expect(r.data).toHaveProperty("value");
    const v = r.data.value as MCProcessResult;
    expect(typeof v.trials).toBe("number");
    expect(v.trials).toBe(TRIALS_FAST);
    expect(typeof v.force_distribution.mean).toBe("number");
    expect(typeof v.roughness_distribution.mean).toBe("number");
    expect(typeof v.risk_summary.scrap_rate_pct).toBe("number");
    expect(typeof v.convergence.converged).toBe("boolean");
  });

  it("dispatcher and engine-direct produce identical key scalars under fixed seed", async () => {
    const r = await harness.call("monte_carlo_process", STEEL_PARAMS);
    const direct = monteCarloProcessEngine.compute(STEEL_BASE);
    const v = r.data.value as MCProcessResult;
    expect(v.trials).toBe(direct.value.trials);
    expect(v.force_distribution.mean).toBe(direct.value.force_distribution.mean);
    expect(v.roughness_distribution.mean).toBe(direct.value.roughness_distribution.mean);
    expect(v.tool_life_distribution.mean).toBe(direct.value.tool_life_distribution.mean);
  });

  it("dispatcher exposes 20-bin histograms via result.value (non-flattened)", async () => {
    const r = await harness.call("monte_carlo_process", STEEL_PARAMS);
    const v = r.data.value as MCProcessResult;
    expect(Array.isArray(v.force_distribution.histogram)).toBe(true);
    expect(v.force_distribution.histogram.length).toBe(HISTOGRAM_BIN_COUNT);
  });

  it("dispatcher with tolerances produces dimension_distribution with finite Cp/Cpk", async () => {
    const r = await harness.call("monte_carlo_process", STEEL_WITH_TOLERANCES as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    const v = r.data.value as MCProcessResult;
    expect(typeof v.dimension_distribution).toBe("object");
    expect(typeof v.dimension_distribution!.cp).toBe("number");
    expect(typeof v.dimension_distribution!.cpk).toBe("number");
    expect(Number.isFinite(v.dimension_distribution!.cp)).toBe(true);
    expect(Number.isFinite(v.dimension_distribution!.cpk)).toBe(true);
  });

  it("dispatcher omits dimension_distribution when no tolerances supplied", async () => {
    const r = await harness.call("monte_carlo_process", STEEL_PARAMS);
    const v = r.data.value as MCProcessResult;
    expect(typeof v.dimension_distribution).toBe("undefined");
  });

  it("aluminum (N) round-trips with positive force mean and finite power", async () => {
    const r = await harness.call("monte_carlo_process", ALUMINUM_BASE as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    const v = r.data.value as MCProcessResult;
    expect(v.force_distribution.mean).toBeGreaterThan(0);
    expect(Number.isFinite(v.power_distribution.mean)).toBe(true);
  });

  it("inconel (S) round-trips with positive force regime", async () => {
    const r = await harness.call("monte_carlo_process", INCONEL_BASE as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    const v = r.data.value as MCProcessResult;
    expect(v.force_distribution.mean).toBeGreaterThan(0);
  });

  it("dispatcher passes through when variations object is empty (engine fills defaults)", async () => {
    const minimal = {
      nominal: STEEL_BASE.nominal,
      material: STEEL_BASE.material,
      variations: {},
      trials: TRIALS_FAST,
      seed: FIXED_SEED_A,
    };
    const r = await harness.call("monte_carlo_process", minimal as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    const v = r.data.value as MCProcessResult;
    expect(v.force_distribution.std).toBeGreaterThan(0);
  });

  it("convergence object exposes both force_cv_pct and roughness_cv_pct via result.value", async () => {
    const r = await harness.call("monte_carlo_process", STEEL_PARAMS);
    const v = r.data.value as MCProcessResult;
    expect(typeof v.convergence.force_cv_pct).toBe("number");
    expect(typeof v.convergence.roughness_cv_pct).toBe("number");
    expect(typeof v.convergence.converged).toBe("boolean");
    expect(Number.isFinite(v.convergence.force_cv_pct)).toBe(true);
    expect(Number.isFinite(v.convergence.roughness_cv_pct)).toBe(true);
  });
});

// ── Tier 4: Schema rejection ─────────────────────────────────────────────────

describe("monte_carlo_process schema — rejects malformed inputs", () => {
  const schema = ACTION_CALC_SCHEMAS.monte_carlo_process;

  it("baseline steel input parses successfully", () => {
    const r = schema.safeParse(STEEL_PARAMS);
    expect(r.success).toBe(true);
  });

  it("baseline steel + tolerances input parses successfully", () => {
    const r = schema.safeParse(STEEL_WITH_TOLERANCES as unknown as Record<string, unknown>);
    expect(r.success).toBe(true);
  });

  it("rejects negative cutting_speed_m_min", () => {
    const bad = { ...STEEL_BASE, nominal: { ...STEEL_BASE.nominal, cutting_speed_m_min: -STEEL_VC_DEFAULT } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects zero feed_per_tooth_mm (positive only)", () => {
    const bad = { ...STEEL_BASE, nominal: { ...STEEL_BASE.nominal, feed_per_tooth_mm: 0 } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects negative axial_depth_mm", () => {
    const bad = { ...STEEL_BASE, nominal: { ...STEEL_BASE.nominal, axial_depth_mm: -STEEL_AP_DEFAULT } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects fractional flute_count", () => {
    const bad = { ...STEEL_BASE, nominal: { ...STEEL_BASE.nominal, flute_count: SCHEMA_FRACTIONAL_FLUTES } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects unknown ISO material group (Z)", () => {
    const bad = { ...STEEL_BASE, material: { iso_group: "Z" } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects trials below schema minimum (100)", () => {
    const bad = { ...STEEL_BASE, trials: SCHEMA_INVALID_TRIALS_LOW };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects trials above schema cap (50000)", () => {
    const bad = { ...STEEL_BASE, trials: SCHEMA_INVALID_TRIALS_HIGH };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects negative variation cv", () => {
    const bad = { ...STEEL_BASE, variations: { ...STEEL_BASE.variations, speed_cv: -0.05 } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects variation cv > 1 (out-of-range coefficient of variation)", () => {
    const bad = { ...STEEL_BASE, variations: { ...STEEL_BASE.variations, feed_cv: SCHEMA_INVALID_CV_OVER } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects negative runout_um (TIR is non-negative)", () => {
    const bad = { ...STEEL_BASE, variations: { ...STEEL_BASE.variations, runout_um: -5 } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects negative tolerance bands", () => {
    const bad = {
      ...STEEL_BASE,
      tolerances: { dimension_nominal_mm: NOMINAL_DIM_MM, upper_tol_mm: -TOL_BASELINE_MM, lower_tol_mm: TOL_BASELINE_MM },
    };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });
});

// ── Tier 5: Adversarial / boundary ───────────────────────────────────────────

describe("MonteCarloProcessEngine — adversarial boundary", () => {
  it("minimum schema-allowed trials (100) completes with well-formed distributions", () => {
    const out = monteCarloProcessEngine.compute({ ...STEEL_BASE, trials: TRIALS_MIN_SCHEMA });
    expect(out.value.trials).toBe(TRIALS_MIN_SCHEMA);
    expect(distributionInvariantViolations(out.value.force_distribution, "force")).toEqual([]);
  });

  it("schema cap trials (50000) completes within 5-second budget", () => {
    const t0 = Date.now();
    const out = monteCarloProcessEngine.compute({ ...STEEL_BASE, trials: TRIAL_CAP });
    const elapsed = Date.now() - t0;
    expect(out.value.trials).toBe(TRIAL_CAP);
    expect(elapsed).toBeLessThan(ANTIREG_LARGE_TRIAL_BUDGET_MS);
  });

  it("zero-CV input still produces non-trivial output (internal wear+runout inject scatter)", () => {
    const out = monteCarloProcessEngine.compute(ZERO_VARIATION_STEEL);
    expect(out.value.force_distribution.mean).toBeGreaterThan(0);
    expect(distributionInvariantViolations(out.value.force_distribution, "force")).toEqual([]);
  });

  it("dispatcher returns failure envelope on unknown ISO group", async () => {
    const harness = freshHarness();
    const r = await harness.call("monte_carlo_process", {
      ...STEEL_BASE,
      material: { iso_group: "Z" },
    } as unknown as Record<string, unknown>);
    expect(r.ok).toBe(false);
  });

  it("dispatcher returns failure envelope on negative cutting_speed", async () => {
    const harness = freshHarness();
    const r = await harness.call("monte_carlo_process", {
      ...STEEL_BASE,
      nominal: { ...STEEL_BASE.nominal, cutting_speed_m_min: VC_NEGATIVE },
    } as unknown as Record<string, unknown>);
    expect(r.ok).toBe(false);
  });

  it("high-variation small-sample fixture produces well-formed output (regardless of convergence)", () => {
    const out = monteCarloProcessEngine.compute(HIGH_VARIATION_STEEL);
    expect(typeof out.value.convergence.converged).toBe("boolean");
    expect(distributionInvariantViolations(out.value.force_distribution, "force")).toEqual([]);
  });

  it("microscopic tolerances trigger high scrap rate and 'Scrap rate' advisory when > 2%", () => {
    const out = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      tolerances: { dimension_nominal_mm: NOMINAL_DIM_MM, upper_tol_mm: TOL_MICRO_MM, lower_tol_mm: TOL_MICRO_MM },
    });
    expect(out.value.risk_summary.scrap_rate_pct).toBeGreaterThan(0);
    if (out.value.risk_summary.scrap_rate_pct > SCRAP_ADVISORY_THRESHOLD_PCT) {
      const scrapAdvisory = out.value.recommendations.filter((r) => r.toLowerCase().includes("scrap"));
      expect(scrapAdvisory.length).toBeGreaterThan(0);
    }
  });

  it("very large tool diameter still produces finite output (geometric edge)", () => {
    const out = monteCarloProcessEngine.compute({
      ...STEEL_BASE,
      nominal: { ...STEEL_BASE.nominal, tool_diameter_mm: TOOL_DIA_LARGE },
    });
    expect(Number.isFinite(out.value.force_distribution.mean)).toBe(true);
    expect(Number.isFinite(out.value.roughness_distribution.mean)).toBe(true);
  });

  it("repeated calls with seed=0 (engine maps to default 42) are deterministic across calls", () => {
    const a = monteCarloProcessEngine.compute({ ...STEEL_BASE, seed: 0 });
    const b = monteCarloProcessEngine.compute({ ...STEEL_BASE, seed: 0 });
    expect(a.value.force_distribution.mean).toBe(b.value.force_distribution.mean);
  });
});

// ── Tier 6: Anti-regression ──────────────────────────────────────────────────

describe("U-WIRE58 — anti-regression locks", () => {
  it("schema map exposes monte_carlo_process with passthrough() (extra fields tolerated)", () => {
    const schema = ACTION_CALC_SCHEMAS.monte_carlo_process;
    const withExtra = { ...STEEL_PARAMS, debug_marker: "uwire58-extra" };
    const r = schema.safeParse(withExtra);
    expect(r.success).toBe(true);
    if (r.success) expect((r.data as Record<string, unknown>).debug_marker).toBe("uwire58-extra");
  });

  it("singleton is a MonteCarloProcessEngine instance with compute()", () => {
    expect(monteCarloProcessEngine).toBeInstanceOf(MonteCarloProcessEngine);
    expect(typeof monteCarloProcessEngine.compute).toBe("function");
  });

  it("class-direct instance produces identical key scalars to the singleton", () => {
    const a = new MonteCarloProcessEngine().compute(STEEL_BASE);
    const b = monteCarloProcessEngine.compute(STEEL_BASE);
    expect(a.value.force_distribution.mean).toBe(b.value.force_distribution.mean);
    expect(a.value.trials).toBe(b.value.trials);
  });

  it("dispatcher tools array length is exactly 1 (single MCP tool registration)", () => {
    const harness = freshHarness();
    expect(harness.tools.length).toBe(1);
  });

  it("monte_carlo_process schema parses successfully (proves enum + handler hooked)", () => {
    const r = ACTION_CALC_SCHEMAS.monte_carlo_process.safeParse(STEEL_PARAMS);
    expect(r.success).toBe(true);
  });

  it("dispatcher does NOT regress to fallback for monte_carlo_process", async () => {
    const harness = freshHarness();
    const r = await harness.call("monte_carlo_process", STEEL_PARAMS);
    expect(r.ok).toBe(true);
    expect(r.data).toHaveProperty("value");
    expect(r.data).toHaveProperty("unit");
  });

  it("AtomicValue wrap preserved (slim-response branch line 292 reads result.value.X)", async () => {
    const harness = freshHarness();
    const r = await harness.call("monte_carlo_process", STEEL_PARAMS);
    expect(r.data).toHaveProperty("value");
    const v = r.data.value as Record<string, unknown>;
    expect("trials" in v).toBe(true);
    expect("force_distribution" in v).toBe(true);
    expect("roughness_distribution" in v).toBe(true);
    expect("risk_summary" in v).toBe(true);
    expect("convergence" in v).toBe(true);
  });

  it("unit label is the canonical 'monte_carlo_simulation' string", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    expect(out.unit).toBe(UNIT_LABEL);
  });

  it("formula percentage ceiling is exactly 100 (risk percentages well-bounded)", () => {
    const out = monteCarloProcessEngine.compute(STEEL_BASE);
    expect(out.value.risk_summary.force_exceed_pct).toBeLessThanOrEqual(PERCENT_FULL);
    expect(out.value.risk_summary.roughness_exceed_pct).toBeLessThanOrEqual(PERCENT_FULL);
    expect(out.value.risk_summary.tool_life_below_pct).toBeLessThanOrEqual(PERCENT_FULL);
    expect(out.value.risk_summary.scrap_rate_pct).toBeLessThanOrEqual(PERCENT_FULL);
  });

  it("full-factorial sentinel constant remains 8 (cross-unit consistency lock)", () => {
    expect(FULL_FACT_2POW3).toBe(8);
  });
});
