// scripts/lib/self-compact-confirm-lib.mjs
//
// SELF-COMPACT-MS0 / U-SELFCOMPACT-CONFIRM (slot:alpha 2026-06-14) -- prove the
// model-invokable self-compaction END-TO-END.
//
// self-compact.mjs records every `send` / `fallback` to the actuation ledger
// (state/shared/dashboards/self-compact-log.jsonl), but a `send` only proves we
// pushed "/compact"+Enter at THIS chat's terminal -- it does NOT prove Claude Code
// actually compacted. Until 2026-06-14 every prior session fell back at `no-tab`,
// so the SEND path had NEVER been validated in production (see
// reference_self_compact_actuation_verified_live_2026_06_14).
//
// The authoritative ground-truth that a compaction really happened is the
// transcript's `compact_boundary` record (CURRENT format) / legacy
// `isCompactSummary` flag -- the SAME canonical markers transcript-token-counter
// uses (reuse, R8; the 2026-06-10 format-change lesson). Each boundary carries a
// `timestamp` and `sessionId`. So: a logged `send` at T for session S is CONFIRMED
// end-to-end iff a `compact_boundary` for session S appears at/after T (within a
// window). This closes the gap with ZERO disruptive test -- it reads the real path
// the first time self-compact genuinely fires.
//
// Everything here is PURE + injectable so the correlation + summary are
// deterministically testable without poking real transcripts; only
// readBoundariesFromFile touches disk (streamed line-by-line -- NEVER a
// whole-file string read, per the V8 512MiB string-cap lesson).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { COMPACT_MARKERS } from "./transcript-token-counter.mjs";

// A self-compact `send` is confirmed only if a real compaction boundary lands
// within this window after the send. A manual /compact can take minutes
// (durationMs ~2min observed); the model must also end its turn first. 60 min is
// generous without spanning into a *different* later compaction episode.
export const DEFAULT_CONFIRM_WINDOW_MS = 60 * 60 * 1000;

/** Pure: parse a self-compact-log.jsonl body into records, skipping malformed lines. */
export function parseLedger(text) {
  if (typeof text !== "string" || !text) return [];
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try {
      const o = JSON.parse(s);
      if (o && typeof o === "object") out.push(o);
    } catch { /* skip torn / non-JSON line */ }
  }
  return out;
}

/** Pure: a record is an actuation SEND (the only kind we can confirm). */
export function isSendRecord(rec) {
  return !!rec && rec.action === "send" && !!rec.sent && rec.sent.ok === true;
}

/** Pure: a record is a CONFIRM event we previously appended (for idempotency). */
export function isConfirmRecord(rec) {
  return !!rec && rec.action === "confirm";
}

/** Pure: stable key for a send (sessionId + its ts) -- used to dedupe confirms. */
export function sendKey(rec) {
  return `${rec?.sessionId || "?"}::${rec?.ts || "?"}`;
}

/**
 * Pure: is `s` a transcript line that encodes a compaction boundary? Cheap
 * substring pre-filter against the canonical markers (avoids JSON.parse on every
 * line of a multi-MB transcript).
 */
export function lineHasBoundaryMarker(s) {
  if (typeof s !== "string") return false;
  for (const m of COMPACT_MARKERS) if (s.includes(m)) return true;
  return false;
}

/**
 * Pure: given ONE transcript line known to contain a marker, extract a boundary
 * descriptor, or null if it does not parse / is not actually a boundary record.
 * Tolerates both the current `subtype:compact_boundary` system record and the
 * legacy per-message `isCompactSummary` flag.
 */
export function parseBoundaryLine(s) {
  let o;
  try { o = JSON.parse(s); } catch { return null; }
  if (!o || typeof o !== "object") return null;
  const isCurrent = o.subtype === "compact_boundary";
  const isLegacy = o.isCompactSummary === true;
  if (!isCurrent && !isLegacy) return null; // marker substring appeared inside other content
  const ts = typeof o.timestamp === "string" ? o.timestamp : null;
  const meta = (o.compactMetadata && typeof o.compactMetadata === "object") ? o.compactMetadata : {};
  return {
    ts,
    sessionId: typeof o.sessionId === "string" ? o.sessionId : null,
    trigger: typeof meta.trigger === "string" ? meta.trigger : (isLegacy ? "legacy" : null),
    preTokens: Number.isFinite(meta.preTokens) ? meta.preTokens : null,
    postTokens: Number.isFinite(meta.postTokens) ? meta.postTokens : null,
    format: isCurrent ? "compact_boundary" : "isCompactSummary",
  };
}

/** Pure: parse an iterable of transcript lines into boundary descriptors (valid ts only). */
export function extractBoundaries(lines) {
  const out = [];
  for (const line of lines) {
    if (!lineHasBoundaryMarker(line)) continue;
    const b = parseBoundaryLine(line);
    if (b && b.ts && !Number.isNaN(Date.parse(b.ts))) out.push(b);
  }
  return out;
}

/**
 * Pure: the first boundary at/after `sinceIso` and within `withinMs`. Boundaries
 * BEFORE the send never count (a compaction that predates the send cannot have
 * been caused by it). Returns the boundary or null.
 */
export function findFirstBoundaryAtOrAfter(boundaries, sinceIso, withinMs = DEFAULT_CONFIRM_WINDOW_MS) {
  const since = Date.parse(sinceIso);
  if (Number.isNaN(since)) return null;
  let best = null, bestT = Infinity;
  for (const b of boundaries) {
    const t = Date.parse(b.ts);
    if (Number.isNaN(t)) continue;
    if (t < since) continue;                 // strictly not-before (>= allows equal-ts)
    if (withinMs != null && t - since > withinMs) continue;
    if (t < bestT) { bestT = t; best = b; }  // nearest qualifying boundary
  }
  return best;
}

/**
 * Pure: correlate send records against boundaries grouped by sessionId.
 * deps.withinMs overrides the window. Returns one row per send:
 *   { ts, slot, sessionId, confirmed, boundaryTs, latencyMs, trigger, reason }
 */
export function correlate(sendRecords, boundariesBySession, { withinMs = DEFAULT_CONFIRM_WINDOW_MS } = {}) {
  return sendRecords.map((rec) => {
    const base = { ts: rec.ts || null, slot: rec.slot || null, sessionId: rec.sessionId || null };
    if (!rec.sessionId) return { ...base, confirmed: false, boundaryTs: null, latencyMs: null, trigger: null, reason: "no-sessionId-on-send" };
    if (!rec.ts || Number.isNaN(Date.parse(rec.ts))) return { ...base, confirmed: false, boundaryTs: null, latencyMs: null, trigger: null, reason: "bad-send-ts" };
    const bs = boundariesBySession[rec.sessionId] || [];
    const hit = findFirstBoundaryAtOrAfter(bs, rec.ts, withinMs);
    if (!hit) return { ...base, confirmed: false, boundaryTs: null, latencyMs: null, trigger: null, reason: "no-boundary-after-send" };
    return {
      ...base, confirmed: true, boundaryTs: hit.ts,
      latencyMs: Date.parse(hit.ts) - Date.parse(rec.ts),
      trigger: hit.trigger, reason: "boundary-confirmed",
    };
  });
}

/** Pure: roll up correlations into a summary. */
export function summarize(correlations) {
  const sent = correlations.length;
  const confirmedRows = correlations.filter((c) => c.confirmed);
  const confirmed = confirmedRows.length;
  const firstConfirmedAt = confirmedRows
    .map((c) => c.boundaryTs)
    .filter(Boolean)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0] || null; // numeric, offset-robust
  const bySlot = {};
  for (const c of correlations) {
    const k = c.slot || "(unknown)";
    bySlot[k] = bySlot[k] || { sent: 0, confirmed: 0 };
    bySlot[k].sent++;
    if (c.confirmed) bySlot[k].confirmed++;
  }
  return { sent, confirmed, unconfirmed: sent - confirmed, firstConfirmedAt, bySlot };
}

/**
 * Pure: Claude Code's transcript path for a session. The CLI encodes the cwd by
 * replacing every `:` `/` `\` with `-` (H:/prism -> H--prism) and stores the
 * transcript at <home>/.claude/projects/<encoded>/<sessionId>.jsonl.
 */
export function encodeProjectKey(cwd) {
  return String(cwd).replace(/[:\\/]/g, "-");
}
export function defaultTranscriptPath(sessionId, { homedir = os.homedir(), cwd = "H:/prism" } = {}) {
  // Sanitize: session ids are UUID / claude-<hex> shaped. Strip any char outside
  // [A-Za-z0-9_-] so a `../`-bearing id can never escape projects/<key>/ (P2
  // path-traversal hardening; scrutiny arm C). Harness-sourced today, but cheap.
  const safe = String(sessionId).replace(/[^A-Za-z0-9_-]/g, "");
  return path.join(homedir, ".claude", "projects", encodeProjectKey(cwd), `${safe}.jsonl`);
}

/**
 * Pure: the leading 8 hex chars of a session id, accepting both the full UUID
 * (`ad9c3041-...`) and the short `claude-<8hex>` form that stable-session-id.mjs
 * emits. Used to bridge the short-id-in-ledger vs full-UUID-transcript gap
 * (the P0 that would otherwise make every real send unconfirmable).
 */
export function shortHex(id) {
  if (typeof id !== "string") return null;
  const m = id.replace(/^claude-/i, "").match(/^([0-9a-f]{8})/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Disk: resolve the transcript path for a session id. Tries the exact
 * `<sid>.jsonl` first; if absent and the id is short (`claude-<8hex>` / bare
 * 8hex), lists the project dir and matches a `.jsonl` whose basename starts with
 * the 8-hex prefix (transcripts are named by the FULL UUID). Falls back to the
 * exact path so callers still get a (non-existent) path to read -> []. I/O
 * injectable for tests.
 */
export function resolveTranscriptPath(sid, { homedir = os.homedir(), cwd = "H:/prism", readdir = fs.readdirSync, exists = fs.existsSync } = {}) {
  const exact = defaultTranscriptPath(sid, { homedir, cwd });
  if (exists(exact)) return exact;
  const hex = shortHex(sid);
  if (!hex) return exact;
  const dir = path.join(homedir, ".claude", "projects", encodeProjectKey(cwd));
  let files = [];
  try { files = readdir(dir); } catch { return exact; }
  const hit = files.find((f) => typeof f === "string" && f.toLowerCase().startsWith(hex) && f.endsWith(".jsonl"));
  return hit ? path.join(dir, hit) : exact;
}

/**
 * Disk: stream a transcript file line-by-line and return its boundary
 * descriptors. NEVER reads the whole file into one string (V8 512MiB string-cap
 * lesson). Missing/unreadable file -> []. `deps.createStream` injectable for tests.
 */
export async function readBoundariesFromFile(filePath, deps = {}) {
  const { createStream = (p) => fs.createReadStream(p, { encoding: "utf8" }), exists = fs.existsSync } = deps;
  if (!exists(filePath)) return [];
  const boundaries = [];
  let stream;
  try { stream = createStream(filePath); } catch { return []; }
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      if (!lineHasBoundaryMarker(line)) continue;
      const b = parseBoundaryLine(line);
      if (b && b.ts && !Number.isNaN(Date.parse(b.ts))) boundaries.push(b);
    }
  } catch { /* torn read -> return what we have (fail-soft) */ }
  finally { try { rl.close(); } catch { /* noop */ } }
  return boundaries;
}

/**
 * Orchestrator (thin, injectable I/O): read the ledger, resolve each send's
 * transcript, correlate, and return { correlations, summary, newConfirms }.
 * newConfirms = confirm events to append (idempotent: excludes sends already
 * confirmed in the ledger). Does NOT write -- the caller appends (testable).
 */
export async function runConfirm(deps = {}) {
  const {
    ledgerPath,
    readText = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } },
    transcriptPathFor = (sid) => resolveTranscriptPath(sid), // short-id tolerant (P0 fix)
    readBoundaries = readBoundariesFromFile,
    withinMs = DEFAULT_CONFIRM_WINDOW_MS,
  } = deps;

  const records = parseLedger(readText(ledgerPath));
  const sends = records.filter(isSendRecord);
  const alreadyConfirmed = new Set(records.filter(isConfirmRecord).map((r) => r.forKey));

  // Group needed transcripts by sessionId, read boundaries once per session.
  const sessionIds = [...new Set(sends.map((s) => s.sessionId).filter(Boolean))];
  const boundariesBySession = {};
  for (const sid of sessionIds) {
    boundariesBySession[sid] = await readBoundaries(transcriptPathFor(sid));
  }

  const correlations = correlate(sends, boundariesBySession, { withinMs });
  const summary = summarize(correlations);

  const newConfirms = [];
  for (let i = 0; i < correlations.length; i++) {
    const c = correlations[i];
    if (!c.confirmed) continue;
    const key = sendKey(sends[i]);
    if (alreadyConfirmed.has(key)) continue;
    newConfirms.push({
      ts: new Date().toISOString(), action: "confirm", forKey: key,
      slot: c.slot, sessionId: c.sessionId, sendTs: c.ts,
      boundaryTs: c.boundaryTs, latencyMs: c.latencyMs, trigger: c.trigger,
    });
  }
  return { correlations, summary, newConfirms };
}
