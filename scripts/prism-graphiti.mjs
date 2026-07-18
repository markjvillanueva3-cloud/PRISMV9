#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-GRAPHITI-WIRE — CLI surface for the graphiti-lite
// episode store (lib at scripts/lib/episode-store.mjs from iter 11).
//
// Exposes the 5 core verbs operators + MCP clients call via Bash:
//   --summary              Print store stats (totalEpisodes, validNow,
//                          superseded, bySource, sizeBytes).
//   --add-episode --source S --body B [--source-id ID] [--valid-from ISO]
//                          [--entity NAME[:TYPE]]... [--metadata-json {}]
//                          Append a new episode. Prints the assigned id.
//   --traceback ENTITY [--limit N] [--json]
//                          List every episode mentioning ENTITY (case-insensitive).
//   --temporal-slice ISO [--limit N] [--json]
//                          List episodes valid at ISO timestamp.
//   --query --since ISO [--source X] [--limit N] [--json]
//                          List episodes filtered by valid_from >= since AND
//                          source == X (when provided).
//
// All commands default to human-readable output; --json flips to machine-readable.
// Exit codes: 0 OK · 1 usage error · 2 store error.

import { appendEpisode, buildEpisode, loadStore, queryEpisodes, episodesAt, tracebackByEntity, statsFromPath } from "./lib/episode-store.mjs";

function parseArgs(argv) {
  const args = {
    summary: false, addEpisode: false, traceback: null, temporalSlice: null, query: false,
    source: null, body: null, sourceId: null, validFrom: null,
    entities: [], metadataJson: null,
    since: null, limit: null, json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--summary") args.summary = true;
    else if (a === "--add-episode") args.addEpisode = true;
    else if (a === "--traceback") args.traceback = argv[++i] || null;
    else if (a === "--temporal-slice") args.temporalSlice = argv[++i] || null;
    else if (a === "--query") args.query = true;
    else if (a === "--source") args.source = argv[++i] || null;
    else if (a === "--body") args.body = argv[++i] || null;
    else if (a === "--source-id") args.sourceId = argv[++i] || null;
    else if (a === "--valid-from") args.validFrom = argv[++i] || null;
    else if (a === "--entity") args.entities.push(argv[++i] || "");
    else if (a === "--metadata-json") args.metadataJson = argv[++i] || null;
    else if (a === "--since") args.since = argv[++i] || null;
    else if (a === "--limit") args.limit = Number(argv[++i]) || null;
    else if (a === "--json") args.json = true;
  }
  return args;
}

function parseEntity(spec) {
  if (typeof spec !== "string" || spec.length === 0) return null;
  const idx = spec.indexOf(":");
  if (idx < 0) return { name: spec };
  return { name: spec.slice(0, idx), type: spec.slice(idx + 1) };
}

function actionSummary(args) {
  const stats = statsFromPath();
  if (args.json) { process.stdout.write(JSON.stringify(stats, null, 2) + "\n"); return 0; }
  if (!stats.exists) { process.stdout.write("episode store: (no file yet at default path)\n"); return 0; }
  const lines = [
    `episode store: ${stats.totalEpisodes} episodes (${stats.validNow} valid · ${stats.superseded} superseded)`,
    `  size: ${stats.sizeBytes} bytes · tombstones: ${stats.tombstoneCount} · skipped lines: ${stats.skippedLines}`,
    `  by source:`,
  ];
  for (const [src, n] of Object.entries(stats.bySource || {})) lines.push(`    ${src}: ${n}`);
  process.stdout.write(lines.join("\n") + "\n");
  return 0;
}

function actionAddEpisode(args) {
  if (!args.source || !args.body) {
    process.stderr.write("ERROR: --add-episode requires --source S --body B\n");
    return 1;
  }
  let metadata = null;
  if (args.metadataJson) {
    try { metadata = JSON.parse(args.metadataJson); }
    catch (e) { process.stderr.write(`ERROR: --metadata-json parse: ${e.message}\n`); return 1; }
  }
  const entities = args.entities.map(parseEntity).filter((e) => e && e.name && e.name.length > 0);
  const ep = buildEpisode({
    source: args.source,
    source_id: args.sourceId,
    body: args.body,
    valid_from: args.validFrom,
    entities,
    metadata,
  });
  const id = appendEpisode(ep);
  if (args.json) { process.stdout.write(JSON.stringify({ id, ...ep }, null, 2) + "\n"); return 0; }
  process.stdout.write(`appended ${id} (source=${ep.source}, entities=${ep.entities.length})\n`);
  return 0;
}

function renderEpisodeLine(ep) {
  const body = String(ep.body || "").split("\n")[0].slice(0, 100);
  const tag = ep.valid_until ? "SUPERSEDED" : "valid";
  return `[${tag}] ${ep.id} (${ep.source}${ep.source_id ? ":" + ep.source_id.slice(0, 10) : ""}) ${ep.valid_from} → ${body}`;
}

function actionTraceback(args) {
  const store = loadStore();
  const hits = tracebackByEntity(store, args.traceback, { limit: args.limit ?? Infinity });
  if (args.json) { process.stdout.write(JSON.stringify({ entity: args.traceback, hits }, null, 2) + "\n"); return 0; }
  process.stdout.write(`traceback "${args.traceback}": ${hits.length} episode(s)\n`);
  for (const ep of hits) process.stdout.write("  " + renderEpisodeLine(ep) + "\n");
  return 0;
}

function actionTemporalSlice(args) {
  const store = loadStore();
  const hits = episodesAt(store, args.temporalSlice, { limit: args.limit ?? Infinity });
  if (args.json) { process.stdout.write(JSON.stringify({ at: args.temporalSlice, hits }, null, 2) + "\n"); return 0; }
  process.stdout.write(`episodes valid at ${args.temporalSlice}: ${hits.length}\n`);
  for (const ep of hits) process.stdout.write("  " + renderEpisodeLine(ep) + "\n");
  return 0;
}

function actionQuery(args) {
  const store = loadStore();
  const hits = queryEpisodes(store, (ep) => {
    if (args.since && ep.valid_from && ep.valid_from < args.since) return false;
    if (args.source && ep.source !== args.source) return false;
    return true;
  }, { limit: args.limit ?? Infinity });
  if (args.json) { process.stdout.write(JSON.stringify({ since: args.since, source: args.source, hits }, null, 2) + "\n"); return 0; }
  process.stdout.write(`query (since=${args.since || "-"} source=${args.source || "-"}): ${hits.length} episode(s)\n`);
  for (const ep of hits) process.stdout.write("  " + renderEpisodeLine(ep) + "\n");
  return 0;
}

function printHelp() {
  process.stdout.write([
    "Usage: prism-graphiti <action> [flags]",
    "  --summary                              Print store stats",
    "  --add-episode --source S --body B [--source-id ID] [--valid-from ISO]",
    "                                          [--entity NAME[:TYPE]]... [--metadata-json {}]",
    "  --traceback ENTITY [--limit N] [--json]",
    "  --temporal-slice ISO [--limit N] [--json]",
    "  --query [--since ISO] [--source X] [--limit N] [--json]",
  ].join("\n") + "\n");
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.summary) return actionSummary(args);
  if (args.addEpisode) return actionAddEpisode(args);
  if (args.traceback !== null) return actionTraceback(args);
  if (args.temporalSlice !== null) return actionTemporalSlice(args);
  if (args.query) return actionQuery(args);
  printHelp();
  return argv.length === 0 ? 0 : 1;
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();

if (invokedDirect) {
  try { process.exit(main()); }
  catch (e) { process.stderr.write(`[prism-graphiti] FATAL: ${e?.stack || e?.message || e}\n`); process.exit(2); }
}
