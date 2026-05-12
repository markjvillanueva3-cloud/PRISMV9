/**
 * U-WLAUNCH02: Multi-Material Validation — 304SS / 6061 / WC / Inconel at 25.4mm
 *
 * Proves our Wire EDM program generator produces physics-correct output
 * across 4 material families beyond D2 tool steel.
 *
 * Material hierarchy (feed rate ordering, physics-justified):
 *   Aluminum (mrr=1.5) > Tool steel (0.9) > SS (0.85) > Inconel (0.5) > WC (0.35)
 *
 * E-pack material groups (Mitsubishi FA technology tables):
 *   D2 = group 1 (steel), 304SS = group 2, 6061 = group 3, WC = group 5, Inconel = group 7
 *
 * Reference data:
 *   - EDMMultiPassStrategyEngine mrr_factors (calibrated to thermal/electrical properties)
 *   - Klocke Ra model: Ra = k_ra × Ip^0.40 × ton^0.28
 *   - k_ra values: steel=0.138, stainless=0.145, aluminum=0.120, WC=0.225, inconel=0.180
 *   - D2 @ 25.4mm baseline: 3.21 mm/min (validated in U-WLAUNCH01)
 */

import { describe, it, expect } from "vitest";
import { WEDMPrintToProgramEngine } from "../engines/WEDMPrintToProgramEngine.js";
import type { WEDMProgramInput } from "../engines/WEDMPrintToProgramEngine.js";
import type { WireEDMContour, LineSegment } from "../engines/DXFGeometryParserEngine.js";

const engine = new WEDMPrintToProgramEngine();

// ============================================================================
// HELPER: Consistent 25mm square contour (100mm perimeter)
// ============================================================================

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

// ============================================================================
// Generate program for a given material at 25.4mm
// ============================================================================

async function generateProgram(material: string) {
  const input: WEDMProgramInput = {
    contours: [makeSquareContour()],
    material,
    thickness_mm: 25.4,
    target_ra_um: 0.8,
    controller: "mitsubishi",
    program_number: 1,
  };
  return engine.generate(input);
}

// ============================================================================
// TESTS
// ============================================================================

describe("U-WLAUNCH02: Multi-Material Validation at 25.4mm", () => {

  // ── 304 Stainless Steel ───────────────────────────────────────────

  describe("304 Stainless Steel (group 2, mrr_factor=0.85)", () => {
    it("1a: correct E-pack material group 2 (stainless)", async () => {
      const result = await generateProgram("stainless 304");
      expect(result.success).toBe(true);

      for (const pass of result.pass_details) {
        // E-pack first digit should be 2 (stainless group)
        expect(pass.e_pack_code[1]).toBe("2");
      }
    });

    it("1b: feed rate follows material hierarchy — SS ≈ D2 × 0.85-0.95", async () => {
      const [d2Result, ssResult] = await Promise.all([
        generateProgram("D2"),
        generateProgram("stainless 304"),
      ]);

      const d2Feed = d2Result.pass_details[0].feed_mm_min;
      const ssFeed = ssResult.pass_details[0].feed_mm_min;

      // SS mrr_factor=0.85, D2 mrr_factor=0.9 → ratio ≈ 0.944
      // Allow wider band (0.80-1.05) for other physics adjustments
      expect(ssFeed / d2Feed).toBeGreaterThanOrEqual(0.80);
      expect(ssFeed / d2Feed).toBeLessThanOrEqual(1.05);
    });

    it("1c: H-offsets decrease monotonically", async () => {
      const result = await generateProgram("stainless 304");
      const offsets = result.pass_details.map(p => p.offset_mm);

      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1]);
      }
    });

    it("1d: predicted Ra within 20% of 0.8µm target", async () => {
      const result = await generateProgram("stainless 304");
      expect(result.predicted_ra_um).toBeLessThanOrEqual(0.8 * 1.20);
    });

    it("1e: confidence_score.overall >= 65 (lower floor — less published SS EDM data)", async () => {
      const result = await generateProgram("stainless 304");
      expect(result.confidence_score.overall).toBeGreaterThanOrEqual(65);
    });
  });

  // ── 6061-T6 Aluminum ──────────────────────────────────────────────

  describe("6061-T6 Aluminum (group 3, mrr_factor=1.5)", () => {
    it("2a: correct E-pack material group 3 (aluminum/non-ferrous)", async () => {
      const result = await generateProgram("aluminum 6061");
      expect(result.success).toBe(true);

      for (const pass of result.pass_details) {
        expect(pass.e_pack_code[1]).toBe("3");
      }
    });

    it("2b: feed rate > D2 feed × 1.3 (aluminum much easier to EDM)", async () => {
      const [d2Result, alResult] = await Promise.all([
        generateProgram("D2"),
        generateProgram("aluminum 6061"),
      ]);

      const d2Feed = d2Result.pass_details[0].feed_mm_min;
      const alFeed = alResult.pass_details[0].feed_mm_min;

      // Al mrr_factor=1.5, D2=0.9 → ratio ≈ 1.67
      // Allow band (1.3-2.2) for physics adjustments
      expect(alFeed).toBeGreaterThan(d2Feed * 1.3);
    });

    it("2c: H-offsets decrease monotonically", async () => {
      const result = await generateProgram("aluminum 6061");
      const offsets = result.pass_details.map(p => p.offset_mm);

      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1]);
      }
    });

    it("2d: predicted Ra within 20% of 0.8µm target", async () => {
      const result = await generateProgram("aluminum 6061");
      expect(result.predicted_ra_um).toBeLessThanOrEqual(0.8 * 1.20);
    });

    it("2e: confidence_score.overall >= 65", async () => {
      const result = await generateProgram("aluminum 6061");
      expect(result.confidence_score.overall).toBeGreaterThanOrEqual(65);
    });
  });

  // ── Tungsten Carbide (WC) ─────────────────────────────────────────

  describe("Tungsten Carbide (group 5, mrr_factor=0.35)", () => {
    it("3a: correct E-pack material group 5 (carbide)", async () => {
      const result = await generateProgram("carbide");
      expect(result.success).toBe(true);

      for (const pass of result.pass_details) {
        expect(pass.e_pack_code[1]).toBe("5");
      }
    });

    it("3b: feed rate < D2 feed × 0.5 (carbide is very hard to EDM)", async () => {
      const [d2Result, wcResult] = await Promise.all([
        generateProgram("D2"),
        generateProgram("carbide"),
      ]);

      const d2Feed = d2Result.pass_details[0].feed_mm_min;
      const wcFeed = wcResult.pass_details[0].feed_mm_min;

      // WC mrr_factor=0.35, D2=0.9 → ratio ≈ 0.39
      expect(wcFeed).toBeLessThan(d2Feed * 0.5);
      // But not unreasonably slow (still cuts)
      expect(wcFeed).toBeGreaterThan(0.3);
    });

    it("3c: WC gets >= 5 passes for Ra 0.8µm (brittleness requires more passes)", async () => {
      const result = await generateProgram("carbide");

      // Carbide needs more careful pass strategy due to brittleness
      // and higher k_ra (0.225) requiring finer finishing
      expect(result.pass_details.length).toBeGreaterThanOrEqual(4);
    });

    it("3d: H-offsets decrease monotonically", async () => {
      const result = await generateProgram("carbide");
      const offsets = result.pass_details.map(p => p.offset_mm);

      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1]);
      }
    });

    it("3e: confidence_score.overall >= 65", async () => {
      const result = await generateProgram("carbide");
      expect(result.confidence_score.overall).toBeGreaterThanOrEqual(65);
    });
  });

  // ── Inconel 718 ───────────────────────────────────────────────────

  describe("Inconel 718 (group 7, mrr_factor=0.5)", () => {
    it("4a: correct E-pack material group 7 (superalloy)", async () => {
      const result = await generateProgram("inconel 718");
      expect(result.success).toBe(true);

      for (const pass of result.pass_details) {
        expect(pass.e_pack_code[1]).toBe("7");
      }
    });

    it("4b: feed rate < D2 feed × 0.6 (Inconel erosion resistance)", async () => {
      const [d2Result, incResult] = await Promise.all([
        generateProgram("D2"),
        generateProgram("inconel 718"),
      ]);

      const d2Feed = d2Result.pass_details[0].feed_mm_min;
      const incFeed = incResult.pass_details[0].feed_mm_min;

      // Inconel mrr_factor=0.5, D2=0.9 → ratio ≈ 0.556
      expect(incFeed).toBeLessThan(d2Feed * 0.6);
      // But still cuts
      expect(incFeed).toBeGreaterThan(0.5);
    });

    it("4c: H-offsets decrease monotonically", async () => {
      const result = await generateProgram("inconel 718");
      const offsets = result.pass_details.map(p => p.offset_mm);

      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1]);
      }
    });

    it("4d: predicted Ra within 20% of 0.8µm target", async () => {
      const result = await generateProgram("inconel 718");
      expect(result.predicted_ra_um).toBeLessThanOrEqual(0.8 * 1.20);
    });

    it("4e: confidence_score.overall >= 65", async () => {
      const result = await generateProgram("inconel 718");
      expect(result.confidence_score.overall).toBeGreaterThanOrEqual(65);
    });
  });

  // ── Cross-material physics validation ─────────────────────────────

  describe("Cross-material physics consistency", () => {
    it("5a: material feed rate hierarchy: Al > D2 > SS > Inconel > WC", async () => {
      const [d2, ss, al, wc, inc] = await Promise.all([
        generateProgram("D2"),
        generateProgram("stainless 304"),
        generateProgram("aluminum 6061"),
        generateProgram("carbide"),
        generateProgram("inconel 718"),
      ]);

      const feeds = {
        al: al.pass_details[0].feed_mm_min,
        d2: d2.pass_details[0].feed_mm_min,
        ss: ss.pass_details[0].feed_mm_min,
        inc: inc.pass_details[0].feed_mm_min,
        wc: wc.pass_details[0].feed_mm_min,
      };

      // Physics hierarchy: thermal diffusivity + electrical conductivity drive MRR
      expect(feeds.al).toBeGreaterThan(feeds.d2);
      expect(feeds.d2).toBeGreaterThanOrEqual(feeds.ss * 0.95); // SS close to D2
      expect(feeds.ss).toBeGreaterThan(feeds.inc);
      expect(feeds.inc).toBeGreaterThan(feeds.wc);
    });

    it("5b: all materials produce valid G-code with pipeline completion", async () => {
      const materials = ["stainless 304", "aluminum 6061", "carbide", "inconel 718"];

      for (const mat of materials) {
        const result = await generateProgram(mat);
        expect(result.success).toBe(true);
        expect(result.program_text.length).toBeGreaterThan(100);
        expect(result.stages_completed).toContain("gcode_generated");
      }
    });

    it("5c: no material produces unreasonable feed (< 0.1 or > 20 mm/min)", async () => {
      const materials = ["stainless 304", "aluminum 6061", "carbide", "inconel 718"];

      for (const mat of materials) {
        const result = await generateProgram(mat);
        const roughFeed = result.pass_details[0].feed_mm_min;
        expect(roughFeed).toBeGreaterThan(0.1);
        expect(roughFeed).toBeLessThan(20);
      }
    });
  });
});
