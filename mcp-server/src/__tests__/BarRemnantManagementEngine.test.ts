import { describe, it, expect } from "vitest";
import { barRemnantManagementEngine, type BarRemnant } from "../engines/BarRemnantManagementEngine.js";

const stock = (): BarRemnant[] => [
  { id: "R1", material: "1045", diameter_mm: 25.4, length_mm: 800 },
  { id: "R2", material: "1045", diameter_mm: 25.4, length_mm: 500 },
  { id: "R3", material: "1045", diameter_mm: 25.4, length_mm: 120 },
  { id: "R4", material: "1045", diameter_mm: 31.75, length_mm: 700 },
  { id: "R5", material: "4140", diameter_mm: 25.4, length_mm: 600 },
];

describe("BarRemnantManagementEngine", () => {
  it("filters by material and diameter", () => {
    const p = barRemnantManagementEngine.plan(stock(), {
      part_length_mm: 50,
      quantity_needed: 10,
      diameter_mm: 25.4,
      material: "1045",
    });
    // R4 (31.75) and R5 (4140) filtered out; R3 (120mm) too short
    expect(p.assignments.length).toBeLessThanOrEqual(2);
  });

  it("picks largest remnants first (greedy)", () => {
    const p = barRemnantManagementEngine.plan(stock(), {
      part_length_mm: 50,
      quantity_needed: 20,
      diameter_mm: 25.4,
      material: "1045",
    });
    expect(p.assignments[0]?.remnant_id).toBe("R1");
  });

  it("returns parts-from-remnant per assignment", () => {
    const p = barRemnantManagementEngine.plan(stock(), {
      part_length_mm: 50,
      quantity_needed: 100,
      diameter_mm: 25.4,
      material: "1045",
      cutoff_kerf_mm: 2,
      bar_head_face_mm: 3,
    });
    // R1 usable = 800-3 = 797, pitch = 52, parts = 15
    const a1 = p.assignments.find((a) => a.remnant_id === "R1");
    expect(a1?.parts_from_remnant).toBe(15);
  });

  it("excludes remnants below min feasible length", () => {
    const p = barRemnantManagementEngine.plan(stock(), {
      part_length_mm: 50,
      quantity_needed: 5,
      diameter_mm: 25.4,
      material: "1045",
      min_feasible_length_mm: 150,
    });
    expect(p.assignments.find((a) => a.remnant_id === "R3")).toBeUndefined();
  });

  it("tracks remaining quantity", () => {
    const p = barRemnantManagementEngine.plan(stock(), {
      part_length_mm: 50,
      quantity_needed: 100,
      diameter_mm: 25.4,
      material: "1045",
    });
    expect(p.total_parts_from_remnants + p.parts_from_fresh_bar_needed).toBe(100);
  });

  it("stops once demand is met", () => {
    const p = barRemnantManagementEngine.plan(stock(), {
      part_length_mm: 50,
      quantity_needed: 5,
      diameter_mm: 25.4,
      material: "1045",
    });
    expect(p.total_parts_from_remnants).toBe(5);
    expect(p.quantity_remaining).toBe(0);
  });

  it("creates new remnant records with residual length", () => {
    const p = barRemnantManagementEngine.plan(stock(), {
      part_length_mm: 50,
      quantity_needed: 5,
      diameter_mm: 25.4,
      material: "1045",
      cutoff_kerf_mm: 2,
      bar_head_face_mm: 3,
      min_feasible_length_mm: 150,
    });
    // R1 used for 5 parts (5 × 52 = 260mm consumed), residual = 797-260 = 537mm
    expect(p.new_remnants.length).toBeGreaterThan(0);
    expect(p.new_remnants[0]!.length_mm).toBeCloseTo(537, 0);
  });

  it("marks short residuals as scrap and does not recycle", () => {
    const p = barRemnantManagementEngine.plan(
      [{ id: "R1", material: "1045", diameter_mm: 25.4, length_mm: 300 }],
      {
        part_length_mm: 50,
        quantity_needed: 5,
        diameter_mm: 25.4,
        material: "1045",
        min_feasible_length_mm: 150,
      },
    );
    // R1 usable = 297, pitch = 52, 5 parts = 260mm, residual = 37mm → scrap
    expect(p.assignments[0]?.residual_scrap).toBe(true);
    expect(p.new_remnants.length).toBe(0);
  });

  it("computes savings mass and cost from density + price", () => {
    const p = barRemnantManagementEngine.plan(stock(), {
      part_length_mm: 50,
      quantity_needed: 10,
      diameter_mm: 25.4,
      material: "1045",
      material_density_kgm3: 7850,
      material_price_per_kg: 5.0,
    });
    expect(p.savings_mass_kg).toBeGreaterThan(0);
    expect(p.savings_cost).toBeCloseTo(p.savings_mass_kg * 5.0, 3);
  });

  it("tolerates diameter match within tolerance", () => {
    const p = barRemnantManagementEngine.plan(
      [{ id: "X", material: "1045", diameter_mm: 25.0, length_mm: 500 }],
      {
        part_length_mm: 50,
        quantity_needed: 3,
        diameter_mm: 25.4,
        material: "1045",
        diameter_tol_mm: 0.5,
      },
    );
    expect(p.total_parts_from_remnants).toBe(3);
  });

  it("recordRemnant returns a BarRemnant with date", () => {
    const rem = barRemnantManagementEngine.recordRemnant({
      id: "NEW1",
      material: "1045",
      diameter_mm: 25.4,
      length_mm: 400,
    });
    expect(rem.id).toBe("NEW1");
    expect(rem.created_date).toBeTruthy();
  });

  it("countFeasible returns correct count", () => {
    const n = barRemnantManagementEngine.countFeasible(stock(), "1045", 25.4);
    // R1 (800) + R2 (500); R3 (120) excluded (< 150); R4 diff diameter; R5 diff material
    expect(n).toBe(2);
  });

  it("propagates heat_lot and location to new remnants", () => {
    const p = barRemnantManagementEngine.plan(
      [{ id: "R1", material: "1045", diameter_mm: 25.4, length_mm: 800, heat_lot: "H42", location: "A1" }],
      {
        part_length_mm: 50,
        quantity_needed: 5,
        diameter_mm: 25.4,
        material: "1045",
      },
    );
    expect(p.new_remnants[0]?.heat_lot).toBe("H42");
    expect(p.new_remnants[0]?.location).toBe("A1");
  });
});
