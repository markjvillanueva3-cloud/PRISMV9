/**
 * WEDMTier6AFixtures Integration Test
 *
 * MS-P3-TIER6A/U-P3-T6A-07
 *
 * Validates all 7 progressive die fixtures pass the geometry gate:
 *   001: D2, 25mm, 4 stations
 *   002: M2, 30mm, 5 stations
 *   003: D2, 40mm, 6 stations
 *   004: M2, 50mm, 7 stations (heavy wire)
 *   005: S7, 15mm, 4 stations (fine wire)
 *   006: S7, 60mm, 8 stations (maximum complexity)
 *   007: D2, 35mm, 8 stations (multi-slide)
 *
 * Coverage:
 *   - All fixtures load correctly
 *   - All fixtures pass geometry validation
 *   - Safety scores S(x) >= 0.70 for all
 *   - Material/thickness/station-count diversity verified
 *   - Multi-slide mode detection
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  wedmTier6GeomGateEngine,
  Tier6GeomInput,
} from "../engines/WEDMTier6GeomGateEngine.js";

const FIXTURES_DIR = join(__dirname, "fixtures");

// ══════════════════════════════════════════════════════════════════════════════
// FIXTURE LOADER
// ══════════════════════════════════════════════════════════════════════════════

function loadFixture(name: string): Tier6GeomInput {
  const path = join(FIXTURES_DIR, `${name}.json`);
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as Tier6GeomInput;
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ══════════════════════════════════════════════════════════════════════════════

describe("WEDM Tier 6A Fixtures Integration", () => {
  const fixtureNames = [
    "wedm-tier6a-001",
    "wedm-tier6a-002",
    "wedm-tier6a-003",
    "wedm-tier6a-004",
    "wedm-tier6a-005",
    "wedm-tier6a-006",
    "wedm-tier6a-007",
  ];

  const SAFETY_THRESHOLD = 0.70;

  // ────────────────────────────────────────────────────────────────────────────
  // ALL FIXTURES PASS GEOMETRY GATE
  // ────────────────────────────────────────────────────────────────────────────

  describe("geometry gate validation", () => {
    fixtureNames.forEach((name, idx) => {
      it(`${name} passes geometry validation`, () => {
        const fixture = loadFixture(name);
        const result = wedmTier6GeomGateEngine.validate(fixture);

        expect(result.success).toBe(true);
        expect(result.verdict).toBe("pass");
        expect(result.error_counts.hard_block).toBe(0);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // SAFETY SCORES >= 0.70
  // ────────────────────────────────────────────────────────────────────────────

  describe("safety scores", () => {
    fixtureNames.forEach((name) => {
      it(`${name} has S(x) >= ${SAFETY_THRESHOLD}`, () => {
        const fixture = loadFixture(name);
        const result = wedmTier6GeomGateEngine.validate(fixture);

        expect(result.safety_score).toBeGreaterThanOrEqual(SAFETY_THRESHOLD);
      });
    });

    it("batch validation returns 7 passing results", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const results = wedmTier6GeomGateEngine.validateBatch(fixtures);

      expect(results).toHaveLength(7);
      expect(results.every((r) => r.success)).toBe(true);
      expect(results.every((r) => r.safety_score >= SAFETY_THRESHOLD)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // MATERIAL DIVERSITY
  // ────────────────────────────────────────────────────────────────────────────

  describe("material diversity", () => {
    it("covers D2, M2, and S7 materials", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const materials = new Set(fixtures.map((f) => f.material));

      expect(materials.has("D2")).toBe(true);
      expect(materials.has("M2")).toBe(true);
      expect(materials.has("S7")).toBe(true);
      expect(materials.size).toBe(3);
    });

    it("D2 fixtures have 3 parts", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const d2Parts = fixtures.filter((f) => f.material === "D2");
      expect(d2Parts.length).toBe(3);
    });

    it("M2 fixtures have 2 parts", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const m2Parts = fixtures.filter((f) => f.material === "M2");
      expect(m2Parts.length).toBe(2);
    });

    it("S7 fixtures have 2 parts", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const s7Parts = fixtures.filter((f) => f.material === "S7");
      expect(s7Parts.length).toBe(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // THICKNESS RANGE
  // ────────────────────────────────────────────────────────────────────────────

  describe("thickness range", () => {
    it("spans 15mm to 60mm", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const thicknesses = fixtures.map((f) => f.thickness_mm);

      expect(Math.min(...thicknesses)).toBe(15);
      expect(Math.max(...thicknesses)).toBe(60);
    });

    it("includes thin stock (<=20mm)", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const thinParts = fixtures.filter((f) => f.thickness_mm <= 20);
      expect(thinParts.length).toBeGreaterThanOrEqual(1);
    });

    it("includes heavy stock (>=50mm)", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const heavyParts = fixtures.filter((f) => f.thickness_mm >= 50);
      expect(heavyParts.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // STATION COUNT RANGE
  // ────────────────────────────────────────────────────────────────────────────

  describe("station count range", () => {
    it("spans 4 to 8 stations", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const stationCounts = fixtures.map((f) => f.station_count ?? 0);

      expect(Math.min(...stationCounts)).toBe(4);
      expect(Math.max(...stationCounts)).toBe(8);
    });

    it("includes 4-station parts", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const fourStationParts = fixtures.filter((f) => f.station_count === 4);
      expect(fourStationParts.length).toBeGreaterThanOrEqual(2);
    });

    it("includes 8-station parts", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const eightStationParts = fixtures.filter((f) => f.station_count === 8);
      expect(eightStationParts.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // WIRE DIAMETER VARIATION
  // ────────────────────────────────────────────────────────────────────────────

  describe("wire diameter variation", () => {
    it("uses different wire diameters", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const wireDiameters = new Set(fixtures.map((f) => f.wire_diameter_mm));

      expect(wireDiameters.size).toBeGreaterThanOrEqual(2);
    });

    it("includes fine wire (0.20mm)", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const fineWireParts = fixtures.filter((f) => f.wire_diameter_mm === 0.2);
      expect(fineWireParts.length).toBeGreaterThanOrEqual(1);
    });

    it("includes heavy wire (0.30mm)", () => {
      const fixtures = fixtureNames.map((n) => loadFixture(n));
      const heavyWireParts = fixtures.filter((f) => f.wire_diameter_mm === 0.3);
      expect(heavyWireParts.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // MULTI-SLIDE DETECTION
  // ────────────────────────────────────────────────────────────────────────────

  describe("multi-slide mode", () => {
    it("fixture 007 has multi_slide_mode enabled", () => {
      const fixture = loadFixture("wedm-tier6a-007");
      expect((fixture as any).multi_slide_mode).toBe(true);
    });

    it("fixture 007 has slide_type on stations", () => {
      const fixture = loadFixture("wedm-tier6a-007");
      const stationsWithSlides = (fixture.stations ?? []).filter(
        (s: any) => s.slide_type
      );
      expect(stationsWithSlides.length).toBeGreaterThanOrEqual(4);
    });

    it("other fixtures do not have multi_slide_mode", () => {
      const nonMultiSlide = ["wedm-tier6a-001", "wedm-tier6a-002", "wedm-tier6a-003"];
      nonMultiSlide.forEach((name) => {
        const fixture = loadFixture(name);
        expect((fixture as any).multi_slide_mode).toBeFalsy();
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // PROGRESSIVE DIE MODE DETECTION
  // ────────────────────────────────────────────────────────────────────────────

  describe("progressive die mode", () => {
    it("all fixtures have progressive_die_mode enabled", () => {
      fixtureNames.forEach((name) => {
        const fixture = loadFixture(name);
        expect((fixture as any).progressive_die_mode).toBe(true);
      });
    });

    it("all fixtures have valid station_pitch_mm", () => {
      fixtureNames.forEach((name) => {
        const fixture = loadFixture(name);
        expect(fixture.station_pitch_mm).toBeGreaterThan(0);
        expect(fixture.station_pitch_mm).toBeLessThanOrEqual(50);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CORNER ACHIEVABILITY
  // ────────────────────────────────────────────────────────────────────────────

  describe("corner achievability", () => {
    it("all corners are achievable with specified wire", () => {
      fixtureNames.forEach((name) => {
        const fixture = loadFixture(name);
        const wireDia = fixture.wire_diameter_mm ?? 0.25;
        const gap = fixture.spark_gap_mm ?? 0.025;
        const minRadius = wireDia + 2 * gap;

        (fixture.corners ?? []).forEach((corner) => {
          expect(corner.radius_mm).toBeGreaterThanOrEqual(minRadius);
        });
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // SLOT ACHIEVABILITY
  // ────────────────────────────────────────────────────────────────────────────

  describe("slot achievability", () => {
    it("all slots are cuttable with specified wire", () => {
      fixtureNames.forEach((name) => {
        const fixture = loadFixture(name);
        const wireDia = fixture.wire_diameter_mm ?? 0.25;
        const gap = fixture.spark_gap_mm ?? 0.025;
        const minSlotWidth = wireDia + 2 * gap;

        (fixture.slots ?? []).forEach((slot) => {
          expect(slot.width_mm).toBeGreaterThanOrEqual(minSlotWidth);
        });
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // MACHINE ENVELOPE
  // ────────────────────────────────────────────────────────────────────────────

  describe("machine envelope", () => {
    it("all parts fit within machine envelope", () => {
      fixtureNames.forEach((name) => {
        const fixture = loadFixture(name);
        const envX = fixture.machine_envelope_x_mm ?? 500;
        const envY = fixture.machine_envelope_y_mm ?? 350;
        const envZ = fixture.machine_envelope_z_mm ?? 250;

        expect(fixture.part_width_mm).toBeLessThan(envX);
        expect(fixture.part_height_mm).toBeLessThan(envY);
        expect(fixture.thickness_mm).toBeLessThan(envZ);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // REFERENCE VALUES
  // ────────────────────────────────────────────────────────────────────────────

  describe("reference values", () => {
    it("all fixtures have reference toolpath length", () => {
      fixtureNames.forEach((name) => {
        const fixture = loadFixture(name);
        expect((fixture as any).reference_toolpath_length_mm).toBeGreaterThan(0);
      });
    });

    it("all fixtures have reference NC line count", () => {
      fixtureNames.forEach((name) => {
        const fixture = loadFixture(name);
        expect((fixture as any).reference_nc_lines).toBeGreaterThan(0);
      });
    });

    it("toolpath length scales with complexity", () => {
      const f001 = loadFixture("wedm-tier6a-001");
      const f006 = loadFixture("wedm-tier6a-006");

      // 8-station fixture should have longer toolpath than 4-station
      expect((f006 as any).reference_toolpath_length_mm).toBeGreaterThan(
        (f001 as any).reference_toolpath_length_mm
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // METADATA COMPLETENESS
  // ────────────────────────────────────────────────────────────────────────────

  describe("metadata completeness", () => {
    it("all fixtures have valid metadata", () => {
      fixtureNames.forEach((name) => {
        const fixture = loadFixture(name);
        const meta = (fixture as any).metadata;

        expect(meta).toBeDefined();
        expect(meta.created).toBeDefined();
        expect(meta.source).toContain("MS-P3-TIER6A");
        expect(meta.description).toBeTruthy();
        expect(meta.jm_die_reference).toBeTruthy();
      });
    });
  });
});
