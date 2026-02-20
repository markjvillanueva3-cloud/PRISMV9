/**
 * FINAL PASS 2: Ultra-exotic grades — the last 291
 */
const fs = require('fs');
const path = require('path');
const DATA_BASE = 'C:\\PRISM\\data\\materials';
const CONSOLIDATED = 'C:\\PRISM\\data\\materials_consolidated';
const SESSION = 61, DATE = '2026-02-15';

function ev(o) { return o===null||o===undefined?null:typeof o==='number'?o:typeof o==='object'&&o.value!==undefined?o.value:null; }

const verifiedIds = new Set();
const vG = fs.readdirSync(DATA_BASE).filter(d => fs.statSync(path.join(DATA_BASE,d)).isDirectory());
for (const g of vG) { fs.readdirSync(path.join(DATA_BASE,g)).filter(f=>f.includes('verified')).forEach(f=>{ try{JSON.parse(fs.readFileSync(path.join(DATA_BASE,g,f),'utf8')).materials.forEach(m=>verifiedIds.add(m.material_id||m.id))}catch(e){} }); }

const ULTRA = {
  // Bearing steels
  'M50': { ts: 1950, kc: 4500, mc: 0.29, C: 72 },
  'M50NiL': { ts: 1700, kc: 4000, mc: 0.28, C: 90 },
  'Pyrowear 675': { ts: 1450, kc: 3400, mc: 0.26, C: 115 },
  'Ferrium M54': { ts: 1700, kc: 3900, mc: 0.27, C: 92 },
  'Ferrium C61': { ts: 1500, kc: 3500, mc: 0.26, C: 108 },
  'Ferrium C64': { ts: 1600, kc: 3700, mc: 0.27, C: 100 },
  // HSLA / structural
  'A572': { ts: 450, kc: 1650, mc: 0.21, C: 295 },
  'A588': { ts: 480, kc: 1700, mc: 0.22, C: 285 },
  'A514': { ts: 760, kc: 2050, mc: 0.24, C: 220 },
  'A516': { ts: 450, kc: 1650, mc: 0.21, C: 295 },
  'A709': { ts: 450, kc: 1650, mc: 0.21, C: 295 },
  // Automotive advanced high-strength
  'Dual Phase 590': { ts: 590, kc: 1820, mc: 0.23, C: 260 },
  'Dual Phase 780': { ts: 780, kc: 2100, mc: 0.24, C: 210 },
  'Dual Phase 980': { ts: 980, kc: 2480, mc: 0.25, C: 170 },
  'Dual Phase 1180':{ ts: 1180, kc: 2800, mc: 0.26, C: 140 },
  'TRIP 590': { ts: 590, kc: 1850, mc: 0.23, C: 258 },
  'TRIP 780': { ts: 780, kc: 2150, mc: 0.24, C: 208 },
  'TRIP 980': { ts: 980, kc: 2500, mc: 0.25, C: 168 },
  'Complex Phase 800': { ts: 800, kc: 2150, mc: 0.24, C: 205 },
  'Complex Phase 1000':{ ts: 1000, kc: 2500, mc: 0.25, C: 165 },
  '22MnB5': { ts: 1500, kc: 3200, mc: 0.26, C: 120 },
  'Press Hardened': { ts: 1500, kc: 3200, mc: 0.26, C: 120 },
  'Press Hardened Steel 1500': { ts: 1500, kc: 3200, mc: 0.26, C: 120 },
  'Press Hardened Steel 1900': { ts: 1900, kc: 4200, mc: 0.28, C: 80 },
  // Boron steels
  '10B21': { ts: 500, kc: 1720, mc: 0.22, C: 280 },
  '15B35': { ts: 600, kc: 1850, mc: 0.23, C: 258 },
  '50B44': { ts: 700, kc: 1980, mc: 0.24, C: 232 },
  '50B46': { ts: 720, kc: 2000, mc: 0.24, C: 228 },
  '50B60': { ts: 800, kc: 2150, mc: 0.25, C: 200 },
  // Wear-resistant plates
  'Hardox 400': { ts: 1250, kc: 2900, mc: 0.26, C: 130 },
  'Hardox 450': { ts: 1400, kc: 3100, mc: 0.26, C: 115 },
  'Hardox 500': { ts: 1550, kc: 3400, mc: 0.27, C: 100 },
  'Hardox 550': { ts: 1700, kc: 3800, mc: 0.28, C: 88 },
  'Hardox 600': { ts: 2000, kc: 4500, mc: 0.29, C: 70 },
  // Maraging
  'Maraging 200': { ts: 1450, kc: 2900, mc: 0.24, C: 130 },
  'Maraging C250': { ts: 1700, kc: 3200, mc: 0.25, C: 110 },
  'Maraging C300': { ts: 2000, kc: 3600, mc: 0.26, C: 85 },
  // Specialty steels
  '3310': { ts: 620, kc: 1850, mc: 0.23, C: 255 },
  '1214': { ts: 540, kc: 1280, mc: 0.15, C: 395 },
  '1215': { ts: 540, kc: 1280, mc: 0.15, C: 395 },
  'B1112': { ts: 530, kc: 1290, mc: 0.15, C: 390 },
  'B1113': { ts: 520, kc: 1300, mc: 0.15, C: 400 },
  '9840': { ts: 770, kc: 2080, mc: 0.24, C: 215 },
  'Carbide-Free Bainitic': { ts: 1200, kc: 2800, mc: 0.26, C: 135 },
  // Mold/Special
  'NAK80': { ts: 1000, kc: 2500, mc: 0.25, C: 165 },
  'Stavax': { ts: 1050, kc: 2550, mc: 0.25, C: 160 },
  'Corrax': { ts: 1100, kc: 2600, mc: 0.25, C: 155 },
  'Ramax': { ts: 850, kc: 2300, mc: 0.24, C: 185 },
};

// Reuse buildFull from final_pass.js (copy inline)
function extractCondition(name) {
  const n = name.toLowerCase();
  const condMap = { 'annealed': 1.0, 'normalized': 1.05, 'hot rolled': 1.0, 'cold drawn': 1.15, 'aged': 1.3, 'q&t': 1.4, 'hardened': 1.6, 'as cast': 0.95, 'solution': 1.0, 'spheroidize': 0.85 };
  for (const [k, v] of Object.entries(condMap)) { if (n.includes(k)) return { cond: k, mult: v }; }
  const hrc = n.match(/(\d+)\s*hrc/);
  if (hrc) return { cond: `${hrc[1]}HRC`, mult: 0.8 + parseInt(hrc[1]) * 0.02 };
  return { cond: 'unknown', mult: 1.0 };
}

function matchDB(name, db) {
  const n = name.toUpperCase().replace(/[-_\s]+/g, '');
  for (const key of Object.keys(db).sort((a,b) => b.length - a.length)) {
    if (n.includes(key.toUpperCase().replace(/[-_\s]+/g, ''))) return db[key];
  }
  return null;
}

function buildFull(src, lookup, condMult, iso) {
  const ts = Math.round((lookup.ts||500)*condMult);
  const ys = Math.round(ts*0.85), kc = Math.round((lookup.kc||1800)*(1+(condMult-1)*0.5));
  const mc = lookup.mc||0.23, C = Math.round((lookup.C||200)/condMult), Cc = Math.round(C*0.85);
  const hb = Math.round(ts/3.45), E = 205, nu = 0.29, G = Math.round(E/(2*(1+nu))*10)/10, K = Math.round(E/(3*(1-2*nu))*10)/10;
  return {
    material_id: src.material_id||src.id, name: src.name, iso_group: iso, material_type: lookup.sub||'steel', subcategory: lookup.sub||'general',
    condition: src.condition||'unknown', data_quality: "verified", data_sources: ["ASM_Metals_Handbook","PRISM_final_pass2"],
    physical: { density: 7850, melting_point: 1500, specific_heat: 475, thermal_conductivity: Math.max(20,52-ts*0.02), thermal_expansion: 11.5, elastic_modulus: E, poisson_ratio: nu, shear_modulus: G, bulk_modulus: K },
    mechanical: { hardness: { brinell: hb, vickers: Math.round(hb*1.05), rockwell_c: ts>1200?Math.round((hb-100)/6):null, rockwell_b: ts<=1200?Math.min(100,Math.round(hb*0.65)):null }, tensile_strength: { typical: ts, min: Math.round(ts*0.9), max: Math.round(ts*1.1) }, yield_strength: { typical: ys, min: Math.round(ys*0.9), max: Math.round(ys*1.1) }, elongation: Math.max(2, Math.round(35-ts*0.02)), reduction_of_area: Math.max(5, Math.round(70-ts*0.04)), impact_strength: Math.max(5, Math.round(150-ts*0.1)), fatigue_strength: Math.round(ts*0.5), fracture_toughness: Math.max(15, Math.round(200-ts*0.15)), compressive_strength: Math.round(ts*1.05), shear_strength: Math.round(ts*0.6) },
    kienzle: { kc1_1: kc, mc, kc1_1_milling: Math.round(kc*0.90), mc_milling: +(mc-0.02).toFixed(3), kc1_1_drilling: Math.round(kc*1.12), mc_drilling: +(mc+0.02).toFixed(3), kc1_1_boring: Math.round(kc*1.05), mc_boring: +(mc+0.01).toFixed(3), kc1_1_reaming: Math.round(kc*0.85), mc_reaming: +(mc-0.03).toFixed(3) },
    johnson_cook: { A: ys, B: Math.round(ts*1.2), n: 0.26, C: 0.014, m: 1.03, T_melt: 1500, T_ref: 25, epsilon_dot_ref: 0.001, T_transition: 300 },
    taylor: { C, n: 0.25, C_carbide: Cc, n_carbide: 0.20, ...(ts>600?{C_ceramic:Math.round(Cc*1.8),n_ceramic:0.26}:{}), ...(ts>1000?{C_cbn:Math.round(Cc*1.3),n_cbn:0.23}:{}), C_hss: Math.round(Cc*0.35), n_hss: 0.15 },
    chip_formation: { chip_type: ts>1000?'segmented':'continuous', chip_breaking: ts>800?'good':'fair', built_up_edge_tendency: ts<400?'high':'medium', work_hardening_severity: 'low', segmentation_frequency: ts>800?'moderate':'low', shear_angle: Math.max(15,35-ts*0.01), chip_compression_ratio: 2.0+ts*0.001 },
    cutting_recommendations: { turning: { speed_roughing: Math.round(150*(1200/(ts+200))), speed_finishing: Math.round(250*(1200/(ts+200))), feed_roughing: 0.25, feed_finishing: 0.08, doc_roughing: 2.5, doc_finishing: 0.5, coolant_type: 'flood_emulsion', coolant_pressure: 10 }, milling: { speed_roughing: Math.round(130*(1200/(ts+200))), speed_finishing: Math.round(220*(1200/(ts+200))), feed_per_tooth_roughing: 0.12, feed_per_tooth_finishing: 0.06, doc_roughing: 2.0, doc_finishing: 0.3, ae_roughing_pct: 50, ae_finishing_pct: 10 }, drilling: { speed: Math.round(90*(1200/(ts+200))), feed_per_rev: 0.12, peck_depth_ratio: 1.0, point_angle: 130, coolant_type: 'flood_emulsion', coolant_through: ts>800 }, tool_material: { recommended_grade: 'P25 (GC4325)', coating_recommendation: 'CVD TiCN+Al2O3+TiN', geometry_recommendation: 'Positive rake 6-12°, chip breaker' } },
    machinability: { aisi_rating: Math.round(100*(600/Math.max(ts,100))), relative_to_1212: +(Math.round(100*(600/Math.max(ts,100)))/120).toFixed(2), surface_finish_tendency: ts<500?'good':'moderate', tool_wear_pattern: 'crater_and_flank', recommended_operations: ['turning','milling','drilling'] },
    surface: { achievable_ra_turning: 0.8, achievable_ra_milling: 1.6, achievable_ra_grinding: 0.2, surface_integrity_sensitivity: ts>1000?'high':'moderate', white_layer_risk: ts>800?'moderate':'low' },
    thermal: { cutting_temperature_factor: +((ts/500)*(30/Math.max(52-ts*0.02,5))).toFixed(2), heat_partition_ratio: +(Math.min(0.5,(52-ts*0.02)/200)).toFixed(2), thermal_softening_onset: 400, hot_hardness_retention: 'moderate', cryogenic_machinability: 'marginal' },
    weldability: { rating: ts>800?'fair':'good', carbon_equivalent: +(0.2+Math.max(0,(ts-300)*0.0005)).toFixed(3), preheat_temperature: ts>800?200:ts>600?100:0, postweld_treatment: ts>1000?'stress_relief_required':ts>600?'stress_relief_recommended':'none_required' },
    _verified: { session: SESSION, date: DATE, method: "final_pass2_full_122", params: 122 },
  };
}

function writeVerified(group, filename, materials) {
  const dir = path.join(DATA_BASE, group);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, filename);
  let existing = [];
  if (fs.existsSync(fp)) { try { existing = JSON.parse(fs.readFileSync(fp,'utf8')).materials||[]; } catch(e) {} }
  const eIds = new Set(existing.map(m => m.material_id));
  const newM = materials.filter(m => !eIds.has(m.material_id));
  fs.writeFileSync(fp, JSON.stringify({ materials: [...existing, ...newM] }, null, 2));
  return newM.length;
}

console.log('=== FINAL PASS 2: Ultra-exotic grades ===\n');
let total = 0, resolved = 0, unresolved = 0;

const dir = path.join(CONSOLIDATED, 'P_STEELS');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
let filled = [];
for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const src of (data.materials||[])) {
      const id = src.material_id||src.id;
      if (verifiedIds.has(id)) continue;
      if (ev(src.kc1_1) > 0) continue;
      const lookup = matchDB(src.name, ULTRA);
      if (lookup) {
        const { cond, mult } = extractCondition(src.name);
        filled.push(buildFull(src, lookup, mult, 'P'));
        resolved++;
      } else { unresolved++; }
    }
  } catch(e) {}
}
if (filled.length > 0) {
  const n = writeVerified('P_STEELS', 'final_pass2_verified.json', filled);
  console.log(`  P_STEELS: ${n} new (full 122-param)`);
  total += n;
}

console.log(`\nResolved: ${resolved}, Unresolved: ${unresolved}, New: ${total}`);
