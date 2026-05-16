#!/usr/bin/env node
/**
 * seed-ghost-from-unwired.mjs — SYSTEM-VIZ-FS-COVERAGE-MS2/U-GHOST-UNWIRED
 *
 * Generates L13 ghost nodes for the BUILD_STATE-flagged unwired engines (861
 * engines on disk with no dispatcher reference). Each gets:
 *   - ghost.unwired-engine node with `proposed_wiring` + `confidence` fields
 *   - ghost-wire edge (relation: "proposed-wire") pointing at the inferred dispatcher
 *
 * Dispatcher inference is heuristic — a name-keyword classifier with manual
 * confidence scoring. Confidence < 0.5 → emits the engine as ghost but with
 * `proposed_wiring: "UNKNOWN — review manually"` and NO edge.
 *
 * Pure-export contract (for tests):
 *   listUnwiredEngines(enginesDir, dispatcherDir, opts) → [{ name, file, mtime, sizeKB }]
 *   inferDispatcher(engineName) → { dispatcher, confidence, reason }
 *   buildGhostFromUnwired(engine) → { node, edge | null }
 *
 * Atomic write: temp + rename + Windows-safe EBUSY retry (mirrors
 * seed-ghost-nodes.mjs writer for consistency).
 *
 * Usage:
 *   node scripts/seed-ghost-from-unwired.mjs --dry-run
 *   node scripts/seed-ghost-from-unwired.mjs --apply
 *   node scripts/seed-ghost-from-unwired.mjs --revert    (deletes ghost.unwired-engine nodes)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINES_DIR = path.join(ROOT, "mcp-server", "src", "engines");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");

// Dispatcher inference table — ordered, first-match-wins.
// confidence is a 0..1 score; values < MIN_CONFIDENCE emit ghost but no edge.
export const DISPATCHER_INFERENCE_RULES = Object.freeze([
  // High-confidence keyword matches (domain-specific)
  { pattern: /\b(kienzle|taylor|chip[-_]?thinning|deflection|sld|chatter|coolant|thermal|force|wear)/i, dispatcher: "prism_calc", confidence: 0.85, reason: "physics/mechanics keyword" },
  { pattern: /\b(safety|collision|envelope|workholding|spindle[-_]?limit|rapid[-_]?retract)/i, dispatcher: "prism_safety", confidence: 0.85, reason: "safety/collision keyword" },
  { pattern: /\b(gcode|toolpath|mastercam|hypermill|fusion|esprit|nci|post[-_]?processor|cam[-_]?)/i, dispatcher: "prism_cam", confidence: 0.82, reason: "CAM/toolpath keyword" },
  { pattern: /\b(cadquery|cad[-_]?fusion|nurbs|brep|solid[-_]?works|step|iges|dxf)/i, dispatcher: "prism_cad", confidence: 0.82, reason: "CAD geometry keyword" },
  { pattern: /\b(lathe|turning|swiss|grinder|threading|live[-_]?tool|sub[-_]?spindle|bar[-_]?feed)/i, dispatcher: "prism_turning", confidence: 0.85, reason: "lathe/turning keyword" },
  { pattern: /\b(wedm|sinker|edm|wire[-_]?cut|dielectric|flush)/i, dispatcher: "prism_cam", confidence: 0.75, reason: "EDM keyword (mapped to cam dispatcher)" },
  { pattern: /\b(5axis|five[-_]?axis|kinematics|tcpc|simultaneous)/i, dispatcher: "prism_5axis", confidence: 0.85, reason: "5-axis kinematics keyword" },
  { pattern: /\b(neural|reasoning|cognitive|deep[-_]?learn|tribal[-_]?ai|agi|ml[-_]?|llm)/i, dispatcher: "prism_ai", confidence: 0.80, reason: "AI/neural reasoning keyword" },
  { pattern: /\b(intelligence|orchestrat|synth|cross[-_]?disciplin)/i, dispatcher: "prism_intelligence", confidence: 0.70, reason: "intelligence/orchestration keyword" },
  { pattern: /\b(omega|quality[-_]?score|sigma|cpk|tolerance[-_]?stack)/i, dispatcher: "prism_omega", confidence: 0.78, reason: "quality/Omega keyword" },
  { pattern: /\b(memory|recall|qdrant|embed|vector|episodic|tribal[-_]?knowledge)/i, dispatcher: "prism_memory", confidence: 0.78, reason: "memory/recall keyword" },
  { pattern: /\b(session|context|chat|handoff|compact|precompact|presence)/i, dispatcher: "prism_session", confidence: 0.75, reason: "session/context keyword" },
  { pattern: /\b(dev|build|test|coverage|telemetry|metrics|dashboard|monitoring)/i, dispatcher: "prism_dev", confidence: 0.70, reason: "dev/build/telemetry keyword" },
  { pattern: /\b(autopilot|atcs|run[-_]?continuous|pipeline|orchestrator)/i, dispatcher: "prism_orchestrate", confidence: 0.70, reason: "orchestration/autopilot keyword" },
  { pattern: /\b(skill|script|hook|registry|capability)/i, dispatcher: "prism_skill_script", confidence: 0.68, reason: "skill/script keyword" },
  { pattern: /\b(safety[-_]?guard|agi[-_]?containment|guard)/i, dispatcher: "prism_guard", confidence: 0.72, reason: "guard/containment keyword" },
  { pattern: /\b(blueprint|drawing|ocr|gd&t|gdt|inspection|cmm)/i, dispatcher: "prism_intake", confidence: 0.70, reason: "drawing/intake keyword" },
  { pattern: /\b(quote|cost|estimate|biz|invoice|customer|erp)/i, dispatcher: "prism_session", confidence: 0.55, reason: "business/quote keyword (low conf — review)" },
]);

export const MIN_CONFIDENCE = 0.5;

/** Split CamelCase into space-separated tokens so word-boundary regexes match.
 *  "MillForceEngine" → "Mill Force Engine"; "GCodeTemplateEngine" → "G Code Template Engine".
 */
export function splitCamelCase(s) {
  if (typeof s !== "string") return "";
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")    // mF → m F
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")  // ABc → A Bc (handles consecutive caps)
    .replace(/_/g, " ")                          // snake_case → space
    .replace(/-/g, " ");                         // kebab-case → space
}

export function inferDispatcher(engineName) {
  if (typeof engineName !== "string" || engineName.length === 0) {
    return { dispatcher: "UNKNOWN", confidence: 0, reason: "empty/invalid name" };
  }
  const tokenized = splitCamelCase(engineName);
  const flat = engineName.toLowerCase();
  for (const rule of DISPATCHER_INFERENCE_RULES) {
    // Match against both the space-split form (word-boundaries) AND the lowercased
    // raw name as a flat substring search (catches "gcode" inside "GCodeEngine").
    // The flat-substring pass uses the pattern source string directly.
    if (rule.pattern.test(tokenized) || rule.pattern.test(flat) || rule.pattern.test(engineName)) {
      return { dispatcher: rule.dispatcher, confidence: rule.confidence, reason: rule.reason };
    }
  }
  return { dispatcher: "UNKNOWN", confidence: 0, reason: "no keyword match — manual review needed" };
}

/**
 * List engines that exist on disk in enginesDir but have NO import in
 * any file under dispatchersDir.
 */
export function listUnwiredEngines(enginesDir, dispatchersDir, opts = {}) {
  const limit = opts.limit ?? Infinity;
  if (!fs.existsSync(enginesDir) || !fs.existsSync(dispatchersDir)) return [];
  const engineFiles = fs.readdirSync(enginesDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts") && !f.endsWith(".test.ts"));

  // Aggregate dispatcher source — we grep ONCE against the union (faster than N×M reads)
  const dispatcherFiles = fs.readdirSync(dispatchersDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts") && !f.endsWith(".test.ts"));
  let dispatcherSource = "";
  for (const f of dispatcherFiles) {
    try { dispatcherSource += fs.readFileSync(path.join(dispatchersDir, f), "utf8"); }
    catch { /* skip */ }
  }

  const unwired = [];
  for (const engineFile of engineFiles) {
    const className = engineFile.replace(/\.ts$/, "");
    // Skip singleton wrappers + index files
    if (className === "index" || className === "EngineRegistry") continue;
    // Check if class name appears in any dispatcher source
    const re = new RegExp(`\\b${className.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`);
    if (!re.test(dispatcherSource)) {
      let stat = null;
      try { stat = fs.statSync(path.join(enginesDir, engineFile)); } catch { /* ignore */ }
      unwired.push({
        name: className,
        file: engineFile,
        path: `mcp-server/src/engines/${engineFile}`,
        mtime: stat?.mtimeMs ? new Date(stat.mtimeMs).toISOString() : null,
        sizeKB: stat ? Math.round(stat.size / 1024) : 0,
      });
      if (unwired.length >= limit) break;
    }
  }
  return unwired;
}

/**
 * Build a ghost node (+ optional edge) for a single unwired engine.
 * Returns { node, edge | null }. Node always emitted; edge only if confidence >= MIN_CONFIDENCE.
 */
export function buildGhostFromUnwired(engine) {
  const inf = inferDispatcher(engine.name);
  const node = {
    id: `ghost.unwired.${engine.name}`,
    layer: "L13",
    subgroup: "unwired-engine",
    label: engine.name,
    info: `Unwired engine — proposed wiring: ${inf.dispatcher} (confidence ${inf.confidence.toFixed(2)}, reason: ${inf.reason})`,
    status: "proposed",
    size: Math.max(2, Math.min(12, Math.ceil(engine.sizeKB / 10))),
    tier: 2,
    kind: "ghost.unwired-engine",
    ghost: true,
    proposed_at: new Date().toISOString(),
    proposed_by: "seed-ghost-from-unwired.mjs",
    proposed_wiring: inf.dispatcher,
    confidence: inf.confidence,
    reason: inf.reason,
    enginePath: engine.path,
    engineMtime: engine.mtime,
    engineSizeKB: engine.sizeKB,
  };
  const edge = inf.confidence >= MIN_CONFIDENCE
    ? {
        from: node.id,
        to: `dispatcher.${inf.dispatcher}`,
        type: "ghost-wire",
        relation: "proposed-wire",
        status: "proposed",
        intensity: inf.confidence,
      }
    : null;
  return { node, edge };
}

function parseArgs(argv) {
  const out = { dryRun: false, apply: false, revert: false, limit: Infinity };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--apply") out.apply = true;
    else if (a === "--revert") out.revert = true;
    else if (a === "--limit") out.limit = Number(argv[++i]) || Infinity;
    else if (a === "--help" || a === "-h") {
      console.error("usage: seed-ghost-from-unwired [--dry-run | --apply | --revert] [--limit N]");
      process.exit(0);
    }
  }
  if (!out.dryRun && !out.apply && !out.revert) out.dryRun = true;
  return out;
}

function atomicWrite(filePath, content) {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, content);
  const delays = [50, 100, 200, 400, 800, 1600];
  for (const d of delays) {
    try { fs.renameSync(tmp, filePath); return; }
    catch (err) {
      const code = err?.code;
      if (code !== "EBUSY" && code !== "EPERM" && code !== "EACCES" && code !== "EEXIST") throw err;
      const until = Date.now() + d;
      while (Date.now() < until) { /* spin */ }
    }
  }
  throw new Error(`rename retry exhausted: ${filePath}`);
}

export function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.revert) {
    const g = JSON.parse(fs.readFileSync(GRAPH_PATH, "utf8"));
    const before = g.nodes.length;
    const ghostIds = new Set(g.nodes.filter((n) => n?.kind === "ghost.unwired-engine").map((n) => n.id));
    g.nodes = g.nodes.filter((n) => !ghostIds.has(n.id));
    g.edges = g.edges.filter((e) => !ghostIds.has(e.from));
    atomicWrite(GRAPH_PATH, JSON.stringify(g, null, 2));
    console.log(`reverted — removed ${ghostIds.size} ghost.unwired-engine nodes; graph now ${g.nodes.length} nodes (was ${before})`);
    return;
  }

  const unwired = listUnwiredEngines(ENGINES_DIR, DISPATCHERS_DIR, { limit: opts.limit });
  console.log(`Found ${unwired.length} unwired engines`);

  const byConfidence = { high: 0, medium: 0, low: 0, none: 0 };
  const byDispatcher = {};
  const nodes = [];
  const edges = [];
  for (const e of unwired) {
    const { node, edge } = buildGhostFromUnwired(e);
    nodes.push(node);
    if (edge) edges.push(edge);
    if (node.confidence >= 0.8) byConfidence.high++;
    else if (node.confidence >= 0.6) byConfidence.medium++;
    else if (node.confidence >= 0.5) byConfidence.low++;
    else byConfidence.none++;
    byDispatcher[node.proposed_wiring] = (byDispatcher[node.proposed_wiring] || 0) + 1;
  }

  console.log("Confidence breakdown:", byConfidence);
  console.log("Top 5 inferred dispatchers:", Object.entries(byDispatcher).sort((a, b) => b[1] - a[1]).slice(0, 5));

  if (opts.dryRun) {
    console.log(`DRY-RUN — would add ${nodes.length} ghost nodes + ${edges.length} ghost-wire edges`);
    return;
  }

  // Apply: idempotent merge (by id)
  console.log(`Reading graph ${GRAPH_PATH}...`);
  const g = JSON.parse(fs.readFileSync(GRAPH_PATH, "utf8"));
  const existingIds = new Set(g.nodes.map((n) => n.id));
  const existingEdgeKeys = new Set(g.edges.map((e) => `${e.from}::${e.to}::${e.type || ""}`));

  let nodesAdded = 0, nodesUpdated = 0;
  for (const n of nodes) {
    if (existingIds.has(n.id)) {
      // replace in place
      const idx = g.nodes.findIndex((x) => x.id === n.id);
      if (idx >= 0) { g.nodes[idx] = n; nodesUpdated++; }
    } else {
      g.nodes.push(n);
      existingIds.add(n.id);
      nodesAdded++;
    }
  }
  let edgesAdded = 0;
  for (const e of edges) {
    const key = `${e.from}::${e.to}::${e.type || ""}`;
    if (!existingEdgeKeys.has(key)) {
      g.edges.push(e);
      existingEdgeKeys.add(key);
      edgesAdded++;
    }
  }

  console.log(`Writing ${GRAPH_PATH} (nodes added=${nodesAdded} updated=${nodesUpdated}, edges added=${edgesAdded})...`);
  atomicWrite(GRAPH_PATH, JSON.stringify(g, null, 2));
  console.log(`DONE — graph nodes=${g.nodes.length} edges=${g.edges.length}`);
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
