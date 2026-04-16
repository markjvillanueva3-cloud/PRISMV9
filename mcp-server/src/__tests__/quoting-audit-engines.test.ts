/**
 * Tests for quoting audit gap-fill engines:
 * - MachineRateDatabaseEngine (TCO-based machine rates)
 * - BlueprintToQuoteBridgeEngine (drawing → quote pipeline)
 * - SheetMetalQuoteEngine (sheet metal fabrication quoting)
 * - AdditiveQuoteEngine (3D printing quoting)
 */
import { describe, it, expect } from "vitest";

// ─── MachineRateDatabaseEngine ──────────────────────────────

describe("MachineRateDatabaseEngine", () => {
  let engine: any;

  it("loads engine", async () => {
    const mod = await import("../engines/MachineRateDatabaseEngine.js");
    engine = mod.machineRateDatabaseEngine;
    expect(engine).toBeDefined();
  });

  it("looks up rate by direct ID", () => {
    const rate = engine.getRate("vmc_tier2");
    expect(rate).not.toBeNull();
    expect(rate.machine_id).toBe("vmc_tier2");
    expect(rate.hourly_rate).toBe(65);
    expect(rate.rate_range.min).toBe(45);
    expect(rate.rate_range.max).toBe(85);
    expect(rate.setup_multiplier).toBe(1.5);
    expect(rate.tco_breakdown.total_hr).toBeGreaterThan(0);
  });

  it("resolves QuoteEstimator aliases", () => {
    const rate = engine.getRate("cnc_mill_3axis");
    expect(rate).not.toBeNull();
    expect(rate.machine_id).toBe("vmc_tier2");

    const rate5 = engine.getRate("cnc_mill_5axis");
    expect(rate5).not.toBeNull();
    expect(rate5.machine_id).toBe("vmc_highperf");
    expect(rate5.hourly_rate).toBe(175);
  });

  it("returns null for unknown machine", () => {
    expect(engine.getRate("nonexistent_machine")).toBeNull();
  });

  it("lists all machines", () => {
    const all = engine.listMachines();
    expect(all.length).toBeGreaterThanOrEqual(35);
    expect(all[0]).toHaveProperty("id");
    expect(all[0]).toHaveProperty("hourly_rate");
  });

  it("filters by family", () => {
    const edm = engine.listMachines("edm");
    expect(edm.length).toBeGreaterThanOrEqual(4);
    expect(edm.every((m: any) => m.family === "edm")).toBe(true);
  });

  it("compares machines", () => {
    const result = engine.compareMachines(["vmc_entry", "vmc_tier2", "vmc_production"]);
    expect(result.machines.length).toBe(3);
    expect(result.cheapest).toBe("vmc_entry");
    expect(result.most_productive).toBeDefined();
  });

  it("calculates OEE-adjusted effective rate", () => {
    const typical = engine.getEffectiveRate("vmc_tier2", "typical");
    const worldClass = engine.getEffectiveRate("vmc_tier2", "worldClass");
    expect(typical).toBeGreaterThan(65); // higher than base due to OEE losses
    expect(worldClass).toBeLessThan(typical); // better OEE = lower effective rate
  });

  it("has TCO breakdown that sums correctly", () => {
    const rate = engine.getRate("hmc_production");
    const tco = rate.tco_breakdown;
    const sum = tco.depreciation_hr + tco.maintenance_hr + tco.utilities_hr + tco.floor_space_hr;
    expect(Math.abs(tco.total_hr - sum)).toBeLessThan(0.02);
  });

  it("includes additive machines", () => {
    const additive = engine.listMachines("additive");
    expect(additive.length).toBe(4);
    const dmls = engine.getRate("additive_dmls");
    expect(dmls.hourly_rate).toBe(135);
  });

  it("includes laser and waterjet", () => {
    const laser = engine.getRate("laser_fiber_tier2");
    expect(laser).not.toBeNull();
    expect(laser.hourly_rate).toBe(90);

    const wj = engine.getRate("waterjet_production");
    expect(wj).not.toBeNull();
    expect(wj.hourly_rate).toBe(125);
  });

  it("getFamilies returns all families", () => {
    const families = engine.getFamilies();
    expect(families).toContain("vmc");
    expect(families).toContain("lathe");
    expect(families).toContain("edm");
    expect(families).toContain("laser");
    expect(families).toContain("additive");
  });
});

// ─── BlueprintToQuoteBridgeEngine ───────────────────────────

describe("BlueprintToQuoteBridgeEngine", () => {
  let engine: any;

  it("loads engine", async () => {
    const mod = await import("../engines/BlueprintToQuoteBridgeEngine.js");
    engine = mod.blueprintToQuoteBridgeEngine;
    expect(engine).toBeDefined();
  });

  it("bridges a complete blueprint analysis to quote input", () => {
    const result = engine.bridge({
      dimensions: [
        { type: "linear", value: 100, unit: "mm", tolerance: { upper: 0.05, lower: -0.05 }, text: "100±0.05" },
        { type: "diameter", value: 10, unit: "mm", tolerance: { upper: 0.02, lower: -0.02 }, text: "Ø10±0.02" },
        { type: "diameter", value: 6, unit: "mm", text: "Ø6" },
        { type: "thread", value: 8, unit: "mm", text: "M8x1.25" },
        { type: "chamfer", value: 0.5, unit: "mm", text: "0.5x45°" },
      ],
      gdt: [
        { symbol: "position", tolerance_value: 0.05, datum_refs: ["A", "B"] },
        { symbol: "flatness", tolerance_value: 0.02 },
      ],
      title_block: {
        part_name: "Bracket Assembly",
        part_number: "BRK-001",
        material: "AL 6061-T6",
        finish: "Anodize Type II",
        units: "mm",
      },
      notes: [
        { category: "inspection", text: "First article inspection per AS9102 required" },
      ],
      bounding_box: { length: 150, width: 100, height: 25, unit: "mm" },
    }, { quantity: 50 });

    const qi = result.quote_input;
    expect(qi.part_name).toBe("Bracket Assembly");
    expect(qi.material).toBe("aluminum_6061");
    expect(qi.quantity).toBe(50);
    expect(qi.stock_dimensions_mm).toBeDefined();
    expect(qi.features!.length).toBeGreaterThanOrEqual(3); // holes, threads, chamfers
    expect(qi.secondary_ops!.some((o: any) => o.type === "anodize_type_ii")).toBe(true);
    expect(qi.first_article_required).toBe(true);
    expect(qi.inspection_level).toBe("detailed");
    expect(result.extraction_confidence).toBeGreaterThan(50);
    expect(result.extraction_notes.length).toBeGreaterThan(0);
  });

  it("resolves common material strings", () => {
    expect(engine.resolveMaterial("6061-T6")).toBe("aluminum_6061");
    expect(engine.resolveMaterial("SS 304")).toBe("stainless_304");
    expect(engine.resolveMaterial("Ti-6Al-4V")).toBe("titanium_gr5");
    expect(engine.resolveMaterial("AISI 4140")).toBe("steel_4140");
    expect(engine.resolveMaterial("PEEK")).toBe("plastic_peek");
    expect(engine.resolveMaterial("Unknown Alloy X")).toBeNull();
  });

  it("handles minimal blueprint (title block only)", () => {
    const result = engine.bridge({
      title_block: { part_name: "Simple Part", material: "1018" },
    }, { quantity: 10 });

    expect(result.quote_input.material).toBe("steel_1018");
    expect(result.quote_input.complexity).toBe("simple");
    expect(result.extraction_confidence).toBeGreaterThan(20);
  });

  it("infers lathe from diameter-heavy drawings", () => {
    const result = engine.bridge({
      dimensions: [
        { type: "diameter", value: 25, unit: "mm", text: "Ø25" },
        { type: "diameter", value: 20, unit: "mm", text: "Ø20" },
        { type: "diameter", value: 15, unit: "mm", text: "Ø15" },
        { type: "diameter", value: 10, unit: "mm", text: "Ø10" },
        { type: "linear", value: 50, unit: "mm", text: "50" },
      ],
    });
    expect(result.quote_input.machine_type).toBe("cnc_lathe");
  });

  it("detects certifications from notes", () => {
    const result = engine.bridge({
      notes: [
        { category: "process", text: "ITAR controlled — handle per DFARS" },
        { category: "inspection", text: "NADCAP required for heat treat" },
      ],
    });
    expect(result.quote_input.certifications).toContain("ITAR");
    expect(result.quote_input.certifications).toContain("NADCAP");
  });

  it("maps finish notes to secondary ops", () => {
    const result = engine.bridge({
      title_block: { finish: "Hard Chrome Plate" },
      notes: [
        { category: "finish", text: "Bead blast before plating" },
      ],
    });
    const ops = result.quote_input.secondary_ops ?? [];
    expect(ops.some((o: any) => o.type === "chrome_plate")).toBe(true);
    expect(ops.some((o: any) => o.type === "bead_blast")).toBe(true);
  });
});

// ─── SheetMetalQuoteEngine ──────────────────────────────────

describe("SheetMetalQuoteEngine", () => {
  let engine: any;

  it("loads engine", async () => {
    const mod = await import("../engines/SheetMetalQuoteEngine.js");
    engine = mod.sheetMetalQuoteEngine;
    expect(engine).toBeDefined();
  });

  it("quotes a basic sheet metal part", () => {
    const result = engine.quote({
      part_name: "Bracket",
      quantity: 100,
      material: "mild_steel",
      thickness_mm: 2,
      flat_length_mm: 200,
      flat_width_mm: 150,
      perimeter_mm: 700,
      num_holes: 4,
      num_bends: 2,
    });

    expect(result.quote_id).toMatch(/^SM/);
    expect(result.costs.material.sheets_needed).toBeGreaterThan(0);
    expect(result.costs.cutting.method).toBe("laser_fiber");
    expect(result.costs.cutting.total).toBeGreaterThan(0);
    expect(result.costs.bending.bend_count).toBe(2);
    expect(result.costs.bending.total).toBeGreaterThan(0);
    expect(result.costs.total_cost).toBeGreaterThan(0);
    expect(result.pricing.unit_price).toBeGreaterThan(result.costs.cost_per_part);
    expect(result.pricing.margin_pct).toBeGreaterThan(15);
    expect(result.lead_time.total_standard_days).toBeGreaterThan(0);
  });

  it("quotes stainless with finishing", () => {
    const result = engine.quote({
      quantity: 25,
      material: "stainless_304",
      thickness_mm: 1.5,
      flat_length_mm: 300,
      flat_width_mm: 200,
      perimeter_mm: 1200,
      num_holes: 8,
      num_cutouts: 2,
      num_bends: 4,
      finish: "passivate",
    });

    expect(result.costs.finishing).not.toBeNull();
    expect(result.costs.finishing!.type).toBe("passivate");
    expect(result.costs.finishing!.total).toBeGreaterThan(0);
    expect(result.lead_time.finishing_days).toBeGreaterThan(0);
  });

  it("includes welding cost when specified", () => {
    const result = engine.quote({
      quantity: 10,
      material: "mild_steel",
      thickness_mm: 3,
      flat_length_mm: 400,
      flat_width_mm: 300,
      perimeter_mm: 1400,
      weld_length_mm: 200,
      weld_type: "tig",
    });

    expect(result.costs.welding).not.toBeNull();
    expect(result.costs.welding!.weld_time_min).toBeGreaterThan(0);
    expect(result.costs.welding!.total).toBeGreaterThan(0);
  });

  it("handles hardware insertion costs", () => {
    const result = engine.quote({
      quantity: 50,
      material: "aluminum_5052",
      thickness_mm: 1.6,
      flat_length_mm: 150,
      flat_width_mm: 100,
      perimeter_mm: 500,
      hardware: [
        { type: "PEM_nut", count: 4, cost_each: 0.25 },
        { type: "PEM_stud", count: 2, cost_each: 0.40 },
      ],
    });

    expect(result.costs.hardware.items.length).toBe(2);
    expect(result.costs.hardware.total).toBeGreaterThan(0);
  });

  it("generates DfM warnings for thick aluminum + laser", () => {
    const result = engine.quote({
      quantity: 5,
      material: "aluminum_6061",
      thickness_mm: 10,
      flat_length_mm: 200,
      flat_width_mm: 200,
      perimeter_mm: 800,
      cutting_method: "laser_fiber",
    });

    expect(result.dfm_warnings.some((w: string) => w.includes("waterjet"))).toBe(true);
  });

  it("produces price breaks", () => {
    const result = engine.quote({
      quantity: 25,
      material: "mild_steel",
      thickness_mm: 2,
      flat_length_mm: 200,
      flat_width_mm: 150,
      perimeter_mm: 700,
    });

    expect(result.price_breaks.length).toBeGreaterThan(0);
    // Higher qty should be cheaper per unit
    const qty1 = result.price_breaks.find((b: any) => b.qty === 1);
    const qty100 = result.price_breaks.find((b: any) => b.qty === 100);
    if (qty1 && qty100) {
      expect(qty100.unit_price).toBeLessThan(qty1.unit_price);
    }
  });

  it("skips bending cost when no bends", () => {
    const result = engine.quote({
      quantity: 10,
      material: "mild_steel",
      thickness_mm: 1,
      flat_length_mm: 100,
      flat_width_mm: 100,
      perimeter_mm: 400,
    });
    expect(result.costs.bending.total).toBe(0);
  });
});

// ─── AdditiveQuoteEngine ────────────────────────────────────

describe("AdditiveQuoteEngine", () => {
  let engine: any;

  it("loads engine", async () => {
    const mod = await import("../engines/AdditiveQuoteEngine.js");
    engine = mod.additiveQuoteEngine;
    expect(engine).toBeDefined();
  });

  it("quotes FDM part", () => {
    const result = engine.quote({
      quantity: 5,
      bounding_box_mm: { x: 100, y: 80, z: 50 },
      part_volume_cm3: 120,
      technology: "fdm",
      material: "pla",
      infill_pct: 20,
    });

    expect(result.quote_id).toMatch(/^AM/);
    expect(result.technology).toBe("FDM");
    expect(result.costs.material.price_per_cm3).toBe(0.05);
    expect(result.costs.machine_time.rate_hr).toBe(8);
    expect(result.costs.total_cost).toBeGreaterThan(0);
    expect(result.pricing.unit_price).toBeGreaterThan(0);
    expect(result.build_info.layer_height_mm).toBe(0.2);
    expect(result.build_info.num_layers).toBe(250); // 50mm / 0.2mm
  });

  it("quotes DMLS metal part", () => {
    const result = engine.quote({
      quantity: 2,
      bounding_box_mm: { x: 50, y: 50, z: 30 },
      part_volume_cm3: 25,
      technology: "dmls",
      material: "ti64",
    });

    expect(result.costs.material.price_per_cm3).toBe(3.50);
    expect(result.costs.machine_time.rate_hr).toBe(135);
    expect(result.costs.post_processing.operations.some((o: any) => o.type === "heat_treat")).toBe(true);
    expect(result.pricing.unit_price).toBeGreaterThan(100); // metal printing is expensive
  });

  it("quotes SLS nylon", () => {
    const result = engine.quote({
      quantity: 20,
      bounding_box_mm: { x: 60, y: 40, z: 30 },
      part_volume_cm3: 30,
      technology: "sls",
      material: "nylon_pa12",
    });

    expect(result.build_info.estimated_support_pct).toBe(0); // SLS doesn't need supports
    expect(result.costs.material.support_cm3).toBe(0);
  });

  it("lists materials for a technology", () => {
    const fdmMats = engine.listMaterials("fdm");
    expect(fdmMats.length).toBeGreaterThanOrEqual(7);
    expect(fdmMats.some((m: any) => m.id === "pla")).toBe(true);

    const dmlsMats = engine.listMaterials("dmls");
    expect(dmlsMats.length).toBeGreaterThanOrEqual(5);
    expect(dmlsMats.some((m: any) => m.id === "ti64")).toBe(true);
  });

  it("compares technologies for same part", () => {
    const results = engine.compareTechnologies(
      { quantity: 10, bounding_box_mm: { x: 80, y: 60, z: 40 }, part_volume_cm3: 50 },
      [
        { technology: "fdm", material: "abs" },
        { technology: "sls", material: "nylon_pa12" },
        { technology: "mjf", material: "nylon_pa12" },
      ],
    );

    expect(results.length).toBe(3);
    expect(results[0].technology).toBe("fdm");
    // FDM should be cheapest
    expect(results[0].unit_price).toBeLessThan(results[1].unit_price);
  });

  it("warns about material-technology mismatch", () => {
    const result = engine.quote({
      quantity: 1,
      bounding_box_mm: { x: 50, y: 50, z: 50 },
      part_volume_cm3: 40,
      technology: "fdm",
      material: "ti64", // DMLS material on FDM
    });

    expect(result.dfm_warnings.some((w: string) => w.includes("not typically used"))).toBe(true);
  });

  it("warns about oversized parts", () => {
    const result = engine.quote({
      quantity: 1,
      bounding_box_mm: { x: 500, y: 500, z: 500 }, // too big for FDM
      part_volume_cm3: 5000,
      technology: "fdm",
      material: "pla",
    });

    expect(result.dfm_warnings.some((w: string) => w.includes("exceeds build volume"))).toBe(true);
  });

  it("produces price breaks", () => {
    const result = engine.quote({
      quantity: 10,
      bounding_box_mm: { x: 60, y: 40, z: 30 },
      part_volume_cm3: 30,
      technology: "sls",
      material: "nylon_pa12",
    });

    expect(result.price_breaks.length).toBeGreaterThan(0);
  });
});

// ─── Dispatcher Wiring ──────────────────────────────────────

describe("Business Dispatcher — New Quoting Actions", () => {
  it("has all new actions in ACTIONS array", async () => {
    const mod = await import("../tools/dispatchers/businessDispatcher.js");
    const src = mod.registerBusinessDispatcher.toString();
    const newActions = [
      "machine_rate_lookup", "machine_rate_list", "machine_rate_compare", "machine_rate_effective",
      "blueprint_to_quote", "blueprint_resolve_material",
      "sheet_metal_quote",
      "additive_quote", "additive_list_materials", "additive_compare_technologies",
    ];
    for (const action of newActions) {
      expect(src).toContain(action);
    }
  });
});
