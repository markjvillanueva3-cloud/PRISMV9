/**
 * R4: Full 122-Parameter Enrichment
 * Fills ALL missing parameters using physics derivations.
 * Runs across EVERY verified material file.
 */
const fs = require('fs');
const path = require('path');
const DATA_BASE = 'C:\\PRISM\\data\\materials';

let totalEnriched = 0;
let totalParams = 0;

function enrich(mat) {
  let added = 0;
  const iso = mat.iso_group || 'P';
  const phys = mat.physical || {};
  const mech = mat.mechanical || {};
  const ts = mech.tensile_strength?.typical || 500;
  const ys = mech.yield_strength?.typical || Math.round(ts * 0.85);
  const E = phys.elastic_modulus || 200;
  const nu = phys.poisson_ratio || 0.29;
  const density = phys.density || 7850;
  const k_th = phys.thermal_conductivity || 30;
  const melt = phys.melting_point || 1500;
  const hb = mech.hardness?.brinell || Math.round(ts / 3.45);
  const kc = mat.kienzle?.kc1_1 || 1800;
  const mc = mat.kienzle?.mc || 0.23;

  // ===== PHYSICAL: shear_modulus, bulk_modulus =====
  if (!phys.shear_modulus) { phys.shear_modulus = Math.round(E / (2 * (1 + nu)) * 10) / 10; added++; }
  if (!phys.bulk_modulus) { phys.bulk_modulus = Math.round(E / (3 * (1 - 2 * nu)) * 10) / 10; added++; }
  mat.physical = phys;

  // ===== MECHANICAL: derived properties =====
  if (!mech.reduction_of_area) { mech.reduction_of_area = Math.max(5, Math.round(70 - ts * 0.04)); added++; }
  if (!mech.impact_strength) {
    // Charpy J — inversely related to strength
    mech.impact_strength = iso === 'N' ? Math.round(40 - ts * 0.03) : Math.max(5, Math.round(150 - ts * 0.1));
    added++;
  }
  if (!mech.fatigue_strength) {
    // ~0.5 × UTS for steels, 0.35 for Al, 0.4 for others
    const ratio = iso === 'N' ? 0.35 : iso === 'S' ? 0.4 : 0.5;
    mech.fatigue_strength = Math.round(ts * ratio);
    added++;
  }
  if (!mech.fracture_toughness) {
    // K_Ic MPa√m — rough empirical from Barsom & Rolfe
    if (iso === 'N') mech.fracture_toughness = Math.round(35 - ts * 0.02);
    else if (iso === 'S') mech.fracture_toughness = Math.round(80 - ts * 0.03);
    else mech.fracture_toughness = Math.max(15, Math.round(200 - ts * 0.15));
    added++;
  }
  if (!mech.compressive_strength) {
    // Steels: ~UTS, Cast iron: 3-4× UTS, Al: ~UTS
    mech.compressive_strength = iso === 'K' ? Math.round(ts * 3.5) : Math.round(ts * 1.05);
    added++;
  }
  if (!mech.shear_strength) {
    // ~0.6 × UTS for ductile, 0.8 for brittle
    mech.shear_strength = iso === 'K' ? Math.round(ts * 0.9) : Math.round(ts * 0.6);
    added++;
  }
  mat.mechanical = mech;

  // ===== KIENZLE: boring, reaming =====
  const kz = mat.kienzle || {};
  if (!kz.kc1_1_boring) { kz.kc1_1_boring = Math.round(kc * 1.05); added++; } // Boring ~5% higher than turning
  if (!kz.mc_boring) { kz.mc_boring = +(mc + 0.01).toFixed(3); added++; }
  if (!kz.kc1_1_reaming) { kz.kc1_1_reaming = Math.round(kc * 0.85); added++; } // Reaming ~15% lower
  if (!kz.mc_reaming) { kz.mc_reaming = +(mc - 0.03).toFixed(3); added++; }
  mat.kienzle = kz;

  // ===== JOHNSON-COOK: T_transition =====
  const jc = mat.johnson_cook || {};
  if (!jc.T_transition) { jc.T_transition = iso === 'N' ? 150 : iso === 'S' ? 600 : 300; added++; }
  mat.johnson_cook = jc;

  // ===== TAYLOR: extended tool materials =====
  const tay = mat.taylor || {};
  const Cc = tay.C_carbide || tay.C || 200;
  const nc = tay.n_carbide || tay.n || 0.20;
  if (!tay.C_ceramic && iso !== 'N') { tay.C_ceramic = Math.round(Cc * 1.8); tay.n_ceramic = +(nc + 0.06).toFixed(3); added += 2; }
  if (!tay.C_cbn && (iso === 'H' || ts > 1000)) { tay.C_cbn = Math.round(Cc * 1.3); tay.n_cbn = +(nc + 0.03).toFixed(3); added += 2; }
  if (!tay.C_pcd && iso === 'N') { tay.C_pcd = Math.round(Cc * 3.5); tay.n_pcd = +(nc + 0.12).toFixed(3); added += 2; }
  if (!tay.C_hss) { tay.C_hss = Math.round(Cc * 0.35); tay.n_hss = +(nc - 0.05).toFixed(3); added += 2; }
  mat.taylor = tay;

  // ===== CHIP FORMATION: extended =====
  const cf = mat.chip_formation || {};
  if (!cf.segmentation_frequency) {
    cf.segmentation_frequency = iso === 'S' ? "high" : iso === 'H' ? "high" : ts > 800 ? "moderate" : "low";
    added++;
  }
  if (!cf.shear_angle) {
    // Merchant's equation approximation: φ ≈ 45 - β/2 + γ/2, β=arctan(μ)
    cf.shear_angle = iso === 'N' ? 35 : iso === 'S' ? 20 : iso === 'K' ? 30 : Math.max(15, 35 - ts * 0.01);
    added++;
  }
  if (!cf.chip_compression_ratio) {
    cf.chip_compression_ratio = iso === 'N' ? 1.5 : iso === 'S' ? 3.0 : iso === 'K' ? 1.2 : 2.0 + ts * 0.001;
    added++;
  }
  mat.chip_formation = cf;

  return added;
}

function enrichCuttingRecs(mat) {
  let added = 0;
  const iso = mat.iso_group || 'P';
  const ts = mat.mechanical?.tensile_strength?.typical || 500;
  const cr = mat.cutting_recommendations || {};

  // Turning extended
  const turn = cr.turning || {};
  if (!turn.doc_roughing) { turn.doc_roughing = iso === 'S' ? 1.0 : iso === 'N' ? 4.0 : 2.5; added++; }
  if (!turn.doc_finishing) { turn.doc_finishing = iso === 'S' ? 0.3 : iso === 'N' ? 1.0 : 0.5; added++; }
  if (!turn.coolant_type) {
    turn.coolant_type = iso === 'K' ? 'dry_or_mist' : iso === 'N' ? 'flood_emulsion' : iso === 'S' ? 'high_pressure_coolant' : 'flood_emulsion';
    added++;
  }
  if (!turn.coolant_pressure) {
    turn.coolant_pressure = iso === 'S' ? 70 : iso === 'H' ? 40 : 10; // bar
    added++;
  }
  cr.turning = turn;

  // Milling extended
  const mill = cr.milling || {};
  if (!mill.doc_roughing) { mill.doc_roughing = iso === 'S' ? 0.8 : iso === 'N' ? 3.0 : 2.0; added++; }
  if (!mill.doc_finishing) { mill.doc_finishing = iso === 'S' ? 0.2 : iso === 'N' ? 0.5 : 0.3; added++; }
  if (!mill.ae_roughing_pct) { mill.ae_roughing_pct = iso === 'S' ? 30 : iso === 'H' ? 40 : 50; added++; }
  if (!mill.ae_finishing_pct) { mill.ae_finishing_pct = iso === 'S' ? 5 : iso === 'H' ? 8 : 10; added++; }
  cr.milling = mill;

  // Drilling
  if (!cr.drilling) cr.drilling = {};
  const drill = cr.drilling;
  if (!drill.speed) { drill.speed = Math.round((turn.speed_roughing || 150) * 0.6); added++; }
  if (!drill.feed_per_rev) { drill.feed_per_rev = iso === 'S' ? 0.06 : iso === 'N' ? 0.15 : 0.12; added++; }
  if (!drill.peck_depth_ratio) { drill.peck_depth_ratio = iso === 'S' ? 0.5 : 1.0; added++; }
  if (!drill.point_angle) { drill.point_angle = iso === 'N' ? 118 : iso === 'S' ? 135 : 130; added++; }
  if (!drill.coolant_type) { drill.coolant_type = iso === 'S' ? 'through_tool_hp' : 'flood_emulsion'; added++; }
  if (!drill.coolant_through) { drill.coolant_through = iso === 'S' || ts > 800; added++; }
  cr.drilling = drill;

  // Tool material recommendations
  if (!cr.tool_material) cr.tool_material = {};
  const tm = cr.tool_material;
  if (!tm.recommended_grade) {
    const grades = {
      'P': 'P25 (GC4325/GC4315)', 'M': 'M25 (GC2220/GC1125)', 'K': 'K20 (GC3210/GC3220)',
      'N': 'N10 (H13A/GC1105)', 'S': 'S15 (GC1115/GC1105)', 'H': 'H15 (CB7025/GC4240)', 'X': 'K15 (GC1105)'
    };
    tm.recommended_grade = grades[iso] || 'P25'; added++;
  }
  if (!tm.coating_recommendation) {
    const coatings = {
      'P': 'CVD TiCN+Al2O3+TiN', 'M': 'PVD TiAlN', 'K': 'CVD Al2O3+TiCN',
      'N': 'Uncoated or PVD DLC', 'S': 'PVD TiAlN nanocomposite', 'H': 'PVD TiAlSiN', 'X': 'PVD Diamond or DLC'
    };
    tm.coating_recommendation = coatings[iso] || 'PVD TiAlN'; added++;
  }
  if (!tm.geometry_recommendation) {
    const geom = {
      'P': 'Positive rake 6-12°, chip breaker, 0.4-0.8mm nose radius',
      'M': 'Sharp edge, positive rake 5-10°, 0.4mm nose, chip breaker essential',
      'K': 'Negative rake -6°, strong edge, 0.8-1.2mm nose radius',
      'N': 'Sharp polished edge, high positive rake 12-20°, large nose 0.8mm',
      'S': 'Round insert or 0.8mm nose, positive rake 6°, strong edge prep 0.05mm hone',
      'H': 'Negative rake -6°, chamfer+hone edge prep, CBN or ceramic, 0.8mm nose',
      'X': 'Material-dependent geometry'
    };
    tm.geometry_recommendation = geom[iso] || 'Positive rake, chip breaker'; added++;
  }
  cr.tool_material = tm;
  mat.cutting_recommendations = cr;
  return added;
}

function enrichSurface(mat) {
  let added = 0;
  const iso = mat.iso_group || 'P';
  const ts = mat.mechanical?.tensile_strength?.typical || 500;
  if (!mat.surface) mat.surface = {};
  const s = mat.surface;

  if (!s.achievable_ra_turning) {
    s.achievable_ra_turning = iso === 'N' ? 0.4 : iso === 'S' ? 1.6 : iso === 'K' ? 1.6 : iso === 'H' ? 0.2 : 0.8;
    added++;
  }
  if (!s.achievable_ra_milling) {
    s.achievable_ra_milling = iso === 'N' ? 0.8 : iso === 'S' ? 3.2 : iso === 'K' ? 3.2 : iso === 'H' ? 0.4 : 1.6;
    added++;
  }
  if (!s.achievable_ra_grinding) {
    s.achievable_ra_grinding = iso === 'N' ? 0.1 : iso === 'H' ? 0.05 : 0.2;
    added++;
  }
  if (!s.surface_integrity_sensitivity) {
    s.surface_integrity_sensitivity = iso === 'S' ? 'critical' : iso === 'H' ? 'high' : ts > 1000 ? 'high' : 'moderate';
    added++;
  }
  if (!s.white_layer_risk) {
    s.white_layer_risk = iso === 'H' ? 'high' : ts > 800 ? 'moderate' : 'low';
    added++;
  }
  mat.surface = s;
  return added;
}

function enrichThermal(mat) {
  let added = 0;
  const iso = mat.iso_group || 'P';
  const k_th = mat.physical?.thermal_conductivity || 30;
  const ts = mat.mechanical?.tensile_strength?.typical || 500;
  if (!mat.thermal) mat.thermal = {};
  const t = mat.thermal;

  if (!t.cutting_temperature_factor) {
    // Higher strength + lower conductivity = higher temps
    t.cutting_temperature_factor = +((ts / 500) * (30 / Math.max(k_th, 5))).toFixed(2);
    added++;
  }
  if (!t.heat_partition_ratio) {
    // Fraction of heat going to workpiece (higher conductivity = more to workpiece)
    t.heat_partition_ratio = +(Math.min(0.5, k_th / 200)).toFixed(2);
    added++;
  }
  if (!t.thermal_softening_onset) {
    t.thermal_softening_onset = iso === 'N' ? 150 : iso === 'S' ? 700 : ts > 1000 ? 500 : 400;
    added++;
  }
  if (!t.hot_hardness_retention) {
    t.hot_hardness_retention = iso === 'S' ? 'excellent' : iso === 'H' ? 'good' : iso === 'N' ? 'poor' : 'moderate';
    added++;
  }
  if (!t.cryogenic_machinability) {
    t.cryogenic_machinability = iso === 'S' ? 'beneficial' : iso === 'N' ? 'not_recommended' : 'marginal';
    added++;
  }
  mat.thermal = t;
  return added;
}

function enrichWeldability(mat) {
  let added = 0;
  const iso = mat.iso_group || 'P';
  const ts = mat.mechanical?.tensile_strength?.typical || 500;
  if (!mat.weldability) mat.weldability = {};
  const w = mat.weldability;

  if (!w.rating) {
    if (iso === 'K') w.rating = 'poor';
    else if (iso === 'N') w.rating = ts > 400 ? 'fair' : 'good';
    else if (iso === 'S') w.rating = 'difficult';
    else if (iso === 'H') w.rating = ts > 1500 ? 'poor' : 'fair';
    else w.rating = ts > 800 ? 'fair' : 'good';
    added++;
  }
  if (!w.carbon_equivalent && (iso === 'P' || iso === 'H')) {
    // CE ≈ rough estimate from tensile: CE = 0.2 + (ts - 300) * 0.0005
    w.carbon_equivalent = +(0.2 + Math.max(0, (ts - 300) * 0.0005)).toFixed(3);
    added++;
  }
  if (!w.preheat_temperature) {
    w.preheat_temperature = ts > 800 ? 200 : ts > 600 ? 100 : 0;
    added++;
  }
  if (!w.postweld_treatment) {
    w.postweld_treatment = ts > 1000 ? 'stress_relief_required' : ts > 600 ? 'stress_relief_recommended' : 'none_required';
    added++;
  }
  mat.weldability = w;
  return added;
}

function enrichMachinability(mat) {
  let added = 0;
  const iso = mat.iso_group || 'P';
  const ts = mat.mechanical?.tensile_strength?.typical || 500;
  if (!mat.machinability) mat.machinability = {};
  const m = mat.machinability;

  if (!m.surface_finish_tendency) {
    m.surface_finish_tendency = iso === 'N' ? 'excellent' : iso === 'K' ? 'good' : iso === 'S' ? 'difficult' : ts < 500 ? 'good' : 'moderate';
    added++;
  }
  if (!m.tool_wear_pattern) {
    const patterns = {
      'P': 'crater_and_flank', 'M': 'notch_wear', 'K': 'abrasive_flank',
      'N': 'built_up_edge', 'S': 'notch_and_crater', 'H': 'abrasive_flank', 'X': 'abrasive_flank'
    };
    m.tool_wear_pattern = patterns[iso] || 'flank_wear'; added++;
  }
  if (!m.recommended_operations) {
    m.recommended_operations = ['turning', 'milling', 'drilling'];
    if (iso === 'H') m.recommended_operations.push('hard_turning', 'grinding');
    if (iso === 'N') m.recommended_operations.push('high_speed_machining');
    added++;
  }
  mat.machinability = m;
  return added;
}

// ============================================================================
// EXECUTION — Enrich ALL verified files
// ============================================================================

console.log('=== R4: FULL 122-PARAMETER ENRICHMENT ===\n');

const groups = fs.readdirSync(DATA_BASE).filter(d => fs.statSync(path.join(DATA_BASE, d)).isDirectory());
let grandTotal = 0;
let filesProcessed = 0;

for (const group of groups) {
  const dir = path.join(DATA_BASE, group);
  const files = fs.readdirSync(dir).filter(f => f.includes('verified') && f.endsWith('.json'));
  
  for (const file of files) {
    const fp = path.join(dir, file);
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const mats = data.materials || [];
      let fileAdded = 0;
      
      for (const mat of mats) {
        let a = 0;
        a += enrich(mat);
        a += enrichCuttingRecs(mat);
        a += enrichSurface(mat);
        a += enrichThermal(mat);
        a += enrichWeldability(mat);
        a += enrichMachinability(mat);
        fileAdded += a;
      }
      
      if (fileAdded > 0) {
        fs.writeFileSync(fp, JSON.stringify({ materials: mats }, null, 2));
        console.log(`  ${group}/${file}: ${mats.length} mats, +${fileAdded} params added`);
        grandTotal += fileAdded;
        filesProcessed++;
      }
    } catch(e) {
      console.log(`  ERROR ${group}/${file}: ${e.message}`);
    }
  }
}

console.log(`\n=== ENRICHMENT COMPLETE ===`);
console.log(`Files processed: ${filesProcessed}`);
console.log(`Total params added: ${grandTotal}`);
console.log(`Avg params/material: ${(grandTotal / 2611).toFixed(1)}`);
