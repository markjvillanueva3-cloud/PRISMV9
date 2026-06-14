/**
 * ShopProfileAdapterEngine tests — real reference values, no stubs.
 *
 * Verifies the per-shop calibration learning layer:
 *   - EWMA fold semantics (algebraic invariants)
 *   - Confidence-from-ESS asymptotic shape
 *   - Multiplier clamping (out-of-bounds routes to anomalies)
 *   - S(x) anomaly gate (critical outcomes NOT folded)
 *   - Insufficient-evidence fallback (warning + baseline)
 *   - JM Die baseline path (default profile, no history)
 *   - projectAdaptedProfile: pure projection, no baseline mutation
 *
 * slot:india /goal-psn-self-improving iter2
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ShopProfileAdapterEngine,
  ewmaUpdate,
  confidenceFromEss,
  clampMultiplier,
  foldOutcomeIntoDelta,
  projectAdaptedProfile,
  type ShopOutcomeRecord,
} from "../engines/ShopProfileAdapterEngine.js";
import { shopConfigurationEngine } from "../engines/ShopConfigurationEngine.js";

describe("ewmaUpdate (pure helper)", () => {
  it("returns weighted blend of prior + observation with default alpha=0.15", () => {
    // ewma(1.0, 1.5) = 0.85*1.0 + 0.15*1.5 = 1.075
    expect(ewmaUpdate(1.0, 1.5)).toBeCloseTo(1.075, 5);
  });

  it("alpha=1 → observation overrides prior", () => {
    expect(ewmaUpdate(1.0, 2.5, 1.0)).toBe(2.5);
  });

  it("alpha=0 → prior preserved", () => {
    expect(ewmaUpdate(1.0, 2.5, 0)).toBe(1.0);
  });

  it("symmetric blend at alpha=0.5", () => {
    expect(ewmaUpdate(2.0, 4.0, 0.5)).toBe(3.0);
  });
});

describe("confidenceFromEss (pure helper)", () => {
  it("returns 0 at ess=0", () => {
    expect(confidenceFromEss(0)).toBe(0);
  });

  it("ess=4 → 0.5 (algebraic — 1 - 1/(1+sqrt(1)) = 0.5)", () => {
    expect(confidenceFromEss(4)).toBeCloseTo(0.5, 5);
  });

  it("ess=16 → 2/3 (1 - 1/(1+sqrt(4)) = 2/3)", () => {
    expect(confidenceFromEss(16)).toBeCloseTo(2 / 3, 5);
  });

  it("ess=100 → asymptotic toward 1.0 (between 0.83 and 1.0)", () => {
    const c = confidenceFromEss(100);
    expect(c).toBeGreaterThan(0.83);
    expect(c).toBeLessThan(1.0);
  });

  it("monotonic increasing: c(1)<c(10)<c(100)", () => {
    expect(confidenceFromEss(10)).toBeGreaterThan(confidenceFromEss(1));
    expect(confidenceFromEss(100)).toBeGreaterThan(confidenceFromEss(10));
  });
});

describe("clampMultiplier (pure helper)", () => {
  it("returns multiplier in-bounds [0.33, 3.0]", () => {
    expect(clampMultiplier(1.5)).toBe(1.5);
    expect(clampMultiplier(0.5)).toBe(0.5);
    expect(clampMultiplier(2.99)).toBe(2.99);
    expect(clampMultiplier(0.34)).toBe(0.34);
  });

  it("returns null for >3.0 (runaway high)", () => {
    expect(clampMultiplier(3.01)).toBeNull();
    expect(clampMultiplier(100)).toBeNull();
  });

  it("returns null for <0.33 (runaway low)", () => {
    expect(clampMultiplier(0.32)).toBeNull();
    expect(clampMultiplier(0.001)).toBeNull();
  });

  it("returns null for non-finite (NaN, +Inf, -Inf)", () => {
    expect(clampMultiplier(Number.NaN)).toBeNull();
    expect(clampMultiplier(Number.POSITIVE_INFINITY)).toBeNull();
    expect(clampMultiplier(Number.NEGATIVE_INFINITY)).toBeNull();
  });
});

describe("foldOutcomeIntoDelta (pure helper)", () => {
  const mk = (estimated: number, actual: number, t = "2026-05-25T20:00:00Z"): ShopOutcomeRecord => ({
    observed_at: t,
    category: "lathe",
    domain: "time",
    estimated,
    actual,
    unit: "min",
  });

  it("first observation: ewma(1.0, 1.2) = 1.03, evidence_count=1, ess=1.0", () => {
    const out = foldOutcomeIntoDelta(undefined, mk(10, 12));
    expect(out?.multiplier).toBeCloseTo(1.03, 5);
    expect(out?.evidence_count).toBe(1);
    expect(out?.ess).toBeCloseTo(1.0, 5);
  });

  it("51 identical observations converge: multiplier→1.3, count=51", () => {
    let delta = foldOutcomeIntoDelta(undefined, mk(10, 13));
    for (let i = 0; i < 50; i++) {
      delta = foldOutcomeIntoDelta(delta!, mk(10, 13));
    }
    expect(delta?.multiplier).toBeCloseTo(1.3, 2);
    expect(delta?.evidence_count).toBe(51);
  });

  it("returns null when estimated=0 (no ratio)", () => {
    expect(foldOutcomeIntoDelta(undefined, mk(0, 5))).toBeNull();
  });

  it("returns null when implied multiplier 4x exceeds MAX 3.0", () => {
    expect(foldOutcomeIntoDelta(undefined, mk(10, 40))).toBeNull();
  });

  it("returns null when implied multiplier 0.2x below MIN 0.33", () => {
    expect(foldOutcomeIntoDelta(undefined, mk(10, 2))).toBeNull();
  });

  it("ess growth follows EWMA decay: 1.0 → 1.85 → 2.5725", () => {
    let delta = foldOutcomeIntoDelta(undefined, mk(10, 12));
    expect(delta?.ess).toBeCloseTo(1.0, 5);
    delta = foldOutcomeIntoDelta(delta!, mk(10, 12));
    expect(delta?.ess).toBeCloseTo(1.85, 5);
    delta = foldOutcomeIntoDelta(delta!, mk(10, 12));
    expect(delta?.ess).toBeCloseTo(2.5725, 4);
  });
});

describe("ShopProfileAdapterEngine.learnFromOutcome", () => {
  let engine: ShopProfileAdapterEngine;
  beforeEach(() => {
    engine = new ShopProfileAdapterEngine();
  });

  const mkTime = (
    estimated: number,
    actual: number,
    s_of_x?: number,
    category: ShopOutcomeRecord["category"] = "lathe",
  ): ShopOutcomeRecord => ({
    observed_at: "2026-05-25T20:00:00Z",
    category,
    domain: "time",
    estimated,
    actual,
    unit: "min",
    s_of_x,
  });

  it("first outcome: lathe.multiplier=1.03, evidence_count=1, last_observed set, no anomalies", () => {
    engine.learnFromOutcome("jm-die", mkTime(10, 12));
    const d = engine.getDeltas("jm-die");
    expect(d?.time_by_category.lathe?.multiplier).toBeCloseTo(1.03, 5);
    expect(d?.time_by_category.lathe?.evidence_count).toBe(1);
    expect(d?.time_by_category.lathe?.last_observed_at).toBe("2026-05-25T20:00:00Z");
    expect(d?.total_outcomes).toBe(1);
    expect(d?.anomalies.length).toBe(0);
  });

  it("S(x)=0.5 routes outcome to anomalies[0], lathe bucket stays empty", () => {
    engine.learnFromOutcome("jm-die", mkTime(10, 12, 0.5));
    const d = engine.getDeltas("jm-die");
    expect(Object.keys(d?.time_by_category ?? {}).length).toBe(0);
    expect(d?.anomalies.length).toBe(1);
    expect(d?.anomalies[0].s_of_x).toBe(0.5);
    expect(d?.anomalies[0].estimated).toBe(10);
    expect(d?.anomalies[0].actual).toBe(12);
    expect(d?.total_outcomes).toBe(1);
  });

  it("S(x)=0.70 (exactly at threshold) folds normally to multiplier 1.03", () => {
    engine.learnFromOutcome("jm-die", mkTime(10, 12, 0.7));
    const d = engine.getDeltas("jm-die");
    expect(d?.time_by_category.lathe?.multiplier).toBeCloseTo(1.03, 5);
    expect(d?.anomalies.length).toBe(0);
  });

  it("out-of-bounds 5x outcome routes to anomalies (no delta created)", () => {
    engine.learnFromOutcome("jm-die", mkTime(10, 50));
    const d = engine.getDeltas("jm-die");
    expect(Object.keys(d?.time_by_category ?? {}).length).toBe(0);
    expect(d?.anomalies.length).toBe(1);
    expect(d?.anomalies[0].actual).toBe(50);
  });

  it("non-finite estimated/actual throws (R12 fail-loud)", () => {
    expect(() => engine.learnFromOutcome("jm-die", mkTime(Number.NaN, 12))).toThrow();
    expect(() => engine.learnFromOutcome("jm-die", mkTime(10, Number.POSITIVE_INFINITY))).toThrow();
  });

  it("category isolation: lathe=1.03 (10→12), wedm=1.075 (20→30)", () => {
    engine.learnFromOutcome("jm-die", mkTime(10, 12, undefined, "lathe"));
    engine.learnFromOutcome("jm-die", mkTime(20, 30, undefined, "wedm"));
    const d = engine.getDeltas("jm-die");
    expect(d?.time_by_category.lathe?.multiplier).toBeCloseTo(1.03, 5);
    expect(d?.time_by_category.wedm?.multiplier).toBeCloseTo(1.075, 5);
  });

  it("two shops keep independent caches: jm-die=1.03 (slow), acme=0.97 (fast)", () => {
    engine.learnFromOutcome("jm-die", mkTime(10, 12));
    engine.learnFromOutcome("acme", mkTime(10, 8));
    expect(engine.getDeltas("jm-die")?.time_by_category.lathe?.multiplier).toBeCloseTo(1.03, 5);
    expect(engine.getDeltas("acme")?.time_by_category.lathe?.multiplier).toBeCloseTo(0.97, 5);
  });
});

describe("ShopProfileAdapterEngine.adapt", () => {
  let engine: ShopProfileAdapterEngine;
  beforeEach(() => {
    engine = new ShopProfileAdapterEngine();
  });

  it("no history → returns baseline 55.0, multiplier 1.0, confidence 0, warning set", () => {
    const r = engine.adapt("unknown-shop", 55.0, { kind: "rate", rate_key: "labor_per_hr", unit: "USD/hr" });
    expect(r.value).toBe(55.0);
    expect(r.multiplier).toBe(1.0);
    expect(r.confidence).toBe(0);
    expect(r.warning).toContain("no outcomes recorded");
  });

  it("evidence_count=2 (below floor) → baseline 100, source flags insufficient_evidence", () => {
    for (let i = 0; i < 2; i++) {
      engine.learnFromOutcome("jm-die", {
        observed_at: "2026-05-25T20:00:00Z",
        category: "lathe",
        domain: "time",
        estimated: 10,
        actual: 12,
        unit: "min",
      });
    }
    const r = engine.adapt("jm-die", 100, { kind: "time", category: "lathe", unit: "min" });
    expect(r.value).toBe(100);
    expect(r.multiplier).toBe(1.0);
    expect(r.source).toBe("shop_profile_adapter:insufficient_evidence");
    expect(r.warning).toContain("evidence_count=2");
    expect(r.warning).toContain("using baseline");
  });

  it("evidence_count=5 (1.3x obs) → multiplier > 1.0, value > 100, named source", () => {
    for (let i = 0; i < 5; i++) {
      engine.learnFromOutcome("jm-die", {
        observed_at: "2026-05-25T20:00:00Z",
        category: "lathe",
        domain: "time",
        estimated: 10,
        actual: 13,
        unit: "min",
      });
    }
    const r = engine.adapt("jm-die", 100, { kind: "time", category: "lathe", unit: "min" });
    expect(typeof r.warning).toBe("undefined");
    expect(r.multiplier).toBeGreaterThan(1.0);
    expect(r.value).toBeGreaterThan(100);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.source).toBe("shop_profile_adapter:time:lathe");
  });

  it("non-finite baseline throws", () => {
    expect(() => engine.adapt("jm-die", Number.NaN, { kind: "time", category: "lathe", unit: "min" })).toThrow();
  });
});

describe("projectAdaptedProfile (pure projection)", () => {
  it("no history → returns baseline (referential identity), labor stays $55/hr", () => {
    const baseline = shopConfigurationEngine.getProfile("jm-die");
    expect(baseline?.rates.labor_per_hr).toBe(55.0); // canonical
    const engine = new ShopProfileAdapterEngine();
    const projected = projectAdaptedProfile(baseline!, "jm-die", engine);
    expect(projected).toBe(baseline);
  });

  it("with 5 rate observations at 1.10x → labor rises 0-10%, baseline NEVER mutated", () => {
    const baseline = shopConfigurationEngine.getProfile("jm-die");
    expect(baseline?.rates.labor_per_hr).toBe(55.0);
    const engine = new ShopProfileAdapterEngine();
    for (let i = 0; i < 5; i++) {
      engine.learnFromOutcome("jm-die", {
        observed_at: "2026-05-25T20:00:00Z",
        category: "lathe",
        domain: "rate",
        estimated: 55,
        actual: 60.5,
        unit: "USD/hr",
      });
    }
    const projected = projectAdaptedProfile(baseline!, "jm-die", engine);
    expect(projected.rates.labor_per_hr).toBeGreaterThan(55.0);
    expect(projected.rates.labor_per_hr).toBeLessThanOrEqual(55.0 * 1.10 + 0.01);
    expect(baseline?.rates.labor_per_hr).toBe(55.0); // baseline preserved
  });
});

describe("ShopProfileAdapterEngine.summarize", () => {
  it("returns null for unknown shop", () => {
    const engine = new ShopProfileAdapterEngine();
    expect(engine.summarize("unknown")).toBeNull();
  });

  it("1 time + 1 quality category → total_outcomes=6, overall_confidence>0", () => {
    const engine = new ShopProfileAdapterEngine();
    for (let i = 0; i < 5; i++) {
      engine.learnFromOutcome("jm-die", {
        observed_at: "2026-05-25T20:00:00Z",
        category: "lathe",
        domain: "time",
        estimated: 10,
        actual: 12,
        unit: "min",
      });
    }
    engine.learnFromOutcome("jm-die", {
      observed_at: "2026-05-25T20:01:00Z",
      category: "wedm",
      domain: "quality",
      estimated: 0.9,
      actual: 0.85,
      unit: "score",
    });
    const s = engine.summarize("jm-die");
    expect(s?.total_outcomes).toBe(6);
    expect(s?.time_categories_calibrated).toBe(1);
    expect(s?.quality_categories_calibrated).toBe(1);
    expect(s?.overall_confidence).toBeGreaterThan(0);
    expect(s?.last_calibrated_at).toBe("2026-05-25T20:01:00Z");
  });

  it("S(x)=0.5 sole outcome → anomaly_count=1, time_categories_calibrated=0", () => {
    const engine = new ShopProfileAdapterEngine();
    engine.learnFromOutcome("jm-die", {
      observed_at: "2026-05-25T20:00:00Z",
      category: "lathe",
      domain: "time",
      estimated: 10,
      actual: 12,
      unit: "min",
      s_of_x: 0.5,
    });
    const s = engine.summarize("jm-die");
    expect(s?.anomaly_count).toBe(1);
    expect(s?.time_categories_calibrated).toBe(0);
    expect(s?.total_outcomes).toBe(1);
  });
});

describe("ShopProfileAdapterEngine: JM Die baseline integration", () => {
  it("JM Die profile loads with canonical $55/hr labor + 'jm-die' id", () => {
    const profile = shopConfigurationEngine.getProfile("jm-die");
    expect(profile?.rates.labor_per_hr).toBe(55.0);
    expect(profile?.id).toBe("jm-die");
  });

  it("fresh adapter: getDeltas + summarize both null for JM Die", () => {
    const engine = new ShopProfileAdapterEngine();
    expect(engine.getDeltas("jm-die")).toBeNull();
    expect(engine.summarize("jm-die")).toBeNull();
  });

  it("hydrate restores: multiplier=1.1, evidence_count=10, total_outcomes=10", () => {
    const engine = new ShopProfileAdapterEngine();
    engine.hydrate("jm-die", {
      rates: { labor_per_hr: { multiplier: 1.1, confidence: 0.6, evidence_count: 10, last_observed_at: "2026-05-25T20:00:00Z", ess: 6 } },
      time_by_category: {},
      quality_by_category: {},
      anomalies: [],
      last_calibrated_at: "2026-05-25T20:00:00Z",
      total_outcomes: 10,
    });
    const d = engine.getDeltas("jm-die");
    expect(d?.rates.labor_per_hr?.multiplier).toBe(1.1);
    expect(d?.rates.labor_per_hr?.evidence_count).toBe(10);
    expect(d?.total_outcomes).toBe(10);
  });

  it("reset clears jm-die only: acme survives with multiplier=0.97", () => {
    const engine = new ShopProfileAdapterEngine();
    engine.learnFromOutcome("jm-die", {
      observed_at: "2026-05-25T20:00:00Z",
      category: "lathe",
      domain: "time",
      estimated: 10,
      actual: 12,
      unit: "min",
    });
    engine.learnFromOutcome("acme", {
      observed_at: "2026-05-25T20:00:00Z",
      category: "lathe",
      domain: "time",
      estimated: 10,
      actual: 8,
      unit: "min",
    });
    engine.reset("jm-die");
    expect(engine.getDeltas("jm-die")).toBeNull();
    expect(engine.getDeltas("acme")?.time_by_category.lathe?.multiplier).toBeCloseTo(0.97, 5);
  });
});
