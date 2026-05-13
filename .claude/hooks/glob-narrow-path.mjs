#!/usr/bin/env node
// tier: T1
/**
 * glob-narrow-path.mjs - PreToolUse Glob
 * Warns on overly broad glob patterns (recursive-star-slash-star)
 * and suggests narrower paths.
 * Token savings: 40-60%
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import os from 'os';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

if (tool_name !== 'Glob') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const RATE_FILE = join(os.tmpdir(), 'prism-hook-state', 'glob-narrow-path.last.json');
const RATE_WINDOW_MS = 90_000;
function loadRate() { try { return JSON.parse(readFileSync(RATE_FILE, 'utf8')); } catch { return {}; } }
function saveRate(s) {
  try {
    const d = dirname(RATE_FILE);
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
    writeFileSync(RATE_FILE, JSON.stringify(s));
  } catch { /* ignore */ }
}

const pattern = tool_input?.pattern || '';
const path = tool_input?.path || '.';

// Dangerous broad patterns
const broadPatterns = [
  { regex: /^\*\*\/\*$/, desc: '**/* scans entire repo' },
  { regex: /^\*\*\/\*\.\w+$/, desc: '**/*.ext scans entire repo' },
  { regex: /^\*\*$/, desc: '** without filter is too broad' },
  { regex: /^\.\/\*\*/, desc: './** scans from root' },
];

const warnings = [];

for (const { regex, desc } of broadPatterns) {
  if (regex.test(pattern)) {
    warnings.push(desc);
  }
}

// Check if path is root-level and pattern is recursive
if ((path === '.' || path === './' || !path) && pattern.includes('**')) {
  warnings.push('Recursive pattern from repo root - consider narrowing path');
}

// Suggest narrower alternatives
const suggestions = [];
if (pattern.includes('**/*.ts')) {
  suggestions.push('Narrow to: src/**/*.ts or mcp-server/src/**/*.ts');
}
if (pattern.includes('**/*.test.ts')) {
  suggestions.push('Narrow to: src/__tests__/*.test.ts');
}
if (pattern.includes('**/*.mjs')) {
  suggestions.push('Narrow to: .claude/hooks/*.mjs');
}
if (pattern.includes('**/*.json')) {
  suggestions.push('Specify directory: data/**/*.json or state/**/*.json');
}

if (warnings.length > 0 || suggestions.length > 0) {
  const rateState = loadRate();
  const key = pattern;
  const now = Date.now();
  if (now - (rateState[key] || 0) < RATE_WINDOW_MS) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
  rateState[key] = now;
  for (const k of Object.keys(rateState)) {
    if (now - rateState[k] > RATE_WINDOW_MS * 10) delete rateState[k];
  }
  saveRate(rateState);

  const message = [
    '⚠️ Broad glob pattern detected:',
    `  Pattern: ${pattern}`,
    `  Path: ${path || '(root)'}`,
    warnings.length > 0 ? `  Issues: ${warnings.join('; ')}` : null,
    suggestions.length > 0 ? `  Suggestions: ${suggestions.join('; ')}` : null,
    '  Token impact: Broad globs can return 1000s of files, wasting context.',
  ].filter(Boolean).join('\n');

  console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: message } }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
