#!/usr/bin/env node
// tier: T3
/**
 * ollama-terminal-watcher.mjs — PostToolUse hook
 *
 * Captures tool call outputs and uses Ollama to:
 * 1. Summarize verbose outputs (save context)
 * 2. Detect patterns that suggest follow-up actions
 * 3. Suggest relevant skills/scripts/hooks based on output
 *
 * This makes Claude "aware" of what's happening in terminal in real-time.
 */

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const CACHE_DIR = 'H:/prism/.claude/cache';
const RATE_FILE = `${CACHE_DIR}/terminal-watcher-last.json`;
const SUGGESTIONS_FILE = `${CACHE_DIR}/terminal-suggestions.json`;
const RATE_WINDOW_MS = 15 * 1000; // 15 seconds between analyses
const MAX_OUTPUT_LENGTH = 2000; // Truncate for Ollama

// Skill/script/hook suggestions based on output patterns
const PATTERN_SUGGESTIONS = {
  // Build errors
  'TS\\d{4}': { type: 'skill', name: '/forge-types', desc: 'Fix TypeScript errors' },
  'error TS': { type: 'skill', name: '/forge-debug', desc: 'Debug build errors' },
  'Cannot find module': { type: 'hook', name: 'import-resolver', desc: 'Auto-resolve imports' },

  // Test failures
  'FAIL.*test': { type: 'skill', name: '/test-fix', desc: 'Fix failing tests' },
  'AssertionError': { type: 'skill', name: '/forge-debug', desc: 'Debug assertion' },
  'expected.*received': { type: 'skill', name: '/test-fix', desc: 'Fix test expectation' },

  // Git operations
  'CONFLICT': { type: 'skill', name: '/git-resolve', desc: 'Resolve merge conflict' },
  'diverged': { type: 'skill', name: '/git-sync', desc: 'Sync branches' },
  'nothing to commit': { type: 'script', name: 'git-status-check', desc: 'Check git state' },

  // Performance
  'heap out of memory': { type: 'hook', name: 'memory-optimizer', desc: 'Optimize memory' },
  'SIGKILL': { type: 'skill', name: '/perf-analyze', desc: 'Analyze performance' },

  // Engine patterns
  'engine.*not found': { type: 'skill', name: '/dedup', desc: 'Check existing engines' },
  'dispatcher.*action': { type: 'skill', name: '/action-search', desc: 'Find dispatcher action' },

  // Common operations
  'created.*file': { type: 'hook', name: 'file-watcher', desc: 'Track new files' },
  'modified': { type: 'skill', name: '/scrutinize', desc: 'Review changes' }
};

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return '';
    return fs.readFileSync(0, 'utf-8');
  } catch { return ''; }
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function checkRateLimit() {
  try {
    const last = JSON.parse(fs.readFileSync(RATE_FILE, 'utf8'));
    return (Date.now() - last.timestamp) < RATE_WINDOW_MS;
  } catch { return false; }
}

function recordRate() {
  ensureCacheDir();
  fs.writeFileSync(RATE_FILE, JSON.stringify({ timestamp: Date.now() }));
}

function detectPatterns(output) {
  const suggestions = [];
  for (const [pattern, suggestion] of Object.entries(PATTERN_SUGGESTIONS)) {
    if (new RegExp(pattern, 'i').test(output)) {
      suggestions.push(suggestion);
    }
  }
  return suggestions;
}

function queryOllamaSummary(output, toolName) {
  try {
    const prompt = `Summarize this ${toolName} output in 2-3 bullet points. Focus on: errors, warnings, key results. Be concise.

Output:
${output.slice(0, MAX_OUTPUT_LENGTH)}`;

    const body = JSON.stringify({
      model: 'qwen2.5-coder:7b',
      prompt,
      stream: false,
      options: { num_predict: 150 }
    });

    const result = execSync(
      `curl -s --max-time 5 -X POST http://localhost:11434/api/generate -d '${body.replace(/'/g, "'\"'\"'")}'`,
      { encoding: 'utf-8', timeout: 6000 }
    );

    return JSON.parse(result).response?.trim();
  } catch {
    return null;
  }
}

function saveSuggestions(suggestions, toolName, summary) {
  ensureCacheDir();
  let data = { suggestions: [], lastUpdate: null };
  try {
    data = JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, 'utf8'));
  } catch {}

  data.suggestions = suggestions.slice(0, 5); // Keep top 5
  data.lastTool = toolName;
  data.lastSummary = summary;
  data.lastUpdate = new Date().toISOString();

  fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(data, null, 2));
}

async function main() {
  const input = readStdinSafe();
  if (!input) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolName = payload.tool_name || payload.toolName || 'unknown';
  const output = payload.tool_output || payload.output || payload.result || '';

  // Skip short outputs or rate limited
  if (!output || output.length < 100 || checkRateLimit()) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Detect patterns first (fast, no Ollama)
  const suggestions = detectPatterns(output);

  // Only call Ollama if output is substantial
  let summary = null;
  if (output.length > 500) {
    recordRate();
    summary = queryOllamaSummary(output, toolName);
  }

  // Save suggestions for later retrieval
  if (suggestions.length > 0 || summary) {
    saveSuggestions(suggestions, toolName, summary);
  }

  // Build context injection
  const lines = [];

  if (summary) {
    lines.push(`**🔍 Terminal Watch** (${toolName}):`);
    lines.push(summary);
  }

  if (suggestions.length > 0) {
    lines.push(`**💡 Suggested Actions:**`);
    for (const s of suggestions.slice(0, 3)) {
      lines.push(`• ${s.type}: \`${s.name}\` — ${s.desc}`);
    }
  }

  if (lines.length > 0) {
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: lines.join('\n')
      }
    }));
  } else {
    console.log(JSON.stringify({ continue: true }));
  }
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
