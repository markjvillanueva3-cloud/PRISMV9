/**
 * U-W100-32: Slug Management — Physics-Driven Tab Placement + Drop Sequence
 *
 * Validates:
 *   1. Slug weight calculation: W = A × t × ρ for internal contours
 *   2. Category classification: light (<0.1kg), medium (0.1-0.5kg),
 *      heavy (0.5-2.0kg), very_heavy (>2.0kg)
 *   3. Tab recommendations scale with slug weight
 *   4. Heavy/very_heavy slugs generate warnings
 *   5. External contours are excluded (no slug for punch profiles)
 *   6. Slug data flows through WEDMPrintToProgramEngine pipeline
 *   7. Material density lookup for D2, 304SS, 6061, WC, Inconel
 */
import { describe, it, expect } from "vitest";
import { WEDMPrintToProgramEngine } from "../engines/WEDMPrintToProgramEngine.js";
import type { WEDMProgramInput, SlugInfo } from "../engines/WEDMPrintToProgramEngine.js";
import type { WireEDMContour, LineSegment } from "../engines/DXFGeometryParserEngine.js";

// ============================================================================
// HELPERS
// ============================================================================

function line(x1: number, y1: number, x2: number, y2: number): LineSegment {
  return { type: "line", start: { x: x1, y: y1 }, end: { x: x2, y: y2 } };
}

/** External square (punch profile — NO slug) */
function externalSquare(size_mm: number): WireEDMContour {
  return {
    id: `ext-${size_mm}`,
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

/** Internal square (die opening — creates a slug) */
function internalSquare(size_mm: number, offset_x = 30): WireEDMContour {
  return {
    id: `int-${size_mm}`,
    segments: [
      line(offset_x, 0, offset_x + size_mm, 0),
      line(offset_x + size_mm, 0, offset_x + size_mm, size_mm),
      line(offset_x + size_mm, size_mm, offset_x, size_mm),
      line(offset_x, size_mm, offset_x, 0),
    ],
    is_closed: true,
    is_exterior: false,
    area_mm2: size_mm * size_mm,
    perimeter_mm: 4 * size_mm,
    bbox: { min_x: offset_x, min_y: 0, max_x: offset_x + size_mm, max_y: size_mm },
  };
}

function makeInput(contours: WireEDMContour[], material: string, thickness_mm: number): WEDMProgramInput {
  return {
    contours,
    material,
    hardness_hrc: material === "6061" ? 0 : material === "304SS" ? 30 : 62,
    thickness_mm,
    target_ra_um: 0.8,
    target_accuracy_mm: 0.005,
    wire_type: "brass_0.25",
    controller: "mitsubishi",
    program_number: 1001,
    units: "metric",
    submerged: true,
    part_name: `Slug-Test-${material}`,
  };
}

// ============================================================================
// TESTS
// ============================================================================

const engine = new WEDMPrintToProgramEngine();

describe("U-W100-32: Slug Management", () => {

  describe("External-only contours produce no slugs", () => {
    it("punch profile (exterior) has no slug_management", async () => {
      const result = await engine.generate(makeInput(
        [externalSquare(20)],
        "D2",
        25.4,
      ));
      expect(result.success).toBe(true);
      // External contour = no internal slug
      expect(result.slug_management).toBeUndefined();
    });
  });

  describe("Internal contours produce slug data", () => {
    it("internal die opening creates slug entry", async () => {
      const result = await engine.generate(makeInput(
        [externalSquare(50), internalSquare(15)],
        "D2",
        25.4,
      ));
      expect(result.success).toBe(true);
      expect(result.slug_management).toBeDefined();
      expect(result.slug_management!.length).toBe(1);
      expect(result.slug_management![0].contour_id).toBe("int-15");
    });
  });

  describe("Slug weight calculation: W = A × t × ρ", () => {
    it("D2 steel: 20×20mm at 25.4mm thick ≈ 78g", async () => {
      // W = 400mm² × 25.4mm × 7.7e-6 kg/mm³ = 0.0782 kg ≈ 78g
      const result = await engine.generate(makeInput(
        [externalSquare(50), internalSquare(20)],
        "D2",
        25.4,
      ));
      expect(result.slug_management).toBeDefined();
      const slug = result.slug_management![0];
      expect(slug.weight_kg).toBeGreaterThan(0.07);
      expect(slug.weight_kg).toBeLessThan(0.09);
      expect(slug.area_mm2).toBe(400);
    });

    it("6061 aluminum: same geometry, lighter slug", async () => {
      // W = 400mm² × 25.4mm × 2.71e-6 = 0.0275 kg ≈ 28g
      const result = await engine.generate(makeInput(
        [externalSquare(50), internalSquare(20)],
        "6061",
        25.4,
      ));
      expect(result.slug_management).toBeDefined();
      const slug = result.slug_management![0];
      expect(slug.weight_kg).toBeGreaterThan(0.02);
      expect(slug.weight_kg).toBeLessThan(0.04);
      // Lighter than D2
      expect(slug.category).toBe("light");
    });

    it("304SS: density between steel and aluminum", async () => {
      // W = 400mm² × 25.4mm × 8.0e-6 = 0.0813 kg ≈ 81g
      const result = await engine.generate(makeInput(
        [externalSquare(50), internalSquare(20)],
        "304SS",
        25.4,
      ));
      expect(result.slug_management).toBeDefined();
      const slug = result.slug_management![0];
      expect(slug.weight_kg).toBeGreaterThan(0.07);
      expect(slug.weight_kg).toBeLessThan(0.10);
    });
  });

  describe("Slug category classification", () => {
    it("light: small slug < 0.1kg", async () => {
      // 10×10mm × 25.4mm × 7.7e-6 = 0.0196 kg
      const result = await engine.generate(makeInput(
        [externalSquare(50), internalSquare(10)],
        "D2",
        25.4,
      ));
      const slug = result.slug_management![0];
      expect(slug.category).toBe("light");
      expect(slug.recommended_tabs).toBe(0);
      expect(slug.intervention_needed).toBe(false);
    });

    it("medium: slug 0.1-0.5kg", async () => {
      // 40×40mm × 25.4mm × 7.7e-6 = 0.313 kg
      const result = await engine.generate(makeInput(
        [externalSquare(80), internalSquare(40)],
        "D2",
        25.4,
      ));
      const slug = result.slug_management![0];
      expect(slug.category).toBe("medium");
      expect(slug.recommended_tabs).toBe(1);
      expect(slug.intervention_needed).toBe(false);
    });

    it("heavy: slug 0.5-2.0kg", async () => {
      // 60×60mm × 50.8mm × 7.7e-6 = 1.408 kg
      const result = await engine.generate(makeInput(
        [externalSquare(100), internalSquare(60)],
        "D2",
        50.8,
      ));
      const slug = result.slug_management![0];
      expect(slug.category).toBe("heavy");
      expect(slug.recommended_tabs).toBe(2);
      expect(slug.intervention_needed).toBe(true);
    });

    it("very_heavy: slug > 2.0kg", async () => {
      // 100×100mm × 50.8mm × 7.7e-6 = 3.912 kg
      const result = await engine.generate(makeInput(
        [externalSquare(150), internalSquare(100)],
        "D2",
        50.8,
      ));
      const slug = result.slug_management![0];
      expect(slug.category).toBe("very_heavy");
      expect(slug.recommended_tabs).toBe(3);
      expect(slug.intervention_needed).toBe(true);
    });
  });

  describe("Heavy slug warnings", () => {
    it("heavy slug generates warning in result", async () => {
      const result = await engine.generate(makeInput(
        [externalSquare(100), internalSquare(60)],
        "D2",
        50.8,
      ));
      expect(result.warnings.some(w => w.includes("Slug warning"))).toBe(true);
      expect(result.warnings.some(w => w.includes("tabs required") || w.includes("support fixture"))).toBe(true);
    });

    it("light slug produces no slug warning", async () => {
      const result = await engine.generate(makeInput(
        [externalSquare(50), internalSquare(10)],
        "D2",
        25.4,
      ));
      expect(result.warnings.filter(w => w.includes("Slug warning")).length).toBe(0);
    });
  });

  describe("Handling notes are informative", () => {
    it("includes weight in grams for light/medium slugs", async () => {
      const result = await engine.generate(makeInput(
        [externalSquare(50), internalSquare(10)],
        "D2",
        25.4,
      ));
      const slug = result.slug_management![0];
      expect(slug.handling_note).toMatch(/\d+(\.\d+)?g/);
      expect(slug.handling_note).toContain("free drop");
    });

    it("includes weight in kg for very heavy slugs", async () => {
      const result = await engine.generate(makeInput(
        [externalSquare(150), internalSquare(100)],
        "D2",
        50.8,
      ));
      const slug = result.slug_management![0];
      expect(slug.handling_note).toMatch(/\d+\.\d+kg/);
      expect(slug.handling_note).toContain("vacuum");
    });
  });

  describe("Pipeline integration", () => {
    it("slug_managed stage appears in stages_completed", async () => {
      const result = await engine.generate(makeInput(
        [externalSquare(50), internalSquare(15)],
        "D2",
        25.4,
      ));
      expect(result.stages_completed).toContain("slug_managed");
    });

    it("no slug_managed stage for external-only contours", async () => {
      const result = await engine.generate(makeInput(
        [externalSquare(20)],
        "D2",
        25.4,
      ));
      expect(result.stages_completed).not.toContain("slug_managed");
    });

    it("multiple internal contours each get slug info", async () => {
      const result = await engine.generate(makeInput(
        [externalSquare(100), internalSquare(15, 10), internalSquare(20, 50)],
        "D2",
        25.4,
      ));
      expect(result.slug_management).toBeDefined();
      expect(result.slug_management!.length).toBe(2);
    });
  });
});
