#!/usr/bin/env node
/**
 * tool-watchdog.mjs — HS-12 tool-call runtime monitor.
 *
 * Fires on PostToolUse: appends {ts, toolName, durationMs, ok} to
 * `state/shared/.tool-runtimes.jsonl`. On the NEXT PreToolUse, if the
 * previous tool took longer than SLOW_MS or exited abnormally, emits a
 * `[watchdog] previous tool: X ran Yms with exit Z` note so the model
 * can adapt (e.g. expect retries, skip a step, etc.).
 *
 * This hook self-detects whether it's running as PostToolUse (record)
 * or PreToolUse (read+nudge) based on hook_event_name in stdin.
 *
 * Cheap: ~2-5ms. Fail-OPEN on any error.
 *
 * Knobs:
 *   PRISM_WATCHDOG_SLOW_MS   (default 30000)
 *   PRISM_WATCHDOG_LOG_MAX   (default 200, jsonl entries kept)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const LOG_PATH = "H:/prism/state/shared/.tool-runtimes.jsonl";
const SLOW_MS = Number(process.env.PRISM_WATCHDOG_SLOW_MS || 30000);
const LOG_MAX = Number(process.env.PRISM_WATCHDOG_LOG_MAX || 200);

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

async function main() {
  let payload;
  try { payload = JSON.parse(safeRead()); } catch { payload = {}; }

  const event = payload?.hook_event_name || payload?.event || "";
  const toolName = payload?.tool_name || "";
  const toolResponse = payload?.tool_response;
  const now = Date.now();

  if (event === "PostToolUse") {
    // Record: pull start time from the in-payload field if available.
    // Claude harness may include `started_at` or `duration_ms` in tool_response.
    let durationMs = null;
    if (typeof toolResponse?.duration_ms === "number") {
      durationMs = toolResponse.duration_ms;
    } else if (typeof payload?.started_at === "string") {
      const ts = Date.parse(payload.started_at);
      if (Number.isFinite(ts)) durationMs = now - ts;
    }
    const ok = toolResponse?.is_error !== true && payload?.error == null;
    appendCapped({ t: now, tool: toolName, durationMs, ok });
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  if (event === "PreToolUse") {
    // Nudge: read the most-recent entry; if SLOW or !ok, surface it.
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
