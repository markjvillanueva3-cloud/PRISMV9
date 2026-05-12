#!/usr/bin/env node
/**
 * tool-watchdog.mjs — HS-12 + HS-15 tool-call runtime monitor.
 *
 * Fires on PostToolUse: appends {t, tool, durationMs, ok} to
 * `state/shared/.tool-runtimes.jsonl`. On the NEXT PreToolUse, if the
 * previous tool took longer than SLOW_MS or exited abnormally, emits a
 * `[watchdog] previous tool: X ran Yms ...` note so the model can adapt
 * (e.g. expect retries, skip a step, etc.).
 *
 * HS-15 fix (2026-05-12): the Claude harness on this fleet does NOT pass
 *   `tool_response.duration_ms` or `started_at` in PostToolUse payloads,
 *   so the original two derivation paths always fell through and every
 *   entry had `durationMs: null`. That made the SLOW-tool detection arm
 *   completely dead — only the `ok:false` failure-detection arm worked.
 *
 *   Fix: stash `{[tool_use_id]: { tool, ts }}` to a small pending-cache
 *   file on PreToolUse; on the matching PostToolUse, read the stash,
 *   compute `now - stash.ts`, and delete the entry. Bounded FIFO (cap
 *   PENDING_MAX) so a denied tool call (PreToolUse fires, PostToolUse
 *   never does) can't leak the cache.
 *
 * This hook self-detects whether it's running as PostToolUse (record)
 * or PreToolUse (stash + read+nudge) based on hook_event_name in stdin.
 *
 * Cheap: ~3-7ms. Fail-OPEN on any error.
 *
 * Knobs:
 *   PRISM_WATCHDOG_SLOW_MS         (default 30000)
 *   PRISM_WATCHDOG_LOG_MAX         (default 200, jsonl entries kept)
 *   PRISM_WATCHDOG_PENDING_MAX     (default 50, in-flight tool_use_ids kept)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname } from "node:path";

const LOG_PATH = "H:/prism/state/shared/.tool-runtimes.jsonl";
const PENDING_PATH = "H:/prism/.cache/tool-watchdog-pending.json";
const SLOW_MS = Number(process.env.PRISM_WATCHDOG_SLOW_MS || 30000);
const LOG_MAX = Number(process.env.PRISM_WATCHDOG_LOG_MAX || 200);
const PENDING_MAX = Number(process.env.PRISM_WATCHDOG_PENDING_MAX || 50);

function safeRead() {
  try { return readFileSync(0, "utf8"); } catch { return "{}"; }
}

function safeWrite(content) {
  try {
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    writeFileSync(LOG_PATH, content);
  } catch { /* ignore */ }
}

function loadTail(maxLines) {
  try {
    if (!existsSync(LOG_PATH)) return [];
    const buf = readFileSync(LOG_PATH, "utf8");
    const lines = buf.split("\n").filter(Boolean);
    return lines.slice(-maxLines);
  } catch { return []; }
}

function appendCapped(entry) {
  const lines = loadTail(LOG_MAX - 1);
  lines.push(JSON.stringify(entry));
  safeWrite(lines.join("\n") + "\n");
}

// HS-15: pending-cache for PreToolUse→PostToolUse timing handoff.
//
// Invariants (load-bearing — do not refactor without preserving):
//   1. tool_use_id is a non-numeric string (Claude harness UUID-prefix),
//      so V8 Object insertion-order is spec-guaranteed per ECMAScript
//      OrdinaryOwnPropertyKeys. capPending() drops OLDEST keys via
//      slice(0, len-MAX) which depends on this ordering.
//   2. PENDING_PATH is a DIFFERENT file from LOG_PATH. The PreToolUse
//      branch stashes to PENDING_PATH, then reads LOG_PATH for the
//      HS-12 nudge — they cannot intersect, so the nudge can never see
//      "this same call" as its own previous. If anyone ever unifies
//      these two files, the ordering of stash-vs-nudge must flip too.
//   3. tool_use_id is unique-per-call within a session (Claude UUID),
//      so the PostToolUse `delete pending[toolUseId]` is safe — never
//      removes a different in-flight call.
//   4. savePending uses temp+rename to survive concurrent writes
//      (PRISM fleet runs 6 chats; PreToolUse + PostToolUse from
//      different bundles can fire on the same .cache file). Temp
//      filename is pid+now-tagged so two writers cannot collide on
//      the temp file itself before the rename.
function loadPending() {
  try {
    if (!existsSync(PENDING_PATH)) return {};
    const buf = readFileSync(PENDING_PATH, "utf8");
    const obj = JSON.parse(buf);
    return (obj && typeof obj === "object") ? obj : {};
  } catch { return {}; }
}

function savePending(obj) {
  try {
    mkdirSync(dirname(PENDING_PATH), { recursive: true });
    // Atomic write: write a uniquely-named temp file, then rename onto the
    // final path. NTFS same-volume rename is atomic — last writer wins
    // overall, but no partial-write reads are ever observed. Survives the
    // load→mutate→save race two parallel hook invocations would otherwise hit.
    const tmp = `${PENDING_PATH}.tmp.${process.pid}.${Date.now()}`;
    writeFileSync(tmp, JSON.stringify(obj));
    renameSync(tmp, PENDING_PATH);
  } catch { /* ignore */ }
}

// Mutates obj in place AND returns it, so callers can chain:
//   savePending(capPending(pending))
// Drops the OLDEST keys first (relies on invariant #1 above).
function capPending(obj) {
  const keys = Object.keys(obj);
  if (keys.length <= PENDING_MAX) return obj;
  const trim = keys.slice(0, keys.length - PENDING_MAX);
  for (const k of trim) delete obj[k];
  return obj;
}

async function main() {
  let payload;
  try { payload = JSON.parse(safeRead()); } catch { payload = {}; }

  const event = payload?.hook_event_name || payload?.event || "";
  const toolName = payload?.tool_name || "";
  const toolUseId = payload?.tool_use_id || "";
  const toolResponse = payload?.tool_response;
  const now = Date.now();

  if (event === "PostToolUse") {
    // Three duration-derivation paths in order of fidelity:
    //   1. tool_response.duration_ms        (harness-provided, most accurate)
    //   2. payload.started_at (ISO string)  (harness-provided)
    //   3. pending-cache lookup by tool_use_id  (HS-15: our own PreToolUse stash)
    // On this fleet, only #3 actually works. #1 and #2 are kept for forward-
    // compat with future harness versions that may populate them. In that
    // future case, the cleanup block below still drains pending so no stash
    // entry ever leaks past one round-trip.
    let durationMs = null;
    if (typeof toolResponse?.duration_ms === "number") {
      durationMs = toolResponse.duration_ms;
    } else if (typeof payload?.started_at === "string") {
      const ts = Date.parse(payload.started_at);
      if (Number.isFinite(ts)) durationMs = now - ts;
    }

    // Pending-cache: single load handles both path-#3 fallback AND cleanup-
    // on-path-#1/#2-win. The matching PreToolUse always stashes (if it ran),
    // so the entry must be drained whether we used it for path #3 or not —
    // otherwise pending slowly fills and capPending starts dropping LIVE
    // in-flight entries.
    if (toolUseId) {
      const pending = loadPending();
      const stash = pending[toolUseId];
      if (durationMs == null && stash && Number.isFinite(stash.ts)) {
        durationMs = now - stash.ts;
      }
      if (toolUseId in pending) {
        delete pending[toolUseId];
        savePending(pending);
      }
    }

    const ok = toolResponse?.is_error !== true && payload?.error == null;
    appendCapped({ t: now, tool: toolName, durationMs, ok });
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  if (event === "PreToolUse") {
    // HS-15: stash {tool, ts} keyed by tool_use_id so the matching
    // PostToolUse can compute durationMs. If tool_use_id is absent
    // (legacy harness), skip the stash — falls back to null duration,
    // identical to pre-HS-15 behaviour.
    if (toolUseId) {
      const pending = loadPending();
      pending[toolUseId] = { tool: toolName, ts: now };
      // Chained: capPending mutates+returns, savePending writes atomically.
      savePending(capPending(pending));
    }

    // HS-12 nudge logic: read the most-recent entry from the SEPARATE log
    // file (LOG_PATH, not PENDING_PATH); if SLOW or !ok, surface it. The
    // stash above writes to PENDING_PATH, so it cannot ever appear in tail
    // — see invariant #2 in the helpers block above.
    const tail = loadTail(1);
    if (tail.length === 0) {
      process.stdout.write(JSON.stringify({ continue: true }));
      return;
    }
    let prev;
    try { prev = JSON.parse(tail[0]); } catch { prev = null; }
    if (!prev) {
      process.stdout.write(JSON.stringify({ continue: true }));
      return;
    }
    const stale = now - prev.t > 5 * 60 * 1000; // only notify on recent
    const slow = prev.durationMs != null && prev.durationMs >= SLOW_MS;
    const failed = prev.ok === false;
    if (stale || (!slow && !failed)) {
      process.stdout.write(JSON.stringify({ continue: true }));
      return;
    }
    const summary = `[watchdog] previous tool: ${prev.tool} ran ${prev.durationMs ?? "?"}ms${failed ? " (FAILED)" : ""}${slow ? " (SLOW > " + SLOW_MS + "ms)" : ""}`;
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: { additionalContext: summary },
    }));
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => {
  try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* ignore */ }
});
