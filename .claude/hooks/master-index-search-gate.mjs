#!/usr/bin/env node
// tier: T1
/**
 * master-index-search-gate.mjs — PreToolUse hook (U-AWARE03)
 *
 * Before creating new engines/algorithms, searches MASTER_INDEX_COMPACT.md
 * for similar existing assets and warns if duplicates found.
 */

import * as fs from 'fs';
import * as path from 'path';

// Canonical auto-refreshed path (regen-digests writes here; PreCompact hook keeps it fresh).
// Was 'mcp-server/MASTER_INDEX_COMPACT.md' -- a dead orphan stale since 2026-04 (nothing regenerates it).
const MASTER_INDEX = 'H:/prism/mcp-server/data/docs/MASTER_INDEX_COMPACT.md';
const CREATE_PATHS = ['/engines/', '/algorithms/'];

function isCreateOperation(tool, input) {
  if (tool !== 'Write') return false;
  const filePath = input?.file_path || '';
  return CREATE_PATHS.some(p => filePath.includes(p));
}

function getAssetName(filePath) {
  return path.basename(filePath)
    .replace(/\.(ts|js|mjs)$/, '')
    .replace(/Engine$/, '')
    .replace(/Algorithm$/, '');
}

function fuzzyMatch(needle, haystack) {
  const n = needle.toLowerCase();
  const words = n.split(/(?=[A-Z])|[-_\s]/).filter(w => w.length > 2);

  let matches = [];
  const lines = haystack.split('\n');

  for (const line of lines) {
    const l = line.toLowerCase();
    const matchCount = words.filter(w => l.includes(w)).length;
    if (matchCount >= Math.ceil(words.length * 0.5)) {
      const match = line.match(/[A-Z][a-zA-Z]+Engine|[A-Z][a-zA-Z]+Algorithm/);
      if (match) matches.push(match[0]);
    }
  }

  return [...new Set(matches)].slice(0, 5);
}

async function main() {
  let input;
  try {
    const _raw = readStdinSafe();
    if (!_raw) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }
    input = JSON.parse(_raw);
  } catch {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  // Claude Code hook input uses {tool_name, tool_input}. Keep the old
  // {tool, input} for back-compat in case another driver calls this hook.
  const tool = input.tool_name ?? input.tool;
  const toolInput = input.tool_input ?? input.input;

  if (!isCreateOperation(tool, toolInput)) {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const filePath = toolInput?.file_path || '';

  // Skip if file exists (edit, not create)
  if (fs.existsSync(filePath)) {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const assetName = getAssetName(filePath);

  let masterIndex;
  try {
    masterIndex = fs.readFileSync(MASTER_INDEX, 'utf8');
  } catch {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const similar = fuzzyMatch(assetName, masterIndex);

  if (similar.length === 0) {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const warning = `
## SIMILAR ASSETS FOUND (AWARE-MS0)

Creating: **${assetName}**

Existing similar assets:
${similar.map(s => `  - ${s}`).join('\n')}

**ACTION REQUIRED:** Verify these are not duplicates before proceeding.
Use existing asset if functionality overlaps >50%.
`;

  console.log(JSON.stringify({
    decision: 'approve',
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: warning,
      }
    }));
}

main().catch(() => {
  console.log(JSON.stringify({ decision: 'approve' }));
});
