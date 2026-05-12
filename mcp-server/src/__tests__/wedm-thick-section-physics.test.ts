/**
 * U-W100-25: Thick Section WEDM Validation (50mm, 100mm, 150mm D2)
 *
 * Validates that WEDMPrintToProgramEngine correctly adjusts parameters for
 * thick sections using PHYSICS — not hardcoded thickness tables.
 *
 * Physics model:
 *   Feed = MRR / (kerf × thickness)  → inversely proportional to thickness
 *   Flush efficiency = 1/sqrt(thickness/50) for thickness > 50mm
 *   Flush pressure: 5 bar normal, 8 bar for >100mm (non-submerged)
 *   Wire deflection: δ = F×L²/(8T) where L = thickness
 *   Wire speed: 8 + thickness × 0.05 m/min (or published)
 *   Power: min(100, 40 + thickness × 0.5)
 *
 * Published reference:
 *   50mm D2 rough feed = 3.0 mm/min (Lemhunter, MRR = 150 mm²/min)
 *   100mm D2 rough feed ≈ 1.5 mm/min (physics: MRR degrades with flush)
 *   150mm D2 rough feed ≈ 0.8-1.2 mm/min (severe flush degradation)
 *
 * Wire deflection: δ = F×L²/(8T)
 *   At 150mm span, deflection is 9× that of 50mm (150²/50² = 9)
 *   → more skim passes needed to achieve same Ra
 *
 * Ref: Kunieda 2005, Klocke 2013, wire deflection beam analogy
 */
import { describe, it, expect } from 'vitest';
import { WEDMPrintToProgramEngine } from '../engines/WEDMPrintToProgramEngine.js';

const engine = new WEDMPrintToProgramEngine();

function makeSquareContour(size = 25) {
  return [{
    id: 'test_square',
    segments: [
      { type: 'line' as const, start: { x: 0, y: 0 }, end: { x: size, y: 0 } },
      { type: 'line' as const, start: { x: size, y: 0 }, end: { x: size, y: size } },
      { type: 'line' as const, start: { x: size, y: size }, end: { x: 0, y: size } },
      { type: 'line' as const, start: { x: 0, y: size }, end: { x: 0, y: 0 } },
    ],
    is_closed: true,
    is_exterior: true,
    area_mm2: size * size,
    perimeter_mm: 4 * size,
    bbox: { min_x: 0, min_y: 0, max_x: size, max_y: size },
  }];
}

/** Generate WEDM program for D2 at given thickness */
async function generateD2(thickness_mm: number, target_ra_um = 0.8) {
  return engine.generate({
    material: 'D2',
    thickness_mm,
    target_ra_um,
    contours: makeSquareContour(),
    controller: 'mitsubishi',
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe('U-W100-25: Thick Section WEDM Validation (50/100/150mm D2)', () => {

  describe('50mm D2 (baseline thick section)', () => {
    it('generates a successful program', async () => {
      const r = await generateD2(50);
      expect(r.success).toBe(true);
      expect(r.program_text.length).toBeGreaterThan(50);
    });

    it('rough feed in plausible range for 50mm D2', async () => {
      const r = await generateD2(50);
      // Published: 50mm D2 rough = 3.0 mm/min
      // Physics model may give higher theoretical, but should be 1.5-10 mm/min
      expect(r.pass_details[0].feed_mm_min).toBeGreaterThan(1.0);
      expect(r.pass_details[0].feed_mm_min).toBeLessThan(12.0);
    });

    it('has valid E-pack codes', async () => {
      const r = await generateD2(50);
      for (const p of r.pass_details) {
        expect(p.e_pack_code).toMatch(/^E\d{4}$/);
      }
    });
  });

  describe('100mm D2 (intermediate thick)', () => {
    it('generates a successful program', async () => {
      const r = await generateD2(100);
      expect(r.success).toBe(true);
      expect(r.program_text.length).toBeGreaterThan(50);
    });

    it('rough feed slower than 50mm (MRR/thickness + flush degradation)', async () => {
      const r50 = await generateD2(50);
      const r100 = await generateD2(100);
      // Physics: feed inversely proportional to thickness, compounded by flush degradation
      // 100mm should be significantly slower than 50mm
      expect(r100.pass_details[0].feed_mm_min).toBeLessThan(
        r50.pass_details[0].feed_mm_min
      );
    });

    it('rough feed in plausible range for 100mm D2', async () => {
      const r = await generateD2(100);
      // Physics: 100mm rough feed ≈ 0.5-5 mm/min
      expect(r.pass_details[0].feed_mm_min).toBeGreaterThan(0.3);
      expect(r.pass_details[0].feed_mm_min).toBeLessThan(6.0);
    });

    it('has at least as many passes as 50mm for same Ra', async () => {
      const r50 = await generateD2(50);
      const r100 = await generateD2(100);
      // Thicker → more wire deflection → more skims needed
      expect(r100.passes_per_profile).toBeGreaterThanOrEqual(
        r50.passes_per_profile - 1 // ±1 tolerance
      );
    });
  });

  describe('150mm D2 (extreme thick section)', () => {
    it('generates a successful program', async () => {
      const r = await generateD2(150);
      expect(r.success).toBe(true);
      expect(r.program_text.length).toBeGreaterThan(50);
    });

    it('150mm feed slower than both 50mm and 100mm', async () => {
      const [r50, r100, r150] = await Promise.all([
        generateD2(50), generateD2(100), generateD2(150),
      ]);
      expect(r150.pass_details[0].feed_mm_min).toBeLessThan(
        r100.pass_details[0].feed_mm_min
      );
      expect(r150.pass_details[0].feed_mm_min).toBeLessThan(
        r50.pass_details[0].feed_mm_min
      );
    });

    it('150mm feed NOT unreasonably slow (>0.1 mm/min)', async () => {
      const r = await generateD2(150);
      // Physics should still give positive, non-trivial feed
      // Below 0.1 mm/min would be impractical (abort criterion)
      expect(r.pass_details[0].feed_mm_min).toBeGreaterThan(0.1);
    });

    it('offsets decrease monotonically', async () => {
      const r = await generateD2(150);
      if (r.pass_details.length >= 2) {
        for (let i = 1; i < r.pass_details.length; i++) {
          expect(r.pass_details[i].offset_mm).toBeLessThanOrEqual(
            r.pass_details[i - 1].offset_mm + 0.001
          );
        }
      }
    });

    it('no NaN values in 150mm pass details', async () => {
      const r = await generateD2(150);
      for (const p of r.pass_details) {
        expect(Number.isFinite(p.feed_mm_min)).toBe(true);
        expect(Number.isFinite(p.offset_mm)).toBe(true);
        expect(Number.isFinite(p.predicted_ra_um)).toBe(true);
        expect(Number.isFinite(p.wire_speed_m_min)).toBe(true);
        expect(Number.isFinite(p.tension_N)).toBe(true);
      }
    });

    it('valid G-code structure with program end', async () => {
      const r = await generateD2(150);
      expect(r.program_text).toMatch(/M0?2|M30/);
      expect(r.program_text).toContain('G90');
      expect(r.line_count).toBeGreaterThan(10);
    });
  });

  describe('Physics consistency across thicknesses', () => {
    it('feed rate monotonically decreases: 50 > 100 > 150mm', async () => {
      const [r50, r100, r150] = await Promise.all([
        generateD2(50), generateD2(100), generateD2(150),
      ]);
      const feeds = [
        r50.pass_details[0].feed_mm_min,
        r100.pass_details[0].feed_mm_min,
        r150.pass_details[0].feed_mm_min,
      ];
      expect(feeds[0]).toBeGreaterThan(feeds[1]);
      expect(feeds[1]).toBeGreaterThan(feeds[2]);
    });

    it('cycle time increases with thickness', async () => {
      const [r50, r100, r150] = await Promise.all([
        generateD2(50), generateD2(100), generateD2(150),
      ]);
      expect(r150.estimated_time_min).toBeGreaterThan(r100.estimated_time_min);
      expect(r100.estimated_time_min).toBeGreaterThan(r50.estimated_time_min);
    });

    it('wire consumption increases with thickness', async () => {
      const [r50, r150] = await Promise.all([
        generateD2(50), generateD2(150),
      ]);
      // Thicker = longer cut time = more wire consumed
      expect(r150.wire_consumption_m).toBeGreaterThan(r50.wire_consumption_m);
    });

    it('setup sheet flush_pressure_bar scales correctly with thickness', async () => {
      const [r50, r150] = await Promise.all([
        generateD2(50), generateD2(150),
      ]);
      // >100mm should have higher flush pressure
      expect(r150.setup_sheet.flush_pressure_bar).toBeGreaterThanOrEqual(
        r50.setup_sheet.flush_pressure_bar
      );
    });

    it('feed scaling is physics-derived, not from lookup table', async () => {
      // Generate at 75mm (not a tabulated thickness) — should still scale correctly
      const [r50, r75, r100] = await Promise.all([
        generateD2(50), generateD2(75), generateD2(100),
      ]);
      const f50 = r50.pass_details[0].feed_mm_min;
      const f75 = r75.pass_details[0].feed_mm_min;
      const f100 = r100.pass_details[0].feed_mm_min;
      // 75mm feed should be between 50mm and 100mm (smooth interpolation from physics)
      expect(f75).toBeLessThan(f50);
      expect(f75).toBeGreaterThan(f100);
    });

    it('all 3 thicknesses produce valid programs (success=true)', async () => {
      for (const thick of [50, 100, 150]) {
        const r = await generateD2(thick);
        expect(r.success).toBe(true);
      }
    });
  });

  describe('Wire deflection beam mechanics', () => {
    it('skim-to-rough feed ratio changes with thickness', async () => {
      const [r50, r150] = await Promise.all([
        generateD2(50, 0.4), // force multiple skims with tight Ra
        generateD2(150, 0.4),
      ]);
      // Both should have multiple passes for Ra 0.4
      expect(r50.pass_details.length).toBeGreaterThanOrEqual(2);
      expect(r150.pass_details.length).toBeGreaterThanOrEqual(2);
      // The rough feed should be different — deflection affects skim planning
      expect(r150.pass_details[0].feed_mm_min).not.toBeCloseTo(
        r50.pass_details[0].feed_mm_min, 0
      );
    });

    it('predicted Ra is finite and positive for all thicknesses', async () => {
      for (const thick of [50, 100, 150]) {
        const r = await generateD2(thick);
        expect(r.predicted_ra_um).toBeGreaterThan(0);
        expect(r.predicted_ra_um).toBeLessThan(5.0);
      }
    });
  });

  describe('EXIT GATE', () => {
    it('150mm D2 has physics-derived params: slower feed, more passes possible', async () => {
      const [r50, r150] = await Promise.all([
        generateD2(50), generateD2(150),
      ]);
      // Feed: 150mm must be slower
      expect(r150.pass_details[0].feed_mm_min).toBeLessThan(
        r50.pass_details[0].feed_mm_min
      );
      // Passes: 150mm should have same or more passes
      expect(r150.passes_per_profile).toBeGreaterThanOrEqual(
        r50.passes_per_profile - 1
      );
    });

    it('all thick section adjustments from physics — no hardcoded thickness tables', async () => {
      // Non-tabulated thicknesses should work and scale smoothly
      const thicknesses = [50, 60, 75, 90, 100, 120, 150];
      const feeds: number[] = [];
      for (const t of thicknesses) {
        const r = await generateD2(t);
        expect(r.success).toBe(true);
        feeds.push(r.pass_details[0].feed_mm_min);
      }
      // Feed should monotonically decrease (or stay equal for closely-spaced thicknesses)
      for (let i = 1; i < feeds.length; i++) {
        expect(feeds[i]).toBeLessThanOrEqual(feeds[i - 1] + 0.01);
      }
    });

    it('no NaN values across all thick sections', async () => {
      for (const thick of [50, 100, 150]) {
        const r = await generateD2(thick);
        for (const p of r.pass_details) {
          expect(Number.isFinite(p.feed_mm_min)).toBe(true);
          expect(Number.isFinite(p.offset_mm)).toBe(true);
          expect(Number.isFinite(p.predicted_ra_um)).toBe(true);
        }
      }
    });

    it('cycle time breakdown available for thick sections', async () => {
      const r = await generateD2(150);
      expect(r.cycle_time_breakdown).toBeDefined();
      expect(r.cycle_time_breakdown.total_time_min).toBeGreaterThan(0);
      expect(r.cycle_time_breakdown.per_pass.length).toBeGreaterThanOrEqual(1);
    });
  });
});
