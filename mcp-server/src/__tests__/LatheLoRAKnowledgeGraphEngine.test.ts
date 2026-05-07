/**
 * LatheLoRAKnowledgeGraphEngine Tests — LATHE-LORA-MS0 U-LLR39
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAKnowledgeGraphEngine } from "../engines/LatheLoRAKnowledgeGraphEngine.js";

describe("LatheLoRAKnowledgeGraphEngine", () => {
  beforeEach(() => {
    latheLoRAKnowledgeGraphEngine.reset();
  });

  describe("configuration", () => {
    it("has default config", () => {
      const cfg = latheLoRAKnowledgeGraphEngine.getConfig();
      expect(cfg.auto_merge_duplicates).toBe(true);
    });

    it("merges partial config", () => {
      latheLoRAKnowledgeGraphEngine.setConfig({ max_nodes: 100 });
      expect(latheLoRAKnowledgeGraphEngine.getConfig().max_nodes).toBe(100);
    });
  });

  describe("nodes", () => {
    it("adds a node with unique id", () => {
      const n = latheLoRAKnowledgeGraphEngine.addNode("material", "steel");
      expect(n.id).toMatch(/^node-/);
      expect(n.type).toBe("material");
      expect(n.name).toBe("steel");
    });

    it("merges duplicate nodes of same type/name", () => {
      const n1 = latheLoRAKnowledgeGraphEngine.addNode("material", "steel", { grade: "4140" });
      const n2 = latheLoRAKnowledgeGraphEngine.addNode("material", "steel", { hardness: "HRC 28" });
      expect(n1.id).toBe(n2.id);
      expect(n1.properties.grade).toBe("4140");
      expect(n1.properties.hardness).toBe("HRC 28");
    });

    it("does not merge when auto_merge_duplicates is off", () => {
      latheLoRAKnowledgeGraphEngine.setConfig({ auto_merge_duplicates: false });
      const n1 = latheLoRAKnowledgeGraphEngine.addNode("tool", "carbide");
      const n2 = latheLoRAKnowledgeGraphEngine.addNode("tool", "carbide");
      expect(n1.id).not.toBe(n2.id);
    });

    it("throws on max nodes exceeded", () => {
      latheLoRAKnowledgeGraphEngine.setConfig({ max_nodes: 1, auto_merge_duplicates: false });
      latheLoRAKnowledgeGraphEngine.addNode("tool", "a");
      expect(() => latheLoRAKnowledgeGraphEngine.addNode("tool", "b")).toThrow(/Max nodes/);
    });

    it("finds nodes by type", () => {
      latheLoRAKnowledgeGraphEngine.addNode("material", "steel");
      latheLoRAKnowledgeGraphEngine.addNode("tool", "carbide");
      expect(latheLoRAKnowledgeGraphEngine.findNodesByType("material")).toHaveLength(1);
    });

    it("finds nodes by name (fuzzy)", () => {
      latheLoRAKnowledgeGraphEngine.addNode("material", "stainless steel");
      expect(latheLoRAKnowledgeGraphEngine.findNodesByName("steel").length).toBeGreaterThan(0);
    });
  });

  describe("edges", () => {
    it("adds edge between existing nodes", () => {
      const a = latheLoRAKnowledgeGraphEngine.addNode("tool", "carbide");
      const b = latheLoRAKnowledgeGraphEngine.addNode("material", "steel");
      const e = latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "recommended_for", 0.9);
      expect(e.id).toMatch(/^edge-/);
      expect(e.weight).toBe(0.9);
    });

    it("throws when node not found", () => {
      expect(() => latheLoRAKnowledgeGraphEngine.addEdge("x", "y", "uses")).toThrow(/Node not found/);
    });

    it("merges duplicate edges by averaging weights", () => {
      const a = latheLoRAKnowledgeGraphEngine.addNode("tool", "carbide");
      const b = latheLoRAKnowledgeGraphEngine.addNode("material", "steel");
      const e1 = latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "uses", 0.5);
      const e2 = latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "uses", 1.0);
      expect(e1.id).toBe(e2.id);
      expect(e2.evidence_count).toBe(2);
      expect(e2.weight).toBeCloseTo(0.75);
    });
  });

  describe("neighbors", () => {
    it("returns outgoing neighbors", () => {
      const a = latheLoRAKnowledgeGraphEngine.addNode("tool", "carbide");
      const b = latheLoRAKnowledgeGraphEngine.addNode("material", "steel");
      latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "uses", 0.9);
      const ns = latheLoRAKnowledgeGraphEngine.getNeighbors(a.id);
      expect(ns).toHaveLength(1);
      expect(ns[0].direction).toBe("outgoing");
    });

    it("returns incoming neighbors", () => {
      const a = latheLoRAKnowledgeGraphEngine.addNode("tool", "carbide");
      const b = latheLoRAKnowledgeGraphEngine.addNode("material", "steel");
      latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "uses", 0.9);
      const ns = latheLoRAKnowledgeGraphEngine.getNeighbors(b.id);
      expect(ns).toHaveLength(1);
      expect(ns[0].direction).toBe("incoming");
    });

    it("filters by relation", () => {
      const a = latheLoRAKnowledgeGraphEngine.addNode("tool", "a");
      const b = latheLoRAKnowledgeGraphEngine.addNode("material", "b");
      latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "uses", 0.9);
      latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "recommended_for", 0.9);
      expect(latheLoRAKnowledgeGraphEngine.getNeighbors(a.id, "uses")).toHaveLength(1);
    });

    it("filters by min_edge_weight", () => {
      latheLoRAKnowledgeGraphEngine.setConfig({ min_edge_weight: 0.5 });
      const a = latheLoRAKnowledgeGraphEngine.addNode("tool", "a");
      const b = latheLoRAKnowledgeGraphEngine.addNode("material", "b");
      latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "uses", 0.2);
      expect(latheLoRAKnowledgeGraphEngine.getNeighbors(a.id)).toHaveLength(0);
    });
  });

  describe("degree and centrality", () => {
    it("computes node degree", () => {
      const a = latheLoRAKnowledgeGraphEngine.addNode("tool", "a");
      const b = latheLoRAKnowledgeGraphEngine.addNode("material", "b");
      const c = latheLoRAKnowledgeGraphEngine.addNode("operation", "c");
      latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "uses");
      latheLoRAKnowledgeGraphEngine.addEdge(a.id, c.id, "uses");
      expect(latheLoRAKnowledgeGraphEngine.getDegree(a.id)).toBe(2);
    });

    it("computes centrality map", () => {
      const a = latheLoRAKnowledgeGraphEngine.addNode("tool", "a");
      const b = latheLoRAKnowledgeGraphEngine.addNode("material", "b");
      latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "uses");
      const c = latheLoRAKnowledgeGraphEngine.getCentrality();
      expect(c.get(a.id)).toBe(1);
    });

    it("returns top connected nodes", () => {
      const hub = latheLoRAKnowledgeGraphEngine.addNode("tool", "hub");
      for (let i = 0; i < 5; i++) {
        const leaf = latheLoRAKnowledgeGraphEngine.addNode("material", `leaf${i}`);
        latheLoRAKnowledgeGraphEngine.addEdge(hub.id, leaf.id, "uses");
      }
      const top = latheLoRAKnowledgeGraphEngine.getTopConnected(1);
      expect(top[0].node.id).toBe(hub.id);
      expect(top[0].degree).toBe(5);
    });
  });

  describe("path finding", () => {
    it("finds direct path", () => {
      const a = latheLoRAKnowledgeGraphEngine.addNode("tool", "a");
      const b = latheLoRAKnowledgeGraphEngine.addNode("material", "b");
      latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "uses");
      const path = latheLoRAKnowledgeGraphEngine.findPath(a.id, b.id);
      expect(path).not.toBeNull();
      expect(path!.length).toBe(2);
    });

    it("finds indirect path", () => {
      const a = latheLoRAKnowledgeGraphEngine.addNode("tool", "a");
      const b = latheLoRAKnowledgeGraphEngine.addNode("material", "b");
      const c = latheLoRAKnowledgeGraphEngine.addNode("operation", "c");
      latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "uses");
      latheLoRAKnowledgeGraphEngine.addEdge(b.id, c.id, "produces");
      const path = latheLoRAKnowledgeGraphEngine.findPath(a.id, c.id);
      expect(path).not.toBeNull();
      expect(path!.length).toBe(3);
    });

    it("returns null when no path exists", () => {
      const a = latheLoRAKnowledgeGraphEngine.addNode("tool", "a");
      const b = latheLoRAKnowledgeGraphEngine.addNode("material", "b");
      const path = latheLoRAKnowledgeGraphEngine.findPath(a.id, b.id);
      expect(path).toBeNull();
    });
  });

  describe("stats and delete", () => {
    it("deletes node and its edges", () => {
      const a = latheLoRAKnowledgeGraphEngine.addNode("tool", "a");
      const b = latheLoRAKnowledgeGraphEngine.addNode("material", "b");
      latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "uses");
      latheLoRAKnowledgeGraphEngine.deleteNode(a.id);
      expect(latheLoRAKnowledgeGraphEngine.getNode(a.id)).toBeUndefined();
      expect(latheLoRAKnowledgeGraphEngine.getStats().total_edges).toBe(0);
    });

    it("returns stats with node and edge counts", () => {
      const a = latheLoRAKnowledgeGraphEngine.addNode("tool", "a");
      const b = latheLoRAKnowledgeGraphEngine.addNode("material", "b");
      latheLoRAKnowledgeGraphEngine.addEdge(a.id, b.id, "uses");
      const s = latheLoRAKnowledgeGraphEngine.getStats();
      expect(s.total_nodes).toBe(2);
      expect(s.total_edges).toBe(1);
      expect(s.avg_degree).toBeCloseTo(1);
      expect(s.most_connected).toBeDefined();
    });

    it("generates summary", () => {
      latheLoRAKnowledgeGraphEngine.addNode("tool", "a");
      const s = latheLoRAKnowledgeGraphEngine.getSummary();
      expect(s).toContain("Knowledge Graph Summary");
    });

    it("clears graph", () => {
      latheLoRAKnowledgeGraphEngine.addNode("tool", "a");
      latheLoRAKnowledgeGraphEngine.clear();
      expect(latheLoRAKnowledgeGraphEngine.getStats().total_nodes).toBe(0);
    });
  });
});
