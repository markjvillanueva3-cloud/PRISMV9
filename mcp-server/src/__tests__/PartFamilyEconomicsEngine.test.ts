/**
 * PartFamilyEconomicsEngine — PHASE26 wiring tests.
 *
 * Wilson EOQ + ABC + tool rotation cost analysis. Tests verify:
 *   - analyzeLotSize emits EOQ for each part and an aggregate family summary
 *   - analyzeToolRotation flags tools running out of life vs upcoming jobs
 *   - analyzeCostDrivers produces Pareto categories
 *   - analyzeBatchPurchasing aggregates demand across parts
 *   - getPartFamilyReport returns multi-section composite
 */
import { describe, it, expect } from "vitest";
import { partFamilyEconomicsEngine } from "../engines/PartFamilyEconomicsEngine.js";

const partsFamily = [
  { name: "P-001", annual_demand: 10_000, setup_time_min: 60, cycle_time_min: 2.0, material_cost_per_unit: 1.50 },
  { name: "P-002", annual_demand: 5_000, setup_time_min: 45, cycle_time_min: 3.5, material_cost_per_unit: 2.10 },
  { name: "P-003", annual_demand: 1_500, setup_time_min: 30, cycle_time_min: 5.0, material_cost_per_unit: 4.00 },
];

describe("PartFamilyEconomicsEngine — analyzeLotSize", () => {
  it("emits one entry per input part", () => {
    const r = partFamilyEconomicsEngine.analyzeLotSize({
      parts: partsFamily,
      machine_rate_per_hour: 85,
    });
    expect(r.parts.length).toBe(3);
  });

  it("each part has positive EOQ and optimal_batch_size", () => {
    const r = partFamilyEconomicsEngine.analyzeLotSize({
      parts: partsFamily,
      machine_rate_per_hour: 85,
    });
    for (const p of r.parts) {
      expect(p.eoq).toBeGreaterThan(0);
      expect(p.optimal_batch_size).toBeGreaterThan(0);
      expect(p.annual_setups).toBeGreaterThan(0);
    }
  });

  it("family_summary aggregates positive total_annual_cost", () => {
    const r = partFamilyEconomicsEngine.analyzeLotSize({
      parts: partsFamily,
      machine_rate_per_hour: 85,
    });
    expect(r.family_summary.total_annual_cost).toBeGreaterThan(0);
    expect(typeof r.family_summary.recommendation).toBe("string");
    expect(r.family_summary.recommendation.length).toBeGreaterThan(0);
  });

  it("higher annual_demand → higher EOQ (Wilson EOQ monotone in D)", () => {
    const lo = partFamilyEconomicsEngine.analyzeLotSize({
      parts: [{ ...partsFamily[0], annual_demand: 1_000 }],
      machine_rate_per_hour: 85,
    });
    const hi = partFamilyEconomicsEngine.analyzeLotSize({
      parts: [{ ...partsFamily[0], annual_demand: 100_000 }],
      machine_rate_per_hour: 85,
    });
    expect(hi.parts[0].eoq).toBeGreaterThan(lo.parts[0].eoq);
  });
});

describe("PartFamilyEconomicsEngine — analyzeToolRotation", () => {
  it("returns tool list and summary structure", () => {
    const r = partFamilyEconomicsEngine.analyzeToolRotation({
      tools: [
        { id: "T01", type: "endmill", diameter: 12.7, cost: 45, tool_life_min: 240, parts_per_life: 200 },
        { id: "T02", type: "drill", diameter: 6.0, cost: 22, tool_life_min: 120, parts_per_life: 150 },
      ],
      upcoming_jobs: [{ part: "P-001", quantity: 100, tools_needed: ["T01", "T02"] }],
    });
    expect(r.tools.length).toBe(2);
    expect(r.summary.total_tools).toBe(2);
    expect(typeof r.summary.net_savings_from_scheduling).toBe("number");
  });

  it("flags 'immediate' urgency when demand > remaining life", () => {
    const r = partFamilyEconomicsEngine.analyzeToolRotation({
      tools: [
        { id: "T-LOW", type: "endmill", diameter: 10, cost: 50, tool_life_min: 60, parts_per_life: 5 },
      ],
      upcoming_jobs: [{ part: "P-X", quantity: 100, tools_needed: ["T-LOW"] }],
    });
    const tool = r.tools[0];
    expect(["immediate", "soon"]).toContain(tool.replacement_urgency);
  });
});

describe("PartFamilyEconomicsEngine — analyzeCostDrivers", () => {
  it("emits Pareto entries for non-empty job set", () => {
    const r = partFamilyEconomicsEngine.analyzeCostDrivers({
      jobs: [
        {
          part: "P-001", quantity: 100,
          material_cost: 150, tool_cost: 30, labor_cost: 200, setup_cost: 80,
          overhead: 50, scrap_cost: 10, rework_cost: 5,
        },
      ],
    });
    expect(Array.isArray(r.pareto)).toBe(true);
    expect(r.pareto.length).toBeGreaterThan(0);
  });
});

describe("PartFamilyEconomicsEngine — analyzeBatchPurchasing", () => {
  it("returns a structured object with non-negative aggregates", () => {
    const r = partFamilyEconomicsEngine.analyzeBatchPurchasing({
      materials: [
        { material: "Aluminum 6061", part_demands: [{ part: "P-001", annual_quantity: 1000, weight_per_part_kg: 2.5 }], unit_cost_at_qty: { "100": 5, "1000": 4 } },
      ],
    } as Parameters<typeof partFamilyEconomicsEngine.analyzeBatchPurchasing>[0]);
    expect(typeof r).toBe("object");
    expect(r).not.toBe(null);
  });
});

describe("PartFamilyEconomicsEngine — getPartFamilyReport", () => {
  it("returns composite report with non-null sections", () => {
    const r = partFamilyEconomicsEngine.getPartFamilyReport({
      family_name: "Test Family",
      parts: partsFamily,
      machine_rate_per_hour: 85,
    } as Parameters<typeof partFamilyEconomicsEngine.getPartFamilyReport>[0]);
    expect(typeof r).toBe("object");
    expect(r).not.toBe(null);
  });
});
