/**
 * LLMEngine — AI-Powered Manufacturing Intelligence
 *
 * Ollama-first LLM client for natural language queries about manufacturing,
 * quote explanations, process advice, and G-code annotation. Routes to a FREE
 * local Ollama model by default (so product features cost $0 at launch), with
 * an adaptive fallback ladder to the paid Claude API and then a deterministic
 * offline response. Policy via `config.prefer` / env `PRISM_LLM_PREFER`
 * (auto|ollama|claude). See `query()` for the provider loop.
 *
 * Context builder injects relevant material, machine, and tool data
 * to ground LLM responses in PRISM's knowledge base.
 *
 * WIRE-EXEMPT: internal LLM client consumed directly by other engines
 *   (LocalModelOrchestratorEngine, PRISMIntelligenceLayer, ElectrodeAIReasoningEngine,
 *   TrilobeElectrodeGeometryEngine, ColdHeadingToolConfiguratorEngine,
 *   AIExtractionReasonerEngine) and the registerTribalContextProvider boot path.
 *   The original `aiDispatcher` surface enumerated below was never built; the
 *   live AI dispatcher (`aiReasoningDispatcher.ts`) currently routes through
 *   different engines. Wire-through is a future expansion (peer-claimed at
 *   present), tracked separately from this engine's responsibility.
 *
 * Dispatcher (planned, not yet wired): aiDispatcher (ai_query, ai_explain_quote,
 *   ai_process_advice, ai_gcode_explain, ai_context_build)
 */

// ── Types ──────────────────────────────────────────────────────────

export interface LLMConfig {
  api_key?: string;
  model: string;
  /** Local Ollama model used for the free-by-default generation path. */
  ollama_model: string;
  /** Provider policy: "auto" = Ollama-first then Claude fallback (default);
   *  "ollama" = strict-free (Ollama only, then offline, never pays);
   *  "claude" = Claude only (then offline) -- for any consumer that needs frontier. */
  prefer: "auto" | "ollama" | "claude";
  /** Per-instance Ollama attempt timeout (ms); defaults to PRISM_LLM_OLLAMA_TIMEOUT_MS. */
  ollama_timeout_ms?: number;
  /** Local Ollama VISION model for the free queryVision() path (e.g. qwen2.5vl).
   *  Env: PRISM_LLM_OLLAMA_VISION_MODEL. Distinct from the text ollama_model. */
  ollama_vision_model: string;
  max_tokens: number;
  temperature: number;
}

/** Injectable provider deps -- testability + adaptivity. Defaults route to the
 *  live OllamaClientEngine (free) and the internal Claude fetch (paid fallback). */
export interface LLMDeps {
  ollamaGenerate?: (o: {
    model: string; prompt: string; system?: string; temperature?: number; maxTokens?: number;
  }) => Promise<{ ok: boolean; value: string | null; error: string | null }>;
  claudeCall?: (
    system: string, user: string, temperature: number, maxTokens: number,
  ) => Promise<{ text: string; usage: { input: number; output: number } }>;
  /** Caller-specific adequacy check for a local (Ollama) answer. Return false to
   *  escalate to Claude (e.g. "must be valid JSON", "must contain G-code"). When
   *  omitted, the default heuristic (refusal markers + length floor) is used. */
  adequate?: (answer: string, input: LLMQuery) => boolean;
  /** Default-overridable FREE vision generation path (Ollama vision model). */
  ollamaVisionGenerate?: (o: {
    model: string; prompt: string; system?: string; images: string[]; temperature?: number; maxTokens?: number;
  }) => Promise<{ ok: boolean; value: string | null; error: string | null }>;
  /** Default-overridable PAID vision backup (Claude vision message with image blocks). */
  claudeVisionCall?: (
    system: string, user: string,
    images: Array<{ data: string; media_type: string }>,
    temperature: number, maxTokens: number,
  ) => Promise<{ text: string; usage: { input: number; output: number } }>;
}

export interface ContextChunk {
  type: "material" | "machine" | "tool" | "formula" | "safety" | "job" | "custom" | "tribal";
  title: string;
  content: string;
  relevance: number;  // 0-1
}

export interface LLMQuery {
  prompt: string;
  context_types?: ContextChunk["type"][];
  max_context_chunks?: number;
  temperature?: number;
  max_tokens?: number;
  /** Task difficulty hint. "high" raises the local-answer adequacy bar so a weak
   *  local result escalates to Claude (the backup for "too complex for local").
   *  Default treats the task as low-complexity (accept most local output). */
  complexity?: "low" | "high";
  /** Minimum acceptable local-answer length (chars, trimmed). A shorter Ollama
   *  answer is treated as inadequate -> escalates to Claude when a backup exists. */
  min_answer_chars?: number;
  /** Override the system prompt. When set, this REPLACES the default PRISM
   *  manufacturing-assistant system prompt (registered context is still appended),
   *  so a caller with its own system prompt -- e.g. an agentic task-delegation or
   *  orchestration engine -- can route through this free substrate without losing
   *  its instructions. When omitted, the default PRISM system prompt is used. */
  system?: string;
}

export interface LLMResponse {
  answer: string;
  context_used: string[];
  model: string;
  tokens_used: { input: number; output: number };
  duration_ms: number;
  cached: boolean;
}

/** One image for a vision query. `data` is base64 (with OR without a
 *  `data:<mime>;base64,` prefix -- normalized internally). `media_type` is the
 *  MIME type used by the Claude vision backup; inferred from the data: prefix or
 *  defaults to image/png when omitted. */
export interface VisionImage {
  data: string;
  media_type?: string;
}

/** A multimodal (image + text) query -- the FREE print-to-CNC / CAD-drawing path.
 *  Routes Ollama-vision-first (free) -> Claude vision backup -> offline, exactly
 *  like the text query() ladder. */
export interface LLMVisionQuery {
  prompt: string;
  images: VisionImage[];
  /** Replaces the default vision system prompt (preserves a caller's own). */
  system?: string;
  /** "high" raises the local-answer adequacy bar (escalates a weak local read to Claude). */
  complexity?: "low" | "high";
  min_answer_chars?: number;
  max_tokens?: number;
  temperature?: number;
}

export interface QuoteExplanation {
  summary: string;
  cost_drivers: Array<{ factor: string; impact: string; suggestion?: string }>;
  comparison: string;
  confidence: number;
}

export interface ProcessAdvice {
  recommendation: string;
  parameters: Record<string, string | number>;
  alternatives: string[];
  safety_notes: string[];
  tribal_knowledge: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

/** After an Ollama failure, skip the Ollama path for this long before re-probing
 *  (avoids paying a connect/timeout penalty on every query when Ollama is down).
 *  Env-overridable for ops tuning. */
const OLLAMA_RETRY_COOLDOWN_MS = (() => {
  const n = Number(process.env.PRISM_LLM_OLLAMA_RETRY_MS);
  return Number.isFinite(n) && n >= 0 ? n : 60_000;
})();

/** Hard ceiling on a single Ollama attempt -- a cold model load or a hung daemon
 *  must NOT block the caller forever. On timeout the attempt is treated as a
 *  failure (opens the cooldown + falls through to Claude/offline). Env-tunable. */
const OLLAMA_TIMEOUT_MS = (() => {
  const n = Number(process.env.PRISM_LLM_OLLAMA_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 60_000;
})();

export class LLMEngine {
  private config: LLMConfig;
  private deps: LLMDeps;
  private cache = new Map<string, { response: LLMResponse; expires: number }>();
  private contextProviders: Array<() => ContextChunk[]> = [];
  private queryCount = 0;
  /** Epoch ms until which the Ollama path is skipped after a failure (adaptive cooldown). */
  private ollamaDownUntil = 0;

  constructor(config?: Partial<LLMConfig>, deps?: LLMDeps) {
    const envPrefer = (process.env.PRISM_LLM_PREFER ?? "").toLowerCase();
    const validPrefer = envPrefer === "ollama" || envPrefer === "claude" || envPrefer === "auto";
    this.config = {
      api_key: config?.api_key ?? process.env.ANTHROPIC_API_KEY,
      model: config?.model ?? "claude-sonnet-4-6",
      ollama_model: config?.ollama_model ?? process.env.PRISM_LLM_OLLAMA_MODEL ?? "qwen2.5-coder:32b",
      prefer: config?.prefer ?? (validPrefer ? (envPrefer as LLMConfig["prefer"]) : "auto"),
      ollama_timeout_ms: config?.ollama_timeout_ms ?? OLLAMA_TIMEOUT_MS,
      ollama_vision_model: config?.ollama_vision_model ?? process.env.PRISM_LLM_OLLAMA_VISION_MODEL ?? "qwen2.5vl:7b",
      max_tokens: config?.max_tokens ?? 2048,
      temperature: config?.temperature ?? 0.3,
    };
    this.deps = deps ?? {};
  }

  /** Provider attempt order from the configured policy (R7: explicit, not blended). */
  private _providerOrder(): Array<"ollama" | "claude"> {
    switch (this.config.prefer) {
      case "ollama": return ["ollama"];
      case "claude": return ["claude"];
      case "auto":
      default: return ["ollama", "claude"];
    }
  }

  /**
   * Is a non-empty local (Ollama) answer good enough to RETURN, or should it
   * escalate to Claude (the backup for "Ollama can't handle it / too complex")?
   * A caller-supplied `deps.adequate` wins; otherwise a heuristic: a local model
   * that emits a refusal/incapacity phrase ("I cannot...", "I don't have enough
   * information") -- or, for a `complexity:"high"` task, a too-short answer below
   * the length floor -- is inadequate. Conservative for low-complexity (accept
   * unless an explicit refusal), so escalation fires only when genuinely needed.
   * Pure.
   */
  private _ollamaAnswerAdequate(answer: string, input: LLMQuery): boolean {
    if (this.deps.adequate) {
      // The caller predicate is untrusted code; a throw must NOT crash query().
      // A throwing/failed adequacy check is treated as INADEQUATE (escalate to the
      // backup) -- the safe direction when the local answer cannot be trusted.
      try {
        return this.deps.adequate(answer, input);
      } catch {
        return false;
      }
    }
    const text = answer.trim();
    // Even a low-complexity task needs SOME content -- an all-whitespace/blank
    // answer (floor 1) is never adequate; complexity:"high" demands a real answer.
    const floor = input.min_answer_chars ?? (input.complexity === "high" ? 40 : 1);
    if (text.length < floor) return false;
    // A local model that LEADS its answer with a refusal/incapacity phrase could
    // not handle the task -> escalate to Claude. Anchored to the answer START so a
    // usable answer that merely contains "...I cannot guarantee..." mid-sentence is
    // NOT escalated (avoids needless paid calls -- cost-correct for free-at-launch).
    const leadingRefusal =
      /^\s*(i (can'?t|cannot|am unable to|do(?: no|n'?)t know)|as an ai language model|i'?m sorry,? but|i (?:do(?: no|n'?)t|don'?t) have (?:enough|the) (?:information|context|details))\b/i;
    if (leadingRefusal.test(text)) return false;
    return true;
  }

  /** Test-hermeticity: under a test runner, the DEFAULT (non-injected) provider
   *  paths must NOT make a real network call -- tests that exercise a provider
   *  inject deps; everything else degrades deterministically to offline. Override
   *  with PRISM_LLM_ALLOW_NET_IN_TEST=1. (Production never sets VITEST/NODE_ENV=test.) */
  private _netDisabledInTest(): boolean {
    return (
      (!!process.env.VITEST || process.env.NODE_ENV === "test") &&
      process.env.PRISM_LLM_ALLOW_NET_IN_TEST !== "1"
    );
  }

  /** Default Ollama path -> the live OllamaClientEngine (lazy import avoids a
   *  circular dep + keeps module load cheap). Free, local, no billing. */
  private async _defaultOllamaGenerate(o: {
    model: string; prompt: string; system?: string; temperature?: number; maxTokens?: number;
  }): Promise<{ ok: boolean; value: string | null; error: string | null }> {
    if (this._netDisabledInTest()) {
      return { ok: false, value: null, error: "ollama default path disabled under test env" };
    }
    try {
      const { ollamaClientEngine } = await import("./OllamaClientEngine.js");
      if (!ollamaClientEngine.isConnected()) {
        const c = await ollamaClientEngine.connect();
        if (!c.ok) return { ok: false, value: null, error: c.error ?? "ollama connect failed" };
      }
      const r = await ollamaClientEngine.generate(o);
      return { ok: r.ok, value: r.value, error: r.error };
    } catch (e: any) {
      return { ok: false, value: null, error: e?.message ?? String(e) };
    }
  }

  /** Race an Ollama attempt against a hard timeout so a cold/hung daemon degrades
   *  to the next provider instead of hanging the caller (operator: robust+adaptive). */
  private _withTimeout(
    p: Promise<{ ok: boolean; value: string | null; error: string | null }>,
    ms: number,
  ): Promise<{ ok: boolean; value: string | null; error: string | null }> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<{ ok: boolean; value: string | null; error: string | null }>((resolve) => {
      timer = setTimeout(() => resolve({ ok: false, value: null, error: "ollama timeout" }), ms);
      timer.unref?.();
    });
    // Convert any rejection from the provider into a failure result so the race
    // never throws -- the caller treats !ok as "fall through to the next provider".
    const safe = p.catch((e: any) => ({ ok: false, value: null, error: e?.message ?? String(e) }));
    return Promise.race([safe, timeout]).finally(() => clearTimeout(timer));
  }

  /**
   * Register a context provider function that returns relevant chunks.
   */
  registerContextProvider(provider: () => ContextChunk[]): void {
    this.contextProviders.push(provider);
  }

  /**
   * Build context from all registered providers, ranked by relevance.
   */
  buildContext(
    query: string,
    types?: ContextChunk["type"][],
    maxChunks = 10
  ): ContextChunk[] {
    const allChunks: ContextChunk[] = [];

    for (const provider of this.contextProviders) {
      try {
        allChunks.push(...provider());
      } catch { /* skip failing providers */ }
    }

    let filtered = allChunks;
    if (types && types.length > 0) {
      filtered = filtered.filter(c => types.includes(c.type));
    }

    // Boost relevance based on keyword overlap with query
    const queryTerms = query.toLowerCase().split(/\s+/);
    const scored = filtered.map(chunk => {
      let boost = 0;
      const text = `${chunk.title} ${chunk.content}`.toLowerCase();
      for (const term of queryTerms) {
        if (term.length > 2 && text.includes(term)) boost += 0.1;
      }
      return { ...chunk, relevance: Math.min(1, chunk.relevance + boost) };
    });

    return scored
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxChunks);
  }

  /**
   * Query the LLM with automatic context injection.
   */
  async query(input: LLMQuery): Promise<LLMResponse> {
    const start = Date.now();
    this.queryCount++;

    // Check cache
    const cacheKey = this._cacheKey(input);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return { ...cached.response, cached: true, duration_ms: Date.now() - start };
    }

    // Build context
    const context = this.buildContext(
      input.prompt,
      input.context_types,
      input.max_context_chunks ?? 10
    );

    const contextText = context.length > 0
      ? `\n\nRelevant PRISM manufacturing data:\n${context.map(c => `[${c.type}] ${c.title}: ${c.content}`).join("\n")}`
      : "";

    const systemPrompt = input.system
      ? `${input.system}${contextText}`
      : `You are PRISM, an AI manufacturing intelligence assistant.
You help machinists and engineers with CNC machining questions, quoting,
material selection, and process optimization. Be specific and practical.
Reference data from the PRISM knowledge base when available.${contextText}`;

    // Provider selection -- Ollama-first by default (free at launch), adaptive
    // fallback to Claude (paid), then a deterministic offline response. Graceful
    // degradation = zero regression: with Ollama down + a key set, this behaves
    // exactly like the prior Claude-only path.
    const temperature = input.temperature ?? this.config.temperature;
    const maxTokens = input.max_tokens ?? this.config.max_tokens;
    const ctxTitles = context.map((c) => c.title);

    for (const provider of this._providerOrder()) {
      if (provider === "ollama") {
        if (Date.now() < this.ollamaDownUntil) continue; // in adaptive cooldown
        const ollamaGenerate = this.deps.ollamaGenerate ?? this._defaultOllamaGenerate.bind(this);
        const r = await this._withTimeout(
          ollamaGenerate({
            model: this.config.ollama_model,
            prompt: input.prompt,
            system: systemPrompt,
            temperature,
            maxTokens,
          }),
          this.config.ollama_timeout_ms ?? OLLAMA_TIMEOUT_MS,
        );
        if (r.ok && r.value !== null && r.value !== "") {
          // Escalate to Claude (the backup) when the local answer is inadequate
          // ("Ollama can't handle it / too complex") AND a real Claude backup is
          // configured. In strict-free / no-key mode there is no backup, so the
          // free local answer is the best available -> return it rather than drop
          // to the generic offline stub.
          const adequate = this._ollamaAnswerAdequate(r.value, input);
          const claudeBackupAvailable =
            !!this.config.api_key && this._providerOrder().includes("claude");
          if (adequate || !claudeBackupAvailable) {
            const result: LLMResponse = {
              answer: r.value,
              context_used: ctxTitles,
              model: `${this.config.ollama_model} (ollama)`,
              tokens_used: { input: 0, output: 0 }, // local/free -- no billing
              duration_ms: Date.now() - start,
              cached: false,
            };
            this.cache.set(cacheKey, { response: result, expires: Date.now() + 300_000 });
            return result;
          }
          // Inadequate + a Claude backup exists -> escalate. Do NOT open the
          // availability cooldown: Ollama is UP, it just could not handle this task.
          continue;
        }
        // Ollama unavailable/empty -> open a cooldown window, fall through.
        this.ollamaDownUntil = Date.now() + OLLAMA_RETRY_COOLDOWN_MS;
        continue;
      }

      // provider === "claude"
      if (!this.config.api_key) continue; // no key -> skip to offline
      try {
        const claudeCall = this.deps.claudeCall ?? this._callClaude.bind(this);
        const response = await claudeCall(systemPrompt, input.prompt, temperature, maxTokens);
        const result: LLMResponse = {
          answer: response.text,
          context_used: ctxTitles,
          model: this.config.model,
          tokens_used: response.usage,
          duration_ms: Date.now() - start,
          cached: false,
        };
        this.cache.set(cacheKey, { response: result, expires: Date.now() + 300_000 });
        return result;
      } catch {
        // Claude failed -> fall through to the offline response.
      }
    }

    // All configured providers exhausted -> deterministic, context-grounded
    // offline response. NOT cached: offline can be a transient degraded fallback
    // (Ollama + Claude both momentarily down), so the next call must re-probe a
    // recovered provider rather than be pinned to offline for the cache TTL.
    return {
      answer: this._generateOfflineResponse(input.prompt, context),
      context_used: ctxTitles,
      model: "offline",
      tokens_used: { input: 0, output: 0 },
      duration_ms: Date.now() - start,
      cached: false,
    };
  }

  /**
   * Multimodal (vision) query -- the FREE print-to-CNC / CAD-drawing path. Mirrors
   * query()'s provider ladder: the Ollama VISION model first (free) -> Claude vision
   * backup (paid; only when a key is set AND the local read is inadequate, or Ollama
   * is down) -> deterministic offline. The same test-hermeticity guard applies --
   * under VITEST the DEFAULT provider paths return offline (inject deps to exercise
   * a provider). NOT cached: image payloads are large + rarely repeat identically in
   * a session, and a cheap image fingerprint would risk a wrong-answer collision, so
   * every call re-probes the live providers (offline is never pinned).
   */
  async queryVision(input: LLMVisionQuery): Promise<LLMResponse> {
    const start = Date.now();
    this.queryCount++;

    const systemPrompt = input.system
      ? input.system
      : `You are PRISM, an AI manufacturing-vision assistant. Read engineering
drawings, blueprints, part photos, and screenshots precisely. Extract dimensions,
tolerances, GD&T, features, and notes exactly as shown -- never invent a value you
cannot see in the image.`;

    const temperature = input.temperature ?? this.config.temperature;
    const maxTokens = input.max_tokens ?? this.config.max_tokens;

    // Normalize once: raw base64 (no data: prefix) for Ollama; {data, media_type} for Claude.
    const norm = input.images.map((img) => this._normalizeImage(img));
    const ollamaImages = norm.map((n) => n.data);
    const claudeImages = norm.map((n) => ({ data: n.data, media_type: n.media_type }));

    for (const provider of this._providerOrder()) {
      if (provider === "ollama") {
        if (Date.now() < this.ollamaDownUntil) continue; // adaptive cooldown
        const gen = this.deps.ollamaVisionGenerate ?? this._defaultOllamaVisionGenerate.bind(this);
        const r = await this._withTimeout(
          gen({
            model: this.config.ollama_vision_model,
            prompt: input.prompt,
            system: systemPrompt,
            images: ollamaImages,
            temperature,
            maxTokens,
          }),
          this.config.ollama_timeout_ms ?? OLLAMA_TIMEOUT_MS,
        );
        if (r.ok && r.value !== null && r.value !== "") {
          const adequate = this._visionAnswerAdequate(r.value, input);
          const claudeBackupAvailable =
            !!this.config.api_key && this._providerOrder().includes("claude");
          if (adequate || !claudeBackupAvailable) {
            return {
              answer: r.value,
              context_used: [],
              model: `${this.config.ollama_vision_model} (ollama)`,
              tokens_used: { input: 0, output: 0 }, // local/free -- no billing
              duration_ms: Date.now() - start,
              cached: false,
            };
          }
          continue; // inadequate + a Claude backup exists -> escalate (Ollama is up, no cooldown)
        }
        // Ollama vision unavailable/empty -> open cooldown, fall through.
        this.ollamaDownUntil = Date.now() + OLLAMA_RETRY_COOLDOWN_MS;
        continue;
      }

      // provider === "claude"
      if (!this.config.api_key) continue; // no key -> skip to offline
      try {
        const call = this.deps.claudeVisionCall ?? this._callClaudeVision.bind(this);
        const response = await call(systemPrompt, input.prompt, claudeImages, temperature, maxTokens);
        return {
          answer: response.text,
          context_used: [],
          model: this.config.model,
          tokens_used: response.usage,
          duration_ms: Date.now() - start,
          cached: false,
        };
      } catch {
        // Claude vision failed -> fall through to offline.
      }
    }

    return {
      answer: this._generateOfflineVisionResponse(),
      context_used: [],
      model: "offline",
      tokens_used: { input: 0, output: 0 },
      duration_ms: Date.now() - start,
      cached: false,
    };
  }

  /** Strip a data: URI prefix (if present) -> raw base64 + the declared media_type
   *  (defaults to image/png). Ollama wants raw base64; Claude wants {data, media_type}. Pure. */
  private _normalizeImage(img: VisionImage): { data: string; media_type: string } {
    const raw = (img.data ?? "").trim();
    const m = raw.match(/^data:([a-z0-9.+/-]+);base64,([\s\S]*)$/i);
    if (m) return { data: m[2], media_type: img.media_type ?? m[1] };
    return { data: raw, media_type: img.media_type ?? "image/png" };
  }

  /** Vision-answer adequacy: same heuristic as _ollamaAnswerAdequate (length floor +
   *  leading-refusal) but WITHOUT the text-only deps.adequate predicate, so a text
   *  caller's adequacy contract never wrongly applies to a vision read. Pure. */
  private _visionAnswerAdequate(answer: string, input: LLMVisionQuery): boolean {
    const text = answer.trim();
    const floor = input.min_answer_chars ?? (input.complexity === "high" ? 40 : 1);
    if (text.length < floor) return false;
    const leadingRefusal =
      /^\s*(i (can'?t|cannot|am unable to|do(?: no|n'?)t know)|as an ai language model|i'?m sorry,? but|i (?:do(?: no|n'?)t|don'?t) have (?:enough|the) (?:information|context|details))\b/i;
    if (leadingRefusal.test(text)) return false;
    return true;
  }

  /** Default Ollama VISION path -> live OllamaClientEngine.generate with base64 images.
   *  Net-disabled under VITEST (returns !ok -> offline) unless PRISM_LLM_ALLOW_NET_IN_TEST=1. */
  private async _defaultOllamaVisionGenerate(o: {
    model: string; prompt: string; system?: string; images: string[]; temperature?: number; maxTokens?: number;
  }): Promise<{ ok: boolean; value: string | null; error: string | null }> {
    if (this._netDisabledInTest()) {
      return { ok: false, value: null, error: "ollama vision default path disabled under test env" };
    }
    try {
      const { ollamaClientEngine } = await import("./OllamaClientEngine.js");
      if (!ollamaClientEngine.isConnected()) {
        const c = await ollamaClientEngine.connect();
        if (!c.ok) return { ok: false, value: null, error: c.error ?? "ollama connect failed" };
      }
      const r = await ollamaClientEngine.generate({
        model: o.model, prompt: o.prompt, system: o.system,
        images: o.images, temperature: o.temperature, maxTokens: o.maxTokens,
      });
      return { ok: r.ok, value: r.value, error: r.error };
    } catch (e: any) {
      return { ok: false, value: null, error: e?.message ?? String(e) };
    }
  }

  /** Default Claude VISION backup -> anthropic messages with image content blocks.
   *  Net-disabled under VITEST (throws -> caught -> offline). */
  private async _callClaudeVision(
    system: string, user: string,
    images: Array<{ data: string; media_type: string }>,
    temperature: number, maxTokens: number,
  ): Promise<{ text: string; usage: { input: number; output: number } }> {
    if (this._netDisabledInTest()) {
      throw new Error("claude vision default path disabled under test env");
    }
    const content: Array<Record<string, unknown>> = images.map((img) => ({
      type: "image",
      source: { type: "base64", media_type: img.media_type, data: img.data },
    }));
    content.push({ type: "text", text: user });
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.api_key!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: "user", content }],
      }),
    });
    if (!resp.ok) {
      throw new Error(`Claude vision API error: ${resp.status} ${resp.statusText}`);
    }
    const data: any = await resp.json();
    return {
      text: data.content?.[0]?.text ?? "",
      usage: {
        input: data.usage?.input_tokens ?? 0,
        output: data.usage?.output_tokens ?? 0,
      },
    };
  }

  private _generateOfflineVisionResponse(): string {
    return "No vision AI provider available (Ollama vision model down and no Claude vision backup key). "
      + "Start a local Ollama vision model (e.g. qwen2.5vl) or configure ANTHROPIC_API_KEY to enable image analysis.";
  }

  /**
   * Explain why a quote costs what it does.
   */
  async explainQuote(quoteData: {
    part_name: string;
    material: string;
    quantity: number;
    total_price: number;
    cycle_time_min: number;
    setup_time_min: number;
    material_cost: number;
    machine_rate_hr: number;
  }): Promise<QuoteExplanation> {
    const prompt = `Explain this manufacturing quote:
Part: ${quoteData.part_name}, Material: ${quoteData.material}
Quantity: ${quoteData.quantity}, Total: $${quoteData.total_price.toFixed(2)}
Cycle time: ${quoteData.cycle_time_min}min, Setup: ${quoteData.setup_time_min}min
Material cost: $${quoteData.material_cost.toFixed(2)}, Machine rate: $${quoteData.machine_rate_hr}/hr

Break down the cost drivers and suggest any optimizations.`;

    const response = await this.query({
      prompt,
      context_types: ["material", "machine", "formula"],
      max_tokens: 1500,
    });

    // Parse structured response (best-effort)
    const machineTime = quoteData.cycle_time_min * quoteData.quantity + quoteData.setup_time_min;
    const machineCost = (machineTime / 60) * quoteData.machine_rate_hr;

    return {
      summary: response.answer,
      cost_drivers: [
        { factor: "Material", impact: `$${quoteData.material_cost.toFixed(2)} (${Math.round(quoteData.material_cost / quoteData.total_price * 100)}%)` },
        { factor: "Machine Time", impact: `$${machineCost.toFixed(2)} (${Math.round(machineCost / quoteData.total_price * 100)}%)` },
        { factor: "Setup", impact: `${quoteData.setup_time_min}min amortized over ${quoteData.quantity} parts` },
      ],
      comparison: `Unit price: $${(quoteData.total_price / quoteData.quantity).toFixed(2)}/part`,
      confidence: 0.85,
    };
  }

  /**
   * Get process advice for a machining operation.
   */
  async processAdvice(input: {
    operation: string;
    material: string;
    tool?: string;
    machine?: string;
    issue?: string;
  }): Promise<ProcessAdvice> {
    const prompt = `Manufacturing process advice needed:
Operation: ${input.operation}
Material: ${input.material}
${input.tool ? `Tool: ${input.tool}` : ""}
${input.machine ? `Machine: ${input.machine}` : ""}
${input.issue ? `Issue: ${input.issue}` : ""}

Provide specific parameters, alternatives, and safety considerations.`;

    const response = await this.query({
      prompt,
      context_types: ["material", "tool", "formula", "safety", "tribal"],
      max_tokens: 1500,
    });

    // TK-AI Hardening: pull Master Machinist tips for this context. Lazy-load
    // the TribalKnowledgeEngine to avoid the LLMEngine <-> TribalKnowledgeEngine
    // circular import that would form via a top-level import.
    const tribalKnowledge: string[] = [];
    try {
      const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");
      const masterMachinist = tribalKnowledgeEngine.masterMachinistRecommend({
        material: input.material,
        operation: input.operation,
        machine: input.machine,
      });
      for (const rec of masterMachinist.recommendations) {
        tribalKnowledge.push(rec.message);
      }
    } catch {
      // Tribal knowledge engine unavailable — proceed without tribal context.
    }

    return {
      recommendation: response.answer,
      parameters: {},
      alternatives: [],
      safety_notes: [],
      tribal_knowledge: tribalKnowledge,
    };
  }

  /**
   * Get engine statistics.
   */
  stats(): {
    query_count: number;
    cache_size: number;
    context_providers: number;
    model: string;
    has_api_key: boolean;
  } {
    return {
      query_count: this.queryCount,
      cache_size: this.cache.size,
      context_providers: this.contextProviders.length,
      model: this.config.model,
      has_api_key: !!this.config.api_key,
    };
  }

  // ── Private Methods ─────────────────────────────────────────────

  private async _callClaude(
    system: string, user: string,
    temperature: number, maxTokens: number
  ): Promise<{ text: string; usage: { input: number; output: number } }> {
    if (this._netDisabledInTest()) {
      // Caught by the claude try/catch in query() -> falls through to offline.
      throw new Error("claude default path disabled under test env");
    }
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.api_key!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!resp.ok) {
      throw new Error(`Claude API error: ${resp.status} ${resp.statusText}`);
    }

    const data: any = await resp.json();
    return {
      text: data.content?.[0]?.text ?? "",
      usage: {
        input: data.usage?.input_tokens ?? 0,
        output: data.usage?.output_tokens ?? 0,
      },
    };
  }

  private _generateOfflineResponse(_prompt: string, context: ContextChunk[]): string {
    if (context.length === 0) {
      return "No ANTHROPIC_API_KEY configured. Set the environment variable to enable AI-powered responses. "
        + "Available context providers can still supply relevant manufacturing data.";
    }
    return `[Offline Mode — No API key configured]\n\n`
      + `Based on PRISM's knowledge base, here is relevant information:\n\n`
      + context.map(c => `**${c.title}** (${c.type}): ${c.content}`).join("\n\n");
  }

  private _cacheKey(input: LLMQuery): string {
    // Key on a stable hash of the FULL prompt + FULL system (not a prefix slice):
    // agentic/orchestration callers often share a long boilerplate system+prompt
    // prefix, so prefix-slicing would collide distinct tasks onto one cache entry.
    // Provider policy + complexity + min-len are also keyed so a response produced
    // under one policy is never served to a query expecting a different one.
    return [
      this.config.prefer,
      input.complexity ?? "low",
      input.min_answer_chars ?? "",
      _hashKey(input.system ?? ""),
      _hashKey(input.prompt),
      input.context_types?.join(",") ?? "all",
    ].join(":");
  }
}

/** Stable, fast, collision-resistant-enough string hash (FNV-1a 32-bit) for cache
 *  keys -- distinguishes the FULL string, unlike a fixed-length prefix slice. Pure. */
function _hashKey(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export const llmEngine = new LLMEngine();

/**
 * TK-AI Hardening: Register tribal knowledge as a context provider (restored from b7e0b298f L643).
 * Lazy-loads TribalKnowledgeEngine to avoid circular dependency, then registers a
 * provider that yields the top 10 tribal tips (filtered to confidence >= 70) as
 * ContextChunk[] with type="tribal".
 *
 * Idempotent at the call-site level (each call appends one more provider),
 * but the module-load auto-registration below ensures default wiring.
 */
export async function registerTribalContextProvider(): Promise<void> {
  try {
    const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");

    llmEngine.registerContextProvider(() => {
      const tips = tribalKnowledgeEngine.search({ limit: 20, min_confidence: 70 });

      return tips.slice(0, 10).map(tip => ({
        type: "tribal" as const,
        title: `[Shop Floor] ${tip.title}`,
        content: `${tip.body?.slice(0, 300) || ""} (Confidence: ${tip.confidence}%, Source: ${tip.source || "shop_floor"})`,
        relevance: (tip.confidence || 70) / 100,
      }));
    });
  } catch {
    // Tribal knowledge engine not available — skip registration silently.
  }
}

// Auto-register tribal provider on module load (non-blocking, fire-and-forget).
registerTribalContextProvider().catch(() => {});
