#!/usr/bin/env node
// tier: T2
/**
 * token-budget-gate.mjs — Token Budget Awareness Hook
 * ====================================================
 *
 * UserPromptSubmit hook that reads THIS chat's transcript token count
 * (per-session, not shared) and:
 *   1. Warns when approaching context limit
 *   2. Blocks heavy operations when critically low
 *
 * FIRES ON: UserPromptSubmit
 *
 * Designed for up to 8 concurrent chats — token estimate comes from
 * stdin.transcript_path, never from a shared SESSION_MEMORY file.
 *
 * Budget tiers (1M context):
 *   GREEN  (>50% remaining): Full operations allowed
 *   YELLOW (30-50%): No nag (auto-compaction handles)
 *   RED    (15-30%): Warn on heavy ops only
 *   CRITICAL (<15%): Mark auto-compact, no nag
 */

import * as fs from "fs";
import {
  getSessionId, getTranscriptTokens, readStdinJson, CONTEXT_CAP,
} from "../helpers/session-token-state.mjs";

const MAX_CONTEXT_TOKENS = Number(process.env.PRISM_MAX_CONTEXT_TOKENS) || CONTEXT_CAP;

const HEAVY_SKILLS = [
  "/autopilot-full", "/autopilot", "/forge-triple", "/forge",
  "/learn-everything", "/pdf-learn", "/video-learn", "/ingest"
];

function getBudgetTier(usedTokens) {
  const remaining = MAX_CONTEXT_TOKENS - usedTokens;
  const percentRemaining = (remaining / MAX_CONTEXT_TOKENS) * 100;

  if (percentRemaining > 50) return { tier: "GREEN", percent: percentRemaining };
  if (percentRemaining > 30) return { tier: "YELLOW", percent: percentRemaining };
  if (percentRemaining > 15) return { tier: "RED", percent: percentRemaining };
  return { tier: "CRITICAL", percent: percentRemaining };
}

function detectHeavySkill(prompt) {
  const p = (prompt || "").toLowerCase();
  for (const skill of HEAVY_SKILLS) {
    if (p.includes(skill.slice(1))) return skill;
  }
  return null;
}

async function main() {
  const stdin = readStdinJson() || {};
  const sessionId = getSessionId(stdin);
  const prompt = stdin.prompt || stdin.message || "";

  // Per-session token count from transcript (authoritative, not shared)
  const usedTokens = getTranscriptTokens(stdin);
  const budget = getBudgetTier(usedTokens);
  const heavySkill = detectHeavySkill(prompt);

  let ctx = "";

  if (budget.tier === "CRITICAL") {
    // Auto-compaction handles exhaustion. Mark per-session marker so
    // handoff scripts can pick it up; do not nag.
    try {
      fs.writeFileSync(
        `H:/prism/.claude/cache/per-session/${sessionId}/auto-compact-triggered.txt`,
        new Date().toISOString()
      );
    } catch { /* ignore */ }
    ctx = "";
  } else if (budget.tier === "RED" && heavySkill) {
    ctx = `⚠️ Heavy operation "${heavySkill}" may exhaust remaining ${budget.percent.toFixed(0)}% — consider splitting the task.`;
  }

  if (ctx) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: ctx,
      },
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
