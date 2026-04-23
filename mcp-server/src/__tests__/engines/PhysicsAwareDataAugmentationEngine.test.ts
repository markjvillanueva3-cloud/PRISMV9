/**
 * PhysicsAwareDataAugmentationEngine tests (U-LPR-DATA-AUG)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  PhysicsAwareDataAugmentationEngine,
  type SourceSample,
} from "../../engines/PhysicsAwareDataAugmentationEngine.js";

let eng: PhysicsAwareDataAugmentationEngine;

function source(overrides: Partial<SourceSample> = {}): SourceSample {
  return {
    program_id: "P0",
    material_iso_group: "P",
    material_canonical: "4140",
    outer_diameter_mm: 40,
    length_mm: 120,
    spindle_rpm: 1800,
    feed_mm_per_rev: 0.25,
    ap_mm: 2.0,
    vc_m_per_min: 226,
    kc_mpa: 2060,
    tool_edge_radius_mm: 0.4,
    workholding_grip_force_n: 5000,
    cutting_thrust_n: 2200,
    surface_speed_max_m_per_min: 280,
    ...overrides,
  };
}

beforeEach(() => {
  eng = new PhysicsAwareDataAugmentationEngine(1337);
});

// ──────────────────────────────────────────────────────────────────────
// Positive augmentation
// ──────────────────────────────────────────────────────────────────────

describe("augmentOne / positive", () => {
  it("material_substitute swaps 4140 → 4340 with updated kc", () => {
    const r = eng.augmentOne(source(), "material_substitute");
    expect(r.material_canonical).toBe("4340");
    expect(r.kc_mpa).toBe(2170);
    expect(r.label).toBe("good");
    expect(r.augmentation).toBe("material_substitute");
  });

  it("material_substitute errors for material with no pair", () => {
    expect(() =>
      eng.augmentOne(source({ material_canonical: "INCONEL" }), "material_substitute"),
    ).toThrow(/no substitute/);
  });

  it("scale_geometry preserves Vc by rescaling rpm", () => {
    const r = eng.augmentOne(source(), "scale_geometry");
    // Vc ≈ π·D·n/1000 ≈ source.vc after rescaling
    const newVc = (Math.PI * r.outer_diameter_mm * r.spindle_rpm) / 1000;
    expect(Math.abs(newVc - source().vc_m_per_min)).toBeLessThan(5); // ±5 m/min from rounding
  });

  it("feed_perturb stays within ±10 %", () => {
    for (let i = 0; i < 20; i++) {
      const r = eng.augmentOne(source(), "feed_perturb");
      const ratio = r.feed_mm_per_rev / source().feed_mm_per_rev;
      expect(ratio).toBeGreaterThan(0.9);
      expect(ratio).toBeLessThan(1.1);
    }
  });

  it("doc_perturb clamps to d/8 stability floor", () => {
    // Source with tiny ap that ±15% perturb could push negative
    const s = source({ ap_mm: 0.1 });
    for (let i = 0; i < 20; i++) {
      const r = eng.augmentOne(s, "doc_perturb");
      expect(r.ap_mm).toBeGreaterThanOrEqual(s.outer_diameter_mm / 8 - 1e-6);
    }
  });

  it("origin_program_id links back to source", () => {
    const r = eng.augmentOne(source({ program_id: "JM-001" }), "feed_perturb");
    expect(r.origin_program_id).toBe("JM-001");
    expect(r.program_id).not.toBe("JM-001"); // unique id
  });

  it("validates input source", () => {
    expect(() =>
      eng.augmentOne(source({ ap_mm: -1 }), "feed_perturb"),
    ).toThrow(/ap_mm/);
    expect(() =>
      eng.augmentOne(source({ program_id: "" }), "feed_perturb"),
    ).toThrow(/program_id/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// augmentCorpus → 3× minimum (4× when substitute available)
// ──────────────────────────────────────────────────────────────────────

describe("augmentCorpus", () => {
  it("produces 3× with no substitute, 4× with substitute", () => {
    const withSub = eng.augmentCorpus([source({ material_canonical: "4140" })]);
    const noSub = eng.augmentCorpus([source({ material_canonical: "INCONEL" })]);
    expect(withSub.length).toBe(4);
    expect(noSub.length).toBe(3);
  });

  it("empty input → empty output", () => {
    expect(eng.augmentCorpus([])).toEqual([]);
  });

  it("all outputs labeled 'good'", () => {
    const out = eng.augmentCorpus([source()]);
    for (const s of out) {
      expect(s.label).toBe("good");
    }
  });
});

// ──────────────────────────────────────────────────────────────────────
// Synthetic failures
// ──────────────────────────────────────────────────────────────────────

describe("injectFailure", () => {
  it("chatter: doubles feed + halves rpm", () => {
    const s = source();
    const f = eng.injectFailure(s, "chatter_lobe_violation");
    expect(f.feed_mm_per_rev).toBeCloseTo(s.feed_mm_per_rev * 2, 3);
    expect(f.spindle_rpm).toBe(Math.round(s.spindle_rpm * 0.5));
    expect(f.label).toBe("bad");
  });

  it("taylor: Vc > material ceiling", () => {
    const s = source();
    const f = eng.injectFailure(s, "taylor_life_violation");
    expect(f.vc_m_per_min).toBeGreaterThan(s.surface_speed_max_m_per_min);
    expect(f.reason).toMatch(/tool life/i);
  });

  it("doc_over_edge: ap > 8·edge_radius", () => {
    const s = source();
    const f = eng.injectFailure(s, "doc_over_edge");
    expect(f.ap_mm).toBeGreaterThan(s.tool_edge_radius_mm * 8);
  });

  it("thermal_runaway: Vc > 1.5×max", () => {
    const s = source();
    const f = eng.injectFailure(s, "thermal_runaway");
    expect(f.vc_m_per_min).toBeGreaterThan(s.surface_speed_max_m_per_min * 1.4);
  });

  it("workholding_pullout: reason mentions safety factor", () => {
    const s = source();
    const f = eng.injectFailure(s, "workholding_pullout");
    expect(f.reason).toMatch(/safety factor|pullout/i);
  });

  it("each failure has unique synthetic_id per mode", () => {
    const s = source();
    const ids = new Set<string>();
    for (const m of [
      "chatter_lobe_violation",
      "taylor_life_violation",
      "doc_over_edge",
      "thermal_runaway",
      "workholding_pullout",
    ] as const) {
      ids.add(eng.injectFailure(s, m).synthetic_id);
    }
    expect(ids.size).toBe(5);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Mixed corpus building
// ──────────────────────────────────────────────────────────────────────

describe("buildMixedCorpus", () => {
  it("negative_ratio lands in [0.15, 0.20] range", () => {
    const sources = Array.from({ length: 10 }, (_, i) =>
      source({ program_id: `P${i}` }),
    );
    const mix = eng.buildMixedCorpus(sources, 0.17);
    // Round-off from integer negative count may pull slightly off
    expect(mix.report.negative_ratio).toBeGreaterThan(0.14);
    expect(mix.report.negative_ratio).toBeLessThan(0.21);
  });

  it("rejects out-of-spec negative_ratio", () => {
    expect(() => eng.buildMixedCorpus([source()], 0.10)).toThrow(/negative_ratio/);
    expect(() => eng.buildMixedCorpus([source()], 0.30)).toThrow(/negative_ratio/);
  });

  it("report strategy/failure counts sum to total", () => {
    const sources = [source(), source({ program_id: "P1" })];
    const mix = eng.buildMixedCorpus(sources, 0.17);
    const strategySum = Object.values(mix.report.strategies_used).reduce((a, b) => a + b, 0);
    expect(strategySum).toBe(mix.report.positive_count);
    const failSum = Object.values(mix.report.failures_injected).reduce((a, b) => a + b, 0);
    expect(failSum).toBe(mix.report.negative_count);
  });

  it("positive_multiplier ≥ 3 for 4140 source (has substitute)", () => {
    const mix = eng.buildMixedCorpus([source({ material_canonical: "4140" })]);
    expect(mix.report.positive_multiplier).toBeGreaterThanOrEqual(3);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Determinism
// ──────────────────────────────────────────────────────────────────────

describe("reseed determinism", () => {
  it("same seed → identical output", () => {
    eng.reseed(42);
    const out1 = eng.augmentCorpus([source()]);
    eng.reseed(42);
    const out2 = eng.augmentCorpus([source()]);
    expect(out1).toEqual(out2);
  });

  it("different seeds → different output", () => {
    eng.reseed(42);
    const out1 = eng.augmentCorpus([source()]);
    eng.reseed(100);
    const out2 = eng.augmentCorpus([source()]);
    expect(out1).not.toEqual(out2);
  });

  it("reseed rejects non-integer / negative", () => {
    expect(() => eng.reseed(-1)).toThrow(/seed/);
    expect(() => eng.reseed(1.5)).toThrow(/seed/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// DPO pair building
// ──────────────────────────────────────────────────────────────────────

describe("buildDPOPairs", () => {
  it("matches negatives to same-material positives", () => {
    const src = source({ material_canonical: "4140", program_id: "P0" });
    const pos = eng.augmentCorpus([src]);
    const neg = [eng.injectFailure(src, "chatter_lobe_violation")];
    const pairs = eng.buildDPOPairs(pos, neg);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].shared_context.material_canonical).toBe("4140");
  });

  it("no pair when material mismatch", () => {
    const pos = eng.augmentCorpus([source({ material_canonical: "4140" })]);
    const neg = [
      eng.injectFailure(
        source({ material_canonical: "INCONEL" }),
        "chatter_lobe_violation",
      ),
    ];
    const pairs = eng.buildDPOPairs(pos, neg);
    expect(pairs).toHaveLength(0);
  });

  it("empty inputs → empty output", () => {
    expect(eng.buildDPOPairs([], [])).toEqual([]);
  });
});
