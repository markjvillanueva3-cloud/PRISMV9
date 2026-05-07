#!/usr/bin/env node
/**
 * Executes the Box->H: restore based on box-vs-h-manifest.json.
 * Copies only "onlyInBox" files. Never touches "onlyInH", "diverged",
 * or "identical" entries.
 *
 * Modes:
 *   --dry-run  : print plan, no writes
 *   (default)  : perform the copy
 *
 * Safety:
 *   - Refuses to run if any target path already exists (would be overwrite).
 *   - Creates parent directories as needed.
 *   - Writes a restore log with per-file status.
 */
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, statSync,
} from 'node:fs';
import { dirname, join, posix } from 'node:path';

const MANIFEST = 'H:/prism/.cache/temp/box-vs-h-manifest.json';
const H_SRC = 'H:/prism/mcp-server/src';
const BOX_SRC = 'C:/Users/Mark Villanueva/Box/PRISM H DRIVE/PRISM/mcp-server/src';
const LOG = 'H:/prism/.cache/temp/restore-log.json';

const DRY = process.argv.includes('--dry-run');

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const files = manifest.onlyInBox;
if (!Array.isArray(files) || files.length === 0) {
  console.error('No onlyInBox entries in manifest.');
  process.exit(1);
}

// Safety scan: make sure no target already exists (would indicate indexing bug)
const conflicts = [];
for (const f of files) {
  const target = join(H_SRC, f.path);
  if (existsSync(target)) conflicts.push(f.path);
}
if (conflicts.length > 0) {
  console.error(`ABORT: ${conflicts.length} target files already exist (would be overwrites):`);
  for (const c of conflicts.slice(0, 10)) console.error(`  ${c}`);
  if (conflicts.length > 10) console.error(`  ... and ${conflicts.length - 10} more`);
  process.exit(2);
}

const log = {
  startedAt: new Date().toISOString(),
  dryRun: DRY,
  total: files.length,
  copied: 0,
  skipped: 0,
  errors: [],
  byDir: {},
};

let i = 0;
for (const f of files) {
  i++;
  const src = join(BOX_SRC, f.path);
  const dst = join(H_SRC, f.path);
  const topDir = f.path.split(/[/\\]/)[0];
  log.byDir[topDir] = (log.byDir[topDir] || 0) + 1;

  if (DRY) {
    if (i <= 10) console.log(`[DRY] ${f.path}`);
    log.copied++;
    continue;
  }

  try {
    const dstDir = dirname(dst);
    if (!existsSync(dstDir)) mkdirSync(dstDir, { recursive: true });
    copyFileSync(src, dst);
    log.copied++;
    if (i % 200 === 0) console.log(`... ${i}/${files.length}`);
  } catch (err) {
    log.errors.push({ path: f.path, error: String(err.message || err) });
  }
}

log.finishedAt = new Date().toISOString();
writeFileSync(LOG, JSON.stringify(log, null, 2));

console.log(`\nRestore ${DRY ? '(DRY-RUN) ' : ''}complete.`);
console.log(`  Copied:  ${log.copied}`);
console.log(`  Errors:  ${log.errors.length}`);
console.log(`  By dir:`);
for (const [k, v] of Object.entries(log.byDir).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(18)} ${v}`);
}
if (log.errors.length > 0) {
  console.log(`  First errors:`);
  for (const e of log.errors.slice(0, 5)) {
    console.log(`    ${e.path}: ${e.error}`);
  }
}
