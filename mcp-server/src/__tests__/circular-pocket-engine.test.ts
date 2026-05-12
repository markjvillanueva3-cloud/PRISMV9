/**
 * CircularPocketEngine — Unit Tests
 * @milestone FORGE-ENGINES-B16
 */
import { describe, it, expect } from "vitest";
import {
  circularPocketEngine,
} from "../engines/CircularPocketEngine.js";

describe("CircularPocketEngine", () => {
  it("calculates radial passes for circular pocket", () => {
    const r = circularPocketEngine.calculate({
      pocket_diameter_mm: 40,
      pocket_depth_mm: 10,
      tool_diameter_mm: 10,
    });
    // radius=20, tool_r=5, distance=15, ae=10×0.4=4 → 4 passes
    expect(r.number_of_radial_passes.value).toBeGreaterThan(1);
    expect(r.stepover.value).toBeCloseTo(4, 1);
  });

  it("calculates multiple depth levels", () => {
    const r = circularPocketEngine.calculate({
      pocket_diameter_mm: 30,
      pocket_depth_mm: 20,
      tool_diameter_mm: 10,
    });
    // ap max = 10×0.5=5, 20/5=4 levels
    expect(r.number_of_levels.value).toBe(4);
  });

  it("calculates helical entry parameters", () => {
    const r = circularPocketEngine.calculate({
      pocket_diameter_mm: 50,
      pocket_depth_mm: 15,
      tool_diameter_mm: 12,
    });
    expect(r.helix_entry_diameter.value).toBeGreaterThan(0);
    expect(r.helix_pitch.value).toBeGreaterThan(0);
  });

  it("warns tool >= pocket diameter", () => {
    const r = circularPocketEngine.calculate({
      pocket_diameter_mm: 10,
      pocket_depth_mm: 5,
      tool_diameter_mm: 12,
    });
    expect(
      r.warnings.some(w => w.includes("smaller"))
    ).toBe(true);
  });

  it("warns tool > 80% of pocket", () => {
    const r = circularPocketEngine.calculate({
      pocket_diameter_mm: 12,
      pocket_depth_mm: 5,
      tool_diameter_mm: 10,
    });
    expect(
      r.warnings.some(w => w.includes("80%"))
    ).toBe(true);
  });

  it("warns deep pocket", () => {
    const r = circularPocketEngine.calculate({
      pocket_diameter_mm: 30,
      pocket_depth_mm: 40,
      tool_diameter_mm: 10,
    });
    expect(
      r.warnings.some(w => w.includes("long reach"))
    ).toBe(true);
  });

  it("warns high stepover", () => {
    const r = circularPocketEngine.calculate({
      pocket_diameter_mm: 40,
      pocket_depth_mm: 10,
      tool_diameter_mm: 10,
      stepover_percent: 70,
    });
    expect(
      r.warnings.some(w => w.includes("chatter"))
    ).toBe(true);
  });

  it("warns titanium high stepover", () => {
    const r = circularPocketEngine.calculate({
      pocket_diameter_mm: 40,
      pocket_depth_mm: 10,
      tool_diameter_mm: 10,
      material_type: "titanium",
      stepover_percent: 40,
    });
    expect(
      r.warnings.some(w => w.includes("heat"))
    ).toBe(true);
  });

  it("calculates MRR and cycle time", () => {
    const r = circularPocketEngine.calculate({
      pocket_diameter_mm: 50,
      pocket_depth_mm: 15,
      tool_diameter_mm: 12,
    });
    expect(r.mrr.value).toBeGreaterThan(0);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("total path length increases with pocket size", () => {
    const small = circularPocketEngine.calculate({
      pocket_diameter_mm: 20,
      pocket_depth_mm: 10,
      tool_diameter_mm: 8,
    });
    const large = circularPocketEngine.calculate({
      pocket_diameter_mm: 60,
      pocket_depth_mm: 10,
      tool_diameter_mm: 8,
    });
    expect(large.total_path_length.value).toBeGreaterThan(
      small.total_path_length.value
    );
  });
});
