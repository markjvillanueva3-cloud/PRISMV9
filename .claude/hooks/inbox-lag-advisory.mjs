#!/usr/bin/env node
// tier: T4
/**
 * inbox-lag-advisory.mjs — Stop hook
 *
 * OBSIDIAN-COMPOUND-MS1/U-INBOX-LAYER.
 *
 * Scans `H:/prism/knowledge/memories/inbox/` on session Stop and emits an
 * advisory when files older than INBOX_PROCESSING_LAG_HOURS (72h) are present.
 * NEVER BLOCKS — always returns continue:true. The advisory text includes
 * the cyrilXBT framing so future sessions remember WHY inbox lag matters.
 *
 * Stdin: Stop hook event (ignored — this hook does not gate on tool/event)
 * Stdout: { continue: true, hookSpecificOutput: { ... } } (advisory) or
 *         { continue: true } (no stale files)
 * Exit: always 0
 *
 * @milestone OBSIDIAN-COMPOUND-MS1/U-INBOX-LAYER
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const INBOX_PATH = process.env.PRISM_INBOX_PATH ?? "H:/prism/knowledge/memories/inbox";
const LAG_THRESHOLD_HOURS = Number(process.env.INBOX_PROCESSING_LAG_HOURS ?? 72);
const LAG_THRESHOLD_MS = LAG_THRESHOLD_HOURS * 60 * 60 * 1000;
const MAX_REPORT = 5;

function readStdinSafe() {
  try {
    const buf = readFileSync(0);
    if (buf.length === 0) return null;
    try { return JSON.parse(buf.toString("utf8")); } catch { return null; }
  } catch { return null; }
}

export function findStaleFiles(dir, thresholdMs, nowMs = Date.now()) {
  if (!existsSync(dir)) return [];
  const stale = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return []; }
  for (const f of entries) {
    if (f === ".gitkeep" || f.startsWith(".")) continue;
    const full = join(dir, f);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (!st.isFile()) continue;
    const age = nowMs - st.mtimeMs;
    if (age > thresholdMs) {
      stale.push({ name: f, ageHours: Math.round(age / 3600000) });
    }
  }
  return stale;
}

export function buildResponse(stale, threshold = LAG_THRESHOLD_HOURS) {
  if (stale.length === 0) return { continue: true };
  const summary = stale.slice(0, MAX_REPORT).map((s) => `${s.name} (${s.ageHours}h)`).join(", ");
  const overflow = stale.length > MAX_REPORT ? ` and ${stale.length - MAX_REPORT} more` : "";
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext:
        `inbox-lag: ${stale.length} file(s) older than ${threshold}h: ${summary}${overflow}. ` +
        `Run /weekly-synthesis or process manually. ` +
        `(cyrilXBT: a vault that never talks back is not a second brain.)`,
    },
  };
}

function main() {
  readStdinSafe();
  const stale = findStaleFiles(INBOX_PATH, LAG_THRESHOLD_MS);
  console.log(JSON.stringify(buildResponse(stale)));
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` ||
    process.argv[1]?.endsWith("inbox-lag-advisory.mjs")) {
  main();
}
