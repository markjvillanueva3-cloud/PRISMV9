#!/usr/bin/env node
// tier: T1
/**
 * read-auto-limit.mjs - PreToolUse Read
 * Auto-suggests limit parameter for large files to save tokens.
 * Token savings: 70-90%
 */

import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

if (tool_name !== 'Read') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const filePath = tool_input?.file_path;
const limit = tool_input?.limit;
const offset = tool_input?.offset;

if (!filePath) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// If limit is already set, allow
if (limit !== undefined) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Check file size
let fileSize = 0;
let lineEstimate = 0;
try {
  const resolved = resolve(filePath);
  const stats = statSync(resolved);
  fileSize = stats.size;
  // Estimate lines: ~50 bytes per line average for code
  lineEstimate = Math.ceil(fileSize / 50);
} catch {
  // File doesn't exist or can't stat - allow Read to handle error
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Thresholds
const LARGE_FILE_BYTES = 50000;  // 50KB
const LARGE_FILE_LINES = 1000;

if (fileSize > LARGE_FILE_BYTES || lineEstimate > LARGE_FILE_LINES) {
  const sizeKB = (fileSize / 1024).toFixed(1);
  const suggestions = [];

  // Suggest based on file type
  if (filePath.endsWith('.json')) {
    suggestions.push('For JSON: read first 100 lines to see structure');
  } else if (filePath.endsWith('.log') || filePath.endsWith('.jsonl')) {
    suggestions.push('For logs: use offset to read recent entries');
  } else if (filePath.includes('test')) {
    suggestions.push('For tests: read specific test (offset + limit)');
  } else {
    suggestions.push('Consider: limit: 200 for overview, or offset + limit for specific section');
  }

  const message = [
    `📄 Large file detected: ${sizeKB}KB (~${lineEstimate} lines)`,
    `  File: ${filePath}`,
    `  ${suggestions.join('\n  ')}`,
    '  Token impact: Reading full file uses ~' + Math.ceil(fileSize / 4) + ' tokens.',
    '  Tip: Add limit parameter to read only what you need.',
  ].join('\n');

  console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: message } }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
