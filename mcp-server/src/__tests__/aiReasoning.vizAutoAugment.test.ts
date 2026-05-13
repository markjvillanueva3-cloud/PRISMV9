/**
 * Dispatcher round-trip wiring test — AUTO-LEARNING-LOOP-MS0 / U-ALL05
 * =====================================================================
 *
 * Verifies that `prism_ai:viz_auto_augment` is reachable end-to-end:
 *   1. Action enum entry exists in AI_REASONING_ACTIONS.
 *   2. Schema entry exists in ACTION_AI_REASONING_SCHEMAS with .strict().
 *   3. Switch case routes to VizAutoAugmentationEngine.emit().
 *   4. Result envelope: { document, filteredByBand, filteredByConfidence, filteredByInternalDup, filteredByOversize }.
 *   5. Schema rejects unknown extra keys.
 *
 * Engine algorithm covered in VizAutoAugmentationEngine.test.ts.
 */

import { describe, it, expect } from "vitest";
import {
  executeAIReasoningAction,
  type AIReasoningAction,
} from "../tools/dispatchers/aiReasoningDispatcher.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
} from "../schemas/aiReasoningActionSchemas.js";
import { AUGMENTATION_SCHEMA_VERSION } from "../engines/VizAutoAugmentationEngine.js";

const T0 = Date.UTC(2026, 4, 13, 12, 0, 0);

function makeInput(label: "high" | "med" | "low" | "none", score: number, guid: string) {
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

describe("prism_ai:viz_auto_augment — wiring", () => {
  it("action enum includes 'viz_auto_augment' exactly once", () => {
    const arr = AI_REASONING_ACTIONS as readonly string[];
    expect(arr.includes("viz_auto_augment")).toBe(true);
    expect(arr.filter((a) => a === "viz_auto_augment").length).toBe(1);
  });

  it("schema map has 'viz_auto_augment' entry with .strict() refusal of unknown keys", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["viz_auto_augment" as AIReasoningAction];
    expect(schema === undefined).toBe(false);
    const r = (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
      inputs: [makeInput("high", 0.85, "g1")],
      bogus_extra: true,
    });
    expect(r.success).toBe(false);
  });

  it("schema validates a well-formed payload (single high-fit input)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["viz_auto_augment" as AIReasoningAction];
    const r = (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
      inputs: [makeInput("high", 0.85, "g1")],
    });
    expect(r.success).toBe(true);
  });

  it("round-trip: empty inputs ⇒ empty document, all counters zero", async () => {
    const r = await executeAIReasoningAction("viz_auto_augment" as AIReasoningAction, { inputs: [] });
    expect(r.success).toBe(true);
    const data = r.data as {
      document: { schemaVersion: number; nodes?: unknown[]; edges?: unknown[] };
      filteredByBand?: number;
      filteredByConfidence?: number;
      filteredByInternalDup?: number;
      filteredByOversize?: number;
    };
    expect(data.document.schemaVersion).toBe(AUGMENTATION_SCHEMA_VERSION);
    // slimResponse strips empty arrays and zero-valued numbers,
    // so absent ≡ length 0 / value 0 for this contract.
    expect((data.document.nodes ?? []).length).toBe(0);
    expect((data.document.edges ?? []).length).toBe(0);
    expect((data.filteredByBand ?? 0)).toBe(0);
    expect((data.filteredByConfidence ?? 0)).toBe(0);
    expect((data.filteredByInternalDup ?? 0)).toBe(0);
    expect((data.filteredByOversize ?? 0)).toBe(0);
  });

  it("round-trip: 1 high + 1 low ⇒ 1 node emitted, filteredByBand=1", async () => {
    const r = await executeAIReasoningAction("viz_auto_augment" as AIReasoningAction, {
      inputs: [
        makeInput("high", 0.85, "g1"),
        makeInput("low", 0.30, "g2"),
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      document: { nodes: Array<{ id: string; band: string }> };
      filteredByBand: number;
    };
    expect(data.document.nodes.length).toBe(1);
    expect(data.document.nodes[0].band).toBe("high");
    expect(data.document.nodes[0].id.startsWith("auto-research-")).toBe(true);
    expect(data.filteredByBand).toBe(1);
  });

  it("round-trip: batch with internal dup ⇒ second dropped, counter incremented", async () => {
    const r = await executeAIReasoningAction("viz_auto_augment" as AIReasoningAction, {
      inputs: [
        makeInput("high", 0.85, "g1"),
        makeInput("high", 0.85, "g1"),
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      document: { nodes: unknown[] };
      filteredByInternalDup: number;
    };
    expect(data.document.nodes.length).toBe(1);
    expect(data.filteredByInternalDup).toBe(1);
  });

  it("round-trip rejects unknown extra keys on params (Zod .strict)", async () => {
    const r = await executeAIReasoningAction("viz_auto_augment" as AIReasoningAction, {
      inputs: [makeInput("high", 0.85, "g1")],
      mystery_field: 42,
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("round-trip rejects missing 'inputs' field", async () => {
    const r = await executeAIReasoningAction("viz_auto_augment" as AIReasoningAction, {});
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });
});
