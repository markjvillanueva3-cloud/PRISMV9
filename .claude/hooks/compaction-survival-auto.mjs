#!/usr/bin/env node
// tier: T3
/**
 * compaction-survival-auto.mjs — PostToolUse hook
 *
 * Automatically records important context to CompactionSurvivalEngine
 * so critical info survives compaction.
 */

import * as fs from 'fs';

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const STATE_DIR = 'H:/prism/state/compaction-survival';

function getSessionId() {
  return process.env.CLAUDE_SESSION_ID || process.env.TERM_SESSION_ID || 'default';
}

function getStateFile() {
  return `${STATE_DIR}/survival-${getSessionId()}.json`;
}

function loadState() {
  try {
    const stateFile = getStateFile();
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch {}
  return { items: [], sessionId: getSessionId(), compactionCount: 0 };
}

function saveState(state) {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(getStateFile(), JSON.stringify(state, null, 2));
}

function generateId() {
  return `ctx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function detectContextType(tool, input) {
  if (tool === 'Edit' || tool === 'Write') return 'file_edit';
  if (tool === 'TaskUpdate' || tool === 'TaskCreate') return 'task_state';
  if (tool === 'Bash' && input?.command?.includes('git commit')) return 'decision';
  return 'discovery';
}

function extractContent(tool, input, result) {
  if (tool === 'Edit' || tool === 'Write') {
    const file = input?.file_path || 'unknown';
    return `Modified: ${file.split('/').pop()}`;
  }
  if (tool === 'TaskUpdate') {
    return `Task ${input?.taskId}: ${input?.status || 'updated'}`;
  }
  if (tool === 'TaskCreate') {
    return `Created task: ${input?.subject || 'untitled'}`;
  }
  return `${tool} operation completed`;
}

async function main() {
  let input;
  try {
    const raw = readStdinSafe();
    if (!raw) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }
    input = JSON.parse(raw);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const { tool, input: toolInput, tool_result } = input;

  // Only track significant operations
  const trackTools = ['Edit', 'Write', 'TaskUpdate', 'TaskCreate'];
  if (!trackTools.includes(tool)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const state = loadState();
  const contextType = detectContextType(tool, toolInput);
  const content = extractContent(tool, toolInput, tool_result);
  const priority = contextType === 'task_state' ? 10 : contextType === 'file_edit' ? 7 : 4;

  const item = {
    id: generateId(),
    type: contextType,
    content,
    timestamp: new Date().toISOString(),
    priority,
    tokens: Math.ceil(content.length / 4),
    survivalScore: priority,
    references: toolInput?.file_path ? [toolInput.file_path] : [],
  };

  state.items.push(item);

  // Prune if over 100 items
  if (state.items.length > 100) {
    state.items = state.items
      .sort((a, b) => b.survivalScore - a.survivalScore)
      .slice(0, 100);
  }

  saveState(state);
  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
