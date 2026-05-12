/**
 * AdditiveQuoteEngine Tests
 *
 * Tests 3D printing / additive manufacturing quoting:
 * - FDM, SLA, SLS, MJF, DMLS technology support
 * - Material pricing and compatibility
 * - Build time estimation
 * - Post-processing costs
 * - Price breaks and customer tiers
 * - DFM warnings
 */

import { describe, it, expect } from "vitest";
import {
  AdditiveQuoteEngine,
  additiveQuoteEngine,
  type AdditiveInput,
  type AdditiveQuoteResult,
} from "../engines/AdditiveQuoteEngine.js";

describe("AdditiveQuoteEngine", () => {
  describe("singleton export", () => {
    it("exports singleton instance", () => {
      expect(additiveQuoteEngine).toBeDefined();
      expect(additiveQuoteEngine).toBeInstanceOf(AdditiveQuoteEngine);
    });

    it("exports class for custom instantiation", () => {
      const engine = new AdditiveQuoteEngine();
      expect(engine).toBeInstanceOf(AdditiveQuoteEngine);
    });
  });

  describe("quote - basic functionality", () => {
    const basicInput: AdditiveInput = {
      quantity: 1,
      bounding_box_mm: { x: 50, y: 50, z: 30 },
      part_volume_cm3: 25,
      technology: "fdm",
      material: "pla",
    };

    it("returns complete quote result", () => {
      const result = additiveQuoteEngine.quote(basicInput);

      expect(result).toHaveProperty("quote_id");
      expect(result).toHaveProperty("part_name");
      expect(result).toHaveProperty("quantity");
      expect(result).toHaveProperty("technology");
      expect(result).toHaveProperty("material");
      expect(result).toHaveProperty("costs");
      expect(result).toHaveProperty("pricing");
      expect(result).toHaveProperty("lead_time");
      expect(result).toHaveProperty("build_info");
      expect(result).toHaveProperty("dfm_warnings");
      expect(result).toHaveProperty("price_breaks");
    });

    it("generates unique quote ID", () => {
      const result1 = additiveQuoteEngine.quote(basicInput);
      const result2 = additiveQuoteEngine.quote(basicInput);

      expect(result1.quote_id).toMatch(/^AM\d{2}-\d{5}$/);
      expect(result2.quote_id).not.toBe(result1.quote_id);
    });

    it("uses provided part name", () => {
      const result = additiveQuoteEngine.quote({
        ...basicInput,
        part_name: "Test Bracket",
      });

      expect(result.part_name).toBe("Test Bracket");
    });

    it("defaults part name to 3D Printed Part", () => {
      const result = additiveQuoteEngine.quote(basicInput);
      expect(result.part_name).toBe("3D Printed Part");
    });

    it("returns technology in uppercase", () => {
      const result = additiveQuoteEngine.quote(basicInput);
      expect(result.technology).toBe("FDM");
    });
  });

  describe("quote - technologies", () => {
    const baseInput: Omit<AdditiveInput, "technology" | "material"> = {
      quantity: 5,
      bounding_box_mm: { x: 80, y: 60, z: 40 },
      part_volume_cm3: 50,
    };

    it("quotes FDM with PLA", () => {
      const result = additiveQuoteEngine.quote({
        ...baseInput,
        technology: "fdm",
        material: "pla",
      });

      expect(result.technology).toBe("FDM");
      expect(result.material).toBe("pla");
      expect(result.costs.total_cost).toBeGreaterThan(0);
    });

    it("quotes SLA with standard resin", () => {
      const result = additiveQuoteEngine.quote({
        ...baseInput,
        technology: "sla",
        material: "standard_resin",
      });

      expect(result.technology).toBe("SLA");
      expect(result.costs.machine_time.rate_hr).toBe(20); // SLA rate
    });

    it("quotes SLS with nylon PA12", () => {
      const result = additiveQuoteEngine.quote({
        ...baseInput,
        technology: "sls",
        material: "nylon_pa12",
      });

      expect(result.technology).toBe("SLS");
      // SLS has no support
      expect(result.build_info.estimated_support_pct).toBe(0);
    });

    it("quotes MJF with nylon PA12", () => {
      const result = additiveQuoteEngine.quote({
        ...baseInput,
        technology: "mjf",
        material: "nylon_pa12",
      });

      expect(result.technology).toBe("MJF");
      // MJF has no support
      expect(result.build_info.estimated_support_pct).toBe(0);
    });

    it("quotes DMLS with titanium", () => {
      const result = additiveQuoteEngine.quote({
        ...baseInput,
        technology: "dmls",
        material: "ti64",
      });

      expect(result.technology).toBe("DMLS");
      // DMLS is expensive
      expect(result.costs.material.price_per_cm3).toBeGreaterThan(1);
    });

    it("throws on unknown technology", () => {
      expect(() =>
        additiveQuoteEngine.quote({
          ...baseInput,
          technology: "unknown" as any,
          material: "pla",
        })
      ).toThrow("Unknown technology");
    });
  });

  describe("quote - materials", () => {
    const baseInput: Omit<AdditiveInput, "material"> = {
      quantity: 1,
      bounding_box_mm: { x: 50, y: 50, z: 30 },
      part_volume_cm3: 25,
      technology: "fdm",
    };

    it("prices PLA correctly", () => {
      const result = additiveQuoteEngine.quote({ ...baseInput, material: "pla" });
      expect(result.costs.material.price_per_cm3).toBe(0.05);
    });

    it("prices carbon fiber nylon higher", () => {
      const result = additiveQuoteEngine.quote({
        ...baseInput,
        material: "cf_nylon",
      });
      expect(result.costs.material.price_per_cm3).toBe(0.25);
    });

    it("warns on unknown material and uses PLA pricing", () => {
      const result = additiveQuoteEngine.quote({
        ...baseInput,
        material: "unknown_material",
      });

      expect(result.dfm_warnings.some(w => w.includes("Unknown material"))).toBe(true);
      expect(result.costs.material.price_per_cm3).toBe(0.05); // PLA fallback
    });

    it("warns on incompatible material-technology", () => {
      const result = additiveQuoteEngine.quote({
        ...baseInput,
        technology: "fdm",
        material: "ti64", // DMLS only
      });

      expect(result.dfm_warnings.some(w => w.includes("not typically used with"))).toBe(true);
    });
  });

  describe("quote - costs breakdown", () => {
    const input: AdditiveInput = {
      quantity: 10,
      bounding_box_mm: { x: 100, y: 80, z: 50 },
      part_volume_cm3: 100,
      technology: "fdm",
      material: "pla",
    };

    it("calculates material cost from volume and price", () => {
      const result = additiveQuoteEngine.quote(input);

      expect(result.costs.material.total).toBeGreaterThan(0);
      expect(result.costs.material.volume_cm3).toBeGreaterThan(0);
    });

    it("includes support volume in material cost", () => {
      const withSupport = additiveQuoteEngine.quote({
        ...input,
        support_volume_pct: 30,
      });

      const withoutSupport = additiveQuoteEngine.quote({
        ...input,
        support_volume_pct: 0,
      });

      expect(withSupport.costs.material.support_cm3).toBeGreaterThan(0);
      expect(withSupport.costs.material.total).toBeGreaterThan(
        withoutSupport.costs.material.total
      );
    });

    it("calculates machine time based on build speed", () => {
      const result = additiveQuoteEngine.quote(input);

      expect(result.costs.machine_time.build_hours).toBeGreaterThan(0);
      expect(result.costs.machine_time.rate_hr).toBe(8); // FDM rate
      expect(result.costs.machine_time.total).toBeCloseTo(
        result.costs.machine_time.build_hours * result.costs.machine_time.rate_hr,
        1
      );
    });

    it("includes setup costs", () => {
      const result = additiveQuoteEngine.quote(input);
      expect(result.costs.setup.total).toBeGreaterThan(0);
    });

    it("includes post-processing costs", () => {
      const result = additiveQuoteEngine.quote({
        ...input,
        post_process: ["support_removal", "sanding"],
      });

      expect(result.costs.post_processing.operations.length).toBe(2);
      expect(result.costs.post_processing.total).toBeGreaterThan(0);
    });

    it("includes inspection costs", () => {
      const result = additiveQuoteEngine.quote(input);
      expect(result.costs.inspection.total).toBeGreaterThan(0);
    });

    it("calculates overhead as percentage of direct costs", () => {
      const result = additiveQuoteEngine.quote(input);

      expect(result.costs.overhead_pct).toBe(10);
      expect(result.costs.overhead).toBeGreaterThan(0);
    });

    it("sums to total cost correctly", () => {
      const result = additiveQuoteEngine.quote(input);

      const directCosts =
        result.costs.material.total +
        result.costs.machine_time.total +
        result.costs.setup.total +
        result.costs.post_processing.total +
        result.costs.inspection.total;

      const expectedTotal = directCosts + result.costs.overhead;

      expect(result.costs.total_cost).toBeCloseTo(expectedTotal, 1);
    });
  });

  describe("quote - pricing", () => {
    const input: AdditiveInput = {
      quantity: 1,
      bounding_box_mm: { x: 50, y: 50, z: 30 },
      part_volume_cm3: 25,
      technology: "fdm",
      material: "pla",
    };

    it("applies margin to cost for unit price", () => {
      const result = additiveQuoteEngine.quote(input);

      expect(result.pricing.unit_price).toBeGreaterThan(
        result.costs.cost_per_part
      );
      expect(result.pricing.margin_pct).toBeGreaterThan(0);
    });

    it("calculates total price correctly", () => {
      const result = additiveQuoteEngine.quote({ ...input, quantity: 5 });

      expect(result.pricing.total_price).toBeCloseTo(
        result.pricing.unit_price * 5,
        1
      );
    });

    it("applies rush premium", () => {
      const standard = additiveQuoteEngine.quote(input);
      const rush = additiveQuoteEngine.quote({ ...input, rush: true });

      expect(rush.pricing.unit_price).toBeGreaterThan(standard.pricing.unit_price);
    });

    it("applies volume discount at qty >= 50", () => {
      const small = additiveQuoteEngine.quote({ ...input, quantity: 10 });
      const large = additiveQuoteEngine.quote({ ...input, quantity: 50 });

      // Unit price should be lower for volume
      expect(large.pricing.unit_price).toBeLessThan(small.pricing.unit_price);
    });

    it("varies margin by customer tier", () => {
      const tierA = additiveQuoteEngine.quote({ ...input, customer_tier: "A" });
      const tierC = additiveQuoteEngine.quote({ ...input, customer_tier: "C" });

      // Tier A gets better margin (30% vs 40%)
      expect(tierA.pricing.margin_pct).toBeLessThan(tierC.pricing.margin_pct);
    });
  });

  describe("quote - lead time", () => {
    const input: AdditiveInput = {
      quantity: 1,
      bounding_box_mm: { x: 50, y: 50, z: 30 },
      part_volume_cm3: 25,
      technology: "fdm",
      material: "pla",
    };

    it("calculates print days", () => {
      const result = additiveQuoteEngine.quote(input);
      expect(result.lead_time.print_days).toBeGreaterThanOrEqual(1);
    });

    it("adds post-process days for heat treatment", () => {
      const noHeat = additiveQuoteEngine.quote(input);
      const withHeat = additiveQuoteEngine.quote({
        ...input,
        post_process: ["heat_treat"],
      });

      expect(withHeat.lead_time.post_process_days).toBeGreaterThan(
        noHeat.lead_time.post_process_days
      );
    });

    it("calculates rush lead time as ~50% of standard", () => {
      const result = additiveQuoteEngine.quote(input);

      expect(result.lead_time.total_rush_days).toBeLessThan(
        result.lead_time.total_standard_days
      );
    });

    it("minimum lead time is 2 days", () => {
      const result = additiveQuoteEngine.quote(input);
      expect(result.lead_time.total_standard_days).toBeGreaterThanOrEqual(2);
    });
  });

  describe("quote - build info", () => {
    const input: AdditiveInput = {
      quantity: 1,
      bounding_box_mm: { x: 100, y: 80, z: 60 },
      part_volume_cm3: 100,
      technology: "fdm",
      material: "pla",
    };

    it("uses default layer height for technology", () => {
      const result = additiveQuoteEngine.quote(input);
      expect(result.build_info.layer_height_mm).toBe(0.2); // FDM default
    });

    it("uses custom layer height when provided", () => {
      const result = additiveQuoteEngine.quote({
        ...input,
        layer_height_mm: 0.1,
      });

      expect(result.build_info.layer_height_mm).toBe(0.1);
    });

    it("calculates number of layers from height and layer thickness", () => {
      const result = additiveQuoteEngine.quote({
        ...input,
        layer_height_mm: 0.2,
      });

      // Build height is min dimension = 60mm
      // Layers = 60 / 0.2 = 300
      expect(result.build_info.num_layers).toBe(300);
    });

    it("estimates support percentage", () => {
      const result = additiveQuoteEngine.quote({
        ...input,
        support_volume_pct: 25,
      });

      expect(result.build_info.estimated_support_pct).toBe(25);
    });

    it("defaults to 15% support for FDM", () => {
      const result = additiveQuoteEngine.quote(input);
      expect(result.build_info.estimated_support_pct).toBe(15);
    });

    it("defaults to 0% support for SLS/MJF", () => {
      const slsResult = additiveQuoteEngine.quote({
        ...input,
        technology: "sls",
        material: "nylon_pa12",
      });

      expect(slsResult.build_info.estimated_support_pct).toBe(0);
    });

    it("calculates parts per build for nesting", () => {
      const result = additiveQuoteEngine.quote({ ...input, quantity: 50 });
      expect(result.build_info.parts_per_build).toBeGreaterThan(1);
    });
  });

  describe("quote - DFM warnings", () => {
    it("warns when part exceeds build volume", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 1,
        bounding_box_mm: { x: 400, y: 300, z: 200 }, // Exceeds FDM
        part_volume_cm3: 500,
        technology: "fdm",
        material: "pla",
      });

      expect(result.dfm_warnings.some(w => w.includes("exceeds build volume"))).toBe(true);
    });

    it("warns when tolerance exceeds technology capability", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 1,
        bounding_box_mm: { x: 50, y: 50, z: 30 },
        part_volume_cm3: 25,
        technology: "fdm",
        material: "pla",
        tolerance_mm: 0.05, // FDM can only do 0.3mm
      });

      expect(result.dfm_warnings.some(w => w.includes("post-machining required"))).toBe(true);
    });

    it("warns FDM for polished finish", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 1,
        bounding_box_mm: { x: 50, y: 50, z: 30 },
        part_volume_cm3: 25,
        technology: "fdm",
        material: "pla",
        surface_finish: "polished",
      });

      expect(result.dfm_warnings.some(w => w.includes("consider SLA"))).toBe(true);
    });

    it("warns DMLS for large parts", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 1,
        bounding_box_mm: { x: 200, y: 200, z: 200 },
        part_volume_cm3: 600, // > 500
        technology: "dmls",
        material: "ti64",
      });

      expect(result.dfm_warnings.some(w => w.includes("very expensive"))).toBe(true);
    });

    it("warns SLA for high quantities", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 100,
        bounding_box_mm: { x: 50, y: 50, z: 30 },
        part_volume_cm3: 25,
        technology: "sla",
        material: "standard_resin",
      });

      expect(result.dfm_warnings.some(w => w.includes("consider MJF or SLS"))).toBe(true);
    });

    it("warns on high support volume", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 1,
        bounding_box_mm: { x: 50, y: 50, z: 30 },
        part_volume_cm3: 25,
        technology: "fdm",
        material: "pla",
        support_volume_pct: 50, // > 40%
      });

      expect(result.dfm_warnings.some(w => w.includes("High support volume"))).toBe(true);
    });
  });

  describe("quote - price breaks", () => {
    it("includes price breaks for standard quantities", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 3,
        bounding_box_mm: { x: 50, y: 50, z: 30 },
        part_volume_cm3: 25,
        technology: "fdm",
        material: "pla",
      });

      expect(result.price_breaks.length).toBeGreaterThan(0);
      expect(result.price_breaks.map((b) => b.qty)).toContain(1);
      expect(result.price_breaks.map((b) => b.qty)).toContain(5);
      expect(result.price_breaks.map((b) => b.qty)).toContain(10);
    });

    it("price breaks show unit and total price", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 1,
        bounding_box_mm: { x: 50, y: 50, z: 30 },
        part_volume_cm3: 25,
        technology: "fdm",
        material: "pla",
      });

      for (const brk of result.price_breaks) {
        expect(brk).toHaveProperty("qty");
        expect(brk).toHaveProperty("unit_price");
        expect(brk).toHaveProperty("total");
        expect(brk.total).toBeCloseTo(brk.unit_price * brk.qty, 1);
      }
    });

    it("unit price decreases at higher quantities", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 1,
        bounding_box_mm: { x: 50, y: 50, z: 30 },
        part_volume_cm3: 25,
        technology: "fdm",
        material: "pla",
      });

      const qty1 = result.price_breaks.find((b) => b.qty === 1);
      const qty100 = result.price_breaks.find((b) => b.qty === 100);

      if (qty1 && qty100) {
        expect(qty100.unit_price).toBeLessThan(qty1.unit_price);
      }
    });
  });

  describe("quote - infill", () => {
    it("FDM uses infill to reduce material", () => {
      const full = additiveQuoteEngine.quote({
        quantity: 1,
        bounding_box_mm: { x: 50, y: 50, z: 30 },
        part_volume_cm3: 50,
        technology: "fdm",
        material: "pla",
        infill_pct: 100,
      });

      const sparse = additiveQuoteEngine.quote({
        quantity: 1,
        bounding_box_mm: { x: 50, y: 50, z: 30 },
        part_volume_cm3: 50,
        technology: "fdm",
        material: "pla",
        infill_pct: 20,
      });

      expect(sparse.costs.material.volume_cm3).toBeLessThan(
        full.costs.material.volume_cm3
      );
    });

    it("defaults FDM infill to 20%", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 1,
        bounding_box_mm: { x: 50, y: 50, z: 30 },
        part_volume_cm3: 50,
        technology: "fdm",
        material: "pla",
      });

      // 50cm3 * 20% = 10cm3 effective (plus support)
      expect(result.costs.material.volume_cm3).toBeLessThan(50);
    });

    it("non-FDM technologies ignore infill", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 1,
        bounding_box_mm: { x: 50, y: 50, z: 30 },
        part_volume_cm3: 50,
        technology: "sls",
        material: "nylon_pa12",
        infill_pct: 20, // Should be ignored
      });

      // SLS is fully dense
      expect(result.costs.material.volume_cm3).toBe(50);
    });
  });

  describe("listMaterials", () => {
    it("lists FDM materials", () => {
      const materials = additiveQuoteEngine.listMaterials("fdm");

      expect(materials.length).toBeGreaterThan(0);
      expect(materials.map((m) => m.id)).toContain("pla");
      expect(materials.map((m) => m.id)).toContain("abs");
    });

    it("lists SLA materials", () => {
      const materials = additiveQuoteEngine.listMaterials("sla");

      expect(materials.length).toBeGreaterThan(0);
      expect(materials.map((m) => m.id)).toContain("standard_resin");
    });

    it("lists DMLS materials (metals)", () => {
      const materials = additiveQuoteEngine.listMaterials("dmls");

      expect(materials.length).toBeGreaterThan(0);
      expect(materials.map((m) => m.id)).toContain("ti64");
      expect(materials.map((m) => m.id)).toContain("stainless_316l");
    });

    it("returns materials with price and density", () => {
      const materials = additiveQuoteEngine.listMaterials("fdm");

      for (const mat of materials) {
        expect(mat).toHaveProperty("id");
        expect(mat).toHaveProperty("price_per_cm3");
        expect(mat).toHaveProperty("density");
        expect(mat.price_per_cm3).toBeGreaterThan(0);
        expect(mat.density).toBeGreaterThan(0);
      }
    });

    it("returns empty for unknown technology", () => {
      const materials = additiveQuoteEngine.listMaterials("unknown");
      expect(materials).toEqual([]);
    });
  });

  describe("compareTechnologies", () => {
    const baseInput = {
      quantity: 10,
      bounding_box_mm: { x: 80, y: 60, z: 40 },
      part_volume_cm3: 50,
    };

    it("compares multiple technologies", () => {
      const comparison = additiveQuoteEngine.compareTechnologies(baseInput, [
        { technology: "fdm", material: "pla" },
        { technology: "sla", material: "standard_resin" },
        { technology: "sls", material: "nylon_pa12" },
      ]);

      expect(comparison.length).toBe(3);
    });

    it("returns unit price for each option", () => {
      const comparison = additiveQuoteEngine.compareTechnologies(baseInput, [
        { technology: "fdm", material: "pla" },
        { technology: "dmls", material: "ti64" },
      ]);

      // DMLS should be more expensive
      const fdm = comparison.find((c) => c.technology === "fdm");
      const dmls = comparison.find((c) => c.technology === "dmls");

      expect(dmls!.unit_price).toBeGreaterThan(fdm!.unit_price);
    });

    it("returns lead days for each option", () => {
      const comparison = additiveQuoteEngine.compareTechnologies(baseInput, [
        { technology: "fdm", material: "pla" },
        { technology: "sls", material: "nylon_pa12" },
      ]);

      for (const opt of comparison) {
        expect(opt.lead_days).toBeGreaterThan(0);
      }
    });

    it("includes warnings for each option", () => {
      const comparison = additiveQuoteEngine.compareTechnologies(baseInput, [
        { technology: "fdm", material: "ti64" }, // Incompatible
      ]);

      expect(comparison[0].warnings.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("handles quantity of 0 as 1", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 0,
        bounding_box_mm: { x: 50, y: 50, z: 30 },
        part_volume_cm3: 25,
        technology: "fdm",
        material: "pla",
      });

      expect(result.quantity).toBe(1);
    });

    it("handles very small parts", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 1,
        bounding_box_mm: { x: 5, y: 5, z: 3 },
        part_volume_cm3: 0.05,
        technology: "fdm",
        material: "pla",
      });

      expect(result.costs.total_cost).toBeGreaterThan(0);
      expect(result.pricing.unit_price).toBeGreaterThan(0);
    });

    it("handles very large quantities", () => {
      const result = additiveQuoteEngine.quote({
        quantity: 1000,
        bounding_box_mm: { x: 20, y: 20, z: 10 },
        part_volume_cm3: 2,
        technology: "mjf",
        material: "nylon_pa12",
      });

      expect(result.quantity).toBe(1000);
      expect(result.pricing.total_price).toBeGreaterThan(0);
    });
  });
});
