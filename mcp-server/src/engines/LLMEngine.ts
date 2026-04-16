/**
 * LLMEngine — AI-Powered Manufacturing Intelligence
 *
 * Integrates Claude API for natural language queries about manufacturing,
 * quote explanations, process advice, and G-code annotation.
 *
 * Context builder injects relevant material, machine, and tool data
 * to ground LLM responses in PRISM's knowledge base.
 *
 * Dispatcher: aiDispatcher (ai_query, ai_explain_quote, ai_process_advice,
 *             ai_gcode_explain, ai_context_build)
 */

import {
  getAnthropicApiKey,
  getModelForTier,
  getOpenAIApiKey,
  getPreferredReasoningProvider,
  hasAnyReasoningApiKey,
  hasAnthropicApiKey,
  hasOpenAIApiKey,
  type ReasoningProvider,
} from "../config/api-config.js";
import {
  getPrismRuntimeProfile,
  type PrismReasoningDepth,
  type PrismRuntimeProfileId,
} from "../config/reasoningProfiles.js";

// ── Types ──────────────────────────────────────────────────────────

export interface LLMConfig {
  api_key?: string;
  provider?: ReasoningProvider | "auto";
  runtimeProfileId?: PrismRuntimeProfileId;
  reasoningDepth?: PrismReasoningDepth;
  model: string;
  max_tokens: number;
  temperature: number;
  // Advisor Strategy (Anthropic beta)
  use_advisor?: boolean;
  advisor_model?: string;
  advisor_max_uses?: number;
  // Multi-Role Internal Reasoning
  use_multi_role?: boolean;
  roles?: AdvisorRole[];
}

/** Advisor role for multi-perspective reasoning */
export interface AdvisorRole {
  name: string;
  perspective: string;
  focus: string[];
}

/** Default manufacturing advisor roles for Pattern C */
export const MANUFACTURING_ADVISOR_ROLES: AdvisorRole[] = [
  {
    name: "ARCHITECT",
    perspective: "Systems architect reviewing design",
    focus: ["interface design", "dependencies", "separation of concerns", "scalability"],
  },
  {
    name: "PHYSICIST",
    perspective: "Manufacturing physics expert",
    focus: ["formula correctness", "constants.ts references", "unit consistency", "safety limits"],
  },
  {
    name: "REVIEWER",
    perspective: "Senior code reviewer",
    focus: ["edge cases", "error handling", "test coverage", "security", "performance"],
  },
];

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
    const runtimeProfile = getPrismRuntimeProfile(config?.runtimeProfileId);
    const provider = config?.provider === "auto"
      ? getPreferredReasoningProvider()
      : config?.provider ?? runtimeProfile.executionProvider;

    this.config = {
      api_key: config?.api_key
        ?? (provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY),
      provider,
      runtimeProfileId: config?.runtimeProfileId ?? runtimeProfile.id,
      reasoningDepth: config?.reasoningDepth ?? runtimeProfile.reasoningDepth,
      model: config?.model ?? runtimeProfile.tierModels.sonnet,
      max_tokens: config?.max_tokens ?? 2048,
      temperature: config?.temperature ?? 0.3,
      use_advisor: provider === "anthropic" ? config?.use_advisor : false,
      advisor_model: provider === "anthropic"
        ? config?.advisor_model ?? runtimeProfile.tierModels.opus
        : undefined,
      advisor_max_uses: config?.advisor_max_uses,
      use_multi_role: config?.use_multi_role,
      roles: config?.roles,
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
   * @param input Query parameters
   * @param options Optional flags for advisor/multi-role features
   */
  async query(
    input: LLMQuery,
    options?: { useAdvisor?: boolean; useMultiRole?: boolean }
  ): Promise<LLMResponse> {
    const start = Date.now();
    this.queryCount++;

    // Check cache (skip cache for advisor/multi-role queries)
    const cacheKey = this._cacheKey(input);
    if (!options?.useAdvisor && !options?.useMultiRole) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return { ...cached.response, cached: true, duration_ms: Date.now() - start };
      }
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

    // Call a live reasoning provider when configured
    if (!hasAnyReasoningApiKey()) {
      // No API key — return context-only response
      return {
        answer: this._generateOfflineResponse(input.prompt, context),
        context_used: context.map(c => c.title),
        model: "offline",
        tokens_used: { input: 0, output: 0 },
        duration_ms: Date.now() - start,
        cached: false,
      };
    }

    try {
      const response = await this._callModel(
        systemPrompt,
        input.prompt,
        input.temperature ?? this.config.temperature,
        input.max_tokens ?? this.config.max_tokens,
        options
      );

      const result: LLMResponse = {
        answer: response.text,
        context_used: context.map(c => c.title),
        model: response.model,
        tokens_used: response.usage,
        duration_ms: Date.now() - start,
        cached: false,
      };

      // Cache for 5 minutes (skip for advisor/multi-role)
      if (!options?.useAdvisor && !options?.useMultiRole) {
        this.cache.set(cacheKey, { response: result, expires: Date.now() + 300_000 });
      }
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
   * TK-AI Hardening: Integrates Master Machinist tribal knowledge.
   */
  async processAdvice(input: {
    operation: string;
    material: string;
    tool?: string;
    machine?: string;
    issue?: string;
  }): Promise<ProcessAdvice> {
    // TK-AI: Fetch tribal knowledge for this context
    let tribalTips: string[] = [];
    try {
      // Lazy import to avoid circular dependency
      const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");
      const masterMachinist = tribalKnowledgeEngine.masterMachinistRecommend({
        material: input.material,
        machine: input.machine,
        operation: input.operation,
      });
      tribalTips = masterMachinist.recommendations.map(r => r.message);
    } catch { /* tribal knowledge unavailable */ }

    const tribalContext = tribalTips.length > 0
      ? `\n\nTribal Knowledge (from senior machinists):\n${tribalTips.join("\n")}`
      : "";

    const prompt = `Manufacturing process advice needed:
Operation: ${input.operation}
Material: ${input.material}
${input.tool ? `Tool: ${input.tool}` : ""}
${input.machine ? `Machine: ${input.machine}` : ""}
${input.issue ? `Issue: ${input.issue}` : ""}${tribalContext}

Provide specific parameters, alternatives, and safety considerations.`;

    const response = await this.query({
      prompt,
      context_types: ["material", "tool", "formula", "safety", "tribal"],
      max_tokens: 1500,
    });

    return {
      recommendation: response.answer,
      parameters: {},
      alternatives: [],
      safety_notes: [],
      tribal_knowledge: tribalTips,
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
    provider?: ReasoningProvider | "auto";
  } {
    return {
      query_count: this.queryCount,
      cache_size: this.cache.size,
      context_providers: this.contextProviders.length,
      model: this.config.model,
      has_api_key: hasAnyReasoningApiKey(),
      provider: this.config.provider,
    };
  }

  // ── Private Methods ─────────────────────────────────────────────

  private async _callModel(
    system: string, user: string,
    temperature: number, maxTokens: number,
    options?: { useAdvisor?: boolean; useMultiRole?: boolean }
  ): Promise<{ text: string; usage: { input: number; output: number }; advisor_calls?: number; model: string }> {
    let provider = this.config.provider === "auto"
      ? getPreferredReasoningProvider()
      : this.config.provider ?? "anthropic";

    if (provider === "openai" && !hasOpenAIApiKey() && hasAnthropicApiKey()) {
      provider = "anthropic";
    } else if (provider === "anthropic" && !hasAnthropicApiKey() && hasOpenAIApiKey()) {
      provider = "openai";
    }

    const liveModel = provider === "openai"
      ? (this.config.provider === "openai" ? this.config.model : getModelForTier("sonnet", "openai"))
      : (this.config.provider === "anthropic" || this.config.provider === undefined || this.config.provider === "auto"
        ? this.config.model
        : getModelForTier("sonnet", "anthropic"));

    if (provider === "openai") {
      return this._callOpenAI(system, user, temperature, maxTokens, liveModel, options);
    }

    return this._callClaude(system, user, temperature, maxTokens, liveModel, options);
  }

  private async _callClaude(
    system: string, user: string,
    temperature: number, maxTokens: number,
    model: string,
    options?: { useAdvisor?: boolean; useMultiRole?: boolean }
  ): Promise<{ text: string; usage: { input: number; output: number }; advisor_calls?: number; model: string }> {
    const useAdvisor = options?.useAdvisor ?? this.config.use_advisor;
    const useMultiRole = options?.useMultiRole ?? this.config.use_multi_role;

    // Build headers — add beta header if using advisor
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": this.config.api_key ?? getAnthropicApiKey(),
      "anthropic-version": "2023-06-01",
    };
    if (useAdvisor) {
      headers["anthropic-beta"] = "advisor-tool-2026-03-01";
    }

    // Build tools array — add advisor tool if enabled
    const tools: any[] = [];
    if (useAdvisor) {
      tools.push({
        type: "advisor_20260301",
        name: "advisor",
        model: this.config.advisor_model ?? "claude-opus-4-6",
        max_uses: this.config.advisor_max_uses ?? 2,
      });
    }

    // Enhance system prompt with multi-role reasoning if enabled
    let enhancedSystem = system;
    if (useMultiRole) {
      const roles = this.config.roles ?? MANUFACTURING_ADVISOR_ROLES;
      enhancedSystem = this._buildMultiRolePrompt(system, roles);
    }

    const body: any = {
      model,
      max_tokens: maxTokens,
      temperature,
      system: enhancedSystem,
      messages: [{ role: "user", content: user }],
    };
    if (tools.length > 0) {
      body.tools = tools;
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new Error(`Claude API error: ${resp.status} ${resp.statusText}`);
    }

    const data: any = await resp.json();

    // Count advisor tool calls if present
    let advisorCalls = 0;
    if (Array.isArray(data.content)) {
      advisorCalls = data.content.filter(
        (block: any) => block.type === "tool_use" && block.name === "advisor"
      ).length;
    }

    return {
      text: data.content?.[0]?.text ?? "",
      usage: {
        input: data.usage?.input_tokens ?? 0,
        output: data.usage?.output_tokens ?? 0,
      },
      advisor_calls: advisorCalls,
      model,
    };
  }

  private async _callOpenAI(
    system: string, user: string,
    temperature: number, maxTokens: number,
    model: string,
    options?: { useAdvisor?: boolean; useMultiRole?: boolean }
  ): Promise<{ text: string; usage: { input: number; output: number }; advisor_calls?: number; model: string }> {
    const useMultiRole = options?.useMultiRole ?? this.config.use_multi_role;
    const enhancedSystem = useMultiRole
      ? this._buildMultiRolePrompt(system, this.config.roles ?? MANUFACTURING_ADVISOR_ROLES)
      : system;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.api_key ?? getOpenAIApiKey()}`,
      },
      body: JSON.stringify({
        model,
        reasoning: {
          effort:
            this.config.reasoningDepth === "agentic"
              ? "high"
              : this.config.reasoningDepth === "deep"
                ? "medium"
                : "low",
        },
        max_output_tokens: maxTokens,
        temperature,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: enhancedSystem }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: user }],
          },
        ],
        metadata: {
          prism_runtime_profile: this.config.runtimeProfileId ?? getPrismRuntimeProfile().id,
          advisor_requested: Boolean(options?.useAdvisor),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const outputItems = Array.isArray(data.output)
      ? data.output as Array<Record<string, unknown>>
      : [];
    const textBlocks = outputItems.flatMap((item) => {
      const content = Array.isArray(item.content)
        ? item.content as Array<Record<string, unknown>>
        : [];
      return content
        .filter((block) => block.type === "output_text" || block.type === "text")
        .map((block) => String(block.text ?? ""));
    });
    const outputText = typeof data.output_text === "string"
      ? data.output_text
      : textBlocks.join("\n");
    const usage = (data.usage as Record<string, unknown> | undefined) ?? {};

    return {
      text: outputText,
      usage: {
        input: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
        output: Number(usage.output_tokens ?? usage.completion_tokens ?? 0),
      },
      advisor_calls: 0,
      model,
    };
  }

  /**
   * Build multi-role reasoning prompt (Pattern C — internal advisors).
   * Adds structured role perspectives to system prompt for ~1.5K extra tokens.
   */
  private _buildMultiRolePrompt(baseSystem: string, roles: AdvisorRole[]): string {
    const roleInstructions = roles.map(role =>
      `[${role.name}] As a ${role.perspective}, evaluate: ${role.focus.join(", ")}.`
    ).join("\n");

    return `${baseSystem}

## INTERNAL ADVISORY PROCESS
Before providing your final answer, reason through these perspectives:

${roleInstructions}

Output format:
1. Show brief analysis from each perspective (2-3 sentences each)
2. Note any conflicts or concerns raised
3. Synthesize into final recommendation
4. Flag any unresolved safety or correctness issues`;
  }

  /**
   * Query with advisor tool enabled (Pattern A).
   * Use for safety-critical manufacturing decisions.
   */
  async queryWithAdvisor(input: LLMQuery): Promise<LLMResponse & { advisor_calls: number }> {
    const result = await this.query({ ...input }, { useAdvisor: true });
    return { ...result, advisor_calls: (result as any).advisor_calls ?? 0 };
  }

  /**
   * Query with multi-role internal reasoning (Pattern C).
   * Adds ~1.5K tokens but improves reasoning quality.
   */
  async queryWithMultiRole(input: LLMQuery, roles?: AdvisorRole[]): Promise<LLMResponse> {
    const originalRoles = this.config.roles;
    if (roles) this.config.roles = roles;
    const result = await this.query({ ...input }, { useMultiRole: true });
    this.config.roles = originalRoles;
    return result;
  }

  private _generateOfflineResponse(prompt: string, context: ContextChunk[]): string {
    if (context.length === 0) {
      return "No live reasoning provider is configured. Set ANTHROPIC_API_KEY and/or OPENAI_API_KEY to enable PRISM's attached AI runtime. "
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
 * TK-AI Hardening: Register tribal knowledge as context provider.
 * Lazy-loaded to avoid circular dependencies.
 */
export async function registerTribalContextProvider(): Promise<void> {
  try {
    const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");

    llmEngine.registerContextProvider(() => {
      // Get top tribal tips across all categories
      const tips = tribalKnowledgeEngine.search({ limit: 20, min_confidence: 70 });

      return tips.slice(0, 10).map(tip => ({
        type: "tribal" as const,
        title: `[Shop Floor] ${tip.title}`,
        content: `${tip.body?.slice(0, 300) || ""} (Confidence: ${tip.confidence}%, Source: ${tip.source || "shop_floor"})`,
        relevance: (tip.confidence || 70) / 100,
      }));
    });
  } catch {
    // Tribal knowledge not available — skip registration
  }
}

// Auto-register tribal provider on module load (non-blocking)
registerTribalContextProvider().catch(() => {});
