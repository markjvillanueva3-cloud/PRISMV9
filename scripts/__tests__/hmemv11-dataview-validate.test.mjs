// HMEMV11 validation: the Dataview query snippets must reference REAL vault frontmatter.
// R9 -- a test that FAILS if the queries drift from the corpus shape. Pure fs, no child processes.
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const README = path.join(ROOT, 'knowledge/dataview/PRISM-DATAVIEW-QUERIES.md');

function extractDataviewBlocks(md) {
  const blocks = [];
  const re = /```dataview\s*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md)) !== null) blocks.push(m[1]);
  return blocks;
}

function frontmatterKeys(file) {
  const fm = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return [];
  const keys = [];
  for (const line of fm[1].split('\n')) {
    const k = line.match(/^([a-zA-Z_][\w-]*):/);
    if (k) keys.push(k[1]);
  }
  return keys;
}

function sampleFiles(dir, limit) {
  const out = [];
  const stack = [dir];
  while (stack.length && out.length < limit) {
    const d = stack.shift(); // BFS: reach top-level feature dirs (architecture/) before diving deep
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      // Skip the huge auto-generated action-stub forest (no rich frontmatter) so the
      // sample reaches real feature entries that carry milestone/slot/status/created.
      if (e.isDirectory()) { if (e.name !== 'actions') stack.push(p); }
      else if (e.name.endsWith('.md')) out.push(p);
    }
  }
  return out.slice(0, limit);
}

test('HMEMV11: README exists and has >=4 dataview query snippets', () => {
  assert.ok(fs.existsSync(README), 'missing ' + README);
  const blocks = extractDataviewBlocks(fs.readFileSync(README, 'utf8'));
  assert.ok(blocks.length >= 4, 'expected >=4 dataview blocks, got ' + blocks.length);
});

test('HMEMV11: every queried frontmatter field exists in the real corpus', () => {
  const blocks = extractDataviewBlocks(fs.readFileSync(README, 'utf8'));
  const keys = new Set();
  for (const f of sampleFiles(path.join(ROOT, 'knowledge/memories'), 120)) frontmatterKeys(f).forEach((k) => keys.add(k));
  for (const f of sampleFiles(path.join(ROOT, 'knowledge/wiki'), 1500)) frontmatterKeys(f).forEach((k) => keys.add(k));
  const candidates = ['type', 'description', 'milestone', 'slot', 'status', 'created'];
  let validated = 0;
  for (const field of candidates) {
    const inQuery = blocks.some((b) => new RegExp('\\b' + field + '\\b').test(b));
    if (!inQuery) continue;
    assert.ok(keys.has(field), 'queried field "' + field + '" not present in any sampled corpus frontmatter');
    validated++;
  }
  assert.ok(validated >= 4, 'expected >=4 validated real fields, got ' + validated);
});

test('HMEMV11: hardcoded milestone HERMES-MEMORY-VAULT-MS0 exists in wiki frontmatter', () => {
  const hit = sampleFiles(path.join(ROOT, 'knowledge/wiki'), 600).some((f) => {
    const fm = fs.readFileSync(f, 'utf8').match(/^---\n([\s\S]*?)\n---/);
    return fm && /milestone:\s*HERMES-MEMORY-VAULT-MS0/.test(fm[1]);
  });
  assert.ok(hit, 'HERMES-MEMORY-VAULT-MS0 not found as a milestone value in any wiki frontmatter');
});

test('HMEMV11: feedback subdir (query #3 FROM target) exists with real entries', () => {
  const dir = path.join(ROOT, 'knowledge/memories/feedback');
  assert.ok(fs.existsSync(dir), 'knowledge/memories/feedback missing');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  assert.ok(files.length >= 5, 'feedback corpus too small: ' + files.length);
});
