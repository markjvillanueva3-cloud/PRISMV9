#!/usr/bin/env node
// tier: T4
/**
 * pretool-context-forecast.mjs — PreToolUse hook
 *
 * Per-session: reads the calling chat's transcript_path tokens (no shared
 * state), then warns if the chat is >85% of its 1M window. Designed for up
 * to 8 concurrent chats — chat A at 90% never triggers warnings in chat B.
 *
 * Rate-limited per-session to once per 90 seconds.
 */

import { shouldSkipHook as _hp_shouldSkip } from "../helpers/hook-profile.mjs";
import * as fs from "node:fs";
import {
  getSessionId, getTranscriptTokens, readStdinJson,
  readSessionJson, writeSessionJson, CONTEXT_CAP,
} from "../helpers/session-token-state.mjs";

const TIME_BUDGET_MS = 80;
const RATE_NAME = "context-forecast-rate";
const RATE_WINDOW_MS = 90_000;
const WARN_UTIL = 0.85;
const CRIT_UTIL = 0.92;

async function main() {
  if (_hp_shouldSkip("pretool-context-forecast")) { console.log(JSON.stringify({ continue: true })); return; }
  const killer = setTimeout(() => {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }, TIME_BUDGET_MS);

  const stdin = readStdinJson() || {};
  const sessionId = getSessionId(stdin);
  const tokens = getTranscriptTokens(stdin);
  clearTimeout(killer);

  if (!tokens || tokens <= 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const util = tokens / CONTEXT_CAP;
  if (util < WARN_UTIL) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Per-session rate limit so we don't spam this chat (and don't see other chats' rate)
  const rate = readSessionJson(sessionId, RATE_NAME, {});
  const now = Date.now();
  if (now - (rate.lastFired || 0) < RATE_WINDOW_MS) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  rate.lastFired = now;
  writeSessionJson(sessionId, RATE_NAME, rate);

  const icon = util >= CRIT_UTIL ? "🔴" : "🟠";
  const verb = util >= CRIT_UTIL
    ? "/compact NOW — next step may overflow"
    : "plan a /compact soon";
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: `${icon} Context at ${(util * 100).toFixed(0)}% (${tokens.toLocaleString()}/${CONTEXT_CAP.toLocaleString()}) — ${verb}.`,
    },
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
