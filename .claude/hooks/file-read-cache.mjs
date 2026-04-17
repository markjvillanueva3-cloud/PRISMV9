#!/usr/bin/env node
/**
 * File Read Cache — PreToolUse Hook
 *
 * Blocks duplicate Read operations within a session to avoid burning tokens
 * re-reading files that are already in conversation context.
 *
 * Cache key: file_path + mtime + offset + limit (so edits or different slices
 * invalidate the cache automatically).
 *
 * TTL: 2 hours (proxy for active session). Cache is local JSON keyed by
 * absolute path — no cross-session contamination.
 *
 * Output:
 *  - cache miss   -> silent pass (no decision field)
 *  - cache hit    -> permissionDecision "deny" with guidance to use context
 *
 * Never blocks if:
 *  - file no longer exists (mtime lookup fails)
 *  - cache file is corrupt
 *  - tool input is malformed
 *
 * Related: AGI-INFRA-MS1 (Phase A token efficiency).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";

const CACHE_DIR = "H:/prism/.claude/cache";
const CACHE_FILE = `${CACHE_DIR}/file-read-cache.json`;
const TELEMETRY_FILE = `${CACHE_DIR}/hook-telemetry.jsonl`;
const TTL_MS = 2 * 60 * 60 * 1000;

async function logTelemetry(event) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.appendFile(TELEMETRY_FILE, JSON.stringify(event) + "\n", "utf8");
  } catch {
    // non-fatal
  }
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => {
      data += line + "\n";
    });
    rl.on("close", () => resolve(data));
  });
}

async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch {
    // non-fatal: cache is best-effort
  }
}

function pruneExpired(cache) {
  const now = Date.now();
  const pruned = {};
  for (const [k, v] of Object.entries(cache)) {
    if (v && typeof v === "object" && typeof v.ts === "number" && now - v.ts < TTL_MS) {
      pruned[k] = v;
    }
  }
  return pruned;
}

function cacheKey(filePath, mtimeMs, offset, limit, sessionId) {
  return `${sessionId ?? "_"}::${filePath}::${mtimeMs}::${offset ?? 0}::${limit ?? 0}`;
}

function emitDecision(reason) {
  const out = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(out));
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  if (event.tool_name !== "Read") process.exit(0);
  const input = event.tool_input || {};
  const filePath = input.file_path;
  if (typeof filePath !== "string" || filePath.length === 0) process.exit(0);

  // Skip image/PDF/notebook reads — these are not cheap text reads
  const ext = path.extname(filePath).toLowerCase();
  if ([".pdf", ".ipynb", ".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
    process.exit(0);
  }

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    process.exit(0); // file missing — let Read fail naturally
  }

  const sessionId = event.session_id || event.sessionId || process.env.CLAUDE_SESSION_ID;
  const key = cacheKey(filePath, stat.mtimeMs, input.offset, input.limit, sessionId);
  const cache = pruneExpired(await loadCache());

  if (cache[key]) {
    const age = Math.round((Date.now() - cache[key].ts) / 1000);
    await logTelemetry({
      ts: new Date().toISOString(),
      hook: "file-read-cache",
      event: "deny",
      session_id: sessionId ?? null,
      file: filePath,
      age_seconds: age,
    });
    emitDecision(
      `File already read ${age}s ago in this session (mtime unchanged). Content is in context — do not re-read. If you need a different slice, pass offset/limit. If you edited the file, the Edit tool tracks state for you.`,
    );
    process.exit(0);
  }

  cache[key] = { ts: Date.now(), path: filePath };
  await saveCache(cache);
  await logTelemetry({
    ts: new Date().toISOString(),
    hook: "file-read-cache",
    event: "miss-recorded",
    session_id: sessionId ?? null,
    file: filePath,
  });
  process.exit(0);
}

main().catch(() => process.exit(0));
