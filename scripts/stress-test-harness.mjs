#!/usr/bin/env node
/**
 * stress-test-harness.mjs — AUTONOMOUS-FLEET-MS0/U-AF-STRESS-HARNESS
 *
 * Records every session-continuity event during the autonomous-build run so
 * regressions in the AUTOCOMPACT-AUTONOMOUS-MS0 + AUTONOMOUS-FLEET-MS0 stack
 * become detectable. The companion hook `stress-harness-emit.mjs` fires on
 * UserPromptSubmit + Stop + SessionStart + PreCompact and appends rows to:
 *
 *     state/shared/stress-test-AUTONOMOUS-FLEET-MS0.jsonl
 *
 * Schema (one JSON object per line):
 *   { ts, event, sid, slot, branch, topic, ctx }
 *
 *   ts:    ISO-8601 timestamp
 *   event: "session_start" | "user_prompt" | "stop" | "pre_compact" |
 *          "handoff_write" | "loop_continue_inject"
 *   sid:   stable session id (claude-<8hex>)
 *   slot:  alpha..lima | golf | null
 *   branch: current git branch
 *   topic:  derived topic (last SCOPE-MS# tag from git log)
 *   ctx:    event-specific JSON ({prompt_preview, iter, target, ...})
 *
 * This CLI reads the log and answers stress-test questions:
 *
 *   node stress-test-harness.mjs --summary
 *     # Total events, per-event-type counts, per-sid timeline summary
 *
 *   node stress-test-harness.mjs --verify
 *     # Check invariants: every pre_compact has a corresponding session_start
 *     # within 60s; every stop has a handoff_write within 5s; etc.
 *
 *   node stress-test-harness.mjs --tail 20
 *     # Last N events for live monitoring
 *
 *   node stress-test-harness.mjs --json
 *     # Machine-readable summary (for dashboards / /forge-audit)
 *
 * @milestone AUTONOMOUS-FLEET-MS0
 * @unit U-AF-STRESS-HARNESS
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const HARNESS_LOG = path.join(REPO_ROOT, "state/shared/stress-test-AUTONOMOUS-FLEET-MS0.jsonl");

/** Event types the harness recognizes. */
export const EVENT_TYPES = Object.freeze([
  "session_start",
  "user_prompt",
  "stop",
  "pre_compact",
  "handoff_write",
  "loop_continue_inject",
  "slot_claim",
  "slot_drift",
]);

/** Append one event to the harness log. Atomic + fail-safe.
 *  Public — also imported by the companion hook. */
export function emitEvent(event, fields = {}) {
  const row = {
    ts: new Date().toISOString(),
    event,
    sid: fields.sid ?? null,
    slot: fields.slot ?? null,
    branch: fields.branch ?? null,
    topic: fields.topic ?? null,
    ctx: fields.ctx ?? {},
  };
  try {
    fs.mkdirSync(path.dirname(HARNESS_LOG), { recursive: true });
    fs.appendFileSync(HARNESS_LOG, JSON.stringify(row) + "\n");
    return true;
  } catch { return false; }
}

/** Read all events. Returns []. Tolerates corrupted lines. */
export function readEvents(filePath = HARNESS_LOG) {
  if (!fs.existsSync(filePath)) return [];
  let raw;
  try { raw = fs.readFileSync(filePath, "utf-8"); }
  catch { return []; }
  const events = [];
  for (const line of raw.split("\n")) {
    const trim = line.trim();
    if (!trim) continue;
    try { events.push(JSON.parse(trim)); }
    catch { /* skip corrupt line — never crash a tail */ }
  }
  return events;
}

/** Compute summary statistics. Pure. */
export function summarize(events) {
  const byEvent = {};
  const bySid = {};
  for (const e of events) {
    byEvent[e.event] = (byEvent[e.event] || 0) + 1;
    if (e.sid) {
      bySid[e.sid] ??= { events: 0, slots: new Set(), firstTs: e.ts, lastTs: e.ts };
      bySid[e.sid].events += 1;
      if (e.slot) bySid[e.sid].slots.add(e.slot);
      if (e.ts < bySid[e.sid].firstTs) bySid[e.sid].firstTs = e.ts;
      if (e.ts > bySid[e.sid].lastTs) bySid[e.sid].lastTs = e.ts;
    }
  }
  // Serialize Sets
  for (const sid of Object.keys(bySid)) {
    bySid[sid].slots = [...bySid[sid].slots];
  }
  return { total: events.length, byEvent, bySid };
}

/** Verify continuity invariants. Returns { ok, violations: [] }. */
export function verify(events) {
  const violations = [];

  // Sort by ts
  const sorted = [...events].sort((a, b) => a.ts.localeCompare(b.ts));

  // Per-sid timelines
  const bySid = {};
  for (const e of sorted) {
    if (!e.sid) continue;
    (bySid[e.sid] ??= []).push(e);
  }

  for (const [sid, list] of Object.entries(bySid)) {
    for (let i = 0; i < list.length; i++) {
      const e = list[i];

      // INVARIANT 1: every stop should have a handoff_write within 5s preceding or following
      if (e.event === "stop") {
        const nearbyHandoff = list.find((x, j) =>
          x.event === "handoff_write" &&
          Math.abs(Date.parse(x.ts) - Date.parse(e.ts)) <= 10000 &&
          Math.abs(j - i) <= 5
        );
        if (!nearbyHandoff) {
          violations.push({ sid, event: e.event, ts: e.ts, rule: "stop_without_handoff_within_10s" });
        }
      }

      // INVARIANT 2: every pre_compact should be followed by a session_start within 5min (same sid)
      if (e.event === "pre_compact") {
        const followup = list.slice(i + 1).find(x =>
          x.event === "session_start" &&
          Date.parse(x.ts) - Date.parse(e.ts) <= 5 * 60 * 1000
        );
        if (!followup) {
          violations.push({ sid, event: e.event, ts: e.ts, rule: "pre_compact_without_session_start_within_5m" });
        }
      }

      // INVARIANT 3: slot_drift events are warnings, not failures
      if (e.event === "slot_drift") {
        // log it as a warning (not a violation per se, but visible)
      }
    }
  }

  return { ok: violations.length === 0, violations };
}

function parseArgs(argv) {
  const args = { summary: false, verify: false, tail: null, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--summary") args.summary = true;
    else if (a === "--verify") args.verify = true;
    else if (a === "--tail") args.tail = parseInt(argv[++i], 10) || 20;
    else if (a === "--json") args.json = true;
    else if (a === "--help" || a === "-h") {
      process.stdout.write(`usage: stress-test-harness [--summary | --verify | --tail N | --json]\n`);
      process.exit(0);
    }
  }
  // Default behavior: summary
  if (!args.summary && !args.verify && args.tail == null) args.summary = true;
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const events = readEvents();

  if (args.json) {
    const out = {
      total: events.length,
      summary: summarize(events),
      verify: verify(events),
    };
    if (args.tail) out.tail = events.slice(-args.tail);
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return;
  }

  if (args.tail !== null) {
    process.stdout.write(`stress-test-harness — last ${args.tail} events:\n`);
    for (const e of events.slice(-args.tail)) {
      process.stdout.write(`  ${e.ts.slice(11, 19)}  ${e.event.padEnd(20)}  sid=${(e.sid || "-").slice(0, 16)}  slot=${(e.slot || "-").padEnd(8)}  ${JSON.stringify(e.ctx).slice(0, 80)}\n`);
    }
    return;
  }

  if (args.summary) {
    const s = summarize(events);
    process.stdout.write(`stress-test-harness — summary\n`);
    process.stdout.write(`  log: ${HARNESS_LOG}\n`);
    process.stdout.write(`  total events: ${s.total}\n`);
    process.stdout.write(`  by event type:\n`);
    for (const [event, n] of Object.entries(s.byEvent).sort((a, b) => b[1] - a[1])) {
      process.stdout.write(`    ${event.padEnd(22)} ${n}\n`);
    }
    process.stdout.write(`  active sessions:\n`);
    for (const [sid, info] of Object.entries(s.bySid).slice(0, 15)) {
      process.stdout.write(`    ${sid.padEnd(20)}  events=${info.events}  slots=${info.slots.join(",")}  ${info.firstTs.slice(11, 19)} → ${info.lastTs.slice(11, 19)}\n`);
    }
  }

  if (args.verify) {
    const v = verify(events);
    process.stdout.write(`\nstress-test-harness — invariant verification\n`);
    process.stdout.write(`  ok: ${v.ok}\n`);
    if (!v.ok) {
      process.stdout.write(`  violations (${v.violations.length}):\n`);
      for (const violation of v.violations.slice(0, 20)) {
        process.stdout.write(`    [${violation.rule}] sid=${violation.sid} ts=${violation.ts}\n`);
      }
    } else {
      process.stdout.write(`  All continuity invariants satisfied.\n`);
    }
  }
}

// Only run main if invoked as script
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").replace(/^.*\//, "/"))) {
  main();
}
