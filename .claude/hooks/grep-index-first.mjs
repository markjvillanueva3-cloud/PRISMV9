#!/usr/bin/env node
// DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass.
// Remove the next 2 lines to re-enable. See .claude/helpers/apply-hook-fixes.mjs
process.stdout.write(JSON.stringify({ continue: true })); process.exit(0);
/**
 * grep-index-first.mjs - PreToolUse Grep
 * Suggests checking MASTER_INDEX before expensive grep searches.
 * Token savings: 50-80% on known patterns
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import os from 'os';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

if (tool_name !== 'Grep') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Session-scoped rate limit: emit once per 60 seconds per distinct suggestion
// so the advisory doesn't flood the chat on a research-heavy session.
const RATE_DIR = join(os.tmpdir(), 'prism-hook-state');
const RATE_FILE = join(RATE_DIR, 'grep-index-first.last.json');
const RATE_WINDOW_MS = 60_000;

function loadRate() {
  try { return JSON.parse(readFileSync(RATE_FILE, 'utf8')); } catch { return {}; }
}
function saveRate(state) {
  try {
    if (!existsSync(RATE_DIR)) mkdirSync(RATE_DIR, { recursive: true });
    writeFileSync(RATE_FILE, JSON.stringify(state));
  } catch { /* ignore */ }
}

const pattern = tool_input?.pattern || '';
const path = tool_input?.path || '.';

// Index files that might already have the answer
const indexFiles = [
  { path: 'mcp-server/data/docs/ENGINE_DIGEST.md', covers: ['Engine', 'engine', 'calculate', 'compute'] },
  { path: 'mcp-server/data/docs/DISPATCHER_DIGEST.md', covers: ['dispatcher', 'action', 'prism_'] },
  { path: 'mcp-server/data/docs/DIRECTORY_DIGEST.md', covers: ['directory', 'folder', 'path', 'location'] },
  { path: 'state/shared/PRISM_SHARED_INDEX_SURFACES.md', covers: ['index', 'search', 'find'] },
  { path: 'PRISM-INVENTORY-LATEST.md', covers: ['count', 'total', 'how many', 'inventory'] },
  { path: 'mcp-server/data/state/cross-session-asset-registry.json', covers: ['asset', 'created', 'exists'] },
];

// Check if pattern matches indexed content
const patternLower = pattern.toLowerCase();
const suggestions = [];

for (const { path: indexPath, covers } of indexFiles) {
  if (covers.some(keyword => patternLower.includes(keyword.toLowerCase()))) {
    const fullPath = join(process.cwd(), indexPath);
    if (existsSync(fullPath)) {
      suggestions.push(`Check ${indexPath} (pre-indexed for: ${covers.join(', ')})`);
    }
  }
}

// Detect expensive search patterns
const expensivePatterns = [
  { regex: /class\s+\w*Engine/, suggestion: 'Engine class search → check ENGINE_DIGEST.md first' },
  { regex: /export\s+(async\s+)?function/, suggestion: 'Function search in large codebase → narrow path first' },
  { regex: /import.*from/, suggestion: 'Import search → consider checking package.json or tsconfig paths' },
  { regex: /TODO|FIXME|HACK/, suggestion: 'TODO search → use `rtk grep TODO` for compact output' },
];

for (const { regex, suggestion } of expensivePatterns) {
  if (regex.test(pattern)) {
    suggestions.push(suggestion);
  }
}

// Check if searching from root without path restriction
if ((path === '.' || path === './' || !path) && !tool_input?.glob && !tool_input?.type) {
  suggestions.push('Searching from root without glob/type filter - consider narrowing');
}

if (suggestions.length > 0) {
  // Rate limit — skip emitting if the same top suggestion fired recently
  const key = suggestions[0];
  const state = loadRate();
  const last = state[key] || 0;
  const now = Date.now();
  if (now - last < RATE_WINDOW_MS) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
  state[key] = now;
  // Prune old entries
  for (const k of Object.keys(state)) {
    if (now - state[k] > RATE_WINDOW_MS * 10) delete state[k];
  }
  saveRate(state);

  const message = [
    `📋 Index-first suggestions:`,
    ...suggestions.map(s => `  • ${s}`),
    `  Checking indexes first can save 50-80% tokens vs full grep.`,
  ].join('\n');

  console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: message } }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
