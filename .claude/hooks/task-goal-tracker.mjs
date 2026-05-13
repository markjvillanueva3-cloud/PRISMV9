#!/usr/bin/env node
// tier: T2
// DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass.
// Remove the next 2 lines to re-enable. See .claude/helpers/apply-hook-fixes.mjs
process.stdout.write(JSON.stringify({ continue: true })); process.exit(0);
/**
 * Task Goal Tracker — UserPromptSubmit Hook
 *
 * Tracks the user's current goal/task across turns. Maintains a goal stack
 * so we always know what we're working toward.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const GOAL_STATE_PATH = 'H:/prism/mcp-server/data/state/GOAL_STACK.json';

const GOAL_INDICATORS = [
  /i (?:want|need) to (.+)/i,
  /(?:help me|can you) (.+)/i,
  /let'?s (.+)/i,
  /we (?:need|should|must) (.+)/i,
  /(?:build|create|make|implement|fix|add|remove|update|optimize|refactor) (.+)/i,
];

// Read stdin synchronously
let input = '';
try {
  input = readFileSync(0, 'utf-8');
} catch {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(input);
} catch {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const prompt = payload.prompt || payload.message || '';
if (!prompt || prompt.length < 5) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Read goal stack
let stack = { goals: [], completedToday: 0 };
try {
  if (existsSync(GOAL_STATE_PATH)) {
    stack = JSON.parse(readFileSync(GOAL_STATE_PATH, 'utf8'));
  }
} catch { /* use defaults */ }

// Extract goal from prompt
function extractGoal(text) {
  for (const pattern of GOAL_INDICATORS) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().slice(0, 80);
  }
  return null;
}

const newGoal = extractGoal(prompt);
const contextParts = [];

// Add new goal if detected and different from current
if (newGoal && (!stack.goals[0] || stack.goals[0].goal !== newGoal)) {
  stack.goals.unshift({ goal: newGoal, turns: 0, startedAt: new Date().toISOString() });
  contextParts.push(`🎯 Goal: "${newGoal}"`);
}

// Increment turn count
if (stack.goals[0]) {
  stack.goals[0].turns = (stack.goals[0].turns || 0) + 1;
}

// Keep only top 5 goals
stack.goals = stack.goals.slice(0, 5);
stack.lastUpdated = new Date().toISOString();

// Write goal stack
try {
  const dir = dirname(GOAL_STATE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(GOAL_STATE_PATH, JSON.stringify(stack, null, 2));
} catch { /* ignore */ }

// Inject context about current goal on subsequent turns
if (contextParts.length === 0 && stack.goals[0] && stack.goals[0].turns > 2) {
  contextParts.push(`🎯 Working on: "${stack.goals[0].goal}" (turn ${stack.goals[0].turns})`);
}

if (contextParts.length > 0) {
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `## Goal Tracker\n${contextParts.join('\n')}`
    }
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
