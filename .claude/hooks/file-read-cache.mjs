#!/usr/bin/env node
/**
 * file-read-cache.mjs — PreToolUse:Read hard-dedup hook
 *   HOOKS-AUTOMATION-V2-MS0 / U-HKA01 ("Read-once PreToolUse dedup hook")
 *
 * DENIES a repeat Read of a file already read THIS SESSION when nothing has
 * changed since — same (sessionId, absPath, mtimeMs, offset, limit). The
 * content is already in the model's context; an identical re-read is pure
 * token waste. The harness itself warns against verification re-reads — this
 * enforces it with a hard block.
 *
 * Cache key:  sessionId :: canonicalPath :: mtimeMs :: offset :: limit
 *   - canonicalPath = fs.realpath (resolves ../, symlinks/junctions, and the
 *     real on-disk casing) — so `H:/PRISM/x`, `H:/prism/x`, `H:\prism\x`, and a
 *     symlinked path to the same file all dedup to ONE key (Codex review fix).
 *   - per-session  → 6 concurrent chats never collide
 *   - mtime in key → any edit / external write auto-invalidates the entry
 *   - offset/limit in key → reading a *different* slice is always allowed;
 *     ONLY a byte-identical re-read of an unchanged file is denied
 *
 * Fails OPEN, always (a dedup hook must never be the reason a Read can't run):
 *   - kill switch:  PRISM_READ_CACHE = 0 | off | false   → no-op
 *   - empty / garbled stdin, missing file, corrupt cache  → no-op
 *   - exempt path  → no-op  (session-volatile files: handoffs, settings.json,
 *     MEMORY.md, CLAUDE.md, anything under /state/ or /.claude/cache/, *.jsonl,
 *     *.log — these are legitimately re-read mid-session)
 *   - directory read, image / PDF / notebook              → no-op
 *
 * Also wired as a PreCompact hook: on compact, the prior turns (and the file
 * contents in them) are summarized away, so re-reads become legitimate again —
 * clearSession() drops the compacting session's cache entries.
 *
 * Tunables (env): PRISM_READ_CACHE_DIR  (default H:/prism/.claude/cache)
 *                 PRISM_READ_CACHE_TTL_MS (default 30 min — also the
 *                   post-compact safety valve if hook_event_name is absent)
 *                 PRISM_READ_CACHE_MAX  (default 400 entries; LRU-by-ts evict)
 *
 * Wired via:  .claude/hooks/bundles/read-bundle.mjs  (PreToolUse:Read)
 *             settings.json → PreCompact group       (cache clear on compact)
 * Tested by:  .claude/hooks/__tests__/file-read-cache.test.mjs
 *
 * History: built under AGI-INFRA-MS1 (Phase A token efficiency) but left an
 * orphan (never referenced by settings.json — only the soft-warning sibling
 * read-once-cache.mjs was wired). Wired + hardened (exempt list, size cap,
 * directory skip, kill switch, PreCompact clear, testable exports) under
 * HOOKS-AUTOMATION-V2 U-HKA01.
 */

import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── config (env-overridable for sandboxed tests) ─────────────────────────────
const CACHE_DIR = process.env.PRISM_READ_CACHE_DIR || "H:/prism/.claude/cache";
const CACHE_BASENAME = "file-read-cache.json";
const TELEMETRY_BASENAME = "hook-telemetry.jsonl";
const TTL_MS = posIntEnv("PRISM_READ_CACHE_TTL_MS", 30 * 60 * 1000);
const MAX_ENTRIES = posIntEnv("PRISM_READ_CACHE_MAX", 400);

const SKIP_EXT = new Set([
  ".pdf", ".ipynb", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico",
]);

// Files that legitimately change / get re-read during a single session — never
// hard-deny these. Matched case-insensitively on the forward-slashed path.
const EXEMPT_SUFFIXES = [
  "handoff.md", "current_position.md", "resume_at_work.md",
  "settings.json", "settings.local.json", "memory.md", "claude.md", "agents.md", "gemini.md",
  "roadmap-index.json", "session_artifacts.json", "agent_workboard.json", "agent_workboard.md",
  "agent_chat.md", "agent_coordination_status.md", "session-edit-counter.json",
  "health_check_report.json", "build_state.json", "build_state.md",
  "milestone_progress.json", "milestone_progress.md", "roadmap-drift-report.json",
];
const EXEMPT_PATH_SEGMENTS = ["/state/", "/.claude/cache/", "/data/state/", "/handoffs/"];

function posIntEnv(name, dflt) {
  const raw = process.env[name];
  if (raw == null || raw === "") return dflt;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

function disabled() {
  const v = String(process.env.PRISM_READ_CACHE || "").trim().toLowerCase();
  return v === "0" || v === "off" || v === "false" || v === "no";
}

export function isExempt(filePath) {
  const n = String(filePath || "").replace(/\\/g, "/").toLowerCase();
  if (!n) return true;
  if (n.endsWith(".jsonl") || n.endsWith(".log")) return true;
  if (/(^|\/)handoff-/.test(n)) return true;
  if (EXEMPT_PATH_SEGMENTS.some((seg) => n.includes(seg))) return true;
  return EXEMPT_SUFFIXES.some((s) => n.endsWith(s));
}

export function cacheKey(canonPath, mtimeMs, offset, limit, sessionId) {
  return `${sessionId ?? "_"}::${canonPath}::${mtimeMs}::${offset ?? 0}::${limit ?? 0}`;
}

/**
 * Canonical, comparable form of a path so two reads of the SAME file via
 * different spellings dedup to one cache key. fs.realpath resolves `..`,
 * symlinks/junctions, and (on case-insensitive Windows) reports the real
 * on-disk casing; if it throws (it shouldn't for a file we just stat'd) we
 * fall back to path.resolve; on Windows we also lowercase as a backstop for
 * that fallback path. Fail-open: a normalization failure just yields a key
 * that may miss a dedup — never a wrongful deny.
 */
export async function canonicalPath(filePath) {
  let p;
  try {
    p = await fs.realpath(filePath);
  } catch {
    p = path.resolve(String(filePath ?? ""));
  }
  return process.platform === "win32" ? p.toLowerCase() : p;
}

/** Drop expired entries, then LRU-evict (oldest `ts` first) down to `max`. */
export function pruneCache(cache, now = Date.now(), max = MAX_ENTRIES, ttlMs = TTL_MS) {
  const live = {};
  for (const [k, v] of Object.entries(cache || {})) {
    if (v && typeof v === "object" && typeof v.ts === "number" && now - v.ts < ttlMs) {
      live[k] = v;
    }
  }
  const keys = Object.keys(live);
  if (keys.length <= max) return live;
  keys.sort((a, b) => live[a].ts - live[b].ts); // oldest first
  for (const k of keys.slice(0, keys.length - max)) delete live[k];
  return live;
}

// ── I/O (best-effort; any failure → treat as empty/no-op). `dir` is a param
//    so the test suite can point it at a sandbox; defaults to the env/const. ──
export async function loadCache(dir = CACHE_DIR) {
  try {
    const parsed = JSON.parse(await fs.readFile(path.join(dir, CACHE_BASENAME), "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
export async function saveCache(cache, dir = CACHE_DIR) {
  try {
    await fs.mkdir(dir, { recursive: true });
    const target = path.join(dir, CACHE_BASENAME);
    const tmp = `${target}.tmp-${process.pid}`;
    await fs.writeFile(tmp, JSON.stringify(cache), "utf8");
    await fs.rename(tmp, target); // atomic-ish: avoids torn reads under 6-chat load
  } catch {
    /* non-fatal — cache is best-effort */
  }
}
async function logTelemetry(event, dir = CACHE_DIR) {
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(path.join(dir, TELEMETRY_BASENAME), JSON.stringify(event) + "\n", "utf8");
  } catch {
    /* non-fatal */
  }
}

/**
 * Pure-ish decision: given a parsed Read event and the (already-pruned) cache,
 * decide what to do. Does the one unavoidable I/O — fs.stat on the target — to
 * read mtime + detect directories. Returns one of:
 *   { kind: "skip" }                       — do nothing, write nothing
 *   { kind: "deny",   key, ageSec, reason }— emit a PreToolUse deny
 *   { kind: "record", key, entry }         — cache miss; caller records + passes
 */
export async function decideRead(event, cache, now = Date.now()) {
  if (!event || event.tool_name !== "Read") return { kind: "skip" };
  const input = event.tool_input || {};
  const filePath = input.file_path;
  if (typeof filePath !== "string" || filePath.length === 0) return { kind: "skip" };
  if (SKIP_EXT.has(path.extname(filePath).toLowerCase())) return { kind: "skip" };
  if (isExempt(filePath)) return { kind: "skip" };

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return { kind: "skip" }; // missing file — let the Read tool fail naturally
  }
  if (stat.isDirectory()) return { kind: "skip" }; // dir reads are cheap & not re-read content

  const sessionId = event.session_id || event.sessionId || process.env.CLAUDE_SESSION_ID;
  const canonPath = await canonicalPath(filePath);
  const key = cacheKey(canonPath, stat.mtimeMs, input.offset, input.limit, sessionId);
  const hit = cache && cache[key];
  if (hit && typeof hit.ts === "number") {
    const ageSec = Math.max(0, Math.round((now - hit.ts) / 1000));
    const ageTxt = ageSec < 90 ? `${ageSec}s` : `${Math.round(ageSec / 60)}m`;
    const slice = input.offset != null || input.limit != null ? " (same offset/limit)" : "";
    return {
      kind: "deny",
      key,
      ageSec,
      reason:
        `read-once-guard: '${filePath}'${slice} was already read ${ageTxt} ago in this session ` +
        `and is unchanged (mtime ${Math.round(stat.mtimeMs)}). Its content is in your context — use it, ` +
        `don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. ` +
        `If you just edited it, the Edit/Write tools already track the new state for you. ` +
        `(disable: PRISM_READ_CACHE=0)`,
    };
  }
  return { kind: "record", key, entry: { ts: now, path: filePath } };
}

/** PreCompact: drop this session's entries — post-compact, re-reads are legit. */
export async function clearSession(sessionId, dir = CACHE_DIR) {
  if (!sessionId) return 0;
  const cache = await loadCache(dir);
  const prefix = `${sessionId}::`;
  let removed = 0;
  for (const k of Object.keys(cache)) {
    if (k.startsWith(prefix)) {
      delete cache[k];
      removed++;
    }
  }
  if (removed > 0) await saveCache(cache, dir);
  return removed;
}

function emitDeny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
}

function readStdinSync() {
  try {
    if (process.stdin.isTTY) return "";
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

async function main() {
  if (disabled()) return; // kill switch — silent no-op

  const raw = readStdinSync();
  if (!raw || !raw.trim()) return;
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return;
  }

  // PreCompact wiring: clear the compacting session's cache, then we're done.
  if (event && event.hook_event_name === "PreCompact") {
    const removed = await clearSession(event.session_id || event.sessionId);
    await logTelemetry({
      ts: new Date().toISOString(),
      hook: "file-read-cache",
      event: "precompact-clear",
      session_id: event.session_id ?? null,
      removed,
    });
    return;
  }

  if (!event || event.tool_name !== "Read") return;

  const cache = pruneCache(await loadCache());
  const decision = await decideRead(event, cache);
  if (decision.kind === "skip") return;

  const sessionId = event.session_id || event.sessionId || process.env.CLAUDE_SESSION_ID;
  if (decision.kind === "deny") {
    await logTelemetry({
      ts: new Date().toISOString(),
      hook: "file-read-cache",
      event: "deny",
      session_id: sessionId ?? null,
      file: event.tool_input?.file_path ?? null,
      age_seconds: decision.ageSec,
    });
    emitDeny(decision.reason);
    return;
  }

  // cache miss → record + let the Read proceed
  cache[decision.key] = decision.entry;
  await saveCache(pruneCache(cache));
  await logTelemetry({
    ts: new Date().toISOString(),
    hook: "file-read-cache",
    event: "miss-recorded",
    session_id: sessionId ?? null,
    file: event.tool_input?.file_path ?? null,
  });
}

// Only run when invoked as a script (not when imported by the test suite).
const invokedDirectly = (() => {
  try {
    return process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
})();
if (invokedDirectly) {
  main().catch(() => {
    /* fail open: emit nothing → bundle treats this hook as a no-op */
  });
}
