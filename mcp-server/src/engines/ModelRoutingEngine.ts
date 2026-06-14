/**
 * ModelRoutingEngine — Phase 0.19 U-LLM7
 *
 * Decide which LLM backend/model should service a given request so simple
 * queries take the local Ollama path (free, on-prem, fast once warm) and
 * only queries that genuinely need frontier reasoning fall back to the paid
 * Claude/OpenAI APIs. Pure scoring function: the engine does NO network I/O
 * — callers feed it request features + a live backend-availability snapshot,
 * and it returns a routing decision with rationale. Executing the decision
 * is `LocalModelOrchestratorEngine`'s job (U-LLM1).
 *
 * Design rules:
 *   1. Safety-critical manufacturing decisions (cutting force validation,
 *      collision safety, workholding adequacy) always route to the highest-
 *      capability backend. Never let a 3B local model decide whether a cut
 *      is safe.
 *   2. Embedding requests always stay local — MiniLM/nomic are purpose-built
 *      for this and paying frontier rates for vectors is wasteful.
 *   3. Hard budgets win over scoring. If the caller says "must be under $0",
 *      we only consider free-tier backends.
 *   4. When everything fits, prefer the backend with lower marginal cost and
 *      latency headroom. Quality acts as a tiebreaker, not a default winner.
 *
 * References:
 *   Model catalog + hardware split come from the Phase 0.19 table in
 *   UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md §0.19.
 *
 * @module engines/ModelRoutingEngine
 * @milestone PP-0.19-U-LLM7
 */

export type TaskKind =
  | "chat"
  | "code"
  | "embed"
  | "reasoning"
  | "safety_critical"
  | "gcode_explain"
  | "quote_summary";

export type Backend = "ollama" | "anthropic" | "openai";

export type HardwareProfile =
  | "home_blackwell" // RTX PRO 6000 Blackwell 96GB — runs the 32B GPU tier (superset of home_4080)
  | "home_4080" // RTX 4080/4080 SUPER 16GB — runs ≤14B quantized
  | "work_3080" // RTX 3080 10GB — small quantized models only
  | "cloud_only"; // no local GPU — cloud backends only

export interface ModelSpec {
  /** Canonical id used by whichever client speaks to this model. */
  id: string;
  backend: Backend;
  /** Parameter count in billions — rough capability proxy for tiebreaks. */
  paramsB: number;
  /** VRAM in GB to run FP16 (or effective for quantized variants). */
  vramGB: number;
  /** 0-100 quality tier for general reasoning. */
  qualityTier: number;
  /** 0-100 quality tier for code-focused tasks; falls back to qualityTier when omitted. */
  codeTier?: number;
  /** Typical wall latency for a ~500-token response on this backend. */
  latencyMsTypical: number;
  /** USD cost per 1k input tokens. Local models are 0. */
  inputCostUSDPer1k: number;
  /** USD cost per 1k output tokens. Local models are 0. */
  outputCostUSDPer1k: number;
  /** Which hardware profile(s) can physically run this model. Cloud models run everywhere. */
  runsOn: readonly HardwareProfile[];
  /** Optional suitability tags (e.g., "embed", "code", "safety"). */
  tags?: readonly string[];
}

export interface RoutingRequest {
  taskKind: TaskKind;
  /** Approximate size of the prompt in tokens. */
  inputTokens: number;
  /** Upper bound on response tokens; used to estimate cost. */
  outputTokensMax: number;
  /** Hard latency budget — anything slower than this is disqualified. */
  latencyBudgetMs?: number;
  /** Hard cost cap per call. 0 means "must be free". */
  costBudgetUSD?: number;
  /** True when the request exercises tool-calling (web search, MCP tools). */
  needsTools?: boolean;
  /** True when the answer enforces manufacturing safety (force/collision/workholding). */
  requireSafety?: boolean;
}

export interface RoutingContext {
  hardware: HardwareProfile;
  /**
   * Live availability snapshot. Keyed by Backend; false means temporarily
   * unreachable (docker down, rate-limited, auth missing). Missing keys are
   * treated as available.
   */
  backendUp?: Partial<Record<Backend, boolean>>;
  /**
   * Optional override: caller wants to force a particular backend. If the
   * forced backend is unavailable or fails budget, we return an error
   * decision rather than silently falling back.
   */
  forceBackend?: Backend;
  /** Optional override: force a particular model id. */
  forceModel?: string;
}

export interface RoutingDecision {
  ok: boolean;
  backend: Backend | null;
  model: string | null;
  rationale: string[];
  expectedLatencyMs: number;
  expectedCostUSD: number;
  /** Ranked list of next-best alternatives for retry on primary failure. */
  fallbacks: Array<{ backend: Backend; model: string; expectedCostUSD: number }>;
  error: string | null;
}

/**
 * Built-in catalog. Numbers come from the Phase 0.19 plan table and publicly
 * posted provider pricing as of 2026-04-15. Treat costs and latencies as
 * rough estimates — the routing decision is only as good as this table, so
 * callers can extend/override via `register()`.
 */
export const DEFAULT_MODEL_CATALOG: ModelSpec[] = [
  // ── Local Ollama — Blackwell GPU tier (RTX PRO 6000 96GB) ───────────
  // The 2026-06-03 BLACKWELL-GPU-SWAP made these large local models free
  // and fast (warm ~220 tok/s, full GPU residency). They are the token-
  // saving payoff: a free 32B coder beats paid cloud on `code` and on
  // substantial `reasoning`/`chat` once the cloud cost penalty grows with
  // output length. SAFETY INVARIANT: every local entry keeps qualityTier
  // < 85 so the `safety_critical` tier floor (canServe) always routes
  // force/collision/workholding decisions to a cloud frontier model —
  // never to a local model, however large. VRAM is the real quantized
  // footprint from `ollama /api/tags`, not FP16.
  {
    id: "qwen2.5-coder:32b",
    backend: "ollama",
    paramsB: 32,
    vramGB: 20, // Q4_K_M ~19.9GB resident
    qualityTier: 83,
    codeTier: 90,
    latencyMsTypical: 3500, // warm on Blackwell; cold load ~40s mitigated by 60m keep_alive
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell"],
    tags: ["code", "gcode", "reasoning", "chat"],
  },
  // RETIRED 2026-06-04 (BLACKWELL-MODEL-UPGRADE / U-BW-TS-ENGINES-RETIRE, slot:alpha):
  // deepseek-r1:14b + qwen2.5-coder:14b were `ollama rm`'d from this 96GB Blackwell
  // host. Their reasoning/code/chat roles are fully covered — at HIGHER quality — by
  // qwen2.5-coder:32b above (qualityTier 83 / codeTier 90) + the qwen3 big-model stack
  // below. route() install-gates at runtime, so a stale entry could never be SELECTED,
  // but the catalog must not DECLARE a deleted tag (scripts/no-retired-llm-refs.test.mjs
  // source-lock). Higher-tier upgrade targets (gpt-oss:120b, gemma4:31b) route via the
  // cost-router today; their catalog entries land in U-BW-CATALOG-REALIGN post-pull.
  {
    id: "qwen3-vl:8b",
    backend: "ollama",
    paramsB: 8,
    vramGB: 6,
    qualityTier: 66,
    codeTier: 60,
    latencyMsTypical: 1800,
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell", "home_4080", "work_3080"],
    tags: ["chat"],
  },

  // ── qwen3 stack (LOCAL-LLM-FOUNDATION-BLUEPRINT-2026-06-03, slot:golf) ──
  // CAPABILITY DECLARATIONS — these models are PULLING now (not yet in the live
  // `/api/tags` store). Tiers below are conservative FLOORS (well under the
  // proven pulled defaults) so route() does NOT prefer an unpulled model
  // (R13: no consumer atop an unproven dependency) and does NOT silently
  // displace qwen2.5-coder:32b (code/reasoning) or nomic-embed-text (embed).
  // PROMOTION to true tiers (qwen3-coder ~82/88, qwen3-next ~84, qwen3-vl ~72)
  // + real vramGB happens via U-BW-CATALOG-REALIGN once `/api/tags` confirms
  // presence. The EMBEDDER stays below nomic(60) until the corpus is
  // re-embedded (india, blueprint §1.1) — promoting it before the re-index
  // retrieves garbage against the nomic-indexed vectors. SAFETY: all keep
  // qualityTier < 85 so the safety_critical floor always routes to cloud.
  // Reachable now via forceModel / forceBackend for explicit opt-in use.
  {
    id: "qwen3-coder:30b-a3b",
    backend: "ollama",
    paramsB: 30, // MoE, ~3B active
    vramGB: 20, // Q4_K_M MoE ~est; realign from /api/tags once pulled
    qualityTier: 60, // FLOOR pending pull; true ~82 (realign)
    codeTier: 65, // FLOOR pending pull; true ~88 (realign) — keeps 32B the code default
    latencyMsTypical: 2200, // MoE 3B-active = fast on Blackwell
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell"],
    tags: ["code", "gcode", "reasoning", "chat"],
  },
  {
    id: "qwen3-next:80b-a3b-instruct",
    backend: "ollama",
    paramsB: 80, // MoE, ~3B active
    vramGB: 42, // Q4_K_M ~est; realign from /api/tags once pulled
    qualityTier: 62, // FLOOR pending pull; true ~84 (realign) — keeps 32B the reasoning default
    codeTier: 62,
    latencyMsTypical: 2600,
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell"],
    tags: ["chat", "reasoning", "code"],
  },
  {
    id: "qwen3-embedding:8b",
    backend: "ollama",
    paramsB: 8,
    vramGB: 8, // ~est; realign from /api/tags once pulled
    qualityTier: 58, // FLOOR below nomic(60) until corpus re-embed (india); true ~70
    latencyMsTypical: 100,
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell", "home_4080"],
    tags: ["embed"],
  },
  {
    id: "dengcao/Qwen3-Reranker-4B:Q5_K_M",
    backend: "ollama",
    paramsB: 4,
    vramGB: 4, // ~est; realign from /api/tags once pulled
    qualityTier: 55, // no "rerank" taskKind routes here; consumed by the future rerank helper
    latencyMsTypical: 150,
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell", "home_4080"],
    tags: ["rerank"],
  },
  {
    id: "qwen3-vl:30b",
    backend: "ollama",
    paramsB: 30,
    vramGB: 20, // ~est; realign from /api/tags once pulled
    qualityTier: 60, // FLOOR pending pull; true ~72 (realign)
    codeTier: 55,
    latencyMsTypical: 2200,
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell"],
    tags: ["chat", "vision"],
  },

  // ── gpt-oss / gemma4 stack (BLACKWELL-MODEL-INTEGRATION-MS0 P2, 2026-06-06) ──
  // The post-swap target tiers: gpt-oss:120b is the strongest LOCAL synthesis/
  // reasoning voice (true ~88 quality / ~91 code, out-scoring 32b once pulled);
  // gpt-oss:20b is the low-latency speed tier (~3B active MoE); gemma4:31b adds
  // consensus diversity. CAPABILITY DECLARATIONS with conservative FLOOR tiers.
  //
  // FLOOR INVARIANT (matches the qwen3 stack above — DELIBERATE, not the plan's
  // literal 88/91): route() in THIS engine is a PURE SCORER with NO /api/tags
  // filter — it scores the static catalog and the highest tier wins. As of the
  // 2026-06-06 live /api/tags scan ONLY gpt-oss:20b is pulled; gpt-oss:120b +
  // gemma4:31b are still PULLING. A tier ≥ 84 here would make route() PREFER an
  // absent model for code/reasoning → the orchestrator's first hop cold-fails
  // (R13: no consumer atop an unproven dependency; the exact "phantom traffic to
  // an absent model" the integration plan's pre-check flagged). So every entry
  // keeps qualityTier < 85 until /api/tags live-confirms presence + real
  // vram/latency, when U-BW-CATALOG-REALIGN promotes them to measured tiers.
  // Two invariants this preserves: (1) safety_critical stays on cloud (the < 85
  // tier floor at canServe); (2) the proven 32b (83/90) remains the auto-winner
  // for code/reasoning. These models are reachable NOW via forceModel/
  // forceBackend for explicit opt-in, and the install-gated consumers
  // (MultiModelConsensusEngine.resolveOllamaModels, OllamaTaskOffloaderEngine.
  // selectModel, the .mjs cost-router) route to them on the hot path once present.
  {
    id: "gpt-oss:120b",
    backend: "ollama",
    paramsB: 120, // MoE; ~est active params
    vramGB: 65, // Q4_K_M MoE ~est; realign from /api/tags once pulled
    qualityTier: 70, // FLOOR pending pull; true ~88 (realign — beats 32b on synthesis/reasoning)
    codeTier: 72, // FLOOR pending pull; true ~91 (realign — keeps 32b the code default until then)
    latencyMsTypical: 2200, // warm MoE on Blackwell ~est
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell"],
    tags: ["code", "reasoning", "chat", "synthesis"],
  },
  {
    id: "gpt-oss:20b",
    backend: "ollama",
    paramsB: 20, // MoE, ~3B active
    vramGB: 15, // Q4_K_M ~est; realign from /api/tags once pulled
    qualityTier: 64, // FLOOR pending /api/tags confirm; speed tier, true ~75
    codeTier: 66, // FLOOR; true ~80
    latencyMsTypical: 800, // MoE 3B-active fast tier
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell"],
    tags: ["code", "chat"],
  },
  {
    id: "gemma4:31b",
    backend: "ollama",
    paramsB: 31,
    vramGB: 22, // Q4_K_M ~est; realign from /api/tags once pulled
    qualityTier: 68, // FLOOR pending pull; consensus-diversity tier, true ~85
    codeTier: 62, // FLOOR; true ~82
    latencyMsTypical: 2400,
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell"],
    tags: ["reasoning", "chat"],
  },

  // ── Local Ollama — home (RTX 4080 16GB) ────────────────────────────
  // NOTE (U-BW-CATALOG-REALIGN, pending): phi3:*/mistral:* below are NOT
  // currently pulled in the live Ollama store — kept as capability
  // declarations; realignment to the real store is a tracked follow-up.
  {
    id: "phi3:14b",
    backend: "ollama",
    paramsB: 14,
    vramGB: 14,
    qualityTier: 62,
    codeTier: 55,
    latencyMsTypical: 1500,
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell", "home_4080"],
    tags: ["chat", "reasoning"],
  },
  {
    id: "mistral:7b",
    backend: "ollama",
    paramsB: 7,
    vramGB: 14,
    qualityTier: 55,
    codeTier: 50,
    latencyMsTypical: 900,
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell", "home_4080"],
    tags: ["chat"],
  },
  // RETIRED 2026-06-04 (U-BW-TS-ENGINES-RETIRE): qwen2.5-coder:7b `ollama rm`'d from the
  // Blackwell — code/gcode role covered by qwen2.5-coder:32b + qwen3-coder:30b-a3b.
  // (no-retired-llm-refs source-lock; mistral:7b remains for weak-host capability decl.)

  // ── Local Ollama — work (RTX 3080 10GB, quantized) ──────────────────
  {
    id: "mistral:7b-q4_K_M",
    backend: "ollama",
    paramsB: 7,
    vramGB: 5,
    qualityTier: 48,
    codeTier: 45,
    latencyMsTypical: 1200,
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["work_3080"],
    tags: ["chat"],
  },
  {
    id: "phi3:3.8b",
    backend: "ollama",
    paramsB: 3.8,
    vramGB: 8,
    qualityTier: 44,
    codeTier: 40,
    latencyMsTypical: 700,
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["work_3080"],
    tags: ["chat"],
  },
  {
    id: "llama3.2:3b",
    backend: "ollama",
    paramsB: 3,
    vramGB: 6,
    qualityTier: 40,
    codeTier: 35,
    latencyMsTypical: 500,
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell", "home_4080", "work_3080"],
    tags: ["chat"],
  },

  // ── Local Ollama — embeddings (any hardware) ─────────────────────────
  {
    id: "nomic-embed-text",
    backend: "ollama",
    paramsB: 0.14,
    vramGB: 2,
    qualityTier: 60,
    latencyMsTypical: 80,
    inputCostUSDPer1k: 0,
    outputCostUSDPer1k: 0,
    runsOn: ["home_blackwell", "home_4080", "work_3080", "cloud_only"],
    tags: ["embed"],
  },

  // ── Cloud — Anthropic (always available) ─────────────────────────────
  {
    id: "claude-opus-4-7",
    backend: "anthropic",
    paramsB: 0, // not disclosed
    vramGB: 0,
    qualityTier: 98,
    codeTier: 95,
    latencyMsTypical: 3500,
    inputCostUSDPer1k: 0.015,
    outputCostUSDPer1k: 0.075,
    runsOn: ["home_blackwell", "home_4080", "work_3080", "cloud_only"],
    tags: ["chat", "reasoning", "code", "safety", "tools"],
  },
  {
    id: "claude-sonnet-4-6",
    backend: "anthropic",
    paramsB: 0,
    vramGB: 0,
    qualityTier: 92,
    codeTier: 90,
    latencyMsTypical: 1800,
    inputCostUSDPer1k: 0.003,
    outputCostUSDPer1k: 0.015,
    runsOn: ["home_blackwell", "home_4080", "work_3080", "cloud_only"],
    tags: ["chat", "code", "tools"],
  },
  {
    id: "claude-haiku-4-5-20251001",
    backend: "anthropic",
    paramsB: 0,
    vramGB: 0,
    qualityTier: 82,
    codeTier: 78,
    latencyMsTypical: 900,
    inputCostUSDPer1k: 0.0008,
    outputCostUSDPer1k: 0.004,
    runsOn: ["home_blackwell", "home_4080", "work_3080", "cloud_only"],
    tags: ["chat", "tools"],
  },

  // ── Cloud — OpenAI (Codex path) ──────────────────────────────────────
  {
    id: "gpt-5-codex",
    backend: "openai",
    paramsB: 0,
    vramGB: 0,
    qualityTier: 90,
    codeTier: 95,
    latencyMsTypical: 2200,
    inputCostUSDPer1k: 0.005,
    outputCostUSDPer1k: 0.02,
    runsOn: ["home_blackwell", "home_4080", "work_3080", "cloud_only"],
    tags: ["code", "tools"],
  },
];

/**
 * Per-model adaptation entry — produced by the P23-U02 tuner
 * (`scripts/adapt-router-thresholds.mjs`) after analyzing recent
 * `ModelTelemetryEngine` data. Patches `ModelRoutingEngine`'s in-memory
 * catalog at runtime so the route() scorer/gates reflect observed reality.
 *
 * Field semantics:
 *   - `effectiveLatencyMs`: overrides the catalog's `latencyMsTypical`
 *     for scoring + the latency-budget hard wall. Set when observed P95
 *     diverges materially from the declared typical (faster OR slower).
 *   - `excludedFromSafety`: when true, the model is rejected from any
 *     `safety_critical` task even if its `qualityTier ≥ 85`. Set when
 *     observed failure rate exceeds the tuner threshold.
 *   - `reason`: free-form audit text propagated from the tuner.
 *   - `appliedAt`: ISO timestamp the patch was generated.
 */
export interface ModelAdaptationEntry {
  effectiveLatencyMs?: number;
  excludedFromSafety?: boolean;
  reason?: string;
  appliedAt?: string;
}

/** Map of model id → adaptation. Missing models keep their catalog defaults. */
export type ModelAdaptiveState = Record<string, ModelAdaptationEntry>;

export class ModelRoutingEngine {
  private catalog: ModelSpec[];
  /** Active adaptation overrides keyed by model id. Mutated by `applyAdaptiveState`. */
  private adaptive: ModelAdaptiveState = {};

  constructor(catalog: readonly ModelSpec[] = DEFAULT_MODEL_CATALOG) {
    this.catalog = [...catalog];
  }

  /** Add or replace a model entry (match by id). Intended for tests/overrides. */
  register(spec: ModelSpec): void {
    const idx = this.catalog.findIndex((m) => m.id === spec.id);
    if (idx >= 0) this.catalog[idx] = spec;
    else this.catalog.push(spec);
  }

  listModels(): ReadonlyArray<ModelSpec> {
    return this.catalog;
  }

  /**
   * Replace the active adaptation state. Pass `{}` to clear overrides
   * and revert to pure-catalog routing. Validation is strict — any
   * non-finite `effectiveLatencyMs` or non-boolean `excludedFromSafety`
   * is dropped (silent) rather than throwing, so a corrupted state file
   * cannot wedge production routing.
   */
  applyAdaptiveState(state: ModelAdaptiveState): void {
    const cleaned: ModelAdaptiveState = {};
    for (const [id, entry] of Object.entries(state ?? {})) {
      if (!entry || typeof entry !== "object") continue;
      const patch: ModelAdaptationEntry = {};
      if (
        typeof entry.effectiveLatencyMs === "number" &&
        Number.isFinite(entry.effectiveLatencyMs) &&
        entry.effectiveLatencyMs >= 0
      ) {
        patch.effectiveLatencyMs = entry.effectiveLatencyMs;
      }
      if (typeof entry.excludedFromSafety === "boolean") {
        patch.excludedFromSafety = entry.excludedFromSafety;
      }
      if (typeof entry.reason === "string" && entry.reason.length > 0) {
        patch.reason = entry.reason;
      }
      if (typeof entry.appliedAt === "string" && entry.appliedAt.length > 0) {
        patch.appliedAt = entry.appliedAt;
      }
      // Only retain entries that produced at least one patch field.
      if (patch.effectiveLatencyMs !== undefined || patch.excludedFromSafety !== undefined) {
        cleaned[id] = patch;
      }
    }
    this.adaptive = cleaned;
  }

  /** Read the active adaptation map (for diagnostics + dispatcher reports). */
  getAdaptiveState(): ModelAdaptiveState {
    // Deep copy so callers can't mutate engine internals.
    const out: ModelAdaptiveState = {};
    for (const [id, entry] of Object.entries(this.adaptive)) {
      out[id] = { ...entry };
    }
    return out;
  }

  /**
   * Return the latency the scorer + canServe gates should use for a given
   * model, applying any active `effectiveLatencyMs` override. Exposed so
   * the tuner + dispatcher can show "declared vs effective" diffs.
   */
  getEffectiveLatency(modelId: string): number {
    const m = this.catalog.find((x) => x.id === modelId);
    if (!m) return 0;
    const adapt = this.adaptive[modelId];
    if (adapt?.effectiveLatencyMs !== undefined) return adapt.effectiveLatencyMs;
    return m.latencyMsTypical;
  }

  /**
   * Core routing. Returns `ok: false` with a populated `error` if nothing in
   * the catalog satisfies the request; callers should fail the request
   * rather than silently proceeding.
   */
  route(req: RoutingRequest, ctx: RoutingContext): RoutingDecision {
    this.validate(req);
    const rationale: string[] = [];

    // Force-pinning takes precedence over scoring.
    if (ctx.forceModel) {
      const pinned = this.catalog.find((m) => m.id === ctx.forceModel);
      if (!pinned) {
        return this.error(
          `forced model ${ctx.forceModel} not in catalog`,
          rationale,
        );
      }
      if (!this.canServe(pinned, req, ctx, rationale, /*hardFail*/ true)) {
        return this.error(
          `forced model ${ctx.forceModel} fails hard constraints`,
          rationale,
        );
      }
      const cost = this.estimateCost(pinned, req);
      rationale.unshift(`pinned by ctx.forceModel=${pinned.id}`);
      return {
        ok: true,
        backend: pinned.backend,
        model: pinned.id,
        rationale,
        // Return adaptive effective latency so timeout callers see live reality.
        expectedLatencyMs: this.getEffectiveLatency(pinned.id),
        expectedCostUSD: cost,
        fallbacks: [],
        error: null,
      };
    }

    const candidates = this.catalog.filter((m) =>
      this.canServe(m, req, ctx, rationale, /*hardFail*/ false),
    );
    if (candidates.length === 0) {
      return this.error("no catalog model satisfies hard constraints", rationale);
    }

    const scored = candidates
      .map((m) => ({
        model: m,
        score: this.score(m, req),
        costUSD: this.estimateCost(m, req),
      }))
      .sort((a, b) => b.score - a.score);

    const winner = scored[0];
    const fallbacks = scored.slice(1, 4).map((s) => ({
      backend: s.model.backend,
      model: s.model.id,
      expectedCostUSD: s.costUSD,
    }));
    const winnerEffLatency = this.getEffectiveLatency(winner.model.id);
    rationale.push(
      `winner ${winner.model.id} (score=${winner.score.toFixed(2)}, cost=$${winner.costUSD.toFixed(4)}, latency=${winnerEffLatency}ms${winnerEffLatency !== winner.model.latencyMsTypical ? ` [adaptive; declared ${winner.model.latencyMsTypical}ms]` : ""})`,
    );

    return {
      ok: true,
      backend: winner.model.backend,
      model: winner.model.id,
      rationale,
      // Return adaptive effective latency, not declared, so callers planning
      // request timeouts see the live reality after applyAdaptiveState.
      expectedLatencyMs: winnerEffLatency,
      expectedCostUSD: winner.costUSD,
      fallbacks,
      error: null,
    };
  }

  // ── internals ────────────────────────────────────────────────────────

  private canServe(
    m: ModelSpec,
    req: RoutingRequest,
    ctx: RoutingContext,
    rationale: string[],
    hardFail: boolean,
  ): boolean {
    // Hardware must actually be able to run this model (skipped for cloud backends).
    if (m.backend === "ollama" && !m.runsOn.includes(ctx.hardware)) {
      if (hardFail) rationale.push(`${m.id}: hardware ${ctx.hardware} not in runsOn`);
      return false;
    }

    // Backend live?
    const up = ctx.backendUp?.[m.backend];
    if (up === false) {
      if (hardFail) rationale.push(`${m.id}: backend ${m.backend} marked down`);
      return false;
    }

    // Forced backend mismatch is a hard fail.
    if (ctx.forceBackend && ctx.forceBackend !== m.backend) {
      if (hardFail) rationale.push(`${m.id}: doesn't match forceBackend=${ctx.forceBackend}`);
      return false;
    }

    // Safety-critical requests never touch local models. The penalty for
    // wrong force/safety calls is scrapped parts or machine crashes.
    if (req.requireSafety && m.backend === "ollama") {
      if (hardFail) rationale.push(`${m.id}: requireSafety=true disqualifies local backend`);
      return false;
    }
    if (req.taskKind === "safety_critical" && m.qualityTier < 85) {
      if (hardFail) rationale.push(`${m.id}: qualityTier ${m.qualityTier} < 85 for safety_critical`);
      return false;
    }
    // Adaptive exclusion: tuner observed high failure rate → exclude from safety_critical.
    const adapt = this.adaptive[m.id];
    if (
      adapt?.excludedFromSafety === true &&
      (req.taskKind === "safety_critical" || req.requireSafety === true)
    ) {
      if (hardFail) {
        rationale.push(
          `${m.id}: excludedFromSafety=true via adaptive state${adapt.reason ? ` (${adapt.reason})` : ""}`,
        );
      }
      return false;
    }

    // Embeddings stay local — paying frontier rates for vectors is wasteful
    // and none of the cloud chat models produce MiniLM-compatible outputs.
    if (req.taskKind === "embed" && !(m.tags ?? []).includes("embed")) {
      if (hardFail) rationale.push(`${m.id}: not tagged embed`);
      return false;
    }
    if (req.taskKind !== "embed" && (m.tags ?? []).includes("embed") && (m.tags ?? []).length === 1) {
      if (hardFail) rationale.push(`${m.id}: embed-only model`);
      return false;
    }

    // Tool use requires tool-capable backends. Local Ollama lacks the MCP
    // tool loop at this point, so any needsTools request routes to a cloud
    // backend with "tools" in its tags.
    if (req.needsTools && !(m.tags ?? []).includes("tools")) {
      if (hardFail) rationale.push(`${m.id}: no tool support`);
      return false;
    }

    // Latency budget is a hard wall. Use the adaptive override if the
    // tuner observed P95 diverging materially from declared typical.
    const effLatency = this.getEffectiveLatency(m.id);
    if (req.latencyBudgetMs !== undefined && effLatency > req.latencyBudgetMs) {
      if (hardFail) {
        const declared = m.latencyMsTypical;
        const decoration = effLatency !== declared
          ? `${effLatency}ms (adaptive; declared ${declared}ms)`
          : `${effLatency}ms`;
        rationale.push(`${m.id}: latency ${decoration} > budget ${req.latencyBudgetMs}ms`);
      }
      return false;
    }

    // Cost cap is a hard wall. 0 = free-only.
    if (req.costBudgetUSD !== undefined) {
      const cost = this.estimateCost(m, req);
      if (cost > req.costBudgetUSD) {
        if (hardFail)
          rationale.push(`${m.id}: cost $${cost.toFixed(4)} > cap $${req.costBudgetUSD.toFixed(4)}`);
        return false;
      }
    }

    return true;
  }

  private score(m: ModelSpec, req: RoutingRequest): number {
    // Start from quality (task-specialised tier where we have one).
    const isCode = req.taskKind === "code" || req.taskKind === "gcode_explain";
    const quality = isCode ? (m.codeTier ?? m.qualityTier) : m.qualityTier;

    // Prefer cheaper and faster when quality is adequate. Normalize both so
    // quality (0-100) can outweigh small cost/latency differences but not a
    // 10x blowout. Use the adaptive effective latency when set so that a
    // model whose live P95 has degraded gets ranked lower automatically.
    const cost = this.estimateCost(m, req);
    const costPenalty = Math.log10(1 + cost * 1000) * 12; // $0.01 ≈ 1.29 pts
    const effLatency = this.getEffectiveLatency(m.id);
    const latencyPenalty = (effLatency / 1000) * 3; // 1s ≈ 3 pts

    // Safety-critical biases hard towards quality: keep the penalties but
    // let a 98-tier Opus comfortably beat a 92-tier Sonnet.
    if (req.taskKind === "safety_critical") {
      return quality - costPenalty * 0.2 - latencyPenalty * 0.2;
    }

    return quality - costPenalty - latencyPenalty;
  }

  private estimateCost(m: ModelSpec, req: RoutingRequest): number {
    const inCost = (req.inputTokens / 1000) * m.inputCostUSDPer1k;
    const outCost = (req.outputTokensMax / 1000) * m.outputCostUSDPer1k;
    return inCost + outCost;
  }

  private validate(req: RoutingRequest): void {
    if (req.inputTokens < 0 || !Number.isFinite(req.inputTokens)) {
      throw new Error(`invalid inputTokens: ${req.inputTokens}`);
    }
    if (req.outputTokensMax < 0 || !Number.isFinite(req.outputTokensMax)) {
      throw new Error(`invalid outputTokensMax: ${req.outputTokensMax}`);
    }
    if (
      req.latencyBudgetMs !== undefined &&
      (req.latencyBudgetMs <= 0 || !Number.isFinite(req.latencyBudgetMs))
    ) {
      throw new Error(`invalid latencyBudgetMs: ${req.latencyBudgetMs}`);
    }
    if (
      req.costBudgetUSD !== undefined &&
      (req.costBudgetUSD < 0 || !Number.isFinite(req.costBudgetUSD))
    ) {
      throw new Error(`invalid costBudgetUSD: ${req.costBudgetUSD}`);
    }
  }

  private error(msg: string, rationale: string[]): RoutingDecision {
    return {
      ok: false,
      backend: null,
      model: null,
      rationale,
      expectedLatencyMs: 0,
      expectedCostUSD: 0,
      fallbacks: [],
      error: msg,
    };
  }

  getBackendStatus(hardware: HardwareProfile): {
    ollama: { available: boolean; models: string[] };
    anthropic: { available: boolean; models: string[] };
    openai: { available: boolean; models: string[] };
  } {
    const ollamaModels = this.catalog
      .filter((m) => m.backend === "ollama" && m.runsOn.includes(hardware))
      .map((m) => m.id);
    const anthropicModels = this.catalog
      .filter((m) => m.backend === "anthropic")
      .map((m) => m.id);
    const openaiModels = this.catalog
      .filter((m) => m.backend === "openai")
      .map((m) => m.id);

    return {
      ollama: { available: ollamaModels.length > 0, models: ollamaModels },
      anthropic: { available: anthropicModels.length > 0, models: anthropicModels },
      openai: { available: openaiModels.length > 0, models: openaiModels },
    };
  }

  getStats(): {
    totalModels: number;
    byBackend: Record<Backend, number>;
    byTaskKind: Record<TaskKind, string[]>;
  } {
    const byBackend: Record<Backend, number> = { ollama: 0, anthropic: 0, openai: 0 };
    for (const m of this.catalog) {
      byBackend[m.backend]++;
    }

    const byTaskKind: Record<TaskKind, string[]> = {
      chat: [],
      code: [],
      embed: [],
      reasoning: [],
      safety_critical: [],
      gcode_explain: [],
      quote_summary: [],
    };

    for (const m of this.catalog) {
      if ((m.tags ?? []).includes("embed")) byTaskKind.embed.push(m.id);
      if ((m.codeTier ?? 0) > 70) byTaskKind.code.push(m.id);
      if (m.qualityTier >= 85) byTaskKind.safety_critical.push(m.id);
      if (m.qualityTier >= 60) {
        byTaskKind.chat.push(m.id);
        byTaskKind.reasoning.push(m.id);
        byTaskKind.gcode_explain.push(m.id);
        byTaskKind.quote_summary.push(m.id);
      }
    }

    return {
      totalModels: this.catalog.length,
      byBackend,
      byTaskKind,
    };
  }
}

export const modelRoutingEngine = new ModelRoutingEngine();
