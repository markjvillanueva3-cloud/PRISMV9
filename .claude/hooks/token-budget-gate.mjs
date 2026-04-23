#!/usr/bin/env node
/**
 * token-budget-gate.mjs — Token Budget Awareness Hook
 * ====================================================
 *
 * UserPromptSubmit hook that estimates remaining token budget and:
 *   1. Suggests compact skills when budget is low
 *   2. Warns when approaching context limit
 *   3. Blocks heavy operations when critically low
 *
 * FIRES ON: UserPromptSubmit
 *
 * Budget tiers:
 *   GREEN  (>50%): Full operations allowed
 *   YELLOW (30-50%): Suggest /slim, /digest, warn on heavy ops
 *   RED    (<30%): Block /autopilot-full, /forge-triple; suggest /compact
 */

import * as fs from "fs";

const SESSION_MEMORY = "H:/prism/state/SESSION_MEMORY.json";
const CHECKPOINT_STATE = "H:/prism/mcp-server/data/state/CHECKPOINT_TRACKER.json";
// Opus 4.7 [1m] = 1,000,000 token context window.
// Override via env PRISM_MAX_CONTEXT_TOKENS for future model swaps.
const MAX_CONTEXT_TOKENS = Number(process.env.PRISM_MAX_CONTEXT_TOKENS) || 1_000_000;
const AVG_TOKENS_PER_MESSAGE = 600;
const AVG_TOKENS_PER_EDIT = 400;

const HEAVY_SKILLS = [
  "/autopilot-full", "/autopilot", "/forge-triple", "/forge",
  "/learn-everything", "/pdf-learn", "/video-learn", "/ingest"
];

const COMPACT_SKILLS = [
  "/slim", "/digest", "/precompact", "/compact", "/handoff"
];

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 200);
  });
}

function estimateTokenUsage() {
  let messageCount = 0;
  let editCount = 0;

  try {
    if (fs.existsSync(SESSION_MEMORY)) {
      const mem = JSON.parse(fs.readFileSync(SESSION_MEMORY, "utf-8"));
      messageCount = mem.messageCount || mem.messages?.length || 0;
    }
  } catch { /* ignore */ }

  try {
    if (fs.existsSync(CHECKPOINT_STATE)) {
      const cp = JSON.parse(fs.readFileSync(CHECKPOINT_STATE, "utf-8"));
      editCount = cp.editCount || 0;
    }
  } catch { /* ignore */ }

  const estimated = (messageCount * AVG_TOKENS_PER_MESSAGE) + (editCount * AVG_TOKENS_PER_EDIT);
  return Math.min(estimated, MAX_CONTEXT_TOKENS);
}

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
  const input = await readStdin();
  const prompt = input.prompt || input.message || "";

  const usedTokens = estimateTokenUsage();
  const budget = getBudgetTier(usedTokens);
  const heavySkill = detectHeavySkill(prompt);

  let ctx = "";

  if (budget.tier === "CRITICAL") {
    // Auto-compaction handles context exhaustion — do NOT nag the user to run /compact.
    // The reorientation system (session-reorient-inject.mjs + prompt-rules-inject.mjs)
    // keeps drift in check every 15 prompts and every turn respectively.
    // Only still write the marker so session-handoff-auto can pick it up on the
    // natural compaction boundary; emit no additionalContext.
    try {
      fs.writeFileSync("H:/prism/state/shared/.auto-compact-triggered", new Date().toISOString());
    } catch { /* ignore */ }
    ctx = "";
  } else if (budget.tier === "RED") {
    if (heavySkill) {
      ctx = `⚠️ Heavy operation "${heavySkill}" may exhaust remaining ${budget.percent.toFixed(0)}% — consider splitting the task.`;
    } else {
      ctx = ""; // Auto-compaction handles this tier
    }
  } else if (budget.tier === "YELLOW") {
    // Auto-compaction handles this — no nag
    ctx = "";
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
