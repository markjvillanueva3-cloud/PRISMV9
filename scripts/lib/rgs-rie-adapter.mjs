/**
 * rgs-rie-adapter.mjs — RoadmapIntelligenceEngine-backed complexity adapter
 * for the rgs-tool-planner.
 *
 * Why this exists (U-LIMA-A6 / RGS-TOOL-AUTOINVOKE-MS1 P1 punch-list item #4):
 *   MS0's in-line heuristic defaulted 57.6% of units to tier M. U-COMPLEXITY-
 *   FALLBACK fixed the *symptom* with the multi-signal keyword cascade in
 *   `rgs-complexity.mjs`. The punch-list's spec'd solution, however, was to
 *   back complexity off `RoadmapIntelligenceEngine` (RIE) instead of a
 *   keyword heuristic. This module is that adapter.
 *
 * What it does:
 *   For each roadmap unit it builds a synthetic single-unit `Milestone`,
 *   calls `RoadmapIntelligenceEngine.assessComplexity()`, and maps the
 *   returned `overall_complexity` (5 levels) onto the planner's 4-level
 *   `tier` ({S,M,L,XL}). The `verdict` (build vs integrate) is NOT something
 *   RIE assesses — it always comes from the `rgs-complexity.mjs` cascade.
 *
 * Return contract: identical to `complexityFor` in `rgs-complexity.mjs` —
 *   `{ tier: "S"|"M"|"L"|"XL", verdict: "build"|"integrate" }`. The planner
 *   calls the complexity fn synchronously (rgs-tool-planner.mjs:507), so the
 *   factory is async (it awaits the one-time engine import) and returns a
 *   fully synchronous closure.
 *
 * Graceful degradation (R12 — fail soft, never crash the planner):
 *   ANY failure — compiled engine absent, import error, `assessComplexity`
 *   throw, malformed return — falls back to the `rgs-complexity.mjs` cascade
 *   for that unit. With the engine entirely unavailable every unit routes
 *   through the cascade, so the planner behaves exactly as before this unit.
 *
 * Cache granularity note: the punch-list says "per-MS cache". Complexity in
 * the planner is a *per-unit* quantity (each unit gets its own tier), so a
 * literal per-milestone cache would wrongly collapse every unit in a
 * milestone to one tier. The cache here is therefore keyed per-unit (the
 * planner's stable `unit.key`) — the only correct granularity for a per-unit
 * complexity function. It still delivers the punch-list's intent: assess
 * each distinct unit through RIE at most once per planner run.
 */

import { complexityFor as cascadeComplexityFor } from "./rgs-complexity.mjs";

/** Default location of the compiled RoadmapIntelligenceEngine, relative to
 * this file (`scripts/lib/` → repo root → `mcp-server/dist/...`). */
const DEFAULT_ENGINE_URL = new URL(
  "../../mcp-server/dist/engines/RoadmapIntelligenceEngine.js",
  import.meta.url,
);

/**
 * RIE `overall_complexity` (5 levels) → planner `tier` (4 levels).
 * `trivial` and `simple` both collapse to S — the planner has no tier below
 * S, and both denote sub-30-minute work in the cascade's effort semantics.
 */
export const LEVEL_TO_TIER = Object.freeze({
  trivial: "S",
  simple: "S",
  moderate: "M",
  complex: "L",
  very_complex: "XL",
});

/** Module-level memo for the lazy engine import — shared across factories so
 * the 37 KB compiled engine is imported at most once per process. */
let _enginePromise;

/**
 * Lazily import the compiled RoadmapIntelligenceEngine. Resolves to the
 * engine class (with the static `assessComplexity`) or `null` on any
 * failure (dist not built, import-time error). Memoized per process.
 *
 * @param {string|URL} enginePath  override for the compiled engine location
 * @returns {Promise<{assessComplexity: Function}|null>}
 */
export async function loadRIEEngine(enginePath = DEFAULT_ENGINE_URL) {
  // A non-default path is test/override territory — never share the memo.
  if (enginePath !== DEFAULT_ENGINE_URL) {
    return importEngine(enginePath);
  }
  if (_enginePromise === undefined) {
    _enginePromise = importEngine(enginePath);
  }
  return _enginePromise;
}

/** Single-shot import + shape-check. Never throws — returns null on failure. */
async function importEngine(enginePath) {
  try {
    const href = enginePath instanceof URL ? enginePath.href : String(enginePath);
    const mod = await import(href);
    const Engine = mod?.RoadmapIntelligenceEngine ?? mod?.default ?? null;
    return typeof Engine?.assessComplexity === "function" ? Engine : null;
  } catch {
    return null;
  }
}

/**
 * Derive a stable per-unit cache key. The planner feeds units shaped
 * `{key, milestone, unitId, title, description, effort}` (rgs-tool-planner
 * .mjs:451); `key` is already the canonical `MILESTONE::U-ID`. Fall back
 * through unitId/title so non-planner callers (and tests) still get a key.
 *
 * @param {object} unit
 * @returns {string}
 */
export function unitCacheKey(unit) {
  const u = unit ?? {};
  return String(
    u.key ??
      (u.milestone != null && u.unitId != null
        ? `${u.milestone}::${u.unitId}`
        : (u.unitId ?? u.title ?? "")),
  );
}

/**
 * Build a synthetic single-unit `Milestone` from a roadmap unit, shaped for
 * `RoadmapIntelligenceEngine.assessComplexity()`. assessComplexity reads
 * `.description` (keyword scan + word-count), `.units.length` and
 * `.dependencies.length` — all three are populated here.
 *
 * @param {object} unit
 * @returns {{id:string,name:string,description:string,units:object[],dependencies:string[],status:string}}
 */
export function synthMilestone(unit) {
  const u = unit ?? {};
  const title = String(u.title ?? "");
  const description = String(u.description ?? "");
  // assessComplexity word-counts + keyword-scans `.description` — feed it the
  // title AND the description so short-title units still carry signal.
  const scanText = `${title} ${description}`.trim() || "unit";
  const deps = Array.isArray(u.depends_on)
    ? u.depends_on
    : Array.isArray(u.dependencies)
      ? u.dependencies
      : [];
  return {
    id: String(u.key ?? u.unitId ?? "synthetic-unit"),
    name: title || "synthetic-unit",
    description: scanText,
    units: [{ id: String(u.unitId ?? "u"), title, description }],
    dependencies: deps,
    status: "not_started",
  };
}

/**
 * Build a synchronous `complexityFor`-shaped function backed by
 * RoadmapIntelligenceEngine. Awaits the one-time engine import, then returns
 * a closure the planner can call per-unit synchronously.
 *
 * @param {{
 *   engine?: {assessComplexity: Function}|null,
 *   cascadeFn?: (unit:object)=>{tier:string,verdict:string},
 *   enginePath?: string|URL,
 * }} [opts]
 *   - `engine`     — inject an engine (or null) directly; skips the import.
 *                    Used by hermetic unit tests.
 *   - `cascadeFn`  — inject the fallback cascade (default: rgs-complexity.mjs).
 *   - `enginePath` — override the compiled-engine path.
 * @returns {Promise<(unit:object)=>{tier:"S"|"M"|"L"|"XL",verdict:"build"|"integrate"}>}
 */
export async function makeRIEComplexityFn(opts = {}) {
  const cascadeFn =
    typeof opts.cascadeFn === "function" ? opts.cascadeFn : cascadeComplexityFor;
  // `engine` may be injected (incl. an explicit `null` to force the
  // fallback path); only import when the key is absent entirely.
  const engine = Object.prototype.hasOwnProperty.call(opts, "engine")
    ? opts.engine
    : await loadRIEEngine(opts.enginePath ?? DEFAULT_ENGINE_URL);

  /** Per-unit memo of the RIE-derived tier (string), keyed by unitCacheKey. */
  const tierCache = new Map();

  return function complexityForViaRIE(unit) {
    // The cascade always runs: it supplies the verdict (RIE has no verdict
    // concept) and the fallback tier. The default cascade is pure + null-safe;
    // the try/catch guards an injected `cascadeFn` so the closure can NEVER
    // throw — a thrown error here would crash the nightly planner.
    let cascade;
    try {
      cascade = cascadeFn(unit);
    } catch {
      cascade = { tier: "M", verdict: "build" };
    }
    const verdict = cascade?.verdict === "integrate" ? "integrate" : "build";
    const fallbackTier = cascade?.tier ?? "M";

    if (engine == null) {
      return { tier: fallbackTier, verdict };
    }

    const key = unitCacheKey(unit);
    if (key !== "" && tierCache.has(key)) {
      return { tier: tierCache.get(key), verdict };
    }

    let tier = fallbackTier;
    try {
      const assessment = engine.assessComplexity(synthMilestone(unit));
      const mapped = assessment && LEVEL_TO_TIER[assessment.overall_complexity];
      if (mapped) tier = mapped;
    } catch {
      // RIE threw — keep the cascade's fallback tier.
      tier = fallbackTier;
    }

    if (key !== "") tierCache.set(key, tier);
    return { tier, verdict };
  };
}
