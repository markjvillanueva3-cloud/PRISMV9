#!/usr/bin/env node
// tier: T3
/**
 * Error Learner Hook — PostToolUse Hook
 *
 * Captures errors from build/test failures:
 * - Extracts error signatures
 * - Stores in error-memory.json
 * - Alerts on similar patterns in future
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ERROR_MEMORY_PATH = 'H:/prism/mcp-server/data/state/error-memory.json';

const ERROR_PATTERNS = [
  { pattern: /error TS\d+:/i, type: 'typescript' },
  { pattern: /Cannot find module/i, type: 'import' },
  { pattern: /FAIL\s+.*\.test\./i, type: 'test' },
  { pattern: /AssertionError/i, type: 'assertion' },
  { pattern: /SyntaxError/i, type: 'syntax' },
  { pattern: /TypeError/i, type: 'type' },
  { pattern: /ReferenceError/i, type: 'reference' },
  { pattern: /ENOENT/i, type: 'file_not_found' },
  { pattern: /npm ERR!/i, type: 'npm' },
  { pattern: /Build failed/i, type: 'build' },
];

function extractErrorSignature(output) {
  for (const { pattern, type } of ERROR_PATTERNS) {
    if (pattern.test(output)) {
      const match = output.match(pattern);
      return { type, signature: match ? match[0] : type };
    }
  }
  return null;
}

function loadErrorMemory() {
  try {
    if (existsSync(ERROR_MEMORY_PATH)) {
      return JSON.parse(readFileSync(ERROR_MEMORY_PATH, 'utf8'));
    }
  } catch { /* ignore */ }
  return { errors: [], stats: { total: 0, resolved: 0 } };
}

function saveErrorMemory(memory) {
  try {
    writeFileSync(ERROR_MEMORY_PATH, JSON.stringify(memory, null, 2));
  } catch { /* ignore */ }
}

function findSimilarError(memory, signature) {
  return memory.errors.find(e =>
    e.signature === signature.signature &&
    e.type === signature.type &&
    e.resolved
  );
}

async function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolName = input.tool_name || '';
  const toolResult = String(input.tool_result || '');

  // Only check Bash results for errors
  if (toolName !== 'Bash') {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const errorSig = extractErrorSignature(toolResult);
  if (!errorSig) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const memory = loadErrorMemory();

  // Check if we've seen and fixed this before
  const similar = findSimilarError(memory, errorSig);
  if (similar) {
    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `## Error Pattern Recognized
Similar error fixed before: ${similar.fix || 'no fix recorded'}
Prevention: ${similar.prevention || 'none recorded'}` } }));
    return;
  }

  // Log new error
  memory.errors.push({
    timestamp: new Date().toISOString(),
    type: errorSig.type,
    signature: errorSig.signature,
    context: toolResult.slice(0, 500),
    resolved: false
  });

  // INTEL-OLLAMA-OBSIDIAN-MS0/P2-U02: mirror to unified ledger
  try {
    const mod = await import("../helpers/unified-ledger-mirror.mjs");
    mod.mirrorToUnifiedLedgerAsync({
      source: "learner",
      errorClass: errorSig.type,
      message: errorSig.signature,
      context: { snippet: toolResult.slice(0, 240) },
    });
  } catch { /* mirror is best-effort */ }

  // Keep last 100 errors
  if (memory.errors.length > 100) {
    memory.errors = memory.errors.slice(-100);
  }

  memory.stats.total++;
  saveErrorMemory(memory);

  console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `## Error Captured
Type: ${errorSig.type} | Use /error-learner fix to record the solution` } }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
