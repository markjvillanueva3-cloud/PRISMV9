#!/usr/bin/env node
// tier: T2
/**
 * Quality Dashboard Inject — UserPromptSubmit Hook
 *
 * Injects build/test status on quality-related queries.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const HEALTH_PATH = 'H:/prism/mcp-server/data/state/HEALTH_CHECK_REPORT.json';
const BUILD_OUTPUT = 'H:/prism/mcp-server/dist/index.js';

const TRIGGERS = ['build', 'test', 'deploy', 'commit', 'ship', 'quality', 'coverage'];

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

const prompt = (payload.prompt || payload.message || '').toLowerCase();
if (!TRIGGERS.some(t => prompt.includes(t))) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const parts = [];

// Build age
try {
  const stats = statSync(BUILD_OUTPUT);
  const ageMs = Date.now() - stats.mtimeMs;
  const ageMin = Math.floor(ageMs / 60000);
  if (ageMin > 240) {
    parts.push(`⚠️ Build stale (${Math.floor(ageMin / 60)}h old)`);
  } else {
    parts.push(`✅ Build: ${ageMin}m ago`);
  }
} catch {
  parts.push('⚠️ No build found');
}

// Health check
try {
  if (existsSync(HEALTH_PATH)) {
    const health = JSON.parse(readFileSync(HEALTH_PATH, 'utf8'));
    if (health.counts?.test_count) {
      parts.push(`🧪 ${health.counts.test_count} tests`);
    }
    if (health.omega !== undefined) {
      parts.push(`Ω=${health.omega}`);
    }
  }
} catch { /* ignore */ }

// Git status
try {
  const result = spawnSync('git', ['status', '--porcelain'], { windowsHide: true,
    cwd: 'H:/prism/mcp-server',
    encoding: 'utf8',
    timeout: 2000
  });
  const lines = (result.stdout || '').trim().split('\n').filter(Boolean);
  if (lines.length > 0) {
    parts.push(`📝 ${lines.length} uncommitted`);
  }
} catch { /* ignore */ }

if (parts.length > 0) {
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `## Quality Dashboard\n${parts.join(' | ')}`
    }
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
