/**
 * TurningPrintIntakeEngine Test Suite (LATHE-PRO-MS-1)
 *
 * Drives convertBlueprint() through mock BlueprintAnalysis inputs.
 */
import { describe, it, expect } from "vitest";
import { turningPrintIntakeEngine } from "../engines/TurningPrintIntakeEngine.js";
import type { BlueprintAnalysis } from "../engines/BlueprintOCREngine.js";

function makeBlueprint(overrides: Partial<BlueprintAnalysis> = {}): BlueprintAnalysis {
  return {
    dimensions: overrides.dimensions ?? [
      {
        id: "d1",
        type: "diameter",
        nominal: 25,
        unit: "mm",
        raw_text: "Ø25",
        confidence: 0.95,
      },
      {
        id: "d2",
        type: "length",
        nominal: 60,
        unit: "mm",
        raw_text: "60",
        confidence: 0.9,
      },
    ],
    gdt_frames: overrides.gdt_frames ?? [],
    title_block: overrides.title_block ?? {
      part_number: "TEST-001",
      material: "4140",
      units: "mm",
      confidence: 0.9,
    },
    notes: overrides.notes ?? [],
    summary: overrides.summary ?? {
      total_dimensions: 2,
      total_gdt: 0,
      total_notes: 0,
      tightest_tolerance_mm: 0.1,
      critical_features: [],
      material: "4140",
      has_gdt: false,
    },
  };
}

describe("TurningPrintIntakeEngine", () => {
  describe("convertBlueprint()", () => {
    it("produces a TurningIntakeResult with success flag", async () => {
      const r = await turningPrintIntakeEngine.convertBlueprint({
        blueprint: makeBlueprint(),
      });
      expect(typeof r.success).toBe("boolean");
      expect(r.turning_input).toBeDefined();
      expect(Array.isArray(r.features)).toBe(true);
    });

    it("extracts part_number from title block", async () => {
      const r = await turningPrintIntakeEngine.convertBlueprint({
        blueprint: makeBlueprint({
          title_block: {
            part_number: "PART-XYZ",
            material: "4140",
            units: "mm",
            confidence: 0.9,
          },
        }),
      });
      expect(r.turning_input.part_number).toBe("PART-XYZ");
    });

    it("parses material from title block", async () => {
      const r = await turningPrintIntakeEngine.convertBlueprint({
        blueprint: makeBlueprint({
          title_block: {
            material: "Ti-6Al-4V",
            units: "mm",
            confidence: 0.9,
          },
        }),
      });
      expect(r.material.material_name.toLowerCase()).toContain("ti");
    });

    it("reports stats: total_dimensions + mapped_features", async () => {
      const r = await turningPrintIntakeEngine.convertBlueprint({
        blueprint: makeBlueprint(),
      });
      expect(r.stats.total_dimensions).toBeGreaterThanOrEqual(0);
      expect(r.stats.mapped_features).toBeGreaterThanOrEqual(0);
    });

    it("flags ambiguities when material missing", async () => {
      const r = await turningPrintIntakeEngine.convertBlueprint({
        blueprint: makeBlueprint({
          title_block: {
            units: "mm",
            confidence: 0.9,
          },
          summary: {
            total_dimensions: 2,
            total_gdt: 0,
            total_notes: 0,
            tightest_tolerance_mm: 0.1,
            critical_features: [],
            material: "",
            has_gdt: false,
          },
        }),
      });
      // Should surface some ambiguity or warning about missing material
      const hasMaterialIssue =
        r.ambiguities.some((a) => a.type === "missing_material") ||
        r.warnings.some((w) => /material/i.test(w.message));
      expect(hasMaterialIssue).toBe(true);
    });

    it("applies machine constraints to turning_input", async () => {
      const r = await turningPrintIntakeEngine.convertBlueprint({
        blueprint: makeBlueprint(),
        machine: {
          max_spindle_rpm: 5000,
          max_power_kW: 15,
          brand: "Okuma",
          controller: "okuma",
        },
      });
      expect(r.turning_input.max_spindle_rpm).toBe(5000);
      expect(r.turning_input.controller).toBe("okuma");
    });

    it("applies optimization_target", async () => {
      const r = await turningPrintIntakeEngine.convertBlueprint({
        blueprint: makeBlueprint(),
        optimization_target: "max_speed",
      });
      expect(r.turning_input.optimization_target).toBe("max_speed");
    });

    it("applies bar_stock_od override", async () => {
      const r = await turningPrintIntakeEngine.convertBlueprint({
        blueprint: makeBlueprint(),
        bar_stock_od_mm: 75,
      });
      expect(r.turning_input.bar_stock_od_mm).toBe(75);
    });

    it("confidence_avg is in [0,1]", async () => {
      const r = await turningPrintIntakeEngine.convertBlueprint({
        blueprint: makeBlueprint(),
      });
      expect(r.stats.confidence_avg).toBeGreaterThanOrEqual(0);
      expect(r.stats.confidence_avg).toBeLessThanOrEqual(1);
    });

    it("handles blueprint with no features gracefully", async () => {
      const r = await turningPrintIntakeEngine.convertBlueprint({
        blueprint: makeBlueprint({
          dimensions: [],
          summary: {
            total_dimensions: 0,
            total_gdt: 0,
            total_notes: 0,
            tightest_tolerance_mm: 0.1,
            critical_features: [],
            material: "4140",
            has_gdt: false,
          },
        }),
      });
      expect(r).toBeDefined();
      expect(r.features.length).toBe(0);
    });
  });
});
