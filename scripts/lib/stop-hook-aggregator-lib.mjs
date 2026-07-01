#!/usr/bin/env node
// Pure-core lib for stop-hook-aggregator.mjs (U-STOP-HOOK-AGGREGATOR, H8).
// Records one structured line per session-Stop to a shared JSONL ledger.
// Pure functions (no IO). The hook caller injects readers for git + slots.

const LEDGER_ENTRY_VERSION = 1;
const MIN_THROTTLE_MS = 1_000;
const MAX_THROTTLE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_THROTTLE_MS = 60_000;
const MAX_SLOT_LEN = 32;
const MAX_CHAT_ID_LEN = 64;
const MAX_TOPIC_LEN = 64;
const MAX_BRANCH_LEN = 96;
const MAX_TRANSCRIPT_LEN = 256;
const MAX_LINE_BYTES = 8192;
const COMMITS_WINDOW_SEC = 3600;

function stripControlChars(s) {
  // Strip C0/C1 control chars without a regex char class containing literal
  // control bytes (which round-trips badly through some tooling).
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7F || (c >= 0x80 && c <= 0x9F)) continue;
    out += s[i];
  }
  return out;
}

function sanitize(s, maxLen) {
  if (typeof s !== "string") return null;
  if (s.length === 0) return null;
  const clean = stripControlChars(s).trim();
  if (clean.length === 0) return null;
  return clean.slice(0, maxLen);
}

function clampThrottle(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_THROTTLE_MS;
  if (n < MIN_THROTTLE_MS) return MIN_THROTTLE_MS;
  if (n > MAX_THROTTLE_MS) return MAX_THROTTLE_MS;
  return Math.floor(n);
}

export function shouldThrottle({ sessionId, lastEntryAtMs, nowMs, throttleMs }) {
  if (!sessionId) return false;
  if (!Number.isFinite(lastEntryAtMs)) return false;
  if (!Number.isFinite(nowMs)) return false;
  if (lastEntryAtMs > nowMs) return false;
  return (nowMs - lastEntryAtMs) < clampThrottle(throttleMs);
}

function intOrZero(v) {
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

export function buildLedgerEntry({ stopEvent, slotInfo, gitStatus, nowMs }) {
  const ev = stopEvent || {};
  const sl = slotInfo || {};
  const g = gitStatus || {};
  const ts = Number.isFinite(nowMs) ? new Date(nowMs).toISOString() : new Date().toISOString();
  return {
    v: LEDGER_ENTRY_VERSION,
    ts,
    sessionId: sanitize(ev.session_id, MAX_CHAT_ID_LEN),
    stopHookActive: !!ev.stop_hook_active,
    slot: sanitize(sl.slot, MAX_SLOT_LEN),
    chatId: sanitize(sl.chatId, MAX_CHAT_ID_LEN),
    branch: sanitize(sl.branch, MAX_BRANCH_LEN),
    topic: sanitize(sl.topic, MAX_TOPIC_LEN),
    cwd: sanitize(ev.cwd, MAX_TRANSCRIPT_LEN),
    transcriptPath: sanitize(ev.transcript_path, MAX_TRANSCRIPT_LEN),
    git: {
      dirtyCount: intOrZero(g.dirtyCount),
      stagedCount: intOrZero(g.stagedCount),
      untrackedCount: intOrZero(g.untrackedCount),
      commitsLastHour: intOrZero(g.commitsLastHour),
    },
  };
}

export function serializeLedgerLine(entry) {
  const line = JSON.stringify(entry);
  if (line.length > MAX_LINE_BYTES) {
    throw new Error(`ledger entry too large: ${line.length} bytes`);
  }
  if (line.indexOf("\n") !== -1 || line.indexOf("\r") !== -1) {
    throw new Error("ledger entry contains newline");
  }
  return line + "\n";
}

export function parseGitStatusPorcelainZ(z) {
  if (typeof z !== "string" || z.length === 0) {
    return { dirtyCount: 0, stagedCount: 0, untrackedCount: 0 };
  }
  let dirtyCount = 0;
  let stagedCount = 0;
  let untrackedCount = 0;
  const records = z.split("\x00").filter(r => r.length >= 3);
  for (const r of records) {
    const x = r[0];
    const y = r[1];
    if (x === "?" && y === "?") {
      untrackedCount += 1;
      dirtyCount += 1;
      continue;
    }
    if (x !== " " && x !== "?") stagedCount += 1;
    if (y !== " " && y !== "?") dirtyCount += 1;
    if (x !== " " && y === " ") dirtyCount += 1;
  }
  return { dirtyCount, stagedCount, untrackedCount };
}

export function parseCommitsLastHour(stdout, nowMs) {
  if (typeof stdout !== "string" || stdout.length === 0) return 0;
  const nowSec = Math.floor((Number.isFinite(nowMs) ? nowMs : Date.now()) / 1000);
  const cutoff = nowSec - COMMITS_WINDOW_SEC;
  let n = 0;
  for (const line of stdout.split("\n")) {
    const t = parseInt(line.trim(), 10);
    if (Number.isFinite(t) && t >= cutoff) n += 1;
  }
  return n;
}

export function readLastEntryAtMs(jsonlText, sessionId) {
  if (typeof jsonlText !== "string" || jsonlText.length === 0) return NaN;
  if (!sessionId) return NaN;
  const lines = jsonlText.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line || line.length === 0) continue;
    try {
      const obj = JSON.parse(line);
      if (obj && obj.sessionId === sessionId) {
        const t = Date.parse(obj.ts);
        return Number.isFinite(t) ? t : NaN;
      }
    } catch {
      continue;
    }
  }
  return NaN;
}

export const __test_constants = {
  LEDGER_ENTRY_VERSION,
  MIN_THROTTLE_MS,
  MAX_THROTTLE_MS,
  DEFAULT_THROTTLE_MS,
  MAX_LINE_BYTES,
  COMMITS_WINDOW_SEC,
};
