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
 *   4. merge-augmentations.mjs (round 2) — fold the freshly-detected newly-built.json back into the live graph
 *
 * Idempotent. Safe to run repeatedly. Total runtime: ~2-3 seconds.
 */

import { spawnSync } from "node:child_process";
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
if (ok) ok = run("merge newly-built back",node, ["scripts/merge-augmentations.mjs"]);

if (!ok) {
  console.error("\n⚠ chain incomplete — viz may be stale until next run");
  process.exit(1);
}
console.log("\n✓ system-viz fully refreshed; viewer auto-poll will pick up within 30s");
