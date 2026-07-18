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

    // ── qwen3 Blackwell stack (LOCAL-LLM-FOUNDATION-BLUEPRINT-2026-06-03) ──
    // Behavioral: assert route() OUTCOMES, not catalog presence.

    it("safety_critical never routes to a local model — the qualityTier<85 cloud floor holds on Blackwell", () => {
      const d = engine.route(
        req({ taskKind: "safety_critical", requireSafety: true }),
        ctx({ hardware: "home_blackwell" }),
      );
      const chosen = engine.listModels().find((m) => m.id === d.model);
      expect(chosen?.backend).not.toBe("ollama");
      expect(chosen?.qualityTier ?? 0).toBeGreaterThanOrEqual(85);
    });

    it("an embed task on Blackwell routes to an embed-tagged model", () => {
      const d = engine.route(req({ taskKind: "embed" }), ctx({ hardware: "home_blackwell" }));
      const chosen = engine.listModels().find((m) => m.id === d.model);
      expect(chosen?.tags ?? []).toContain("embed");
    });

    it("qwen3-coder:30b-a3b is force-routable on Blackwell but hardware-rejected on a 4080", () => {
      expect(
        engine.route(
          req({ taskKind: "code" }),
          ctx({ hardware: "home_blackwell", forceModel: "qwen3-coder:30b-a3b" }),
        ).model,
      ).toBe("qwen3-coder:30b-a3b");
      expect(
        engine.route(
          req({ taskKind: "code" }),
          ctx({ hardware: "home_4080", forceModel: "qwen3-coder:30b-a3b" }),
        ).model,
      ).not.toBe("qwen3-coder:30b-a3b");
    });

    it("qwen3-next:80b-a3b-instruct (reasoning swap-in) is force-routable on Blackwell", () => {
      expect(
        engine.route(
          req({ taskKind: "reasoning" }),
          ctx({ hardware: "home_blackwell", forceModel: "qwen3-next:80b-a3b-instruct" }),
        ).model,
      ).toBe("qwen3-next:80b-a3b-instruct");
    });

    it("qwen3-embedding:8b is force-routable for an embed task on Blackwell", () => {
      expect(
        engine.route(
          req({ taskKind: "embed" }),
          ctx({ hardware: "home_blackwell", forceModel: "qwen3-embedding:8b" }),
        ).model,
      ).toBe("qwen3-embedding:8b");
    });

    // ── gpt-oss / gemma4 Blackwell stack (BLACKWELL-MODEL-INTEGRATION-MS0 P2) ──
    // FLOOR-tier design: these post-swap models are catalogued but kept under the
    // 32b (83/90) tier until /api/tags live-confirms them, because route() is a
    // pure scorer with no install filter. The behavioral invariants below assert
    // exactly that: 120b does NOT auto-displace the proven 32b on code/reasoning
    // (no phantom traffic to a still-pulling model), 20b is the low-latency pick,
    // gemma4 is catalogued + force-routable, and safety_critical still goes cloud.

    it("gpt-oss:120b is catalogued on Blackwell at a FLOOR codeTier below the proven 32b (no phantom auto-win)", () => {
      const m120 = engine.listModels().find((m) => m.id === "gpt-oss:120b");
      const m32 = engine.listModels().find((m) => m.id === "qwen2.5-coder:32b");
      expect(m120?.backend).toBe("ollama");
      expect(m120?.paramsB).toBe(120);
      expect(m120?.runsOn).toContain("home_blackwell");
      expect(m120?.inputCostUSDPer1k).toBe(0);
      // FLOOR invariant: until /api/tags confirms the pull, 120b stays under 32b so
      // route() (pure scorer, no install filter) keeps the installed 32b as the
      // code winner — proven below — and never routes phantom traffic to it.
      expect((m120?.codeTier ?? 0)).toBeLessThan(m32?.codeTier ?? 0);
      // Safety floor: still under 85 so safety_critical can never select it.
      expect((m120?.qualityTier ?? 0)).toBeLessThan(85);
    });

    it("a code task on Blackwell stays on the installed 32b — the FLOOR-tier gpt-oss:120b does NOT displace it", () => {
      const d = engine.route(
        req({ taskKind: "code", inputTokens: 500, outputTokensMax: 500 }),
        ctx({ hardware: "home_blackwell" }),
      );
      expect(d.ok).toBe(true);
      expect(d.backend).toBe("ollama");
      // 32b codeTier 90 still tops the FLOOR-tier gpt-oss:120b (72) → no phantom
      // routing to a still-pulling model. Promotion is gated on U-BW-CATALOG-REALIGN.
      expect(d.model).toBe("qwen2.5-coder:32b");
      expect(d.model).not.toBe("gpt-oss:120b");
      expect(d.expectedCostUSD).toBe(0);
    });

    it("gpt-oss:120b becomes the code winner over 32b ONLY after /api/tags-confirmed promotion (realign simulated)", () => {
      // Simulate the U-BW-CATALOG-REALIGN promotion to the true measured tier once
      // the pull completes. After promotion, route() prefers 120b for code — proving
      // the FLOOR is the ONLY thing holding it back, not a structural mis-wire.
      engine.register({
        id: "gpt-oss:120b",
        backend: "ollama",
        paramsB: 120,
        vramGB: 65,
        qualityTier: 88,
        codeTier: 91,
        latencyMsTypical: 2200,
        inputCostUSDPer1k: 0,
        outputCostUSDPer1k: 0,
        runsOn: ["home_blackwell"],
        tags: ["code", "reasoning", "chat", "synthesis"],
      });
      const d = engine.route(
        req({ taskKind: "code", inputTokens: 500, outputTokensMax: 500 }),
        ctx({ hardware: "home_blackwell" }),
      );
      expect(d.ok).toBe(true);
      expect(d.model).toBe("gpt-oss:120b");
      expect(d.expectedCostUSD).toBe(0);
    });

    it("gpt-oss:20b is the low-latency speed pick under a tight budget on Blackwell", () => {
      // 32b (3500ms) is disqualified by an 1000ms wall; gpt-oss:20b (800ms) survives
      // and is the fastest catalogued local model that fits — the speed tier.
      const d = engine.route(
        req({ taskKind: "code", inputTokens: 300, outputTokensMax: 300, latencyBudgetMs: 1000, costBudgetUSD: 0 }),
        ctx({ hardware: "home_blackwell" }),
      );
      expect(d.ok).toBe(true);
      expect(d.backend).toBe("ollama");
      expect(d.expectedCostUSD).toBe(0);
      expect(d.expectedLatencyMs).toBeLessThanOrEqual(1000);
      expect(d.model).toBe("gpt-oss:20b");
    });

    it("gemma4:31b is catalogued as a Blackwell consensus-diversity model and is force-routable", () => {
      const g = engine.listModels().find((m) => m.id === "gemma4:31b");
      expect(g?.backend).toBe("ollama");
      expect(g?.paramsB).toBe(31);
      expect(g?.runsOn).toContain("home_blackwell");
      expect(g?.tags ?? []).toContain("reasoning");
      expect(g?.inputCostUSDPer1k).toBe(0);
      expect((g?.qualityTier ?? 0)).toBeLessThan(85); // safety floor preserved
      const d = engine.route(
        req({ taskKind: "reasoning" }),
        ctx({ hardware: "home_blackwell", forceModel: "gemma4:31b" }),
      );
      expect(d.model).toBe("gemma4:31b");
    });

    it("SAFETY: none of the new gpt-oss/gemma4 entries can serve safety_critical (all under the 85 cloud floor)", () => {
      const newLocal = engine
        .listModels()
        .filter((m) => ["gpt-oss:120b", "gpt-oss:20b", "gemma4:31b"].includes(m.id));
      expect(newLocal.length).toBe(3);
      for (const m of newLocal) {
        expect(m.qualityTier).toBeLessThan(85);
      }
      const d = engine.route(
        req({ taskKind: "safety_critical", inputTokens: 500, outputTokensMax: 500 }),
        ctx({ hardware: "home_blackwell" }),
      );
      expect(d.backend).not.toBe("ollama");
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

  // U-BW-ROUTE-PROFILE (BLACKWELL-TOKEN-SYNERGY-MS0): the RTX PRO 6000
  // Blackwell 96GB tier. These assert the token-saving payoff (free 32B
  // beats paid cloud on code + substantial reasoning) AND that the safety
  // invariant is preserved (no local model, however large, ever serves a
  // safety_critical request — the <85 tier floor keeps it on cloud).
  describe("Blackwell GPU tier (home_blackwell)", () => {
    it("home_blackwell can run the 32B model that home_4080 cannot", () => {
      const m32 = engine.listModels().find((m) => m.id === "qwen2.5-coder:32b");
      expect(m32?.runsOn).toContain("home_blackwell");
      expect(m32?.runsOn.includes("home_4080")).toBe(false);
      expect(m32?.codeTier).toBe(90);
      expect(m32?.inputCostUSDPer1k).toBe(0);
    });

    it("is a superset of home_4080 — still serves the embed model", () => {
      const d = engine.route(
        req({ taskKind: "embed", inputTokens: 200, outputTokensMax: 0 }),
        ctx({ hardware: "home_blackwell" }),
      );
      expect(d.ok).toBe(true);
      expect(d.model).toBe("nomic-embed-text");
    });

    it("routes a code task to the free local 32B over paid cloud", () => {
      const d = engine.route(
        req({ taskKind: "code", inputTokens: 500, outputTokensMax: 500 }),
        ctx({ hardware: "home_blackwell" }),
      );
      expect(d.ok).toBe(true);
      expect(d.backend).toBe("ollama");
      expect(d.model).toBe("qwen2.5-coder:32b");
      expect(d.expectedCostUSD).toBe(0);
    });

    it("routes a substantial reasoning task to the free local 32B (cloud cost penalty grows with output)", () => {
      const d = engine.route(
        req({ taskKind: "reasoning", inputTokens: 2000, outputTokensMax: 2000 }),
        ctx({ hardware: "home_blackwell" }),
      );
      expect(d.ok).toBe(true);
      expect(d.backend).toBe("ollama");
      // qualityTier 83 tops deepseek-r1:14b's 80 → the 32B is the reasoning winner.
      expect(d.model).toBe("qwen2.5-coder:32b");
      expect(d.expectedCostUSD).toBe(0);
    });

    it("a tight latency budget on home_blackwell disqualifies the slow 32B", () => {
      const d = engine.route(
        req({ taskKind: "code", inputTokens: 500, outputTokensMax: 500, latencyBudgetMs: 1500 }),
        ctx({ hardware: "home_blackwell" }),
      );
      expect(d.ok).toBe(true);
      // The 32B (3500ms) and 14B (2200ms) exceed the 1500ms wall; only fast
      // models survive — proves the latency wall protects interactive paths.
      expect(d.model).not.toBe("qwen2.5-coder:32b");
      expect(d.expectedLatencyMs).toBeLessThanOrEqual(1500);
    });

    it("SAFETY: safety_critical on home_blackwell still routes to a cloud frontier model", () => {
      const d = engine.route(
        req({ taskKind: "safety_critical", inputTokens: 500, outputTokensMax: 500 }),
        ctx({ hardware: "home_blackwell" }),
      );
      expect(d.ok).toBe(true);
      expect(d.backend).not.toBe("ollama");
      const chosen = engine.listModels().find((m) => m.id === d.model);
      expect((chosen?.qualityTier ?? 0) >= 85).toBe(true);
    });

    it("SAFETY: every local Blackwell model stays under the 85 safety tier floor", () => {
      const localOver84 = engine
        .listModels()
        .filter((m) => m.backend === "ollama" && m.runsOn.includes("home_blackwell"))
        .filter((m) => m.qualityTier >= 85);
      expect(localOver84).toEqual([]);
    });

    it("SAFETY: requireSafety=true on home_blackwell disqualifies all local models", () => {
      const d = engine.route(
        req({ requireSafety: true }),
        ctx({ hardware: "home_blackwell" }),
      );
      expect(d.ok).toBe(true);
      expect(d.backend).not.toBe("ollama");
    });

    it("costBudgetUSD=0 on home_blackwell picks a free local coder for code", () => {
      const d = engine.route(
        req({ taskKind: "code", costBudgetUSD: 0 }),
        ctx({ hardware: "home_blackwell" }),
      );
      expect(d.ok).toBe(true);
      expect(d.backend).toBe("ollama");
      expect(d.expectedCostUSD).toBe(0);
      const chosen = engine.listModels().find((m) => m.id === d.model);
      expect((chosen?.codeTier ?? chosen?.qualityTier ?? 0) >= 70).toBe(true);
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

    it("code task prefers the strongest free local coder that fits home_4080 hardware", () => {
      const d = engine.route(
        req({ taskKind: "code", costBudgetUSD: 0 }),
        ctx({ hardware: "home_4080" }),
      );
      expect(d.ok).toBe(true);
      expect(d.backend).toBe("ollama");
      expect(d.expectedCostUSD).toBe(0);
      // INTENT: a free code task on a 4080 routes to the highest-scoring free
      // LOCAL model that physically runs on the 4080. Post-2026-06-04 retirement
      // (U-BW-TS-ENGINES-RETIRE removed qwen2.5-coder:14b/7b from the catalog),
      // the surviving free 4080-capable models are qwen3-vl:8b (codeTier 60),
      // phi3:14b (55), mistral:7b (50), llama3.2:3b (35). qwen3-vl:8b is the
      // strongest → it wins. The 32B + gpt-oss/qwen3 big stack are Blackwell-only
      // (not 4080 candidates). This asserts the SAME intent the pre-retirement
      // test did ("best free coder that fits the 4080"), retargeted to reality.
      expect(d.model).toBe("qwen3-vl:8b");
      const chosen = engine.listModels().find((m) => m.id === d.model);
      expect(chosen?.runsOn.includes("home_4080")).toBe(true);
      // It must out-score every OTHER free 4080-capable local model on code.
      const otherFree4080 = engine
        .listModels()
        .filter(
          (m) =>
            m.backend === "ollama" &&
            m.runsOn.includes("home_4080") &&
            m.id !== d.model &&
            (m.tags ?? []).includes("code"),
        );
      const winnerCode = chosen?.codeTier ?? chosen?.qualityTier ?? 0;
      for (const m of otherFree4080) {
        expect(winnerCode).toBeGreaterThanOrEqual(m.codeTier ?? m.qualityTier ?? 0);
      }
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
