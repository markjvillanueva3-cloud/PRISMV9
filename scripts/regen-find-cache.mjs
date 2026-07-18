#!/usr/bin/env node
/**
 * regen-find-cache — offline (proactive) generator for the find-cache sidecar.
 *
 * The find-cache (state/shared/system-viz/find-cache.json) is the slim per-node
 * projection behind findInGraph() — read by viz-first-redirect.mjs + the four
 * pre-*-graph-inject hooks (~1060 `find` calls/day from fresh node subprocesses).
 * It used to be built ONLY lazily, by the first `find` that cache-missed after a
 * graph regen — and that lazy rebuild pays the full graph cold-parse INSIDE the
 * hook's ~1500ms budget, so it timed out and the node-context inject silently
 * failed fleet-wide (the substrate every node-direct surface rides on). The warm
 * 56MB sidecar parse is ~540ms (within budget); the COLD 695MB fallthrough was
 * the failure this closes.
 *
 * This CLI does that parse + project + atomic-write EAGERLY. Wired as a
 * regen-viz post-merge step (after build-viz-adjacency), so the sidecar is fresh
 * after every regen and no hook subprocess ever pays the cold parse.
 *
 * Reuses regenFindCache() in scripts/lib/system-viz-graph.mjs → the SAME
 * writeSidecarAtomic primitive the lazy path uses (byte-identical sidecar, so
 * the lazy reader treats it as a plain cache-hit). OOM-safe: the graph read goes
 * through loadGraph's streaming fallback, never a raw JSON.parse of the >512MB
 * graph string.
 *
 * MEMORY: the streaming reader holds the ~695MB graph Buffer + parsed nodes +
 * slim projection co-resident, needing more than the default ~2GB old-space. The
 * wired regen-viz stage spawns this with NODE_ARGS (24GB heap), but a bare
 * `node scripts/regen-find-cache.mjs` would get the default — so we re-exec once
 * with a raised heap when invoked without a heap flag (mirrors
 * build-graph-index.mjs). Disable with PRISM_REGEN_FIND_CACHE_NO_REEXEC=1.
 *
 * Exit codes: 0 = sidecar written fresh (or intentionally disabled via knob);
 *             1 = not written (reason logged) / graph unreadable.
 * Knobs (all honored by the lib): PRISM_VIZ_FIND_CACHE_DISABLE=1,
 *        PRISM_VIZ_FIND_CACHE_PATH=<p>, PRISM_VIZ_GRAPH_PATH=<p>.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { regenFindCache } from "./lib/system-viz-graph.mjs";

const HEAP_TARGET_MB = 8192;

/**
 * Re-exec self with a raised V8 heap when invoked without a heap flag. The
 * wired regen-viz stage already passes NODE_ARGS (24GB), so this only fires for
 * a bare standalone `node scripts/regen-find-cache.mjs`. When a re-exec is
 * needed this never returns (it exits with the child's status); otherwise no-op.
 */
function reExecWithHeapIfNeeded() {
  if (process.env.PRISM_REGEN_FIND_CACHE_NO_REEXEC === "1") return;
  const hasHeapFlag = process.execArgv.some((a) => /^--max[-_]old[-_]space[-_]size=/.test(a));
  if (hasHeapFlag) return;
  const self = fileURLToPath(import.meta.url);
  const r = spawnSync(
    process.execPath,
    [`--max-old-space-size=${HEAP_TARGET_MB}`, self, ...process.argv.slice(2)],
    { stdio: "inherit", env: { ...process.env, PRISM_REGEN_FIND_CACHE_NO_REEXEC: "1" } },
  );
  if (r.error) {
    process.stderr.write(`[regen-find-cache] ✗ heap re-exec failed: ${r.error.message}\n`);
    process.exit(1);
  }
  process.exit(r.status == null ? 1 : r.status);
}

reExecWithHeapIfNeeded();

const t0 = Date.now();
let r;
try {
  // --force redeploys a changed projection (bypasses the already-fresh fast-path).
  r = regenFindCache({ force: process.argv.includes("--force") });
} catch (e) {
  // loadGraph throws the canonical "Cannot read/parse graph" for a genuinely
  // broken/absent graph — surface it loud with a non-zero exit (R12).
  console.error(`[regen-find-cache] ✗ ${e.message}`);
  process.exit(1);
}

const ms = Date.now() - t0;
if (r.ok) {
  console.log(`[regen-find-cache] ✓ ${r.nodeCount} nodes · ${(r.bytes / 1e6).toFixed(1)} MB · ${ms}ms → ${r.path}`);
  process.exit(0);
}

console.error(`[regen-find-cache] ✗ not written (${r.reason}) after ${ms}ms`);
// "cache-disabled" is a deliberate operator opt-out, not a failure — exit 0 so a
// regen-viz run with the knob set does not log a spurious stage failure.
process.exit(r.reason === "cache-disabled" ? 0 : 1);
