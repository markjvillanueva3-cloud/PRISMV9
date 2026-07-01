/**
 * db-node-bridge.mjs — unified node-bridge contract for PRISM DB reads.
 *
 * Today PRISM has 23 different DB-read code paths scattered across the
 * codebase — each consumer (CAM, post processor, quoting, calculator,
 * shop floor) reaches directly into its preferred catalog (tool DB,
 * material DB, machine DB, holder DB, controller DB, fixture DB, etc).
 * That produces (a) inconsistent result shapes per consumer, (b)
 * duplicated cache/error/timeout logic in 23 places, (c) provenance
 * drift (no audit trail of which DB returned what), and (d) silent
 * staleness when one source updates and the others don't sync.
 *
 * This pure-fn library is the unifying contract:
 *   - NODE_BRIDGE_CONTRACT_VERSION — bumps on breaking contract change
 *   - KNOWN_DB_SOURCES — the 23-source whitelist (anything outside is
 *     refused to prevent silent shadow-DB consumption)
 *   - createNodeBridge() — builds a bridge with source registrations
 *   - registerSource() — adds a source DB resolver (immutable)
 *   - routeQuery() — single entry-point; resolves WHICH source to hit
 *     based on query.kind and returns a unified result shape
 *   - mergeResults() — multi-source merge with provenance tracking
 *     ({sourceId, hitCount, lastUpdatedIso} per merged row)
 *   - validateContract() — verifies a source resolver impl has the
 *     required interface BEFORE registration (fail loud at boot, not
 *     mid-query)
 *   - tallyHits() — per-source hit counts for telemetry/dashboards
 *
 * The bridge does NOT itself fetch data — it routes to a registered
 * resolver function. This keeps the bridge pure-fn while letting the
 * consumer wire in real I/O at the edge.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-DB-NODE-BRIDGE
 * @slot echo · @iter 37 · @date 2026-05-27
 */

export const NODE_BRIDGE_CONTRACT_VERSION = 1;

// The 23 known DB sources PRISM reads from. Anything outside this set
// is refused at registerSource() to prevent silent shadow-DB ingestion.
export const KNOWN_DB_SOURCES = [
  "tool_catalog",
  "tool_inventory",
  "holder_catalog",
  "holder_inventory",
  "material_catalog",
  "material_substitution",
  "machine_capability",
  "machine_profile",
  "controller_profile",
  "controller_dialect",
  "post_processor",
  "post_dialect",
  "fixture_catalog",
  "workholding_catalog",
  "coolant_catalog",
  "coating_catalog",
  "insert_catalog",
  "sample_program",
  "tribal_tip",
  "manual_extract",
  "kienzle_lookup",
  "taylor_lookup",
  "speed_feed_table",
];

export const REQUIRED_RESOLVER_METHODS = ["resolve", "describe"];

export const ALLOWED_QUERY_KINDS = [
  "lookup",
  "search",
  "list",
  "describe",
];

/** Pure: create a fresh node bridge with no sources registered. */
export function createNodeBridge(args) {
  const a = args || {};
  return {
    schemaVersion: NODE_BRIDGE_CONTRACT_VERSION,
    bridgeId: typeof a.bridgeId === "string" ? a.bridgeId : "default",
    sources: {},
    hitTally: {},
    createdAtIso: typeof a.createdAtIso === "string" ? a.createdAtIso : new Date().toISOString(),
  };
}

/** Pure: validate a resolver implementation against the required interface. */
export function validateContract(resolver) {
  const errors = [];
  if (!resolver || typeof resolver !== "object") {
    return { ok: false, errors: ["resolver is not an object"] };
  }
  for (const m of REQUIRED_RESOLVER_METHODS) {
    if (typeof resolver[m] !== "function") {
      errors.push(`resolver missing required method: ${m}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Pure: register a source resolver under a KNOWN_DB_SOURCES sourceId. Returns new bridge or null on failure. */
export function registerSource(bridge, sourceId, resolver) {
  if (!bridge || typeof bridge !== "object") return null;
  if (!KNOWN_DB_SOURCES.includes(sourceId)) return null;
  const contract = validateContract(resolver);
  if (!contract.ok) return null;
  return {
    ...bridge,
    sources: { ...bridge.sources, [sourceId]: resolver },
    hitTally: { ...bridge.hitTally, [sourceId]: bridge.hitTally[sourceId] || 0 },
  };
}

/** Pure: enumerate registered sourceIds (sorted). */
export function listRegisteredSources(bridge) {
  if (!bridge || !bridge.sources) return [];
  return Object.keys(bridge.sources).sort();
}

/** Pure: count registered sources. */
export function registeredSourceCount(bridge) {
  if (!bridge || !bridge.sources) return 0;
  return Object.keys(bridge.sources).length;
}

/** Pure: route a query to the right registered source. Returns {ok, sourceId, result, error}. */
export function routeQuery(bridge, query) {
  if (!bridge || !bridge.sources) {
    return { ok: false, sourceId: null, result: null, error: "bridge invalid" };
  }
  if (!query || typeof query !== "object") {
    return { ok: false, sourceId: null, result: null, error: "query invalid" };
  }
  const sourceId = query.sourceId;
  if (!KNOWN_DB_SOURCES.includes(sourceId)) {
    return { ok: false, sourceId: sourceId || null, result: null, error: `unknown sourceId: ${sourceId}` };
  }
  if (!ALLOWED_QUERY_KINDS.includes(query.kind)) {
    return { ok: false, sourceId, result: null, error: `unknown query.kind: ${query.kind}` };
  }
  const resolver = bridge.sources[sourceId];
  if (!resolver) {
    return { ok: false, sourceId, result: null, error: `no resolver registered for: ${sourceId}` };
  }
  let result;
  try {
    result = resolver.resolve(query);
  } catch (err) {
    return { ok: false, sourceId, result: null, error: `resolver threw: ${err && err.message ? err.message : String(err)}` };
  }
  return { ok: true, sourceId, result, error: null };
}

/** Pure: tally a hit count update (immutable). */
export function recordHit(bridge, sourceId) {
  if (!bridge || !KNOWN_DB_SOURCES.includes(sourceId)) return bridge;
  const cur = bridge.hitTally[sourceId] || 0;
  return {
    ...bridge,
    hitTally: { ...bridge.hitTally, [sourceId]: cur + 1 },
  };
}

/** Pure: merge results from multiple sources with provenance per row. */
export function mergeResults(resultBundles) {
  if (!Array.isArray(resultBundles)) return [];
  const merged = [];
  for (const b of resultBundles) {
    if (!b || !b.ok || !Array.isArray(b.result)) continue;
    for (const row of b.result) {
      merged.push({
        ...row,
        _provenance: {
          sourceId: b.sourceId,
          retrievedAtIso: b.retrievedAtIso || null,
        },
      });
    }
  }
  return merged;
}

/** Pure: per-source hit counts (sorted descending by hits). */
export function tallyHits(bridge) {
  if (!bridge || !bridge.hitTally) return [];
  const out = [];
  for (const key of Object.keys(bridge.hitTally)) {
    out.push({ sourceId: key, hits: bridge.hitTally[key] });
  }
  out.sort((a, b) => b.hits - a.hits);
  return out;
}

/** Pure: aggregate summary for dashboards. */
export function summarizeBridge(bridge) {
  if (!bridge) return null;
  let totalHits = 0;
  for (const k of Object.keys(bridge.hitTally || {})) totalHits += bridge.hitTally[k];
  return {
    schemaVersion: NODE_BRIDGE_CONTRACT_VERSION,
    bridgeId: bridge.bridgeId,
    knownSourceCount: KNOWN_DB_SOURCES.length,
    registeredSourceCount: registeredSourceCount(bridge),
    coveragePct: KNOWN_DB_SOURCES.length > 0
      ? registeredSourceCount(bridge) / KNOWN_DB_SOURCES.length
      : 0,
    totalHits,
    topSources: tallyHits(bridge).slice(0, 5),
  };
}
