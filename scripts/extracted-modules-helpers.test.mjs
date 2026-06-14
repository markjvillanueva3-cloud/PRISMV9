// scripts/extracted-modules-helpers.test.mjs
// iter14 tests for the 5 helper scripts shipped iter5-12 (slot:papa /loop).
// Uses execFileSync (not execSync — no shell parsing, safer per the
// codebase's security-reminder discipline).
// Run: rtk node --test scripts/extracted-modules-helpers.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SHARED = 'H:/PRISM/state/shared';
const CLI_TIMEOUT_MS = 5000;
const NODE = process.execPath; // Windows: execFileSync('node', ...) ENOENTs without PATH resolution

describe('per-dispatcher report (iter5)', () => {
  test('by-dispatcher.md exists + has expected sections', () => {
    const p = `${SHARED}/extracted-modules-by-dispatcher.md`;
    if (!fs.existsSync(p)) { console.warn(`  SKIP: ${p} not present`); return; }
    const md = fs.readFileSync(p, 'utf8');
    assert.ok(md.includes('# Extracted modules — by recommended dispatcher'));
    assert.ok(md.includes('## Summary'));
    assert.ok(md.includes('prism_calc') || md.includes('prism_ai'));
    assert.ok(md.includes('| Lines |'));
  });
});

describe('CSV emit (iter6)', () => {
  test('classified.csv exists + header + row count matches manifest', () => {
    const p = `${SHARED}/extracted-modules-classified.csv`;
    if (!fs.existsSync(p)) { console.warn(`  SKIP`); return; }
    const csv = fs.readFileSync(p, 'utf8');
    const lines = csv.split('\n');
    assert.equal(lines[0], 'stockpile,category,type,dup_status,dispatcher,lines,size_bytes,match_confidence,matched_engine,path');
    const manifestPath = `${SHARED}/extracted-modules-classified.json`;
    if (fs.existsSync(manifestPath)) {
      const j = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      assert.equal(lines.length - 1, j.modules.length);
    }
  });
  test('CSV preserves column count (escape rule)', () => {
    const p = `${SHARED}/extracted-modules-classified.csv`;
    if (!fs.existsSync(p)) { console.warn(`  SKIP`); return; }
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    const expectedCols = lines[0].split(',').length;
    for (let i = 1; i < Math.min(lines.length, 50); i++) {
      if (lines[i].trim() === '') continue;
      assert.equal(lines[i].split(',').length, expectedCols, `row ${i} col mismatch`);
    }
  });
});

describe('per-stockpile summary (iter11)', () => {
  test('by-stockpile.json has both stockpiles + structured stats', () => {
    const p = `${SHARED}/extracted-modules-by-stockpile.json`;
    if (!fs.existsSync(p)) { console.warn(`  SKIP`); return; }
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.equal(j.schemaVersion, '1.0.0');
    const stockpiles = Object.keys(j.by_stockpile);
    assert.ok(stockpiles.includes('extracted'));
    assert.ok(stockpiles.includes('extracted_modules'));
    for (const s of stockpiles) {
      const x = j.by_stockpile[s];
      assert.equal(typeof x.total, 'number');
      assert.ok(Array.isArray(x.top_wire));
      assert.ok(Array.isArray(x.top_db));
    }
  });
});

describe('lookup CLI (iter12)', () => {
  test('finds PSO_OPTIMIZER as 200K+ line WIRE_CANDIDATE', () => {
    try {
      const out = execFileSync(NODE, ['H:/PRISM/scripts/lookup-extracted-module.mjs', 'PSO_OPTIMIZER'],
        { encoding: 'utf8', timeout: CLI_TIMEOUT_MS });
      const rows = JSON.parse(out);
      assert.ok(rows.length >= 1);
      const pso = rows.find(r => r.name === 'PRISM_PSO_OPTIMIZER');
      assert.ok(pso, 'must find PRISM_PSO_OPTIMIZER');
      assert.ok(pso.lines > 200000);
      assert.equal(pso.status, 'WIRE_CANDIDATE');
    } catch (e) {
      if (String(e.message).includes('classified.json')) { console.warn('  SKIP'); return; }
      throw e;
    }
  });
  test('exits non-zero with no-match', () => {
    try {
      execFileSync(NODE, ['H:/PRISM/scripts/lookup-extracted-module.mjs', 'ZZZZ_NOSUCHTHING_ZZZ'],
        { encoding: 'utf8', timeout: CLI_TIMEOUT_MS });
      assert.fail('should have exited non-zero');
    } catch (e) {
      assert.ok(e.status === 1 || /no match/i.test(String(e.stderr || e.message)));
    }
  });
});

describe('augmentation validator (iter7)', () => {
  test('passes on the live detail-augmentation file', () => {
    try {
      const out = execFileSync(NODE, ['H:/PRISM/scripts/validate-extracted-modules-augmentation.mjs'],
        { encoding: 'utf8', timeout: CLI_TIMEOUT_MS });
      const j = JSON.parse(out);
      assert.equal(j.ok, true);
      assert.ok(j.nodes > 0);
      assert.equal(j.unique_node_ids, j.nodes);
    } catch (e) {
      if (String(e.message).includes('not present')) { console.warn('  SKIP'); return; }
      throw e;
    }
  });
});
