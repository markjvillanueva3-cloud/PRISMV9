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
 */

import { spawnSync, spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

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
pidFileGuard();

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
if (ok && process.env.FOLD_NEWLY_BUILT === "1") {
  ok = run("merge newly-built back",node, ["scripts/merge-augmentations.mjs"]);
} else if (ok) {
  console.log("✓ skipped round-4 fold (newly-built will be folded by next commit's round-2 pass; set FOLD_NEWLY_BUILT=1 to force)");
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
