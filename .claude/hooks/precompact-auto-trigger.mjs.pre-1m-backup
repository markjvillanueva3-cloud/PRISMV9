#!/usr/bin/env node
/**
 * precompact-auto-trigger.mjs — Enforce /precompact at 160K tokens.
 *
 * Goal:
 *   Claude runs with a 200K token context window (Opus 4.5). At 900K tokens we MUST run
 *   /precompact (writes the per-chat handoff so /startup can resume). The
 *   100K remaining buffer is writing-room for the handoff and for Claude's
 *   subsequent invocation of /compact before hitting the hard cap.
 *
 * Event routing (one binary, two modes):
 *   - PostToolUse → soft: inject `additionalContext` nudging Claude to run
 *                   /precompact. Non-blocking — keeps work flowing while
 *                   warning the model.
 *   - PreToolUse  → hard: BLOCK the next tool call with decision:block
 *                   once the HARD threshold is crossed, unless the
 *                   precompact-pending-guard marker exists (meaning
 *                   /precompact was just fired and /compact is next).
 *
 * Token source:
 *   Reads transcript JSONL (`transcript_path` from hook stdin) and sums the
 *   last assistant message's usage.input_tokens + cache_read + cache_creation.
 *   That IS Claude's authoritative measure. Falls back to byte-estimation
 *   (bytes / 3.5) when transcript unavailable.
 *
 * Thresholds (configurable via env):
 *   PRECOMPACT_SOFT_TOKENS  (default 175_000) — soft inject
 *   PRECOMPACT_HARD_TOKENS  (default 185_000) — hard block (buffer for
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
const SOFT_FIRED = path.join(CACHE_DIR, "precompact-auto-soft-fired.marker");
const PENDING_MARKER_DIR = CACHE_DIR; // precompact-pending-<sid>.marker lives here

// Thresholds are paired with CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95 (190K):
//   SOFT 160K — nudge Claude to run /precompact (non-blocking)
//   HARD 180K — last-chance block BEFORE native autocompact at 190K, so
//                 /precompact has room to write the handoff in the 50K
//                 buffer between HARD and native autocompact.
const SOFT = Number(process.env.PRECOMPACT_SOFT_TOKENS || 175_000);
const HARD = Number(process.env.PRECOMPACT_HARD_TOKENS || 185_000);
const CHARS_PER_TOKEN = 3.5;

function readStdinSync() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function lastAssistantTokens(transcriptPath) {
  if (!transcriptPath) return null;
  try {
    const raw = fs.readFileSync(transcriptPath, "utf-8");
    const lines = raw.split("\n");
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

function precompactMarkerActive() {
  // If /precompact was just run, its guard marker exists. In that case we
  // don't nag or block — the user just needs to run /compact, and the
  // precompact-pending-guard Stop hook already enforces that.
  try {
    if (!fs.existsSync(PENDING_MARKER_DIR)) return false;
    const markers = fs.readdirSync(PENDING_MARKER_DIR)
      .filter((f) => f.startsWith("precompact-pending-") && f.endsWith(".marker"));
    const now = Date.now();
    for (const m of markers) {
      try {
        const mt = fs.statSync(path.join(PENDING_MARKER_DIR, m)).mtimeMs;
        if ((now - mt) / 60000 < 30) return true;
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return false;
}

function softAlreadyFired(tokens) {
  try {
    if (!fs.existsSync(SOFT_FIRED)) return false;
    const body = JSON.parse(fs.readFileSync(SOFT_FIRED, "utf-8"));
    // If we're still above the threshold and it was fired recently, skip
    return body?.tokens_at_fire && tokens >= SOFT - 5000;
  } catch { return false; }
}

function markSoftFired(tokens) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(SOFT_FIRED, JSON.stringify({
      tokens_at_fire: tokens,
      fired_at: new Date().toISOString(),
    }) + "\n");
  } catch { /* ignore */ }
}

function clearSoftFired() {
  try { fs.unlinkSync(SOFT_FIRED); } catch { /* ignore */ }
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

  let tokens = transcriptPath ? lastAssistantTokens(transcriptPath) : null;
  if (tokens == null || !Number.isFinite(tokens) || tokens <= 0) {
    tokens = transcriptPath ? estimateFromBytes(transcriptPath) : 0;
  }

  // Dropped back below soft threshold? (post-compact) — clear dedup marker.
  if (tokens < SOFT) clearSoftFired();
  // Also clear markers older than 30 minutes (stale from crashed sessions)
  try { if (fs.existsSync(SOFT_FIRED)) { const st = fs.statSync(SOFT_FIRED); if ((Date.now() - st.mtimeMs) > 30 * 60 * 1000) clearSoftFired(); } } catch { /* ignore */ }

  const event = detectEvent(stdin);
  const precompactAlreadyArmed = precompactMarkerActive();

  // HARD: PreToolUse block at ≥ HARD tokens, unless precompact marker is live
  if (event === "PreToolUse" && tokens >= HARD && !precompactAlreadyArmed) {
    emit({
      decision: "block",
      reason: [
        `CONTEXT AT ${tokens.toLocaleString()} TOKENS — PRECOMPACT HARD THRESHOLD (${HARD.toLocaleString()})`,
        ``,
        `You are ${Math.max(0, 200_000 - tokens).toLocaleString()} tokens from the 200K hard cap.`,
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

  // SOFT: PostToolUse / UserPromptSubmit inject at ≥ SOFT tokens, dedup'd
  if ((event === "PostToolUse" || event === "UserPromptSubmit") &&
      tokens >= SOFT && !precompactAlreadyArmed && !softAlreadyFired(tokens)) {
    markSoftFired(tokens);
    const remaining = Math.max(0, 200_000 - tokens);
    const msg = [
      `CONTEXT AT ${tokens.toLocaleString()} TOKENS — /precompact REQUIRED (soft threshold ${SOFT.toLocaleString()})`,
      `Remaining buffer: ~${remaining.toLocaleString()} tokens before 200K cap.`,
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
