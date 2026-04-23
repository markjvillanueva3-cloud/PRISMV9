/**
 * CADAssemblyGraphEngine.test.ts — U-FS-02 (PHASE-47)
 *
 * Verifies the bidirectional assembly reference graph:
 *   - Add nodes + edges, preserve bidirectional adjacency
 *   - Children + parents + transitive descendants + transitive ancestors
 *   - Broken-reference detection + healing via content-hash lookup
 *   - Cycle detection (DFS with grey/black coloring)
 *   - Impact analysis (ancestor closure + root identification)
 *   - Parse references from content (STEP NEXT_ASSEMBLY_USAGE_OCCURRENCE + SLDASM-style)
 *   - Persist/load round-trip via injected FS
 *   - Schema enforcement rejects malformed input
 *   - Merge-on-dup node-add (paths + tags + contentHash)
 *   - Node removal marks dangling edges as broken
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADAssemblyGraphEngine,
  type AssemblyGraphFs,
} from "../engines/CADAssemblyGraphEngine.js";

function makeStubFS(): AssemblyGraphFs & { writes: Record<string, string>; dirs: Set<string> } {
  const writes: Record<string, string> = {};
  const dirs = new Set<string>();
  return {
    existsSync: (p: string) => p in writes || dirs.has(p),
    readFileSync: (p: string) => writes[p] ?? "",
    writeFileSync: (p: string, d: string) => {
      writes[p] = d;
    },
    mkdirSync: (p: string) => {
      dirs.add(p);
    },
    writes,
    dirs,
  };
}

const HASH64 = (ch: string) => ch.repeat(64);

describe("CADAssemblyGraphEngine (U-FS-02)", () => {
  let g: CADAssemblyGraphEngine;

  beforeEach(() => {
    g = new CADAssemblyGraphEngine("H:/stub/graph.json");
  });

  describe("node + edge basics", () => {
    it("starts empty", () => {
      expect(g.nodeCount).toBe(0);
      expect(g.edgeCount).toBe(0);
    });

    it("adds a node and returns it", () => {
      const n = g.addNode({
        partId: "PART-A",
        name: "Bracket",
        componentType: "part",
      });
      expect(n.partId).toBe("PART-A");
      expect(g.nodeCount).toBe(1);
    });

    it("merges paths + tags on re-add of same partId", () => {
      g.addNode({
        partId: "PART-A",
        name: "B",
        componentType: "part",
        paths: ["/p1.sldprt"],
        tags: ["x"],
      });
      g.addNode({
        partId: "PART-A",
        name: "B",
        componentType: "part",
        paths: ["/p2.sldprt"],
        tags: ["y"],
      });
      const n = g.getNode("PART-A")!;
      expect(n.paths.sort()).toEqual(["/p1.sldprt", "/p2.sldprt"]);
      expect(n.tags.sort()).toEqual(["x", "y"]);
    });

    it("adds an edge and makes bidirectional adjacency", () => {
      g.addNode({ partId: "ASM", name: "Top", componentType: "sub_assembly" });
      g.addNode({ partId: "PART-A", name: "A", componentType: "part" });
      g.addReference({ parentId: "ASM", childId: "PART-A" });
      expect(g.getChildren("ASM")).toEqual(["PART-A"]);
      expect(g.getParents("PART-A")).toEqual(["ASM"]);
    });
  });

  describe("transitive BOM + where-used", () => {
    beforeEach(() => {
      // ASM-TOP → ASM-MID → PART-LEAF
      // ASM-TOP → PART-DIRECT
      g.addNode({ partId: "ASM-TOP", name: "Top", componentType: "sub_assembly" });
      g.addNode({ partId: "ASM-MID", name: "Mid", componentType: "sub_assembly" });
      g.addNode({ partId: "PART-LEAF", name: "Leaf", componentType: "part" });
      g.addNode({ partId: "PART-DIRECT", name: "Direct", componentType: "part" });
      g.addReference({ parentId: "ASM-TOP", childId: "ASM-MID" });
      g.addReference({ parentId: "ASM-TOP", childId: "PART-DIRECT" });
      g.addReference({ parentId: "ASM-MID", childId: "PART-LEAF" });
    });

    it("computes transitive descendants (BOM closure)", () => {
      const desc = g.getDescendants("ASM-TOP").sort();
      expect(desc).toEqual(["ASM-MID", "PART-DIRECT", "PART-LEAF"]);
    });

    it("computes transitive ancestors (where-used closure)", () => {
      const anc = g.getAncestors("PART-LEAF").sort();
      expect(anc).toEqual(["ASM-MID", "ASM-TOP"]);
    });

    it("impact analysis returns roots with no parents", () => {
      const imp = g.impactAnalysis("PART-LEAF");
      expect(imp.ancestors.sort()).toEqual(["ASM-MID", "ASM-TOP"]);
      expect(imp.roots).toEqual(["ASM-TOP"]);
    });
  });

  describe("broken references + healing", () => {
    it("marks edge broken if child not registered", () => {
      g.addNode({ partId: "ASM", name: "Top", componentType: "sub_assembly" });
      g.addReference({ parentId: "ASM", childId: "MISSING" });
      expect(g.findBrokenReferences().length).toBe(1);
      expect(g.findBrokenReferences()[0].status).toBe("broken");
    });

    it("heals broken reference via childContentHash lookup", () => {
      g.addNode({ partId: "ASM", name: "T", componentType: "sub_assembly" });
      // Register new node (renamed file) with the expected content hash
      g.addNode({
        partId: "RENAMED",
        name: "Renamed",
        componentType: "part",
        contentHash: HASH64("a"),
      });
      // Add edge with old partId that no longer exists, but with childContentHash
      g.addReference({
        parentId: "ASM",
        childId: "OLD-NAME",
        childContentHash: HASH64("a"),
      });
      expect(g.findBrokenReferences().length).toBe(1);
      const healed = g.healByContentHash();
      expect(healed).toBe(1);
      expect(g.findBrokenReferences().length).toBe(0);
      expect(g.getChildren("ASM")).toEqual(["RENAMED"]);
      expect(g.getParents("RENAMED")).toEqual(["ASM"]);
    });

    it("does not heal when no contentHash match available", () => {
      g.addNode({ partId: "ASM", name: "T", componentType: "sub_assembly" });
      g.addReference({
        parentId: "ASM",
        childId: "MISSING",
        childContentHash: HASH64("f"), // valid hex, but no node has this hash
      });
      expect(g.healByContentHash()).toBe(0);
      expect(g.findBrokenReferences().length).toBe(1);
    });
  });

  describe("cycle detection", () => {
    it("returns empty list for acyclic graph", () => {
      g.addNode({ partId: "A", name: "A", componentType: "part" });
      g.addNode({ partId: "B", name: "B", componentType: "part" });
      g.addReference({ parentId: "A", childId: "B" });
      expect(g.detectCycles()).toEqual([]);
    });

    it("detects 2-node cycle", () => {
      g.addNode({ partId: "A", name: "A", componentType: "sub_assembly" });
      g.addNode({ partId: "B", name: "B", componentType: "sub_assembly" });
      g.addReference({ parentId: "A", childId: "B" });
      g.addReference({ parentId: "B", childId: "A" });
      const cycles = g.detectCycles();
      expect(cycles.length).toBeGreaterThanOrEqual(1);
      // Must include both nodes
      expect(cycles[0]).toContain("A");
      expect(cycles[0]).toContain("B");
    });

    it("detects 3-node cycle", () => {
      g.addNode({ partId: "A", name: "A", componentType: "sub_assembly" });
      g.addNode({ partId: "B", name: "B", componentType: "sub_assembly" });
      g.addNode({ partId: "C", name: "C", componentType: "sub_assembly" });
      g.addReference({ parentId: "A", childId: "B" });
      g.addReference({ parentId: "B", childId: "C" });
      g.addReference({ parentId: "C", childId: "A" });
      const cycles = g.detectCycles();
      expect(cycles.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("node removal", () => {
    it("removes node and marks inbound edges broken", () => {
      g.addNode({ partId: "ASM", name: "T", componentType: "sub_assembly" });
      g.addNode({ partId: "CHILD", name: "C", componentType: "part" });
      g.addReference({ parentId: "ASM", childId: "CHILD" });
      g.removeNode("CHILD");
      expect(g.getNode("CHILD")).toBeUndefined();
      const broken = g.findBrokenReferences();
      expect(broken.length).toBe(1);
      expect(broken[0].childId).toBe("CHILD");
    });

    it("returns false when removing unknown node", () => {
      expect(g.removeNode("ghost")).toBe(false);
    });
  });

  describe("content parser", () => {
    it("extracts STEP NEXT_ASSEMBLY_USAGE_OCCURRENCE references", () => {
      const content = `
        #42 = NEXT_ASSEMBLY_USAGE_OCCURRENCE('bracket-v2',$);
        #43 = NEXT_ASSEMBLY_USAGE_OCCURRENCE('fastener-M6',$);
      `;
      const refs = g.parseReferencesFromContent("ASM", content);
      expect(refs).toContain("bracket-v2");
      expect(refs).toContain("fastener-M6");
    });

    it("extracts SLDASM-style filename references", () => {
      const content = `
        binary junk <part1.sldprt> more junk <sub.sldasm> <tool.ipt>
      `;
      const refs = g.parseReferencesFromContent("ASM", content);
      expect(refs).toContain("part1.sldprt");
      expect(refs).toContain("sub.sldasm");
      expect(refs).toContain("tool.ipt");
    });

    it("deduplicates repeated references", () => {
      const content = "<a.sldprt> <a.sldprt> <a.sldprt>";
      const refs = g.parseReferencesFromContent("ASM", content);
      expect(refs.length).toBe(1);
      expect(refs[0]).toBe("a.sldprt");
    });
  });

  describe("persist / load round-trip", () => {
    it("round-trips graph through injected FS", () => {
      const fs = makeStubFS();
      g.addNode({ partId: "A", name: "A", componentType: "part" });
      g.addNode({ partId: "B", name: "B", componentType: "part" });
      g.addReference({ parentId: "A", childId: "B" });
      g.persist(fs);
      const fresh = new CADAssemblyGraphEngine("H:/stub/graph.json");
      fresh.load(fs);
      expect(fresh.nodeCount).toBe(2);
      expect(fresh.edgeCount).toBe(1);
      expect(fresh.getChildren("A")).toEqual(["B"]);
      expect(fresh.getParents("B")).toEqual(["A"]);
    });

    it("no-ops load when file missing", () => {
      const fs = makeStubFS();
      g.load(fs);
      expect(g.nodeCount).toBe(0);
    });

    it("creates parent directory on persist", () => {
      const fs = makeStubFS();
      g.addNode({ partId: "A", name: "A", componentType: "part" });
      g.persist(fs);
      expect(fs.dirs.has("H:/stub")).toBe(true);
    });
  });

  describe("schema + snapshot stats", () => {
    it("rejects invalid contentHash format", () => {
      expect(() =>
        g.addNode({
          partId: "X",
          name: "X",
          componentType: "part",
          contentHash: "too-short" as any,
        }),
      ).toThrow();
    });

    it("snapshot stats enumerate roots + leaves", () => {
      g.addNode({ partId: "ROOT", name: "R", componentType: "sub_assembly" });
      g.addNode({ partId: "MID", name: "M", componentType: "sub_assembly" });
      g.addNode({ partId: "LEAF", name: "L", componentType: "part" });
      g.addReference({ parentId: "ROOT", childId: "MID" });
      g.addReference({ parentId: "MID", childId: "LEAF" });
      const stats = g.snapshot().stats;
      expect(stats.nodeCount).toBe(3);
      expect(stats.edgeCount).toBe(2);
      expect(stats.rootCount).toBe(1); // ROOT has no parents
      expect(stats.leafCount).toBe(1); // LEAF has no children
      expect(stats.brokenCount).toBe(0);
    });
  });
});
