/**
 * Tests for ToolLifeGnnEngine (MILL-AGI Phase 0.3)
 *
 * Validates the GNN-based tool life predictor:
 *   - Graph structure validation
 *   - Effective stiffness computation
 *   - Runout accumulation
 *   - Taylor equation integration
 *   - Correction factor application
 *   - Weibull distribution parameters
 *   - Risk factor identification
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  ToolLifeGnnEngine,
  toolLifeGnnEngine,
  type AssemblyGraph,
  type CuttingConditions,
  type ToolLifePrediction,
} from "../engines/ToolLifeGnnEngine.js";

describe("ToolLifeGnnEngine (MILL-AGI P0.3)", () => {
  let engine: ToolLifeGnnEngine;

  beforeAll(() => {
    engine = toolLifeGnnEngine;
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const simpleGraph: AssemblyGraph = {
    nodes: [
      {
        id: "tool",
        type: "tool",
        features: {
          diameter_mm: 10,
          material: "carbide",
          coating: "TiAlN",
          flute_count: 4,
          stiffness_n_per_um: 60,
          runout_um: 2,
        },
      },
      {
        id: "holder",
        type: "holder",
        features: {
          length_mm: 50,
          material: "steel",
          stiffness_n_per_um: 80,
          runout_um: 3,
        },
      },
      {
        id: "spindle",
        type: "spindle",
        features: {
          stiffness_n_per_um: 120,
          damping_ratio: 0.03,
        },
      },
    ],
    edges: [
      {
        from: "tool",
        to: "holder",
        features: {
          interface_stiffness_n_per_um: 50,
          runout_contribution_um: 1,
        },
      },
      {
        from: "holder",
        to: "spindle",
        features: {
          interface_stiffness_n_per_um: 90,
          taper_type: "CAT40",
          runout_contribution_um: 1,
        },
      },
    ],
  };

  const weakGraph: AssemblyGraph = {
    nodes: [
      {
        id: "tool",
        type: "tool",
        features: {
          diameter_mm: 6,
          material: "carbide",
          coating: "uncoated",
          flute_count: 2,
          stiffness_n_per_um: 20,
          runout_um: 5,
        },
      },
      {
        id: "holder",
        type: "holder",
        features: {
          length_mm: 100,
          material: "steel",
          stiffness_n_per_um: 30,
          runout_um: 8,
          wear_state: 0.3,
        },
      },
      {
        id: "spindle",
        type: "spindle",
        features: {
          stiffness_n_per_um: 60,
        },
      },
    ],
    edges: [
      { from: "tool", to: "holder", features: { runout_contribution_um: 5 } },
      { from: "holder", to: "spindle", features: { runout_contribution_um: 3 } },
    ],
  };

  const steelConditions: CuttingConditions = {
    cuttingSpeedMpm: 150,
    feedPerToothMm: 0.1,
    axialDepthMm: 2,
    radialDepthMm: 5,
    materialIsoGroup: "P",
    coolant: "flood",
  };

  const titaniumConditions: CuttingConditions = {
    cuttingSpeedMpm: 50,
    feedPerToothMm: 0.08,
    axialDepthMm: 1,
    materialIsoGroup: "S",
    coolant: "flood",
  };

  const dryConditions: CuttingConditions = {
    cuttingSpeedMpm: 120,
    feedPerToothMm: 0.1,
    axialDepthMm: 1.5,
    materialIsoGroup: "P",
    coolant: "dry",
  };

  // ============================================================================
  // PREDICTION OUTPUT
  // ============================================================================

  describe("prediction output", () => {
    it("returns valid ToolLifePrediction", () => {
      const result = engine.predict(simpleGraph, steelConditions);

      expect(result).toBeDefined();
      expect(typeof result.meanLifeMinutes).toBe("number");
      expect(result.meanLifeMinutes).toBeGreaterThan(0);
    });

    it("includes Weibull parameters", () => {
      const result = engine.predict(simpleGraph, steelConditions);

      expect(result.weibullShape).toBeGreaterThan(1);
      expect(result.weibullScale).toBeGreaterThan(0);
    });

    it("includes 95% confidence interval", () => {
      const result = engine.predict(simpleGraph, steelConditions);

      expect(result.confidence95[0]).toBeLessThan(result.meanLifeMinutes);
      expect(result.confidence95[1]).toBeGreaterThan(result.meanLifeMinutes);
    });

    it("includes Taylor prediction and graph correction", () => {
      const result = engine.predict(simpleGraph, steelConditions);

      expect(result.taylorPrediction).toBeGreaterThan(0);
      expect(result.graphCorrection).toBeGreaterThan(0);
      expect(result.graphCorrection).toBeLessThanOrEqual(2);
    });

    it("includes assembly analysis", () => {
      const result = engine.predict(simpleGraph, steelConditions);

      expect(result.effectiveStiffness).toBeGreaterThan(0);
      expect(result.totalRunout).toBeGreaterThan(0);
    });

    it("includes failure mode and risks", () => {
      const result = engine.predict(simpleGraph, steelConditions);

      expect(result.dominantFailureMode).toBeDefined();
      expect(Array.isArray(result.riskFactors)).toBe(true);
    });

    it("includes recommended replacement", () => {
      const result = engine.predict(simpleGraph, steelConditions);

      expect(result.recommendedReplacement).toBeLessThan(result.meanLifeMinutes);
      expect(result.recommendedReplacement).toBeGreaterThan(0);
    });

    it("tracks inference time", () => {
      const result = engine.predict(simpleGraph, steelConditions);

      expect(result.inferenceTimeMs).toBeGreaterThan(0);
      expect(result.inferenceTimeMs).toBeLessThan(50);
    });
  });

  // ============================================================================
  // STIFFNESS EFFECTS
  // ============================================================================

  describe("stiffness effects", () => {
    it("weak assembly reduces tool life", () => {
      const strong = engine.predict(simpleGraph, steelConditions);
      const weak = engine.predict(weakGraph, steelConditions);

      expect(weak.meanLifeMinutes).toBeLessThan(strong.meanLifeMinutes);
    });

    it("effective stiffness computed from series springs", () => {
      const result = engine.predict(simpleGraph, steelConditions);

      expect(result.effectiveStiffness).toBeLessThan(60);
    });

    it("low stiffness identified as risk", () => {
      const result = engine.predict(weakGraph, steelConditions);

      const hasStiffnessRisk = result.riskFactors.some((r) =>
        r.toLowerCase().includes("stiffness")
      );
      expect(hasStiffnessRisk).toBe(true);
    });
  });

  // ============================================================================
  // RUNOUT EFFECTS
  // ============================================================================

  describe("runout effects", () => {
    it("high runout reduces tool life", () => {
      const lowRunout = engine.predict(simpleGraph, steelConditions);
      const highRunout = engine.predict(weakGraph, steelConditions);

      expect(highRunout.totalRunout).toBeGreaterThan(lowRunout.totalRunout);
    });

    it("runout accumulates via RSS", () => {
      const result = engine.predict(simpleGraph, steelConditions);

      expect(result.totalRunout).toBeGreaterThan(2);
      expect(result.totalRunout).toBeLessThan(15);
    });

    it("high runout identified as risk", () => {
      const result = engine.predict(weakGraph, steelConditions);

      const hasRunoutRisk = result.riskFactors.some((r) =>
        r.toLowerCase().includes("runout")
      );
      expect(hasRunoutRisk).toBe(true);
    });
  });

  // ============================================================================
  // MATERIAL EFFECTS
  // ============================================================================

  describe("material effects", () => {
    it("titanium reduces tool life vs steel", () => {
      const steel = engine.predict(simpleGraph, steelConditions);
      const titanium = engine.predict(simpleGraph, titaniumConditions);

      expect(titanium.taylorPrediction).toBeLessThan(steel.taylorPrediction);
    });

    it("difficult materials have lower Weibull shape", () => {
      const steel = engine.predict(simpleGraph, steelConditions);
      const titanium = engine.predict(simpleGraph, titaniumConditions);

      expect(titanium.weibullShape).toBeLessThanOrEqual(steel.weibullShape);
    });
  });

  // ============================================================================
  // COOLANT EFFECTS
  // ============================================================================

  describe("coolant effects", () => {
    it("dry cutting reduces tool life", () => {
      const flood = engine.predict(simpleGraph, steelConditions);
      const dry = engine.predict(simpleGraph, dryConditions);

      expect(dry.meanLifeMinutes).toBeLessThan(flood.meanLifeMinutes);
    });

    it("dry cutting identified as risk", () => {
      const result = engine.predict(simpleGraph, dryConditions);

      const hasCoolantRisk = result.riskFactors.some(
        (r) => r.toLowerCase().includes("dry") || r.toLowerCase().includes("thermal")
      );
      expect(hasCoolantRisk).toBe(true);
    });
  });

  // ============================================================================
  // COATING EFFECTS
  // ============================================================================

  describe("coating effects", () => {
    it("uncoated tool identified as risk", () => {
      const result = engine.predict(weakGraph, steelConditions);

      const hasCoatingRisk = result.riskFactors.some((r) =>
        r.toLowerCase().includes("uncoated")
      );
      expect(hasCoatingRisk).toBe(true);
    });
  });

  // ============================================================================
  // GRAPH VALIDATION
  // ============================================================================

  describe("graph validation", () => {
    it("rejects empty graph", () => {
      const validation = engine.validateGraph({ nodes: [], edges: [] });
      expect(validation.valid).toBe(false);
    });

    it("requires exactly one tool node", () => {
      const noTool = {
        nodes: [{ id: "holder", type: "holder" as const, features: {} }],
        edges: [],
      };
      const validation = engine.validateGraph(noTool);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("tool"))).toBe(true);
    });

    it("rejects edges with unknown nodes", () => {
      const badEdge: AssemblyGraph = {
        nodes: [{ id: "tool", type: "tool", features: {} }],
        edges: [{ from: "tool", to: "unknown", features: {} }],
      };
      const validation = engine.validateGraph(badEdge);
      expect(validation.valid).toBe(false);
    });

    it("passes valid graph", () => {
      const validation = engine.validateGraph(simpleGraph);
      expect(validation.valid).toBe(true);
    });
  });

  // ============================================================================
  // SIMPLE GRAPH BUILDER
  // ============================================================================

  describe("simple graph builder", () => {
    it("creates valid graph from parameters", () => {
      const graph = engine.createSimpleGraph({
        toolDiameterMm: 12,
        toolMaterial: "carbide",
        toolCoating: "TiAlN",
        fluteCount: 4,
        holderType: "CAT40",
        overhangMm: 60,
      });

      expect(graph.nodes.length).toBe(3);
      expect(graph.edges.length).toBe(2);

      const validation = engine.validateGraph(graph);
      expect(validation.valid).toBe(true);
    });

    it("predictions work with built graph", () => {
      const graph = engine.createSimpleGraph({
        toolDiameterMm: 10,
        toolMaterial: "carbide",
        fluteCount: 4,
        holderType: "HSK-A63",
        overhangMm: 40,
      });

      const result = engine.predict(graph, steelConditions);
      expect(result.meanLifeMinutes).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // MODEL METADATA
  // ============================================================================

  describe("model metadata", () => {
    it("returns metadata", () => {
      const meta = engine.getModelMetadata();
      expect(meta.modelId).toBe("tool-life-gnn-v1");
    });

    it("includes GNN parameters", () => {
      const meta = engine.getModelMetadata();
      expect(meta.gnnLayers).toBe(3);
      expect(meta.nodeFeatureCount).toBe(16);
      expect(meta.edgeFeatureCount).toBe(8);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(toolLifeGnnEngine).toBeDefined();
      expect(toolLifeGnnEngine).toBeInstanceOf(ToolLifeGnnEngine);
    });
  });
});
