/**
 * U-MODEL-ATTRIBUTION-WIRE — wire the orphaned ModelAttributionEngine (0 dispatcher refs;
 * the only consumer was its own unit test — stop_on_unwired_assets) into sessionDispatcher
 * (prism_session) as model_attribution_{record,summary,recent,find,badge}. Round-trips the
 * REAL dispatcher (registerSessionDispatcher → fakeServer handler) through the model-provenance
 * ledger and asserts the recorded entries + aggregated summary + recent slice + find + badge
 * land in the JSON response. No mocks of the system-under-test.
 *
 * slot:bravo /loop (2026-06-02, claude-5e210e4e) — hermes-zulu mandate (model orchestration:
 * "which model/provenance answered" is fleet accountability).
 * @module __tests__/sessionDispatcher.model-attribution-wire
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

describe("prism_session::model_attribution_* (ModelAttributionEngine round-trip)", () => {
  type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: "text"; text: string }>;
  }>;
  let invoke: (action: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

  beforeAll(() => {
    let captured: Handler | undefined;
    const fakeServer = {
      tool: (_n: string, _d: string, _s: unknown, handler: Handler) => {
        // sessionDispatcher registers exactly one tool (prism_session) — capture its handler.
        captured = handler;
      },
    };
    registerSessionDispatcher(fakeServer);
    if (!captured) throw new Error("registerSessionDispatcher did not register the prism_session tool");
    const h = captured;
    invoke = async (action, params = {}) =>
      JSON.parse((await h({ action, params })).content[0].text) as Record<string, unknown>;
  });

  it("records attributions and aggregates summary/recent/find through the real dispatcher", async () => {
    const rec = (entry: Record<string, unknown>) => invoke("model_attribution_record", { entry });
    const r1 = await rec({ responseId: "r-claude-1", model: "claude-opus-4-8", provenance: "claude", tokensIn: 100, tokensOut: 200, latencyMs: 42 });
    await rec({ responseId: "r-local-1", model: "qwen2.5-coder:7b", provenance: "local", tokensIn: 50, tokensOut: 80, latencyMs: 300 });
    await rec({ responseId: "r-heur-1", model: "kienzle-heuristic", provenance: "heuristic", tokensIn: 0, tokensOut: 0, latencyMs: 1 });

    // record echoes back the stored record with an engine-set `at` ISO timestamp.
    const stored = r1.record as { responseId: string; at: string; model: string };
    expect(stored.responseId).toBe("r-claude-1");
    expect(typeof stored.at).toBe("string");
    expect(stored.model).toBe("claude-opus-4-8");

    // summary aggregates by model + provenance (verifies the aggregation, not a stub).
    const sum = (await invoke("model_attribution_summary")).summary as {
      byModel: Record<string, { calls: number; tokensIn: number; tokensOut: number; avgLatencyMs: number }>;
      byProvenance: Record<string, number>;
      totalCalls: number;
    };
    expect(sum.totalCalls).toBeGreaterThanOrEqual(3);
    expect(sum.byProvenance.claude).toBeGreaterThanOrEqual(1);
    expect(sum.byProvenance.local).toBeGreaterThanOrEqual(1);
    expect(sum.byProvenance.heuristic).toBeGreaterThanOrEqual(1);
    expect(sum.byModel["claude-opus-4-8"].calls).toBeGreaterThanOrEqual(1);
    expect(sum.byModel["claude-opus-4-8"].tokensOut).toBeGreaterThanOrEqual(200);

    // recent returns the most-recent N (engine does records.slice(-limit)).
    const recent = (await invoke("model_attribution_recent", { limit: 2 })).records as Array<{ responseId: string }>;
    expect(Array.isArray(recent)).toBe(true);
    expect(recent.length).toBe(2);
    expect(recent[recent.length - 1].responseId).toBe("r-heur-1"); // last-recorded is most recent

    // find resolves a known responseId.
    const found = (await invoke("model_attribution_find", { responseId: "r-local-1" })).record as { model: string };
    expect(found.model).toBe("qwen2.5-coder:7b");
  });

  it("find on an unknown responseId yields no record; badge formats model + latency + provenance", async () => {
    // engine returns null for a miss; slimResponse drops null → `record` key absent.
    const miss = await invoke("model_attribution_find", { responseId: "nonexistent-zzz" });
    expect(miss.record ?? null).toBeNull();

    // buildBadge → "[<provenance-tag><model> · <latencyMs>ms]" (the /aware-skill display badge).
    const badge = (await invoke("model_attribution_badge", { model: "claude-opus-4-8", provenance: "claude", latencyMs: 42 })).badge as string;
    expect(typeof badge).toBe("string");
    expect(badge).toContain("claude-opus-4-8");
    expect(badge).toContain("42ms");
    expect(badge).toContain("claude"); // provenance tag present
  });
});
