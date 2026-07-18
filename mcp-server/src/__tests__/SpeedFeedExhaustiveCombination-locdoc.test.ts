/**
 * R9 tests for the LOC x DOC (axial-depth ap x radial-depth ae) sweep axis added to
 * SpeedFeedExhaustiveCombinationEngine. Verifies the new grids forward into each cell,
 * multiply the cell count, preserve the orchestrator default when absent, and -- the
 * intent test -- that ap actually drives the physics (MRR scales with ap), not just metadata.
 */
import { describe, it, expect } from "vitest";
import { speedFeedExhaustiveCombinationEngine } from "../engines/SpeedFeedExhaustiveCombinationEngine.js";

const BASE = { domain: "mill" as const, sample_mode: "demo" as const, iso_groups: ["P"] as ("P")[] };

describe("SpeedFeedExhaustiveCombinationEngine -- LOC x DOC (ap x ae) sweep axis", () => {
  it("forwards each ap/ae grid value into the cell input_summary", () => {
    const r = speedFeedExhaustiveCombinationEngine.run({ ...BASE, axial_depths_mm: [1.0, 2.0], radial_depths_mm: [4.0] });
    const aps = new Set(r.results.map((c) => c.input_summary.axial_depth_mm));
    expect(aps.has(1.0)).toBe(true);
    expect(aps.has(2.0)).toBe(true);
    expect(r.results.every((c) => c.input_summary.radial_depth_mm === 4.0)).toBe(true);
  });

  it("multiplies the cell count by the ap x ae grid size", () => {
    const base = speedFeedExhaustiveCombinationEngine.run({ ...BASE, axial_depths_mm: [1.0], radial_depths_mm: [4.0] });
    const grid = speedFeedExhaustiveCombinationEngine.run({ ...BASE, axial_depths_mm: [1.0, 2.0, 3.0], radial_depths_mm: [4.0, 5.0] });
    expect(grid.total_cells).toBe(base.total_cells * 6); // 3 ap x 2 ae
  });

  it("preserves the orchestrator default (no override) when grids are absent", () => {
    const r = speedFeedExhaustiveCombinationEngine.run({ ...BASE });
    expect(r.results.every((c) => c.input_summary.axial_depth_mm === undefined)).toBe(true);
    expect(r.results.every((c) => c.input_summary.radial_depth_mm === undefined)).toBe(true);
    expect(r.total_cells).toBeGreaterThan(0);
  });

  it("ap drives the physics: a 3x-larger ap at fixed ae yields a larger median MRR (MRR scales with ap)", () => {
    const small = speedFeedExhaustiveCombinationEngine.run({ ...BASE, axial_depths_mm: [0.5], radial_depths_mm: [4.0] });
    const big = speedFeedExhaustiveCombinationEngine.run({ ...BASE, axial_depths_mm: [1.5], radial_depths_mm: [4.0] });
    expect(big.aggregates.mrr_median).toBeGreaterThan(small.aggregates.mrr_median);
  });

  it("ae drives the physics: a larger ae at fixed ap yields a larger median MRR", () => {
    const narrow = speedFeedExhaustiveCombinationEngine.run({ ...BASE, axial_depths_mm: [1.0], radial_depths_mm: [2.0] });
    const wide = speedFeedExhaustiveCombinationEngine.run({ ...BASE, axial_depths_mm: [1.0], radial_depths_mm: [6.0] });
    expect(wide.aggregates.mrr_median).toBeGreaterThan(narrow.aggregates.mrr_median);
  });

  it("zero invariant failures across a fine ap x ae grid", () => {
    const r = speedFeedExhaustiveCombinationEngine.run({ ...BASE, axial_depths_mm: [0.5, 1.0, 1.5], radial_depths_mm: [2.0, 4.0] });
    expect(r.failed_cells).toBe(0);
    expect(r.failure_rate_pct).toBe(0);
  });
});
