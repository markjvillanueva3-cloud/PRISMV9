#!/usr/bin/env node
// tier: T3
/**
 * stop-system-viz-reminder.mjs — Advisory Stop hook.
 *
 * On every Stop event, scan the transcript tail for Write/Edit/MultiEdit/
 * NotebookEdit tool calls that wrote to paths under H:/prism/ during THIS
 * session. If at least one is found and the system-viz refresh wasn't already
 * pinged this session, surface a one-line reminder asking the chat to refresh
 * /system-viz so the graph + wiki entries reflect the new files/edits.
 *
 * Why an advisory:
 *   /system-viz is the canonical visual master-index — the 10-layer node-graph
 *   used by master_index_query, awareness-snapshot, wiki-precheck-inject, the
 *   recall hooks, and operator drill-downs. When a chat adds a file or edits
 *   an existing engine/dispatcher/hook, the graph goes stale until the next
 *   regen cron. Reminding the chat at Stop closes the staleness loop without
 *   forcing a regen synchronously (the chain takes ~8 min on a full repo).
 *
 * Soft + idempotent:
 *   - Fires `additionalContext` only — NEVER `decision:block`. Stop convenience.
 *   - One reminder per session — marker at H:/prism/.claude/cache/viz-reminded-<sid>.marker.
 *   - 30-min marker TTL so a long-running session that crosses the threshold
 *     a second time gets nudged again.
 *
 * Knobs:
 *   PRISM_VIZ_REMINDER_DISABLE=1   — turn off
 *   PRISM_VIZ_REMINDER_MIN_FILES=N — minimum H-drive writes before reminding (default 1)
 */

import fs from "node:fs";
import path from "node:path";

const CACHE_DIR = "H:/prism/.claude/cache";
const TRANSCRIPT_TAIL_BYTES = 512 * 1024;   // last 512 KB — enough for many tool calls
const MARKER_TTL_MS = 30 * 60 * 1000;       // re-nudge after 30 min if Stop fires again
const DEFAULT_MIN_FILES = 1;                // remind on any H: write
const SILENCE = { continue: true, suppressOutput: true };

// Tool names that constitute a "write to disk"
const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

// Path prefixes that count as H: drive (case-insensitive)
const H_DRIVE_PREFIXES = ["h:/prism/", "h:\\prism\\", "h:/", "h:\\"];

function readStdinSync() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function emit(o) { process.stdout.write(JSON.stringify(o)); }

function safeSid(sid) {
  if (typeof sid !== "string" || sid.length === 0) return "global";
  return sid.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global";
}

function markerPath(sid) {
  return path.join(CACHE_DIR, `viz-reminded-${safeSid(sid)}.marker`);
}

function alreadyReminded(sid) {
  try {
    const p = markerPath(sid);
    if (!fs.existsSync(p)) return false;
    const st = fs.statSync(p);
    return (Date.now() - st.mtimeMs) < MARKER_TTL_MS;
  } catch { return false; }
}

function markReminded(sid) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(markerPath(sid), new Date().toISOString());
  } catch { /* best-effort */ }
}

function isHDrivePath(p) {
  if (typeof p !== "string") return false;
  const lower = p.toLowerCase();
  return H_DRIVE_PREFIXES.some(pref => lower.startsWith(pref));
}

function readTail(filePath, maxBytes) {
  let fd = -1;
  try {
    fd = fs.openSync(filePath, "r");
    const { size } = fs.fstatSync(fd);
    const start = size > maxBytes ? size - maxBytes : 0;
    const buf = Buffer.allocUnsafe(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    return buf.toString("utf-8");
  } catch { return ""; }
  finally { if (fd >= 0) { try { fs.closeSync(fd); } catch {} } }
}

/**
 * Scan transcript tail for Write/Edit/MultiEdit/NotebookEdit tool_use entries
 * whose file_path / notebook_path lives under H:. Returns a deduplicated array
 * of absolute paths.
 */
function findHDriveWrites(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return [];
  const raw = readTail(transcriptPath, TRANSCRIPT_TAIL_BYTES);
  if (!raw) return [];
  const lines = raw.split("\n");
  const seen = new Set();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry;
    try { entry = JSON.parse(trimmed); } catch { continue; }
    // Tool calls live inside assistant messages: message.content[].type === "tool_use"
    const content = entry?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type !== "tool_use" || !WRITE_TOOLS.has(block.name)) continue;
      const input = block.input || {};
      const p = input.file_path || input.notebook_path;
      if (typeof p === "string" && isHDrivePath(p)) seen.add(p);
    }
  }
  return Array.from(seen);
}

function main() {
  if (process.env.PRISM_VIZ_REMINDER_DISABLE === "1") { emit(SILENCE); return; }

  const stdin = readStdinSync() || {};
  const sid = stdin.session_id || "global";
  if (alreadyReminded(sid)) { emit(SILENCE); return; }

  const writes = findHDriveWrites(stdin.transcript_path);
  const min = Number(process.env.PRISM_VIZ_REMINDER_MIN_FILES || DEFAULT_MIN_FILES);
  if (writes.length < min) { emit(SILENCE); return; }

  markReminded(sid);

  // Bucket the touched files into categories operators recognize:
  const buckets = { hooks: 0, helpers: 0, engines: 0, dispatchers: 0, skills: 0, scripts: 0, wiki: 0, memory: 0, other: 0 };
  for (const p of writes) {
    const lp = p.toLowerCase().replace(/\\/g, "/");
    if (lp.includes("/.claude/hooks/")) buckets.hooks++;
    else if (lp.includes("/.claude/helpers/")) buckets.helpers++;
    else if (lp.includes("/dispatchers/")) buckets.dispatchers++;
    else if (lp.includes("/engines/")) buckets.engines++;
    else if (lp.includes("/.claude/commands/")) buckets.skills++;
    else if (lp.includes("/scripts/")) buckets.scripts++;
    else if (lp.includes("/knowledge/wiki/")) buckets.wiki++;
    else if (lp.includes("/memory/")) buckets.memory++;
    else buckets.other++;
  }
  const buckSum = Object.entries(buckets).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(", ");

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext: [
        `## 🗺️  /system-viz refresh reminder`,
        ``,
        `This session wrote to **${writes.length}** file(s) under H:/prism (${buckSum}).`,
        ``,
        `The system-viz graph + wiki entries + master-index will go stale until the next regen. Choose one:`,
        ``,
        `  • Fire-and-forget refresh (recommended, async):`,
        `      \`curl -fsS -X POST http://localhost:8765/api/refresh -m 2 >/dev/null 2>&1 &\``,
        `  • Full pipeline (8 min on a clean repo, regenerates wiki + index + embeddings):`,
        `      \`node H:/prism/scripts/regen-wiki-from-viz.mjs\``,
        `  • Open the viewer to confirm changes:`,
        `      \`/system-viz\``,
        ``,
        `Silenced this session (re-fires 30 min after this reminder, or after another Stop if you reset). Disable: \`PRISM_VIZ_REMINDER_DISABLE=1\`.`,
      ].join("\n"),
    },
  });
}

try { main(); } catch { emit(SILENCE); }
