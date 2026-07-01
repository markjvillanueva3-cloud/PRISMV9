/**
 * HM-KC-MS2 Workholding Parameter Schema Tests
 *
 * Tests for U-HKC12 (Workholding Parameter Schemas).
 * All tests validate specific values, ranges, and parsing behavior — no toBeTruthy() stubs.
 *
 * @milestone HM-KC-MS2
 */

import { describe, it, expect } from "vitest";
import {
  fixtureBodySchema,
  softJawSchema,
  viseSchema,
  chuckColletSchema,
  tombstonePalletSchema,
  vacuumMagneticSchema,
  WORKHOLDING_SCHEMA_MAP,
  WORKHOLDING_METADATA,
  WORKHOLDING_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/fixture/workholdingSchemas.js";

// ═══════════════════════════════════════════════════════════════════════════════
// U-HKC12: Workholding Parameter Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("U-HKC12: Workholding Parameter Schemas", () => {
  // ── Schema map completeness ─────────────────────────────────────────────

  describe("Schema map completeness", () => {
    it("has exactly 6 device types in WORKHOLDING_SCHEMA_MAP", () => {
      const keys = Object.keys(WORKHOLDING_SCHEMA_MAP);
      expect(keys).toHaveLength(6);
    });

    it("contains expected device type keys", () => {
      const keys = Object.keys(WORKHOLDING_SCHEMA_MAP);
      expect(keys).toContain("fixture_body");
      expect(keys).toContain("soft_jaw");
      expect(keys).toContain("vise");
      expect(keys).toContain("chuck_collet");
      expect(keys).toContain("tombstone_pallet");
      expect(keys).toContain("vacuum_magnetic");
    });

    it("has total param count between 54 and 64", () => {
      expect(WORKHOLDING_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(54);
      expect(WORKHOLDING_TOTAL_PARAM_COUNT).toBeLessThanOrEqual(64);
    });

    it("has total param count equal to 54", () => {
      expect(WORKHOLDING_TOTAL_PARAM_COUNT).toBe(54);
    });
  });

  // ── Fixture Body ────────────────────────────────────────────────────────

  describe("Fixture Body schema", () => {
    it("accepts valid fixture body with all required fields", () => {
      const result = fixtureBodySchema.safeParse({
        import_source: "step",
        position_x: 0,
        position_y: 0,
        position_z: 0,
        rotation_a: 0,
        rotation_b: 0,
        rotation_c: 0,
        clamp_zone_offset: 5,
        visible_in_simulation: true,
        transparency: 0.5,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid import_source enum value", () => {
      const result = fixtureBodySchema.safeParse({
        import_source: "stl",
        position_x: 0,
        position_y: 0,
        position_z: 0,
        rotation_a: 0,
        rotation_b: 0,
        rotation_c: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects position_x outside range (-10000..10000)", () => {
      const result = fixtureBodySchema.safeParse({
        import_source: "step",
        position_x: 20000,
        position_y: 0,
        position_z: 0,
        rotation_a: 0,
        rotation_b: 0,
        rotation_c: 0,
      });
      expect(result.success).toBe(false);
    });

    it("applies default clamp_zone_offset of 5", () => {
      const result = fixtureBodySchema.parse({
        import_source: "native",
        position_x: 100,
        position_y: -50,
        position_z: 200,
        rotation_a: 90,
        rotation_b: 0,
        rotation_c: 45,
      });
      expect(result.clamp_zone_offset).toBe(5);
      expect(result.visible_in_simulation).toBe(true);
      expect(result.transparency).toBe(0.5);
    });
  });

  // ── Vise ────────────────────────────────────────────────────────────────

  describe("Vise schema", () => {
    const validVise = {
      jaw_width: 150,
      max_opening: 200,
      stop_position: 100,
      parallels_height: 25,
      clamping_force: 25000,
      jaw_surface: "smooth" as const,
      double_station: false,
      low_profile: false,
      angular_offset: 0,
    };

    it("rejects jaw_width of 10mm (below 25mm minimum)", () => {
      const result = viseSchema.safeParse({ ...validVise, jaw_width: 10 });
      expect(result.success).toBe(false);
    });

    it("accepts jaw_width of 150mm (within 25..500 range)", () => {
      const result = viseSchema.safeParse(validVise);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.jaw_width).toBe(150);
      }
    });

    it("rejects jaw_width of 600mm (above 500mm maximum)", () => {
      const result = viseSchema.safeParse({ ...validVise, jaw_width: 600 });
      expect(result.success).toBe(false);
    });

    it("accepts all jaw_surface enum values", () => {
      for (const surface of ["smooth", "serrated", "machinable"] as const) {
        const result = viseSchema.safeParse({ ...validVise, jaw_surface: surface });
        expect(result.success).toBe(true);
      }
    });

    it("applies default jaw_width of 150 when omitted", () => {
      const { jaw_width: _, ...withoutJawWidth } = validVise;
      const result = viseSchema.parse(withoutJawWidth);
      expect(result.jaw_width).toBe(150);
    });

    it("accepts optional vise_model string", () => {
      const result = viseSchema.safeParse({ ...validVise, vise_model: "Kurt D675" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vise_model).toBe("Kurt D675");
      }
    });
  });

  // ── Chuck/Collet ──────────────────────────────────────────────────────

  describe("Chuck/Collet schema", () => {
    const validChuck = {
      chuck_type: "3_jaw" as const,
      grip_diameter: 50,
      grip_force: 20000,
      jaw_configuration: "hard" as const,
      max_rpm: 3000,
      jaw_mass_each: 0.5,
      grip_length: 30,
      concentricity_tolerance: 0.01,
      pull_back_force: 0,
    };

    it("accepts all chuck_type enum values", () => {
      const types = ["3_jaw", "4_jaw", "6_jaw", "collet", "power_chuck"] as const;
      expect(types).toHaveLength(5);
      for (const ct of types) {
        const result = chuckColletSchema.safeParse({ ...validChuck, chuck_type: ct });
        expect(result.success).toBe(true);
      }
    });

    it("rejects grip_force below 50N minimum", () => {
      const result = chuckColletSchema.safeParse({ ...validChuck, grip_force: 10 });
      expect(result.success).toBe(false);
    });

    it("accepts grip_force of 500000N (maximum)", () => {
      const result = chuckColletSchema.safeParse({ ...validChuck, grip_force: 500000 });
      expect(result.success).toBe(true);
    });

    it("rejects grip_force above 500000N", () => {
      const result = chuckColletSchema.safeParse({ ...validChuck, grip_force: 600000 });
      expect(result.success).toBe(false);
    });

    it("rejects grip_diameter below 0.5mm", () => {
      const result = chuckColletSchema.safeParse({ ...validChuck, grip_diameter: 0.1 });
      expect(result.success).toBe(false);
    });

    it("accepts optional collet_size string", () => {
      const result = chuckColletSchema.safeParse({ ...validChuck, collet_size: "ER32" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.collet_size).toBe("ER32");
      }
    });

    it("applies default concentricity_tolerance of 0.01", () => {
      const { concentricity_tolerance: _, ...withoutConcentricity } = validChuck;
      const result = chuckColletSchema.parse(withoutConcentricity);
      expect(result.concentricity_tolerance).toBe(0.01);
    });
  });

  // ── Vacuum/Magnetic ───────────────────────────────────────────────────

  describe("Vacuum/Magnetic schema", () => {
    const validVacuum = {
      hold_type: "vacuum" as const,
      zone_count: 4,
      hold_force_per_zone: 5000,
      seal_type: "gasket" as const,
      surface_flatness_req: 0.05,
      part_min_thickness: 10,
      magnetic_field_depth: 0,
      leak_test_pressure: 0.85,
    };

    it("accepts all hold_type enum values", () => {
      const types = ["vacuum", "magnetic", "electro_magnetic"] as const;
      expect(types).toHaveLength(3);
      for (const ht of types) {
        const result = vacuumMagneticSchema.safeParse({ ...validVacuum, hold_type: ht });
        expect(result.success).toBe(true);
      }
    });

    it("rejects hold_force_per_zone below 10N", () => {
      const result = vacuumMagneticSchema.safeParse({ ...validVacuum, hold_force_per_zone: 5 });
      expect(result.success).toBe(false);
    });

    it("accepts hold_force_per_zone at 50000N maximum", () => {
      const result = vacuumMagneticSchema.safeParse({ ...validVacuum, hold_force_per_zone: 50000 });
      expect(result.success).toBe(true);
    });

    it("applies default leak_test_pressure of 0.85 bar", () => {
      const { leak_test_pressure: _, ...withoutLeak } = validVacuum;
      const result = vacuumMagneticSchema.parse(withoutLeak);
      expect(result.leak_test_pressure).toBeCloseTo(0.85, 2);
    });
  });

  // ── Soft Jaw ──────────────────────────────────────────────────────────

  describe("Soft Jaw schema", () => {
    it("rejects bore_diameter below 1mm", () => {
      const result = softJawSchema.safeParse({
        jaw_type: "round",
        bore_diameter: 0.5,
        jaw_height: 50,
        grip_depth: 10,
        material: "aluminum_6061",
        contact_surface_area: 500,
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid soft jaw with defaults", () => {
      const result = softJawSchema.parse({
        jaw_type: "dovetail",
        bore_diameter: 100,
        jaw_height: 75,
        grip_depth: 15,
        material: "steel_1018",
        contact_surface_area: 2000,
      });
      expect(result.dovetail_angle).toBe(60);
      expect(result.interference_check).toBe(true);
    });
  });

  // ── Tombstone/Pallet ──────────────────────────────────────────────────

  describe("Tombstone/Pallet schema", () => {
    it("rejects face_count of 1 (minimum is 2)", () => {
      const result = tombstonePalletSchema.safeParse({
        face_count: 1,
        face_width: 300,
        face_height: 400,
        part_count_per_face: 4,
      });
      expect(result.success).toBe(false);
    });

    it("applies default zero_point_system of 'none'", () => {
      const result = tombstonePalletSchema.parse({
        face_count: 4,
        face_width: 300,
        face_height: 400,
        part_count_per_face: 4,
      });
      expect(result.zero_point_system).toBe("none");
      expect(result.fixture_plate_thickness).toBe(25);
      expect(result.indexing_accuracy).toBeCloseTo(0.005, 3);
    });
  });

  // ── DFM-critical params in metadata ───────────────────────────────────

  describe("DFM-critical params in metadata", () => {
    it("soft_jaw lists bore_diameter and grip_depth as DFM-critical", () => {
      const dfm = WORKHOLDING_METADATA.soft_jaw.dfmCriticalParams;
      expect(dfm).toBeDefined();
      expect(dfm).toContain("bore_diameter");
      expect(dfm).toContain("grip_depth");
      expect(dfm).toHaveLength(2);
    });

    it("vise lists clamping_force as DFM-critical", () => {
      const dfm = WORKHOLDING_METADATA.vise.dfmCriticalParams;
      expect(dfm).toBeDefined();
      expect(dfm).toContain("clamping_force");
      expect(dfm).toHaveLength(1);
    });

    it("chuck_collet lists grip_diameter and grip_force as DFM-critical", () => {
      const dfm = WORKHOLDING_METADATA.chuck_collet.dfmCriticalParams;
      expect(dfm).toBeDefined();
      expect(dfm).toContain("grip_diameter");
      expect(dfm).toContain("grip_force");
      expect(dfm).toHaveLength(2);
    });

    it("vacuum_magnetic lists hold_force_per_zone as DFM-critical", () => {
      const dfm = WORKHOLDING_METADATA.vacuum_magnetic.dfmCriticalParams;
      expect(dfm).toBeDefined();
      expect(dfm).toContain("hold_force_per_zone");
      expect(dfm).toHaveLength(1);
    });

    it("fixture_body has no DFM-critical params", () => {
      expect(WORKHOLDING_METADATA.fixture_body.dfmCriticalParams).toBeUndefined();
    });

    it("tombstone_pallet has no DFM-critical params", () => {
      expect(WORKHOLDING_METADATA.tombstone_pallet.dfmCriticalParams).toBeUndefined();
    });
  });

  // ── AC Python setter namespace ────────────────────────────────────────

  describe("AC Python setter namespace", () => {
    it("all setters contain 'hm.fixture.' prefix", () => {
      const entries = Object.entries(WORKHOLDING_METADATA);
      expect(entries).toHaveLength(6);
      for (const [key, meta] of entries) {
        expect(meta.acPythonSetter).toContain("hm.fixture.");
        expect(meta.acPythonSetter.startsWith("hm.fixture.")).toBe(true);
      }
    });

    it("setter names match schema map keys", () => {
      for (const key of Object.keys(WORKHOLDING_SCHEMA_MAP)) {
        const setter = WORKHOLDING_METADATA[key as keyof typeof WORKHOLDING_METADATA].acPythonSetter;
        expect(setter).toBe(`hm.fixture.${key}`);
      }
    });
  });

  // ── Metadata param counts ─────────────────────────────────────────────

  describe("Metadata param counts", () => {
    it("fixture_body has 10 params", () => {
      expect(WORKHOLDING_METADATA.fixture_body.paramCount).toBe(10);
    });

    it("soft_jaw has 8 params", () => {
      expect(WORKHOLDING_METADATA.soft_jaw.paramCount).toBe(8);
    });

    it("vise has 10 params", () => {
      expect(WORKHOLDING_METADATA.vise.paramCount).toBe(10);
    });

    it("chuck_collet has 10 params", () => {
      expect(WORKHOLDING_METADATA.chuck_collet.paramCount).toBe(10);
    });

    it("tombstone_pallet has 8 params", () => {
      expect(WORKHOLDING_METADATA.tombstone_pallet.paramCount).toBe(8);
    });

    it("vacuum_magnetic has 8 params", () => {
      expect(WORKHOLDING_METADATA.vacuum_magnetic.paramCount).toBe(8);
    });
  });
});
