/**
 * Dispatcher round-trip wiring test — AUTO-LEARNING-LOOP-MS0 / U-ALL06
 * =====================================================================
 *
 * Verifies that `prism_ai:roadmap_auto_append` is reachable end-to-end:
 *   1. Action enum entry exists in AI_REASONING_ACTIONS.
 *   2. Schema entry exists in ACTION_AI_REASONING_SCHEMAS with .strict().
 *   3. Switch case routes to RoadmapAutoAppendEngine.proposeBatch().
 *   4. Result envelope: { proposals, rejected, appendedThisCycle }.
 *   5. Schema rejects unknown extra keys.
 *
 * Engine algorithm covered in RoadmapAutoAppendEngine.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  executeAIReasoningAction,
  type AIReasoningAction,
} from "../tools/dispatchers/aiReasoningDispatcher.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
} from "../schemas/aiReasoningActionSchemas.js";
import { roadmapAutoAppendEngine } from "../engines/RoadmapAutoAppendEngine.js";

const T0 = Date.UTC(2026, 4, 13, 12, 0, 0);

function makeWireInput(guid: string, label: "high" | "med" | "low" | "none" = "high", score = 0.85) {
  return {
    verdict: {
      label,
      score,
      reason: label === "none" ? "invalid_features" : "score_band",
      contributions: {
        semantic_match: 0,
        novelty_strength: 0,
        ai_priority_score: 0,
        duplication_risk: 0,
        effort_estimate: 0,
        blast_radius: 0,
      },
      rubricSchemaVersion: 1,
      classifiedAt: T0,
    },
    guid,
    source: "rss-alpha",
    title: `Title for ${guid}`,
  };
}

describe("prism_ai:roadmap_auto_append — wiring", () => {
  beforeEach(() => {
    // Singleton state survives across tests in the same module —
    // resetAll clears both cycle counters AND dedup_guids so guid
    // reuse across tests doesn't cross-pollute.
    roadmapAutoAppendEngine.resetAll();
  });

  it("action enum includes 'roadmap_auto_append' exactly once", () => {
    const arr = AI_REASONING_ACTIONS as readonly string[];
    expect(arr.includes("roadmap_auto_append")).toBe(true);
    expect(arr.filter((a) => a === "roadmap_auto_append").length).toBe(1);
  });

  it("schema has 'roadmap_auto_append' entry with .strict() refusal of unknown keys", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["roadmap_auto_append" as AIReasoningAction];
    expect(schema === undefined).toBe(false);
    const r = (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
      inputs: [makeWireInput("g1")],
      bogus: true,
    });
    expect(r.success).toBe(false);
  });

  it("schema validates a well-formed payload", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["roadmap_auto_append" as AIReasoningAction];
    const r = (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
      inputs: [makeWireInput("g1")],
    });
    expect(r.success).toBe(true);
  });

  it("round-trip: 1 high input ⇒ 1 proposal, U-AUTORES-01 id", async () => {
    const r = await executeAIReasoningAction("roadmap_auto_append" as AIReasoningAction, {
      inputs: [makeWireInput("g1")],
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      proposals: Array<{ id: string; yaml: string; bypassedRateLimit: boolean }>;
      rejected?: unknown[];
    };
    expect(data.proposals.length).toBe(1);
    expect(data.proposals[0].id).toBe("U-AUTORES-01");
    expect(data.proposals[0].yaml.includes("- id: U-AUTORES-01")).toBe(true);
    expect(data.proposals[0].bypassedRateLimit).toBe(false);
  });

  it("round-trip: rate limit fires at 3rd input ⇒ 2 proposals + 1 rejected", async () => {
    const r = await executeAIReasoningAction("roadmap_auto_append" as AIReasoningAction, {
      inputs: [
        makeWireInput("g1"),
        makeWireInput("g2"),
        makeWireInput("g3"),
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      proposals: unknown[];
      rejected: Array<{ guid: string; reason: string }>;
    };
    expect(data.proposals.length).toBe(2);
    expect(data.rejected.length).toBe(1);
    expect(data.rejected[0].reason).toBe("rate_limited");
  });

  it("round-trip: low-band drops as low_synergy_band", async () => {
    const r = await executeAIReasoningAction("roadmap_auto_append" as AIReasoningAction, {
      inputs: [
        makeWireInput("g1", "low", 0.30),
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      proposals?: unknown[];
      rejected: Array<{ reason: string }>;
    };
    // slimResponse strips empty arrays — absent ≡ length 0.
    expect((data.proposals ?? []).length).toBe(0);
    expect(data.rejected[0].reason).toBe("low_synergy_band");
  });

  it("round-trip rejects unknown extra key", async () => {
    const r = await executeAIReasoningAction("roadmap_auto_append" as AIReasoningAction, {
      inputs: [makeWireInput("g1")],
      mystery: true,
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("round-trip rejects missing 'inputs'", async () => {
    const r = await executeAIReasoningAction("roadmap_auto_append" as AIReasoningAction, {});
    expect(r.success).toBe(false);
  });
});
