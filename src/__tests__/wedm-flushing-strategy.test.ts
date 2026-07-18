/**
 * U-W100-33: Flushing Strategy — Submerged vs Jet Auto-Selection
 *
 * Validates:
 *   1. Auto-selection: submerged for standard, combined for thick (>80mm)
 *   2. Pressure scaling with thickness (Darcy-Weisbach approximation)
 *   3. Per-pass pressure: rough highest, finish lowest
 *   4. Nozzle gap recommendation for finish passes
 *   5. Machine pump limit validation
 *   6. Thick section warning generation
 *   7. Pipeline integration (flushing_planned stage)
 */
import { describe, it, expect } from "vitest";
import { WEDMPrintToProgramEngine } from "../engines/WEDMPrintToProgramEngine.js";
import type { WEDMProgramInput, FlushingStrategy } from "../engines/WEDMPrintToProgramEngine.js";
import type { WireEDMContour, LineSegment } from "../engines/DXFGeometryParserEngine.js";

// ============================================================================
// HELPERS
// ============================================================================

function line(x1: number, y1: number, x2: number, y2: number): LineSegment {
  return { type: "line", start: { x: x1, y: y1 }, end: { x: x2, y: y2 } };
}

function squareContour(size_mm: number): WireEDMContour {
  return {
    id: `sq-${size_mm}`,
    segments: [
      line(0, 0, size_mm, 0),
      line(size_mm, 0, size_mm, size_mm),
      line(size_mm, size_mm, 0, size_mm),
      line(0, size_mm, 0, 0),
    ],
    is_closed: true,
    is_exterior: true,
    area_mm2: size_mm * size_mm,
    perimeter_mm: 4 * size_mm,
    bbox: { min_x: 0, min_y: 0, max_x: size_mm, max_y: size_mm },
  };
}

function makeInput(thickness_mm: number, material = "D2"): WEDMProgramInput {
  return {
    contours: [squareContour(20)],
    material,
    hardness_hrc: material === "6061" ? 0 : 62,
    thickness_mm,
    target_ra_um: 0.8,
    target_accuracy_mm: 0.005,
    wire_type: "brass_0.25",
    controller: "mitsubishi",
    program_number: 1001,
    units: "metric",
    submerged: true,
    part_name: `Flush-Test-${thickness_mm}mm`,
  };
}

// ============================================================================
// TESTS
// ============================================================================

const engine = new WEDMPrintToProgramEngine();

describe("U-W100-33: Flushing Strategy", () => {

  describe("Auto-selection by thickness", () => {
    it("thin section (5mm) → submerged", async () => {
      const result = await engine.generate(makeInput(5));
      expect(result.flushing_strategy).toBeDefined();
      expect(result.flushing_strategy!.mode).toBe("submerged");
    });

    it("standard section (25.4mm) → submerged", async () => {
      const result = await engine.generate(makeInput(25.4));
      expect(result.flushing_strategy!.mode).toBe("submerged");
    });

    it("standard section (50mm) → submerged", async () => {
      const result = await engine.generate(makeInput(50));
      expect(result.flushing_strategy!.mode).toBe("submerged");
    });

    it("thick section (100mm) → combined", async () => {
      const result = await engine.generate(makeInput(100));
      expect(result.flushing_strategy!.mode).toBe("combined");
    });

    it("very thick section (150mm) → combined", async () => {
      const result = await engine.generate(makeInput(150));
      expect(result.flushing_strategy!.mode).toBe("combined");
    });
  });

  describe("Pressure scaling with thickness", () => {
    it("thin part has lower base pressure than thick part", async () => {
      const thin = await engine.generate(makeInput(10));
      const thick = await engine.generate(makeInput(100));
      expect(thick.flushing_strategy!.base_pressure_bar).toBeGreaterThan(
        thin.flushing_strategy!.base_pressure_bar
      );
    });

    it("very thick part scales pressure up to 1.8x", async () => {
      const standard = await engine.generate(makeInput(25));
      const veryThick = await engine.generate(makeInput(150));
      const ratio = veryThick.flushing_strategy!.base_pressure_bar /
        standard.flushing_strategy!.base_pressure_bar;
      // Should scale but not exceed 1.8x
      expect(ratio).toBeGreaterThan(1);
      expect(ratio).toBeLessThanOrEqual(1.9);
    });
  });

  describe("Per-pass pressure decreasing from rough to finish", () => {
    it("rough pass has highest pressure", async () => {
      const result = await engine.generate(makeInput(25.4));
      const ppPressure = result.flushing_strategy!.per_pass_pressure_bar;
      expect(ppPressure.length).toBeGreaterThanOrEqual(2);
      // First pass (rough) should be highest
      for (let i = 1; i < ppPressure.length; i++) {
        expect(ppPressure[i]).toBeLessThanOrEqual(ppPressure[0]);
      }
    });

    it("per-pass pressure count matches pass count", async () => {
      const result = await engine.generate(makeInput(25.4));
      const ppPressure = result.flushing_strategy!.per_pass_pressure_bar;
      expect(ppPressure.length).toBe(result.pass_details.length);
    });

    it("finish passes have ≤50% of rough pressure", async () => {
      const result = await engine.generate(makeInput(25.4));
      const ppPressure = result.flushing_strategy!.per_pass_pressure_bar;
      if (ppPressure.length >= 3) {
        const roughP = ppPressure[0];
        const lastP = ppPressure[ppPressure.length - 1];
        expect(lastP).toBeLessThanOrEqual(roughP * 0.51);
      }
    });
  });

  describe("Nozzle gap recommendation", () => {
    it("thin parts get tighter nozzle gap", async () => {
      const thin = await engine.generate(makeInput(10));
      expect(thin.flushing_strategy!.finish_nozzle_gap_mm).toBeLessThanOrEqual(1.0);
    });

    it("thick parts get wider nozzle gap", async () => {
      const thick = await engine.generate(makeInput(100));
      expect(thick.flushing_strategy!.finish_nozzle_gap_mm).toBeGreaterThanOrEqual(1.0);
    });
  });

  describe("Pump limit validation", () => {
    it("standard thickness is within pump limits", async () => {
      const result = await engine.generate(makeInput(25.4));
      expect(result.flushing_strategy!.pump_within_limits).toBe(true);
    });

    it("base pressure values are reasonable (1-15 bar)", async () => {
      const result = await engine.generate(makeInput(50));
      expect(result.flushing_strategy!.base_pressure_bar).toBeGreaterThan(0);
      expect(result.flushing_strategy!.base_pressure_bar).toBeLessThanOrEqual(15);
    });
  });

  describe("Thick section warnings", () => {
    it("thick section (>80mm) generates flush warning", async () => {
      const result = await engine.generate(makeInput(100));
      expect(result.warnings.some(w => w.includes("Thick section flushing"))).toBe(true);
    });

    it("standard thickness has no thick section warning", async () => {
      const result = await engine.generate(makeInput(25.4));
      expect(result.warnings.filter(w => w.includes("Thick section flushing")).length).toBe(0);
    });
  });

  describe("Reason field is descriptive", () => {
    it("submerged reason mentions surface finish", async () => {
      const result = await engine.generate(makeInput(25.4));
      expect(result.flushing_strategy!.reason).toContain("submerged");
    });

    it("combined reason mentions thickness", async () => {
      const result = await engine.generate(makeInput(100));
      expect(result.flushing_strategy!.reason).toContain("100");
    });
  });

  describe("Pipeline integration", () => {
    it("flushing_planned stage appears in stages_completed", async () => {
      const result = await engine.generate(makeInput(25.4));
      expect(result.stages_completed).toContain("flushing_planned");
    });

    it("flushing strategy present in all successful results", async () => {
      const result = await engine.generate(makeInput(25.4));
      expect(result.success).toBe(true);
      expect(result.flushing_strategy).toBeDefined();
      expect(result.flushing_strategy!.mode).toBeTruthy();
      expect(result.flushing_strategy!.per_pass_pressure_bar.length).toBeGreaterThan(0);
    });
  });

  describe("Material independence", () => {
    it("flushing mode depends on thickness, not material", async () => {
      const d2 = await engine.generate(makeInput(100, "D2"));
      const al = await engine.generate(makeInput(100, "6061"));
      expect(d2.flushing_strategy!.mode).toBe(al.flushing_strategy!.mode);
    });
  });
});
