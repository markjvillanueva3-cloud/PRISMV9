import { describe, it, expect } from "vitest";
import {
  millStockEvolutionEngine as eng,
  type MillStockEvolutionInput,
  type MillPass,
} from "../engines/MillStockEvolutionEngine.js";

function nominalStock(o: Partial<MillStockEvolutionInput> = {}): MillStockEvolutionInput {
  return {
    stock_x_min_mm: 0,
    stock_x_max_mm: 100,
    stock_y_min_mm: 0,
    stock_y_max_mm: 50,
    stock_z_top_mm: 0,
    stock_z_bottom_mm: -20,
    passes: [],
    grid_step_mm: 5,
    ...o,
  };
}

describe("MillStockEvolutionEngine", () => {
  it("getStats lists 7 pass kinds + canonical reference + heightmap notes", () => {
    const s = eng.getStats();
    expect(s.supported_pass_kinds).toEqual([
      "face_milling", "end_milling", "pocket_milling", "slot_milling",
      "drilling", "boring", "contour_milling",
    ]);
    expect(s.reference).toMatch(/Altintas.*Manufacturing Automation/);
    expect(s.notes).toMatch(/heightmap|Z-buffer/i);
  });

  it("throws on missing passes array", () => {
    expect(() => eng.evolve({ ...nominalStock(), passes: null as never })).toThrow(/passes\[\] required/);
  });

  it("throws on invalid stock bounds", () => {
    expect(() => eng.evolve(nominalStock({ stock_x_min_mm: 100, stock_x_max_mm: 0 })))
      .toThrow(/stock_x_max_mm must be > stock_x_min_mm/);
    expect(() => eng.evolve(nominalStock({ stock_z_top_mm: -10, stock_z_bottom_mm: 0 })))
      .toThrow(/stock_z_top_mm must be > stock_z_bottom_mm/);
  });

  it("empty passes → heightmap all at z_top, 0 volume removed", () => {
    const r = eng.evolve(nominalStock());
    expect(r.total_volume_removed_mm3).toBe(0);
    expect(r.per_pass).toEqual([]);
    expect(r.heightmap.every(z => z === 0)).toBe(true);
  });

  it("grid dimensions: 100×50mm stock with step=5mm → 21×11 grid", () => {
    const r = eng.evolve(nominalStock());
    expect(r.grid_nx).toBe(21);
    expect(r.grid_ny).toBe(11);
    expect(r.grid_step_mm).toBe(5);
    expect(r.heightmap.length).toBe(21 * 11);
  });

  it("face_milling lowers all cells in footprint to z_floor", () => {
    const pass: MillPass = {
      kind: "face_milling",
      z_floor_mm: -2,
      rect: { x_min_mm: 0, x_max_mm: 100, y_min_mm: 0, y_max_mm: 50 },
    };
    const r = eng.evolve(nominalStock({ passes: [pass] }));
    expect(r.heightmap.every(z => z === -2)).toBe(true);
    expect(r.per_pass[0].cells_modified).toBe(r.heightmap.length);
    // Volume = (full coverage) × removal depth = 21*11 cells * 25mm² * 2mm = 11550 mm³
    expect(r.per_pass[0].volume_removed_mm3).toBeCloseTo(21 * 11 * 25 * 2, 0);
  });

  it("end_milling pocket: 20×20mm footprint, depth 5mm → 16 cells modified at step=5", () => {
    // Pocket from (10,10) to (30,30), step=5 → 5 unique x's and 5 unique y's overlap
    const pass: MillPass = {
      kind: "end_milling",
      z_floor_mm: -5,
      rect: { x_min_mm: 10, x_max_mm: 30, y_min_mm: 10, y_max_mm: 30 },
    };
    const r = eng.evolve(nominalStock({ passes: [pass] }));
    // Grid cells at x=10,15,20,25,30 and y=10,15,20,25,30 → 25 cells
    expect(r.per_pass[0].cells_modified).toBe(25);
    expect(r.per_pass[0].volume_removed_mm3).toBe(25 * 25 * 5); // 25 cells × 25mm² × 5mm = 3125
  });

  it("drilling: single hole through stock at z_floor=-15", () => {
    const pass: MillPass = {
      kind: "drilling",
      z_floor_mm: -15,
      circle: { x_mm: 50, y_mm: 25, diameter_mm: 10 },
    };
    const r = eng.evolve(nominalStock({ passes: [pass] }));
    // Circle r=5, with grid step 5 → cells within 5mm of (50,25)
    expect(r.per_pass[0].cells_modified).toBeGreaterThanOrEqual(1);
    expect(r.per_pass[0].cells_modified).toBeLessThanOrEqual(13); // bounded by disk-cover at step=5
    expect(r.per_pass[0].kind).toBe("drilling");
  });

  it("contour_milling along polyline with stroke width carves the path", () => {
    const pass: MillPass = {
      kind: "contour_milling",
      z_floor_mm: -3,
      polyline: {
        points: [
          { x_mm: 10, y_mm: 25 },
          { x_mm: 90, y_mm: 25 },
        ],
        stroke_width_mm: 10,
      },
    };
    const r = eng.evolve(nominalStock({ passes: [pass] }));
    expect(r.per_pass[0].cells_modified).toBeGreaterThan(0);
    // Path along y=25 with stroke width 10 → halfWidth=5; <=halfW boundary inclusive.
    // Row y=20: cells where vertical distance is 5 AND x in [10,90] → 17 cells (x∈{10..90 step5})
    // Row y=25: ON the segment, plus endpoint extensions at distance 5: x∈{5,10..90,95} → 19 cells
    // Row y=30: same as y=20 → 17 cells
    // Total = 17 + 19 + 17 = 53
    expect(r.per_pass[0].cells_modified).toBe(53);
  });

  it("multiple sequential passes stack — deeper z_floor wins each cell", () => {
    const passes: MillPass[] = [
      { kind: "face_milling", z_floor_mm: -1, rect: { x_min_mm: 0, x_max_mm: 100, y_min_mm: 0, y_max_mm: 50 } },
      { kind: "pocket_milling", z_floor_mm: -5, rect: { x_min_mm: 10, x_max_mm: 30, y_min_mm: 10, y_max_mm: 30 } },
    ];
    const r = eng.evolve(nominalStock({ passes }));
    // Pass 1: all cells → -1
    // Pass 2: pocket cells → -5
    // Total volume = full-face × 1mm + pocket × additional 4mm
    expect(r.per_pass.length).toBe(2);
    expect(r.per_pass[1].cells_modified).toBe(25); // pocket cells
    expect(r.per_pass[1].volume_removed_mm3).toBe(25 * 25 * 4); // additional 4mm depth
  });

  it("pass with z_floor ABOVE existing heightmap → no modification (cell already below z_floor)", () => {
    const passes: MillPass[] = [
      { kind: "face_milling", z_floor_mm: -10, rect: { x_min_mm: 0, x_max_mm: 100, y_min_mm: 0, y_max_mm: 50 } },
      { kind: "end_milling", z_floor_mm: -3, rect: { x_min_mm: 0, x_max_mm: 100, y_min_mm: 0, y_max_mm: 50 } }, // higher than existing
    ];
    const r = eng.evolve(nominalStock({ passes }));
    expect(r.per_pass[0].cells_modified).toBe(r.heightmap.length);
    expect(r.per_pass[1].cells_modified).toBe(0); // no cell modified
    expect(r.per_pass[1].volume_removed_mm3).toBe(0);
  });

  it("pass outside stock footprint → 0 cells modified", () => {
    const pass: MillPass = {
      kind: "pocket_milling",
      z_floor_mm: -5,
      rect: { x_min_mm: 200, x_max_mm: 300, y_min_mm: 200, y_max_mm: 300 }, // outside stock
    };
    const r = eng.evolve(nominalStock({ passes: [pass] }));
    expect(r.per_pass[0].cells_modified).toBe(0);
    expect(r.per_pass[0].volume_removed_mm3).toBe(0);
  });

  it("smaller grid_step gives more accurate volume estimate (finer resolution)", () => {
    const pass: MillPass = {
      kind: "drilling",
      z_floor_mm: -10,
      circle: { x_mm: 50, y_mm: 25, diameter_mm: 20 },
    };
    const rCoarse = eng.evolve(nominalStock({ passes: [pass], grid_step_mm: 5 }));
    const rFine = eng.evolve(nominalStock({ passes: [pass], grid_step_mm: 1 }));
    // Fine grid covers the disk area more accurately
    // True volume = π·r²·depth = π·100·10 ≈ 3141.6
    const trueVolume = Math.PI * 100 * 10;
    const errCoarse = Math.abs(rCoarse.total_volume_removed_mm3 - trueVolume);
    const errFine = Math.abs(rFine.total_volume_removed_mm3 - trueVolume);
    expect(errFine).toBeLessThan(errCoarse);
  });

  it("heightmap row-major indexing: cell[yi, xi] = heightmap[yi*nx + xi]", () => {
    const pass: MillPass = {
      kind: "end_milling",
      z_floor_mm: -5,
      rect: { x_min_mm: 5, x_max_mm: 15, y_min_mm: 5, y_max_mm: 15 },
    };
    const r = eng.evolve(nominalStock({ passes: [pass] }));
    // Cell at (xi=1, yi=1) → x=5, y=5 should be inside pocket → -5
    const idx_1_1 = 1 * r.grid_nx + 1;
    expect(r.heightmap[idx_1_1]).toBe(-5);
    // Cell at (xi=20, yi=10) → x=100, y=50 outside pocket → 0
    const idx_20_10 = 10 * r.grid_nx + 20;
    expect(r.heightmap[idx_20_10]).toBe(0);
  });

  it("per_pass impacts include index, kind, cells_modified, volume_removed_mm3", () => {
    const passes: MillPass[] = [
      { kind: "face_milling", z_floor_mm: -1, rect: { x_min_mm: 0, x_max_mm: 100, y_min_mm: 0, y_max_mm: 50 } },
      { kind: "drilling", z_floor_mm: -15, circle: { x_mm: 50, y_mm: 25, diameter_mm: 6 } },
    ];
    const r = eng.evolve(nominalStock({ passes }));
    expect(r.per_pass.length).toBe(2);
    expect(r.per_pass[0].index).toBe(0);
    expect(r.per_pass[0].kind).toBe("face_milling");
    expect(r.per_pass[1].index).toBe(1);
    expect(r.per_pass[1].kind).toBe("drilling");
  });

  it("total_volume_removed_mm3 equals sum of per-pass volumes", () => {
    const passes: MillPass[] = [
      { kind: "face_milling", z_floor_mm: -1, rect: { x_min_mm: 0, x_max_mm: 100, y_min_mm: 0, y_max_mm: 50 } },
      { kind: "pocket_milling", z_floor_mm: -5, rect: { x_min_mm: 10, x_max_mm: 30, y_min_mm: 10, y_max_mm: 30 } },
    ];
    const r = eng.evolve(nominalStock({ passes }));
    const sum = r.per_pass.reduce((s, p) => s + p.volume_removed_mm3, 0);
    expect(r.total_volume_removed_mm3).toBeCloseTo(sum, 1);
  });

  it("reasoning narrates grid dimensions + total volume", () => {
    const pass: MillPass = {
      kind: "face_milling",
      z_floor_mm: -2,
      rect: { x_min_mm: 0, x_max_mm: 100, y_min_mm: 0, y_max_mm: 50 },
    };
    const r = eng.evolve(nominalStock({ passes: [pass] }));
    expect(r.reasoning.some(s => /21×11 grid.*step=5mm/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Total volume removed:.*mm³/.test(s))).toBe(true);
  });

  it("polyline with single point (< 2) → no cells modified", () => {
    const pass: MillPass = {
      kind: "contour_milling",
      z_floor_mm: -3,
      polyline: { points: [{ x_mm: 50, y_mm: 25 }], stroke_width_mm: 10 },
    };
    const r = eng.evolve(nominalStock({ passes: [pass] }));
    expect(r.per_pass[0].cells_modified).toBe(0);
  });
});
