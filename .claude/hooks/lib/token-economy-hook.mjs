#!/usr/bin/env node
/**
 * token-economy-hook.mjs — PostToolUse (all tools)
 * Tracks token spending per tool call category via TokenEconomyEngine patterns.
 * Detects waste patterns (duplicate reads, broad searches, verbose output).
 * Logs to session state file for /token-economy skill to read.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const STATE_PATH = 'H:/prism/state/token-economy-session.json';
// Windows-safe stdin (ESM resolves /dev/stdin relative to import URL on Windows)
let rawInput;
try { rawInput = readFileSync('/dev/stdin', 'utf-8'); }
catch { rawInput = readFileSync(0, 'utf-8'); }
const input = JSON.parse(rawInput);

// Extract tool info from PostToolUse hook input
const toolName = input.tool_name || '';
const toolInput = input.tool_input || {};
const toolOutput = input.tool_output || '';

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
try { state = JSON.parse(readFileSync(STATE_PATH, 'utf-8')); } catch {}

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

// Build response — only surface waste alerts as hints
const output = { continue: true };
const recentAlerts = state.waste_alerts.filter(
  a => Date.now() - new Date(a.timestamp).getTime() < 60000
);
if (recentAlerts.length > 0) {
  output.message = `Token economy: ${recentAlerts.map(a => a.message).join('; ')}`;
}

console.log(JSON.stringify(output));
