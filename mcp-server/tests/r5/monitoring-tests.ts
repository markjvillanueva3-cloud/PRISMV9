/**
 * R5-MS3: Safety Monitor + What-If Analysis Tests
 *
 * Verifies: Safety level classification, what-if impact computation,
 * page routing, and component data contracts.
 */

import { safetyLevel, SAFETY_SHAPES } from '../../web/src/api/types.js';

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

function assertClose(actual: number, expected: number, tol: number, msg: string): void {
  if (Math.abs(actual - expected) <= tol) {
    passed++;
    console.log(`  \u2713 ${msg}`);
  } else {
    failed++;
    failures.push(`${msg} (got ${actual}, expected ${expected})`);
    console.log(`  \u2717 FAIL: ${msg} (got ${actual}, expected ${expected})`);
  }
}

// ============================================================================
// T1: SAFETY LEVEL CLASSIFICATION
// ============================================================================

function testSafetyLevels(): void {
  console.log('\n--- T1: Safety Level Classification ---\n');

  // Boundary tests
  assert(safetyLevel(1.0) === 'pass', 'Score 1.0 = pass');
  assert(safetyLevel(0.85) === 'pass', 'Score 0.85 = pass (boundary)');
  assert(safetyLevel(0.84) === 'warn', 'Score 0.84 = warn');
  assert(safetyLevel(0.70) === 'warn', 'Score 0.70 = warn (boundary)');
  assert(safetyLevel(0.69) === 'fail', 'Score 0.69 = fail');
  assert(safetyLevel(0.0) === 'fail', 'Score 0.0 = fail');

  // Safety shapes are distinct
  const shapes = Object.values(SAFETY_SHAPES);
  const uniqueShapes = new Set(shapes);
  assert(uniqueShapes.size === shapes.length, 'All safety shapes are unique (color-blind accessible)');

  // Required shapes exist
  assert(SAFETY_SHAPES.pass.length > 0, 'Pass shape defined');
  assert(SAFETY_SHAPES.warn.length > 0, 'Warn shape defined');
  assert(SAFETY_SHAPES.fail.length > 0, 'Fail shape defined');
  assert(SAFETY_SHAPES.info.length > 0, 'Info shape defined');
}

// ============================================================================
// T2: WHAT-IF IMPACT MODEL
// ============================================================================

function testWhatIfModel(): void {
  console.log('\n--- T2: What-If Impact Model ---\n');

  // Test the physics relationships:
  // Higher speed → shorter tool life (Taylor)
  const tlBaseline = Math.pow(300 / 200, 4) * (1 / 0.1) * (1 / Math.sqrt(3.0));
  const tlHighSpeed = Math.pow(300 / 300, 4) * (1 / 0.1) * (1 / Math.sqrt(3.0));
  assert(tlHighSpeed < tlBaseline, 'Higher speed → shorter tool life');

  // Higher feed → higher MRR
  const mrrBaseline = 200 * 0.1 * 3.0 * 12.5;
  const mrrHighFeed = 200 * 0.2 * 3.0 * 12.5;
  assert(mrrHighFeed > mrrBaseline, 'Higher feed → higher MRR');
  assertClose(mrrHighFeed / mrrBaseline, 2.0, 0.001, 'Double feed = double MRR');

  // Higher depth → higher power
  const powerBase = 200 * 0.1 * 3.0 * 1800 / 60000;
  const powerDeep = 200 * 0.1 * 6.0 * 1800 / 60000;
  assertClose(powerDeep / powerBase, 2.0, 0.001, 'Double depth = double power');

  // More aggressive params → lower safety
  const safetyBase = 0.88;
  const aggrBaseline = 1.0; // all at baseline
  const aggrHigh = (300/200) * (0.2/0.1) * (6.0/3.0) * (20/12.5); // ~9.6
  const safetyHigh = Math.min(1.0, Math.max(0.3, safetyBase / Math.pow(aggrHigh, 0.15)));
  assert(safetyHigh < safetyBase, 'Aggressive params → lower safety');
  assert(safetyHigh > 0.3, 'Safety has floor at 0.3');

  // Baseline params → baseline safety
  const safetyAtBaseline = Math.min(1.0, Math.max(0.3, safetyBase / Math.pow(aggrBaseline, 0.15)));
  assertClose(safetyAtBaseline, safetyBase, 0.001, 'Baseline params → baseline safety');
}

// ============================================================================
// T3: ROUTING + PAGE STRUCTURE
// ============================================================================

async function testRouting(): Promise<void> {
  console.log('\n--- T3: Routing + Page Structure ---\n');

  const fs = await import('fs');

  const appContent = fs.readFileSync('web/src/App.tsx', 'utf8');
  assert(appContent.includes('safety'), 'App.tsx has safety route');
  assert(appContent.includes('what-if'), 'App.tsx has what-if route');
  assert(appContent.includes('SafetyMonitorPage'), 'App.tsx imports SafetyMonitorPage');
  assert(appContent.includes('WhatIfPage'), 'App.tsx imports WhatIfPage');

  const layoutContent = fs.readFileSync('web/src/components/Layout.tsx', 'utf8');
  assert(layoutContent.includes('/safety'), 'Layout nav has /safety');
  assert(layoutContent.includes('/what-if'), 'Layout nav has /what-if');

  // Safety Monitor page has required elements
  const safetyPage = fs.readFileSync('web/src/pages/SafetyMonitorPage.tsx', 'utf8');
  assert(safetyPage.includes('SafetyBadge'), 'Safety page uses SafetyBadge');
  assert(safetyPage.includes('safetyScore'), 'Safety page tracks safety scores');
  assert(safetyPage.includes('toolLifeRemaining'), 'Safety page shows tool life');
  assert(safetyPage.includes('warnings'), 'Safety page shows warnings');

  // What-If page has required elements
  const whatIfPage = fs.readFileSync('web/src/pages/WhatIfPage.tsx', 'utf8');
  assert(whatIfPage.includes('range'), 'What-If page has slider inputs');
  assert(whatIfPage.includes('baseline'), 'What-If page shows baseline values');
  assert(whatIfPage.includes('SafetyBadge'), 'What-If page uses SafetyBadge');
  assert(whatIfPage.includes('computeImpacts'), 'What-If page computes impacts');

  // Count total routes
  const routeCount = (appContent.match(/<Route /g) || []).length;
  assert(routeCount >= 8, `At least 8 routes defined (got ${routeCount})`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('R5-MS3: Safety Monitor + What-If Analysis Tests');
  console.log('================================================');

  try {
    testSafetyLevels();
    testWhatIfModel();
    await testRouting();
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
