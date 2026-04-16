/**
 * TK-MS6 U-TK29: Tribal Knowledge Graph Tests
 *
 * Note: Full seedTribalTips tests are slow (loads 78K+ tips).
 * These tests focus on the graph node types and query structure.
 */

import { describe, it, expect } from "vitest";
import { graphAddNode, knowledgeGraph, graphAddEdge, graphHasNode } from "../engines/KnowledgeGraphEngine.js";

describe("TK-MS6 U-TK29: Tribal Knowledge Graph", () => {
  describe("tribal_tip node type", () => {
    it("should accept tribal_tip as a valid node type", () => {
      // graphAddNode should not throw for tribal_tip type
      expect(() => {
        graphAddNode("test_tribal_tip_1", "tribal_tip", "Test Tribal Tip", {
          body: "Test body for tip",
          category: "speeds_feeds",
          confidence: 85,
          tags: ["milling", "steel", "roughing"],
        });
      }).not.toThrow();
    });

    it("should add multiple tribal_tip nodes without error", () => {
      expect(() => {
        graphAddNode("test_tip_2", "tribal_tip", "Tip 2", { category: "tooling" });
        graphAddNode("test_tip_3", "tribal_tip", "Tip 3", { category: "setup" });
      }).not.toThrow();
    });
  });

  describe("relates_to edge type", () => {
    it("should add relates_to edges without error", () => {
      // Add test nodes first
      graphAddNode("tip_rel_1", "tribal_tip", "Tip Rel 1", { category: "tooling" });
      graphAddNode("tip_rel_2", "tribal_tip", "Tip Rel 2", { category: "tooling" });

      // graphAddEdge should accept relates_to as a valid edge type
      expect(() => {
        graphAddEdge("tip_rel_1", "tip_rel_2", "relates_to", 0.8, "Shared tags: milling, steel");
      }).not.toThrow();
    });
  });

  describe("graphHasNode with tribal_tip", () => {
    it("should confirm tribal_tip nodes exist in graph", () => {
      graphAddNode("tip_check_1", "tribal_tip", "Tip Check", { category: "setup" });

      expect(graphHasNode("tip_check_1")).toBe(true);
      expect(graphHasNode("nonexistent_tip")).toBe(false);
    });
  });

  describe("knowledgeGraph dispatcher", () => {
    it("should handle graph_stats action", async () => {
      const result = await knowledgeGraph("graph_stats", {});

      // graph_stats should return graph statistics
      expect(result).toBeDefined();
      expect(result).toHaveProperty("total_nodes");
    });

    it("should handle graph_search with tribal_tip type", async () => {
      const result = await knowledgeGraph("graph_search", {
        query: "tip",
        type: "tribal_tip",
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("results");
    });
  });
});
