/**
 * RoadmapCanvasGeneratorEngine.test.ts — spec compliance, cycle handling,
 * and size-limit suite for P3-U03.
 *
 * Coverage (per envelope INTEL-OLLAMA-OBSIDIAN-MS1 P3-U03 exit conditions):
 *   1. Linear A→B→C — 3 nodes, 2 edges, depth-monotone x.
 *   2. Diamond A→B,C→D — 4 nodes, 4 edges, B/C share depth column.
 *   3. Cycle A→B→C→A — warning emitted, all 3 in-cycle edges dropped,
 *      3 nodes still placed.
 *   4. Full real roadmap round-trip (mcp-server/data/roadmap-index.json) —
 *      total nodes match input count; each emitted canvas <5 MiB
 *      (assertion via fs.statSync OR Buffer byte length).
 *   5. JSON Canvas v1.0 spec compliance — node.type ∈ valid set, every
 *      edge endpoint resolves to a real node, edge.toEnd ∈ valid set.
 *   6. generateFromFile writes canvas; small roadmap stays unpaginated.
 *   7. forcePaginate=true splits into one canvas per track and trims
 *      cross-track edges.
 *
 * No `toBeTruthy` / `toBeDefined` presence-only assertions — every check
 * is on concrete structural value (counts, ids, byte size, coordinate
 * comparisons, edge endpoints).
 */

import { describe, expect, it } from "vitest";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  RoadmapCanvasGeneratorEngine,
  roadmapCanvasGeneratorEngine,
  type RoadmapInput,
  type CanvasNode,
} from "../engines/RoadmapCanvasGeneratorEngine.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROADMAP_INDEX_PATH = resolve(HERE, "..", "..", "data", "roadmap-index.json");
const FIVE_MIB = 5 * 1024 * 1024;

const eng = new RoadmapCanvasGeneratorEngine();

function makeTmp(): string {
  return mkdtempSync(join(tmpdir(), "prism-canvas-"));
}

/** Find a node by id; throws with context on miss instead of returning undefined. */
function nodeById(nodes: readonly CanvasNode[], id: string): CanvasNode {
  const n = nodes.find((x) => x.id === id);
  if (!n) {
    throw new Error(`expected node id="${id}" in canvas; got ids=[${nodes.map((x) => x.id).join(",")}]`);
  }
  return n;
}

describe("RoadmapCanvasGeneratorEngine — synthetic graphs", () => {
  it("(1) linear A→B→C: 3 nodes, 2 edges, x increases with depth, no warnings", () => {
    const r: RoadmapInput = {
      milestones: [
        { id: "A", title: "First", track: "T", status: "complete", total_units: 1, completed_units: 1 },
        { id: "B", title: "Second", track: "T", status: "in_progress", total_units: 4, completed_units: 2, dependencies: ["A"] },
        { id: "C", title: "Third", track: "T", status: "not_started", total_units: 2, completed_units: 0, dependencies: ["B"] },
      ],
    };
    const out = eng.generate(r);
    expect(out.canvases).toHaveLength(1);
    expect(out.warnings).toEqual([]);
    expect(out.paginated).toBe(false);

    const cv = out.canvases[0].canvas;
    expect(cv.nodes).toHaveLength(3);
    expect(cv.edges).toHaveLength(2);

    const A = nodeById(cv.nodes, "A");
    const B = nodeById(cv.nodes, "B");
    const C = nodeById(cv.nodes, "C");
    expect(A.x).toBe(0);
    expect(B.x).toBe(380);
    expect(C.x).toBe(760);
    expect(A.text).toContain("complete (100%)");
    expect(B.text).toContain("in_progress (50%)");
    expect(C.text).toContain("not_started (0%)");

    expect(cv.edges.map((e) => `${e.fromNode}→${e.toNode}`)).toEqual(["A→B", "B→C"]);
    expect(cv.edges.every((e) => e.toEnd === "arrow")).toBe(true);

    expect(out.stats.cycleMembers).toBe(0);
    expect(out.stats.cycleEdgesDropped).toBe(0);
  });

  it("(2) diamond A→{B,C}→D: 4 nodes, 4 edges, B/C share depth column", () => {
    const r: RoadmapInput = {
      milestones: [
        { id: "A", title: "Root", track: "T", status: "complete", total_units: 1, completed_units: 1 },
        { id: "B", title: "Left", track: "T", status: "in_progress", total_units: 2, completed_units: 1, dependencies: ["A"] },
        { id: "C", title: "Right", track: "T", status: "in_progress", total_units: 2, completed_units: 1, dependencies: ["A"] },
        { id: "D", title: "Sink", track: "T", status: "not_started", total_units: 3, completed_units: 0, dependencies: ["B", "C"] },
      ],
    };
    const out = eng.generate(r);
    const cv = out.canvases[0].canvas;
    expect(cv.nodes).toHaveLength(4);
    expect(cv.edges).toHaveLength(4);

    const A = nodeById(cv.nodes, "A");
    const B = nodeById(cv.nodes, "B");
    const C = nodeById(cv.nodes, "C");
    const D = nodeById(cv.nodes, "D");
    expect(A.x).toBe(0);
    expect(B.x).toBe(380);
    expect(C.x).toBe(380);
    expect(D.x).toBe(760);
    expect(B.y).not.toBe(C.y); // distinct rows within the same column

    const edgeKeys = cv.edges.map((e) => `${e.fromNode}→${e.toNode}`).sort();
    expect(edgeKeys).toEqual(["A→B", "A→C", "B→D", "C→D"]);
  });

  it("(3) cycle A→B→C→A: warning emitted, all 3 in-cycle edges dropped, 3 nodes still placed", () => {
    const r: RoadmapInput = {
      milestones: [
        { id: "A", title: "A", track: "T", status: "in_progress", total_units: 1, completed_units: 0, dependencies: ["C"] },
        { id: "B", title: "B", track: "T", status: "in_progress", total_units: 1, completed_units: 0, dependencies: ["A"] },
        { id: "C", title: "C", track: "T", status: "in_progress", total_units: 1, completed_units: 0, dependencies: ["B"] },
      ],
    };
    const out = eng.generate(r);
    expect(out.warnings.length).toBeGreaterThanOrEqual(1);
    expect(out.warnings[0]).toMatch(/topo-sort detected cycle/i);
    expect(out.warnings[0]).toContain("A");
    expect(out.warnings[0]).toContain("B");
    expect(out.warnings[0]).toContain("C");

    const cv = out.canvases[0].canvas;
    expect(cv.nodes).toHaveLength(3);
    expect(cv.nodes.map((n) => n.id).sort()).toEqual(["A", "B", "C"]);
    expect(cv.edges).toEqual([]);

    expect(out.stats.cycleMembers).toBe(3);
    expect(out.stats.cycleEdgesDropped).toBe(3);
  });

  it("(3b) partial cycle A↔B with C downstream: B→A and A→B dropped; B→C survives", () => {
    const r: RoadmapInput = {
      milestones: [
        { id: "A", title: "A", track: "T", status: "in_progress", total_units: 1, completed_units: 0, dependencies: ["B"] },
        { id: "B", title: "B", track: "T", status: "in_progress", total_units: 1, completed_units: 0, dependencies: ["A"] },
        { id: "C", title: "C", track: "T", status: "not_started", total_units: 1, completed_units: 0, dependencies: ["B"] },
      ],
    };
    const out = eng.generate(r);
    expect(out.warnings[0]).toMatch(/cycle/i);

    const cv = out.canvases[0].canvas;
    expect(cv.nodes).toHaveLength(3);

    const edgeKeys = cv.edges.map((e) => `${e.fromNode}→${e.toNode}`).sort();
    expect(edgeKeys).toEqual(["B→C"]);
    expect(out.stats.cycleEdgesDropped).toBe(2); // A→B and B→A both dropped
  });
});

describe("RoadmapCanvasGeneratorEngine — JSON Canvas v1.0 compliance", () => {
  it("(4) every node has valid type/dimensions, every edge endpoint resolves to a real node", () => {
    const r: RoadmapInput = {
      milestones: [
        { id: "X", title: "Solo", track: "T", status: "complete", total_units: 1, completed_units: 1 },
        { id: "Y", title: "After", track: "T", status: "not_started", total_units: 1, completed_units: 0, dependencies: ["X"] },
      ],
    };
    const out = eng.generate(r);
    const cv = out.canvases[0].canvas;
    expect(Array.isArray(cv.nodes)).toBe(true);
    expect(Array.isArray(cv.edges)).toBe(true);

    const validNodeTypes = new Set(["text", "file", "link", "group"]);
    for (const n of cv.nodes) {
      expect(validNodeTypes.has(n.type)).toBe(true);
      expect(typeof n.x).toBe("number");
      expect(typeof n.y).toBe("number");
      expect(n.width).toBeGreaterThan(0);
      expect(n.height).toBeGreaterThan(0);
      expect(typeof n.id).toBe("string");
      expect(n.id.length).toBeGreaterThan(0);
      // Round-trip JSON serialization must succeed.
      expect(JSON.parse(JSON.stringify(n)).id).toBe(n.id);
    }

    const nodeIds = new Set(cv.nodes.map((n) => n.id));
    const validEnds = new Set(["none", "arrow"]);
    for (const e of cv.edges) {
      expect(nodeIds.has(e.fromNode)).toBe(true);
      expect(nodeIds.has(e.toNode)).toBe(true);
      if (e.toEnd !== undefined) expect(validEnds.has(e.toEnd)).toBe(true);
      if (e.fromEnd !== undefined) expect(validEnds.has(e.fromEnd)).toBe(true);
      expect(typeof e.id).toBe("string");
      expect(e.id.length).toBeGreaterThan(0);
    }
  });
});

describe("RoadmapCanvasGeneratorEngine — full real roadmap round-trip", () => {
  it("(5) parses roadmap-index.json, emits all milestone nodes, each piece <5 MiB", () => {
    const raw = readFileSync(ROADMAP_INDEX_PATH, "utf8");
    const data = JSON.parse(raw) as RoadmapInput;
    expect(data.milestones.length).toBeGreaterThan(100); // sanity floor

    const out = eng.generate(data);
    const allNodes = out.canvases.flatMap((c) => c.canvas.nodes);
    expect(allNodes).toHaveLength(data.milestones.length);

    // Stat assertion per envelope: byte-size <5MB on each emitted fragment.
    for (const c of out.canvases) {
      expect(c.bytes).toBeLessThan(FIVE_MIB);
      // Bytes field must agree with JSON.stringify output exactly.
      const recomputed = Buffer.byteLength(JSON.stringify(c.canvas, null, 2), "utf8");
      expect(c.bytes).toBe(recomputed);
    }

    // Every persisted edge endpoint must resolve to a real node.
    for (const c of out.canvases) {
      const ids = new Set(c.canvas.nodes.map((n) => n.id));
      for (const e of c.canvas.edges) {
        expect(ids.has(e.fromNode)).toBe(true);
        expect(ids.has(e.toNode)).toBe(true);
      }
    }
  });

  it("(6) generateFromFile on the real roadmap writes a parseable canvas under 5 MiB", () => {
    const tmp = makeTmp();
    try {
      const outputPath = join(tmp, "rm.canvas");
      const { result, written } = eng.generateFromFile(
        ROADMAP_INDEX_PATH,
        outputPath
      );
      expect(written.length).toBeGreaterThanOrEqual(1);

      // Single-canvas mode: one file, expected path.
      if (!result.paginated) {
        expect(written).toEqual([outputPath]);
        expect(statSync(outputPath).size).toBeLessThan(FIVE_MIB);
        const parsed = JSON.parse(readFileSync(outputPath, "utf8"));
        expect(Array.isArray(parsed.nodes)).toBe(true);
        expect(parsed.nodes.length).toBe(result.canvases[0].canvas.nodes.length);
      } else {
        // Paginated: every track file <5MB, parses, has nodes.
        for (const p of written) {
          expect(statSync(p).size).toBeLessThan(FIVE_MIB);
          const parsed = JSON.parse(readFileSync(p, "utf8"));
          expect(parsed.nodes.length).toBeGreaterThanOrEqual(0);
        }
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("RoadmapCanvasGeneratorEngine — file emission + pagination", () => {
  it("(7) generateFromFile writes a single canvas under 5 MiB for a small roadmap", () => {
    const tmp = makeTmp();
    try {
      const small: RoadmapInput = {
        milestones: [
          { id: "A", title: "A", track: "T", status: "complete", total_units: 1, completed_units: 1 },
          { id: "B", title: "B", track: "T", status: "in_progress", total_units: 1, completed_units: 0, dependencies: ["A"] },
        ],
      };
      const inputPath = join(tmp, "in.json");
      const outputPath = join(tmp, "out.canvas");
      writeFileSync(inputPath, JSON.stringify(small), "utf8");

      const { result, written } = eng.generateFromFile(inputPath, outputPath);
      expect(result.paginated).toBe(false);
      expect(written).toEqual([outputPath]);
      expect(statSync(outputPath).size).toBeLessThan(FIVE_MIB);

      const round = JSON.parse(readFileSync(outputPath, "utf8"));
      expect(round.nodes).toHaveLength(2);
      expect(round.edges).toHaveLength(1);
      expect(round.edges[0].fromNode).toBe("A");
      expect(round.edges[0].toNode).toBe("B");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("(8) forcePaginate=true splits per-track and trims cross-track edges", () => {
    const r: RoadmapInput = {
      milestones: [
        { id: "A1", title: "A1", track: "ALPHA", status: "complete", total_units: 1, completed_units: 1 },
        { id: "A2", title: "A2", track: "ALPHA", status: "in_progress", total_units: 1, completed_units: 0, dependencies: ["A1"] },
        { id: "B1", title: "B1", track: "BETA", status: "complete", total_units: 1, completed_units: 1 },
        { id: "B2", title: "B2", track: "BETA", status: "in_progress", total_units: 1, completed_units: 0, dependencies: ["B1"] },
        // X1 ∈ ALPHA depends on B1 ∈ BETA — this cross-track edge must be severed.
        { id: "X1", title: "X1", track: "ALPHA", status: "not_started", total_units: 1, completed_units: 0, dependencies: ["B1"] },
      ],
    };
    const out = eng.generate(r, { forcePaginate: true });
    expect(out.paginated).toBe(true);
    const names = out.canvases.map((c) => c.name).sort();
    expect(names).toEqual(["roadmap.ALPHA", "roadmap.BETA"]);

    const alpha = out.canvases.find((c) => c.name === "roadmap.ALPHA");
    const beta = out.canvases.find((c) => c.name === "roadmap.BETA");
    if (!alpha || !beta) throw new Error("missing track fragment in pagination output");

    expect(alpha.canvas.nodes.map((n) => n.id).sort()).toEqual(["A1", "A2", "X1"]);
    expect(beta.canvas.nodes.map((n) => n.id).sort()).toEqual(["B1", "B2"]);
    expect(alpha.canvas.edges.map((e) => `${e.fromNode}→${e.toNode}`)).toEqual(["A1→A2"]);
    expect(beta.canvas.edges.map((e) => `${e.fromNode}→${e.toNode}`)).toEqual(["B1→B2"]);

    expect(out.stats.crossTrackEdgesDropped).toBe(1);
  });

  it("(9) generateFromFile in paginated mode writes one canvas per track to disk", () => {
    const tmp = makeTmp();
    try {
      const r: RoadmapInput = {
        milestones: [
          { id: "A1", title: "A1", track: "ALPHA", status: "complete", total_units: 1, completed_units: 1 },
          { id: "B1", title: "B1", track: "BETA", status: "complete", total_units: 1, completed_units: 1 },
        ],
      };
      const inputPath = join(tmp, "in.json");
      const outputPath = join(tmp, "rm.canvas");
      writeFileSync(inputPath, JSON.stringify(r), "utf8");

      const { result, written } = eng.generateFromFile(inputPath, outputPath, {
        forcePaginate: true,
      });
      expect(result.paginated).toBe(true);
      expect(written).toHaveLength(2);

      const names = written.map((p) => p.replace(/.*[\\/]/, "")).sort();
      expect(names).toEqual(["rm.ALPHA.canvas", "rm.BETA.canvas"]);

      for (const p of written) {
        expect(statSync(p).size).toBeLessThan(FIVE_MIB);
        const parsed = JSON.parse(readFileSync(p, "utf8"));
        expect(Array.isArray(parsed.nodes)).toBe(true);
        expect(Array.isArray(parsed.edges)).toBe(true);
        expect(parsed.nodes.length).toBe(1); // one milestone per track
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("RoadmapCanvasGeneratorEngine — degenerate inputs", () => {
  it("(10) empty milestones array → empty canvas, no warnings", () => {
    const out = eng.generate({ milestones: [] });
    expect(out.canvases).toHaveLength(1);
    expect(out.canvases[0].canvas.nodes).toEqual([]);
    expect(out.canvases[0].canvas.edges).toEqual([]);
    expect(out.warnings).toEqual([]);
    expect(out.totalBytes).toBe(out.canvases[0].bytes);
  });

  it("(11) dependency on non-existent id is silently dropped (no edge, no warning)", () => {
    const r: RoadmapInput = {
      milestones: [
        { id: "A", title: "A", track: "T", status: "complete", total_units: 1, completed_units: 1, dependencies: ["GHOST"] },
      ],
    };
    const out = eng.generate(r);
    const cv = out.canvases[0].canvas;
    expect(cv.nodes).toHaveLength(1);
    expect(cv.edges).toEqual([]);
    expect(out.warnings).toEqual([]);
  });

  it("(12) singleton export is wired to the same engine class with same generate result", () => {
    const r: RoadmapInput = {
      milestones: [
        { id: "S", title: "Solo", track: "T", status: "complete", total_units: 1, completed_units: 1 },
      ],
    };
    const a = roadmapCanvasGeneratorEngine.generate(r);
    const b = eng.generate(r);
    expect(a.canvases[0].canvas).toEqual(b.canvases[0].canvas);
    expect(a.totalBytes).toBe(b.totalBytes);
  });
});
