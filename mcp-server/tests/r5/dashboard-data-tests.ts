/**
 * R5 Dashboard Data Layer Tests
 *
 * Tests that the bridge endpoints return data in the standard format
 * expected by the dashboard: { result, safety, meta }
 *
 * These tests verify the API contract between frontend and backend.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProtocolBridgeEngine, type DispatchHandler } from '../../src/engines/ProtocolBridgeEngine.js';

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
// MOCK DISPATCH HANDLER — Simulates PRISM dispatcher responses
// ============================================================================

const mockDispatcher: DispatchHandler = async (dispatcher, action, params) => {
  // Return standard format: { result, safety, meta }
  if (dispatcher === 'prism_calc' && action === 'speed_feed') {
    return {
      result: {
        speed_rpm: 1200, feed_mmrev: 0.25, doc_mm: 2.0,
        Vc_mmin: 180, Fc_N: 850, Pc_kW: 2.5, tool_life_min: 45,
        material: params.material || 'Unknown', tool: 'CoroMill 390',
      },
      safety: { score: 0.88, warnings: [] },
      meta: { formula_used: 'Kienzle', uncertainty: 0.08 },
    };
  }
  if (dispatcher === 'prism_intelligence' && action === 'job_plan') {
    return {
      result: {
        operations: [
          { sequence: 1, type: 'facing', tool: 'Face Mill', speed_rpm: 800, feed_mmrev: 0.2, doc_mm: 3, time_min: 2.5 },
          { sequence: 2, type: 'roughing', tool: 'End Mill', speed_rpm: 1200, feed_mmrev: 0.15, doc_mm: 2, time_min: 8.0 },
        ],
        total_time_min: 10.5,
        safety_score: 0.82,
      },
      safety: { score: 0.82, warnings: ['Roughing pass near spindle limit'] },
      meta: { formula_used: 'Multi-pass', uncertainty: 0.12 },
    };
  }
  if (dispatcher === 'prism_data' && action === 'material_get') {
    return {
      result: {
        id: params.id || 'aisi_4140', name: 'AISI 4140', iso_group: 'P',
        hardness_hrc: 28, tensile_mpa: 655, density_kgm3: 7850,
        machinability_index: 0.65,
      },
      safety: { score: 1.0, warnings: [] },
      meta: { formula_used: 'registry_lookup', uncertainty: 0.0 },
    };
  }
  if (dispatcher === 'prism_data' && action === 'tool_get') {
    return {
      result: {
        id: params.id || 'tool_001', name: 'CoroMill 390', category: 'MILLING',
        manufacturer: 'Sandvik', diameter_mm: 25, coating: 'TiAlN', flutes: 4,
      },
      safety: { score: 1.0, warnings: [] },
      meta: { formula_used: 'registry_lookup', uncertainty: 0.0 },
    };
  }
  if (dispatcher === 'prism_data' && action === 'alarm_decode') {
    return {
      result: {
        code: params.code || '1020', controller: params.controller || 'fanuc',
        description: 'Servo alarm: excess error',
        severity: 'error',
        causes: ['Mechanical binding', 'Servo motor fault', 'Encoder cable'],
        remediation: ['Check axis movement', 'Inspect servo motor', 'Check encoder connection'],
      },
      safety: { score: 0.5, warnings: ['Machine may need E-stop'] },
      meta: { formula_used: 'alarm_registry', uncertainty: 0.0 },
    };
  }
  return { result: {}, safety: { score: 0, warnings: ['Unknown endpoint'] }, meta: { formula_used: 'none', uncertainty: 1.0 } };
};

// ============================================================================
// DASHBOARD DATA CONTRACT TESTS
// ============================================================================

async function testDashboardDataContract(): Promise<void> {
  console.log('\n=== R5-MS0: Dashboard Data Contract ===\n');

  // Clear state
  const bridgeState = path.join(process.cwd(), 'state', 'bridge');
  for (const f of ['endpoints.json', 'api_keys.json', 'request_log.jsonl']) {
    const fp = path.join(bridgeState, f);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  const bridge = new ProtocolBridgeEngine({ max_endpoints: 50, max_api_keys: 20 });
  bridge.setDispatchHandler(mockDispatcher);

  // Register all 5 production endpoints
  const endpoints = [
    { path: '/api/v1/speed-feed', dispatcher: 'prism_calc', action: 'speed_feed' },
    { path: '/api/v1/job-plan', dispatcher: 'prism_intelligence', action: 'job_plan' },
    { path: '/api/v1/material/:id', dispatcher: 'prism_data', action: 'material_get' },
    { path: '/api/v1/tool/:id', dispatcher: 'prism_data', action: 'tool_get' },
    { path: '/api/v1/alarm-decode', dispatcher: 'prism_data', action: 'alarm_decode' },
  ];

  const epIds: Record<string, string> = {};
  for (const ep of endpoints) {
    const reg = bridge.registerEndpoint('rest', ep.path, ep.dispatcher, ep.action, 'api_key');
    epIds[ep.action] = reg.endpoint!.id;
  }
  assert(Object.keys(epIds).length === 5, 'All 5 endpoints registered');

  // Create API key
  const key = bridge.createApiKey('Dashboard Key', ['*']);
  const keyId = key.key_id!;

  // Helper to call endpoint
  async function call(action: string, params: Record<string, unknown> = {}) {
    const ep = endpoints.find(e => e.action === action)!;
    return bridge.routeRequest({
      request_id: `dash_${action}_${Date.now()}`,
      protocol: 'rest',
      endpoint_id: epIds[action],
      dispatcher: ep.dispatcher,
      action: ep.action,
      params,
      auth: { method: 'api_key', key_id: keyId },
      timestamp: Date.now(),
    });
  }

  // --- T1: Speed-feed response has standard format ---
  const sf = await call('speed_feed', { material: 'AISI 4140', operation: 'milling' });
  assert(sf.status === 'success', 'Speed-feed: success status');
  const sfData = sf.data as Record<string, unknown>;
  assert('result' in sfData, 'Speed-feed: has result field');
  assert('safety' in sfData, 'Speed-feed: has safety field');
  assert('meta' in sfData, 'Speed-feed: has meta field');

  const sfResult = sfData.result as Record<string, unknown>;
  assert(typeof sfResult.speed_rpm === 'number', 'Speed-feed result: speed_rpm is number');
  assert(typeof sfResult.feed_mmrev === 'number', 'Speed-feed result: feed_mmrev is number');
  assert(typeof sfResult.Vc_mmin === 'number', 'Speed-feed result: Vc_mmin is number');
  assert(typeof sfResult.Fc_N === 'number', 'Speed-feed result: Fc_N is number');
  assert(typeof sfResult.tool_life_min === 'number', 'Speed-feed result: tool_life_min is number');

  const sfSafety = sfData.safety as Record<string, unknown>;
  assert(typeof sfSafety.score === 'number' && (sfSafety.score as number) >= 0 && (sfSafety.score as number) <= 1,
    'Speed-feed safety: score in [0,1]');
  assert(Array.isArray(sfSafety.warnings), 'Speed-feed safety: warnings is array');

  const sfMeta = sfData.meta as Record<string, unknown>;
  assert(typeof sfMeta.formula_used === 'string', 'Speed-feed meta: formula_used is string');
  assert(typeof sfMeta.uncertainty === 'number', 'Speed-feed meta: uncertainty is number');

  // --- T2: Job plan response ---
  const jp = await call('job_plan', { material: '6061-T6', operation: 'bracket' });
  assert(jp.status === 'success', 'Job plan: success status');
  const jpData = jp.data as Record<string, unknown>;
  const jpResult = jpData.result as Record<string, unknown>;
  assert(Array.isArray(jpResult.operations), 'Job plan: operations is array');
  assert(typeof jpResult.total_time_min === 'number', 'Job plan: total_time_min is number');
  const jpSafety = jpData.safety as Record<string, unknown>;
  assert((jpSafety.warnings as string[]).length > 0, 'Job plan: has safety warnings');

  // --- T3: Material get response ---
  const mat = await call('material_get', { id: 'aisi_4140' });
  assert(mat.status === 'success', 'Material get: success status');
  const matResult = (mat.data as Record<string, unknown>).result as Record<string, unknown>;
  assert(typeof matResult.name === 'string', 'Material: name is string');
  assert(typeof matResult.iso_group === 'string', 'Material: iso_group is string');
  assert(typeof matResult.hardness_hrc === 'number', 'Material: hardness_hrc is number');

  // --- T4: Tool get response ---
  const tool = await call('tool_get', { id: 'tool_001' });
  assert(tool.status === 'success', 'Tool get: success status');
  const toolResult = (tool.data as Record<string, unknown>).result as Record<string, unknown>;
  assert(typeof toolResult.name === 'string', 'Tool: name is string');
  assert(typeof toolResult.category === 'string', 'Tool: category is string');
  assert(typeof toolResult.manufacturer === 'string', 'Tool: manufacturer is string');

  // --- T5: Alarm decode response ---
  const alarm = await call('alarm_decode', { code: '1020', controller: 'fanuc' });
  assert(alarm.status === 'success', 'Alarm decode: success status');
  const alarmResult = (alarm.data as Record<string, unknown>).result as Record<string, unknown>;
  assert(typeof alarmResult.description === 'string', 'Alarm: description is string');
  assert(typeof alarmResult.severity === 'string', 'Alarm: severity is string');
  assert(Array.isArray(alarmResult.causes), 'Alarm: causes is array');
  assert(Array.isArray(alarmResult.remediation), 'Alarm: remediation is array');
  assert((alarmResult.causes as string[]).length > 0, 'Alarm: has at least one cause');
  assert((alarmResult.remediation as string[]).length > 0, 'Alarm: has at least one remediation step');

  // --- T6: Safety score thresholds (dashboard display logic) ---
  const { safetyLevel, SAFETY_SHAPES } = await import('../../web/src/api/types.js');
  assert(safetyLevel(0.90) === 'pass', 'Safety level: 0.90 = pass');
  assert(safetyLevel(0.75) === 'warn', 'Safety level: 0.75 = warn');
  assert(safetyLevel(0.65) === 'fail', 'Safety level: 0.65 = fail');
  assert(SAFETY_SHAPES.pass === '\u25CF', 'Safety shape: pass = filled circle');
  assert(SAFETY_SHAPES.warn === '\u25B2', 'Safety shape: warn = triangle');
  assert(SAFETY_SHAPES.fail === '\u25A0', 'Safety shape: fail = filled square');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('R5 Dashboard Data Layer Tests');
  console.log('================================');

  try {
    await testDashboardDataContract();
  } catch (e: unknown) {
    console.log(`\n  \u2717 FATAL: Dashboard data tests threw: ${e instanceof Error ? e.message : String(e)}`);
    failed++;
  }

  console.log(`\n=== Results: ${passed}/${passed + failed} passed, ${failed} failed ===\n`);
  if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  - ${f}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
