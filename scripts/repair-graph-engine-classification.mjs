#!/usr/bin/env node
/**
 * repair-graph-engine-classification.mjs — one-shot mutator that rewrites
 * eng.other.X nodes in system-graph.json to their correct domains using
 * action-engine edges + keyword tokens, then patches every edge that
 * references the old ids and synthesizes any missing parent rollups.
 *
 * This complements generate-engine-reclassify.mjs (which only fixes future
 * augmentations). Run this once to repair existing graph state; subsequent
 * regen-viz cycles preserve the corrected parentage because:
 *   1. engine-saturate sees the corrected ids in graph.nodes → skips
 *   2. reclassify still runs on the augmentation for newly-added engines
 *
 * Reads: system-graph.json
 * Writes: system-graph.json (in place), engine-classification-repair-log.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming, writeGraphStreamingAtomic } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const LOG_OUT = path.join(VIZ_DIR, "engine-classification-repair-log.json");

const SAMPLE_LOG_CAP = 30;
const ATOMIC_DEPTH = 3;

// Reuse the same keyword dictionary as generate-engine-reclassify.mjs
const KEYWORDS = [
  ["wedm",         ["wedm", "edm", "wire", "electrode", "dielectric", "diecut", "wirecut"]],
  ["lathe",        ["lathe", "chuck", "barfeed", "subspindle", "livetool", "tailstock"]],
  ["turning",      ["turning", "facing", "boring", "threading", "knurl"]],
  ["milling",      ["milling", "vmc", "hmc", "ball-end"]],
  ["mill",         ["mill", "drilling", "tapping", "reaming", "endmill"]],
  ["five",         ["fiveaxis", "5axis", "swarf", "fivesided", "multiaxis"]],
  ["cam",          ["toolpath", "gcode", "ncprogram", "postprocessor", "ncpost", "cuttercomp", "leadin", "leadout"]],
  ["cad",          ["sketch", "sweep", "loft", "extrude", "revolve", "fillet", "chamfer", "feature", "draft", "shell"]],
  ["fusion",       ["fusion", "fusion360"]],
  ["hyper",        ["hypermill", "hypercad"]],
  ["mastercam",    ["mastercam"]],
  ["inventor",     ["inventor", "hsm"]],
  ["solidworks",   ["solidworks", "sldprt"]],
  ["physics",      ["kienzle", "taylor", "stiffness", "deflection", "modal", "vibration", "harmonic", "fea", "stress", "strain", "fatigue", "thermal", "convective", "conductive"]],
  ["force",        ["force", "torque", "moment", "spindleload"]],
  ["chatter",      ["chatter", "stability", "lobe", "regen"]],
  ["adaptive",     ["adaptive", "conformal", "online", "kalman", "lqr", "pid", "bayes", "ekf", "ukf"]],
  ["ai",           ["neural", "reasoning", "llm", "ollama", "claude", "gemini", "codex", "agentic", "swarm", "rag", "embed", "vector", "transformer", "attention"]],
  ["ml",           ["regression", "gradient", "boost", "forest", "kmeans", "knn", "svm", "pca"]],
  ["xproc",        ["xproc", "crossproc", "outcome"]],
  ["intelligence", ["intelligence", "cognition", "inference", "metareasoning"]],
  ["safety",       ["safety", "collision", "interfere", "hazard", "danger", "violation"]],
  ["quality",      ["quality", "inspection", "metrology", "cmm", "gauge", "spc"]],
  ["tolerance",    ["tolerance", "gdt", "datum", "feature_control"]],
  ["material",     ["material", "alloy", "steel", "aluminum", "titanium", "carbide", "inconel", "hardness", "isotype"]],
  ["coating",      ["coating", "tialn", "pvd", "altin"]],
  ["coolant",      ["coolant", "lubricant", "mql", "floodcool"]],
  ["tool",         ["insert", "fluteform", "holder", "runout", "balancegrade", "extension"]],
  ["machine",      ["spindle", "controller", "fanuc", "haas", "mazak", "okuma", "makino", "doosan", "dmg", "hurco"]],
  ["fixture",      ["fixture", "vise", "clamp", "workholding", "soft_jaw"]],
  ["sensor",       ["sensor", "telemetry", "mqtt", "opcua", "dnc", "iiot", "acoustic"]],
  ["shop",         ["shop", "factory", "plant", "fleet", "operator"]],
  ["quote",        ["quote", "estimate", "pricing", "rfq"]],
  ["scheduling",   ["schedule", "dispatch", "queue", "wip"]],
  ["erp",          ["erp", "inventory", "purchase", "po_", "vendor"]],
  ["cnc",          ["cnc", "fanucpost", "haaspost"]],
  ["knowledge",    ["wiki", "tribal", "lecture", "citation", "manual", "handbook", "mitcourse"]],
  ["print",        ["print", "blueprint", "drawing", "title_block", "viewport"]],
  ["pdf",          ["pdf", "ocr", "page"]],
  ["video",        ["video", "youtube", "frame"]],
  ["session",      ["session", "context", "handoff", "compact"]],
  ["memory",       ["memory", "recall", "episodic", "semantic", "vault", "qdrant", "chroma"]],
  ["registry",     ["registry"]],
  ["dedup",        ["dedup", "duplication", "deduplicate"]],
  ["audit",        ["audit", "trace", "lineage"]],
  ["guard",        ["guard", "gate", "enforce", "block"]],
  ["bridge",       ["bridge", "adapter", "shim"]],
  ["observability",["telemetry_", "metrics", "observability", "tracing"]],
  ["kinematic",    ["kinematic", "trajectory", "motion", "jerk", "scurve", "acceleration"]],
  ["nurbs",        ["nurbs", "spline", "bezier", "bspline"]],
  ["mesh",         ["mesh", "stl", "voxel", "octree"]],
  ["geometry",     ["geometry", "boolean", "topology", "csg", "brep"]],
];
KEYWORDS.forEach(([, kws]) => kws.sort((a, b) => b.length - a.length));

function dispatcherToDomain(dispNodeId) {
  const stem = dispNodeId.replace(/^disp\./, "").toLowerCase()
    .replace(/dispatcher$/, "")
    .replace(/_/g, "");
  if (!stem) return null;
  for (const [dom] of KEYWORDS) {
    if (stem.startsWith(dom)) return dom;
  }
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

function repair() {
  if (!fs.existsSync(GRAPH)) throw new Error("graph missing: " + GRAPH);
  const t0 = Date.now();
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));

  // Index nodes for O(1) lookup
  const byId = new Map();
  for (const n of graph.nodes) byId.set(n.id, n);

  // Build engine-id → invokers map from existing graph edges
  const invokers = new Map();
  for (const e of graph.edges) {
    if (e.type !== "invokes") continue;
    if (!e.to.startsWith("eng.")) continue;
    const dispId = e.from.includes(".action.") ? e.from.split(".action.")[0] : e.from;
    if (!invokers.has(e.to)) invokers.set(e.to, new Map());
    const m = invokers.get(e.to);
    m.set(dispId, (m.get(dispId) || 0) + 1);
  }

  const idRemap = new Map();
  const stats = {
    candidatesScanned: 0,
    remappedByDispatcher: 0,
    remappedByKeyword: 0,
    stillInOther: 0,
    edgesPatched: 0,
    parentsAdded: 0,
    perDomainAfter: {},
    examples: [],
  };

  // Pass 1: identify all eng.other.X candidates and compute new domains
  for (const n of graph.nodes) {
    if (n.layer !== "L5") continue;
    if (!n.id?.startsWith("eng.other.")) continue;
    if (n.id.split(".").length !== ATOMIC_DEPTH) continue;
    stats.candidatesScanned++;

    let newDom = null;
    let reason = null;
    const inv = invokers.get(n.id);
    if (inv && inv.size > 0) {
      const ranked = [...inv.entries()].sort((a, b) => b[1] - a[1]);
      const dom = dispatcherToDomain(ranked[0][0]);
      if (dom && dom !== "other" && dom !== "dispatcher") {
        newDom = dom;
        reason = `dispatcher:${ranked[0][0].replace(/^disp\./, "")}`;
        stats.remappedByDispatcher++;
      }
    }
    if (!newDom) {
      const stem = n.label || n.id.split(".").pop();
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
    const stem = n.id.split(".").pop();
    const newId = `eng.${newDom}.${stem}`;
    idRemap.set(n.id, newId);
    stats.perDomainAfter[newDom] = (stats.perDomainAfter[newDom] || 0) + 1;
    if (stats.examples.length < SAMPLE_LOG_CAP) {
      stats.examples.push({ from: n.id, to: newId, reason });
    }
    // Mutate node
    n.id = newId;
    n.parent = `eng.${newDom}`;
    n.domain = newDom;
    n.reclassifiedFrom = "eng.other";
    n.reclassifyReason = reason;
  }

  // Rebuild byId after mutations
  byId.clear();
  for (const n of graph.nodes) byId.set(n.id, n);

  // Pass 2: synthesize missing rollup parents
  const childCount = {};
  for (const n of graph.nodes) {
    if (n.layer !== "L5") continue;
    if (n.parent?.startsWith("eng.")) childCount[n.parent] = (childCount[n.parent] || 0) + 1;
  }
  for (const [parentId, cnt] of Object.entries(childCount)) {
    if (byId.has(parentId)) continue;
    const dom = parentId.replace(/^eng\./, "");
    const rollup = {
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
    };
    graph.nodes.push(rollup);
    byId.set(parentId, rollup);
    stats.parentsAdded++;
  }

  // Pass 3: patch edges
  for (const e of graph.edges) {
    if (idRemap.has(e.from)) { e.from = idRemap.get(e.from); stats.edgesPatched++; }
    if (idRemap.has(e.to))   { e.to   = idRemap.get(e.to);   stats.edgesPatched++; }
  }
  // Re-emit contains edges for newly-remapped children whose parent → child
  // edge previously pointed to eng.other (now stale or pointing wrong)
  const seenContainsKey = new Set();
  for (const e of graph.edges) {
    if (e.type === "contains") seenContainsKey.add(`${e.from}|${e.to}`);
  }
  for (const [, newId] of idRemap) {
    const node = byId.get(newId);
    if (!node?.parent) continue;
    const key = `${node.parent}|${newId}`;
    if (seenContainsKey.has(key)) continue;
    graph.edges.push({
      from: node.parent,
      to: newId,
      type: "contains",
      status: "active",
      intensity: 0.18,
    });
    seenContainsKey.add(key);
  }

  // Update labels on rebucketed rollups (eng.other count drops; others rise)
  for (const [parentId, cnt] of Object.entries(childCount)) {
    const p = byId.get(parentId);
    if (!p) continue;
    if (p.subgroup === "rollup" || /^eng\.[a-z]+$/.test(parentId)) {
      const dom = parentId.replace(/^eng\./, "");
      p.label = `${dom}\n(${cnt} engines)`;
    }
  }

  // Refresh top-level counts in meta if present
  if (graph.meta?.counts && typeof graph.meta.counts === "object") {
    // keep meta.counts.engines = sum of children for sanity
    let total = 0;
    for (const cnt of Object.values(childCount)) total += cnt;
    if (graph.meta.counts.engines && Math.abs(graph.meta.counts.engines - total) < 100) {
      graph.meta.counts.engines = total;
    }
  }
  graph.engineReclassifyRepairedAt = new Date().toISOString();

  writeGraphStreamingAtomic(GRAPH, graph);  // per-element+atomic: JSON.stringify(graph) throws Invalid-string-length at >512MiB (U-VIZ-POSTMERGE-CAPSAFE 2026-06-10)
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  return { stats, elapsed };
}

const result = repair();
fs.writeFileSync(LOG_OUT, JSON.stringify(result, null, 2));
console.log(`repaired in ${result.elapsed}s`);
console.log(`  candidates scanned:    ${result.stats.candidatesScanned}`);
console.log(`  remapped by dispatcher:${result.stats.remappedByDispatcher}`);
console.log(`  remapped by keyword:   ${result.stats.remappedByKeyword}`);
console.log(`  still in eng.other:    ${result.stats.stillInOther}`);
console.log(`  edges patched:         ${result.stats.edgesPatched}`);
console.log(`  parents added:         ${result.stats.parentsAdded}`);
console.log(`  ── top 14 domains AFTER ──`);
for (const [d, n] of Object.entries(result.stats.perDomainAfter).sort((a, b) => b[1] - a[1]).slice(0, 14)) {
  console.log(`    eng.${d.padEnd(16)} ${n}`);
}
