/**
 * MS-P5-GNN / U-P5-GNN-04 — integration tests for graph-prior wiring into the
 * Ra, WireBreak, and Recast predictors.
 *
 * Contract:
 *   - `useGraphPrior=false` (default) → prediction identical to pre-GNN path
 *   - `useGraphPrior=true` with lattice loaded → `graphPrior` populated,
 *     blend weight respected, uncertainty shrinks, source tag gains `+gnn`
 *   - Graph prior failure (lattice not loaded) silently falls through (no throw)
 *   - Covers ≥3 distinct materials per predictor
 */

import { describe, it, expect, beforeAll } from "vitest";
import { wedmRaPredictorEngine } from "../engines/WEDMRaPredictorEngine.js";
import { wedmWireBreakPredictorEngine } from "../engines/WEDMWireBreakPredictorEngine.js";
import { wedmRecastDepthPredictorEngine } from "../engines/WEDMRecastDepthPredictorEngine.js";
import { WEDMLatticeGraphEngine } from "../engines/WEDMLatticeGraphEngine.js";
import { wedmNeighborQueryEngine } from "../engines/WEDMNeighborQueryEngine.js";

// Ensure the lattice is built and loaded at least once for this suite. The
// canonical state file may exist from an earlier run; build it if absent.
beforeAll(() => {
  const lattice = new WEDMLatticeGraphEngine();
  const g = lattice.load();
  if (g.nodeCount === 0) {
    lattice.build();
  }
  wedmNeighborQueryEngine.loadFromLattice();
});

describe("MS-P5-GNN / U-P5-GNN-04 — Ra predictor graph-prior", () => {
  it("defaults to no prior when useGraphPrior is unset", () => {
    const r = wedmRaPredictorEngine.predict({
      material: "steel", peakCurrentA: 8, pulseOnUs: 2,
    });
    expect(r.graphPrior).toBeUndefined();
    expect(r.ra.source).not.toMatch(/gnn/);
  });

  it("applies graph prior on tool_steel and shifts prediction measurably", () => {
    const base = wedmRaPredictorEngine.predict({
      material: "tool_steel", peakCurrentA: 12, pulseOnUs: 2.5,
    });
    const withPrior = wedmRaPredictorEngine.predict({
      material: "tool_steel", peakCurrentA: 12, pulseOnUs: 2.5,
      useGraphPrior: true, graphPriorWeight: 0.4,
      thicknessMm: 50, wireDiameterMm: 0.25, wireMaterial: "brass", controller: "fanuc",
    });
    expect(withPrior.graphPrior).not.toBeNull();
    expect(withPrior.graphPrior?.neighborCount).toBeGreaterThan(0);
    expect(withPrior.ra.source).toMatch(/gnn/);
    // Prior shifts prediction toward the graph average. Because graphPriorWeight=0.4,
    // the two values must not be identical (unless prior happened to exactly match).
    expect(Math.abs(withPrior.ra.value - base.ra.value)).toBeGreaterThan(1e-6);
    expect(Number.isFinite(withPrior.ra.value)).toBe(true);
    expect(withPrior.ra.value).toBeGreaterThan(0);
  });

  it("applies graph prior on tungsten_carbide", () => {
    const r = wedmRaPredictorEngine.predict({
      material: "tungsten_carbide", peakCurrentA: 6, pulseOnUs: 1.5,
      useGraphPrior: true,
      thicknessMm: 25, wireDiameterMm: 0.20, wireMaterial: "brass",
    });
    expect(r.graphPrior).not.toBeNull();
    expect(r.graphPrior?.neighborCount).toBeGreaterThan(0);
    expect(r.ra.source).toMatch(/carbide|gnn|klocke/i); // gnn or klocke path
  });

  it("applies graph prior on stainless_steel", () => {
    const r = wedmRaPredictorEngine.predict({
      material: "stainless_steel", peakCurrentA: 10, pulseOnUs: 3,
      useGraphPrior: true,
      thicknessMm: 50, wireDiameterMm: 0.25,
    });
    expect(r.graphPrior).not.toBeNull();
    expect(r.ra.source).toMatch(/gnn/);
  });

  it("graph-prior uncertainty is ≤ no-prior uncertainty (evidence narrows it)", () => {
    const noPrior = wedmRaPredictorEngine.predict({
      material: "tool_steel", peakCurrentA: 10, pulseOnUs: 2,
    });
    const withPrior = wedmRaPredictorEngine.predict({
      material: "tool_steel", peakCurrentA: 10, pulseOnUs: 2,
      useGraphPrior: true, graphPriorWeight: 0.5,
    });
    // Uncertainty should not INCREASE with prior (may shrink, may stay same if no neighbors)
    expect(withPrior.ra.uncertainty).toBeLessThanOrEqual(noPrior.ra.uncertainty + 1e-9);
  });

  it("returns finite prediction even if bad material falls back to default", () => {
    const r = wedmRaPredictorEngine.predict({
      material: "steel", peakCurrentA: 8, pulseOnUs: 2,
      useGraphPrior: true,
    });
    expect(Number.isFinite(r.ra.value)).toBe(true);
  });
});

describe("MS-P5-GNN / U-P5-GNN-04 — WireBreak predictor graph-prior", () => {
  it("defaults to no prior when unset", () => {
    const r = wedmWireBreakPredictorEngine.predict({
      peakCurrentA: 10, wireDiameterMm: 0.25, thicknessMm: 30,
    }, 10);
    expect(r.graphPrior).toBeUndefined();
    expect(r.probability.source).not.toMatch(/gnn/);
  });

  it("applies graph prior for a tool_steel job", () => {
    const r = wedmWireBreakPredictorEngine.predict({
      peakCurrentA: 12, wireDiameterMm: 0.25, thicknessMm: 50,
      useGraphPrior: true, material: "tool_steel", controller: "fanuc",
    }, 15);
    expect(r.graphPrior).not.toBeNull();
    expect(r.graphPrior?.neighborCount).toBeGreaterThan(0);
    expect(r.probability.source).toMatch(/gnn/);
  });

  it("applies graph prior for a tungsten_carbide job", () => {
    const r = wedmWireBreakPredictorEngine.predict({
      peakCurrentA: 6, wireDiameterMm: 0.20, thicknessMm: 25,
      useGraphPrior: true, material: "tungsten_carbide",
    }, 10);
    expect(r.graphPrior).not.toBeNull();
    expect(r.probability.source).toMatch(/gnn/);
  });

  it("applies graph prior for a stainless_steel job", () => {
    const r = wedmWireBreakPredictorEngine.predict({
      peakCurrentA: 10, wireDiameterMm: 0.25, thicknessMm: 40,
      useGraphPrior: true, material: "stainless_steel",
    }, 12);
    expect(r.graphPrior).not.toBeNull();
    expect(r.probability.source).toMatch(/gnn/);
  });

  it("probability stays in [0,1] under prior blending", () => {
    const r = wedmWireBreakPredictorEngine.predict({
      peakCurrentA: 22, wireDiameterMm: 0.25, thicknessMm: 80,
      useGraphPrior: true, graphPriorWeight: 0.5,
      material: "tool_steel",
    }, 30);
    expect(r.probability.value).toBeGreaterThanOrEqual(0);
    expect(r.probability.value).toBeLessThanOrEqual(1);
    expect(r.probability.confidence).toBeGreaterThan(0);
    expect(r.probability.confidence).toBeLessThanOrEqual(1);
  });
});

describe("MS-P5-GNN / U-P5-GNN-04 — Recast predictor graph-prior", () => {
  it("defaults to no prior when unset", () => {
    const r = wedmRecastDepthPredictorEngine.predict({
      material: "tool_steel", voltageV: 80, peakCurrentA: 10, pulseOnUs: 4,
    });
    expect(r.graphPrior).toBeUndefined();
    expect(r.depth.source).not.toMatch(/gnn/);
  });

  it("applies graph prior for tool_steel and blends depth", () => {
    const noPrior = wedmRecastDepthPredictorEngine.predict({
      material: "tool_steel", voltageV: 80, peakCurrentA: 12, pulseOnUs: 4,
    });
    const withPrior = wedmRecastDepthPredictorEngine.predict({
      material: "tool_steel", voltageV: 80, peakCurrentA: 12, pulseOnUs: 4,
      useGraphPrior: true, graphPriorWeight: 0.4,
      thicknessMm: 50, raTargetUm: 1.6,
    });
    expect(withPrior.graphPrior).not.toBeNull();
    expect(withPrior.graphPrior?.neighborCount).toBeGreaterThan(0);
    expect(withPrior.depth.source).toMatch(/gnn/);
    expect(Math.abs(withPrior.depth.value - noPrior.depth.value)).toBeGreaterThan(1e-6);
    expect(withPrior.depth.value).toBeGreaterThan(0);
  });

  it("applies graph prior for tungsten_carbide", () => {
    const r = wedmRecastDepthPredictorEngine.predict({
      material: "tungsten_carbide", voltageV: 70, peakCurrentA: 6, pulseOnUs: 1.5,
      useGraphPrior: true, thicknessMm: 25, raTargetUm: 0.8,
    });
    expect(r.graphPrior).not.toBeNull();
    expect(r.depth.source).toMatch(/gnn/);
    expect(r.depth.value).toBeGreaterThan(0);
  });

  it("applies graph prior for stainless_steel", () => {
    const r = wedmRecastDepthPredictorEngine.predict({
      material: "stainless_steel", voltageV: 80, peakCurrentA: 10, pulseOnUs: 3,
      useGraphPrior: true, thicknessMm: 40, raTargetUm: 1.6,
    });
    expect(r.graphPrior).not.toBeNull();
    expect(r.depth.source).toMatch(/gnn/);
  });

  it("uncertainty shrinks or stays equal with prior applied", () => {
    const noPrior = wedmRecastDepthPredictorEngine.predict({
      material: "tool_steel", voltageV: 80, peakCurrentA: 10, pulseOnUs: 3,
    });
    const withPrior = wedmRecastDepthPredictorEngine.predict({
      material: "tool_steel", voltageV: 80, peakCurrentA: 10, pulseOnUs: 3,
      useGraphPrior: true, graphPriorWeight: 0.3,
      thicknessMm: 50, raTargetUm: 1.6,
    });
    expect(withPrior.depth.uncertainty).toBeLessThanOrEqual(noPrior.depth.uncertainty + 1e-9);
  });
});
