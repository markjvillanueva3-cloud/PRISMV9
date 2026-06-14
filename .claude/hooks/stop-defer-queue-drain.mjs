#!/usr/bin/env node
// tier: T3
/**
 * stop-defer-queue-drain.mjs — Stop hook
 *
 * TOKEN-SAVINGS-PIVOT/U-PSN-DEFER-QUEUE (iter15, 2026-05-23, slot:alpha)
 *
 * At session end, drains any deferred-action queue entries for THIS session
 * and emits them as a consolidated wind-down checklist. Companion to the
 * PreToolUse queue-write in mcp-route-suggest.mjs.
 *
 * Why a Stop hook (not a UserPromptSubmit injection): the queue is meant
 * to be acted on at WIND-DOWN, not mid-session. Surfacing during the
 * session would just re-create the mid-task interruption problem the
 * queue was built to solve.
 *
 * Advisory only — never blocks Stop. Knob: PRISM_DEFER_QUEUE_DISABLE=1.
 */

import { readFileSync } from "node:fs";

async function readStdin() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); }
  catch { return {}; }
}

function pass() {
  process.stdout.write(JSON.stringify({ continue: true }));
}

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "Stop", additionalContext },
  }));
}

async function main() {
  if (process.env.PRISM_DEFER_QUEUE_DISABLE === "1") { pass(); return; }

  let queueLib;
  try { queueLib = await import("../../scripts/lib/defer-queue.mjs"); }
  catch { pass(); return; }

  const { readQueueFromFile, writeQueueToFile, drainSession, formatDrainBlock } = queueLib;
  const input = await readStdin();
  const sessionId = String(input.session_id || input.sessionId || "").slice(0, 36);
  if (!sessionId) { pass(); return; }

  const queue = readQueueFromFile();
  const { remaining, drained } = drainSession(queue, sessionId);

  if (!drained || drained.length === 0) { pass(); return; }

  // Persist the drained-out queue (best-effort).
  try { writeQueueToFile(remaining); } catch { /* tolerate */ }

  // U-PSN-E3 (gap-E3, 2026-05-23, slot:alpha): conversion telemetry. Record
  // each drain event to state/shared/defer-queue-telemetry.jsonl so future
  // analysis can compute conversion (did the operator's NEXT session call
  // any of the suggested MCP actions?). Append-only JSONL; best-effort IO.
  try {
    const { writeFileSync, existsSync, mkdirSync, appendFileSync } = await import("node:fs");
    const telemetryFile = "H:/prism/state/shared/defer-queue-telemetry.jsonl";
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      sessionId: sessionId.slice(0, 8),
      drainedCount: drained.length,
      classifiers: Array.from(new Set(drained.map(d => d && d.classifier).filter(Boolean))),
    }) + "\n";
    try { appendFileSync(telemetryFile, line, "utf8"); }
    catch {
      try {
        if (!existsSync("H:/prism/state/shared")) mkdirSync("H:/prism/state/shared", { recursive: true });
        writeFileSync(telemetryFile, line, "utf8");
      } catch { /* telemetry write failed — never block drain */ }
    }
  } catch { /* telemetry MUST never fail drain */ }

  const block = formatDrainBlock(drained);
  if (!block) { pass(); return; }
  emit(block);
}

if (process.argv[1] && process.argv[1].endsWith("stop-defer-queue-drain.mjs")) {
  main().catch(() => pass());
}
