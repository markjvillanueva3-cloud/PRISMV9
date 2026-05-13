/**
 * Dispatcher round-trip wiring test — AUTO-LEARNING-LOOP-MS0 / U-ALL02
 * =====================================================================
 *
 * Verifies that `prism_ai:novelty_detect` is reachable end-to-end:
 *   1. Action enum entry exists in AI_REASONING_ACTIONS
 *   2. Schema entry exists in ACTION_AI_REASONING_SCHEMAS
 *   3. Switch case in dispatcher actually routes to
 *      NoveltyDetectionEngine.detect()
 *   4. Result envelope shape matches expectations
 *   5. commit=true also invokes addVerifiedNovel
 *
 * The engine's algorithm is exhaustively covered in
 * NoveltyDetectionEngine.test.ts — this file only verifies the wiring
 * surface (import + call + schema + result envelope).
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
import { noveltyDetectionEngine } from "../engines/NoveltyDetectionEngine.js";

describe("prism_ai:novelty_detect — wiring", () => {
  beforeEach(() => {
    // The dispatcher uses the shared singleton; reset between cases so
    // test ordering can't leak catalog entries across runs.
    noveltyDetectionEngine.resetAll();
    noveltyDetectionEngine.setEmbedder(null);
  });

  it("action enum includes 'novelty_detect' exactly once", () => {
    const arr = AI_REASONING_ACTIONS as readonly string[];
    expect(arr.includes("novelty_detect")).toBe(true);
    expect(arr.filter((a) => a === "novelty_detect").length).toBe(1);
  });

  it("schema map has an entry for 'novelty_detect' with .strict() refusal of unknown keys", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["novelty_detect" as AIReasoningAction];
    expect(schema === undefined).toBe(false);
    expect(schema === null).toBe(false);
    // .strict() ⇒ unknown keys fail validation.
    const r = (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
      items: [{ source: "s", guid: "g", title: "t" }],
      unknown_field: "should_reject",
    });
    expect(r.success).toBe(false);
  });

  it("schema validates a well-formed payload (success=true on safeParse)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["novelty_detect" as AIReasoningAction];
    const r = (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
      items: [{ source: "rss", guid: "g1", title: "Some title" }],
      commit: true,
    });
    expect(r.success).toBe(true);
  });

  it("round-trip: empty input ⇒ success:true, zero-novel envelope, add absent", async () => {
    const r = await executeAIReasoningAction("novelty_detect" as AIReasoningAction, {
      items: [],
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      detect: { results?: unknown[]; novelCount: number; knownCount: number };
      add?: unknown;
      catalogLoaded: boolean;
    };
    // Note: slimResponse() strips empty arrays from envelopes, so
    // detect.results may be absent. Use scalars for the count assertions.
    expect((data.detect.results ?? []).length).toBe(0);
    expect(data.detect.novelCount).toBe(0);
    expect(data.detect.knownCount).toBe(0);
    expect(data.add).toBe(undefined);
    expect(data.catalogLoaded).toBe(false);
  });

  it("round-trip: 2 fresh items vs empty catalog ⇒ both flagged novel; engine catalog unchanged when commit omitted", async () => {
    const r = await executeAIReasoningAction("novelty_detect" as AIReasoningAction, {
      items: [
        { source: "rss", guid: "g1", title: "First item" },
        { source: "rss", guid: "g2", title: "Second item" },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      detect: { results: unknown[]; novelCount: number; knownCount: number };
      add: unknown;
      catalogLoaded: boolean;
    };
    expect(data.detect.novelCount).toBe(2);
    expect(data.detect.knownCount).toBe(0);
    expect(data.add).toBe(undefined);
    // No commit ⇒ engine catalog still empty.
    expect(noveltyDetectionEngine.getCatalog().entries.length).toBe(0);
  });

  it("round-trip with commit=true ⇒ novel items added; add envelope populated; catalog grows", async () => {
    const r = await executeAIReasoningAction("novelty_detect" as AIReasoningAction, {
      items: [
        { source: "rss", guid: "g1", title: "Brand new headline alpha" },
        { source: "rss", guid: "g2", title: "Brand new headline beta" },
      ],
      commit: true,
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      detect: { novelCount: number };
      add: { added: number; embeddedFailures?: string[]; skipped?: string[] };
      catalogLoaded: boolean;
    };
    expect(data.detect.novelCount).toBe(2);
    expect(data.add.added).toBe(2);
    // slimResponse strips empty arrays; absent ≡ length 0 for this contract.
    expect((data.add.embeddedFailures ?? []).length).toBe(0);
    expect((data.add.skipped ?? []).length).toBe(0);
    expect(noveltyDetectionEngine.getCatalog().entries.length).toBe(2);
  });

  it("round-trip rejects unknown extra keys on params (Zod .strict on params object)", async () => {
    const r = await executeAIReasoningAction("novelty_detect" as AIReasoningAction, {
      items: [{ source: "s", guid: "g", title: "t" }],
      malicious_extra: true,
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error as string).length).toBeGreaterThan(0);
  });

  it("round-trip rejects missing required field (items) with descriptive error", async () => {
    const r = await executeAIReasoningAction("novelty_detect" as AIReasoningAction, {});
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error as string).length).toBeGreaterThan(0);
  });
});
