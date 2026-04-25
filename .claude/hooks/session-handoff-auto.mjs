#!/usr/bin/env node
/**
 * session-handoff-auto.mjs — Stop hook to auto-write per-chat handoff
 *
 * Each chat gets its own handoff file based on stable session ID.
 * Writes to state/shared/handoffs/HANDOFF-<session-id>.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname } from 'node:path';

const HANDOFFS_DIR = 'H:/prism/state/shared/handoffs';
const POSITION_FILE = 'H:/prism/state/CURRENT_POSITION.md';
const GOAL_STACK_PATH = 'H:/prism/mcp-server/data/state/GOAL_STACK.json';

// Get stable session ID
function getSessionId() {
  try {
    const result = execSync(
      '"H:/.claude/bin/portable-node" H:/prism/.claude/helpers/stable-session-id.mjs',
      { encoding: 'utf8', timeout: 3000 }
    ).trim();
    return result || `session-${Date.now()}`;
  } catch {
    return `session-${Date.now()}`;
  }
}

// Get current position
function getPosition() {
  try {
    if (existsSync(POSITION_FILE)) {
      const content = readFileSync(POSITION_FILE, 'utf8');
      const match = content.match(/## Current[:\s]+(.+)/i);
      return match?.[1]?.trim() || 'unknown';
    }
  } catch { /* ignore */ }
  return 'unknown';
}

// Get current goal
function getCurrentGoal() {
  try {
    if (existsSync(GOAL_STACK_PATH)) {
      const stack = JSON.parse(readFileSync(GOAL_STACK_PATH, 'utf8'));
      return stack.goals?.[0]?.goal || null;
    }
  } catch { /* ignore */ }
  return null;
}

// Get recent commits
function getRecentCommits() {
  try {
    const result = execSync(
      'git log --oneline -3 --since="6 hours ago"',
      { encoding: 'utf8', timeout: 3000, cwd: 'H:/prism' }
    ).trim();
    return result || null;
  } catch { /* ignore */ }
  return null;
}

const sessionId = getSessionId();
const position = getPosition();
const goal = getCurrentGoal();
const commits = getRecentCommits();

const handoffPath = `${HANDOFFS_DIR}/HANDOFF-${sessionId}.md`;

// Build handoff content
const lines = [
  `# Session Handoff: ${sessionId}`,
  `Generated: ${new Date().toISOString()}`,
  '',
  `## Position`,
  position,
  ''
];

if (goal) {
  lines.push(`## Last Goal`, goal, '');
}

if (commits) {
  lines.push(`## Recent Commits`, '```', commits, '```', '');
}

lines.push(`## Resume`, 'Continue from current position. Check git log and roadmap for next steps.');

try {
  if (!existsSync(HANDOFFS_DIR)) {
    mkdirSync(HANDOFFS_DIR, { recursive: true });
  }
  writeFileSync(handoffPath, lines.join('\n'));
  console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "Stop", additionalContext: `✓ Handoff saved: ${sessionId}` } }));
} catch (err) {
  console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "Stop", additionalContext: `⚠️ Handoff write failed: ${err.message}` } }));
}
