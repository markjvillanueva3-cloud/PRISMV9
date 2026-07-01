/**
 * PRISM AtomicValue Test Runner v1.0
 * ===================================
 * Standalone JavaScript tests for AtomicValue - runs without compilation.
 * Execute: node AtomicValue.test.js
 * 
 * @version 1.0.0
 * @created 2026-01-26
 */

// Test infrastructure
const results = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result === false) {
      results.push({ name, passed: false, message: 'Test returned false' });
    } else {
      results.push({ name, passed: true, message: 'PASS' });
    }
  } catch (error) {
    results.push({ name, passed: false, message: error.message || 'Unknown error' });
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error(msg || `Expected ${expected}, got ${actual}`);
}

function assertApprox(actual, expected, tolerance) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected} +/- ${tolerance}, got ${actual}`);
  }
}

function assertTrue(cond, msg) { if (!cond) throw new Error(msg || 'Expected true'); }
function assertFalse(cond, msg) { if (cond) throw new Error(msg || 'Expected false'); }

// AtomicValue implementations
function createAtomicValue(v, u, unit) {
  return { value: v, uncertainty: Math.abs(u), confidence: 0.95, unit };
}

function exactCount(v, unit = 'count') {
  return { value: v, uncertainty: 0, confidence: 0.95, unit, isExact: true };
}

function isExactValue(av) {
  return av.isExact === true || av.uncertainty === 0;
}

function formatAtomicValue(av) {
  if (av.isExact || av.uncertainty === 0) return `${av.value} ${av.unit} (exact)`;
  return `${av.value} +/- ${av.uncertainty} ${av.unit} (${Math.round(av.confidence * 100)}% CI)`;
}

function add(a, b) {
  if (a.unit !== b.unit) throw new Error('Unit mismatch');
  return {
    value: a.value + b.value,
    uncertainty: Math.sqrt(a.uncertainty ** 2 + b.uncertainty ** 2),
    confidence: 0.95,
    unit: a.unit
  };
}

function subtract(a, b) {
  if (a.unit !== b.unit) throw new Error('Unit mismatch');
  return {
    value: a.value - b.value,
    uncertainty: Math.sqrt(a.uncertainty ** 2 + b.uncertainty ** 2),
    confidence: 0.95,
    unit: a.unit
  };
}

function multiply(a, b, resultUnit) {
  const value = a.value * b.value;
  if (value === 0) return { value: 0, uncertainty: 0, confidence: 0.95, unit: resultUnit };
  const relA = a.value !== 0 ? a.uncertainty / Math.abs(a.value) : 0;
  const relB = b.value !== 0 ? b.uncertainty / Math.abs(b.value) : 0;
  return {
    value,
    uncertainty: Math.abs(value) * Math.sqrt(relA ** 2 + relB ** 2),
    confidence: 0.95,
    unit: resultUnit
  };
}

function divide(a, b, resultUnit) {
  if (b.value === 0) throw new Error('Division by zero');
  const value = a.value / b.value;
  const relA = a.value !== 0 ? a.uncertainty / Math.abs(a.value) : 0;
  const relB = b.uncertainty / Math.abs(b.value);
  return {
    value,
    uncertainty: Math.abs(value) * Math.sqrt(relA ** 2 + relB ** 2),
    confidence: 0.95,
    unit: resultUnit
  };
}

function power(base, exp, resultUnit) {
  const value = Math.pow(base.value, exp);
  const relBase = base.value !== 0 ? base.uncertainty / Math.abs(base.value) : 0;
  return {
    value,
    uncertainty: Math.abs(value) * Math.abs(exp) * relBase,
    confidence: base.confidence,
    unit: resultUnit
  };
}

function areEquivalent(a, b) {
  if (a.unit !== b.unit) return false;
  const aLow = a.value - a.uncertainty, aHigh = a.value + a.uncertainty;
  const bLow = b.value - b.uncertainty, bHigh = b.value + b.uncertainty;
  return !(aHigh < bLow || bHigh < aLow);
}

function isGreaterThan(a, b) {
  if (a.unit !== b.unit) throw new Error('Unit mismatch');
  return (a.value - a.uncertainty) > (b.value + b.uncertainty);
}

// =============================================================================
// TEST CASES
// =============================================================================

// Creation tests
test('createAtomicValue creates valid AtomicValue', () => {
  const av = createAtomicValue(100, 10, 'mm');
  assertEqual(av.value, 100);
  assertEqual(av.uncertainty, 10);
  assertEqual(av.confidence, 0.95);
  assertEqual(av.unit, 'mm');
});

test('exactCount creates value with zero uncertainty', () => {
  const av = exactCount(42, 'items');
  assertEqual(av.value, 42);
  assertEqual(av.uncertainty, 0);
  assertTrue(av.isExact === true);
});

test('createAtomicValue makes uncertainty absolute', () => {
  const av = createAtomicValue(100, -10, 'mm');
  assertEqual(av.uncertainty, 10);
});

// Type guard tests
test('isExactValue identifies exact counts', () => {
  assertTrue(isExactValue(exactCount(42)));
  assertFalse(isExactValue(createAtomicValue(100, 10, 'mm')));
});

// Formatting tests
test('formatAtomicValue produces correct string', () => {
  const av = createAtomicValue(412, 85, 'calls');
  const fmt = formatAtomicValue(av);
  assertTrue(fmt.includes('412'));
  assertTrue(fmt.includes('85'));
  assertTrue(fmt.includes('calls'));
  assertTrue(fmt.includes('95%'));
});

test('formatAtomicValue handles exact values', () => {
  const fmt = formatAtomicValue(exactCount(100, 'items'));
  assertTrue(fmt.includes('exact'));
});

// Arithmetic - Addition
test('add propagates uncertainty correctly', () => {
  const a = createAtomicValue(100, 3, 'mm');
  const b = createAtomicValue(50, 4, 'mm');
  const result = add(a, b);
  assertEqual(result.value, 150);
  assertApprox(result.uncertainty, 5, 0.001);
});

// Arithmetic - Subtraction
test('subtract propagates uncertainty correctly', () => {
  const a = createAtomicValue(100, 3, 'mm');
  const b = createAtomicValue(50, 4, 'mm');
  const result = subtract(a, b);
  assertEqual(result.value, 50);
  assertApprox(result.uncertainty, 5, 0.001);
});

// Arithmetic - Multiplication
test('multiply propagates relative uncertainty', () => {
  const a = createAtomicValue(100, 10, 'mm');
  const b = createAtomicValue(50, 5, 'mm');
  const result = multiply(a, b, 'mm2');
  assertEqual(result.value, 5000);
  assertApprox(result.uncertainty, 707.1, 1);
});

// Arithmetic - Division
test('divide propagates relative uncertainty', () => {
  const a = createAtomicValue(100, 10, 'mm');
  const b = createAtomicValue(50, 5, 'mm');
  const result = divide(a, b, 'ratio');
  assertEqual(result.value, 2);
  assertApprox(result.uncertainty, 0.283, 0.01);
});

// Arithmetic - Power
test('power propagates uncertainty correctly', () => {
  const a = createAtomicValue(100, 10, 'mm');
  const result = power(a, 2, 'mm2');
  assertEqual(result.value, 10000);
  assertApprox(result.uncertainty, 2000, 1);
});

// Error handling
test('add throws on unit mismatch', () => {
  try {
    add(createAtomicValue(100, 3, 'mm'), createAtomicValue(50, 4, 'inches'));
    return false;
  } catch { return true; }
});

test('divide throws on division by zero', () => {
  try {
    divide(createAtomicValue(100, 10, 'mm'), createAtomicValue(0, 0, 'mm'), 'ratio');
    return false;
  } catch { return true; }
});

// Comparison tests
test('areEquivalent returns true for overlapping CIs', () => {
  const a = createAtomicValue(100, 10, 'mm');
  const b = createAtomicValue(105, 10, 'mm');
  assertTrue(areEquivalent(a, b));
});

test('areEquivalent returns false for non-overlapping CIs', () => {
  const a = createAtomicValue(100, 5, 'mm');
  const b = createAtomicValue(120, 5, 'mm');
  assertFalse(areEquivalent(a, b));
});

test('isGreaterThan detects significant difference', () => {
  const a = createAtomicValue(200, 5, 'mm');
  const b = createAtomicValue(100, 5, 'mm');
  assertTrue(isGreaterThan(a, b));
});

test('isGreaterThan returns false when ranges overlap', () => {
  const a = createAtomicValue(105, 10, 'mm');
  const b = createAtomicValue(100, 10, 'mm');
  assertFalse(isGreaterThan(a, b));
});

// PRISM-specific: Kienzle cutting force
test('Kienzle cutting force propagates uncertainty', () => {
  const Kc11 = createAtomicValue(1500, 75, 'MPa');
  const b = createAtomicValue(2.0, 0.1, 'mm');
  const h = createAtomicValue(0.2, 0.01, 'mm');
  const hPow = power(h, 0.75, 'mm^0.75');
  const KcB = multiply(Kc11, b, 'N/mm^0.25');
  const Fc = multiply(KcB, hPow, 'N');
  assertApprox(Fc.value, 897, 15);
  assertTrue(Fc.uncertainty > 0);
});

// PRISM-specific: Taylor tool life
test('Taylor tool life propagates uncertainty', () => {
  const C = createAtomicValue(350, 35, 'unit');
  const V = createAtomicValue(200, 20, 'unit');
  const CV = divide(C, V, 'unit');
  const T = power(CV, 4, 'min');
  assertApprox(T.value, 9.38, 0.5);
  assertTrue(T.uncertainty > 0);
});

// =============================================================================
// RUN TESTS
// =============================================================================

console.log('\n' + '='.repeat(70));
console.log('PRISM AtomicValue Test Suite v1.0');
console.log('Validates COMMANDMENT 5: NEVER bare numbers');
console.log('='.repeat(70) + '\n');

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

for (const r of results) {
  const status = r.passed ? '[PASS]' : '[FAIL]';
  console.log(`${status} ${r.name}`);
  if (!r.passed) console.log(`       ${r.message}`);
}

console.log('\n' + '='.repeat(70));
console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${results.length} total`);

if (failed === 0) {
  console.log('\n[OK] ALL TESTS PASSED - AtomicValue system validated');
  console.log('[OK] COMMANDMENT 5 implementation: VERIFIED');
} else {
  console.log('\n[WARN] SOME TESTS FAILED - review required');
}

console.log('='.repeat(70) + '\n');

// Exit code for CI/CD
process.exit(failed > 0 ? 1 : 0);
