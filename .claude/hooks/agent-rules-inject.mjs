#!/usr/bin/env node
// tier: T1
/**
 * agent-rules-inject.mjs — PreToolUse hook for the Task tool
 *
 * When the main thread spawns a subagent via Task, prepend the canonical
 * PRISM agent operating rules (Karpathy discipline, safety gate tiers,
 * authoritative references) to the subagent's prompt so the subagent
 * inherits the same rigor as the main chat.
 *
 * The subagent starts with a blank context — it does NOT automatically
 * see CLAUDE.md unless we inject it. Without this, subagents drift.
 *
 * Contract: emit JSON `{continue: true, hookSpecificOutput: {additionalContext: ...}}`
 * for PreToolUse. On any failure: emit `{continue: true}` and exit 0 so
 * the Task spawn proceeds unblocked.
 */

import fs from "node:fs";

const AGENT_RULES_FILE = "H:/prism/.claude/agents/AGENT_RULES.md";
const MAX_CHARS = 3500; // cap inject size so we don't double a large prompt

function readStdin() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

function main() {
  let input = {};
  try {
    const raw = readStdin();
    if (raw && raw.trim().startsWith("{")) input = JSON.parse(raw);
  } catch { /* ignore */ }

  // Only fire for Task tool (subagent spawns)
  const toolName = input.tool_name || input.toolName || "";
  if (toolName !== "Task") {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let rules = "";
  try { rules = fs.readFileSync(AGENT_RULES_FILE, "utf-8"); } catch { /* fall through */ }
  if (!rules) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  if (rules.length > MAX_CHARS) rules = rules.slice(0, MAX_CHARS) + "\n[… truncated — full rules at " + AGENT_RULES_FILE + "]";

  const header =
    "## ★ PRISM Agent Operating Rules (inherited from main thread)\n" +
    "You are a spawned subagent. Apply these rules before the user's task.\n\n";

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: header + rules,
    },
  }));
}

try { main(); } catch { console.log(JSON.stringify({ continue: true })); }
