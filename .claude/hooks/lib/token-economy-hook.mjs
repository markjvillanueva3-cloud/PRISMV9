#!/usr/bin/env node
// tier: T3
/**
 * token-economy-hook.mjs — PostToolUse (all tools)
 * Tracks token spending per tool call category via TokenEconomyEngine patterns.
 * Detects waste patterns (duplicate reads, broad searches, verbose output).
 * Logs to session state file for /token-economy skill to read.
 */
import * as fs from 'fs';
const { writeFileSync, existsSync, mkdirSync } = fs;
import { dirname } from 'path';

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

const STATE_PATH = 'H:/prism/state/token-economy-session.json';
const _raw = readStdinSafe();
if (!_raw) { console.log(JSON.stringify({ continue: true })); process.exit(0); }
const input = JSON.parse(_raw);

// Extract tool info from PostToolUse hook input
const toolName = input.tool_name || '';
const toolInput = input.tool_input || {};
const toolOutput = input.tool_output || input.output || '';

// Tool category classification (matches TokenEconomyEngine BUDGET_PROFILES)
const TOOL_CATEGORIES = {
  Read: 'read', Write: 'write', Edit: 'write',
  Bash: 'bash', Grep: 'search', Glob: 'search',
  Agent: 'agent', WebSearch: 'search', WebFetch: 'search',
  TaskCreate: 'meta', TaskUpdate: 'meta', TaskList: 'meta',
};
const category = TOOL_CATEGORIES[toolName] || 'other';

// Estimate token cost from output length
const outputLen = typeof toolOutput === 'string' ? toolOutput.length : JSON.stringify(toolOutput).length;
const estimatedTokens = Math.ceil(outputLen / 4);

// Load session state
let state = { calls: [], categories: {}, waste_alerts: [], session_start: new Date().toISOString(), total_tokens: 0 };
try { state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')); } catch {}

// Record this call
const call = {
  tool: toolName,
  category,
  tokens: estimatedTokens,
  timestamp: new Date().toISOString(),
  file: toolInput.file_path || toolInput.command?.substring(0, 80) || toolInput.pattern || '',
};
state.calls.push(call);
state.total_tokens += estimatedTokens;

// Update category totals
if (!state.categories[category]) state.categories[category] = { count: 0, tokens: 0 };
state.categories[category].count++;
state.categories[category].tokens += estimatedTokens;

// Waste detection — check last 10 calls for patterns
const recent = state.calls.slice(-10);

// Pattern 1: Duplicate reads — same file read twice within last 5 calls
if (toolName === 'Read' && toolInput.file_path) {
  const dupes = recent.filter(c => c.tool === 'Read' && c.file === toolInput.file_path);
  if (dupes.length > 1) {
    state.waste_alerts.push({
      pattern: 'duplicate_read',
      file: toolInput.file_path,
      timestamp: new Date().toISOString(),
      message: `File read ${dupes.length}x in last 10 calls: ${toolInput.file_path.split('/').pop()}`,
    });
  }
}

// Pattern 2: Broad search — Grep/Glob with no path constraint
if ((toolName === 'Grep' || toolName === 'Glob') && !toolInput.path) {
  state.waste_alerts.push({
    pattern: 'broad_search',
    timestamp: new Date().toISOString(),
    message: `${toolName} without path constraint — scans entire repo`,
  });
}

// Pattern 3: Agent over-spawn — more than 3 Agent calls in last 10
const agentCount = recent.filter(c => c.tool === 'Agent').length;
if (agentCount > 3) {
  state.waste_alerts.push({
    pattern: 'agent_over_spawn',
    timestamp: new Date().toISOString(),
    message: `${agentCount} Agent calls in last 10 tool uses — consider direct tools`,
  });
}

// Keep only last 50 calls and 20 alerts to avoid bloat
state.calls = state.calls.slice(-50);
state.waste_alerts = state.waste_alerts.slice(-20);

// Write state
const dir = dirname(STATE_PATH);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

// PostToolUse must use hookSpecificOutput.additionalContext for the harness
// to accept the message; bare `message` is rejected with "unknown top-level key"
// and the alert is silently dropped.
const recentAlerts = state.waste_alerts.filter(
  a => Date.now() - new Date(a.timestamp).getTime() < 60000
);
const output = { continue: true };
if (recentAlerts.length > 0) {
  output.hookSpecificOutput = {
    hookEventName: "PostToolUse",
    additionalContext: `Token economy: ${recentAlerts.map(a => a.message).join('; ')}`,
  };
}

console.log(JSON.stringify(output));
