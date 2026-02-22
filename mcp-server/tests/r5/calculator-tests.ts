/**
 * R5-MS1: Manufacturing Calculator Tests
 *
 * Verifies all 9 formula cards produce correct results, input validation
 * ranges are defined, and formula definitions are complete.
 *
 * Safety Rule: Opus review of formula display accuracy (per R5 spec).
 */

import { FORMULAS, type FormulaDefinition } from '../../web/src/formulas.js';

// ============================================================================
// TEST HARNESS
// ============================================================================

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, msg: string): void {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${msg}`);
  } else {
    failed++;
    failures.push(msg);
    console.log(`  \u2717 FAIL: ${msg}`);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, msg: string): void {
  const diff = Math.abs(actual - expected);
  const ok = diff <= tolerance;
  if (ok) {
    passed++;
    console.log(`  \u2713 ${msg} (got ${actual.toFixed(4)}, expected ${expected.toFixed(4)})`);
  } else {
    failed++;
    failures.push(`${msg} (got ${actual}, expected ${expected}, diff ${diff})`);
    console.log(`  \u2717 FAIL: ${msg} (got ${actual}, expected ${expected}, diff ${diff})`);
  }
}

// ============================================================================
// T1: FORMULA COLLECTION INTEGRITY
// ============================================================================

function testFormulaCollection(): void {
  console.log('\n--- T1: Formula Collection Integrity ---\n');

  assert(FORMULAS.length === 9, `Exactly 9 formulas defined (got ${FORMULAS.length})`);

  const ids = FORMULAS.map((f) => f.id);
  const uniqueIds = new Set(ids);
  assert(uniqueIds.size === 9, 'All formula IDs are unique');

  for (const f of FORMULAS) {
    assert(f.name.length > 0, `${f.id}: has name`);
    assert(f.description.length > 0, `${f.id}: has description`);
    assert(f.equation.length > 0, `${f.id}: has equation`);
    assert(f.equationSymbols.length > 0, `${f.id}: has equationSymbols`);
    assert(f.inputs.length >= 2, `${f.id}: has at least 2 inputs`);
    assert(f.outputName.length > 0, `${f.id}: has outputName`);
    assert(f.outputUnit.length > 0, `${f.id}: has outputUnit`);
    assert(typeof f.compute === 'function', `${f.id}: has compute function`);

    // Every input has range validation
    for (const input of f.inputs) {
      assert(input.min < input.max, `${f.id}/${input.name}: min < max`);
      assert(input.defaultValue >= input.min && input.defaultValue <= input.max,
        `${f.id}/${input.name}: default in range`);
    }
  }
}

// ============================================================================
// T2: FORMULA ACCURACY — Each formula vs hand-calculated reference
// ============================================================================

function testFormulaAccuracy(): void {
  console.log('\n--- T2: Formula Accuracy (9 formulas) ---\n');

  // 1. RPM: n = (200 * 1000) / (pi * 25) = 200000 / 78.5398 ≈ 2546.48
  const rpm = find('F-CALC-001');
  assertClose(rpm.compute({ Vc: 200, D: 25 }), 2546.479, 0.01, 'RPM: Vc=200, D=25');
  assertClose(rpm.compute({ Vc: 100, D: 10 }), 3183.099, 0.01, 'RPM: Vc=100, D=10');

  // 2. Feed Rate: Vf = 2500 * 0.1 * 4 = 1000
  const feed = find('F-CALC-002');
  assertClose(feed.compute({ n_rpm: 2500, fz: 0.1, z: 4 }), 1000, 0.001, 'Feed: n=2500, fz=0.1, z=4');
  assertClose(feed.compute({ n_rpm: 1000, fz: 0.05, z: 2 }), 100, 0.001, 'Feed: n=1000, fz=0.05, z=2');

  // 3. MRR: Q = (3 * 12.5 * 1000) / 1000 = 37.5 cm³/min
  const mrr = find('F-MRR-001');
  assertClose(mrr.compute({ ap: 3, ae: 12.5, vf: 1000 }), 37.5, 0.001, 'MRR: ap=3, ae=12.5, Vf=1000');

  // 4. Power: Pc = (850 * 200) / (60000 * 0.85) = 170000 / 51000 ≈ 3.333
  const power = find('F-POWER-001');
  assertClose(power.compute({ Fc: 850, Vc: 200, eta: 0.85 }), 3.333, 0.01, 'Power: Fc=850, Vc=200, eta=0.85');

  // 5. Torque: T = (3.5 * 30000) / (pi * 2500) = 105000 / 7853.98 ≈ 13.369
  const torque = find('F-CALC-005');
  assertClose(torque.compute({ P_kw: 3.5, n_rpm: 2500 }), 13.369, 0.01, 'Torque: P=3.5kW, n=2500');

  // 6. Surface Ra: Ra = (0.2² * 1000) / (32 * 0.8) = 40 / 25.6 ≈ 1.5625 µm
  const ra = find('F-SURFACE-001');
  assertClose(ra.compute({ f: 0.2, r: 0.8 }), 1.5625, 0.001, 'Ra: f=0.2, r=0.8');

  // 7. Surface Rz: Rz = (0.2² * 1000) / (8 * 0.8) = 40 / 6.4 = 6.25 µm
  const rz = find('F-SURFACE-RZ');
  assertClose(rz.compute({ f: 0.2, r: 0.8 }), 6.25, 0.001, 'Rz: f=0.2, r=0.8');

  // Rz should be 4x Ra for same inputs
  const raVal = ra.compute({ f: 0.2, r: 0.8 });
  const rzVal = rz.compute({ f: 0.2, r: 0.8 });
  assertClose(rzVal / raVal, 4.0, 0.001, 'Rz/Ra ratio = 4.0');

  // 8. Cost: Cost = (10 * 1.5) + (10/45 * 25) = 15 + 5.556 = 20.556
  const cost = find('F-COST-001');
  assertClose(cost.compute({ Tc: 10, Rm: 1.5, Tl: 45, Ct: 25 }), 20.556, 0.01, 'Cost: Tc=10, Rm=1.5, Tl=45, Ct=25');

  // 9. Taylor: T = (300/200)^(1/0.25) = 1.5^4 = 5.0625
  const taylor = find('F-TAYLOR-001');
  assertClose(taylor.compute({ C: 300, V: 200, n: 0.25 }), 5.0625, 0.001, 'Taylor: C=300, V=200, n=0.25');
  // Higher speed = shorter life
  const t1 = taylor.compute({ C: 300, V: 100, n: 0.25 });
  const t2 = taylor.compute({ C: 300, V: 200, n: 0.25 });
  assert(t1 > t2, 'Taylor: lower speed gives longer tool life');
}

// ============================================================================
// T3: FORMULA EDGE CASES & VALIDATION
// ============================================================================

function testFormulaEdgeCases(): void {
  console.log('\n--- T3: Edge Cases & Validation ---\n');

  // RPM with very small diameter should give very high RPM
  const rpm = find('F-CALC-001');
  const highRpm = rpm.compute({ Vc: 200, D: 1 });
  assert(highRpm > 60000, `Small D → high RPM: ${highRpm.toFixed(0)}`);

  // MRR with zero-like input
  const mrr = find('F-MRR-001');
  assertClose(mrr.compute({ ap: 0.01, ae: 0.01, vf: 1 }), 0.0000001, 0.0001, 'MRR: near-zero inputs');

  // Taylor with V = C → T = 1^(1/n) = 1
  const taylor = find('F-TAYLOR-001');
  assertClose(taylor.compute({ C: 300, V: 300, n: 0.25 }), 1.0, 0.001, 'Taylor: V=C gives T=1');

  // Cost with zero tool changes (Tl very large)
  const cost = find('F-COST-001');
  assertClose(cost.compute({ Tc: 10, Rm: 2, Tl: 99999, Ct: 100 }), 20.01, 0.1, 'Cost: near-zero tool changes');

  // All formulas compute with their default values without error
  for (const f of FORMULAS) {
    const defaults: Record<string, number> = {};
    for (const input of f.inputs) {
      defaults[input.name] = input.defaultValue;
    }
    const result = f.compute(defaults);
    assert(isFinite(result) && result > 0, `${f.id}: default inputs → finite positive result (${result.toFixed(4)})`);
  }
}

// ============================================================================
// T4: FORMULA ID MAPPING (server registry consistency)
// ============================================================================

function testFormulaIdMapping(): void {
  console.log('\n--- T4: Formula ID Mapping ---\n');

  // Known server-side formula IDs that must match
  const serverIds = [
    'F-CALC-001', 'F-CALC-002', 'F-CALC-005',
    'F-MRR-001', 'F-POWER-001', 'F-SURFACE-001', 'F-TAYLOR-001',
  ];

  for (const sid of serverIds) {
    const found = FORMULAS.find((f) => f.id === sid);
    assert(found !== undefined, `Server formula ${sid} exists in calculator`);
  }

  // Non-server formulas (UI-only) should also exist
  assert(FORMULAS.find((f) => f.id === 'F-SURFACE-RZ') !== undefined, 'F-SURFACE-RZ (UI-only) exists');
  assert(FORMULAS.find((f) => f.id === 'F-COST-001') !== undefined, 'F-COST-001 (UI-only) exists');
}

// ============================================================================
// HELPERS
// ============================================================================

function find(id: string): FormulaDefinition {
  const f = FORMULAS.find((f) => f.id === id);
  if (!f) throw new Error(`Formula ${id} not found`);
  return f;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('R5-MS1: Manufacturing Calculator Tests');
  console.log('======================================');

  try {
    testFormulaCollection();
    testFormulaAccuracy();
    testFormulaEdgeCases();
    testFormulaIdMapping();
  } catch (e: unknown) {
    console.log(`\n  \u2717 FATAL: ${e instanceof Error ? e.message : String(e)}`);
    failed++;
  }

  console.log(`\n=== Results: ${passed}/${passed + failed} passed, ${failed} failed ===\n`);
  if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
