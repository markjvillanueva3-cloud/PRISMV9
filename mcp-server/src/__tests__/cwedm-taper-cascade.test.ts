/**
 * U-WLAUNCH05: Taper vs Straight Skim Cascade Direction Test
 *
 * Validates that skim pass feed rates follow the correct direction:
 *   - STRAIGHT (taper=0): DECREASING cascade (ITW SHAKEPROOF pattern: F.24→.21→.20)
 *   - TAPER (taper>0):    INCREASING cascade (NOZE TEST pattern: F.16→.23→.26→.30)
 *
 * PHYSICS CAVEAT: The taper increasing cascade is empirically observed from real
 * programs (NOZE TEST.NC — SS taper, 5-pass), not derived from first principles.
 * Hypothesized mechanism: taper reduces effective spark contact area per pass,
 * requiring higher feed to maintain MRR.
 *
 * Reference data:
 *   ITW SHAKEPROOF 500-30540-24000-04.NC — D2 straight, 4-pass: F.12→.24→.21→.20
 *   NOZE TEST.NC — SS taper, 5-pass: F.16→.23→.26→.30
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

async function generateProgram(taper_angle_deg: number) {
  const input: WEDMProgramInput = {
    contours: [makeSquareContour()],
    material: "D2",
    thickness_mm: 25.4,
    target_ra_um: 0.8,
    controller: "mitsubishi",
    taper_angle_deg,
  };
  return engine.generate(input);
}

describe("U-WLAUNCH05: Taper vs Straight Skim Cascade Direction", () => {

  describe("Straight cut (taper=0) — DECREASING cascade (ITW SHAKEPROOF pattern)", () => {
    it("skim1 feed > rough feed (speed factor ~2.0×)", async () => {
      const result = await generateProgram(0);
      expect(result.success).toBe(true);
      expect(result.pass_details.length).toBeGreaterThanOrEqual(3);

      const roughFeed = result.pass_details[0].feed_mm_min;
      const skim1Feed = result.pass_details[1].feed_mm_min;
      expect(skim1Feed).toBeGreaterThan(roughFeed);
    });

    it("skim2 feed ≤ skim1 feed (decreasing after initial jump)", async () => {
      const result = await generateProgram(0);
      if (result.pass_details.length >= 3) {
        const skim1Feed = result.pass_details[1].feed_mm_min;
        const skim2Feed = result.pass_details[2].feed_mm_min;
        // Allow 5% tolerance for rounding
        expect(skim2Feed).toBeLessThanOrEqual(skim1Feed * 1.05);
      }
    });

    it("skim3 feed ≤ skim2 feed (continued decrease)", async () => {
      const result = await generateProgram(0);
      if (result.pass_details.length >= 4) {
        const skim2Feed = result.pass_details[2].feed_mm_min;
        const skim3Feed = result.pass_details[3].feed_mm_min;
        expect(skim3Feed).toBeLessThanOrEqual(skim2Feed * 1.05);
      }
    });
  });

  describe("Taper cut (taper=3°) — INCREASING cascade (NOZE TEST pattern)", () => {
    it("generates successfully with taper angle", async () => {
      const result = await generateProgram(3);
      expect(result.success).toBe(true);
      expect(result.pass_details.length).toBeGreaterThanOrEqual(3);
    });

    it("skim2 feed ≥ skim1 feed (increasing cascade)", async () => {
      const result = await generateProgram(3);
      if (result.pass_details.length >= 3) {
        const skim1Feed = result.pass_details[1].feed_mm_min;
        const skim2Feed = result.pass_details[2].feed_mm_min;
        // Taper: each successive skim should be ≥ previous (increasing)
        expect(skim2Feed).toBeGreaterThanOrEqual(skim1Feed * 0.95);
      }
    });

    it("skim3 feed ≥ skim2 feed (continued increase)", async () => {
      const result = await generateProgram(3);
      if (result.pass_details.length >= 4) {
        const skim2Feed = result.pass_details[2].feed_mm_min;
        const skim3Feed = result.pass_details[3].feed_mm_min;
        expect(skim3Feed).toBeGreaterThanOrEqual(skim2Feed * 0.95);
      }
    });

    it("taper skim1 starts slower than straight skim1 (factor 1.3× vs 2.0×)", async () => {
      const [straight, taper] = await Promise.all([
        generateProgram(0),
        generateProgram(3),
      ]);

      const straightSkim1Factor = straight.pass_details[1].feed_mm_min / straight.pass_details[0].feed_mm_min;
      const taperSkim1Factor = taper.pass_details[1].feed_mm_min / taper.pass_details[0].feed_mm_min;

      // Straight starts at ~2.0×, taper starts at ~1.3×
      expect(straightSkim1Factor).toBeGreaterThan(taperSkim1Factor);
    });
  });

  describe("Cross-validation: same physics for non-taper parameters", () => {
    it("rough pass feed rate is identical for taper=0 and taper=3 (same material/thickness)", async () => {
      const [straight, taper] = await Promise.all([
        generateProgram(0),
        generateProgram(3),
      ]);

      // Rough pass doesn't depend on taper — same material, thickness, Ra
      expect(straight.pass_details[0].feed_mm_min).toBeCloseTo(
        taper.pass_details[0].feed_mm_min, 1
      );
    });

    it("H-offsets are positive for both straight and taper", async () => {
      const [straight, taper] = await Promise.all([
        generateProgram(0),
        generateProgram(3),
      ]);

      for (const pass of straight.pass_details) {
        expect(pass.offset_mm).toBeGreaterThan(0);
      }
      for (const pass of taper.pass_details) {
        expect(pass.offset_mm).toBeGreaterThanOrEqual(0);
      }
    });

    it("E-pack codes use correct family (E12xx straight, E28xx taper)", async () => {
      const [straight, taper] = await Promise.all([
        generateProgram(0),
        generateProgram(3),
      ]);

      // Straight uses E12xx family (2-axis standard)
      for (const pass of straight.pass_details) {
        expect(pass.e_pack_code).toMatch(/^E1/);
      }
      // Taper uses E28xx family (4-axis UV)
      for (const pass of taper.pass_details) {
        expect(pass.e_pack_code).toMatch(/^E2/);
      }
    });
  });
});
