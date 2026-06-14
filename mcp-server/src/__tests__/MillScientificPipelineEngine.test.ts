/**
 * MillScientificPipelineEngine tests — restoration coverage (U-STUB-HUNT-06).
 *
 * Slot:bravo 2026-05-27. Real concrete-value assertions only.
 */
import { describe, it, expect } from "vitest";
import { MillScientificPipelineEngine, millScientificPipelineEngine } from "../engines/MillScientificPipelineEngine.js";
import type { ToolGeometry } from "../engines/MillingForceEngine.js";

const STEEL_TOOL: ToolGeometry = { diameter_mm: 16, flutes: 4, substrate: "carbide", flute_length_mm: 30 };

describe("MillScientificPipelineEngine.analyze", () => {
  it("composes force + power + chatter + MRR into one report", () => {
    const r = millScientificPipelineEngine.analyze({
      iso_group: "P",
      tool: STEEL_TOOL,
      parameters: { rpm: 3000, feed_per_tooth: 0.1, doc_mm: 5, woc_mm: 8 },
      overhang_mm: 50,
      machine: { max_power_kw: 50 },
    });
    expect(r.force.cutting_force_n).toBeGreaterThan(0);
    expect(r.power.required_power_kw).toBeGreaterThan(0);
    expect(r.chatter.stability_lobes.length).toBe(6);
    // MRR = feed_mmpm * ap * ae / 1000. feed_mmpm = 3000*4*0.1 = 1200. MRR = 1200*5*8/1000 = 48
    expect(r.mrr_cm3_per_min).toBeCloseTo(48, 2);
  });

  it("throws on missing tool/parameters", () => {
    expect(() => millScientificPipelineEngine.analyze({ iso_group: "P" } as never)).toThrow(/tool/);
    expect(() => millScientificPipelineEngine.analyze({ iso_group: "P", tool: STEEL_TOOL } as never)).toThrow(/parameters/);
  });
});

describe("MillScientificPipelineEngine.optimize", () => {
  it("returns highest-MRR rpm+fz pair within power envelope", () => {
    const r = millScientificPipelineEngine.optimize({
      iso_group: "P",
      tool: STEEL_TOOL,
      parameters: { doc_mm: 2, woc_mm: 4 },
      machine: { max_power_kw: 50 },
      rpmRange: [1500, 4500],
      fzRange: [0.05, 0.2],
    });
    expect(r.evaluated).toBeGreaterThan(0);
    expect(r.feasible).toBeGreaterThan(0);
    expect(r.best.mrr_cm3_per_min).toBeGreaterThan(0);
    expect(r.best.rpm).toBeGreaterThanOrEqual(1500);
    expect(r.best.rpm).toBeLessThanOrEqual(4500);
    expect(r.best.power_kw).toBeLessThanOrEqual(50);
  });

  it("returns reason when no feasible point", () => {
    const r = millScientificPipelineEngine.optimize({
      iso_group: "S",
      tool: STEEL_TOOL,
      parameters: { doc_mm: 10, woc_mm: 16 },
      machine: { max_power_kw: 0.1 },   // impossibly tight envelope
      rpmRange: [3000, 6000],
      fzRange: [0.1, 0.3],
    });
    expect(r.feasible).toBe(0);
    expect(r.reason).toMatch(/no feasible/);
  });

  it("throws on invalid range", () => {
    expect(() =>
      millScientificPipelineEngine.optimize({
        iso_group: "P",
        tool: STEEL_TOOL,
        parameters: { doc_mm: 1 },
        machine: { max_power_kw: 10 },
        rpmRange: [3000, 3000],
        fzRange: [0.1, 0.2],
      })
    ).toThrow(/range/);
  });
});

describe("MillScientificPipelineEngine.quantifyUncertainty", () => {
  it("returns distribution stats with sigma > 0 under perturbation", () => {
    const r = millScientificPipelineEngine.quantifyUncertainty({
      iso_group: "P",
      tool: STEEL_TOOL,
      parameters: { rpm: 3000, feed_per_tooth: 0.1, doc_mm: 5, woc_mm: 8 },
      trials: 100,
      kcUncertaintyPct: 0.15,
      fzUncertaintyPct: 0.10,
    });
    expect(r.trials).toBeGreaterThan(0);
    expect(r.force_n.mean).toBeGreaterThan(0);
    expect(r.force_n.sigma).toBeGreaterThan(0);
    expect(r.force_n.p05).toBeLessThanOrEqual(r.force_n.mean);
    expect(r.force_n.p95).toBeGreaterThanOrEqual(r.force_n.mean);
    expect(r.force_n.min).toBeLessThanOrEqual(r.force_n.p05);
    expect(r.force_n.max).toBeGreaterThanOrEqual(r.force_n.p95);
  });

  it("zero uncertainty → sigma == 0", () => {
    const r = millScientificPipelineEngine.quantifyUncertainty({
      iso_group: "P",
      tool: STEEL_TOOL,
      parameters: { rpm: 3000, feed_per_tooth: 0.1, doc_mm: 5, woc_mm: 8 },
      trials: 50,
      kcUncertaintyPct: 0,
      fzUncertaintyPct: 0,
    });
    expect(r.force_n.sigma).toBeCloseTo(0, 5);
  });
});

describe("class identity", () => {
  it("fresh instance produces same analyze() shape as singleton", () => {
    const eng = new MillScientificPipelineEngine();
    const a = eng.analyze({
      iso_group: "P",
      tool: STEEL_TOOL,
      parameters: { rpm: 3000, feed_per_tooth: 0.1, doc_mm: 5, woc_mm: 8 },
      overhang_mm: 50,
    });
    const b = millScientificPipelineEngine.analyze({
      iso_group: "P",
      tool: STEEL_TOOL,
      parameters: { rpm: 3000, feed_per_tooth: 0.1, doc_mm: 5, woc_mm: 8 },
      overhang_mm: 50,
    });
    expect(a.force.cutting_force_n).toBeCloseTo(b.force.cutting_force_n, 6);
    expect(a.mrr_cm3_per_min).toBe(b.mrr_cm3_per_min);
  });
});
