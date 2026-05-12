/**
 * ThermalFieldToolpathEngine Tests
 * Tests 2D transient thermal field routing for toolpath heat management.
 */
import { describe, it, expect } from "vitest";
import { ThermalFieldToolpathEngine } from "../engines/ThermalFieldToolpathEngine.js";

const engine = new ThermalFieldToolpathEngine();

describe("ThermalFieldToolpathEngine", () => {

  // ---- initializeGrid ----

  it("initializeGrid creates grid at ambient temperature", () => {
    const grid = engine.initializeGrid(100, 100, 10);
    expect(grid.width).toBeGreaterThanOrEqual(2);
    expect(grid.height).toBeGreaterThanOrEqual(2);
    expect(grid.ambient_C).toBe(25);
    expect(grid.time_s).toBe(0);
    // All cells should be at ambient
    for (const row of grid.temps) {
      for (const t of row) {
        expect(t).toBe(25);
      }
    }
  });

  it("initializeGrid dimensions match physical size", () => {
    const grid = engine.initializeGrid(200, 100, 20);
    expect(grid.phys_width_mm).toBe(200);
    expect(grid.phys_height_mm).toBe(100);
    expect(grid.cell_size_mm).toBeGreaterThan(0);
    // Grid should have more columns than rows for a wider workpiece
    expect(grid.width).toBeGreaterThanOrEqual(grid.height);
  });

  it("initializeGrid throws on invalid dimensions", () => {
    expect(() => engine.initializeGrid(0, 100)).toThrow();
    expect(() => engine.initializeGrid(100, -5)).toThrow();
  });

  // ---- applyHeatSource ----

  it("applyHeatSource increases temperature at the source location", () => {
    const grid = engine.initializeGrid(100, 100, 16);
    const before = grid.temps[8][8];
    engine.applyHeatSource(grid, 50, 50, 500, 1.0, "steel_1045");
    // At least the center region should have warmed up
    let maxTemp = 0;
    for (const row of grid.temps) {
      for (const t of row) {
        if (t > maxTemp) maxTemp = t;
      }
    }
    expect(maxTemp).toBeGreaterThan(grid.ambient_C);
    expect(grid.time_s).toBeGreaterThan(0);
  });

  it("applyHeatSource temperature rise is proportional to power", () => {
    const grid1 = engine.initializeGrid(80, 80, 10);
    engine.applyHeatSource(grid1, 40, 40, 100, 1.0, "aluminum_6061");
    let max1 = 0;
    for (const row of grid1.temps) {
      for (const t of row) { if (t > max1) max1 = t; }
    }

    const grid2 = engine.initializeGrid(80, 80, 10);
    engine.applyHeatSource(grid2, 40, 40, 500, 1.0, "aluminum_6061");
    let max2 = 0;
    for (const row of grid2.temps) {
      for (const t of row) { if (t > max2) max2 = t; }
    }

    // Higher power should give higher temperature
    expect(max2).toBeGreaterThan(max1);
  });

  // ---- stepTimeForward ----

  it("stepTimeForward causes diffusion toward ambient", () => {
    const grid = engine.initializeGrid(60, 60, 12);
    // Heat center
    engine.applyHeatSource(grid, 30, 30, 1000, 0.5, "steel_1045");
    let peakBefore = 0;
    for (const row of grid.temps) {
      for (const t of row) { if (t > peakBefore) peakBefore = t; }
    }

    // Let it diffuse
    engine.stepTimeForward(grid, 5.0, "steel_1045");
    let peakAfter = 0;
    for (const row of grid.temps) {
      for (const t of row) { if (t > peakAfter) peakAfter = t; }
    }

    // Peak should decrease as heat spreads
    expect(peakAfter).toBeLessThan(peakBefore);
    expect(peakAfter).toBeGreaterThan(grid.ambient_C);
  });

  it("stepTimeForward advances simulation time", () => {
    const grid = engine.initializeGrid(50, 50, 8);
    const t0 = grid.time_s;
    engine.stepTimeForward(grid, 2.5, "steel_1045");
    expect(grid.time_s).toBeCloseTo(t0 + 2.5, 6);
  });

  // ---- findCoolZones ----

  it("findCoolZones returns all cells when grid is at ambient", () => {
    const grid = engine.initializeGrid(50, 50, 8);
    const zones = engine.findCoolZones(grid, 30);
    // All cells are at 25C which is below 30C threshold
    expect(zones.length).toBe(grid.width * grid.height);
    // Sorted by temperature (all same, so length check is sufficient)
    expect(zones[0].temp_C).toBeCloseTo(25, 0);
  });

  it("findCoolZones excludes hot cells after heating", () => {
    const grid = engine.initializeGrid(80, 80, 10);
    engine.applyHeatSource(grid, 40, 40, 5000, 2.0, "steel_1045");
    const allCells = grid.width * grid.height;
    const coolZones = engine.findCoolZones(grid, 30);
    // Some cells should be excluded (heated above 30C)
    expect(coolZones.length).toBeLessThan(allCells);
    // All returned zones should be below threshold
    for (const z of coolZones) {
      expect(z.temp_C).toBeLessThan(30);
    }
  });

  // ---- simulateCuttingThermal ----

  it("simulateCuttingThermal raises temperature along cut path", () => {
    const grid = engine.initializeGrid(100, 100, 16);
    const path = [
      { x: 20, y: 50 },
      { x: 40, y: 50 },
      { x: 60, y: 50 },
      { x: 80, y: 50 },
    ];
    const result = engine.simulateCuttingThermal(
      grid, path, 150, 0.1, 3, 3, "steel_1045"
    );
    expect(result.max_temp_C).toBeGreaterThan(25);
    expect(result.avg_temp_C).toBeGreaterThanOrEqual(25);
    expect(result.thermal_gradient_map.length).toBe(grid.height);
    expect(result.thermal_gradient_map[0].length).toBe(grid.width);
  });

  it("simulateCuttingThermal gradient map has non-zero gradients near heat source", () => {
    const grid = engine.initializeGrid(100, 100, 16);
    const path = [
      { x: 30, y: 50 },
      { x: 70, y: 50 },
    ];
    const result = engine.simulateCuttingThermal(
      grid, path, 200, 0.1, 3, 3, "aluminum_6061"
    );
    // At least some gradient values should be non-zero
    let hasNonZero = false;
    for (const row of result.thermal_gradient_map) {
      for (const g of row) {
        if (g > 0) { hasNonZero = true; break; }
      }
      if (hasNonZero) break;
    }
    expect(hasNonZero).toBe(true);
  });

  it("simulateCuttingThermal throws for path with fewer than 2 points", () => {
    const grid = engine.initializeGrid(50, 50, 8);
    expect(() =>
      engine.simulateCuttingThermal(grid, [{ x: 10, y: 10 }], 100, 0.1, 2, 2)
    ).toThrow("at least 2 points");
  });
});
