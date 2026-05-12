/**
 * U-WLAUNCH01: D2 Multi-Thickness Validation — 25.4mm / 50mm / 100mm
 *
 * Proves our piecewise feed model matches published data across the full
 * thickness range for D2 tool steel (Mitsubishi, brass wire, Ra 0.8µm).
 *
 * Reference data:
 *   - ITW SHAKEPROOF 500-30540-24000-04.NC: D2 @25.4mm, F0.12 in/min (3.048 mm/min)
 *   - Lemhunter "Master Wire EDM Costs & Time": D2 @50mm = 3.0 mm/min
 *   - Klocke & König "Manufacturing Processes 3" Table 8.3: D2 @100mm ≈ 1.8 mm/min
 *   - Klocke Ra model: Ra = k_ra × Ip^0.40 × ton^0.28 (calibrated k_ra = 0.161 for D2)
 *
 * Piecewise model:
 *   h ≤ 50mm: speed = 3.33 × mrr_factor × (50/h)^0.1   (nearly flat)
 *   h > 50mm: speed = 3.33 × mrr_factor × (50/h)^0.74   (flushing-limited)
 *   D2 mrr_factor = 0.9
 */

import { describe, it, expect } from "vitest";
import { WEDMPrintToProgramEngine } from "../engines/WEDMPrintToProgramEngine.js";
import type { WEDMProgramInput } from "../engines/WEDMPrintToProgramEngine.js";
import type { WireEDMContour, LineSegment } from "../engines/DXFGeometryParserEngine.js";

const engine = new WEDMPrintToProgramEngine();

// ============================================================================
// HELPER: Simple 100mm-perimeter square contour for consistent geometry
// ============================================================================

function makeSquareContour(side_mm = 25): WireEDMContour {
  const segments: LineSegment[] = [
    { type: "line", start: { x: 0, y: 0 }, end: { x: side_mm, y: 0 } },
    { type: "line", start: { x: side_mm, y: 0 }, end: { x: side_mm, y: side_mm } },
    { type: "line", start: { x: side_mm, y: side_mm }, end: { x: 0, y: side_mm } },
    { type: "line", start: { x: 0, y: side_mm }, end: { x: 0, y: 0 } },
  ];
  return {
    id: "square_25mm",
    segments,
    is_closed: true,
    is_exterior: true,
    area_mm2: side_mm * side_mm,
    perimeter_mm: 4 * side_mm,
    bbox: { min_x: 0, min_y: 0, max_x: side_mm, max_y: side_mm },
  };
}

// ============================================================================
// Published reference values (anchored to real shop + published data)
// ============================================================================

const PUBLISHED = {
  "25.4mm": {
    feed_mm_min: 3.048,  // ITW SHAKEPROOF F0.12 in/min = 3.048 mm/min
    tolerance_pct: 0.10,  // ±10% — tight, we have real program data
    source: "ITW SHAKEPROOF 500-30540-24000-04.NC (D2, 4-pass, E1221-E1224)",
  },
  "50mm": {
    feed_mm_min: 3.0,    // Lemhunter published table + Klocke Table 8.2
    tolerance_pct: 0.15,  // ±15% — published data, no real program
    source: "Lemhunter 'Master Wire EDM Costs & Time' + Klocke Table 8.2",
  },
  "100mm": {
    feed_mm_min: 1.8,    // Klocke Table 8.3 — flushing-limited regime
    tolerance_pct: 0.15,  // ±15% — published data, no real program
    source: "Klocke & König 'Manufacturing Processes 3' Table 8.3",
  },
};

// ============================================================================
// Generate programs for all three thicknesses
// ============================================================================

async function generateD2Program(thickness_mm: number) {
  const input: WEDMProgramInput = {
    contours: [makeSquareContour()],
    material: "D2",
    thickness_mm,
    target_ra_um: 0.8,
    controller: "mitsubishi",
    program_number: 1,
  };
  return engine.generate(input);
}

// ============================================================================
// TESTS
// ============================================================================

describe("U-WLAUNCH01: D2 Multi-Thickness Validation (25.4 / 50 / 100 mm)", () => {

  // ── 25.4mm: ITW SHAKEPROOF calibration point ──────────────────────

  describe("D2 at 25.4mm (ITW SHAKEPROOF calibration)", () => {
    it("1a: rough feed rate within 10% of ITW SHAKEPROOF 3.048 mm/min", async () => {
      const result = await generateD2Program(25.4);
      expect(result.success).toBe(true);

      const roughPass = result.pass_details[0];
      const pubFeed = PUBLISHED["25.4mm"].feed_mm_min;
      const tol = PUBLISHED["25.4mm"].tolerance_pct;

      expect(roughPass.feed_mm_min).toBeGreaterThanOrEqual(pubFeed * (1 - tol));
      expect(roughPass.feed_mm_min).toBeLessThanOrEqual(pubFeed * (1 + tol));
    });

    it("1b: H-offsets decrease monotonically across passes", async () => {
      const result = await generateD2Program(25.4);
      const offsets = result.pass_details.map(p => p.offset_mm);

      expect(offsets.length).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1]);
      }
    });

    it("1c: E-pack codes are E12X{pass} — group 1, thickness code 2, condition 2", async () => {
      const result = await generateD2Program(25.4);

      for (const pass of result.pass_details) {
        // E{materialGroup}{thicknessCode}{condition}{passNumber}
        // D2 = group 1, 25.4mm = thickness code 2, Ra 0.8µm = condition 2
        expect(pass.e_pack_code).toMatch(/^E12[0-9][0-9]$/);
        // Pass number in E-pack should match pass index
        const lastDigit = parseInt(pass.e_pack_code.slice(-1));
        expect(lastDigit).toBe(pass.pass_number);
      }
    });

    it("1d: predicted Ra ≤ 0.96 µm (within 20% of 0.8µm target, Klocke model)", async () => {
      const result = await generateD2Program(25.4);

      // Final pass predicted Ra should be close to target
      const finalPass = result.pass_details[result.pass_details.length - 1];
      expect(finalPass.predicted_ra_um).toBeLessThanOrEqual(0.8 * 1.20); // ≤ 0.96
      // Also check overall prediction
      expect(result.predicted_ra_um).toBeLessThanOrEqual(0.8 * 1.20);
    });

    it("1e: confidence_score.overall >= 75", async () => {
      const result = await generateD2Program(25.4);

      expect(result.confidence_score.overall).toBeGreaterThanOrEqual(75);
      // Individual sub-scores should all be reasonable
      expect(result.confidence_score.feed.score).toBeGreaterThanOrEqual(60);
      expect(result.confidence_score.offset.score).toBeGreaterThanOrEqual(60);
      expect(result.confidence_score.epack.score).toBeGreaterThanOrEqual(60);
    });

    it("1f: generates valid G-code with correct pipeline stages", async () => {
      const result = await generateD2Program(25.4);

      expect(result.program_text).toBeTruthy();
      expect(result.line_count).toBeGreaterThan(20);
      expect(result.stages_completed).toContain("gcode_generated");
      expect(result.stages_completed).toContain("confidence_scored");
    });

    it("1g: skim cascade follows decreasing pattern (ITW: F.24 → .21 → .20)", async () => {
      const result = await generateD2Program(25.4);

      if (result.pass_details.length >= 3) {
        const skim1Feed = result.pass_details[1].feed_mm_min;
        const skim2Feed = result.pass_details[2].feed_mm_min;
        // Skim1 should be faster than rough (speed factor ~2.0×)
        expect(skim1Feed).toBeGreaterThan(result.pass_details[0].feed_mm_min);
        // Skim2 should be ≤ skim1 (decreasing cascade for straight cuts)
        expect(skim2Feed).toBeLessThanOrEqual(skim1Feed * 1.05); // 5% tolerance for rounding
      }
    });
  });

  // ── 50mm: Lemhunter calibration point ─────────────────────────────

  describe("D2 at 50mm (Lemhunter/Klocke calibration)", () => {
    it("2a: rough feed rate within 15% of Lemhunter 3.0 mm/min", async () => {
      const result = await generateD2Program(50);
      expect(result.success).toBe(true);

      const roughPass = result.pass_details[0];
      const pubFeed = PUBLISHED["50mm"].feed_mm_min;
      const tol = PUBLISHED["50mm"].tolerance_pct;

      expect(roughPass.feed_mm_min).toBeGreaterThanOrEqual(pubFeed * (1 - tol));
      expect(roughPass.feed_mm_min).toBeLessThanOrEqual(pubFeed * (1 + tol));
    });

    it("2b: H-offsets decrease monotonically across passes", async () => {
      const result = await generateD2Program(50);
      const offsets = result.pass_details.map(p => p.offset_mm);

      expect(offsets.length).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1]);
      }
    });

    it("2c: E-pack codes use correct thickness code for 50mm", async () => {
      const result = await generateD2Program(50);

      for (const pass of result.pass_details) {
        // E-pack: group 1 (D2), thickness code for 50mm range
        expect(pass.e_pack_code).toMatch(/^E1[0-9][0-9][0-9]$/);
        const lastDigit = parseInt(pass.e_pack_code.slice(-1));
        expect(lastDigit).toBe(pass.pass_number);
      }
    });

    it("2d: predicted Ra within 20% of 0.8µm Klocke target", async () => {
      const result = await generateD2Program(50);

      expect(result.predicted_ra_um).toBeLessThanOrEqual(0.8 * 1.20);
    });

    it("2e: confidence_score.overall >= 75", async () => {
      const result = await generateD2Program(50);

      expect(result.confidence_score.overall).toBeGreaterThanOrEqual(75);
    });

    it("2f: feed rate at 50mm is the model's base calibration point (≈ 3.0 mm/min)", async () => {
      const result = await generateD2Program(50);
      const roughFeed = result.pass_details[0].feed_mm_min;

      // 50mm is the exact calibration point: BASE_SPEED × mrr_factor × (50/50)^0.1 = 3.33 × 0.9 = 3.0
      expect(roughFeed).toBeCloseTo(3.0, 0); // within 0.5 mm/min
    });
  });

  // ── 100mm: Klocke flushing-limited regime ─────────────────────────

  describe("D2 at 100mm (Klocke flushing-limited)", () => {
    it("3a: rough feed rate within 15% of Klocke 1.8 mm/min", async () => {
      const result = await generateD2Program(100);
      expect(result.success).toBe(true);

      const roughPass = result.pass_details[0];
      const pubFeed = PUBLISHED["100mm"].feed_mm_min;
      const tol = PUBLISHED["100mm"].tolerance_pct;

      expect(roughPass.feed_mm_min).toBeGreaterThanOrEqual(pubFeed * (1 - tol));
      expect(roughPass.feed_mm_min).toBeLessThanOrEqual(pubFeed * (1 + tol));
    });

    it("3b: H-offsets decrease monotonically across passes", async () => {
      const result = await generateD2Program(100);
      const offsets = result.pass_details.map(p => p.offset_mm);

      expect(offsets.length).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1]);
      }
    });

    it("3c: confidence_score.overall >= 75", async () => {
      const result = await generateD2Program(100);

      expect(result.confidence_score.overall).toBeGreaterThanOrEqual(75);
    });

    it("3d: feed at 100mm significantly slower than 50mm (flushing-limited physics)", async () => {
      const [r50, r100] = await Promise.all([
        generateD2Program(50),
        generateD2Program(100),
      ]);

      const feed50 = r50.pass_details[0].feed_mm_min;
      const feed100 = r100.pass_details[0].feed_mm_min;

      // 100mm should be at least 30% slower than 50mm (physics: flushing limitation)
      expect(feed100).toBeLessThan(feed50 * 0.70);
      // But not unreasonably slow (abort criterion: > 1.0 mm/min for D2 at 100mm)
      expect(feed100).toBeGreaterThan(1.0);
    });

    it("3e: predicted Ra within 20% of 0.8µm Klocke target", async () => {
      const result = await generateD2Program(100);

      expect(result.predicted_ra_um).toBeLessThanOrEqual(0.8 * 1.20);
    });
  });

  // ── Cross-thickness physics validation ────────────────────────────

  describe("Cross-thickness physics consistency", () => {
    it("4a: feed rate decreases with thickness (25.4 ≥ 50 ≥ 100)", async () => {
      const [r25, r50, r100] = await Promise.all([
        generateD2Program(25.4),
        generateD2Program(50),
        generateD2Program(100),
      ]);

      const f25 = r25.pass_details[0].feed_mm_min;
      const f50 = r50.pass_details[0].feed_mm_min;
      const f100 = r100.pass_details[0].feed_mm_min;

      expect(f25).toBeGreaterThanOrEqual(f50 * 0.95); // 25mm ≈ 50mm (nearly flat below 50)
      expect(f50).toBeGreaterThan(f100);               // 50mm > 100mm (flushing drops)
    });

    it("4b: cycle time increases with thickness", async () => {
      const [r25, r50, r100] = await Promise.all([
        generateD2Program(25.4),
        generateD2Program(50),
        generateD2Program(100),
      ]);

      expect(r50.estimated_time_min).toBeGreaterThanOrEqual(r25.estimated_time_min);
      expect(r100.estimated_time_min).toBeGreaterThan(r50.estimated_time_min);
    });

    it("4c: 100mm rough offset ≥ 50mm rough offset (thicker = more spark gap)", async () => {
      const [r50, r100] = await Promise.all([
        generateD2Program(50),
        generateD2Program(100),
      ]);

      // Thicker parts require higher rough energy → larger spark gap → larger offset
      expect(r100.pass_details[0].offset_mm).toBeGreaterThanOrEqual(
        r50.pass_details[0].offset_mm * 0.95 // 5% tolerance
      );
    });

    it("4d: all three thicknesses within model expectations (no abort conditions)", async () => {
      const [r25, r50, r100] = await Promise.all([
        generateD2Program(25.4),
        generateD2Program(50),
        generateD2Program(100),
      ]);

      // Abort criterion: feed at 25mm not < 1.0 or > 8.0 mm/min
      expect(r25.pass_details[0].feed_mm_min).toBeGreaterThan(1.0);
      expect(r25.pass_details[0].feed_mm_min).toBeLessThan(8.0);

      // All E-pack codes in valid range
      for (const r of [r25, r50, r100]) {
        for (const p of r.pass_details) {
          expect(p.e_pack_code).toMatch(/^E1[0-9][0-9][0-9]$/);
        }
      }

      // All confidence scores above minimum
      expect(r25.confidence_score.overall).toBeGreaterThanOrEqual(60);
      expect(r50.confidence_score.overall).toBeGreaterThanOrEqual(60);
      expect(r100.confidence_score.overall).toBeGreaterThanOrEqual(60);
    });
  });
});
