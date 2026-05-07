/**
 * WEDMReasoningExplainEngine — U-P5-GNN-05 test suite.
 *
 * Exit-gate contract: every explanation cites ≥1 real node ID. Covers
 * multiple materials, absent lattice fallback, predicted-value echo,
 * evidence tagging, citation count, histogram aggregation.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  wedmReasoningExplainEngine,
} from "../engines/WEDMReasoningExplainEngine.js";
import { WEDMLatticeGraphEngine } from "../engines/WEDMLatticeGraphEngine.js";
import { wedmNeighborQueryEngine } from "../engines/WEDMNeighborQueryEngine.js";

beforeAll(() => {
  const lattice = new WEDMLatticeGraphEngine();
  if (lattice.load().nodeCount === 0) lattice.build();
  wedmNeighborQueryEngine.loadFromLattice();
});

describe("WEDMReasoningExplainEngine — U-P5-GNN-05", () => {
  it("cites at least one real lattice node for tool_steel", () => {
    const e = wedmReasoningExplainEngine.explain({
      mat: "tool_steel", mach: "fanuc", wire: "brass",
      wireDiameterMm: 0.25, thicknessMm: 50, raTargetUm: 1.6,
      predictedRaUm: 1.48,
    });
    expect(e.citations.length).toBeGreaterThanOrEqual(1);
    expect(e.topCitation).not.toBeNull();
    expect(e.topCitation!.nodeId).toMatch(/^N-/);
    // Top cosine should be close to 1 since this exact cell exists in the lattice.
    expect(e.topCitation!.similarity).toBeGreaterThan(0.9);
    expect(e.rationale).toContain(e.topCitation!.nodeId);
  });

  it("cites real nodes for tungsten_carbide", () => {
    const e = wedmReasoningExplainEngine.explain({
      mat: "tungsten_carbide", mach: "fanuc", wire: "brass",
      wireDiameterMm: 0.25, thicknessMm: 25, raTargetUm: 0.8,
      predictedRaUm: 0.78,
    });
    expect(e.citations.length).toBeGreaterThanOrEqual(1);
    expect(e.topCitation!.nodeId).toMatch(/^N-/);
    // Top match should be a carbide node
    expect(e.topCitation!.attrs.mat).toBe("tungsten_carbide");
  });

  it("cites real nodes for stainless_steel", () => {
    const e = wedmReasoningExplainEngine.explain({
      mat: "stainless_steel", mach: "sodick", wire: "brass",
      wireDiameterMm: 0.25, thicknessMm: 25, raTargetUm: 1.6,
    });
    expect(e.citations.length).toBeGreaterThanOrEqual(1);
    expect(e.topCitation!.nodeId).toMatch(/^N-/);
    expect(e.topCitation!.attrs.mat).toBe("stainless_steel");
  });

  it("respects topCitations count parameter", () => {
    const five = wedmReasoningExplainEngine.explain({
      mat: "tool_steel", mach: "fanuc", wire: "brass",
      wireDiameterMm: 0.25, thicknessMm: 50, raTargetUm: 1.6,
      topCitations: 5,
    });
    expect(five.citations.length).toBe(5);
    const one = wedmReasoningExplainEngine.explain({
      mat: "tool_steel", mach: "fanuc", wire: "brass",
      wireDiameterMm: 0.25, thicknessMm: 50, raTargetUm: 1.6,
      topCitations: 1,
    });
    expect(one.citations.length).toBe(1);
  });

  it("evidenceHistogram reflects actual citation evidence tags", () => {
    const e = wedmReasoningExplainEngine.explain({
      mat: "tool_steel", mach: "fanuc", wire: "brass",
      wireDiameterMm: 0.25, thicknessMm: 50, raTargetUm: 1.6,
      topCitations: 5,
    });
    const histogramTotal = Object.values(e.evidenceHistogram).reduce((s, n) => s + n, 0);
    // Each citation contributes ≥1 tag, so histogram total ≥ citations.length
    expect(histogramTotal).toBeGreaterThanOrEqual(e.citations.length);
    // "same material" should be a dominant tag for this query (all anchors in
    // tool_steel — the first 5 neighbors will share material with high prob).
    expect(e.evidenceHistogram["same material"]).toBeGreaterThanOrEqual(1);
  });

  it("echoes query (inc. predicted values) in queryEcho", () => {
    const e = wedmReasoningExplainEngine.explain({
      mat: "tool_steel", mach: "fanuc", wire: "brass",
      wireDiameterMm: 0.25, thicknessMm: 50, raTargetUm: 1.6,
      predictedBreakProb: 0.12,
    });
    expect(e.queryEcho.mat).toBe("tool_steel");
    expect(e.queryEcho.thicknessMm).toBe(50);
    expect(e.queryEcho.predictedBreakProb).toBe(0.12);
    expect(e.rationale).toMatch(/break 12(\.\d+)?\s*%/);
  });

  it("material alias (D2 → tool_steel) normalizes to lattice equivalent", () => {
    const e = wedmReasoningExplainEngine.explain({
      mat: "D2", wireDiameterMm: 0.25, thicknessMm: 50, raTargetUm: 1.6,
    });
    expect(e.queryEcho.mat).toBe("tool_steel");
    expect(e.citations.length).toBeGreaterThanOrEqual(1);
  });

  it("rationale includes top node ID and similarity", () => {
    const e = wedmReasoningExplainEngine.explain({
      mat: "hardened_steel", mach: "fanuc", wire: "brass",
      wireDiameterMm: 0.25, thicknessMm: 50, raTargetUm: 1.6,
      predictedRecastUm: 8.2,
    });
    expect(e.rationale).toContain(e.topCitation!.nodeId);
    expect(e.rationale).toMatch(/cosine/);
    expect(e.rationale).toMatch(/recast 8\.2/);
  });

  it("citations are ranked by similarity DESC", () => {
    const e = wedmReasoningExplainEngine.explain({
      mat: "tool_steel", mach: "fanuc", wire: "brass",
      wireDiameterMm: 0.25, thicknessMm: 50, raTargetUm: 1.6,
      topCitations: 5,
    });
    for (let i = 1; i < e.citations.length; i += 1) {
      expect(e.citations[i].similarity).toBeLessThanOrEqual(e.citations[i - 1].similarity);
    }
  });

  it("evidence tags include at least one match from the curated list", () => {
    const allowed = new Set([
      "same material", "same controller", "same wire", "matching wire Ø",
      "similar thickness", "similar Ra target", "cosine-similarity neighbor",
    ]);
    const e = wedmReasoningExplainEngine.explain({
      mat: "aluminum", wireDiameterMm: 0.25, thicknessMm: 25, raTargetUm: 1.6,
    });
    for (const c of e.citations) {
      const tags = c.evidence.split(",").map((s) => s.trim());
      expect(tags.some((t) => allowed.has(t))).toBe(true);
    }
  });
});
