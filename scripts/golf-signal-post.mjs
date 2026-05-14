#!/usr/bin/env node
/**
 * golf-signal-post.mjs — CLEANUP-MS0 / U-CLEANUP-F8
 *
 * Unified "golf-signal" channel: a thin write surface for the 7th hygiene
 * chat slot to post compact digests onto the chat bus. Routes through TWO
 * surfaces in lockstep:
 *
 *   1. `chat_bus_signals` table in state/shared/coordination.db (the B10
 *      LedgerStoreEngine's structured table — readable by all chats via
 *      `agent-coordination.mjs`).
 *   2. state/shared/AGENT_CHAT.jsonl (the legacy line-oriented bus that the
 *      `chat-bus-inject.mjs` UserPromptSubmit hook reads on every prompt).
 *
 * Both writes are gated by a rate cap: NO MORE THAN MAX_POSTS_PER_WINDOW
 * golf-signal entries per CHAT_BUS_INJECT_WINDOW_MS. Why a cap: the inject
 * hook surfaces "recent chat-bus" content into every chat's context — an
 * unbounded golf signal stream would crowd out human-authored peer messages.
 *
 * Format contract — golf-signal payloads are DIGESTS, not full findings:
 *   - signal_type: a short slug ("envelope-drift", "wiring-candidates",
 *     "hook-health", "memory-garden", "model-drift", "scrutiny-summary", etc.)
 *   - payload: an object with at most 4 keys: `summary`, `count`, `path`,
 *     `severity`. The `path` should point at the full report file
 *     (state/shared/dashboards/<name>.md) — golf chats are write-allowlisted
 *     for that directory, so the digest can always reference a real artifact.
 *
 * Read-side: peers fetch these via `prism_context:list_chat_bus_signals` or
 * by tailing AGENT_CHAT.jsonl with the `signalType:"golf-signal"` filter.
 *
 * @module scripts/golf-signal-post
 */

import { existsSync, mkdirSync, appendFileSync, statSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ── CONSTANTS ────────────────────────────────────────────────────────────────

export const SCHEMA_VERSION = 1;
export const SIGNAL_TYPE = "golf-signal";
export const MAX_POSTS_PER_WINDOW = 5;
export const CHAT_BUS_INJECT_WINDOW_MS = 30 * 60 * 1000;     // 30 min — matches the hook's lookback
export const DEFAULT_REPO_ROOT = "H:/prism";
export const DEFAULT_DB_RELATIVE = "state/shared/coordination.db";
export const DEFAULT_BUS_JSONL_RELATIVE = "state/shared/AGENT_CHAT.jsonl";
export const PAYLOAD_MAX_BYTES = 4 * 1024;   // keep digests genuinely compact
export const SUMMARY_MAX_CHARS = 240;        // one chat-line worth

const ALLOWED_PAYLOAD_KEYS = new Set(["summary", "count", "path", "severity", "kind"]);
const ALLOWED_SEVERITIES = new Set(["info", "warn", "error", "P0", "P1", "P2", "P3"]);

// ── ARGS ─────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const out = {
    json: false,
    repoRoot: null,
    dbPath: null,
    busJsonlPath: null,
    fromChat: null,            // defaults to "golf-<host>"
    toChat: "*",               // broadcast
    signalKind: null,          // a kind slug; required
    summary: null,             // short text; required
    count: null,
    pathRef: null,             // reference to full report
    severity: "info",
    dryRun: false,
    nowMs: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[i + 1];
    switch (a) {
      case "--json":            out.json = true; break;
      case "--dry-run":         out.dryRun = true; break;
      case "--repo-root":       out.repoRoot = next(); i++; break;
      case "--db":              out.dbPath = next(); i++; break;
      case "--bus-jsonl":       out.busJsonlPath = next(); i++; break;
      case "--from-chat":       out.fromChat = next(); i++; break;
      case "--to-chat":         out.toChat = next(); i++; break;
      case "--kind":            out.signalKind = next(); i++; break;
      case "--summary":         out.summary = next(); i++; break;
      case "--count": {
        const n = Number(next()); i++;
        if (Number.isFinite(n)) out.count = Math.floor(n);
        break;
      }
      case "--path":            out.pathRef = next(); i++; break;
      case "--severity":        out.severity = next(); i++; break;
      case "--now":             out.nowMs = Date.parse(next()); i++; break;
      case "--help":
      case "-h":                out.help = true; break;
      default:
        if (a && a.startsWith("--")) throw new Error(`Unknown flag: ${a}`);
    }
  }
  return out;
}

// ── PATHS ────────────────────────────────────────────────────────────────────

export function resolvePaths(opts) {
  let repoRoot = opts.repoRoot;
  if (!repoRoot) {
    try {
      const here = fileURLToPath(import.meta.url);
      repoRoot = path.resolve(path.dirname(path.dirname(here)));
    } catch {
      repoRoot = DEFAULT_REPO_ROOT;
    }
  } else {
    repoRoot = path.resolve(repoRoot);
  }
  const dbPath = opts.dbPath ?? path.join(repoRoot, DEFAULT_DB_RELATIVE);
  const busJsonlPath = opts.busJsonlPath ?? path.join(repoRoot, DEFAULT_BUS_JSONL_RELATIVE);
  return { repoRoot, dbPath, busJsonlPath };
}

// ── PAYLOAD VALIDATION ───────────────────────────────────────────────────────

/**
 * Validate the input shape before any I/O. Returns null on success or a
 * descriptive error string. Pure.
 */
export function validateSignalInput(input) {
  if (!input || typeof input !== "object") return "input must be an object";
  const { signalKind, summary, severity, count, pathRef } = input;
  if (typeof signalKind !== "string" || signalKind.length === 0) return "signalKind required";
  if (signalKind.length > 64) return "signalKind too long (max 64)";
  if (!/^[a-z0-9_-]+$/.test(signalKind)) return "signalKind must match [a-z0-9_-]";
  if (typeof summary !== "string" || summary.length === 0) return "summary required";
  if (summary.length > SUMMARY_MAX_CHARS) return `summary too long (max ${SUMMARY_MAX_CHARS} chars)`;
  if (severity !== undefined && !ALLOWED_SEVERITIES.has(severity)) {
    return `severity must be one of ${[...ALLOWED_SEVERITIES].join("|")}`;
  }
  if (count !== null && count !== undefined && !Number.isInteger(count)) return "count must be integer if provided";
  if (pathRef !== null && pathRef !== undefined && typeof pathRef !== "string") return "pathRef must be string if provided";
  return null;
}

/**
 * Build the structured payload (the JSON blob stored in `payload_json`).
 * Strips unknown keys, applies caps, enforces shape.
 */
export function buildPayload(input) {
  const payload = {
    kind: input.signalKind,
    summary: input.summary.slice(0, SUMMARY_MAX_CHARS),
    severity: input.severity ?? "info",
  };
  if (Number.isInteger(input.count)) payload.count = input.count;
  if (typeof input.pathRef === "string" && input.pathRef.length > 0) {
    payload.path = input.pathRef.slice(0, 512);
  }
  // Drop any extra keys that snuck in.
  for (const k of Object.keys(payload)) {
    if (!ALLOWED_PAYLOAD_KEYS.has(k)) delete payload[k];
  }
  const json = JSON.stringify(payload);
  if (json.length > PAYLOAD_MAX_BYTES) {
    throw new Error(`Built payload exceeds ${PAYLOAD_MAX_BYTES} bytes (got ${json.length})`);
  }
  return payload;
}

// ── RATE LIMITING ────────────────────────────────────────────────────────────

/**
 * Count recent golf-signal posts in the window via the chat_bus_signals
 * table. Test seam: caller can pass a `databaseFactory` so we never touch a
 * real DB in unit tests.
 *
 * Returns 0 on any failure (graceful degrade — never let the rate-cap query
 * block legitimate signals if the DB is in an odd state).
 */
export async function countRecentSignals(dbPath, nowMs, { databaseFactory } = {}) {
  if (!existsSync(dbPath) && !databaseFactory) return 0;
  let db;
  try {
    if (databaseFactory) {
      db = databaseFactory(dbPath);
    } else {
      const mod = await import("better-sqlite3");
      const Ctor = mod.default ?? mod;
      db = new Ctor(dbPath, { readonly: true, fileMustExist: true });
    }
  } catch {
    return 0;
  }
  const since = nowMs - CHAT_BUS_INJECT_WINDOW_MS;
  try {
    const row = db.prepare(`
      SELECT COUNT(*) AS n
        FROM chat_bus_signals
       WHERE signal_type = @signal_type
         AND emitted_at >= @since
    `).get({ signal_type: SIGNAL_TYPE, since });
    return Number(row?.n ?? 0);
  } catch {
    return 0;
  } finally {
    try { db.close?.(); } catch { /* ignore */ }
  }
}

// ── EMIT ─────────────────────────────────────────────────────────────────────

/**
 * Insert a golf-signal into chat_bus_signals AND append the same digest line
 * onto AGENT_CHAT.jsonl. Both writes are atomic-per-row (sqlite handles its
 * own atomicity; jsonl append is single-line so a torn write would only lose
 * the last record).
 *
 * Returns { ok, posted, reason, signalId, payload }.
 * Rate-limit hits set ok:true + posted:false + reason:"rate_limited" so the
 * caller can decide whether to back off — they aren't *errors*.
 */
export async function postGolfSignal(input, opts = {}) {
  const validationError = validateSignalInput(input);
  if (validationError) return { ok: false, posted: false, reason: "invalid_input", error: validationError };

  const paths = resolvePaths(opts);
  const nowMs = opts.nowMs ?? Date.now();
  const payload = buildPayload(input);
  const fromChat = opts.fromChat ?? input.fromChat ?? `golf-${process.platform}`;
  const toChat = opts.toChat ?? input.toChat ?? "*";

  // Rate-cap check.
  const recent = await countRecentSignals(paths.dbPath, nowMs, opts);
  if (recent >= MAX_POSTS_PER_WINDOW) {
    return {
      ok: true,
      posted: false,
      reason: "rate_limited",
      recentPosts: recent,
      windowMs: CHAT_BUS_INJECT_WINDOW_MS,
      capacity: MAX_POSTS_PER_WINDOW,
    };
  }

  // Dry-run short-circuits both writes.
  if (opts.dryRun) {
    return {
      ok: true,
      posted: false,
      reason: "dry_run",
      payload,
      signalId: makeSignalId(nowMs, payload),
      recentPosts: recent,
    };
  }

  const signalId = makeSignalId(nowMs, payload);
  const dbWriter = opts.dbWriter ?? defaultDbWriter;
  const jsonlAppender = opts.jsonlAppender ?? defaultJsonlAppender;

  let dbWriteError = null;
  try {
    await dbWriter(paths.dbPath, {
      signal_id: signalId,
      from_chat: fromChat,
      to_chat: toChat,
      signal_type: SIGNAL_TYPE,
      payload_json: JSON.stringify(payload),
      emitted_at: nowMs,
    });
  } catch (e) {
    dbWriteError = e instanceof Error ? e.message : String(e);
  }

  let jsonlWriteError = null;
  try {
    jsonlAppender(paths.busJsonlPath, {
      id: signalId,
      timestamp: new Date(nowMs).toISOString(),
      agent: fromChat,
      agent_family: "Golf",
      message: `[${SIGNAL_TYPE}/${payload.kind}/${payload.severity}] ${payload.summary}` + (payload.path ? ` → ${payload.path}` : ""),
      signal_type: SIGNAL_TYPE,
      payload,
      to_chat: toChat,
    });
  } catch (e) {
    jsonlWriteError = e instanceof Error ? e.message : String(e);
  }

  return {
    ok: dbWriteError === null || jsonlWriteError === null,
    posted: dbWriteError === null && jsonlWriteError === null,
    reason: dbWriteError === null && jsonlWriteError === null ? "emitted" : "partial_emit",
    payload,
    signalId,
    dbWriteError,
    jsonlWriteError,
    recentPosts: recent + 1,
  };
}

function makeSignalId(nowMs, payload) {
  return `golf-${payload.kind}-${nowMs}-${Math.random().toString(36).slice(2, 8)}`;
}

async function defaultDbWriter(dbPath, row) {
  try { mkdirSync(path.dirname(dbPath), { recursive: true }); } catch { /* ignore */ }
  const mod = await import("better-sqlite3");
  const Ctor = mod.default ?? mod;
  const db = new Ctor(dbPath);
  try {
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("busy_timeout = 5000");
    // Schema is owned by B10 LedgerStoreEngine; CREATE IF NOT EXISTS only as
    // a defensive bootstrap for hermetic deploys.
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_bus_signals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signal_id TEXT UNIQUE NOT NULL,
        from_chat TEXT NOT NULL,
        to_chat TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        emitted_at INTEGER NOT NULL,
        consumed_at INTEGER,
        consumed_by TEXT
      );
    `);
    db.prepare(`
      INSERT INTO chat_bus_signals(signal_id, from_chat, to_chat, signal_type, payload_json, emitted_at)
      VALUES(@signal_id, @from_chat, @to_chat, @signal_type, @payload_json, @emitted_at)
    `).run(row);
  } finally {
    try { db.close?.(); } catch { /* ignore */ }
  }
}

function defaultJsonlAppender(filePath, entry) {
  try { mkdirSync(path.dirname(filePath), { recursive: true }); } catch { /* ignore */ }
  appendFileSync(filePath, JSON.stringify(entry) + "\n", "utf-8");
}

// ── CLI ──────────────────────────────────────────────────────────────────────

export async function runCli(argv, { stdout, stderr, databaseFactory, dbWriter, jsonlAppender } = {}) {
  const out = stdout ?? process.stdout;
  const err = stderr ?? process.stderr;
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    err.write(`golf-signal-post: ${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
  if (opts.help) {
    out.write(usage());
    return 2;
  }
  const result = await postGolfSignal(
    {
      signalKind: opts.signalKind,
      summary: opts.summary,
      severity: opts.severity,
      count: opts.count,
      pathRef: opts.pathRef,
    },
    {
      repoRoot: opts.repoRoot,
      dbPath: opts.dbPath,
      busJsonlPath: opts.busJsonlPath,
      fromChat: opts.fromChat,
      toChat: opts.toChat,
      nowMs: opts.nowMs,
      dryRun: opts.dryRun,
      databaseFactory, dbWriter, jsonlAppender,
    },
  );
  if (!result.ok) {
    err.write(`golf-signal-post: ${result.error ?? result.reason ?? "failed"}\n`);
    return 1;
  }
  if (opts.json) {
    out.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    out.write(`[golf-signal] reason=${result.reason}` + (result.signalId ? ` id=${result.signalId}` : "") + "\n");
  }
  return 0;
}

function usage() {
  return [
    "usage: golf-signal-post --kind <slug> --summary <text> [--count N]",
    "                       [--path <report>] [--severity info|warn|error|P0..P3]",
    "                       [--to-chat <id|*>] [--from-chat <id>]",
    "                       [--json] [--dry-run] [--now <ISO>]",
    "                       [--repo-root PATH] [--db PATH] [--bus-jsonl PATH]",
    "",
    "U-CLEANUP-F8 — emit a compact golf-signal to chat_bus_signals + AGENT_CHAT.jsonl.",
    "",
  ].join("\n");
}

// ── ENTRY ────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __entry = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (__entry && __filename === __entry) {
  runCli(process.argv.slice(2)).then((code) => process.exit(code))
    .catch((e) => {
      process.stderr.write(`golf-signal-post: fatal: ${e instanceof Error ? e.stack ?? e.message : String(e)}\n`);
      process.exit(1);
    });
}
