#!/usr/bin/env node
// tier: T1
/**
 * navigate-first-hook.mjs — PreToolUse Glob
 * Detects broad Glob file searches and suggests checking indexed digests first.
 * ENGINE_DIGEST, DISPATCHER_DIGEST, and KEYWORD_ROUTES resolve locations
 * in ~0 tokens vs 500+ for a filesystem scan.
 */
import * as fs from 'fs';

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

const _raw = readStdinSafe();
if (!_raw) { console.log(JSON.stringify({ continue: true })); process.exit(0); }
const input = JSON.parse(_raw);

const pattern = input.tool_input?.pattern || '';
const path = input.tool_input?.path || '';

// Skip if already scoped to a specific directory (not a broad search)
if (path && !path.includes('prism') && !path.includes('PRISM')) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const suggestions = [];

// Broad engine search → ENGINE_DIGEST.md
if (pattern.includes('Engine') || (pattern.includes('**') && pattern.includes('.ts') && !pattern.includes('test'))) {
  suggestions.push('ENGINE_DIGEST.md (data/docs/) has all 1478 engines indexed — check there first');
}

// Broad dispatcher search
if (pattern.includes('Dispatcher') || pattern.includes('dispatcher')) {
  suggestions.push('DISPATCHER_DIGEST.md (data/docs/) has all 78 dispatchers indexed');
}

// Broad skill search
if (pattern.includes('SKILL') || pattern.includes('skill')) {
  suggestions.push('skills-consolidated/ has 275 skills — use /commands to list them');
}

// Broad test search
if (pattern.includes('test') && pattern.includes('**')) {
  suggestions.push('CODE_SYSTEM_INDEX.json has all test files indexed under prefix T');
}

// Very broad patterns (** without specifics)
if (pattern === '**/*.ts' || pattern === '**/*' || pattern === '*.ts') {
  suggestions.push('This scans the entire repo. Use /navigate <topic> or check MASTER_INDEX_COMPACT.md first');
}

if (suggestions.length > 0) {
  console.log(JSON.stringify({
    continue: true,
    additionalContext: 'TOKEN SAVE: ' + suggestions.join('. ') + '. Index-first lookup = 0 search tokens.'
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
