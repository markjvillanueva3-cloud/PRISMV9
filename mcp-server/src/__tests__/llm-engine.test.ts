/**
 * Tests for LLMEngine — AI-MS0
 */
import { describe, it, expect } from "vitest";
import { LLMEngine } from "../engines/LLMEngine.js";

describe("LLMEngine", () => {
  it("creates instance", () => {
    const engine = new LLMEngine();
    expect(engine).toBeDefined();
  });

  it("stats returns initial state", () => {
    const engine = new LLMEngine();
    const stats = engine.stats();
    expect(stats.query_count).toBe(0);
    expect(stats.cache_size).toBe(0);
    expect(stats.context_providers).toBe(0);
    expect(stats.model).toBe("claude-sonnet-4-6");
  });

  it("registers context providers", () => {
    const engine = new LLMEngine();
    engine.registerContextProvider(() => [
      { type: "material", title: "6061-T6", content: "Aluminum", relevance: 0.9 },
    ]);
    expect(engine.stats().context_providers).toBe(1);
  });

  it("buildContext returns ranked chunks", () => {
    const engine = new LLMEngine();
    engine.registerContextProvider(() => [
      { type: "material", title: "6061-T6 Aluminum", content: "Density 2700", relevance: 0.5 },
      { type: "material", title: "4140 Steel", content: "HRC 28-32", relevance: 0.8 },
      { type: "tool", title: "End Mill 12mm", content: "4 flute TiAlN", relevance: 0.3 },
    ]);

    const ctx = engine.buildContext("steel machining");
    expect(ctx.length).toBe(3);
    // Steel should be boosted by keyword match
    expect(ctx[0].title).toContain("Steel");
  });

  it("buildContext filters by type", () => {
    const engine = new LLMEngine();
    engine.registerContextProvider(() => [
      { type: "material", title: "6061-T6", content: "Al", relevance: 0.9 },
      { type: "tool", title: "EM 12mm", content: "Carbide", relevance: 0.9 },
    ]);

    const ctx = engine.buildContext("test", ["material"]);
    expect(ctx.length).toBe(1);
    expect(ctx[0].type).toBe("material");
  });

  it("query returns offline response without API key", async () => {
    const engine = new LLMEngine({ api_key: undefined, prefer: "claude" });
    engine.registerContextProvider(() => [
      { type: "material", title: "Test Material", content: "Info", relevance: 0.9 },
    ]);

    const resp = await engine.query({ prompt: "What speed for steel?" });
    expect(resp.model).toBe("offline");
    expect(resp.answer).toContain("Test Material");
    expect(resp.context_used.length).toBeGreaterThan(0);
    expect(resp.cached).toBe(false);
  });

  it("explainQuote returns structured explanation", async () => {
    const engine = new LLMEngine({ api_key: undefined, prefer: "claude" });
    const explanation = await engine.explainQuote({
      part_name: "Bracket",
      material: "6061-T6",
      quantity: 100,
      total_price: 2500,
      cycle_time_min: 12,
      setup_time_min: 45,
      material_cost: 350,
      machine_rate_hr: 85,
    });

    expect(explanation.cost_drivers.length).toBeGreaterThan(0);
    expect(explanation.comparison).toContain("$25.00/part");
    expect(explanation.confidence).toBeGreaterThan(0);
  });

  it("processAdvice returns structured advice", async () => {
    const engine = new LLMEngine({ api_key: undefined, prefer: "claude" });
    const advice = await engine.processAdvice({
      operation: "pocket milling",
      material: "6061-T6 Aluminum",
      tool: "12mm 3-flute carbide",
    });

    expect(advice.recommendation).toBeDefined();
    expect(typeof advice.recommendation).toBe("string");
  });

  it("exports singleton", async () => {
    const { llmEngine } = await import("../engines/LLMEngine.js");
    expect(llmEngine).toBeDefined();
    expect(llmEngine).toBeInstanceOf(LLMEngine);
  });
});
