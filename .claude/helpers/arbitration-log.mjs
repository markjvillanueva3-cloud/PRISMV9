#!/usr/bin/env node
/**
 * arbitration-log.mjs — append-only event log for multi-chat coordination
 * events (auto-forks, lane-block edits, cross-chat directive warnings).
 *
 * Why: P5 hooks (pre-edit-lane-guard, auto-fork-executor, cross-chat-
 * directive-detector) fire INSIDE other chats and lock chats out of files
 * they were trying to edit. Without an audit log, we cannot tell whether
 * the new rails are working, regressing, or causing false positives. The
 * log lets us answer "how often did the rails fire today" + "did this
 * specific session get auto-forked recently" at handoff time.
 *
 * Storage: state/shared/AGENT_CONFLICT_ARBITRATION.json (this file is also
 * the substrate that P4-U02 declares as the consensus-gate dissent log —
 * pre-emptively created here so P4 has a place to write into).
 *
 * Concurrency: ~6 chats may append simultaneously. We use a read-merge-
 * write loop with an exclusive .lock file (mkdir is atomic on Windows AND
 * Unix) and bounded retry. Worst case is the append silently drops if the
 * lock cannot be acquired — better than corrupting the log.
 *
 * CLI:
 *   node arbitration-log.mjs summary [--session <id>] [--since <ms>]
 *   node arbitration-log.mjs append --kind <kind> --details <json>
 *   node arbitration-log.mjs read [--session <id>]
 *   node arbitration-log.mjs render-line [--session <id>]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// -- Paths + constants ----------------------------------------------------

const ROOT_DEFAULT = "H:/prism/state/shared";
const LOG_PATH_DEFAULT = path.join(ROOT_DEFAULT, "AGENT_CONFLICT_ARBITRATION.json");
const LOCK_DIR_SUFFIX = ".lock";
const SCHEMA_VERSION = "1.0.0";
const MAX_EVENTS_RETAINED = 5000;
const LOCK_RETRY_MAX = 8;
const LOCK_RETRY_BASE_MS = 5;
const DEFAULT_SUMMARY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

const KNOWN_KINDS = Object.freeze([
  "auto-fork",
  "lane-block",
  "directive-warn",
  "consensus-dissent", // P4-U02 will write into this kind too
]);

// Tests can redirect the log to a tmpdir via this env var.
const LOG_PATH = process.env.PRISM_ARBITRATION_LOG || LOG_PATH_DEFAULT;
const LOCK_PATH = `${LOG_PATH}${LOCK_DIR_SUFFIX}`;

// -- Filesystem helpers ---------------------------------------------------

function ensureParent(filePath) {
  const dir = path.dirname(filePath);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // best-effort
  }
}

function sleepBlocking(ms) {
  // Blocking sleep so we can use this from sync hook code without rewriting
  // the call sites to async. Atomics-on-SAB is the canonical Node idiom.
  const sab = new SharedArrayBuffer(4);
  const ia = new Int32Array(sab);
  Atomics.wait(ia, 0, 0, ms);
}

function tryAcquireLock() {
  for (let attempt = 0; attempt < LOCK_RETRY_MAX; attempt += 1) {
    try {
      ensureParent(LOG_PATH);
      fs.mkdirSync(LOCK_PATH); // atomic on Windows + Unix
      return true;
    } catch (err) {
      if (err && err.code === "EEXIST") {
        // Backoff with linear jitter
        sleepBlocking(LOCK_RETRY_BASE_MS * (attempt + 1));
        continue;
      }
      // Any other error → cannot lock, give up
      return false;
    }
  }
  return false;
}

function releaseLock() {
  try {
    fs.rmdirSync(LOCK_PATH);
  } catch {
    // already gone or unreadable — best-effort
  }
}

function readLogSafe() {
  try {
    const raw = fs.readFileSync(LOG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.events)) {
      return parsed;
    }
  } catch {
    // Missing or malformed → start fresh
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    events: [],
  };
}

function writeLogSafe(log) {
  try {
    fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

// -- Public API -----------------------------------------------------------

/**
 * Append a single arbitration event.
 *
 * @param {string} kind - one of KNOWN_KINDS, or any custom kind tag
 * @param {object} details - free-form structured details
 * @param {object} [ctx] - optional sessionId, pcName overrides
 * @returns {boolean} - true on success, false if lock could not be acquired
 */
export function appendEvent(kind, details, ctx = {}) {
  if (!tryAcquireLock()) return false;
  try {
    const log = readLogSafe();
    log.events.push({
      ts: new Date().toISOString(),
      kind: String(kind),
      sessionId: ctx.sessionId || "",
      pcName: ctx.pcName || os.hostname(),
      details: details && typeof details === "object" ? details : { value: details },
    });
    if (log.events.length > MAX_EVENTS_RETAINED) {
      log.events = log.events.slice(-MAX_EVENTS_RETAINED);
    }
    return writeLogSafe(log);
  } finally {
    releaseLock();
  }
}

/**
 * Read events, optionally filtered.
 *
 * @param {object} [opts]
 * @param {string} [opts.sessionId] - only events from this session
 * @param {string|string[]} [opts.kind] - only these kinds
 * @param {number} [opts.sinceMs] - only events younger than this many ms
 * @returns {Array}
 */
export function readEvents(opts = {}) {
  const log = readLogSafe();
  let events = log.events.slice();
  if (opts.sessionId) {
    events = events.filter((e) => e.sessionId === opts.sessionId);
  }
  if (opts.kind) {
    const allowed = new Set(Array.isArray(opts.kind) ? opts.kind : [opts.kind]);
    events = events.filter((e) => allowed.has(e.kind));
  }
  if (Number.isFinite(opts.sinceMs) && opts.sinceMs > 0) {
    const cutoff = Date.now() - opts.sinceMs;
    events = events.filter((e) => Date.parse(e.ts) >= cutoff);
  }
  return events;
}

/**
 * Count events by kind.
 *
 * @param {Array} events - typically the output of readEvents
 * @returns {Record<string, number>}
 */
export function summarizeEvents(events) {
  const counts = {};
  for (const kind of KNOWN_KINDS) counts[kind] = 0;
  for (const e of events) {
    counts[e.kind] = (counts[e.kind] || 0) + 1;
  }
  return counts;
}

/**
 * Render a one-line summary suitable for embedding in a per-agent handoff.
 *
 * @param {object} [opts]
 * @param {string} [opts.sessionId]
 * @param {number} [opts.sinceMs] - default 24h
 * @returns {string}
 */
export function renderSummaryLine(opts = {}) {
  const window = Number.isFinite(opts.sinceMs) ? opts.sinceMs : DEFAULT_SUMMARY_WINDOW_MS;
  const events = readEvents({ sessionId: opts.sessionId, sinceMs: window });
  if (events.length === 0) {
    return `Arbitrations (${humaniseWindow(window)}): none — rails quiet.`;
  }
  const counts = summarizeEvents(events);
  const parts = [];
  for (const kind of KNOWN_KINDS) {
    if (counts[kind] > 0) parts.push(`${counts[kind]} ${kind}`);
  }
  // Pick up custom kinds that aren't in KNOWN_KINDS too
  for (const [kind, n] of Object.entries(counts)) {
    if (!KNOWN_KINDS.includes(kind) && n > 0) parts.push(`${n} ${kind}`);
  }
  const lastTs = events[events.length - 1].ts;
  const lastKind = events[events.length - 1].kind;
  return `Arbitrations (${humaniseWindow(window)}): ${parts.join(", ")} — last: ${lastKind} at ${lastTs}.`;
}

function humaniseWindow(ms) {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

// -- CLI -----------------------------------------------------------------

function cli(argv) {
  const sub = argv[0] || "summary";
  const flags = parseFlags(argv.slice(1));

  if (sub === "summary") {
    const counts = summarizeEvents(
      readEvents({
        sessionId: flags.session,
        sinceMs: flags.since ? Number(flags.since) : DEFAULT_SUMMARY_WINDOW_MS,
      }),
    );
    process.stdout.write(JSON.stringify(counts, null, 2) + "\n");
    return 0;
  }
  if (sub === "render-line") {
    const line = renderSummaryLine({
      sessionId: flags.session,
      sinceMs: flags.since ? Number(flags.since) : undefined,
    });
    process.stdout.write(line + "\n");
    return 0;
  }
  if (sub === "read") {
    const events = readEvents({ sessionId: flags.session });
    process.stdout.write(JSON.stringify(events, null, 2) + "\n");
    return 0;
  }
  if (sub === "append") {
    const kind = flags.kind;
    let details = {};
    if (flags.details) {
      try {
        details = JSON.parse(flags.details);
      } catch {
        details = { raw: flags.details };
      }
    }
    if (!kind) {
      process.stderr.write("--kind required\n");
      return 2;
    }
    const ok = appendEvent(kind, details, { sessionId: flags.session });
    process.stdout.write(JSON.stringify({ ok }) + "\n");
    return ok ? 0 : 1;
  }
  process.stderr.write(`unknown subcommand: ${sub}\n`);
  return 2;
}

function parseFlags(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

// Direct-CLI invocation guard (only run when called as a script, not when
// imported as an ES module helper).
const isDirectInvocation = (() => {
  try {
    const argvUrl = new URL(`file://${process.argv[1].replace(/\\/g, "/")}`);
    const importMetaUrl = new URL(import.meta.url);
    return argvUrl.pathname.toLowerCase() === importMetaUrl.pathname.toLowerCase();
  } catch {
    return false;
  }
})();

if (isDirectInvocation) {
  process.exit(cli(process.argv.slice(2)));
}
