#!/usr/bin/env node
// tier: T0
/**
 * Batch fix /dev/stdin pattern in hooks for Windows compatibility.
 * Adds readStdinSafe() helper and replaces fs.promises.readFile('/dev/stdin'...) calls.
 */
import fs from 'node:fs';
import path from 'node:path';

const HOOKS_DIR = 'H:/prism/.claude/hooks';

const HELPER_FN = `
function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}
`;

const FILES = [
  'ai-feature-recommend.mjs',
  'asset-deletion-block.mjs',
  'auto-record-tool-call.mjs',
  'build-create-detector.mjs',
  'dedup-auto-invoke.mjs',
  'dispatcher-import-validator.mjs',
  'duplication-hard-block.mjs',
  'edit-multiedit-suggest.mjs',
  'figma-ui-consistency.mjs',
  'inventory-check-guard.mjs',
  'master-index-search-gate.mjs',
  'multi-session-awareness.mjs',
  'output-cache-capture.mjs',
  'session-reorient-capture.mjs',
  'session-reorient-inject.mjs',
  'warn-redundant-read.mjs'
];

let fixed = 0;
let skipped = 0;

for (const file of FILES) {
  const filePath = path.join(HOOKS_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${file}`);
    skipped++;
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('readStdinSafe')) {
    console.log(`SKIP (already fixed): ${file}`);
    skipped++;
    continue;
  }

  if (!content.includes('/dev/stdin')) {
    console.log(`SKIP (no /dev/stdin): ${file}`);
    skipped++;
    continue;
  }

  // Add helper after import statements
  const importMatch = content.match(/^(import\s+.*?;\n)+/m);
  if (importMatch) {
    const insertPos = importMatch.index + importMatch[0].length;
    content = content.slice(0, insertPos) + HELPER_FN + content.slice(insertPos);
  }

  // Replace the readFile pattern with readStdinSafe
  // Pattern: input = JSON.parse(await fs.promises.readFile('/dev/stdin', 'utf8'));
  content = content.replace(
    /(\w+)\s*=\s*JSON\.parse\(await\s+fs\.promises\.readFile\(['"]\/dev\/stdin['"],\s*['"]utf8?['"]\)\);/g,
    (match, varName) => {
      return `const _raw = readStdinSafe();
    if (!_raw) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }
    ${varName} = JSON.parse(_raw);`;
    }
  );

  fs.writeFileSync(filePath, content);
  console.log(`FIXED: ${file}`);
  fixed++;
}

console.log(`\nDone: ${fixed} fixed, ${skipped} skipped`);
