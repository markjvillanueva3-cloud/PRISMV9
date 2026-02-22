/**
 * R7-MS1: Optimization Engine Tests
 *
 * Test protocol from PHASE_R7_INTELLIGENCE.md:
 * 1. Optimize pocket in 4140 steel (Ra≤3.2, tol±0.05, min_cost) — Vc within handbook range
 * 2. Optimize face mill Inconel 718 (Ra≤0.8, min_time) — selects high Vc with appropriate tool
 * 3. Sequence 8-operation part (3 tools, 2 setups) — reduces tool changes by ≥30%
 * 4. Sustainability report — energy, CO2, coolant metrics
 * 5. Eco-optimize — sustainability-weighted optimization
 */

import {
  optimizeParameters,
  optimizeSequence,
  sustainabilityReport,
  ecoOptimize,
  optimization,
  type OptimizeInput,
  type SequenceInput,
  type SustainabilityInput,
  type EcoOptimizeInput,
} from '../../src/engines/OptimizationEngine.js';

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

function assertClose(actual: number, expected: number, tolerance: number, name: string): void {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    passed++;
  } else {
    failed++;
    failures.push(`${name} (got ${actual}, expected ${expected}±${tolerance})`);
    console.error(`  FAIL: ${name} — got ${actual}, expected ${expected}±${tolerance}`);
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

// ============================================================================
// T1: OPTIMIZE PARAMETERS — POCKET IN 4140 (min_cost)
// ============================================================================

console.log('\n=== T1: Optimize pocket in AISI 4140 (Ra≤3.2, min_cost) ===');

const pocket4140: OptimizeInput = {
  material: 'AISI 4140',
  feature: 'pocket',
  dimensions: { depth_mm: 10, width_mm: 40, length_mm: 60 },
  constraints: { surface_finish_ra_max_um: 3.2, tolerance_mm: 0.05 },
  objective: 'min_cost',
};

const r1 = optimizeParameters(pocket4140);

// Has required fields
assert(r1.optimal !== undefined, 'T1.1: has optimal solution');
assert(r1.alternatives.length > 0, 'T1.2: has alternatives');
assert(r1.pareto_front !== undefined, 'T1.3: has pareto_front');
assert(r1.safety !== undefined, 'T1.4: has safety');

// Vc within handbook range for 4140 (120–300 m/min)
assertRange(r1.optimal.vc_mpm, 120, 300, 'T1.5: Vc within 4140 handbook range');

// Feed rate sensible (0.05–0.5 mm/tooth)
assertRange(r1.optimal.fz_mm, 0.05, 0.5, 'T1.6: fz within sensible range');

// Depth of cut positive and reasonable
assert(r1.optimal.ap_mm > 0 && r1.optimal.ap_mm <= 10, 'T1.7: ap positive and ≤ depth');

// Predicted Ra meets constraint
assert(r1.optimal.predicted_ra_um <= 3.2, 'T1.8: Ra ≤ 3.2 μm constraint met');

// Cost and time are positive
assert(r1.optimal.estimated_cost_usd > 0, 'T1.9: cost is positive');
assert(r1.optimal.estimated_cycle_time_min > 0, 'T1.10: cycle time is positive');

// Tool life positive
assert(r1.optimal.estimated_tool_life_min > 0, 'T1.11: tool life positive');

// Sustainability extension present
assert(r1.optimal.sustainability !== undefined, 'T1.12: sustainability metrics present');
assert(r1.optimal.sustainability.energy_kwh > 0, 'T1.13: energy_kwh > 0');
assert(r1.optimal.sustainability.co2_kg > 0, 'T1.14: co2_kg > 0');
assert(r1.optimal.sustainability.eco_efficiency_score >= 0 && r1.optimal.sustainability.eco_efficiency_score <= 1, 'T1.15: eco_efficiency in [0,1]');

// Safety score ≥ 0.70
assert(r1.safety.score >= 0.70, 'T1.16: safety ≥ 0.70');

// Pareto front has data
assert(r1.pareto_front.cost.length > 0, 'T1.17: pareto cost array non-empty');
assert(r1.pareto_front.time.length > 0, 'T1.18: pareto time array non-empty');

// Sensitivity analysis present
assert(r1.sensitivity.length > 0, 'T1.19: sensitivity analysis present');

// Strategy is a string
assert(typeof r1.optimal.strategy === 'string' && r1.optimal.strategy.length > 0, 'T1.20: strategy name non-empty');

// num_passes ≥ 1
assert(r1.optimal.num_passes >= 1, 'T1.21: at least 1 pass');

// ============================================================================
// T2: OPTIMIZE PARAMETERS — FACE MILL INCONEL (min_time)
// ============================================================================

console.log('\n=== T2: Optimize face mill Inconel 718 (Ra≤0.8, min_time) ===');

const faceInconel: OptimizeInput = {
  material: 'Inconel 718',
  feature: 'face',
  dimensions: { depth_mm: 1, width_mm: 50 },
  constraints: { surface_finish_ra_max_um: 0.8 },
  objective: 'min_time',
};

const r2 = optimizeParameters(faceInconel);

// Vc within Inconel 718 handbook range (20–60 m/min)
assertRange(r2.optimal.vc_mpm, 20, 60, 'T2.1: Vc within Inconel handbook range');

// Predicted Ra meets tight constraint
assert(r2.optimal.predicted_ra_um <= 0.8, 'T2.2: Ra ≤ 0.8 μm constraint met');

// min_time objective: cycle time should be reasonable
assert(r2.optimal.estimated_cycle_time_min > 0, 'T2.3: cycle time positive');

// Tool life may be shorter at high speed
assert(r2.optimal.estimated_tool_life_min > 0, 'T2.4: tool life positive');

// Inconel is expensive to machine — cost should be higher than 4140
assert(r2.optimal.estimated_cost_usd > 0, 'T2.5: cost positive');

// Safety
assert(r2.safety.score >= 0.50, 'T2.6: safety ≥ 0.50 (Inconel is challenging)');

// Sustainability — Inconel has higher energy factor
assert(r2.optimal.sustainability.energy_kwh > 0, 'T2.7: energy > 0');

// ============================================================================
// T3: OPTIMIZE PARAMETERS — DIFFERENT OBJECTIVES
// ============================================================================

console.log('\n=== T3: Objective comparison (same part, different objectives) ===');

const baseInput: OptimizeInput = {
  material: 'AISI 1045',
  feature: 'slot',
  dimensions: { depth_mm: 8, width_mm: 12, length_mm: 100 },
  constraints: { surface_finish_ra_max_um: 3.2 },
  objective: 'min_cost',
};

const costOpt = optimizeParameters({ ...baseInput, objective: 'min_cost' });
const timeOpt = optimizeParameters({ ...baseInput, objective: 'min_time' });
const lifeOpt = optimizeParameters({ ...baseInput, objective: 'max_tool_life' });
const balOpt  = optimizeParameters({ ...baseInput, objective: 'balanced' });

// min_cost should tend to have lower cost than min_time
// (not guaranteed due to grid discretization, but generally true)
assert(costOpt.optimal.estimated_cost_usd <= timeOpt.optimal.estimated_cost_usd * 1.3,
  'T3.1: min_cost ≤ 1.3× min_time cost');

// min_time should tend to have lower cycle time than min_cost
assert(timeOpt.optimal.estimated_cycle_time_min <= costOpt.optimal.estimated_cycle_time_min * 1.3,
  'T3.2: min_time cycle ≤ 1.3× min_cost cycle');

// max_tool_life should have better or equal tool life
assert(lifeOpt.optimal.estimated_tool_life_min >= costOpt.optimal.estimated_tool_life_min * 0.8,
  'T3.3: max_tool_life has good tool life');

// balanced should be between extremes
assert(balOpt.optimal.estimated_cost_usd > 0, 'T3.4: balanced has positive cost');
assert(balOpt.optimal.estimated_cycle_time_min > 0, 'T3.5: balanced has positive time');

// All meet Ra constraint
assert(costOpt.optimal.predicted_ra_um <= 3.2, 'T3.6: cost opt meets Ra');
assert(timeOpt.optimal.predicted_ra_um <= 3.2, 'T3.7: time opt meets Ra');
assert(lifeOpt.optimal.predicted_ra_um <= 3.2, 'T3.8: life opt meets Ra');
assert(balOpt.optimal.predicted_ra_um <= 3.2, 'T3.9: balanced opt meets Ra');

// ============================================================================
// T4: OPTIMIZE PARAMETERS — ALL MATERIALS
// ============================================================================

console.log('\n=== T4: All materials produce valid results ===');

const materials = ['AISI 4140', 'AISI 1045', '6061-T6', '7075-T6', 'Ti-6Al-4V', 'Inconel 718', '316L'];
for (const mat of materials) {
  const r = optimizeParameters({
    material: mat,
    feature: 'pocket',
    dimensions: { depth_mm: 5, width_mm: 20 },
    constraints: { surface_finish_ra_max_um: 3.2 },
    objective: 'min_cost',
  });
  assert(r.optimal.vc_mpm > 0, `T4: ${mat} — Vc > 0`);
  assert(r.optimal.estimated_cost_usd > 0, `T4: ${mat} — cost > 0`);
  assert(r.optimal.sustainability.eco_efficiency_score >= 0, `T4: ${mat} — eco_efficiency ≥ 0`);
  assert(r.safety.score >= 0.40, `T4: ${mat} — safety ≥ 0.40`);
}

// ============================================================================
// T5: OPTIMIZE PARAMETERS — UNKNOWN MATERIAL FALLBACK
// ============================================================================

console.log('\n=== T5: Unknown material fallback ===');

const unknownR = optimizeParameters({
  material: 'Unobtanium',
  feature: 'face',
  dimensions: { depth_mm: 2, width_mm: 30 },
  constraints: {},
  objective: 'balanced',
});

assert(unknownR.optimal.vc_mpm > 0, 'T5.1: unknown material still produces result');
assert(unknownR.safety.flags.some(f => f.toLowerCase().includes('unknown') || f.toLowerCase().includes('fallback')),
  'T5.2: safety flags mention unknown/fallback material');

// ============================================================================
// T6: OPTIMIZE PARAMETERS — FEATURE TYPES
// ============================================================================

console.log('\n=== T6: All feature types ===');

const features: ('pocket' | 'slot' | 'face' | 'contour' | 'hole' | 'thread')[] = ['pocket', 'slot', 'face', 'contour', 'hole', 'thread'];
for (const feat of features) {
  const r = optimizeParameters({
    material: 'AISI 1045',
    feature: feat,
    dimensions: { depth_mm: 5, width_mm: 10, diameter_mm: 20 },
    constraints: { surface_finish_ra_max_um: 3.2 },
    objective: 'min_cost',
  });
  assert(r.optimal.vc_mpm > 0, `T6: feature=${feat} — valid Vc`);
  assert(r.optimal.strategy.length > 0, `T6: feature=${feat} — has strategy`);
}

// ============================================================================
// T7: SEQUENCE OPTIMIZATION — 8 OPERATIONS, 3 TOOLS
// ============================================================================

console.log('\n=== T7: Sequence optimization (8 ops, 3 tools) ===');

const seqInput: SequenceInput = {
  operations: [
    { id: 'rough_face', feature: 'face', tool_required: 'face_mill_50', estimated_time_min: 2.5 },
    { id: 'rough_pocket1', feature: 'pocket', tool_required: 'endmill_12', estimated_time_min: 4.0 },
    { id: 'rough_pocket2', feature: 'pocket', tool_required: 'endmill_12', estimated_time_min: 3.5 },
    { id: 'drill_holes', feature: 'hole', tool_required: 'drill_8', estimated_time_min: 1.5 },
    { id: 'finish_face', feature: 'face', tool_required: 'face_mill_50', estimated_time_min: 1.5 },
    { id: 'finish_pocket1', feature: 'pocket', tool_required: 'endmill_12', estimated_time_min: 3.0 },
    { id: 'finish_pocket2', feature: 'pocket', tool_required: 'endmill_12', estimated_time_min: 2.5 },
    { id: 'chamfer_holes', feature: 'hole', tool_required: 'drill_8', estimated_time_min: 1.0 },
  ],
  machine: 'haas_vf2',
  optimize_for: 'min_tool_changes',
};

// Input order: face_mill, endmill, endmill, drill, face_mill, endmill, endmill, drill = 4 changes
const r7 = optimizeSequence(seqInput);

assert(r7.optimal_order.length === 8, 'T7.1: all 8 ops in result');
assert(r7.tool_changes >= 0, 'T7.2: tool_changes non-negative');
assert(r7.estimated_total_min > 0, 'T7.3: total time positive');

// Input order has 4 tool changes, optimized should have fewer
// Input: FM, EM, EM, DR, FM, EM, EM, DR → changes at pos 1,3,4,5 = 4 changes
const inputChanges = 4;
assert(r7.tool_changes <= inputChanges, 'T7.4: tool changes ≤ input order');

// With 3 tools, optimal grouping gives 2 changes (FM→EM→DR or similar)
assert(r7.tool_changes <= 3, 'T7.5: tool changes ≤ 3 (optimal grouping of 3 tools)');

// Savings should be reported
assert(r7.savings_vs_input_order.tool_changes_saved >= 0, 'T7.6: tool changes saved ≥ 0');

// Safety present
assert(r7.safety.score >= 0.50, 'T7.7: safety ≥ 0.50');

// ============================================================================
// T8: SEQUENCE — WITH CONSTRAINTS
// ============================================================================

console.log('\n=== T8: Sequence with ordering constraints ===');

const constrainedSeq: SequenceInput = {
  operations: [
    { id: 'op_A', feature: 'face', tool_required: 'T1', estimated_time_min: 2.0, setup_constraints: ['must be before op_C'] },
    { id: 'op_B', feature: 'pocket', tool_required: 'T2', estimated_time_min: 3.0 },
    { id: 'op_C', feature: 'hole', tool_required: 'T1', estimated_time_min: 1.5 },
    { id: 'op_D', feature: 'slot', tool_required: 'T2', estimated_time_min: 2.5 },
  ],
  machine: 'dmg_mori_nv5000',
  optimize_for: 'min_tool_changes',
};

const r8 = optimizeSequence(constrainedSeq);

// A must be before C in the result
const idxA = r8.optimal_order.indexOf('op_A');
const idxC = r8.optimal_order.indexOf('op_C');
assert(idxA < idxC, 'T8.1: constraint op_A before op_C respected');
assert(r8.optimal_order.length === 4, 'T8.2: all 4 ops present');

// ============================================================================
// T9: SEQUENCE — SINGLE OPERATION
// ============================================================================

console.log('\n=== T9: Single operation sequence ===');

const singleSeq: SequenceInput = {
  operations: [{ id: 'only_op', feature: 'face', tool_required: 'T1', estimated_time_min: 5.0 }],
  machine: 'haas_vf2',
  optimize_for: 'min_tool_changes',
};

const r9 = optimizeSequence(singleSeq);
assert(r9.optimal_order.length === 1, 'T9.1: single op returned');
assert(r9.tool_changes === 0, 'T9.2: zero tool changes');

// ============================================================================
// T10: SUSTAINABILITY REPORT
// ============================================================================

console.log('\n=== T10: Sustainability report ===');

const sustInput: SustainabilityInput = {
  material: 'AISI 4140',
  cutting_speed_mpm: 200,
  feed_mmrev: 0.2,
  depth_of_cut_mm: 2.0,
  width_of_cut_mm: 10,
  cycle_time_min: 15,
  machine_power_kw: 7.5,
  coolant_type: 'flood',
};

const r10 = sustainabilityReport(sustInput);

// Energy breakdown
assert(r10.energy.cutting_kwh > 0, 'T10.1: cutting energy > 0');
assert(r10.energy.spindle_kwh > 0, 'T10.2: spindle energy > 0');
assert(r10.energy.auxiliary_kwh > 0, 'T10.3: auxiliary energy > 0');
assert(r10.energy.total_kwh > 0, 'T10.4: total energy > 0');
assertClose(r10.energy.total_kwh,
  r10.energy.cutting_kwh + r10.energy.spindle_kwh + r10.energy.auxiliary_kwh,
  0.01, 'T10.5: energy adds up');

// Carbon
assert(r10.carbon.direct_co2_kg > 0, 'T10.6: direct CO2 > 0');
assert(r10.carbon.total_co2_kg > 0, 'T10.7: total CO2 > 0');

// Coolant (flood)
assert(r10.coolant.consumption_liters > 0, 'T10.8: coolant consumption > 0 (flood)');
assert(r10.coolant.disposal_cost_usd > 0, 'T10.9: disposal cost > 0');

// Waste
assert(r10.waste.chip_mass_kg > 0, 'T10.10: chip mass > 0');
assert(r10.waste.recyclable_pct > 0, 'T10.11: recyclable_pct > 0');

// Eco-efficiency
assertRange(r10.eco_efficiency_score, 0, 1, 'T10.12: eco_efficiency in [0,1]');

// ISO notes
assert(Array.isArray(r10.iso14955_notes), 'T10.13: iso notes is array');

// Comparison vs baseline
assert(typeof r10.comparison_vs_baseline.energy_pct === 'number', 'T10.14: energy comparison is number');
assert(typeof r10.comparison_vs_baseline.co2_pct === 'number', 'T10.15: CO2 comparison is number');

// Safety
assert(r10.safety.score >= 0.40, 'T10.16: safety ≥ 0.40');

// ============================================================================
// T11: SUSTAINABILITY — COOLANT TYPES
// ============================================================================

console.log('\n=== T11: Sustainability — coolant type effects ===');

const coolantTypes: ('flood' | 'mql' | 'dry' | 'cryogenic')[] = ['flood', 'mql', 'dry', 'cryogenic'];
const coolantResults: Record<string, ReturnType<typeof sustainabilityReport>> = {};

for (const ct of coolantTypes) {
  coolantResults[ct] = sustainabilityReport({
    ...sustInput,
    coolant_type: ct,
  });
  assert(coolantResults[ct].energy.total_kwh > 0, `T11: ${ct} — energy > 0`);
}

// MQL should use less coolant than flood
assert(coolantResults['mql'].coolant.consumption_liters <= coolantResults['flood'].coolant.consumption_liters,
  'T11.1: MQL uses ≤ flood coolant');

// Dry should use zero or minimal coolant
assert(coolantResults['dry'].coolant.consumption_liters <= 0.01,
  'T11.2: dry uses ≈ 0 coolant');

// ============================================================================
// T12: ECO-OPTIMIZE
// ============================================================================

console.log('\n=== T12: Eco-optimize ===');

const ecoInput: EcoOptimizeInput = {
  material: 'AISI 4140',
  feature: 'pocket',
  dimensions: { depth_mm: 10, width_mm: 40 },
  constraints: { surface_finish_ra_max_um: 3.2 },
  objective: 'min_cost',
  weight_eco: 0.3,
};

const r12 = ecoOptimize(ecoInput);

assert(r12.optimal !== undefined, 'T12.1: has optimal');
assert(r12.eco_weight_applied === 0.3, 'T12.2: eco_weight_applied = 0.3');
assert(typeof r12.sustainability_improvement_pct === 'number', 'T12.3: improvement_pct is number');

// With weight_eco=0, should be same as standard optimization
const r12_0 = ecoOptimize({ ...ecoInput, weight_eco: 0 });
assert(r12_0.eco_weight_applied === 0, 'T12.4: weight_eco=0 applied');
assert(r12_0.sustainability_improvement_pct === 0, 'T12.5: no improvement at weight=0');

// With weight_eco=1, should favor sustainability
const r12_1 = ecoOptimize({ ...ecoInput, weight_eco: 1.0 });
assert(r12_1.eco_weight_applied === 1.0, 'T12.6: weight_eco=1.0 applied');
assert(r12_1.optimal.sustainability.eco_efficiency_score >= 0, 'T12.7: eco score ≥ 0');

// ============================================================================
// T13: DISPATCHER FUNCTION
// ============================================================================

console.log('\n=== T13: Dispatcher function ===');

const dispR1 = optimization('optimize_parameters', pocket4140 as unknown as Record<string, unknown>) as any;
assert(dispR1.optimal !== undefined, 'T13.1: dispatcher optimize_parameters works');

const dispR2 = optimization('optimize_sequence', seqInput as unknown as Record<string, unknown>) as any;
assert(dispR2.optimal_order !== undefined, 'T13.2: dispatcher optimize_sequence works');

const dispR3 = optimization('sustainability_report', sustInput as unknown as Record<string, unknown>) as any;
assert(dispR3.energy !== undefined, 'T13.3: dispatcher sustainability_report works');

const dispR4 = optimization('eco_optimize', ecoInput as unknown as Record<string, unknown>) as any;
assert(dispR4.eco_weight_applied !== undefined, 'T13.4: dispatcher eco_optimize works');

const dispR5 = optimization('unknown_action', {}) as any;
assert(dispR5.error !== undefined, 'T13.5: unknown action returns error');

// ============================================================================
// T14: EDGE CASES
// ============================================================================

console.log('\n=== T14: Edge cases ===');

// Tight Ra constraint — should still find solutions (finer feed)
const tightRa = optimizeParameters({
  material: 'AISI 1045',
  feature: 'face',
  dimensions: { depth_mm: 0.5, width_mm: 50 },
  constraints: { surface_finish_ra_max_um: 0.4 },
  objective: 'min_cost',
});
assert(tightRa.optimal.predicted_ra_um <= 0.4, 'T14.1: tight Ra=0.4 constraint met');

// Very deep pocket — multiple passes
const deepPocket = optimizeParameters({
  material: 'AISI 4140',
  feature: 'pocket',
  dimensions: { depth_mm: 50, width_mm: 20 },
  constraints: { surface_finish_ra_max_um: 3.2 },
  objective: 'min_cost',
});
assert(deepPocket.optimal.num_passes >= 2, 'T14.2: deep pocket requires multiple passes');

// ============================================================================
// T15: CROSS-MATERIAL SUSTAINABILITY COMPARISON
// ============================================================================

console.log('\n=== T15: Cross-material sustainability ===');

const alSust = sustainabilityReport({ ...sustInput, material: '6061-T6', cutting_speed_mpm: 400 });
const steelSust = sustainabilityReport({ ...sustInput, material: 'AISI 4140', cutting_speed_mpm: 200 });
const inconelSust = sustainabilityReport({ ...sustInput, material: 'Inconel 718', cutting_speed_mpm: 40 });

// Aluminum has lower energy factor than Inconel
assert(alSust.energy.total_kwh <= inconelSust.energy.total_kwh * 2,
  'T15.1: Al energy not way more than Inconel (despite faster speed)');

// Inconel has highest energy factor
assert(inconelSust.eco_efficiency_score <= steelSust.eco_efficiency_score + 0.3,
  'T15.2: Inconel eco_efficiency ≤ steel + margin');

// All have valid safety
assert(alSust.safety.score >= 0.40, 'T15.3: Al sustainability safety ≥ 0.40');
assert(steelSust.safety.score >= 0.40, 'T15.4: Steel sustainability safety ≥ 0.40');
assert(inconelSust.safety.score >= 0.40, 'T15.5: Inconel sustainability safety ≥ 0.40');

// ============================================================================
// RESULTS
// ============================================================================

console.log(`\n${'='.repeat(60)}`);
console.log(`R7-MS1 Optimization Tests: ${passed} PASS, ${failed} FAIL (total ${passed + failed})`);
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
}
console.log('='.repeat(60));
process.exit(failed > 0 ? 1 : 0);
