/**
 * Dispatcher round-trip wiring test — AUTO-LEARNING-LOOP-MS0 / U-ALL12
 * =====================================================================
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
  sourcePoisoningSanitizerEngine,
  ALLOWLIST_SCHEMA_VERSION,
} from "../engines/SourcePoisoningSanitizerEngine.js";

describe("prism_ai:source_poisoning_sanitize — wiring", () => {
  beforeEach(() => {
    sourcePoisoningSanitizerEngine.resetAll();
    sourcePoisoningSanitizerEngine.setAllowlist({
      schemaVersion: ALLOWLIST_SCHEMA_VERSION,
      sources: [{ slug: "rss-trusted", name: "Trusted" }],
    });
  });

  it("action enum includes 'source_poisoning_sanitize' exactly once", () => {
    const arr = AI_REASONING_ACTIONS as readonly string[];
    expect(arr.filter((a) => a === "source_poisoning_sanitize").length).toBe(1);
  });

  it("schema has entry with .strict()", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["source_poisoning_sanitize" as AIReasoningAction];
    expect(schema === undefined).toBe(false);
    const r = (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
      items: [{ source: "x", guid: "g", title: "t" }],
      bogus: true,
    });
    expect(r.success).toBe(false);
  });

  it("round-trip: clean item ⇒ in clean[]", async () => {
    const r = await executeAIReasoningAction("source_poisoning_sanitize" as AIReasoningAction, {
      items: [{ source: "rss-trusted", guid: "g1", title: "Headline" }],
    });
    expect(r.success).toBe(true);
    const data = r.data as { clean: unknown[]; quarantined?: unknown[]; passRate: number };
    expect(data.clean.length).toBe(1);
    expect((data.quarantined ?? []).length).toBe(0);
    expect(data.passRate).toBe(1.0);
  });

  it("round-trip: untrusted source ⇒ quarantined as not_allowlisted", async () => {
    const r = await executeAIReasoningAction("source_poisoning_sanitize" as AIReasoningAction, {
      items: [{ source: "evil", guid: "g1", title: "Bad" }],
    });
    expect(r.success).toBe(true);
    const data = r.data as { quarantined: Array<{ reason: string }>; clean?: unknown[] };
    expect(data.quarantined[0].reason).toBe("not_allowlisted");
    expect((data.clean ?? []).length).toBe(0);
  });

  it("round-trip: prompt-injection ⇒ quarantined", async () => {
    const r = await executeAIReasoningAction("source_poisoning_sanitize" as AIReasoningAction, {
      items: [{ source: "rss-trusted", guid: "g1", title: "<|im_start|>evil" }],
    });
    expect(r.success).toBe(true);
    const data = r.data as { quarantined: Array<{ reason: string }> };
    expect(data.quarantined[0].reason).toBe("prompt_injection");
  });

  it("round-trip rejects unknown extra key", async () => {
    const r = await executeAIReasoningAction("source_poisoning_sanitize" as AIReasoningAction, {
      items: [{ source: "rss-trusted", guid: "g1", title: "t" }],
      mystery: true,
    });
    expect(r.success).toBe(false);
  });
});
