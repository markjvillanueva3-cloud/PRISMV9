// Audit: Compare our verified output against the full 127-param schema
const fs = require('fs');
const path = require('path');
const DATA_BASE = 'C:\\PRISM\\data\\materials';

// Load one material from each generation method
const files = [
  { label: 'Original R1 (hand-authored)', path: 'P_STEELS/low_carbon_verified.json' },
  { label: 'gen_v5 promoted', path: 'P_STEELS/gen_v5_promoted_verified.json' },
  { label: 'Name-resolved', path: 'P_STEELS/name_resolved_verified.json' },
  { label: 'Mega promoted N', path: 'N_NONFERROUS/gen_v5_promoted_verified.json' },
  { label: 'Mega promoted X', path: 'X_SPECIALTY/gen_v5_promoted_verified.json' },
  { label: 'Handbook authored S', path: 'S_SUPERALLOYS/advanced_superalloys_verified.json' },
];

// Full 127-param schema
const SCHEMA_127 = [
  // Identity (8)
  'material_id', 'name', 'iso_group', 'material_type', 'subcategory', 'condition', 'data_quality', 'data_sources',
  // Physical (9)
  'physical.density', 'physical.melting_point', 'physical.specific_heat', 'physical.thermal_conductivity',
  'physical.thermal_expansion', 'physical.elastic_modulus', 'physical.poisson_ratio', 'physical.shear_modulus', 'physical.bulk_modulus',
  // Hardness (4)
  'mechanical.hardness.brinell', 'mechanical.hardness.vickers', 'mechanical.hardness.rockwell_c', 'mechanical.hardness.rockwell_b',
  // Mechanical (13)
  'mechanical.tensile_strength.typical', 'mechanical.tensile_strength.min', 'mechanical.tensile_strength.max',
  'mechanical.yield_strength.typical', 'mechanical.yield_strength.min', 'mechanical.yield_strength.max',
  'mechanical.elongation', 'mechanical.reduction_of_area', 'mechanical.impact_strength',
  'mechanical.fatigue_strength', 'mechanical.fracture_toughness',
  'mechanical.compressive_strength', 'mechanical.shear_strength',
  // Kienzle (10)
  'kienzle.kc1_1', 'kienzle.mc', 'kienzle.kc1_1_milling', 'kienzle.mc_milling',
  'kienzle.kc1_1_drilling', 'kienzle.mc_drilling',
  'kienzle.kc1_1_boring', 'kienzle.mc_boring', 'kienzle.kc1_1_reaming', 'kienzle.mc_reaming',
  // Johnson-Cook (9)
  'johnson_cook.A', 'johnson_cook.B', 'johnson_cook.n', 'johnson_cook.C', 'johnson_cook.m',
  'johnson_cook.T_melt', 'johnson_cook.T_ref', 'johnson_cook.epsilon_dot_ref', 'johnson_cook.T_transition',
  // Taylor (12)
  'taylor.C', 'taylor.n', 'taylor.C_carbide', 'taylor.n_carbide',
  'taylor.C_ceramic', 'taylor.n_ceramic', 'taylor.C_cbn', 'taylor.n_cbn',
  'taylor.C_pcd', 'taylor.n_pcd', 'taylor.C_hss', 'taylor.n_hss',
  // Chip formation (7)
  'chip_formation.chip_type', 'chip_formation.chip_breaking', 'chip_formation.built_up_edge_tendency',
  'chip_formation.work_hardening_severity', 'chip_formation.segmentation_frequency',
  'chip_formation.shear_angle', 'chip_formation.chip_compression_ratio',
  // Cutting recommendations turning (8)
  'cutting_recommendations.turning.speed_roughing', 'cutting_recommendations.turning.speed_finishing',
  'cutting_recommendations.turning.feed_roughing', 'cutting_recommendations.turning.feed_finishing',
  'cutting_recommendations.turning.doc_roughing', 'cutting_recommendations.turning.doc_finishing',
  'cutting_recommendations.turning.coolant_type', 'cutting_recommendations.turning.coolant_pressure',
  // Cutting recommendations milling (8)
  'cutting_recommendations.milling.speed_roughing', 'cutting_recommendations.milling.speed_finishing',
  'cutting_recommendations.milling.feed_per_tooth_roughing', 'cutting_recommendations.milling.feed_per_tooth_finishing',
  'cutting_recommendations.milling.doc_roughing', 'cutting_recommendations.milling.doc_finishing',
  'cutting_recommendations.milling.ae_roughing_pct', 'cutting_recommendations.milling.ae_finishing_pct',
  // Cutting recommendations drilling (6)
  'cutting_recommendations.drilling.speed', 'cutting_recommendations.drilling.feed_per_rev',
  'cutting_recommendations.drilling.peck_depth_ratio', 'cutting_recommendations.drilling.point_angle',
  'cutting_recommendations.drilling.coolant_type', 'cutting_recommendations.drilling.coolant_through',
  // Tool material recommendations (3)
  'cutting_recommendations.tool_material.recommended_grade', 'cutting_recommendations.tool_material.coating_recommendation',
  'cutting_recommendations.tool_material.geometry_recommendation',
  // Machinability (5)
  'machinability.aisi_rating', 'machinability.relative_to_1212',
  'machinability.surface_finish_tendency', 'machinability.tool_wear_pattern', 'machinability.recommended_operations',
  // Surface (5)
  'surface.achievable_ra_turning', 'surface.achievable_ra_milling', 'surface.achievable_ra_grinding',
  'surface.surface_integrity_sensitivity', 'surface.white_layer_risk',
  // Thermal machining (5)
  'thermal.cutting_temperature_factor', 'thermal.heat_partition_ratio',
  'thermal.thermal_softening_onset', 'thermal.hot_hardness_retention', 'thermal.cryogenic_machinability',
  // Weldability (4)
  'weldability.rating', 'weldability.carbon_equivalent', 'weldability.preheat_temperature', 'weldability.postweld_treatment',
  // Standards (3)
  'standards.din', 'standards.en', 'standards.uns',
  // Metadata (3)
  '_verified.session', '_verified.date', '_verified.method',
];

function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const p of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[p];
  }
  return current;
}

for (const f of files) {
  const fp = path.join(DATA_BASE, f.path);
  if (!fs.existsSync(fp)) { console.log(`SKIP: ${f.path}`); continue; }
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const mat = data.materials[0];
  
  let filled = 0, missing = 0, nulled = 0;
  const missingParams = [];
  
  for (const param of SCHEMA_127) {
    const val = getNestedValue(mat, param);
    if (val === undefined) { missing++; missingParams.push(param); }
    else if (val === null) { nulled++; }
    else { filled++; }
  }
  
  console.log(`\n=== ${f.label} (${mat.name}) ===`);
  console.log(`  Filled: ${filled}/${SCHEMA_127.length} (${Math.round(filled/SCHEMA_127.length*100)}%)`);
  console.log(`  Null (intentional): ${nulled}`);
  console.log(`  Missing: ${missing}`);
  if (missingParams.length > 0) {
    console.log(`  Missing params: ${missingParams.join(', ')}`);
  }
}

console.log(`\n\nTotal schema params: ${SCHEMA_127.length}`);
