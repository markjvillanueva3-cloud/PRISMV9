#!/usr/bin/env node
// tier: T1
/**
 * rtk-auto-suggest.mjs - PreToolUse Bash
 * Suggests rtk prefix for commands that benefit from token reduction.
 * Token savings: 60-80%
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import os from 'os';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

if (tool_name !== 'Bash') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Rate-limit: at most one rtk nudge per 2 minutes per base command family.
const RATE_FILE = join(os.tmpdir(), 'prism-hook-state', 'rtk-auto-suggest.last.json');
const RATE_WINDOW_MS = 120_000;
function loadRate() { try { return JSON.parse(readFileSync(RATE_FILE, 'utf8')); } catch { return {}; } }
function saveRate(s) {
  try {
    const d = dirname(RATE_FILE);
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
    writeFileSync(RATE_FILE, JSON.stringify(s));
  } catch { /* ignore */ }
}

const command = tool_input?.command || '';

// Already using rtk
if (command.trim().startsWith('rtk ')) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Commands that benefit from RTK (high token output)
const rtkCandidates = [
  { pattern: /^git\s+(status|log|diff|show|branch)/, savings: '60-80%', cmd: 'git' },
  { pattern: /^git\s+(add|commit|push|pull|fetch)/, savings: '50-70%', cmd: 'git' },
  { pattern: /^gh\s+(pr|issue|run|api)/, savings: '70-87%', cmd: 'gh' },
  { pattern: /^npm\s+(run|test|install|list)/, savings: '70-90%', cmd: 'npm' },
  { pattern: /^npx\s+(vitest|jest|tsc|eslint)/, savings: '80-99%', cmd: 'test/build' },
  { pattern: /^pnpm\s+(list|outdated|install)/, savings: '70-90%', cmd: 'pnpm' },
  { pattern: /^cargo\s+(build|test|check|clippy)/, savings: '80-90%', cmd: 'cargo' },
  { pattern: /^docker\s+(ps|images|logs)/, savings: '85%', cmd: 'docker' },
  { pattern: /^kubectl\s+(get|logs|describe)/, savings: '85%', cmd: 'kubectl' },
  { pattern: /^cat\s+/, savings: '60%', cmd: 'cat (use Read tool instead)' },
  { pattern: /^ls\s+-la?\s+/, savings: '65%', cmd: 'ls (use Glob tool instead)' },
];

const rateState = loadRate();
const now = Date.now();

for (const { pattern, savings, cmd } of rtkCandidates) {
  if (pattern.test(command.trim())) {
    const key = cmd;
    const last = rateState[key] || 0;
    if (now - last < RATE_WINDOW_MS) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }
    rateState[key] = now;
    // Prune old entries
    for (const k of Object.keys(rateState)) {
      if (now - rateState[k] > RATE_WINDOW_MS * 10) delete rateState[k];
    }
    saveRate(rateState);

    // Special case: suggest tool replacement for cat/ls
    if (cmd.includes('Read tool') || cmd.includes('Glob tool')) {
      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: `💡 Consider using ${cmd} for better token efficiency.`,
        },
      }));
      process.exit(0);
    }

    const message = [
      `🚀 RTK can reduce this command's output by ${savings}:`,
      `  Current: ${command.substring(0, 60)}${command.length > 60 ? '...' : ''}`,
      `  Suggest: rtk ${command.substring(0, 55)}${command.length > 55 ? '...' : ''}`,
      `  RTK strips verbose output, keeps actionable info.`,
    ].join('\n');

    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: message } }));
    process.exit(0);
  }
}

console.log(JSON.stringify({ continue: true }));
