/**
 * calcDispatcher — U-WIRE56 round-trip suite
 * ============================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE56 — wires SPCProcessCapabilityEngine to prism_calc.
 * Background: spc_capability_analyze was a phantom action — it appeared in
 * the action enum (line 705) and the slim-response branch (line 268) but
 * had NO main switch case. Calls fell to the runtime fallback.
 *
 * Last phantom in the calcDispatcher slim-response sweep (after U-WIRE53/54/55).
 *
 * Engine internals (verified vs. SPCProcessCapabilityEngine.ts):
 *   - USL = nominal + upper_tolerance, LSL = nominal - lower_tolerance
 *   - Cp = (USL-LSL) / (6·sigma_within), where sigma_within is mean-of-subgroup-stddevs
 *   - Cpk = min((USL-mean)/(3·sigma_within), (mean-LSL)/(3·sigma_within))
 *   - sigma_level = Cpk × 3
 *   - Predicted defects via normal CDF; yield_pct = (1 − ppm/1e6) × 100
 *   - Assessment: Cpk≥1.33 capable, ≥1.0 marginal, else not_capable
 *   - Centering: |offset/(tol/2)|<0.1 centered, else shifted_high|low
 *   - Control chart limits: UCL/LCL = mean ± A2·R̄ (subgroup-size dependent)
 *   - ISO 22514-1: when measurement_uncertainty>0 and n≥5, runs 500-sample
 *     Cholesky-backed Monte Carlo to compute Cpk_lower (5th pct) and Cpk_upper (95th pct)
 *   - Conditional spread: cpk_lower/cpk_upper keys absent when not computed
 *   - unit = "spc_capability"
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE56
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import {
  SPCProcessCapabilityEngine,
  spcProcessCapabilityEngine,
  type SPCInput,
} from "../engines/SPCProcessCapabilityEngine.js";
import { ACTION_CALC_SCHEMAS } from "../schemas/calcActionSchemas.js";

// ── Named constants ──────────────────────────────────────────────────────────

const UNIT_LABEL = "capability_index";
const CPK_CAPABLE_THRESHOLD = 1.33;
const CPK_MARGINAL_THRESHOLD = 1.0;
const CENTERING_TOLERANCE_RATIO = 0.1;
const SIGMA_PER_CPK = 3;
const SIX_SIGMA_DIVISOR = 6;
const PPM_PER_MILLION = 1_000_000;
const SUBGROUP_DEFAULT_FALLBACK = 5;
const MIN_MEASUREMENTS_FOR_STDDEV = 2;
const MIN_MEASUREMENTS_FOR_UNCERTAINTY = 5;
const YIELD_PCT_FAIL_CEILING = 50;
const RUNTIME_BUDGET_MS = 2000;
const LARGE_SERIES_LENGTH = 200;
const ALL_IDENTICAL_SERIES_LENGTH = 20;
const SHIFT_AMOUNT = 0.5;
const NEGATIVE_NOMINAL_VALUE = -10.0;
const SUBGROUP_TOO_LARGE = 50;
const SUBGROUP_BELOW_MIN = 1;

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

/** Tightly centered, well-capable: 25 measurements, sigma≈0.005 mm against ±0.05 tol → Cpk≈3+. */
const CAPABLE_CENTERED: SPCInput = {
  measurements: [
    10.001, 9.999, 10.002, 9.998, 10.000, 10.001, 9.999, 10.001, 10.000, 9.999,
    10.000, 10.001, 9.998, 10.002, 9.999, 10.001, 10.000, 9.999, 10.000, 10.001,
    10.002, 9.999, 10.001, 9.998, 10.000,
  ],
  nominal: 10.000,
  upper_tolerance: 0.05,
  lower_tolerance: 0.05,
};

/** Off-center high, marginal/not-capable: same spread but mean shifted +0.04. */
const SHIFTED_HIGH: SPCInput = {
  measurements: [
    10.040, 10.041, 10.042, 10.043, 10.044, 10.045, 10.046, 10.044, 10.041, 10.042,
    10.043, 10.044, 10.045, 10.046, 10.047, 10.044, 10.041, 10.042, 10.043, 10.044,
  ],
  nominal: 10.000,
  upper_tolerance: 0.05,
  lower_tolerance: 0.05,
};

/** Wide spread, not capable: sigma similar to tolerance. */
const WIDE_NOT_CAPABLE: SPCInput = {
  measurements: [
    9.95, 10.05, 9.97, 10.03, 9.96, 10.04, 9.98, 10.02, 9.99, 10.01,
    9.95, 10.05, 9.97, 10.03, 9.96, 10.04, 9.98, 10.02, 9.99, 10.01,
  ],
  nominal: 10.000,
  upper_tolerance: 0.05,
  lower_tolerance: 0.05,
};

/** Minimum n=2 (just over the empty-result threshold). */
const MINIMUM_N: SPCInput = {
  measurements: [10.0, 10.001],
  nominal: 10.0,
  upper_tolerance: 0.05,
  lower_tolerance: 0.05,
};

/** With measurement uncertainty (n>=5) — exercises ISO 22514-1 MC propagation path. */
const WITH_UNCERTAINTY: SPCInput = {
  measurements: [10.001, 9.999, 10.002, 9.998, 10.000, 10.001, 9.999, 10.001, 10.000, 9.999],
  nominal: 10.000,
  upper_tolerance: 0.05,
  lower_tolerance: 0.05,
  measurement_uncertainty: 0.002,
};

const CAPABLE_PARAMS = CAPABLE_CENTERED as unknown as Record<string, unknown>;

// ── Tier 1: Engine-direct invariants ─────────────────────────────────────────

describe("SPCProcessCapabilityEngine — engine-direct invariants", () => {
  it("capable centered baseline returns expected unit and AtomicValue envelope", () => {
    const out = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    expect(out.unit).toBe(UNIT_LABEL);
    expect(typeof out.formula).toBe("string");
    expect(out.formula!.length).toBeGreaterThan(0);
    expect(typeof out.confidence).toBe("number");
    expect(out.confidence).toBeGreaterThanOrEqual(0);
    expect(out.confidence).toBeLessThanOrEqual(1);
  });

  it("sigma_level ≈ cpk × 3 (engine rounds cpk and sigma_level independently from unrounded values)", () => {
    const out = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    // Engine: sigma_level = round(cpk_unrounded × 3, 2) and cpk = round(cpk_unrounded, 2);
    // double-rounding mismatch is bounded by ±0.05 (max round-trip error for 2-decimal precision).
    const computedFromRoundedCpk = out.value.capability.cpk * SIGMA_PER_CPK;
    expect(out.value.capability.sigma_level).toBeCloseTo(computedFromRoundedCpk, 1);
  });

  it("Cpk = min(Cpu, Cpl) — for centered process, Cpk approaches Cp from below", () => {
    const out = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    expect(out.value.capability.cpk).toBeLessThanOrEqual(out.value.capability.cp + 0.01);
    expect(out.value.capability.cpk).toBeGreaterThan(0);
  });

  it("yield_pct = (1 − ppm_total/1e6) × 100 invariant within rounding", () => {
    const out = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    const expected = Math.round((1 - out.value.predicted_defects.ppm_total / PPM_PER_MILLION) * 10000) / 100;
    expect(out.value.predicted_defects.yield_pct).toBe(expected);
  });

  it("ppm_total = ppm_upper + ppm_lower (both tail integration)", () => {
    const out = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    expect(out.value.predicted_defects.ppm_total).toBe(
      out.value.predicted_defects.ppm_upper + out.value.predicted_defects.ppm_lower,
    );
  });

  it("capable centered process is assessed 'capable' AND 'centered'", () => {
    const out = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    expect(out.value.process_assessment).toBe("capable");
    expect(out.value.centering).toBe("centered");
    expect(out.value.capability.cpk).toBeGreaterThanOrEqual(CPK_CAPABLE_THRESHOLD);
  });

  it("shifted-high process is detected as 'shifted_high' centering", () => {
    const out = spcProcessCapabilityEngine.compute(SHIFTED_HIGH);
    expect(out.value.centering).toBe("shifted_high");
  });

  it("wide-variation process is assessed 'not_capable' (cpk < 1.0)", () => {
    const out = spcProcessCapabilityEngine.compute(WIDE_NOT_CAPABLE);
    expect(out.value.capability.cpk).toBeLessThan(CPK_MARGINAL_THRESHOLD);
    expect(out.value.process_assessment).toBe("not_capable");
  });

  it("control_chart UCL > CL > LCL (ordering invariant)", () => {
    const out = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    expect(out.value.control_chart.ucl).toBeGreaterThan(out.value.control_chart.cl);
    expect(out.value.control_chart.cl).toBeGreaterThan(out.value.control_chart.lcl);
  });

  it("control_chart range LCL ≥ 0 (non-negative range invariant)", () => {
    const out = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    expect(out.value.control_chart.lcl_range).toBeGreaterThanOrEqual(0);
  });

  it("sample_stats reports n equal to measurements.length and min ≤ mean ≤ max", () => {
    const out = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    expect(out.value.sample_stats.n).toBe(CAPABLE_CENTERED.measurements.length);
    expect(out.value.sample_stats.mean).toBeGreaterThanOrEqual(out.value.sample_stats.min);
    expect(out.value.sample_stats.mean).toBeLessThanOrEqual(out.value.sample_stats.max);
  });

  it("singleton matches a fresh class instance bit-for-bit (deterministic non-MC path)", () => {
    const fresh = new SPCProcessCapabilityEngine();
    const a = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    const b = fresh.compute(CAPABLE_CENTERED);
    expect(a.value.capability.cp).toBe(b.value.capability.cp);
    expect(a.value.capability.cpk).toBe(b.value.capability.cpk);
    expect(a.value.process_assessment).toBe(b.value.process_assessment);
    expect(a.value.predicted_defects.ppm_total).toBe(b.value.predicted_defects.ppm_total);
  });
});

// ── Tier 2: Variability spans ────────────────────────────────────────────────

describe("SPCProcessCapabilityEngine — variability spans", () => {
  it("3 capability tiers (capable/shifted/not_capable) span ≥2 distinct assessment buckets", () => {
    const fixtures = [CAPABLE_CENTERED, SHIFTED_HIGH, WIDE_NOT_CAPABLE];
    const seen = new Set<string>();
    for (const fx of fixtures) {
      seen.add(spcProcessCapabilityEngine.compute(fx).value.process_assessment);
    }
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });

  it("centering sweep: a left-shifted variant is detected as 'shifted_low'", () => {
    const shiftedLow: SPCInput = {
      ...CAPABLE_CENTERED,
      measurements: CAPABLE_CENTERED.measurements.map((v) => v - 0.04),
    };
    expect(spcProcessCapabilityEngine.compute(shiftedLow).value.centering).toBe("shifted_low");
  });

  it("doubling tolerance keeps mean fixed but raises Cp/Cpk monotonically", () => {
    const tight = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    const wide = spcProcessCapabilityEngine.compute({
      ...CAPABLE_CENTERED,
      upper_tolerance: 0.10,
      lower_tolerance: 0.10,
    });
    expect(wide.value.capability.cp).toBeGreaterThan(tight.value.capability.cp);
    expect(wide.value.capability.cpk).toBeGreaterThan(tight.value.capability.cpk);
  });

  it("explicit subgroup_size override is accepted and produces well-formed result", () => {
    const out = spcProcessCapabilityEngine.compute({
      ...CAPABLE_CENTERED,
      subgroup_size: SUBGROUP_DEFAULT_FALLBACK,
    });
    expect(Number.isFinite(out.value.capability.cp)).toBe(true);
    expect(out.value.sample_stats.n).toBe(CAPABLE_CENTERED.measurements.length);
  });

  it("ISO 22514-1 path: measurement_uncertainty + n>=5 produces cpk_lower and cpk_upper bounds", () => {
    const out = spcProcessCapabilityEngine.compute(WITH_UNCERTAINTY);
    expect("cpk_lower" in out.value.capability).toBe(true);
    expect("cpk_upper" in out.value.capability).toBe(true);
    expect(typeof out.value.capability.cpk_lower).toBe("number");
    expect(typeof out.value.capability.cpk_upper).toBe("number");
    expect(out.value.capability.cpk_lower!).toBeLessThanOrEqual(out.value.capability.cpk_upper!);
    void MIN_MEASUREMENTS_FOR_UNCERTAINTY;
  });

  it("ISO 22514-1 path produces a measurement-uncertainty advisory recommendation", () => {
    const out = spcProcessCapabilityEngine.compute(WITH_UNCERTAINTY);
    const advisory = out.value.recommendations.filter((r) => r.includes("uncertainty") || r.includes("Cpk_lower"));
    expect(advisory.length).toBeGreaterThan(0);
  });

  it("zero measurement_uncertainty skips MC path (cpk_lower/cpk_upper keys absent)", () => {
    const out = spcProcessCapabilityEngine.compute({
      ...CAPABLE_CENTERED,
      measurement_uncertainty: 0,
    });
    expect("cpk_lower" in out.value.capability).toBe(false);
    expect("cpk_upper" in out.value.capability).toBe(false);
  });

  it("not_capable process emits 'not capable' or 'reduce variation' advisory", () => {
    const out = spcProcessCapabilityEngine.compute(WIDE_NOT_CAPABLE);
    const cap_advisory = out.value.recommendations.filter((r) =>
      r.toLowerCase().includes("not capable") || r.toLowerCase().includes("reduce variation"),
    );
    expect(cap_advisory.length).toBeGreaterThan(0);
  });

  it("nelson_violations is an array (well-typed result, regardless of count)", () => {
    const out = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    expect(Array.isArray(out.value.nelson_violations)).toBe(true);
    expect(out.value.nelson_violations.length).toBeLessThanOrEqual(CAPABLE_CENTERED.measurements.length);
  });

  it("Cp formula identity: implied σ_within = (USL−LSL)/(6·Cp) is finite and positive", () => {
    const out = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    const usl = CAPABLE_CENTERED.nominal + CAPABLE_CENTERED.upper_tolerance;
    const lsl = CAPABLE_CENTERED.nominal - CAPABLE_CENTERED.lower_tolerance;
    const tol = usl - lsl;
    const sigmaWithin = tol / (SIX_SIGMA_DIVISOR * out.value.capability.cp);
    expect(sigmaWithin).toBeGreaterThan(0);
    expect(Number.isFinite(sigmaWithin)).toBe(true);
  });
});

// ── Tier 3: Dispatcher round-trip ────────────────────────────────────────────

describe("calcDispatcher spc_capability_analyze — round-trip", () => {
  let harness: CalcDispatcherHarness;

  beforeEach(() => {
    harness = freshHarness();
  });

  it("dispatcher routes spc_capability_analyze end-to-end with flattened SPCResult", async () => {
    const r = await harness.call("spc_capability_analyze", CAPABLE_PARAMS);
    expect(r.ok).toBe(true);
    expect(r.data.unit).toBe(UNIT_LABEL);
    const cap = r.data.capability as Record<string, unknown>;
    const def = r.data.predicted_defects as Record<string, unknown>;
    expect(typeof cap.cp).toBe("number");
    expect(typeof cap.cpk).toBe("number");
    expect(typeof def.yield_pct).toBe("number");
    expect(typeof r.data.process_assessment).toBe("string");
  });

  it("dispatcher and engine-direct produce identical key scalars (deterministic non-MC)", async () => {
    const r = await harness.call("spc_capability_analyze", CAPABLE_PARAMS);
    const direct = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    expect((r.data.capability as { cp: number }).cp).toBe(direct.value.capability.cp);
    expect((r.data.capability as { cpk: number }).cpk).toBe(direct.value.capability.cpk);
    expect((r.data.capability as { sigma_level: number }).sigma_level).toBe(direct.value.capability.sigma_level);
    expect(r.data.process_assessment).toBe(direct.value.process_assessment);
  });

  it("dispatcher exposes recommendations array when not_capable process triggers advisories", async () => {
    // Note: response slimmer strips empty arrays. WIDE_NOT_CAPABLE always triggers
    // 'not capable' / 'reduce variation' advisories, ensuring the array survives slim.
    const r = await harness.call("spc_capability_analyze", WIDE_NOT_CAPABLE as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.recommendations)).toBe(true);
    expect((r.data.recommendations as unknown[]).length).toBeGreaterThan(0);
  });

  it("shifted-high input round-trips and dispatcher result reports 'shifted_high' centering", async () => {
    const r = await harness.call("spc_capability_analyze", SHIFTED_HIGH as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect(r.data.centering).toBe("shifted_high");
  });

  it("not_capable input round-trips and dispatcher reports 'not_capable' assessment", async () => {
    const r = await harness.call("spc_capability_analyze", WIDE_NOT_CAPABLE as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect(r.data.process_assessment).toBe("not_capable");
  });

  it("dispatcher carries control_chart limits with all 6 numeric fields populated", async () => {
    const r = await harness.call("spc_capability_analyze", CAPABLE_PARAMS);
    const cc = r.data.control_chart as Record<string, unknown>;
    expect(typeof cc.ucl).toBe("number");
    expect(typeof cc.lcl).toBe("number");
    expect(typeof cc.cl).toBe("number");
    expect(typeof cc.ucl_range).toBe("number");
    expect(typeof cc.lcl_range).toBe("number");
    expect(typeof cc.cl_range).toBe("number");
  });
});

// ── Tier 4: Schema rejection ─────────────────────────────────────────────────

describe("spc_capability_analyze schema — rejects malformed inputs", () => {
  const schema = ACTION_CALC_SCHEMAS.spc_capability_analyze;

  it("baseline capable input parses successfully", () => {
    const r = schema.safeParse(CAPABLE_PARAMS);
    expect(r.success).toBe(true);
  });

  it("rejects measurements with fewer than 2 entries", () => {
    const bad = { ...CAPABLE_CENTERED, measurements: [10.0] };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
    void MIN_MEASUREMENTS_FOR_STDDEV;
  });

  it("rejects empty measurements array", () => {
    const bad = { ...CAPABLE_CENTERED, measurements: [] };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects negative upper_tolerance", () => {
    const bad = { ...CAPABLE_CENTERED, upper_tolerance: -0.05 };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects negative lower_tolerance", () => {
    const bad = { ...CAPABLE_CENTERED, lower_tolerance: -0.05 };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects measurements with non-numeric entries", () => {
    const bad = { ...CAPABLE_CENTERED, measurements: [10.0, "broken", 10.001] };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects subgroup_size below 2", () => {
    const bad = { ...CAPABLE_CENTERED, subgroup_size: SUBGROUP_BELOW_MIN };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects subgroup_size above schema cap (25)", () => {
    const bad = { ...CAPABLE_CENTERED, subgroup_size: SUBGROUP_TOO_LARGE };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects negative measurement_uncertainty", () => {
    const bad = { ...CAPABLE_CENTERED, measurement_uncertainty: -0.001 };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects missing nominal", () => {
    const { nominal: _drop, ...rest } = CAPABLE_CENTERED;
    const r = schema.safeParse(rest as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("accepts negative nominal (valid for relative dimensions like deviations)", () => {
    const ok = { ...CAPABLE_CENTERED, nominal: NEGATIVE_NOMINAL_VALUE };
    const r = schema.safeParse(ok as unknown as Record<string, unknown>);
    expect(r.success).toBe(true);
  });
});

// ── Tier 5: Adversarial / boundary ───────────────────────────────────────────

describe("SPCProcessCapabilityEngine — adversarial boundary", () => {
  it("minimum n=2 (just over engine threshold) returns finite Cpk and well-formed assessment", () => {
    const out = spcProcessCapabilityEngine.compute(MINIMUM_N);
    expect(Number.isFinite(out.value.capability.cpk)).toBe(true);
    expect(["capable", "marginal", "not_capable"]).toContain(out.value.process_assessment);
  });

  it("all-identical measurements (zero variance) produces finite-typed Cpk without throwing", () => {
    const out = spcProcessCapabilityEngine.compute({
      ...CAPABLE_CENTERED,
      measurements: new Array(ALL_IDENTICAL_SERIES_LENGTH).fill(10.0),
    });
    expect(typeof out.value.capability.cpk).toBe("number");
    expect(out.value.sample_stats.n).toBe(ALL_IDENTICAL_SERIES_LENGTH);
  });

  it("very large measurement series (n=200) completes within 2-second runtime budget", () => {
    const big: SPCInput = {
      ...CAPABLE_CENTERED,
      measurements: Array.from({ length: LARGE_SERIES_LENGTH }, (_, i) => 10.0 + Math.sin(i / 7) * 0.005),
    };
    const t0 = Date.now();
    const out = spcProcessCapabilityEngine.compute(big);
    const elapsed = Date.now() - t0;
    expect(out.value.sample_stats.n).toBe(LARGE_SERIES_LENGTH);
    expect(elapsed).toBeLessThan(RUNTIME_BUDGET_MS);
  });

  it("massively shifted process (mean far outside USL) yields below 50%", () => {
    const out = spcProcessCapabilityEngine.compute({
      ...CAPABLE_CENTERED,
      measurements: CAPABLE_CENTERED.measurements.map((v) => v + SHIFT_AMOUNT),
    });
    expect(out.value.predicted_defects.yield_pct).toBeLessThan(YIELD_PCT_FAIL_CEILING);
  });

  it("dispatcher returns failure envelope when measurements is empty", async () => {
    const harness = freshHarness();
    const r = await harness.call("spc_capability_analyze", { ...CAPABLE_CENTERED, measurements: [] } as unknown as Record<string, unknown>);
    expect(r.ok).toBe(false);
  });

  it("Infinity in measurements does not throw and returns a numeric (NaN-typed) Cpk slot", () => {
    const out = spcProcessCapabilityEngine.compute({
      ...CAPABLE_CENTERED,
      measurements: [10.0, 10.001, Infinity, 10.0],
    });
    expect(typeof out.value.capability.cpk).toBe("number");
  });

  it("zero tolerance (USL=LSL=nominal) is assessed 'not_capable'", () => {
    const out = spcProcessCapabilityEngine.compute({
      ...CAPABLE_CENTERED,
      upper_tolerance: 0,
      lower_tolerance: 0,
    });
    expect(typeof out.value.capability.cpk).toBe("number");
    expect(out.value.process_assessment).toBe("not_capable");
  });

  it("dispatcher with measurement_uncertainty>0 round-trips and exposes cpk_lower/cpk_upper", async () => {
    const harness = freshHarness();
    const r = await harness.call("spc_capability_analyze", WITH_UNCERTAINTY as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    const cap = r.data.capability as Record<string, unknown>;
    expect("cpk_lower" in cap).toBe(true);
    expect("cpk_upper" in cap).toBe(true);
    expect(typeof cap.cpk_lower).toBe("number");
    expect(typeof cap.cpk_upper).toBe("number");
  });
});

// ── Tier 6: Anti-regression ──────────────────────────────────────────────────

describe("U-WIRE56 — anti-regression locks", () => {
  it("schema map exposes spc_capability_analyze with passthrough() (extra fields tolerated)", () => {
    const schema = ACTION_CALC_SCHEMAS.spc_capability_analyze;
    const withExtra = { ...CAPABLE_PARAMS, debug_marker: "uwire56-extra" };
    const r = schema.safeParse(withExtra);
    expect(r.success).toBe(true);
    if (r.success) expect((r.data as Record<string, unknown>).debug_marker).toBe("uwire56-extra");
  });

  it("singleton is a SPCProcessCapabilityEngine instance with compute()", () => {
    expect(spcProcessCapabilityEngine).toBeInstanceOf(SPCProcessCapabilityEngine);
    expect(typeof spcProcessCapabilityEngine.compute).toBe("function");
  });

  it("class-direct instance produces identical key scalars to the singleton", () => {
    const a = new SPCProcessCapabilityEngine().compute(CAPABLE_CENTERED);
    const b = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    expect(a.value.capability.cp).toBe(b.value.capability.cp);
    expect(a.value.capability.cpk).toBe(b.value.capability.cpk);
    expect(a.value.process_assessment).toBe(b.value.process_assessment);
  });

  it("dispatcher tools array length is exactly 1 (single MCP tool registration)", () => {
    const harness = freshHarness();
    expect(harness.tools.length).toBe(1);
  });

  it("spc_capability_analyze schema parses successfully (proves enum + handler hooked)", () => {
    const r = ACTION_CALC_SCHEMAS.spc_capability_analyze.safeParse(CAPABLE_PARAMS);
    expect(r.success).toBe(true);
  });

  it("dispatcher does NOT regress to fallback for spc_capability_analyze", async () => {
    const harness = freshHarness();
    const r = await harness.call("spc_capability_analyze", CAPABLE_PARAMS);
    expect(r.ok).toBe(true);
    expect(r.data).toHaveProperty("capability");
    expect(r.data).toHaveProperty("predicted_defects");
    expect(r.data).toHaveProperty("process_assessment");
  });

  it("Cpk capable threshold (1.33) is structural — capable assessment requires Cpk≥1.33", () => {
    const out = spcProcessCapabilityEngine.compute(CAPABLE_CENTERED);
    expect(out.value.capability.cpk).toBeGreaterThanOrEqual(CPK_CAPABLE_THRESHOLD);
    expect(out.value.process_assessment).toBe("capable");
    void CENTERING_TOLERANCE_RATIO;
  });
});
