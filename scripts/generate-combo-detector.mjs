#!/usr/bin/env node
/**
 * generate-combo-detector.mjs — find high-convergence targets in the system
 * graph and propose ghost L8 "combo synthesizer" nodes that represent the
 * variability-auto-adjusted formula needed to combine multiple inputs into
 * a single coherent output.
 *
 * Three classes of ghost combo node are emitted:
 *
 *   1. combo.<target_id>            — emitted when a node has ≥CONVERGE_MIN
 *      distinct non-hierarchy sources spanning ≥2 layers and ≥2 edge types.
 *      The combo proposes a CONFIDENCE-WEIGHTED FUSION formula:
 *
 *          y = Σ w_i * f_i(x_i)   where w_i = softmax(c_i / T)
 *
 *      c_i = per-source confidence (defaults to source's `intensity`),
 *      T = temperature (variability dial), f_i = source-specific transform.
 *
 *   2. formula.adjusted.<domain>    — for engine domains with ≥DOMAIN_MIN
 *      atomic engines but no obvious aggregator/router/master. Proposes a
 *      NOVEL N-ENGINE FUSION FORMULA:
 *
 *          y = (Σ a_k * φ_k(x_k)) / (Σ a_k)   with a_k = 1/var_k(x_k)
 *
 *      Inverse-variance weighting (Kalman-style) when engines disagree.
 *
 *   3. formula.adjusted.<dispatcher> — for dispatchers with ≥DISP_FUSION_MIN
 *      L5 engines routed through them. Proposes a HIERARCHICAL ROUTER
 *      formula:
 *
 *          route(x) = argmax_k P(engine_k | context) * acc_k
 *
 *      Bayesian engine-selection by context fit × per-engine accuracy.
 *
 * Each ghost combo node carries:
 *   - kind: "combo" | "formula_adjusted" | "novel_formula"
 *   - formula: human-readable expression
 *   - inputs:  array of source ids it consumes
 *   - target:  the convergence point (real node)
 *   - confidence: ratio of real wired sources : suggested ones (proxy for
 *                 how realistic the combo is right now)
 *   - status:  "ghost" so the ghost-mode UI lights it up
 *
 * Output: state/shared/system-viz/combo-detector-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGraph } from "./lib/system-viz-graph.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");

// Tuning constants
const CONVERGE_MIN = 3;       // distinct sources to qualify a target as a convergence point
const DISP_FUSION_MIN = 6;    // engines routed through a dispatcher to qualify it for fusion
const DOMAIN_MIN = 3;         // engines in a domain to qualify it for novel-formula coverage
const TOP_TARGETS = 120;      // cap on combo nodes emitted (graph-size discipline)
const HIER_EDGE_TYPES = new Set(["contains", "fs"]);  // pure containment — not signal flow
const AGGREGATOR_REGEX = /aggregat|orchestrat|master|fusion|router|bridge|coordinator|consensus|gateway/i;
const FILE_LAYERS = new Set(["L9", "L10", "L11"]);


function classifyKind(node) {
  if (!node) return "unknown";
  if (node.id?.startsWith("eng.") && node.id.split(".").length >= 3) return "engine";
  if (node.id?.startsWith("eng.")) return "engine_domain";
  if (node.id?.startsWith("disp.")) return "dispatcher";
  if (node.id?.startsWith("formula.")) return "formula";
  if (node.id?.startsWith("alg.")) return "algorithm";
  if (node.id?.startsWith("reg.")) return "registry";
  if (node.id?.startsWith("core.")) return "core";
  if (node.id?.startsWith("tr.")) return "transport";
  if (node.id?.startsWith("fe.")) return "frontend";
  if (node.layer === "L8") return "knowledge_or_state";
  return node.layer ?? "other";
}

function generate() {
  const graph = loadGraph();
  const byId = new Map(graph.nodes.map(n => [n.id, n]));
  const existingIds = new Set(byId.keys());

  // 1. Build non-hierarchy in-degree
  const realIn = new Map();   // targetId -> [{from, type, status, intensity}]
  for (const e of graph.edges) {
    if (HIER_EDGE_TYPES.has(e.type)) continue;
    if (!e.from || !e.to) continue;
    if (!realIn.has(e.to)) realIn.set(e.to, []);
    realIn.get(e.to).push(e);
  }

  // 2. Convergence targets (excluding filesystem clutter)
  const candidates = [];
  for (const [tid, edges] of realIn.entries()) {
    const t = byId.get(tid);
    if (!t) continue;
    if (FILE_LAYERS.has(t.layer)) continue;
    const sources = new Set(edges.map(e => e.from));
    if (sources.size < CONVERGE_MIN) continue;
    const types = new Set(edges.map(e => e.type));
    const srcLayers = new Set([...sources].map(s => byId.get(s)?.layer ?? "?"));
    if (srcLayers.size < 2 || types.size < 2) continue;
    // Confidence = ratio of real (status==='active') sources vs ghost
    const realCount = edges.filter(e => e.status === "active").length;
    const ghostCount = edges.length - realCount;
    candidates.push({ tid, t, edges, sources, types, srcLayers, realCount, ghostCount });
  }
  candidates.sort((a, b) => b.sources.size - a.sources.size);
  const top = candidates.slice(0, TOP_TARGETS);

  const newNodes = [];
  const newEdges = [];
  const seenEdge = new Set();
  const seenNode = new Set();
  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }
  function pushNode(node) {
    if (seenNode.has(node.id) || existingIds.has(node.id)) return false;
    seenNode.add(node.id);
    newNodes.push(node);
    return true;
  }

  // Roost for all combo synthesizers under a single L7 parent
  pushNode({
    id: "combo.synthesizers",
    layer: "L7",
    subgroup: "combos",
    label: "Combo Synthesizers\n(variability-adjusted formulas)",
    color: "#a855f7",
    status: "ghost",
    ghost: true,
    size: 1.4,
    tier: 2,
    info: "Ghost umbrella for proposed multi-input fusion formulas. Each child is a planned synthesizer that combines several existing inputs with a variability-aware combiner.",
  });

  const stats = {
    targetsScanned: candidates.length,
    targetsEmitted: 0,
    novelFormulas: 0,
    dispatcherFusions: 0,
    edgesProposed: 0,
  };

  // 3. Combo nodes (one per top convergence target)
  for (const c of top) {
    const id = `combo.${c.tid.replace(/[^a-z0-9._-]/gi, "_")}`;
    const tk = classifyKind(c.t);
    const tlabel = (c.t.label || c.tid).split("\n")[0];
    const formula = (() => {
      if (tk === "dispatcher") {
        return `route(x) = argmax_k softmax(intent_k · acc_k / T) — bayesian k-engine selection where T = variability dial`;
      }
      if (tk === "engine_domain") {
        return `y = Σ w_k · f_k(x_k); w_k = softmax(c_k / T) — domain rollup with confidence-weighted engine fusion`;
      }
      if (tk === "engine") {
        return `y = (Σ a_k · φ_k(x_k)) / (Σ a_k); a_k = 1/var_k — inverse-variance Kalman-style fusion of upstream callers`;
      }
      if (tk === "core") {
        return `delta(t) = Σ_k Δ_k(t) — accumulating pulse aggregator (events fire continuously into the same core)`;
      }
      return `y = Σ w_k · f_k(x_k); w_k = softmax(c_k / T) — generic confidence-weighted fusion`;
    })();
    pushNode({
      id,
      layer: "L8",
      subgroup: "combo",
      parent: "combo.synthesizers",
      label: `combo · ${tlabel}\n(${c.sources.size} inputs)`,
      color: "#a855f7",
      status: "ghost",
      ghost: true,
      kind: "combo",
      target: c.tid,
      inputs: [...c.sources],
      types: [...c.types],
      srcLayers: [...c.srcLayers],
      realInputs: c.realCount,
      ghostInputs: c.ghostCount,
      confidence: c.edges.length ? c.realCount / c.edges.length : 0,
      formula,
      size: 0.55 + Math.min(0.6, Math.log10(1 + c.sources.size) * 0.32),
      tier: 2,
      info: `Convergence target ${c.tid} draws from ${c.sources.size} distinct sources across layers [${[...c.srcLayers].join(", ")}] via edge types [${[...c.types].join(", ")}]. ${c.realCount} real / ${c.ghostCount} suggested. Proposed combiner: ${formula}`,
    });
    stats.targetsEmitted++;
    // Combo → target (the synthesizer feeds the convergence point)
    if (pushEdge(id, c.tid, "synthesize", "ghost", 0.5)) stats.edgesProposed++;
    // Each input source → combo (showing what gets fused)
    for (const src of c.sources) {
      if (pushEdge(src, id, "feeds_combo", "ghost", 0.25)) stats.edgesProposed++;
    }
    // Roost edge
    pushEdge("combo.synthesizers", id, "contains", "ghost", 0.2);
  }

  // 4. Novel-formula coverage for under-aggregated domains
  const domainEngines = new Map();
  const domainHasAggregator = new Map();
  for (const n of graph.nodes) {
    if (n.layer !== "L5") continue;
    const m = n.id?.match(/^eng\.([^.]+)\.(.+)$/);
    if (!m) continue;
    const dom = m[1];
    if (!domainEngines.has(dom)) domainEngines.set(dom, []);
    domainEngines.get(dom).push(n);
    if (AGGREGATOR_REGEX.test(n.label || "") || AGGREGATOR_REGEX.test(n.id)) {
      domainHasAggregator.set(dom, true);
    }
  }
  for (const [dom, engines] of domainEngines.entries()) {
    if (engines.length < DOMAIN_MIN) continue;
    if (domainHasAggregator.get(dom)) continue;
    if (dom === "other") continue; // catch-all bucket — not a real domain
    const id = `formula.adjusted.${dom}`;
    if (existingIds.has(id) || seenNode.has(id)) continue;
    const formula = `y_${dom} = Σ_k (α_k · φ_k(x_k)) / Σ_k α_k ; α_k = 1/var_k(x_k) — inverse-variance ensemble of ${engines.length} ${dom} engines (Kalman-style fusion)`;
    pushNode({
      id,
      layer: "L8",
      subgroup: "novel_formula",
      parent: "combo.synthesizers",
      label: `novel · ${dom} ensemble\n(${engines.length} engines, no aggregator)`,
      color: "#f0abfc",
      status: "ghost",
      ghost: true,
      kind: "novel_formula",
      domain: dom,
      engineCount: engines.length,
      formula,
      size: 0.55 + Math.log10(1 + engines.length) * 0.20,
      tier: 2,
      info: `Domain "${dom}" has ${engines.length} engines but no aggregator. Proposed novel ensemble: ${formula}`,
    });
    stats.novelFormulas++;
    pushEdge("combo.synthesizers", id, "contains", "ghost", 0.2);
    // Edges from a sample of domain engines into the novel formula
    for (const eng of engines.slice(0, 8)) {
      if (pushEdge(eng.id, id, "feeds_novel_formula", "ghost", 0.3)) stats.edgesProposed++;
    }
  }

  // 5. Dispatcher hierarchical-router proposals — for any dispatcher with
  //    ≥DISP_FUSION_MIN engines routing through it
  const dispEngineFanin = new Map();
  for (const e of graph.edges) {
    if (HIER_EDGE_TYPES.has(e.type)) continue;
    if (!e.from || !e.to) continue;
    if (!e.to.startsWith("disp.")) continue;
    const src = byId.get(e.from);
    if (!src || src.layer !== "L5") continue;
    if (!dispEngineFanin.has(e.to)) dispEngineFanin.set(e.to, new Set());
    dispEngineFanin.get(e.to).add(e.from);
  }
  for (const [dispId, srcs] of dispEngineFanin.entries()) {
    if (srcs.size < DISP_FUSION_MIN) continue;
    const id = `formula.adjusted.${dispId.replace(/^disp\./, "")}`;
    if (existingIds.has(id) || seenNode.has(id)) continue;
    const dispNode = byId.get(dispId);
    const dispLabel = (dispNode?.label || dispId).split("\n")[0];
    const formula = `select(x; ${dispId}) = argmax_k softmax( score_k(x) · accuracy_k / T ) — Bayesian engine router across ${srcs.size} candidates (T = exploration temperature)`;
    pushNode({
      id,
      layer: "L8",
      subgroup: "dispatcher_router",
      parent: "combo.synthesizers",
      label: `router · ${dispLabel}\n(${srcs.size} engines)`,
      color: "#c084fc",
      status: "ghost",
      ghost: true,
      kind: "dispatcher_router",
      dispatcher: dispId,
      engineCount: srcs.size,
      formula,
      size: 0.6 + Math.log10(1 + srcs.size) * 0.25,
      tier: 2,
      info: `Dispatcher ${dispId} has ${srcs.size} engines competing for the same actions. Proposed Bayesian router: ${formula}`,
    });
    stats.dispatcherFusions++;
    pushEdge("combo.synthesizers", id, "contains", "ghost", 0.2);
    pushEdge(id, dispId, "synthesize", "ghost", 0.45);
    for (const src of [...srcs].slice(0, 10)) {
      if (pushEdge(src, id, "feeds_router", "ghost", 0.25)) stats.edgesProposed++;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    tuning: { CONVERGE_MIN, DISP_FUSION_MIN, DOMAIN_MIN, TOP_TARGETS },
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "combo-detector-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
console.log(`  candidates scanned:  ${result.stats.targetsScanned}`);
console.log(`  combo synthesizers:  ${result.stats.targetsEmitted}`);
console.log(`  novel formulas:      ${result.stats.novelFormulas}`);
console.log(`  dispatcher routers:  ${result.stats.dispatcherFusions}`);
console.log(`  edges proposed:      ${result.stats.edgesProposed}`);
console.log(`  total ghost nodes:   ${result.newNodes.length}`);
console.log(`  total ghost edges:   ${result.newEdges.length}`);
