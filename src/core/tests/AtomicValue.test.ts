/**
 * PRISM AtomicValue Test Suite v1.0
 * ==================================
 * Comprehensive tests for AtomicValue types and uncertainty propagation.
 * 
 * @module prism/core/tests/AtomicValue.test
 * @version 1.0.0
 * @created 2026-01-26
 */

import {
  AtomicValue,
  createAtomicValue,
  exactCount,
  handbookValue,
  formatAtomicValue,
  parseAtomicValue,
  isAtomicValue,
  isExactValue,
  validateAtomicValue
} from '../AtomicValue.types';

import {
  add,
  subtract,
  multiply,
  divide,
  power,
  sqrt,
  sum,
  convertConfidence,
  areEquivalent,
  isGreaterThan,
  monteCarloPropagate
} from '../UncertaintyMath';

// =============================================================================
// TEST UTILITIES
// =============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

const results: TestResult[] = [];

function test(name: string, fn: () => boolean | { passed: boolean; message: string }): void {
  try {
    const result = fn();
    if (typeof result === 'boolean') {
      results.push({ name, passed: result, message: result ? 'PASS' : 'FAIL' });
    } else {
      results.push({ name, ...result });
    }
  } catch (error) {
    results.push({ 
      name, 
      passed: false, 
      message: `ERROR: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
}

function assertClose(actual: number, expected: number, tolerance: number = 0.01): boolean {
  return Math.abs(actual - expected) <= tolerance * Math.abs(expected);
}

// =============================================================================
// ATOMIC VALUE CREATION TESTS
// =============================================================================

test('createAtomicValue: basic creation', () => {
  const av = createAtomicValue(100, 10, 'mm');
  return av.value === 100 && av.uncertainty === 10 && av.unit === 'mm' && av.confidence === 0.95;
});

test('createAtomicValue: negative uncertainty becomes positive', () => {
  const av = createAtomicValue(100, -10, 'mm');
  return av.uncertainty === 10;
});

test('exactCount: creates exact value', () => {
  const av = exactCount(42, 'items');
  return av.value === 42 && av.uncertainty === 0 && av.isExact === true;
});

test('handbookValue: includes source reference', () => {
  const av = handbookValue(200, 15, 'MPa', 'ASM Handbook Vol. 1, p. 234');
  return (
    av.value === 200 &&
    av.uncertainty === 15 &&
    av.source?.type === 'HANDBOOK' &&
    av.source?.reference?.includes('ASM')
  );
});

// =============================================================================
// TYPE GUARD TESTS
// =============================================================================

test('isAtomicValue: valid object returns true', () => {
  const av = createAtomicValue(100, 10, 'mm');
  return isAtomicValue(av);
});

test('isAtomicValue: plain number returns false', () => {
  return !isAtomicValue(100);
});

test('isAtomicValue: missing fields returns false', () => {
  return !isAtomicValue({ value: 100, uncertainty: 10 });
});

test('isExactValue: exact count returns true', () => {
  return isExactValue(exactCount(42));
});

test('isExactValue: value with uncertainty returns false', () => {
  return !isExactValue(createAtomicValue(100, 10, 'mm'));
});

// =============================================================================
// FORMATTING AND PARSING TESTS
// =============================================================================

test('formatAtomicValue: standard format', () => {
  const av = createAtomicValue(412, 85, 'calls');
  const formatted = formatAtomicValue(av);
  return formatted === '412 +/- 85 calls (95% CI)';
});

test('formatAtomicValue: exact value format', () => {
  const av = exactCount(1540, 'materials');
  const formatted = formatAtomicValue(av);
  return formatted === '1540 materials (exact)';
});

test('parseAtomicValue: full format', () => {
  const av = parseAtomicValue('412 +/- 85 calls (95% CI)');
  return av !== null && av.value === 412 && av.uncertainty === 85 && av.confidence === 0.95;
});

test('parseAtomicValue: simple format adds 10% uncertainty', () => {
  const av = parseAtomicValue('100 mm');
  return av !== null && av.value === 100 && av.uncertainty === 10;
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

test('validateAtomicValue: valid value passes', () => {
  const result = validateAtomicValue(createAtomicValue(100, 10, 'mm'));
  return result.valid && result.errors.length === 0;
});

test('validateAtomicValue: negative uncertainty fails', () => {
  const av: AtomicValue = { value: 100, uncertainty: -10, confidence: 0.95, unit: 'mm' };
  const result = validateAtomicValue(av);
  return !result.valid && result.errors.some(e => e.includes('negative'));
});

test('validateAtomicValue: exact with uncertainty fails', () => {
  const av: AtomicValue = { value: 100, uncertainty: 10, confidence: 0.95, unit: 'mm', isExact: true };
  const result = validateAtomicValue(av);
  return !result.valid && result.errors.some(e => e.includes('Exact'));
});

// =============================================================================
// ARITHMETIC TESTS
// =============================================================================

test('add: values with same units', () => {
  const a = createAtomicValue(100, 10, 'mm');
  const b = createAtomicValue(50, 5, 'mm');
  const result = add(a, b);
  // value = 150, uncertainty = sqrt(10^2 + 5^2) = sqrt(125) = 11.18
  return result.value === 150 && assertClose(result.uncertainty, 11.18, 0.01);
});

test('add: different units throws error', () => {
  const a = createAtomicValue(100, 10, 'mm');
  const b = createAtomicValue(50, 5, 'inches');
  try {
    add(a, b);
    return false;
  } catch (e) {
    return true;
  }
});

test('subtract: uncertainty propagates correctly', () => {
  const a = createAtomicValue(100, 10, 'mm');
  const b = createAtomicValue(30, 5, 'mm');
  const result = subtract(a, b);
  // value = 70, uncertainty = sqrt(10^2 + 5^2) = 11.18
  return result.value === 70 && assertClose(result.uncertainty, 11.18, 0.01);
});

test('multiply: relative uncertainty propagates', () => {
  const a = createAtomicValue(100, 10, 'mm');  // 10% relative
  const b = createAtomicValue(2, 0.1, 'ratio'); // 5% relative
  const result = multiply(a, b, 'mm');
  // value = 200
  // relative uncertainty = sqrt(0.1^2 + 0.05^2) = 0.1118
  // absolute uncertainty = 200 * 0.1118 = 22.36
  return result.value === 200 && assertClose(result.uncertainty, 22.36, 0.02);
});

test('divide: handles relative uncertainty', () => {
  const a = createAtomicValue(100, 10, 'mm');
  const b = createAtomicValue(2, 0.1, 'ratio');
  const result = divide(a, b, 'mm');
  // value = 50
  // relative uncertainty = sqrt(0.1^2 + 0.05^2) = 0.1118
  // absolute uncertainty = 50 * 0.1118 = 5.59
  return result.value === 50 && assertClose(result.uncertainty, 5.59, 0.02);
});

test('divide: zero divisor throws error', () => {
  const a = createAtomicValue(100, 10, 'mm');
  const b = createAtomicValue(0, 0, 'ratio');
  try {
    divide(a, b, 'mm');
    return false;
  } catch (e) {
    return true;
  }
});

// =============================================================================
// POWER AND EXPONENTIAL TESTS
// =============================================================================

test('power: square with uncertainty', () => {
  const a = createAtomicValue(10, 1, 'mm'); // 10% relative
  const result = power(a, 2, 'mm2');
  // value = 100
  // relative uncertainty = 2 * 0.1 = 0.2
  // absolute uncertainty = 100 * 0.2 = 20
  return result.value === 100 && assertClose(result.uncertainty, 20, 0.01);
});

test('sqrt: propagates uncertainty correctly', () => {
  const a = createAtomicValue(100, 20, 'mm2'); // 20% relative
  const result = sqrt(a, 'mm');
  // value = 10
  // relative uncertainty = 0.5 * 0.2 = 0.1
  // absolute uncertainty = 10 * 0.1 = 1
  return result.value === 10 && assertClose(result.uncertainty, 1, 0.01);
});

// =============================================================================
// CONFIDENCE CONVERSION TESTS
// =============================================================================

test('convertConfidence: 68% to 95%', () => {
  const av = createAtomicValue(100, 10, 'mm');
  av.confidence = 0.68;
  const converted = convertConfidence(av, 0.95);
  // 95% CI = 68% CI * (1.96 / 1.0) = 10 * 1.96 = 19.6
  return converted.confidence === 0.95 && assertClose(converted.uncertainty, 19.6, 0.01);
});

test('convertConfidence: same level returns same value', () => {
  const av = createAtomicValue(100, 10, 'mm');
  const converted = convertConfidence(av, 0.95);
  return converted.uncertainty === 10;
});

// =============================================================================
// AGGREGATION TESTS
// =============================================================================

test('sum: multiple values', () => {
  const values = [
    createAtomicValue(100, 10, 'mm'),
    createAtomicValue(50, 5, 'mm'),
    createAtomicValue(25, 3, 'mm')
  ];
  const result = sum(values);
  // value = 175
  // uncertainty = sqrt(10^2 + 5^2 + 3^2) = sqrt(134) = 11.58
  return result.value === 175 && assertClose(result.uncertainty, 11.58, 0.01);
});

// =============================================================================
// COMPARISON TESTS
// =============================================================================

test('areEquivalent: overlapping CIs return true', () => {
  const a = createAtomicValue(100, 10, 'mm'); // 90-110
  const b = createAtomicValue(105, 10, 'mm'); // 95-115
  return areEquivalent(a, b);
});

test('areEquivalent: non-overlapping CIs return false', () => {
  const a = createAtomicValue(100, 5, 'mm'); // 95-105
  const b = createAtomicValue(120, 5, 'mm'); // 115-125
  return !areEquivalent(a, b);
});

test('isGreaterThan: statistically significant difference', () => {
  const a = createAtomicValue(150, 5, 'mm'); // 145-155
  const b = createAtomicValue(100, 5, 'mm'); // 95-105
  return isGreaterThan(a, b);
});

test('isGreaterThan: overlapping values return false', () => {
  const a = createAtomicValue(105, 10, 'mm'); // 95-115
  const b = createAtomicValue(100, 10, 'mm'); // 90-110
  return !isGreaterThan(a, b);
});

// =============================================================================
// MONTE CARLO TEST
// =============================================================================

test('monteCarloPropagate: complex formula', () => {
  // Test: f(x,y) = x^2 + y for x=10+/-1, y=5+/-0.5
  const x = createAtomicValue(10, 1, 'mm');
  const y = createAtomicValue(5, 0.5, 'mm2');
  
  const result = monteCarloPropagate([x, y], ([xVal, yVal]) => xVal * xVal + yVal, 'mm2', 10000);
  
  // Expected: 10^2 + 5 = 105
  // Uncertainty from analytical: sqrt((2*10*1)^2 + 0.5^2) = sqrt(400.25) = 20.01
  return assertClose(result.value, 105, 0.05) && assertClose(result.uncertainty, 20, 0.15);
});

// =============================================================================
// PRISM PHYSICS FORMULA TESTS
// =============================================================================

test('Kienzle cutting force propagation', () => {
  // Fc = Kc1.1 * b * h^(1-mc)
  // Kc1.1 = 1800 +/- 180 N/mm2
  // b = 2 +/- 0.1 mm
  // h = 0.2 +/- 0.02 mm
  // mc = 0.25 +/- 0.03
  
  const Kc11 = createAtomicValue(1800, 180, 'N/mm2');
  const b = createAtomicValue(2, 0.1, 'mm');
  const h = createAtomicValue(0.2, 0.02, 'mm');
  const mc = createAtomicValue(0.25, 0.03, 'ratio');
  
  // Using Monte Carlo for complex formula
  const Fc = monteCarloPropagate(
    [Kc11, b, h, mc],
    ([kc, bVal, hVal, mcVal]) => kc * bVal * Math.pow(hVal, 1 - mcVal),
    'N',
    10000
  );
  
  // Expected: 1800 * 2 * 0.2^0.75 = 1800 * 2 * 0.2991 = 1076.8 N
  // Uncertainty should be roughly 15-25% given input uncertainties
  const expectedFc = 1800 * 2 * Math.pow(0.2, 0.75);
  return assertClose(Fc.value, expectedFc, 0.05);
});

test('Taylor tool life propagation', () => {
  // V * T^n = C
  // T = (C/V)^(1/n)
  // V = 200 +/- 20 m/min
  // C = 400 +/- 40
  // n = 0.25 +/- 0.02
  
  const V = createAtomicValue(200, 20, 'm/min');
  const C = createAtomicValue(400, 40, 'constant');
  const n = createAtomicValue(0.25, 0.02, 'ratio');
  
  const T = monteCarloPropagate(
    [V, C, n],
    ([vVal, cVal, nVal]) => Math.pow(cVal / vVal, 1 / nVal),
    'min',
    10000
  );
  
  // Expected: (400/200)^(1/0.25) = 2^4 = 16 min
  return assertClose(T.value, 16, 0.1);
});

// =============================================================================
// RUN TESTS AND REPORT
// =============================================================================

function runTests(): void {
  console.log('\\n' + '='.repeat(70));
  console.log('PRISM AtomicValue Test Suite v1.0');
  console.log('='.repeat(70) + '\\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  // Print results
  results.forEach(r => {
    const status = r.passed ? '[PASS]' : '[FAIL]';
    console.log(`${status} ${r.name}`);
    if (!r.passed) {
      console.log(`       ${r.message}`);
    }
  });
  
  // Summary
  console.log('\\n' + '-'.repeat(70));
  console.log(`Results: ${passed} passed, ${failed} failed, ${results.length} total`);
  console.log(`Pass rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log('-'.repeat(70) + '\\n');
  
  if (failed > 0) {
    console.log('FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }
}

// Export for use
export { runTests, results };

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}
