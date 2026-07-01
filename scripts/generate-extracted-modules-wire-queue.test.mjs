// scripts/generate-extracted-modules-wire-queue.test.mjs
// Tests for the iter-2 pick-unit-ready wire-queue generator (slot:papa /loop iter3).
// Run: rtk node --test scripts/generate-extracted-modules-wire-queue.test.mjs

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildQueue } from './generate-extracted-modules-wire-queue.mjs';

function mkRow(over = {}) {
  return {
    path: 'engines/ai_ml/PRISM_FOO.js',
    name: 'PRISM_FOO',
    source_stockpile: 'extracted',
    type: 'engine',
    lines: 1000,
    dup_status: 'WIRE_CANDIDATE',
    matched_engine: null,
    match_confidence: 0.0,
    recommended_dispatcher: 'prism_ai',
    ...over,
  };
}

describe('buildQueue', () => {
  test('filters to WIRE_CANDIDATE only', () => {
    const doc = { modules: [
      mkRow({ name: 'A', dup_status: 'WIRE_CANDIDATE' }),
      mkRow({ name: 'B', dup_status: 'DUP_KEEP_EXISTING' }),
      mkRow({ name: 'C', dup_status: 'DATABASE' }),
      mkRow({ name: 'D', dup_status: 'STUB' }),
    ]};
    const q = buildQueue(doc, 100);
    assert.equal(q.length, 1);
    assert.equal(q[0].name, 'A');
  });

  test('sorts by lines descending', () => {
    const doc = { modules: [
      mkRow({ name: 'small', lines: 50, path: 's.js' }),
      mkRow({ name: 'huge',  lines: 90000, path: 'h.js' }),
      mkRow({ name: 'med',   lines: 5000, path: 'm.js' }),
    ]};
    const q = buildQueue(doc, 10);
    assert.deepEqual(q.map(x => x.name), ['huge', 'med', 'small']);
  });

  test('honors top-K cap', () => {
    const doc = { modules: Array.from({ length: 100 }, (_, i) =>
      mkRow({ name: `M${i}`, path: `m${i}.js`, lines: i }))
    };
    const q = buildQueue(doc, 25);
    assert.equal(q.length, 25);
    // Output field is `est_lines` (pick-unit shape). Top-25 = 25 largest (99..75).
    assert.equal(q[0].est_lines, 99);
    assert.equal(q[24].est_lines, 75);
  });

  test('unit_id format: U-ABSORB-<TYPE>-<NAME>', () => {
    const doc = { modules: [mkRow({ name: 'PRISM_PSO_OPTIMIZER', type: 'algorithm' })] };
    const q = buildQueue(doc, 5);
    assert.equal(q[0].unit_id, 'U-ABSORB-ALGORITHM-PRISM_PSO_OPTIMIZER');
  });

  test('unit_id sanitizes special chars', () => {
    const doc = { modules: [mkRow({ name: 'a.b/c..d', type: 'ai-ml' })] };
    const q = buildQueue(doc, 5);
    // dots + slashes → underscores; ai-ml has '-' → '_'
    assert.equal(q[0].unit_id, 'U-ABSORB-AI_ML-A_B_C_D');
  });

  test('why-line includes lines + dispatcher + match confidence', () => {
    const doc = { modules: [mkRow({
      name: 'X', lines: 50000, recommended_dispatcher: 'prism_calc',
      matched_engine: 'YEngine', match_confidence: 0.65
    })] };
    const q = buildQueue(doc, 1);
    assert.ok(q[0].why.includes('50,000'), 'why should include comma-formatted lines');
    assert.ok(q[0].why.includes('prism_calc'), 'why should name dispatcher');
    assert.ok(q[0].why.includes('YEngine'), 'why should name matched engine for partials');
  });

  test('why-line says "no existing PRISM engine" when confidence ≤0.3', () => {
    const doc = { modules: [mkRow({ matched_engine: null, match_confidence: 0.0 })] };
    const q = buildQueue(doc, 1);
    assert.ok(q[0].why.includes('no existing PRISM engine'));
  });

  test('handles empty manifest', () => {
    assert.equal(buildQueue({ modules: [] }, 50).length, 0);
    assert.equal(buildQueue({}, 50).length, 0);
  });

  test('output schema has 9 fields per row', () => {
    const doc = { modules: [mkRow()] };
    const q = buildQueue(doc, 1);
    const expected = ['unit_id', 'source_path', 'source_stockpile', 'name',
                      'type', 'est_lines', 'recommended_dispatcher', 'confidence', 'why'];
    assert.deepEqual(Object.keys(q[0]).sort(), expected.sort());
  });
});

describe('live state file shape smoke', () => {
  test('extracted-modules-wire-queue.json is queue-shaped', () => {
    const p = 'H:/PRISM/state/shared/extracted-modules-wire-queue.json';
    if (!fs.existsSync(p)) { console.warn(`  SKIP: ${p} not present`); return; }
    const w = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.equal(w.schemaVersion, '1.0.0');
    assert.ok(Array.isArray(w.queue));
    assert.ok(w.summary.total === w.queue.length);
    assert.ok(w.queue.every(q => q.unit_id?.startsWith('U-ABSORB-')));
    assert.ok(w.queue.every(q => typeof q.est_lines === 'number' && q.est_lines > 0));
  });
});
