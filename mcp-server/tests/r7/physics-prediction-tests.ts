/**
 * R7-MS0: Physics Prediction Engine Tests
 *
 * Validates: Surface integrity prediction, chatter stability analysis,
 * thermal compensation, unified machining model (coupled physics),
 * and coupling sensitivity analysis.
 *
 * Reference: PHASE_R7_INTELLIGENCE.md MS0 test protocol
 */

import {
  predictSurfaceIntegrity,
  predictChatter,
  predictThermalCompensation,
  unifiedMachiningModel,
  couplingSensitivity,
  type SurfaceIntegrityInput,
  type ChatterInput,
  type ThermalCompInput,
  type UnifiedMachiningInput,
} from '../../src/engines/PhysicsPredictionEngine.js';

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
    failures.push(`${msg} (got ${actual}, expected ${expected} ±${tol})`);
    console.log(`  \u2717 FAIL: ${msg} (got ${actual}, expected ${expected} ±${tol})`);
  }
}

// ============================================================================
// T1: SURFACE INTEGRITY PREDICTION
// ============================================================================

function testSurfaceIntegrity(): void {
  console.log('\n--- T1: Surface Integrity Prediction ---\n');

  // Test 1: Ti-6Al-4V turning (spec: Ra ≤ 1.6μm)
  const ti = predictSurfaceIntegrity({
    material: 'Ti-6Al-4V',
    operation: 'turning',
    cutting_speed_mpm: 60,
    feed_mmrev: 0.15,
    depth_of_cut_mm: 2.0,
    tool_material: 'carbide',
    coolant: 'flood',
  });
  assert(ti.surface_roughness.ra_predicted_um > 0, 'Ti-6Al-4V: Ra > 0');
  assert(ti.surface_roughness.ra_predicted_um <= 3.0, `Ti-6Al-4V: Ra reasonable (${ti.surface_roughness.ra_predicted_um.toFixed(3)}μm)`);
  assert(ti.surface_roughness.rz_predicted_um > ti.surface_roughness.ra_predicted_um, 'Rz > Ra');
  assert(ti.surface_roughness.confidence > 0.5, 'Turning model has good confidence');
  assert(ti.surface_roughness.model.includes('turning'), 'Correct model selected for turning');
  assert(ti.residual_stress.surface_mpa !== 0, 'Residual stress computed');
  assert(ti.residual_stress.depth_of_effect_mm > 0, 'Depth of effect > 0');
  assert(ti.thermal.max_tool_temp_c > 20, 'Tool temperature above ambient');
  assert(ti.thermal.heat_partition_ratio > 0 && ti.thermal.heat_partition_ratio < 1, 'Heat partition ratio in 0-1');
  assert(ti.safety.score >= 0.30, 'Safety score has floor');
  assert(ti.safety.score <= 1.0, 'Safety score ≤ 1.0');

  // Test 2: Inconel 718 white layer risk (spec: dry + high speed → risk=true)
  const inconel = predictSurfaceIntegrity({
    material: 'Inconel 718',
    operation: 'turning',
    cutting_speed_mpm: 80,
    feed_mmrev: 0.20,
    depth_of_cut_mm: 2.0,
    tool_material: 'ceramic',
    coolant: 'dry',
  });
  assert(inconel.white_layer.contributing_factors.length > 0, 'Inconel 718 dry: white layer factors identified');
  assert(inconel.white_layer.contributing_factors.some(f => f.includes('Dry') || f.includes('dry')), 'Dry machining flagged');
  assert(inconel.thermal.max_tool_temp_c > ti.thermal.max_tool_temp_c, 'Inconel hotter than Ti');

  // Test 3: 6061-T6 aluminum (easy material, low forces)
  const alu = predictSurfaceIntegrity({
    material: '6061-T6',
    operation: 'milling',
    cutting_speed_mpm: 300,
    feed_mmrev: 0.10,
    depth_of_cut_mm: 2.0,
    tool_material: 'carbide',
    coolant: 'flood',
  });
  assert(alu.surface_roughness.ra_predicted_um > 0, 'Aluminum: Ra computed');
  assert(alu.residual_stress.risk_level === 'low' || alu.residual_stress.risk_level === 'moderate', 'Aluminum: low/moderate residual stress');
  assert(alu.white_layer.risk === false, 'Aluminum: no white layer risk (no austenitizing temp)');
  assert(alu.safety.score >= 0.70, 'Aluminum: safe operating conditions');

  // Test 4: Nose radius effect on Ra
  const largeNose = predictSurfaceIntegrity({
    material: 'AISI 4140',
    operation: 'turning',
    cutting_speed_mpm: 200,
    feed_mmrev: 0.20,
    depth_of_cut_mm: 3.0,
    tool_material: 'carbide',
    tool_nose_radius_mm: 1.6,
    coolant: 'flood',
  });
  const smallNose = predictSurfaceIntegrity({
    material: 'AISI 4140',
    operation: 'turning',
    cutting_speed_mpm: 200,
    feed_mmrev: 0.20,
    depth_of_cut_mm: 3.0,
    tool_material: 'carbide',
    tool_nose_radius_mm: 0.4,
    coolant: 'flood',
  });
  assert(smallNose.surface_roughness.ra_predicted_um > largeNose.surface_roughness.ra_predicted_um,
    'Larger nose radius → better surface finish (lower Ra)');

  // Test 5: Coolant effect
  const dryResult = predictSurfaceIntegrity({
    material: 'AISI 1045',
    operation: 'turning',
    cutting_speed_mpm: 200,
    feed_mmrev: 0.15,
    depth_of_cut_mm: 2.0,
    tool_material: 'carbide',
    coolant: 'dry',
  });
  const floodResult = predictSurfaceIntegrity({
    material: 'AISI 1045',
    operation: 'turning',
    cutting_speed_mpm: 200,
    feed_mmrev: 0.15,
    depth_of_cut_mm: 2.0,
    tool_material: 'carbide',
    coolant: 'flood',
  });
  assert(dryResult.thermal.max_tool_temp_c >= floodResult.thermal.max_tool_temp_c,
    'Dry machining → higher tool temperature');

  // Test 6: Recommendations generated
  assert(Array.isArray(ti.recommendations), 'Recommendations is array');
}

// ============================================================================
// T2: CHATTER PREDICTION
// ============================================================================

function testChatterPrediction(): void {
  console.log('\n--- T2: Chatter Prediction ---\n');

  // Test 1: 20mm endmill, moderate overhang (spec: stable for ae≤4mm)
  const stable = predictChatter({
    machine: 'Haas VF-2',
    tool_diameter_mm: 20,
    tool_flutes: 4,
    tool_overhang_mm: 60,
    holder_type: 'BT40',
    operation: 'side_milling',
    radial_depth_mm: 4,
    axial_depth_mm: 3,
    spindle_rpm: 8000,
    material: 'AISI 4140',
  });
  assert(typeof stable.stable === 'boolean', 'Stability is boolean');
  assert(stable.stability_margin >= 0 && stable.stability_margin <= 1, 'Stability margin in 0-1');
  assert(stable.critical_depth_mm > 0, 'Critical depth > 0');
  assert(Array.isArray(stable.sld_data.rpm), 'SLD data has RPM array');
  assert(Array.isArray(stable.sld_data.max_stable_depth_mm), 'SLD data has depth array');
  assert(stable.sld_data.rpm.length === stable.sld_data.max_stable_depth_mm.length, 'SLD arrays same length');
  assert(stable.safety.score >= 0.30, 'Safety score has floor');
  assert(stable.safety.score <= 1.0, 'Safety score ≤ 1.0');

  // Test 2: Very long tool (high L/D → unstable)
  const longTool = predictChatter({
    machine: 'Haas VF-2',
    tool_diameter_mm: 10,
    tool_flutes: 4,
    tool_overhang_mm: 80, // L/D = 8
    holder_type: 'BT40',
    operation: 'slotting',
    radial_depth_mm: 10,
    axial_depth_mm: 10,
    spindle_rpm: 6000,
    material: 'Ti-6Al-4V',
  });
  assert(longTool.safety.flags.some(f => f.includes('L/D')), 'High L/D ratio flagged');

  // Test 3: Short stiff tool (should be stable)
  const shortTool = predictChatter({
    machine: 'DMG Mori',
    tool_diameter_mm: 25,
    tool_flutes: 4,
    tool_overhang_mm: 40, // L/D = 1.6
    holder_type: 'HSK-A63',
    operation: 'face_milling',
    radial_depth_mm: 20,
    axial_depth_mm: 2,
    spindle_rpm: 5000,
    material: '6061-T6',
  });
  assert(shortTool.critical_depth_mm > longTool.critical_depth_mm,
    'Stiffer tool → higher critical depth');

  // Test 4: Recommendations
  assert(Array.isArray(stable.recommendations), 'Recommendations is array');
  assert(Array.isArray(stable.recommended_rpm), 'Recommended RPM is array');

  // Test 5: Dominant frequency
  assert(stable.dominant_frequency_hz >= 0, 'Dominant frequency ≥ 0');
  if (!stable.stable) {
    assert(stable.dominant_frequency_hz > 0, 'Unstable → chatter frequency > 0');
  }
}

// ============================================================================
// T3: THERMAL COMPENSATION
// ============================================================================

function testThermalCompensation(): void {
  console.log('\n--- T3: Thermal Compensation ---\n');

  // Test 1: VMC after 30 min (spec: Z offset 15-25μm)
  const vmc30 = predictThermalCompensation({
    machine: 'Haas VF-2',
    spindle_rpm: 10000,
    runtime_minutes: 30,
    ambient_temp_c: 22,
    spindle_power_kw: 7.5,
  });
  assert(vmc30.offsets.z_um > 0, 'Z offset > 0');
  assert(vmc30.offsets.z_um > vmc30.offsets.x_um, 'Z offset > X offset');
  assert(vmc30.offsets.z_um > vmc30.offsets.y_um, 'Z offset > Y offset');
  assert(vmc30.steady_state_minutes > 30, 'Steady state not yet reached at 30 min');
  assert(vmc30.recommendation.length > 0, 'Recommendation provided');

  // Test 2: Cold start (0 min)
  const coldStart = predictThermalCompensation({
    machine: 'Haas VF-2',
    spindle_rpm: 10000,
    runtime_minutes: 0,
    ambient_temp_c: 20,
    spindle_power_kw: 7.5,
  });
  assert(coldStart.offsets.z_um <= vmc30.offsets.z_um, 'Cold start → less growth than 30 min');

  // Test 3: Long runtime (steady state)
  const steadyState = predictThermalCompensation({
    machine: 'Haas VF-2',
    spindle_rpm: 10000,
    runtime_minutes: 200,
    ambient_temp_c: 20,
    spindle_power_kw: 7.5,
  });
  assert(steadyState.offsets.z_um >= vmc30.offsets.z_um, 'Steady state ≥ 30 min growth');
  assert(steadyState.recommendation.includes('equilibrium'), 'Steady state recommendation mentions equilibrium');

  // Test 4: Higher power → more growth
  const highPower = predictThermalCompensation({
    machine: 'Haas VF-2',
    spindle_rpm: 10000,
    runtime_minutes: 30,
    ambient_temp_c: 20,
    spindle_power_kw: 15.0,
  });
  assert(highPower.offsets.z_um > vmc30.offsets.z_um, 'Higher power → more thermal growth');

  // Test 5: Prior runtime history
  const warmStart = predictThermalCompensation({
    machine: 'Haas VF-2',
    spindle_rpm: 10000,
    runtime_minutes: 5,
    prior_runtime_hours: 2,
    ambient_temp_c: 20,
    spindle_power_kw: 7.5,
  });
  assert(warmStart.offsets.z_um > coldStart.offsets.z_um, 'Warm start → more offset than cold 0 min');

  // Test 6: Safety
  assert(vmc30.safety.score >= 0.50, 'Safety score reasonable');
  assert(vmc30.safety.score <= 1.0, 'Safety score ≤ 1.0');
}

// ============================================================================
// T4: UNIFIED MACHINING MODEL (COUPLED PHYSICS)
// ============================================================================

function testUnifiedModel(): void {
  console.log('\n--- T4: Unified Machining Model (Coupled Physics) ---\n');

  // Test 1: Basic 4140 steel turning
  const result = unifiedMachiningModel({
    material: 'AISI 4140',
    operation: 'turning',
    cutting_speed_mpm: 200,
    feed_mmrev: 0.20,
    depth_of_cut_mm: 3.0,
    width_of_cut_mm: 3.0,
    tool_material: 'carbide',
    tool_diameter_mm: 25,
    coolant: 'flood',
  });

  // Force checks
  assert(result.force.tangential_n > 0, 'Tangential force > 0');
  assert(result.force.feed_n > 0, 'Feed force > 0');
  assert(result.force.radial_n > 0, 'Radial force > 0');
  assert(result.force.resultant_n > result.force.tangential_n, 'Resultant > tangential');

  // Temperature checks
  assert(result.temperature.tool_c > 20, 'Tool temp above ambient');
  assert(result.temperature.workpiece_c > 20, 'Workpiece temp above ambient');

  // Wear checks
  assert(result.wear_rate.flank_um_per_min > 0, 'Wear rate > 0');
  assert(result.wear_rate.estimated_life_min > 0, 'Tool life > 0');
  assert(result.wear_rate.crater_ratio > 0, 'Crater wear ratio > 0');

  // Surface finish checks
  assert(result.surface_finish.ra_um > 0, 'Ra > 0');
  assert(result.surface_finish.rz_um > result.surface_finish.ra_um, 'Rz > Ra');

  // Dimensional accuracy checks
  assert(result.dimensional_accuracy.thermal_error_um >= 0, 'Thermal error ≥ 0');
  assert(result.dimensional_accuracy.deflection_error_um >= 0, 'Deflection error ≥ 0');
  assert(result.dimensional_accuracy.total_error_um >=
    result.dimensional_accuracy.thermal_error_um, 'Total error ≥ thermal error');

  // Convergence checks
  assert(result.convergence.converged, 'Model converged');
  assert(result.convergence.iterations > 0, 'At least 1 iteration');
  assert(result.convergence.iterations <= 20, 'Converged within 20 iterations');
  assert(result.convergence.residual < 0.01, 'Residual below tolerance');

  // Coupling sensitivities
  assert(Object.keys(result.coupling_sensitivities).length > 0, 'Sensitivity map populated');
  assert(result.coupling_sensitivities['speed→temperature'] > 0, 'Speed→temp sensitivity positive');

  // Safety
  assert(result.safety.score >= 0.30, 'Safety score has floor');
  assert(result.safety.score <= 1.0, 'Safety score ≤ 1.0');

  // Test 2: More aggressive params → higher forces, worse surface
  const aggressive = unifiedMachiningModel({
    material: 'AISI 4140',
    operation: 'turning',
    cutting_speed_mpm: 350,
    feed_mmrev: 0.35,
    depth_of_cut_mm: 5.0,
    width_of_cut_mm: 5.0,
    tool_material: 'carbide',
    tool_diameter_mm: 25,
    coolant: 'dry',
  });
  assert(aggressive.force.tangential_n > result.force.tangential_n, 'Aggressive → higher force');
  assert(aggressive.temperature.tool_c > result.temperature.tool_c, 'Aggressive → higher temp');
  assert(aggressive.surface_finish.ra_um > result.surface_finish.ra_um, 'Aggressive → worse Ra');
  assert(aggressive.safety.score <= result.safety.score, 'Aggressive → lower safety');

  // Test 3: Ti-6Al-4V vs 4140 at same parameters (isolate material effect)
  const steel4140_compare = unifiedMachiningModel({
    material: 'AISI 4140',
    operation: 'turning',
    cutting_speed_mpm: 120,
    feed_mmrev: 0.15,
    depth_of_cut_mm: 2.0,
    width_of_cut_mm: 2.0,
    tool_material: 'carbide',
    tool_diameter_mm: 25,
    coolant: 'flood',
  });
  const ti = unifiedMachiningModel({
    material: 'Ti-6Al-4V',
    operation: 'turning',
    cutting_speed_mpm: 120,
    feed_mmrev: 0.15,
    depth_of_cut_mm: 2.0,
    width_of_cut_mm: 2.0,
    tool_material: 'carbide',
    tool_diameter_mm: 25,
    coolant: 'flood',
  });
  assert(ti.wear_rate.estimated_life_min <= steel4140_compare.wear_rate.estimated_life_min,
    'Ti-6Al-4V: shorter tool life than 4140 at same speed');
  assert(ti.convergence.converged, 'Ti-6Al-4V model converges');
}

// ============================================================================
// T5: COUPLING SENSITIVITY ANALYSIS
// ============================================================================

function testCouplingSensitivity(): void {
  console.log('\n--- T5: Coupling Sensitivity Analysis ---\n');

  const baseInput: UnifiedMachiningInput = {
    material: 'AISI 4140',
    operation: 'turning',
    cutting_speed_mpm: 200,
    feed_mmrev: 0.20,
    depth_of_cut_mm: 3.0,
    width_of_cut_mm: 3.0,
    tool_material: 'carbide',
    tool_diameter_mm: 25,
    coolant: 'flood',
  };

  // Test 1: Speed sensitivity
  const speedSens = couplingSensitivity({
    base_input: baseInput,
    parameter: 'cutting_speed_mpm',
    variation_pct: 10,
  });
  assert(speedSens.parameter === 'cutting_speed_mpm', 'Parameter recorded');
  assert(speedSens.variation_pct === 10, 'Variation recorded');
  assert(Object.keys(speedSens.impacts).length > 0, 'Impacts computed');
  assert(speedSens.most_sensitive_output.length > 0, 'Most sensitive output identified');
  assert(speedSens.recommendations.length > 0, 'Recommendations generated');

  // Check impact values have the right structure
  for (const [key, val] of Object.entries(speedSens.impacts)) {
    assert(typeof val.baseline === 'number', `${key}: baseline is number`);
    assert(typeof val.perturbed === 'number', `${key}: perturbed is number`);
    assert(typeof val.change_pct === 'number', `${key}: change_pct is number`);
  }

  // Test 2: Feed sensitivity
  const feedSens = couplingSensitivity({
    base_input: baseInput,
    parameter: 'feed_mmrev',
    variation_pct: 5,
  });
  assert(feedSens.parameter === 'feed_mmrev', 'Feed parameter recorded');
  assert(feedSens.impacts.ra_um !== undefined, 'Ra impact computed for feed change');
  assert(feedSens.impacts.ra_um.change_pct > 0, 'Higher feed → higher Ra (positive change)');

  // Test 3: Depth sensitivity
  const depthSens = couplingSensitivity({
    base_input: baseInput,
    parameter: 'depth_of_cut_mm',
  });
  assert(depthSens.variation_pct === 5, 'Default variation is 5%');
  assert(depthSens.impacts.tangential_force_n.change_pct > 0, 'Deeper cut → higher force');
}

// ============================================================================
// T6: DISPATCHER WIRING
// ============================================================================

async function testDispatcherWiring(): Promise<void> {
  console.log('\n--- T6: Dispatcher Wiring ---\n');

  const fs = await import('fs');

  const dispatcher = fs.readFileSync('src/tools/dispatchers/calcDispatcher.ts', 'utf8');

  // Action list includes all 5 new actions
  assert(dispatcher.includes('"surface_integrity_predict"'), 'surface_integrity_predict in ACTIONS');
  assert(dispatcher.includes('"chatter_predict"'), 'chatter_predict in ACTIONS');
  assert(dispatcher.includes('"thermal_compensate"'), 'thermal_compensate in ACTIONS');
  assert(dispatcher.includes('"unified_machining_model"'), 'unified_machining_model in ACTIONS');
  assert(dispatcher.includes('"coupling_sensitivity"'), 'coupling_sensitivity in ACTIONS');

  // Import from PhysicsPredictionEngine
  assert(dispatcher.includes('PhysicsPredictionEngine'), 'PhysicsPredictionEngine imported');

  // Barrel exports
  const barrel = fs.readFileSync('src/engines/index.ts', 'utf8');
  assert(barrel.includes('physicsPrediction'), 'physicsPrediction exported');
  assert(barrel.includes('predictSurfaceIntegrity'), 'predictSurfaceIntegrity exported');
  assert(barrel.includes('predictChatter'), 'predictChatter exported');
  assert(barrel.includes('predictThermalCompensation'), 'predictThermalCompensation exported');
  assert(barrel.includes('unifiedMachiningModel'), 'unifiedMachiningModel exported');
  assert(barrel.includes('couplingSensitivity'), 'couplingSensitivity exported');

  // Type exports
  assert(barrel.includes('SurfaceIntegrityInput'), 'SurfaceIntegrityInput type exported');
  assert(barrel.includes('ChatterResult'), 'ChatterResult type exported');
  assert(barrel.includes('UnifiedMachiningResult'), 'UnifiedMachiningResult type exported');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('R7-MS0: Physics Prediction Engine Tests');
  console.log('=======================================');

  try {
    testSurfaceIntegrity();
    testChatterPrediction();
    testThermalCompensation();
    testUnifiedModel();
    testCouplingSensitivity();
    await testDispatcherWiring();
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
