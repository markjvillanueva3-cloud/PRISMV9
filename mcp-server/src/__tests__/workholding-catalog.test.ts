/**
 * Workholding Catalog Data Tests
 *
 * Validates extracted catalog data from Orange Vise 2016 PDF.
 * All values cross-referenced against source PDF pages 7-9.
 */

import { describe, it, expect } from "vitest";
import {
  ORANGE_VISE_SPECS,
  ZERO_POINT_SPECS,
  TOMBSTONE_SPECS,
  SOFT_JAW_SPECS,
  JAW_PLATE_SPECS,
  SUBPLATE_SPECS,
  VISE_PALLET_SPECS,
  JAW_STOCK_PROFILES,
  VISE_MOUNTING_SPECS,
  findVise,
  findVisesByJawWidth,
  findVisesByOpening,
  findSoftJaws,
  getCatalogSummary,
  type ViseSpec,
  type ZeroPointSpec,
  type TombstoneSpec,
  type SoftJawSpec,
} from "../data/workholding-catalog.js";

// Helper: inches to mm (must match catalog helper)
const inToMm = (inches: number): number => Math.round(inches * 25.4 * 100) / 100;
const lbsToKn = (lbs: number): number => Math.round(lbs * 0.00444822 * 1000) / 1000;

describe("Workholding Catalog Data", () => {
  // ========================================================================
  // VISE SPECIFICATIONS
  // ========================================================================
  describe("Orange Vise Specs", () => {
    it("should have 7 vise models", () => {
      expect(ORANGE_VISE_SPECS).toHaveLength(7);
    });

    it("should have correct brands", () => {
      for (const v of ORANGE_VISE_SPECS) {
        expect(v.brand).toBe("Orange Vise");
      }
    });

    it("all vises should have 10,000 lbs (44.482 kN) max clamping force", () => {
      const expectedKn = lbsToKn(10000);
      for (const v of ORANGE_VISE_SPECS) {
        expect(v.clamping_force_kn).toBe(expectedKn);
      }
    });

    it("all vises should have 0.0127mm repeatability (+/-0.0005in)", () => {
      const expectedMm = inToMm(0.0005);
      for (const v of ORANGE_VISE_SPECS) {
        expect(v.repeatability_mm).toBe(expectedMm);
      }
    });

    it("6in vises should have 152.4mm jaw width", () => {
      const sixInch = ORANGE_VISE_SPECS.filter((v) => v.model.startsWith("OV6"));
      expect(sixInch).toHaveLength(3);
      for (const v of sixInch) {
        expect(v.jaw_width_mm).toBe(inToMm(6));
      }
    });

    it("4.5in vises should have 114.3mm jaw width", () => {
      const fourFive = ORANGE_VISE_SPECS.filter((v) => v.model.startsWith("OV45"));
      expect(fourFive).toHaveLength(4);
      for (const v of fourFive) {
        expect(v.jaw_width_mm).toBe(inToMm(4.5));
      }
    });

    it("OV6-200DS3 should have correct dimensions from catalog page 7", () => {
      const vise = ORANGE_VISE_SPECS.find((v) => v.model === "OV6-200DS3")!;
      expect(vise).toBeDefined();
      expect(vise.sku).toBe("100-101");
      expect(vise.max_opening_mm).toBe(inToMm(10.5));         // single station w/ plates
      expect(vise.max_opening_no_plates_mm).toBe(inToMm(12.0));
      expect(vise.dual_station_opening_mm).toBe(inToMm(4.25)); // per station w/ plates
      expect(vise.weight_kg).toBeCloseTo(50.8, 0);
      expect(vise.type).toBe("double_station");
      expect(vise.body_material).toBe("cast_iron");
    });

    it("OV45-160SS3 should be single station only", () => {
      const vise = ORANGE_VISE_SPECS.find((v) => v.model === "OV45-160SS3")!;
      expect(vise).toBeDefined();
      expect(vise.type).toBe("single_station");
      expect(vise.dual_station_opening_mm).toBeUndefined();
      expect(vise.features).toContain("single_station_only");
      expect(vise.features).toContain("bolted_rear_jaw");
      expect(vise.body_material).toBe("17-4_stainless_steel");
    });

    it("dual station vises should be convertible to single station", () => {
      const dualVises = ORANGE_VISE_SPECS.filter((v) => v.type === "double_station");
      expect(dualVises).toHaveLength(6);
      for (const v of dualVises) {
        expect(v.features).toContain("single_station_convertible");
        expect(v.dual_station_opening_mm).toBeDefined();
        expect(v.dual_station_opening_mm!).toBeGreaterThan(0);
      }
    });

    it("all vises should use CarveSmart IJS interface", () => {
      for (const v of ORANGE_VISE_SPECS) {
        expect(v.jaw_interface).toBe("CarveSmart IJS");
      }
    });

    it("all vises should be ball coupler ready", () => {
      for (const v of ORANGE_VISE_SPECS) {
        expect(v.features).toContain("ball_coupler_ready");
      }
    });

    it("clamping force ratio should be consistent", () => {
      for (const v of ORANGE_VISE_SPECS) {
        expect(v.clamping_force_ratio).toBe("825 lbs per 10 lbs-ft");
      }
    });

    it("4.5in dual station body material should be 17-4 stainless", () => {
      const ov45Dual = ORANGE_VISE_SPECS.filter(
        (v) => v.model.startsWith("OV45") && v.type === "double_station",
      );
      for (const v of ov45Dual) {
        expect(v.body_material).toBe("17-4_stainless_steel");
      }
    });
  });

  // ========================================================================
  // ZERO-POINT CLAMPING
  // ========================================================================
  describe("Zero-Point Specs (Ball Couplers)", () => {
    it("should have 1 zero-point system", () => {
      expect(ZERO_POINT_SPECS).toHaveLength(1);
    });

    it("Ball Coupler should have >10,000 lbs holding force", () => {
      const bc = ZERO_POINT_SPECS[0];
      expect(bc.holding_force_kn).toBe(lbsToKn(10000));
      expect(bc.holding_force_kn).toBeGreaterThan(44);
    });

    it("Ball Coupler should have 3 actuation methods", () => {
      const bc = ZERO_POINT_SPECS[0];
      expect(bc.actuation).toHaveLength(3);
      expect(bc.actuation).toContain("manual");
      expect(bc.actuation).toContain("pneumatic_above");
      expect(bc.actuation).toContain("pneumatic_below");
    });

    it("Ball Coupler repeatability should match vise repeatability", () => {
      const bc = ZERO_POINT_SPECS[0];
      expect(bc.repeatability_mm).toBe(inToMm(0.0005));
    });
  });

  // ========================================================================
  // TOMBSTONES
  // ========================================================================
  describe("Tombstone Specs", () => {
    it("should have 4 tombstone configurations", () => {
      expect(TOMBSTONE_SPECS).toHaveLength(4);
    });

    it("should have 2 integrated vise + 2 ball coupler types", () => {
      const integrated = TOMBSTONE_SPECS.filter((t) => t.type === "integrated_vise");
      const ballCoupler = TOMBSTONE_SPECS.filter((t) => t.type === "ball_coupler");
      expect(integrated).toHaveLength(2);
      expect(ballCoupler).toHaveLength(2);
    });

    it("integrated vise tombstones should have 8 stations", () => {
      const integrated = TOMBSTONE_SPECS.filter((t) => t.type === "integrated_vise");
      for (const t of integrated) {
        expect(t.stations).toBe(8);
      }
    });

    it("ball coupler tombstones should have receiver spacing at 10in centers", () => {
      const ballCoupler = TOMBSTONE_SPECS.filter((t) => t.type === "ball_coupler");
      for (const t of ballCoupler) {
        expect(t.receiver_spacing_mm).toBe(inToMm(10));
        expect(t.integrated_receivers).toBe(8);
      }
    });

    it("all tombstones should be 22in tall", () => {
      for (const t of TOMBSTONE_SPECS) {
        expect(t.height_mm).toBe(inToMm(22));
      }
    });
  });

  // ========================================================================
  // SOFT JAWS
  // ========================================================================
  describe("Soft Jaw Specs", () => {
    it("should have 7 soft jaw configurations", () => {
      expect(SOFT_JAW_SPECS).toHaveLength(7);
    });

    it("standard machinable jaws should be reversible", () => {
      const machinable = SOFT_JAW_SPECS.filter((j) => j.type === "machinable");
      expect(machinable).toHaveLength(3);
      for (const j of machinable) {
        expect(j.reversible).toBe(true);
      }
    });

    it("extra-wide jaws should not be reversible", () => {
      const extraWide = SOFT_JAW_SPECS.filter((j) => j.type === "extra_wide");
      expect(extraWide).toHaveLength(4);
      for (const j of extraWide) {
        expect(j.reversible).toBe(false);
      }
    });

    it("machinable jaws should be available in steel and aluminum", () => {
      const materials = SOFT_JAW_SPECS.filter((j) => j.type === "machinable").map(
        (j) => j.material,
      );
      expect(materials).toContain("1018_steel");
      expect(materials).toContain("6061_aluminum");
      expect(materials).toContain("7075_aluminum");
    });

    it("all soft jaws should fit 6in vises", () => {
      for (const j of SOFT_JAW_SPECS) {
        expect(j.fits_vise_width_mm).toBe(inToMm(6));
      }
    });
  });

  // ========================================================================
  // JAW PLATES
  // ========================================================================
  describe("Jaw Plate Specs", () => {
    it("should have 4 jaw plate types", () => {
      expect(JAW_PLATE_SPECS).toHaveLength(4);
    });

    it("all plates should be hardened steel", () => {
      for (const p of JAW_PLATE_SPECS) {
        expect(p.material).toBe("hardened_steel");
      }
    });

    it("all plates should be 6in wide", () => {
      for (const p of JAW_PLATE_SPECS) {
        expect(p.size_mm.length).toBe(inToMm(6));
      }
    });
  });

  // ========================================================================
  // SUBPLATES
  // ========================================================================
  describe("Subplate Specs", () => {
    it("should have 6 subplate configurations", () => {
      expect(SUBPLATE_SPECS).toHaveLength(6);
    });

    it("should have 3 for 6in vises and 3 for 4.5in vises", () => {
      const six = SUBPLATE_SPECS.filter((s) => s.fits_vise_width_mm === inToMm(6));
      const four = SUBPLATE_SPECS.filter((s) => s.fits_vise_width_mm === inToMm(4.5));
      expect(six).toHaveLength(3);
      expect(four).toHaveLength(3);
    });

    it("all subplates should have 2 ball receivers at 10in centers", () => {
      for (const s of SUBPLATE_SPECS) {
        expect(s.integrated_receivers).toBe(2);
        expect(s.receiver_spacing_mm).toBe(inToMm(10));
      }
    });

    it("all subplates should be steel and 1.38in thick", () => {
      for (const s of SUBPLATE_SPECS) {
        expect(s.material).toBe("steel");
        expect(s.size_mm.height).toBe(inToMm(1.38));
      }
    });
  });

  // ========================================================================
  // VISE PALLETS
  // ========================================================================
  describe("Vise Pallet Specs", () => {
    it("should have 9 pallet configurations", () => {
      expect(VISE_PALLET_SPECS).toHaveLength(9);
    });

    it("all pallets should be 6061 aluminum", () => {
      for (const p of VISE_PALLET_SPECS) {
        expect(p.material).toBe("6061_aluminum");
      }
    });

    it("pallets should come in 3 lengths (20, 17.5, 16in)", () => {
      const lengths = [...new Set(VISE_PALLET_SPECS.map((p) => p.size_mm.length))];
      expect(lengths).toHaveLength(3);
      expect(lengths).toContain(inToMm(20));
      expect(lengths).toContain(inToMm(17.5));
      expect(lengths).toContain(inToMm(16));
    });

    it("pallets should come in 3 widths (6, 8, 12in)", () => {
      const widths = [...new Set(VISE_PALLET_SPECS.map((p) => p.size_mm.width))];
      expect(widths).toHaveLength(3);
      expect(widths).toContain(inToMm(6));
      expect(widths).toContain(inToMm(8));
      expect(widths).toContain(inToMm(12));
    });

    it("all pallets should be 1.75in thick", () => {
      for (const p of VISE_PALLET_SPECS) {
        expect(p.size_mm.height).toBe(inToMm(1.75));
      }
    });

    it("all pallets should use dowel pin locating", () => {
      for (const p of VISE_PALLET_SPECS) {
        expect(p.locating_method).toBe("dowel_pins_and_carriers");
      }
    });
  });

  // ========================================================================
  // JAW STOCK PROFILES
  // ========================================================================
  describe("Jaw Stock Profiles", () => {
    it("should have 4 profiles", () => {
      expect(JAW_STOCK_PROFILES).toHaveLength(4);
    });

    it("should include steel and aluminum materials", () => {
      const materials = JAW_STOCK_PROFILES.map((p) => p.material);
      expect(materials).toContain("1018_cold_rolled_steel");
      expect(materials.filter((m) => m.includes("aluminum"))).toHaveLength(3);
    });

    it("aluminum profiles should have 94in stock length option", () => {
      const alum = JAW_STOCK_PROFILES.filter((p) => p.material.includes("aluminum"));
      for (const p of alum) {
        expect(p.available_lengths_mm).toContain(inToMm(94));
      }
    });
  });

  // ========================================================================
  // MOUNTING SPECS
  // ========================================================================
  describe("Vise Mounting Specs", () => {
    it("should have 2 mounting spec sets (OV6 and OV45)", () => {
      expect(VISE_MOUNTING_SPECS).toHaveLength(2);
    });

    it("OV6 should have jaw plate bolt pattern", () => {
      const ov6 = VISE_MOUNTING_SPECS.find((m) => m.model_series === "OV6")!;
      expect(ov6.jaw_plate_bolt_pattern).toContain("3.875");
      expect(ov6.jaw_plate_torque_lbft).toBe(20);
    });

    it("OV45 should not have jaw plate bolt holes", () => {
      const ov45 = VISE_MOUNTING_SPECS.find((m) => m.model_series === "OV45")!;
      expect(ov45.jaw_plate_screw).toBe("N/A");
      expect(ov45.jaw_plate_bolt_pattern).toContain("N/A");
    });

    it("both should use 1.25-12 TPI main screw", () => {
      for (const m of VISE_MOUNTING_SPECS) {
        expect(m.main_screw_thread).toBe("1.25-12 TPI");
      }
    });
  });

  // ========================================================================
  // LOOKUP HELPERS
  // ========================================================================
  describe("Lookup Functions", () => {
    it("findVise should find by model name", () => {
      const v = findVise("OV6-200");
      expect(v).toBeDefined();
      expect(v!.model).toBe("OV6-200DS3");
    });

    it("findVise should find by SKU", () => {
      const v = findVise("100-207");
      expect(v).toBeDefined();
      expect(v!.model).toBe("OV45-160SS3");
    });

    it("findVise should return undefined for unknown", () => {
      expect(findVise("NONEXISTENT")).toBeUndefined();
    });

    it("findVisesByJawWidth should filter by minimum width", () => {
      const wide = findVisesByJawWidth(inToMm(6));
      expect(wide).toHaveLength(3); // only 6" vises
      for (const v of wide) {
        expect(v.model).toMatch(/^OV6/);
      }
    });

    it("findVisesByJawWidth with 0 should return all", () => {
      expect(findVisesByJawWidth(0)).toHaveLength(7);
    });

    it("findVisesByOpening should filter by part width", () => {
      // 200mm part needs single-station opening >= 200mm
      const fits = findVisesByOpening(200);
      expect(fits.length).toBeGreaterThan(0);
      for (const v of fits) {
        expect(v.max_opening_mm).toBeGreaterThanOrEqual(200);
      }
    });

    it("findSoftJaws should filter by vise width", () => {
      const jaws6 = findSoftJaws(inToMm(6));
      expect(jaws6).toHaveLength(7); // all fit 6" vises
    });

    it("findSoftJaws should filter by material", () => {
      const steelJaws = findSoftJaws(inToMm(6), "steel");
      expect(steelJaws.length).toBeGreaterThan(0);
      for (const j of steelJaws) {
        expect(j.material).toContain("steel");
      }
    });

    it("findSoftJaws for non-existent width should return empty", () => {
      expect(findSoftJaws(999)).toHaveLength(0);
    });
  });

  // ========================================================================
  // CATALOG SUMMARY
  // ========================================================================
  describe("getCatalogSummary", () => {
    it("should return correct counts", () => {
      const summary = getCatalogSummary();
      expect(summary.vises).toBe(7);
      expect(summary.zero_point_systems).toBe(1);
      expect(summary.tombstones).toBe(4);
      expect(summary.soft_jaws).toBe(7);
      expect(summary.jaw_plates).toBe(4);
      expect(summary.subplates).toBe(6);
      expect(summary.vise_pallets).toBe(9);
      expect(summary.jaw_stock_profiles).toBe(4);
      expect(summary.mounting_specs).toBe(2);
    });

    it("total catalog entries should be 44", () => {
      const summary = getCatalogSummary();
      const total = Object.values(summary).reduce((a, b) => a + b, 0);
      expect(total).toBe(44);
    });
  });

  // ========================================================================
  // DATA INTEGRITY
  // ========================================================================
  describe("Data Integrity", () => {
    it("all mm values should be positive", () => {
      for (const v of ORANGE_VISE_SPECS) {
        expect(v.jaw_width_mm).toBeGreaterThan(0);
        expect(v.max_opening_mm).toBeGreaterThan(0);
        expect(v.clamping_force_kn).toBeGreaterThan(0);
        expect(v.repeatability_mm).toBeGreaterThan(0);
        expect(v.weight_kg).toBeGreaterThan(0);
      }
    });

    it("max_opening should be less than max_opening_no_plates", () => {
      for (const v of ORANGE_VISE_SPECS) {
        expect(v.max_opening_mm).toBeLessThan(v.max_opening_no_plates_mm);
      }
    });

    it("6in vises should be heavier than 4.5in vises of same length", () => {
      const ov6_200 = findVise("OV6-200")!;
      const ov45_200 = findVise("OV45-200")!;
      expect(ov6_200.weight_kg).toBeGreaterThan(ov45_200.weight_kg);
    });

    it("longer vises should be heavier than shorter ones in same series", () => {
      const ov6_200 = findVise("OV6-200")!;
      const ov6_160 = findVise("OV6-160")!;
      expect(ov6_200.weight_kg).toBeGreaterThan(ov6_160.weight_kg);
    });

    it("all SKUs should be unique", () => {
      const allSkus = [
        ...ORANGE_VISE_SPECS.map((v) => v.sku),
        ...TOMBSTONE_SPECS.map((t) => t.sku),
        ...JAW_PLATE_SPECS.map((p) => p.sku),
        ...SUBPLATE_SPECS.map((s) => s.sku),
        ...VISE_PALLET_SPECS.map((p) => p.sku),
      ];
      const unique = new Set(allSkus);
      expect(unique.size).toBe(allSkus.length);
    });

    it("soft jaw dimensions should be physically reasonable", () => {
      for (const j of SOFT_JAW_SPECS) {
        // Jaw length should be >= vise width or close
        expect(j.size_mm.length).toBeGreaterThanOrEqual(j.fits_vise_width_mm);
        // Height should be reasonable (25-75mm)
        expect(j.size_mm.height).toBeGreaterThan(25);
        expect(j.size_mm.height).toBeLessThan(75);
      }
    });
  });
});
