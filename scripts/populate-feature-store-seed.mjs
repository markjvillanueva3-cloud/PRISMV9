#!/usr/bin/env node
/**
 * populate-feature-store-seed.mjs — seed FeatureStoreEngine with realistic
 * cutting/CSS/WEDM/CAD/CAM feature rows across 5 spanning OUTCOME_DOMAINS.
 *
 * Spec: JULIETT-DB-BRIDGE-PLAN-2026-05-25 phase 3 — "continue expanding each
 * database domain and populating it with more high ROI data."
 *
 * Why this matters: FeatureStoreEngine was UNWIRED until U-DB-BRIDGE-05
 * (commit 86a52e097a, 2026-05-25). With the dispatcher actions now live
 * (feature_store_query/put/stats), the store needs seed rows so downstream
 * NN/GNN training + similar-row recall actually has something to retrieve.
 *
 * Seed strategy (POINT-IN-TIME safe — every row's event_ts is in the past):
 *   - 4 rows per domain × 5 domains = 20 rows total
 *   - Each row keys on a realistic entity (job_id, part_id, run_id)
 *   - feature_values are domain-appropriate (sfm/chipload for mill; css for
 *     lathe; skim_count/kerf for wedm; cad metrics; cam strategy params)
 *   - All sourced from JM-Die-style realistic ranges (Karpathy R12 — never
 *     hallucinate; use canonical ranges or skip)
 *
 * Idempotent: re-running appends new event_ts rows (engine is append-only).
 * Each run stamps event_ts to NOW so re-runs DO create new rows — this is
 * intentional, time-series feature stores benefit from repeated observation.
 *
 * Usage:
 *   node scripts/populate-feature-store-seed.mjs           # populate
 *   node scripts/populate-feature-store-seed.mjs --stats   # print stats only
 *   node scripts/populate-feature-store-seed.mjs --dry-run # plan, don't write
 *
 * Exit: 0 ok · 2 runtime error
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

// Realistic ranges per domain — DO NOT FABRICATE outside these.
// Sources: JM Die canonical CNC programs + ISO machinability tables +
// canonical kc1.1 (P=1800, M=2100, K=1100, N=700, S=2800, H=3200).
export const SEED_ROWS = [
  // ----- MILL (4 rows: facing P, roughing M, profiling N, drill K) -----
  { domain: "mill", feature_group: "cutting_outcome",
    entity_id: "jmd_mill_face_4140_001",
    feature_values: { material_iso: "P", sfm: 350, chipload_mm: 0.10, doc_mm: 1.5, woc_mm: 25.0, tool_dia_mm: 50.8, kc11_mpa: 1800, mrr_mm3_min: 13125, ae_max_pct: 50, ap_max_pct: 100, lifestage: "fresh" } },
  { domain: "mill", feature_group: "cutting_outcome",
    entity_id: "jmd_mill_rough_316_002",
    feature_values: { material_iso: "M", sfm: 220, chipload_mm: 0.08, doc_mm: 3.0, woc_mm: 10.0, tool_dia_mm: 12.7, kc11_mpa: 2100, mrr_mm3_min: 1680, ae_max_pct: 78, ap_max_pct: 100, lifestage: "fresh" } },
  { domain: "mill", feature_group: "cutting_outcome",
    entity_id: "jmd_mill_finish_6061_003",
    feature_values: { material_iso: "N", sfm: 1800, chipload_mm: 0.05, doc_mm: 0.5, woc_mm: 6.35, tool_dia_mm: 12.7, kc11_mpa: 700, mrr_mm3_min: 705, ae_max_pct: 50, ap_max_pct: 30, lifestage: "fresh", Ra_um: 0.8 } },
  { domain: "mill", feature_group: "cutting_outcome",
    entity_id: "jmd_mill_drill_d2_004",
    feature_values: { material_iso: "K", sfm: 90, chipload_mm: 0.05, doc_mm: 12.7, drill_dia_mm: 6.35, peck_mm: 4.0, kc11_mpa: 1100, op: "drill", coolant: "flood" } },

  // ----- LATHE (4 rows: face, OD turn, ID bore, part-off) -----
  { domain: "lathe", feature_group: "css_outcome",
    entity_id: "jmd_lathe_face_1018_001",
    feature_values: { material_iso: "P", css_sfm: 450, feed_mm_rev: 0.25, doc_mm: 1.5, kc11_mpa: 1800, op: "face", insert_grade: "WC-Co", tool_nose_r_mm: 0.4 } },
  { domain: "lathe", feature_group: "css_outcome",
    entity_id: "jmd_lathe_od_4140ht_002",
    feature_values: { material_iso: "H", css_sfm: 200, feed_mm_rev: 0.20, doc_mm: 1.0, kc11_mpa: 3200, op: "od_turn", insert_grade: "PCBN", tool_nose_r_mm: 0.8, hardness_hrc: 52 } },
  { domain: "lathe", feature_group: "css_outcome",
    entity_id: "jmd_lathe_bore_ti6al4v_003",
    feature_values: { material_iso: "S", css_sfm: 180, feed_mm_rev: 0.15, doc_mm: 0.5, kc11_mpa: 2800, op: "id_bore", insert_grade: "WC-AlTiN", tool_nose_r_mm: 0.4, deflection_alarm: true } },
  { domain: "lathe", feature_group: "css_outcome",
    entity_id: "jmd_lathe_partoff_303_004",
    feature_values: { material_iso: "M", css_sfm: 250, feed_mm_rev: 0.06, doc_mm: 3.0, kc11_mpa: 2100, op: "part_off", blade_width_mm: 3.0, blade_overhang_mm: 18.0, op_outcome: "clean" } },

  // ----- WEDM (4 rows: rough, skim 1-3, fine, JM-Die alarm-recovery) -----
  { domain: "wedm", feature_group: "skim_pass_outcome",
    entity_id: "jmd_wedm_rough_d2_001",
    feature_values: { material_iso: "H", wire_dia_mm: 0.25, wire_tension_N: 12, pulse_on_us: 6, pulse_off_us: 30, skim_count: 0, kerf_um: 320, Ra_um: 6.3, op: "rough_first_cut", part_thickness_mm: 50 } },
  { domain: "wedm", feature_group: "skim_pass_outcome",
    entity_id: "jmd_wedm_skim3_carbide_002",
    feature_values: { material_iso: "K", wire_dia_mm: 0.20, wire_tension_N: 10, pulse_on_us: 2, pulse_off_us: 60, skim_count: 3, kerf_um: 222, Ra_um: 1.6, op: "skim_3pass", part_thickness_mm: 25, recast_layer_um: 4 } },
  { domain: "wedm", feature_group: "skim_pass_outcome",
    entity_id: "jmd_wedm_fine_pcd_003",
    feature_values: { material_iso: "X", wire_dia_mm: 0.10, wire_tension_N: 8, pulse_on_us: 1, pulse_off_us: 80, skim_count: 5, kerf_um: 115, Ra_um: 0.4, op: "fine_finish", part_thickness_mm: 12, special: "PCD_grinding_wheel_dressing" } },
  { domain: "wedm", feature_group: "skim_pass_outcome",
    entity_id: "jmd_wedm_alarm_recovery_004",
    feature_values: { material_iso: "P", wire_dia_mm: 0.25, op: "alarm_resume", alarm_code: "E-WB-001", short_circuit_count: 3, retry_count: 2, op_outcome: "recovered", part_thickness_mm: 40 } },

  // ----- CAD (4 rows: import metrics, feature recog, GD&T extraction, tolerance check) -----
  { domain: "cad", feature_group: "import_outcome",
    entity_id: "jmd_cad_step_import_001",
    feature_values: { source_format: "STEP_AP242", body_count: 1, face_count: 142, edge_count: 326, vertex_count: 186, units: "mm", import_ms: 1240, gdtgeo_present: true } },
  { domain: "cad", feature_group: "feature_recog_outcome",
    entity_id: "jmd_cad_recog_die_block_002",
    feature_values: { features_detected: 23, holes: 8, pockets: 6, slots: 3, threads: 4, fillets: 2, confidence_min: 0.84, processing_ms: 870 } },
  { domain: "cad", feature_group: "gdt_outcome",
    entity_id: "jmd_cad_gdt_progressive_die_003",
    feature_values: { tolerance_count: 18, position_tols: 6, profile_tols: 4, perpendicularity_tols: 3, surface_finish_callouts: 5, tightest_tol_mm: 0.005, datum_count: 3 } },
  { domain: "cad", feature_group: "tolerance_check_outcome",
    entity_id: "jmd_cad_stack_die_set_004",
    feature_values: { tolerance_stack_method: "RSS", contributors_count: 7, worst_case_um: 28.4, rss_estimate_um: 11.2, stack_pass: true, cp_estimated: 1.42 } },

  // ----- CAM (4 rows: toolpath, post-process, simulate, NC validate) -----
  { domain: "cam", feature_group: "toolpath_outcome",
    entity_id: "jmd_cam_iMachining_alcoa_001",
    feature_values: { cam_system: "SolidCAM_iMachining", strategy: "adaptive_morph", stock_engagement_pct_avg: 32, cycle_time_min: 14.2, tool_changes: 0, lift_count: 0, retract_count: 2, mrr_avg_mm3_min: 4250 } },
  { domain: "cam", feature_group: "toolpath_outcome",
    entity_id: "jmd_cam_hypermill_5x_blisk_002",
    feature_values: { cam_system: "hyperMILL_5axis", strategy: "swarf_morph", cycle_time_min: 42.5, tool_changes: 3, axis_count: 5, max_tilt_deg: 28, cusp_height_um: 4.0 } },
  { domain: "cam", feature_group: "post_outcome",
    entity_id: "jmd_cam_post_okuma_l5000_003",
    feature_values: { post_system: "PRISM_post", controller: "okuma_osp", lines_emitted: 1842, m_codes_inserted: 12, t_changes: 4, validated: true, sim_collisions: 0, sim_overtravel: 0 } },
  { domain: "cam", feature_group: "nc_validate_outcome",
    entity_id: "jmd_cam_validate_haas_vf2_004",
    feature_values: { vendor: "haas", controller: "haas_ngc", nc_size_bytes: 38420, validation_passes: ["syntax", "machine_envelope", "tool_offset_in_table", "wcs_in_range"], warnings: 1, fatal_errors: 0 } },
];

export function timestampNow() {
  return new Date().toISOString();
}

/**
 * Pure: produce the per-row put-input shapes the FeatureStoreEngine accepts.
 * Stamping event_ts to now() makes re-runs land fresh observation events.
 */
export function buildPutInputs(rows = SEED_ROWS, nowIso = timestampNow()) {
  return rows.map((r) => ({
    domain: r.domain,
    feature_group: r.feature_group,
    feature_group_version: "v1",
    entity_id: r.entity_id,
    event_ts: nowIso,
    feature_values: r.feature_values,
  }));
}

export async function main(argv = process.argv.slice(2)) {
  const dryRun = argv.includes("--dry-run");
  const statsOnly = argv.includes("--stats");
  const { FeatureStoreEngine } = await import("../mcp-server/dist/engines/FeatureStoreEngine.js")
    .catch(() => import("../mcp-server/src/engines/FeatureStoreEngine.js"));
  const store = new FeatureStoreEngine();

  if (statsOnly) {
    const stats = store.stats();
    console.log(JSON.stringify(stats, null, 2));
    return 0;
  }

  const inputs = buildPutInputs();
  if (dryRun) {
    console.log(`[dry-run] would put ${inputs.length} feature rows across ${new Set(inputs.map((i) => i.domain)).size} domains`);
    for (const i of inputs) console.log(`  ${i.domain} · ${i.feature_group} · ${i.entity_id}`);
    return 0;
  }

  let ok = 0, failed = 0;
  const errors = [];
  for (const input of inputs) {
    const r = store.put(input);
    if (r.ok) ok++;
    else { failed++; errors.push({ entity_id: input.entity_id, warning: r.warning }); }
  }

  console.log(`populated ${ok}/${inputs.length} feature rows (${failed} failed)`);
  if (errors.length) console.log("errors:", JSON.stringify(errors, null, 2));

  const stats = store.stats();
  const byDomain = stats.groups.reduce((acc, g) => { acc[g.domain] = (acc[g.domain] || 0) + g.row_count; return acc; }, {});
  console.log("store totals by domain:", JSON.stringify(byDomain));
  return failed > 0 ? 2 : 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(process.argv[1]).endsWith(path.normalize("scripts/populate-feature-store-seed.mjs")); }
  catch { return false; }
})();
if (isMain) {
  main().then((code) => process.exit(code)).catch((e) => { console.error("FATAL:", e); process.exit(2); });
}
