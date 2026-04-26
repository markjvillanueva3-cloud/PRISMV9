/**
 * OllamaHookBridgeEngine
 *
 * Enables Claude Code hooks to call local Ollama for intelligent suggestions
 * without consuming API tokens. Designed for hook use cases:
 *
 * - Fast: 500ms default timeout (hooks can't block long)
 * - Resilient: Graceful fallback when Ollama unavailable
 * - Configurable: Per-hook-type model selection
 * - Stateless: No connection pooling (hooks are short-lived processes)
 *
 * Use cases:
 * - grep-index-first: Suggest which index to check before grep
 * - mcp-route-suggest: Suggest MCP route for current task
 * - ai-feature-recommend: Recommend AI features for task
 *
 * Token savings: 100% (free local inference vs Claude API)
 */

export type HookType =
  | "grep_index"
  | "mcp_route"
  | "ai_feature"
  | "code_explain"
  | "pattern_match"
  | "validation"
  | "general";

export interface OllamaHookConfig {
  /** Base URL for Ollama API (default: http://localhost:11434) */
  baseUrl: string;
  /** Default model for hook queries */
  defaultModel: string;
  /** Per-hook-type model overrides */
  modelOverrides: Partial<Record<HookType, string>>;
  /** Query timeout in ms (default: 500ms for hooks) */
  timeoutMs: number;
  /** Max tokens in response (default: 100 for hook suggestions) */
  maxTokens: number;
  /** Enable verbose logging */
  verbose: boolean;
}

export interface HookQueryOptions {
  /** Hook type for model selection */
  hookType?: HookType;
  /** Override timeout for this query */
  timeoutMs?: number;
  /** Override max tokens for this query */
  maxTokens?: number;
  /** System prompt override */
  systemPrompt?: string;
  /** Temperature (0-1, default 0.3 for consistent suggestions) */
  temperature?: number;
}

export interface HookQueryResult {
  success: boolean;
  response: string | null;
  model: string;
  latencyMs: number;
  error?: string;
  fallbackUsed: boolean;
}

export interface OllamaStatusResult {
  available: boolean;
  baseUrl: string;
  models: string[];
  defaultModel: string;
  lastCheckMs: number;
  error?: string;
}

const DEFAULT_CONFIG: OllamaHookConfig = {
  baseUrl: "http://localhost:11434",
  defaultModel: "qwen2.5-coder:7b",
  modelOverrides: {
    grep_index: "qwen2.5-coder:7b",
    mcp_route: "qwen2.5-coder:7b",
    ai_feature: "qwen2.5-coder:14b",
    code_explain: "qwen2.5-coder:14b",
    pattern_match: "qwen2.5-coder:7b",
    validation: "qwen2.5-coder:7b",
    general: "qwen2.5-coder:7b",
  },
  timeoutMs: 500,
  maxTokens: 100,
  verbose: false,
};

// System prompts per hook type for optimal suggestions
const HOOK_SYSTEM_PROMPTS: Record<HookType, string> = {
  grep_index: "You are a code search assistant. Given a search query, suggest which index or file to check first. Be extremely concise - respond with just the suggestion in 1-2 lines.",
  mcp_route: "You are an MCP routing assistant. Given a task description, suggest the best PRISM dispatcher and action. Respond with just: dispatcher:action in one line.",
  ai_feature: "You are a PRISM AI feature recommender. Given a task, suggest which AI engine to use. Respond with just the engine name and a 5-word reason.",
  code_explain: "Explain this code snippet in 2-3 sentences maximum. Focus on what it does, not how.",
  pattern_match: "Identify the coding pattern used. Respond with just the pattern name and confidence (high/medium/low).",
  validation: "Check this code for issues. List only critical problems, one per line, max 3 lines.",
  general: "Provide a brief, helpful response in 2-3 sentences maximum.",
};

export class OllamaHookBridgeEngine {
  private config: OllamaHookConfig;
  private cachedModels: string[] | null = null;
  private lastModelCheck = 0;
  private readonly MODEL_CACHE_TTL_MS = 60000; // 1 minute

  constructor(config: Partial<OllamaHookConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Query Ollama with a prompt and get a response.
   * Designed for hook use: fast timeout, graceful fallback.
   */
  async query(prompt: string, options: HookQueryOptions = {}): Promise<HookQueryResult> {
    const startTime = Date.now();
    const hookType = options.hookType || "general";
    const model = this.config.modelOverrides[hookType] || this.config.defaultModel;
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;
    const maxTokens = options.maxTokens ?? this.config.maxTokens;
    const systemPrompt = options.systemPrompt ?? HOOK_SYSTEM_PROMPTS[hookType];
    const temperature = options.temperature ?? 0.3;

    // Validate inputs
    if (!prompt || typeof prompt !== "string") {
      return {
        success: false,
        response: null,
        model,
        latencyMs: Date.now() - startTime,
        error: "Invalid prompt: must be non-empty string",
        fallbackUsed: true,
      };
    }

    if (prompt.length > 10000) {
      return {
        success: false,
        response: null,
        model,
        latencyMs: Date.now() - startTime,
        error: "Prompt too long: max 10000 characters",
        fallbackUsed: true,
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`,
          stream: false,
          options: {
            num_predict: maxTokens,
            temperature,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        return {
          success: false,
          response: null,
          model,
          latencyMs: Date.now() - startTime,
          error: `Ollama API error: ${response.status} - ${errorText.slice(0, 100)}`,
          fallbackUsed: true,
        };
      }

      const data = (await response.json()) as { response?: string; error?: string };

      if (data.error) {
        return {
          success: false,
          response: null,
          model,
          latencyMs: Date.now() - startTime,
          error: `Ollama response error: ${data.error}`,
          fallbackUsed: true,
        };
      }

      return {
        success: true,
        response: data.response?.trim() || null,
        model,
        latencyMs: Date.now() - startTime,
        fallbackUsed: false,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const isTimeout = errorMessage.includes("abort") || errorMessage.includes("timeout");

      return {
        success: false,
        response: null,
        model,
        latencyMs: Date.now() - startTime,
        error: isTimeout ? `Query timed out after ${timeoutMs}ms` : `Connection error: ${errorMessage}`,
        fallbackUsed: true,
      };
    }
  }

  /**
   * Check Ollama availability and list installed models.
   */
  async status(): Promise<OllamaStatusResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          available: false,
          baseUrl: this.config.baseUrl,
          models: [],
          defaultModel: this.config.defaultModel,
          lastCheckMs: Date.now() - startTime,
          error: `API returned ${response.status}`,
        };
      }

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = (data.models || []).map((m) => m.name);

      // Cache models
      this.cachedModels = models;
      this.lastModelCheck = Date.now();

      return {
        available: models.length > 0,
        baseUrl: this.config.baseUrl,
        models,
        defaultModel: this.config.defaultModel,
        lastCheckMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return {
        available: false,
        baseUrl: this.config.baseUrl,
        models: [],
        defaultModel: this.config.defaultModel,
        lastCheckMs: Date.now() - startTime,
        error: `Connection failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Update configuration. Returns the new active config.
   */
  configure(updates: Partial<OllamaHookConfig>): OllamaHookConfig {
    // Validate baseUrl if provided
    if (updates.baseUrl !== undefined) {
      if (typeof updates.baseUrl !== "string" || !updates.baseUrl.startsWith("http")) {
        throw new Error("Invalid baseUrl: must be a valid HTTP URL");
      }
    }

    // Validate timeoutMs if provided
    if (updates.timeoutMs !== undefined) {
      if (typeof updates.timeoutMs !== "number" || updates.timeoutMs < 50 || updates.timeoutMs > 30000) {
        throw new Error("Invalid timeoutMs: must be between 50 and 30000");
      }
    }

    // Validate maxTokens if provided
    if (updates.maxTokens !== undefined) {
      if (typeof updates.maxTokens !== "number" || updates.maxTokens < 1 || updates.maxTokens > 4096) {
        throw new Error("Invalid maxTokens: must be between 1 and 4096");
      }
    }

    this.config = { ...this.config, ...updates };

    // Invalidate model cache when baseUrl changes
    if (updates.baseUrl !== undefined) {
      this.cachedModels = null;
      this.lastModelCheck = 0;
    }

    return { ...this.config };
  }

  /**
   * Get current configuration (read-only copy).
   */
  getConfig(): OllamaHookConfig {
    return { ...this.config };
  }

  /**
   * Quick availability check using cached status when possible.
   */
  async isAvailable(): Promise<boolean> {
    // Use cached models if fresh
    if (this.cachedModels !== null && Date.now() - this.lastModelCheck < this.MODEL_CACHE_TTL_MS) {
      return this.cachedModels.length > 0;
    }

    const status = await this.status();
    return status.available;
  }

  /**
   * Get the model that would be used for a given hook type.
   */
  getModelForHook(hookType: HookType): string {
    return this.config.modelOverrides[hookType] || this.config.defaultModel;
  }

  /**
   * Static singleton instance for global access.
   */
  private static instance: OllamaHookBridgeEngine | null = null;

  static getInstance(): OllamaHookBridgeEngine {
    if (!OllamaHookBridgeEngine.instance) {
      OllamaHookBridgeEngine.instance = new OllamaHookBridgeEngine();
    }
    return OllamaHookBridgeEngine.instance;
  }

  static resetInstance(): void {
    OllamaHookBridgeEngine.instance = null;
  }
}

// Default export for singleton access
export const ollamaHookBridgeEngine = OllamaHookBridgeEngine.getInstance();
