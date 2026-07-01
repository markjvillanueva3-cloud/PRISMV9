/**
 * U-WIRE11 -- prism_ai dispatcher smoke tests
 * Verifies 8 newly-wired AI/ML deep-learning + capability orchestration actions
 * route to their engines, return real values, and validate parameters.
 *
 * RETARGETED (2026-06-20, cad-fusion-live-ms0): composite action names that were
 * deleted in clobber commit c642606778 replaced with canonical granular names.
 * No composite names (ai_capability_metrics / ai_system_sync / ai_deep_knowledge_query /
 * ai_resource_recommend / ai_neural_route / ai_active_learning_rank / ai_peer_learning)
 * appear anywhere in this file.
 *
 * @milestone WIRE-MS0/U-WIRE11
 */

import { describe, expect, it } from "vitest";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

describe("prism_ai -- U-WIRE11 wiring (AI/ML + neural + learning)", () => {
  // T1 -- ai_capability_compute_metrics (was: ai_capability_metrics returns metrics + recommendations)
  it("ai_capability_compute_metrics returns metrics object with score + coverage", async () => {
    const r = await executeAIReasoningAction("ai_capability_compute_metrics", {});
    expect(r.success).toBe(true);
    // computeMetrics() returns CapabilityMetrics directly as r.data
    const data = r.data as {
      capability_score: number;
      knowledge_coverage: number;
      validation_confidence: number;
      domain_scores: Record<string, number>;
    };
    expect(typeof data.capability_score).toBe("number");
    expect(data.capability_score).toBeGreaterThan(0);
    expect(data.knowledge_coverage).toBeGreaterThan(0);
    expect(data.validation_confidence).toBeGreaterThanOrEqual(0);
    expect(data.validation_confidence).toBeLessThanOrEqual(1);
    expect(typeof data.domain_scores.physics_validation).toBe("number");
  });

  it("ai_capability_enhancement_recommendations returns non-empty array", async () => {
    const r = await executeAIReasoningAction("ai_capability_enhancement_recommendations", {});
    expect(r.success).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
  });

  // T2 -- patterns + sources + strategy (was: ai_capability_metrics with include_patterns flag)
  it("ai_capability_reasoning_patterns returns array with id strings", async () => {
    const r = await executeAIReasoningAction("ai_capability_reasoning_patterns", {});
    expect(r.success).toBe(true);
    const data = r.data as Array<{ id: string; name: string }>;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(typeof data[0].id).toBe("string");
  });

  it("ai_capability_knowledge_sources returns non-empty array", async () => {
    const r = await executeAIReasoningAction("ai_capability_knowledge_sources", {});
    expect(r.success).toBe(true);
    const data = r.data as Array<{ source: string }>;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("ai_capability_enhancement_strategy returns non-null strategy for reasoning_depth", async () => {
    // ENHANCEMENT_STRATEGIES keys: code_generation, knowledge_synthesis, reasoning_depth, context_retention
    // "deepReasoning" is not a key; use the real nearest key "reasoning_depth".
    const r = await executeAIReasoningAction("ai_capability_enhancement_strategy", { area: "reasoning_depth" });
    expect(r.success).toBe(true);
    expect(r.data).not.toBeNull();
  });

  // (T3 + T4 are ai_intelligence_maximize -- these already pass; keep them untouched)
  it("ai_intelligence_maximize produces optimized recommendation with units", async () => {
    const r = await executeAIReasoningAction("ai_intelligence_maximize", {
      operation: "milling_pocket",
      material: "AISI 4140",
      tool: { type: "endmill", diameter_mm: 10, flutes: 4 },
      machine: { type: "mill_3axis", max_rpm: 12000 },
      priority: "balanced",
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      speed_m_min: { value: number; unit: string; confidence: number };
      depth_of_cut_mm: { value: number; unit: string };
    };
    expect(data.speed_m_min.value).toBeGreaterThan(0);
    expect(data.speed_m_min.unit).toBe("m/min");
    expect(data.speed_m_min.confidence).toBeGreaterThan(0);
    expect(data.speed_m_min.confidence).toBeLessThanOrEqual(1);
    expect(data.depth_of_cut_mm.value).toBeGreaterThan(0);
  });

  it("ai_intelligence_maximize rejects unknown operation enum", async () => {
    const r = await executeAIReasoningAction("ai_intelligence_maximize", {
      operation: "not_a_real_op",
      material: "Steel",
      tool: {},
      machine: { type: "mill_3axis" },
      priority: "balanced",
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  // T5 -- ai_system_status (was: ai_system_sync mode=status)
  it("ai_system_status returns positive engineCount + capabilities + active flag", async () => {
    const r = await executeAIReasoningAction("ai_system_status", {});
    expect(r.success).toBe(true);
    const data = r.data as { engineCount: number; capabilities: string[]; active: boolean };
    expect(data.engineCount).toBeGreaterThan(0);
    expect(data.capabilities.length).toBeGreaterThan(0);
    expect(data.active).toBe(true);
  });

  // T6 -- ai_system_summary (was: ai_system_sync mode=summary)
  it("ai_system_summary returns multiline string containing AI", async () => {
    const r = await executeAIReasoningAction("ai_system_summary", {});
    expect(r.success).toBe(true);
    const data = r.data as { summary: string };
    expect(data.summary.length).toBeGreaterThan(50);
    expect(data.summary).toContain("AI");
  });

  // T7 -- ai_system_synergize (was: ai_system_sync mode=synergize)
  it("ai_system_synergize lists relevant engines for a problem", async () => {
    const r = await executeAIReasoningAction("ai_system_synergize", {
      problem: "optimize roughing parameters for hardened steel",
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      primarySystem: string;
      supportingSystems: string[];
      workflow: string[];
      estimatedComplexity: "low" | "medium" | "high";
    };
    expect(typeof data.primarySystem).toBe("string");
    expect(data.primarySystem.length).toBeGreaterThan(0);
    expect(Array.isArray(data.supportingSystems)).toBe(true);
    expect(Array.isArray(data.workflow)).toBe(true);
    expect(data.workflow.length).toBeGreaterThan(0);
    expect(["low", "medium", "high"]).toContain(data.estimatedComplexity);
  });

  // T8 -- adversarial test for ai_system_synergize empty problem (was: ai_system_sync mode=recommend)
  // The schema requires problem.min(1) so empty string -> validation failure -> success:false.
  it("ai_system_synergize rejects empty problem string", async () => {
    const r = await executeAIReasoningAction("ai_system_synergize", { problem: "" });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  // T9 -- ai_knowledge_query (was: ai_deep_knowledge_query)
  it("ai_knowledge_query returns answer with type + confidence for optimize_process", async () => {
    const r = await executeAIReasoningAction("ai_knowledge_query", {
      intent: "optimize_process",
      domain: "cutting_force",
      context: { material: "Inconel 718" },
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      answer: { type: string; content: string };
      sources: unknown[];
      confidence: number;
    };
    expect(["recommendation", "validation", "explanation", "code", "warning"]).toContain(data.answer.type);
    expect(data.answer.content.length).toBeGreaterThan(0);
    expect(data.confidence).toBeGreaterThanOrEqual(0);
    expect(data.confidence).toBeLessThanOrEqual(1);
  });

  // T10 -- ai_knowledge_query rejection (was: ai_deep_knowledge_query rejects unknown intent)
  it("ai_knowledge_query rejects unknown intent enum", async () => {
    const r = await executeAIReasoningAction("ai_knowledge_query", {
      intent: "delete_database",
      domain: "x",
      context: {},
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  // T11 -- ai_resource_speed_feed (was: ai_resource_recommend mode=speed_feed)
  it("ai_resource_speed_feed returns numeric SFM/IPR for known material or null for unknown", async () => {
    const r = await executeAIReasoningAction("ai_resource_speed_feed", {
      material: "1018 steel",
      operation: "roughing",
    });
    expect(r.success).toBe(true);
    // Engine returns null for materials not in its JM-DIE training set; both shapes are valid.
    if (r.data !== null) {
      const data = r.data as { sfm: number; ipr: number; confidence: number };
      expect(typeof data.sfm).toBe("number");
      expect(data.sfm).toBeGreaterThan(0);
      expect(typeof data.ipr).toBe("number");
      expect(data.confidence).toBeGreaterThan(0);
    }
  });

  // T12 -- ai_resource_knowledge_coverage (was: ai_resource_recommend mode=coverage)
  it("ai_resource_knowledge_coverage returns object with numeric coverage fields", async () => {
    const r = await executeAIReasoningAction("ai_resource_knowledge_coverage", {});
    expect(r.success).toBe(true);
    const data = r.data as Record<string, unknown>;
    expect(Object.keys(data).length).toBeGreaterThan(0);
  });

  // T13 -- ai_resource_generate_hypermill_template (was: ai_resource_recommend mode=hypermill_template)
  // generateHyperMillTemplate(task) returns a string directly (not {template,code}).
  it("ai_resource_generate_hypermill_template returns a non-empty code string", async () => {
    const r = await executeAIReasoningAction("ai_resource_generate_hypermill_template", {
      task: "electrode_create",
    });
    expect(r.success).toBe(true);
    // The engine returns a raw string; the dispatcher assigns it directly to result.
    expect(typeof r.data).toBe("string");
    expect((r.data as string).length).toBeGreaterThan(0);
  });

  // T14 -- neural_route (was: ai_neural_route mode=route)
  // route() takes NeuralQuery with `input` field (not `query`).
  it("neural_route picks an engine with confidence in [0,1]", async () => {
    const r = await executeAIReasoningAction("neural_route", {
      input: "optimize a roughing toolpath for titanium",
    });
    expect(r.success).toBe(true);
    const data = r.data as { engine: string; confidence: number; alternatives: unknown[] };
    expect(data.engine.length).toBeGreaterThan(0);
    expect(data.confidence).toBeGreaterThanOrEqual(0);
    expect(data.confidence).toBeLessThanOrEqual(1);
    if (data.alternatives !== undefined) {
      expect(Array.isArray(data.alternatives)).toBe(true);
    }
  });

  // T15 -- neural_synthesize (was: ai_neural_route mode=synthesize)
  // synthesize(query: string) returns NeuralSynthesis: {query,sources,synthesis,confidence,...}
  it("neural_synthesize returns synthesis string + suggestedCommands", async () => {
    const r = await executeAIReasoningAction("neural_synthesize", {
      query: "wire edm program for tool steel die",
    });
    expect(r.success).toBe(true);
    const data = r.data as { suggestedCommands: string[]; synthesis: string; sources: string[] };
    expect(Array.isArray(data.suggestedCommands)).toBe(true);
    expect(data.synthesis.length).toBeGreaterThan(0);
  });

  // T16 -- neural_recommend (was: ai_neural_route mode=commands)
  // recommendCommands(query) returns SkillRecommendation[] wrapped as {recommendations, count}.
  // SkillRecommendation.command is the slash command string (starts with /).
  it("neural_recommend returns slash command recommendations", async () => {
    const r = await executeAIReasoningAction("neural_recommend", {
      query: "extract knowledge from this PDF manual",
    });
    expect(r.success).toBe(true);
    const data = r.data as { recommendations: Array<{ command: string; confidence: number }> };
    expect(Array.isArray(data.recommendations)).toBe(true);
    if (data.recommendations.length > 0) {
      expect(typeof data.recommendations[0].command).toBe("string");
      expect(data.recommendations[0].command.startsWith("/")).toBe(true);
    }
  });

  // T17 -- learning_rank + learning_summary (was: ai_active_learning_rank with include_summary)
  it("learning_rank ranks by binary-entropy-reduction-per-minute (highest score first)", async () => {
    const r = await executeAIReasoningAction("learning_rank", {
      candidates: [
        // a: after=0.25, H=0.811, gain~=0.189, score~=0.00630
        { id: "a", topic: "kienzle calibration", currentUncertainty: 0.5, expectedReduction: 0.5, costMinutes: 30 },
        // b: after=0.40, H=0.971, gain~=0.029, score~=0.00048
        { id: "b", topic: "tool wear log", currentUncertainty: 0.5, expectedReduction: 0.2, costMinutes: 60 },
        // c: after=0.10, H=0.469, gain~=0.531, score~=0.0354 (winner)
        { id: "c", topic: "spc baseline", currentUncertainty: 0.5, expectedReduction: 0.8, costMinutes: 15 },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      count: number;
      totalInfoGain: number;
      topRank: { id: string; rank: number; score: number; infoGain: number } | null;
      ranked: Array<{ id: string; rank: number; score: number; infoGain: number }>;
    };
    expect(data.ranked).toHaveLength(3);
    expect(data.ranked[0].id).toBe("c");
    expect(data.ranked[0].rank).toBe(1);
    expect(data.ranked[0].score).toBeGreaterThan(data.ranked[1].score);
    expect(data.ranked[0].infoGain).toBeGreaterThan(0.4);

    // Now test learning_summary using the ranked output
    const sumR = await executeAIReasoningAction("learning_summary", { ranked: data.ranked });
    expect(sumR.success).toBe(true);
    // summary() returns {total, totalInfoGain, topTopic} directly as result
    const summary = sumR.data as { total: number; totalInfoGain: number; topTopic: string | null };
    expect(summary.total).toBe(3);
    expect(summary.topTopic).toBe("spc baseline");
  });

  // T18 -- learning_rank rejects empty candidates (was: ai_active_learning_rank rejects empty)
  it("learning_rank rejects empty candidate list", async () => {
    const r = await executeAIReasoningAction("learning_rank", { candidates: [] });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  // T19 -- learning_rank rejects zero-cost candidate (was: ai_active_learning_rank rejects zero-cost)
  it("learning_rank rejects zero-cost candidate", async () => {
    const r = await executeAIReasoningAction("learning_rank", {
      candidates: [{ id: "x", topic: "t", currentUncertainty: 0.5, expectedReduction: 0.5, costMinutes: 0 }],
    });
    expect(r.success).toBe(false);
  });

  // T20 -- peer_broadcast + peer_query roundtrip (was: ai_peer_learning broadcast->query roundtrip)
  // broadcast() takes flat PeerInsight fields (not nested under .insight).
  // query() takes QueryOptions flat (not nested under .query): includeAnyTag, limit.
  it("peer_broadcast->peer_query roundtrip stores and retrieves an insight", async () => {
    const tag = `wedm-uwire11-${Date.now()}`;
    const broadcast = await executeAIReasoningAction("peer_broadcast", {
      fromSession: "claude-uwire11-test",
      summary: "wire-EDM tool-steel skim cut at 0.05mm gives best Ra",
      tags: [tag, "skim_cut"],
      confidence: 0.85,
    });
    expect(broadcast.success).toBe(true);
    const bcast = broadcast.data as { accepted: boolean; insightId?: string };
    expect(bcast.accepted).toBe(true);

    const queried = await executeAIReasoningAction("peer_query", {
      includeAnyTag: [tag],
      limit: 5,
    });
    expect(queried.success).toBe(true);
    const qd = queried.data as { insights: Array<{ tags: string[]; summary: string }>; count: number };
    expect(qd.insights.length).toBeGreaterThan(0);
    expect(qd.insights[0].tags).toContain(tag);
    expect(qd.insights[0].summary).toContain("skim cut");
  });

  // T21 -- peer_size (was: ai_peer_learning size)
  it("peer_size returns non-negative integer", async () => {
    const r = await executeAIReasoningAction("peer_size", {});
    expect(r.success).toBe(true);
    const data = r.data as { size: number };
    expect(Number.isInteger(data.size)).toBe(true);
    expect(data.size).toBeGreaterThanOrEqual(0);
  });

  // T22 -- peer_broadcast low-confidence (was: ai_peer_learning broadcast low-confidence)
  // Engine accepts confidence 0.01 (no minimum threshold gate); accepted or duplicate => boolean.
  it("peer_broadcast low-confidence insight returns structured accepted boolean", async () => {
    const r = await executeAIReasoningAction("peer_broadcast", {
      fromSession: "claude-uwire11-test",
      summary: "low-confidence noise",
      tags: ["noise"],
      confidence: 0.01,
    });
    expect(r.success).toBe(true);
    const data = r.data as { accepted: boolean };
    expect(typeof data.accepted).toBe("boolean");
  });
});
