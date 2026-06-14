/**
 * Tests for milling-training-index.ts — the AI-reachable discovery surface
 * for the mill-studio wizard training pipeline + agent retrieval.
 */

import { describe, it, expect } from "vitest";
import {
  MILLING_TRAINING_NODES,
  nodesForOperation,
  nodesByVendor,
  nodesByConfidence,
  listMillingVendors,
  listCoveredMillingOperations,
  summarizeMillingTrainingIndex,
  searchMillingTrainingNodes,
} from "./milling-training-index.js";

describe("MILLING_TRAINING_NODES — flat AI-reachable surface", () => {
  it("contains at least 30 nodes (full corpus projection)", () => {
    expect(MILLING_TRAINING_NODES.length).toBeGreaterThanOrEqual(30);
  });

  it("every node carries the 4 foxtrot-soul attribution fields (id, vendor, citation, evidence_level)", () => {
    for (const n of MILLING_TRAINING_NODES) {
      expect(n.id.length).toBeGreaterThan(0);
      expect(n.vendor.length).toBeGreaterThan(0);
      expect(n.citation.length).toBeGreaterThan(0);
      expect(n.evidence_level.length).toBeGreaterThan(0);
    }
  });

  it("every node has domain='milling' and at least one operation tag", () => {
    for (const n of MILLING_TRAINING_NODES) {
      expect(n.domain).toBe("milling");
      expect(n.operations.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every node has a non-empty body_text (RAG retrievable)", () => {
    for (const n of MILLING_TRAINING_NODES) {
      expect(n.body_text.length).toBeGreaterThan(0);
    }
  });

  it("body_text contains the headline (consistent retrieval signal)", () => {
    for (const n of MILLING_TRAINING_NODES) {
      expect(n.body_text).toContain(n.headline);
    }
  });

  it("node IDs are unique across the index", () => {
    const ids = MILLING_TRAINING_NODES.map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("kind discriminator is one of the documented enum values", () => {
    const allowed = new Set(["tip", "formula", "course_module", "manifest", "wiki_entry", "vendor_resource"]);
    for (const n of MILLING_TRAINING_NODES) {
      expect(allowed.has(n.kind)).toBe(true);
    }
  });

  it("nodes tagged 'formula' are classified as kind='formula' (kind matches tag)", () => {
    for (const n of MILLING_TRAINING_NODES) {
      if (n.tags.includes("formula")) {
        expect(n.kind).toBe("formula");
      }
    }
  });
});

describe("nodesForOperation — agent retrieval by milling operation", () => {
  it("returns at least 1 node for 'face_milling'", () => {
    const nodes = nodesForOperation("face_milling");
    expect(nodes.length).toBeGreaterThanOrEqual(1);
    for (const n of nodes) {
      expect(n.operations).toContain("face_milling");
    }
  });

  it("returns at least 1 node for 'adaptive_hsm'", () => {
    const nodes = nodesForOperation("adaptive_hsm");
    expect(nodes.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty for unknown operation (fail-soft)", () => {
    expect(nodesForOperation("not-an-op")).toEqual([]);
  });

  it("returns empty for empty / non-string input", () => {
    expect(nodesForOperation("")).toEqual([]);
    // @ts-expect-error testing runtime safety
    expect(nodesForOperation(null)).toEqual([]);
  });

  it("is case-insensitive on operation key", () => {
    const lower = nodesForOperation("face_milling");
    const upper = nodesForOperation("FACE_MILLING");
    expect(upper.length).toBe(lower.length);
  });
});

describe("nodesByVendor — agent retrieval by vendor", () => {
  it("returns DAPRA-attributed nodes for 'DAPRA' query (substring match)", () => {
    const nodes = nodesByVendor("DAPRA");
    expect(nodes.length).toBeGreaterThanOrEqual(1);
    for (const n of nodes) {
      expect(n.vendor.toLowerCase()).toContain("dapra");
    }
  });

  it("returns Sandvik-attributed nodes for 'Sandvik' query", () => {
    const nodes = nodesByVendor("Sandvik");
    expect(nodes.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty for unknown vendor", () => {
    expect(nodesByVendor("not-a-real-vendor-xyz123")).toEqual([]);
  });

  it("returns empty for empty input", () => {
    expect(nodesByVendor("")).toEqual([]);
  });
});

describe("nodesByConfidence — doctrine filtering for training pipeline", () => {
  it("returns only corroborated nodes when filter='corroborated'", () => {
    const corroborated = nodesByConfidence("corroborated");
    for (const n of corroborated) {
      expect(n.confidence).toBe("corroborated");
    }
  });

  it("returns only draft nodes when filter='draft'", () => {
    const draft = nodesByConfidence("draft");
    for (const n of draft) {
      expect(n.confidence).toBe("draft");
    }
  });

  it("returns only doctrine nodes when filter='doctrine' (may be 0 in seed)", () => {
    const doctrine = nodesByConfidence("doctrine");
    for (const n of doctrine) {
      expect(n.confidence).toBe("doctrine");
    }
  });
});

describe("listMillingVendors + listCoveredMillingOperations — index introspection", () => {
  it("returns at least 5 distinct vendors", () => {
    const vendors = listMillingVendors();
    expect(vendors.length).toBeGreaterThanOrEqual(5);
  });

  it("returned vendor list is sorted ascending", () => {
    const vendors = listMillingVendors();
    const sortedCopy = [...vendors].sort();
    expect(vendors).toEqual(sortedCopy);
  });

  it("returns at least 8 distinct operations", () => {
    const ops = listCoveredMillingOperations();
    expect(ops.length).toBeGreaterThanOrEqual(8);
  });

  it("operations are sorted ascending and unique", () => {
    const ops = listCoveredMillingOperations();
    const sortedCopy = [...ops].sort();
    expect(ops).toEqual(sortedCopy);
    expect(new Set(ops).size).toBe(ops.length);
  });
});

describe("summarizeMillingTrainingIndex — AI agent introspection", () => {
  it("totalNodes matches the canonical node array length", () => {
    const summary = summarizeMillingTrainingIndex();
    expect(summary.totalNodes).toBe(MILLING_TRAINING_NODES.length);
  });

  it("byConfidence totals sum to totalNodes", () => {
    const summary = summarizeMillingTrainingIndex();
    const sum = Object.values(summary.byConfidence).reduce((a, b) => a + b, 0);
    expect(sum).toBe(summary.totalNodes);
  });

  it("byKind totals sum to totalNodes", () => {
    const summary = summarizeMillingTrainingIndex();
    const sum = Object.values(summary.byKind).reduce((a, b) => a + b, 0);
    expect(sum).toBe(summary.totalNodes);
  });

  it("byEvidenceLevel totals sum to totalNodes", () => {
    const summary = summarizeMillingTrainingIndex();
    const sum = Object.values(summary.byEvidenceLevel).reduce((a, b) => a + b, 0);
    expect(sum).toBe(summary.totalNodes);
  });
});

describe("searchMillingTrainingNodes — BM25-lite text retrieval (baseline RAG)", () => {
  it("returns hits for 'chip thinning' query", () => {
    const hits = searchMillingTrainingNodes("chip thinning");
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });

  it("returns hits for 'climb milling' query", () => {
    const hits = searchMillingTrainingNodes("climb milling");
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });

  it("returns at most topK results", () => {
    const hits = searchMillingTrainingNodes("milling", 3);
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it("returns empty for query with no hits", () => {
    expect(searchMillingTrainingNodes("xyzzyfoobazquux12345")).toEqual([]);
  });

  it("returns empty for empty / non-string input", () => {
    expect(searchMillingTrainingNodes("")).toEqual([]);
    // @ts-expect-error testing runtime safety
    expect(searchMillingTrainingNodes(null)).toEqual([]);
  });

  it("ranks corroborated tips above draft tips for same query relevance", () => {
    // Both 'face_milling' tips and 'adaptive_hsm' tips contain 'milling';
    // promote-eligible ones (corroborated) should bubble up.
    const hits = searchMillingTrainingNodes("milling", 50);
    // If any corroborated hit exists for "milling", verify it ranks before
    // some draft hit (lenient — purely a "boost is applied" invariant check).
    const confidences = hits.map(h => h.confidence);
    const firstCorroIdx = confidences.indexOf("corroborated");
    const firstDraftIdx = confidences.indexOf("draft");
    if (firstCorroIdx !== -1 && firstDraftIdx !== -1) {
      expect(firstCorroIdx).toBeLessThanOrEqual(firstDraftIdx);
    }
  });
});
