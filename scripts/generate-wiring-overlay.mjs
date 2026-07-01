#!/usr/bin/env node
/**
 * generate-wiring-overlay.mjs — surface "where can each unwired engine be wired
 * to that would be a net benefit" as graph data:
 *
 *   1. For every L5 atomic engine node already in the graph, if the audit
 *      flagged it UNWIRED, attach `wiringStatus="unwired"` + `suggestedDispatcher`
 *      and emit a PHANTOM edge → matched dispatcher node.
 *   2. For every UNWIRED engine NOT present in the L5 atomic sample, attach a
 *      rollup "unwired children not yet drilled" count to its closest domain
 *      parent (eng.mill, eng.lathe, etc.) and emit a phantom edge from the
 *      domain rollup → suggested dispatcher. This makes the wiring inbox
 *      navigable even when the atomic engine isn't a node yet.
 *
 * Source: state/shared/UNWIRED-ENGINE-AUDIT-<date>.json (latest by mtime).
 * Output: state/shared/system-viz/wiring-overlay-augmentation.json
 *
 * Phantom edges use type="suggested_wire" + status="phantom" so the existing
 * Suggest mode (button #8) highlights them automatically.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const STATE_DIR = path.join(ROOT, "state", "shared");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

function findLatestAudit() {
  const files = fs.readdirSync(STATE_DIR)
    .filter(f => /^UNWIRED-ENGINE-AUDIT-.*\.json$/.test(f));
  if (files.length === 0) return null;
  files.sort();              // ISO-date filenames sort chronologically
  return path.join(STATE_DIR, files[files.length - 1]);
}

// Engines may suggest a logical dispatcher name (e.g. "prism_cam") that maps
// to one or more concrete dispatcher node ids in the graph.
function dispatcherIdCandidates(suggested, dispNodes) {
  if (!suggested || /^UNKNOWN/.test(suggested)) return [];
  const lower = suggested.toLowerCase();
  // Normalize: prism_cam → cam, prism_calc → calc
  const stem = lower.replace(/^prism_/, "");
  const out = [];
  for (const d of dispNodes) {
    const dlower = d.id.toLowerCase();
    const dlabel = (d.label || "").toLowerCase();
    if (dlower.includes(stem) || dlabel.includes(stem)) out.push(d.id);
  }
  return out;
}

function generate() {
  const auditPath = findLatestAudit();
  if (!auditPath) {
    console.error("no UNWIRED-ENGINE-AUDIT-*.json found");
    process.exit(1);
  }
  const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));

  const dispNodes = graph.nodes.filter(n => n.id.startsWith("disp."));
  const atomicEngineNodes = graph.nodes.filter(n =>
    n.layer === "L5" && n.id.includes(".") && n.id.startsWith("eng.")
    && n.parent && n.parent.startsWith("eng.")
    && n.label && !n.label.includes("\n")     // exclude rollup nodes (rollup labels have "\n(count)")
  );
  const domainParents = graph.nodes.filter(n =>
    n.layer === "L5" && n.id.startsWith("eng.")
    && (!n.parent || !n.parent.startsWith("eng."))
  );

  // Build lookup: engineFileName (lowercased, .ts stripped) → atomic node id
  const atomicByFileName = new Map();
  for (const n of atomicEngineNodes) {
    const stem = (n.file || "").split(/[\\/]/).pop()?.replace(/\.ts$/, "").toLowerCase();
    if (stem) atomicByFileName.set(stem, n);
    // also try by label (engine basename without .ts)
    if (n.label) atomicByFileName.set(n.label.toLowerCase(), n);
  }

  // Build domain matcher: longest-first prefix → domainParent id
  const domainKeys = domainParents
    .map(n => ({ key: (n.id.replace(/^eng\./, "") || "").toLowerCase(), node: n }))
    .filter(x => x.key.length > 0)
    .sort((a, b) => b.key.length - a.key.length);

  function matchDomainId(engineName) {
    const lower = engineName.toLowerCase();
    for (const { key, node } of domainKeys) {
      if (lower.startsWith(key)) return node.id;
    }
    return "eng.other";
  }

  const annotations = {};                    // nodeId → { wiringStatus, suggestedDispatcher, ... }
  const phantomEdges = [];
  const domainRollup = new Map();            // domainId → { unwiredCount, samples: [...] }
  const stats = {
    totalUnwired: audit.unwiredEngines.length,
    matchedAtomic: 0,
    rolledUpToDomain: 0,
    phantomEdgesEmitted: 0,
    knownSuggestion: 0,
    unknownSuggestion: 0,
    dispatcherCoverage: {},
  };

  for (const u of audit.unwiredEngines) {
    const stem = u.engine.toLowerCase();
    const dispCands = dispatcherIdCandidates(u.suggestedDispatcher, dispNodes);
    if (dispCands.length > 0) stats.knownSuggestion++; else stats.unknownSuggestion++;

    const atomic = atomicByFileName.get(stem);
    if (atomic) {
      stats.matchedAtomic++;
      annotations[atomic.id] ??= {};
      annotations[atomic.id].wiringStatus = "unwired";
      annotations[atomic.id].suggestedDispatcher = u.suggestedDispatcher;
      annotations[atomic.id].suggestedDispatcherIds = dispCands;
      annotations[atomic.id].engineSizeKB = u.size_kb;
      annotations[atomic.id].engineMtime = u.mtime;
      for (const dispId of dispCands) {
        phantomEdges.push({
          from: atomic.id, to: dispId, type: "suggested_wire", status: "phantom", intensity: 0.45,
        });
        stats.phantomEdgesEmitted++;
        stats.dispatcherCoverage[dispId] = (stats.dispatcherCoverage[dispId] || 0) + 1;
      }
    } else {
      stats.rolledUpToDomain++;
      const domId = matchDomainId(u.engine);
      const r = domainRollup.get(domId) || { unwiredCount: 0, samples: [], suggestedDispatchers: new Set() };
      r.unwiredCount++;
      if (r.samples.length < 12) r.samples.push({ name: u.engine, suggested: u.suggestedDispatcher, sizeKB: u.size_kb });
      for (const d of dispCands) r.suggestedDispatchers.add(d);
      domainRollup.set(domId, r);
    }
  }

  // Emit one phantom per (domainId → dispId) for rolled-up suggestions
  const seenDomEdge = new Set();
  for (const [domId, r] of domainRollup.entries()) {
    annotations[domId] ??= {};
    annotations[domId].unwiredRolledUp = r.unwiredCount;
    annotations[domId].rolledUpSamples = r.samples;
    for (const dispId of r.suggestedDispatchers) {
      const k = `${domId}|${dispId}`;
      if (seenDomEdge.has(k)) continue;
      seenDomEdge.add(k);
      phantomEdges.push({
        from: domId, to: dispId, type: "suggested_wire", status: "phantom", intensity: 0.55,
      });
      stats.phantomEdgesEmitted++;
      stats.dispatcherCoverage[dispId] = (stats.dispatcherCoverage[dispId] || 0) + 1;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    auditSource: path.relative(ROOT, auditPath).replace(/\\/g, "/"),
    annotations,
    phantomEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "wiring-overlay-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
console.log(`  totalUnwired=${result.stats.totalUnwired}  matchedAtomic=${result.stats.matchedAtomic}  rolledUp=${result.stats.rolledUpToDomain}`);
console.log(`  phantomEdges=${result.stats.phantomEdgesEmitted}  knownSuggestion=${result.stats.knownSuggestion}  unknown=${result.stats.unknownSuggestion}`);
console.log(`  top dispatcher targets:`);
const top = Object.entries(result.stats.dispatcherCoverage).sort((a, b) => b[1] - a[1]).slice(0, 8);
for (const [d, c] of top) console.log(`    ${d}: ${c}`);
