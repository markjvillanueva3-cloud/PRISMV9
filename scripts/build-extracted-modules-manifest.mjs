#!/usr/bin/env node
// scripts/build-extracted-modules-manifest.mjs
//
// Walk H:/PRISM/extracted/ + H:/PRISM/extracted_modules/ and emit
//   state/shared/extracted-modules-manifest.json
//
// One row per .js/.json file: { path, name, category, source_stockpile,
//   size_bytes, lines (best-effort, 0 for binary/json), sha256 }.
//
// Karpathy:
//   CLASSIFY  — directory traversal + classify by parent dir + filename
//   TECHNIQUE — sync fs.readdirSync recursion (small trees, ~1000 files
//               total), single-pass sha256 + line-count on read
//   EDGE CASES — symlinks (skip), 0-byte files (still emit), unreadable
//               files (emit with error: 'unreadable')
//   FAILURE   — write to .tmp then rename for atomic replace
//
// Output schema: { schemaVersion, generated_at, stockpiles, summary,
//   by_category, modules: Modulemfo[] }.
//
// PSN bridge — feeds:
//   1. /system-viz ghost.extracted_modules roost (generate-extracted-modules-features.mjs)
//   2. Obsidian memory note (reference_extracted_modules_inventory_*)
//   3. wiki/architecture/extracted-modules-conversion.md
//   4. dispatcher classification feed (prism_dev:extracted_modules_*)
//
// Usage:
//   node scripts/build-extracted-modules-manifest.mjs
//   node scripts/build-extracted-modules-manifest.mjs --json   # stdout JSON

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SCHEMA_VERSION = '1.0.0';
const REPO_ROOT = 'H:/PRISM';
const STOCKPILES = [
  { id: 'extracted', root: path.join(REPO_ROOT, 'extracted') },
  { id: 'extracted_modules', root: path.join(REPO_ROOT, 'extracted_modules') },
];
const OUT_PATH = path.join(REPO_ROOT, 'state/shared/extracted-modules-manifest.json');

const EXCLUDE_DIRS = new Set([
  // Backups, archives, reports — don't catalog these as conversion candidates
  '_ARCHIVE_OLD_MATERIALS',
  'materials_backup_20260125_0134',
  'materials_backup_full_20260125_0136',
  'materials_backup_v2_20260125_0138',
  'verification_reports',
  // PS-spawned junk
  'node_modules',
  '.git',
]);

const INCLUDE_EXTS = new Set(['.js', '.json', '.md', '.py', '.ts']);

function walk(root, stockpile, acc = []) {
  if (!fs.existsSync(root)) return acc;
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); }
  catch { return acc; }
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      walk(full, stockpile, acc);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (!INCLUDE_EXTS.has(ext)) continue;
      acc.push({ full, stockpile });
    }
  }
  return acc;
}

function classifyCategory(relPath) {
  const parts = relPath.replace(/\\/g, '/').split('/');
  // First non-root dir is the category bucket
  return parts.length > 0 ? parts[0] : 'root';
}

function classifyType(name) {
  const n = name.toUpperCase();
  if (n.includes('DATABASE') || n.includes('_DB') || n.includes('LOOKUP')) return 'database';
  if (n.includes('ENGINE')) return 'engine';
  if (n.includes('OPTIMIZER') || n.includes('OPTIMIZATION') || n.includes('ALGORITHM')) return 'algorithm';
  if (n.includes('NEURAL') || n.includes('LEARNING') || n.includes('AI') || n.includes('ML')) return 'ai_ml';
  if (n.includes('PHYSICS') || n.includes('THERMAL') || n.includes('CHATTER') || n.includes('CUTTING') || n.includes('FORCE')) return 'physics';
  if (n.includes('GEOMETRY') || n.includes('MESH') || n.includes('CAD') || n.includes('STEP')) return 'geometry';
  if (n.includes('CAM') || n.includes('TOOLPATH') || n.includes('GCODE') || n.includes('POST')) return 'cam';
  if (n.includes('MATERIAL')) return 'material';
  if (n.includes('TOOL')) return 'tool';
  if (n.includes('MACHINE') || n.includes('KINEMATICS')) return 'machine';
  if (n.includes('GATEWAY') || n.includes('ROUTES') || n.includes('INTEGRATION')) return 'system';
  if (n.includes('TEST') || n.includes('SELF_TEST')) return 'test';
  if (n.includes('UI') || n.includes('UTIL') || n.includes('HELPER')) return 'util';
  return 'misc';
}

function hashFile(full) {
  try {
    const buf = fs.readFileSync(full);
    return {
      sha256: crypto.createHash('sha256').update(buf).digest('hex'),
      size_bytes: buf.length,
      lines: buf.toString('utf8').split('\n').length,
    };
  } catch {
    return { sha256: null, size_bytes: 0, lines: 0, error: 'unreadable' };
  }
}

function build() {
  const all = [];
  for (const sp of STOCKPILES) {
    const files = walk(sp.root, sp.id);
    for (const { full, stockpile } of files) {
      const rel = path.relative(sp.root, full).replace(/\\/g, '/');
      const meta = hashFile(full);
      const category = classifyCategory(rel);
      const type = classifyType(path.basename(full, path.extname(full)));
      all.push({
        path: rel,
        full_path: full.replace(/\\/g, '/'),
        name: path.basename(full, path.extname(full)),
        ext: path.extname(full).toLowerCase(),
        category,
        type,
        source_stockpile: stockpile,
        ...meta,
      });
    }
  }

  // Group + summarize
  const by_category = {};
  const by_type = {};
  for (const m of all) {
    by_category[m.category] ??= { count: 0, total_size: 0 };
    by_category[m.category].count++;
    by_category[m.category].total_size += m.size_bytes;
    by_type[m.type] ??= { count: 0 };
    by_type[m.type].count++;
  }

  const result = {
    schemaVersion: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    stockpiles: STOCKPILES.map(sp => sp.id),
    summary: {
      total_modules: all.length,
      total_size_bytes: all.reduce((s, m) => s + m.size_bytes, 0),
      total_lines: all.reduce((s, m) => s + m.lines, 0),
      by_stockpile: STOCKPILES.reduce((acc, sp) => {
        acc[sp.id] = all.filter(m => m.source_stockpile === sp.id).length;
        return acc;
      }, {}),
    },
    by_category,
    by_type,
    modules: all,
  };

  return result;
}

function writeAtomic(p, data) {
  const tmp = `${p}.tmp.${process.pid}`;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

function main() {
  const args = process.argv.slice(2);
  const result = build();
  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(result, null, 2));
    return;
  }
  writeAtomic(OUT_PATH, result);
  console.log(JSON.stringify({
    ok: true,
    out: OUT_PATH,
    total: result.summary.total_modules,
    by_stockpile: result.summary.by_stockpile,
    by_category: Object.fromEntries(Object.entries(result.by_category).map(([k, v]) => [k, v.count])),
    by_type: Object.fromEntries(Object.entries(result.by_type).map(([k, v]) => [k, v.count])),
  }, null, 2));
}

if (import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main();
}
