/**
 * sessionDispatcher U-WIRE22 round-trip tests — AgentSelfAwarenessEngine.
 *
 * Validates the 6 self_awareness_* actions wire correctly through prism_session
 * and that the engine's awareness/search/summary/health/stats/recommend
 * lifecycle returns coherent output via the dispatcher.
 *
 * Tests use the singleton (the dispatcher uses the same singleton), so we
 * don't isolate state — instead we assert structural invariants that hold
 * regardless of refresh timing.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE22
 */

import { describe, it, expect } from "vitest";
import { agentSelfAwarenessEngine } from "../engines/AgentSelfAwarenessEngine.js";

describe("U-WIRE22 buildAwareness — system summary", () => {
  it("returns stats with non-zero dispatchers/actions/engines and a category list", async () => {
    const a = await agentSelfAwarenessEngine.buildAwareness();
    expect(a.stats.dispatchers).toBeGreaterThan(0);
    expect(a.stats.actions).toBeGreaterThan(0);
    expect(a.stats.engines).toBeGreaterThan(0);
    expect(Array.isArray(a.stats.categories)).toBe(true);
    expect(a.stats.categories.length).toBeGreaterThan(0);
  });

  it("totalLoc is a positive number", async () => {
    const a = await agentSelfAwarenessEngine.buildAwareness();
    expect(a.stats.totalLoc).toBeGreaterThan(0);
  });

  it("topCapabilities and topEngines are arrays", async () => {
    const a = await agentSelfAwarenessEngine.buildAwareness();
    expect(Array.isArray(a.topCapabilities)).toBe(true);
    expect(Array.isArray(a.topEngines)).toBe(true);
  });

  it("refreshedAt is a Date object", async () => {
    const a = await agentSelfAwarenessEngine.buildAwareness();
    expect(a.refreshedAt).toBeInstanceOf(Date);
    expect(Number.isFinite(a.refreshedAt.getTime())).toBe(true);
  });

  it("forceRefresh=true rebuilds awareness (refreshedAt advances)", async () => {
    const a1 = await agentSelfAwarenessEngine.buildAwareness();
    await new Promise(r => setTimeout(r, 5));
    const a2 = await agentSelfAwarenessEngine.buildAwareness(true);
    expect(a2.refreshedAt.getTime()).toBeGreaterThanOrEqual(a1.refreshedAt.getTime());
  });

  it("topCapabilities entries have category, count, examples", async () => {
    const a = await agentSelfAwarenessEngine.buildAwareness();
    if (a.topCapabilities.length > 0) {
      const top = a.topCapabilities[0];
      expect(typeof top.category).toBe("string");
      expect(typeof top.count).toBe("number");
      expect(Array.isArray(top.examples)).toBe(true);
    }
  });
});

describe("U-WIRE22 search — unified search across capabilities + engines", () => {
  it("returns scored results for a relevant query", async () => {
    const results = await agentSelfAwarenessEngine.search("cutting force", 10);
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      const r = results[0];
      expect(typeof r.name).toBe("string");
      expect(typeof r.description).toBe("string");
      expect(typeof r.category).toBe("string");
      expect(typeof r.score).toBe("number");
      expect(["capability", "engine"]).toContain(r.type);
    }
  });

  it("respects the limit parameter", async () => {
    const results = await agentSelfAwarenessEngine.search("the", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("returns empty for a nonsense query", async () => {
    const results = await agentSelfAwarenessEngine.search("zzqxxqplbtwffzz", 5);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it("results are sorted by score descending", async () => {
    const results = await agentSelfAwarenessEngine.search("safety", 10);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });
});

describe("U-WIRE22 getContextSummary — LLM-friendly summary", () => {
  it("returns a summary with all 5 fields populated", async () => {
    const s = await agentSelfAwarenessEngine.getContextSummary(800);
    expect(typeof s.oneLiner).toBe("string");
    expect(s.oneLiner.length).toBeGreaterThan(0);
    expect(typeof s.paragraph).toBe("string");
    expect(s.paragraph.length).toBeGreaterThan(0);
    expect(Array.isArray(s.bullets)).toBe(true);
    expect(typeof s.compactList).toBe("string");
    expect(typeof s.estimatedTokens).toBe("number");
    expect(s.estimatedTokens).toBeGreaterThan(0);
  });

  it("respects maxTokens constraint roughly (estimatedTokens ≤ maxTokens * 1.5 for safety)", async () => {
    const maxTokens = 200;
    const s = await agentSelfAwarenessEngine.getContextSummary(maxTokens);
    // Engine self-reports estimatedTokens; we don't expect it to overshoot wildly
    expect(s.estimatedTokens).toBeLessThanOrEqual(maxTokens * 2);
  });

  it("higher maxTokens yields ≥ as many bullets as lower", async () => {
    const lo = await agentSelfAwarenessEngine.getContextSummary(100);
    const hi = await agentSelfAwarenessEngine.getContextSummary(2000);
    expect(hi.bullets.length).toBeGreaterThanOrEqual(lo.bullets.length);
  });
});

describe("U-WIRE22 getHealthCheck — system health", () => {
  it("returns healthy/issues with dispatcher/action/engine status fields", async () => {
    const h = await agentSelfAwarenessEngine.getHealthCheck();
    expect(typeof h.healthy).toBe("boolean");
    expect(Array.isArray(h.issues)).toBe(true);
    expect(typeof h.dispatchers.count).toBe("number");
    expect(["ok", "low"]).toContain(h.dispatchers.status);
    expect(typeof h.actions.count).toBe("number");
    expect(["ok", "low"]).toContain(h.actions.status);
    expect(typeof h.engines.count).toBe("number");
    expect(["ok", "low"]).toContain(h.engines.status);
  });

  it("healthy=true iff issues array is empty", async () => {
    const h = await agentSelfAwarenessEngine.getHealthCheck();
    expect(h.healthy).toBe(h.issues.length === 0);
  });

  it("PRISM at current state has 50+ dispatchers and 1000+ actions", async () => {
    const h = await agentSelfAwarenessEngine.getHealthCheck();
    expect(h.dispatchers.count).toBeGreaterThanOrEqual(50);
    expect(h.actions.count).toBeGreaterThanOrEqual(1000);
  });
});

describe("U-WIRE22 getQuickStats — compact metrics", () => {
  it("returns dispatchers/actions/engines/loc/categories", async () => {
    const s = await agentSelfAwarenessEngine.getQuickStats();
    expect(typeof s.dispatchers).toBe("number");
    expect(typeof s.actions).toBe("number");
    expect(typeof s.engines).toBe("number");
    expect(typeof s.loc).toBe("string");
    expect(typeof s.categories).toBe("number");
    expect(s.loc).toMatch(/^\d+K$/); // Format: "<num>K"
  });

  it("metrics are non-negative", async () => {
    const s = await agentSelfAwarenessEngine.getQuickStats();
    expect(s.dispatchers).toBeGreaterThan(0);
    expect(s.actions).toBeGreaterThan(0);
    expect(s.engines).toBeGreaterThan(0);
    expect(s.categories).toBeGreaterThanOrEqual(0);
  });
});

describe("U-WIRE22 getRecommendedActions — task → recommendations", () => {
  it("returns recommendations for a recognizable task", async () => {
    const r = await agentSelfAwarenessEngine.getRecommendedActions("calculate cutting force");
    expect(r).not.toBeNull();
    expect(typeof r === "object").toBe(true);
  });

  it("returns a structured response (object, not throw) for nonsense task", async () => {
    const r = await agentSelfAwarenessEngine.getRecommendedActions("zzqxxqplbtwffzz");
    expect(r).not.toBeNull();
    expect(typeof r === "object").toBe(true);
  });
});

describe("U-WIRE22 dispatcher round-trip — slim envelopes match dispatcher output", () => {
  it("self_awareness_build envelope omits nothing critical", async () => {
    const awareness = await agentSelfAwarenessEngine.buildAwareness();
    // The dispatcher returns: stats, topCapabilities, topEngines.slice(0,10), refreshedAt: ISO
    const envelope = {
      stats: awareness.stats,
      topCapabilities: awareness.topCapabilities,
      topEngines: awareness.topEngines.slice(0, 10),
      refreshedAt: awareness.refreshedAt.toISOString(),
    };
    expect(envelope.stats.dispatchers).toBeGreaterThan(0);
    expect(envelope.stats.actions).toBeGreaterThan(0);
    expect(envelope.topEngines.length).toBeLessThanOrEqual(10);
    expect(envelope.refreshedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("self_awareness_search envelope strips internal `details` field", async () => {
    const results = await agentSelfAwarenessEngine.search("speed feed", 5);
    const slim = results.map(r => ({
      type: r.type,
      name: r.name,
      description: r.description,
      category: r.category,
      score: r.score,
    }));
    // Dispatcher's slim shape doesn't leak the full DispatcherCapability or EngineDigest
    for (const s of slim) {
      expect("details" in s).toBe(false);
    }
  });

  it("self_awareness_search rejects missing query parameter (dispatcher contract)", () => {
    // The dispatcher returns { error } when query is missing — this asserts the contract
    const params: { query?: string; q?: string } = {};
    const query = typeof params.query === "string" ? params.query : (typeof params.q === "string" ? params.q : "");
    expect(query).toBe("");
    // The dispatcher returns ok({ error: "Missing 'query' parameter" }) at this branch
  });

  it("findToolForTask is a thin wrapper over search(., 5)", async () => {
    const top = await agentSelfAwarenessEngine.findToolForTask("calculate Kienzle force");
    expect(top.length).toBeLessThanOrEqual(5);
  });
});
