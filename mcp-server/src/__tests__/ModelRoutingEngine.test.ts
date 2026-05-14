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

  // ── P23-U02 adaptive state ───────────────────────────────────────────────
  describe("applyAdaptiveState — INTEL-OLLAMA-OBSIDIAN-MS0/P23-U02", () => {
    it("getEffectiveLatency returns the catalog default before adaptation", () => {
      const declared = engine
        .listModels()
        .find((m) => m.id === "claude-sonnet-4-6")!.latencyMsTypical;
      expect(engine.getEffectiveLatency("claude-sonnet-4-6")).toBe(declared);
    });

    it("applyAdaptiveState overrides the effective latency for a specific model", () => {
      engine.applyAdaptiveState({
        "claude-sonnet-4-6": {
          effectiveLatencyMs: 3500,
          reason: "P95 observed at 3500ms",
          appliedAt: "2026-05-13T00:00:00.000Z",
        },
      });
      expect(engine.getEffectiveLatency("claude-sonnet-4-6")).toBe(3500);
      // Unaffected models keep their declared latency.
      const haikuDeclared = engine
        .listModels()
        .find((m) => m.id === "claude-haiku-4-5-20251001")!.latencyMsTypical;
      expect(engine.getEffectiveLatency("claude-haiku-4-5-20251001")).toBe(haikuDeclared);
    });

    it("adaptive effective latency is honored by the latency-budget hard wall", () => {
      // Without adaptation: sonnet (1800ms typical) fits an 2000ms budget.
      const baseline = engine.route(req({ latencyBudgetMs: 2000 }), ctx({ forceModel: "claude-sonnet-4-6" }));
      expect(baseline.ok).toBe(true);

      // After tuner observes P95=3500ms: same request fails the latency budget.
      engine.applyAdaptiveState({
        "claude-sonnet-4-6": { effectiveLatencyMs: 3500, reason: "degraded" },
      });
      const degraded = engine.route(req({ latencyBudgetMs: 2000 }), ctx({ forceModel: "claude-sonnet-4-6" }));
      expect(degraded.ok).toBe(false);
      expect(degraded.rationale.join(" ")).toMatch(/3500ms.*budget 2000ms/);
      expect(degraded.rationale.join(" ")).toMatch(/adaptive/);
    });

    it("excludedFromSafety disqualifies the model from safety_critical taskKind", () => {
      // Opus normally serves safety_critical (qualityTier 98).
      const baseline = engine.route(req({ taskKind: "safety_critical" }), ctx({ forceModel: "claude-opus-4-7" }));
      expect(baseline.ok).toBe(true);

      engine.applyAdaptiveState({
        "claude-opus-4-7": { excludedFromSafety: true, reason: "elevated failure rate 22% over 100 calls" },
      });
      const excluded = engine.route(req({ taskKind: "safety_critical" }), ctx({ forceModel: "claude-opus-4-7" }));
      expect(excluded.ok).toBe(false);
      expect(excluded.rationale.join(" ")).toMatch(/excludedFromSafety/);
      expect(excluded.rationale.join(" ")).toMatch(/22%/);

      // Non-safety taskKinds remain unaffected.
      const chatPath = engine.route(req({ taskKind: "chat" }), ctx({ forceModel: "claude-opus-4-7" }));
      expect(chatPath.ok).toBe(true);
    });

    it("excludedFromSafety also rejects requireSafety=true regardless of taskKind", () => {
      engine.applyAdaptiveState({
        "claude-opus-4-7": { excludedFromSafety: true, reason: "from tuner" },
      });
      const result = engine.route(
        req({ taskKind: "chat", requireSafety: true }),
        ctx({ forceModel: "claude-opus-4-7" }),
      );
      expect(result.ok).toBe(false);
      expect(result.rationale.join(" ")).toMatch(/excludedFromSafety/);
    });

    it("getAdaptiveState returns a copy that does not mutate engine internals", () => {
      engine.applyAdaptiveState({
        "claude-sonnet-4-6": { effectiveLatencyMs: 2500 },
      });
      const snapshot = engine.getAdaptiveState();
      snapshot["claude-sonnet-4-6"]!.effectiveLatencyMs = 99999;
      // Engine still reports the original value — the snapshot was a copy.
      expect(engine.getEffectiveLatency("claude-sonnet-4-6")).toBe(2500);
    });

    it("applyAdaptiveState drops entries with no useful fields (defensive shape guard)", () => {
      engine.applyAdaptiveState({
        "claude-sonnet-4-6": { effectiveLatencyMs: 1500 },
        "junk-model-1": { reason: "no actionable fields" } as never,
        "junk-model-2": null as never,
        "junk-model-3": { effectiveLatencyMs: Number.NaN } as never,
        "junk-model-4": { effectiveLatencyMs: -100 } as never, // negative not allowed
        "junk-model-5": { excludedFromSafety: "yes" as unknown as boolean },
      });
      const state = engine.getAdaptiveState();
      expect(Object.keys(state).sort()).toEqual(["claude-sonnet-4-6"]);
      expect(state["claude-sonnet-4-6"]!.effectiveLatencyMs).toBe(1500);
    });

    it("empty applyAdaptiveState clears prior overrides (reset to catalog defaults)", () => {
      engine.applyAdaptiveState({
        "claude-sonnet-4-6": { effectiveLatencyMs: 5000, excludedFromSafety: true },
      });
      expect(engine.getEffectiveLatency("claude-sonnet-4-6")).toBe(5000);

      engine.applyAdaptiveState({});
      expect(engine.getAdaptiveState()).toEqual({});

      const declared = engine
        .listModels()
        .find((m) => m.id === "claude-sonnet-4-6")!.latencyMsTypical;
      expect(engine.getEffectiveLatency("claude-sonnet-4-6")).toBe(declared);

      // Safety-critical no longer blocked.
      const result = engine.route(req({ taskKind: "safety_critical" }), ctx({ forceModel: "claude-sonnet-4-6" }));
      expect(result.ok).toBe(true);
    });

    it("adaptive effective latency influences scoring across candidates", () => {
      // Force home hardware, code task — sonnet typically wins on quality + cloud-tools.
      // Degrade sonnet's effective latency dramatically — opus should now outrank it on score
      // (both keep their declared latencies in the catalog, but the scorer reads via getEffectiveLatency).
      engine.applyAdaptiveState({
        "claude-sonnet-4-6": { effectiveLatencyMs: 60_000 }, // pretend 60s P95
      });
      const result = engine.route(
        req({ taskKind: "code", needsTools: true, inputTokens: 1000, outputTokensMax: 1000 }),
        ctx({ hardware: "home_4080" }),
      );
      expect(result.ok).toBe(true);
      // With 60s effective latency, sonnet's score is pushed below opus/haiku/codex.
      expect(result.model).not.toBe("claude-sonnet-4-6");
    });
  });
});
