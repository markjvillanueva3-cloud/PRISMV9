#!/usr/bin/env node
// tier: T3
/**
 * error-recovery-memory.mjs - PostToolUse (all tools)
 * Remembers error→fix pairs across sessions.
 * When same error occurs, suggests the fix that worked before.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

const MEMORY_DIR = join(process.env.HOME || process.env.USERPROFILE, '.claude', 'learning');
const MEMORY_FILE = join(MEMORY_DIR, 'error-recovery.json');
const MAX_ENTRIES = 200;
const SIMILARITY_THRESHOLD = 0.7;

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input, tool_result } = input;

if (!tool_name || !tool_result) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Ensure learning directory exists
if (!existsSync(MEMORY_DIR)) {
  mkdirSync(MEMORY_DIR, { recursive: true });
}

// Load memory
let memory = { errors: {}, fixes: [], stats: { total: 0, reused: 0 } };
try {
  if (existsSync(MEMORY_FILE)) {
    memory = JSON.parse(readFileSync(MEMORY_FILE, 'utf8'));
  }
} catch {
  memory = { errors: {}, fixes: [], stats: { total: 0, reused: 0 } };
}

const resultText = typeof tool_result === 'string' ? tool_result : JSON.stringify(tool_result);

// Detect if this is an error
const errorPatterns = [
  /error:/i,
  /failed:/i,
  /cannot find/i,
  /not found/i,
  /permission denied/i,
  /ENOENT/,
  /EACCES/,
  /TypeError/,
  /SyntaxError/,
  /ReferenceError/,
  /tsc.*error TS\d+/,
  /npm ERR!/,
  /fatal:/,
  /exception/i,
];

const isError = errorPatterns.some(p => p.test(resultText));

if (!isError) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Extract error signature
const errorSignature = extractErrorSignature(resultText);
const errorHash = createHash('md5').update(errorSignature).digest('hex').substring(0, 12);

// Check if we've seen this error before
const previousFix = memory.errors[errorHash];
if (previousFix) {
  memory.stats.reused++;

  const message = [
    `💡 Similar error seen before (${previousFix.count}x):`,
    `  Error: ${errorSignature.substring(0, 80)}${errorSignature.length > 80 ? '...' : ''}`,
    `  Previous fix: ${previousFix.fix}`,
    previousFix.context ? `  Context: ${previousFix.context}` : null,
    `  Success rate: ${Math.round(previousFix.successRate * 100)}%`,
  ].filter(Boolean).join('\n');

  // Update seen count
  previousFix.count++;
  previousFix.lastSeen = Date.now();
  writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));

  console.log(JSON.stringify({ message }));
  process.exit(0);
}

// Record this as a new error (fix will be added when resolved)
memory.errors[errorHash] = {
  signature: errorSignature.substring(0, 200),
  tool: tool_name,
  count: 1,
  firstSeen: Date.now(),
  lastSeen: Date.now(),
  fix: 'Pending resolution...',
  successRate: 0,
  context: tool_input?.file_path || tool_input?.command?.substring(0, 50) || ''
};

// INTEL-OLLAMA-OBSIDIAN-MS0/P2-U02: mirror to unified ledger (best-effort)
import("../helpers/unified-ledger-mirror.mjs").then((mod) => {
  mod.mirrorToUnifiedLedgerAsync({
    source: "recovery",
    tool: tool_name,
    message: errorSignature.substring(0, 200),
    context: {
      hash: errorHash,
      file: tool_input?.file_path,
      command_prefix: tool_input?.command?.substring(0, 50),
    },
  });
}).catch(() => { /* mirror is best-effort */ });

memory.stats.total++;

// Limit memory size
const hashes = Object.keys(memory.errors);
if (hashes.length > MAX_ENTRIES) {
  // Remove oldest entries
  const sorted = hashes.sort((a, b) =>
    memory.errors[a].lastSeen - memory.errors[b].lastSeen
  );
  for (let i = 0; i < hashes.length - MAX_ENTRIES; i++) {
    delete memory.errors[sorted[i]];
  }
}

writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
console.log(JSON.stringify({ continue: true }));

function extractErrorSignature(text) {
  // Extract the core error message, normalizing variable parts
  const lines = text.split('\n');
  for (const line of lines) {
    // Find the line with the actual error
    if (/error|Error|ERROR|failed|Failed|FAILED/.test(line)) {
      // Normalize paths and line numbers
      return line
        .replace(/\/[^\s:]+/g, '<path>')
        .replace(/line \d+/gi, 'line <N>')
        .replace(/:\d+:\d+/g, ':<L>:<C>')
        .replace(/'[^']+'/g, "'<value>'")
        .replace(/"[^"]+"/g, '"<value>"')
        .trim()
        .substring(0, 200);
    }
  }
  return text.substring(0, 100);
}
