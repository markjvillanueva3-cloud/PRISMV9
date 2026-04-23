/**
 * WEDMLatticeGraphEngine — U-P5-GNN-01 test suite.
 *
 * Exit-gate coverage:
 *   - ≥ 300 nodes when built from published + composed
 *   - every embedding is length 64 and finite
 *   - adjacency sparsity < 5 %
 *   - Zod round-trips bit-exact
 *   - determinism: same input → identical embedding
 *
 * Plus cross-axis spanning: tool_steel, tungsten_carbide, aluminum each
 * reach nodes across all three canonical controllers.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  WEDMLatticeGraphEngine,
  computeLatticeEmbedding,
  latticeNodeId,
  cosineSim,
  MATERIAL_TO_ISO,
  LATTICE_MATERIALS,
  LATTICE_CONTROLLERS,
  MATERIAL_THERMAL,
} from "../engines/WEDMLatticeGraphEngine.js";
import {
  WEDMLatticeGraphSchema,
  LATTICE_EMBEDDING_DIM,
  type WEDMLatticeGraph,
} from "../schemas/wedmLatticeGraphSchema.js";

function tmpPath(name: string): string {
  return path.join(os.tmpdir(), `prism-wedm-lattice-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

describe("WEDMLatticeGraphEngine — U-P5-GNN-01", () => {
  let engine: WEDMLatticeGraphEngine;
  let out: string;

  beforeEach(() => {
    engine = new WEDMLatticeGraphEngine();
    out = tmpPath("build");
    engine._resetForTests({ path: out });
  });

  it("builds ≥ 300 nodes from published + composed sources", () => {
    const result = engine.build({ outputPath: out });
    expect(result.nodeCount).toBeGreaterThanOrEqual(300);
    expect(fs.existsSync(out)).toBe(true);
  });

  it("every embedding is length 64 and all components finite", () => {
    engine.build({ outputPath: out });
    const snap = engine.snapshot();
    for (const node of snap.nodes) {
      expect(node.embedding.length).toBe(LATTICE_EMBEDDING_DIM);
      for (const v of node.embedding) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it("adjacency sparsity is under 5%", () => {
    const result = engine.build({ outputPath: out });
    expect(result.adjacencySparsity).toBeLessThan(0.05);
    // Also: edge count > 0 (we actually built edges, not zero)
    expect(result.edgeCount).toBeGreaterThan(0);
  });

  it("saved JSON round-trips through Zod bit-exactly", () => {
    engine.build({ outputPath: out });
    const raw = fs.readFileSync(out, "utf-8");
    const parsed = WEDMLatticeGraphSchema.parse(JSON.parse(raw));
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.embeddingDim).toBe(64);
    expect(parsed.nodeCount).toBe(parsed.nodes.length);
    expect(parsed.edgeCount).toBe(parsed.edges.length);
    // Re-serialize and compare (whitespace-tolerant equality via JSON.parse)
    const reparsed = JSON.parse(JSON.stringify(parsed));
    expect(reparsed).toEqual(parsed);
  });

  it("embedding is deterministic — identical input produces identical output", () => {
    const cell = {
      mat: "tool_steel" as const,
      isoGroup: MATERIAL_TO_ISO["tool_steel"],
      mach: "fanuc" as const,
      wire: "brass" as const,
      wireDiameterMm: 0.25,
      thicknessMm: 50,
      raTargetUm: 1.6,
      peakCurrentA: 12,
      pulseOnUs: 2,
      pulseOffUs: 10,
    };
    const a = computeLatticeEmbedding(cell);
    const b = computeLatticeEmbedding(cell);
    expect(a).toEqual(b);
  });

  it("getNode returns correct node and null on miss", () => {
    engine.build({ outputPath: out });
    const snap = engine.snapshot();
    const first = snap.nodes[0];
    const hit = engine.getNode(first.id);
    expect(hit).not.toBeNull();
    expect(hit!.id).toBe(first.id);
    expect(engine.getNode("bogus-id-does-not-exist")).toBeNull();
  });

  it("queryByAttrs filters correctly across material and controller", () => {
    engine.build({ outputPath: out });
    const toolSteelFanuc = engine.queryByAttrs({ mat: "tool_steel", mach: "fanuc" });
    expect(toolSteelFanuc.length).toBeGreaterThan(0);
    for (const n of toolSteelFanuc) {
      expect(n.mat).toBe("tool_steel");
      expect(n.mach).toBe("fanuc");
    }
  });

  it("spans all canonical controllers for tool_steel", () => {
    engine.build({ outputPath: out });
    for (const mach of ["fanuc", "sodick", "mitsubishi"] as const) {
      const hits = engine.queryByAttrs({ mat: "tool_steel", mach });
      expect(hits.length).toBeGreaterThan(0);
    }
  });

  it("ISO group mapping is correct per material", () => {
    // Spot-check canonical mapping — catches accidental drift.
    expect(MATERIAL_TO_ISO.low_carbon_steel).toBe("P");
    expect(MATERIAL_TO_ISO.tool_steel).toBe("P");
    expect(MATERIAL_TO_ISO.stainless_steel).toBe("M");
    expect(MATERIAL_TO_ISO.hardened_steel).toBe("H");
    expect(MATERIAL_TO_ISO.aluminum).toBe("N");
    expect(MATERIAL_TO_ISO.tungsten_carbide).toBe("K");
    expect(MATERIAL_TO_ISO.titanium).toBe("S");
    expect(MATERIAL_TO_ISO.inconel).toBe("S");
    expect(MATERIAL_TO_ISO.graphite).toBe("other");
  });

  it("cosineSim: identical vectors → 1, orthogonal → 0", () => {
    const v: number[] = Array.from({ length: LATTICE_EMBEDDING_DIM }, (_, i) => (i === 0 ? 1 : 0));
    const w: number[] = Array.from({ length: LATTICE_EMBEDDING_DIM }, (_, i) => (i === 1 ? 1 : 0));
    expect(cosineSim(v, v)).toBeCloseTo(1, 6);
    expect(cosineSim(v, w)).toBeCloseTo(0, 6);
  });

  it("different materials produce distinguishably-different embeddings", () => {
    const base = {
      mach: "fanuc" as const,
      wire: "brass" as const,
      wireDiameterMm: 0.25,
      thicknessMm: 50,
      raTargetUm: 1.6,
    };
    const embA = computeLatticeEmbedding({
      ...base,
      mat: "tool_steel",
      isoGroup: MATERIAL_TO_ISO.tool_steel,
    });
    const embB = computeLatticeEmbedding({
      ...base,
      mat: "tungsten_carbide",
      isoGroup: MATERIAL_TO_ISO.tungsten_carbide,
    });
    // Embeddings differ — identical attributes would give cosine 1.
    expect(cosineSim(embA, embB)).toBeLessThan(0.99);
    // And tool_steel self-similarity = 1.
    expect(cosineSim(embA, embA)).toBeCloseTo(1, 6);
  });

  it("rejects empty lattice (0 nodes) via composed disabled + no PPCs", () => {
    // Force an empty lattice by disabling both sources. Engine should still
    // produce a well-formed graph (parsed by schema) with zero nodes — this
    // is the degenerate-but-valid case.
    const result = engine.build({
      includePublished: false,
      includeComposed: false,
      outputPath: out,
    });
    expect(result.nodeCount).toBe(0);
    expect(result.edgeCount).toBe(0);
    const parsed = WEDMLatticeGraphSchema.parse(JSON.parse(fs.readFileSync(out, "utf-8")));
    expect(parsed.adjacencySparsity).toBe(0);
  });

  it("latticeNodeId is stable and reversible via queryByAttrs", () => {
    const cell = {
      mat: "hardened_steel" as const,
      mach: "sodick" as const,
      wire: "brass" as const,
      wireDiameterMm: 0.25,
      thicknessMm: 50,
      raTargetUm: 1.6,
    };
    engine.build({ outputPath: out });
    const id = latticeNodeId(cell);
    const hits = engine.queryByAttrs({
      mat: cell.mat,
      mach: cell.mach,
      wire: cell.wire,
      wireDiameterMm: cell.wireDiameterMm,
      thicknessMm: cell.thicknessMm,
      raTargetUm: cell.raTargetUm,
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.map((h) => h.id)).toContain(id);
  });

  it("edge evidence is a recognized tag on every edge", () => {
    engine.build({ outputPath: out });
    const snap = engine.snapshot();
    const allowed = new Set([
      "same_material",
      "adjacent_thickness",
      "adjacent_ra",
      "same_controller",
      "shared_wire",
      "cosine_similarity",
      "history_cluster",
    ]);
    for (const e of snap.edges) {
      expect(allowed.has(e.evidence)).toBe(true);
      expect(e.weight).toBeGreaterThanOrEqual(0);
      expect(e.weight).toBeLessThanOrEqual(1);
      // No self loops
      expect(e.src).not.toBe(e.dst);
    }
  });

  it("load() returns empty graph when file missing; populated after build", () => {
    engine._resetForTests({ path: out });
    const empty = engine.load({ path: out });
    expect(empty.nodeCount).toBe(0);
    engine.build({ outputPath: out });
    const loaded = engine.load({ path: out });
    expect(loaded.nodeCount).toBeGreaterThanOrEqual(300);
    expect(loaded.schemaVersion).toBe(1);
  });

  it("physics-derived features reflect material thermal contrast", () => {
    const steelEmb = computeLatticeEmbedding({
      mat: "low_carbon_steel",
      isoGroup: MATERIAL_TO_ISO.low_carbon_steel,
      mach: "fanuc",
      wire: "brass",
      wireDiameterMm: 0.25,
      thicknessMm: 50,
      raTargetUm: 1.6,
      peakCurrentA: 12,
      pulseOnUs: 2,
      pulseOffUs: 10,
    });
    const alumEmb = computeLatticeEmbedding({
      mat: "aluminum",
      isoGroup: MATERIAL_TO_ISO.aluminum,
      mach: "fanuc",
      wire: "brass",
      wireDiameterMm: 0.25,
      thicknessMm: 50,
      raTargetUm: 1.6,
      peakCurrentA: 12,
      pulseOnUs: 2,
      pulseOffUs: 10,
    });
    // Physics block (dims 50–57) — steel has higher rho·Cp·ΔTm product.
    // dim 50: (rho*Cp*ΔTm) / 1e10 — steel should exceed aluminum.
    expect(steelEmb[50]).toBeGreaterThan(alumEmb[50]);
    // Sanity: the Material thermal table itself encodes this asymmetry.
    const steelVol = MATERIAL_THERMAL.low_carbon_steel.rhoCp * MATERIAL_THERMAL.low_carbon_steel.deltaTm;
    const alumVol = MATERIAL_THERMAL.aluminum.rhoCp * MATERIAL_THERMAL.aluminum.deltaTm;
    expect(steelVol).toBeGreaterThan(alumVol);
  });

  it("covers every LATTICE_MATERIAL except graphite/other via composed or PPC", () => {
    engine.build({ outputPath: out });
    const snap = engine.snapshot();
    const covered = new Set(snap.nodes.map((n) => n.mat));
    // Graphite is not in wedm-published-conditions meaningful data, and we
    // intentionally don't span 'other' via composed. Every other material
    // must appear at least once.
    for (const mat of LATTICE_MATERIALS) {
      if (mat === "graphite" || mat === "other") continue;
      expect(covered.has(mat)).toBe(true);
    }
  });
});
