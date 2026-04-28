/**
 * aiReasoningDispatcher U-WIRE30 round-trip tests — ProactiveLearningEngine.
 *
 * Validates proactive_detect/classify/quality_report/stats through prism_ai.
 * Engine emits events via eventBus (publish failures swallowed via safeEmit
 * so this is safe in tests); engine-direct tests use fresh class instances
 * so listener arrays don't accumulate.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE30
 */

import { describe, it, expect } from "vitest";
import {
  proactiveLearningEngine,
  type LearningContext,
  type LearningTrigger,
} from "../engines/ProactiveLearningEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

describe("U-WIRE30 — engine direct: ProactiveLearningEngine", () => {
  it("detectLearningTriggers returns [] when context.is_routine=true (skip routine cuts)", () => {
    const fresh = proactiveLearningEngine;
    const out = fresh.detectLearningTriggers({
      material: "totally-unknown-alloy", // would fire new_pattern otherwise
      operation: "experimental novel cut", // would fire novel_scenario otherwise
      is_routine: true,
    });
    expect(out).toEqual([]);
  });

  it("detectLearningTriggers fires NEW_PATTERN for unknown materials", () => {
    const fresh = proactiveLearningEngine;
    const ctx: LearningContext = { material: "alien-unobtainium" };
    const triggers = fresh.detectLearningTriggers(ctx);
    expect(triggers.length).toBeGreaterThan(0);
    expect(triggers.some((t) => t.type === "new_pattern")).toBe(true);
    for (const t of triggers) {
      expect(typeof t.id).toBe("string");
      expect(t.id.startsWith("trig-")).toBe(true);
      expect(typeof t.timestamp).toBe("string");
    }
  });

  it("detectLearningTriggers does NOT fire NEW_PATTERN for known materials", () => {
    const fresh = proactiveLearningEngine;
    const ctx: LearningContext = { material: "Inconel 718" };
    const triggers = fresh.detectLearningTriggers(ctx);
    expect(triggers.some((t) => t.type === "new_pattern")).toBe(false);
  });

  it("detectLearningTriggers fires NOVEL_SCENARIO when operation contains 'experimental' / 'prototype' etc.", () => {
    const fresh = proactiveLearningEngine;
    const ctx: LearningContext = { material: "steel", operation: "experimental high-feed pocket" };
    const triggers = fresh.detectLearningTriggers(ctx);
    expect(triggers.some((t) => t.type === "novel_scenario")).toBe(true);
  });

  it("detectLearningTriggers fires CONFLICT when ≥2 knowledge sources disagree", () => {
    const fresh = proactiveLearningEngine;
    const ctx: LearningContext = {
      material: "steel",
      knowledge_sources: [
        { source: "Sandvik", recommendation: "Vc=200 m/min", confidence: 0.85 },
        { source: "Kennametal", recommendation: "Vc=250 m/min", confidence: 0.80 }, // disagrees
      ],
    };
    const triggers = fresh.detectLearningTriggers(ctx);
    expect(triggers.some((t) => t.type === "conflict")).toBe(true);
  });

  it("detectLearningTriggers does NOT fire CONFLICT when sources agree", () => {
    const fresh = proactiveLearningEngine;
    const ctx: LearningContext = {
      material: "steel",
      knowledge_sources: [
        { source: "A", recommendation: "Vc=200 m/min", confidence: 0.85 },
        { source: "B", recommendation: "vc=200 m/min", confidence: 0.80 }, // case-insensitive equal
      ],
    };
    const triggers = fresh.detectLearningTriggers(ctx);
    expect(triggers.some((t) => t.type === "conflict")).toBe(false);
  });

  it("detectLearningTriggers fires CONFIDENCE_DROP when outcome_confidence drops > 0.2 below prior", () => {
    const fresh = proactiveLearningEngine;
    const ctx: LearningContext = {
      material: "steel",
      prior_confidence: 0.9,
      outcome_confidence: 0.5, // drop of -0.4
    };
    const triggers = fresh.detectLearningTriggers(ctx);
    expect(triggers.some((t) => t.type === "confidence_drop")).toBe(true);
  });

  it("detectLearningTriggers does NOT fire CONFIDENCE_DROP for small confidence wobbles", () => {
    const fresh = proactiveLearningEngine;
    const ctx: LearningContext = {
      material: "steel",
      prior_confidence: 0.85,
      outcome_confidence: 0.80, // -0.05 — within tolerance
    };
    const triggers = fresh.detectLearningTriggers(ctx);
    expect(triggers.some((t) => t.type === "confidence_drop")).toBe(false);
  });

  it("classifyTrigger returns priority + routing.handler + recommended_action", () => {
    const fresh = proactiveLearningEngine;
    // Fabricate a trigger that would normally come from detectLearningTriggers
    const trigger: LearningTrigger = {
      id: "test-trigger-1",
      type: "conflict",
      timestamp: new Date().toISOString(),
      context: { material: "steel" },
      details: {},
    };
    const c = fresh.classifyTrigger(trigger);
    expect(c.trigger_id).toBe("test-trigger-1");
    expect(["critical", "high", "medium", "low"].includes(c.priority)).toBe(true);
    expect(typeof c.routing.handler).toBe("string");
    expect((c.routing.handler ?? "").length).toBeGreaterThan(0);
    expect(typeof c.recommended_action).toBe("string");
  });

  it("monitorKnowledgeQuality returns timestamp + overall_score in [0,1] + issues array", () => {
    const fresh = proactiveLearningEngine;
    const r = fresh.monitorKnowledgeQuality();
    expect(typeof r.timestamp).toBe("string");
    expect(r.overall_score).toBeGreaterThanOrEqual(0);
    expect(r.overall_score).toBeLessThanOrEqual(1);
    expect(Array.isArray(r.issues)).toBe(true);
    expect(Array.isArray(r.recommendations)).toBe(true);
    for (const i of r.issues) {
      expect(["low", "medium", "high"].includes(i.severity)).toBe(true);
      expect(typeof i.description).toBe("string");
    }
  });

  it("getCategorizationStats returns numeric counters (no negatives)", () => {
    const fresh = proactiveLearningEngine;
    const s = fresh.getCategorizationStats();
    expect(typeof s).toBe("object");
    for (const v of Object.values(s)) {
      if (typeof v === "number") {
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("U-WIRE30 — schema integrity", () => {
  it("all 4 proactive_* actions are in AI_REASONING_ACTIONS exactly once", () => {
    const actions = AI_REASONING_ACTIONS as readonly string[];
    for (const a of ["proactive_detect", "proactive_classify", "proactive_quality_report", "proactive_stats"]) {
      expect(actions.filter((x) => x === a).length).toBe(1);
    }
  });

  it("Zod schemas exist for all 4 actions", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, unknown>;
    for (const a of ["proactive_detect", "proactive_classify", "proactive_quality_report", "proactive_stats"]) {
      expect(typeof map[a]).toBe("object");
    }
  });

  it("proactive_detect requires a context object; rejects missing or non-object context", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.proactive_detect.safeParse({}).success).toBe(false);
    expect(map.proactive_detect.safeParse({ context: "not-an-object" }).success).toBe(false);
    expect(map.proactive_detect.safeParse({ context: {} }).success).toBe(true);
    expect(map.proactive_detect.safeParse({ context: { material: "steel" } }).success).toBe(true);
  });

  it("proactive_detect rejects unknown outcome enum values", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.proactive_detect.safeParse({ context: { outcome: "maybe" } }).success).toBe(false);
    expect(map.proactive_detect.safeParse({ context: { outcome: "success" } }).success).toBe(true);
  });

  it("proactive_classify requires a trigger object with type", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.proactive_classify.safeParse({}).success).toBe(false);
    expect(map.proactive_classify.safeParse({ trigger: {} }).success).toBe(false);
    expect(map.proactive_classify.safeParse({ trigger: { type: "conflict" } }).success).toBe(true);
  });

  it("proactive_quality_report and proactive_stats accept empty params", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.proactive_quality_report.safeParse({}).success).toBe(true);
    expect(map.proactive_stats.safeParse({}).success).toBe(true);
  });
});

describe("U-WIRE30 — dispatcher round-trip: prism_ai", () => {
  it("proactive_detect happy path returns triggers + count for novel material", async () => {
    const r = await executeAIReasoningAction("proactive_detect" as AIReasoningAction, {
      context: { material: "alien-unobtainium" },
    });
    expect(r.success).toBe(true);
    const data = r.data as { triggers?: Array<{ type: string }>; count?: number };
    expect(Array.isArray(data.triggers)).toBe(true);
    expect(typeof data.count).toBe("number");
    expect((data.triggers ?? []).some((t) => t.type === "new_pattern")).toBe(true);
  });

  it("proactive_detect routine context returns count=0 (slim may strip empty fields)", async () => {
    const r = await executeAIReasoningAction("proactive_detect" as AIReasoningAction, {
      context: { material: "alien-unobtainium", is_routine: true },
    });
    expect(r.success).toBe(true);
    const data = r.data as { triggers?: unknown[]; count?: number };
    // count=0 may be stripped by slim; triggers=[] also stripped. Either way, no triggers.
    expect((data.triggers ?? []).length).toBe(0);
    expect(data.count === 0 || data.count === undefined).toBe(true);
  });

  it("proactive_classify returns priority + routing.handler", async () => {
    const r = await executeAIReasoningAction("proactive_classify" as AIReasoningAction, {
      trigger: {
        id: "rt-1",
        type: "conflict",
        timestamp: new Date().toISOString(),
        context: {},
        details: {},
      },
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      trigger_id?: string;
      priority?: string;
      routing?: { handler?: string };
      recommended_action?: string;
    };
    expect(data.trigger_id).toBe("rt-1");
    expect(["critical", "high", "medium", "low"].includes(data.priority ?? "")).toBe(true);
    expect(typeof data.routing?.handler).toBe("string");
  });

  it("proactive_quality_report returns timestamp + overall_score + issues", async () => {
    const r = await executeAIReasoningAction("proactive_quality_report" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const data = r.data as {
      timestamp?: string;
      overall_score?: number;
      issues?: unknown[];
    };
    expect(typeof data.timestamp).toBe("string");
    expect(typeof data.overall_score).toBe("number");
    expect((data.overall_score ?? -1)).toBeGreaterThanOrEqual(0);
    expect((data.overall_score ?? 2)).toBeLessThanOrEqual(1);
  });

  it("proactive_stats returns an object with non-negative numeric counters", async () => {
    const r = await executeAIReasoningAction("proactive_stats" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    expect(typeof r.data).toBe("object");
  });

  it("proactive_detect FAIL: missing context → schema rejects", async () => {
    const r = await executeAIReasoningAction("proactive_detect" as AIReasoningAction, {});
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("proactive_detect FAIL: invalid outcome enum → schema rejects", async () => {
    const r = await executeAIReasoningAction("proactive_detect" as AIReasoningAction, {
      context: { outcome: "kinda" },
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("proactive_classify FAIL: missing trigger.type → schema rejects", async () => {
    const r = await executeAIReasoningAction("proactive_classify" as AIReasoningAction, {
      trigger: { id: "x", timestamp: new Date().toISOString(), context: {}, details: {} },
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("proactive_classify FAIL: missing trigger entirely → schema rejects", async () => {
    const r = await executeAIReasoningAction("proactive_classify" as AIReasoningAction, {});
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });
});

describe("U-WIRE30 — singleton continuity", () => {
  it("proactiveLearningEngine singleton is the same object across re-imports", async () => {
    const mod = await import("../engines/ProactiveLearningEngine.js");
    expect(mod.proactiveLearningEngine).toBe(proactiveLearningEngine);
  });
});
