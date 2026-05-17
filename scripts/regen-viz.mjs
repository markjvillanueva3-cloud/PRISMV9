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
import {
  decideMergePostState,
  readGraphNodeCount,
  readAugmentationByteTotal,
} from "./lib/regen-viz-merge-guard.mjs";

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
    const dd = spawnSync(process.execPath, [path.join(ROOT, "scripts", "detect-system-viz-drift.mjs")], {
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
  "generate-staleness-overlay.mjs",
  "generate-wiring-overlay.mjs",
  "generate-galaxy-constituents.mjs",
  "generate-knowledge-galaxy.mjs",
  "generate-layer-bridges.mjs",
  "generate-stagnant-features.mjs",
  "generate-misc-tasks-features.mjs",
  "consolidate-roadmaps.mjs",
  "generate-bridge-synergy-features.mjs",
  "generate-priority-queue-features.mjs",
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
  "generate-frontend-deep.mjs",
  "generate-wiki-cross-refs.mjs",
  "generate-extracted-data-atomic.mjs",
  "generate-data-catalogs-atomic.mjs",
  "generate-git-tree.mjs",
  "generate-vault-graph.mjs",
  "generate-untracked-files-atomic.mjs",
];
const HEAVY = [
  "generate-fs-deep-inventory.mjs",
  "generate-l11-file-leaves.mjs",
];

const args = process.argv.slice(2);
const wantFull = args.includes("--full");
const scripts = wantFull ? [...FAST, ...HEAVY] : FAST;

// --stack-size=8192 (8 MB JS stack) is required: the merged system-graph.json
// is >90 MB and V8's JSON.stringify recursion blows the default ~1 MB Windows
// thread stack ("StackOverflowException", exit -1073741571) when serializing it.
// Applied to every child so generators that round-trip the graph survive too.
const NODE_ARGS = ["--max-old-space-size=16384", "--stack-size=8192"];

console.log(`[regen-viz] running ${scripts.length} generator(s)${wantFull ? " (FULL)" : " (fast)"}…`);
const t0 = Date.now();
let failed = 0;
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

// W4 / U-DRIFT-HARD-FAIL: post-build integrity gate. Regenerate the drift
// report against the just-built graph and HARD-FAIL on truncated/root-missing
// (a structurally incomplete graph must not silently ship as a clean regen).
console.log(`[regen-viz] drift integrity gate…`);
const driftFail = runDriftGate({ regenerate: true });

const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`[regen-viz] done in ${totalSec}s · failed=${failed} · driftFail=${driftFail}`);

// Fail loud (Karpathy R12). Previously regen-viz logged `failed=N` but exited
// 0 — a failed merge/repair or a structurally-incomplete graph looked like
// success to cron/CI/operators. Now: any build-step failure OR a drift hard
// fail → non-zero exit.
process.exit(failed > 0 || driftFail ? 1 : 0);
