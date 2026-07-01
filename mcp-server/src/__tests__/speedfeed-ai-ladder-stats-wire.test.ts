/**
 * MS-CRITWIRE/U-CW-06
 *
 * Engine-surface contract test for the SF-AI L2/L3 introspection wire into
 * prism_calc:speedfeed_advanced_ai_stats / speedfeed_ultimate_ai_stats.
 *
 * Completes the L1-L3 SF-AI introspection ladder begun by speedfeed_dl_stats (L1,
 * U-WIRE-BACKLOG-SF-PARTIAL-L1-STATS). R12-safe by design: the wired surface is the
 * engines' deterministic stats() introspection — query counts, AI-capability
 * inventory, episodic-memory / knowledge-graph sizes — NOT NN inference.
 * SpeedFeedUltimateAIEngine has 13 Math.random() sites and its inference output is
 * untrained until U-AITRAIN-SPEEDFEED ships; this test only exercises stats(),
 * which reads counters and capability lists and is therefore deterministic.
 *
 * Sister to [[reference_iter3_misattribution_2026_05_20]] — the L1 wire used the
 * identical R12-safe "expose introspection, not inference" pattern.
 */
import { describe, it, expect } from "vitest";
import { speedFeedAdvancedAIEngine } from "../engines/SpeedFeedAdvancedAIEngine.js";
import { speedFeedUltimateAIEngine } from "../engines/SpeedFeedUltimateAIEngine.js";

describe("U-CW-06 — SF-AI L2 (Advanced) stats introspection", () => {
  it("stats() returns queries_processed as a non-negative number", () => {
    const s = speedFeedAdvancedAIEngine.stats();
    expect(typeof s.queries_processed).toBe("number");
    expect(s.queries_processed).toBeGreaterThanOrEqual(0);
  });

  it("stats() returns a non-empty ai_capabilities string array", () => {
    const s = speedFeedAdvancedAIEngine.stats();
    expect(Array.isArray(s.ai_capabilities)).toBe(true);
    expect(s.ai_capabilities.length).toBeGreaterThan(0);
    expect(s.ai_capabilities.every((c) => typeof c === "string")).toBe(true);
  });

  it("stats() returns a non-empty reasoning_frameworks string array", () => {
    const s = speedFeedAdvancedAIEngine.stats();
    expect(Array.isArray(s.reasoning_frameworks)).toBe(true);
    expect(s.reasoning_frameworks.length).toBeGreaterThan(0);
    expect(s.reasoning_frameworks.every((f) => typeof f === "string")).toBe(true);
  });

  it("stats() is deterministic — two consecutive calls yield equal results", () => {
    const a = speedFeedAdvancedAIEngine.stats();
    const b = speedFeedAdvancedAIEngine.stats();
    expect(b.ai_capabilities).toEqual(a.ai_capabilities);
    expect(b.reasoning_frameworks).toEqual(a.reasoning_frameworks);
    // stats() reads queryCount but must not increment it — introspection, not a query.
    expect(b.queries_processed).toBe(a.queries_processed);
  });
});

describe("U-CW-06 — SF-AI L3 (Ultimate) stats introspection", () => {
  it("stats() returns queries_processed as a non-negative number", () => {
    const s = speedFeedUltimateAIEngine.stats();
    expect(typeof s.queries_processed).toBe("number");
    expect(s.queries_processed).toBeGreaterThanOrEqual(0);
  });

  it("stats() reports a positive ai_systems count", () => {
    const s = speedFeedUltimateAIEngine.stats();
    expect(typeof s.ai_systems).toBe("number");
    expect(s.ai_systems).toBeGreaterThan(0);
  });

  it("stats() episodic_memory has numeric total_episodes and a success_rate in [0,1]", () => {
    const s = speedFeedUltimateAIEngine.stats();
    expect(typeof s.episodic_memory.total_episodes).toBe("number");
    expect(s.episodic_memory.total_episodes).toBeGreaterThanOrEqual(0);
    expect(s.episodic_memory.success_rate).toBeGreaterThanOrEqual(0);
    expect(s.episodic_memory.success_rate).toBeLessThanOrEqual(1);
  });

  it("stats() knowledge_graph reports non-negative node and edge counts", () => {
    const s = speedFeedUltimateAIEngine.stats();
    expect(s.knowledge_graph.nodes).toBeGreaterThanOrEqual(0);
    expect(s.knowledge_graph.edges).toBeGreaterThanOrEqual(0);
  });

  it("stats() working_memory.context is a string", () => {
    const s = speedFeedUltimateAIEngine.stats();
    expect(typeof s.working_memory.context).toBe("string");
  });

  it("stats() does not throw on a fresh engine and is shape-stable across calls", () => {
    expect(() => speedFeedUltimateAIEngine.stats()).not.toThrow();
    const a = speedFeedUltimateAIEngine.stats();
    const b = speedFeedUltimateAIEngine.stats();
    expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort());
    expect(b.ai_systems).toBe(a.ai_systems);
    // stats() reads queryCount but must not increment it — introspection, not a query.
    expect(b.queries_processed).toBe(a.queries_processed);
  });
});
