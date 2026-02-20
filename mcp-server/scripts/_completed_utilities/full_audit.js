// Full audit: check fill rate across ALL 2,980 verified materials
const fs = require('fs');
const path = require('path');
const DATA_BASE = 'C:\\PRISM\\data\\materials';

const SCHEMA = [
  'material_id','name','iso_group','material_type','subcategory','condition','data_quality','data_sources',
  'physical.density','physical.melting_point','physical.specific_heat','physical.thermal_conductivity',
  'physical.thermal_expansion','physical.elastic_modulus','physical.poisson_ratio','physical.shear_modulus','physical.bulk_modulus',
  'mechanical.hardness.brinell','mechanical.hardness.vickers',
  'mechanical.tensile_strength.typical','mechanical.tensile_strength.min','mechanical.tensile_strength.max',
  'mechanical.yield_strength.typical','mechanical.yield_strength.min','mechanical.yield_strength.max',
  'mechanical.elongation','mechanical.reduction_of_area','mechanical.impact_strength',
  'mechanical.fatigue_strength','mechanical.fracture_toughness','mechanical.compressive_strength','mechanical.shear_strength',
  'kienzle.kc1_1','kienzle.mc','kienzle.kc1_1_milling','kienzle.mc_milling',
  'kienzle.kc1_1_drilling','kienzle.mc_drilling','kienzle.kc1_1_boring','kienzle.mc_boring','kienzle.kc1_1_reaming','kienzle.mc_reaming',
  'johnson_cook.A','johnson_cook.B','johnson_cook.n','johnson_cook.C','johnson_cook.m',
  'johnson_cook.T_melt','johnson_cook.T_ref','johnson_cook.epsilon_dot_ref','johnson_cook.T_transition',
  'taylor.C','taylor.n','taylor.C_carbide','taylor.n_carbide','taylor.C_hss','taylor.n_hss',
  'chip_formation.chip_type','chip_formation.chip_breaking','chip_formation.built_up_edge_tendency',
  'chip_formation.work_hardening_severity','chip_formation.segmentation_frequency',
  'chip_formation.shear_angle','chip_formation.chip_compression_ratio',
  'cutting_recommendations.turning.speed_roughing','cutting_recommendations.turning.speed_finishing',
  'cutting_recommendations.turning.feed_roughing','cutting_recommendations.turning.feed_finishing',
  'cutting_recommendations.turning.doc_roughing','cutting_recommendations.turning.doc_finishing',
  'cutting_recommendations.turning.coolant_type','cutting_recommendations.turning.coolant_pressure',
  'cutting_recommendations.milling.speed_roughing','cutting_recommendations.milling.speed_finishing',
  'cutting_recommendations.milling.feed_per_tooth_roughing','cutting_recommendations.milling.feed_per_tooth_finishing',
  'cutting_recommendations.milling.doc_roughing','cutting_recommendations.milling.doc_finishing',
  'cutting_recommendations.milling.ae_roughing_pct','cutting_recommendations.milling.ae_finishing_pct',
  'cutting_recommendations.drilling.speed','cutting_recommendations.drilling.feed_per_rev',
  'cutting_recommendations.drilling.peck_depth_ratio','cutting_recommendations.drilling.point_angle',
  'cutting_recommendations.drilling.coolant_type','cutting_recommendations.drilling.coolant_through',
  'cutting_recommendations.tool_material.recommended_grade',
  'cutting_recommendations.tool_material.coating_recommendation',
  'cutting_recommendations.tool_material.geometry_recommendation',
  'machinability.aisi_rating','machinability.relative_to_1212',
  'machinability.surface_finish_tendency','machinability.tool_wear_pattern','machinability.recommended_operations',
  'surface.achievable_ra_turning','surface.achievable_ra_milling','surface.achievable_ra_grinding',
  'surface.surface_integrity_sensitivity','surface.white_layer_risk',
  'thermal.cutting_temperature_factor','thermal.heat_partition_ratio',
  'thermal.thermal_softening_onset','thermal.hot_hardness_retention','thermal.cryogenic_machinability',
  'weldability.rating','weldability.preheat_temperature','weldability.postweld_treatment',
  '_verified.session','_verified.date','_verified.method',
];

function getVal(obj, p) {
  const parts = p.split('.');
  let c = obj;
  for (const k of parts) { if (c===null||c===undefined) return undefined; c = c[k]; }
  return c;
}

const groups = fs.readdirSync(DATA_BASE).filter(d => fs.statSync(path.join(DATA_BASE,d)).isDirectory());
const buckets = { '100%': 0, '95-99%': 0, '90-94%': 0, '80-89%': 0, '<80%': 0 };
let totalMats = 0, totalFilled = 0, totalPossible = 0;
const missingTally = {};
const worstFiles = [];

for (const g of groups) {
  const files = fs.readdirSync(path.join(DATA_BASE,g)).filter(f=>f.includes('verified'));
  for (const f of files) {
    const fp = path.join(DATA_BASE,g,f);
    try {
      const mats = JSON.parse(fs.readFileSync(fp,'utf8')).materials||[];
      let fileFilled = 0, filePossible = 0;
      for (const m of mats) {
        let filled = 0;
        for (const p of SCHEMA) {
          const v = getVal(m, p);
          if (v !== undefined && v !== null) filled++;
          else { missingTally[p] = (missingTally[p]||0) + 1; }
        }
        const pct = filled / SCHEMA.length * 100;
        if (pct >= 100) buckets['100%']++;
        else if (pct >= 95) buckets['95-99%']++;
        else if (pct >= 90) buckets['90-94%']++;
        else if (pct >= 80) buckets['80-89%']++;
        else buckets['<80%']++;
        totalFilled += filled;
        fileFilled += filled;
        totalPossible += SCHEMA.length;
        filePossible += SCHEMA.length;
        totalMats++;
      }
      const filePct = filePossible > 0 ? (fileFilled/filePossible*100).toFixed(1) : 0;
      if (filePct < 90 && mats.length > 0) worstFiles.push({ file: `${g}/${f}`, mats: mats.length, pct: filePct });
    } catch(e) {}
  }
}

console.log(`=== FULL 2,980 MATERIAL AUDIT ===`);
console.log(`Schema params checked: ${SCHEMA.length}`);
console.log(`Total materials: ${totalMats}`);
console.log(`Overall fill rate: ${(totalFilled/totalPossible*100).toFixed(1)}%\n`);

console.log('Distribution:');
for (const [k,v] of Object.entries(buckets)) console.log(`  ${k}: ${v} materials (${(v/totalMats*100).toFixed(1)}%)`);

console.log('\nTop 15 most-missing params:');
const sorted = Object.entries(missingTally).sort((a,b)=>b[1]-a[1]);
for (const [p,c] of sorted.slice(0,15)) console.log(`  ${p}: missing in ${c} materials (${(c/totalMats*100).toFixed(1)}%)`);

if (worstFiles.length > 0) {
  console.log(`\nFiles below 90% fill:`);
  worstFiles.sort((a,b)=>a.pct-b.pct).forEach(f => console.log(`  ${f.file}: ${f.mats} mats, ${f.pct}%`));
}
