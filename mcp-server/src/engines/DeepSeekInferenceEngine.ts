/**
 * DeepSeekInferenceEngine — LOCAL-LLM-MS0 Hybrid Backend
 * ======================================================
 *
 * Client for DeepSeek V4 API (Flash & Pro models):
 * - 1M token context window
 * - Thinking mode support for complex reasoning
 * - Free tier available, Pro 75% off until May 5, 2026
 * - OpenAI-compatible API format
 *
 * Usage:
 *   const result = await deepSeekInferenceEngine.generate({
 *     prompt: "Explain this code...",
 *     model: "flash", // or "pro"
 *     thinkingMode: false,
 *   });
 *
 * @module engines/DeepSeekInferenceEngine
 * @milestone LOCAL-LLM-MS0 Hybrid Phase 1
 */

import { z } from "zod";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { log } from "../utils/Logger.js";

// ============================================================================
// Schemas
// ============================================================================

export const DeepSeekModelSchema = z.enum(["flash", "pro"]);
export type DeepSeekModel = z.infer<typeof DeepSeekModelSchema>;

export const DeepSeekGenerateInputSchema = z.object({
  prompt: z.string().min(1).describe("Prompt to send to DeepSeek"),
  model: DeepSeekModelSchema.default("flash").describe("Model: flash (free) or pro (paid)"),
  systemPrompt: z.string().optional().describe("System prompt for context"),
  temperature: z.number().min(0).max(2).default(0.3).describe("Sampling temperature"),
  maxTokens: z.number().int().min(1).max(32768).default(4096).describe("Max output tokens"),
  thinkingMode: z.boolean().default(false).describe("Enable thinking mode for complex reasoning"),
  contextMessages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })).optional().describe("Previous messages for context"),
});

export const DeepSeekGenerateOutputSchema = z.object({
  success: z.boolean(),
  content: z.string().describe("Generated response"),
  model: z.string().describe("Model used"),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }),
  thinkingContent: z.string().optional().describe("Thinking output if thinking mode enabled"),
  latencyMs: z.number(),
  cached: z.boolean().describe("Whether response was cached"),
  error: z.string().optional(),
});

export const DeepSeekHealthInputSchema = z.object({
  checkModels: z.boolean().optional().default(true).describe("Check model availability"),
  checkQuota: z.boolean().optional().default(true).describe("Check API quota remaining"),
});

export const DeepSeekHealthOutputSchema = z.object({
  healthy: z.boolean(),
  apiReachable: z.boolean(),
  apiKeyConfigured: z.boolean(),
  models: z.array(z.object({
    id: z.string(),
    available: z.boolean(),
    contextWindow: z.number(),
  })).optional(),
  quota: z.object({
    remaining: z.number().nullable(),
    resetAt: z.string().nullable(),
  }).optional(),
  latencyMs: z.number(),
  error: z.string().optional(),
});

export type DeepSeekGenerateInput = z.infer<typeof DeepSeekGenerateInputSchema>;
export type DeepSeekGenerateOutput = z.infer<typeof DeepSeekGenerateOutputSchema>;
export type DeepSeekHealthInput = z.infer<typeof DeepSeekHealthInputSchema>;
export type DeepSeekHealthOutput = z.infer<typeof DeepSeekHealthOutputSchema>;

// ============================================================================
// Configuration
// ============================================================================

interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  models: {
    flash: string;
    pro: string;
  };
  defaults: {
    model: DeepSeekModel;
    temperature: number;
    maxTokens: number;
    thinkingMode: boolean;
  };
  timeoutMs: number;
  retries: number;
}

const ENV_VAR_NAME = "DEEPSEEK_API_KEY";

const DEFAULT_CONFIG: DeepSeekConfig = {
  apiKey: "",
  baseUrl: "https://api.deepseek.com/v1",
  models: {
    flash: "deepseek-v4-flash",
    pro: "deepseek-v4-pro",
  },
  defaults: {
    model: "flash",
    temperature: 0.3,
    maxTokens: 4096,
    thinkingMode: false,
  },
  timeoutMs: 120000,
  retries: 2,
};

const CONFIG_PATH = "mcp-server/data/config/deepseek-config.json";

// ============================================================================
// Engine Implementation
// ============================================================================

class DeepSeekInferenceEngine {
  private config: DeepSeekConfig;
  private responseCache: Map<string, { response: DeepSeekGenerateOutput; expiry: number }> = new Map();
  private cacheMaxAge = 300000; // 5 minutes

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): DeepSeekConfig {
    // Try environment variable first (always preferred)
    const envKey = process.env[ENV_VAR_NAME] ?? "";

    // Try config file for non-secret settings
    if (existsSync(CONFIG_PATH)) {
      try {
        const fileConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
        return { ...DEFAULT_CONFIG, ...fileConfig, apiKey: envKey };
      } catch {
        log.warn("DeepSeekInferenceEngine", "Failed to parse config file, using defaults");
      }
    }

    return { ...DEFAULT_CONFIG, apiKey: envKey };
  }

  /**
   * Reload configuration from file/environment
   */
  reloadConfig(): void {
    this.config = this.loadConfig();
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return this.config.apiKey.length > 0;
  }

  /**
   * Get the model ID for API calls
   */
  private getModelId(model: DeepSeekModel): string {
    return this.config.models[model];
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(input: DeepSeekGenerateInput): string {
    return JSON.stringify({
      prompt: input.prompt,
      model: input.model,
      systemPrompt: input.systemPrompt,
      temperature: input.temperature,
      thinkingMode: input.thinkingMode,
    });
  }

  /**
   * Build authorization header value
   */
  private getAuthHeader(): string {
    return `Bearer ${this.config.apiKey}`;
  }

  /**
   * Generate text using DeepSeek V4 API
   *
   * @param input - Generation parameters
   * @returns Generation result with content, usage, and metadata
   */
  async generate(input: DeepSeekGenerateInput): Promise<DeepSeekGenerateOutput> {
    const startTime = Date.now();
    const validated = DeepSeekGenerateInputSchema.parse(input);

    // Check cache first
    const cacheKey = this.getCacheKey(validated);
    const cached = this.responseCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return { ...cached.response, cached: true, latencyMs: Date.now() - startTime };
    }

    // Check API key
    if (!this.isConfigured()) {
      return {
        success: false,
        content: "",
        model: this.getModelId(validated.model),
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs: Date.now() - startTime,
        cached: false,
        error: `DeepSeek API key not configured. Set ${ENV_VAR_NAME} environment variable.`,
      };
    }

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [];

    if (validated.systemPrompt) {
      messages.push({ role: "system", content: validated.systemPrompt });
    }

    if (validated.contextMessages) {
      messages.push(...validated.contextMessages);
    }

    messages.push({ role: "user", content: validated.prompt });

    // Build request body
    const body: Record<string, unknown> = {
      model: this.getModelId(validated.model),
      messages,
      temperature: validated.temperature,
      max_tokens: validated.maxTokens,
      stream: false,
    };

    // Enable thinking mode if requested
    if (validated.thinkingMode) {
      body.thinking = { enabled: true };
    }

    // Make API request with retries
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": this.getAuthHeader(),
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
        }

        const data = await response.json() as {
          choices: Array<{
            message: { content: string; thinking_content?: string };
          }>;
          usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
          model: string;
        };

        const result: DeepSeekGenerateOutput = {
          success: true,
          content: data.choices[0]?.message?.content ?? "",
          model: data.model,
          usage: {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          },
          thinkingContent: data.choices[0]?.message?.thinking_content,
          latencyMs: Date.now() - startTime,
          cached: false,
        };

        // Cache successful response
        this.responseCache.set(cacheKey, {
          response: result,
          expiry: Date.now() + this.cacheMaxAge,
        });

        // Prune old cache entries
        if (this.responseCache.size > 100) {
          const now = Date.now();
          for (const [key, value] of this.responseCache) {
            if (value.expiry < now) {
              this.responseCache.delete(key);
            }
          }
        }

        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.config.retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    return {
      success: false,
      content: "",
      model: this.getModelId(validated.model),
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      latencyMs: Date.now() - startTime,
      cached: false,
      error: lastError?.message ?? "Unknown error",
    };
  }

  /**
   * Check DeepSeek API health and availability
   *
   * @param input - Health check options
   * @returns Health status including API reachability and model availability
   */
  async health(input: Partial<DeepSeekHealthInput> = {}): Promise<DeepSeekHealthOutput> {
    const startTime = Date.now();
    const validated = DeepSeekHealthInputSchema.parse(input);

    const result: DeepSeekHealthOutput = {
      healthy: false,
      apiReachable: false,
      apiKeyConfigured: this.isConfigured(),
      latencyMs: 0,
    };

    if (!result.apiKeyConfigured) {
      result.latencyMs = Date.now() - startTime;
      result.error = "API key not configured";
      return result;
    }

    try {
      // Simple models list check
      if (validated.checkModels) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${this.config.baseUrl}/models`, {
          headers: {
            "Authorization": this.getAuthHeader(),
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          result.apiReachable = true;
          const data = await response.json() as { data: Array<{ id: string; context_length?: number }> };
          result.models = data.data?.map(m => ({
            id: m.id,
            available: true,
            contextWindow: m.context_length ?? 1000000,
          })) ?? [];
          result.healthy = true;
        } else {
          result.error = `API returned ${response.status}`;
        }
      }

      // Quota check (if header available)
      if (validated.checkQuota) {
        result.quota = {
          remaining: null, // DeepSeek doesn't expose this in headers currently
          resetAt: null,
        };
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }

    result.latencyMs = Date.now() - startTime;
    return result;
  }

  /**
   * Estimate token count for text (rough approximation)
   *
   * @param text - Text to estimate tokens for
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 chars per token for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Get current configuration (without API key)
   *
   * @returns Configuration without sensitive data
   */
  getConfig(): Omit<DeepSeekConfig, "apiKey"> & { apiKeyConfigured: boolean } {
    const { apiKey, ...rest } = this.config;
    return {
      ...rest,
      apiKeyConfigured: apiKey.length > 0,
    };
  }

  /**
   * Update configuration (non-secret fields only)
   *
   * @param updates - Configuration updates to apply
   */
  updateConfig(updates: Partial<Omit<DeepSeekConfig, "apiKey">>): void {
    this.config = { ...this.config, ...updates };

    // Persist to file (without API key)
    try {
      const { apiKey, ...safeConfig } = this.config;
      writeFileSync(CONFIG_PATH, JSON.stringify(safeConfig, null, 2));
    } catch {
      log.warn("DeepSeekInferenceEngine", "Failed to persist config");
    }
  }
}

// Singleton export
export const deepSeekInferenceEngine = new DeepSeekInferenceEngine();
