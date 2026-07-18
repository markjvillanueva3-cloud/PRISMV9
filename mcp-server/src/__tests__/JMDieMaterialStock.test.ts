/**
 * JM Die inventory seed + "can JM cut this today?" gate (Phase B of print->program).
 */
import { describe, it, expect } from "vitest";
import {
  JM_DIE_WIRE_STOCK,
  JM_DIE_RAW_STOCK,
  availableWireDiameters,
  checkStockForJob,
} from "../data/jm-die-material-stock.js";

describe("JM Die inventory seed", () => {
  it("seeds the 2 on-hand FA-10S wire spools (0.25 + 0.20)", () => {
    expect(availableWireDiameters()).toEqual([0.25, 0.2]);
    expect(JM_DIE_WIRE_STOCK.every((w) => w.remaining_length_m > w.min_length_m)).toBe(true);
  });
  it("seeds raw tool-steel stock (D2/A2/S7/M2) with on-hand quantities", () => {
    const mats = new Set(JM_DIE_RAW_STOCK.map((r) => r.material));
    for (const m of ["D2", "A2", "S7", "M2"]) expect(mats.has(m)).toBe(true);
    expect(JM_DIE_RAW_STOCK.every((r) => r.quantity_on_hand >= 0 && r.unit_cost_usd > 0)).toBe(true);
  });
});

describe("checkStockForJob — inventory gate", () => {
  it("CAN cut: stocked wire + a D2 blank that fits", () => {
    const r = checkStockForJob({ material: "D2", wire_diameter_mm: 0.25, part_x_mm: 100, part_y_mm: 100, thickness_mm: 20, wire_length_needed_m: 50 });
    expect(r.can_cut).toBe(true);
    expect(r.blockers).toEqual([]);
    expect(r.matched_blank?.material).toBe("D2");
    expect(r.matched_wire?.diameter_mm).toBe(0.25);
  });

  it("CANNOT cut: wire diameter not stocked => blocker + suggested PO", () => {
    const r = checkStockForJob({ wire_diameter_mm: 0.1 });
    expect(r.can_cut).toBe(false);
    expect(r.blockers[0]).toMatch(/0\.1mm not stocked/);
    expect(r.suggested_po.length).toBeGreaterThan(0);
  });

  it("CANNOT cut: material not on hand => blocker + PO", () => {
    const r = checkStockForJob({ material: "Inconel", wire_diameter_mm: 0.25 });
    expect(r.can_cut).toBe(false);
    expect(r.blockers.some((b) => /Inconel raw stock not on hand/.test(b))).toBe(true);
  });

  it("CANNOT cut: D2 on hand but no blank fits an oversize part", () => {
    const r = checkStockForJob({ material: "D2", wire_diameter_mm: 0.25, part_x_mm: 400, part_y_mm: 400, thickness_mm: 20 });
    expect(r.can_cut).toBe(false);
    expect(r.blockers.some((b) => /no blank fits/.test(b))).toBe(true);
  });

  it("CANNOT cut: wire would drop below reorder floor after the job", () => {
    // MD+ Pro II: 24000m on hand, 2000m floor — a 23000m job leaves 1000m < floor
    const r = checkStockForJob({ wire_diameter_mm: 0.25, wire_length_needed_m: 23000 });
    expect(r.can_cut).toBe(false);
    expect(r.blockers.some((b) => /below reorder floor/.test(b))).toBe(true);
    expect(r.suggested_po.some((p) => /reorder/.test(p))).toBe(true);
  });

  it("respects injected stock (empty stock => everything blocks)", () => {
    const r = checkStockForJob({ material: "D2", wire_diameter_mm: 0.25 }, { wire: [], raw: [] });
    expect(r.can_cut).toBe(false);
    expect(r.blockers.length).toBeGreaterThanOrEqual(2);
  });
});
