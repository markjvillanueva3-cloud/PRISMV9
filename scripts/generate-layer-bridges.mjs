#!/usr/bin/env node
/**
 * generate-layer-bridges.mjs — fill the sparse upper-layer cascade.
 *
 * Before this generator the inter-layer edge density looked like:
 *   L0→L1   23   (personas → frontends)        ✓ dense
 *   L1→L2   25   (frontends → transports)      ✓ dense
 *   L2→L3    1   (transports → AI tiers)        ✗ stub
 *   L3→L4   14   (AI tiers → dispatchers)       ✗ partial
 *   L4→L5   43   (dispatchers → engine domains) ✗ way too sparse for 97 dispatchers
 *
 * The viz reads as a true cascade only when each upper layer projects
 * meaningfully into the next. This generator scrapes:
 *   1. Every dispatcher source for engine imports → emits L4→L5 edges
 *      (classified to eng.<domain> rollups so the count stays tractable).
 *   2. Heuristic AI-tier → dispatcher mapping by keyword → emits L3→L4 edges.
 *   3. Transport → AI-tier mapping (MCP fans out, telemetry observes,
 *      auth gates, rate-limit governs Ollama) → emits L2→L3 edges.
 *
 * All edges are deduped against the existing graph by merge-augmentations.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGraph } from "./lib/system-viz-graph.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const DISP_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
const ENGINE_DIR = path.join(ROOT, "mcp-server", "src", "engines");


function listDispatcherFiles() {
  if (!fs.existsSync(DISP_DIR)) return [];
  return fs.readdirSync(DISP_DIR)
    .filter(f => f.endsWith("Dispatcher.ts") && !f.endsWith(".test.ts"))
    .map(f => ({ name: f.replace(/\.ts$/, ""), path: path.join(DISP_DIR, f) }));
}

function listEngineNames() {
  if (!fs.existsSync(ENGINE_DIR)) return new Set();
  const out = new Set();
  for (const e of fs.readdirSync(ENGINE_DIR, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith(".ts")) continue;
    if (e.name.endsWith(".test.ts") || e.name.endsWith(".d.ts")) continue;
    out.add(e.name.replace(/\.ts$/, ""));
  }
  return out;
}

function loadDomainKeys(graph) {
  const rollups = graph.nodes.filter(n =>
    n.layer === "L5" && n.id.startsWith("eng.")
    && (!n.parent || !n.parent.startsWith("eng."))
  );
  const list = rollups.map(n => ({
    nodeId: n.id,
    key: (n.id.replace(/^eng\./, "") || "").toLowerCase(),
  })).filter(x => x.key.length > 0);
  list.sort((a, b) => b.key.length - a.key.length);
  return list;
}

function classifyEngine(engineName, domains) {
  const lower = engineName.toLowerCase();
  for (const { key, nodeId } of domains) {
    if (lower.startsWith(key)) return nodeId;
  }
  return "eng.other";
}

function dispatcherIdFromName(fileName) {
  // calcDispatcher → disp.calcdispatcher (graph uses lowercased no-suffix style)
  return "disp." + fileName.toLowerCase();
}

function scrapeEngineImports(text) {
  // Static imports:    from "../../engines/SomethingEngine.js"
  // Dynamic imports:   import("../../engines/SomethingEngine.js")
  const out = new Set();
  const re = /(?:from\s+["']|import\s*\(\s*["'])[^"']*\/engines\/([A-Za-z0-9_]+)(?:\.js)?["']/g;
  let m;
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return [...out];
}

// L3 AI-tier classifier: which dispatchers each tier orchestrates,
// based on naming convention. Patterns are ordered specific → general.
const TIER_DISPATCHER_RULES = [
  // Tier-3 specialists
  { tier: "ai.t3.mill",    match: /(^millDispatcher$|^calcDispatcher$|^cnc_opsDispatcher$|^thread.*Dispatcher$|^hole_patternDispatcher$|^machining_kbDispatcher$|^calibrationDispatcher$|adaptiveControlDispatcher)/i },
  { tier: "ai.t3.lathe",   match: /(turningDispatcher|turning_programDispatcher|threadingPipelineDispatcher|lathe)/i },
  { tier: "ai.t3.wedm",    match: /(edmDispatcher|wedm)/i },
  { tier: "ai.t3.cad",     match: /(cadDispatcher|cad_drawing|cadAutomation|cad_regression)/i },
  { tier: "ai.t3.cam",     match: /(camDispatcher|cam_function|toolpathDispatcher|multiaxis|secondary_ops|grindingDispatcher)/i },
  { tier: "ai.t3.safety",  match: /(safetyDispatcher|omegaDispatcher|guardDispatcher|validationDispatcher|complianceDispatcher|industryDispatcher)/i },
  { tier: "ai.t3.quality", match: /(qualityDispatcher|process_controlDispatcher)/i },
  // Tier-2 coordinator
  { tier: "ai.t2.coordinator", match: /(orchestrateDispatcher|atcsDispatcher|autonomousDispatcher|autoPilotDispatcher|automationDispatcher|schedulingDispatcher|monitoringDispatcher|hookDispatcher)/i },
  // Tier-1 master orchestrator (claude)
  { tier: "ai.t1.claude",  match: /(spDispatcher|aiDispatcher|aiReasoningDispatcher|intelligenceDispatcher|sessionDispatcher|contextDispatcher|gsdDispatcher|generatorDispatcher|nl_hookDispatcher|knowledgeDispatcher|memoryDispatcher|integrationDispatcher|ralphDispatcher)/i },
  // Ollama family
  { tier: "ai.ollama.qwen", match: /(devDispatcher|cad_drawing|cam_function)/i },
  { tier: "ai.ollama.embed", match: /(memoryDispatcher|knowledgeDispatcher|knowledge_extDispatcher|searchDispatcher|tenantDispatcher)/i },
];

function tiersForDispatcher(fileName) {
  const out = new Set();
  for (const { tier, match } of TIER_DISPATCHER_RULES) {
    if (match.test(fileName)) out.add(tier);
  }
  // Always: Tier-1 Claude has visibility into every dispatcher (orchestrator)
  out.add("ai.t1.claude");
  return [...out];
}

function generate() {
  const graph = loadGraph();
  const nodeIds = new Set(graph.nodes.map(n => n.id));
  const domains = loadDomainKeys(graph);
  const engineNames = listEngineNames();
  const dispatchers = listDispatcherFiles();

  const stats = {
    dispatcherFiles: dispatchers.length,
    enginesScanned: 0,
    enginesUnclassified: 0,
    l4_to_l5_edges: 0,
    l3_to_l4_edges: 0,
    l2_to_l3_edges: 0,
    skipped_missing_node: 0,
    skipped_unknown_engine: 0,
  };

  const edges = [];
  const seen = new Set(); // dedup within this run

  function pushEdge(from, to, type, intensity = 0.4) {
    const k = `${from}|${to}|${type}`;
    if (seen.has(k)) return;
    seen.add(k);
    if (!nodeIds.has(from) || !nodeIds.has(to)) {
      stats.skipped_missing_node++;
      return;
    }
    edges.push({ from, to, type, status: "active", intensity });
    return true;
  }

  // ===== 1. L4 → L5: every dispatcher → every engine-domain it imports =====
  for (const d of dispatchers) {
    const dispId = dispatcherIdFromName(d.name);
    if (!nodeIds.has(dispId)) {
      stats.skipped_missing_node++;
      continue;
    }
    let text = "";
    try { text = fs.readFileSync(d.path, "utf8"); } catch { continue; }
    const imported = scrapeEngineImports(text);
    const domainHits = new Set();
    for (const eng of imported) {
      stats.enginesScanned++;
      if (!engineNames.has(eng)) {
        stats.skipped_unknown_engine++;
        continue;
      }
      const domNode = classifyEngine(eng, domains);
      if (!domNode) { stats.enginesUnclassified++; continue; }
      domainHits.add(domNode);
    }
    for (const dom of domainHits) {
      if (pushEdge(dispId, dom, "lazy_import", 0.5)) {
        stats.l4_to_l5_edges++;
      }
    }
  }

  // ===== 2. L3 → L4: AI tiers → dispatchers by keyword =====
  for (const d of dispatchers) {
    const dispId = dispatcherIdFromName(d.name);
    if (!nodeIds.has(dispId)) continue;
    const tiers = tiersForDispatcher(d.name);
    for (const t of tiers) {
      if (pushEdge(t, dispId, "route", 0.35)) {
        stats.l3_to_l4_edges++;
      }
    }
  }

  // ===== 3. L2 → L3: transports → AI tiers =====
  // Every L3 node is reachable through MCP and observed by telemetry.
  // Auth specifically gates the orchestrator. Rate-limit governs Ollama bursts.
  // WebSocket pushes Tier-1 streaming output.
  const t3List = graph.nodes.filter(n => n.layer === "L3").map(n => n.id);
  for (const t of t3List) {
    pushEdge("tr.mcp",  t, "intent", 0.4)   && stats.l2_to_l3_edges++;
    pushEdge("tr.tele", t, "observe", 0.25) && stats.l2_to_l3_edges++;
  }
  pushEdge("tr.auth", "ai.t1.claude", "gate", 0.35) && stats.l2_to_l3_edges++;
  pushEdge("tr.auth", "ai.t2.coordinator", "gate", 0.3) && stats.l2_to_l3_edges++;
  pushEdge("tr.ws", "ai.t1.claude", "stream", 0.35) && stats.l2_to_l3_edges++;
  for (const t of t3List) {
    if (t.startsWith("ai.ollama.")) {
      pushEdge("tr.rate", t, "rate_limit", 0.35) && stats.l2_to_l3_edges++;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    edges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "layer-bridges-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
console.log(`  dispatcher files scanned: ${result.stats.dispatcherFiles}`);
console.log(`  engine imports inspected: ${result.stats.enginesScanned}`);
console.log(`  unknown engines:          ${result.stats.skipped_unknown_engine}`);
console.log(`  L4→L5 edges:              ${result.stats.l4_to_l5_edges}`);
console.log(`  L3→L4 edges:              ${result.stats.l3_to_l4_edges}`);
console.log(`  L2→L3 edges:              ${result.stats.l2_to_l3_edges}`);
console.log(`  skipped missing-node:     ${result.stats.skipped_missing_node}`);
console.log(`  total edges in this aug:  ${result.edges.length}`);
