/**
 * Dispatcher round-trip wiring test — AUTO-LEARNING-LOOP-MS0 / U-ALL03
 * ====================================================================
 *
 * Verifies that `prism_ai:auto_research_dispatch` is reachable
 * end-to-end:
 *   1. Action enum entry exists in AI_REASONING_ACTIONS.
 *   2. Schema entry exists in ACTION_AI_REASONING_SCHEMAS with
 *      `.strict()` refusal of unknown keys.
 *   3. Switch case in dispatcher actually routes to
 *      AutoResearchOrchestratorEngine.enqueue / flush.
 *   4. Result envelope shape matches the documented contract:
 *      `{ enqueue?, flush?, stats, dailyUsage, dispatchConfigured }`.
 *   5. flush=true on an unconfigured engine returns
 *      reason:"no_dispatch_configured" rather than throwing.
 *   6. enqueue dedupes pending across two calls to the singleton.
 *
 * The engine's algorithm is exhaustively covered in
 * AutoResearchOrchestratorEngine.test.ts — this file ONLY verifies
 * the wiring surface (import + call + schema + result envelope).
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
import { autoResearchOrchestratorEngine } from "../engines/AutoResearchOrchestratorEngine.js";

describe("prism_ai:auto_research_dispatch — wiring", () => {
  beforeEach(() => {
    // Singleton is shared across the dispatcher + CLI surfaces;
    // reset between cases so test ordering can't leak queue entries.
    autoResearchOrchestratorEngine.resetAll();
    autoResearchOrchestratorEngine.setDispatch(null);
  });

  it("action enum includes 'auto_research_dispatch' exactly once", () => {
    const arr = AI_REASONING_ACTIONS as readonly string[];
    expect(arr.includes("auto_research_dispatch")).toBe(true);
    expect(arr.filter((a) => a === "auto_research_dispatch").length).toBe(1);
  });

  it("schema map has an entry for 'auto_research_dispatch' with .strict() refusal of unknown keys", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["auto_research_dispatch" as AIReasoningAction];
    expect(schema === undefined).toBe(false);
    expect(schema === null).toBe(false);
    const r = (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
      items: [{ source: "s", guid: "g", title: "t" }],
      unknown_field: "should_reject",
    });
    expect(r.success).toBe(false);
  });

  it("schema validates a well-formed payload (success=true on safeParse)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["auto_research_dispatch" as AIReasoningAction];
    const r = (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
      items: [{ source: "rss", guid: "g1", title: "Some title" }],
      flush: true,
    });
    expect(r.success).toBe(true);
  });

  it("schema allows flush-only payload (no items)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["auto_research_dispatch" as AIReasoningAction];
    const r = (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse({
      flush: true,
    });
    expect(r.success).toBe(true);
  });

  it("round-trip: empty payload ⇒ success:true, just stats + dailyUsage", async () => {
    const r = await executeAIReasoningAction("auto_research_dispatch" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const data = r.data as {
      enqueue?: unknown;
      flush?: unknown;
      stats: { pending: number; inFlight: number; completed: number; deadLetter: number };
      dailyUsage: { used: number; budget: number; remaining: number; dayKey: string };
      dispatchConfigured: boolean;
    };
    expect(data.enqueue).toBe(undefined);
    expect(data.flush).toBe(undefined);
    expect(data.stats.pending).toBe(0);
    expect(data.dailyUsage.used).toBe(0);
    expect(data.dispatchConfigured).toBe(false);
  });

  it("round-trip: enqueue 2 items ⇒ enqueue.added=2, stats.pending=2", async () => {
    const r = await executeAIReasoningAction("auto_research_dispatch" as AIReasoningAction, {
      items: [
        { source: "rss", guid: "g1", title: "First" },
        { source: "rss", guid: "g2", title: "Second" },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      enqueue: { added: number; pendingAfter: number };
      flush?: unknown;
      stats: { pending: number };
    };
    expect(data.enqueue.added).toBe(2);
    expect(data.enqueue.pendingAfter).toBe(2);
    expect(data.flush).toBe(undefined);
    expect(data.stats.pending).toBe(2);
  });

  it("round-trip: enqueue then flush — flush returns no_dispatch_configured when engine has no DispatchFn wired", async () => {
    const r = await executeAIReasoningAction("auto_research_dispatch" as AIReasoningAction, {
      items: [{ source: "rss", guid: "g1", title: "T" }],
      flush: true,
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      flush: { dispatched: number; reason?: string };
      stats: { pending: number };
      dispatchConfigured: boolean;
    };
    expect(data.flush.dispatched).toBe(0);
    expect(data.flush.reason).toBe("no_dispatch_configured");
    expect(data.dispatchConfigured).toBe(false);
    // Item stays in pending because no dispatcher was wired.
    expect(data.stats.pending).toBe(1);
  });

  it("round-trip: with a DispatchFn injected, flush actually dispatches", async () => {
    autoResearchOrchestratorEngine.setDispatch(async () => ({ ok: true, content: "ok" }));
    const r = await executeAIReasoningAction("auto_research_dispatch" as AIReasoningAction, {
      items: [{ source: "rss", guid: "g1", title: "T" }],
      flush: true,
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      enqueue: { added: number };
      flush: { dispatched: number; outcomes: Array<{ outcome: { kind: string } }> };
      stats: { pending: number };
      dispatchConfigured: boolean;
    };
    expect(data.enqueue.added).toBe(1);
    expect(data.flush.dispatched).toBe(1);
    expect(data.flush.outcomes[0].outcome.kind).toBe("ok");
    expect(data.stats.pending).toBe(0);
    expect(data.dispatchConfigured).toBe(true);
  });

  it("round-trip: dedup against pending across two action calls (singleton survives)", async () => {
    await executeAIReasoningAction("auto_research_dispatch" as AIReasoningAction, {
      items: [{ source: "rss", guid: "g1", title: "T1" }],
    });
    const r2 = await executeAIReasoningAction("auto_research_dispatch" as AIReasoningAction, {
      items: [
        { source: "rss", guid: "g1", title: "T1-duplicate" },
        { source: "rss", guid: "g2", title: "T2" },
      ],
    });
    expect(r2.success).toBe(true);
    const data = r2.data as {
      enqueue: { added: number; dedupedAgainstPending: string[] };
      stats: { pending: number };
    };
    expect(data.enqueue.added).toBe(1);
    expect(data.enqueue.dedupedAgainstPending).toEqual(["g1"]);
    expect(data.stats.pending).toBe(2);
  });

  it("round-trip rejects unknown extra keys on params", async () => {
    const r = await executeAIReasoningAction("auto_research_dispatch" as AIReasoningAction, {
      items: [{ source: "s", guid: "g", title: "t" }],
      malicious_extra: true,
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error as string).length).toBeGreaterThan(0);
  });

  it("round-trip rejects item missing 'guid' via schema validation", async () => {
    const r = await executeAIReasoningAction("auto_research_dispatch" as AIReasoningAction, {
      items: [{ source: "s", title: "t" }],
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });
});
