#!/usr/bin/env node
/**
 * auto-storage-contract.mjs -- AUTO-STORAGE-CONTRACT-MS0 (slot:india, 2026-06-29)
 *
 * Gap #3 of the all-in-one-NN program ("automatic data storage depending on data
 * being generated/extracted so it's wired to all relevant consumers"). The
 * design study (SCOPE-3, wf_9aeaf69f-55a) concluded: do NOT build an
 * `AutoStorageRouter` abstraction -- the 5 storage pipelines have fundamentally
 * different latency envelopes (sync in-process / fire-and-forget on Stop / batch
 * cron / advisory-ledger) and three already own typed entry points, so a unifying
 * dispatch layer would re-invent scheduling for zero classification gain.
 *
 * The REAL gap is a per-type CONTRACT: a single, machine-readable registry naming
 * each generated/extracted data-type, its canonical entry point, its trigger, and
 * its downstream consumers -- today that contract is scattered across docblocks +
 * CLAUDE.md regression entries. This file IS that contract: pure data + pure
 * validators, no execution logic, no pipeline re-implementation.
 *
 * Use it for: discoverability ("where does generated X go?"), a dedup-guard
 * surface (before adding a new storage path, check it isn't already a route), and
 * a self-registration anchor (a new pipeline adds one STORAGE_ROUTES entry).
 *
 * Pure-export contract (for tests):
 *   STORAGE_ROUTES                  frozen array of route records
 *   findRoute(dataType)            -> route | null
 *   consumersFor(dataType)         -> string[]
 *   allConsumers()                 -> string[] (deduped, sorted)
 *   validateRoutes(routes?)        -> { ok, errors[] }  (no-dangling invariant)
 */

/**
 * @typedef {Object} StorageRoute
 * @property {string} dataType   distinct kind of generated/extracted data
 * @property {string} schema     the schema/shape gate (file or "inline")
 * @property {string} entryPoint canonical script/engine that ingests this type
 * @property {"sync"|"stop-hook"|"cron"|"per-write-hook"|"advisory-ledger"} trigger
 * @property {string[]} consumers downstream surfaces this data flows to (>=1)
 * @property {string} [note]
 */

/** @type {ReadonlyArray<Readonly<StorageRoute>>} */
export const STORAGE_ROUTES = Object.freeze([
  Object.freeze({
    dataType: "outcome_event",
    schema: "mcp-server/src/schemas/policyExperienceSchema.ts#RecordOutcomeTraceInputSchema",
    entryPoint: "mcp-server/src/engines/OutcomeTraceEngine.ts#record",
    trigger: "sync",
    consumers: Object.freeze([
      "PolicyExperienceLedger (state/policy/experience.jsonl)",
      "MLLineage edges (state/lineage/edges.jsonl)",
      "scripts/build-outcomes-lora-dataset.mjs (LoRA)",
      "scripts/vault-to-gnn-refpool.mjs (GNN ref-pool)",
      "prism_ai:outcome_trace_record",
    ]),
    note: "CLOSE-THE-LOOPS-MS0 added 4 emitters: setup_sheet/traveler/fusion_bridge/doc_read via pipelineOutcomeEmit.ts",
  }),
  Object.freeze({
    dataType: "memory_note",
    schema: "frontmatter md (knowledge/memories/<type>/)",
    entryPoint: "scripts/obsidian-memory-sync.mjs",
    trigger: "stop-hook",
    consumers: Object.freeze([
      ".claude/hooks/stop-obsidian-memory-feed.mjs (C:->H:)",
      "Obsidian vault (H:/knowledge/memories/)",
      "tribal embed (downstream)",
      "prism_memory:semantic_search (recall)",
    ]),
  }),
  Object.freeze({
    dataType: "tribal_text",
    schema: "tribal-embed-index entry (384-d ONNX)",
    entryPoint: "scripts/embed-*-into-tribal-index.mjs + drain-*-tribal.mjs",
    trigger: "per-write-hook",
    consumers: Object.freeze([
      "state/shared/tribal-embed-index.{json,manifest.json} (sharded)",
      ".claude/scripts/tribal-rerank.mjs (PSN leg #5, UserPromptSubmit)",
    ]),
  }),
  Object.freeze({
    dataType: "graph_node",
    schema: "system-graph node (L0-L11)",
    entryPoint: "scripts/regen-viz.mjs -> build-graph-index.mjs",
    trigger: "cron",
    consumers: Object.freeze([
      "state/shared/system-viz/system-graph.json + node-card-offsets.json",
      ".claude/hooks/node-card-prefetch-inject.mjs",
      "GraphSAGE GNN trainer (node-embeddings-768d.jsonl)",
      "scripts/auto-synergize-loop.mjs (AUTO-SYNERGIZE-MS0 -- auto-fold trigger)",
    ]),
    note: "AUTO-SYNERGIZE-MS0 (gap #2) automates the cron fold when memories/wiki/edges drift ahead",
  }),
  Object.freeze({
    dataType: "course_content",
    schema: "course candidate (6-node-type)",
    entryPoint: "scripts/course-data-router.mjs + lib/course-data-router-lib.mjs",
    trigger: "advisory-ledger",
    consumers: Object.freeze([
      "Lane A: tribal-tip emit",
      "Lane B: port-verify queue",
      "Lane C: forge-stub queue",
      "state/shared/COURSE-DATA-ROUTING-LEDGER.json",
    ]),
  }),
]);

const VALID_TRIGGERS = new Set(["sync", "stop-hook", "cron", "per-write-hook", "advisory-ledger"]);

/** Find the route for a data type (exact match), else null. */
export function findRoute(dataType, routes = STORAGE_ROUTES) {
  if (typeof dataType !== "string" || !dataType) return null;
  return routes.find((r) => r.dataType === dataType) ?? null;
}

/** Consumers for a data type (empty array if unknown). */
export function consumersFor(dataType, routes = STORAGE_ROUTES) {
  const r = findRoute(dataType, routes);
  return r ? [...r.consumers] : [];
}

/** All distinct consumer surfaces across every route, sorted. */
export function allConsumers(routes = STORAGE_ROUTES) {
  const set = new Set();
  for (const r of routes) for (const c of r.consumers) set.add(c);
  return [...set].sort();
}

/**
 * Validate the no-dangling invariant: every route must have a non-empty
 * dataType + schema + entryPoint, a known trigger, and >= 1 consumer; dataTypes
 * must be unique. Returns { ok, errors }.
 */
export function validateRoutes(routes = STORAGE_ROUTES) {
  const errors = [];
  const seen = new Set();
  if (!Array.isArray(routes)) return { ok: false, errors: ["routes is not an array"] };
  for (const r of routes) {
    const id = r?.dataType ?? "<missing>";
    if (!r || typeof r !== "object") { errors.push(`${id}: not an object`); continue; }
    if (!r.dataType) errors.push(`${id}: empty dataType`);
    if (seen.has(r.dataType)) errors.push(`${id}: duplicate dataType`);
    seen.add(r.dataType);
    if (!r.schema) errors.push(`${id}: empty schema`);
    if (!r.entryPoint) errors.push(`${id}: empty entryPoint`);
    if (!VALID_TRIGGERS.has(r.trigger)) errors.push(`${id}: invalid trigger '${r.trigger}'`);
    if (!Array.isArray(r.consumers) || r.consumers.length === 0) errors.push(`${id}: must have >= 1 consumer (dangling route)`);
  }
  return { ok: errors.length === 0, errors };
}

// CLI: print the contract (human) or --json (machine) or --validate (exit 1 on dangling).
function main() {
  const args = process.argv.slice(2);
  if (args.includes("--validate")) {
    const v = validateRoutes();
    if (v.ok) { console.log(`auto-storage-contract: ${STORAGE_ROUTES.length} routes valid`); return; }
    console.error("auto-storage-contract: INVALID\n  " + v.errors.join("\n  "));
    process.exitCode = 1;
    return;
  }
  if (args.includes("--json")) { console.log(JSON.stringify(STORAGE_ROUTES, null, 2)); return; }
  console.log(`AUTO-STORAGE CONTRACT -- ${STORAGE_ROUTES.length} data routes\n`);
  for (const r of STORAGE_ROUTES) {
    console.log(`* ${r.dataType}  [${r.trigger}]`);
    console.log(`    entry: ${r.entryPoint}`);
    console.log(`    -> ${r.consumers.length} consumer(s): ${r.consumers.join(" | ")}`);
  }
}

const isMain = (() => {
  try { return process.argv[1] && process.argv[1].endsWith("auto-storage-contract.mjs"); }
  catch { return false; }
})();
if (isMain) main();
