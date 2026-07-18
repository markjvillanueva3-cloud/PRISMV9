#!/usr/bin/env node
// tier: T1
/**
 * Working Set Awareness — PreToolUse Hook (Write/Edit)
 *
 * Tracks files being modified. Warns about missing tests.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { hostname } from 'node:os';

const WORKING_SET_DIR = 'H:/prism/.claude/cache/working-set';
const MCP_SERVER = 'H:/prism/mcp-server';

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
const filePath = toolInput.file_path || '';

if (!['Write', 'Edit', 'MultiEdit'].includes(tool) || !filePath) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Working set file
const pid = process.ppid || process.pid;
const wsFile = join(WORKING_SET_DIR, `ws-${hostname()}-${pid}.json`);

// Read working set
let ws = { files: {} };
try {
  if (existsSync(wsFile)) {
    ws = JSON.parse(readFileSync(wsFile, 'utf8'));
  }
} catch { /* use defaults */ }

// Categorize file
const p = filePath.toLowerCase();
let category = 'other';
if (p.includes('/engines/')) category = 'engine';
else if (p.includes('/__tests__/')) category = 'test';
else if (p.includes('/hooks/')) category = 'hook';

// Track file
ws.files[filePath] = {
  category,
  editCount: (ws.files[filePath]?.editCount || 0) + 1,
  lastEdit: new Date().toISOString()
};

// Write
try {
  if (!existsSync(WORKING_SET_DIR)) mkdirSync(WORKING_SET_DIR, { recursive: true });
  writeFileSync(wsFile, JSON.stringify(ws, null, 2));
} catch { /* ignore */ }

const contextParts = [];

// Check for test file if editing engine
if (category === 'engine') {
  const testFile = `${MCP_SERVER}/src/__tests__/${basename(filePath, '.ts')}.test.ts`;
  if (!existsSync(testFile)) {
    contextParts.push(`⚠️ No test for ${basename(filePath)} — consider creating one`);
  }
}

// Working set size warning
const fileCount = Object.keys(ws.files).length;
if (fileCount > 8) {
  contextParts.push(`📁 ${fileCount} files modified — consider committing`);
}

if (contextParts.length > 0) {
  console.log(JSON.stringify({
    continue: true,
    additionalContext: `## Working Set\n${contextParts.join('\n')}`
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
