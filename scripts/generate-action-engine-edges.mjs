#!/usr/bin/env node
/**
 * generate-action-engine-edges.mjs — for each L4a `action.<disp>.<name>` node,
 * scan its dispatcher source for the case-body that handles that action and
 * extract engine references. Emit `invokes` edges from action -> engine atom
 * so the L4a -> L5 flow shows up live on the viz.
 *
 * Engine-reference patterns:
 *   <engineNameLowerCamel>Engine.<method>(   — common singleton pattern
 *   await <engineNameLowerCamel>Engine.       — async path
 *   new <EngineName>Engine(                   — direct construction
 *   from "../../engines/<EngineName>.js"      — import
 *
 * Resolution: lowercase the engine name; look up in graph for any L5 atomic
 * eng.*.<engineNameLower>(engine)?. If found, emit edge.
 *
 * Output: state/shared/system-viz/action-engine-edges-augmentation.json
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

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", newEdges: [], stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));

  // Build an engine lookup keyed by lowercased stem
  // matches both "kienzleengine" and "kienzle" → "eng.<domain>.kienzleengine"
  const engineByStem = new Map();
  for (const n of graph.nodes) {
    if (n.layer !== "L5") continue;
    if (!n.id?.match(/^eng\..+\..+$/)) continue;
    const stem = n.id.split(".").slice(2).join(".").toLowerCase();
    if (!engineByStem.has(stem)) engineByStem.set(stem, n.id);
    // Also without "engine" suffix for shorter handle
    if (stem.endsWith("engine")) {
      const short = stem.slice(0, -6);
      if (!engineByStem.has(short)) engineByStem.set(short, n.id);
    }
  }

  // Group action nodes by dispatcher
  const actionsByDispatcher = new Map();
  for (const n of graph.nodes) {
    if (n.layer !== "L4a") continue;
    if (!n.dispatcher) continue;
    if (!actionsByDispatcher.has(n.dispatcher)) actionsByDispatcher.set(n.dispatcher, []);
    actionsByDispatcher.get(n.dispatcher).push(n);
  }

  const stats = {
    dispatchersProcessed: 0,
    actionsScanned: 0,
    edgesEmitted: 0,
    enginesResolved: 0,
    enginesUnresolved: 0,
  };
  const newEdges = [];
  const seenEdge = new Set();

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  if (!fs.existsSync(DISP_DIR)) return { error: "disp-dir-missing", newEdges: [], stats };

  for (const file of fs.readdirSync(DISP_DIR).filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"))) {
    const stem = file.replace(/\.ts$/, "").toLowerCase();
    const dispId = `disp.${stem}`;
    const actions = actionsByDispatcher.get(dispId);
    if (!actions || actions.length === 0) continue;
    stats.dispatchersProcessed++;

    let text = "";
    try { text = fs.readFileSync(path.join(DISP_DIR, file), "utf8"); } catch { continue; }

    for (const actionNode of actions) {
      stats.actionsScanned++;
      const actionName = actionNode.action;
      // Find the case body — from `case "<name>":` up to the next `case ` or `default:` or end of switch
      const escName = actionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const caseRe = new RegExp(`case\\s+["']${escName}["']\\s*:`, "i");
      const m = caseRe.exec(text);
      if (!m) continue;
      const start = m.index + m[0].length;
      // Cap body scan to ~6000 chars to avoid pathological cases
      const bodySlice = text.slice(start, start + 6000);
      // Body extends until the next `case ` or `default:` at top level — naive limit
      const stop = bodySlice.search(/\n\s*(case\s+["'][a-z_]|default\s*:)/);
      const body = stop >= 0 ? bodySlice.slice(0, stop) : bodySlice;

      // Engine-reference patterns
      const engineRefs = new Set();
      // 1. lowerCamelEngine
      for (const r of body.matchAll(/\b([a-z][A-Za-z0-9_]*Engine)\b/g)) {
        engineRefs.add(r[1].toLowerCase());
      }
      // 2. PascalCaseEngine construction
      for (const r of body.matchAll(/\bnew\s+([A-Z][A-Za-z0-9_]*Engine)\s*\(/g)) {
        engineRefs.add(r[1].toLowerCase());
      }

      for (const ref of engineRefs) {
        const engineId = engineByStem.get(ref) || engineByStem.get(ref.replace(/engine$/, ""));
        if (engineId) {
          if (pushEdge(actionNode.id, engineId, "invokes", "active", 0.30)) {
            stats.edgesEmitted++;
            stats.enginesResolved++;
          }
        } else {
          stats.enginesUnresolved++;
        }
      }
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "action-engine-edges-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`wrote ${outPath}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  dispatchers processed: ${result.stats.dispatchersProcessed}`);
  console.log(`  actions scanned:       ${result.stats.actionsScanned}`);
  console.log(`  invokes edges:         ${result.stats.edgesEmitted}`);
  console.log(`  engines resolved:      ${result.stats.enginesResolved}`);
  console.log(`  engines unresolved:    ${result.stats.enginesUnresolved}`);
}
