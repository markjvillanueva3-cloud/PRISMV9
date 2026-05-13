#!/usr/bin/env node
// tier: T3
/**
 * Session State Auto — PostToolUse Hook
 *
 * Automatically captures session insights:
 * - Tracks message count
 * - Captures key findings every 10 tool uses
 * - Logs significant file changes
 * - Persists to session-state.json
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const STATE_PATH = 'H:/prism/mcp-server/data/state/session-state.json';
const SAVE_INTERVAL = 10; // Save every N tool uses

function loadState() {
  try {
    if (existsSync(STATE_PATH)) {
      return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
    }
  } catch { /* ignore */ }
  return {
    sessionStart: new Date().toISOString(),
    toolUseCount: 0,
    filesModified: [],
    keyFindings: [],
    lastSaved: null
  };
}

function saveState(state) {
  try {
    state.lastSaved = new Date().toISOString();
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
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
  const toolResult = input.tool_result || '';

  const state = loadState();
  state.toolUseCount++;

  // Track file modifications
  if (toolName === 'Write' || toolName === 'Edit') {
    const filePath = toolInput.file_path || '';
    if (filePath && !state.filesModified.includes(filePath)) {
      state.filesModified.push(filePath);
      // Keep last 50
      if (state.filesModified.length > 50) {
        state.filesModified = state.filesModified.slice(-50);
      }
    }
  }

  // Auto-save periodically
  if (state.toolUseCount % SAVE_INTERVAL === 0) {
    saveState(state);
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
