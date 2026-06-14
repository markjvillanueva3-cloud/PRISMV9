#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-HYBRID-VIZ-ROOST — system-viz augmentation: hybrid
// retrieval architecture roost. Closes iter-18/19 follow-up.
//
// Emits ghost.hybrid_retrieval parent roost + 4 substrate child nodes
// (memory-index BM25 + master-index graph BM25 + episode-store predicate +
// Qdrant dense vector) + 4 fan-out edges from the roost to each substrate.
// Operators see in /system-viz the architecture that hybridSearch() composes.
//
// Substrate child info labels carry LIVE counts (memory file count + episode
// summary + Qdrant points_count + master graph status) — best-effort, "?" on
// any probe failure (curl timeout, missing files). Pattern modeled on
// scripts/generate-episode-store-features.mjs (iter 12).
//
// Render is gated by the pre-existing regen-viz V8 max-string-length OOM
// (state/shared/system-viz/system-graph.json ~495MB merged). The
// augmentation file lands either way; on the next successful regen pass
// it materializes as 5 visible nodes.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadStore, summarize as summarizeEpisodes } from "./lib/episode-store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.hybrid_retrieval";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const CHILD_LAYER = "L9";

export const COLOR_LIVE = "#10b981";   // green — substrate online
export const COLOR_PARTIAL = "#fbbf24"; // amber — substrate degraded
export const COLOR_OFFLINE = "#ef4444"; // red — substrate dead

// Probe each substrate. All probes are fail-soft — return null on any error,
// caller renders "?" in the info label. None of these may throw.
export function probeMemorySubstrate({ existsImpl = fs.existsSync, readdirImpl = fs.readdirSync } = {}) {
  const root = path.join(ROOT, "knowledge/memories");
  if (!existsImpl(root)) return null;
  const namespaces = ["feedback", "reference", "project", "user", "patterns", "mistakes", "inbox"];
  let total = 0;
  for (const ns of namespaces) {
    const nsPath = path.join(root, ns);
    if (!existsImpl(nsPath)) continue;
    try { total += readdirImpl(nsPath).filter((f) => f.endsWith(".md")).length; }
    catch { /* fail-soft */ }
  }
  return total;
}

export function probeMasterSubstrate({ existsImpl = fs.existsSync, statImpl = fs.statSync } = {}) {
  const p = path.join(ROOT, "state/shared/system-viz/system-graph.json");
  if (!existsImpl(p)) return null;
  try {
    const s = statImpl(p);
    return { sizeBytes: s.size, mtime: s.mtime.toISOString() };
  } catch { return null; }
}

export function probeEpisodeSubstrate() {
  try {
    const store = loadStore();
    const s = summarizeEpisodes(store);
    return s || null;
  } catch { return null; }
}

export function probeQdrantSubstrate({ spawnImpl = spawnSync, url = "http://localhost:6333", collection = "prism_engines", timeoutSec = 3 } = {}) {
  try {
    const r = spawnImpl("curl", ["-sS", "--max-time", String(timeoutSec), `${url}/collections/${collection}`], { encoding: "utf8", maxBuffer: 1024 * 1024 });
    if (r.status !== 0) return null;
    const parsed = JSON.parse(r.stdout || "");
    if (!parsed || !parsed.result) return null;
    return {
      pointsCount: parsed.result.points_count ?? null,
      status: parsed.result.status ?? null,
      vectorsCount: parsed.result.vectors_count ?? null,
    };
  } catch { return null; }
}

export function generate(probes, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];
  let roostEmitted = 0;

  const memoryCount = probes.memory;
  const masterInfo = probes.master;
  const epSummary = probes.episode;
  const qdrant = probes.qdrant;

  const substratesLive = [memoryCount !== null, masterInfo !== null, epSummary !== null, qdrant !== null].filter(Boolean).length;

  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: "Hybrid Retrieval (4-substrate RRF fan-out)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      color: substratesLive === 4 ? COLOR_LIVE : (substratesLive >= 2 ? COLOR_PARTIAL : COLOR_OFFLINE),
      info: `hybridSearch() composes ${substratesLive}/4 substrates via RRF k=60 fusion. Lib: scripts/lib/hybrid-retrieval.mjs · CLI: scripts/prism-hybrid.mjs · skill: /hybrid · 50/50 tests.`,
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  const substrates = [
    {
      id: "ghost.hybrid.substrate.memory",
      label: "memory-index BM25",
      color: memoryCount !== null ? COLOR_LIVE : COLOR_OFFLINE,
      info: memoryCount !== null
        ? `Obsidian vault BM25 over ${memoryCount} memory .md files (free-floating + pre-joined). Lib: memory-index-search-lib.mjs.`
        : `memory vault probe failed — fs scan of knowledge/memories/<ns>/*.md.`,
    },
    {
      id: "ghost.hybrid.substrate.master",
      label: "master-index graph BM25",
      color: masterInfo !== null ? COLOR_LIVE : COLOR_OFFLINE,
      info: masterInfo !== null
        ? `system-graph.json BM25 (${(masterInfo.sizeBytes / 1e6).toFixed(1)}MB graph · mtime ${masterInfo.mtime}). Lib: master-index-search-lib.mjs.`
        : `master graph not present — regen via scripts/regen-viz.mjs.`,
    },
    {
      id: "ghost.hybrid.substrate.episode",
      label: "graphiti-lite episode store",
      color: epSummary !== null ? COLOR_LIVE : COLOR_OFFLINE,
      info: epSummary !== null
        ? `${epSummary.totalEpisodes} episodes (${epSummary.validNow} valid · ${epSummary.superseded} superseded · ${epSummary.tombstoneCount} tombstones). Lib: episode-store.mjs.`
        : `episode store probe failed — state/shared/episodes.jsonl.`,
    },
    {
      id: "ghost.hybrid.substrate.vector",
      label: "Qdrant dense cosine (nomic-embed-text 768d)",
      color: qdrant !== null ? COLOR_LIVE : COLOR_OFFLINE,
      info: qdrant !== null
        ? `prism_engines collection: ${qdrant.pointsCount ?? "?"} points · status ${qdrant.status ?? "?"} · vectors_count ${qdrant.vectorsCount ?? "?"}. Populate: scripts/populate-qdrant.mjs.`
        : `Qdrant offline — curl http://localhost:6333/collections/prism_engines failed.`,
    },
  ];

  for (const sub of substrates) {
    if (ids.has(sub.id)) continue;
    newNodes.push({
      id: sub.id,
      label: sub.label,
      layer: CHILD_LAYER,
      ghost: true,
      status: "ghost",
      kind: "hybrid-substrate",
      parent: ROOST_ID,
      color: sub.color,
      info: sub.info,
    });
    ids.add(sub.id);
    newEdges.push({ from: ROOST_ID, to: sub.id, kind: "fans-out-to" });
  }

  return {
    newNodes,
    newEdges,
    stats: {
      roostEmitted,
      substratesLive,
      substrateTotal: 4,
      memoryFiles: memoryCount,
      masterGraphMB: masterInfo ? Number((masterInfo.sizeBytes / 1e6).toFixed(1)) : null,
      episodeTotal: epSummary ? epSummary.totalEpisodes : null,
      qdrantPoints: qdrant ? qdrant.pointsCount : null,
    },
  };
}

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "hybrid-retrieval-augmentation.json");

export function main() {
  const probes = {
    memory: probeMemorySubstrate(),
    master: probeMasterSubstrate(),
    episode: probeEpisodeSubstrate(),
    qdrant: probeQdrantSubstrate(),
  };

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(probes, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "live probes (memory fs + master mtime + episode store + Qdrant curl)",
      newNodes, newEdges, stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try {
    if (!fs.existsSync(VIZ_DIR)) fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  substrates-live:  ${result.stats.substratesLive}/4`);
  console.log(`  memory files:     ${result.stats.memoryFiles ?? "?"}`);
  console.log(`  master graph MB:  ${result.stats.masterGraphMB ?? "?"}`);
  console.log(`  episodes total:   ${result.stats.episodeTotal ?? "?"}`);
  console.log(`  qdrant points:    ${result.stats.qdrantPoints ?? "?"}`);
  console.log(`  nodes:            ${result.newNodes.length}`);
  console.log(`  edges:            ${result.newEdges.length}`);
  return 0;
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();

if (invokedDirect) process.exit(main());
