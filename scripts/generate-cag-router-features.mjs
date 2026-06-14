#!/usr/bin/env node
// TOKEN-SAVINGS-PIVOT/U-CAG-DASHBOARD (sierra 2026-05-27).
// /system-viz augmentation — surfaces the CAG-router architecture as
// ghost.cag_router roost with live probes:
//
//   ghost.cag_router  (parent)
//     ├─ ghost.cag.producer.router-inject       (UserPromptSubmit hook)
//     ├─ ghost.cag.producer.cold-anchor         (SessionStart hook, U-CAG-CACHE-CONTROL)
//     ├─ ghost.cag.consumer.master-index        (consumes sidecar via cag-consume.mjs)
//     ├─ ghost.cag.consumer.memory-relevance    (   "                  ")
//     ├─ ghost.cag.consumer.tribal-by-domain    (   "                  ")
//     └─ ghost.cag.shared.consume-helper        (.claude/helpers/cag-consume.mjs)
//
// Probes:
//   - Sidecar count in state/shared/cag-route/ (latest-*.json files)
//   - Latest 50 sidecars' tier distribution (COLD / HOT / HYBRID counts)
//   - Existence of producer hook + cold-anchor hook + consume helper
//
// Pattern modeled on scripts/generate-hybrid-retrieval-features.mjs (iter 21).
// Render is gated by the pre-existing regen-viz V8 OOM — augmentation file
// lands either way and materializes on the next successful pass.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.cag_router";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const CHILD_LAYER = "L9";

export const COLOR_LIVE    = "#10b981"; // green — wired + sidecars writing
export const COLOR_PARTIAL = "#fbbf24"; // amber — wired but no recent sidecars / orphan hook
export const COLOR_OFFLINE = "#ef4444"; // red — file missing

// ─────────────────────────────────────────────────────────────────────────────
// Probes — all fail-soft. Caller renders "?" or OFFLINE on null.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Probe the sidecar dir. Counts total `latest-*.json` files + tier distribution
 * over the most-recent N sidecars by mtime. Tier distribution is the live signal
 * that operators want — "is CAG mostly returning COLD or mostly HYBRID?".
 */
export function probeSidecars({
  existsImpl = fs.existsSync,
  readdirImpl = fs.readdirSync,
  statImpl = fs.statSync,
  readImpl = fs.readFileSync,
  sidecarDir = path.join(ROOT, "state/shared/cag-route"),
  sampleN = 50,
} = {}) {
  if (!existsImpl(sidecarDir)) return null;
  let files;
  try { files = readdirImpl(sidecarDir).filter((f) => f.startsWith("latest-") && f.endsWith(".json")); }
  catch { return null; }
  if (files.length === 0) {
    return { totalSidecars: 0, sampled: 0, tierCounts: { COLD: 0, HOT: 0, HYBRID: 0, other: 0 }, latestMtimeMs: null };
  }
  // Stat all + sort by mtime descending; sample the top N.
  const stat = files
    .map((f) => {
      try { return { f, m: statImpl(path.join(sidecarDir, f)).mtimeMs }; }
      catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => b.m - a.m);
  const sample = stat.slice(0, sampleN);
  const tierCounts = { COLD: 0, HOT: 0, HYBRID: 0, other: 0 };
  for (const { f } of sample) {
    try {
      const j = JSON.parse(readImpl(path.join(sidecarDir, f), "utf8"));
      const t = j?.decision?.tier;
      if (t === "COLD" || t === "HOT" || t === "HYBRID") tierCounts[t]++;
      else tierCounts.other++;
    } catch { tierCounts.other++; }
  }
  return {
    totalSidecars: files.length,
    sampled: sample.length,
    tierCounts,
    latestMtimeMs: stat.length > 0 ? stat[0].m : null,
  };
}

/**
 * Probe whether each wired CAG asset is present on disk + wired into settings.
 * Existence-only — does NOT parse settings.json; just checks file path.
 * Wiring presence is captured by the dashboard via the existing
 * unwired-engine inference in regen-viz (out of scope here).
 */
export function probeAssets({ existsImpl = fs.existsSync, root = ROOT } = {}) {
  const assets = {
    producerRouter:   { path: ".claude/hooks/cag-router-inject.mjs" },
    producerAnchor:   { path: ".claude/hooks/cag-cold-cache-anchor.mjs" },
    consumeHelper:    { path: ".claude/helpers/cag-consume.mjs" },
    consumerMaster:   { path: ".claude/hooks/master-index-precheck-inject.mjs" },
    consumerMemory:   { path: ".claude/hooks/memory-relevance-inject.mjs" },
    consumerTribal:   { path: ".claude/hooks/tribal-by-domain-inject.mjs" },
    routerLib:        { path: "scripts/lib/cag-router.mjs" },
  };
  for (const [, a] of Object.entries(assets)) {
    a.present = existsImpl(path.join(root, a.path));
  }
  return assets;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generator — pure-core, deterministic given probe inputs.
// ─────────────────────────────────────────────────────────────────────────────

export function generate({ sidecars, assets }, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];

  const allPresent = Object.values(assets).every((a) => a.present);
  const someMissing = Object.values(assets).some((a) => !a.present);

  // Sidecar-traffic health: any sidecar in the last 24h is "live"
  const recentMs = sidecars?.latestMtimeMs ?? null;
  const ageHours = recentMs != null ? (Date.now() - recentMs) / 3_600_000 : null;
  const sidecarsLive = ageHours != null && ageHours < 24;

  // Parent roost color: live=green only when all assets present + recent traffic.
  const parentColor = allPresent && sidecarsLive
    ? COLOR_LIVE
    : someMissing
      ? COLOR_OFFLINE
      : COLOR_PARTIAL;

  const tierLine = sidecars
    ? `Last ${sidecars.sampled} sidecars: COLD=${sidecars.tierCounts.COLD} HOT=${sidecars.tierCounts.HOT} HYBRID=${sidecars.tierCounts.HYBRID}`
    : "(no sidecar dir yet)";
  const trafficLine = ageHours != null
    ? `Latest sidecar ${ageHours.toFixed(1)}h ago · ${sidecars?.totalSidecars ?? 0} total`
    : "No sidecars yet";

  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: "CAG Router (Cache-Augmented Generation, akshay_pachaar)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      color: parentColor,
      info: `Producer + consumer fan-out for the CAG-route sidecar. ${trafficLine}. ${tierLine}. Lib: scripts/lib/cag-router.mjs.`,
    });
    ids.add(ROOST_ID);
  }

  // Substrates — one node per asset, color from presence + traffic.
  const substrates = [
    {
      id: "ghost.cag.producer.router-inject",
      label: "Producer — cag-router-inject (UserPromptSubmit)",
      present: assets.producerRouter.present,
      info: assets.producerRouter.present
        ? `Classifies every prompt as COLD/HOT/HYBRID via cag-router.mjs; writes sidecar to state/shared/cag-route/latest-<sid>.json. ${trafficLine}.`
        : `MISSING: ${assets.producerRouter.path}`,
    },
    {
      id: "ghost.cag.producer.cold-anchor",
      label: "Producer — cag-cold-cache-anchor (SessionStart)",
      present: assets.producerAnchor.present,
      info: assets.producerAnchor.present
        ? `Emits cold-tier doctrine catalog ONCE per session for prompt-cache KV anchor (akshay_pachaar cold/hot-split). cache_control:ephemeral candidate spec.`
        : `MISSING: ${assets.producerAnchor.path}`,
    },
    {
      id: "ghost.cag.shared.consume-helper",
      label: "Helper — cag-consume.mjs (shared)",
      present: assets.consumeHelper.present,
      info: assets.consumeHelper.present
        ? `Pure-core sidecar reader. shouldSkip(skipKey, {sessionId}) → fail-OPEN decision. Helper-level 26 tests + integration 8 tests.`
        : `MISSING: ${assets.consumeHelper.path}`,
    },
    {
      id: "ghost.cag.consumer.master-index",
      label: "Consumer — master-index-precheck-inject",
      present: assets.consumerMaster.present,
      info: assets.consumerMaster.present
        ? `Short-circuits the BM25 + lexical rerank when sidecar.skip.masterIndexInject === true. Saves ~3-5KB / cold prompt.`
        : `MISSING: ${assets.consumerMaster.path}`,
    },
    {
      id: "ghost.cag.consumer.memory-relevance",
      label: "Consumer — memory-relevance-inject (PreToolUse)",
      present: assets.consumerMemory.present,
      info: assets.consumerMemory.present
        ? `Short-circuits the per-edit memo scan when sidecar.skip.memoryRelevanceInject === true. Already rate-limited per (session,file) — CAG is an additional skip path.`
        : `MISSING: ${assets.consumerMemory.path}`,
    },
    {
      id: "ghost.cag.consumer.tribal-by-domain",
      label: "Consumer — tribal-by-domain-inject (canonical CAG win)",
      present: assets.consumerTribal.present,
      info: assets.consumerTribal.present
        ? `Short-circuits the ~3-4s Ollama-embed rerank subprocess when sidecar.skip.tribalByDomainInject === true. BIGGEST single saving (subprocess + ~2KB).`
        : `MISSING: ${assets.consumerTribal.path}`,
    },
    {
      id: "ghost.cag.router-lib",
      label: "scripts/lib/cag-router.mjs (classifier)",
      present: assets.routerLib.present,
      info: assets.routerLib.present
        ? `Pure BM25-lite classifier — COLD_SOURCES registry + HOT temporal/surface/RAG markers + HYBRID forcing. Sub-millisecond per classify.`
        : `MISSING: ${assets.routerLib.path}`,
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
      kind: "cag-substrate",
      parent: ROOST_ID,
      color: sub.present ? (sidecarsLive ? COLOR_LIVE : COLOR_PARTIAL) : COLOR_OFFLINE,
      info: sub.info,
    });
    ids.add(sub.id);
    newEdges.push({ from: ROOST_ID, to: sub.id, kind: "fans-out-to" });
  }

  // Sidecar-shape edges — producer fans into the sidecar, consumers consume it.
  // Modeled as direct producer→consumer edges (the sidecar is the contract,
  // not a node — would clutter the roost with a transient state file).
  const PRODUCER = "ghost.cag.producer.router-inject";
  const CONSUMERS = [
    "ghost.cag.consumer.master-index",
    "ghost.cag.consumer.memory-relevance",
    "ghost.cag.consumer.tribal-by-domain",
  ];
  const HELPER = "ghost.cag.shared.consume-helper";
  const existingEdgeKeys = new Set(newEdges.map((e) => `${e.from}|${e.to}|${e.kind ?? ""}`));
  function pushEdge(from, to, kind) {
    const k = `${from}|${to}|${kind}`;
    if (existingEdgeKeys.has(k)) return;
    newEdges.push({ from, to, kind });
    existingEdgeKeys.add(k);
  }
  for (const c of CONSUMERS) {
    pushEdge(PRODUCER, c, "writes-sidecar-for");
    pushEdge(HELPER, c, "imported-by");
  }

  return {
    newNodes,
    newEdges,
    stats: {
      roostEmitted: 1,
      assetsPresent: Object.values(assets).filter((a) => a.present).length,
      assetTotal: Object.keys(assets).length,
      sidecarsTotal: sidecars?.totalSidecars ?? null,
      tierCounts: sidecars?.tierCounts ?? null,
      sidecarsLive,
      latestMtimeMs: recentMs,
    },
  };
}

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "cag-router-augmentation.json");

export function main() {
  const sidecars = probeSidecars();
  const assets = probeAssets();

  let result;
  try {
    const { newNodes, newEdges, stats } = generate({ sidecars, assets }, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "live probes (sidecar dir scan + asset existsSync)",
      newNodes, newEdges, stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try {
    if (!fs.existsSync(VIZ_DIR)) fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  assets present:    ${result.stats.assetsPresent}/${result.stats.assetTotal}`);
  console.log(`  sidecars total:    ${result.stats.sidecarsTotal ?? "?"}`);
  console.log(`  tier counts:       ${JSON.stringify(result.stats.tierCounts)}`);
  console.log(`  sidecars live:     ${result.stats.sidecarsLive}`);
  console.log(`  nodes:             ${result.newNodes.length}`);
  console.log(`  edges:             ${result.newEdges.length}`);
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
