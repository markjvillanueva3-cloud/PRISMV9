#!/usr/bin/env node
// scripts/system-viz-node-dispatch.mjs
//
// SYSTEM-VIZ-BRAIN-MS0 / U-P2-NODE-CLICK-DISPATCH (backend slice)
//
// Pure resolver: system-viz node id → dispatcher action route.
//
// The frontend hookup (binding click events on the /system-viz canvas to
// invoke this resolver + the resulting dispatcher action) is intentionally
// scoped out — `mcp-server/web/` is peer-claim contention space. The backend
// route IS the load-bearing part; the frontend is a thin caller.
//
// Resolution rules (precedence highest → lowest):
//   1. wiki_entry action node (`wiki.architecture.actions_<lc-dispatcher>_<lc-action>`)
//      → DIRECT route: { dispatcher: "prism_<camelCaseDispatcher>", action: <camelCaseAction>,
//                        args:{}, confidence:1.0 }
//      camelCase recovery comes from node.label ("adaptiveControl:`acal`") — the id is
//      lossy-lowercased; the label preserves case (P0 fix from per-file scrutiny against
//      the live action-enum contract).
//   2. dispatcher_router node (`formula.adjusted.<name>dispatcher`)
//      → prism_session:master_index_query with {query:<dispatcherName>}
//      (NOT dispatcher_map_compact — that action ignores any dispatcher-filter arg
//      and returns the WHOLE map, per sessionDispatcher.ts:1321-1325)
//   3. unit node (`ghost.ms.<ms-slug>.u-<id>`, kind=planned-unit|priority-unit|bridge-unit|misc-task)
//      → prism_dev:roadmap_tool_plan_query with {unit_key: "U-…"}
//      (NOT unit_id — the dispatcher reads params.unit_key ?? params.unitKey at
//      devDispatcher.ts:4691; milestone_id is NOT accepted)
//   4. milestone node (`ghost.ms.<slug>`)
//      → prism_session:master_index_query with {query:<milestoneId>}
//      (roadmap_tool_plan_query is unit-scoped only; milestone-scoped lookup goes via
//      master_index_query)
//   5. engine node (kind=engine, label is the engine class)
//      → prism_agent:capabilities with {op:"engine_dependents", name:<engineLabel>}
//      (engine_dependents lives on agentDispatcher.ts:314 capabilities-op switch,
//      NOT on session — verified against the live dispatcher source)
//   6. fallback: prism_session:master_index_query with {query:label}
//
// Pure-core: routeNode(node) is exported and hermetic.
// CLI: --node-id <id> reads live system-graph.json + emits route as JSON.
// Exit codes: 0 ok, 2 input failure (node not found / graph unreadable).

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_REPO = resolve(__dirname, "..");
const DEFAULT_GRAPH_REL = "state/shared/system-viz/system-graph.json";

const ROUTE_KIND = Object.freeze({
  DIRECT: "direct-action",
  DISPATCHER_INTROSPECT: "dispatcher-introspect",
  MILESTONE_QUERY: "milestone-query",
  UNIT_QUERY: "unit-query",
  ENGINE_DEPENDENTS: "engine-dependents",
  MASTER_INDEX_FALLBACK: "master-index-fallback",
});

export function parseArgs(argv) {
  const opts = {
    nodeId: null,
    graphPath: null,
    json: true,
    help: false,
    repoRoot: DEFAULT_REPO,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--node-id") opts.nodeId = String(argv[++i] || "");
    else if (a === "--graph-path") opts.graphPath = String(argv[++i] || "");
    else if (a === "--text") opts.json = false;
    else if (a === "--repo-root") opts.repoRoot = String(argv[++i] || opts.repoRoot);
    else if (a === "-h" || a === "--help") opts.help = true;
    else if (a.startsWith("--")) {
      const e = new Error(`unknown flag: ${a}`);
      e.code = "BAD_ARG";
      throw e;
    }
  }
  return opts;
}

// --- pure resolver ----------------------------------------------------------

/**
 * Strip a kebab-or-snake suffix into a single canonical action token.
 * "calc_machine-envelope-check" → "machine_envelope_check"
 */
function canonicalizeAction(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw.replace(/-/g, "_").toLowerCase();
}

function canonicalizeDispatcher(raw) {
  if (!raw || typeof raw !== "string") return "";
  // Drop -dispatcher / Dispatcher suffix, lowercase, retain camelCase as snake
  return raw.replace(/dispatcher$/i, "").toLowerCase();
}

/**
 * Parse an action-wiki node id (`wiki.architecture.actions_<dispatcher>_<action>`).
 * Returns null when the id is not an action-wiki entry. Note: the id is
 * lowercased-and-kebab-cased; case-sensitive dispatcher/action names must be
 * recovered from `node.label` via {@link parseActionLabel}.
 */
export function parseActionWikiId(id) {
  if (!id || typeof id !== "string") return null;
  const m = id.match(/^wiki\.architecture\.actions_([^_]+)_(.+)$/);
  if (!m) return null;
  return {
    dispatcher: canonicalizeDispatcher(m[1]),
    action: canonicalizeAction(m[2]),
  };
}

/**
 * Parse the canonical action-wiki node label `<dispatcherCamel>:`<actionCamel>``
 * to recover case-sensitive dispatcher + action names that the id lowercases.
 * Returns null when the label doesn't match the canonical action shape.
 *
 * Examples:
 *   "adaptiveControl:`acal`"       → { dispatcher: "adaptiveControl", action: "acal" }
 *   "cam:`cam_hypermill_inhost_…`" → { dispatcher: "cam", action: "cam_hypermill_inhost_…" }
 */
export function parseActionLabel(label) {
  if (!label || typeof label !== "string") return null;
  const m = label.match(/^([A-Za-z][A-Za-z0-9]*):`([^`]+)`$/);
  if (!m) return null;
  return { dispatcher: m[1], action: m[2] };
}

/**
 * Parse a dispatcher-router label `router · <name>` to recover the
 * case-preserving dispatcher name. Returns null on mismatch.
 */
export function parseDispatcherRouterLabel(label) {
  if (!label || typeof label !== "string") return null;
  // Match through the FIRST newline / parenthesis so trailing "(N engines)" is dropped.
  const m = label.match(/^router\s*·\s*([A-Za-z][A-Za-z0-9_]*)/);
  if (!m) return null;
  return { dispatcher: m[1] };
}

/**
 * Parse a dispatcher_router node id (`formula.adjusted.<name>dispatcher`).
 */
export function parseDispatcherRouterId(id) {
  if (!id || typeof id !== "string") return null;
  const m = id.match(/^formula\.adjusted\.([a-z][a-z0-9-]*)dispatcher$/i);
  if (!m) return null;
  return { dispatcher: canonicalizeDispatcher(m[1]) };
}

/**
 * Parse a unit node id (`ghost.ms.<ms-slug>.u-<unit-id>`).
 */
export function parseUnitId(id) {
  if (!id || typeof id !== "string") return null;
  const m = id.match(/^ghost\.ms\.([a-z0-9-]+)\.(u-[a-z0-9-]+)$/i);
  if (!m) return null;
  return { milestoneSlug: m[1], unitId: m[2].toUpperCase() };
}

/**
 * Parse a milestone node id (`ghost.ms.<slug>`).
 */
export function parseMilestoneId(id) {
  if (!id || typeof id !== "string") return null;
  const m = id.match(/^ghost\.ms\.([a-z0-9-]+)$/i);
  if (!m) return null;
  return { milestoneSlug: m[1] };
}

const UNIT_KINDS = Object.freeze(new Set(["planned-unit", "priority-unit", "bridge-unit", "misc-task"]));

/**
 * @param {{id:string, kind?:string, label?:string, layer?:string, status?:string}} node
 * @returns {{kind:string, dispatcher:string|null, action:string|null, args:object, confidence:number, reason:string}}
 */
export function routeNode(node) {
  if (!node || typeof node !== "object" || typeof node.id !== "string") {
    return {
      kind: ROUTE_KIND.MASTER_INDEX_FALLBACK,
      dispatcher: "prism_session",
      action: "master_index_query",
      args: { query: "" },
      confidence: 0,
      reason: "node-shape-invalid",
    };
  }

  // 1. Direct action wiki entry — highest precedence.
  // Prefer label parsing (case-preserving) over id parsing (case-lossy) so the
  // emitted dispatcher matches the actual MCP tool name (`prism_adaptiveControl`,
  // not `prism_adaptivecontrol`) and the action matches the dispatcher's z.enum
  // (e.g. `adaChat` not `adachat`).
  const labelAck = parseActionLabel(node.label);
  const idAck = parseActionWikiId(node.id);
  if ((labelAck || idAck)) {
    const dispatcherName = (labelAck && labelAck.dispatcher) || (idAck && idAck.dispatcher);
    const actionName = (labelAck && labelAck.action) || (idAck && idAck.action);
    if (dispatcherName && actionName) {
      return {
        kind: ROUTE_KIND.DIRECT,
        dispatcher: `prism_${dispatcherName}`,
        action: actionName,
        args: {},
        confidence: labelAck ? 1.0 : 0.85,
        reason: labelAck ? "action-wiki-label-match" : "action-wiki-id-match-lossy-case",
      };
    }
  }

  // 2. Dispatcher router → master_index_query for that dispatcher's docs.
  // (sessionDispatcher.ts:1321-1325: dispatcher_map_compact takes max_per_dispatcher
  //  and returns the WHOLE map — it does not accept a per-dispatcher filter.)
  const dispIdMatch = parseDispatcherRouterId(node.id);
  const dispLabelMatch = parseDispatcherRouterLabel(node.label);
  if (dispIdMatch || dispLabelMatch) {
    const dispatcherName = (dispLabelMatch && dispLabelMatch.dispatcher)
      || (dispIdMatch && dispIdMatch.dispatcher);
    if (dispatcherName) {
      return {
        kind: ROUTE_KIND.DISPATCHER_INTROSPECT,
        dispatcher: "prism_session",
        action: "master_index_query",
        args: { query: dispatcherName },
        confidence: 0.85,
        reason: "dispatcher-router-via-master-index",
      };
    }
  }

  // 3. Unit node — query the roadmap tool plan via unit_key.
  // (devDispatcher.ts:4691: const unitKey = String(params.unit_key ?? params.unitKey ?? "");
  //  milestone_id is NOT accepted — the sidecar is keyed solely on unit_key.)
  if (UNIT_KINDS.has(node.kind)) {
    const u = parseUnitId(node.id);
    if (u && u.unitId) {
      return {
        kind: ROUTE_KIND.UNIT_QUERY,
        dispatcher: "prism_dev",
        action: "roadmap_tool_plan_query",
        args: { unit_key: u.unitId },
        confidence: 0.90,
        reason: "unit-id-from-graph",
      };
    }
  }

  // 4. Milestone node — no milestone-scoped roadmap_tool_plan_query exists,
  // so route to master_index_query with the milestone id as the search term.
  if (node.kind === "milestone") {
    const m = parseMilestoneId(node.id);
    if (m && m.milestoneSlug) {
      return {
        kind: ROUTE_KIND.MILESTONE_QUERY,
        dispatcher: "prism_session",
        action: "master_index_query",
        args: { query: m.milestoneSlug.toUpperCase() },
        confidence: 0.85,
        reason: "milestone-via-master-index",
      };
    }
  }

  // 5. Engine node — capabilities.engine_dependents lives on agentDispatcher.
  // (agentDispatcher.ts:314: case "engine_dependents": uses params.name)
  if (node.kind === "engine") {
    const engineName = node.label || node.id;
    return {
      kind: ROUTE_KIND.ENGINE_DEPENDENTS,
      dispatcher: "prism_agent",
      action: "capabilities",
      args: { op: "engine_dependents", name: String(engineName) },
      confidence: 0.85,
      reason: "engine-label",
    };
  }

  // 6. Fallback — master_index_query with label as search term.
  // Confidence 0.35 (down from 0.5) so click-handlers can gate UI on
  // confidence ≥ 0.5 and not act on unrecognized shapes.
  const query = String(node.label || node.id || "");
  return {
    kind: ROUTE_KIND.MASTER_INDEX_FALLBACK,
    dispatcher: "prism_session",
    action: "master_index_query",
    args: { query },
    confidence: 0.35,
    reason: "fallback-master-index-search",
  };
}

// --- I/O wrapper ------------------------------------------------------------

export function loadGraph(graphPath) {
  if (!existsSync(graphPath)) {
    const e = new Error(`system-graph not found: ${graphPath}`);
    e.code = "GRAPH_NOT_FOUND";
    throw e;
  }
  const raw = readFileSync(graphPath, "utf8");
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (err) {
    const e = new Error(`system-graph not parseable: ${err.message}`);
    e.code = "GRAPH_PARSE";
    throw e;
  }
  const nodes = Array.isArray(parsed?.nodes) ? parsed.nodes : [];
  return { nodes, totalNodes: nodes.length };
}

export function findNode(graph, nodeId) {
  if (!graph || !Array.isArray(graph.nodes)) return null;
  return graph.nodes.find((n) => n && n.id === nodeId) || null;
}

// --- CLI --------------------------------------------------------------------

export function main(argv = process.argv.slice(2)) {
  let opts;
  try { opts = parseArgs(argv); }
  catch (e) {
    process.stderr.write(`system-viz-node-dispatch: ${e.message}\n`);
    return 2;
  }
  if (opts.help) {
    process.stdout.write(
      "system-viz-node-dispatch.mjs — resolve a graph node id to a dispatcher action\n" +
      "Usage: node system-viz-node-dispatch.mjs --node-id <id> [--graph-path PATH] [--text]\n" +
      "Exit codes: 0 ok, 2 input failure (node not found / graph unreadable)\n",
    );
    return 0;
  }
  if (!opts.nodeId) {
    process.stderr.write("system-viz-node-dispatch: --node-id required\n");
    return 2;
  }
  const graphPath = opts.graphPath || resolve(opts.repoRoot, DEFAULT_GRAPH_REL);
  let graph;
  try { graph = loadGraph(graphPath); }
  catch (e) {
    process.stderr.write(`system-viz-node-dispatch: ${e.message}\n`);
    return 2;
  }
  const node = findNode(graph, opts.nodeId);
  if (!node) {
    process.stderr.write(`system-viz-node-dispatch: node not found: ${opts.nodeId} (graph has ${graph.totalNodes} nodes)\n`);
    return 2;
  }
  const route = routeNode(node);
  const out = {
    nodeId: node.id,
    nodeKind: node.kind || null,
    nodeLabel: node.label || null,
    route,
  };
  if (opts.json) {
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  } else {
    process.stdout.write(`Node:  ${out.nodeId}  (kind=${out.nodeKind || "—"})\n`);
    process.stdout.write(`Label: ${out.nodeLabel || "—"}\n`);
    process.stdout.write(`Route: ${route.dispatcher}:${route.action}\n`);
    process.stdout.write(`Args:  ${JSON.stringify(route.args)}\n`);
    process.stdout.write(`Kind:  ${route.kind} (confidence ${route.confidence}, reason: ${route.reason})\n`);
  }
  return 0;
}

const isCli = (() => {
  try { return process.argv[1] && resolve(process.argv[1]) === __filename; }
  catch { return false; }
})();
if (isCli) {
  try { process.exit(main()); }
  catch (e) {
    process.stderr.write(`system-viz-node-dispatch: fatal: ${e?.message || e}\n`);
    process.exit(2);
  }
}
