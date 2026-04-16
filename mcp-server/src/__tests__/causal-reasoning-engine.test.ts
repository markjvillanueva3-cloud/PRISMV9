/**
 * Tests for CausalReasoningEngine (Phase 0.18 U-AGI2)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CausalReasoningEngine, causalReasoningEngine } from "../engines/CausalReasoningEngine.js";

describe("CausalReasoningEngine", () => {
  let e: CausalReasoningEngine;

  beforeEach(() => {
    e = new CausalReasoningEngine();
  });

  describe("addEdge()", () => {
    it("registers nodes and edges", () => {
      e.addEdge({ from: "A", to: "B", confidence: 0.9, polarity: "positive" });
      expect(e.nodeCount()).toBe(2);
      expect(e.edgeCount()).toBe(1);
    });

    it("rejects empty endpoints", () => {
      expect(() => e.addEdge({ from: "", to: "B", confidence: 1, polarity: "positive" })).toThrow(/from/);
      expect(() => e.addEdge({ from: "A", to: "", confidence: 1, polarity: "positive" })).toThrow(/to/);
    });

    it("rejects self-loops", () => {
      expect(() => e.addEdge({ from: "A", to: "A", confidence: 1, polarity: "positive" })).toThrow(/self-loop/);
    });

    it("rejects out-of-range confidence", () => {
      expect(() => e.addEdge({ from: "A", to: "B", confidence: -0.1, polarity: "positive" })).toThrow();
      expect(() => e.addEdge({ from: "A", to: "B", confidence: 1.1, polarity: "positive" })).toThrow();
    });

    it("rejects invalid polarity", () => {
      expect(() =>
        e.addEdge({ from: "A", to: "B", confidence: 1, polarity: "meh" as "unknown" })
      ).toThrow(/polarity/);
    });
  });

  describe("traceImpact()", () => {
    it("rejects empty source", () => {
      expect(() => e.traceImpact("")).toThrow(/source/);
    });

    it("rejects non-positive maxHops", () => {
      expect(() => e.traceImpact("A", 0)).toThrow(/maxHops/);
    });

    it("traces single-hop impact", () => {
      e.addEdge({ from: "A", to: "B", confidence: 0.8, polarity: "positive" });
      const r = e.traceImpact("A");
      expect(r.paths).toHaveLength(1);
      expect(r.paths[0].target).toBe("B");
      expect(r.paths[0].confidence).toBeCloseTo(0.8, 2);
    });

    it("traces multi-hop with multiplied confidence", () => {
      e.addEdges([
        { from: "A", to: "B", confidence: 0.8, polarity: "positive" },
        { from: "B", to: "C", confidence: 0.5, polarity: "positive" },
      ]);
      const r = e.traceImpact("A", 3);
      const c = r.paths.find((p) => p.target === "C");
      expect(c?.confidence).toBeCloseTo(0.4, 2);
      expect(c?.hops).toBe(2);
    });

    it("honors maxHops cutoff", () => {
      e.addEdges([
        { from: "A", to: "B", confidence: 1, polarity: "positive" },
        { from: "B", to: "C", confidence: 1, polarity: "positive" },
        { from: "C", to: "D", confidence: 1, polarity: "positive" },
      ]);
      const r = e.traceImpact("A", 2);
      expect(r.paths.map((p) => p.target).sort()).toEqual(["B", "C"]);
    });

    it("combines polarities (negative × negative = positive)", () => {
      e.addEdges([
        { from: "A", to: "B", confidence: 1, polarity: "negative" },
        { from: "B", to: "C", confidence: 1, polarity: "negative" },
      ]);
      const c = e.traceImpact("A", 3).paths.find((p) => p.target === "C");
      expect(c?.polarity).toBe("positive");
    });

    it("polarity becomes unknown if any edge is unknown", () => {
      e.addEdges([
        { from: "A", to: "B", confidence: 1, polarity: "unknown" },
        { from: "B", to: "C", confidence: 1, polarity: "positive" },
      ]);
      const c = e.traceImpact("A", 3).paths.find((p) => p.target === "C");
      expect(c?.polarity).toBe("unknown");
    });

    it("orders paths by confidence desc then target asc", () => {
      e.addEdges([
        { from: "A", to: "Z", confidence: 0.9, polarity: "positive" },
        { from: "A", to: "B", confidence: 0.5, polarity: "positive" },
      ]);
      const r = e.traceImpact("A");
      expect(r.paths.map((p) => p.target)).toEqual(["Z", "B"]);
    });

    it("returns empty paths when source has no outgoing edges", () => {
      expect(e.traceImpact("ghost").paths).toEqual([]);
    });
  });

  describe("rootCauses()", () => {
    it("walks incoming edges to find nodes with no parents", () => {
      e.addEdges([
        { from: "A", to: "B", confidence: 1, polarity: "positive" },
        { from: "B", to: "C", confidence: 1, polarity: "positive" },
      ]);
      expect(e.rootCauses("C")).toEqual(["A"]);
    });

    it("handles multiple roots", () => {
      e.addEdges([
        { from: "A", to: "C", confidence: 1, polarity: "positive" },
        { from: "B", to: "C", confidence: 1, polarity: "positive" },
      ]);
      expect(e.rootCauses("C")).toEqual(["A", "B"]);
    });

    it("returns empty when target has no parents", () => {
      e.addEdge({ from: "A", to: "B", confidence: 1, polarity: "positive" });
      expect(e.rootCauses("A")).toEqual([]);
    });

    it("rejects missing target", () => {
      expect(() => e.rootCauses("")).toThrow(/target/);
    });
  });

  describe("removeEdge() / clear()", () => {
    it("removes matching edges and returns the count", () => {
      e.addEdge({ from: "A", to: "B", confidence: 1, polarity: "positive" });
      expect(e.removeEdge("A", "B")).toBe(1);
      expect(e.edgeCount()).toBe(0);
    });

    it("returns 0 when nothing matches", () => {
      expect(e.removeEdge("A", "B")).toBe(0);
    });

    it("clear empties graph", () => {
      e.addEdge({ from: "A", to: "B", confidence: 1, polarity: "positive" });
      e.clear();
      expect(e.nodeCount()).toBe(0);
      expect(e.edgeCount()).toBe(0);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      causalReasoningEngine.clear();
      causalReasoningEngine.addEdge({ from: "A", to: "B", confidence: 1, polarity: "positive" });
      expect(causalReasoningEngine.traceImpact("A").paths).toHaveLength(1);
      causalReasoningEngine.clear();
    });
  });
});
