/**
 * ToolSelectionRecommenderEngine tests — restoration coverage (U-STUB-HUNT-07).
 *
 * Slot:bravo 2026-05-27. Real concrete-value assertions only.
 */
import { describe, it, expect } from "vitest";
import { ToolSelectionRecommenderEngine, toolSelectionRecommenderEngine } from "../engines/ToolSelectionRecommenderEngine.js";
import type { ToolGeometry } from "../engines/MillingForceEngine.js";

describe("ToolSelectionRecommenderEngine.recommend", () => {
  it("ISO N (aluminum) → uncoated polished carbide", () => {
    const r = toolSelectionRecommenderEngine.recommend({ iso_group: "N", diameter_mm: 12 });
    expect(r.iso_group).toBe("N");
    expect(r.substrate).toBe("carbide");
    expect(r.coating).toBe("uncoated_polished");
    expect(r.flutes).toBeGreaterThanOrEqual(2);
    expect(r.helix_deg).toBe(45);
  });

  it("ISO P (steel) rough on Ø16 → adds flute (5 instead of base 4)", () => {
    const r = toolSelectionRecommenderEngine.recommend({ iso_group: "P", diameter_mm: 16, operation: "rough" });
    expect(r.flutes).toBe(5);
    expect(r.coating).toBe("TiAlN");
  });

  it("ISO N finish drops a flute (2 instead of base 3)", () => {
    const r = toolSelectionRecommenderEngine.recommend({ iso_group: "N", diameter_mm: 10, operation: "finish" });
    expect(r.flutes).toBe(2);
  });

  it("resolves iso from material keyword (inconel → S)", () => {
    const r = toolSelectionRecommenderEngine.recommend({ material: "Inconel 718", diameter_mm: 8 });
    expect(r.iso_group).toBe("S");
    expect(r.coating).toBe("AlTiN");
  });

  it("throws on missing iso_group + material", () => {
    expect(() => toolSelectionRecommenderEngine.recommend({ diameter_mm: 10 } as never)).toThrow(/iso_group or material/);
  });

  it("throws on invalid diameter", () => {
    expect(() => toolSelectionRecommenderEngine.recommend({ iso_group: "P", diameter_mm: 0 })).toThrow(/diameter_mm/);
  });
});

describe("ToolSelectionRecommenderEngine.assemblyCheck", () => {
  const TOOL: ToolGeometry = { diameter_mm: 10, flutes: 4, substrate: "carbide" };

  it("L:D = 2 → rigid", () => {
    const r = toolSelectionRecommenderEngine.assemblyCheck({ tool: TOOL, overhang_mm: 20 });
    expect(r.L_over_D).toBe(2);
    expect(r.category).toBe("rigid");
    expect(r.deflection.pass).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("L:D = 6 → long-reach + warning", () => {
    const r = toolSelectionRecommenderEngine.assemblyCheck({ tool: TOOL, overhang_mm: 60 });
    expect(r.L_over_D).toBe(6);
    expect(r.category).toBe("long-reach");
    expect(r.warnings.some((w) => /chatter/i.test(w))).toBe(true);
  });

  it("L:D = 10 → extreme + pass=false", () => {
    const r = toolSelectionRecommenderEngine.assemblyCheck({ tool: TOOL, overhang_mm: 100 });
    expect(r.L_over_D).toBe(10);
    expect(r.category).toBe("extreme");
    expect(r.pass).toBe(false);
  });

  it("throws on invalid overhang", () => {
    expect(() => toolSelectionRecommenderEngine.assemblyCheck({ tool: TOOL, overhang_mm: 0 })).toThrow(/overhang_mm/);
  });
});

describe("ToolSelectionRecommenderEngine.matchHolder", () => {
  const TOOL: ToolGeometry = { diameter_mm: 10, flutes: 4, substrate: "carbide" };

  it("picks smallest-capable holder when multiple fit", () => {
    const r = toolSelectionRecommenderEngine.matchHolder({
      tool: { ...TOOL, weight_kg: 0.3 },
      rpm: 12000,
    });
    expect(r.best).not.toBeNull();
    expect(r.best?.fits).toBe(true);
    // 0.3 kg + 12000 rpm fits ER16 (max 18000 rpm + 0.5 kg)
    expect(r.best?.holder).toBe("ER16");
  });

  it("filters out holders where RPM exceeds max", () => {
    const r = toolSelectionRecommenderEngine.matchHolder({
      tool: { ...TOOL, weight_kg: 0.2 },
      rpm: 25000,
    });
    // Only HSK-A40 fits 25000 rpm
    const er16 = r.candidates.find((c) => c.holder === "ER16");
    expect(er16?.fits).toBe(false);
    expect(r.best?.holder).toBe("HSK-A40");
  });

  it("filters out holders where weight exceeds max", () => {
    const r = toolSelectionRecommenderEngine.matchHolder({
      tool: { ...TOOL, weight_kg: 5.0 },
      rpm: 8000,
    });
    expect(r.best?.holder).toBe("HSK-A100");   // only one with maxToolWeightKg >= 5
  });

  it("explicit unknown holder returns reason", () => {
    const r = toolSelectionRecommenderEngine.matchHolder({
      tool: { ...TOOL, weight_kg: 0.3 },
      rpm: 8000,
      holder: "BT40",
    });
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].reason).toBe("unknown holder");
  });

  it("throws on invalid rpm", () => {
    expect(() => toolSelectionRecommenderEngine.matchHolder({ tool: TOOL, rpm: 0 })).toThrow(/rpm/);
  });
});

describe("class identity", () => {
  it("fresh instance matches singleton recommend()", () => {
    const eng = new ToolSelectionRecommenderEngine();
    const a = eng.recommend({ iso_group: "P", diameter_mm: 12, operation: "semi" });
    const b = toolSelectionRecommenderEngine.recommend({ iso_group: "P", diameter_mm: 12, operation: "semi" });
    expect(a).toEqual(b);
  });
});
