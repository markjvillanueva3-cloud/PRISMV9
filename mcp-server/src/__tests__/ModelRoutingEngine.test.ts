/**
 * Tests for ModelRoutingEngine (PP-0.19-U-LLM7)
 *
 * Pure scoring engine — no network. Exercises:
 *   - hardware runsOn gating per profile
 *   - force pins (forceBackend / forceModel)
 *   - hard rules: requireSafety, safety_critical tier floor, embed, tools
 *   - budgets: latency + cost walls (including $0 = free-only)
 *   - scoring: safety_critical prefers highest quality, free+local wins when
 *     quality tie, cheap cloud wins over expensive cloud at similar quality
 *   - input validation
 *   - register() override
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ModelRoutingEngine,
  modelRoutingEngine,
  DEFAULT_MODEL_CATALOG,
  type RoutingRequest,
  type RoutingContext,
} from "../engines/ModelRoutingEngine.js";

const req = (overrides: Partial<RoutingRequest> = {}): RoutingRequest => ({
  taskKind: "chat",
  inputTokens: 500,
  outputTokensMax: 500,
  ...overrides,
});

const ctx = (overrides: Partial<RoutingContext> = {}): RoutingContext => ({
  hardware: "home_4080",
  ...overrides,
});

describe("ModelRoutingEngine", () => {
  let engine: ModelRoutingEngine;

  beforeEach(() => {
    engine = new ModelRoutingEngine();
  });

  describe("singleton + catalog", () => {
    it("exports a ready-to-use singleton", () => {
      expect(modelRoutingEngine).toBeInstanceOf(ModelRoutingEngine);
    });

    it("lists models from the default catalog", () => {
      expect(engine.listModels().length).toBe(DEFAULT_MODEL_CATALOG.length);
    });

    it("register() replaces an existing entry and adds new ones", () => {
      const before = engine.listModels().length;
      engine.register({
        id: "custom-test-model",
        backend: "ollama",
        paramsB: 1,
        vramGB: 4,
        qualityTier: 30,
        latencyMsTypical: 200,
        inputCostUSDPer1k: 0,
        outputCostUSDPer1k: 0,
        runsOn: ["home_4080"],
      });
      expect(engine.listModels().length).toBe(before + 1);

      engine.register({
        id: "custom-test-model",
        backend: "ollama",
        paramsB: 1,
        vramGB: 4,
        qualityTier: 99,
        latencyMsTypical: 200,
        inputCostUSDPer1k: 0,
        outputCostUSDPer1k: 0,
        runsOn: ["home_4080"],
      });
      expect(engine.listModels().length).toBe(before + 1);
      expect(
        engine.listModels().find((m) => m.id === "custom-test-model")?.qualityTier,
      ).toBe(99);
    });
  });

  describe("force overrides", () => {
    it("forceModel pins the decision when feasible", () => {
      const d = engine.route(
        req({ taskKind: "chat", outputTokensMax: 100 }),
        ctx({ forceModel: "claude-haiku-4-5-20251001" }),
      );
      expect(d.ok).toBe(true);
      expect(d.model).toBe("claude-haiku-4-5-20251001");
      expect(d.rationale.some((r) => r.includes("pinned"))).toBe(true);
    });

    it("forceModel returns error when model not in catalog", () => {
      const d = engine.route(req(), ctx({ forceModel: "does-not-exist" }));
      expect(d.ok).toBe(false);
      expect(d.error).toMatch(/not in catalog/);
    });

    it("forceModel returns error when pinned model fails hard constraints", () => {
      const d = engine.route(
        req({ requireSafety: true }),
        ctx({ forceModel: "mistral:7b" }),
      );
      expect(d.ok).toBe(false);
      expect(d.error).toMatch(/fails hard constraints/);
    });

    it("forceBackend narrows candidates to that backend", () => {
      const d = engine.route(req(), ctx({ forceBackend: "anthropic" }));
      expect(d.ok).toBe(true);
      expect(d.backend).toBe("anthropic");
    });

    it("forceBackend marked down returns no-candidates error", () => {
      const d = engine.route(
        req(),
        ctx({ forceBackend: "openai", backendUp: { openai: false } }),
      );
      expect(d.ok).toBe(false);
    });
  });

  describe("hardware gating", () => {
    it("home_4080 can pick phi3:14b", () => {
      const d = engine.route(
        req({ costBudgetUSD: 0 }),
        ctx({ hardware: "home_4080" }),
      );
      expect(d.ok).toBe(true);
      expect(d.backend).toBe("ollama");
      const chosen = engine.listModels().find((m) => m.id === d.model);
      expect(chosen?.runsOn.includes("home_4080")).toBe(true);
    });

    it("work_3080 cannot pick a home-only phi3:14b", () => {
      const d = engine.route(
        req({ costBudgetUSD: 0 }),
        ctx({ hardware: "work_3080" }),
      );
      expect(d.ok).toBe(true);
      expect(d.model).not.toBe("phi3:14b");
      const chosen = engine.listModels().find((m) => m.id === d.model);
      expect(chosen?.runsOn.includes("work_3080")).toBe(true);
    });

    it("cloud_only forbids all ollama models", () => {
      const d = engine.route(
        req({ costBudgetUSD: 1 }),
        ctx({ hardware: "cloud_only" }),
      );
      expect(d.ok).toBe(true);
      expect(d.backend).not.toBe("ollama");
    });
  });

  describe("safety rules", () => {
    it("requireSafety=true disqualifies all Ollama models", () => {
      const d = engine.route(req({ requireSafety: true }), ctx());
      expect(d.ok).toBe(true);
      expect(d.backend).not.toBe("ollama");
    });

    it("safety_critical picks Opus over Sonnet/Haiku", () => {
      const d = engine.route(
        req({ taskKind: "safety_critical", inputTokens: 500, outputTokensMax: 500 }),
        ctx(),
      );
      expect(d.ok).toBe(true);
      expect(d.model).toBe("claude-opus-4-7");
    });

    it("safety_critical excludes models with qualityTier < 85", () => {
      const d = engine.route(req({ taskKind: "safety_critical" }), ctx());
      expect(d.ok).toBe(true);
      const chosen = engine.listModels().find((m) => m.id === d.model);
      expect((chosen?.qualityTier ?? 0) >= 85).toBe(true);
    });
  });

  describe("embedding routing", () => {
    it("embed task routes to nomic-embed-text when available", () => {
      const d = engine.route(
        req({ taskKind: "embed", inputTokens: 200, outputTokensMax: 0 }),
        ctx({ hardware: "home_4080" }),
      );
      expect(d.ok).toBe(true);
      expect(d.model).toBe("nomic-embed-text");
    });

    it("non-embed task does not pick an embed-only model", () => {
      const d = engine.route(req({ taskKind: "chat" }), ctx());
      expect(d.model).not.toBe("nomic-embed-text");
    });
  });

  describe("tool support", () => {
    it("needsTools=true filters out Ollama models", () => {
      const d = engine.route(req({ needsTools: true }), ctx());
      expect(d.ok).toBe(true);
      expect(d.backend).not.toBe("ollama");
    });
  });

  describe("budgets", () => {
    it("costBudgetUSD=0 restricts to free (local) models", () => {
      const d = engine.route(
        req({ costBudgetUSD: 0 }),
        ctx({ hardware: "home_4080" }),
      );
      expect(d.ok).toBe(true);
      expect(d.backend).toBe("ollama");
      expect(d.expectedCostUSD).toBe(0);
    });

    it("tight latency budget disqualifies slow models like Opus", () => {
      const d = engine.route(
        req({ latencyBudgetMs: 1000 }),
        ctx({ hardware: "home_4080" }),
      );
      expect(d.ok).toBe(true);
      const chosen = engine.listModels().find((m) => m.id === d.model);
      expect((chosen?.latencyMsTypical ?? 0) <= 1000).toBe(true);
    });

    it("impossible budgets return ok:false", () => {
      const d = engine.route(
        req({
          taskKind: "safety_critical",
          costBudgetUSD: 0,
        }),
        ctx(),
      );
      expect(d.ok).toBe(false);
      expect(d.error).toMatch(/no catalog model/);
    });
  });

  describe("scoring + fallbacks", () => {
    it("returns up to 3 fallback alternatives", () => {
      const d = engine.route(req({ costBudgetUSD: 1 }), ctx());
      expect(d.ok).toBe(true);
      expect(d.fallbacks.length).toBeGreaterThan(0);
      expect(d.fallbacks.length).toBeLessThanOrEqual(3);
      for (const f of d.fallbacks) {
        expect(f.model).not.toBe(d.model);
      }
    });

    it("code task prefers qwen2.5-coder at zero cost on home hardware", () => {
      const d = engine.route(
        req({ taskKind: "code", costBudgetUSD: 0 }),
        ctx({ hardware: "home_4080" }),
      );
      expect(d.ok).toBe(true);
      expect(d.model).toBe("qwen2.5-coder:7b");
    });

    it("rationale explains the winner", () => {
      const d = engine.route(req(), ctx());
      expect(d.rationale.some((r) => r.includes("winner"))).toBe(true);
    });
  });

  describe("input validation", () => {
    it("throws on negative inputTokens", () => {
      expect(() => engine.route(req({ inputTokens: -1 }), ctx())).toThrow(
        /inputTokens/,
      );
    });

    it("throws on non-finite outputTokensMax", () => {
      expect(() =>
        engine.route(req({ outputTokensMax: Number.POSITIVE_INFINITY }), ctx()),
      ).toThrow(/outputTokensMax/);
    });

    it("throws on zero or negative latency budget", () => {
      expect(() => engine.route(req({ latencyBudgetMs: 0 }), ctx())).toThrow(
        /latencyBudgetMs/,
      );
    });

    it("throws on negative cost budget", () => {
      expect(() => engine.route(req({ costBudgetUSD: -0.01 }), ctx())).toThrow(
        /costBudgetUSD/,
      );
    });
  });
});
