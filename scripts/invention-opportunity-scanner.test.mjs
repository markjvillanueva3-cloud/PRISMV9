// Tests for invention-opportunity-scanner.mjs pure-fn classifiers.
// Run: node --test scripts/invention-opportunity-scanner.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLeverage, mathDensity, heuristicDensity, detectDomain } from './invention-opportunity-scanner.mjs';

test('computeLeverage: high heuristic + low math + high crit = high leverage', () => {
  const r = computeLeverage({ criticality: 5, heuristicHits: 20, mathTermsTotal: 0 });
  assert.equal(r, 100);
});

test('computeLeverage: math-rich engines have suppressed leverage', () => {
  const r = computeLeverage({ criticality: 5, heuristicHits: 20, mathTermsTotal: 19 });
  assert.equal(r, 5);
});

test('computeLeverage: boundary — zero heuristics → zero leverage', () => {
  const r = computeLeverage({ criticality: 5, heuristicHits: 0, mathTermsTotal: 10 });
  assert.equal(r, 0);
});

test('computeLeverage: handles missing fields gracefully', () => {
  assert.equal(computeLeverage({}), 0);
  assert.equal(computeLeverage({ criticality: 5 }), 0);
});

test('mathDensity: counts category hits in canonical PRISM physics text', () => {
  const text = 'Uses Kienzle Fc = kc1.1 * ap * fz^(1-mc) and Taylor V*T^n=C with Johnson-Cook constitutive model.';
  const r = mathDensity(text);
  assert.ok(r.total >= 3, `expected at least 3 hits, got ${r.total}`);
  assert.ok(r.byCategory.physics_constitutive >= 3, 'expected physics_constitutive hits');
});

test('mathDensity: counts ML/AI vocabulary', () => {
  const r = mathDensity('Uses a neural network with LoRA fine-tuning and GraphSAGE embedding.');
  assert.ok(r.byCategory.ml_ai >= 3, 'expected ml_ai hits');
});

test('mathDensity: handles empty / non-math text', () => {
  assert.equal(mathDensity('').total, 0);
  assert.equal(mathDensity('A simple lookup table returns the result.').total, 0);
});

test('heuristicDensity: detects if-return-number, ternary, switch, lookups, random', () => {
  const text = `
    if (material === 'steel') return 1800;
    const r = isHard ? 0.5 : 0.3;
    switch (op) { case 'rough': return 0.4; }
    const v = lookup('feed_rate');
    return Math.random();
  `;
  const n = heuristicDensity(text);
  assert.ok(n >= 4, `expected at least 4 heuristic hits, got ${n}`);
});

test('heuristicDensity: rigorous math is NOT flagged as heuristic', () => {
  const text = `const force = kc1_1 * Math.pow(ap, exponent) * Math.pow(fz, 1 - mc);`;
  const n = heuristicDensity(text);
  assert.equal(n, 0);
});

test('detectDomain: routes by filename token', () => {
  assert.deepEqual(detectDomain('ChatterStabilityLobeEngine.ts').includes('physics'), true);
  assert.deepEqual(detectDomain('MastercamFunctionIndexEngine.ts').includes('cam'), true);
  assert.deepEqual(detectDomain('FanucPostProcessor.ts').includes('post') || detectDomain('FanucPostProcessor.ts').includes('controller'), true);
  assert.deepEqual(detectDomain('LathePartingEngine.ts').includes('lathe'), true);
  assert.deepEqual(detectDomain('WireEdmStrategy.ts').includes('wedm'), true);
});

test('detectDomain: unknown returns [other]', () => {
  assert.deepEqual(detectDomain('RandomThing.ts'), ['other']);
});
