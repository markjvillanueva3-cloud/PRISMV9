// TOKEN-AWARENESS-MS0 / U-TA02 — transcript JSONL token counter.
//
// Reads Claude Code's session transcript (~/.claude/projects/<hash>/<sid>.jsonl),
// extracts the `usage` block from each assistant message, dedupes by message.id
// (Claude writes the same id 2-3x while streaming — naive sums over-count by
// 2-3x), and returns a cumulative token tally that matches what the API
// actually billed.
//
// Per token-dashboard (https://github.com/nateherkai/token-dashboard) — Claude
// snapshots the same message.id multiple times as output grows. The LAST
// snapshot has the final counts. Keep last-seen per id.
//
// Compact-boundary aware: only sums blocks AFTER the last compact-boundary
// marker (current `{"type":"system","subtype":"compact_boundary"}` record OR
// the legacy `"isCompactSummary":true` flag -- see COMPACT_MARKERS) -- same
// convention as statusline.mjs and precompact-auto-trigger.mjs. R12: a
// transcript that just compacted should read as low ctx, not pre-compact bloat.

import fs from "node:fs";

export const DEFAULT_TAIL_BYTES = 4 * 1024 * 1024; // 4 MB tail -- same as statusline

// Compact-boundary markers, CURRENT format first. Claude Code marks a
// compaction with a {"type":"system","subtype":"compact_boundary"} record
// (carrying compactMetadata.preTokens); the legacy build used a per-message
// {"isCompactSummary":true} flag. We scan for BOTH so a transcript written by
// either build slices correctly. The format change -- verified against live
// transcripts 2026-06-10 -- silently broke every byte-based ctx estimator that
// only knew the legacy flag, which drove the alpha constant-compaction loop
// (whole-transcript byte counts -> false >=HARD -> forced /compact every turn).
export const COMPACT_MARKERS = ['"subtype":"compact_boundary"', '"isCompactSummary":true'];
// Back-compat: the legacy single-marker export some callers/tests still import.
export const COMPACT_MARKER = '"isCompactSummary":true';

// Byte/char offset of the LAST compact-boundary marker of ANY known format in
// `text`, or -1 when none is present. Pure -- single source of truth for every
// byte-tail ctx estimator (this lib, the sidecar, statusline, chat-token-watch
// all route boundary detection through here so a future format change is one
// edit, not N).
export function lastCompactMarkerOffset(text) {
  if (!text) return -1;
  let last = -1;
  for (const m of COMPACT_MARKERS) {
    const i = text.lastIndexOf(m);
    if (i > last) last = i;
  }
  return last;
}

// Reads up to maxBytes from the END of a file in ONE disk read. Returns
// { raw, active }: raw = the full byte-tail text, active = everything AFTER
// the last compact-summary marker (= raw when no marker present). Fail-soft:
// missing/unreadable file → { raw:"", active:"" }.
//
// This is the single-read primitive. Callers that need BOTH the cumulative
// tally and the latest-ctx figure (e.g. the token-awareness sidecar) read the
// transcript ONCE here and pass the result to analyzeTranscriptFromText /
// extractLatestCtxFromText — instead of each function independently re-opening
// and re-parsing the 4 MB tail. Before this, one sidecar fire did 4 full
// 4 MB read+parses; now it does 1.
export function readTranscriptTail(filePath, maxBytes = DEFAULT_TAIL_BYTES) {
  if (!filePath) return { raw: "", active: "" };
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return { raw: "", active: "" };
  }
  if (!stat || stat.size === 0) return { raw: "", active: "" };
  const window = Math.min(stat.size, maxBytes);
  let fd;
  try {
    fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(window);
    fs.readSync(fd, buf, 0, window, stat.size - window);
    fs.closeSync(fd);
    const raw = buf.toString("utf8");
    return { raw, active: sliceAfterLastCompact(raw) };
  } catch {
    if (fd != null) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
    return { raw: "", active: "" };
  }
}

// Backward-compatible thin wrapper — returns just the post-compact-active text.
// Reads up to maxBytes from the END of a file. Returns everything AFTER the
// last compact-summary marker (whole tail if no marker). Fail-soft → "".
export function tailReadTranscript(filePath, maxBytes = DEFAULT_TAIL_BYTES) {
  return readTranscriptTail(filePath, maxBytes).active;
}

// Exported for unit testing the boundary logic without touching disk.
export function sliceAfterLastCompact(text) {
  if (!text) return "";
  const idx = lastCompactMarkerOffset(text);
  if (idx < 0) return text;
  // Find the next newline AFTER the marker — everything past it is post-compact.
  const nl = text.indexOf("\n", idx);
  if (nl < 0) return "";
  return text.slice(nl + 1);
}

// Yield each parsed JSON line. Malformed lines are skipped silently (R12 fail
// loud is the WRONG choice here — Claude's JSONL has known partial writes
// during streaming; the next snapshot will be complete).
export function parseJsonlBlocks(text) {
  if (!text) return [];
  const out = [];
  // Split robustly on \n — the tail-read may begin mid-line, drop that first
  // partial line.
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (i === 0 && !line.startsWith("{")) continue; // partial leading line
    try {
      out.push(JSON.parse(line));
    } catch {
      // partial / corrupted line during streaming → skip
    }
  }
  return out;
}

// Extract the usage block from one parsed record. Claude Code writes assistant
// messages as { type:'assistant', message: { id, usage: { ... } }, ... } in the
// transcript. Returns { id, usage } or null if no usage data present.
//
// Fields in `usage` per Claude API:
//   input_tokens, output_tokens,
//   cache_creation_input_tokens, cache_read_input_tokens
export function extractUsageFromBlock(block) {
  if (!block || typeof block !== "object") return null;
  // Two shapes seen in the wild:
  //   1. { type:'assistant', message: { id, usage } }  (Claude Code transcript)
  //   2. { type:'assistant', id, usage }               (stream-json --output-format)
  const msg = block.message && typeof block.message === "object" ? block.message : block;
  const usage = msg.usage;
  if (!usage || typeof usage !== "object") return null;
  const id = msg.id || block.id || block.uuid || null;
  return {
    id,
    input: numOrZero(usage.input_tokens),
    output: numOrZero(usage.output_tokens),
    cache_creation: numOrZero(usage.cache_creation_input_tokens),
    cache_read: numOrZero(usage.cache_read_input_tokens),
  };
}

function numOrZero(x) {
  const n = Number(x);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

// Dedupe by message.id, keeping the LATEST occurrence (later occurrences have
// the final counts after streaming completes). Records without an id are kept
// as-is using a unique synthetic key (never collide with real ids).
export function dedupByMessageId(records) {
  const map = new Map();
  let anonCounter = 0;
  for (const r of records) {
    if (!r) continue;
    const key = r.id || `__anon_${anonCounter++}`;
    map.set(key, r); // last write wins
  }
  return Array.from(map.values());
}

// Sum a deduped set into one cumulative usage block.
export function sumCumulative(records) {
  const acc = { input: 0, output: 0, cache_creation: 0, cache_read: 0 };
  for (const r of records) {
    if (!r) continue;
    acc.input += numOrZero(r.input);
    acc.output += numOrZero(r.output);
    acc.cache_creation += numOrZero(r.cache_creation);
    acc.cache_read += numOrZero(r.cache_read);
  }
  return acc;
}

// Pure: compose a cumulative usage tally from ALREADY-READ transcript text.
// `tail` is the { raw, active } object returned by readTranscriptTail — no
// disk I/O happens here. Returns { input, output, cache_creation, cache_read,
// recordCount, dedupedCount, hadCompactBoundary }.
export function analyzeTranscriptFromText(tail) {
  const { raw = "", active = "" } = tail && typeof tail === "object" ? tail : {};
  const blocks = parseJsonlBlocks(active);
  const records = blocks.map(extractUsageFromBlock).filter((x) => x !== null);
  const deduped = dedupByMessageId(records);
  const cumulative = sumCumulative(deduped);
  return {
    ...cumulative,
    recordCount: records.length,
    dedupedCount: deduped.length,
    hadCompactBoundary: active !== raw, // true if a compact marker was sliced off
  };
}

// Compose all of the above: filePath → cumulative usage (ONE disk read).
// Returns { input, output, cache_creation, cache_read, recordCount, dedupedCount }.
// On any failure returns zeros — R12: a failed read should not look like fresh data.
export function analyzeTranscript({ filePath, maxBytes = DEFAULT_TAIL_BYTES } = {}) {
  return analyzeTranscriptFromText(readTranscriptTail(filePath, maxBytes));
}

// True when a parsed record is a compact-summary marker rather than a real
// turn. The compact summary's own usage block reports the pre-compact prefix
// Claude READ to write the summary — counting it as "current ctx" over-states
// the post-compact window by one turn. precompact-auto-trigger.mjs guards the
// same way; extractLatestCtx mirrors it here as defense-in-depth (the
// post-compact slice should already exclude it, but a malformed slice or a
// summary recorded as an assistant turn must not leak through).
export function isCompactSummaryBlock(block) {
  if (!block || typeof block !== "object") return false;
  if (block.isCompactSummary === true) return true;
  // Current format (2026-06+): compaction is a system record, not a per-message
  // flag. {type:"system", subtype:"compact_boundary", compactMetadata:{...}}.
  if (block.type === "system" && block.subtype === "compact_boundary") return true;
  const msg = block.message;
  if (msg && typeof msg === "object" && msg.isCompactSummary === true) return true;
  return false;
}

// Pure: extract the LATEST per-turn context-window size from ALREADY-READ text.
// `tail` is the { raw, active } object from readTranscriptTail — no disk I/O.
// "ctx" is the input window for the MOST RECENT real turn, not a cumulative
// sum: input_tokens + cache_creation_input_tokens + cache_read_input_tokens
// (output_tokens is generated, not held in context). Walks the post-compact
// slice in reverse, skipping compact-summary records, returning the first turn
// with a non-zero usage block. Returns null when none is findable.
export function extractLatestCtxFromText(tail) {
  const { raw = "", active = "" } = tail && typeof tail === "object" ? tail : {};
  if (!active) return null;
  const blocks = parseJsonlBlocks(active);
  if (blocks.length === 0) return null;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    if (isCompactSummaryBlock(block)) continue;
    const usage = extractUsageFromBlock(block);
    if (!usage) continue;
    const tokens =
      numOrZero(usage.input) + numOrZero(usage.cache_creation) + numOrZero(usage.cache_read);
    if (tokens <= 0) continue;
    return {
      tokens,
      source: "usage-block",
      recordCount: blocks.length,
      hadCompactBoundary: active !== raw,
    };
  }
  return null;
}

// Compose: filePath → latest per-turn ctx size (ONE disk read).
// R12: on read/parse failure → null (surface "unknown" rather than fabricate).
export function extractLatestCtx({ filePath, maxBytes = DEFAULT_TAIL_BYTES } = {}) {
  return extractLatestCtxFromText(readTranscriptTail(filePath, maxBytes));
}
