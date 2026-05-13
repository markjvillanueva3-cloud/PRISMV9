#!/usr/bin/env node
// tier: T4
/**
 * async-hook-enqueue.mjs — HOOK-SYNERGY-MS0 / U-HOOK-ASYNC-DISPATCH (H7)
 *
 * Thin wrapper helper for `settings.json` to offload a Tier-4 hook into the
 * async queue instead of running it synchronously. Stop event hooks (vitest
 * gate, deep-test-sweep, git-sync-stop) wrapped through this helper return
 * `{"continue": true}` in <50 ms while the actual hook runs detached.
 *
 * USAGE — replace a settings.json Stop hook entry like:
 *   { "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/test-100-percent-gate.mjs" }
 * with:
 *   { "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/helpers/async-hook-enqueue.mjs --hook H:/prism/.claude/hooks/test-100-percent-gate.mjs --tier T4" }
 *
 * Optional flags:
 *   --tier <T0..T4>            tier annotation for telemetry (default "T4")
 *   --event <name>             triggering Claude Code event (default "Stop")
 *   --timeout-ms <n>           per-job timeout cap (engine clamps to its ABS ceiling)
 *
 * EXIT
 *   Always exits 0 with `{"continue": true}` on stdout. Failures are recorded
 *   to the queue-write-error JSONL — they NEVER block the parent hook.
 *
 * KNOBS
 *   PRISM_ASYNC_HOOK_DISABLE=1     no-op the helper, exit 0 with a system message.
 *                                  Use to roll back this hook globally without
 *                                  rewriting settings.json.
 */

import * as fs from "node:fs";
import { pathToFileURL } from "node:url";

// ── arg parsing ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function valueOf(flag, def) {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
}

const hookPath = valueOf("--hook", "");
const tier = valueOf("--tier", "T4");
const event = valueOf("--event", "Stop");
const timeoutRaw = valueOf("--timeout-ms", "");
const timeoutMs = timeoutRaw && /^\d+$/.test(timeoutRaw) ? Number(timeoutRaw) : undefined;

if (process.env.PRISM_ASYNC_HOOK_DISABLE === "1") {
  process.stdout.write(JSON.stringify({ continue: true, systemMessage: "async-hook-enqueue: disabled via PRISM_ASYNC_HOOK_DISABLE=1 (parent hook not enqueued)" }));
  process.exit(0);
}

if (!hookPath) {
  // No --hook → don't fail the parent. Surface a diagnostic but continue.
  process.stdout.write(JSON.stringify({ continue: true, systemMessage: "async-hook-enqueue: --hook flag missing; skipping enqueue" }));
  process.exit(0);
}

// ── read stdin (the wrapped hook's ctx) and consume it ──────────────────────
// We forward whatever JSON the harness piped into us as the job's ctx so the
// wrapped hook sees the same context it would have synchronously.
let ctxBuf = Buffer.alloc(0);
try { ctxBuf = fs.readFileSync(0); } catch { /* no stdin */ }

let ctx = undefined;
if (ctxBuf.length > 0) {
  try { ctx = JSON.parse(ctxBuf.toString("utf8")); }
  catch { ctx = { rawStdin: ctxBuf.toString("utf8").slice(0, 4096) }; }
}

// ── load engine bundle (dist preferred) ────────────────────────────────────

const candidates = [
  "H:/prism/mcp-server/dist/engines/AsyncHookDispatcherEngine.js",
];

let engineMod = null;
for (const c of candidates) {
  if (fs.existsSync(c)) {
    try {
      const url = pathToFileURL(c).href;
      engineMod = await import(/* @vite-ignore */ url);
      break;
    } catch { /* fall through */ }
  }
}

if (!engineMod) {
  // Engine bundle missing → emit a system message but DO NOT block the parent.
  // The wrapped hook simply won't run this turn — that's the operator's choice
  // by leaving the bundle un-built.
  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage: "async-hook-enqueue: AsyncHookDispatcherEngine bundle not found at mcp-server/dist; run `cd mcp-server && npm run build:fast`. Wrapped hook skipped this turn.",
  }));
  process.exit(0);
}

const { getAsyncHookDispatcherEngine } = engineMod;
const engine = getAsyncHookDispatcherEngine();

// ── enqueue + return immediately ────────────────────────────────────────────

const res = engine.enqueue({ hookPath, tier, event, timeoutMs, ctx });

// Emit a system message ONLY if back-pressure trimmed entries or spawn errored —
// happy path stays silent to keep the hook noise floor at zero.
const sysMsgParts = [];
if (res.pressureWarning) sysMsgParts.push(`pressure:${res.pressureWarning}`);
if (res.spawnError) sysMsgParts.push(`spawn:${res.spawnError}`);
const out = { continue: true };
if (sysMsgParts.length > 0) out.systemMessage = `async-hook-enqueue: ${sysMsgParts.join(", ")}`;

process.stdout.write(JSON.stringify(out));
process.exit(0);
