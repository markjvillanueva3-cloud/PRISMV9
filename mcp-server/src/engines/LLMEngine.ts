/**
 * LLMEngine — AI-Powered Manufacturing Intelligence
 *
 * Integrates Claude API for natural language queries about manufacturing,
 * quote explanations, process advice, and G-code annotation.
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
  max_tokens: number;
  temperature: number;
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
}

export interface LLMResponse {
  answer: string;
  context_used: string[];
  model: string;
  tokens_used: { input: number; output: number };
  duration_ms: number;
  cached: boolean;
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

export class LLMEngine {
  private config: LLMConfig;
  private cache = new Map<string, { response: LLMResponse; expires: number }>();
  private contextProviders: Array<() => ContextChunk[]> = [];
  private queryCount = 0;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      api_key: config?.api_key ?? process.env.ANTHROPIC_API_KEY,
      model: config?.model ?? "claude-sonnet-4-6",
      max_tokens: config?.max_tokens ?? 2048,
      temperature: config?.temperature ?? 0.3,
    };
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

    const systemPrompt = `You are PRISM, an AI manufacturing intelligence assistant.
You help machinists and engineers with CNC machining questions, quoting,
material selection, and process optimization. Be specific and practical.
Reference data from the PRISM knowledge base when available.${contextText}`;

    // Call Claude API
    if (!this.config.api_key) {
      // No API key — return context-only response.
      // Offline responses are deterministic for a given (prompt, context_types)
      // pair, so cache them to avoid rebuilding context on repeat queries.
      const offlineResult: LLMResponse = {
        answer: this._generateOfflineResponse(input.prompt, context),
        context_used: context.map(c => c.title),
        model: "offline",
        tokens_used: { input: 0, output: 0 },
        duration_ms: Date.now() - start,
        cached: false,
      };
      this.cache.set(cacheKey, { response: offlineResult, expires: Date.now() + 300_000 });
      return offlineResult;
    }

    try {
      const response = await this._callClaude(
        systemPrompt,
        input.prompt,
        input.temperature ?? this.config.temperature,
        input.max_tokens ?? this.config.max_tokens
      );

      const result: LLMResponse = {
        answer: response.text,
        context_used: context.map(c => c.title),
        model: this.config.model,
        tokens_used: response.usage,
        duration_ms: Date.now() - start,
        cached: false,
      };

      // Cache for 5 minutes
      this.cache.set(cacheKey, { response: result, expires: Date.now() + 300_000 });
      return result;
    } catch (error: any) {
      return {
        answer: `Error querying LLM: ${error.message}. Context available: ${context.map(c => c.title).join(", ")}`,
        context_used: context.map(c => c.title),
        model: this.config.model,
        tokens_used: { input: 0, output: 0 },
        duration_ms: Date.now() - start,
        cached: false,
      };
    }
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

  private _generateOfflineResponse(prompt: string, context: ContextChunk[]): string {
    if (context.length === 0) {
      return "No ANTHROPIC_API_KEY configured. Set the environment variable to enable AI-powered responses. "
        + "Available context providers can still supply relevant manufacturing data.";
    }
    return `[Offline Mode — No API key configured]\n\n`
      + `Based on PRISM's knowledge base, here is relevant information:\n\n`
      + context.map(c => `**${c.title}** (${c.type}): ${c.content}`).join("\n\n");
  }

  private _cacheKey(input: LLMQuery): string {
    return `${input.prompt.slice(0, 100)}:${input.context_types?.join(",") ?? "all"}`;
  }
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
