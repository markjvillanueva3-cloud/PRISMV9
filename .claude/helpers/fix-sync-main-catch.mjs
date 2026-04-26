#!/usr/bin/env node
/**
 * fix-sync-main-catch.mjs — Batch fix for sync main().catch() pattern
 *
 * Finds hooks where:
 *   1. main() is defined as `function main()` (NOT `async function main()`)
 *   2. Invoked as `main().catch(...)`
 *
 * Replaces with: `try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }`
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const HOOKS_DIR = 'H:/prism/.claude/hooks';
const DRY_RUN = process.argv.includes('--dry-run');

function findHooksRecursive(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...findHooksRecursive(full));
    } else if (extname(entry) === '.mjs' || extname(entry) === '.js') {
      files.push(full);
    }
  }
  return files;
}

function isSyncMain(content) {
  // Check if main is defined WITHOUT async keyword
  // Matches: function main() but NOT async function main()
  return /(?<!async\s+)function\s+main\s*\(/.test(content);
}

function hasMainCatch(content) {
  // Matches: main().catch(...)
  return /main\(\)\s*\.catch\s*\(/.test(content);
}

function fixContent(content) {
  const replacement = 'try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }';

  // Match entire line containing main().catch(...) pattern
  // This handles all variants including nested braces
  const lines = content.split('\n');
  const fixedLines = lines.map(line => {
    if (/^\s*main\(\)\s*\.catch\s*\(/.test(line)) {
      // Replace entire line with proper try/catch
      return replacement;
    }
    return line;
  });

  return fixedLines.join('\n');
}

function main() {
  const files = findHooksRecursive(HOOKS_DIR);
  let fixed = 0;
  let skipped = 0;
  const errors = [];

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf8');

      // Skip if main is async (those are fine with .catch())
      if (!isSyncMain(content)) {
        continue;
      }

      // Skip if no main().catch() pattern
      if (!hasMainCatch(content)) {
        continue;
      }

      const newContent = fixContent(content);

      if (newContent === content) {
        skipped++;
        console.log(`⚠ Pattern not matched: ${file}`);
        continue;
      }

      if (DRY_RUN) {
        console.log(`[DRY-RUN] Would fix: ${file}`);
      } else {
        writeFileSync(file, newContent);
        console.log(`✓ Fixed: ${file}`);
      }
      fixed++;

    } catch (err) {
      errors.push({ file, error: err.message });
    }
  }

  console.log(`\n${ DRY_RUN ? '[DRY-RUN] ' : '' }Summary: ${fixed} fixed, ${skipped} pattern-not-matched, ${errors.length} errors`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const { file, error } of errors) {
      console.log(`  ${file}: ${error}`);
    }
  }
}

main();
