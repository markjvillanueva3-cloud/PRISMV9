#!/usr/bin/env node
/**
 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
 *
 * Use cases:
 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
 *     wiring-overlay emits fresh phantom edges.
 *   - After commits to engines/dispatchers/registries: galaxy-constituents
 *     enumerates new files as molecules.
 *
 * Skip generators that only emit when their source data has changed
 * (filesystem dir-index, since that takes minutes to walk H:\).
 *
 * Usage:
 *   node scripts/regen-viz.mjs            # default — fast augmentations + merge
 *   node scripts/regen-viz.mjs --full     # also regen the heavy fs-deep + L11
 *
 * The viz polls system-graph.json every 30s and auto-reloads on mtime change,
 * so once this completes the open browser tab updates without manual refresh.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { driftGateVerdict } from "./lib/drift-gate.mjs";
import { auditDualRegistration } from "./lib/viz-dual-registration-audit.mjs";
import { parseMergedAugmentations, classifyAugmentationFreshness, buildFreshnessReport, freshnessThresholdsFromEnv } from "./lib/augmentation-freshness.mjs";
import { atomicWriteText } from "./lib/atomic-json.mjs";
import {
  decideMergePostState,
  readGraphNodeCount,
  readAugmentationByteTotal,
} from "./lib/regen-viz-merge-guard.mjs";
import {
  acquireGraphWriteLock,
  installGraphWriteLockReleaseOnExit,
  EXIT_GRAPH_WRITE_LOCK_SKIP,
} from "./lib/system-graph-write-lock.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// W4 / U-DRIFT-HARD-FAIL. DRIFT_REPORT.json path is env-overridable so the
// test suite can point the gate at a planted fixture without touching the
// shared (multi-chat) report.
const DRIFT_REPORT_PATH = process.env.PRISM_DRIFT_REPORT_PATH
  || path.join(ROOT, "state", "shared", "system-viz", "DRIFT_REPORT.json");

/**
 * Run the drift hard-fail gate. Returns true on FAIL (caller flips exit code).
 * @param {object} o
 * @param {boolean} o.regenerate  run detect-system-viz-drift first (fresh truth)
 *                                vs read the existing report as-is (gate-only).
 */
function runDriftGate({ regenerate }) {
  if (process.env.PRISM_REGEN_VIZ_IGNORE_DRIFT === "1") {
    console.log("[regen-viz] drift-gate: bypassed (PRISM_REGEN_VIZ_IGNORE_DRIFT=1)");
    return false;
  }
  if (regenerate) {
    // Refresh the report against the just-built graph. --no-write would defeat
    // the purpose; we WANT the fresh report persisted. Gate on reality.
    // Heap bump (U-VIZ-DRIFT-GATE-HEAP, sierra 2026-06-22): detect-system-viz-drift loads the
    // full ~862MB merged graph; at the default V8 heap it OOMs ("Ineffective mark-compacts near
    // heap limit") -> the gate reports driftFail=true + degrades the find-cache on EVERY regen
    // once the graph crosses the threshold. The FAST/HEAVY generators already get 24GB (NODE_ARGS,
    // line ~246); the drift-gate spawn did not. Inlined (not NODE_ARGS) because the --drift-gate-only
    // path calls runDriftGate at module top-level BEFORE the NODE_ARGS const is initialized (TDZ).
    const dd = spawnSync(process.execPath, ["--max-old-space-size=24576", path.join(ROOT, "scripts", "detect-system-viz-drift.mjs")], {
      stdio: "inherit", cwd: ROOT,
    });
    if (dd.status !== 0) {
      // The detector itself failing is loud but must NOT masquerade as a
      // clean graph — treat as gate failure (fail-loud, Karpathy R12).
      console.error("[regen-viz] drift-gate: detect-system-viz-drift failed to run — cannot certify graph integrity");
      return true;
    }
  }
  let report = null;
  try { report = JSON.parse(fs.readFileSync(DRIFT_REPORT_PATH, "utf8")); }
  catch { report = null; }
  const v = driftGateVerdict(report);
  console[v.fail ? "error" : "log"](`[regen-viz] ${v.summary}`);
  return v.fail;
}

// Standalone fast verification channel: run ONLY the gate (no build chain).
// `node scripts/regen-viz.mjs --drift-gate-only` reads the current
// DRIFT_REPORT.json and exits 1 on truncated/root-missing. This is W4's
// re-measurable signal (forge-audit-v2 doctrine) and lets cron/CI gate on
// graph integrity in milliseconds instead of a multi-minute full regen.
if (process.argv.includes("--drift-gate-only")) {
  const fail = runDriftGate({ regenerate: !process.argv.includes("--no-detect") });
  process.exit(fail ? 1 : 0);
}

const FAST = [
  "generate-engine-domain-inventory.mjs",
  "generate-knowledge-inventory.mjs",
  "generate-vault-atomic.mjs",  // U-VIZ-VAULT-ATOMIC-WIRE (sierra 2026-06-22): emits ~5099 L8 vault_entry nodes (every knowledge/* note excl wiki/memories) under per-namespace rollups -> Obsidian vault queryable in /system-viz. Was a dual-reg ORPHAN (emitted vault-atomic-augmentation.json but never in FAST[]). Cheap: knowledge/* walk, NO graph parse. merge folds vaultAtomic (~line 709). Dual-reg auditor P2-orphan finding.
  "generate-core-inventory.mjs",  // U-VIZ-ORPHAN-WIRE (sierra 2026-06-22): was half-wired -- merge folds coreInventory (~line 616) but FAST[] never ran it -> 674 core.* nodes stale-folded since 2026-05-09. Healthy 0s FS-walk, no graph parse. Dual-reg auditor orphan finding.
  "generate-cad-completion-augmentation.mjs",  // PA4-VIZ-CAD-GRAPH-UPDATE (slot:delta 2026-06-26): ghost.cad_completion roost + per-unit CAD-completion nodes from CAD-COMPLETION-STATUS.json. Cheap: reads one ~11KB STATUS.json, NO graph parse, regen-safe (always exits 0 + writes a valid augmentation). merge folds cadCompletion (mergeIndexedAugmentation, ~line 2962). Dual-reg both-or-neither.
  "generate-fs-inventory.mjs",  // U-VIZ-FS-INVENTORY-WALK-FIX (sierra 2026-06-22): was hanging >120s/OOM (iterated all 74,704 L9 nodes, FS-walking each); now filters to the 88 fs-dir L9 (subgroup prism|h_root) + strips the [N/M] label annotation -> 4s, 301 fs.box nodes refreshed (was stale since 2026-05-09). merge folds fsInventory (~line 672).
  "merge-file-coverage-v2.mjs",  // U-VIZ-AUG-STALE-REWIRE (sierra 2026-06-22): was STALE-ORPHAN 1051h -- generator existed but was never in FAST[], so merge folded a 44-day-old file every regen (GREEN=re-merge recency, NOT data freshness). Cheap: 159ms, reads agent-findings-v2/{1..10}.json, NO graph load/FS walk. merge folds fileCoverageV2 (~line 150). MUST precede heuristic-classifier (its input). Aug-freshness audit finding.
  "build-novelty-catalog.mjs",  // U-VIZ-AUG-STALE-REWIRE (sierra 2026-06-22): was STALE-ORPHAN 1070h. Cheap: 322ms, shallow engines/algorithms readdir (CAP=100) + 2 registries, NO graph load. merge folds novelty (~line 144).
  "heuristic-classifier.mjs",  // U-VIZ-AUG-STALE-REWIRE (sierra 2026-06-22): was STALE-ORPHAN 1067h. Cheap: 557ms, reads h-drive-dir-index.json + file-coverage-v2-augmentation.json via JSON.parse, NO graph load. merge folds heuristicCov (~line 151). Runs AFTER merge-file-coverage-v2 (consumes its output; FAST[] is sequential so array order = exec order).
  "generate-staleness-overlay.mjs",
  "generate-sfc-variability-summary.mjs",  // VIZ-SFC-VARIABILITY-BOUNDED-FOLD (sierra 2026-06-24): condense the 45MB/50,009-node sfc-variability augmentation to a ~9-node structural roost (50K raw sfc-cells DROPPED, count annotated on the roost) -> emits sfc-variability-summary-augmentation.json (~3KB). merge folds sfcVariabilitySummary via foldRoostAug (~line 1129). Both-or-neither dual-reg. Reads the existing augmentations/sfc-variability.json (refresh that to refresh this). Was deliberately unwired (folding 50K cells would ~double the graph / OOM class); the bounded summary makes the SFC-variability surface graph-queryable safely.
  "generate-wiring-overlay.mjs",
  "generate-galaxy-constituents.mjs",
  "generate-knowledge-galaxy.mjs",
  "generate-layer-bridges.mjs",
  "generate-stagnant-features.mjs",
  "generate-misc-tasks-features.mjs",
  "generate-college-course-features.mjs",
  "generate-resource-pdf-features.mjs",
  "generate-pdf-course-bridge-features.mjs",
  "generate-cadcam-training-corpus-features.mjs",
  "generate-extracted-pdf-tips-features.mjs",
  "generate-milling-extracted-pdf-bridge.mjs",  // VIZ-XGAL-MILL-PDF-WIRE (slot:sierra 2026-06-23) -- bridges 77 whiskey-extracted milling-PDF rows to the L10 jm_die_tribal_wiki_corpus roost as L11 extracted-pages nodes + consumed-by/feeds-wizard edges to KnowledgeCurriculumBridgeEngine + MillMasterOrchestratorFacadeEngine. Was foxtrot's untracked dual-reg orphan (2026-05-26); hardened (fail-soft peer-aug) + edge-ids corrected to real eng.* nodes. merge loadOptional's milling-extracted-pdf-bridge-augmentation.json.
  "generate-post-pdf-corpus-features.mjs",  // POST-PDF-NODE-MS0/U-POST-PDF-CORPUS-NODE (slot:echo 2026-05-26) — Post-Processor Training Guide + Postability UPK as 16 nodes + 26 bridge edges to PRISM post engines
  "generate-jm-die-tribal-wiki-features.mjs",  // POST-PDF-NODE-MS0/U-JM-TRIBAL-WIKI-CORPUS (slot:echo iter8 2026-05-26) — 80-PDF JM Die TRIBAL+WIKI consolidated corpus (1.1GB) → 88 nodes + 167 bridge edges across 7 domains (mill/lathe/cam/cad/wire/post/reference)
  "generate-cited-tips-viz-features.mjs",  // POST-PDF-NODE-MS0/U-CITED-TIPS-VIZ (slot:echo iter17 2026-05-26) — 6 per-controller cited-tip TS files emitted from iter9-13 curriculum pipeline → 13 nodes + 11 bridge edges to MasterPostProcessor + per-controller post engines
  "generate-pdf-coverage-features.mjs",
  "generate-soul-health-features.mjs",
  "generate-token-savings-pivot-features.mjs",
  "generate-forge-audit-token-context-features.mjs",
  "generate-link-audit-features.mjs",
  "generate-wiki-tribal-features.mjs",
  "generate-tribal-density-features.mjs",
  "generate-substrate-meta-roost-features.mjs",
  "generate-galaxy-federation-roost-features.mjs",  // GALAXY-CONTEXT-FEDERATION-MS0/U-GCF-VIZ-ROOST (slot:alpha 2026-06-01) — ghost.galaxy_federation + 5 child roosts (cards/digest/knows-map/dedup/savings); merge loadOptional's galaxy-federation-roost-augmentation.json.
  "generate-ai-memo-xref-features.mjs",
  "consolidate-roadmaps.mjs",
  "generate-bridge-synergy-features.mjs",
  "generate-bridge-priority-features.mjs",  // COMBO-EFFICIENCY-MS0/P1-U03 viz wire (slot:alpha 2026-05-25)
  "generate-slot-binding-features.mjs",  // SLOT-BRIDGE-MS0/U-SBB06 viz wire (slot:alpha 2026-05-26) — slot-binding health
  "generate-priority-queue-features.mjs",
  "generate-dream-artifacts-features.mjs",  // DREAM-RECEIPT-MS0/U-DR09 (slot:bravo 2026-05-26) — ghost.dream_artifacts roost for Hermes Dreaming v0.1.0 receipt-bundle artifacts
  "generate-hermes-features.mjs",  // HERMES-APP-INCORPORATION-MS0/U-HERMES-VIZ-ROOST (slot:bravo 2026-06-05) — ghost.hermes_app roost: Nous Hermes desktop app (skills/cron/outputs) + native-MCP bridges edge to tr.mcp.
  "generate-testing-infra-features.mjs",  // TESTING-INFRA-MS0/U-AXIS1-VIZ-CLOSURE (slot:tango 2026-05-26) — ghost.testing_infra roost + 4 axis-engine pass-rate dashboards
  // NOTE: "generate-slot-queue-features.mjs" removed 2026-06-10 (U-VIZ-SLOTQUEUE-ORPHAN, sierra): the file never existed (never git-tracked) -> MODULE_NOT_FOUND exit-1 every regen since golf's U-FD06 2026-05-25 added the FAST[] entry + a merge loadOptional("slot-queue-augmentation.json") consumer but never committed the generator. Re-add ONLY together with the actual generator (must emit slot-queue-augmentation.json) per the FAST[]+splice both-or-neither rule. The merge loadOptional stays (harmless null until then).
  "generate-chat-slot-nodes-features.mjs",  // ZULU-CHAT-SLOT-NODES-MS0 (slot:bravo 2026-05-25): 26 NATO chat-slot nodes + PSN synergy edges
  "generate-database-surfaces-roost.mjs",
  "generate-episode-store-features.mjs",
  "generate-hybrid-retrieval-features.mjs",
  "generate-cag-router-features.mjs",  // TOKEN-SAVINGS-PIVOT/U-CAG-DASHBOARD (sierra 2026-05-27) — ghost.cag_router roost surfacing CAG-route producer/consumer/helper + live sidecar tier distribution.
  "generate-quoting-pipeline-features.mjs",  // U-VIZ-FAST-REGISTER (sierra 2026-05-29) — was orphaned from FAST[]; verified clean run (exit 0, 24 nodes) + merge loadOptional's quoting-pipeline-augmentation.json. First of the 9-generator FAST[] gap (U-VIZ-FAST-REGISTER-9); other 8 use non-literal outputs → per-generator verification pending.
  "run-hotel-domain-features.mjs",  // U-VIZ-FAST-REGISTER-9 (sierra 2026-05-29) — the RUNNER (generate-* is a pure lib, no main). Fixed producer/consumer path mismatch: runner wrote to staging/ but merge loadOptional reads VIZ_DIR root; now writes root. Verified standalone (381 nodes, 3 roosts) + merge splice line ~1529 consumes hotelDomain.newNodes.
  "generate-milling-tribal-tip-bridge-features.mjs",  // U-VIZ-FAST-REGISTER-9 (sierra 2026-05-30) — measured 12 nodes/24 edges, writes VIZ_DIR root, newNodes/newEdges + proper shape; merge loadOptional's milling-tribal-tip-bridge-augmentation.json.
  "generate-svi-component-features.mjs",  // U-VIZ-FAST-REGISTER-9 (sierra 2026-05-30) — measured 15 nodes/14 edges; output→VIZ_DIR root this commit; merge loadOptional's svi-component-features.json (nodes/edges, kind-normalized). Fail-softs to no-write if PSI_PATH absent.
  "generate-vendor-catalog-features.mjs",  // U-VIZ-FAST-REGISTER-9 (sierra 2026-05-30) — measured 45 nodes/44 edges; output→VIZ_DIR root this commit; merge loadOptional's vendor-catalog-features.json (nodes/edges, kind-normalized).
  "generate-launch-readiness-features.mjs",
  "generate-extracted-modules-features.mjs",
  "generate-extracted-modules-detail-features.mjs",  // slot:papa 2026-05-26 — per-file detail layer (top-200 WIRE + 208 DB + 111 DUP + 134 PARTIAL with bridge edges to matched engines)
  "generate-gnn-embed-bridge-features.mjs",
  "generate-post-gap-features.mjs",
  "generate-rag-upgrade-features.mjs",
  "generate-feature-gap-features.mjs",
  "generate-domain-pipeline-features.mjs",
  "generate-slot-synergy-features.mjs",
  "generate-docker-mcp-features.mjs",
  "generate-echo-viz-layers-features.mjs",
  "generate-engine-graph.mjs",
  "generate-hook-bridges.mjs",
  "generate-frontend-pages.mjs",
  "generate-combo-detector.mjs",
  "generate-engine-saturate.mjs",
  "generate-wiki-entries.mjs",
  "generate-formulas-atomic.mjs",
  "generate-personas-expand.mjs",
  "generate-skills-atomic.mjs",
  "generate-schemas-atomic.mjs",
  "generate-algorithms-atomic.mjs",
  "generate-transport-expand.mjs",
  "generate-ai-tier-expand.mjs",
  "generate-actions-atomic.mjs",
  "generate-hooks-atomic.mjs",
  "generate-tests-atomic.mjs",
  "generate-scripts-atomic.mjs",
  "generate-scripts-lib-atomic.mjs",
  "generate-milestone-envelope-atomic.mjs",
  "generate-slot-touch-augmentation.mjs",
  "validate-ghost-wires.mjs",
  "generate-memories-atomic.mjs",
  "generate-registry-entries.mjs",
  "generate-action-engine-edges.mjs",
  "generate-engine-reclassify.mjs",
  "generate-cam-vendor-catalog.mjs",
  "generate-ts-registry-entries.mjs",
  "generate-engine-import-edges.mjs",
  "generate-test-coverage-edges.mjs",
  "generate-physics-atomic.mjs",
  "generate-jm-die-customers.mjs",
  "generate-schema-engine-edges.mjs",
  "generate-engine-physics-edges.mjs",
  "generate-cross-substrate-edges.mjs",  // U-XSUB-FAST-REGISTER (sierra 2026-06-03): pairs with merge-augmentations xsub splice — FAST[]+splice both-or-neither; runs after galaxy-constituents(95)+chat-slot-nodes so its inputs are fresh
  "generate-frontend-deep.mjs",
  "generate-wiki-cross-refs.mjs",
  "generate-extracted-data-atomic.mjs",
  "generate-data-catalogs-atomic.mjs",
  "generate-git-tree.mjs",
  "generate-vault-graph.mjs",
  "generate-untracked-files-atomic.mjs",
  "generate-octopus-consensus-features.mjs",  // PSN-OCTOPUS-FLEET-SYNERGY-MS0/U-FLEET-CONSUME-VIZ (slot:bravo 2026-06-01) — per-galaxy octopus consensus from the U-FLEET-CONSUME feeds → ghost.octopus_consensus roost; merge loadOptional's octopus-consensus-augmentation.json (self-contained cluster, internal-only edges). Empty until a live dispatch publishes.
  "generate-predicted-edges-features.mjs",  // BLACKWELL-AI-MS0/U-GNN-EDGE-PREDICT-VIZ (slot:india 2026-06-09) — top predicted MISSING knowledge edges (GraphSAGE link-prediction over node-embeddings-768d) → ghost.predicted_edges roost; merge loadOptional's predicted-missing-edges-augmentation.json (self-contained cluster, internal-only contains edges). Runs after generate-cross-substrate-edges (181) so its existing-edges input is fresh. Empty (no root) when no high-confidence predictions.
];
const HEAVY = [
  "generate-fs-deep-inventory.mjs",
  "generate-l11-file-leaves.mjs",
  "h-drive-skipped-census.mjs",  // U-VIZ-AUG-STALE-REWIRE (sierra 2026-06-22): was STALE-ORPHAN 1067h. Validated exit 0 in 65s -- recursive FS walk of excluded trees (node_modules/.git/dist across all H:/prism-* worktrees + H:/ system dirs); too slow for FAST[] but correct for --full. NO graph load. merge folds skippedCensus (~line 152 -> G.meta.skippedTrees ~533-541).
  "augment-graph-with-awareness.mjs",  // U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX (sierra 2026-06-22): was STALE-ORPHAN + BROKEN (V8 512MiB string cap on the 781MB graph). Migrated off JSON.parse(readFileSync utf8) to readGraphStreaming (graph-io.mjs) -> exit 0 in 11s, augments 351,265 nodes with svi/testCount/complexity/coverage. Loads the FULL graph so HEAVY[] (--full) only. merge folds awareness (~line 143 -> n.awareness).
  "build-business-value-map.mjs",  // U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX (sierra 2026-06-22): was STALE-ORPHAN + BROKEN (same V8 cap). Migrated to readGraphStreaming -> exit 0 in 12s, tags revenue/cost-saving/safety/customer per node. FULL-graph load so HEAVY[] only. merge folds business (~line 145 -> n.businessValue + G.meta.businessValueTotals).
  // STILL STALE-ORPHAN after U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX (documented, R12 -- not silently dropped):
  //   - h-drive-exhaustive-audit.json: producer is a .ps1 (Get-Volume/vssadmin/Get-ChildItem -Force -- needs elevation for VSS/$Recycle.Bin); the node-only HEAVY runner cannot host it. Refresh via an elevated Windows Scheduled Task (the install-fleet-reaper-task.ps1 SYSTEM pattern). -> operator-gated.
  //   - engine-spotlight.json: hand-curated static catalog, NO generator by design (see its merge-augmentations.mjs loadOptional comment). keep-as-is.
];

const args = process.argv.slice(2);
const wantFull = args.includes("--full");
const scripts = wantFull ? [...FAST, ...HEAVY] : FAST;

// Dual-registration preflight (U-VIZ-DUALREG, sierra 2026-06-22): a FAST[] entry whose generator
// file is missing crashes this entire regen with MODULE_NOT_FOUND (the slot-queue regression that
// broke regen for ~2 weeks). Catch it BEFORE the ~3-min run. Advisory by default; aborts only when
// PRISM_VIZ_DUALREG_STRICT=1. Disable: PRISM_VIZ_DUALREG_PREFLIGHT=0. Pure static analysis (no graph load).
if (process.env.PRISM_VIZ_DUALREG_PREFLIGHT !== "0") {
  try {
    const audit = auditDualRegistration({ root: ROOT });
    if (audit.crashRisks.length) {
      console.error(`[regen-viz] DUAL-REG: ${audit.crashRisks.length} FAST[] entr(y/ies) have NO generator file -> regen will crash: ${audit.crashRisks.join(", ")}`);
      if (process.env.PRISM_VIZ_DUALREG_STRICT === "1") process.exit(2);
    }
    if (audit.silentDiscards.length) {
      console.warn(`[regen-viz] DUAL-REG: ${audit.silentDiscards.length} FAST[] generator(s) with NO merge splice (ghost data silently dropped): ${audit.silentDiscards.map((d) => d.file).join(", ")}`);
    }
  } catch (e) {
    console.warn(`[regen-viz] dual-reg preflight skipped: ${e.message}`);
  }
}

// --stack-size=8192 (8 MB JS stack) is required: the merged system-graph.json
// is >90 MB and V8's JSON.stringify recursion blows the default ~1 MB Windows
// thread stack ("StackOverflowException", exit -1073741571) when serializing it.
// Applied to every child so generators that round-trip the graph survive too.
// Heap ceiling for every spawned stage. Bumped 16384→24576 (16→24GB) 2026-05-29 (slot:sierra,
// U-VIZ-MERGE-HEAP-HEADROOM): the merge stage intermittently OOM'd (exit 134 "Reached heap
// limit") at 16GB on the grown 576MB / ~244K-node graph — see .last-regen-failure.json
// 2026-05-29T01:47. The merge needs ~12GB resident minimum; 16GB headroom became too thin as
// the graph grew. Host has 136GB total / 71GB free, so 24GB is safe headroom. Stages run
// sequentially (one spawnSync at a time), so peak is one 24GB process. If 24GB still
// intermittently OOMs as the graph grows further, bump to 32768 (host supports it).
const NODE_ARGS = ["--max-old-space-size=24576", "--stack-size=8192"];

console.log(`[regen-viz] running ${scripts.length} generator(s)${wantFull ? " (FULL)" : " (fast)"}…`);
const t0 = Date.now();
let failed = 0;
let findCacheDegraded = false; // find-cache sidecar still stale after retry (audit 2026-06-14 P1-2 visibility)
for (const s of scripts) {
  const abs = path.join(ROOT, "scripts", s);
  const start = Date.now();
  const r = spawnSync(process.execPath, [...NODE_ARGS, abs], { stdio: "inherit", cwd: ROOT });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  if (r.status !== 0) {
    console.error(`[regen-viz] ✗ ${s} failed (exit ${r.status}, ${elapsed}s)`);
    failed++;
  } else {
    console.log(`[regen-viz] ✓ ${s}  (${elapsed}s)`);
  }
}

// U-REGEN-VIZ-MERGE-FAILLOUD: snapshot pre-merge state so we can detect a
// silent no-op merge (exit 0 with no graph delta despite augmentations on
// disk). And — crucially — abort BEFORE the post-merge stages on any merge
// failure: those stages read system-graph.json and publish downstream
// artifacts (EXECUTIVE-BRIEFING, WIKI-DEBT-WORKLIST, obsidian-augmentation)
// against the stale pre-merge graph, then drift-gate falsely certifies
// "clean" because stale != truncated. Karpathy R12 — fail loud.
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH_PATH = path.join(VIZ_DIR, "system-graph.json");
const preMergeNodeCount = readGraphNodeCount(GRAPH_PATH);
const augTotalBytes = readAugmentationByteTotal(VIZ_DIR);

// U-VIZ-F11-CROSS-LOCK: acquire the shared system-graph.json write lock
// BEFORE the merge → post-merge subprocess chain. F1 (dd735c1871) gave
// generate-system-viz.mjs its own OUT_FILE; F11 closes the remaining racer
// pair — regen-viz held NO lock, so system-viz-add-node.mjs flushQueue
// could atomic-write the graph mid-chain and a later regen stage would
// silently overwrite the appended nodes (lost update). One parent-held
// lock covers every spawned child stage; add-node now DEFERS while it is
// held (its TIER-1b check). The only other writer of THIS pid file is a
// second regen-viz — so a held lock means a concurrent regen is running:
// skip loud (exit 3, distinct from 0=ok / 1=fail) rather than race it.
// Auto-release is installed via process.once('exit') because regen-viz
// hard-exits from mid-chain fail-loud branches (merge-guard abort line,
// drift-gate) where a try/finally would never run.
const __f11Lock = acquireGraphWriteLock();
if (!__f11Lock.acquired) {
  console.error(
    `[regen-viz] ✗ another system-graph.json writer holds the cross-lock ` +
    `(pid ${__f11Lock.heldBy}) — a concurrent regen-viz is running. ` +
    `Skipping this run to avoid a lost-update clobber of the merged graph. ` +
    `Retry after it completes (lock: ${__f11Lock.path}).`,
  );
  // EXIT 4 (not 3): a benign concurrent-skip must be distinguishable from
  // the merge-guard's EXIT_MERGE_NO_OP=3 suspected-corruption signal —
  // they demand opposite operator responses. (3-of-3 P0 fix.)
  process.exit(EXIT_GRAPH_WRITE_LOCK_SKIP);
}
installGraphWriteLockReleaseOnExit();
console.log(`[regen-viz] system-graph.json write-lock acquired (pid ${process.pid})`);

console.log(`[regen-viz] merging…  (pre-merge: ${preMergeNodeCount} nodes · augmentations: ${(augTotalBytes / 1e6).toFixed(1)} MB)`);
const m = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "merge-augmentations.mjs")], {
  stdio: "inherit", cwd: ROOT,
});
const postMergeNodeCount = readGraphNodeCount(GRAPH_PATH);
const guard = decideMergePostState({
  mergeStatus: m.status,
  mergeSignal: m.signal,
  preMergeNodeCount,
  postMergeNodeCount,
  augTotalBytes,
});
if (guard.abort) {
  console.error(`[regen-viz] ✗ ${guard.message}`);
  console.error(`[regen-viz] ABORTING — running post-merge stages against a stale graph would corrupt:`);
  console.error(`[regen-viz]   • engine classification (operates on missing nodes)`);
  console.error(`[regen-viz]   • obsidian backlinks (writes wiki/memory hits against stale node set)`);
  console.error(`[regen-viz]   • executive briefing + wiki-debt worklist (publishes stale headlines)`);
  console.error(`[regen-viz]   • drift-gate (would falsely certify stale graph as clean)`);
  console.error(`[regen-viz] Diagnose directly: node ${NODE_ARGS.join(" ")} scripts/merge-augmentations.mjs`);
  process.exit(guard.exitCode);
}

// Post-merge FRESHNESS POSTFLIGHT (U-VIZ-FRESHNESS-POSTFLIGHT, sierra 2026-06-22): symmetric to the
// dual-reg PREflight above. The merge just folded every augmentation listed in merge-augmentations.mjs
// into the graph -- but GREEN means "re-merged recently", NOT "the folded inputs are fresh". A generator
// not in FAST[]/HEAVY[] (or broken) leaves its augmentation frozen, so the merge folds days-old data
// every regen. This makes the REGEN ITSELF report that at the source -- today staleness only surfaces via
// the per-prompt sierra-graph-health hook, which misses cron / other-slot / manual regens. Advisory
// (warn only, never aborts -- mirrors the audit's own non-strict default). Disable: PRISM_VIZ_FRESHNESS_POSTFLIGHT=0.
if (process.env.PRISM_VIZ_FRESHNESS_POSTFLIGHT !== "0") {
  try {
    const mergeSrc = fs.readFileSync(path.join(ROOT, "scripts", "merge-augmentations.mjs"), "utf8");
    const fVizDir = path.join(ROOT, "state", "shared", "system-viz");
    const fThresholds = freshnessThresholdsFromEnv(); // same env knobs the CLI audit honors -> identical counts
    const fNow = Date.now();
    const freshRows = classifyAugmentationFreshness(parseMergedAugmentations(mergeSrc), {
      dir: fVizDir, now: fNow, ...fThresholds,
    });
    const freshReport = buildFreshnessReport(freshRows, { now: fNow, vizDirRel: "state/shared/system-viz", thresholds: fThresholds });
    const fresh = freshReport.summary;
    // Refresh the .augmentation-freshness.json sidecar that sierra-graph-health-inject.mjs reads, so the
    // awareness surface reflects THIS regen (previously only a manual `audit-augmentation-freshness.mjs`
    // run refreshed it -> the badge could lag the live graph). Byte-identical shape to the audit's sidecar
    // (shared buildFreshnessReport). Best-effort: a write failure must never fail the regen (U-VIZ-POSTFLIGHT-SIDECAR).
    try { atomicWriteText(path.join(fVizDir, ".augmentation-freshness.json"), JSON.stringify(freshReport)); } catch { /* best-effort */ }
    if (fresh.alarm) {
      console.warn(`[regen-viz] FRESHNESS: ${fresh.staleOrphan} STALE-ORPHAN augmentation(s) just folded with NO fresh producer (days-old data is now in the graph): ${fresh.orphanList.join(", ")}`);
      console.warn(`[regen-viz]   Fix: wire the generator into FAST[]/HEAVY[], or remove its loadOptional() from merge-augmentations.mjs. Detail: node scripts/audit-augmentation-freshness.mjs`);
    } else {
      console.log(`[regen-viz] freshness postflight: ${fresh.fresh}/${fresh.total} fresh, ${fresh.staleManual ?? 0} stale-manual (intentional out-of-band producer), 0 stale-orphan (sidecar refreshed).`);
    }
  } catch (e) {
    console.warn(`[regen-viz] freshness postflight skipped: ${e.message}`);
  }
}

// Post-merge graph repair: reclassify eng.other.X engines using dispatcher
// invocation signal + keyword tokens. Without this, every regen leaks engines
// back into eng.other because engine-graph.mjs has no domain awareness.
console.log(`[regen-viz] post-merge repair: engine classification…`);
const r = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "repair-graph-engine-classification.mjs")], {
  stdio: "inherit", cwd: ROOT,
});
if (r.status !== 0) {
  console.error(`[regen-viz] ✗ repair failed`);
  failed++;
}

// Post-repair dedup: remove duplicate-id nodes left by repair-vs-engine-graph
// id collisions. Idempotent (no-op if already deduped).
console.log(`[regen-viz] post-merge dedup…`);
const d = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "dedup-graph-nodes.mjs")], {
  stdio: "inherit", cwd: ROOT,
});
if (d.status !== 0) {
  console.error(`[regen-viz] ✗ dedup failed`);
  failed++;
}

// Post-dedup restructure: re-parent catalog file nodes under manufacturer hubs,
// and build the JM-Die file-type → machine-type hierarchy. Idempotent.
console.log(`[regen-viz] post-merge restructure: categories by manufacturer / file-type…`);
const rc = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "reparent-viz-categories.mjs")], {
  stdio: "inherit", cwd: ROOT,
});
if (rc.status !== 0) {
  console.error(`[regen-viz] ✗ reparent failed`);
  failed++;
}

// Parent → child "contains" edges: the atomic generators attach leaf-record nodes
// (planned-unit / extract_record / datacat_record / git_commit / combo / …) via a
// `parent` field but no edge, leaving ~2.7k degree-0 nodes. This adds the missing
// edges so traversal / Cypher export / recall hooks can reach the leaves. Runs after
// reparent (which may re-set `parent` fields). Idempotent.
console.log(`[regen-viz] add parent→child contains edges (de-orphan leaf records)…`);
const pe = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "add-parent-contains-edges.mjs")], {
  stdio: "inherit", cwd: ROOT,
});
if (pe.status !== 0) {
  console.error(`[regen-viz] ✗ add-parent-contains-edges failed`);
  failed++;
}

// NN-GRAPH-MS2 U1 — reference-pool seed. Re-emit the high-confidence
// `ghost.unwired-engine` nodes (engine-on-disk with no dispatcher ref →
// inferred dispatcher + confidence) that the GNN tier-5 cascade
// (seed-ghost-gnn-classify.mjs) and nn-graph-eval.mjs read as the labeled
// reference pool. MUST run post-merge: seed-ghost-from-unwired.mjs writes
// system-graph.json DIRECTLY, so a pre-merge/FAST pass would be wiped by the
// merge rebuild (and FAST stages are invoked arg-less — they cannot pass
// --apply). Without this stage every regen leaves the graph with 0 ghost
// nodes → nn-graph-eval defers `insufficient-reference-pool` (poolSize:0) →
// the GNN tier is permanently dormant by data, not by code. Idempotent:
// --apply updates/inserts by engine, never duplicates.
console.log(`[regen-viz] seed NN-GRAPH reference ghosts (unwired-engine pool)…`);
const sg = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "seed-ghost-from-unwired.mjs"), "--apply"], {
  stdio: "inherit", cwd: ROOT,
});
if (sg.status !== 0) {
  console.error(`[regen-viz] ✗ seed-ghost-from-unwired failed`);
  failed++;
}

// Obsidian 2nd-brain bridge — re-scan the merged graph + the H:/prism/knowledge vault
// and refresh obsidian-augmentation.json (per-node wiki/memory backlinks). MUST run
// after the merge (it needs the full node set), so its output lands on the NEXT
// regen's merge — the bridge ALSO patches system-graph.json's node.knowledge fields
// directly so the link isn't a regen behind. Heavy-ish (scans ~13.8k wiki files):
// only --full runs it; the FAST path keeps yesterday's backlinks (still useful).
if (wantFull) {
  console.log(`[regen-viz] obsidian bridge: refresh vault backlinks…`);
  const ob = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "system-viz-obsidian-bridge-v2.mjs")], {
    stdio: "inherit", cwd: ROOT,
  });
  if (ob.status !== 0) { console.error(`[regen-viz] ✗ obsidian-bridge failed (non-fatal)`); }
}

// Master-index sidecar — pre-built inverted index for master-index search.
// The merged system-graph.json is ~372 MB; loadGraph parsing it INLINE in the
// per-prompt master-index hook is fatal (the hook has a 2-5 s budget).
// build-graph-index.mjs builds the compact ~105 MB system-graph-index.json
// sidecar; loadGraph's fast-path then reconstructs the full 243K-node index
// from it in ~1.5 s (measured). This stage adds ~70 s (measured) to EVERY
// regen — post-commit + hourly cron — accepted: a fresh sidecar every regen
// is what keeps the per-prompt hook off the slow path. MUST run after the
// last graph writer (obsidian-bridge on --full, seed-ghost on the fast path)
// so the sidecar indexes the FINAL graph, and inside regen-viz's held
// graph-write lock so the read is consistent. Spawned with NODE_ARGS (16 GB
// heap), so build-graph-index's self-re-exec is a no-op. Non-fatal — a
// stale/absent sidecar only degrades master-index search to the legacy
// fallback; the graph itself is unaffected, so (like the obsidian-bridge /
// wiki-debt derived-artifact stages) it does NOT increment `failed`.
console.log(`[regen-viz] build master-index sidecar (system-graph-index.json)…`);
const si = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "build-graph-index.mjs")], {
  stdio: "inherit", cwd: ROOT,
});
if (si.status !== 0) {
  console.error(`[regen-viz] ✗ build-graph-index failed (non-fatal — master-index search falls back to legacy)`);
}

// Vault-backlink reverse index — inverts the node-cards.jsonl emitted by the
// build-graph-index stage above into vault-backlinks.json (vault doc → graph
// node-ids, the reverse of node-card). MUST run AFTER build-graph-index (the
// forward-edge writer) and inside the held graph-write lock so it streams a
// consistent post-merge node-cards.jsonl. THE DEFECT THIS CLOSES: the reverse
// index was built ONLY by manual invocation, so node-cards.jsonl regenerated
// every regen while vault-backlinks.json went stale (the reader's staleness
// gate then fired ⚠STALE fleet-wide until a hand-rebuild). Path agreement is
// automatic — build-vault-backlink-index defaults CARDS_PATH to the same
// node-cards.jsonl this dir holds. It only READS node-cards.jsonl + WRITES
// vault-backlinks.json (never system-graph.json), so it is NOT a second
// concurrent graph writer (one-writer-per-path satisfied). Non-fatal — a
// stale/absent reverse index only degrades the doc→node lookup; the graph is
// unaffected, so (like the sidecar stages) it does NOT increment `failed`.
console.log(`[regen-viz] build vault-backlink reverse index (vault-backlinks.json)…`);
const vb = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "build-vault-backlink-index.mjs")], {
  stdio: "inherit", cwd: ROOT,
});
if (vb.status !== 0) {
  console.error(`[regen-viz] ✗ build-vault-backlink-index failed (non-fatal — reverse vault→node lookup degrades / stays stale)`);
}

// Node-adjacency sidecar — capped top-K in/out neighbors per node for the
// blast-radius side-panel (/api/node-neighbors in _server.cjs). Like the
// master-index sidecar above, it indexes the FINAL merged graph, so it MUST
// run here — after the last writer, inside the held graph-write lock — or it
// goes stale after every regen (the defect this stage closes: build-viz-adjacency
// was previously only run by hand). Non-fatal — a stale/absent node-adjacency.json
// only degrades the blast-radius panel to "no neighbors"; the graph is
// unaffected, so it does NOT increment `failed`. NODE_ARGS supplies the heap.
console.log(`[regen-viz] build node-adjacency sidecar (node-adjacency.json)…`);
const na = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "build-viz-adjacency.mjs")], {
  stdio: "inherit", cwd: ROOT,
});
if (na.status !== 0) {
  console.error(`[regen-viz] ✗ build-viz-adjacency failed (non-fatal — blast-radius panel shows no neighbors)`);
}

// Find-cache sidecar — slim 6-field per-node projection for findInGraph(), the
// substrate behind viz-first-redirect.mjs + the four pre-*-graph-inject hooks
// (~1060 `find` calls/day from fresh node subprocesses). Like the two sidecars
// above it indexes the FINAL merged graph, so it MUST run here — after the last
// writer, inside the held graph-write lock. THE DEFECT THIS CLOSES: find-cache
// was built ONLY lazily, by the first `find` that cache-missed after a regen,
// paying the full graph cold-parse INSIDE the hook's ~1500ms budget → timeout →
// the node-context inject silently failed fleet-wide. Building it eagerly here
// means no hook subprocess ever pays the cold parse. Reuses the SAME
// writeSidecarAtomic primitive as the lazy path (byte-identical sidecar). Non-
// fatal — a stale/absent find-cache only makes the next `find` self-heal via the
// slow path; the graph is unaffected, so it does NOT increment `failed`.
console.log(`[regen-viz] build find-cache sidecar (find-cache.json)…`);
// VERIFY THE ARTIFACT, not just the exit code: a 0 exit with a stale/absent
// sidecar is the silent rot that left find-cache STALE-while-graph-FRESH (audit
// 2026-06-14 P1-2) -- the eager build above exists precisely to spare hook
// subprocesses the cold-parse timeout, so a silently-failed build reintroduces
// the exact defect. The proven failure mode is TRANSIENT, so retry once; if it
// is STILL stale after the retry, surface it in the run summary instead of a
// lone stderr line that scrolls away. Graph integrity is unaffected, so it
// stays out of `failed`.
const FIND_CACHE_PATH = path.join(VIZ_DIR, "find-cache.json");
const buildFindCache = () =>
  spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "regen-find-cache.mjs")], {
    stdio: "inherit", cwd: ROOT,
  }).status;
const findCacheFresh = () => {
  try { return fs.statSync(FIND_CACHE_PATH).mtimeMs >= fs.statSync(GRAPH_PATH).mtimeMs; }
  catch { return false; }
};
let fcStatus = buildFindCache();
if (fcStatus !== 0 || !findCacheFresh()) {
  console.error(`[regen-viz] ⚠ find-cache build failed/stale (status=${fcStatus}) -- retrying once...`);
  fcStatus = buildFindCache();
}
if (fcStatus !== 0 || !findCacheFresh()) {
  findCacheDegraded = true;
  console.error(`[regen-viz] ✗ find-cache STILL stale after retry (status=${fcStatus}) -- node-context injects will pay the cold-parse timeout until the next clean regen. Recover: node scripts/regen-find-cache.mjs`);
}

// Executive briefing — regenerate the boss-audit landing doc from the fresh
// graph + BUILD_STATE + SVI + revenue/milestone artifacts. Served at /briefing.
console.log(`[regen-viz] regenerate executive briefing…`);
const eb = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "generate-executive-briefing.mjs")], {
  stdio: "inherit", cwd: ROOT,
});
if (eb.status !== 0) {
  console.error(`[regen-viz] ✗ executive-briefing failed`);
  failed++;
}

// Wiki-debt worklist — rank the L4/L5 nodes with no (dedicated) wiki page by
// leverage×degree → WIKI-DEBT-WORKLIST.md (companion to the brain viewer's
// 📚 docs-coverage overlay; feeds /curiosity-queue + /wiki-ingest).
console.log(`[regen-viz] regenerate wiki-debt worklist…`);
const wd = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "generate-wiki-debt-worklist.mjs")], {
  stdio: "inherit", cwd: ROOT,
});
if (wd.status !== 0) { console.error(`[regen-viz] ✗ wiki-debt worklist failed (non-fatal)`); }

// Dead-edge integrity sweep (sierra U-VIZ-DEAD-PIXEL-WIRE 2026-05-30) — surface
// referenced-but-missing edge targets so the ~15K-dead-edge signal is TRACKED per
// regen instead of invisible. Root cause is id-scheme mismatch in a few producers
// (`dispatcher.prism_X` should be `disp.*`; `engine.<Pascal>` should be `eng.<domain>`).
// Advisory / non-fatal — writes state/shared/system-viz-dead-pixels-<date>.{md,json}.
console.log(`[regen-viz] dead-edge integrity sweep…`);
const dp = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "system-viz-dead-pixel-sweep.mjs")], {
  stdio: "inherit", cwd: ROOT,
});
if (dp.status !== 0) { console.error(`[regen-viz] ✗ dead-pixel sweep failed (non-fatal)`); }

// augmentation-freshness audit (U-VIZ-AUG-FRESHNESS-GUARD, sierra): refresh the
// .augmentation-freshness.json sidecar so sierra-graph-health-inject surfaces any
// merged-but-stale augmentation (a retired/failed producer whose stale data keeps
// folding into the graph behind a GREEN badge). Advisory (no --strict) -- the audit's
// own report is inherited into this log; it never fails the regen.
const afr = spawnSync(process.execPath, [path.join(ROOT, "scripts", "audit-augmentation-freshness.mjs")], {
  stdio: "inherit", cwd: ROOT,
});
if (afr.status !== 0) { console.error(`[regen-viz] ⚠ augmentation-freshness audit exited ${afr.status} (advisory -- .augmentation-freshness.json may be stale)`); }

// W4 / U-DRIFT-HARD-FAIL: post-build integrity gate. Regenerate the drift
// report against the just-built graph and HARD-FAIL on truncated/root-missing
// (a structurally incomplete graph must not silently ship as a clean regen).
console.log(`[regen-viz] drift integrity gate…`);
const driftFail = runDriftGate({ regenerate: true });

const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
if (findCacheDegraded) console.error(`[regen-viz] ⚠ DEGRADED: find-cache sidecar STALE after retry -- node-context injects degrade until the next clean regen (recover: node scripts/regen-find-cache.mjs · check: node scripts/system-viz-query.mjs cache-status)`);
console.log(`[regen-viz] done in ${totalSec}s · failed=${failed} · driftFail=${driftFail} · findCacheDegraded=${findCacheDegraded}`);

// Fail loud (Karpathy R12). Previously regen-viz logged `failed=N` but exited
// 0 — a failed merge/repair or a structurally-incomplete graph looked like
// success to cron/CI/operators. Now: any build-step failure OR a drift hard
// fail → non-zero exit.
process.exit(failed > 0 || driftFail ? 1 : 0);
