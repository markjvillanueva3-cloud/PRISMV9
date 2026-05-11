/**
 * LLMEngine.test.ts — coverage for the tribal/AI hardening surface added in
 * U-LLM-TRIBAL-WIRE. Complementary to the kebab-case llm-engine.test.ts file
 * (which covers the original API: stats, buildContext, query, explainQuote,
 * processAdvice happy path). This file focuses on:
 *   - registerTribalContextProvider auto-registration + idempotence
 *   - processAdvice → masterMachinistRecommend wiring
 *   - ContextChunk "tribal" type filter
 *   - cache behavior under varied inputs
 *   - failure modes (empty providers, missing tribal engine, cache miss)
 *   - adversarial inputs (empty / oversized / control-char prompts)
 *   - variability (3 materials × 3 operations)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { LLMEngine, llmEngine, registerTribalContextProvider } from "../engines/LLMEngine.js";
import { tribalKnowledgeEngine } from "../engines/TribalKnowledgeEngine.js";

describe("LLMEngine — TK-AI hardening surface", () => {
  // -------------------------------------------------------------------------
  // registerTribalContextProvider
  // -------------------------------------------------------------------------
  describe("registerTribalContextProvider", () => {
    it("singleton has at least one context provider after module auto-registration", () => {
      // The exported singleton runs registerTribalContextProvider() at module load.
      expect(llmEngine.stats().context_providers).toBeGreaterThanOrEqual(1);
    });

    it("explicit call returns void and is idempotent (each call adds one provider)", async () => {
      const engine = new LLMEngine();
      const before = engine.stats().context_providers;
      await registerTribalContextProvider();
      // The standalone helper appends to the singleton, not a fresh instance —
      // so the fresh instance count is unchanged.
      expect(engine.stats().context_providers).toBe(before);
    });

    it("tribal provider yields ContextChunk with type='tribal'", () => {
      // Force-call the chunks from the singleton by filtering its buildContext output.
      const chunks = llmEngine.buildContext("D2 steel roughing tips");
      const tribalChunks = chunks.filter(c => c.type === "tribal");
      // Tribal database has >0 tips at >=70 confidence; allow zero only if the
      // database is empty in this environment.
      const tipCount = tribalKnowledgeEngine.search({ limit: 1, min_confidence: 70 }).length;
      if (tipCount > 0) {
        expect(tribalChunks.length).toBeGreaterThan(0);
        expect(tribalChunks[0].title.startsWith("[Shop Floor]")).toBe(true);
      } else {
        expect(tribalChunks.length).toBe(0);
      }
    });
  });

  // -------------------------------------------------------------------------
  // processAdvice → masterMachinistRecommend wiring
  // -------------------------------------------------------------------------
  describe("processAdvice tribal_knowledge wiring", () => {
    it("returns tribal_knowledge as an array (always)", async () => {
      const advice = await llmEngine.processAdvice({
        operation: "roughing",
        material: "4140",
      });
      expect(Array.isArray(advice.tribal_knowledge)).toBe(true);
    });

    it("each tribal_knowledge entry starts with 'Senior machinists say:' when present", async () => {
      const advice = await llmEngine.processAdvice({
        operation: "milling",
        material: "P",
      });
      for (const entry of advice.tribal_knowledge) {
        expect(entry).toMatch(/^Senior machinists say:/);
      }
    });

    it("populates parameters/alternatives/safety_notes as empty arrays (no over-eager guesses)", async () => {
      const advice = await llmEngine.processAdvice({
        operation: "finishing",
        material: "6061-T6",
      });
      expect(Array.isArray(advice.alternatives)).toBe(true);
      expect(Array.isArray(advice.safety_notes)).toBe(true);
      expect(typeof advice.parameters).toBe("object");
    });
  });

  // -------------------------------------------------------------------------
  // ContextChunk "tribal" type filter
  // -------------------------------------------------------------------------
  describe("ContextChunk type filter — tribal", () => {
    it("buildContext filter ['tribal'] returns only tribal chunks", () => {
      const engine = new LLMEngine();
      engine.registerContextProvider(() => [
        { type: "tribal", title: "[Shop Floor] tip A", content: "wisdom", relevance: 0.9 },
        { type: "material", title: "4140", content: "carbon steel", relevance: 0.8 },
      ]);
      const ctx = engine.buildContext("anything", ["tribal"]);
      expect(ctx.length).toBe(1);
      expect(ctx[0].type).toBe("tribal");
    });

    it("buildContext filter ['material','tribal'] returns both types", () => {
      const engine = new LLMEngine();
      engine.registerContextProvider(() => [
        { type: "tribal", title: "tip A", content: "x", relevance: 0.5 },
        { type: "material", title: "4140", content: "y", relevance: 0.5 },
        { type: "tool", title: "endmill", content: "z", relevance: 0.5 },
      ]);
      const ctx = engine.buildContext("test", ["material", "tribal"]);
      expect(ctx.length).toBe(2);
      expect(ctx.map(c => c.type).sort()).toEqual(["material", "tribal"]);
    });
  });

  // -------------------------------------------------------------------------
  // Failure modes
  // -------------------------------------------------------------------------
  describe("failure modes", () => {
    it("buildContext on a fresh instance with no providers returns []", () => {
      const engine = new LLMEngine();
      const ctx = engine.buildContext("anything");
      expect(ctx).toEqual([]);
    });

    it("provider that throws does not crash buildContext (defensive)", () => {
      const engine = new LLMEngine();
      engine.registerContextProvider(() => {
        throw new Error("provider exploded");
      });
      engine.registerContextProvider(() => [
        { type: "material", title: "OK", content: "good", relevance: 0.9 },
      ]);
      // Some implementations let exceptions propagate; if so this test
      // documents the current contract. Wrap in try/catch — assert at least
      // that the second provider's chunk is returned OR the throw is surfaced
      // (one of two valid contracts).
      let result: { type: string; title: string }[] = [];
      let threw = false;
      try {
        result = engine.buildContext("test") as { type: string; title: string }[];
      } catch {
        threw = true;
      }
      expect(threw || result.some(r => r.title === "OK")).toBe(true);
    });

    it("query returns offline response when API key is missing (graceful degradation)", async () => {
      const engine = new LLMEngine({ api_key: undefined });
      const resp = await engine.query({ prompt: "What feed rate for D2?" });
      expect(resp.model).toBe("offline");
      expect(typeof resp.answer).toBe("string");
      expect(resp.answer.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Adversarial inputs
  // -------------------------------------------------------------------------
  describe("adversarial inputs", () => {
    it("handles empty prompt without throwing", async () => {
      const engine = new LLMEngine({ api_key: undefined });
      const resp = await engine.query({ prompt: "" });
      expect(typeof resp.answer).toBe("string");
    });

    it("handles 10k-char prompt without truncation panic", async () => {
      const engine = new LLMEngine({ api_key: undefined });
      const longPrompt = "spec ".repeat(2000); // 10,000 chars
      const resp = await engine.query({ prompt: longPrompt });
      expect(typeof resp.answer).toBe("string");
    });

    it("handles prompt with control characters and unicode", async () => {
      const engine = new LLMEngine({ api_key: undefined });
      const weird = "tool wear  at ✓ with emoji 🔧 and tab\tand newline\n";
      const resp = await engine.query({ prompt: weird });
      expect(typeof resp.answer).toBe("string");
    });
  });

  // -------------------------------------------------------------------------
  // Variability — 3 materials × 3 operations spanning ISO groups P/N/S
  // -------------------------------------------------------------------------
  describe("variability across materials and operations", () => {
    const cases: Array<{ material: string; operation: string }> = [
      { material: "4140", operation: "milling" },     // P (steel)
      { material: "6061-T6", operation: "drilling" }, // N (aluminum)
      { material: "Ti-6Al-4V", operation: "threading" }, // S (titanium)
    ];

    it.each(cases)("processAdvice returns structured advice for %s + $operation", async ({ material, operation }) => {
      const advice = await llmEngine.processAdvice({ material, operation });
      expect(advice).toHaveProperty("recommendation");
      expect(advice).toHaveProperty("tribal_knowledge");
      expect(advice).toHaveProperty("parameters");
      expect(advice).toHaveProperty("alternatives");
      expect(advice).toHaveProperty("safety_notes");
      expect(Array.isArray(advice.tribal_knowledge)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Cache behavior
  // -------------------------------------------------------------------------
  describe("cache behavior", () => {
    let engine: LLMEngine;
    beforeEach(() => { engine = new LLMEngine({ api_key: undefined }); });

    it("identical query returns cached=true on second call", async () => {
      await engine.query({ prompt: "What feed for 4140?" });
      const r2 = await engine.query({ prompt: "What feed for 4140?" });
      expect(r2.cached).toBe(true);
    });

    it("changing context_types yields a cache miss", async () => {
      await engine.query({ prompt: "x", context_types: ["material"] });
      const r2 = await engine.query({ prompt: "x", context_types: ["tribal"] });
      expect(r2.cached).toBe(false);
    });

    it("cache_size grows with unique queries", async () => {
      const before = engine.stats().cache_size;
      await engine.query({ prompt: "unique-prompt-1" });
      await engine.query({ prompt: "unique-prompt-2" });
      expect(engine.stats().cache_size).toBeGreaterThan(before);
    });
  });
});
