// SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 G1: pure node-type backfill from id-prefix.
// R12 fail-loud on unknown prefix unless opts.onUnknown is "allow" or "skip".

export const PREFIX_TO_TYPE = Object.freeze({
  fs: "filesystem_leaf",
  wiki: "wiki_entry",
  datacat: "data_catalog_entry",
  vault: "vault_entry",
  disp: "dispatcher_router",
  ghost: "ghost",
  formula: "formula",
  eng: "engine",
  test: "test",
  extract: "extraction_record",
  schema: "schema_entry",
  ppg: "post_processor_generator",
  core: "core_module",
  reg: "registry_entry",
  git: "git_object",
  ms: "milestone",
  unit: "roadmap_unit",
  pkg: "package",
  hook: "hook",
  skill: "skill",
  ai: "ai_feature",
  cad: "cad_resource",
  cam: "cam_resource",
  alg: "algorithm",
  mem: "memory_entry",
  bridge: "bridge",
  combo: "combo",
  cluster: "cluster",
  domain: "domain",
  layer: "layer",
  roost: "roost",
  group: "group",
  frontend: "frontend_page",
  app: "app_entry",
  script: "script",
  command: "command_entry",
  ledger: "ledger_entry",
  trace: "trace_entry",
  rule: "rule",
  doc: "doc_entry",
  spec: "spec_entry",
  audit: "audit_entry",
  metric: "metric",
  config: "config_entry",
  state: "state_entry",
  handoff: "handoff",
  plan: "plan",
  // Discovered from 2026-05-20 live-graph dry-run (see audit + commit log).
  fe: "frontend_entry",
  wt: "worktree",
  tr: "trace_entry",
  boxextract: "box_extraction",
  untracked: "untracked_file",
  engine: "engine",
  // Memory categories surfaced from knowledge/memories/<bucket>/ Obsidian feed.
  memory_reference: "memory_entry",
  memory_feedback: "memory_entry",
  memory_uncategorized: "memory_entry",
  memory_project: "memory_entry",
  memory_scrutiny: "memory_entry",
  memory_user: "memory_entry",
  memory__index: "memory_index",
  "memory__legacy-root": "memory_entry",
  p: "process_entry",
  kn: "knowledge_entry",
});

/**
 * Infer a node's canonical type from its `id` prefix.
 *
 * Pure function. Returns:
 *   { type: string|null, prefix: string|null, status: "mapped"|"unknown"|"already-typed"|"no-id" }
 *
 * - "already-typed": node already has a non-empty `type`. Caller should NOT
 *   overwrite.
 * - "mapped": prefix found in PREFIX_TO_TYPE; return canonical type.
 * - "unknown": prefix not in PREFIX_TO_TYPE; caller decides per onUnknown.
 * - "no-id": node has no `id` field; cannot infer.
 *
 * @param {{id?: string, type?: string}} node
 * @returns {{type: string|null, prefix: string|null, status: string}}
 */
export function inferType(node) {
  if (!node || typeof node !== "object") {
    return { type: null, prefix: null, status: "no-id" };
  }
  if (typeof node.type === "string" && node.type.length > 0) {
    return { type: node.type, prefix: null, status: "already-typed" };
  }
  const id = typeof node.id === "string" ? node.id : "";
  if (!id) return { type: null, prefix: null, status: "no-id" };
  // First dotted segment is the layer prefix.
  const dotIdx = id.indexOf(".");
  const prefix = dotIdx === -1 ? id : id.slice(0, dotIdx);
  if (!prefix) return { type: null, prefix: null, status: "no-id" };
  const mapped = PREFIX_TO_TYPE[prefix];
  if (mapped) return { type: mapped, prefix, status: "mapped" };
  return { type: null, prefix, status: "unknown" };
}

/**
 * Apply node-type backfill to a parsed graph in-place.
 *
 * Idempotent and non-destructive: nodes that already have a `type` are
 * untouched. Returns a report so the caller can verify the lift and surface
 * unknown prefixes.
 *
 * @param {{nodes?: Array<{id?: string, type?: string}>}} graph
 * @param {Object} [opts]
 * @param {"throw"|"allow"|"skip"} [opts.onUnknown="throw"]
 *   - "throw" (default): fail-loud per R12 if any unknown prefix is encountered.
 *     The first unknown causes the function to throw with a descriptive
 *     message naming the prefix and an example id.
 *   - "allow": type the node as `unknown` and continue. Report accumulates
 *     the prefix counts in `report.unknownPrefixes`.
 *   - "skip": leave the node untyped. Report accumulates in `report.skipped`.
 * @returns {{
 *   total: number,
 *   alreadyTyped: number,
 *   mapped: number,
 *   skippedUnknown: number,
 *   allowedUnknown: number,
 *   noId: number,
 *   unknownPrefixes: Record<string, number>,
 *   typesAddedByPrefix: Record<string, number>
 * }}
 */
export function applyTypeBackfill(graph, opts = {}) {
  const onUnknown = opts.onUnknown || "throw";
  if (!["throw", "allow", "skip"].includes(onUnknown)) {
    throw new Error(
      `applyTypeBackfill: opts.onUnknown must be 'throw'|'allow'|'skip', got ${JSON.stringify(onUnknown)}`,
    );
  }
  if (!graph || typeof graph !== "object" || !Array.isArray(graph.nodes)) {
    throw new Error("applyTypeBackfill: graph.nodes[] required");
  }
  const report = {
    total: graph.nodes.length,
    alreadyTyped: 0,
    mapped: 0,
    skippedUnknown: 0,
    allowedUnknown: 0,
    noId: 0,
    unknownPrefixes: Object.create(null),
    typesAddedByPrefix: Object.create(null),
  };
  for (const node of graph.nodes) {
    const inf = inferType(node);
    if (inf.status === "already-typed") {
      report.alreadyTyped++;
      continue;
    }
    if (inf.status === "no-id") {
      report.noId++;
      continue;
    }
    if (inf.status === "mapped") {
      node.type = inf.type;
      report.mapped++;
      report.typesAddedByPrefix[inf.prefix] =
        (report.typesAddedByPrefix[inf.prefix] || 0) + 1;
      continue;
    }
    // status === "unknown"
    if (onUnknown === "throw") {
      throw new Error(
        `applyTypeBackfill: unknown id-prefix '${inf.prefix}' on node id=${JSON.stringify(node.id)}. ` +
          `Add it to PREFIX_TO_TYPE in scripts/lib/system-viz-type-backfill.mjs, or re-run with --allow-unknown.`,
      );
    }
    report.unknownPrefixes[inf.prefix] =
      (report.unknownPrefixes[inf.prefix] || 0) + 1;
    if (onUnknown === "allow") {
      node.type = "unknown";
      report.allowedUnknown++;
    } else {
      // skip
      report.skippedUnknown++;
    }
  }
  return report;
}

/**
 * Compute type-coverage stats over a graph (read-only).
 *
 * Useful as a before/after measurement. Does NOT mutate.
 *
 * @param {{nodes?: Array<{id?: string, type?: string}>}} graph
 * @returns {{total: number, typed: number, untyped: number, pctTyped: number, byType: Record<string, number>, untypedByPrefix: Record<string, number>}}
 */
export function countTypeCoverage(graph) {
  if (!graph || !Array.isArray(graph.nodes)) {
    return {
      total: 0,
      typed: 0,
      untyped: 0,
      pctTyped: 0,
      byType: {},
      untypedByPrefix: {},
    };
  }
  const byType = Object.create(null);
  const untypedByPrefix = Object.create(null);
  let typed = 0,
    untyped = 0;
  for (const n of graph.nodes) {
    if (typeof n.type === "string" && n.type.length > 0) {
      typed++;
      byType[n.type] = (byType[n.type] || 0) + 1;
    } else {
      untyped++;
      const id = typeof n.id === "string" ? n.id : "";
      const prefix = id.split(".")[0] || "(no-id)";
      untypedByPrefix[prefix] = (untypedByPrefix[prefix] || 0) + 1;
    }
  }
  const total = typed + untyped;
  const pctTyped = total === 0 ? 0 : (typed / total) * 100;
  return { total, typed, untyped, pctTyped, byType, untypedByPrefix };
}
