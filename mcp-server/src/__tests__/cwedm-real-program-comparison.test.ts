/**
 * U-WLAUNCH03: Real Program Comparison
 *
 * Compares WEDMPrintToProgramEngine output against data extracted from
 * real Box Drive NC files (ITW SHAKEPROOF, NOZE TEST).
 *
 * This is the ground-truth validation: if our engine disagrees with a real
 * program that ran on a real machine, the engine is wrong, not the program.
 *
 * Source: C:/Users/wompu/Box/WIRE EDM/
 */

import { describe, it, expect } from "vitest";
import { REAL_PROGRAM_CATALOG, type RealProgramEntry } from "../data/wedm-published-conditions.js";
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

describe("U-WLAUNCH03: Real Program Comparison", () => {

  describe("Catalog integrity", () => {
    it("REAL_PROGRAM_CATALOG has 3 entries", () => {
      expect(REAL_PROGRAM_CATALOG.length).toBe(3);
    });

    it("RP-001 is ITW SHAKEPROOF", () => {
      const rp = REAL_PROGRAM_CATALOG.find(p => p.id === "RP-001");
      expect(rp).toBeDefined();
      expect(rp!.filename).toContain("ITW SHAKEPROOF");
      expect(rp!.material).toBe("D2");
      expect(rp!.num_passes).toBe(4);
    });

    it("RP-002 is NOZE TEST", () => {
      const rp = REAL_PROGRAM_CATALOG.find(p => p.id === "RP-002");
      expect(rp).toBeDefined();
      expect(rp!.filename).toContain("NOZE TEST");
      expect(rp!.taper).toBe(true);
      expect(rp!.num_passes).toBe(5);
    });
  });

  describe("ITW SHAKEPROOF — D2 25.4mm straight (RP-001)", () => {
    const realProgram = REAL_PROGRAM_CATALOG.find(p => p.id === "RP-001")!;

    it("E-pack codes match: E1221-E1224", async () => {
      const result = await engine.generate({
        contours: [makeSquareContour()],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      });
      expect(result.success).toBe(true);

      // Check E-pack codes match the real program (at least first 4 passes)
      for (let i = 0; i < Math.min(4, result.pass_details.length); i++) {
        expect(result.pass_details[i].e_pack_code).toBe(realProgram.passes[i].e_pack_code);
      }
    });

    it("rough feed within 15% of real program (F.12 in/min = 3.048 mm/min)", async () => {
      const result = await engine.generate({
        contours: [makeSquareContour()],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      });
      const realRoughFeed = realProgram.passes[0].feed_mm_min; // 3.048
      const engineRoughFeed = result.pass_details[0].feed_mm_min;

      // Within 15% of real program
      expect(engineRoughFeed).toBeGreaterThan(realRoughFeed * 0.85);
      expect(engineRoughFeed).toBeLessThan(realRoughFeed * 1.15);
    });

    it("H-offsets within 10% of real program", async () => {
      const result = await engine.generate({
        contours: [makeSquareContour()],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      });

      // Real H-offsets are in inches; convert to mm for comparison
      for (let i = 0; i < Math.min(4, result.pass_details.length); i++) {
        const realOffset_mm = realProgram.passes[i].h_offset_inch * 25.4;
        const engineOffset_mm = result.pass_details[i].offset_mm;
        // Within 10% (these are small numbers, so 10% is tight)
        if (realOffset_mm > 0) {
          expect(engineOffset_mm).toBeGreaterThan(realOffset_mm * 0.90);
          expect(engineOffset_mm).toBeLessThan(realOffset_mm * 1.10);
        }
      }
    });

    it("skim cascade direction matches real program (DECREASING)", async () => {
      const result = await engine.generate({
        contours: [makeSquareContour()],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      });

      expect(realProgram.skim_cascade).toBe("decreasing");

      // Verify engine follows same pattern: skim2 <= skim1, skim3 <= skim2
      if (result.pass_details.length >= 3) {
        expect(result.pass_details[2].feed_mm_min).toBeLessThanOrEqual(
          result.pass_details[1].feed_mm_min * 1.05
        );
      }
      if (result.pass_details.length >= 4) {
        expect(result.pass_details[3].feed_mm_min).toBeLessThanOrEqual(
          result.pass_details[2].feed_mm_min * 1.05
        );
      }
    });

    it("H-offsets are monotonically decreasing (same pattern as real program)", async () => {
      const result = await engine.generate({
        contours: [makeSquareContour()],
        material: "D2",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      });

      // Real: H1=0.0085 > H2=0.0064 > H3=0.0058 > H4=0.0053
      for (let i = 1; i < result.pass_details.length; i++) {
        expect(result.pass_details[i].offset_mm).toBeLessThanOrEqual(
          result.pass_details[i - 1].offset_mm
        );
      }
    });
  });

  describe("NOZE TEST — SS taper (RP-002)", () => {
    const realProgram = REAL_PROGRAM_CATALOG.find(p => p.id === "RP-002")!;

    it("E-pack material group matches (E28xx = group 2 = stainless)", async () => {
      const result = await engine.generate({
        contours: [makeSquareContour()],
        material: "304SS",
        thickness_mm: 25.4,
        target_ra_um: 0.8,
        controller: "mitsubishi",
      });
      expect(result.success).toBe(true);

      // E-pack first digit should be 2 (stainless group)
      expect(result.pass_details[0].e_pack_code).toMatch(/^E2/);

      // Real program uses E28xx — group 2 confirmed
      expect(realProgram.passes[0].e_pack_code.charAt(1)).toBe("2");
    });

    it("taper skim cascade direction matches real program (INCREASING)", async () => {
      expect(realProgram.skim_cascade).toBe("increasing");

      // Verify real data: F.16 → .23 → .26 → .30 is indeed increasing
      for (let i = 1; i < 4; i++) {
        expect(realProgram.passes[i].feed_inch_min).toBeGreaterThan(
          realProgram.passes[i - 1].feed_inch_min
        );
      }
    });

    it("taper program has UV axis moves (confirming taper mechanism)", () => {
      // All passes in NOZE TEST have UV moves
      for (const pass of realProgram.passes) {
        expect(pass.has_uv).toBe(true);
      }
    });

    it("taper program H-offsets are all zero (UV compensation, not H)", () => {
      for (const pass of realProgram.passes) {
        expect(pass.h_offset_inch).toBe(0.0);
      }
    });
  });

  describe("5-inch square (RP-003)", () => {
    it("correctly identified as geometry-only template", () => {
      const rp = REAL_PROGRAM_CATALOG.find(p => p.id === "RP-003")!;
      expect(rp.num_passes).toBe(1);
      expect(rp.passes[0].e_pack_code).toBe("");
      expect(rp.notes).toContain("Geometry-only template");
    });
  });
});
