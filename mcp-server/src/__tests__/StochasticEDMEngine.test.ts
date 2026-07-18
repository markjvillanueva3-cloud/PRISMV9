/**
 * StochasticEDMEngine.test.ts — real reference-value coverage for the untested,
 * dispatcher-wired StochasticEDMEngine (calcDispatcher action `stochastic_edm`).
 * ===========================================================================
 * WHY THIS EXISTS: `src/engines/StochasticEDMEngine.ts` shipped with a singleton
 * (`stochasticEDMEngine`) wired into `prism_calc` (calcDispatcher.ts:6812 →
 * `stochasticEDMEngine.analyze(...)`) but had NO test referencing it in
 * `src/__tests__/`. This suite pins the engine's OWN documented formulas to
 * hand-derived reference values (not `toBeDefined()` stubs), plus a round-trip
 * through the real `prism_calc` handler for the wired Monte-Carlo entry point.
 *
 * TESTABILITY NOTE (honest, R12): the MC entry `analyze()` draws from raw
 * `Math.random()` — there is NO seeded PRNG on this engine (unlike
 * ImportanceSamplingReliabilityEngine), so a "same seed → identical estimate"
 * determinism test is IMPOSSIBLE here. Instead:
 *   (a) every DETERMINISTIC helper (craterDiameter / materialRemovalRate /
 *       recastDepth / edmRoughness / shortCircuitProb / percentile / makeDist)
 *       is pinned to an EXACT reference value re-derived from the formula in the
 *       engine header — these need no RNG and fully encode intent (R9); and
 *   (b) the stochastic `analyze()` is checked against RNG-invariant properties
 *       that must hold for EVERY realization (unit labels, p5 ≤ p95 ordering,
 *       non-negativity, deterministic short-circuit/warning logic, MC-sample
 *       clamping) — the correct way to test an unseeded MC estimator.
 *
 * Reference values were computed independently from the header formulas:
 *   - d_crater = 8·(E·α)^(1/3)                                    [µm]
 *   - MRR = η·(E/1000)·f_rep / (ρ·(cp·Tm+Lm)/1e9) · 60,  f_rep=1e6/(t_on+t_off)
 *   - t_recast = 2·√(α·t_on/1e6)·1000 = 2·√(α·t_on)              [µm]
 *   - Ra = 0.38·max(0.1, I_p)^0.40·max(0.05, t_on)^0.28,  I_p = (E/1000)/(45·t_on·1e-6)
 *   - P_sc = (1 − exp(−0.01·N_parts / (max(1,flush)/5)))·100     [%]
 *   - percentile: linear-interp at idx = (p/100)·(n−1)
 *   - makeDist: sample mean, (n−1) sample std, p5/p95, each round(·,3 dp)
 *
 * @domain AI / reliability — stochastic uncertainty quantification (MATH-2)
 * @unit U-india-StochasticEDMEngine-TEST
 */

import { describe, it, expect, beforeAll } from "vitest";

import {
  StochasticEDMEngine,
  stochasticEDMEngine,
  type EDMUncertaintyInput,
  type EDMDistribution,
} from "../engines/StochasticEDMEngine.js";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

const eng = stochasticEDMEngine;

// ── 1. craterDiameter: d = 8·(E·α)^(1/3) ─────────────────────────────────────
describe("StochasticEDMEngine.craterDiameter — thermal crater scaling", () => {
  it("d(E=1,α=1) = 8·1^(1/3) = 8 µm", () => {
    expect(eng.craterDiameter(1, 1)).toBeCloseTo(8, 6);
  });
  it("d(E=8,α=1) = 8·8^(1/3) = 8·2 = 16 µm", () => {
    expect(eng.craterDiameter(8, 1)).toBeCloseTo(16, 5);
  });
  it("d(E=1,α=125) = 8·125^(1/3) = 8·5 = 40 µm", () => {
    expect(eng.craterDiameter(1, 125)).toBeCloseTo(40, 5);
  });
  it("d(E=27,α=1) = 8·27^(1/3) = 8·3 = 24 µm", () => {
    expect(eng.craterDiameter(27, 1)).toBeCloseTo(24, 5);
  });
  it("monotone increasing in energy (E=1 < E=8 < E=27)", () => {
    expect(eng.craterDiameter(8, 1)).toBeGreaterThan(eng.craterDiameter(1, 1));
    expect(eng.craterDiameter(27, 1)).toBeGreaterThan(eng.craterDiameter(8, 1));
  });
  it("adversarial: zero energy → 0 crater (E·α = 0)", () => {
    expect(eng.craterDiameter(0, 14)).toBe(0);
  });
  it("failure mode: negative energy → NaN (Math.pow(neg,1/3) is out of domain)", () => {
    // Documents a real robustness gap: no input guard — a negative energy
    // silently produces NaN rather than a clamped/thrown value.
    expect(Number.isNaN(eng.craterDiameter(-1, 1))).toBe(true);
  });
});

// ── 2. recastDepth: t_recast = 2·√(α·t_on/1e6)·1000 µm ───────────────────────
describe("StochasticEDMEngine.recastDepth — thermal-penetration recast layer", () => {
  it("t(α=2,t_on=2) = 2·√(4e-6)·1000 = 4 µm", () => {
    expect(eng.recastDepth(2, 2)).toBeCloseTo(4, 6);
  });
  it("t(α=8,t_on=2) = 2·√(16e-6)·1000 = 8 µm", () => {
    expect(eng.recastDepth(8, 2)).toBeCloseTo(8, 6);
  });
  it("t(α=14,t_on=100) = 2·√(1400)·... = 74.83315 µm", () => {
    expect(eng.recastDepth(14, 100)).toBeCloseTo(74.833148, 4);
  });
  it("√-scaling: quadrupling α·t_on (α·t_on 4→16) doubles recast depth (4→8 µm)", () => {
    expect(eng.recastDepth(8, 2)).toBeCloseTo(2 * eng.recastDepth(2, 2), 6);
  });
});

// ── 3. materialRemovalRate: MRR = η·E·f_rep/(ρ·(cpΔT+Lm)) ────────────────────
describe("StochasticEDMEngine.materialRemovalRate — pulse-energy MRR", () => {
  // steel: ρ=7850, cp=460, Tm=1500, Lm=270000 → specificEnergy = 7.536 J/mm³
  it("steel, E=1000 mJ, t_on=t_off=100 µs, η=0.25 → 9952.2293 mm³/min", () => {
    const mrr = eng.materialRemovalRate(1000, 100, 100, 0.25, 7850, 460, 1500, 270000);
    expect(mrr).toBeCloseTo(9952.2293, 3);
  });
  it("scale invariance: halving E while halving period (t_on,t_off) is identical", () => {
    // f_rep doubles as period halves, cancelling the halved energy per pulse.
    const a = eng.materialRemovalRate(1000, 100, 100, 0.25, 7850, 460, 1500, 270000);
    const b = eng.materialRemovalRate(500, 50, 50, 0.25, 7850, 460, 1500, 270000);
    expect(b).toBeCloseTo(a, 6);
  });
  it("linear in efficiency: doubling η doubles MRR", () => {
    const lo = eng.materialRemovalRate(1000, 100, 100, 0.1, 7850, 460, 1500, 270000);
    const hi = eng.materialRemovalRate(1000, 100, 100, 0.2, 7850, 460, 1500, 270000);
    expect(hi).toBeCloseTo(2 * lo, 6);
  });
  it("failure mode: zero specific energy (cp=Tm=Lm=0) → guard returns 0, no divide-by-zero", () => {
    const mrr = eng.materialRemovalRate(1000, 100, 100, 0.25, 7850, 0, 0, 0);
    expect(mrr).toBe(0);
  });
});

// ── 4. edmRoughness: Ra = 0.38·max(0.1,I_p)^0.40·max(0.05,t_on)^0.28 ─────────
describe("StochasticEDMEngine.edmRoughness — Klocke Ra model", () => {
  it("Ra(E=45,t_on=100): I_p = 45000/4500 = 10 → 3.465641 µm", () => {
    expect(eng.edmRoughness(45, 100)).toBeCloseTo(3.465641, 5);
  });
  it("Ra(E=90,t_on=200) → 4.207964 µm", () => {
    expect(eng.edmRoughness(90, 200)).toBeCloseTo(4.207964, 5);
  });
  it("adversarial: tiny energy → I_p clamped to 0.1 floor → 0.549267 µm", () => {
    // I_p = (1e-3/1000)/(45·1e-4) ≈ 2.2e-4 < 0.1 → floored; Ra independent of exact E.
    expect(eng.edmRoughness(0.001, 100)).toBeCloseTo(0.549267, 5);
  });
  it("adversarial: t_on=0 → I_p branch = 1 and t_on clamped to 0.05 → 0.164246 µm", () => {
    expect(eng.edmRoughness(5, 0)).toBeCloseTo(0.164246, 5);
  });
});

// ── 5. shortCircuitProb: P_sc = (1−exp(−0.01·N/(max(1,flush)/5)))·100 ────────
describe("StochasticEDMEngine.shortCircuitProb — debris short-circuit CDF", () => {
  it("zero parts since dress → 0% (fresh electrode)", () => {
    expect(eng.shortCircuitProb(0, 5)).toBe(0);
  });
  it("100 parts, flush=5 (factor 1) → (1−e^-1)·100 = 63.212056 %", () => {
    expect(eng.shortCircuitProb(100, 5)).toBeCloseTo(63.212056, 4);
  });
  it("500 parts, flush=5 → (1−e^-5)·100 = 99.326205 %", () => {
    expect(eng.shortCircuitProb(500, 5)).toBeCloseTo(99.326205, 4);
  });
  it("higher flush lowers P_sc: 100 parts at flush=10 → (1−e^-0.5)·100 = 39.346934 %", () => {
    expect(eng.shortCircuitProb(100, 10)).toBeCloseTo(39.346934, 4);
  });
  it("monotone increasing in parts, decreasing in flushing pressure", () => {
    expect(eng.shortCircuitProb(200, 5)).toBeGreaterThan(eng.shortCircuitProb(100, 5));
    expect(eng.shortCircuitProb(100, 20)).toBeLessThan(eng.shortCircuitProb(100, 5));
  });
});

// ── 6. percentile: linear interpolation at idx = (p/100)·(n−1) ───────────────
describe("StochasticEDMEngine.percentile — interpolated order statistic", () => {
  const s = [1, 2, 3, 4, 5];
  it("median (p50) of [1..5] = 3 (exact index)", () => {
    expect(eng.percentile(s, 50)).toBe(3);
  });
  it("p25 = index 1.0 = 2; p0 = 1; p100 = 5", () => {
    expect(eng.percentile(s, 25)).toBe(2);
    expect(eng.percentile(s, 0)).toBe(1);
    expect(eng.percentile(s, 100)).toBe(5);
  });
  it("p5 = index 0.2 → 1 + 0.2·(2−1) = 1.2 (interpolated)", () => {
    expect(eng.percentile(s, 5)).toBeCloseTo(1.2, 6);
  });
  it("failure mode: empty array → 0 (degenerate guard, never throws)", () => {
    expect(eng.percentile([], 50)).toBe(0);
  });
});

// ── 7. makeDist: mean, (n−1) sample std, p5/p95, rounded to 3 dp ─────────────
describe("StochasticEDMEngine.makeDist — sample summary distribution", () => {
  it("[1..5] → mean 3, std √2.5=1.581, p5 1.2, p95 4.8, unit passthrough", () => {
    const d: EDMDistribution = eng.makeDist([1, 2, 3, 4, 5], "mm³/min");
    expect(d.mean).toBe(3);
    expect(d.std).toBeCloseTo(1.581, 3); // sqrt(10/4)=1.5811388 → round(,3)
    expect(d.p5).toBeCloseTo(1.2, 3);
    expect(d.p95).toBeCloseTo(4.8, 3);
    expect(d.unit).toBe("mm³/min");
  });
  it("single sample → std 0 (max(n−1,1) guard), p5=p95=mean", () => {
    const d = eng.makeDist([7], "µm");
    expect(d.mean).toBe(7);
    expect(d.std).toBe(0);
    expect(d.p5).toBe(7);
    expect(d.p95).toBe(7);
  });
  it("invariant: p5 ≤ mean-region ≤ p95 ordering holds for any sample set", () => {
    const d = eng.makeDist([10, 2, 7, 3, 9, 1, 5], "ratio");
    expect(d.p5).toBeLessThanOrEqual(d.p95);
  });
});

// ── 8. analyze(): RNG-invariant properties of the Monte-Carlo run ────────────
describe("StochasticEDMEngine.analyze — MC-invariant structure & properties", () => {
  const base: EDMUncertaintyInput = {
    pulse_energy_mJ: 2,
    pulse_on_us: 100,
    pulse_off_us: 100,
    gap_voltage_V: 60,
    peak_current_A: 10,
    material: "steel",
    electrode_material: "copper",
    mc_samples: 2000,
  };
  const dists = (r: ReturnType<typeof eng.analyze>): EDMDistribution[] => [
    r.mrr_mm3_min,
    r.surface_roughness_Ra,
    r.recast_depth_um,
    r.electrode_wear_ratio,
    r.crater_diameter_um,
  ];

  it("returns all five distributions with correct unit labels", () => {
    const r = eng.analyze(base);
    expect(r.mrr_mm3_min.unit).toBe("mm³/min");
    expect(r.surface_roughness_Ra.unit).toBe("µm");
    expect(r.recast_depth_um.unit).toBe("µm");
    expect(r.electrode_wear_ratio.unit).toBe("ratio");
    expect(r.crater_diameter_um.unit).toBe("µm");
    expect(r.formula).toContain("Klocke");
  });

  it("every distribution obeys p5 ≤ p95, mean ≥ 0, p5 ≥ 0 (non-negative physics)", () => {
    const r = eng.analyze(base);
    for (const d of dists(r)) {
      expect(d.p5).toBeLessThanOrEqual(d.p95);
      expect(d.mean).toBeGreaterThanOrEqual(0);
      expect(d.p5).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(d.mean)).toBe(true);
      expect(Number.isFinite(d.std)).toBe(true);
    }
    expect(r.mrr_mm3_min.mean).toBeGreaterThan(0);
  });

  it("deterministic short-circuit logic: 500 parts + flush=1 → high P_sc + recommendation", () => {
    // scProb = (1 − e^(−0.01·500/(1/5)))·100 = (1 − e^-25)·100 ≈ 100 (RNG-independent)
    const r = eng.analyze({ ...base, parts_since_dress: 500, flushing_pressure_bar: 1 });
    expect(r.short_circuit_probability_pct).toBeGreaterThan(90);
    expect(r.recommendations.some((s) => /short-circuit/i.test(s))).toBe(true);
  });

  it("deterministic micro-EDM warning: type=micro + pulse_energy>1 mJ → warning emitted", () => {
    const r = eng.analyze({ ...base, edm_type: "micro", pulse_energy_mJ: 2 });
    expect(r.warnings.some((s) => /micro-EDM/i.test(s))).toBe(true);
  });

  it("adversarial: mc_samples above MAX_TRIALS (150000) is clamped, finite result, no throw/timeout", () => {
    const r = eng.analyze({ ...base, mc_samples: 150_000 });
    expect(Number.isFinite(r.mrr_mm3_min.mean)).toBe(true);
    expect(r.crater_diameter_um.mean).toBeGreaterThan(0);
  });

  it("adversarial: mc_samples=1 (degenerate MC) → std 0 guard, still structured & finite", () => {
    const r = eng.analyze({ ...base, mc_samples: 1 });
    expect(Number.isFinite(r.mrr_mm3_min.mean)).toBe(true);
    expect(r.mrr_mm3_min.std).toBe(0); // makeDist single-sample guard
  });

  it("failure mode: unrecognized material → throws a DESCRIPTIVE error (validated up-front, not a raw undefined-access crash)", () => {
    // FIX (U-india-MaterialValidation): analyze() now validates the material key and throws
    // "Unknown EDM material: <x>. Known: <list>" BEFORE the undefined EDM_MATS[x] access —
    // per the engines-dir "throw descriptive errors" convention (was: raw undefined-property crash).
    expect(() =>
      eng.analyze({ ...base, material: "unobtanium" as unknown as EDMUncertaintyInput["material"] }),
    ).toThrow(/Unknown EDM material/);
  });

  it("class is directly constructible and matches the exported singleton behavior", () => {
    const fresh = new StochasticEDMEngine();
    expect(fresh.craterDiameter(8, 1)).toBeCloseTo(eng.craterDiameter(8, 1), 9);
  });
});

// ── 9. Round-trip through the wired prism_calc dispatcher (R15) ──────────────
// Proves the `stochastic_edm` action is numerically live end-to-end — not just a
// source-grep match — driving the real handler → engine → slimResponse envelope.
interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
function makeStubServer(): {
  tools: CapturedTool[];
  tool: (n: string, d: string, s: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return { tools, tool(name, _d, _s, handler) { tools.push({ name, handler }); } };
}
async function invoke(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as { content?: Array<{ text?: string }> };
  if (Array.isArray(res.content)) {
    return JSON.parse(res.content[0]?.text ?? "null") as Record<string, unknown>;
  }
  return res as unknown as Record<string, unknown>;
}

describe("StochasticEDMEngine — prism_calc round-trip (action stochastic_edm)", () => {
  let calcHandler: CapturedTool["handler"];

  beforeAll(() => {
    const srv = makeStubServer();
    registerCalcDispatcher(srv as unknown as Parameters<typeof registerCalcDispatcher>[0]);
    const t = srv.tools.find((x) => x.name === "prism_calc");
    if (!t) throw new Error("prism_calc not registered");
    calcHandler = t.handler;
  });

  const benign: Record<string, unknown> = {
    pulse_energy_mJ: 2,
    pulse_on_us: 100,
    pulse_off_us: 100,
    gap_voltage_V: 60,
    peak_current_A: 10,
    material: "steel",
    electrode_material: "copper",
    mc_samples: 500,
  };

  it("returns a real parseable body (not blocked) with the five distributions wired through", async () => {
    const r = await invoke(calcHandler, "stochastic_edm", benign);
    expect(r).toBeTruthy();
    expect((r as { blocked?: boolean }).blocked).not.toBe(true);
    const mrr = r.mrr_mm3_min as EDMDistribution;
    const crater = r.crater_diameter_um as EDMDistribution;
    expect(mrr).toBeTruthy();
    expect(typeof mrr.mean).toBe("number");
    expect(mrr.unit).toBe("mm³/min");
    expect(mrr.p5).toBeLessThanOrEqual(mrr.p95);
    expect(crater.mean).toBeGreaterThan(0);
  });

  it("params reach the engine: high parts_since_dress drives short_circuit_probability_pct > 0 through the wire", async () => {
    const r = await invoke(calcHandler, "stochastic_edm", {
      ...benign,
      parts_since_dress: 500,
      flushing_pressure_bar: 1,
    });
    expect((r as { blocked?: boolean }).blocked).not.toBe(true);
    expect(typeof r.short_circuit_probability_pct).toBe("number");
    expect(r.short_circuit_probability_pct as number).toBeGreaterThan(0);
  });
});
