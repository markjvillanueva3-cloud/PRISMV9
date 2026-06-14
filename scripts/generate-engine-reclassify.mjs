#!/usr/bin/env node
/**
 * generate-engine-reclassify.mjs — rebucket the ~2.1K engines stuck in
 * eng.other into their real domains using a multi-signal classifier.
 *
 * MUST run AFTER:
 *   - generate-engine-saturate.mjs      (emits eng.<dom>.<name>)
 *   - generate-action-engine-edges.mjs  (emits disp.X.action.Y → eng.dom.name)
 *
 * Signal priority (strongest first):
 *   1. Dispatcher invocation (action-engine edges) — runtime-truth: if X is
 *      invoked by Y dispatchers, it lives in the most popular Y's domain.
 *   2. Filename token match against a science-curated keyword dictionary.
 *   3. Stay in eng.other (clean unknown beats mis-classification).
 *
 * Output: mutates engine-saturate-augmentation.json IN PLACE (rewrites the
 * parent + domain fields, adds reclassifyReason metadata).
 *
 * Also emits engine-reclassify-augmentation.json with stats + remap log for
 * audit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const ENG_SAT = path.join(VIZ_DIR, "engine-saturate-augmentation.json");
const ACT_ENG = path.join(VIZ_DIR, "action-engine-edges-augmentation.json");

// Cap on number of sample remap entries to log (audit trail only)
const SAMPLE_LOG_CAP = 30;

// ─── Keyword dictionary (science-curated, domain-by-domain) ───────────────
// Tokens are lowercase; we match them as substrings of the lowercased engine
// stem. Order matters: more-specific tokens checked first.
const KEYWORDS = [
  // Manufacturing process domains
  ["wedm",        ["wedm", "edm", "wire", "electrode", "dielectric", "diecut", "wirecut"]],
  ["lathe",       ["lathe", "chuck", "barfeed", "subspindle", "livetool", "tailstock"]],
  ["turning",     ["turning", "facing", "boring", "threading", "knurl"]],
  ["milling",     ["milling", "vmc", "hmc", "5x", "ball-end"]],
  ["mill",        ["mill", "drilling", "tapping", "reaming", "endmill"]],
  ["five",        ["fiveaxis", "5axis", "swarf", "fivesided", "multiaxis"]],
  ["cam",         ["toolpath", "gcode", "ncprogram", "postprocessor", "ncpost", "cuttercomp", "leadin", "leadout"]],
  ["cad",         ["sketch", "sweep", "loft", "extrude", "revolve", "fillet", "chamfer", "feature", "draft", "shell"]],
  ["fusion",      ["fusion", "fusion360"]],
  ["hyper",       ["hypermill", "hypercad"]],
  ["mastercam",   ["mastercam"]],
  ["inventor",    ["inventor", "hsm"]],
  ["solidworks",  ["solidworks", "sldprt"]],

  // Physics & engineering
  ["physics",     ["kienzle", "taylor", "stiffness", "deflection", "modal", "vibration", "harmonic", "fea", "stress", "strain", "fatigue", "thermal", "convective", "conductive"]],
  ["force",       ["force", "torque", "moment", "spindleload"]],
  ["chatter",     ["chatter", "stability", "lobe", "regen"]],

  // AI / ML / reasoning
  ["adaptive",    ["adaptive", "conformal", "online", "kalman", "lqr", "pid", "bayes", "ekf", "ukf"]],
  ["ai",          ["neural", "reasoning", "llm", "ollama", "claude", "gemini", "codex", "agentic", "swarm", "rag", "embed", "vector", "transformer", "attention"]],
  ["ml",          ["regression", "gradient", "boost", "forest", "kmeans", "knn", "svm", "pca"]],
  ["xproc",       ["xproc", "crossproc", "outcome"]],
  ["intelligence",["intelligence", "cognition", "inference", "metareasoning"]],

  // Safety & quality
  ["safety",      ["safety", "collision", "interfere", "hazard", "danger", "violation"]],
  ["quality",     ["quality", "inspection", "metrology", "cmm", "gauge", "spc"]],
  ["tolerance",   ["tolerance", "gdt", "datum", "feature_control"]],

  // Materials / tools / machines
  ["material",    ["material", "alloy", "steel", "aluminum", "titanium", "carbide", "inconel", "hardness", "isotype"]],
  ["coating",     ["coating", "tialn", "pvd", "altin"]],
  ["coolant",     ["coolant", "lubricant", "mql", "floodcool"]],
  ["tool",        ["insert", "fluteform", "holder", "runout", "balancegrade", "extension"]],
  ["machine",     ["spindle", "controller", "fanuc", "haas", "mazak", "okuma", "makino", "doosan", "dmg", "hurco"]],
  ["fixture",     ["fixture", "vise", "clamp", "workholding", "soft_jaw"]],
  ["sensor",      ["sensor", "telemetry", "mqtt", "opcua", "dnc", "iiot", "acoustic"]],

  // Operations / business
  ["shop",        ["shop", "factory", "plant", "fleet", "operator"]],
  ["quote",       ["quote", "estimate", "pricing", "rfq"]],
  ["scheduling",  ["schedule", "dispatch", "queue", "wip"]],
  ["erp",         ["erp", "inventory", "purchase", "po_", "vendor"]],
  ["cnc",         ["cnc", "fanucpost", "haaspost"]],

  // Knowledge / docs
  ["knowledge",   ["wiki", "tribal", "lecture", "citation", "manual", "handbook", "mitcourse"]],
  ["print",       ["print", "blueprint", "drawing", "title_block", "viewport"]],
  ["pdf",         ["pdf", "ocr", "page"]],
  ["video",       ["video", "youtube", "frame"]],

  // Session / memory / system
  ["session",     ["session", "context", "handoff", "compact"]],
  ["memory",      ["memory", "recall", "episodic", "semantic", "vault", "qdrant", "chroma"]],
  ["registry",    ["registry"]],
  ["dedup",       ["dedup", "duplication", "deduplicate"]],
  ["audit",       ["audit", "trace", "lineage"]],
  ["guard",       ["guard", "gate", "enforce", "block"]],
  ["dispatcher",  ["dispatcher", "router", "route"]],
  ["bridge",      ["bridge", "adapter", "shim"]],
  ["observability",["telemetry_", "metrics", "observability", "tracing"]],

  // Geometry / kinematic / motion
  ["kinematic",   ["kinematic", "trajectory", "motion", "jerk", "scurve", "acceleration"]],
  ["nurbs",       ["nurbs", "spline", "bezier", "bspline"]],
  ["mesh",        ["mesh", "stl", "voxel", "octree"]],
  ["geometry",    ["geometry", "boolean", "topology", "csg", "brep"]],
];
// Match longest-keyword wins
KEYWORDS.forEach(([dom, kws]) => kws.sort((a, b) => b.length - a.length));

// ─── Helpers ──────────────────────────────────────────────────────────────
function dispatcherToDomain(dispNodeId) {
  // disp.adaptivecontroldispatcher → "adaptive"  (strip "control" + "dispatcher")
  // disp.aiReasoningDispatcher    → "ai"
  // disp.camDispatcher            → "cam"
  const stem = dispNodeId.replace(/^disp\./, "").toLowerCase()
    .replace(/dispatcher$/, "")
    .replace(/_/g, "");
  if (!stem) return null;
  // Token: prefer exact match against the keyword domain list, else first token
  for (const [dom] of KEYWORDS) {
    if (stem.startsWith(dom)) return dom;
  }
  // Heuristic: drop suffixes like "control", "system", "tier"
  const stripped = stem.replace(/(control|system|tier|ops|service)$/, "");
  for (const [dom] of KEYWORDS) {
    if (stripped.startsWith(dom)) return dom;
  }
  return stripped || stem;
}

function classifyByTokens(stem) {
  const low = stem.toLowerCase();
  for (const [dom, kws] of KEYWORDS) {
    for (const k of kws) {
      if (low.includes(k)) return { domain: dom, matched: k };
    }
  }
  return null;
}

function generate() {
  if (!fs.existsSync(ENG_SAT)) return { error: "engine-saturate-missing", stats: {} };
  if (!fs.existsSync(ACT_ENG)) return { error: "action-engine-edges-missing", stats: {} };

  const engSat = JSON.parse(fs.readFileSync(ENG_SAT, "utf8"));
  const actEng = JSON.parse(fs.readFileSync(ACT_ENG, "utf8"));

  // Build engine-id → invoker[] map from action-engine edges
  const invokers = new Map();   // eng.X.name → Set<dispNodeId>
  for (const e of actEng.newEdges || []) {
    if (e.type !== "invokes") continue;
    if (!e.to.startsWith("eng.")) continue;
    const dispId = e.from.split(".action.")[0];  // disp.X.action.Y → disp.X
    if (!invokers.has(e.to)) invokers.set(e.to, new Map());
    const m = invokers.get(e.to);
    m.set(dispId, (m.get(dispId) || 0) + 1);
  }

  const stats = {
    enginesScanned: 0,
    inOtherBefore: 0,
    remappedByDispatcher: 0,
    remappedByKeyword: 0,
    stillInOther: 0,
    perDomainAfter: {},
    perDomainBefore: {},
    examples: [],  // sample remappings
  };

  const remapLog = [];

  for (const n of engSat.newNodes || []) {
    stats.enginesScanned++;
    const beforeDom = n.domain || (n.parent || "").replace(/^eng\./, "") || "unknown";
    stats.perDomainBefore[beforeDom] = (stats.perDomainBefore[beforeDom] || 0) + 1;
    if (beforeDom !== "other") {
      stats.perDomainAfter[beforeDom] = (stats.perDomainAfter[beforeDom] || 0) + 1;
      continue;
    }
    stats.inOtherBefore++;

    // Build the eng-id this engine was assigned (eng.other.<name>)
    const engId = n.id;
    let newDom = null;
    let reason = null;

    // Signal 1: dispatcher invocation
    const inv = invokers.get(engId);
    if (inv && inv.size > 0) {
      // Pick the dispatcher with the most invocations
      const ranked = [...inv.entries()].sort((a, b) => b[1] - a[1]);
      const topDispId = ranked[0][0];
      const dom = dispatcherToDomain(topDispId);
      if (dom && dom !== "other" && dom !== "dispatcher") {
        newDom = dom;
        reason = `dispatcher:${topDispId.replace(/^disp\./, "")}`;
        stats.remappedByDispatcher++;
      }
    }

    // Signal 2: keyword tokens
    if (!newDom) {
      const stem = n.label || engId.split(".").pop();
      const m = classifyByTokens(stem);
      if (m) {
        newDom = m.domain;
        reason = `keyword:${m.matched}`;
        stats.remappedByKeyword++;
      }
    }

    if (!newDom) {
      stats.stillInOther++;
      stats.perDomainAfter.other = (stats.perDomainAfter.other || 0) + 1;
      continue;
    }

    // Apply remap to the node in-place
    const oldId = n.id;
    const oldParent = n.parent;
    const stem = oldId.split(".").pop();
    n.id = `eng.${newDom}.${stem}`;
    n.parent = `eng.${newDom}`;
    n.domain = newDom;
    n.reclassifiedFrom = oldParent;
    n.reclassifyReason = reason;
    stats.perDomainAfter[newDom] = (stats.perDomainAfter[newDom] || 0) + 1;

    if (remapLog.length < SAMPLE_LOG_CAP) remapLog.push({ from: oldId, to: n.id, reason });
  }

  stats.examples = remapLog;

  // Also patch any contains edges in engine-saturate that referenced the old
  // eng.other.X parent for these nodes.
  let edgesPatched = 0;
  const idRemap = new Map();
  for (const n of engSat.newNodes || []) {
    if (n.reclassifyReason) {
      const stem = n.id.split(".").pop();
      idRemap.set(`eng.other.${stem}`, n.id);
    }
  }
  for (const e of engSat.newEdges || []) {
    if (idRemap.has(e.to))   { e.to   = idRemap.get(e.to);   edgesPatched++; }
    if (idRemap.has(e.from)) { e.from = idRemap.get(e.from); edgesPatched++; }
    // Old parent linkage: eng.other → eng.other.X. Drop old parent so contains
    // is regenerated via new parent.
    const parts = e.from.split(".");
    if (e.type === "contains" && parts.length === 2 && parts[0] === "eng" && parts[1] === "other") {
      const child = idRemap.get(e.to);
      if (child) {
        const newParent = child.split(".").slice(0, 2).join(".");
        e.from = newParent;
        edgesPatched++;
      }
    }
  }
  stats.edgesPatched = edgesPatched;

  // Patch action-engine edges to point at new ids
  let actEdgesPatched = 0;
  for (const e of actEng.newEdges || []) {
    if (idRemap.has(e.to)) { e.to = idRemap.get(e.to); actEdgesPatched++; }
  }
  stats.actionEngineEdgesPatched = actEdgesPatched;

  // Synthesize missing parent rollups for any new domain the reclassifier
  // created. Without this, ~30 domains have orphan children at merge time.
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingRollups = new Set();
  for (const n of graph.nodes) {
    if (n.layer === "L5" && n.id?.startsWith("eng.") && n.id.split(".").length === 2) {
      existingRollups.add(n.id);
    }
  }
  const existingInAug = new Set((engSat.newNodes || []).map(n => n.id));
  const childCountByDomain = {};
  for (const n of engSat.newNodes || []) {
    if (!n.parent?.startsWith("eng.")) continue;
    childCountByDomain[n.parent] = (childCountByDomain[n.parent] || 0) + 1;
  }
  let parentsAdded = 0;
  for (const [parentId, cnt] of Object.entries(childCountByDomain)) {
    if (existingRollups.has(parentId) || existingInAug.has(parentId)) continue;
    const dom = parentId.replace(/^eng\./, "");
    engSat.newNodes.push({
      id: parentId,
      layer: "L5",
      subgroup: "rollup",
      label: `${dom}\n(${cnt} engines)`,
      status: "built",
      color: "#22c55e",
      size: 0.7 + Math.sqrt(cnt) * 0.10,
      tier: 1,
      synthetic: true,
      reclassifySynthesized: true,
    });
    parentsAdded++;
  }
  stats.parentsAdded = parentsAdded;
  fs.writeFileSync(ENG_SAT, JSON.stringify(engSat));

  // Write back both augmentations
  fs.writeFileSync(ENG_SAT, JSON.stringify(engSat));
  fs.writeFileSync(ACT_ENG, JSON.stringify(actEng));

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    stats,
    remapLog,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "engine-reclassify-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`wrote ${outPath}`);
if (result.error) {
  console.log(`  error: ${result.error}`);
} else {
  const s = result.stats;
  console.log(`  engines scanned:             ${s.enginesScanned}`);
  console.log(`  in eng.other before:         ${s.inOtherBefore}`);
  console.log(`  remapped by dispatcher:      ${s.remappedByDispatcher}`);
  console.log(`  remapped by keyword:         ${s.remappedByKeyword}`);
  console.log(`  still in other:              ${s.stillInOther}`);
  console.log(`  edges patched (engine-sat):  ${s.edgesPatched}`);
  console.log(`  edges patched (act-eng):     ${s.actionEngineEdgesPatched}`);
  console.log(`  ── top 12 domains AFTER ──`);
  for (const [d, n] of Object.entries(s.perDomainAfter).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`    ${d.padEnd(18)} ${n}`);
  }
}
