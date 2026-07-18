/**
 * R7-MS3: Job Learning Engine Tests
 *
 * Test protocol from PHASE_R7_INTELLIGENCE.md:
 * 1. Record 10 identical jobs with ±20% tool life variation → insights identify mean/std dev
 * 2. Record 5 jobs with actual Ra consistently lower than predicted → parameter adjustment
 * 3. Query insights with 0 jobs → graceful "insufficient data" response
 */

import {
  jobRecord,
  jobInsights,
  jobLearning,
  clearJobStore,
  getJobStoreSize,
  type JobRecordInput,
  type JobRecordResult,
  type JobInsightsResult,
} from '../../src/engines/JobLearningEngine.js';

// ============================================================================
// TEST HARNESS
// ============================================================================

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, name: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(name);
    console.error(`  FAIL: ${name}`);
  }
}

function assertRange(value: number, min: number, max: number, name: string): void {
  if (value >= min && value <= max) {
    passed++;
  } else {
    failed++;
    failures.push(`${name} (got ${value}, expected [${min}..${max}])`);
    console.error(`  FAIL: ${name} — got ${value}, expected [${min}..${max}]`);
  }
}

function assertClose(value: number, target: number, tol: number, name: string): void {
  if (Math.abs(value - target) <= tol) {
    passed++;
  } else {
    failed++;
    failures.push(`${name} (got ${value}, expected ${target}±${tol})`);
    console.error(`  FAIL: ${name} — got ${value}, expected ${target}±${tol})`);
  }
}

// ============================================================================
// T1: RECORD A SINGLE JOB
// ============================================================================

console.log('\n=== T1: Single job recording ===');

clearJobStore();

const t1Input: JobRecordInput = {
  material: 'AISI 4140',
  operation: 'milling',
  parameters_used: { vc_mpm: 200, fz_mm: 0.15, ap_mm: 3.0 },
  outcome: {
    actual_tool_life_min: 45,
    actual_surface_finish_ra: 1.2,
    chatter_occurred: false,
    tool_failure_mode: 'none',
    operator_notes: 'Good cut',
  },
  machine: 'haas_vf2',
};

const r1 = jobRecord(t1Input);

assert(r1.stored === true, 'T1.1: job stored');
assert(r1.id.startsWith('job_'), 'T1.2: id starts with job_');
assert(r1.total_jobs_for_key === 1, 'T1.3: total for key = 1');
assert(r1.learning_available === false, 'T1.4: learning not available (only 1 job)');
assert(r1.message.includes('4 more'), 'T1.5: message says 4 more needed');
assert(r1.safety.score >= 0.90, 'T1.6: safety score ≥ 0.90');
assert(r1.safety.flags.length === 0, 'T1.7: no safety flags for normal job');

// ============================================================================
// T2: SPEC TEST — 10 IDENTICAL JOBS WITH ±20% TOOL LIFE VARIATION
// ============================================================================

console.log('\n=== T2: 10 jobs with ±20% tool life variation (spec test 1) ===');

clearJobStore();

// Base tool life = 50 min, vary ±20% (40–60)
const toolLives = [42, 48, 55, 47, 60, 43, 52, 58, 44, 51]; // mean ≈ 50

for (let i = 0; i < 10; i++) {
  const r = jobRecord({
    material: 'AISI 4140',
    operation: 'milling',
    parameters_used: { vc_mpm: 200, fz_mm: 0.15, ap_mm: 3.0 },
    outcome: {
      actual_tool_life_min: toolLives[i],
      actual_surface_finish_ra: 1.5,
    },
    machine: 'haas_vf2',
  });

  if (i < 4) {
    assert(r.learning_available === false, `T2.${i + 1}a: learning not yet available (job ${i + 1})`);
  } else {
    assert(r.learning_available === true, `T2.${i + 1}a: learning available (job ${i + 1})`);
  }
}

assert(getJobStoreSize() === 10, 'T2.11: store has 10 jobs');

// Now get insights
const insights2 = jobInsights({ material: 'AISI 4140', operation: 'milling' });
assert(insights2.sample_size === 10, 'T2.12: sample size = 10');
assert(insights2.patterns.length > 0, 'T2.13: has patterns');

// Should have tool life pattern
const toolLifePattern = insights2.patterns.find(p => p.finding.includes('Tool life'));
assert(toolLifePattern !== undefined, 'T2.14: has tool life finding');
if (toolLifePattern) {
  assert(toolLifePattern.evidence.sample_size === 10, 'T2.15: tool life evidence sample = 10');
  assert(toolLifePattern.evidence.std_dev > 0, 'T2.16: std dev > 0');
  assert(toolLifePattern.confidence > 0.5, 'T2.17: confidence > 0.5');
  // Actual avg should be near 50
  assertRange(toolLifePattern.evidence.actual_avg, 45, 55, 'T2.18: actual avg tool life ≈ 50');
}

// Safety
assert(insights2.safety.score >= 0.50, 'T2.19: safety ≥ 0.50');

// ============================================================================
// T3: SPEC TEST — 5 JOBS WITH Ra CONSISTENTLY LOWER THAN PREDICTED
// ============================================================================

console.log('\n=== T3: 5 jobs with Ra consistently lower → parameter adjustment (spec test 2) ===');

clearJobStore();

// Predicted Ra from fz=0.20mm: (0.20² / (32×0.8)) × 1000 = 1.5625 μm
// Actual Ra consistently 0.8 μm (about 50% of predicted → ratio ≈ 0.51)
for (let i = 0; i < 5; i++) {
  jobRecord({
    material: '6061-T6',
    operation: 'finishing',
    parameters_used: { vc_mpm: 400, fz_mm: 0.20, ap_mm: 1.0 },
    outcome: {
      actual_surface_finish_ra: 0.7 + Math.random() * 0.2, // 0.7–0.9
      actual_tool_life_min: 60,
    },
  });
}

const insights3 = jobInsights({ material: '6061-T6' });
assert(insights3.sample_size === 5, 'T3.1: sample size = 5');

// Should have Ra pattern (actual much better than predicted)
const raPattern = insights3.patterns.find(p => p.finding.includes('Surface finish'));
assert(raPattern !== undefined, 'T3.2: has surface finish finding');
if (raPattern) {
  assert(raPattern.finding.includes('better'), 'T3.3: finding says "better"');
  assert(raPattern.recommendation.includes('coarser feed') || raPattern.recommendation.includes('productivity'),
    'T3.4: recommends productivity gain');
}

// Should have parameter adjustment for Ra correction
const raAdj = insights3.parameter_adjustments.find(a => a.parameter === 'ra_correction_factor');
assert(raAdj !== undefined, 'T3.5: has ra_correction_factor adjustment');
if (raAdj) {
  assert(raAdj.current_formula_value === 1.0, 'T3.6: current value is 1.0');
  assert(raAdj.recommended_value < 0.8, 'T3.7: recommended value < 0.8');
}

// ============================================================================
// T4: SPEC TEST — QUERY WITH 0 JOBS → GRACEFUL RESPONSE
// ============================================================================

console.log('\n=== T4: 0 jobs → insufficient data (spec test 3) ===');

clearJobStore();

const insights4 = jobInsights({ material: 'Ti-6Al-4V' });
assert(insights4.sample_size === 0, 'T4.1: sample size = 0');
assert(insights4.patterns.length === 0, 'T4.2: no patterns');
assert(insights4.parameter_adjustments.length === 0, 'T4.3: no adjustments');
assert(insights4.safety.flags.some(f => f.includes('No job data')),
  'T4.4: safety flag mentions no data');

// ============================================================================
// T5: INSUFFICIENT DATA (< 5 JOBS)
// ============================================================================

console.log('\n=== T5: Insufficient data (< min_jobs) ===');

clearJobStore();

for (let i = 0; i < 3; i++) {
  jobRecord({
    material: 'Inconel 718',
    operation: 'turning',
    parameters_used: { vc_mpm: 50, fz_mm: 0.10, ap_mm: 1.5 },
    outcome: { actual_tool_life_min: 10 },
  });
}

const insights5 = jobInsights({ material: 'Inconel 718' });
assert(insights5.sample_size === 3, 'T5.1: sample size = 3');
assert(insights5.patterns.length === 0, 'T5.2: no patterns (insufficient data)');
assert(insights5.safety.flags.some(f => f.includes('Insufficient')),
  'T5.3: flag mentions insufficient data');

// ============================================================================
// T6: CHATTER ANALYSIS
// ============================================================================

console.log('\n=== T6: Chatter pattern detection ===');

clearJobStore();

for (let i = 0; i < 6; i++) {
  jobRecord({
    material: 'AISI 1045',
    operation: 'roughing',
    parameters_used: { vc_mpm: 180, fz_mm: 0.20, ap_mm: 5.0 },
    outcome: {
      actual_tool_life_min: 30,
      chatter_occurred: i < 4, // 4 out of 6 = 67% chatter rate
    },
  });
}

const insights6 = jobInsights({ material: 'AISI 1045' });
assert(insights6.sample_size === 6, 'T6.1: sample size = 6');

const chatterPattern = insights6.patterns.find(p => p.finding.includes('Chatter'));
assert(chatterPattern !== undefined, 'T6.2: has chatter finding');
if (chatterPattern) {
  assert(chatterPattern.finding.includes('67') || chatterPattern.finding.includes('66'),
    'T6.3: chatter rate ~67%');
  assert(chatterPattern.recommendation.includes('depth') || chatterPattern.recommendation.includes('spindle'),
    'T6.4: recommends depth/spindle adjustment');
}

// ============================================================================
// T7: FAILURE MODE ANALYSIS
// ============================================================================

console.log('\n=== T7: Failure mode analysis ===');

clearJobStore();

const failureModes = ['flank_wear', 'flank_wear', 'flank_wear', 'crater_wear', 'chipping', 'none', 'none'] as const;
for (let i = 0; i < 7; i++) {
  jobRecord({
    material: '316L',
    operation: 'milling',
    parameters_used: { vc_mpm: 120, fz_mm: 0.12, ap_mm: 2.0 },
    outcome: {
      actual_tool_life_min: 20,
      tool_failure_mode: failureModes[i],
    },
  });
}

const insights7 = jobInsights({ material: '316L' });
assert(insights7.failure_analysis !== undefined, 'T7.1: has failure analysis');
if (insights7.failure_analysis) {
  assert(insights7.failure_analysis.total_failures === 5, 'T7.2: 5 failures total');
  assert(insights7.failure_analysis.most_common_mode === 'flank_wear', 'T7.3: most common = flank_wear');
  assert(insights7.failure_analysis.modes['flank_wear'] === 3, 'T7.4: flank_wear count = 3');
  assert(insights7.failure_analysis.recommendation.includes('flank'),
    'T7.5: recommendation mentions flank wear');
}

// ============================================================================
// T8: TOOL BREAKAGE SAFETY FLAG
// ============================================================================

console.log('\n=== T8: Tool breakage safety flag ===');

clearJobStore();

const r8 = jobRecord({
  material: 'Ti-6Al-4V',
  operation: 'drilling',
  parameters_used: { vc_mpm: 60, fz_mm: 0.08, ap_mm: 20 },
  outcome: {
    actual_tool_life_min: 2,
    tool_failure_mode: 'breakage',
    chatter_occurred: true,
  },
});

assert(r8.safety.flags.some(f => f.includes('breakage')), 'T8.1: breakage flagged');
assert(r8.safety.flags.some(f => f.includes('Chatter')), 'T8.2: chatter flagged');

// ============================================================================
// T9: TOOL LIFE OVER-PREDICTION (ACTUAL < PREDICTED)
// ============================================================================

console.log('\n=== T9: Tool life over-prediction (actual << predicted) ===');

clearJobStore();

// AISI 4140 at 200 m/min: Taylor predicted ≈ (300/200)^(1/0.25) = 1.5^4 = 5.0625 min
// We record actual = 2 min (ratio ≈ 0.39 — well below 0.8 threshold)
for (let i = 0; i < 6; i++) {
  jobRecord({
    material: 'AISI 4140',
    operation: 'turning',
    parameters_used: { vc_mpm: 200, fz_mm: 0.15, ap_mm: 2.0 },
    outcome: { actual_tool_life_min: 1.5 + Math.random() * 1.0 }, // 1.5–2.5
  });
}

const insights9 = jobInsights({ material: 'AISI 4140', operation: 'turning' });
const lifePattern9 = insights9.patterns.find(p => p.finding.includes('Tool life'));
assert(lifePattern9 !== undefined, 'T9.1: has tool life pattern');
if (lifePattern9) {
  assert(lifePattern9.finding.includes('lower'), 'T9.2: finding says "lower"');
  assert(lifePattern9.recommendation.includes('Reduce Vc'), 'T9.3: recommends reducing Vc');
}

// Should have taylor_C adjustment
const taylorAdj = insights9.parameter_adjustments.find(a => a.parameter === 'taylor_C');
assert(taylorAdj !== undefined, 'T9.4: has taylor_C adjustment');
if (taylorAdj) {
  assert(taylorAdj.recommended_value < taylorAdj.current_formula_value,
    'T9.5: recommended < current (tool wears faster)');
}

// ============================================================================
// T10: TOOL LIFE MATCHES PREDICTION
// ============================================================================

console.log('\n=== T10: Tool life matches Taylor prediction ===');

clearJobStore();

// AISI 4140 at 200 m/min: predicted ≈ 5.06 min
// Record actual ≈ 5 min (within ±20%)
for (let i = 0; i < 5; i++) {
  jobRecord({
    material: 'AISI 4140',
    operation: 'milling',
    parameters_used: { vc_mpm: 200, fz_mm: 0.15, ap_mm: 3.0 },
    outcome: { actual_tool_life_min: 4.5 + Math.random() * 1.5 }, // 4.5–6.0
  });
}

const insights10 = jobInsights({ material: 'AISI 4140', operation: 'milling' });
const lifePattern10 = insights10.patterns.find(p => p.finding.includes('matches'));
assert(lifePattern10 !== undefined, 'T10.1: finding says "matches"');
if (lifePattern10) {
  assert(lifePattern10.recommendation.includes('well-calibrated'),
    'T10.2: says well-calibrated');
}

// No taylor_C adjustment needed
assert(insights10.parameter_adjustments.length === 0, 'T10.3: no adjustments needed');

// ============================================================================
// T11: CROSS-KEY FILTERING
// ============================================================================

console.log('\n=== T11: Cross-key filtering ===');

clearJobStore();

// Record jobs for 2 different materials
for (let i = 0; i < 5; i++) {
  jobRecord({
    material: '6061-T6',
    operation: 'milling',
    parameters_used: { vc_mpm: 400, fz_mm: 0.15, ap_mm: 2.0 },
    outcome: { actual_tool_life_min: 80 },
  });
  jobRecord({
    material: '7075-T6',
    operation: 'milling',
    parameters_used: { vc_mpm: 350, fz_mm: 0.15, ap_mm: 2.0 },
    outcome: { actual_tool_life_min: 60 },
  });
}

assert(getJobStoreSize() === 10, 'T11.1: total store = 10');

// Filter by 6061 only
const i11a = jobInsights({ material: '6061-T6' });
assert(i11a.sample_size === 5, 'T11.2: 6061-T6 has 5 jobs');

// Filter by 7075 only
const i11b = jobInsights({ material: '7075-T6' });
assert(i11b.sample_size === 5, 'T11.3: 7075-T6 has 5 jobs');

// No filter — gets all
const i11c = jobInsights({});
assert(i11c.sample_size === 10, 'T11.4: unfiltered = 10 jobs');

// ============================================================================
// T12: MIN_JOBS THRESHOLD
// ============================================================================

console.log('\n=== T12: Custom min_jobs threshold ===');

clearJobStore();

for (let i = 0; i < 3; i++) {
  jobRecord({
    material: 'AISI 4140',
    operation: 'drilling',
    parameters_used: { vc_mpm: 100, fz_mm: 0.10, ap_mm: 10 },
    outcome: { actual_tool_life_min: 15 },
  });
}

// Default min_jobs=5 → insufficient
const i12a = jobInsights({ material: 'AISI 4140' });
assert(i12a.patterns.length === 0, 'T12.1: default min_jobs=5 → no patterns');

// Custom min_jobs=3 → sufficient
const i12b = jobInsights({ material: 'AISI 4140', min_jobs: 3 });
assert(i12b.sample_size === 3, 'T12.2: sample = 3');
assert(i12b.patterns.length > 0, 'T12.3: with min_jobs=3, patterns available');

// ============================================================================
// T13: SAFETY FLAGS — HIGH FAILURE RATE
// ============================================================================

console.log('\n=== T13: High failure rate safety ===');

clearJobStore();

for (let i = 0; i < 6; i++) {
  jobRecord({
    material: 'Inconel 718',
    operation: 'milling',
    parameters_used: { vc_mpm: 80, fz_mm: 0.10, ap_mm: 1.5 },
    outcome: {
      actual_tool_life_min: 5,
      tool_failure_mode: i < 4 ? 'chipping' : 'none', // 67% failure rate
    },
  });
}

const insights13 = jobInsights({ material: 'Inconel 718' });
assert(insights13.safety.flags.some(f => f.includes('failure rate')),
  'T13.1: high failure rate flagged');
assert(insights13.safety.score < 0.90, 'T13.2: safety score reduced');

// ============================================================================
// T14: TOOL LIFE ≤ 0 SAFETY FLAG
// ============================================================================

console.log('\n=== T14: Suspicious tool life ===');

clearJobStore();

const r14 = jobRecord({
  material: 'AISI 1045',
  operation: 'turning',
  parameters_used: { vc_mpm: 250, fz_mm: 0.20, ap_mm: 3.0 },
  outcome: { actual_tool_life_min: -1 },
});

assert(r14.safety.flags.some(f => f.includes('Suspicious')), 'T14.1: suspicious tool life flagged');
assert(r14.safety.score < 0.95, 'T14.2: safety score reduced');

// ============================================================================
// T15: ALL MATERIALS IN TAYLOR DB
// ============================================================================

console.log('\n=== T15: All Taylor DB materials ===');

const taylorMaterials = ['AISI 4140', 'AISI 1045', '6061-T6', '7075-T6', 'Ti-6Al-4V', 'Inconel 718', '316L'];

clearJobStore();

for (const mat of taylorMaterials) {
  for (let i = 0; i < 5; i++) {
    jobRecord({
      material: mat,
      operation: 'milling',
      parameters_used: { vc_mpm: 150, fz_mm: 0.15, ap_mm: 2.0 },
      outcome: { actual_tool_life_min: 30 + Math.random() * 10 },
    });
  }
}

for (const mat of taylorMaterials) {
  const ins = jobInsights({ material: mat });
  assert(ins.sample_size === 5, `T15: ${mat} — sample = 5`);
  assert(ins.patterns.length > 0, `T15: ${mat} — has patterns`);
  assert(ins.safety.score >= 0.40, `T15: ${mat} — safety ≥ 0.40`);
}

// ============================================================================
// T16: DISPATCHER FUNCTION
// ============================================================================

console.log('\n=== T16: Dispatcher function ===');

clearJobStore();

const d1 = jobLearning('job_record', {
  material: 'AISI 4140',
  operation: 'milling',
  parameters_used: { vc_mpm: 200, fz_mm: 0.15, ap_mm: 3.0 },
  outcome: { actual_tool_life_min: 50 },
} as Record<string, unknown>) as any;

assert(d1.stored === true, 'T16.1: dispatcher job_record works');
assert(d1.id.startsWith('job_'), 'T16.2: returns valid id');

const d2 = jobLearning('job_insights', { material: 'AISI 4140' }) as any;
assert(d2.sample_size === 1, 'T16.3: dispatcher job_insights works');

const d3 = jobLearning('unknown_action', {}) as any;
assert(d3.error !== undefined, 'T16.4: unknown action returns error');

// ============================================================================
// T17: EDGE CASES
// ============================================================================

console.log('\n=== T17: Edge cases ===');

clearJobStore();

// Job with no outcome metrics
const r17a = jobRecord({
  material: 'brass',
  operation: 'engraving',
  parameters_used: { vc_mpm: 300, fz_mm: 0.05, ap_mm: 0.1 },
  outcome: { operator_notes: 'Quick test cut' },
});
assert(r17a.stored === true, 'T17.1: job with minimal outcome stored');

// Job with timestamp
const r17b = jobRecord({
  material: 'brass',
  operation: 'engraving',
  parameters_used: { vc_mpm: 300, fz_mm: 0.05, ap_mm: 0.1 },
  outcome: {},
  timestamp: '2025-01-15T10:30:00Z',
});
assert(r17b.stored === true, 'T17.2: job with custom timestamp stored');

// Job with job_plan_id
const r17c = jobRecord({
  material: 'brass',
  operation: 'engraving',
  parameters_used: { vc_mpm: 300, fz_mm: 0.05, ap_mm: 0.1 },
  outcome: {},
  job_plan_id: 'plan_abc_123',
});
assert(r17c.stored === true, 'T17.3: job with plan id stored');
assert(r17c.total_jobs_for_key === 3, 'T17.4: total = 3 for brass/engraving');

// ============================================================================
// T18: CLEAR STORE
// ============================================================================

console.log('\n=== T18: Clear store ===');

assert(getJobStoreSize() > 0, 'T18.1: store not empty before clear');
clearJobStore();
assert(getJobStoreSize() === 0, 'T18.2: store empty after clear');

const insEmpty = jobInsights({});
assert(insEmpty.sample_size === 0, 'T18.3: insights on empty store = 0');

// ============================================================================
// T19: MACHINE FILTERING
// ============================================================================

console.log('\n=== T19: Machine filtering ===');

clearJobStore();

for (let i = 0; i < 5; i++) {
  jobRecord({
    material: 'AISI 4140',
    operation: 'milling',
    parameters_used: { vc_mpm: 200, fz_mm: 0.15, ap_mm: 3.0 },
    outcome: { actual_tool_life_min: 50 },
    machine: 'haas_vf2',
  });
  jobRecord({
    material: 'AISI 4140',
    operation: 'milling',
    parameters_used: { vc_mpm: 200, fz_mm: 0.15, ap_mm: 3.0 },
    outcome: { actual_tool_life_min: 40 },
    machine: 'dmg_mori_cmx50',
  });
}

const i19a = jobInsights({ machine: 'haas_vf2' });
assert(i19a.sample_size === 5, 'T19.1: haas_vf2 filter → 5 jobs');

const i19b = jobInsights({ machine: 'dmg_mori' });
assert(i19b.sample_size === 5, 'T19.2: dmg_mori partial match → 5 jobs');

const i19c = jobInsights({ material: 'AISI 4140' });
assert(i19c.sample_size === 10, 'T19.3: material-only filter → 10 jobs');

// ============================================================================
// T20: SURFACE FINISH WORSE THAN PREDICTED
// ============================================================================

console.log('\n=== T20: Surface finish worse than predicted ===');

clearJobStore();

// fz=0.15: predicted Ra = (0.15² / (32×0.8)) × 1000 = 0.879 μm
// Actual Ra ≈ 2.0 (ratio ≈ 2.28, > 1.2 threshold)
for (let i = 0; i < 5; i++) {
  jobRecord({
    material: 'Ti-6Al-4V',
    operation: 'finishing',
    parameters_used: { vc_mpm: 60, fz_mm: 0.15, ap_mm: 0.5 },
    outcome: {
      actual_surface_finish_ra: 1.8 + Math.random() * 0.4, // 1.8–2.2
      actual_tool_life_min: 8,
    },
  });
}

const insights20 = jobInsights({ material: 'Ti-6Al-4V' });
const raPattern20 = insights20.patterns.find(p => p.finding.includes('Surface finish'));
assert(raPattern20 !== undefined, 'T20.1: has Ra finding');
if (raPattern20) {
  assert(raPattern20.finding.includes('worse'), 'T20.2: finding says "worse"');
  assert(raPattern20.recommendation.includes('feed') || raPattern20.recommendation.includes('tool wear'),
    'T20.3: recommends feed reduction or tool check');
}

// ============================================================================
// RESULTS
// ============================================================================

console.log(`\n${'='.repeat(60)}`);
console.log(`R7-MS3 Job Learning Engine Tests: ${passed} PASS, ${failed} FAIL (total ${passed + failed})`);
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
}
console.log('='.repeat(60));
process.exit(failed > 0 ? 1 : 0);
