#!/usr/bin/env node
/**
 * system-viz-on-commit.mjs — full refresh chain.
 *
 * Called by:
 *   - Git post-commit hook (auto-fires on every commit)
 *   - Cron (hourly)
 *   - Slash command /system-viz
 *   - Manual: `node scripts/system-viz-on-commit.mjs`
 *
 * Sequence:
 *   1. generate-system-viz.mjs           — base graph from live PRISM state
 *   2. merge-augmentations.mjs           — fold in obsidian + awareness + novelty + business + spotlight + newlyBuilt
 *   3. detect-newly-built.mjs            — diff vs prev snapshot, emit newly-built.json
 *   4. merge-augmentations.mjs (round 2) — fold THIS commit's newly-built.json back into the graph
 *
 * Total runtime: ~100s (measured 2026-05-10). Round 4 alone takes ~91s
 * re-running all 12 augmentation passes when only newly-built had changed.
 *
 * Round-4 skip (added 2026-05-10): the next commit's round-2 (step 2) folds
 * the prior commit's newly-built.json automatically. Highlighting in the viz
 * lags by 1 commit, which is acceptable for a refresh that fires every commit
 * across 6 concurrent chats (the alternative is 91s × 6 contention per push
 * cluster). To force the full chain, set FOLD_NEWLY_BUILT=1 in the env.
 *
 * W1 / U-FOLD-DEFAULT (SYSTEM-VIZ-UPGRADES-MS0, 2026-05-16): the audit
 * suggested flipping the default to ON. REJECTED — that reintroduces the
 * exact 91s × N-chat git-contention incident the skip was added to fix
 * (Karpathy R7: surface conflicts, don't average them; R12: fail loud).
 * The skip is correct. The *real* latent risk is narrower and was silent:
 * if commits pause, the LAST newly-built batch is folded never (the
 * next-commit's round-2 never comes). Fix = make the skip auditable, not
 * flip the default. Every run writes .newly-built-fold-debt.json
 * {status, pendingCount, ts}; `--fold-debt-status` is the re-measurable
 * verification channel (exits non-zero when skipped-debt age exceeds
 * PRISM_FOLD_DEBT_MAX_HRS, default 6h) so a cron/operator can detect a
 * stuck fold instead of discovering it by missing viz highlights.
 */

import { spawnSync, spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  acquireGraphWriteLock,
  installGraphWriteLockReleaseOnExit,
  lockTtlMs,
} from "./lib/system-graph-write-lock.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// W1 / U-FOLD-DEFAULT: newly-built fold-debt marker. Records whether THIS
// run folded the just-detected newly-built.json (FOLD_NEWLY_BUILT=1) or
// skipped it (relying on the next commit's round-2). A cron/operator reads
// this to detect a fold that got stuck because commits paused.
// Paths honor env overrides so the test suite can point them at temp fixtures
// without clobbering the shared (multi-chat) state files. Production leaves
// these unset and uses the canonical paths.
const FOLD_DEBT_PATH = process.env.PRISM_FOLD_DEBT_PATH
  || path.join(ROOT, "state", "shared", "system-viz", ".newly-built-fold-debt.json");
const NEWLY_BUILT_PATH = process.env.PRISM_NEWLY_BUILT_PATH
  || path.join(ROOT, "state", "shared", "system-viz", "newly-built.json");
const DEFAULT_FOLD_DEBT_MAX_HRS = 6;

// GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-B2: completion sentinel. The post-commit
// hook runs this script backgrounded with output discarded — a failed or
// skipped chain was invisible (the graph froze 9.5h once and nobody knew).
// On a SUCCESSFUL chain we stamp .last-successful-regen.json so a staleness
// check (U-GO-B5 SessionStart inject) can detect "graph stopped updating"
// without re-deriving it from raw git history.
const REGEN_SENTINEL_PATH = process.env.PRISM_REGEN_SENTINEL_PATH
  || path.join(ROOT, "state", "shared", "system-viz", ".last-successful-regen.json");

// GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-B4: companion failure marker. The
// post-commit hook runs this script with stderr discarded (>/dev/null 2>&1),
// so a graceful chain failure left no trace — only success was observable
// (the sentinel). On the `if (!ok)` path we now stamp .last-regen-failure.json
// with the failed stage + exit code + a stderr tail, so an operator (and the
// U-GO-B5 SessionStart staleness inject) can see WHY the graph stopped
// updating without re-running the chain or digging through git history.
// Success and failure markers never delete each other — a reader compares
// their `ts` fields; the newer marker is the current state.
const REGEN_FAILURE_PATH = process.env.PRISM_REGEN_FAILURE_PATH
  || path.join(ROOT, "state", "shared", "system-viz", ".last-regen-failure.json");

/**
 * Stamp the last-successful-regen sentinel. Best-effort: a sentinel write
 * failure must never fail the chain (the graph itself is already fresh by
 * the time this runs). Records the graph's own mtime so a reader can tell
 * a stale sentinel (script ran) from a stale graph (merge silently no-op'd).
 */
function writeRegenSentinel(extra = {}) {
  try {
    let graphMtime = null;
    let graphBytes = null;
    try {
      const st = fs.statSync(path.join(ROOT, "state", "shared", "system-viz", "system-graph.json"));
      graphMtime = st.mtime.toISOString();
      graphBytes = st.size;
    } catch { /* graph missing — leave null (itself a signal) */ }
    fs.writeFileSync(REGEN_SENTINEL_PATH, JSON.stringify({
      ts: new Date().toISOString(),
      ok: true,
      host: os.hostname(),
      pid: process.pid,
      graphMtime,
      graphBytes,
      ...extra,
    }, null, 2));
  } catch (e) {
    console.error(`system-viz-on-commit: regen sentinel write failed: ${e.message}`);
  }
}

/**
 * U-GO-B4: stamp the last-regen-failure marker so a failed chain is loud
 * despite the post-commit hook discarding this script's stderr. Best-effort —
 * a marker write must never mask the underlying chain failure (the caller
 * still process.exit(1)s). `extra` carries the failed stage / exit code /
 * stderr tail captured by run().
 */
export function writeRegenFailure(extra = {}) {
  try {
    fs.writeFileSync(REGEN_FAILURE_PATH, JSON.stringify({
      ts: new Date().toISOString(),
      ok: false,
      host: os.hostname(),
      pid: process.pid,
      ...extra,
    }, null, 2));
  } catch (e) {
    console.error(`system-viz-on-commit: regen failure marker write failed: ${e.message}`);
  }
}

/**
 * Count newly-built nodes from newly-built.json (best-effort; 0 on any
 * read/shape failure). The canonical shape (detect-newly-built.mjs:148-155)
 * is `{ totals: { totalNew }, entries: [...] }` — `totals.totalNew` is the
 * authoritative integer and equals `entries.length`. Legacy/array shapes
 * are tolerated as fallbacks so an older snapshot still reports a count.
 * (Reading the wrong key here was a P0 — it made pendingCount permanently
 * 0, which made the whole fold-debt signal a silent no-op.)
 */
function readNewlyBuiltCount() {
  try {
    const j = JSON.parse(fs.readFileSync(NEWLY_BUILT_PATH, "utf8"));
    if (j && j.totals && Number.isFinite(j.totals.totalNew)) return j.totals.totalNew;
    if (Array.isArray(j?.entries)) return j.entries.length;
    if (Array.isArray(j)) return j.length;
    if (Array.isArray(j?.nodes)) return j.nodes.length;
    if (Array.isArray(j?.newlyBuilt)) return j.newlyBuilt.length;
    return 0;
  } catch {
    return 0;
  }
}

function writeFoldDebt(obj) {
  try {
    fs.writeFileSync(FOLD_DEBT_PATH, JSON.stringify({ ...obj, ts: new Date().toISOString() }, null, 2));
  } catch (e) {
    console.error(`system-viz-on-commit: fold-debt write failed: ${e.message}`);
  }
}

/**
 * Pure verdict for the fold-debt status check. Exported-style helper kept
 * pure so the test suite can exercise every branch without spawning a chain.
 * @param {object|null} debt  parsed .newly-built-fold-debt.json (or null if absent)
 * @param {number} maxHrs     staleness threshold in hours
 * @param {number} nowMs      Date.now() injection point for deterministic tests
 * @returns {{ok:boolean, code:number, message:string}}
 */
function foldDebtVerdict(debt, maxHrs, nowMs) {
  if (!debt) {
    return { ok: true, code: 0, message: "fold-debt: no marker yet (clean — chain has not skipped a fold)" };
  }
  if (debt.status === "folded") {
    return { ok: true, code: 0, message: `fold-debt: clean (last fold in-commit at ${debt.ts}, pending=${debt.pendingCount ?? 0})` };
  }
  // status === "skipped" — only debt if it has been stuck longer than maxHrs.
  const tsMs = Date.parse(debt.ts ?? "");
  const ageHrs = Number.isFinite(tsMs) ? (nowMs - tsMs) / 3.6e6 : Infinity;
  if (debt.pendingCount === 0) {
    return { ok: true, code: 0, message: `fold-debt: skipped but pendingCount=0 (nothing to fold) at ${debt.ts}` };
  }
  if (ageHrs > maxHrs) {
    return {
      ok: false,
      code: 1,
      message: `fold-debt STUCK: ${debt.pendingCount} newly-built node(s) skipped at ${debt.ts} (${ageHrs.toFixed(1)}h > ${maxHrs}h). ` +
               `Commits likely paused — run FOLD_NEWLY_BUILT=1 node scripts/system-viz-on-commit.mjs to fold now.`,
    };
  }
  return { ok: true, code: 0, message: `fold-debt: skipped ${debt.pendingCount} node(s) at ${debt.ts} (${ageHrs.toFixed(1)}h ≤ ${maxHrs}h — next commit's round-2 will fold)` };
}

// --fold-debt-status: read-only verification channel. Runs BEFORE the pid
// guard so it never contends with a live chain. This is W1's re-measurable
// signal (forge-audit-v2 doctrine: a finding needs a re-runnable check).
if (process.argv.includes("--fold-debt-status")) {
  const maxHrs = (() => {
    const v = Number(process.env.PRISM_FOLD_DEBT_MAX_HRS);
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_FOLD_DEBT_MAX_HRS;
  })();
  let debt = null;
  try { debt = JSON.parse(fs.readFileSync(FOLD_DEBT_PATH, "utf8")); } catch { debt = null; }
  const verdict = foldDebtVerdict(debt, maxHrs, Date.now());
  console.log(verdict.message);
  process.exit(verdict.code);
}

export { foldDebtVerdict, readNewlyBuiltCount };

// Single-writer guard (added 2026-05-10 after multi-chat hang diagnosis).
// 6 concurrent chats commit within seconds → 6 concurrent system-viz-on-commit
// chains each reading+writing 41MB system-graph.json with no file locking →
// corrupted graph + filesystem contention → multi-minute chat hangs.
// PID-file ensures only one instance runs at a time. Crash-safe via
// process.kill(pid, 0) liveness check. Skipped runs are recovered by the
// next commit's run.
const PIDFILE = path.join(ROOT, ".system-viz-on-commit.pid");
function pidFileGuard() {
  try {
    const existing = fs.readFileSync(PIDFILE, "utf8").trim();
    const pid = parseInt(existing, 10);
    if (Number.isFinite(pid) && pid > 0) {
      // U-GO-B2: TTL backstop — a pidfile older than the TTL is stale
      // regardless of the liveness probe. Mirrors the same defense added to
      // scripts/lib/system-graph-write-lock.mjs: a Windows PID-reuse phantom
      // (an unrelated live process inheriting a crashed regen's recycled pid)
      // makes process.kill(pid,0) read "alive" and wedges the autoupdate
      // forever. Observed in production: pid 24784 froze the graph 9.5h.
      // The on-commit chain runs ~100s; the 30-min default TTL is wide
      // headroom yet still self-heals a wedged pidfile within half an hour.
      let ageMs = Infinity;
      try { ageMs = Date.now() - fs.statSync(PIDFILE).mtimeMs; } catch { /* unstatable → treat as stale */ }
      if (ageMs <= lockTtlMs()) {
        try {
          process.kill(pid, 0); // liveness probe, throws ESRCH if dead
          console.log(`system-viz-on-commit: another instance running (pid=${pid}), skipping`);
          process.exit(0);
        } catch {
          // dead pid — claim the lock by overwriting
        }
      } else {
        console.log(`system-viz-on-commit: stale pidfile (pid=${pid}, age ${(ageMs / 60000).toFixed(1)}m exceeds TTL) — reclaiming`);
      }
    }
  } catch {
    // no pidfile or unreadable — proceed
  }
  try {
    fs.writeFileSync(PIDFILE, String(process.pid));
  } catch (e) {
    console.error("system-viz-on-commit: pidfile write failed:", e.message);
    process.exit(0); // fail-safe; next run will recover
  }
  const cleanup = () => { try { fs.unlinkSync(PIDFILE); } catch {} };
  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(130); });
  process.on("SIGTERM", () => { cleanup(); process.exit(143); });
}

// GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-B1: the DOMINANT cause of the stale
// graph. merge-augmentations.mjs OOM-crashes (exit 134 / SIGABRT, V8 heap
// abort) folding the ~412 MB system-graph.json under Node's default
// ~2 GB old-space — observed every run. The stale locks (U-GO-B2) gated
// SOME runs; this gated EVERY run that got past them. Raise the heap for
// every child of the chain via NODE_OPTIONS (inherited by grandchildren).
// Knob: PRISM_VIZ_REGEN_HEAP_MB (MB, floor 2048, default 24576). The graph grew
// 412 -> 630 MB (2026-06-10); at 630 MB the prior 8192 default OOMs on the heavy
// stages, so this on-commit chain is raised to MATCH the canonical regen-viz.mjs
// heap (its NODE_ARGS = --max-old-space-size=24576). SAFE on commit pressure:
// regen + build-graph-index + merge-augmentations are SINGLE SEQUENTIAL batch
// jobs that run ALONE, so a higher per-proc cap here never adds to the ~130-proc
// fleet commit baseline -- unlike a hook/daemon cap, which on Windows IS a commit
// RESERVATION counted against the 227 GB ceiling even when unused (see lesson
// commit-pressure-find-the-real-committer: raise THOSE and the box stops
// spawning; this one is a lone transient).
//
// HEAP ONLY (this chain spawns via NODE_OPTIONS): regen-viz.mjs ALSO passes
// --stack-size=8192 for merge-augmentations on the >600 MB graph, but --stack-size
// is NOT allowed in NODE_OPTIONS -- only the argv-spawned regen-viz can pass it.
// LIVE-VALIDATED 2026-06-10 (golf): even regen-viz at the FULL 24576 + stack-size
// STILL fails merge-augmentations exit 1 -- so the master-index degradation is a
// REAL merge bug at 630 MB, NOT a heap-cap shortfall; this bump only re-provisions
// the non-merge stages. The merge fix + the streaming-augment rewrite are sierra's
// (system-viz) follow-up. STATUS (sierra 2026-06-10): BOTH RESOLVED + LIVE-VALIDATED.
// (1) streaming-augment rewrite SHIPPED ae55cea3f7: augment-molecules.mjs uses off-heap
// streamGraphArray() (projects only L5/L3/L9 fields, never materializes the graph), so
// the "augment molecules" stage no longer OOMs under ANY heap. (2) MERGE fix: a full
// regen-viz run (2026-06-10, 430.3s, driftFail=false) folded 557.9 MB of augmentations
// into a 660 MB graph and SUCCEEDED (obsidian:yes, build-graph-index 335,482 nodes) --
// 660MB is OVER golf's 630MB failure point AND V8's 512 MiB string cap, so golf's
// "630MB merge exit-1" does NOT reproduce. It was the truncation cascade (a prior
// non-atomic write left a torn graph -> next merge's readGraphStreaming threw), closed
// by writeGraphStreamingAtomic (153887a519); loadOptional is now also cap-safe
// (628aaa51f5). master-index sidecar rebuilds clean at >512 MiB -- no stale-graph
// fallback needed. See [[reference_augment_molecules_stream_2026_06_09]].
const REGEN_HEAP_MB = (() => {
  const v = Number(process.env.PRISM_VIZ_REGEN_HEAP_MB);
  return Number.isFinite(v) && v >= 2048 ? Math.floor(v) : 24576;
})();

// U-GO-B4: the most-recent failed run() — stage / exit code / signal /
// stderr tail. main()'s if(!ok) block reads this to populate the failure
// marker (writeRegenFailure) so a discarded-stderr chain failure is loud.
let lastRunFailure = null;

function run(label, cmd, args) {
  const start = Date.now();
  const childEnv = {
    ...process.env,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --max-old-space-size=${REGEN_HEAP_MB}`.trim(),
  };
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: childEnv });
  const ms = Date.now() - start;
  if (r.status !== 0) {
    console.error(`✗ ${label} (${ms}ms) FAILED — exit ${r.status}`);
    if (r.stderr) console.error(r.stderr.split("\n").slice(-6).join("\n"));
    lastRunFailure = {
      stage: label,
      exitCode: r.status,
      signal: r.signal ?? null,
      stderrTail: (r.stderr ?? "").split("\n").filter(Boolean).slice(-8).join("\n"),
    };
    return false;
  }
  const lastLine = (r.stdout ?? "").split("\n").filter(Boolean).slice(-2).join(" · ");
  console.log(`✓ ${label} (${ms}ms) — ${lastLine}`);
  return true;
}

// GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-B3: rebuild the master-index sidecar from
// the freshly-merged graph. system-graph.json (>400 MB) exceeds master-index-
// search-lib's 200 MB loadGraph cap, so master-index search depends ENTIRELY
// on the compact system-graph-index.json sidecar. loadGraph's staleness gate
// rejects any sidecar built from an older graph — so a regen that advances the
// graph WITHOUT rebuilding the sidecar silently degrades the WHOLE fleet's
// search to the 20K-node architecture-graph fallback. regen-viz.mjs already
// chains build-graph-index.mjs; this on-commit chain — the dominant graph
// writer (post-commit hook, every commit) — did not, which is why the sidecar
// was observed 2 days stale behind a fresh graph. Non-fatal: a sidecar failure
// only degrades search to the legacy path, the graph itself is fresh.
//
// `runFn` is injected (the module's run(label,cmd,args)->boolean spawner) so
// the wiring is unit-testable without spawning the real ~16 s build — mirrors
// the foldDebtVerdict pure-helper extraction.
export function rebuildMasterIndexSidecar(node, runFn) {
  return runFn(
    "rebuild master-index sidecar",
    node,
    // Explicit heap flag → build-graph-index.mjs's self-re-exec is a no-op
    // (parity with regen-viz.mjs's NODE_ARGS-spawned sidecar stage).
    [`--max-old-space-size=${REGEN_HEAP_MB}`, "scripts/build-graph-index.mjs"],
  );
}

// The side-effecting refresh chain. Guarded by an entry-point check at the
// bottom so importing this module (e.g. the test suite, or any consumer of
// foldDebtVerdict/readNewlyBuiltCount) does NOT spawn the ~80s chain or take
// the pid lock. W1 fix: making the module importable required this guard.
function main() {
  const chainStart = Date.now();
  pidFileGuard();

  // U-VIZ-F11-CROSS-LOCK: on-commit is the THIRD independent system-graph.json
  // writer (its chain runs merge-augmentations.mjs ×2). Its own .system-viz-
  // on-commit.pid only excludes other on-commit instances — it does NOT
  // exclude a concurrent operator/cron `regen-viz.mjs`, which holds the
  // SHARED .system-graph-write.pid for its merge chain. Without this, an
  // on-commit merge and a regen-viz merge race the same 41MB graph (the
  // open leg F11 closes; F1 already isolated generate-system-viz to
  // architecture-graph.json so it is NOT a racer). Acquire the SAME shared
  // lock here so all three writers (regen-viz · on-commit · add-node) are
  // mutually exclusive on ONE lock. add-node DEFERS on it (its TIER-1b).
  // Skip semantics MIRROR this script's own pidFileGuard: exit 0, the next
  // commit's run recovers (on-commit is post-commit-hook-invoked + detached
  // — exit 0 is its established skip contract, NOT regen-viz's exit-4).
  const f11Lock = acquireGraphWriteLock();
  if (!f11Lock.acquired) {
    console.log(
      `system-viz-on-commit: shared system-graph.json write-lock held by ` +
      `pid ${f11Lock.heldBy} (a regen-viz / peer on-commit is mid-merge), ` +
      `skipping — next commit's run recovers (lock: ${f11Lock.path}).`,
    );
    process.exit(0);
  }
  installGraphWriteLockReleaseOnExit();

  const node = process.execPath;
  console.log("PRISM system-viz refresh chain:");

  let ok = run("generate base graph",   node, ["scripts/generate-system-viz.mjs"]);
if (ok) ok = run("augment molecules",     node, ["scripts/augment-molecules.mjs"]);
// merge-file-coverage runs only if agent-findings/{1..10}.json are present.
// Safe no-op when census + agents haven't been run.
if (ok && fs.existsSync(path.join(ROOT, "state/shared/system-viz/agent-findings/1.json"))) {
  run("merge file coverage",            node, ["scripts/merge-file-coverage.mjs"]);
}
if (ok) ok = run("merge augmentations",   node, ["scripts/merge-augmentations.mjs"]);
if (ok) ok = run("detect newly-built",    node, ["scripts/detect-newly-built.mjs"]);
// Round-4 (re-merge after detect) skipped in commit context by default —
// it adds ~91s for an annotation that the NEXT commit's round-2 folds in
// automatically. The 1-commit highlight lag is acceptable; the 91s × 6-chat
// contention storm wasn't. Set FOLD_NEWLY_BUILT=1 to opt back into the
// in-this-commit fold (manual /system-viz invocations should set it).
const pendingCount = ok ? readNewlyBuiltCount() : 0;
if (ok && process.env.FOLD_NEWLY_BUILT === "1") {
  ok = run("merge newly-built back",node, ["scripts/merge-augmentations.mjs"]);
  writeFoldDebt({ status: "folded", pendingCount, foldedInCommit: true });
} else if (ok) {
  console.log(`✓ skipped round-4 fold (${pendingCount} newly-built node(s) → folded by next commit's round-2; set FOLD_NEWLY_BUILT=1 to force, or check staleness via --fold-debt-status)`);
  writeFoldDebt({ status: "skipped", pendingCount });
}

if (!ok) {
  console.error("\n⚠ chain incomplete — viz may be stale until next run");
  // U-GO-B4: record WHY (failed stage + exit code + stderr tail) so the
  // failure is observable despite the post-commit hook discarding stderr.
  writeRegenFailure({ durationMs: Date.now() - chainStart, ...(lastRunFailure || {}) });
  process.exit(1);
}

// U-GO-B3: rebuild the master-index sidecar from the now-fresh graph. The
// shared graph-write lock is still held, so build-graph-index reads a
// consistent graph. Non-fatal — a failure degrades search to the legacy
// path, never the graph itself.
const sidecarOk = rebuildMasterIndexSidecar(node, run);
if (!sidecarOk) {
  console.error("⚠ sidecar rebuild failed — master-index search degrades to the legacy/architecture fallback until the next successful regen");
}

// U-GO-B2: stamp the success sentinel so staleness is observable even
// though the post-commit hook discards this script's stdout.
writeRegenSentinel({ durationMs: Date.now() - chainStart, pendingCount, sidecarOk });
console.log("\n✓ system-viz fully refreshed; viewer auto-poll will pick up within 30s");

// U-VIZ-AUTO-REGEN-WIKI / U-CLEANUP-F5: regenerate the Obsidian wiki from the
// freshly-built graph — routed through viz-regen-guard.mjs, the centralized
// dependency-aware gate. The guard hash-checks the SOURCE deps (NOT graph.json,
// which churns on every commit and would otherwise force a regen every time)
// and refuses if an upstream artifact is stale, then spawns the ~8-min
// regen-wiki-from-viz.mjs orchestrator itself only when warranted.
// DETACHED + async: running the orchestrator synchronously here would hold the
// post-commit hook (blocking concurrent `git` across the fleet) for the whole
// duration — that caused .git/index.lock contention. Fire-and-forget instead;
// the next commit's chain (or the hourly cron) catches anything this run skipped.
// Skip entirely with PRISM_SKIP_WIKI_REGEN=1.
if (process.env.PRISM_SKIP_WIKI_REGEN !== "1") {
  try {
    const child = spawn(node, ["scripts/viz-regen-guard.mjs", "--quiet"], {
      cwd: ROOT,
      stdio: "ignore",
      detached: true, windowsHide: true,
    });
    child.unref();
    console.log("✓ wiki regen routed through viz-regen-guard (detached) — guard skips/refuses/runs as warranted, does not block git");
  } catch (e) {
    console.error(`✗ wiki regen guard launch failed: ${e.message} (graph itself is fresh)`);
  }
}
} // end main()

// Entry-point guard: run the chain only when invoked directly, never on import.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
