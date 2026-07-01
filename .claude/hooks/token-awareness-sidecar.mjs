#!/usr/bin/env node
// tier: T3
// TOKEN-AWARENESS-MS0 / U-TA03 — sidecar writer hook.
//
// UserPromptSubmit + PostToolUse hook. Composes a canonical TokenAwarenessState
// from 4 data sources and writes it to state/shared/token-budget-<slot>.json
// atomically. The state is then read by:
//   1. token-awareness-inject.mjs (UserPromptSubmit) → makes model see the state
//   2. TokenAwarenessEngine.getState() (MCP dispatcher consumer)
//   3. token-awareness-stop-advisory.mjs (Stop hook)
//
// Schema v1.0.0, TTL 180s (DEFAULT_STALE_TTL_MS in token-awareness-state.mjs;
// also the freshness gate in readSidecarPressure + precompact-auto-trigger),
// atomic write (.tmp -> rename). Fail-safe -- a sidecar
// write failure NEVER blocks the prompt; we just log and exit 0.
//
// Knob: PRISM_TOKEN_AWARE_SIDECAR_DISABLE=1

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  mergeFromSources,
  thresholdsFromEnv,
} from "../../scripts/lib/token-awareness-state.mjs";
import {
  readTranscriptTail,
  analyzeTranscriptFromText,
  extractLatestCtxFromText,
  lastCompactMarkerOffset,
} from "../../scripts/lib/transcript-token-counter.mjs";

const PRISM = "H:/prism";
const SLOTS_FILE = `${PRISM}/state/shared/chat-slots.json`;
const OFFLOAD_STATS = `${PRISM}/mcp-server/data/state/ollama-offload-stats.json`;
const SIDECAR_DIR = `${PRISM}/state/shared`;
export const CTX_MAX_TOKENS = 1_000_000; // Opus 4.7 1M context — same as statusline
export const TRANSCRIPT_TAIL_BYTES = 4 * 1024 * 1024;
export const STATUSLINE_BYTES_PER_TOKEN = 3.5;
// Sanity ceiling: the model cannot physically hold > 1.1× ctxMax. Any byte-tail
// estimate above this is bad data (pre-compact bloat older than the 4MB window),
// not real context. Cap to avoid false-positive CRITICAL on long-lived sessions.
export const CTX_SANITY_CAP_TOKENS = Math.round(CTX_MAX_TOKENS * 1.1);
const HOOK_NAME = "token-awareness-sidecar";

function safeJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function safeStat(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function resolveSlot(sessionId, slotsDoc) {
  if (!sessionId || !slotsDoc || !slotsDoc.slots) return "unknown";
  for (const [name, data] of Object.entries(slotsDoc.slots)) {
    if (!data) continue;
    if (data.chatId === sessionId) return name;
    if (data.chatId && sessionId.includes(data.chatId.replace(/^claude-/, ""))) return name;
  }
  return "unknown";
}

// Estimate ctx tokens from transcript byte tail — same algo as statusline.mjs
// (4MB tail, 3.5 bytes/token, compact-boundary-aware).
export function estimateCtxFromBytes(transcriptPath) {
  if (!transcriptPath) return null;
  const stat = safeStat(transcriptPath);
  if (!stat) return null;
  const window = Math.min(stat.size, TRANSCRIPT_TAIL_BYTES);
  let fd;
  try {
    fd = fs.openSync(transcriptPath, "r");
    const buf = Buffer.alloc(window);
    fs.readSync(fd, buf, 0, window, stat.size - window);
    fs.closeSync(fd);
    const text = buf.toString("utf8");
    // Both compact-boundary formats (current compact_boundary record + legacy
    // isCompactSummary flag) -- routed through the shared lib so a future
    // format change is one edit. The legacy-only scan silently broke when
    // Claude Code switched formats (2026-06), inflating byte-tail ctx.
    const compactIdx = lastCompactMarkerOffset(text);
    let activeBytes;
    if (compactIdx >= 0) {
      activeBytes = window - compactIdx;
    } else if (stat.size <= TRANSCRIPT_TAIL_BYTES) {
      activeBytes = stat.size;
    } else {
      // File exceeds window AND no compact marker visible in last 4MB →
      // a /compact happened older than the window. Active context size is
      // unobservable (could be tiny just after compact, or near-cap before
      // the next one). R12: return null to surface "unknown" rather than
      // fabricate a credible-looking 1.1× ctxMax → false-positive CRITICAL.
      return null;
    }
    const raw = Math.round(activeBytes / STATUSLINE_BYTES_PER_TOKEN);
    return Math.min(raw, CTX_SANITY_CAP_TOKENS);
  } catch {
    if (fd != null) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
    return null;
  }
}

// Extract rate_limits from Claude Code v1.2.80+ statusLine stdin JSON. The
// field is `rate_limits.five_hour.{used_percentage, resets_at}` — undefined on
// older versions; we fall back gracefully.
function extractRateLimits(cc) {
  if (!cc || typeof cc !== "object") return null;
  const rl = cc.rate_limits;
  if (!rl || typeof rl !== "object") return null;
  const fh = rl.five_hour || {};
  const sd = rl.seven_day || rl.weekly || {};
  // used_percentage may be 0..100 OR 0..1 — normalize to 0..1
  const norm = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n > 1 ? n / 100 : n;
  };
  return {
    fiveHourPct: norm(fh.used_percentage),
    fiveHourResetsAt: fh.resets_at || null,
    sevenDayPct: norm(sd.used_percentage),
    sevenDayResetsAt: sd.resets_at || null,
  };
}

// Read ollama-offload-stats.json — same shape statusline uses for MP bar.
function readOffload() {
  const stats = safeJson(OFFLOAD_STATS);
  if (!stats) return null;
  const offloaded = Number(stats.offloaded) || 0;
  const kept = Number(stats.keptOnClaude) || 0;
  if (offloaded === 0 && kept === 0) return null;
  return { offloaded, kept };
}

// Atomic write: temp file in same dir → fs.renameSync (atomic on same FS).
// Uses PID + random suffix to avoid collisions between concurrent slots writing
// their own sidecars (different slot files anyway — different paths — but
// belt-and-suspenders against TOCTOU).
function atomicWriteJson(filePath, obj) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, filePath);
}

async function main() {
  if (process.env.PRISM_TOKEN_AWARE_SIDECAR_DISABLE === "1") {
    process.exit(0);
  }
  // Read stdin (Claude Code pipes session JSON). Empty stdin is fine — we just
  // exit cleanly.
  let raw = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) raw += chunk;
  let cc = {};
  try {
    cc = JSON.parse(raw || "{}");
  } catch {
    // malformed stdin → exit silently, never block
    process.exit(0);
  }

  const sessionId = cc.session_id || "";
  const transcriptPath = cc.transcript_path || "";
  if (!sessionId) process.exit(0);

  const slotsDoc = safeJson(SLOTS_FILE);
  const slot = resolveSlot(sessionId, slotsDoc);

  // Read the 4 MB transcript tail ONCE. Both Source 1 (latest-ctx figure) and
  // Source 3 (dedup-cumulative tally) derive from the same slice. Before this,
  // each re-opened and re-parsed the 4 MB tail independently (2 reads each =
  // 4 per sidecar fire); under fleet load that exceeded the hook timeout and
  // the hook was killed before the atomic write — the sidecar then went stale.
  const tail = transcriptPath ? readTranscriptTail(transcriptPath) : { raw: "", active: "" };

  // Source 1: ctx for the most-recent turn. Prefer API-authoritative
  // usage-block (extractLatestCtxFromText) over byte-tail estimate
  // (estimateCtxFromBytes). The usage-block path is exact; byte-tail is a
  // fallback for sessions whose tail has no parseable usage record (very-new
  // session, post-compact tail without an assistant turn yet, or truncation).
  let ctxTokens = null;
  const latest = extractLatestCtxFromText(tail);
  if (latest && Number.isFinite(latest.tokens) && latest.tokens > 0) {
    ctxTokens = Math.min(latest.tokens, CTX_SANITY_CAP_TOKENS);
  } else {
    ctxTokens = estimateCtxFromBytes(transcriptPath);
  }
  const statusline = ctxTokens != null ? { ctxTokens, ctxMaxTokens: CTX_MAX_TOKENS } : null;

  // Source 2: rate_limits if Claude Code provided them (v1.2.80+)
  const rateLimits = extractRateLimits(cc);

  // Source 3: transcript dedup-cumulative — from the SAME tail read above.
  let transcript = null;
  if (transcriptPath) {
    try {
      const a = analyzeTranscriptFromText(tail);
      transcript = {
        input: a.input,
        cache_read: a.cache_read,
        cache_creation: a.cache_creation,
        output: a.output,
      };
    } catch {
      transcript = null;
    }
  }

  // Source 4: offload accounting
  const offload = readOffload();

  const state = mergeFromSources({
    statusline,
    rateLimits,
    transcript,
    offload,
    nowMs: Date.now(),
    thresholds: thresholdsFromEnv(process.env),
  });

  // Decorate with operational metadata
  state.slot = slot;
  state.sessionId = sessionId;
  state.host = os.hostname();
  state.hook = HOOK_NAME;

  const outFile = path.join(SIDECAR_DIR, `token-budget-${slot}.json`);
  try {
    atomicWriteJson(outFile, state);
  } catch {
    // R12: log failure to stderr so it's surfaced in hook logs, but never block
    process.stderr.write(`[${HOOK_NAME}] sidecar write failed for slot=${slot}\n`);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
