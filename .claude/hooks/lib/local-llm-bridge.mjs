// tier: T4
/**
 * local-llm-bridge.mjs - Backend-agnostic local LLM dispatcher
 *
 * Three local backends, route by capability + availability:
 *
 *   NIM        -> http://127.0.0.1:8000+ (TRT-LLM optimized; llama-3.2/3.1, vision)
 *   vLLM       -> http://127.0.0.1:8020  (any HF model; deepseek-r1-distill, qwen-coder)
 *   Ollama     -> http://127.0.0.1:11434 (always-available fallback)
 *
 * BACKEND SELECTION (env LOCAL_LLM_BACKEND)
 *   'auto'     try NIM first, then vLLM, then Ollama (default)
 *   'nim'      NIM only (errors if down)
 *   'vllm'     vLLM only
 *   'ollama'   Ollama only (preserves prior bit-exact behavior)
 *
 * HOOK-TYPE ROUTING (when BACKEND='auto')
 *   reasoning, code, errortriage  -> prefer vLLM (deepseek-r1, qwen-coder)
 *   classify, docstring, summary  -> prefer NIM (llama-3.2-3b, fastest)
 *   embeddings                    -> nim-embed-bridge (separate surface)
 *
 * Public surface mirrors `ollama-hook-bridge.mjs` so existing callers
 * migrate with a one-line import swap.
 */

import { queryOllama, isOllamaAvailable } from "./ollama-hook-bridge.mjs";
import { queryNim, isNimAvailable } from "./nim-hook-bridge.mjs";
import { queryVllm, isVllmAvailable } from "./vllm-hook-bridge.mjs";

const BACKEND = (process.env.LOCAL_LLM_BACKEND || "auto").toLowerCase();

// Hook types where vLLM (deepseek-r1, qwen-coder) gives meaningfully better
// output than NIM's llama-3.2-3b/8b. Auto mode tries vLLM first for these.
const VLLM_PREFERRED = new Set(["reasoning", "code", "errortriage", "lint"]);

export async function isLocalLLMAvailable() {
  if (BACKEND === "nim")    return isNimAvailable();
  if (BACKEND === "vllm")   return isVllmAvailable();
  if (BACKEND === "ollama") return isOllamaAvailable();
  const [nim, vllm, oll] = await Promise.all([
    isNimAvailable(), isVllmAvailable(), isOllamaAvailable(),
  ]);
  return nim || vllm || oll;
}

/**
 * Send a prompt to the best-matching local backend.
 * Result shape: { success, response, error, latencyMs, backend, model, fellBackFrom?: string }.
 */
export async function queryLocalLLM(prompt, opts = {}) {
  if (BACKEND === "nim")    return queryNim(prompt, opts);
  if (BACKEND === "vllm")   return queryVllm(prompt, opts);
  if (BACKEND === "ollama") return queryOllama(prompt, opts);

  // auto: capability-aware routing
  const hookType = opts.hookType || "default";
  const preferVllm = VLLM_PREFERRED.has(hookType);

  // Probe in parallel — three concurrent ~1.5s probes is cheaper than
  // sequential, and the probe results are cached for 60s anyway.
  const [nimUp, vllmUp, ollUp] = await Promise.all([
    isNimAvailable(), isVllmAvailable(), isOllamaAvailable(),
  ]);

  const tryOrder = preferVllm
    ? [["vllm", vllmUp, queryVllm], ["nim", nimUp, queryNim], ["ollama", ollUp, queryOllama]]
    : [["nim", nimUp, queryNim], ["vllm", vllmUp, queryVllm], ["ollama", ollUp, queryOllama]];

  let lastError = null;
  let fellBackFrom = null;
  for (const [name, up, fn] of tryOrder) {
    if (!up) continue;
    const res = await fn(prompt, opts);
    if (res.success) {
      return fellBackFrom ? { ...res, fellBackFrom, lastError } : res;
    }
    fellBackFrom = name;
    lastError = res.error;
  }
  return {
    success: false,
    error: lastError || "no local backend available",
    latencyMs: 0,
    backend: "none",
  };
}

/**
 * Which backend the next call would prefer. Useful for diagnostics.
 * For 'auto', hookType determines the answer.
 */
export async function preferredBackend(hookType = "default") {
  if (BACKEND === "nim")    return "nim";
  if (BACKEND === "vllm")   return "vllm";
  if (BACKEND === "ollama") return "ollama";
  const preferVllm = VLLM_PREFERRED.has(hookType);
  if (preferVllm && (await isVllmAvailable()))    return "vllm";
  if (await isNimAvailable())                     return "nim";
  if (!preferVllm && (await isVllmAvailable()))   return "vllm";
  if (await isOllamaAvailable())                  return "ollama";
  return "none";
}

/**
 * Snapshot of all backends' health. For status dashboards.
 */
export async function localLLMHealth() {
  const [nim, vllm, oll] = await Promise.all([
    isNimAvailable(), isVllmAvailable(), isOllamaAvailable(),
  ]);
  return {
    nim:    { available: nim,  url: process.env.NIM_URL  || "http://127.0.0.1:8000/v1" },
    vllm:   { available: vllm, url: process.env.VLLM_URL || "http://127.0.0.1:8020/v1" },
    ollama: { available: oll,  url: process.env.OLLAMA_URL || "http://127.0.0.1:11434" },
    mode:   BACKEND,
  };
}
