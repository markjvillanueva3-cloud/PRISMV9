#!/usr/bin/env node
// tier: T4
/**
 * userprompt-multi-tool-planner-nudge.mjs — UserPromptSubmit hook
 *
 * TOKEN-SAVINGS-EXPAND/U-PSN-MULTI-TOOL-PLANNER (gap-C1, 2026-05-23, slot:alpha)
 *
 * Detects prompts that imply many tool calls (audit-the-codebase, for-each-X,
 * ship-all-remaining-Y) and suggests dispatching a single Agent with
 * isolation:worktree instead of running N tool calls inline in the main
 * conversation. Saves the per-tool hook-stack overhead × N.
 *
 * Pure, regex-driven score. Threshold-gated; below threshold = silent.
 *
 * Advisory only. Knob: PRISM_MULTI_TOOL_PLANNER_DISABLE=1.
 */

import { readFileSync } from "node:fs";

// Pattern weights — each matched signal contributes to the score.
const MULTI_TOOL_PATTERNS = [
  { weight: 2, re: /\b(audit|review)\s+the\s+(entire|whole|full|complete)\b/i, hint: "full-codebase scan" },
  { weight: 2, re: /\bship\s+all\s+(remaining|missing|unwired)\b/i, hint: "ship-all-N" },
  { weight: 2, re: /\b(for|across)\s+each\s+\w+/i, hint: "for-each iterate" },
  { weight: 2, re: /\b(dozens|hundreds|thousands)\s+of\b/i, hint: "magnitude marker" },
  { weight: 2, re: /\b\d{2,}\s+(of\s+)?(files|engines|hooks|skills|dispatchers|tests|units)\b/i, hint: "numeric magnitude" },
  { weight: 1, re: /\b(check|verify|inspect|update)\s+each\b/i, hint: "each-of iterate" },
  { weight: 1, re: /\b(complete|finish|close)\s+all\s+(open|pending|remaining)\b/i, hint: "close-all-pending" },
  { weight: 1, re: /\bevery\s+(file|engine|hook|skill|dispatcher|unit)\b/i, hint: "every-of iterate" },
];

const DEFAULT_THRESHOLD = 2;

/**
 * Pure: score a prompt by summing weights of matched multi-tool patterns.
 * Exported for tests.
 */
export function scoreMultiToolPrompt(prompt) {
  if (typeof prompt !== "string" || !prompt) return 0;
  let score = 0;
  for (const p of MULTI_TOOL_PATTERNS) {
    if (p.re.test(prompt)) score += p.weight;
  }
  return score;
}

/**
 * Pure: format the planner nudge. Returns null below threshold.
 * Exported for tests.
 */
export function formatPlannerNudge(prompt, opts = {}) {
  const threshold = typeof opts.threshold === "number" ? opts.threshold : DEFAULT_THRESHOLD;
  const score = scoreMultiToolPrompt(prompt);
  if (score < threshold) return null;
  return [
    `## 🧠 Multi-tool prompt detected (Pattern score: ${score}/${threshold} threshold)`,
    "",
    "This prompt implies many sequential tool calls. Consider dispatching a single Agent with isolation instead — saves the per-tool hook-stack overhead × N:",
    "",
    "→ `Agent({ description: \"<task>\", subagent_type: \"general-purpose\", prompt: \"<...>\", isolation: \"worktree\" })`",
    "",
    "Pick `subagent_type` by task: `Explore` for read-only research, `code-archaeologist` for refactor planning, `coder` for implementation, `tester` for test sweeps. The subagent's tool calls don't pollute your main-context hook telemetry; results return as a single message.",
    "",
    "_Disable: `PRISM_MULTI_TOOL_PLANNER_DISABLE=1`._",
  ].join("\n");
}

async function readStdin() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); }
  catch { return {}; }
}

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

async function main() {
  if (process.env.PRISM_MULTI_TOOL_PLANNER_DISABLE === "1") { pass(); return; }
  const input = await readStdin();
  const prompt = String(input.prompt || input.user_prompt || "");
  const nudge = formatPlannerNudge(prompt);
  if (!nudge) { pass(); return; }

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: nudge },
  }));
}

if (process.argv[1] && process.argv[1].endsWith("userprompt-multi-tool-planner-nudge.mjs")) {
  main().catch(() => pass());
}
