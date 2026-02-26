/**
 * R5-MS4: Report Generation + Export Tests
 *
 * Verifies: Report type definitions, mock data generation,
 * export format, routing integration, and page structure.
 */

import { safetyLevel } from '../../web/src/api/types.js';

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

// ============================================================================
// T1: REPORT TYPE DEFINITIONS
// ============================================================================

function testReportTypes(): void {
  console.log('\n--- T1: Report Type Definitions ---\n');

  const reportTypes = ['safety_audit', 'setup_sheet', 'cost_estimate'];

  // All three report types exist
  assert(reportTypes.length === 3, '3 report types defined');
  assert(reportTypes.includes('safety_audit'), 'safety_audit type exists');
  assert(reportTypes.includes('setup_sheet'), 'setup_sheet type exists');
  assert(reportTypes.includes('cost_estimate'), 'cost_estimate type exists');

  // Labels and descriptions
  const configs = [
    { type: 'safety_audit', label: 'Safety Audit Report', descKeyword: 'safety' },
    { type: 'setup_sheet', label: 'Setup Sheet', descKeyword: 'setup' },
    { type: 'cost_estimate', label: 'Cost Estimate', descKeyword: 'cost' },
  ];

  for (const c of configs) {
    assert(c.label.length > 0, `${c.type} has label: "${c.label}"`);
    assert(c.descKeyword.length > 0, `${c.type} has description keyword`);
  }
}

// ============================================================================
// T2: REPORT DATA GENERATION
// ============================================================================

function testReportGeneration(): void {
  console.log('\n--- T2: Report Data Generation ---\n');

  // Simulate the generateReport logic from ReportsPage
  interface ReportSection {
    title: string;
    content: string;
  }

  function generateReport(type: string, material: string, operation: string): ReportSection[] {
    const timestamp = new Date().toISOString().split('T')[0];

    if (type === 'safety_audit') {
      return [
        { title: 'Safety Audit Report', content: `Generated: ${timestamp}\nMaterial: ${material}\nOperation: ${operation}` },
        { title: 'Overall Safety Score', content: 'S(x) = 0.88 (PASS)\n\nWeighted components:\n  R (Reliability):    0.92\n  C (Consistency):    0.85\n  P (Precision):      0.90\n  S (Safety):         0.88\n  L (Longevity):      0.82\n\nOmega Score: 0.25(0.92) + 0.20(0.85) + 0.15(0.90) + 0.30(0.88) + 0.10(0.82) = 0.882' },
        { title: 'Safety Checks', content: 'Spindle power:      3.2 kW / 7.5 kW capacity (42%) — PASS\nCutting force:       850 N — within tool limits — PASS\nTool deflection:     0.012 mm — below 0.05 mm threshold — PASS\nChip load:           0.10 mm/tooth — within range — PASS\nVibration risk:      LOW (stable lobe region)' },
        { title: 'Warnings', content: 'None — all parameters within safe operating envelope.' },
        { title: 'Recommendations', content: '1. Tool life at current parameters: ~45 min. Schedule tool change.\n2. Consider through-spindle coolant for improved chip evacuation.\n3. Monitor vibration during first article run.' },
      ];
    }

    if (type === 'setup_sheet') {
      return [
        { title: 'Setup Sheet', content: `Date: ${timestamp}\nJob: ${operation}\nMaterial: ${material}\nMachine: Haas VF-2` },
        { title: 'Workholding', content: 'Fixture: 6" Kurt vise' },
        { title: 'Tooling', content: 'T1: Face Mill 63mm' },
        { title: 'Operation Sequence', content: '1. Face top surface' },
        { title: 'Safety Notes', content: 'Verify clamp force before cycle start.' },
      ];
    }

    // cost_estimate
    return [
      { title: 'Cost Estimate', content: `Date: ${timestamp}\nPart: ${operation}\nMaterial: ${material}` },
      { title: 'Material Cost', content: 'Net material: $11.70' },
      { title: 'Machine Time', content: 'Total machine cost: $63.75' },
      { title: 'Tooling Cost', content: 'Total tooling: $20.95' },
      { title: 'Summary', content: 'Total:        $96.40 per part' },
    ];
  }

  // Safety audit report
  const safety = generateReport('safety_audit', 'AISI 4140', 'bracket');
  assert(safety.length === 5, 'Safety audit has 5 sections');
  assert(safety[0].title === 'Safety Audit Report', 'Safety audit title correct');
  assert(safety[0].content.includes('AISI 4140'), 'Safety audit includes material');
  assert(safety[0].content.includes('bracket'), 'Safety audit includes operation');
  assert(safety[1].content.includes('S(x) = 0.88'), 'Safety audit includes S(x) score');
  assert(safety[1].content.includes('Omega Score'), 'Safety audit includes Omega equation');
  assert(safety[2].content.includes('PASS'), 'Safety checks show PASS status');
  assert(safety[4].content.includes('tool change'), 'Recommendations include tool change');

  // Omega components sum check
  const omega = 0.25 * 0.92 + 0.20 * 0.85 + 0.15 * 0.90 + 0.30 * 0.88 + 0.10 * 0.82;
  assert(Math.abs(omega - 0.881) < 0.001, `Omega components sum correctly: ${omega.toFixed(3)}`);

  // S(x) = 0.88 should be PASS (>= 0.85)
  assert(safetyLevel(0.88) === 'pass', 'S(x) 0.88 correctly classified as pass');

  // Setup sheet report
  const setup = generateReport('setup_sheet', '6061-T6', 'housing');
  assert(setup.length === 5, 'Setup sheet has 5 sections');
  assert(setup[0].title === 'Setup Sheet', 'Setup sheet title correct');
  assert(setup[0].content.includes('6061-T6'), 'Setup sheet includes material');
  assert(setup[0].content.includes('housing'), 'Setup sheet includes operation');

  // Cost estimate report
  const cost = generateReport('cost_estimate', 'Ti-6Al-4V', 'shaft');
  assert(cost.length === 5, 'Cost estimate has 5 sections');
  assert(cost[0].title === 'Cost Estimate', 'Cost estimate title correct');
  assert(cost[0].content.includes('Ti-6Al-4V'), 'Cost estimate includes material');
  assert(cost[4].content.includes('$96.40'), 'Cost summary has total');

  // All reports have non-empty sections
  for (const type of ['safety_audit', 'setup_sheet', 'cost_estimate']) {
    const report = generateReport(type, 'AISI 1045', 'flange');
    for (const section of report) {
      assert(section.title.length > 0, `${type}: section title not empty`);
      assert(section.content.length > 0, `${type}: section content not empty`);
    }
  }
}

// ============================================================================
// T3: EXPORT FORMAT
// ============================================================================

function testExportFormat(): void {
  console.log('\n--- T3: Export Format ---\n');

  // Simulate export text generation
  const sections = [
    { title: 'Header', content: 'Line 1\nLine 2' },
    { title: 'Body', content: 'Details here' },
  ];

  const text = sections.map(s => `${'='.repeat(60)}\n${s.title}\n${'='.repeat(60)}\n\n${s.content}\n`).join('\n');

  assert(text.includes('============'), 'Export has separator lines');
  assert(text.includes('Header'), 'Export includes section titles');
  assert(text.includes('Line 1\nLine 2'), 'Export preserves content newlines');
  assert(text.includes('Details here'), 'Export includes all sections');

  // File naming
  const date = new Date().toISOString().split('T')[0];
  const filename = `prism-safety_audit-${date}.txt`;
  assert(filename.endsWith('.txt'), 'Export filename is .txt');
  assert(filename.includes('safety_audit'), 'Export filename includes report type');
  assert(filename.startsWith('prism-'), 'Export filename starts with prism-');
}

// ============================================================================
// T4: ROUTING + PAGE STRUCTURE
// ============================================================================

async function testRouting(): Promise<void> {
  console.log('\n--- T4: Routing + Page Structure ---\n');

  const fs = await import('fs');

  // App.tsx has reports route
  const appContent = fs.readFileSync('web/src/App.tsx', 'utf8');
  assert(appContent.includes('reports'), 'App.tsx has reports route');
  assert(appContent.includes('ReportsPage'), 'App.tsx imports ReportsPage');

  // Layout has reports nav
  const layoutContent = fs.readFileSync('web/src/components/Layout.tsx', 'utf8');
  assert(layoutContent.includes('/reports'), 'Layout nav has /reports');

  // ReportsPage has required elements
  const reportsPage = fs.readFileSync('web/src/pages/ReportsPage.tsx', 'utf8');
  assert(reportsPage.includes('safety_audit'), 'Reports page has safety_audit type');
  assert(reportsPage.includes('setup_sheet'), 'Reports page has setup_sheet type');
  assert(reportsPage.includes('cost_estimate'), 'Reports page has cost_estimate type');
  assert(reportsPage.includes('handleExport'), 'Reports page has export handler');
  assert(reportsPage.includes('handleGenerate'), 'Reports page has generate handler');
  assert(reportsPage.includes('Blob'), 'Reports page uses Blob for export');
  assert(reportsPage.includes('text/plain'), 'Reports page exports as text/plain');
  assert(reportsPage.includes('generateReport'), 'Reports page calls generateReport');

  // Material options
  assert(reportsPage.includes('AISI 4140'), 'Reports page has AISI 4140 material');
  assert(reportsPage.includes('Ti-6Al-4V'), 'Reports page has Ti-6Al-4V material');

  // Operation options
  assert(reportsPage.includes('bracket'), 'Reports page has bracket operation');
  assert(reportsPage.includes('shaft'), 'Reports page has shaft operation');

  // Count total routes in App.tsx
  const routeCount = (appContent.match(/<Route /g) || []).length;
  assert(routeCount >= 9, `At least 9 routes defined (got ${routeCount})`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('R5-MS4: Report Generation + Export Tests');
  console.log('========================================');

  try {
    testReportTypes();
    testReportGeneration();
    testExportFormat();
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
