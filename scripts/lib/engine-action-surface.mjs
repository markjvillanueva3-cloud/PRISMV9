#!/usr/bin/env node
/**
 * engine-action-surface.mjs -- per-engine dispatcher ACTION-SURFACE extractor.
 * (AI-SYSTEMS-GNN, slot:india 2026-06-21.)
 *
 * WHY: the GNN tier-5's 768-d nomic TEXT embeddings separate only 1/7 dispatcher
 * classes (meanMargin 0.0263; only prism_turning clears the bar) -- an engine's
 * DESCRIPTION text is near-non-discriminative for which dispatcher it belongs to
 * ([[reference_gnn_embed_separability_diagnostic_2026_06_21]]). The cheap leak-free
 * structural features (1-hop engine-import; domain-subdir one-hot) were probed and
 * RULED OUT (import-sparse 72%-null; root-flat) ([[reference_gnn_structural_feature_probe_2026_06_21]]).
 * The evidence-backed remaining lever is a NEW dense leak-free node feature: the
 * ACTION SURFACE -- the dispatcher action NAMES an engine backs. A calc engine backs
 * force/thermal/`*_calc` actions; a cam engine backs toolpath/collision actions --
 * the action names carry DIRECT dispatcher-class signal the description prose does not.
 *
 * LEAK DISCIPLINE (india soul -- the fake-0.98 trap): the action surface is built
 * from the DISPATCHER case bodies (engine <- action), NOT from the node's own
 * dispatcher label. For an UNWIRED ghost the surface is EMPTY by construction (no
 * dispatcher case references it) -- so this is a TRAINING SIGNAL on the WIRED
 * reference engines, generalized to unwired ghosts via GraphSAGE message-passing,
 * never the ghost's own label. (Same leak-free shape as wired-engine-mapper's map.)
 *
 * Mirrors the case-body engine-ref parse of generate-action-engine-edges.mjs (which
 * emits action->engine VIZ EDGES) but INVERTS it to a reusable engine->action-names
 * MAP + an embeddable TEXT projection -- a distinct artifact (that script writes a
 * json of edges; this exports a feature map for the embedding pipeline).
 *
 * Pure-export contract (for tests): CASE_BODY_CAP, ENGINE_REF_RE, NEW_ENGINE_RE,
 * extractActionLabels, actionEngineRefsFromSource, buildActionSurfaceMap,
 * engineStemFromNodeId, actionSurfaceText.
 */
import fs from "node:fs";
import path from "node:path";

// Cap a single case-body scan so a pathological switch cannot blow up (mirrors
// generate-action-engine-edges.mjs -- keep the two case-body parsers consistent).
export const CASE_BODY_CAP = 6000;

// Engine-reference patterns inside a case body:
//  (1) a lowerCamelCase `fooEngine` singleton USED via method access (`.`/`?.`), and
//  (2) a `new FooEngine(` direct construction.
// Pattern (1) REQUIRES the trailing method access so a generic helper CALL like
// `getEngine(name)` (an identifier followed by `(`, not `.`) is NOT mis-attributed
// as an engine -- the viz edge-builder tolerates that noise because it resolves each
// match against real graph engine nodes (dropping non-engines); this lib has no such
// resolution, so the tighter pattern is the precision guard (R12: `getEngine` was
// falsely the top engine with 2849 actions before this).
export const ENGINE_REF_RE = /\b([a-z][A-Za-z0-9_]*Engine)\s*\??\./g;
export const NEW_ENGINE_RE = /\bnew\s+([A-Z][A-Za-z0-9_]*Engine)\s*\(/g;
// (3) a PascalCase singleton/class used via a static METHOD CALL `XEngine.method(`.
// Recovers the ~half of engines accessed statically rather than as a lowerCamel
// handle (scrutiny arm-A P2 -- without this they get an empty surface for a PARSING
// reason, not because they are unwired, which would invalidate the separability
// measurement this feature feeds). Requires `.<lowerIdent>(` so a TYPE position
// (`XEngine.SomeType`, uppercase after the dot) or a CONSTANT (`XEngine.CONFIG`, no
// call) is NOT matched -- keeps the precision the getEngine(...) guard established.
// `new XEngine(` is construction (Engine followed by `(`, not `.`) -> handled by (2),
// never double-matched here.
export const PASCAL_CALL_RE = /\b([A-Z][A-Za-z0-9_]*Engine)\s*\??\.\s*[a-z$_][A-Za-z0-9_$]*\s*\(/g;

/**
 * Extract every `case "<name>":` action label from a dispatcher source, in order.
 * Returns [{ name, bodyStart }] where bodyStart is the char index just past the
 * colon. Single- or double-quoted; tolerates whitespace around the colon.
 */
export function extractActionLabels(src) {
  if (typeof src !== "string") return [];
  const out = [];
  const re = /\bcase\s+["']([A-Za-z0-9_.]+)["']\s*:/g;
  let m;
  while ((m = re.exec(src)) !== null) out.push({ name: m[1], bodyStart: re.lastIndex });
  return out;
}

/**
 * For one dispatcher source, map each action -> the set of engine stems (lowercased,
 * `engine`-suffix retained) its case body references. The body runs from the action's
 * colon to the next `case "..."` / `default:` (or the cap), so an engine ref leaks
 * from neither a sibling case nor unrelated code. Returns [{ action, engines:Set }].
 */
export function actionEngineRefsFromSource(src) {
  if (typeof src !== "string" || !src) return [];
  const labels = extractActionLabels(src);
  const out = [];
  for (const { name, bodyStart } of labels) {
    const slice = src.slice(bodyStart, bodyStart + CASE_BODY_CAP);
    // Body ends at the next case/default label (naive top-level limit, as in the
    // viz edge-builder); a nested object key like `default:` is rare in a case body
    // and at worst truncates early (under-counts, never cross-attributes).
    const stop = slice.search(/\n\s*(case\s+["'][A-Za-z0-9_.]|default\s*:)/);
    const body = stop >= 0 ? slice.slice(0, stop) : slice;
    const engines = new Set();
    for (const r of body.matchAll(ENGINE_REF_RE)) engines.add(r[1].toLowerCase());
    for (const r of body.matchAll(NEW_ENGINE_RE)) engines.add(r[1].toLowerCase());
    for (const r of body.matchAll(PASCAL_CALL_RE)) engines.add(r[1].toLowerCase());
    out.push({ action: name, engines });
  }
  return out;
}

/**
 * Scan every dispatcher .ts under `dir` and build the INVERSE map:
 * Map<engineStemLower, Set<actionName>> -- the action surface of each engine.
 * `engineStemLower` keeps the `engine` suffix (e.g. "kienzleengine"); callers that
 * have a suffix-less handle should also try `<stem>engine`. Fail-soft: an unreadable
 * dir or file yields an empty/partial map rather than throwing.
 */
export function buildActionSurfaceMap(dir, fsImpl = fs) {
  const map = new Map();
  let files = [];
  try {
    files = fsImpl.readdirSync(dir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"),
    );
  } catch { return map; }
  for (const f of files) {
    let src = "";
    try { src = fsImpl.readFileSync(path.join(dir, f), "utf8"); } catch { continue; }
    for (const { action, engines } of actionEngineRefsFromSource(src)) {
      for (const eng of engines) {
        if (!map.has(eng)) map.set(eng, new Set());
        map.get(eng).add(action);
      }
    }
  }
  return map;
}

/**
 * Derive the engine stem (lowercased, `engine`-suffixed) from a graph node id like
 * `eng.<domain>.<EngineNameOrStem>` -> "<enginenameorstem>". Returns "" for a
 * non-engine id. Used to look an engine node up in the action-surface map.
 */
export function engineStemFromNodeId(nodeId) {
  const s = String(nodeId || "");
  if (!/^eng\..+\..+/.test(s)) return "";
  return s.split(".").slice(2).join(".").toLowerCase();
}

/**
 * The embeddable action-surface TEXT for an engine stem: its action names joined
 * (deduped, sorted for determinism, `_`->space so tokens embed naturally). Tries the
 * stem as-is and with an `engine` suffix so a suffix-less handle still resolves.
 * Returns "" when the engine backs no action (an unwired ghost -- empty BY DESIGN).
 */
export function actionSurfaceText(map, engineStem) {
  if (!(map instanceof Map)) return "";
  const stem = String(engineStem || "").toLowerCase();
  if (!stem) return "";
  const actions = map.get(stem) || map.get(`${stem}engine`) || null;
  if (!actions || actions.size === 0) return "";
  return [...actions].sort().map((a) => a.replace(/_/g, " ")).join(" ");
}
