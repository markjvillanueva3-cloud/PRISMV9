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

export type ReasoningProvider = "anthropic" | "openai";
export type ReasoningProviderPreference = ReasoningProvider | "auto";
export type ReasoningTier = "haiku" | "sonnet" | "opus";

export interface APIConfig {
  anthropicApiKey: string | undefined;
  openaiApiKey: string | undefined;
  opusModel: string;
  sonnetModel: string;
  haikuModel: string;
  /** Codex CLI model identifier (env CODEX_CLI_MODEL). Used by reasoningProfiles. */
  codexCliModel: string;
  /** GPT-5.4 model identifier (env GPT54_MODEL). Used by reasoningProfiles. */
  gpt54Model: string;
  /** Preferred reasoning provider (env PRISM_REASONING_PROVIDER). */
  preferredReasoningProvider: ReasoningProviderPreference;
  enableRealExecution: boolean;
}

export const apiConfig: APIConfig = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  opusModel: process.env.OPUS_MODEL || 'claude-opus-4-6',
  sonnetModel: process.env.SONNET_MODEL || 'claude-sonnet-4-5-20250929',
  haikuModel: process.env.HAIKU_MODEL || 'claude-haiku-4-5-20251001',
  codexCliModel: process.env.CODEX_CLI_MODEL || 'gpt-5.4-codex',
  gpt54Model: process.env.GPT54_MODEL || 'gpt-5.4',
  preferredReasoningProvider: ((process.env.PRISM_REASONING_PROVIDER as ReasoningProviderPreference) || 'auto'),
  enableRealExecution: !!process.env.ANTHROPIC_API_KEY && 
                        process.env.ANTHROPIC_API_KEY !== 'your-api-key-here'
};

export function hasValidApiKey(): boolean {
  return apiConfig.enableRealExecution;
}

export function getApiKey(): string {
  if (!apiConfig.anthropicApiKey || apiConfig.anthropicApiKey === 'your-api-key-here') {
    throw new Error('ANTHROPIC_API_KEY not configured. Add your key to .env file.');
  }
  return apiConfig.anthropicApiKey;
}

/**
 * Resolve a Claude-style model identifier for the given tier and provider.
 * For provider="openai", tiers map onto Codex/GPT-5.4 equivalents.
 */
export function getModelForTier(
  tier: ReasoningTier,
  provider: ReasoningProvider = "anthropic",
): string {
  if (provider === "openai") {
    switch (tier) {
      case 'opus':   return apiConfig.gpt54Model;
      case 'sonnet': return apiConfig.gpt54Model;
      case 'haiku':  return apiConfig.codexCliModel;
      default:       return apiConfig.gpt54Model;
    }
  }
  switch (tier) {
    case 'opus':   return apiConfig.opusModel;
    case 'sonnet': return apiConfig.sonnetModel;
    case 'haiku':  return apiConfig.haikuModel;
    default:       return apiConfig.sonnetModel;
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
  // FREE-AI-MIGRATION/U-PARALLELAPI-LLM-ROUTE (slot:india): route each prompt through the free
  // Ollama-first llmEngine.query substrate (Ollama -> Claude backup -> offline) instead of a direct
  // PAID Anthropic client.messages.create. No ANTHROPIC_API_KEY required (the old hasValidApiKey
  // throw is gone); complexity:"high" so a weak local answer escalates to the Claude backup. The
  // return shape is byte-identical, so all consumers are unaffected. R12: a per-prompt "offline"
  // result (no provider answered) surfaces as the `error` field -- never a silent empty success.
  const { llmEngine } = await import("../engines/LLMEngine.js");

  const promises = prompts.map(async (prompt) => {
    const startTime = Date.now();
    try {
      const res = await llmEngine.query({
        prompt: prompt.user,
        system: prompt.system,
        complexity: "high",
        max_tokens: prompt.maxTokens || 1024,
        temperature: prompt.temperature ?? 0.3,
      });
      // R12: "offline" = no provider answered (a degraded stub message, not a real result). Match the
      // catch path's contract -- empty text + error field -- so a consumer never reads the offline
      // message as if it were reasoning output.
      if (res.model === "offline") {
        return {
          text: '',
          tokens: res.tokens_used,
          duration_ms: Date.now() - startTime,
          model: res.model,
          error: 'no reasoning provider available (Ollama offline + no Claude backup key)',
        };
      }
      return {
        text: res.answer ?? '',
        tokens: res.tokens_used,
        duration_ms: Date.now() - startTime,
        model: res.model,
      };
    } catch (error) {
      return {
        text: '',
        tokens: { input: 0, output: 0 },
        duration_ms: Date.now() - startTime,
        model: prompt.model || apiConfig.sonnetModel,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  return Promise.all(promises);
}


// ============================================================================
// REASONING PROVIDER HELPERS (compat shims for reasoningProfiles + others)
// ============================================================================

/** True iff a real ANTHROPIC_API_KEY is configured. */
export function hasAnthropicApiKey(): boolean {
  return !!apiConfig.anthropicApiKey && apiConfig.anthropicApiKey !== 'your-api-key-here';
}

/** True iff a real OPENAI_API_KEY is configured. */
export function hasOpenAIApiKey(): boolean {
  return !!apiConfig.openaiApiKey && apiConfig.openaiApiKey !== 'your-api-key-here';
}

/** Returns the list of reasoning providers that currently have valid credentials. */
export function getAvailableReasoningProviders(): ReasoningProvider[] {
  const out: ReasoningProvider[] = [];
  if (hasAnthropicApiKey()) out.push("anthropic");
  if (hasOpenAIApiKey()) out.push("openai");
  return out;
}

/**
 * Resolve the preferred reasoning provider from PRISM_REASONING_PROVIDER
 * (or first available if set to "auto"). Falls back to "anthropic" if
 * neither key is configured (caller is expected to surface that as profile-only).
 */
export function getPreferredReasoningProvider(): ReasoningProvider {
  const pref = apiConfig.preferredReasoningProvider;
  if (pref === "anthropic" || pref === "openai") return pref;
  // pref === "auto" → first available, else default to anthropic
  const avail = getAvailableReasoningProviders();
  return avail[0] ?? "anthropic";
}

