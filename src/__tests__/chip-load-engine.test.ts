/**
 * ChipLoadEngine — Unit Tests
 * @milestone FORGE-ENGINES-B18
 */
import { describe, it, expect } from "vitest";
import { chipLoadEngine } from "../engines/ChipLoadEngine.js";

describe("ChipLoadEngine", () => {
  it("recommends chip load for steel/carbide", () => {
    const r = chipLoadEngine.calculate({
      tool_diameter_mm: 10,
      flutes: 4,
      material_type: "steel",
    });
    expect(r.recommended_fz.value).toBeGreaterThan(0);
    expect(r.table_feed.value).toBeGreaterThan(0);
  });

  it("applies chip thinning for ae < 50%", () => {
    const r = chipLoadEngine.calculate({
      tool_diameter_mm: 10,
      flutes: 4,
      radial_engagement_mm: 2, // 20%
    });
    expect(r.chip_thinning_factor.value).toBeGreaterThan(1);
    expect(r.programmed_fz.value).toBeGreaterThan(
      r.recommended_fz.value
    );
  });

  it("no chip thinning for slotting (ae = 100%)", () => {
    const r = chipLoadEngine.calculate({
      tool_diameter_mm: 10,
      flutes: 3,
      operation: "slotting",
    });
    expect(r.chip_thinning_factor.value).toBe(1);
    expect(r.engagement_angle.value).toBe(180);
  });

  it("finishing uses lower chip load", () => {
    const rough = chipLoadEngine.calculate({
      tool_diameter_mm: 10,
      flutes: 4,
      operation: "roughing",
    });
    const finish = chipLoadEngine.calculate({
      tool_diameter_mm: 10,
      flutes: 4,
      operation: "finishing",
    });
    expect(finish.recommended_fz.value).toBeLessThan(
      rough.recommended_fz.value
    );
  });

  it("trochoidal uses higher chip load", () => {
    const side = chipLoadEngine.calculate({
      tool_diameter_mm: 10,
      flutes: 4,
      operation: "side_milling",
    });
    const troch = chipLoadEngine.calculate({
      tool_diameter_mm: 10,
      flutes: 4,
      operation: "trochoidal",
    });
    expect(troch.recommended_fz.value).toBeGreaterThan(
      side.recommended_fz.value
    );
  });

  it("larger tool gets higher chip load", () => {
    const small = chipLoadEngine.calculate({
      tool_diameter_mm: 6,
      flutes: 4,
    });
    const large = chipLoadEngine.calculate({
      tool_diameter_mm: 20,
      flutes: 4,
    });
    expect(large.recommended_fz.value).toBeGreaterThan(
      small.recommended_fz.value
    );
  });

  it("warns slotting with many flutes", () => {
    const r = chipLoadEngine.calculate({
      tool_diameter_mm: 10,
      flutes: 5,
      operation: "slotting",
    });
    expect(
      r.warnings.some(w => w.includes("chip space"))
    ).toBe(true);
  });

  it("warns high chip thinning factor", () => {
    const r = chipLoadEngine.calculate({
      tool_diameter_mm: 10,
      flutes: 4,
      radial_engagement_mm: 0.5, // 5%
    });
    expect(r.chip_thinning_factor.value).toBeGreaterThan(2);
    expect(
      r.warnings.some(w => w.includes("thinning"))
    ).toBe(true);
  });

  it("min chip load = 30% of recommended", () => {
    const r = chipLoadEngine.calculate({
      tool_diameter_mm: 10,
      flutes: 4,
    });
    expect(r.min_chip_load.value).toBeCloseTo(
      r.recommended_fz.value * 0.3, 3
    );
  });

  it("radial engagement percent correct", () => {
    const r = chipLoadEngine.calculate({
      tool_diameter_mm: 10,
      flutes: 4,
      radial_engagement_mm: 3,
    });
    expect(r.radial_engagement_percent.value).toBe(30);
  });
});
