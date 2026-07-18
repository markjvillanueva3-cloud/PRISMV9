#!/usr/bin/env node
/**
 * populate-graph-action-counts.mjs
 *
 * Reads each dispatcher's z.enum action list and emits a patch JSON with
 * the real action count per dispatcher. The peer's merge-augmentations.mjs
 * pipeline (or a future graph-merge step) can consume this to populate
 * `node.actionCount` on every `disp.*` node in system-graph.json.
 *
 * Closes the system-viz-completeness-check Blocker 5:
 *   "Graph reports 0 actions across 97 dispatchers; inventory says 7302."
 *
 * Output: H:/prism/state/shared/system-viz-action-counts.json
 *   { generatedAt, total, dispatchers: { "disp.<name>": { count, actions[] } } }
 *
 * --apply flag (optional): if set, ALSO patches system-graph.json directly.
 * Default: emit-only (peer-safe; doesn't mutate the graph).
 */

import fs from "node:fs";
import path from "node:path";

const DISP_DIR = "H:/prism/mcp-server/src/tools/dispatchers";
const GRAPH = "H:/prism/state/shared/system-viz/system-graph.json";
const OUT = "H:/prism/state/shared/system-viz-action-counts.json";
const APPLY = process.argv.includes("--apply");

// Pull action enum from a dispatcher TS source. Most dispatchers expose
// either `actionEnum: z.enum([...])` or a leading `const ACTIONS = [...] as const;`
// or `action: z.enum([...])` directly inside the schema. Try all three.
const ENUM_SHAPES = [
  /(?:actionEnum|action)\s*:\s*z\.enum\(\[([\s\S]*?)\]\)/,
  /const\s+ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/,
  /actions\s*:\s*z\.enum\(\[([\s\S]*?)\]\)/i,
];

function extractActions(src) {
  for (const re of ENUM_SHAPES) {
    const m = src.match(re);
    if (m) {
      // Pull "string-literal" tokens from inner text
      return [...m[1].matchAll(/["'`]([^"'`]+)["'`]/g)].map((mm) => mm[1]);
    }
  }
  return [];
}

function dispatcherIdFromFilename(file) {
  // E.g. camDispatcher.ts → disp.camdispatcher
  const base = path.basename(file).replace(/\.ts$/, "").toLowerCase();
  return `disp.${base}`;
}

function main() {
  if (!fs.existsSync(DISP_DIR)) {
    console.error(`dispatcher dir not found: ${DISP_DIR}`);
    process.exit(2);
  }
  const files = fs.readdirSync(DISP_DIR)
    .filter((f) => f.endsWith("Dispatcher.ts"))
    .map((f) => path.join(DISP_DIR, f));

  const dispatchers = {};
  let total = 0;
  for (const f of files) {
    let src;
    try { src = fs.readFileSync(f, "utf8"); } catch { continue; }
    const actions = extractActions(src);
    const id = dispatcherIdFromFilename(f);
    dispatchers[id] = { count: actions.length, actions };
    total += actions.length;
  }

  const out = {
    generatedAt: new Date().toISOString(),
    total,
    dispatcher_count: Object.keys(dispatchers).length,
    dispatchers,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`wrote ${OUT}`);
  console.log(`  dispatchers: ${out.dispatcher_count}`);
  console.log(`  total actions: ${out.total}`);

  if (APPLY) {
    if (!fs.existsSync(GRAPH)) {
      console.error("graph not found; --apply skipped");
      process.exit(0);
    }
    const G = JSON.parse(fs.readFileSync(GRAPH, "utf8"));
    let patched = 0;
    for (const n of G.nodes || []) {
      const id = (n.id || "").toLowerCase();
      const meta = dispatchers[id];
      if (meta) {
        n.actionCount = meta.count;
        patched++;
      }
    }
    G.generatedAt = G.generatedAt; // preserve original — only data field touched
    G.lastPatchedAt = new Date().toISOString();
    fs.writeFileSync(GRAPH, JSON.stringify(G, null, 2));
    console.log(`patched ${patched} dispatcher nodes in ${GRAPH}`);
  } else {
    console.log("(emit-only; pass --apply to also patch system-graph.json)");
  }
}

main();
