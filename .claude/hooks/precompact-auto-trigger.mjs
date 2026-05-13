#!/usr/bin/env node
// tier: T0
/**
 * precompact-auto-trigger.mjs — Enforce /precompact at 160K tokens.
 *
 * Goal:
 *   Claude runs with a 1M token context window (Opus 4.5). At 900K tokens we MUST run
 *   /precompact (writes the per-chat handoff so /startup can resume). The
 *   100K remaining buffer is writing-room for the handoff and for Claude's
 *   subsequent invocation of /compact before hitting the hard cap.
 *
 * Event routing — canonical entry is **PreToolUse only** (one fire per tool
 * call). It does both:
 *   - SOFT (tokens ≥ SOFT): emit `additionalContext` nudging /precompact,
 *     dedup'd per session so it fires once per crossing. Non-blocking.
 *   - HARD (tokens ≥ HARD): `decision:block` the tool call, unless the
 *     precompact-pending marker exists (/precompact already fired).
 *   The PostToolUse / UserPromptSubmit branches are kept for backward compat
 *   (so the hook still works if also wired there) but the harness should wire
 *   this on PreToolUse only — wiring it on both Pre+Post doubled the transcript
 *   read per tool call for no benefit (the PreToolUse arm already covers SOFT).
 *
 * Token source:
 *   Reads only the TAIL of the transcript JSONL (`transcript_path` from hook
 *   stdin — last ~512 KB) and sums the last assistant message's
 *   usage.input_tokens + cache_read + cache_creation. That IS Claude's
 *   authoritative measure. The tail read keeps cost O(1) instead of O(session
 *   size) — a 900K-token transcript is multi-MB and this hook runs on every
 *   tool call. Falls back to byte-estimation (size / 3.5) when unavailable.
 *
 * Thresholds (configurable via env):
 *   PRECOMPACT_SOFT_TOKENS  (default 800000) — soft inject
 *   PRECOMPACT_HARD_TOKENS  (default 900000) — hard block (buffer for
 *                                                pre-compact + compact chain)
 *
 * Dedup:
 *   Writes a cache marker so the soft inject fires once per crossing, not
 *   every tool call. Marker clears when token count drops below the soft
 *   threshold (after /compact).
 */

import fs from "node:fs";
import path from "node:path";

const CACHE_DIR = path.resolve("H:/prism/.claude/cache");
const SOFT_FIRED_PREFIX = "precompact-auto-soft-fired-"; // suffix: <sid>.marker
const PENDING_MARKER_DIR = CACHE_DIR; // precompact-pending-<sid>.marker lives here

// Multi-chat coordination: every chat keys its OWN marker by session id taken
// from hook stdin (stdin.session_id). Earlier this file used a single global
// marker, which caused 6 concurrent chats to silently dedup themselves out of
// the SOFT warning when the FIRST chat crossed 800K — they sailed past the
// soft window and all hit the HARD 900K block in the same minute.
function safeSid(sid) {
  if (typeof sid !== "string" || sid.length === 0) return "global";
  // Sanitize: keep alnum + dash + underscore; everything else → '_'.
  return sid.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global";
}
function softFiredPath(sid) {
  return path.join(CACHE_DIR, `${SOFT_FIRED_PREFIX}${safeSid(sid)}.marker`);
}

// Thresholds are paired with CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95 (950K of 1M):
//   SOFT 800K — nudge Claude to run /precompact (non-blocking)
//   HARD 900K — last-chance block BEFORE native autocompact at 950K, so
//                 /precompact has room to write the handoff in the 50K
//                 buffer between HARD and native autocompact.
const SOFT = Number(process.env.PRECOMPACT_SOFT_TOKENS || 800_000);
const HARD = Number(process.env.PRECOMPACT_HARD_TOKENS || 900_000);
const CONTEXT_CAP = Number(process.env.PRECOMPACT_CONTEXT_CAP || 1_000_000);
const CHARS_PER_TOKEN = 3.5;

function readStdinSync() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

const TRANSCRIPT_TAIL_BYTES = 512 * 1024; // last 512 KB is far more than one assistant turn

/** Read only the tail of a (possibly large) file — O(1) instead of O(size). */
function readTail(filePath, maxBytes) {
  const fd = fs.openSync(filePath, "r");
  try {
    const { size } = fs.fstatSync(fd);
    const start = size > maxBytes ? size - maxBytes : 0;
    const len = size - start;
    const buf = Buffer.allocUnsafe(len);
    fs.readSync(fd, buf, 0, len, start);
    return buf.toString("utf-8");
  } finally {
    fs.closeSync(fd);
  }
}

function lastAssistantTokens(transcriptPath) {
  if (!transcriptPath) return null;
  try {
    const raw = readTail(transcriptPath, TRANSCRIPT_TAIL_BYTES);
    const lines = raw.split("\n");
    // If we truncated mid-line at the start, the first element is a partial
    // JSON line — JSON.parse throws and we skip it, which is correct.
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      const usage = entry?.message?.usage ?? entry?.usage;
      if (entry?.type === "assistant" && usage && typeof usage === "object") {
        const input = Number(usage.input_tokens ?? 0);
        const cacheR = Number(usage.cache_read_input_tokens ?? 0);
        const cacheC = Number(usage.cache_creation_input_tokens ?? 0);
        return input + cacheR + cacheC;
      }
    }
  } catch { /* ignore */ }
  return null;
}

function estimateFromBytes(transcriptPath) {
  try {
    const st = fs.statSync(transcriptPath);
    return Math.floor(st.size / CHARS_PER_TOKEN);
  } catch { return 0; }
}

function precompactMarkerActive(sid) {
  // If /precompact was just run for THIS session, its guard marker exists.
  // Don't nag or block — the user just needs to run /compact, and the
  // precompact-pending-guard Stop hook already enforces that.
  //
  // Multi-chat: the marker filename is `precompact-pending-<sid>.marker`.
  // Earlier this scanned ALL pending markers and returned true on any recent
  // one, meaning chat A running /precompact unblocked the HARD threshold for
  // chats B-F. Now scoped to the caller's own session id.
  const safe = safeSid(sid);
  const markerPath = path.join(PENDING_MARKER_DIR, `precompact-pending-${safe}.marker`);
  try {
    if (!fs.existsSync(markerPath)) return false;
    const mt = fs.statSync(markerPath).mtimeMs;
    return (Date.now() - mt) / 60000 < 30;
  } catch { return false; }
}

function softAlreadyFired(sid, tokens) {
  const p = softFiredPath(sid);
  try {
    if (!fs.existsSync(p)) return false;
    const body = JSON.parse(fs.readFileSync(p, "utf-8"));
    // If we're still above the threshold and it was fired recently, skip
    return body?.tokens_at_fire && tokens >= SOFT - 5000;
  } catch { return false; }
}

function markSoftFired(sid, tokens) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(softFiredPath(sid), JSON.stringify({
      session_id: safeSid(sid),
      tokens_at_fire: tokens,
      fired_at: new Date().toISOString(),
    }) + "\n");
  } catch { /* ignore */ }
}

function clearSoftFired(sid) {
  try { fs.unlinkSync(softFiredPath(sid)); } catch { /* ignore */ }
}

// Housekeeping: scan all per-session SOFT markers, drop any older than 30 min.
// Replaces the previous single-file stale-cleanup. Survives crashes that left
// markers behind for sessions that never reached the post-compact recovery.
function pruneStaleSoftMarkers() {
  try {
    if (!fs.existsSync(CACHE_DIR)) return;
    const now = Date.now();
    for (const f of fs.readdirSync(CACHE_DIR)) {
      if (!f.startsWith(SOFT_FIRED_PREFIX) || !f.endsWith(".marker")) continue;
      const full = path.join(CACHE_DIR, f);
      try {
        const st = fs.statSync(full);
        if ((now - st.mtimeMs) > 30 * 60 * 1000) fs.unlinkSync(full);
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

function detectEvent(stdin) {
  const ev = stdin?.hook_event_name || process.env.CLAUDE_HOOK_EVENT || "";
  if (ev === "PreToolUse" || ev === "PostToolUse" || ev === "UserPromptSubmit" || ev === "Stop") return ev;
  // Arg fallback
  const argv = process.argv.slice(2);
  if (argv.includes("--pre")) return "PreToolUse";
  if (argv.includes("--post")) return "PostToolUse";
  return "PostToolUse"; // default
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

function main() {
  const stdin = readStdinSync();
  const transcriptPath = stdin?.transcript_path;
  // Per-chat scoping: each session has its own SOFT/PENDING marker keyed by
  // stdin.session_id. Falls back to "global" when stdin is absent (manual
  // testing) — preserves the old single-marker behavior in that case.
  const sid = stdin?.session_id;

  let tokens = transcriptPath ? lastAssistantTokens(transcriptPath) : null;
  if (tokens == null || !Number.isFinite(tokens) || tokens <= 0) {
    tokens = transcriptPath ? estimateFromBytes(transcriptPath) : 0;
  }

  // Dropped back below soft threshold? (post-compact) — clear THIS session's
  // dedup marker so the next crossing fires a fresh warning.
  if (tokens < SOFT) clearSoftFired(sid);
  // Housekeeping: drop any per-session marker older than 30 minutes (stale
  // from crashed sessions). Bounded scan over the cache dir.
  pruneStaleSoftMarkers();

  const event = detectEvent(stdin);
  const precompactAlreadyArmed = precompactMarkerActive(sid);

  // HARD: block the tool call at ≥ HARD tokens, unless precompact marker is
  // live. PreToolUse is the canonical event (decision:block stops the tool
  // call); Stop also accepted for safety.
  if ((event === "PreToolUse" || event === "Stop") && tokens >= HARD && !precompactAlreadyArmed) {
    // HS-11 sanity floor (2026-05-12): if the token estimate exceeds the
    // model's hard cap by >50%, the counter is almost certainly wrong
    // (typical cause: transcript JSONL bytes ÷ 4 over-counts when persisted-
    // output files inflate the on-disk size). Log + soft-nudge instead of
    // hard-blocking. Blocking work over a measurement bug is worse than
    // letting a slightly-over-budget turn through.
    if (tokens > CONTEXT_CAP * 1.5) {
      try {
        fs.appendFileSync(
          "H:/prism/state/shared/precompact-trigger.jsonl",
          JSON.stringify({ t: Date.now(), sid, tokens, hard: HARD, cap: CONTEXT_CAP, verdict: "TOKEN_COUNT_SUSPECT" }) + "\n"
        );
      } catch { /* ignore */ }
      emit({
        continue: true,
        hookSpecificOutput: {
          additionalContext: `[precompact-sanity] token estimate ${tokens.toLocaleString()} > 1.5× cap (${CONTEXT_CAP.toLocaleString()}) — counter likely wrong, soft-nudge instead of hard-block. Run /precompact when convenient. Logged to state/shared/precompact-trigger.jsonl.`,
        },
      });
      return;
    }
    emit({
      decision: "block",
      reason: [
        `CONTEXT AT ${tokens.toLocaleString()} TOKENS — PRECOMPACT HARD THRESHOLD (${HARD.toLocaleString()})`,
        ``,
        `You are ${Math.max(0, CONTEXT_CAP - tokens).toLocaleString()} tokens from the 1M hard cap.`,
        `You MUST run /precompact NOW before any more tool calls.`,
        ``,
        `Steps:`,
        `  1. Invoke the precompact skill via the Skill tool with skill="precompact".`,
        `  2. After /precompact completes, the user runs /compact (auto-enforced by Stop hook).`,
        ``,
        `This block was issued because continuing work now risks overflowing the context`,
        `before the handoff can be written.`,
      ].join("\n"),
    });
    return;
  }

  // SOFT: inject `additionalContext` at ≥ SOFT tokens, dedup'd per session.
  // Runs on PreToolUse (canonical — one fire per tool call) AND on the legacy
  // PostToolUse / UserPromptSubmit events if the hook is still wired there.
  if ((event === "PreToolUse" || event === "PostToolUse" || event === "UserPromptSubmit") &&
      tokens >= SOFT && !precompactAlreadyArmed && !softAlreadyFired(sid, tokens)) {
    markSoftFired(sid, tokens);
    const remaining = Math.max(0, CONTEXT_CAP - tokens);
    const msg = [
      `CONTEXT AT ${tokens.toLocaleString()} TOKENS — /precompact REQUIRED (soft threshold ${SOFT.toLocaleString()})`,
      `Remaining buffer: ~${remaining.toLocaleString()} tokens before 1M cap.`,
      `Finish the current step, then invoke the precompact skill (Skill tool, skill="precompact").`,
      `After /precompact writes the handoff, run /compact. /startup will resume cleanly.`,
    ].join(" ");
    emit({
      continue: true,
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: msg,
      },
    });
    return;
  }

  // Below threshold OR precompact already armed — no-op
  emit({ continue: true, suppressOutput: true });
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }

