// ZULU-ACCOUNT-CYCLE-MS0 / U-5H-TOKEN-SUM (slot:bravo, 2026-06-11) -- the KEYSTONE core.
//
// Rolling 5-hour token SUM across ALL of this host's Claude Code session
// transcripts. This is the verifiable foundation the account-switch coordinator
// needs: it reads quota.fiveHour.pct from token-budget-<slot>.json, but on this
// host Claude Code never emits rate_limits.five_hour, so that field is null and
// the whole auto-switch chain is dark (ZULU-ACCOUNT-CYCLE-MS0 C5 chokepoint).
//
// This lib computes the REAL used-token figure (no rate_limits dependency) from
// the transcripts Claude Code already writes. It is the denominator-FREE core:
// usedTokens is real; turning it into a pct needs a budget (operator-config), but
// the used-token sum + an absolute threshold make the keystone functional WITHOUT
// the dynamic Max-plan denominator (which is not locally derivable -- see memory
// reference_galaxy_mine_ollama_saturation... no: the 5h-denominator research note
// in the ledger / commit e4f541181c).
//
// WHY ENUMERATE BY RECORD TIMESTAMP, NOT FILE mtime (verified 2026-06-11):
//   `find -mmin -300` returns ZERO transcripts on this host even while an 18 MB
//   transcript is being actively appended -- Windows does not flush a file's mtime
//   while it is held open for append. An mtime pre-filter would therefore SKIP the
//   actively-writing sessions, i.e. exactly the ones holding the most recent
//   tokens, and silently undercount. So we enumerate every transcript and decide
//   in-window-ness from the RECORD timestamps (peek the tail first to skip cheaply).
//
// RECORD SHAPE (verified against a live transcript 2026-06-11):
//   { type:'assistant', timestamp:'2026-06-11T13:39:35.059Z',
//     message:{ id:'msg_...', usage:{ input_tokens, output_tokens,
//       cache_creation_input_tokens, cache_read_input_tokens } } }
//   The same message.id is written 2-3x during streaming (snapshots); the LATEST
//   (max-timestamp) occurrence has the final counts -> dedupe by id keeping max-ts.
//
// ARCHITECTURE: pure core (no I/O, fully unit-tested) + injected fs/clock.
//   PURE:  extractUsageTsFromBlock, recordsFromText, latestTsInText,
//          dedupKeepMaxTs, sumWindow, windowStartMs
//   I/O:   peekLatestTs, readInWindowRecords, listTranscripts  (all take _fs)
//   ORCH:  fiveHourTokenSum({nowMs, windowMs, projectsRoot, _fs})

import fsDefault from "node:fs";
import path from "node:path";
import os from "node:os";

// Inlined from scripts/lib/transcript-token-counter.mjs (slot/bravo lags main by
// 3000+ commits and that file does not exist in this worktree, so a cross-version
// import would break -- self-contained per the slot-build convention). Behavior is
// byte-identical to the canonical parseJsonlBlocks: split on \n, drop a partial
// leading line, skip malformed/partial lines silently (streaming JSONL has known
// partial writes; the next snapshot is complete).
export function parseJsonlBlocks(text) {
  if (!text) return [];
  const out = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (i === 0 && !line.startsWith("{")) continue; // partial leading line
    try { out.push(JSON.parse(line)); } catch { /* partial/corrupt streaming line */ }
  }
  return out;
}

export const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
// Published Anthropic cache BILLING multipliers (cache-write 1.25x, cache-read
// 0.1x). `weightedTokens` applies these so the figure tracks the scarce resource
// (raw `totalTokens` is dominated by cheap cache reads -- 402M of a 425M live sum
// -- and is a poor budget signal). R12: these are the published BILLING weights;
// the EXACT 5h rate-limit weighting is Anthropic-internal, so callers must
// calibrate their budget/threshold against OBSERVED weightedTokens, not assume a
// published ceiling. Override per-call if Anthropic changes the multipliers.
export const CACHE_WRITE_MULT = 1.25;
export const CACHE_READ_MULT = 0.1;
// Peek the last 256 KB to read the most-recent record's timestamp cheaply; if it
// is older than the window, the whole file is skipped without a full read.
export const PEEK_BYTES = 256 * 1024;
// Full tail cap when a file DOES have in-window records. 32 MB comfortably covers
// a very busy 5 h window; if a single session exceeds it we report `capped` so the
// undercount is never silent (R12).
export const FULL_TAIL_BYTES = 32 * 1024 * 1024;

export function defaultProjectsRoot() {
  return path.join(os.homedir(), ".claude", "projects");
}

function numOrZero(x) {
  const n = Number(x);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// ISO timestamp string -> epoch ms, or null if unparseable. Pure.
export function parseTsMs(ts) {
  if (typeof ts !== "string" || !ts) return null;
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : null;
}

// Extract { id, tsMs, input, output, cacheCreation, cacheRead } from a parsed
// transcript block, or null if it carries no usage. Mirrors the verified shape;
// tolerant of the stream-json shape ({type,id,usage} without nested message).
export function extractUsageTsFromBlock(block) {
  if (!block || typeof block !== "object") return null;
  const msg = block.message && typeof block.message === "object" ? block.message : block;
  const usage = msg.usage;
  if (!usage || typeof usage !== "object") return null;
  return {
    id: msg.id || block.id || block.uuid || null,
    tsMs: parseTsMs(block.timestamp || msg.timestamp),
    input: numOrZero(usage.input_tokens),
    output: numOrZero(usage.output_tokens),
    cacheCreation: numOrZero(usage.cache_creation_input_tokens),
    cacheRead: numOrZero(usage.cache_read_input_tokens),
  };
}

// Parse a tail-text blob -> array of usage+ts records (drops non-usage lines). Pure.
export function recordsFromText(text) {
  return parseJsonlBlocks(text).map(extractUsageTsFromBlock).filter((r) => r !== null);
}

// Max record timestamp (ms) in a tail-text, or null if none parseable. Pure.
export function latestTsInText(text) {
  let max = null;
  for (const r of recordsFromText(text)) {
    if (r.tsMs != null && (max === null || r.tsMs > max)) max = r.tsMs;
  }
  return max;
}

// Dedupe records by message.id, keeping the occurrence with the GREATEST tsMs
// (the final streaming snapshot has the authoritative counts). Records with no
// id are each kept (unique synthetic key). Records with no tsMs keep last-seen.
// Pure.
export function dedupKeepMaxTs(records) {
  const byId = new Map();
  let anon = 0;
  for (const r of records) {
    if (!r) continue;
    const key = r.id || `__anon_${anon++}`;
    const prev = byId.get(key);
    if (!prev) { byId.set(key, r); continue; }
    const a = r.tsMs == null ? -Infinity : r.tsMs;
    const b = prev.tsMs == null ? -Infinity : prev.tsMs;
    if (a >= b) byId.set(key, r); // ties -> later in iteration wins (final snapshot)
  }
  return Array.from(byId.values());
}

// Pure window aggregator. Given deduped records + windowStartMs, sum only those
// whose tsMs >= windowStartMs. Reports excludedNoTs (records with no timestamp --
// cannot be placed in the window, so excluded; surfaced, never silently dropped).
export function sumWindow(records, windowStart) {
  const acc = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 };
  let inWindowCount = 0, excludedNoTs = 0, beforeWindow = 0;
  for (const r of records) {
    if (!r) continue;
    if (r.tsMs == null) { excludedNoTs++; continue; }
    if (r.tsMs < windowStart) { beforeWindow++; continue; }
    acc.input += r.input; acc.output += r.output;
    acc.cacheCreation += r.cacheCreation; acc.cacheRead += r.cacheRead;
    inWindowCount++;
  }
  return {
    ...acc,
    totalTokens: acc.input + acc.output + acc.cacheCreation + acc.cacheRead,
    weightedTokens: acc.input + acc.output + CACHE_WRITE_MULT * acc.cacheCreation + CACHE_READ_MULT * acc.cacheRead,
    inWindowCount,
    excludedNoTs,
    beforeWindow,
  };
}

// ----------------------------- I/O (injectable) -----------------------------

// Read up to `bytes` from the END of a file in one read. Fail-soft -> "".
export function tailRead(file, bytes, _fs = fsDefault) {
  let st;
  try { st = _fs.statSync(file); } catch { return ""; }
  if (!st || !st.size) return "";
  const window = Math.min(st.size, bytes);
  let fd;
  try {
    fd = _fs.openSync(file, "r");
    const buf = Buffer.alloc(window);
    _fs.readSync(fd, buf, 0, window, st.size - window);
    _fs.closeSync(fd);
    return buf.toString("utf8");
  } catch {
    if (fd != null) { try { _fs.closeSync(fd); } catch {} }
    return "";
  }
}

// Peek a small tail -> the most-recent record timestamp (ms) or null.
export function peekLatestTs(file, { _fs = fsDefault, peekBytes = PEEK_BYTES } = {}) {
  return latestTsInText(tailRead(file, peekBytes, _fs));
}

// Full-tail read -> { records, capped } where capped=true if the file exceeded tailBytes.
export function readInWindowRecords(file, { _fs = fsDefault, tailBytes = FULL_TAIL_BYTES } = {}) {
  let st;
  try { st = _fs.statSync(file); } catch { return { records: [], capped: false }; }
  const capped = !!st && st.size > tailBytes;
  return { records: recordsFromText(tailRead(file, tailBytes, _fs)), capped };
}

// Enumerate *.jsonl transcripts under projectsRoot/<project>/. Fail-soft -> [].
export function listTranscripts(projectsRoot, { _fs = fsDefault } = {}) {
  const out = [];
  let dirs;
  try { dirs = _fs.readdirSync(projectsRoot, { withFileTypes: true }); } catch { return out; }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const sub = path.join(projectsRoot, d.name);
    let files;
    try { files = _fs.readdirSync(sub); } catch { continue; }
    for (const f of files) if (f.endsWith(".jsonl")) out.push(path.join(sub, f));
  }
  return out;
}

// ------------------------------- orchestrator -------------------------------

export function windowStartMs(nowMs, windowMs = FIVE_HOURS_MS) {
  return nowMs - windowMs;
}

// Rolling 5h token sum across all transcripts. Enumerate by record timestamp:
// peek each file's latest record ts; only files whose latest record is in-window
// get a full read. Global dedupe by message.id (max-ts). Then window-sum.
//
// @param {number} opts.nowMs          REQUIRED clock (injected; no Date.now in core)
// @param {number} [opts.windowMs]     default 5h
// @param {string} [opts.projectsRoot] default ~/.claude/projects
// @param {object} [opts._fs]          injected fs (tests)
export function fiveHourTokenSum({
  nowMs,
  windowMs = FIVE_HOURS_MS,
  projectsRoot = defaultProjectsRoot(),
  peekBytes = PEEK_BYTES,
  tailBytes = FULL_TAIL_BYTES,
  _fs = fsDefault,
} = {}) {
  if (!Number.isFinite(nowMs)) throw new Error("fiveHourTokenSum: nowMs (finite epoch ms) is required");
  const winStart = windowStartMs(nowMs, windowMs);
  const files = listTranscripts(projectsRoot, { _fs });

  const allRecords = [];
  const perSession = {};
  let transcriptsInWindow = 0;
  let cappedTranscripts = 0;

  for (const file of files) {
    const latest = peekLatestTs(file, { _fs, peekBytes });
    // Skip files whose most-recent record predates the window. A null peek means
    // we could not read a timestamp from the small tail -- fall through to a full
    // read rather than risk skipping an active file with an oversized last line.
    if (latest != null && latest < winStart) continue;
    const { records, capped } = readInWindowRecords(file, { _fs, tailBytes });
    if (capped) cappedTranscripts++;
    if (!records.length) continue;
    transcriptsInWindow++;
    allRecords.push(...records);
    const sid = path.basename(file).replace(/\.jsonl$/, "");
    const sessionSum = sumWindow(dedupKeepMaxTs(records), winStart);
    if (sessionSum.totalTokens > 0) perSession[sid] = sessionSum.totalTokens;
  }

  // Global dedupe (a message.id is globally unique; defends against the same id
  // appearing in >1 file), then window-sum.
  const summed = sumWindow(dedupKeepMaxTs(allRecords), winStart);

  return {
    usedTokens: summed.totalTokens,
    weightedTokens: summed.weightedTokens,
    input: summed.input,
    output: summed.output,
    cacheCreation: summed.cacheCreation,
    cacheRead: summed.cacheRead,
    windowStartMs: winStart,
    nowMs,
    windowMs,
    transcriptsScanned: files.length,
    transcriptsInWindow,
    inWindowRecords: summed.inWindowCount,
    excludedNoTs: summed.excludedNoTs,
    cappedTranscripts,
    perSession,
  };
}
