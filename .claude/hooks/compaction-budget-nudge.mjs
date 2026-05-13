#!/usr/bin/env node
// tier: T3
/**
 * compaction-budget-nudge.mjs — PostToolUse hook
 *
 * Fires after every Edit / Write / MultiEdit completion. Reads the live
 * token-economy session state and nudges the chat to /precompact when
 * context utilisation crosses predetermined thresholds.
 *
 * THRESHOLDS:
 *   <60%  silent — keep working
 *   60-80% advisory nudge ("approaching compaction window — finish current
 *                          unit cleanly then run /precompact")
 *   ≥80%  urgent nudge ("compact NOW: run /precompact, then /compact —
 *                       further work risks drift / hallucination")
 *
 * Why predetermined: Claude performance peaks 0-50% context, degrades
 * 50-80%, hallucinates 80-100%. Compacting at 60-70% gives a clean
 * handoff with full reasoning intact.
 *
 * Cooldown: max 1 nudge per 6 PostToolUse calls (state in
 * `state/shared/.compaction-nudge-cooldown.json`) so we don't spam.
 *
 * Failure mode: any read/parse error → silent exit 0 (never blocks).
 */

import fs from "node:fs";
import path from "node:path";

const STATE_DIR = "H:/prism/state/shared";
const COOLDOWN_FILE = path.join(STATE_DIR, ".compaction-nudge-cooldown.json");
const TOKEN_ECONOMY_FILE = path.join(STATE_DIR, "..", "..", "state", "token-economy-session.json");
const TOKEN_ECONOMY_FALLBACK = "H:/prism/state/token-economy-session.json";
const COOLDOWN_CALLS = 6;

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function loadCooldown() {
  return readJSON(COOLDOWN_FILE) || { lastNudgeAt: 0, callsSince: 0 };
}

function saveCooldown(state) {
  try { fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(state)); } catch { /* best-effort */ }
}

function readContextPct() {
  // The harness writes context-economy state to one of two paths. Try both.
  const data = readJSON(TOKEN_ECONOMY_FALLBACK) || readJSON(TOKEN_ECONOMY_FILE);
  if (!data) return null;
  // Field is heuristic — fall back through known shapes
  return data.context_pct ??
    data.contextPct ??
    data.session?.contextPct ??
    data.session?.context_pct ??
    null;
}

function readSessionId() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    const j = JSON.parse(raw || "{}");
    return j.session_id || j.sessionId || "";
  } catch { return ""; }
}

function emit(systemMessage) {
  process.stdout.write(JSON.stringify({ continue: true, systemMessage }));
  process.exit(0);
}

function silent() {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

function main() {
  // Drain stdin (PostToolUse always passes a payload)
  readSessionId();

  const cooldown = loadCooldown();
  cooldown.callsSince = (cooldown.callsSince || 0) + 1;

  const pct = readContextPct();
  if (pct === null || isNaN(pct)) {
    saveCooldown(cooldown);
    silent();
    return;
  }

  // Throttle: don't nudge more than once per COOLDOWN_CALLS PostToolUse fires
  if (cooldown.callsSince < COOLDOWN_CALLS) {
    saveCooldown(cooldown);
    silent();
    return;
  }

  if (pct < 60) {
    saveCooldown(cooldown); // counter keeps growing; reset only on nudge
    silent();
    return;
  }

  // Nudge (and reset counter)
  cooldown.callsSince = 0;
  cooldown.lastNudgeAt = Date.now();
  saveCooldown(cooldown);

  if (pct >= 80) {
    emit(
      `🚨 CONTEXT ${pct.toFixed(0)}% — COMPACT NOW.\n` +
      `Hallucination/drift zone. Finish ANY in-flight tool call cleanly, then:\n` +
      `  1. Run /precompact (writes per-chat handoff with RESUME directive)\n` +
      `  2. Run /compact (user must trigger — built-in command)\n` +
      `Post-compact, /startup auto-loads your handoff and resumes.`,
    );
  } else {
    emit(
      `⚠️ Context ${pct.toFixed(0)}% — approaching compaction window.\n` +
      `Finish current unit, then run /precompact when natural.\n` +
      `Optimal compact happens 60-70% — past 80% you risk drift.`,
    );
  }
}

main();
