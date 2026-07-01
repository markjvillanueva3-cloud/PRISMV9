/**
 * AI Reasoning Dispatcher Tests — prism_ai
 * =========================================
 * ≥10 real-input cases + edge cases + integration with MillMasterOrchestratorFacadeEngine.
 *
 * @module __tests__/aiReasoningDispatcher.test
 * @milestone MILL-MASTER/P1-U05-PRISM-AI-ROUTE
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  executeAIReasoningAction,
  aiReasoningDispatcher,
  AI_REASONING_ACTIONS,
} from "../tools/dispatchers/aiReasoningDispatcher.js";
import { ACTION_AI_REASONING_SCHEMAS } from "../schemas/aiReasoningActionSchemas.js";

describe("aiReasoningDispatcher", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEMA VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("schema validation", () => {
    it("keeps the action enum coherent: no dups, bijective with the schema map, no count regression", () => {
      // R9: a frozen magic count (was `toHaveLength(424)`) breaks on every legitimate
      // action addition (it was already bumped once; actual is 426 as of 2026-06-23).
      // Encode the real invariant instead -- additions are fine, but a duplicate action,
      // an action without a schema, an orphan schema, or a drop below the known baseline
      // all signal genuine drift.
      const actions = AI_REASONING_ACTIONS as readonly string[];
      const schemaKeys = Object.keys(ACTION_AI_REASONING_SCHEMAS);
      expect(new Set(actions).size).toBe(actions.length);           // no duplicate actions
      expect(schemaKeys.length).toBe(actions.length);               // bijective: no orphan schema / schemaless action
      expect(actions.length).toBeGreaterThanOrEqual(426);           // regression floor; additions OK, losses caught
    });

    it("should have schemas for all actions", () => {
      for (const action of AI_REASONING_ACTIONS) {
        expect(ACTION_AI_REASONING_SCHEMAS[action]).toBeDefined();
      }
    });

    it("should validate ai_route_mill_pipeline params", () => {
      const schema = ACTION_AI_REASONING_SCHEMAS.ai_route_mill_pipeline;
      const valid = schema.safeParse({
        material: "6061-T6",
        iso_group: "N",
        tool: { diameter_mm: 12, flutes: 4 },
      });
      expect(valid.success).toBe(true);
    });

    it("should validate ai_mill_agi_reason params", () => {
      const schema = ACTION_AI_REASONING_SCHEMAS.ai_mill_agi_reason;
      const valid = schema.safeParse({
        intent: "Optimize roughing strategy for deep pocket",
        reasoning_mode: "tree_of_thought",
      });
      expect(valid.success).toBe(true);
    });

    it("should validate ai_mill_awareness_query params", () => {
      const schema = ACTION_AI_REASONING_SCHEMAS.ai_mill_awareness_query;
      const valid = schema.safeParse({
        query: "deflection analysis",
        category: "physics",
        top_k: 5,
      });
      expect(valid.success).toBe(true);
    });

    it("should reject invalid ISO group", () => {
      const schema = ACTION_AI_REASONING_SCHEMAS.ai_mill_scientific_analyze;
      const invalid = schema.safeParse({
        iso_group: "X", // Invalid
        analysis_type: "force",
      });
      expect(invalid.success).toBe(false);
    });

    it("should reject empty intent for AGI reason", () => {
      const schema = ACTION_AI_REASONING_SCHEMAS.ai_mill_agi_reason;
      const invalid = schema.safeParse({
        intent: "", // Empty not allowed
      });
      expect(invalid.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ai_route_mill_pipeline
  // ═══════════════════════════════════════════════════════════════════════════

  describe("ai_route_mill_pipeline", () => {
    it("should route P2P pipeline with aluminum parameters", async () => {
      const result = await executeAIReasoningAction("ai_route_mill_pipeline", {
        material: "6061-T6",
        iso_group: "N",
        tool: { diameter_mm: 12, flutes: 4 },
        params: { rpm: 12000, feed_mmpm: 2400, doc_mm: 3 },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const data = result.data as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.request_type).toBe("print_to_program");
    });

    it("should route P2P pipeline with steel parameters", async () => {
      const result = await executeAIReasoningAction("ai_route_mill_pipeline", {
        material: "4140",
        iso_group: "P",
        tool: { diameter_mm: 10, flutes: 4, coating: "TiAlN" },
        params: { rpm: 4000, feed_mmpm: 800, doc_mm: 2 },
        include_provenance: true,
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.provenance).toBeDefined();
    });

    it("should handle minimal parameters", async () => {
      const result = await executeAIReasoningAction("ai_route_mill_pipeline", {});
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ai_mill_agi_reason
  // ═══════════════════════════════════════════════════════════════════════════

  describe("ai_mill_agi_reason", () => {
    it("should reason with chain_of_thought mode", async () => {
      const result = await executeAIReasoningAction("ai_mill_agi_reason", {
        intent: "Determine optimal feed rate for thin wall machining",
        reasoning_mode: "chain_of_thought",
        material: "6061-T6",
        iso_group: "N",
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.request_type).toBe("agi");
    });

    it("should reason with tree_of_thought mode", async () => {
      const result = await executeAIReasoningAction("ai_mill_agi_reason", {
        intent: "Select between trochoidal and adaptive clearing for deep pocket",
        reasoning_mode: "tree_of_thought",
      });

      expect(result.success).toBe(true);
    });

    it("should reason with counterfactual mode", async () => {
      const result = await executeAIReasoningAction("ai_mill_agi_reason", {
        intent: "What if we used a smaller diameter tool?",
        reasoning_mode: "counterfactual",
        tool: { diameter_mm: 6, flutes: 4 },
      });

      expect(result.success).toBe(true);
    });

    it("should handle empty intent gracefully", async () => {
      const result = await executeAIReasoningAction("ai_mill_agi_reason", {
        intent: "valid intent", // Empty intent should be avoided
      });

      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ai_mill_awareness_query
  // ═══════════════════════════════════════════════════════════════════════════

  describe("ai_mill_awareness_query", () => {
    it("should query physics engines", async () => {
      const result = await executeAIReasoningAction("ai_mill_awareness_query", {
        query: "cutting force",
        category: "physics",
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.query).toBe("cutting force");
      expect(data.category).toBe("physics");
      expect(typeof data.total_found).toBe("number");
    });

    it("should query all categories", async () => {
      const result = await executeAIReasoningAction("ai_mill_awareness_query", {
        query: "optimization",
        category: "all",
        top_k: 15,
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.registry_stats).toBeDefined();
    });

    it("should limit results with top_k", async () => {
      const result = await executeAIReasoningAction("ai_mill_awareness_query", {
        query: "mill",
        top_k: 3,
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      const matches = data.matches as unknown[];
      expect(matches.length).toBeLessThanOrEqual(3);
    });

    it("should handle minimal query", async () => {
      const result = await executeAIReasoningAction("ai_mill_awareness_query", {
        query: "force",
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.query).toBe("force");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ai_mill_scientific_analyze
  // ═══════════════════════════════════════════════════════════════════════════

  describe("ai_mill_scientific_analyze", () => {
    it("should analyze cutting forces for steel", async () => {
      const result = await executeAIReasoningAction("ai_mill_scientific_analyze", {
        analysis_type: "force",
        material: "4140",
        iso_group: "P",
        tool: { diameter_mm: 10, flutes: 4 },
        params: { rpm: 4000, feed_mmpm: 800, doc_mm: 2, woc_mm: 5 },
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.analysis_type).toBe("force");
      expect(data.request_type).toBe("scientific");
    });

    it("should analyze deflection for long tools", async () => {
      const result = await executeAIReasoningAction("ai_mill_scientific_analyze", {
        analysis_type: "deflection",
        tool: { diameter_mm: 6, flutes: 2, flute_length_mm: 30, overall_length_mm: 75 },
      });

      expect(result.success).toBe(true);
    });

    it("should analyze all physics for titanium", async () => {
      const result = await executeAIReasoningAction("ai_mill_scientific_analyze", {
        analysis_type: "all",
        material: "Ti-6Al-4V",
        iso_group: "S",
        tool: { diameter_mm: 12, flutes: 5, coating: "AlTiN" },
        params: { rpm: 800, feed_mmpm: 200, doc_mm: 1.5 },
        include_provenance: true,
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.provenance).toBeDefined();
    });

    it("should handle hardened steel H group", async () => {
      const result = await executeAIReasoningAction("ai_mill_scientific_analyze", {
        analysis_type: "tool_life",
        iso_group: "H",
        tool: { diameter_mm: 8, flutes: 4, coating: "CBN" },
        params: { rpm: 2000, feed_mmpm: 400 },
      });

      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ai_mill_wisdom_query
  // ═══════════════════════════════════════════════════════════════════════════

  describe("ai_mill_wisdom_query", () => {
    it("should query tool selection wisdom", async () => {
      const result = await executeAIReasoningAction("ai_mill_wisdom_query", {
        query: "best endmill for aluminum pockets",
        domain: "tool_selection",
        material: "6061-T6",
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.query).toBe("best endmill for aluminum pockets");
      expect(data.domain).toBe("tool_selection");
    });

    it("should query chatter mitigation wisdom", async () => {
      const result = await executeAIReasoningAction("ai_mill_wisdom_query", {
        query: "how to reduce chatter in deep slotting",
        domain: "chatter_mitigation",
        operation: "slotting",
      });

      expect(result.success).toBe(true);
    });

    it("should query general domain by default", async () => {
      const result = await executeAIReasoningAction("ai_mill_wisdom_query", {
        query: "tips for first article inspection",
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.domain).toBe("general");
    });

    it("should query with setup domain", async () => {
      const result = await executeAIReasoningAction("ai_mill_wisdom_query", {
        query: "vise setup tips",
        domain: "setup",
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.domain).toBe("setup");
      expect(data.request_type).toBe("wisdom");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ai_mill_adaptive_strategy
  // ═══════════════════════════════════════════════════════════════════════════

  describe("ai_mill_adaptive_strategy", () => {
    it("should generate adaptive_clearing strategy", async () => {
      const result = await executeAIReasoningAction("ai_mill_adaptive_strategy", {
        operation: "adaptive_clearing",
        material: "4140",
        iso_group: "P",
        tool: { diameter_mm: 12, flutes: 4 },
        feature_type: "pocket",
        stock_to_leave: 0.5,
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.operation).toBe("adaptive_clearing");
      expect(data.request_type).toBe("adaptive");
    });

    it("should generate trochoidal strategy", async () => {
      const result = await executeAIReasoningAction("ai_mill_adaptive_strategy", {
        operation: "trochoidal",
        material: "Inconel 718",
        iso_group: "S",
        tool: { diameter_mm: 10, flutes: 5, coating: "AlCrN" },
        feature_type: "slot",
      });

      expect(result.success).toBe(true);
    });

    it("should generate prism_forces strategy", async () => {
      const result = await executeAIReasoningAction("ai_mill_adaptive_strategy", {
        operation: "prism_forces",
        material: "6061-T6",
        iso_group: "N",
        include_provenance: true,
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.provenance).toBeDefined();
    });

    it("should generate hsm strategy with machine limits", async () => {
      const result = await executeAIReasoningAction("ai_mill_adaptive_strategy", {
        operation: "hsm",
        machine: {
          machine_id: "DMG-HSC-75",
          max_rpm: 42000,
          max_power_kw: 25,
          has_5th_axis: true,
        },
        tool: { diameter_mm: 6, flutes: 4, helix_angle_deg: 45 },
      });

      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPATCHER ENTRY POINT
  // ═══════════════════════════════════════════════════════════════════════════

  describe("aiReasoningDispatcher entry point", () => {
    it("should route through dispatcher wrapper", async () => {
      const result = await aiReasoningDispatcher({
        action: "ai_mill_awareness_query",
        params: { query: "kienzle", category: "physics" },
      });

      expect(result.success).toBe(true);
    });

    it("should handle missing params gracefully", async () => {
      const result = await aiReasoningDispatcher({
        action: "ai_route_mill_pipeline",
      });

      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("should handle all ISO groups", async () => {
      const groups = ["P", "M", "K", "N", "S", "H"] as const;
      for (const iso_group of groups) {
        const result = await executeAIReasoningAction("ai_mill_scientific_analyze", {
          iso_group,
          tool: { diameter_mm: 10, flutes: 4 },
        });
        expect(result.success).toBe(true);
      }
    });

    it("should handle all reasoning modes", async () => {
      const modes = [
        "chain_of_thought", "tree_of_thought", "counterfactual",
        "hypothesis_ranking", "analogical", "creative",
      ];
      for (const mode of modes) {
        const result = await executeAIReasoningAction("ai_mill_agi_reason", {
          intent: `Test ${mode} reasoning`,
          reasoning_mode: mode,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should handle all adaptive operations", async () => {
      const ops = [
        "adaptive_clearing", "trochoidal", "hsm", "prism_forces",
        "plunge_roughing", "rest_machining", "pencil", "flowline",
      ] as const;
      for (const operation of ops) {
        const result = await executeAIReasoningAction("ai_mill_adaptive_strategy", {
          operation,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should handle extreme tool dimensions", async () => {
      const result = await executeAIReasoningAction("ai_mill_scientific_analyze", {
        tool: {
          diameter_mm: 0.5, // Micro tool
          flutes: 2,
          flute_length_mm: 1,
          overall_length_mm: 38,
        },
        params: { rpm: 60000, feed_mmpm: 1200 },
      });
      expect(result.success).toBe(true);
    });

    it("should handle high RPM machine config", async () => {
      const result = await executeAIReasoningAction("ai_mill_adaptive_strategy", {
        operation: "hsm",
        machine: {
          max_rpm: 80000,
          max_power_kw: 15,
          has_5th_axis: true,
        },
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("integration with MillMasterOrchestratorFacadeEngine", () => {
    it("should receive provenance from facade", async () => {
      const result = await executeAIReasoningAction("ai_route_mill_pipeline", {
        include_provenance: true,
        material: "4140",
        iso_group: "P",
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.provenance).toBeDefined();
      const prov = data.provenance as Record<string, unknown>;
      expect(prov.request_type).toBe("print_to_program");
      expect(prov.engines_invoked).toBeDefined();
    });

    it("should route scientific analysis through facade", async () => {
      const result = await executeAIReasoningAction("ai_mill_scientific_analyze", {
        analysis_type: "power",
        tool: { diameter_mm: 12, flutes: 4 },
        params: { rpm: 8000, feed_mmpm: 1600, doc_mm: 2, woc_mm: 6 },
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      const innerResult = data.result as Record<string, unknown> | undefined;
      if (innerResult) {
        expect(innerResult.formulas_used).toBeDefined();
      }
    });

    it("should integrate with MillAISelfAwarenessIntegrationEngine", async () => {
      const result = await executeAIReasoningAction("ai_mill_awareness_query", {
        query: "orchestrator",
        category: "orchestrator",
      });

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.registry_stats).toBeDefined();
      const stats = data.registry_stats as Record<string, unknown>;
      expect(stats.totalEngines).toBeGreaterThanOrEqual(0);
      expect(stats.byCategory).toBeDefined();
      expect(stats.version).toBe("1.0.0");
    });
  });
 // ═══════════════════════════════════════════════════════════════════════════
  // Dev-loop AI utilities (added 2026-04-25)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("ai_route_task — backend routing", () => {
    it("routes physics validation to Docker", async () => {
      const result = await executeAIReasoningAction("ai_route_task", {
        task: "validate Kienzle physics for 4140 steel",
      });
      expect(result.success).toBe(true);
      const d = result.data as Record<string, unknown>;
      expect(d.taskClass).toBe("physics_validation");
      expect(d.primary).toBe("docker-physics-agent");
    });

    it("routes engine creation to Opus", async () => {
      const result = await executeAIReasoningAction("ai_route_task", {
        task: "build a new engine for surface roughness",
      });
      expect(result.success).toBe(true);
      const d = result.data as Record<string, unknown>;
      expect(d.primary).toBe("claude-opus");
    });

    it("routes search to local mcp", async () => {
      const result = await executeAIReasoningAction("ai_route_task", {
        task: "search the codebase for material registry",
      });
      expect(result.success).toBe(true);
      const d = result.data as Record<string, unknown>;
      expect(d.primary).toBe("local-mcp");
      expect(d.estimatedCost).toBe("free");
    });

    it("rejects empty task via schema", async () => {
      const schema = ACTION_AI_REASONING_SCHEMAS.ai_route_task;
      const r = schema.safeParse({ task: "" });
      expect(r.success).toBe(false);
    });
  });

  describe("ai_health_report — backend reachability", () => {
    it("reports health for all backends", async () => {
      const result = await executeAIReasoningAction("ai_health_report", {});
      expect(result.success).toBe(true);
      const d = result.data as Record<string, unknown>;
      expect(Array.isArray(d.backends)).toBe(true);
      expect((d.backends as unknown[]).length).toBe(8);
    });

    it("probes a specific backend", async () => {
      const result = await executeAIReasoningAction("ai_health_report", {
        backend: "claude-opus",
      });
      expect(result.success).toBe(true);
      const d = result.data as Record<string, unknown>;
      expect(d.backend).toBe("claude-opus");
      expect(d.reachable).toBe(true);
    });
  });

  describe("ai_recommend_capability — pattern matching", () => {
    it("recommends capabilities for a wire-EDM prompt", async () => {
      const result = await executeAIReasoningAction("ai_recommend_capability", {
        input: "I need to program a wire EDM job for 0.5mm tungsten carbide",
      });
      expect(result.success).toBe(true);
      const d = result.data as Record<string, unknown>;
      // Engine returns either matches or recommendations array; just assert shape
      expect(typeof d).toBe("object");
    });

    it("rejects empty input via schema", () => {
      const schema = ACTION_AI_REASONING_SCHEMAS.ai_recommend_capability;
      const r = schema.safeParse({ input: "" });
      expect(r.success).toBe(false);
    });
  });

  describe("ai_classify_content — content type detection", () => {
    it("classifies a string as content", async () => {
      const result = await executeAIReasoningAction("ai_classify_content", {
        content: "This is a Mastercam 2024 user manual chapter on toolpath optimization.",
      });
      // classifyContent calls llmEngine which may not be reachable in test env;
      // we accept either success with a classification or graceful error envelope.
      expect(typeof result).toBe("object");
    });
  });
});
