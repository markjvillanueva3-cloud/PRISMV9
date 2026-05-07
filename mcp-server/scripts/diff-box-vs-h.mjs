#!/usr/bin/env node
/**
 * Diff Box canonical vs H:/prism working tree for mcp-server/src/.
 * Classifies every .ts/.json file into:
 *   ONLY_IN_BOX   - restore candidate
 *   ONLY_IN_H     - local-only (keep, don't overwrite)
 *   IDENTICAL     - no action
 *   DIVERGED      - content differs; human review
 *
 * Output: H:/prism/.cache/temp/box-vs-h-manifest.json
 *         H:/prism/.cache/temp/box-vs-h-summary.txt
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, posix } from 'node:path';
import { createHash } from 'node:crypto';

const BOX_ROOT = 'C:/Users/Mark Villanueva/Box/PRISM H DRIVE/PRISM/mcp-server/src';
const H_ROOT = 'H:/prism/mcp-server/src';
const OUT_JSON = 'H:/prism/.cache/temp/box-vs-h-manifest.json';
const OUT_TXT = 'H:/prism/.cache/temp/box-vs-h-summary.txt';

// Scope: only directories that dispatchers import from
const SCOPE_DIRS = [
  'engines', 'utils', 'data', 'db', 'config', 'middleware',
  'types', 'registries', 'hooks', 'tools', 'services',
  'schemas', 'generators', 'integrations', 'orchestration',
  'physics', 'algorithms', 'pipelines', 'safety',
];

const VALID_EXT = /\.(ts|json)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', '__tests__', '_archived']);

function walk(root, relDir = '') {
  const out = [];
  const full = relDir ? join(root, relDir) : root;
  let entries;
  try { entries = readdirSync(full, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const subRel = relDir ? posix.join(relDir, e.name) : e.name;
    if (e.isDirectory()) {
      out.push(...walk(root, subRel));
    } else if (e.isFile() && VALID_EXT.test(e.name)) {
      out.push(subRel);
    }
  }
  return out;
}

function sha256(path) {
  const h = createHash('sha256');
  h.update(readFileSync(path));
  return h.digest('hex');
}

function indexTree(root, scopeFilter) {
  const map = new Map(); // relPath -> {hash, size, mtime}
  for (const dir of SCOPE_DIRS) {
    const entries = walk(root, dir);
    for (const rel of entries) {
      const full = join(root, rel);
      try {
        const st = statSync(full);
        map.set(rel, {
          hash: sha256(full),
          size: st.size,
          mtime: st.mtime.toISOString(),
        });
      } catch {}
    }
  }
  return map;
}

console.log('Indexing Box tree...');
const boxIdx = indexTree(BOX_ROOT);
console.log(`  Box:  ${boxIdx.size} files`);

console.log('Indexing H: tree...');
const hIdx = indexTree(H_ROOT);
console.log(`  H:    ${hIdx.size} files`);

const onlyInBox = [];
const onlyInH = [];
const identical = [];
const diverged = [];

const allKeys = new Set([...boxIdx.keys(), ...hIdx.keys()]);
for (const k of allKeys) {
  const b = boxIdx.get(k);
  const h = hIdx.get(k);
  if (b && !h) onlyInBox.push({ path: k, ...b });
  else if (!b && h) onlyInH.push({ path: k, ...h });
  else if (b.hash === h.hash) identical.push(k);
  else diverged.push({
    path: k,
    box: { size: b.size, mtime: b.mtime, hash: b.hash.slice(0, 12) },
    h:   { size: h.size, mtime: h.mtime, hash: h.hash.slice(0, 12) },
  });
}

// Bucket onlyInBox by top-level dir
const byDir = new Map();
for (const f of onlyInBox) {
  const top = f.path.split('/')[0];
  byDir.set(top, (byDir.get(top) || 0) + 1);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  boxRoot: BOX_ROOT,
  hRoot: H_ROOT,
  counts: {
    boxTotal: boxIdx.size,
    hTotal: hIdx.size,
    onlyInBox: onlyInBox.length,
    onlyInH: onlyInH.length,
    identical: identical.length,
    diverged: diverged.length,
  },
  onlyInBoxByDir: Object.fromEntries([...byDir.entries()].sort((a, b) => b[1] - a[1])),
  onlyInBox,
  onlyInH,
  diverged,
  identicalSample: identical.slice(0, 20),
  identicalCount: identical.length,
};
writeFileSync(OUT_JSON, JSON.stringify(manifest, null, 2));

const lines = [
  `BOX <-> H: MANIFEST`,
  `Generated: ${manifest.generatedAt}`,
  ``,
  `Box total:    ${manifest.counts.boxTotal}`,
  `H   total:    ${manifest.counts.hTotal}`,
  `Identical:    ${manifest.counts.identical}`,
  `Only in Box:  ${manifest.counts.onlyInBox}   <- restore candidates`,
  `Only in H:    ${manifest.counts.onlyInH}     <- local-only (keep)`,
  `Diverged:     ${manifest.counts.diverged}    <- content differs, review`,
  ``,
  `Only-in-Box by top-level dir:`,
  ...Object.entries(manifest.onlyInBoxByDir).map(([k, v]) => `  ${k.padEnd(20)} ${v}`),
  ``,
  `Diverged top-level dir distribution:`,
];
const divByDir = new Map();
for (const d of diverged) {
  const top = d.path.split('/')[0];
  divByDir.set(top, (divByDir.get(top) || 0) + 1);
}
for (const [k, v] of [...divByDir.entries()].sort((a, b) => b[1] - a[1])) {
  lines.push(`  ${k.padEnd(20)} ${v}`);
}
lines.push('');
lines.push('Sample diverged (first 20):');
for (const d of diverged.slice(0, 20)) {
  lines.push(`  ${d.path}`);
  lines.push(`    box: ${d.box.size.toString().padStart(7)}b  ${d.box.mtime.slice(0,19)}  ${d.box.hash}`);
  lines.push(`    h:   ${d.h.size.toString().padStart(7)}b  ${d.h.mtime.slice(0,19)}  ${d.h.hash}`);
}

const txt = lines.join('\n');
writeFileSync(OUT_TXT, txt);
console.log('\n' + txt);
