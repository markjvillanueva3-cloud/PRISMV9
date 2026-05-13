#!/usr/bin/env node
// tier: T1
/**
 * grep-index-first.mjs - PreToolUse Grep
 * Suggests checking MASTER_INDEX before expensive grep searches.
 * Uses local Ollama for intelligent suggestions (zero Claude API tokens).
 * Falls back to regex-based suggestions when Ollama unavailable.
 *
 * Token savings: 50-80% on known patterns
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Lazy-load Ollama bridge (don't fail if missing)
let queryOllama = null;
try {
  const bridge = await import('./lib/ollama-hook-bridge.mjs');
  queryOllama = bridge.queryOllama;
} catch {
  // Ollama bridge not available — will use regex fallback
}

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

if (tool_name !== 'Grep') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Session-scoped rate limit: emit once per 60 seconds per distinct suggestion
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

// Detect expensive search patterns
const expensivePatterns = [
  { regex: /class\s+\w*Engine/, suggestion: 'Engine class search → check ENGINE_DIGEST.md first' },
  { regex: /export\s+(async\s+)?function/, suggestion: 'Function search in large codebase → narrow path first' },
  { regex: /import.*from/, suggestion: 'Import search → consider checking package.json or tsconfig paths' },
  { regex: /TODO|FIXME|HACK/, suggestion: 'TODO search → use `rtk grep TODO` for compact output' },
];

async function getRegexSuggestions() {
  const suggestions = [];
  const patternLower = pattern.toLowerCase();

  for (const { path: indexPath, covers } of indexFiles) {
    if (covers.some(keyword => patternLower.includes(keyword.toLowerCase()))) {
      const fullPath = join(process.cwd(), indexPath);
      if (existsSync(fullPath)) {
        suggestions.push(`Check ${indexPath} (pre-indexed for: ${covers.join(', ')})`);
      }
    }
  }

  for (const { regex, suggestion } of expensivePatterns) {
    if (regex.test(pattern)) {
      suggestions.push(suggestion);
    }
  }

  // Check if searching from root without path restriction
  if ((path === '.' || path === './' || !path) && !tool_input?.glob && !tool_input?.type) {
    suggestions.push('Searching from root without glob/type filter - consider narrowing');
  }

  return suggestions;
}

async function getOllamaSuggestions() {
  if (!queryOllama) return null;

  const prompt = `Search pattern: "${pattern}"
Search path: "${path}"
Available indexes: ENGINE_DIGEST.md (engines), DISPATCHER_DIGEST.md (actions), DIRECTORY_DIGEST.md (directories), PRISM_SHARED_INDEX_SURFACES.md (search indexes), PRISM-INVENTORY-LATEST.md (counts)

Which index should be checked first? Reply with just the index name and why in 1 line.`;

  try {
    const result = await queryOllama(prompt, {
      hookType: 'grep_index',
      timeoutMs: 300, // Fast timeout for hooks
      maxTokens: 50,
    });

    if (result.success && result.response) {
      return [`🤖 ${result.response}`];
    }
  } catch {
    // Ollama failed — fall through to regex
  }

  return null;
}

async function main() {
  // Try Ollama first (intelligent suggestions)
  let suggestions = await getOllamaSuggestions();

  // Fall back to regex-based suggestions
  if (!suggestions || suggestions.length === 0) {
    suggestions = await getRegexSuggestions();
  }

  if (suggestions.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Rate limit — skip emitting if the same top suggestion fired recently
  const key = suggestions[0];
  const state = loadRate();
  const last = state[key] || 0;
  const now = Date.now();
  if (now - last < RATE_WINDOW_MS) {
    console.log(JSON.stringify({ continue: true }));
    return;
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
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
