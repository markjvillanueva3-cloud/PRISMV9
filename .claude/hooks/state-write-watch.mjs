#!/usr/bin/env node
// tier: T1
/**
 * state-write-watch.mjs — PreToolUse concurrent-write detector for state JSONs
 *
 * WHY: 4+ concurrent Claude/Codex chats routinely overwrite shared state files
 * (state/*.json, mcp-server/data/state/*.json, state/shared/*.json). The Write
 * tool replaces entire content — if two sessions Write the same file back-to-
 * back, the later write silently clobbers the earlier one.
 *
 * This hook records every Write to a watched state file in a small per-file
 * log, and surfaces a WARNING (non-blocking) when another session wrote the
 * same file within the last 60 seconds.
 *
 * It does NOT block — git-anti-clobber + atomic tmp+rename prevent hard
 * corruption; this hook prevents silent merge loss by making the overlap
 * visible.
 *
 * FIRES ON: PreToolUse, matcher ^Write$
 * OUTPUT:
 *   - no recent overlap → silent pass (records our write)
 *   - recent overlap from another session → permissionDecision "allow" with
 *     warning, records our write regardless
 *
 * AGI-INFRA Phase B / B2-STATE-WATCH.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";

const CACHE_DIR = "H:/prism/.claude/cache";
const CACHE_FILE = `${CACHE_DIR}/state-write-watch.json`;
const TELEMETRY_FILE = `${CACHE_DIR}/hook-telemetry.jsonl`;
const OVERLAP_WINDOW_MS = 60 * 1000; // 60s — recent write from other session
const RETENTION_MS = 30 * 60 * 1000; // 30min — keep recent writes in cache

// Path prefixes that identify shared-state JSON files.
const WATCHED_PREFIXES = [
  "H:/prism/state/",
  "H:\\prism\\state\\",
  "H:/prism/mcp-server/data/state/",
  "H:\\prism\\mcp-server\\data\\state\\",
  "H:/prism/mcp-server/data/shared/",
  "H:\\prism\\mcp-server\\data\\shared\\",
];

async function logTelemetry(event) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.appendFile(TELEMETRY_FILE, JSON.stringify(event) + "\n", "utf8");
  } catch { /* non-fatal */ }
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => { data += line + "\n"; });
    rl.on("close", () => resolve(data));
  });
}

async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return (typeof parsed === "object" && parsed !== null) ? parsed : {};
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch { /* non-fatal */ }
}

function pruneExpired(cache) {
  const now = Date.now();
  const pruned = {};
  for (const [filePath, writes] of Object.entries(cache)) {
    if (!Array.isArray(writes)) continue;
    const fresh = writes.filter((w) => now - w.ts < RETENTION_MS);
    if (fresh.length > 0) pruned[filePath] = fresh;
  }
  return pruned;
}

function normalizePath(p) {
  return path.resolve(p).replace(/\\/g, "/");
}

function isWatched(filePath) {
  const norm = filePath.replace(/\\/g, "/");
  return WATCHED_PREFIXES.some((pref) => norm.startsWith(pref.replace(/\\/g, "/")))
      && norm.toLowerCase().endsWith(".json");
}

function emitAllowWithWarning(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: reason,
    },
  }));
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);
  let event;
  try { event = JSON.parse(raw); } catch { process.exit(0); }

  if (event.tool_name !== "Write") process.exit(0);
  const input = event.tool_input || {};
  const filePath = input.file_path;
  if (typeof filePath !== "string" || !filePath) process.exit(0);

  const normalized = normalizePath(filePath);
  if (!isWatched(normalized)) process.exit(0);

  const sessionId = event.session_id || event.sessionId || process.env.CLAUDE_SESSION_ID || "unknown";
  const now = Date.now();

  let cache = pruneExpired(await loadCache());

  const existing = cache[normalized] || [];
  const recentOther = existing.find((w) =>
    w.session !== sessionId && (now - w.ts) < OVERLAP_WINDOW_MS
  );

  // Record our write regardless
  const updated = [...existing, { session: sessionId, ts: now }];
  cache[normalized] = updated.slice(-10); // cap per-file log
  await saveCache(cache);

  if (!recentOther) {
    await logTelemetry({
      ts: new Date().toISOString(),
      hook: "state-write-watch",
      event: "clean-write",
      session_id: sessionId,
      file: normalized,
    });
    process.exit(0);
  }

  const ageSec = Math.round((now - recentOther.ts) / 1000);
  await logTelemetry({
    ts: new Date().toISOString(),
    hook: "state-write-watch",
    event: "overlap-warning",
    session_id: sessionId,
    file: normalized,
    other_session: recentOther.session,
    age_seconds: ageSec,
  });

  emitAllowWithWarning(
    `⚠ CONCURRENT STATE WRITE DETECTED\n` +
    `File: ${normalized}\n` +
    `Another session wrote this file ${ageSec}s ago (session: ${recentOther.session}).\n` +
    `Your Write tool REPLACES the entire file — any changes they made since you\n` +
    `last read will be silently lost.\n\n` +
    `RECOMMEND: before writing, re-read the file to merge their changes.\n` +
    `Or use Edit for targeted changes instead of Write.\n` +
    `(Proceeding — this is a warning, not a gate. git-anti-clobber still serializes commits.)`
  );
  process.exit(0);
}

main().catch(() => process.exit(0));
