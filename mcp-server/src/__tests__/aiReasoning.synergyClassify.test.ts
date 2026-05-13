/**
 * Dispatcher round-trip wiring test — AUTO-LEARNING-LOOP-MS0 / U-ALL04
 * =====================================================================
 *
 * Verifies that `prism_ai:synergy_classify` is reachable end-to-end:
 *   1. Action enum entry exists in AI_REASONING_ACTIONS.
 *   2. Schema entry exists in ACTION_AI_REASONING_SCHEMAS with .strict().
 *   3. Switch case routes to SynergyClassifierEngine.{classify, classifyBatch}.
 *   4. Result envelope: { verdict?, batchResult?, rubricSchemaVersion }.
 *   5. Schema rejects unknown extra keys.
 *
 * Engine algorithm is exhaustively covered in
 * SynergyClassifierEngine.test.ts — this file only verifies wiring.
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
import {
  synergyClassifierEngine,
  RUBRIC_SCHEMA_VERSION,
} from "../engines/SynergyClassifierEngine.js";

describe("prism_ai:synergy_classify — wiring", () => {
  beforeEach(() => {
    synergyClassifierEngine.resetAll();
  });

  it("action enum includes 'synergy_classify' exactly once", () => {
    const arr = AI_REASONING_ACTIONS as readonly string[];
    expect(arr.includes("synergy_classify")).toBe(true);
    expect(arr.filter((a) => a === "synergy_classify").length).toBe(1);
  });

  it("schema map has 'synergy_classify' entry with .strict() refusal of unknown keys", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["synergy_classify" as AIReasoningAction];
    expect(schema === undefined).toBe(false);
    const r = (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
      features: {
        semantic_match: 0.5,
        novelty_strength: 0.5,
        ai_priority_score: 0.5,
        duplication_risk: 0.1,
        effort_estimate: 0.1,
        blast_radius: 0.1,
      },
      bogus_extra: true,
    });
    expect(r.success).toBe(false);
  });

  it("schema validates a well-formed single-feature payload", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["synergy_classify" as AIReasoningAction];
    const r = (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
      features: {
        semantic_match: 0.9,
        novelty_strength: 0.8,
        ai_priority_score: 0.7,
        duplication_risk: 0.1,
        effort_estimate: 0.2,
        blast_radius: 0.1,
      },
    });
    expect(r.success).toBe(true);
  });

  it("schema validates a well-formed batch payload", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["synergy_classify" as AIReasoningAction];
    const r = (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
      batch: [
        { semantic_match: 0.9, novelty_strength: 0.8, ai_priority_score: 0.7, duplication_risk: 0.1, effort_estimate: 0.2, blast_radius: 0.1 },
        { semantic_match: 0.2, novelty_strength: 0.2, ai_priority_score: 0.2, duplication_risk: 0.1, effort_estimate: 0.5, blast_radius: 0.5 },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("round-trip: empty payload ⇒ just rubricSchemaVersion (no verdict / batchResult)", async () => {
    const r = await executeAIReasoningAction("synergy_classify" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const data = r.data as {
      verdict?: unknown;
      batchResult?: unknown;
      rubricSchemaVersion: number;
    };
    expect(data.verdict).toBe(undefined);
    expect(data.batchResult).toBe(undefined);
    expect(data.rubricSchemaVersion).toBe(RUBRIC_SCHEMA_VERSION);
  });

  it("round-trip: single high-fit features ⇒ verdict.label='high'", async () => {
    const r = await executeAIReasoningAction("synergy_classify" as AIReasoningAction, {
      features: {
        semantic_match: 1.0,
        novelty_strength: 0.9,
        ai_priority_score: 0.9,
        duplication_risk: 0.05,
        effort_estimate: 0.1,
        blast_radius: 0.1,
      },
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      verdict: { label: string; score: number; reason: string };
    };
    expect(data.verdict.label).toBe("high");
    expect(data.verdict.reason).toBe("score_band");
    expect(data.verdict.score).toBeGreaterThanOrEqual(0.65);
  });

  it("round-trip: NaN feature ⇒ schema layer rejects with success=false (Zod z.number() refuses NaN)", async () => {
    // Defence-in-depth layering — the wire schema (Zod z.number()) is
    // the first defence: NaN is rejected before reaching the engine,
    // so a remote caller can never poison the catalog over the wire.
    // The engine's invalid_features veto (covered exhaustively in
    // SynergyClassifierEngine.test.ts) is the SECOND defence for
    // internal callers that construct feature vectors in-process.
    const r = await executeAIReasoningAction("synergy_classify" as AIReasoningAction, {
      features: {
        semantic_match: Number.NaN,
        novelty_strength: 0.9,
        ai_priority_score: 0.9,
        duplication_risk: 0,
        effort_estimate: 0,
        blast_radius: 0,
      },
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error as string).length).toBeGreaterThan(0);
  });

  it("round-trip: duplicate_veto fires for duplication_risk > 0.85", async () => {
    const r = await executeAIReasoningAction("synergy_classify" as AIReasoningAction, {
      features: {
        semantic_match: 1,
        novelty_strength: 1,
        ai_priority_score: 1,
        duplication_risk: 0.95,
        effort_estimate: 0,
        blast_radius: 0,
      },
    });
    expect(r.success).toBe(true);
    const data = r.data as { verdict: { label: string; reason: string } };
    expect(data.verdict.label).toBe("none");
    expect(data.verdict.reason).toBe("duplicate_veto");
  });

  it("round-trip: batch payload returns per-band counts", async () => {
    const r = await executeAIReasoningAction("synergy_classify" as AIReasoningAction, {
      batch: [
        { semantic_match: 1, novelty_strength: 1, ai_priority_score: 1, duplication_risk: 0, effort_estimate: 0, blast_radius: 0 }, // high
        { semantic_match: 0.1, novelty_strength: 0.1, ai_priority_score: 0.1, duplication_risk: 0, effort_estimate: 0, blast_radius: 0 }, // none
        { semantic_match: 1, novelty_strength: 1, ai_priority_score: 1, duplication_risk: 0.95, effort_estimate: 0, blast_radius: 0 }, // duplicate_veto → none
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      batchResult: {
        results: Array<{ label: string }>;
        counts: { high: number; med: number; low: number; none: number };
      };
    };
    expect(data.batchResult.results.length).toBe(3);
    expect(data.batchResult.counts.high).toBe(1);
    expect(data.batchResult.counts.none).toBe(2);
  });

  it("round-trip rejects unknown extra key on params", async () => {
    const r = await executeAIReasoningAction("synergy_classify" as AIReasoningAction, {
      features: {
        semantic_match: 0.5,
        novelty_strength: 0.5,
        ai_priority_score: 0.5,
        duplication_risk: 0,
        effort_estimate: 0,
        blast_radius: 0,
      },
      mystery_field: true,
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("rubricSchemaVersion in result tracks engine.getRubric().schemaVersion", async () => {
    const r = await executeAIReasoningAction("synergy_classify" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const data = r.data as { rubricSchemaVersion: number };
    expect(data.rubricSchemaVersion).toBe(synergyClassifierEngine.getRubric().schemaVersion);
  });
});
