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
import { fileURLToPath, pathToFileURL } from "node:url";

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
      try {
        process.kill(pid, 0); // liveness probe, throws ESRCH if dead
        console.log(`system-viz-on-commit: another instance running (pid=${pid}), skipping`);
        process.exit(0);
      } catch {
        // dead pid — claim the lock by overwriting
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

function run(label, cmd, args) {
  const start = Date.now();
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "pipe", encoding: "utf8" });
  const ms = Date.now() - start;
  if (r.status !== 0) {
    console.error(`✗ ${label} (${ms}ms) FAILED — exit ${r.status}`);
    if (r.stderr) console.error(r.stderr.split("\n").slice(-6).join("\n"));
    return false;
  }
  const lastLine = (r.stdout ?? "").split("\n").filter(Boolean).slice(-2).join(" · ");
  console.log(`✓ ${label} (${ms}ms) — ${lastLine}`);
  return true;
}

// The side-effecting refresh chain. Guarded by an entry-point check at the
// bottom so importing this module (e.g. the test suite, or any consumer of
// foldDebtVerdict/readNewlyBuiltCount) does NOT spawn the ~80s chain or take
// the pid lock. W1 fix: making the module importable required this guard.
function main() {
  pidFileGuard();
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
  process.exit(1);
}
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
      detached: true,
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
