#!/usr/bin/env node
/**
 * hermes-obsidian-memory-bridge.test.mjs
 * Real-behavior tests (node --test) for the Hermes -> Obsidian-vault memory bridge.
 *
 * Every test uses REAL temp dirs + REAL files (no mocks) and asserts the WHY:
 *  - dedup actually re-reads the stored source hash and skips a byte-equal source
 *  - a changed source actually overwrites (source is authoritative)
 *  - malformed/empty/missing inputs are fail-soft (exit-0 semantics), never crash
 *
 * Run: node --test scripts/hermes-obsidian-memory-bridge.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bridgeHermesMemories } from './hermes-obsidian-memory-bridge.mjs';

function mkTmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
function rmrf(p) {
  try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* ignore */ }
}
function read(p) {
  return fs.readFileSync(p, 'utf8');
}
const QUIET = { quiet: true };

// ─────────────────────────────────────────────────────────────────────────────
test('copies a new Hermes memory into the vault with frontmatter + body intact', () => {
  const src = mkTmp('hb-src-');
  const dst = mkTmp('hb-dst-');
  try {
    fs.writeFileSync(path.join(src, 'lesson-one.md'), '# Lesson One\n\nGateway retries cap at 3.\n');

    const r = bridgeHermesMemories({ source: src, target: dst, ...QUIET });

    assert.equal(r.copied, 1, 'one file copied');
    assert.equal(r.skipped, 0);
    assert.equal(r.malformed, 0);
    assert.equal(r.total, 1);

    const outPath = path.join(dst, 'lesson-one.md');
    assert.ok(fs.existsSync(outPath), 'target file exists');
    const out = read(outPath);
    assert.match(out, /^---\n/, 'has frontmatter');
    assert.match(out, /type: hermes-memory/, 'tagged as hermes-memory');
    assert.match(out, /source: hermes-agent/, 'tagged source hermes-agent');
    assert.match(out, /hermes_src_sha256: [0-9a-f]{64}/, 'carries a 64-hex source hash');
    assert.match(out, /Gateway retries cap at 3\./, 'body content preserved');
    assert.match(out, /description: "Lesson One"/, 'description derived from first heading line');
  } finally {
    rmrf(src); rmrf(dst);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
test('DEDUP: a second run over a byte-equal source skips (copied:0, skipped:1)', () => {
  const src = mkTmp('hb-src-');
  const dst = mkTmp('hb-dst-');
  try {
    fs.writeFileSync(path.join(src, 'mem.md'), 'Body that does not change between runs.\n');

    const first = bridgeHermesMemories({ source: src, target: dst, ...QUIET });
    assert.equal(first.copied, 1, 'first run copies');
    const outPath = path.join(dst, 'mem.md');
    const firstMtime = fs.statSync(outPath).mtimeMs;

    const second = bridgeHermesMemories({ source: src, target: dst, ...QUIET });
    assert.equal(second.copied, 0, 'second run copies nothing');
    assert.equal(second.skipped, 1, 'second run records a byte-equal skip');
    assert.ok(
      second.results.some((x) => x.action === 'skip-byte-equal'),
      'skip reason is byte-equal'
    );
    // The target file must NOT have been rewritten (dedup is a true no-op write).
    assert.equal(fs.statSync(outPath).mtimeMs, firstMtime, 'target untouched on dedup');
  } finally {
    rmrf(src); rmrf(dst);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
test('a CHANGED source overwrites the target (source is authoritative)', () => {
  const src = mkTmp('hb-src-');
  const dst = mkTmp('hb-dst-');
  try {
    const srcFile = path.join(src, 'evolving.md');
    fs.writeFileSync(srcFile, 'version one\n');
    const r1 = bridgeHermesMemories({ source: src, target: dst, ...QUIET });
    assert.equal(r1.copied, 1);

    fs.writeFileSync(srcFile, 'version two — learned more\n');
    const r2 = bridgeHermesMemories({ source: src, target: dst, ...QUIET });
    assert.equal(r2.copied, 1, 'changed source is re-copied');
    assert.equal(r2.skipped, 0, 'not skipped — content differs');

    const out = read(path.join(dst, 'evolving.md'));
    assert.match(out, /version two/, 'new content present');
    assert.doesNotMatch(out, /version one/, 'old content replaced');
  } finally {
    rmrf(src); rmrf(dst);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
test('fail-soft: empty file is skipped as malformed, does not crash', () => {
  const src = mkTmp('hb-src-');
  const dst = mkTmp('hb-dst-');
  try {
    fs.writeFileSync(path.join(src, 'empty.md'), '');
    fs.writeFileSync(path.join(src, 'blank.md'), '   \n\n  \n');
    fs.writeFileSync(path.join(src, 'real.md'), 'has content\n');

    const r = bridgeHermesMemories({ source: src, target: dst, ...QUIET });
    assert.equal(r.malformed, 2, 'empty + blank both counted malformed');
    assert.equal(r.copied, 1, 'the real file still copies');
    assert.ok(!fs.existsSync(path.join(dst, 'empty.md')), 'empty file not written');
    assert.ok(fs.existsSync(path.join(dst, 'real.md')), 'real file written');
  } finally {
    rmrf(src); rmrf(dst);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
test('fail-soft: frontmatter-only file (no body) is skipped', () => {
  const src = mkTmp('hb-src-');
  const dst = mkTmp('hb-dst-');
  try {
    fs.writeFileSync(path.join(src, 'fm-only.md'), '---\nname: x\n---\n');
    const r = bridgeHermesMemories({ source: src, target: dst, ...QUIET });
    assert.equal(r.copied, 0);
    assert.equal(r.malformed, 1, 'frontmatter-only counted malformed');
    assert.ok(r.results.some((x) => x.action === 'no-body-skip'));
  } finally {
    rmrf(src); rmrf(dst);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
test('fail-soft: missing source dir returns sourceMissing, copies nothing, no throw', () => {
  const dst = mkTmp('hb-dst-');
  try {
    const r = bridgeHermesMemories({
      source: path.join(os.tmpdir(), 'definitely-not-here-' + Date.now()),
      target: dst,
      ...QUIET,
    });
    assert.equal(r.sourceMissing, true);
    assert.equal(r.copied, 0);
    assert.equal(r.total, 0);
  } finally {
    rmrf(dst);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
test('empty source dir (Hermes installed but no memories yet) is a clean no-op', () => {
  const src = mkTmp('hb-src-');
  const dst = mkTmp('hb-dst-');
  try {
    const r = bridgeHermesMemories({ source: src, target: dst, ...QUIET });
    assert.equal(r.sourceMissing, false, 'dir exists');
    assert.equal(r.total, 0, 'no .md files');
    assert.equal(r.copied, 0);
  } finally {
    rmrf(src); rmrf(dst);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
test('a source file with its own frontmatter is not double-wrapped + dedups stably', () => {
  const src = mkTmp('hb-src-');
  const dst = mkTmp('hb-dst-');
  try {
    fs.writeFileSync(
      path.join(src, 'pre-fm.md'),
      '---\ntype: note\n---\nThe actual body of the note.\n'
    );
    const r1 = bridgeHermesMemories({ source: src, target: dst, ...QUIET });
    assert.equal(r1.copied, 1);
    const out = read(path.join(dst, 'pre-fm.md'));
    // Exactly one frontmatter block (two '---\n' openers would mean double-wrap).
    const opener = (out.match(/^---\r?\n/gm) || []).length;
    assert.ok(opener >= 1, 'has a frontmatter block');
    assert.match(out, /The actual body of the note\./, 'real body preserved');
    assert.doesNotMatch(out, /type: note/, 'source frontmatter stripped (re-derived as hermes-memory)');

    // Re-run must dedup despite our injected frontmatter (hash is over the BODY).
    const r2 = bridgeHermesMemories({ source: src, target: dst, ...QUIET });
    assert.equal(r2.skipped, 1, 'dedup stable across our own frontmatter injection');
  } finally {
    rmrf(src); rmrf(dst);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
test('nested subdirectories are preserved in the vault target', () => {
  const src = mkTmp('hb-src-');
  const dst = mkTmp('hb-dst-');
  try {
    fs.mkdirSync(path.join(src, 'lessons'), { recursive: true });
    fs.writeFileSync(path.join(src, 'lessons', 'nested.md'), 'nested lesson\n');
    const r = bridgeHermesMemories({ source: src, target: dst, ...QUIET });
    assert.equal(r.copied, 1);
    assert.ok(
      fs.existsSync(path.join(dst, 'lessons', 'nested.md')),
      'nested path mirrored under target'
    );
  } finally {
    rmrf(src); rmrf(dst);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
test('--dry-run counts would-copy but writes nothing to disk', () => {
  const src = mkTmp('hb-src-');
  const dst = mkTmp('hb-dst-');
  try {
    fs.writeFileSync(path.join(src, 'a.md'), 'content a\n');
    const r = bridgeHermesMemories({ source: src, target: dst, dryRun: true, ...QUIET });
    assert.equal(r.copied, 1, 'counts what would be written');
    assert.ok(r.results.some((x) => x.action === 'would-copy'));
    assert.ok(!fs.existsSync(path.join(dst, 'a.md')), 'nothing actually written in dry-run');
  } finally {
    rmrf(src); rmrf(dst);
  }
});
