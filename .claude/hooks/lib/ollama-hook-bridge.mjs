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

// Default host is 127.0.0.1 (NOT localhost): Node resolves `localhost` to IPv6
// ::1, but Ollama binds IPv4-only → ECONNREFUSED. Override with OLLAMA_URL.
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const DEFAULT_TIMEOUT_MS = 500;
const DEFAULT_MODEL = 'qwen2.5-coder:32b';

// Model selection per hook type (matches OllamaHookBridgeEngine)
const HOOK_MODELS = {
  grep_index: 'qwen2.5-coder:32b',
  mcp_route: 'qwen2.5-coder:32b',
  ai_feature: 'qwen2.5-coder:32b',
  code_explain: 'qwen2.5-coder:32b',
  pattern_match: 'qwen2.5-coder:32b',
  validation: 'qwen2.5-coder:32b',
  general: 'qwen2.5-coder:32b',
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
 * Build the request body for an Ollama /api/generate call.
 * Pure function — no side effects, no network calls.
 *
 * @param {string} prompt - The exact prompt string to send (caller responsible for prefixing)
 * @param {Object} opts - Body options
 * @param {string} [opts.model] - Model override (defaults to DEFAULT_MODEL)
 * @param {number} [opts.maxTokens=100] - Maps to options.num_predict
 * @param {number} [opts.temperature=0.3] - Maps to options.temperature
 * @param {string} [opts.format] - Ollama format parameter (e.g. "json"); omitted when absent
 * @returns {Object} Request body object ready for JSON.stringify
 */
export function buildRequestBody(prompt, opts = {}) {
  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    prompt,
    stream: false,
    options: {
      num_predict: opts.maxTokens ?? 100,
      temperature: opts.temperature ?? 0.3,
    },
  };
  if (opts && opts.format) body.format = opts.format;
  return body;
}

/**
 * Query Ollama with a prompt. Returns quickly with fallback on error/timeout.
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Query options
 * @param {string} [options.hookType='general'] - Hook type for model/prompt selection
 * @param {number} [options.timeoutMs=500] - Query timeout in milliseconds
 * @param {number} [options.maxTokens=100] - Max tokens in response
 * @param {string} [options.systemPrompt] - Override system prompt
 * @param {string} [options.format] - Ollama format parameter (e.g. "json") passed through to request body
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

    const requestBody = buildRequestBody(
      `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`,
      { model, maxTokens, temperature: 0.3, format: options.format },
    );

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
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
