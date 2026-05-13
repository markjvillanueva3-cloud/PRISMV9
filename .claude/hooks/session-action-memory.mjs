#!/usr/bin/env node
// tier: T3
/**
 * Session Action Memory — PostToolUse Hook
 *
 * Tracks actions taken in this session. Detects loops.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { hostname } from 'node:os';

const SESSION_MEMORY_DIR = 'H:/prism/.claude/cache/session-memory';
const MAX_ACTIONS = 30;

// Read stdin synchronously
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

if (!tool) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Session file
const pid = process.ppid || process.pid;
const sessionFile = join(SESSION_MEMORY_DIR, `session-${hostname()}-${pid}.json`);

// Read session memory
let memory = { actions: [], startedAt: new Date().toISOString() };
try {
  if (existsSync(sessionFile)) {
    memory = JSON.parse(readFileSync(sessionFile, 'utf8'));
  }
} catch { /* use defaults */ }

// Summarize action
function summarize(t, inp) {
  switch (t) {
    case 'Write': return `Wrote ${basename(inp.file_path || 'file')}`;
    case 'Edit': return `Edited ${basename(inp.file_path || 'file')}`;
    case 'Read': return `Read ${basename(inp.file_path || 'file')}`;
    case 'Bash': return `Ran: ${(inp.command || '').slice(0, 40)}`;
    case 'Grep': return `Searched: ${inp.pattern}`;
    default: return t;
  }
}

const summary = summarize(tool, toolInput);
memory.actions.push({ tool, summary, ts: new Date().toISOString() });

// Keep only last N actions
if (memory.actions.length > MAX_ACTIONS) {
  memory.actions = memory.actions.slice(-MAX_ACTIONS);
}

// Detect loops
const recent = memory.actions.slice(-8).map(a => a.summary);
const counts = {};
for (const s of recent) counts[s] = (counts[s] || 0) + 1;
const loops = Object.entries(counts).filter(([_, c]) => c >= 3);

// Write memory
try {
  if (!existsSync(SESSION_MEMORY_DIR)) mkdirSync(SESSION_MEMORY_DIR, { recursive: true });
  writeFileSync(sessionFile, JSON.stringify(memory, null, 2));
} catch { /* ignore */ }

if (loops.length > 0) {
  console.log(JSON.stringify({
    continue: true,
    additionalContext: `## Session Memory\n⚠️ Loop detected: "${loops[0][0]}" repeated ${loops[0][1]}x`
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
