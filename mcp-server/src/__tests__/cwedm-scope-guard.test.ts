/**
 * U-WLAUNCH07: Scope Guard + V1 Limitation Messages
 *
 * Validates that WEDMPrintToProgramEngine.generate() enforces V1 scope:
 *   - taper > 5° → hard reject with V2 timeline message
 *   - non-Mitsubishi controller → soft warning about uncalibrated codes
 *   - complex internal geometry → feed reduction warning
 *   - valid V1 inputs still work unchanged
 */

import { describe, it, expect } from "vitest";
import { WEDMPrintToProgramEngine } from "../engines/WEDMPrintToProgramEngine.js";
import type { WEDMProgramInput } from "../engines/WEDMPrintToProgramEngine.js";
import type { WireEDMContour, LineSegment } from "../engines/DXFGeometryParserEngine.js";

const engine = new WEDMPrintToProgramEngine();

function makeSquareContour(): WireEDMContour {
  const side = 25;
  const segments: LineSegment[] = [
    { type: "line", start: { x: 0, y: 0 }, end: { x: side, y: 0 } },
    { type: "line", start: { x: side, y: 0 }, end: { x: side, y: side } },
    { type: "line", start: { x: side, y: side }, end: { x: 0, y: side } },
    { type: "line", start: { x: 0, y: side }, end: { x: 0, y: 0 } },
  ];
  return {
    id: "square_25mm",
    segments,
    is_closed: true,
    is_exterior: true,
    area_mm2: side * side,
    perimeter_mm: 4 * side,
    bbox: { min_x: 0, min_y: 0, max_x: side, max_y: side },
  };
}

/** Creates internal contour with many segments (simulates thread form / re-entrant) */
function makeComplexInternalContour(): WireEDMContour {
  const segments: LineSegment[] = [];
  const numSegments = 12;
  const r = 5;
  for (let i = 0; i < numSegments; i++) {
    const a1 = (2 * Math.PI * i) / numSegments;
    const a2 = (2 * Math.PI * (i + 1)) / numSegments;
    segments.push({
      type: "line",
      start: { x: 12.5 + r * Math.cos(a1), y: 12.5 + r * Math.sin(a1) },
      end: { x: 12.5 + r * Math.cos(a2), y: 12.5 + r * Math.sin(a2) },
    });
  }
  return {
    id: "complex_internal",
    segments,
    is_closed: true,
    is_exterior: false,
    area_mm2: Math.PI * r * r,
    perimeter_mm: 2 * Math.PI * r,
    bbox: { min_x: 7.5, min_y: 7.5, max_x: 17.5, max_y: 17.5 },
  };
}

function baseInput(overrides: Partial<WEDMProgramInput> = {}): WEDMProgramInput {
  return {
    contours: [makeSquareContour()],
    material: "D2",
    thickness_mm: 25.4,
    target_ra_um: 0.8,
    controller: "mitsubishi",
    ...overrides,
  };
}

describe("U-WLAUNCH07: Scope Guard + V1 Limitation Messages", () => {

  describe("Taper > 5° hard reject", () => {
    it("taper 15° returns success=false with V2 message", async () => {
      const result = await engine.generate(baseInput({ taper_angle_deg: 15 }));
      expect(result.success).toBe(false);
      expect(result.warnings.some(w => w.includes("V1 scope exceeded"))).toBe(true);
      expect(result.warnings.some(w => w.includes("V2"))).toBe(true);
    });

    it("taper 6° is rejected (> 5° threshold)", async () => {
      const result = await engine.generate(baseInput({ taper_angle_deg: 6 }));
      expect(result.success).toBe(false);
      expect(result.warnings.some(w => w.includes("V1 scope exceeded"))).toBe(true);
    });

    it("taper 5° is NOT rejected (boundary: ≤ 5° is valid)", async () => {
      const result = await engine.generate(baseInput({ taper_angle_deg: 5 }));
      expect(result.success).toBe(true);
    });

    it("taper 3° is NOT rejected (valid taper)", async () => {
      const result = await engine.generate(baseInput({ taper_angle_deg: 3 }));
      expect(result.success).toBe(true);
    });

    it("taper 0° (straight) is NOT rejected", async () => {
      const result = await engine.generate(baseInput({ taper_angle_deg: 0 }));
      expect(result.success).toBe(true);
    });

    it("rejection includes stages_completed with scope_guard_rejected", async () => {
      const result = await engine.generate(baseInput({ taper_angle_deg: 15 }));
      expect(result.stages_completed).toContain("scope_guard_rejected");
    });
  });

  describe("Non-Mitsubishi controller warning", () => {
    it("sodick controller produces warning about uncalibrated codes", async () => {
      const result = await engine.generate(baseInput({ controller: "sodick" }));
      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes("V1 notice") && w.includes("sodick"))).toBe(true);
    });

    it("fanuc controller produces warning", async () => {
      const result = await engine.generate(baseInput({ controller: "fanuc" }));
      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes("V1 notice") && w.includes("fanuc"))).toBe(true);
    });

    it("mitsubishi controller has NO V1 notice warning", async () => {
      const result = await engine.generate(baseInput({ controller: "mitsubishi" }));
      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes("V1 notice"))).toBe(false);
    });

    it("warning mentions Mitsubishi as the calibrated controller", async () => {
      const result = await engine.generate(baseInput({ controller: "agiecharmilles" }));
      expect(result.warnings.some(w => w.includes("Mitsubishi FA/MV"))).toBe(true);
    });
  });

  describe("Complex internal geometry warning", () => {
    it("complex internal contour (>6 segments) produces feed reduction warning", async () => {
      const result = await engine.generate(baseInput({
        contours: [makeSquareContour(), makeComplexInternalContour()],
      }));
      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes("Complex internal geometry"))).toBe(true);
    });

    it("simple square contour does NOT produce geometry warning", async () => {
      const result = await engine.generate(baseInput());
      expect(result.warnings.some(w => w.includes("Complex internal geometry"))).toBe(false);
    });

    it("geometry warning mentions feed reduction percentage", async () => {
      const result = await engine.generate(baseInput({
        contours: [makeSquareContour(), makeComplexInternalContour()],
      }));
      const geoWarn = result.warnings.find(w => w.includes("Complex internal geometry"));
      expect(geoWarn).toBeDefined();
      expect(geoWarn).toContain("40-60%");
    });
  });

  describe("V1 valid inputs still work", () => {
    it("D2 25.4mm Mitsubishi straight → success with scope_guard_passed", async () => {
      const result = await engine.generate(baseInput());
      expect(result.success).toBe(true);
      expect(result.stages_completed).toContain("scope_guard_passed");
    });

    it("304SS 25.4mm Mitsubishi straight → success", async () => {
      const result = await engine.generate(baseInput({ material: "304SS" }));
      expect(result.success).toBe(true);
    });
  });
});
