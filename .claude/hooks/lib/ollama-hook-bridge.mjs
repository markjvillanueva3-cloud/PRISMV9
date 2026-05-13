// tier: T4
/**
 * ollama-hook-bridge.mjs
 * Shared helper for hooks to call local Ollama with fast timeout and graceful fallback.
 *
 * Usage:
 *   import { queryOllama, isOllamaAvailable } from './lib/ollama-hook-bridge.mjs';
 *   const result = await queryOllama(prompt, { hookType: 'grep_index', timeoutMs: 300 });
 *   if (result.success) { use result.response } else { use regex fallback }
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_TIMEOUT_MS = 500;
const DEFAULT_MODEL = 'qwen2.5-coder:7b';

// Model selection per hook type (matches OllamaHookBridgeEngine)
const HOOK_MODELS = {
  grep_index: 'qwen2.5-coder:7b',
  mcp_route: 'qwen2.5-coder:7b',
  ai_feature: 'qwen2.5-coder:14b',
  code_explain: 'qwen2.5-coder:14b',
  pattern_match: 'qwen2.5-coder:7b',
  validation: 'qwen2.5-coder:7b',
  general: 'qwen2.5-coder:7b',
};

// System prompts per hook type (matches OllamaHookBridgeEngine)
const HOOK_PROMPTS = {
  grep_index: 'You are a code search assistant. Given a search query, suggest which index or file to check first. Be extremely concise - respond with just the suggestion in 1-2 lines.',
  mcp_route: 'You are an MCP routing assistant. Given a task description, suggest the best PRISM dispatcher and action. Respond with just: dispatcher:action in one line.',
  ai_feature: 'You are a PRISM AI feature recommender. Given a task, suggest which AI engine to use. Respond with just the engine name and a 5-word reason.',
  general: 'Provide a brief, helpful response in 2-3 sentences maximum.',
};

// Cached availability check (1 minute TTL)
let cachedAvailable = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60000;

/**
 * Check if Ollama is available (cached for 1 minute).
 * @returns {Promise<boolean>}
 */
export async function isOllamaAvailable() {
  const now = Date.now();
  if (cachedAvailable !== null && now - cacheTime < CACHE_TTL_MS) {
    return cachedAvailable;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      cachedAvailable = false;
      cacheTime = now;
      return false;
    }

    const data = await response.json();
    cachedAvailable = Array.isArray(data.models) && data.models.length > 0;
    cacheTime = now;
    return cachedAvailable;
  } catch {
    cachedAvailable = false;
    cacheTime = now;
    return false;
  }
}

/**
 * Query Ollama with a prompt. Returns quickly with fallback on error/timeout.
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Query options
 * @param {string} [options.hookType='general'] - Hook type for model/prompt selection
 * @param {number} [options.timeoutMs=500] - Query timeout in milliseconds
 * @param {number} [options.maxTokens=100] - Max tokens in response
 * @param {string} [options.systemPrompt] - Override system prompt
 * @returns {Promise<{success: boolean, response: string|null, error?: string, latencyMs: number}>}
 */
export async function queryOllama(prompt, options = {}) {
  const startTime = Date.now();
  const hookType = options.hookType || 'general';
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxTokens = options.maxTokens ?? 100;
  const model = HOOK_MODELS[hookType] || DEFAULT_MODEL;
  const systemPrompt = options.systemPrompt ?? HOOK_PROMPTS[hookType] ?? HOOK_PROMPTS.general;

  // Validate prompt
  if (!prompt || typeof prompt !== 'string') {
    return {
      success: false,
      response: null,
      error: 'Invalid prompt',
      latencyMs: Date.now() - startTime,
    };
  }

  if (prompt.length > 10000) {
    return {
      success: false,
      response: null,
      error: 'Prompt too long',
      latencyMs: Date.now() - startTime,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`,
        stream: false,
        options: {
          num_predict: maxTokens,
          temperature: 0.3,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        response: null,
        error: `HTTP ${response.status}`,
        latencyMs: Date.now() - startTime,
      };
    }

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        response: null,
        error: data.error,
        latencyMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      response: (data.response || '').trim() || null,
      latencyMs: Date.now() - startTime,
    };
  } catch (err) {
    const isTimeout = err.name === 'AbortError' || String(err).includes('abort');
    return {
      success: false,
      response: null,
      error: isTimeout ? `Timeout after ${timeoutMs}ms` : String(err.message || err),
      latencyMs: Date.now() - startTime,
    };
  }
}

export default { queryOllama, isOllamaAvailable };
