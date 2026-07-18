#!/usr/bin/env node
/**
 * generate-actions-atomic.mjs — drill every dispatcher's `action` enum into
 * atomic L4.5 (layer "L4a") action nodes parented under their dispatcher.
 *
 * Detection strategy (per dispatcher file at
 * mcp-server/src/tools/dispatchers/*.ts):
 *   1. Find `case "..."` strings inside the main switch handler — every
 *      action the dispatcher routes is enumerated this way.
 *   2. Deduplicate against `case <var>:` constructs (which don't carry a
 *      literal action name).
 *   3. Skip default / generic fallthrough.
 *
 * One node per action:
 *   id     = action.<dispatcher_stem>.<action_name>
 *   parent = disp.<dispatcher_stem>
 *   layer  = "L4a"            (between L4 dispatchers and L5 engines)
 *   subgroup = "action"
 *
 * Edges:
 *   - disp.<dispatcher> -> action.<dispatcher>.<name>   (contains)
 *
 * Output: state/shared/system-viz/actions-atomic-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const DISP_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

// dispatcher filename stem -> graph node id used by base graph
function dispatcherIdFor(file) {
  const stem = file.replace(/\.ts$/, "").toLowerCase();
  return `disp.${stem}`;
}

function extractActions(text) {
  const actions = new Set();
  // case "<name>": OR case '<name>':
  for (const m of text.matchAll(/case\s+["']([a-z_][a-z0-9_]*)["']\s*:/gi)) {
    actions.add(m[1]);
  }
  // Some dispatchers expose actions via if (action === "name") chains
  for (const m of text.matchAll(/\baction\s*===?\s*["']([a-z_][a-z0-9_]*)["']/gi)) {
    actions.add(m[1]);
  }
  // Schema imports — best-effort capture of action enum names if present
  for (const m of text.matchAll(/\baction\s*:\s*z\.enum\(\s*\[([\s\S]*?)\]/g)) {
    for (const a of m[1].matchAll(/["']([a-z_][a-z0-9_]*)["']/gi)) {
      actions.add(a[1]);
    }
  }
  return [...actions].filter(a =>
    !["default", "case", "action", "true", "false", "null", "undefined"].includes(a)
  );
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", newNodes: [], newEdges: [], stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  if (!fs.existsSync(DISP_DIR)) return { error: "disp-dir-missing", newNodes: [], newEdges: [], stats: {} };
  const files = fs.readdirSync(DISP_DIR)
    .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"));

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  const stats = {
    dispatchersScanned: files.length,
    dispatchersWithActions: 0,
    actionsEmitted: 0,
    parentMissing: 0,
    perDispatcher: {},
  };

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  for (const file of files) {
    const dispId = dispatcherIdFor(file);
    if (!existingIds.has(dispId)) { stats.parentMissing++; continue; }

    let text = "";
    try { text = fs.readFileSync(path.join(DISP_DIR, file), "utf8"); } catch { continue; }
    const actions = extractActions(text);
    if (actions.length === 0) continue;
    stats.dispatchersWithActions++;
    stats.perDispatcher[dispId] = actions.length;

    for (const action of actions) {
      const actionSlug = slugify(action);
      const id = `${dispId}.action.${actionSlug}`;
      if (existingIds.has(id) || seenId.has(id)) continue;
      seenId.add(id);
      newNodes.push({
        id,
        layer: "L4a",
        subgroup: "action",
        parent: dispId,
        label: action,
        status: "built",
        color: "#fbbf24",
        size: 0.22,
        tier: 2,
        action,
        dispatcher: dispId,
      });
      stats.actionsEmitted++;
      pushEdge(dispId, id, "contains", "active", 0.18);
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    dispatchersDir: "mcp-server/src/tools/dispatchers",
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "actions-atomic-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)}MB)`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  dispatchers scanned:    ${result.stats.dispatchersScanned}`);
  console.log(`  dispatchers w/ actions: ${result.stats.dispatchersWithActions}`);
  console.log(`  actions emitted:        ${result.stats.actionsEmitted}`);
  console.log(`  parent missing:         ${result.stats.parentMissing}`);
  console.log(`  top dispatchers by action count:`);
  const top = Object.entries(result.stats.perDispatcher).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [d, n] of top) console.log(`    ${d.padEnd(40)} ${n}`);
}
