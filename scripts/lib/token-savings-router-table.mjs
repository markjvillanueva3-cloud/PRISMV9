// scripts/lib/token-savings-router-table.mjs
// Pure data-table mapping known tool-surface IDs → suggested coverage paths.
// Produced by TOKEN-SAVINGS-PIVOT/U-ROUTER-TABLE (slot:alpha, 2026-05-24).
//
// 5 route kinds:
//   { kind: "rtk-wrap",       base: "<cmd>" }
//   { kind: "mcp-route",      to: "<dispatcher>:<action>" }
//   { kind: "ollama-offload", skill: "/ollama-<verb>" }
//   { kind: "skill",          name: "/<command>" }
//   { kind: "advisory",       reason: "<why>" }
//
// Lazy-loads ranked-candidates JSON if present; otherwise seeds from a 20-entry
// synthetic sample so this module is import-safe regardless of audit state.

import { readFileSync, existsSync } from "node:fs";

// Path is overridable via the optional `path` arg on loadCandidatesFromDisk —
// avoids env-var coupling and keeps the module pure at import time.
const DEFAULT_CANDIDATE_JSON =
  "H:/prism/state/shared/dashboards/token-savings-top-roi-candidates.json";

const SYNTHETIC_SEED = Object.freeze([
  { id: "hook.master-index-precheck-inject" },
  { id: "hook.wiki-precheck-inject" },
  { id: "hook.dedup-auto-invoke" },
  { id: "hook.duplication-hard-block" },
  { id: "action.prism_calc:cutting_force" },
  { id: "action.prism_cam:toolpath_suggest" },
  { id: "action.prism_ai:reason" },
  { id: "action.prism_memory:store" },
  { id: "action.prism_safety:validate_physics" },
  { id: "skill./ollama-summarize" },
  { id: "skill./ollama-explain" },
  { id: "skill./ollama-classify" },
  { id: "skill./ollama-docstring" },
  { id: "cmd./master-index" },
  { id: "cmd./dedup" },
  { id: "slash./scrutinize" },
  { id: "slash./handoff" },
  { id: "rtk.git" },
  { id: "rtk.vitest" },
  { id: "rtk.gh" },
]);

/**
 * Classify one candidate ID into a route entry.
 * Pure — no I/O, no state. Returns `{ kind, ...payload }`.
 *
 * @param {string} nodeId
 * @returns {{kind:string} & Record<string, unknown>}
 */
export function classifyNodeId(nodeId) {
  if (typeof nodeId !== "string" || nodeId.length === 0) {
    return { kind: "advisory", reason: "invalid-or-empty-id" };
  }

  // rtk.<cmd> → rtk-wrap
  if (nodeId.startsWith("rtk.")) {
    const base = nodeId.slice("rtk.".length);
    return { kind: "rtk-wrap", base };
  }

  // skill./ollama-* → ollama-offload (check BEFORE generic skill.* fallthrough)
  if (nodeId.startsWith("skill./ollama-")) {
    const skill = nodeId.slice("skill.".length);
    return { kind: "ollama-offload", skill };
  }

  // skill.<other> → treat as a slash command
  if (nodeId.startsWith("skill.")) {
    const name = nodeId.slice("skill.".length);
    return { kind: "skill", name };
  }

  // cmd.<name> or slash.<name> → skill
  if (nodeId.startsWith("cmd.") || nodeId.startsWith("slash.")) {
    const name = nodeId.slice(nodeId.indexOf(".") + 1);
    return { kind: "skill", name };
  }

  // action.<dispatcher>:<action> → mcp-route
  if (nodeId.startsWith("action.")) {
    const target = nodeId.slice("action.".length);
    if (target.includes(":")) {
      return { kind: "mcp-route", to: target };
    }
    return { kind: "advisory", reason: "malformed-action-id-missing-colon" };
  }

  // hook.* → advisory (hooks are themselves the advisory mechanism)
  if (nodeId.startsWith("hook.")) {
    return {
      kind: "advisory",
      reason: "hook-itself-is-advisory-no-auto-route",
    };
  }

  // everything else → generic advisory
  return { kind: "advisory", reason: "no-prefix-match" };
}

/**
 * Build a frozen Map<nodeId, routeEntry> from a candidate list.
 * Each candidate must have a string `id`; malformed entries are skipped silently.
 *
 * @param {Array<{id:string}>} rankedCandidates
 * @returns {Map<string, object>}
 */
export function buildRouterTableFromCandidates(rankedCandidates) {
  const out = new Map();
  if (!Array.isArray(rankedCandidates)) return out;

  for (const candidate of rankedCandidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const id = candidate.id;
    if (typeof id !== "string" || id.length === 0) continue;
    if (out.has(id)) continue; // first wins; preserves input ordering
    out.set(id, Object.freeze(classifyNodeId(id)));
  }

  return out;
}

/**
 * Read the ranked-candidates JSON if it exists. Fail-soft: returns null on any
 * parse/read error so module-load never throws.
 *
 * @param {string} [path]
 * @returns {Array<{id:string}> | null}
 */
function loadCandidatesFromDisk(path = DEFAULT_CANDIDATE_JSON) {
  try {
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw);

    // accept either bare array or { candidates: [...] }
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.candidates)) return parsed.candidates;
    if (parsed && Array.isArray(parsed.entries)) return parsed.entries;
    return null;
  } catch {
    return null;
  }
}

const _loaded = loadCandidatesFromDisk();
const _source = _loaded ?? SYNTHETIC_SEED;

/**
 * The canonical router table. Frozen — cannot mutate.
 * Keys: node IDs (e.g. "hook.foo", "action.prism_calc:bar").
 * Values: frozen route entries.
 */
export const ROUTER_TABLE = (() => {
  const map = buildRouterTableFromCandidates(_source);
  // Object.freeze on a Map does NOT block .set/.delete/.clear in Node — the
  // internal slots are not property-descriptor-gated. Replace mutators with
  // throwing stubs (defense-in-depth) before freezing the object shell.
  const throwFrozen = () => {
    throw new TypeError(
      "ROUTER_TABLE is frozen — use buildRouterTableFromCandidates to derive a mutable copy",
    );
  };
  map.set = throwFrozen;
  map.delete = throwFrozen;
  map.clear = throwFrozen;
  Object.freeze(map);
  return map;
})();

/**
 * Look up a route for a node ID.
 *
 * @param {string} nodeId
 * @returns {object | null}
 */
export function lookupRoute(nodeId) {
  if (typeof nodeId !== "string" || nodeId.length === 0) return null;
  return ROUTER_TABLE.get(nodeId) ?? null;
}

/**
 * Summarize the table by route-kind. Useful for ROUTER_TABLE coverage probes.
 *
 * @returns {{total:number, byKind: Record<string,number>, sourceCount:number, fromDisk:boolean}}
 */
export function summarizeRouterTable() {
  const byKind = Object.create(null);
  for (const entry of ROUTER_TABLE.values()) {
    const k = entry.kind || "unknown";
    byKind[k] = (byKind[k] || 0) + 1;
  }
  return {
    total: ROUTER_TABLE.size,
    byKind,
    sourceCount: Array.isArray(_source) ? _source.length : 0,
    fromDisk: _loaded !== null,
  };
}
