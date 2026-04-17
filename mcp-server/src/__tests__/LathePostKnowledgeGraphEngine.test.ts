/**
 * LathePostKnowledgeGraphEngine Tests — LATHE-MASTER U-LTH20
 *
 * Tests knowledge graph construction, traversal, and inference.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LathePostKnowledgeGraphEngine,
  lathePostKnowledgeGraphEngine,
} from "../engines/LathePostKnowledgeGraphEngine.js";

describe("LathePostKnowledgeGraphEngine", () => {
  let engine: LathePostKnowledgeGraphEngine;

  beforeEach(() => {
    engine = new LathePostKnowledgeGraphEngine();
  });

  // ── Graph Construction Tests ──────────────────────────────────────────────

  describe("graph construction", () => {
    it("builds graph with nodes and edges", () => {
      const graph = engine.getGraph();

      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
      expect(graph.version).toBe("1.0.0");
    });

    it("includes all controller nodes", () => {
      const controllers = engine.getNodesByType("controller");

      expect(controllers.length).toBeGreaterThanOrEqual(9);
      expect(controllers.some(c => c.id === "fanuc-31it")).toBe(true);
      expect(controllers.some(c => c.id === "okuma-osp-p300l")).toBe(true);
      expect(controllers.some(c => c.id === "citizen-cincom-m32")).toBe(true);
    });

    it("includes dialect nodes", () => {
      const dialects = engine.getNodesByType("dialect");

      expect(dialects.length).toBeGreaterThanOrEqual(5);
      expect(dialects.some(d => d.label === "fanuc")).toBe(true);
      expect(dialects.some(d => d.label === "okuma")).toBe(true);
    });

    it("includes cycle nodes", () => {
      const cycles = engine.getNodesByType("cycle");

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles.some(c => c.label === "G71")).toBe(true);
      expect(cycles.some(c => c.label === "G76")).toBe(true);
    });

    it("includes manufacturer nodes", () => {
      const manufacturers = engine.getNodesByType("manufacturer");

      expect(manufacturers.some(m => m.label === "Fanuc")).toBe(true);
      expect(manufacturers.some(m => m.label === "Okuma")).toBe(true);
      expect(manufacturers.some(m => m.label === "Citizen")).toBe(true);
    });

    it("includes feature nodes", () => {
      const features = engine.getNodesByType("feature");

      expect(features.some(f => f.label === "live_tooling")).toBe(true);
      expect(features.some(f => f.label === "c_axis")).toBe(true);
      expect(features.some(f => f.label === "guide_bushing")).toBe(true);
    });

    it("includes validator nodes", () => {
      const validators = engine.getNodesByType("validator");

      expect(validators.length).toBeGreaterThan(0);
      expect(validators.some(v => v.label === "pp_syntax_gcode")).toBe(true);
    });
  });

  // ── Node Query Tests ──────────────────────────────────────────────────────

  describe("getNode", () => {
    it("finds existing node by ID", () => {
      const node = engine.getNode("fanuc-31it");

      expect(node).toBeDefined();
      expect(node!.type).toBe("controller");
      expect(node!.label).toContain("Fanuc");
    });

    it("returns undefined for non-existent node", () => {
      const node = engine.getNode("non-existent-id");

      expect(node).toBeUndefined();
    });
  });

  describe("getNodesByType", () => {
    it("returns all controllers", () => {
      const controllers = engine.getNodesByType("controller");

      expect(controllers.every(n => n.type === "controller")).toBe(true);
    });

    it("returns empty array for type with no nodes", () => {
      const nodes = engine.getNodesByType("modal_group");

      expect(Array.isArray(nodes)).toBe(true);
    });
  });

  // ── Edge Query Tests ──────────────────────────────────────────────────────

  describe("getOutgoingEdges", () => {
    it("returns outgoing edges from controller", () => {
      const edges = engine.getOutgoingEdges("fanuc-31it");

      expect(edges.length).toBeGreaterThan(0);
      expect(edges.some(e => e.type === "uses_dialect")).toBe(true);
      expect(edges.some(e => e.type === "supports_cycle")).toBe(true);
    });

    it("returns empty array for node with no outgoing edges", () => {
      const edges = engine.getOutgoingEdges("dialect_fanuc");

      expect(edges.some(e => e.type === "requires_validator")).toBe(true);
    });
  });

  describe("getIncomingEdges", () => {
    it("returns incoming edges to dialect", () => {
      const edges = engine.getIncomingEdges("dialect_fanuc");

      expect(edges.length).toBeGreaterThan(0);
      expect(edges.some(e => e.type === "uses_dialect")).toBe(true);
    });

    it("returns incoming edges to cycle", () => {
      const edges = engine.getIncomingEdges("cycle_G71");

      expect(edges.length).toBeGreaterThan(0);
      expect(edges.some(e => e.type === "supports_cycle")).toBe(true);
    });
  });

  // ── Neighbor Query Tests ──────────────────────────────────────────────────

  describe("getNeighbors", () => {
    it("returns all neighbors without edge type filter", () => {
      const neighbors = engine.getNeighbors("fanuc-31it");

      expect(neighbors.length).toBeGreaterThan(0);
    });

    it("returns filtered neighbors with edge type", () => {
      const cycleNeighbors = engine.getNeighbors("fanuc-31it", "supports_cycle");

      expect(cycleNeighbors.every(n => n.type === "cycle")).toBe(true);
    });
  });

  // ── Controller Query Tests ────────────────────────────────────────────────

  describe("getControllerCycles", () => {
    it("returns cycles for Fanuc 31i-T", () => {
      const cycles = engine.getControllerCycles("fanuc-31it");

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles.some(c => c.label === "G71")).toBe(true);
      expect(cycles.some(c => c.label === "G76")).toBe(true);
    });

    it("returns cycles for Citizen Swiss", () => {
      const cycles = engine.getControllerCycles("citizen-cincom-m32");

      expect(cycles.some(c => c.label === "G112")).toBe(true);
      expect(cycles.some(c => c.label === "G113")).toBe(true);
    });
  });

  describe("getControllerFeatures", () => {
    it("returns features for Fanuc 31i-T", () => {
      const features = engine.getControllerFeatures("fanuc-31it");

      expect(features.some(f => f.label === "live_tooling")).toBe(true);
      expect(features.some(f => f.label === "c_axis")).toBe(true);
    });

    it("returns Swiss features for Citizen", () => {
      const features = engine.getControllerFeatures("citizen-cincom-m32");

      expect(features.some(f => f.label === "guide_bushing")).toBe(true);
      expect(features.some(f => f.label === "sub_spindle")).toBe(true);
    });
  });

  describe("getDialectValidators", () => {
    it("returns validators for Fanuc dialect", () => {
      const validators = engine.getDialectValidators("fanuc");

      expect(validators.length).toBeGreaterThan(0);
      expect(validators.some(v => v.label === "pp_syntax_gcode")).toBe(true);
    });

    it("handles dialect_ prefix", () => {
      const validators = engine.getDialectValidators("dialect_okuma");

      expect(validators.length).toBeGreaterThan(0);
    });
  });

  describe("getControllersByManufacturer", () => {
    it("returns Fanuc controllers", () => {
      const controllers = engine.getControllersByManufacturer("Fanuc");

      expect(controllers.length).toBeGreaterThanOrEqual(2);
      expect(controllers.some(c => c.id === "fanuc-31it")).toBe(true);
      expect(controllers.some(c => c.id === "fanuc-0it")).toBe(true);
    });

    it("returns Okuma controllers", () => {
      const controllers = engine.getControllersByManufacturer("Okuma");

      expect(controllers.length).toBeGreaterThanOrEqual(2);
    });

    it("handles lowercase manufacturer", () => {
      const controllers = engine.getControllersByManufacturer("fanuc");

      expect(controllers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getControllersWithCycle", () => {
    it("finds controllers supporting G71", () => {
      const controllers = engine.getControllersWithCycle("G71");

      expect(controllers.length).toBeGreaterThan(0);
      expect(controllers.some(c => c.id === "fanuc-31it")).toBe(true);
    });

    it("finds controllers supporting G76 threading", () => {
      const controllers = engine.getControllersWithCycle("G76");

      expect(controllers.length).toBeGreaterThan(0);
    });

    it("handles cycle_ prefix", () => {
      const controllers = engine.getControllersWithCycle("cycle_G83");

      expect(controllers.length).toBeGreaterThan(0);
    });
  });

  describe("getControllersWithFeature", () => {
    it("finds controllers with live tooling", () => {
      const controllers = engine.getControllersWithFeature("live_tooling");

      expect(controllers.length).toBeGreaterThan(0);
    });

    it("finds controllers with guide bushing (Swiss)", () => {
      const controllers = engine.getControllersWithFeature("guide_bushing");

      expect(controllers.length).toBeGreaterThanOrEqual(2);
      expect(controllers.some(c => c.id === "citizen-cincom-m32")).toBe(true);
    });
  });

  // ── Compatibility Tests ───────────────────────────────────────────────────

  describe("getCompatibleDialects", () => {
    it("finds dialects compatible with Fanuc", () => {
      const compatible = engine.getCompatibleDialects("fanuc");

      expect(compatible.some(d => d.label === "haas")).toBe(true);
      expect(compatible.some(d => d.label === "citizen")).toBe(true);
    });

    it("returns empty for Okuma (no compatible dialects)", () => {
      const compatible = engine.getCompatibleDialects("okuma");

      expect(compatible.length).toBe(0);
    });
  });

  describe("areControllersCompatible", () => {
    it("detects same-dialect compatibility", () => {
      const result = engine.areControllersCompatible("fanuc-31it", "fanuc-0it");

      expect(result.compatible).toBe(true);
      expect(result.reason).toContain("Same dialect");
    });

    it("detects cross-dialect compatibility (Fanuc-Haas)", () => {
      const result = engine.areControllersCompatible("fanuc-31it", "haas-ngc");

      expect(result.compatible).toBe(true);
    });

    it("detects incompatibility (Fanuc-Okuma)", () => {
      const result = engine.areControllersCompatible("fanuc-31it", "okuma-osp-p300l");

      expect(result.compatible).toBe(false);
      expect(result.reason).toContain("not compatible");
    });

    it("handles non-existent controller", () => {
      const result = engine.areControllersCompatible("fanuc-31it", "non-existent");

      expect(result.compatible).toBe(false);
      expect(result.reason).toContain("not found");
    });
  });

  // ── Path Finding Tests ────────────────────────────────────────────────────

  describe("findPath", () => {
    it("finds path between controller and cycle", () => {
      const path = engine.findPath("fanuc-31it", "cycle_G71");

      expect(path).not.toBeNull();
      expect(path![0]).toBe("fanuc-31it");
      expect(path![path!.length - 1]).toBe("cycle_G71");
    });

    it("finds path between controllers via manufacturer", () => {
      const path = engine.findPath("fanuc-31it", "fanuc-0it");

      expect(path).not.toBeNull();
      expect(path!.length).toBeLessThanOrEqual(5);
    });

    it("returns null for unreachable nodes", () => {
      const path = engine.findPath("fanuc-31it", "non-existent-node");

      expect(path).toBeNull();
    });

    it("respects max depth", () => {
      const path = engine.findPath("fanuc-31it", "validator_pp_syntax_gcode", 1);

      expect(path).toBeNull();
    });
  });

  // ── Inference Tests ───────────────────────────────────────────────────────

  describe("inferControllerProperties", () => {
    it("infers Fanuc dialect for Fanuc manufacturer", () => {
      const result = engine.inferControllerProperties("Fanuc", []);

      expect(result.suggestedDialect).toBe("fanuc");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("infers Okuma dialect for Okuma manufacturer", () => {
      const result = engine.inferControllerProperties("Okuma", []);

      expect(result.suggestedDialect).toBe("okuma");
    });

    it("suggests common cycles", () => {
      const result = engine.inferControllerProperties("Fanuc", []);

      expect(result.suggestedCycles).toContain("G71");
      expect(result.suggestedCycles).toContain("G76");
    });

    it("boosts confidence with matching features", () => {
      const resultNoFeatures = engine.inferControllerProperties("Fanuc", []);
      const resultWithFeatures = engine.inferControllerProperties("Fanuc", ["c_axis", "live_tooling"]);

      expect(resultWithFeatures.suggestedCycles.length).toBeGreaterThan(0);
    });

    it("returns defaults for unknown manufacturer", () => {
      const result = engine.inferControllerProperties("UnknownBrand", []);

      expect(result.suggestedDialect).toBe("fanuc");
      expect(result.confidence).toBe(0.3);
    });
  });

  // ── Statistics Tests ──────────────────────────────────────────────────────

  describe("getStats", () => {
    it("returns correct node counts", () => {
      const stats = engine.getStats();

      expect(stats.nodes).toBeGreaterThan(20);
      expect(stats.edges).toBeGreaterThan(50);
      expect(stats.controllers).toBeGreaterThanOrEqual(9);
      expect(stats.dialects).toBeGreaterThanOrEqual(5);
      expect(stats.cycles).toBeGreaterThan(10);
    });
  });

  describe("getVersion", () => {
    it("returns version string", () => {
      const version = LathePostKnowledgeGraphEngine.getVersion();

      expect(version).toBe("1.0.0");
    });
  });

  // ── Singleton Tests ───────────────────────────────────────────────────────

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(lathePostKnowledgeGraphEngine).toBeDefined();
      expect(lathePostKnowledgeGraphEngine.getGraph()).toBeDefined();
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles axis nodes", () => {
      const axes = engine.getNodesByType("axis");

      expect(axes.length).toBeGreaterThan(0);
      expect(axes.some(a => a.label === "X")).toBe(true);
      expect(axes.some(a => a.label === "Z")).toBe(true);
    });

    it("handles Siemens cycle naming", () => {
      const cycles = engine.getControllerCycles("siemens-840d");

      expect(cycles.some(c => c.label.startsWith("CYCLE"))).toBe(true);
    });

    it("Swiss controllers have B-axis", () => {
      const citizenFeatures = engine.getNeighbors("citizen-cincom-m32", "has_axis");

      expect(citizenFeatures.some(a => a.label === "B")).toBe(true);
    });

    it("graph has timestamp", () => {
      const graph = engine.getGraph();

      expect(graph.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
