// scripts/extracted-modules-pipeline.test.mjs
// Tests for the 4-stage extracted-modules conversion pipeline (papa 2026-05-26).
//
// Coverage:
//   • generate-extracted-modules-detail-features.mjs
//       - safeId() — collision + edge-case behavior
//       - selectModules() — top-K cap + status filter
//       - build() — node count, edge count, edge-type split, parent-roost id shape
//   • Pipeline integration shape:
//       - manifest schema (smoke check via the live file)
//       - classified schema (smoke check via the live file)
//
// Run: rtk node --test scripts/extracted-modules-pipeline.test.mjs

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { safeId, selectModules, build } from './generate-extracted-modules-detail-features.mjs';

describe('safeId', () => {
  test('lowercases + replaces unsafe chars with dashes (underscores preserved)', () => {
    // Underscores ARE in the [a-z0-9_-] class so they survive — only '/' '.' replace.
    assert.equal(safeId('GIANT/PRISM_PSO_OPTIMIZER.js'), 'giant-prism_pso_optimizer-js');
  });
  test('collapses runs of non-allowed chars to single dashes', () => {
    assert.equal(safeId('a__b//c..d'), 'a__b-c-d');
  });
  test('handles empty / null', () => {
    assert.equal(safeId(''), 'x');
    assert.equal(safeId(null), 'x');
    assert.equal(safeId(undefined), 'x');
  });
  test('path-traversal cannot produce `..` in output', () => {
    // The regex replaces every `.` with `-`, so the dangerous `..` sequence
    // can never survive into the resulting id — even from a hostile input.
    const out = safeId('../../../etc/passwd');
    assert.ok(!out.includes('..'), `output must not contain '..' — got ${out}`);
    assert.ok(!out.includes('/'),  `output must not contain '/' — got ${out}`);
  });
  test('caps length at 80', () => {
    const long = 'x'.repeat(200);
    assert.ok(safeId(long).length <= 80);
  });
});

function mkMod(over = {}) {
  return {
    path: 'engines/ai_ml/PRISM_FOO.js',
    full_path: 'H:/PRISM/extracted/engines/ai_ml/PRISM_FOO.js',
    name: 'PRISM_FOO',
    ext: '.js',
    category: 'engines',
    type: 'engine',
    source_stockpile: 'extracted',
    size_bytes: 5000,
    lines: 200,
    sha256: 'a'.repeat(64),
    dup_status: 'WIRE_CANDIDATE',
    matched_engine: null,
    match_confidence: 0.0,
    recommended_dispatcher: 'prism_ai',
    recommended_action: 'wire-new-engine',
    ...over,
  };
}

describe('selectModules', () => {
  test('selects top-200 WIRE by lines', () => {
    const mods = [];
    for (let i = 0; i < 300; i++) mods.push(mkMod({ name: `W${i}`, path: `w${i}.js`, lines: i, dup_status: 'WIRE_CANDIDATE' }));
    const sel = selectModules(mods);
    assert.equal(sel.wire.length, 200);
    assert.equal(sel.wire[0].lines, 299); // sorted desc
    assert.equal(sel.wire[199].lines, 100);
  });
  test('selects all DATABASEs', () => {
    const mods = [];
    for (let i = 0; i < 50; i++) mods.push(mkMod({ name: `D${i}`, path: `d${i}.js`, dup_status: 'DATABASE' }));
    const sel = selectModules(mods);
    assert.equal(sel.db.length, 50);
  });
  test('selects all DUPs', () => {
    const mods = [];
    for (let i = 0; i < 30; i++) mods.push(mkMod({ name: `U${i}`, path: `u${i}.js`, dup_status: 'DUP_KEEP_EXISTING', matched_engine: `Engine${i}` }));
    const sel = selectModules(mods);
    assert.equal(sel.dup.length, 30);
  });
  test('excludes STUB and META', () => {
    const mods = [
      mkMod({ name: 'A', path: 'a.js', dup_status: 'STUB' }),
      mkMod({ name: 'B', path: 'b.json', dup_status: 'META' }),
      mkMod({ name: 'C', path: 'c.js', dup_status: 'WIRE_CANDIDATE' }),
    ];
    const sel = selectModules(mods);
    assert.equal(sel.wire.length, 1);
    assert.equal(sel.db.length, 0);
    assert.equal(sel.dup.length, 0);
    assert.equal(sel.partial.length, 0);
  });
});

describe('build()', () => {
  test('emits node per WIRE + edge to dispatcher', () => {
    const doc = { modules: [mkMod({ dup_status: 'WIRE_CANDIDATE' })] };
    const r = build(doc);
    assert.equal(r.newNodes.length, 1);
    assert.equal(r.newEdges.length, 1);
    assert.equal(r.newEdges[0].type, 'wire_target');
    assert.equal(r.newEdges[0].to, 'prism_ai');
    assert.equal(r.stats.wire_edges, 1);
    assert.equal(r.stats.dup_edges, 0);
  });
  test('emits node + bridge edge for DUP_KEEP_EXISTING', () => {
    const doc = { modules: [mkMod({ dup_status: 'DUP_KEEP_EXISTING', matched_engine: 'ChatterPredictionEngine' })] };
    const r = build(doc);
    assert.equal(r.newNodes.length, 1);
    assert.equal(r.newEdges.length, 1);
    assert.equal(r.newEdges[0].type, 'bridge_to_existing');
    assert.equal(r.newEdges[0].to, 'ChatterPredictionEngine');
  });
  test('emits BOTH bridge + wire edge for PARTIAL_OVERLAP', () => {
    const doc = { modules: [mkMod({ dup_status: 'PARTIAL_OVERLAP', matched_engine: 'BayesianLearning' })] };
    const r = build(doc);
    assert.equal(r.newNodes.length, 1);
    assert.equal(r.newEdges.length, 2);
    const types = r.newEdges.map(e => e.type).sort();
    assert.deepEqual(types, ['bridge_to_existing', 'wire_target']);
  });
  test('parent roost matches stockpile convention', () => {
    const docA = { modules: [mkMod({ source_stockpile: 'extracted_modules', category: 'GIANT' })] };
    const docB = { modules: [mkMod({ source_stockpile: 'extracted', category: 'engines' })] };
    const rA = build(docA);
    const rB = build(docB);
    assert.equal(rA.newNodes[0].parent, 'ghost.extracted_modules.giant');
    assert.equal(rB.newNodes[0].parent, 'ghost.extracted.engines');
  });
  test('color reflects dup_status (operator visual triage)', () => {
    const cases = [
      ['WIRE_CANDIDATE', 'amber'],
      ['PARTIAL_OVERLAP', 'yellow'],
      ['DUP_KEEP_EXISTING', 'green'],
      ['DATABASE', 'blue'],
    ];
    for (const [status, color] of cases) {
      const r = build({ modules: [mkMod({ dup_status: status, matched_engine: 'X' })] });
      assert.equal(r.newNodes[0].color, color, `${status} should be ${color}`);
    }
  });
  test('deduplicates identical node ids (idempotent across re-runs)', () => {
    const m = mkMod({ dup_status: 'WIRE_CANDIDATE' });
    const r = build({ modules: [m, m] }); // same path twice
    assert.equal(r.newNodes.length, 1);
  });
  test('handles empty manifest gracefully', () => {
    const r = build({ modules: [] });
    assert.equal(r.newNodes.length, 0);
    assert.equal(r.newEdges.length, 0);
  });
  test('schemaVersion + generatedAt + stats present', () => {
    const r = build({ modules: [mkMod()] });
    assert.equal(r.schemaVersion, '1.0.0');
    assert.ok(r.generatedAt);
    assert.ok(r.stats);
    assert.equal(r.stats.total_new_nodes, 1);
  });
});

describe('live manifest + classified shape smoke', () => {
  test('manifest exists with expected fields', () => {
    const p = 'H:/PRISM/state/shared/extracted-modules-manifest.json';
    if (!fs.existsSync(p)) {
      // Cold-start case — skip with diagnostic, not a fail
      console.warn(`  SKIP: ${p} not present (run build-extracted-modules-manifest.mjs)`);
      return;
    }
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.equal(m.schemaVersion, '1.0.0');
    assert.ok(Array.isArray(m.modules));
    assert.ok(m.summary.total_modules > 0);
    assert.ok(m.modules.every(x => typeof x.path === 'string' && typeof x.lines === 'number'));
  });
  test('classified file has dup_status on every row', () => {
    const p = 'H:/PRISM/state/shared/extracted-modules-classified.json';
    if (!fs.existsSync(p)) {
      console.warn(`  SKIP: ${p} not present (run classify-extracted-modules.mjs)`);
      return;
    }
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.equal(c.schemaVersion, '1.0.0');
    assert.ok(c.modules.every(m => typeof m.dup_status === 'string'));
    const validStatuses = ['WIRE_CANDIDATE', 'PARTIAL_OVERLAP', 'DUP_KEEP_EXISTING', 'DATABASE', 'STUB', 'META'];
    assert.ok(c.modules.every(m => validStatuses.includes(m.dup_status)));
  });
  test('detail augmentation has nodes + edges aligned with cap', () => {
    const p = 'H:/PRISM/state/shared/system-viz/extracted-modules-detail-augmentation.json';
    if (!fs.existsSync(p)) {
      console.warn(`  SKIP: ${p} not present (run generate-extracted-modules-detail-features.mjs)`);
      return;
    }
    const a = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.equal(a.schemaVersion, '1.0.0');
    assert.ok(a.stats.selected_wire <= 200, 'wire cap honored');
    assert.equal(a.stats.total_new_nodes, a.newNodes.length);
    assert.equal(a.stats.total_new_edges, a.newEdges.length);
    assert.equal(a.stats.dup_edges + a.stats.wire_edges, a.newEdges.length);
  });
});
