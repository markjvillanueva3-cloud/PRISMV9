/**
 * Tests for DeburringEngine
 */
import { describe, it, expect } from "vitest";
import { DeburringEngine } from "../engines/DeburringEngine.js";

describe("DeburringEngine", () => {
  const engine = new DeburringEngine();

  // ── Method Recommendation ───────────────────────────────────

  it("recommends manual for single part", () => {
    const r = engine.recommend({
      batch_size: 1,
      material_iso_group: "P",
    });
    expect(r.recommended_method).toBe("manual");
    expect(r.cycle_time.value).toBeGreaterThan(0);
    expect(r.cost_per_part.value).toBeGreaterThan(0);
  });

  it("recommends vibratory for volume external", () => {
    const r = engine.recommend({
      batch_size: 100,
      burr_locations: ["external_edge"],
      material_iso_group: "P",
    });
    expect(r.recommended_method).toBe("vibratory");
  });

  it("recommends thermal for cross-holes", () => {
    const r = engine.recommend({
      batch_size: 50,
      burr_locations: ["cross_hole"],
    });
    expect(r.recommended_method).toBe("thermal");
  });

  it("recommends ECM for internal edges", () => {
    const r = engine.recommend({
      batch_size: 20,
      burr_locations: ["internal_edge"],
      has_internal_features: true,
    });
    // thermal or electrochemical for internal
    expect(
      ["thermal", "electrochemical"].includes(
        r.recommended_method
      )
    ).toBe(true);
  });

  it("provides alternative methods", () => {
    const r = engine.recommend({
      batch_size: 50,
      burr_locations: ["external_edge"],
    });
    expect(r.alternative_methods.length).toBeGreaterThan(0);
    expect(r.alternative_methods[0]).toHaveProperty("method");
    expect(r.alternative_methods[0]).toHaveProperty("suitability");
    expect(r.alternative_methods[0]).toHaveProperty("reason");
  });

  it("warns on large burr height", () => {
    const r = engine.recommend({
      burr_height_mm: 2.0,
    });
    expect(
      r.warnings.some(w => w.includes("Burr height"))
    ).toBe(true);
  });

  it("adjusts time for material difficulty", () => {
    const easy = engine.recommend({
      material_iso_group: "N",
      batch_size: 1,
    });
    const hard = engine.recommend({
      material_iso_group: "S",
      batch_size: 1,
    });
    expect(hard.cycle_time.value).toBeGreaterThan(
      easy.cycle_time.value
    );
  });

  it("adjusts time for part size", () => {
    const small = engine.recommend({
      part_size_mm: [20, 20, 10],
      batch_size: 1,
    });
    const large = engine.recommend({
      part_size_mm: [200, 200, 100],
      batch_size: 1,
    });
    expect(large.cycle_time.value).toBeGreaterThan(
      small.cycle_time.value
    );
  });

  // ── Mass Finishing ──────────────────────────────────────────

  it("calculates deburr-only mass finish", () => {
    const r = engine.massFinish({
      deburr_only: true,
    });
    expect(r.media_type).toBe("ceramic triangles");
    expect(r.machine_type).toBe("vibratory bowl");
    expect(r.cycle_time.value).toBeGreaterThan(0);
    expect(r.media_to_part_ratio.value).toBeGreaterThan(0);
  });

  it("selects porcelain for fine finish", () => {
    const r = engine.massFinish({
      target_ra_um: 0.3,
    });
    expect(r.media_type).toBe("porcelain balls");
    expect(r.machine_type).toContain("centrifugal");
  });

  it("selects plastic for moderate finish", () => {
    const r = engine.massFinish({
      target_ra_um: 0.6,
    });
    expect(r.media_type).toBe("plastic cones");
  });

  it("warns on very fine target", () => {
    const r = engine.massFinish({
      target_ra_um: 0.1,
    });
    expect(
      r.warnings.some(w => w.includes("Ra < 0.2"))
    ).toBe(true);
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.recommend({});
    for (const key of [
      "cycle_time", "edge_break", "cost_per_part",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { deburringEngine } = await import(
      "../engines/DeburringEngine.js"
    );
    expect(deburringEngine).toBeInstanceOf(DeburringEngine);
  });
});
