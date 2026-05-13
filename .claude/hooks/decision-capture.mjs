#!/usr/bin/env node
// tier: T3
/**
 * Decision Capture — PostToolUse Hook
 *
 * Prompts for decision rationale on significant choices:
 * - New file creation (architecture decisions)
 * - Major edits (approach decisions)
 * - Dependency changes (tool decisions)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DECISION_LOG_PATH = 'H:/prism/mcp-server/data/state/decision-log.json';

const DECISION_TRIGGERS = [
  { pattern: /Engine\.ts$/, type: 'arch', desc: 'new engine' },
  { pattern: /Dispatcher\.ts$/, type: 'arch', desc: 'new dispatcher' },
  { pattern: /package\.json$/, type: 'tool', desc: 'dependency change' },
  { pattern: /\.claude.*\.mjs$/, type: 'approach', desc: 'new hook' },
  { pattern: /schema.*\.ts$/, type: 'arch', desc: 'schema change' },
];

function loadDecisionLog() {
  try {
    if (existsSync(DECISION_LOG_PATH)) {
      return JSON.parse(readFileSync(DECISION_LOG_PATH, 'utf8'));
    }
  } catch { /* ignore */ }
  return { decisions: [] };
}

function saveDecisionLog(log) {
  try {
    writeFileSync(DECISION_LOG_PATH, JSON.stringify(log, null, 2));
  } catch { /* ignore */ }
}

async function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  // Only check Write operations (new file creation)
  if (toolName !== 'Write') {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = toolInput.file_path || '';

  // Check if this is a decision-worthy creation
  let trigger = null;
  for (const t of DECISION_TRIGGERS) {
    if (t.pattern.test(filePath)) {
      trigger = t;
      break;
    }
  }

  if (!trigger) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Log the decision
  const log = loadDecisionLog();
  log.decisions.push({
    timestamp: new Date().toISOString(),
    type: trigger.type,
    description: trigger.desc,
    file: filePath,
    rationale: 'auto-captured — use /decision-log add to add rationale'
  });

  // Keep last 100
  if (log.decisions.length > 100) {
    log.decisions = log.decisions.slice(-100);
  }

  saveDecisionLog(log);

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `## Decision Logged\n${trigger.desc}: ${filePath.split('/').pop()}\nUse /decision-log add to record WHY this choice was made`,
    },
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
