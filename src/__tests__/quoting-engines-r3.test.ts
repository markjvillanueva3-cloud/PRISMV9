/**
 * Tests for Quoting Engines R3: Casting, WeldFabrication, MultiProcess
 */
import { describe, it, expect } from "vitest";
import { CastingQuoteEngine } from "../engines/CastingQuoteEngine.js";
import { WeldFabricationQuoteEngine } from "../engines/WeldFabricationQuoteEngine.js";
import { MultiProcessQuoteEngine } from "../engines/MultiProcessQuoteEngine.js";

// ── CastingQuoteEngine ──
describe("CastingQuoteEngine", () => {
  const engine = new CastingQuoteEngine();

  it("quotes die cast aluminum A380", () => {
    const r = engine.quote({
      process: "die_cast", material: "aluminum_a380",
      part_volume_cm3: 50, quantity: 5000,
    });
    expect(r.tooling_cost_usd).toBeGreaterThan(0);
    expect(r.per_part.material_cost).toBeGreaterThan(0);
    expect(r.per_part.process_cost).toBeGreaterThan(0);
    expect(r.price_per_part).toBeGreaterThan(r.per_part.total_unit_cost);
    expect(r.part_weight_kg).toBeCloseTo(0.136, 1);
    expect(r.margin_pct).toBe(25);
  });

  it("quotes investment cast stainless", () => {
    const r = engine.quote({
      process: "investment", material: "stainless_cf8m",
      part_volume_cm3: 30, quantity: 200,
    });
    expect(r.process).toBe("investment");
    expect(r.tooling_cost_usd).toBeGreaterThan(0);
    expect(r.tooling_life).toContain("wax die");
  });

  it("quotes sand cast gray iron", () => {
    const r = engine.quote({
      process: "sand", material: "gray_iron_30",
      part_volume_cm3: 500, quantity: 50,
    });
    expect(r.process).toBe("sand");
    expect(r.per_part.material_cost).toBeGreaterThan(0);
    expect(r.tooling_life).toContain("pattern");
  });

  it("warns low volume die casting", () => {
    const r = engine.quote({
      process: "die_cast", material: "aluminum_a380",
      part_volume_cm3: 20, quantity: 100,
    });
    expect(r.dfm_warnings.some(w => w.includes("<500 parts"))).toBe(true);
  });

  it("warns high volume sand casting", () => {
    const r = engine.quote({
      process: "sand", material: "gray_iron_30",
      part_volume_cm3: 100, quantity: 50000,
    });
    expect(r.dfm_warnings.some(w => w.includes("die casting"))).toBe(true);
  });

  it("rejects incompatible material/process", () => {
    expect(() => engine.quote({
      process: "die_cast", material: "gray_iron_30",
      part_volume_cm3: 50, quantity: 100,
    })).toThrow("not available for die_cast");
  });

  it("compares processes for A356", () => {
    const r = engine.compareProcesses({
      material: "aluminum_a356", part_volume_cm3: 80, quantity: 500,
    });
    expect(r.length).toBe(2); // investment + sand
    expect(r[0].recommended).toBe(true);
    expect(r[0].price_per_part).toBeLessThanOrEqual(r[1].price_per_part);
  });

  it("lists all casting materials", () => {
    const mats = engine.listMaterials();
    expect(mats.length).toBeGreaterThanOrEqual(12);
    expect(mats.some(m => m.key === "aluminum_a380")).toBe(true);
    expect(mats.some(m => m.key === "inconel_713c")).toBe(true);
  });

  it("DfM analysis — good part scores high", () => {
    const r = engine.analyzeDfm({
      process: "die_cast", material: "aluminum_a380",
      wall_thickness_mm: 2.0, draft_angle_deg: 2.0,
    });
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it("DfM analysis — thin wall + no draft scores low", () => {
    const r = engine.analyzeDfm({
      process: "die_cast", material: "aluminum_a380",
      wall_thickness_mm: 0.5, draft_angle_deg: 0.3, undercuts: 5,
    });
    expect(r.score).toBeLessThan(50);
    expect(r.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it("generates price breaks", () => {
    const r = engine.quote({
      process: "die_cast", material: "zinc_zamak3",
      part_volume_cm3: 10, quantity: 2000,
    });
    expect(r.price_breaks).toBeDefined();
    expect(r.price_breaks!.length).toBeGreaterThan(0);
  });

  it("adds cost for slides and cores in die cast", () => {
    const base = engine.quote({
      process: "die_cast", material: "aluminum_a380",
      part_volume_cm3: 50, quantity: 5000,
    });
    const complex = engine.quote({
      process: "die_cast", material: "aluminum_a380",
      part_volume_cm3: 50, quantity: 5000,
      num_slides: 3, num_cores: 2,
    });
    expect(complex.tooling_cost_usd).toBeGreaterThan(base.tooling_cost_usd + 15000);
  });
});

// ── WeldFabricationQuoteEngine ──
describe("WeldFabricationQuoteEngine", () => {
  const engine = new WeldFabricationQuoteEngine();

  it("quotes a simple fillet weld assembly", () => {
    const r = engine.quote({
      joints: [
        { type: "fillet", length_mm: 500, thickness_mm: 6 },
        { type: "fillet", length_mm: 300, thickness_mm: 6 },
      ],
      material: "steel",
    });
    expect(r.joints_summary.count).toBe(2);
    expect(r.joints_summary.total_length_m).toBeCloseTo(0.8, 1);
    expect(r.joints_summary.total_filler_kg).toBeGreaterThan(0);
    expect(r.cost_breakdown.welding_labor).toBeGreaterThan(0);
    expect(r.cost_breakdown.consumables).toBeGreaterThan(0);
    expect(r.price_per_assembly).toBeGreaterThan(r.cost_breakdown.total_per_assembly);
  });

  it("TIG is more expensive than MIG for same joint", () => {
    const mig = engine.quote({
      joints: [{ type: "single_v", length_mm: 1000, thickness_mm: 8 }],
      process: "gmaw_mig", material: "steel",
    });
    const tig = engine.quote({
      joints: [{ type: "single_v", length_mm: 1000, thickness_mm: 8 }],
      process: "gtaw_tig", material: "steel",
    });
    expect(tig.cost_breakdown.welding_labor).toBeGreaterThan(mig.cost_breakdown.welding_labor);
  });

  it("adds NDE inspection cost", () => {
    const noNde = engine.quote({
      joints: [{ type: "fillet", length_mm: 500, thickness_mm: 6 }],
      material: "steel",
    });
    const withNde = engine.quote({
      joints: [{ type: "fillet", length_mm: 500, thickness_mm: 6 }],
      material: "steel", nde_method: "radiographic",
    });
    expect(withNde.cost_breakdown.nde_inspection).toBeGreaterThan(noNde.cost_breakdown.nde_inspection);
  });

  it("adds stress relief and galvanize costs", () => {
    const r = engine.quote({
      joints: [{ type: "fillet", length_mm: 500, thickness_mm: 8 }],
      material: "steel", stress_relief: true, hot_dip_galvanize: true,
    });
    expect(r.cost_breakdown.stress_relief).toBeGreaterThan(0);
    expect(r.cost_breakdown.finishing).toBeGreaterThan(0);
  });

  it("calculates single joint cost", () => {
    const r = engine.jointCost({
      type: "fillet", length_mm: 300, thickness_mm: 8,
    });
    expect(r.filler_kg).toBeGreaterThan(0);
    expect(r.weld_time_hr).toBeGreaterThan(0);
    expect(r.total).toBe(r.labor_cost + r.consumable_cost);
  });

  it("estimates consumables", () => {
    const r = engine.consumables({
      joints: [
        { type: "fillet", length_mm: 1000, thickness_mm: 10 },
        { type: "single_v", length_mm: 500, thickness_mm: 12 },
      ],
    });
    expect(r.filler_kg).toBeGreaterThan(0);
    expect(r.gas_liters).toBeGreaterThan(0); // MIG uses gas
    expect(r.consumable_cost_total).toBeGreaterThan(0);
  });

  it("warns on very long weld time", () => {
    const r = engine.quote({
      joints: Array(50).fill({ type: "single_v", length_mm: 2000, thickness_mm: 20 }),
      material: "steel",
    });
    if (r.welding_hours > 40) {
      expect(r.warnings.some(w => w.includes("robotic"))).toBe(true);
    }
  });

  it("overhead is a function of direct labor", () => {
    const r = engine.quote({
      joints: [{ type: "fillet", length_mm: 500, thickness_mm: 6 }],
      material: "steel",
    });
    const directLabor = r.cost_breakdown.fit_up_labor + r.cost_breakdown.welding_labor;
    expect(r.cost_breakdown.overhead).toBeGreaterThan(0);
    expect(r.cost_breakdown.overhead).toBeLessThan(directLabor); // overhead < 100% of labor
  });
});

// ── MultiProcessQuoteEngine ──
describe("MultiProcessQuoteEngine", () => {
  const engine = new MultiProcessQuoteEngine();

  it("quotes a multi-process assembly", () => {
    const r = engine.quote({
      project_name: "Bracket Assembly",
      steps: [
        { id: "cnc", process: "cnc_machining", description: "Machine body", unit_cost: 45, tooling_cost: 500, lead_time_days: 10 },
        { id: "sheet", process: "sheet_metal", description: "Cut bracket", unit_cost: 12, lead_time_days: 5 },
        { id: "weld", process: "welding", description: "Weld bracket to body", unit_cost: 18, lead_time_days: 3, depends_on: ["cnc", "sheet"] },
        { id: "coat", process: "secondary_ops", description: "Powder coat", unit_cost: 8, lead_time_days: 5, depends_on: ["weld"] },
      ],
      quantity: 100,
    });
    expect(r.steps.length).toBe(4);
    expect(r.summary.total_unit_cost).toBe(45 + 12 + 18 + 8);
    expect(r.summary.price_per_part).toBeGreaterThan(r.summary.cost_per_part);
    expect(r.schedule.critical_path_days).toBe(10 + 3 + 5); // cnc→weld→coat
    expect(r.summary.margin_pct).toBe(25);
  });

  it("handles parallel steps in schedule", () => {
    const r = engine.quote({
      steps: [
        { id: "a", process: "cnc_machining", description: "Part A", unit_cost: 30, lead_time_days: 10 },
        { id: "b", process: "sheet_metal", description: "Part B", unit_cost: 20, lead_time_days: 5 },
        { id: "c", process: "welding", description: "Assemble", unit_cost: 15, lead_time_days: 3, depends_on: ["a", "b"] },
      ],
      quantity: 50,
    });
    // a and b are parallel, c depends on both → critical path = max(10,5) + 3 = 13
    expect(r.schedule.critical_path_days).toBe(13);
    expect(r.schedule.parallel_paths.length).toBeGreaterThanOrEqual(2);
  });

  it("applies rush multiplier", () => {
    const normal = engine.quote({
      steps: [{ id: "a", process: "cnc_machining", description: "Part", unit_cost: 50, lead_time_days: 5 }],
      quantity: 10,
    });
    const rush = engine.quote({
      steps: [{ id: "a", process: "cnc_machining", description: "Part", unit_cost: 50, lead_time_days: 5 }],
      quantity: 10, rush: true,
    });
    expect(rush.summary.price_per_part).toBeGreaterThan(normal.summary.price_per_part * 1.3);
  });

  it("amortizes NRE over quantity", () => {
    const small = engine.quote({
      steps: [{ id: "a", process: "cnc_machining", description: "Part", unit_cost: 20, tooling_cost: 5000, lead_time_days: 5 }],
      quantity: 10,
    });
    const large = engine.quote({
      steps: [{ id: "a", process: "cnc_machining", description: "Part", unit_cost: 20, tooling_cost: 5000, lead_time_days: 5 }],
      quantity: 1000,
    });
    expect(large.summary.amortized_nre_per_part).toBeLessThan(small.summary.amortized_nre_per_part);
  });

  it("warns on high tooling NRE", () => {
    const r = engine.quote({
      steps: [
        { id: "a", process: "injection_mold", description: "Mold", unit_cost: 1, tooling_cost: 60000, lead_time_days: 20 },
      ],
      quantity: 100,
    });
    expect(r.warnings.some(w => w.includes("High tooling NRE"))).toBe(true);
  });

  it("quick estimate without pre-computed costs", () => {
    const r = engine.estimate({
      steps: [
        { process: "cnc_machining", hours: 0.5, material_cost: 10, lead_days: 7 },
        { process: "secondary_ops", hours: 0.2, lead_days: 3 },
      ],
      quantity: 50,
    });
    expect(r.cost_per_part).toBeGreaterThan(0);
    expect(r.price_per_part).toBeGreaterThan(r.cost_per_part);
    expect(r.lead_days).toBe(7);
  });

  it("generates price breaks", () => {
    const r = engine.quote({
      steps: [{ id: "a", process: "cnc_machining", description: "Part", unit_cost: 30, tooling_cost: 2000, lead_time_days: 5 }],
      quantity: 25,
    });
    expect(r.price_breaks).toBeDefined();
    expect(r.price_breaks!.length).toBeGreaterThan(0);
  });

  it("includes engineering NRE", () => {
    const r = engine.quote({
      steps: [{ id: "a", process: "cnc_machining", description: "Part", unit_cost: 20, lead_time_days: 5 }],
      quantity: 100,
      engineering_hours: 10,
      engineering_rate_hr: 100,
    });
    expect(r.summary.engineering_nre).toBe(1000);
    expect(r.summary.amortized_nre_per_part).toBe(10); // 1000/100
  });
});

// ── Dispatcher wiring ──
describe("businessDispatcher quoting R3 wiring", () => {
  it("dispatcher module loads", async () => {
    const mod = await import("../tools/dispatchers/businessDispatcher.js");
    expect(mod.registerBusinessDispatcher).toBeDefined();
  });
});
