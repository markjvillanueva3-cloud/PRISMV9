#!/usr/bin/env node
// tier: T4
/**
 * precompact-pending-guard.mjs — Warn about pending work before compact
 *
 * Checks PENDING_GAP_ENGINES.json and GOAL_STACK.json for unfinished work
 * and injects a warning if compacting would lose important context.
 */

import { readFileSync, existsSync } from 'node:fs';

const PENDING_PATH = 'H:/prism/state/shared/PENDING_GAP_ENGINES.json';
const GOAL_STACK_PATH = 'H:/prism/mcp-server/data/state/GOAL_STACK.json';

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

const prompt = (payload.prompt || '').toLowerCase();
if (!prompt.includes('compact') && !prompt.includes('precompact')) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const warnings = [];

// Check pending engines
try {
  if (existsSync(PENDING_PATH)) {
    const pending = JSON.parse(readFileSync(PENDING_PATH, 'utf8'));
    const unbuilt = (pending.engines || []).filter(e => !e.built);
    if (unbuilt.length > 0) {
      warnings.push(`${unbuilt.length} pending engine(s) not yet built`);
    }
  }
} catch { /* ignore */ }

// Check active goals
try {
  if (existsSync(GOAL_STACK_PATH)) {
    const stack = JSON.parse(readFileSync(GOAL_STACK_PATH, 'utf8'));
    const active = (stack.goals || []).filter(g => g.turns > 0 && !g.status);
    if (active.length > 0) {
      warnings.push(`${active.length} active goal(s) in progress`);
    }
  }
} catch { /* ignore */ }

if (warnings.length > 0) {
  console.log(JSON.stringify({
    continue: true,
    systemMessage: `⚠️ Pre-compact check:\n${warnings.map(w => `  - ${w}`).join('\n')}\nHandoff will be auto-saved.`
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
