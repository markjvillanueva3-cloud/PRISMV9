#!/usr/bin/env node
// tier: T1
/**
 * mcp-readonly-cache.mjs - duplicate read-only MCP dispatcher-call guard.
 *
 * HIGH-ROI-HOOKS-MS0 / U-HRH02. The MCP-tier sibling of bash-result-cache:
 * PRISM backend dev makes hundreds of `mcp__prism...` dispatcher calls per
 * session and frequently re-issues an IDENTICAL read-only one (re-checking
 * `gap_scan_read`, `db_health`, `master_index_query`, ...). Each re-call makes
 * the dispatcher re-run and re-emit its often-large JSON envelope into
 * context - pure token spend, since the prior result is already in the
 * transcript.
 *
 * PreToolUse on `mcp__prism*`. On the FIRST call of a (tool, action, params)
 * triple it records the key; on an identical re-call within TTL it `deny`s
 * with a pointer to the prior result.
 *
 * SAFETY:
 *  - Only READ-ONLY actions are ever cached/denied. `isReadOnlyAction`
 *    requires the action name to END with a read suffix AND contain NO
 *    mutating verb token. The classifier is CONSERVATIVE BY DESIGN - false
 *    negatives only cost a missed optimization. A false positive (a mutating
 *    action wrongly cached) is bounded too: `deny` is soft and the
 *    count-based escape means the model's re-issue always passes, so even a
 *    misclassification DELAYS a mutating re-call by one hook round-trip - it
 *    never silently DROPS it. `MUTATING_VERB` should still be reviewed when
 *    new dispatcher actions ship (it is an allowlist over an open set).
 *  - `deny` is soft. Deny-loop escape is count-based: the check immediately
 *    after a deny of a key always passes (status/health genuinely change -
 *    the model must always be able to force a fresh read).
 *  - Short TTL (default 3 min - repo + shop state move fast).
 *  - Per-session cache file -> 13+ concurrent fleet chats are race-free
 *    ACROSS sessions. Within one session, parallel `mcp__prism*` tool calls
 *    in a single assistant turn share the file and the load->decide->save is
 *    NOT atomic - a lost update is possible but harmless: a lost call record
 *    only costs a missed dedup, and a lost deny mark self-heals on the next
 *    clean check (it can never drop a mutation - see above). A lock is not
 *    worth it for a best-effort token-saver; the sibling bash-result-cache
 *    accepts the same trade-off.
 *
 * Never breaks a call: best-effort I/O, always exits 0, passes through on
 * any uncertainty. Disable: PRISM_MCP_READONLY_CACHE_DISABLE=1.
 * Knob: PRISM_MCP_CACHE_TTL_MS (default 180000).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

// CACHE_DIR is env-overridable so tests run in a hermetic per-process temp dir
// (no contention with the live wired hook, no cross-suite flake, no pollution
// of the fleet cache). Production default is the shared cache path.
const CACHE_DIR = process.env.PRISM_MCP_CACHE_DIR || "H:/prism/.claude/cache/mcp-readonly-cache";
const TELEMETRY_FILE = "H:/prism/.claude/cache/hook-telemetry.jsonl";
const STALE_FILE_MS = 2 * 60 * 60 * 1000;

export function ttlMs(env = process.env) {
  const n = Number(env.PRISM_MCP_CACHE_TTL_MS);
  return Number.isFinite(n) && n > 0 ? n : 3 * 60 * 1000;
}

const READ_SUFFIX =
  /(^|_)(read|status|query|get|list|search|stats|summary|lookup|dashboard|info|coverage|history|inventory|health)$/;
// Mutating verb tokens. Allowlist over an open dispatcher set - kept broad on
// purpose; a false exclusion only costs ROI, an inclusion that mis-fires only
// delays (never drops) a re-issued call. Review when new actions ship.
const MUTATING_VERB =
  /(^|_)(save|create|update|delete|record|set|write|register|claim|release|apply|run|generate|optimize|execute|enqueue|reset|init|sync|capture|ingest|add|remove|store|emit|trigger|publish|build|train|route|decide|select|propose|advance|fire|broadcast|send|mark|promote|approve|install|start|stop|cancel|invoke|adjust|assign|transfer|import|export|submit|enroll|escalate|acknowledge|resolve|migrate|consume|quarantine|revise|dispatch|merge|increment|override|veto|evict|splice|rewrite|calibrate|tune|connect|disconnect|complete|close|open|flush|clear|unmask|unregister|deregister|kill|reap|retire|rollback|demote|drain|refresh|configure|toggle|bind|seed|backfill|consolidate|abort|pause|resume|deploy|spawn|dispose)(_|$)/;

/**
 * True only when the action is safe to dedup: a read-suffixed name with no
 * mutating verb anywhere. Conservative - when in doubt, NOT read-only.
 */
export function isReadOnlyAction(action) {
  const a = String(action || "");
  if (!a) return false;
  if (MUTATING_VERB.test(a)) return false;
  return READ_SUFFIX.test(a);
}

// Sentinel for `undefined` values inside params. Plain ASCII, distinct from
// anything JSON.stringify can emit (which always quotes strings) so it never
// collides with a real value or with `JSON.stringify(null)` === "null".
const UNDEF_SENTINEL = "__undef__";

/** Deterministic stringify - object key order never affects the cache key. */
export function stableStringify(v) {
  if (v === undefined) return UNDEF_SENTINEL;
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? UNDEF_SENTINEL;
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  return (
    "{" +
    Object.keys(v)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + stableStringify(v[k]))
      .join(",") +
    "}"
  );
}

export function cacheKey(toolName, action, params) {
  return crypto
    .createHash("sha1")
    .update(`${toolName}::${action}::${stableStringify(params ?? null)}`)
    .digest("hex");
}

/** Pure decision: deny a fresh duplicate; the first post-deny check escapes. */
export function decideMcpCheck({ entry, denyMark, ttl, now }) {
  if (!entry || typeof entry.ts !== "number") return { action: "pass", reason: "no-entry" };
  if (typeof denyMark === "number") return { action: "pass", reason: "deny-loop-escape" };
  if (now - entry.ts > ttl) return { action: "pass", reason: "expired" };
  return { action: "deny", reason: "fresh-dup", entry };
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch {
    return null;
  }
}

function sid8(event) {
  const sid =
    event.session_id || event.sessionId || process.env.CLAUDE_SESSION_ID || "_";
  return String(sid).slice(0, 8).replace(/[^A-Za-z0-9_-]/g, "_");
}

function cacheFileFor(event) {
  return path.join(CACHE_DIR, `${sid8(event)}.json`);
}

function loadCache(file) {
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (j && typeof j === "object") {
      return {
        calls: j.calls && typeof j.calls === "object" ? j.calls : {},
        denies: j.denies && typeof j.denies === "object" ? j.denies : {},
      };
    }
  } catch {
    /* fall through */
  }
  return { calls: {}, denies: {} };
}

function saveCache(file, data) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ calls: data.calls, denies: data.denies }), "utf-8");
  } catch {
    /* non-fatal */
  }
}

function pruneCallsAndFiles(data) {
  const now = Date.now();
  // INVARIANT: ttlGuard >= ttlMs() always. A deny mark and its paired call
  // record are pruned under the SAME threshold, so a pruned deny mark is
  // always accompanied by an already-expired call entry - `decideMcpCheck`
  // then returns `expired` -> pass. Do NOT lower ttlGuard below ttlMs() or
  // the deny-loop escape can be defeated.
  const ttlGuard = Math.max(ttlMs(), 60_000);
  for (const [k, v] of Object.entries(data.calls)) {
    if (!v || typeof v.ts !== "number" || now - v.ts > ttlGuard) delete data.calls[k];
  }
  for (const [k, v] of Object.entries(data.denies)) {
    if (typeof v !== "number" || now - v > ttlGuard) delete data.denies[k];
  }
  try {
    for (const f of fs.readdirSync(CACHE_DIR)) {
      if (!f.endsWith(".json")) continue;
      const p = path.join(CACHE_DIR, f);
      try {
        if (now - fs.statSync(p).mtimeMs > STALE_FILE_MS) fs.unlinkSync(p);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* dir may not exist */
  }
}

function logTelemetry(rec) {
  try {
    fs.appendFileSync(TELEMETRY_FILE, JSON.stringify(rec) + "\n", "utf-8");
  } catch {
    /* non-fatal */
  }
}

function emitPass() {
  process.stdout.write(JSON.stringify({ continue: true }));
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

const AGE_SEC_THRESHOLD = 90; // below this, render age in seconds not minutes

function fmtAge(ms) {
  const s = Math.round(ms / 1000);
  if (s < AGE_SEC_THRESHOLD) return `${Math.max(1, s)}s`;
  return `${Math.round(s / 60)}m`;
}

/** Absent / null / empty-object / empty-array params all key the same - "no args". */
function normalizeParams(p) {
  if (p && typeof p === "object") {
    const len = Array.isArray(p) ? p.length : Object.keys(p).length;
    if (len > 0) return p;
  }
  return null;
}

export function main() {
  if (process.env.PRISM_MCP_READONLY_CACHE_DISABLE === "1") return emitPass();
  const event = readStdin();
  if (!event) return emitPass();
  if ((event.hook_event_name || event.hookEventName) !== "PreToolUse") return emitPass();

  const tool = String(event.tool_name || "");
  if (!tool.startsWith("mcp__prism")) return emitPass();

  const input = event.tool_input || event.toolInput || {};
  const action = input && typeof input.action === "string" ? input.action : "";
  if (!action || !isReadOnlyAction(action)) return emitPass();

  const key = cacheKey(tool, action, normalizeParams(input.params));
  const file = cacheFileFor(event);
  const data = loadCache(file);

  const decision = decideMcpCheck({
    entry: data.calls[key],
    denyMark: data.denies[key],
    ttl: ttlMs(),
    now: Date.now(),
  });

  if (decision.reason === "deny-loop-escape") {
    delete data.denies[key];
    data.calls[key] = { ts: Date.now(), action };
    saveCache(file, data);
    return emitPass();
  }

  if (decision.action === "deny") {
    data.denies[key] = Date.now(); // one-shot mark - next check escapes
    saveCache(file, data);
    logTelemetry({
      ts: new Date().toISOString(),
      hook: "mcp-readonly-cache",
      event: "deny",
      key_hash: key.slice(0, 12),
      tool,
      action,
    });
    emitDeny(
      `mcp-readonly-cache: \`${tool}\` action \`${action}\` was called with identical ` +
        `params ${fmtAge(Date.now() - decision.entry.ts)} ago - its result is already in this ` +
        `session's context. Summarize from that result instead of re-calling.\n` +
        `If you need a fresh read (status/health values do change), re-issue - the next attempt passes through.`,
    );
    return;
  }

  // miss - record the call
  data.calls[key] = { ts: Date.now(), action };
  pruneCallsAndFiles(data);
  saveCache(file, data);
  logTelemetry({
    ts: new Date().toISOString(),
    hook: "mcp-readonly-cache",
    event: "miss-recorded",
    key_hash: key.slice(0, 12),
    action,
  });
  return emitPass();
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  try {
    main();
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}
