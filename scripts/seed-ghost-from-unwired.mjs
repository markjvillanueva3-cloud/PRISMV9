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
import { buildEngineDispatcherMap, inferDispatcherBySibling } from "./lib/wired-engine-mapper.mjs";
import { readGraphStreaming, writeGraphStreamingAtomic } from "./lib/graph-io.mjs";
import { MCP_TOOL_TO_DISP_NODE_ID, mcpToolToDispNodeId } from "./lib/viz-dispatcher-node-id.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINES_DIR = path.join(ROOT, "mcp-server", "src", "engines");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
// WIRE-NOTE (U-VIZ-F11-CROSS-LOCK): this is a 4th DIRECT writer of
// system-graph.json (writeGraphStreamingAtomic below). It is covered TODAY only because it
// runs exclusively as a regen-viz.mjs post-merge subprocess (regen-viz holds
// the shared .system-graph-write.pid lock for its whole child chain). If this
// script is EVER invoked standalone (cron, an nn-graph data refresh, a manual
// `node scripts/seed-ghost-from-unwired.mjs --apply`), it would write the
// graph with NO F11 lock and silently clobber a concurrent regen/on-commit
// merge. Standalone callers MUST wrap the write in
// withGraphWriteLock(...) from scripts/lib/system-graph-write-lock.mjs.
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
  // Phase-6 additions — patterns surfaced from the 456 UNKNOWN tail
  { pattern: /\b(abstract|hierarchy|synergy|authority|attractor|cognitive|emergent|symbol)/i, dispatcher: "prism_intelligence", confidence: 0.68, reason: "abstract/cognitive intelligence keyword" },
  { pattern: /\b(agent|workflow|autopilot|pipeline|executor|worker|orchestrat|broker|scheduler|atcs)/i, dispatcher: "prism_orchestrate", confidence: 0.75, reason: "agent/workflow/orchestration keyword" },
  { pattern: /\b(schema|cache|atomic|registry|config|backup|restore|migration|lifecycle|persist|state[-_]?manager)/i, dispatcher: "prism_dev", confidence: 0.70, reason: "schema/registry/dev-infra keyword" },
  { pattern: /\b(asset|acquisition|recommendation|specializ|capability)/i, dispatcher: "prism_session", confidence: 0.62, reason: "asset/recommendation keyword" },
  { pattern: /\b(auth|authoriz|jwt|oauth|credential|token[-_]?validator)/i, dispatcher: "prism_session", confidence: 0.65, reason: "auth/credential keyword" },
  { pattern: /\b(as9100|iso[-_]?9001|traceab|reliab|defect|qms|compliance)/i, dispatcher: "prism_safety", confidence: 0.72, reason: "compliance/traceability keyword" },
  { pattern: /\b(autocad|catia|nx[-_]|inventor|sw[-_]|plugin|addin|bridge|dotnet)/i, dispatcher: "prism_cam", confidence: 0.70, reason: "CAM-bridge plugin keyword" },
  { pattern: /\b(arc|fillet|chamfer|mesh|geom|nurbs|spline|bezier|tessell)/i, dispatcher: "prism_cad", confidence: 0.72, reason: "geometry/mesh keyword" },
  { pattern: /\b(pump|piston|ball[-_]?mill|bar[-_]?remnant|gear|bearing|spindle[-_]?body)/i, dispatcher: "prism_cam", confidence: 0.65, reason: "mechanical component keyword (mapped to CAM dispatcher)" },
  { pattern: /\b(advanced[-_]?cnc|strateg|cycle|preset|template[-_]?engine)/i, dispatcher: "prism_cam", confidence: 0.65, reason: "advanced CNC/strategy keyword" },
  { pattern: /\b(validator|validation|guard|sanitize|verify)/i, dispatcher: "prism_safety", confidence: 0.60, reason: "validator/guard keyword" },
  { pattern: /\b(extractor|parser|tokeniz|lexer|ingest|harvester|spider|crawler)/i, dispatcher: "prism_intake", confidence: 0.68, reason: "extractor/parser keyword" },
  { pattern: /\b(generator|render|emit|transform|compil)/i, dispatcher: "prism_cam", confidence: 0.58, reason: "generator/render keyword (low conf — review)" },
  { pattern: /\b(predictor|classifier|recommender|regressor|estimator)/i, dispatcher: "prism_ai", confidence: 0.72, reason: "ML predictor/classifier keyword" },
  { pattern: /\b(event|stream|queue|pubsub|notify|alert|watchdog|monitor|telem|health)/i, dispatcher: "prism_dev", confidence: 0.65, reason: "event/monitor keyword" },
  { pattern: /\b(post[-_]?proc|macro[-_]?compose|nc[-_]?script|gcode[-_]?compose)/i, dispatcher: "prism_cam", confidence: 0.78, reason: "post-processor compose keyword" },
  { pattern: /\b(mill|milling|drill|tap|bore|countersink|reamer|endmill|ballmill)/i, dispatcher: "prism_cam", confidence: 0.65, reason: "milling tool keyword (catch-all)" },
  { pattern: /\b(base|abstract[-_]?engine|core[-_]?engine|util|helper)/i, dispatcher: "prism_dev", confidence: 0.50, reason: "base/util keyword (low conf — review)" },
]);

// U-VIZ-G4-SEEDER-FIX (2026-05-20 sierra) → extracted to a shared SSOT lib in
// U-VIZ-G4-DEAD-EDGE (2026-05-30 sierra). The MCP-tool → disp-node-id mapping +
// resolver now live in ./lib/viz-dispatcher-node-id.mjs (imported above) so the
// other ghost/bridge producers resolve through ONE source of truth instead of
// re-introducing the `dispatcher.<mcp_tool>` dead-edge bug. Re-exported here for
// back-compat with existing importers + this seeder's own test. See that lib for
// the full dead-edge-class rationale.
export { MCP_TOOL_TO_DISP_NODE_ID, mcpToolToDispNodeId };

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

export function inferDispatcher(engineName, opts = {}) {
  if (typeof engineName !== "string" || engineName.length === 0) {
    return { dispatcher: "UNKNOWN", confidence: 0, reason: "empty/invalid name" };
  }
  const tokenized = splitCamelCase(engineName);
  const flat = engineName.toLowerCase();
  for (const rule of DISPATCHER_INFERENCE_RULES) {
    if (rule.pattern.test(tokenized) || rule.pattern.test(flat) || rule.pattern.test(engineName)) {
      return { dispatcher: rule.dispatcher, confidence: rule.confidence, reason: rule.reason };
    }
  }
  // Keyword inference exhausted → fall back to sibling-prefix inference when
  // a wired-engine map is supplied. This closes the UNKNOWN tail for engines
  // whose name has no domain keyword but whose prefix matches existing wired
  // engines (e.g. "AtomicWritesEngine" → siblings "AtomicMultiFileWriteEngine"
  // → already wired to prism_dev).
  if (opts.wiredMap) {
    const sib = inferDispatcherBySibling(engineName, opts.wiredMap);
    if (sib) return sib;
  }
  return { dispatcher: "UNKNOWN", confidence: 0, reason: "no keyword match + no sibling — manual review needed" };
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
export function buildGhostFromUnwired(engine, opts = {}) {
  const inf = inferDispatcher(engine.name, opts);
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
        to: mcpToolToDispNodeId(inf.dispatcher),
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

/**
 * finalizeGraphMeta -- stamp the graph's self-describing metadata to the ACTUAL
 * post-merge reality. generate-system-viz.mjs writes BOTH meta.totals AND the
 * top-level generatedAt at base-generation time, then merge-augmentations + the
 * post-merge stages (this script is the LAST graph writer in the regen pipeline)
 * rewrite the graph WITHOUT refreshing either field:
 *   - meta.totals stayed at the base ~60K (vs the merged ~355K) -- a ~5.8x node /
 *     ~4.5x edge undercount read by every consumer (`headline` query, spawned-
 *     agent-context-lib). (U-VIZ-META-TOTALS-FINALIZE, 2026-06-23.)
 *   - generatedAt stayed frozen at the base-gen date though the graph regenerates
 *     daily -- a misleading freshness signal in the headline + awareness-snapshot
 *     displays. Nothing keys on it for correctness (sidecars use sourceMtimeMs),
 *     so as the final writer we set it to the regen time. (U-VIZ-GENERATEDAT-
 *     FINALIZE, 2026-06-23.) R7: this is a deliberate semantic -- generatedAt now
 *     means "graph last (re)generated at", the natural reading for a continuously
 *     regenerated artifact.
 * Idempotent + cheap (counts already-in-memory arrays). `now` injectable for
 * deterministic tests. (Was refreshGraphTotals; renamed to cover both fields.)
 */
export function finalizeGraphMeta(g, { now = new Date().toISOString() } = {}) {
  if (!g || typeof g !== "object") return g;
  if (g.meta && typeof g.meta === "object") {
    g.meta.totals = {
      nodes: Array.isArray(g.nodes) ? g.nodes.length : 0,
      edges: Array.isArray(g.edges) ? g.edges.length : 0,
      layers: Array.isArray(g.layers) ? g.layers.length : (g.meta.totals?.layers ?? 0),
    };
  }
  g.generatedAt = now;
  return g;
}

export function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.revert) {
    const g = readGraphStreaming(GRAPH_PATH); // streaming read — see scripts/lib/graph-io.mjs
    const before = g.nodes.length;
    const ghostIds = new Set(g.nodes.filter((n) => n?.kind === "ghost.unwired-engine").map((n) => n.id));
    g.nodes = g.nodes.filter((n) => !ghostIds.has(n.id));
    g.edges = g.edges.filter((e) => !ghostIds.has(e.from));
    // Cap-safe per-element streaming write: the merged system-graph.json is >512MiB, so even a
    // compact JSON.stringify(g) throws V8's max-string-length cap (Cannot create a string longer
    // than 0x1fffffe8). writeGraphStreamingAtomic streams per-element + does its own atomic
    // tmp+rename. (Was JSON.stringify -- the stale "mirrors merge-augmentations" note predated
    // merge's own streaming migration.) U-VIZ-SEEDGHOST-CAPSAFE (sierra 2026-06-23).
    finalizeGraphMeta(g); // stamp accurate post-mutation totals + regen timestamp (U-VIZ-META-TOTALS-FINALIZE)
    writeGraphStreamingAtomic(GRAPH_PATH, g);
    console.log(`reverted — removed ${ghostIds.size} ghost.unwired-engine nodes; graph now ${g.nodes.length} nodes (was ${before})`);
    return;
  }

  const unwired = listUnwiredEngines(ENGINES_DIR, DISPATCHERS_DIR, { limit: opts.limit });
  console.log(`Found ${unwired.length} unwired engines`);

  // Build wired-engine→dispatcher map ONCE for sibling-inference fallback.
  const wiredMap = buildEngineDispatcherMap(DISPATCHERS_DIR);
  console.log(`Wired-engine map built — ${wiredMap.size} engines have known dispatcher refs`);

  const byConfidence = { high: 0, medium: 0, low: 0, none: 0 };
  const byDispatcher = {};
  const nodes = [];
  const edges = [];
  for (const e of unwired) {
    const { node, edge } = buildGhostFromUnwired(e, { wiredMap });
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
  // Cap-safe streaming read -- the merged graph is >512MiB, so JSON.parse(readFileSync(..,"utf8"))
  // throws V8's "Cannot create a string longer than 0x1fffffe8" (U-VIZ-SEEDGHOST-CAPSAFE, sierra
  // 2026-06-23). This was the regen `failed=1` that blocked the success-stamp: --dry-run reads via
  // readGraphStreaming (line ~254) so it passed, but --apply (the mode regen-viz runs) used the raw
  // string read here. Mirrors the sibling post-merge stages (repair/dedup/reparent).
  const g = readGraphStreaming(GRAPH_PATH);
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
  // Cap-safe per-element streaming write -- JSON.stringify(g) on the >512MiB graph throws the V8
  // string-cap (same class as the read above). writeGraphStreamingAtomic does its own atomic
  // tmp+rename, matching the sibling post-merge stages (U-VIZ-SEEDGHOST-CAPSAFE, sierra 2026-06-23).
  finalizeGraphMeta(g); // stamp accurate post-merge totals + regen timestamp (U-VIZ-META-TOTALS-FINALIZE)
  writeGraphStreamingAtomic(GRAPH_PATH, g);
  console.log(`DONE -- graph nodes=${g.nodes.length} edges=${g.edges.length} totals=${JSON.stringify(g.meta?.totals)} generatedAt=${g.generatedAt}`);
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
