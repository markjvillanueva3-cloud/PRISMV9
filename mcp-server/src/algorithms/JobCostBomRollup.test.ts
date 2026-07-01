import { describe, it, expect } from "vitest";
import { rollupCost, JobCostBomRollup, type BomLine } from "./JobCostBomRollup.js";

describe("JobCostBomRollup", () => {
  it("single-node BOM: material + labor + machine + overhead", () => {
    const root: BomLine = { id: "A", quantity: 1, material_cost_usd: 100, labor_cost_usd: 50, machine_hours: 2, machine_rate_usd_per_hr: 75 };
    const r = rollupCost({ root });
    // material 100 + labor 50 + machine 150 + overhead (15% of 300) = 300 + 45 = 345
    expect(r.total_cost_usd.value).toBeCloseTo(345, 2);
    expect(r.material_subtotal_usd.value).toBe(100);
    expect(r.labor_subtotal_usd.value).toBe(50);
    expect(r.machine_subtotal_usd.value).toBe(150);
    expect(r.overhead_subtotal_usd.value).toBeCloseTo(45, 2);
  });
  it("two-level BOM: child cost rolls up × quantity", () => {
    const root: BomLine = {
      id: "ASSY", quantity: 1, material_cost_usd: 50,
      children: [{ id: "PART", quantity: 4, material_cost_usd: 10 }],
    };
    // Self: 50 + 15% = 57.5
    // Children: 10 + 1.5 = 11.5 each × 4 = 46
    // Total: 57.5 + 46 = 103.5
    const r = rollupCost({ root });
    expect(r.total_cost_usd.value).toBeCloseTo(103.5, 2);
  });
  it("three-level BOM with mixed quantities", () => {
    const root: BomLine = {
      id: "ROOT", quantity: 1, labor_cost_usd: 100,
      children: [{
        id: "MID", quantity: 2, material_cost_usd: 20,
        children: [{ id: "LEAF", quantity: 3, material_cost_usd: 5 }],
      }],
    };
    const r = rollupCost({ root });
    expect(r.total_cost_usd.value).toBeGreaterThan(0);
    expect(r.max_depth_seen).toBe(3);
  });
  it("breakdown lists every node with id + depth", () => {
    const root: BomLine = {
      id: "A", quantity: 1, material_cost_usd: 10,
      children: [{ id: "B", quantity: 1, material_cost_usd: 5 }],
    };
    const r = rollupCost({ root });
    expect(r.node_breakdown.length).toBe(2);
    const ids = r.node_breakdown.map(n => n.id);
    expect(ids).toContain("A");
    expect(ids).toContain("B");
  });
  it("custom overhead respected", () => {
    const root: BomLine = { id: "A", quantity: 1, material_cost_usd: 100, overhead_pct: 0.25 };
    const r = rollupCost({ root });
    expect(r.total_cost_usd.value).toBe(125);
  });
  it("custom machine rate respected", () => {
    const root: BomLine = { id: "A", quantity: 1, machine_hours: 2, machine_rate_usd_per_hr: 100, overhead_pct: 0 };
    const r = rollupCost({ root });
    expect(r.total_cost_usd.value).toBe(200);
  });
  it("cycle detection: A → A graceful skip", () => {
    const a: BomLine = { id: "A", quantity: 1, material_cost_usd: 10, children: [] };
    a.children!.push(a);  // self-cycle
    const r = rollupCost({ root: a });
    expect(r.notes.join("|")).toContain("cycle");
  });
  it("missing input diagnostic", () => {
    expect(rollupCost(null as unknown as { root: BomLine }).notes.join("|")).toContain("missing");
  });
  it("missing root.id diagnostic", () => {
    expect(rollupCost({ root: { id: "" } as BomLine }).notes.join("|")).toContain("id");
  });
  it("negative cost values clamped to 0 (no crash)", () => {
    const root: BomLine = { id: "A", quantity: 1, material_cost_usd: -50, labor_cost_usd: 10 };
    const r = rollupCost({ root });
    expect(r.material_subtotal_usd.value).toBe(0);
    expect(r.labor_subtotal_usd.value).toBe(10);
  });
  it("default overhead (15%) applies when not specified", () => {
    const root: BomLine = { id: "A", quantity: 1, material_cost_usd: 100 };
    const r = rollupCost({ root });
    expect(r.overhead_subtotal_usd.value).toBeCloseTo(15, 2);
  });
  it("version 1.0.0", () => {
    expect(JobCostBomRollup.version).toBe("1.0.0");
  });
});
