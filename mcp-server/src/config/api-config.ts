/**
 * PRISM MCP Server - API Configuration
 * Loads API keys and provides Anthropic SDK client
 * 
 * FIXED: getAnthropicClient() now returns actual Anthropic SDK instance
 * with proper TypeScript types (was previously typed as plain object)
 */

import { config } from 'dotenv';
import { join } from 'path';
import Anthropic from "@anthropic-ai/sdk";
import { PATHS } from "../constants.js";
import { getEffort } from "./effortTiers.js";

// Load .env file - override: true ensures .env wins over claude_desktop_config.json env section
config({ path: join(PATHS.MCP_SERVER, '.env'), override: true, quiet: true });
config({ path: join(process.cwd(), '.env'), override: true, quiet: true });

export interface APIConfig {
  anthropicApiKey: string | undefined;
  openaiApiKey: string | undefined;
  opusModel: string;
  sonnetModel: string;
  haikuModel: string;
  gpt54Model: string;
  gpt54MiniModel: string;
  codexCliModel: string;
  preferredReasoningProvider: "anthropic" | "openai" | "auto";
  enableAnthropicExecution: boolean;
  enableOpenAIExecution: boolean;
  enableRealExecution: boolean;
}

export const apiConfig: APIConfig = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  opusModel: process.env.OPUS_MODEL || 'claude-opus-4-6',
  sonnetModel: process.env.SONNET_MODEL || 'claude-sonnet-4-5-20250929',
  haikuModel: process.env.HAIKU_MODEL || 'claude-haiku-4-5-20251001',
  gpt54Model: process.env.GPT5_4_MODEL || process.env.OPENAI_DEEP_MODEL || "gpt-5.4",
  gpt54MiniModel: process.env.GPT5_4_MINI_MODEL || process.env.OPENAI_FAST_MODEL || "gpt-5.4-mini",
  codexCliModel: process.env.CODEX_CLI_MODEL || "gpt-5.4",
  preferredReasoningProvider:
    process.env.PRISM_REASONING_PROVIDER === "openai"
      ? "openai"
      : process.env.PRISM_REASONING_PROVIDER === "anthropic"
        ? "anthropic"
        : "auto",
  enableAnthropicExecution:
    !!process.env.ANTHROPIC_API_KEY &&
    process.env.ANTHROPIC_API_KEY !== 'your-api-key-here',
  enableOpenAIExecution:
    !!process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== 'your-api-key-here',
  enableRealExecution:
    (!!process.env.ANTHROPIC_API_KEY &&
      process.env.ANTHROPIC_API_KEY !== 'your-api-key-here')
    || (!!process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY !== 'your-api-key-here')
};

export type ReasoningProvider = "anthropic" | "openai";
export type ReasoningProviderPreference = ReasoningProvider | "auto";
export type ReasoningTier = 'opus' | 'sonnet' | 'haiku';

export function hasAnthropicApiKey(): boolean {
  return apiConfig.enableAnthropicExecution;
}

export function hasOpenAIApiKey(): boolean {
  return apiConfig.enableOpenAIExecution;
}

export function hasValidApiKey(): boolean {
  return hasAnthropicApiKey();
}

export function getApiKey(): string {
  return getAnthropicApiKey();
}

export function getAnthropicApiKey(): string {
  if (!apiConfig.anthropicApiKey || apiConfig.anthropicApiKey === 'your-api-key-here') {
    throw new Error('ANTHROPIC_API_KEY not configured. Add your key to .env file.');
  }
  return apiConfig.anthropicApiKey;
}

export function getOpenAIApiKey(): string {
  if (!apiConfig.openaiApiKey || apiConfig.openaiApiKey === 'your-api-key-here') {
    throw new Error('OPENAI_API_KEY not configured. Add your key to .env file.');
  }
  return apiConfig.openaiApiKey;
}

export function hasAnyReasoningApiKey(): boolean {
  return hasAnthropicApiKey() || hasOpenAIApiKey();
}

export function getAvailableReasoningProviders(): ReasoningProvider[] {
  const providers: ReasoningProvider[] = [];
  if (hasAnthropicApiKey()) {
    providers.push("anthropic");
  }
  if (hasOpenAIApiKey()) {
    providers.push("openai");
  }
  return providers;
}

export function getPreferredReasoningProvider(
  preference: ReasoningProviderPreference = apiConfig.preferredReasoningProvider,
): ReasoningProvider {
  if (preference === "anthropic" && hasAnthropicApiKey()) {
    return "anthropic";
  }
  if (preference === "openai" && hasOpenAIApiKey()) {
    return "openai";
  }
  if (hasAnthropicApiKey()) {
    return "anthropic";
  }
  if (hasOpenAIApiKey()) {
    return "openai";
  }
  return preference === "openai" ? "openai" : "anthropic";
}

export function getModelForTier(
  tier: ReasoningTier,
  provider: ReasoningProvider = "anthropic",
): string {
  if (provider === "openai") {
    switch (tier) {
      case 'opus':
        return apiConfig.gpt54Model;
      case 'sonnet':
        return apiConfig.codexCliModel;
      case 'haiku':
        return apiConfig.gpt54MiniModel;
      default:
        return apiConfig.codexCliModel;
    }
  }

  switch (tier) {
    case 'opus':
      return apiConfig.opusModel;
    case 'sonnet':
      return apiConfig.sonnetModel;
    case 'haiku':
      return apiConfig.haikuModel;
    default:
      return apiConfig.sonnetModel;
  }
}

// Lazy-initialized singleton Anthropic client
let _anthropicClient: Anthropic | null = null;

/**
 * Get an Anthropic SDK client instance (singleton, lazy-initialized)
 * Returns REAL Anthropic SDK client with .messages.create() etc.
 */
export function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({ apiKey: getApiKey() });
  }
  return _anthropicClient;
}

/**
 * Make parallel Claude API calls for brainstorming/analysis
 * Uses direct API without the agent registry overhead
 * 
 * @param prompts Array of { system, user, model?, maxTokens? }
 * @returns Array of responses in same order
 */
export async function parallelAPICalls(
  prompts: Array<{
    system: string;
    user: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }>
): Promise<Array<{
  text: string;
  tokens: { input: number; output: number };
  duration_ms: number;
  model: string;
  error?: string;
}>> {
  if (!hasValidApiKey()) {
    throw new Error('ANTHROPIC_API_KEY required for parallel API calls');
  }

  const client = getAnthropicClient();
  const defaultModel = apiConfig.sonnetModel;

  const promises = prompts.map(async (prompt, index) => {
    const model = prompt.model || defaultModel;
    const startTime = Date.now();

    try {
      const response = await client.messages.create({
        model,
        max_tokens: prompt.maxTokens || 1024,
        temperature: prompt.temperature ?? 0.3,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }]
      });

      const text = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n');

      return {
        text,
        tokens: {
          input: response.usage?.input_tokens || 0,
          output: response.usage?.output_tokens || 0
        },
        duration_ms: Date.now() - startTime,
        model
      };
    } catch (error) {
      return {
        text: '',
        tokens: { input: 0, output: 0 },
        duration_ms: Date.now() - startTime,
        model,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  return Promise.all(promises);
}
