#!/usr/bin/env node
// tier: T3
/**
 * read-once-cache.mjs — PreToolUse Read hook.
 *
 * Maintains a per-session cache of recently Read files. When the same file
 * is about to be Read again with same offset/limit AND its disk mtime hasn't
 * changed since the cached read, emit a soft warning suggesting the model
 * skip the re-Read.
 *
 * Cannot block the Read — the model may have a legitimate reason. Just
 * surfaces "you read this 4 lines ago, mtime unchanged" as additionalContext.
 *
 * Per-session: cache key includes session_id so multiple chats don't collide.
 * Cache is JSON file at H:/prism/.claude/cache/read-cache-<sid>.json,
 * pruned to last 50 entries by recency, entries TTL'd at 30 min.
 *
 * @hook PreToolUse:Read
 */

import * as fs from "node:fs";
import * as path from "node:path";

const CACHE_DIR = path.resolve("H:/prism/.claude/cache");
const MAX_ENTRIES = 50;
const ENTRY_TTL_MS = 30 * 60 * 1000;

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}
function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

function safeSid(sid) {
  if (typeof sid !== "string" || !sid) return "global";
  return sid.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global";
}
function cachePath(sid) { return path.join(CACHE_DIR, `read-cache-${safeSid(sid)}.json`); }

function loadCache(sid) {
  try {
    const p = cachePath(sid);
    if (!fs.existsSync(p)) return [];
    const arr = JSON.parse(fs.readFileSync(p, "utf-8"));
    if (!Array.isArray(arr)) return [];
    const now = Date.now();
    return arr.filter((e) => e && typeof e.path === "string" && (now - e.recordedAt) < ENTRY_TTL_MS);
  } catch { return []; }
}
function saveCache(sid, entries) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cachePath(sid), JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch { /* ignore */ }
}

function main() {
  const stdin = readStdinSafe();
  const passthrough = () => emit({ continue: true });
  if (!stdin || stdin.tool_name !== "Read") return passthrough();

  const filePath = stdin.tool_input?.file_path;
  if (typeof filePath !== "string" || filePath.length === 0) return passthrough();

  const offset = stdin.tool_input?.offset;
  const limit = stdin.tool_input?.limit;
  const sid = stdin.session_id;
  const entries = loadCache(sid);

  // Look for prior read of same file with same window
  const prior = entries.find((e) =>
    e.path === filePath && e.offset === (offset ?? null) && e.limit === (limit ?? null),
  );

  // Update cache: append current request (mtime check happens in PostToolUse;
  // here we just record that we're about to read).
  let mtime = null;
  try { mtime = fs.statSync(filePath).mtimeMs; } catch { /* file may not exist yet — that's fine */ }

  const newEntry = {
    path: filePath,
    offset: offset ?? null,
    limit: limit ?? null,
    mtime,
    recordedAt: Date.now(),
  };
  // Drop any prior entry for this exact key, push fresh
  const next = entries.filter((e) => !(e.path === filePath && e.offset === newEntry.offset && e.limit === newEntry.limit));
  next.push(newEntry);
  saveCache(sid, next);

  // If prior read found AND mtime hasn't changed → suggest skip
  if (prior && prior.mtime !== null && mtime !== null && prior.mtime === mtime) {
    const ageMin = Math.floor((Date.now() - prior.recordedAt) / 60000);
    emit({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `read-once-cache: ${filePath} was read ${ageMin}min ago with same offset/limit, file mtime unchanged. Consider whether the re-read is necessary; you may already have the content in context.`,
      },
    });
    return;
  }

  passthrough();
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
