#!/usr/bin/env node
// tier: T3
/**
 * Success Pattern Tracker — PostToolUse Hook (Bash)
 *
 * Tracks successful builds, tests, commits.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const PATTERNS_PATH = 'H:/prism/mcp-server/data/state/success-patterns.json';

// Read stdin
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

const tool = payload.tool_name || payload.tool || '';
const toolInput = payload.tool_input || payload.input || {};
const toolOutput = payload.tool_output || payload.output || '';

if (tool !== 'Bash') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const command = (toolInput.command || '').toLowerCase();
const output = (toolOutput || '').toLowerCase();

// Detect success
let successType = null;
if (command.includes('npm run build') || command.includes('tsc')) {
  if (!output.includes('error') && !output.includes('failed')) {
    successType = 'build';
  }
} else if (command.includes('vitest') || command.includes('npm test')) {
  if (output.includes('pass') && !output.includes('fail')) {
    successType = 'test';
  }
} else if (command.includes('git commit')) {
  if (!output.includes('error') && !output.includes('abort')) {
    successType = 'commit';
  }
}

if (!successType) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Read patterns
let data = { stats: { builds: 0, tests: 0, commits: 0 } };
try {
  if (existsSync(PATTERNS_PATH)) {
    data = JSON.parse(readFileSync(PATTERNS_PATH, 'utf8'));
  }
} catch { /* use defaults */ }

// Update stats
data.stats[successType + 's'] = (data.stats[successType + 's'] || 0) + 1;
data.lastSuccess = new Date().toISOString();

// Write
try {
  const dir = dirname(PATTERNS_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(PATTERNS_PATH, JSON.stringify(data, null, 2));
} catch { /* ignore */ }

// Celebrate milestones
const total = (data.stats.builds || 0) + (data.stats.tests || 0) + (data.stats.commits || 0);
if (total % 50 === 0) {
  console.log(JSON.stringify({
    continue: true,
    additionalContext: `## Success Tracker\n🎉 ${total} successful operations! (${data.stats.builds} builds, ${data.stats.tests} tests, ${data.stats.commits} commits)`
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
