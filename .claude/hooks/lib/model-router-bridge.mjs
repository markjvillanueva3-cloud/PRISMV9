/**
 * model-router-bridge.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P20-U04
 *
 * Thin bridge between .mjs hooks and the compiled ModelRouterEngine
 * (mcp-server/dist/engines/ModelRouterEngine.js). Each hook that
 * previously hardcoded `model: 'qwen2.5-coder:7b'` now calls
 * `await pickModel({kind, complexity})` and gets the centrally-routed
 * model name back.
 *
 * Why a bridge: the engine is a TS class compiled to ESM. Hooks are
 * standalone .mjs scripts invoked by Claude Code's harness. Direct
 * static import would fail at hook-spawn time if the dist build is
 * stale; a try-catch'd dynamic import + hardcoded fallback keeps hooks
 * resilient to build state.
 *
 * Pure function exports (load-state-free):
 *   - pickModel(input, fallback?)  → string  (model name to use)
 *   - routeDecision(input, fallback?) → RoutingDecision-shape object
 *
 * Both functions are async because the engine is loaded lazily on first
 * call. Subsequent calls reuse the cached singleton in this module's
 * scope.
 *
 * @module .claude/hooks/lib/model-router-bridge
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
// .claude/hooks/lib/ → ../../../mcp-server/dist/engines/ModelRouterEngine.js
const ENGINE_PATH = resolve(HERE, "../../../mcp-server/dist/engines/ModelRouterEngine.js");
// Node ESM dynamic import requires a `file://` URL on Windows; raw H:\…
// paths are rejected with "protocol 'h:' not supported".
const ENGINE_URL = pathToFileURL(ENGINE_PATH).href;

// Module-scoped cache of the loaded engine. null = not yet loaded;
// false = load attempted and failed (don't retry).
let cachedEngine = null;
let loadFailed = false;

const FALLBACK_MODEL = "qwen2.5-coder:7b";

async function loadEngine() {
  if (cachedEngine) return cachedEngine;
  if (loadFailed) return null;
  try {
    const mod = await import(ENGINE_URL);
    if (mod && typeof mod.modelRouterEngine?.routeForTask === "function") {
      cachedEngine = mod.modelRouterEngine;
      return cachedEngine;
    }
    loadFailed = true;
    return null;
  } catch {
    loadFailed = true;
    return null;
  }
}

/**
 * Resolve a model name from a TaskInput-shaped object. When the engine
 * is reachable, returns the routed model string. When not, returns the
 * caller-supplied fallback (or the global qwen2.5-coder:7b default).
 *
 * Defensive on null/non-object input — coerces to a minimal default
 * task and routes that, so the hook never crashes on bad input.
 */
export async function pickModel(input, fallback) {
  const fb = typeof fallback === "string" && fallback.length > 0 ? fallback : FALLBACK_MODEL;
  const engine = await loadEngine();
  if (!engine) return fb;
  try {
    const safeInput = (input && typeof input === "object") ? input : { kind: "general" };
    const decision = engine.routeForTask(safeInput);
    if (decision && typeof decision.model === "string" && decision.model.length > 0) {
      return decision.model;
    }
    return fb;
  } catch {
    return fb;
  }
}

/**
 * Return the full routing decision (tier, model, kind, reason, fallback)
 * for callers that want richer context — e.g. for telemetry logging.
 * Returns a synthesized fallback decision when the engine is offline so
 * downstream code can still log a `reason` field.
 */
export async function routeDecision(input, fallback) {
  const fb = typeof fallback === "string" && fallback.length > 0 ? fallback : FALLBACK_MODEL;
  const engine = await loadEngine();
  if (!engine) {
    return { tier: 1, model: fb, kind: "chat", reason: "engine offline — fallback", fallback: null };
  }
  try {
    const safeInput = (input && typeof input === "object") ? input : { kind: "general" };
    return engine.routeForTask(safeInput);
  } catch (err) {
    return { tier: 1, model: fb, kind: "chat", reason: `route threw: ${err?.message ?? err}`, fallback: null };
  }
}

/**
 * Reset module-scope cache. Test-only — exported so unit tests can
 * exercise the lazy-load + load-fails paths in isolation.
 */
export function _resetCacheForTests() {
  cachedEngine = null;
  loadFailed = false;
}

export const _FALLBACK_MODEL = FALLBACK_MODEL;
export const _ENGINE_PATH = ENGINE_PATH;
