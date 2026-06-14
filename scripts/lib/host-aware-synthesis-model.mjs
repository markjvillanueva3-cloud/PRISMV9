// tier: T4
// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE — host-aware default model
// for local synthesis scripts (galaxy roll-ups, system-viz roost summaries,
// Obsidian memory consolidation, ask-ollama heavy modes).
//
// PROBLEM the work order names: every synthesis script hardcodes
// `qwen2.5-coder:7b` (or `:3b`). On the 96GB RTX PRO 6000 Blackwell that
// throttles synthesis quality to a 7B model while `qwen2.5-coder:32b` (20GB)
// sits idle with ~68GB free. Better local synthesis = fewer paid-Claude
// re-escalations (the offload take-rate lever) AND directly better galaxy /
// system-viz / Obsidian digests.
//
// REUSE, don't fork (R8/R7): host detection = host-class.mjs (alpha's
// U-BW-HW-DETECT); tier→model selection = ollama-cost-router.mjs
// `routeModelForTask` with category="search_synthesis" (which U-BW-BEST-TIER-REACH
// raises to the 32B `best` tier on Blackwell). This module is glue + a
// fail-soft /api/tags reader — it introduces NO new routing policy.
//
// Pure-shell: every side-effect (host detection, /api/tags fetch) is injectable
// so the resolver is unit-testable without a GPU, Ollama, or the real hostname.
// Never throws except on a programmer error (missing `fallback`).

import { detectHostClass } from "../../.claude/hooks/lib/host-class.mjs";
import { routeModelForTask } from "../../.claude/hooks/lib/ollama-cost-router.mjs";

/** Default Ollama tags endpoint. Override with PRISM_OLLAMA_TAGS_URL. */
export const OLLAMA_TAGS_URL =
  process.env.PRISM_OLLAMA_TAGS_URL || "http://127.0.0.1:11434/api/tags";

/**
 * Fetch the list of installed Ollama model names from /api/tags.
 * Fail-soft (R12-honest): returns `[]` on ANY failure (Ollama down, timeout,
 * non-2xx, malformed body) so callers degrade to their conservative fallback
 * rather than crashing a synthesis run.
 *
 * @param {{url?:string, timeoutMs?:number, fetchImpl?:typeof fetch}} [opts]
 * @returns {Promise<string[]>}
 */
export async function fetchInstalledModels({
  url = OLLAMA_TAGS_URL,
  timeoutMs = 4000,
  fetchImpl = fetch,
} = {}) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetchImpl(url, { signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res || !res.ok) return [];
    const json = await res.json();
    const models = Array.isArray(json && json.models) ? json.models : [];
    return models
      .map((m) => (m && typeof m.name === "string" ? m.name : null))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Resolve the model a local synthesis script should use on THIS host.
 *
 * Decision order:
 *   1. explicit `override` (e.g. a --model CLI flag) always wins — operator intent.
 *   2. else route category="search_synthesis" through the cost-router using the
 *      detected host class + installed models. On `home_blackwell` with the 32B
 *      held this returns `qwen2.5-coder:32b`; on weaker hosts it returns the same
 *      conservative model the script would have picked. The router GUARANTEES the
 *      returned model is in the installed set.
 *   3. else `fallback` (the script's conservative const) — used only when no model
 *      is installed at all (Ollama down) or the router yields nothing.
 *
 * @param {{
 *   fallback: string,
 *   override?: string|null,
 *   available?: string[]|null,
 *   hardware?: string,
 *   detectHostClassFn?: () => (string|null),
 *   fetchModelsFn?: (o?:object) => Promise<string[]>,
 * }} opts
 * @returns {Promise<{model:string, source:"override"|"blackwell-best"|"router"|"fallback", tier?:string, reason?:string}>}
 */
export async function resolveSynthesisModel({
  fallback,
  override = null,
  available = null,
  hardware = undefined,
  detectHostClassFn = detectHostClass,
  fetchModelsFn = fetchInstalledModels,
} = {}) {
  if (typeof override === "string" && override.trim()) {
    return { model: override.trim(), source: "override" };
  }
  if (typeof fallback !== "string" || !fallback) {
    throw new Error("resolveSynthesisModel: a non-empty string `fallback` is required");
  }

  const hw = hardware !== undefined ? hardware : detectHostClassFn();
  const models = Array.isArray(available) ? available : await fetchModelsFn();
  if (!models.length) {
    return { model: fallback, source: "fallback", reason: "no installed models (ollama down?)" };
  }

  // `hardware: undefined` (not null) keeps the router's conservative back-compat
  // branch — detectHostClass returns null on unknown hosts, which we normalize.
  const route = routeModelForTask({
    category: "search_synthesis",
    available: models,
    hardware: hw || undefined,
  });
  if (!route || !route.model) {
    return { model: fallback, source: "fallback", reason: "router returned no model" };
  }

  const source =
    hw === "home_blackwell" && route.tier === "best" ? "blackwell-best" : "router";
  return { model: route.model, source, tier: route.tier, reason: route.reason };
}
