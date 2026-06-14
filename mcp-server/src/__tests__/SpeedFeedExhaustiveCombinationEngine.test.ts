/**
 * SpeedFeedExhaustiveCombinationEngine — smoke tests
 *
 * Each orchestrator.run() runs canonical SFC physics + auto-emit propagation,
 * so an exhaustive sweep costs O(cells × 100ms). To keep this test suite under
 * 60s we use the smallest demo cell set (1-4 cells) and verify the SHAPE
 * contract — full combinatorial coverage is exercised by the out-of-band
 * sweep script (scripts/sf-exhaustive-sweep.mjs, follow-up unit).
 *
 * @module __tests__/SpeedFeedExhaustiveCombinationEngine.test
 */

import { describe, it, expect } from "vitest";
import {
  SpeedFeedExhaustiveCombinationEngine,
  speedFeedExhaustiveCombinationEngine,
} from "../engines/SpeedFeedExhaustiveCombinationEngine.js";

const engine = speedFeedExhaustiveCombinationEngine;

describe("SpeedFeedExhaustiveCombinationEngine — instantiation", () => {
  it("exports a singleton with a run() method", () => {
    expect(speedFeedExhaustiveCombinationEngine).toBeInstanceOf(SpeedFeedExhaustiveCombinationEngine);
  });
});

describe("SpeedFeedExhaustiveCombinationEngine — wedm domain (zero-cells contract)", () => {
  it("wedm domain returns 0 total cells (wire EDM is not chip-removal SFC)", () => {
    const r = engine.run({ domain: "wedm" });
    expect(r.total_cells).toBe(0);
    expect(r.successful_cells).toBe(0);
    expect(r.failed_cells).toBe(0);
    expect(r.domain).toBe("wedm");
  });

  it("wedm report has valid generated_at timestamp", () => {
    const r = engine.run({ domain: "wedm" });
    const parsed = new Date(r.generated_at);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });
});

describe("SpeedFeedExhaustiveCombinationEngine — mill demo smoke", () => {
  it("mill demo returns at least 1 cell and all cells are mill ops", () => {
    const r = engine.run({ domain: "mill", sample_mode: "demo" });
    expect(r.total_cells).toBeGreaterThanOrEqual(1);
    const ops = new Set(r.results.map(c => c.input_summary.operation));
    expect(ops.has("milling")).toBe(true);
    expect(ops.size).toBe(1);
  }, 60000);

  it("successful_cells + failed_cells = total_cells", () => {
    const r = engine.run({ domain: "mill", sample_mode: "demo" });
    expect(r.successful_cells + r.failed_cells).toBe(r.total_cells);
  }, 60000);
});

describe("SpeedFeedExhaustiveCombinationEngine — lathe demo smoke", () => {
  it("lathe demo cells all have operation=turning", () => {
    const r = engine.run({ domain: "lathe", sample_mode: "demo" });
    expect(r.total_cells).toBeGreaterThanOrEqual(1);
    const ops = new Set(r.results.map(c => c.input_summary.operation));
    expect(ops.has("turning")).toBe(true);
  }, 60000);
});

describe("SpeedFeedExhaustiveCombinationEngine — cell ID + report shape", () => {
  it("every cell has a unique cell_id and contains material+diameter tokens", () => {
    const r = engine.run({ domain: "mill", sample_mode: "demo" });
    const ids = r.results.map(c => c.cell_id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    const sample = r.results[0];
    expect(sample?.cell_id).toMatch(/D[0-9]+/);
    expect(sample?.cell_id).toMatch(/prism_optimized|cost_batch|aggressive_rush/);
  }, 60000);

  it("failure_rate_pct matches failed/total ratio", () => {
    const r = engine.run({ domain: "mill", sample_mode: "demo" });
    if (r.total_cells > 0) {
      const expected = (r.failed_cells / r.total_cells) * 100;
      expect(Math.abs(r.failure_rate_pct - expected)).toBeLessThan(0.01);
    }
  }, 60000);

  it("failure_clusters sorted by count descending", () => {
    const r = engine.run({ domain: "mill", sample_mode: "demo" });
    for (let i = 1; i < r.failure_clusters.length; i++) {
      expect(r.failure_clusters[i - 1]!.count).toBeGreaterThanOrEqual(r.failure_clusters[i]!.count);
    }
  }, 60000);
});

describe("SpeedFeedExhaustiveCombinationEngine — aggregates on successful cells", () => {
  it("aggregates.vc_min ≤ vc_median ≤ vc_max", () => {
    const r = engine.run({ domain: "mill", sample_mode: "demo" });
    if (r.successful_cells > 0) {
      expect(r.aggregates.vc_min).toBeLessThanOrEqual(r.aggregates.vc_median);
      expect(r.aggregates.vc_median).toBeLessThanOrEqual(r.aggregates.vc_max);
    }
  }, 60000);
});

// ── FULL mode + runStreaming (U-OSC-FULL-INPUT-SWEEP, 2026-06-08) ────────────
// `full` mode = the SFC app page's real selectable input space (15 canonical
// materials × full diameter/flute/strategy/coolant/holder grids × 3 modes ≈ 69K
// cells fleet-wide). Tests constrain to a single ISO + single diameter so the
// grid-product is verifiable AND fast (the orchestrator is ~0.06ms/cell).
describe("SpeedFeedExhaustiveCombinationEngine — FULL mode input-space expansion", () => {
  it("full mode produces dramatically MORE cells than prod for the same constrained slice", () => {
    const slice = { domain: "mill" as const, iso_groups: ["K" as const], diameters_mm: [12] };
    const prod = engine.run({ ...slice, sample_mode: "prod" });
    const full = engine.run({ ...slice, sample_mode: "full" });
    // prod K-slice: 1 mat × 1 dia × 1 flute × 2 strat × 1 coolant × 1 holder × 3 modes = 6
    // full K-slice: 1 mat × 1 dia × 4 flute × 2 cut × 3 strat × 3 coolant × 3 holder × 3 modes = 648
    expect(full.total_cells).toBeGreaterThan(prod.total_cells * 50);
    expect(full.total_cells).toBe(648);
    expect(prod.total_cells).toBe(6);
  }, 60000);

  it("full mode expands flutes, cut_types, strategies, coolants, and holders beyond prod", () => {
    // Use runStreaming (the full set) — run().results is capped at 50 and, because
    // flutes is an outer loop axis, the first 50 K-slice cells all share flutes=2.
    const flutes = new Set<number>();
    const cuts = new Set<string>();
    const strats = new Set<string>();
    const coolants = new Set<string>();
    const holders = new Set<string>();
    for (const c of engine.runStreaming({ domain: "mill", sample_mode: "full", iso_groups: ["K"], diameters_mm: [12] })) {
      flutes.add(c.input_summary.flutes);
      cuts.add(c.input_summary.cut_type);
      strats.add(c.input_summary.strategy);
      coolants.add(c.input_summary.coolant_type);
      holders.add(c.input_summary.holder_type);
    }
    expect(flutes.size).toBe(4); // 2,3,4,5 — prod fixes flutes=4
    expect(cuts.size).toBe(2); // roughing + finishing
    expect(strats.size).toBe(3); // conventional, adaptive, climb
    expect(coolants.size).toBe(3); // flood, mist, dry
    expect(holders.size).toBe(3); // cat40, hsk63, er32
  }, 60000);

  it("full mode uses REAL canonical material names (not short demo keys)", () => {
    // N (non-ferrous) full grid carries 4 real DB names incl. Aluminum 7075-T6.
    const full = engine.run({ domain: "mill", sample_mode: "full", iso_groups: ["N"], diameters_mm: [12] });
    const mats = new Set(full.results.map((c) => c.input_summary.material));
    // At least one of the canonical N-group names must appear (vs the prod "6061" key).
    const hasCanonical = [...mats].some((m) =>
      /Aluminum 6061-T6|Aluminum 7075-T6|C11000 ETP Copper|C26000 Cartridge Brass/.test(m),
    );
    expect(hasCanonical).toBe(true);
  }, 60000);

  it("full-mode cells all resolve to a finite positive Vc (real DB names are valid)", () => {
    const full = engine.run({ domain: "mill", sample_mode: "full", iso_groups: ["S"], diameters_mm: [12] });
    // S = titanium + Inconel — exotic but must still resolve, not throw.
    expect(full.successful_cells).toBeGreaterThan(0);
    expect(full.failed_cells).toBe(0);
    for (const c of full.results) {
      if (c.output) expect(c.output.cutting_speed_mpm).toBeGreaterThan(0);
    }
  }, 60000);

  it("DOCUMENTS the ISO-group resolution: within-group materials produce IDENTICAL Vc (scrutiny-verified)", () => {
    // PRISM's SFC resolves material physics at the ISO-GROUP level (kc1.1 per group),
    // NOT per-alloy. This test LOCKS that known characteristic so a future change to
    // per-alloy resolution is a deliberate, test-breaking decision — not silent.
    // N-group full grid = 6061, 7075, copper, brass. All 4 collapse to one Vc per
    // (diameter × mode) because the resolver anchors on iso_group N.
    const byMaterial = new Map<string, number>();
    for (const c of engine.runStreaming({
      domain: "mill",
      sample_mode: "full",
      iso_groups: ["N"],
      diameters_mm: [12],
      modes: ["prism_optimized"],
    })) {
      // Hold only the conventional/flood/cat40/roughing/4-flute slice for a clean compare.
      const s = c.input_summary;
      if (s.strategy === "conventional" && s.coolant_type === "flood" && s.holder_type === "cat40" && s.cut_type === "roughing" && s.flutes === 4 && c.output) {
        byMaterial.set(s.material, c.output.cutting_speed_mpm);
      }
    }
    const distinctNames = byMaterial.size;
    const distinctVc = new Set(byMaterial.values()).size;
    expect(distinctNames).toBe(4); // 4 selectable N-group names
    expect(distinctVc).toBe(1); // …collapse to ONE Vc (ISO-group resolution — documented)
  }, 60000);
});

describe("SpeedFeedExhaustiveCombinationEngine — runStreaming generator", () => {
  it("runStreaming is a generator that yields CombinationCellResult cells", () => {
    const gen = engine.runStreaming({ domain: "mill", sample_mode: "demo" });
    expect(typeof gen[Symbol.iterator]).toBe("function");
    const first = gen.next();
    expect(first.done).toBe(false);
    expect(first.value).toHaveProperty("cell_id");
    expect(first.value).toHaveProperty("input_summary");
  }, 60000);

  it("runStreaming yields exactly run().total_cells cells for the same request (no 50-cap)", () => {
    // K-slice full = 648 cells. run().results is capped at 50, but runStreaming
    // must yield ALL 648 — the whole point of the streaming path for the 69K sweep.
    const req = { domain: "mill" as const, sample_mode: "full" as const, iso_groups: ["K" as const], diameters_mm: [12] };
    const capped = engine.run(req);
    let streamed = 0;
    for (const _ of engine.runStreaming(req)) streamed++;
    expect(capped.results.length).toBeLessThanOrEqual(50); // callable surface capped
    expect(capped.total_cells).toBe(648);
    expect(streamed).toBe(648); // streaming yields the FULL set
  }, 60000);

  it("runStreaming on wedm yields zero cells (chip-removal SFC N/A)", () => {
    let n = 0;
    for (const _ of engine.runStreaming({ domain: "wedm", sample_mode: "full" })) n++;
    expect(n).toBe(0);
  });
});
