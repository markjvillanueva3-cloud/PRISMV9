#!/usr/bin/env node
/**
 * async-hook-runner.mjs — HOOK-SYNERGY-MS0 / U-HOOK-ASYNC-DISPATCH (H7)
 *
 * Entry point invoked by `AsyncHookDispatcherEngine.enqueue()` as a *detached*
 * child. Pulls a queued job by its jobId, executes the wrapped hook via
 * `engine.runJob()`, writes the result row, exits.
 *
 * USAGE
 *   node H:/prism/scripts/async-hook-runner.mjs --job-id <id>
 *
 * Because this is a detached child, its parent (the Stop hook) has already
 * exited by the time the wrapped hook completes. We never write to stdout —
 * the only durable side effects are the results JSONL append + the queue
 * entry removal, both done inside `engine.runJob()`.
 *
 * EXIT CODES
 *   0  — job executed (success/failed/timeout/skipped all return 0; outcome
 *        is encoded in the results JSONL, not the exit code, because nothing
 *        is reading our exit code anyway).
 *   1  — malformed CLI (missing --job-id).
 *   2  — engine import failed (unrecoverable).
 *
 * This file deliberately does NOT use the dispatcher — it imports the engine
 * source directly via the compiled dist bundle. Going through the dispatcher
 * would re-enter MCP routing and tie the runner's lifecycle to the parent.
 */

import * as fs from "node:fs";
import { pathToFileURL } from "node:url";

// ── arg parsing ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let jobId = "";
for (let i = 0; i < args.length - 1; i++) {
  if (args[i] === "--job-id") { jobId = args[i + 1]; break; }
}
if (!jobId) {
  // Detached child has no parent to read stderr — write a marker so debugging
  // is possible, then exit non-zero.
  try { fs.appendFileSync("H:/prism/state/shared/async-hook-runner-errors.jsonl",
    JSON.stringify({ ts: new Date().toISOString(), error: "missing_--job-id", argv: args }) + "\n", "utf8"); } catch { /* ignore */ }
  process.exit(1);
}

// ── load engine bundle ──────────────────────────────────────────────────────

const candidates = [
  "H:/prism/mcp-server/dist/engines/AsyncHookDispatcherEngine.js",
  // Source path can't be imported directly under plain `node` (TS), so a
  // fallback to tsx is documented but not auto-invoked — keeping the runner
  // self-contained is more important than supporting unbuilt mode.
];

let engineMod = null;
for (const c of candidates) {
  if (fs.existsSync(c)) {
    try {
      const url = pathToFileURL(c).href;
      engineMod = await import(/* @vite-ignore */ url);
      break;
    } catch (err) {
      try { fs.appendFileSync("H:/prism/state/shared/async-hook-runner-errors.jsonl",
        JSON.stringify({ ts: new Date().toISOString(), error: "import_failed", path: c, message: String(err?.message ?? err) }) + "\n", "utf8"); } catch { /* ignore */ }
    }
  }
}

if (!engineMod) {
  try { fs.appendFileSync("H:/prism/state/shared/async-hook-runner-errors.jsonl",
    JSON.stringify({ ts: new Date().toISOString(), error: "bundle_not_found", candidates }) + "\n", "utf8"); } catch { /* ignore */ }
  process.exit(2);
}

const { getAsyncHookDispatcherEngine } = engineMod;
const engine = getAsyncHookDispatcherEngine();

// ── run + record ────────────────────────────────────────────────────────────

try {
  // engine.runJob handles all the disk side-effects (result row + queue removal).
  // We don't capture or print its return — the caller is gone.
  await engine.runJob(jobId);
  process.exit(0);
} catch (err) {
  // engine.runJob is documented as never throwing. If it does, surface it.
  try { fs.appendFileSync("H:/prism/state/shared/async-hook-runner-errors.jsonl",
    JSON.stringify({ ts: new Date().toISOString(), error: "runjob_threw", jobId, message: String(err?.message ?? err) }) + "\n", "utf8"); } catch { /* ignore */ }
  process.exit(0); // still exit 0 — outcome is in the JSONL, not the exit code
}
