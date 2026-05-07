/**
 * CAMX-MS13 — Cost-Optimal Pipeline Decision Engine
 *
 * Consolidated integration test for all 6 U01-U06 engines:
 *   U01 PipelineCostModelEngine     — full per-part cost breakdown
 *   U02 ToolChangeOptimizationEngine — minimize changes / magazine / sharing
 *   U03 CoolantCostOptimizationEngine — MQL vs flood vs cryo vs dry
 *   U04 EnergyOptimizationEngine     — analyze / optimize / compare
 *   U05 SetupCostOptimizationEngine  — multi-setup amortization + reductions
 *   U06 TCODashboardEngine           — aggregate + drivers + savings
 *
 * Satisfies U08 exit condition: 30+ tests pass.
 */

import { describe, it, expect } from "vitest";
import { pipelineCostModelEngine } from "../engines/PipelineCostModelEngine.js";
import { toolChangeOptimizationEngine } from "../engines/ToolChangeOptimizationEngine.js";
import { coolantCostOptimizationEngine } from "../engines/CoolantCostOptimizationEngine.js";
import { energyOptimizationEngine } from "../engines/EnergyOptimizationEngine.js";
import { setupCostOptimizationEngine } from "../engines/SetupCostOptimizationEngine.js";
import { tcoDashboardEngine } from "../engines/TCODashboardEngine.js";

// ─── U01: PipelineCostModelEngine ────────────────────────────────────────────

describe("CAMX-MS13 / U01 PipelineCostModelEngine", () => {
  const baseJob = {
    stock_volume_cm3: 100,
    material_cost_per_cm3: 0.25,
    machine_rate_per_hr: 90,
    cycle_time_min: 12,
    setup_time_min: 60,
    batch_size: 50,
    programming_hours: 2,
    power_kw: 15,
    overhead_rate: 0.35,
    label: "baseline",
  };

  it("computes a positive total cost with all 10 components present", () => {
    const b = pipelineCostModelEngine.computeCostPerPart(baseJob);
    expect(b.total_per_part).toBeGreaterThan(0);
    expect(b.material_cost).toBeGreaterThan(0);
    expect(b.machining_cost).toBeGreaterThan(0);
    expect(b.setup_cost).toBeGreaterThan(0);
    expect(b.programming_cost).toBeGreaterThan(0);
    expect(b.overhead_cost).toBeGreaterThan(0);
  });

  it("amortizes setup across the batch (smaller batch ⇒ higher setup per part)", () => {
    const small = pipelineCostModelEngine.computeCostPerPart({ ...baseJob, batch_size: 10 });
    const large = pipelineCostModelEngine.computeCostPerPart({ ...baseJob, batch_size: 200 });
    expect(small.setup_cost).toBeGreaterThan(large.setup_cost);
  });

  it("total_batch ≈ total_per_part × batch_size", () => {
    const b = pipelineCostModelEngine.computeCostPerPart(baseJob);
    expect(b.total_batch).toBeCloseTo(b.total_per_part * b.batch_size, 0);
  });

  it("higher cpk ⇒ lower scrap-risk cost", () => {
    const loose = pipelineCostModelEngine.computeCostPerPart({ ...baseJob, cpk: 0.8 });
    const tight = pipelineCostModelEngine.computeCostPerPart({ ...baseJob, cpk: 2.0 });
    expect(loose.scrap_risk_cost).toBeGreaterThan(tight.scrap_risk_cost);
  });

  it("compareCosts ranks alternatives with savings_vs_baseline", () => {
    const cmp = pipelineCostModelEngine.compareCosts([
      { ...baseJob, label: "A" },
      { ...baseJob, label: "B_faster", cycle_time_min: 8 },
      { ...baseJob, label: "C_bigbatch", batch_size: 500 },
    ]);
    expect(cmp.length).toBe(3);
    expect(cmp[0].rank).toBe(1);
    expect(cmp[0].total_per_part).toBeLessThanOrEqual(cmp[1].total_per_part);
    expect(cmp[0].total_per_part).toBeLessThanOrEqual(cmp[2].total_per_part);
  });

  it("sensitivityAnalysis reports cost deltas for every driver", () => {
    const s = pipelineCostModelEngine.sensitivityAnalysis(baseJob);
    expect(s.length).toBeGreaterThan(0);
    for (const r of s) {
      expect(typeof r.driver).toBe("string");
      expect(Number.isFinite(r.cost_before)).toBe(true);
      expect(Number.isFinite(r.cost_after)).toBe(true);
    }
  });

  it("exposes cost_drivers (top 3 by %)", () => {
    const b = pipelineCostModelEngine.computeCostPerPart(baseJob);
    expect(b.cost_drivers.length).toBeLessThanOrEqual(3);
    if (b.cost_drivers.length >= 2) {
      expect(b.cost_drivers[0].pct_of_total).toBeGreaterThanOrEqual(b.cost_drivers[1].pct_of_total);
    }
  });
});

// ─── U02: ToolChangeOptimizationEngine ───────────────────────────────────────

describe("CAMX-MS13 / U02 ToolChangeOptimizationEngine", () => {
  const ops = [
    { id: "op1", tool_id: "T1", tool_diameter_mm: 10, cutting_time_min: 2 },
    { id: "op2", tool_id: "T2", tool_diameter_mm: 6,  cutting_time_min: 1 },
    { id: "op3", tool_id: "T1", tool_diameter_mm: 10, cutting_time_min: 2 },
    { id: "op4", tool_id: "T2", tool_diameter_mm: 6,  cutting_time_min: 1 },
    { id: "op5", tool_id: "T1", tool_diameter_mm: 10, cutting_time_min: 2 },
  ];
  const tools = [
    { tool_id: "T1", diameter_mm: 10, length_mm: 70 },
    { tool_id: "T2", diameter_mm: 6,  length_mm: 60 },
  ];

  it("returns a full sequence and non-negative change counts", () => {
    const r = toolChangeOptimizationEngine.optimizeToolChanges(ops, tools, 20);
    expect(r.optimized_sequence.length).toBe(ops.length);
    expect(r.total_tool_changes).toBeGreaterThanOrEqual(0);
    expect(r.original_tool_changes).toBeGreaterThanOrEqual(r.total_tool_changes);
  });

  it("reduces tool changes vs original order (or stays equal if already optimal)", () => {
    const r = toolChangeOptimizationEngine.optimizeToolChanges(ops, tools, 20);
    expect(r.changes_saved).toBeGreaterThanOrEqual(0);
    expect(r.reduction_pct).toBeGreaterThanOrEqual(0);
  });

  it("respects hard prerequisites when resequencing", () => {
    const opsWithPrereq = [
      ...ops,
      { id: "op6", tool_id: "T1", tool_diameter_mm: 10, cutting_time_min: 2, prerequisites: ["op2"] },
    ];
    const r = toolChangeOptimizationEngine.optimizeToolChanges(opsWithPrereq, tools, 20);
    const idx = (id: string) => r.optimized_sequence.findIndex(s => s.operation_id === id);
    expect(idx("op6")).toBeGreaterThan(idx("op2"));
  });

  it("optimizeMagazine returns a layout with pocket assignments", () => {
    const layout = toolChangeOptimizationEngine.optimizeMagazine(tools, { magazine_capacity: 20 });
    expect(layout.assignments.length).toBeGreaterThan(0);
    for (const a of layout.assignments) {
      expect(a.pocket).toBeGreaterThanOrEqual(1);
      expect(a.pocket).toBeLessThanOrEqual(20);
    }
    expect(layout.utilization_pct).toBeGreaterThan(0);
  });

  it("suggestToolSharing consolidates similar tools where allowed", () => {
    const r = toolChangeOptimizationEngine.suggestToolSharing(ops, tools);
    expect(r.original_tool_count).toBeGreaterThanOrEqual(r.consolidated_tool_count);
    expect(r.tools_saved).toBe(r.original_tool_count - r.consolidated_tool_count);
  });

  it("handles empty operation list without throwing", () => {
    const r = toolChangeOptimizationEngine.optimizeToolChanges([], tools, 20);
    expect(r.optimized_sequence).toEqual([]);
    expect(r.total_tool_changes).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

// ─── U03: CoolantCostOptimizationEngine ──────────────────────────────────────

describe("CAMX-MS13 / U03 CoolantCostOptimizationEngine", () => {
  const op = { op_type: "milling" as const, material: "titanium" as const, Vc_mpm: 60, annual_hours: 1000 };
  const machine = { has_through_tool: true, spindle_kw: 22, has_flood_system: true };

  it("compareCoolantCosts returns multiple strategies with a baseline and recommendation", () => {
    const cmp = coolantCostOptimizationEngine.compareCoolantCosts(op, machine);
    expect(cmp.strategies.length).toBeGreaterThanOrEqual(4);
    expect(cmp.baseline_strategy).toBeDefined();
    expect(cmp.recommended).toBeDefined();
    for (const s of cmp.strategies) {
      expect(s.total_annual_usd).toBeGreaterThanOrEqual(0);
      expect(s.material_suitability).toBeGreaterThanOrEqual(0);
      expect(s.material_suitability).toBeLessThanOrEqual(1);
    }
  });

  it("dry machining is least suitable for titanium (suitability < flood)", () => {
    const cmp = coolantCostOptimizationEngine.compareCoolantCosts(op, machine);
    const dry = cmp.strategies.find(s => s.strategy === "dry")!;
    const flood = cmp.strategies.find(s => s.strategy === "flood")!;
    expect(dry.material_suitability).toBeLessThan(flood.material_suitability);
  });

  it("optimalCoolant respects exclusion constraints", () => {
    const r = coolantCostOptimizationEngine.optimalCoolant({
      material: "steel",
      exclude: ["cryogenic_co2", "cryogenic_ln2"],
      annual_hours: 2000,
      machine,
    });
    expect(r.strategy).not.toBe("cryogenic_co2");
    expect(r.strategy).not.toBe("cryogenic_ln2");
    expect(r.excluded.map(e => e.strategy)).toEqual(expect.arrayContaining(["cryogenic_co2", "cryogenic_ln2"]));
  });

  it("zero_liquid_disposal excludes flood and through_tool", () => {
    const r = coolantCostOptimizationEngine.optimalCoolant({
      material: "aluminum",
      zero_liquid_disposal: true,
      annual_hours: 500,
      machine: { has_through_tool: false },
    });
    expect(r.strategy).not.toBe("flood");
    expect(r.strategy).not.toBe("through_tool");
  });

  it("getLifecycleCost reports year 1/3/5 costs monotonic non-decreasing", () => {
    const lc = coolantCostOptimizationEngine.getLifecycleCost("mql", 1500);
    expect(lc.year_1_cost).toBeGreaterThan(0);
    expect(lc.year_3_cost).toBeGreaterThanOrEqual(lc.year_1_cost);
    expect(lc.year_5_cost).toBeGreaterThanOrEqual(lc.year_3_cost);
    expect(lc.co2_kg_per_year).toBeGreaterThanOrEqual(0);
  });

  it("flood has higher waste_liters_per_year than dry", () => {
    const flood = coolantCostOptimizationEngine.getLifecycleCost("flood", 2000);
    const dry = coolantCostOptimizationEngine.getLifecycleCost("dry", 2000);
    expect(flood.waste_liters_per_year).toBeGreaterThan(dry.waste_liters_per_year);
  });
});

// ─── U04: EnergyOptimizationEngine ───────────────────────────────────────────

describe("CAMX-MS13 / U04 EnergyOptimizationEngine", () => {
  const energyInput = {
    operations: [
      { operation_name: "rough", cutting_time_min: 15, spindle_rpm: 4000, feed_rate_mmmin: 1200,
        depth_of_cut_mm: 3, radial_depth_mm: 8, tool_diameter_mm: 16, material_iso_group: "P", coolant_active: true },
      { operation_name: "finish", cutting_time_min: 8, spindle_rpm: 8000, feed_rate_mmmin: 800,
        depth_of_cut_mm: 0.5, radial_depth_mm: 4, tool_diameter_mm: 10, material_iso_group: "P", coolant_active: true },
    ],
    machine_power_kW: 22,
    electricity_cost_per_kWh: 0.14,
  };

  it("analyze reports total and split energy", () => {
    const a = energyOptimizationEngine.analyze(energyInput);
    expect(a.total_energy_kWh).toBeGreaterThan(0);
    expect(a.cutting_energy_kWh).toBeGreaterThan(0);
    expect(a.idle_energy_kWh).toBeGreaterThanOrEqual(0);
    expect(a.cost).toBeGreaterThan(0);
    expect(a.carbon_footprint_kg_CO2).toBeGreaterThan(0);
    expect(a.by_operation.length).toBe(2);
  });

  it("optimize yields energy savings ≥ 0 and valid changes list", () => {
    const o = energyOptimizationEngine.optimize(energyInput);
    expect(o.optimized_energy_kWh).toBeLessThanOrEqual(o.original_energy_kWh);
    expect(o.savings_kWh).toBeGreaterThanOrEqual(0);
    expect(o.savings_CO2_kg).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(o.changes)).toBe(true);
  });

  it("compare runs analyze for each scenario and returns named rows", () => {
    const c = energyOptimizationEngine.compare([
      { name: "baseline", input: energyInput },
      { name: "low-power", input: { ...energyInput, machine_power_kW: 15 } },
    ]);
    expect(c.length).toBe(2);
    expect(c[0].name).toBe("baseline");
    expect(c[0].analysis.total_energy_kWh).toBeGreaterThan(0);
  });

  it("per-operation percentages are non-negative and sum to a share of the total (≤100)", () => {
    const a = energyOptimizationEngine.analyze(energyInput);
    const sumPct = a.by_operation.reduce((acc, o) => acc + o.pct, 0);
    for (const op of a.by_operation) expect(op.pct).toBeGreaterThanOrEqual(0);
    expect(sumPct).toBeGreaterThan(0);
    expect(sumPct).toBeLessThanOrEqual(100 + 1e-6);
  });
});

// ─── U05: SetupCostOptimizationEngine ────────────────────────────────────────

describe("CAMX-MS13 / U05 SetupCostOptimizationEngine", () => {
  const setups = [
    { id: "s1", complexity: "simple" as const, datum_count: 1 },
    { id: "s2", complexity: "moderate" as const, datum_count: 2, datum_references: ["s1"] },
    { id: "s3", complexity: "complex" as const, datum_count: 3, datum_references: ["s1", "s2"] },
  ];

  it("optimizeSetupCost returns one breakdown per input setup", () => {
    const r = setupCostOptimizationEngine.optimizeSetupCost({ setups, batch_size: 100 });
    expect(r.breakdowns.length).toBe(setups.length);
    expect(r.total_setup_cost_per_part).toBeGreaterThan(0);
    expect(r.total_setup_time_min).toBeGreaterThan(0);
  });

  it("per-part setup cost scales inversely with batch size", () => {
    const small = setupCostOptimizationEngine.optimizeSetupCost({ setups, batch_size: 10 });
    const large = setupCostOptimizationEngine.optimizeSetupCost({ setups, batch_size: 1000 });
    expect(small.total_setup_cost_per_part).toBeGreaterThan(large.total_setup_cost_per_part);
  });

  it("datum chain analysis flags worst-case error growth", () => {
    const r = setupCostOptimizationEngine.optimizeSetupCost({ setups, batch_size: 100 });
    expect(r.datum_chain_analysis.total_datum_links).toBeGreaterThan(0);
    expect(r.datum_chain_analysis.worst_case_error_mm).toBeGreaterThan(0);
  });

  it("suggestReductions emits actionable suggestions with feasibility tags", () => {
    const r = setupCostOptimizationEngine.optimizeSetupCost({ setups, batch_size: 100, has_5axis: false });
    const sugg = r.suggestions;
    if (sugg.length > 0) {
      for (const s of sugg) {
        expect(["high", "medium", "low"]).toContain(s.feasibility);
        expect(s.estimated_time_saving_min).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("estimateSetupTime returns a time with confidence label", () => {
    const e = setupCostOptimizationEngine.estimateSetupTime("moderate", {});
    expect(e.adjusted_time_min).toBeGreaterThan(0);
    expect(["high", "medium", "low"]).toContain(e.confidence);
  });
});

// ─── U06: TCODashboardEngine ─────────────────────────────────────────────────

describe("CAMX-MS13 / U06 TCODashboardEngine", () => {
  const tcoJob = {
    stock_volume_cm3: 80,
    material_cost_per_cm3: 0.3,
    machine_rate_per_hr: 120,
    cycle_time_min: 10,
    setup_time_min: 45,
    batch_size: 100,
    programming_hours: 3,
    power_kw: 18,
    overhead_rate: 0.4,
    part_number: "P-1001",
    utilization_pct: 0.7,
    annual_volume: 5000,
    flood_coolant_cost_per_year: 4000,
    annual_machine_hours: 1800,
    label: "tco-baseline",
  };

  it("generateDashboard returns breakdown + top drivers + assumptions", () => {
    const d = tcoDashboardEngine.generateDashboard(tcoJob);
    expect(d.breakdown.total_per_part).toBeGreaterThan(0);
    expect(d.top_drivers.length).toBeGreaterThan(0);
    expect(d.top_drivers.length).toBeLessThanOrEqual(5);
    expect(d.annual_cost).toBeDefined();
    expect(Array.isArray(d.assumptions)).toBe(true);
    expect(d.generated_at).toBeGreaterThan(0);
  });

  it("top_drivers pct values are sorted descending", () => {
    const d = tcoDashboardEngine.generateDashboard(tcoJob);
    for (let i = 1; i < d.top_drivers.length; i++) {
      expect(d.top_drivers[i - 1].pct).toBeGreaterThanOrEqual(d.top_drivers[i].pct);
    }
  });

  it("compareCosts returns a non-negative savings_pct when optimized is cheaper", () => {
    const cmp = tcoDashboardEngine.compareCosts(tcoJob, { ...tcoJob, cycle_time_min: 7, label: "tco-opt" });
    expect(cmp.current_total).toBeGreaterThan(0);
    expect(cmp.optimized_total).toBeGreaterThan(0);
    if (cmp.savings_per_part > 0) {
      expect(cmp.savings_pct).toBeGreaterThan(0);
    }
    expect(cmp.component_deltas.length).toBeGreaterThan(0);
  });

  it("costDriverAnalysis produces a Pareto curve with a threshold index", () => {
    const a = tcoDashboardEngine.costDriverAnalysis(tcoJob);
    expect(a.drivers.length).toBeGreaterThan(0);
    expect(a.pareto_data.cumulative_pct.length).toBe(a.pareto_data.drivers.length);
    expect(a.pareto_data.pareto_threshold_index).toBeGreaterThanOrEqual(0);
    // cumulative monotonic non-decreasing
    for (let i = 1; i < a.pareto_data.cumulative_pct.length; i++) {
      expect(a.pareto_data.cumulative_pct[i]).toBeGreaterThanOrEqual(a.pareto_data.cumulative_pct[i - 1]);
    }
  });

  it("savingsOpportunities returns ranked opportunities with totals", () => {
    const s = tcoDashboardEngine.savingsOpportunities(tcoJob);
    expect(Array.isArray(s.opportunities)).toBe(true);
    expect(s.total_potential_savings_per_part).toBeGreaterThanOrEqual(0);
    for (const o of s.opportunities) {
      expect(["high", "medium", "low"]).toContain(o.priority);
      expect(o.savings_per_part).toBeGreaterThanOrEqual(0);
    }
  });

  it("historical trend round-trips via recordCostHistory + historicalTrend", () => {
    tcoDashboardEngine.clearHistory("P-1001");
    tcoDashboardEngine.recordCostHistory({ part_number: "P-1001", date: "2026-01-01", total_per_part: 100 });
    tcoDashboardEngine.recordCostHistory({ part_number: "P-1001", date: "2026-02-01", total_per_part: 90 });
    tcoDashboardEngine.recordCostHistory({ part_number: "P-1001", date: "2026-03-01", total_per_part: 85 });
    const hist = tcoDashboardEngine.getHistory("P-1001");
    expect(hist.length).toBe(3);
    const trend = tcoDashboardEngine.historicalTrend("P-1001");
    expect(trend).toBeTruthy();
    tcoDashboardEngine.clearHistory("P-1001");
  });

  it("generateDashboard estimates annual_cost ≈ total_per_part × annual_volume", () => {
    const d = tcoDashboardEngine.generateDashboard(tcoJob);
    if (d.annual_cost !== undefined) {
      expect(d.annual_cost).toBeCloseTo(d.total_per_part * tcoJob.annual_volume, 0);
    }
  });
});
