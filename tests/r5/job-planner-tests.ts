/**
 * R5-MS2: Job Planner + Toolpath Advisor Tests
 *
 * Verifies: Job plan API contract, toolpath strategy data integrity,
 * strategy coverage for all 6 feature types, and rating consistency.
 */

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
// T1: JOB PLAN API CONTRACT (via mock dispatcher, same as dashboard-data-tests)
// ============================================================================

async function testJobPlanContract(): Promise<void> {
  console.log('\n--- T1: Job Plan API Contract ---\n');

  // Import the bridge and mock dispatcher from dashboard-data-tests pattern
  const fs = await import('fs');
  const pathMod = await import('path');
  const { ProtocolBridgeEngine } = await import('../../src/engines/ProtocolBridgeEngine.js');

  // Clear state
  const bridgeState = pathMod.join(process.cwd(), 'state', 'bridge');
  for (const f of ['endpoints.json', 'api_keys.json', 'request_log.jsonl']) {
    const fp = pathMod.join(bridgeState, f);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  const bridge = new ProtocolBridgeEngine({ max_endpoints: 50, max_api_keys: 20 });
  bridge.setDispatchHandler(async (dispatcher, action, params) => {
    if (dispatcher === 'prism_intelligence' && action === 'job_plan') {
      return {
        result: {
          operations: [
            { sequence: 1, type: 'facing', tool: 'Face Mill 63mm', speed_rpm: 800, feed_mmrev: 0.2, doc_mm: 3, time_min: 2.5 },
            { sequence: 2, type: 'roughing', tool: 'End Mill 25mm', speed_rpm: 1200, feed_mmrev: 0.15, doc_mm: 2, time_min: 8.0 },
            { sequence: 3, type: 'finishing', tool: 'Ball Nose 10mm', speed_rpm: 3000, feed_mmrev: 0.08, doc_mm: 0.5, time_min: 12.0 },
          ],
          total_time_min: 22.5,
          safety_score: 0.85,
          gcode_preview: 'G90 G21\nT1 M6\nS800 M3\nG0 X0 Y0 Z5\nG1 Z-3 F160\n...',
        },
        safety: { score: 0.85, warnings: ['Finishing pass near minimum chip thickness'] },
        meta: { formula_used: 'Multi-pass', uncertainty: 0.10 },
      };
    }
    return { result: {}, safety: { score: 0, warnings: [] }, meta: { formula_used: 'none', uncertainty: 1.0 } };
  });

  // Register endpoint
  const ep = bridge.registerEndpoint('rest', '/api/v1/job-plan', 'prism_intelligence', 'job_plan', 'api_key');
  const epId = ep.endpoint!.id;

  // Create key
  const key = bridge.createApiKey('Test Key', ['*']);
  const keyId = key.key_id!;

  // Call
  const resp = await bridge.routeRequest({
    request_id: `jp_test_${Date.now()}`,
    protocol: 'rest',
    endpoint_id: epId,
    dispatcher: 'prism_intelligence',
    action: 'job_plan',
    params: { material: 'AISI 4140', operation: 'bracket', machine: 'Haas VF-2' },
    auth: { method: 'api_key', key_id: keyId },
    timestamp: Date.now(),
  });

  assert(resp.status === 'success', 'Job plan: success status');
  const data = resp.data as Record<string, unknown>;
  assert('result' in data, 'Job plan: has result');
  assert('safety' in data, 'Job plan: has safety');
  assert('meta' in data, 'Job plan: has meta');

  const result = data.result as Record<string, unknown>;
  assert(Array.isArray(result.operations), 'Job plan result: operations is array');
  assert((result.operations as unknown[]).length === 3, 'Job plan result: 3 operations');
  assert(typeof result.total_time_min === 'number', 'Job plan result: total_time_min is number');
  assert(typeof result.gcode_preview === 'string', 'Job plan result: gcode_preview is string');

  // Verify operation structure
  const op = (result.operations as Record<string, unknown>[])[0];
  assert(typeof op.sequence === 'number', 'Operation: has sequence');
  assert(typeof op.type === 'string', 'Operation: has type');
  assert(typeof op.tool === 'string', 'Operation: has tool');
  assert(typeof op.speed_rpm === 'number', 'Operation: has speed_rpm');
  assert(typeof op.feed_mmrev === 'number', 'Operation: has feed_mmrev');
  assert(typeof op.doc_mm === 'number', 'Operation: has doc_mm');
  assert(typeof op.time_min === 'number', 'Operation: has time_min');
}

// ============================================================================
// T2: TOOLPATH STRATEGY DATA INTEGRITY
// ============================================================================

async function testToolpathStrategies(): Promise<void> {
  console.log('\n--- T2: Toolpath Strategy Data Integrity ---\n');

  // Import the strategy data by reading the file dynamically
  // (it's a React component, so we can't import it directly — extract the data)
  const fs = await import('fs');
  const content = fs.readFileSync('web/src/pages/ToolpathAdvisorPage.tsx', 'utf8');

  const featureTypes = ['pocket', 'slot', 'contour', 'facing', 'drilling', 'threading'];

  for (const feature of featureTypes) {
    // Check that each feature type has strategies defined
    assert(content.includes(`'${feature}'`), `Feature type '${feature}' defined in FEATURE_TYPES`);
    assert(content.includes(`${feature}:`), `Feature type '${feature}' has strategies in STRATEGY_MAP`);
  }

  assert(featureTypes.length === 6, 'All 6 feature types covered');

  // Count strategy entries (each has 'name:', 'description:', 'pros:', 'cons:')
  const strategyNameMatches = content.match(/name: '[^']+'/g) || [];
  // Filter to only strategy names (not feature type names or component names)
  const strategyCount = strategyNameMatches.filter(m =>
    !m.includes('Feature') && !m.includes('Toolpath') && m.length > 10
  ).length;
  assert(strategyCount >= 18, `At least 18 strategies defined (3 per feature, got ${strategyCount})`);

  // Every strategy should have safety_score between 0 and 1
  const safetyScores = content.match(/safety_score: ([\d.]+)/g) || [];
  for (const match of safetyScores) {
    const score = parseFloat(match.replace('safety_score: ', ''));
    assert(score >= 0 && score <= 1, `Safety score ${score} in valid range [0,1]`);
  }

  // All ratings should be 1-5
  const ratings = content.match(/(mrr_rating|finish_rating|tool_life_rating): (\d)/g) || [];
  for (const match of ratings) {
    const value = parseInt(match.split(': ')[1]);
    assert(value >= 1 && value <= 5, `Rating ${match} in valid range [1,5]`);
  }
}

// ============================================================================
// T3: ROUTING — Pages exist in App.tsx
// ============================================================================

async function testRouting(): Promise<void> {
  console.log('\n--- T3: Routing ---\n');

  const fs = await import('fs');
  const appContent = fs.readFileSync('web/src/App.tsx', 'utf8');

  assert(appContent.includes('job-planner'), 'App.tsx has job-planner route');
  assert(appContent.includes('toolpath'), 'App.tsx has toolpath route');
  assert(appContent.includes('JobPlannerPage'), 'App.tsx imports JobPlannerPage');
  assert(appContent.includes('ToolpathAdvisorPage'), 'App.tsx imports ToolpathAdvisorPage');

  const layoutContent = fs.readFileSync('web/src/components/Layout.tsx', 'utf8');
  assert(layoutContent.includes('/job-planner'), 'Layout nav has /job-planner');
  assert(layoutContent.includes('/toolpath'), 'Layout nav has /toolpath');
  assert(layoutContent.includes('Job Planner'), 'Layout nav has Job Planner label');
  assert(layoutContent.includes('Toolpath'), 'Layout nav has Toolpath label');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('R5-MS2: Job Planner + Toolpath Advisor Tests');
  console.log('=============================================');

  try {
    await testJobPlanContract();
    await testToolpathStrategies();
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
