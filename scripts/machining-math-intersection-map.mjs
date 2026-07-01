#!/usr/bin/env node
/**
 * machining-math-intersection-map.mjs
 *
 * META artifact for MACHINING-MATH-INVENTIONS-AUDIT-2026-05-22 (/forge-audit-v2).
 * Measures FILE-LEVEL CO-OCCURRENCE between a math primitive and a manufacturing
 * surface it would improve. The audit's recurring "invention" pattern is a math
 * primitive that exists heavily on one side (AI/reasoning) but never appears in
 * the same file as the manufacturing surface it would enhance.
 *
 * Usage:  node scripts/machining-math-intersection-map.mjs [--json]
 * Output: state/shared/machining-math-intersection.json (+ console)
 *
 * Re-runnable. The 8 intersections re-measure audit findings F1-F8; siloed=true
 * means math + surface both present in the codebase but never co-occur in any
 * single file — the canonical invention/enhancement signal.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIR = join(ROOT, 'mcp-server', 'src');
const OUT_DIR = join(ROOT, 'state', 'shared');
const OUT = join(OUT_DIR, 'machining-math-intersection.json');
const SCHEMA_VERSION = '1.0.0';

// Each intersection: math primitive regex × target manufacturing surface regex.
// "siloed" = mathFiles > 0 AND surfaceFiles > 0 AND bothFiles == 0
// "wired"  = bothFiles >= 1
// "stub"   = mathFiles == 0 OR surfaceFiles == 0 (one side missing — not a wiring opp)
const INTERSECTIONS = {
  rl_x_adaptive_control: {
    math:    'xproc_qlearn|xproc_policy_(step|commit|select_action)|xproc_bandit',
    surface: '\\b(rtac_|RTAC|AdaptiveController|adaptive_feedrate|adaptive_spindle_chatter)\\b',
  },
  causal_x_scrap_root_cause: {
    math:    'xproc_causal_learn_dag|xproc_do_identify|xproc_counterfactual_query|xproc_mediation_decompose',
    surface: '\\b(scrap_analyze|scrap_trend|NCREngine|FAIEngine|QualityEngine|QC_root|root.?cause)\\b',
  },
  active_x_taylor_kienzle: {
    math:    'xproc_active_select|xproc_active_rationale|bayesopt_optimize|bayesian_optimize',
    surface: '\\b(TaylorModel|ExtendedTaylor|KienzleForce|KienzleCoeff|material_characterization)\\b',
  },
  variational_x_toolpath: {
    math:    'LagrangianMechanics|euler.?lagrange|calculus.?of.?variations',
    surface: '\\b(toolpath_generate|generateToolpath|HSMToolpath|FiveAxisToolpath|toolpath_optimize)\\b',
  },
  gcode_compiler_pass: {
    // single-side measure: compiler-theory terms applied to gcode are absent regardless of surface
    math:    'peephole|dead.?code.?elim|constant.?fold(ing)?|gcode.?ast|symbolic.?gcode',
    surface: '\\b(gcode_optimize|gcode_compress|gcode_transpile|gcode_analyze|postProcess)\\b',
  },
  persistent_homology_x_removal: {
    math:    'topology_persistence|persistent.?homolog|\\bbetti\\b',
    surface: '\\b(voxel_remove_path|voxelize_mesh|swept.?volume|MaterialRemoval|stock_simulate)\\b',
  },
  controller_lookahead_model: {
    math:    'discrete.?event.?sim|queue_mm[1c]|block.?queue.?model|look.?ahead.?(model|simulation)',
    surface: '\\b(controller_translate|controller_macro|MasterPost|PostProcessor|cps_)\\b',
  },
  coupled_pde_adjoint: {
    math:    'adjoint.?method|fully.?coupled|coupled.?(thermo|multiphysics)|implicit.?newton',
    surface: '\\b(ThermalFEA|PhysicsMLHybrid|multi_physics_simulate|hybrid_coupled_physics)\\b',
  },
  // --- precision-engine cluster (F0): the engines that deliver 0.00005" / sub-micron accuracy.
  // grep showed every action has callers only in the dispatcher boilerplate — DORMANT.
  precision_thermal_x_post_inject: {
    math:    '\\b(acc_thermal_error|acc_volumetric|acc_21_error_model|thermal_machine_error)\\b',
    surface: '\\b(post_inject_motion|post_inject_hsm|post_advanced_physics|post_inject_thermal|post_thermal_compensate)\\b',
  },
  precision_machine_cap_x_capability_lookup: {
    math:    '\\b(acc_abbe_offset|acc_ball_bar|acc_21_error_model)\\b',
    surface: '\\b(cad_machine_capability_get|machine_capability_lookup|machine_capability_compare)\\b',
  },
  diamond_turning_x_cam_strategy: {
    math:    '\\bdiamond_turning_(surface|forces|wear|machine_config)\\b',
    surface: '\\b(cam_strategy_recommend|strategy_recommend|mastercam_strategy_recommend|toolpath.*finish)\\b',
  },
  laser_interferometer_x_machine_setup: {
    math:    '\\blaser_interferometer_(wavelength|comp_table|plan|deadpath)\\b',
    surface: '\\b(machine_warmup_calculate|machine_capability_compare|setup_sheet_generate|machine_leveling)\\b',
  },
  spm_monitoring_x_quality: {
    math:    '\\bspm_(hotelling_t2|pca_monitoring|hmm_condition|bootstrap_ci|sprt|combined_spc)\\b',
    surface: '\\b(quality_kpis|quality_spc_chart|quality_dashboard|spc_calculate|nelson_spc)\\b',
  },
  probe_drift_x_probing: {
    math:    '\\bcad_probe_drift_(record|analyze|history|alerts)\\b',
    surface: '\\b(probe_routine_generate|cad_probe_record|probe_gdt_interpret|probe_wcs_setup|probe_inspection)\\b',
  },
};

function walk(dir, acc) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

function classifyIntersection(mathFiles, surfaceFiles, bothFiles) {
  if (mathFiles === 0 || surfaceFiles === 0) return 'stub';
  if (bothFiles === 0) return 'siloed';
  if (bothFiles < 3) return 'thin_wiring';
  return 'wired';
}

function main() {
  if (!existsSync(SCAN_DIR)) {
    console.error(`FATAL: scan dir not found: ${SCAN_DIR}`);
    process.exit(1);
  }
  const files = walk(SCAN_DIR, []);

  const results = {};
  for (const [key, { math, surface }] of Object.entries(INTERSECTIONS)) {
    const mathRx = new RegExp(math, 'gi');
    const surfRx = new RegExp(surface, 'gi');
    let mathFiles = 0, surfaceFiles = 0, bothFiles = 0;
    const bothPaths = [];
    for (const f of files) {
      let content;
      try { content = readFileSync(f, 'utf8'); } catch { continue; }
      const m = mathRx.test(content); mathRx.lastIndex = 0;
      const s = surfRx.test(content); surfRx.lastIndex = 0;
      if (m) mathFiles++;
      if (s) surfaceFiles++;
      if (m && s) { bothFiles++; if (bothPaths.length < 5) bothPaths.push(f.replace(ROOT, '').replace(/\\/g, '/')); }
    }
    const status = classifyIntersection(mathFiles, surfaceFiles, bothFiles);
    results[key] = {
      math_files: mathFiles,
      surface_files: surfaceFiles,
      both_files: bothFiles,
      status,
      sample_both: bothPaths,
    };
  }

  const siloed = Object.values(results).filter(r => r.status === 'siloed').length;
  const thin = Object.values(results).filter(r => r.status === 'thin_wiring').length;
  const wired = Object.values(results).filter(r => r.status === 'wired').length;

  const report = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    scanned: { dir: 'mcp-server/src', tsFiles: files.length },
    summary: {
      totalIntersections: Object.keys(INTERSECTIONS).length,
      siloed, thinWiring: thin, wired,
      invention_opportunities: siloed + thin,
    },
    intersections: results,
    note: 'Advisory. siloed = math primitive widely present + target surface present + ZERO co-occurring files = highest-leverage invention opportunity.',
  };

  try { mkdirSync(OUT_DIR, { recursive: true }); } catch {}
  writeFileSync(OUT, JSON.stringify(report, null, 2));

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`machining × math intersection — ${files.length} .ts files scanned`);
    console.log(`summary: ${siloed} siloed · ${thin} thin · ${wired} wired (of ${Object.keys(INTERSECTIONS).length})`);
    for (const [key, r] of Object.entries(results)) {
      const tag = r.status.padEnd(12);
      console.log(`  [${tag}] ${key.padEnd(34)} math:${r.math_files} surface:${r.surface_files} both:${r.both_files}`);
    }
    console.log(`written: ${OUT}`);
  }
}

main();
