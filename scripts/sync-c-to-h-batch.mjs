#!/usr/bin/env node
// Batch C → H sync. Walks user's C:\Users\<u>\.claude\ tree, mirrors any
// MIRRORED_ROOT or MIRRORED_SUBDIRS file that drifted. Same scope as
// c-to-h-mirror.mjs hook — but bulk, so missed events get caught up.
//
// USAGE: node H:/prism/scripts/sync-c-to-h-batch.mjs [--dry-run]
import { readdirSync, readFileSync, copyFileSync, statSync, lstatSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { homedir } from 'node:os';

const DRY = process.argv.includes('--dry-run');
const SRC_ROOT = join(homedir(), '.claude');
const DST_ROOT = 'H:/.claude';

const MIRRORED_ROOT = new Set([
  'settings.json',
  'settings.local.json',
  '.mcp.json',
  'CLAUDE.md',
  'keybindings.json',
]);

const MIRRORED_SUBDIRS = ['commands', 'hooks', 'agents', 'plugins', 'skills', 'rules'];

const stats = { scanned: 0, copied: 0, unchanged: 0, skippedJunction: 0, errors: 0 };

function isJunctionOrLink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function bytesEqual(a, b) {
  try {
    return readFileSync(a).equals(readFileSync(b));
  } catch {
    return false;
  }
}

function mirror(srcAbs, dstAbs, label) {
  stats.scanned += 1;
  if (existsSync(dstAbs) && bytesEqual(srcAbs, dstAbs)) {
    stats.unchanged += 1;
    return;
  }
  if (DRY) {
    console.log(`[would copy] ${label}`);
    stats.copied += 1;
    return;
  }
  try {
    ensureDir(dirname(dstAbs));
    copyFileSync(srcAbs, dstAbs);
    stats.copied += 1;
    console.log(`[copied] ${label}`);
  } catch (err) {
    stats.errors += 1;
    console.error(`[error] ${label}: ${err.message || err}`);
  }
}

function walkSubdir(rel) {
  const srcDir = join(SRC_ROOT, rel);
  if (!existsSync(srcDir)) return;
  if (isJunctionOrLink(srcDir)) {
    stats.skippedJunction += 1;
    return;
  }
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const childRel = join(rel, entry.name);
    const childAbs = join(SRC_ROOT, childRel);
    if (entry.isDirectory()) {
      walkSubdir(childRel);
    } else if (entry.isFile()) {
      const dstAbs = join(DST_ROOT, childRel);
      mirror(childAbs, dstAbs, childRel.replace(/\\/g, '/'));
    }
  }
}

function main() {
  if (!existsSync(SRC_ROOT)) {
    console.error(`SRC_ROOT missing: ${SRC_ROOT}`);
    process.exit(1);
  }

  // Root files
  for (const name of MIRRORED_ROOT) {
    const src = join(SRC_ROOT, name);
    if (!existsSync(src)) continue;
    if (isJunctionOrLink(src)) {
      stats.skippedJunction += 1;
      continue;
    }
    mirror(src, join(DST_ROOT, name), name);
  }

  // Subdirs
  for (const sub of MIRRORED_SUBDIRS) walkSubdir(sub);

  console.log('');
  console.log('=== sync-c-to-h-batch summary ===');
  console.log(`scanned        ${stats.scanned}`);
  console.log(`copied         ${stats.copied}`);
  console.log(`unchanged      ${stats.unchanged}`);
  console.log(`skip-junction  ${stats.skippedJunction}`);
  console.log(`errors         ${stats.errors}`);
  console.log(`mode           ${DRY ? 'DRY-RUN' : 'LIVE'}`);
}

main();
