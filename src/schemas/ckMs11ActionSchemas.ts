/**
 * CK-MS11 Action Schemas — Zod v4
 *
 * 10 dispatcher actions:
 *   stochastic_route         — rank algorithms by P(success) via MC simulation
 *   stochastic_compare       — side-by-side comparison with CI95
 *   stochastic_sensitivity   — sensitivity analysis per parameter
 *   probe_wcs_setup_gen      — WCS setup probing program
 *   probe_first_article_gen  — first article inspection program
 *   probe_in_process_gen     — in-process check for single feature
 *   probe_tool_measure_gen   — tool length/diameter measurement
 *   probe_auto_comp_gen      — measure + auto-compensate wear offset
 *   dfm_analyze              — full DFM analysis
 *   dfm_suggest              — improvement suggestions
 *   dfm_report               — formatted DFM report
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const algorithmZ = z.string().describe(
  "Toolpath algorithm: adaptive_clearing | contour_parallel | zigzag | spiral | trochoidal | " +
  "TGAR | HRAF | MTHZD | CFSF | PTDC | VCER | MEGM | RSMP | WHAP | BOPA | MCTP | SFCR | KALP | PTAP | PARETO | CFCM | WBRL | DPLS"
);

const featureInputZ = z.object({
  type: z.enum([
    "pocket", "slot", "contour", "boss", "bore", "open_pocket", "freeform",
  ]).optional(),
  ap_mm: z.number().positive().describe("Axial depth of cut mm"),
  ae_mm: z.number().positive().describe("Radial depth of cut mm"),
  tool_diameter_mm: z.number().positive(),
  overhang_mm: z.number().positive().describe("Tool stick-out mm"),
  flute_count: z.number().int().min(1).max(12).optional(),
  rpm: z.number().positive().optional(),
  feed_mmmin: z.number().positive().optional(),
  tolerance_mm: z.number().positive().optional().describe("Part tolerance (deflection limit)"),
  natural_freq_hz: z.number().positive().optional().describe("Tool natural frequency Hz"),
  stiffness_nm: z.number().positive().optional().describe("Modal stiffness N/m"),
  damping_ratio: z.number().min(0).max(1).optional(),
}).passthrough();

const materialInputZ = z.object({
  name: z.string().describe("Material name: aluminum | steel | stainless_steel | titanium | inconel | cast_iron | hardened_steel | brass | copper | plastic"),
  taylor_C: z.number().positive().optional().describe("Taylor tool life constant m/min at T=1min"),
  taylor_n: z.number().positive().optional().describe("Taylor exponent"),
  elastic_modulus_gpa: z.number().positive().optional(),
}).passthrough();

const machineInputZ = z.object({
  max_rpm: z.number().positive().optional(),
  max_feed_mmmin: z.number().positive().optional(),
  spindle_power_kw: z.number().positive().optional(),
  tool_second_moment_mm4: z.number().positive().optional(),
}).passthrough();

const probeControllerZ = z.enum([
  "renishaw_fanuc", "renishaw_haas", "heidenhain", "siemens", "blum_fanuc",
]);

const probeConfigZ = z.object({
  controller: probeControllerZ,
  probe_tool_number: z.number().int().positive(),
  approach_feed_mmmin: z.number().positive().optional().default(100),
  fast_feed_mmmin: z.number().positive().optional(),
  clearance_z_mm: z.number().optional().default(25),
  retract_mm: z.number().positive().optional().default(2),
  overtravel_mm: z.number().positive().optional().default(5),
  temperature_c: z.number().optional().default(20),
  reference_temp_c: z.number().optional().default(20),
  stylus_length_mm: z.number().positive().optional().default(50),
  print_results: z.boolean().optional().default(false),
}).passthrough();

const partDatumZ = z.object({
  id: z.string(),
  type: z.enum(["single_surface", "bore_center", "boss_center", "web_center", "corner"]),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  diameter_mm: z.number().positive().optional(),
  work_offset: z.string().optional().describe("G54, G55, G54.1 P1, etc."),
}).passthrough();

const inspectionFeatureZ = z.object({
  id: z.string(),
  type: z.enum([
    "bore_diameter", "boss_diameter",
    "surface_x", "surface_y", "surface_z",
    "pocket_center_x", "pocket_center_y",
    "web_width_x", "web_width_y",
    "corner_x", "corner_y",
  ]),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  nominal_mm: z.number().positive(),
  tolerance_plus_mm: z.number().positive(),
  tolerance_minus_mm: z.number().positive(),
  result_variable: z.number().int().optional(),
}).passthrough();

const dfmFeatureZ = z.object({
  id: z.string(),
  type: z.enum([
    "pocket", "slot", "bore", "boss", "thread",
    "surface", "chamfer", "fillet", "hole",
    "undercut", "cross_hole", "rib", "thin_wall",
  ]),
  wall_thickness_mm: z.number().positive().optional(),
  depth_mm: z.number().positive().optional(),
  width_mm: z.number().positive().optional(),
  corner_radius_mm: z.number().min(0).optional(),
  diameter_mm: z.number().positive().optional(),
  length_mm: z.number().positive().optional(),
  is_undercut: z.boolean().optional(),
  blind_flat_bottom: z.boolean().optional(),
  thread_pitch_mm: z.number().positive().optional(),
  is_interrupted: z.boolean().optional(),
  setup_count: z.number().int().min(1).optional(),
  asymmetric_removal: z.boolean().optional(),
  cross_hole: z.boolean().optional(),
  requires_special_tooling: z.boolean().optional(),
  is_functional: z.boolean().optional(),
}).passthrough();

const dfmMaterialZ = z.object({
  name: z.string(),
  hardness_hb: z.number().positive().optional(),
  hardness_hrc: z.number().min(0).max(70).optional(),
  machinability: z.number().min(0).max(100).optional(),
  min_wall_mm: z.number().positive().optional(),
  yield_mpa: z.number().positive().optional(),
}).passthrough();

const dfmToleranceSpecZ = z.object({
  feature_id: z.string(),
  it_grade: z.number().int().min(1).max(18).optional(),
  ra_um: z.number().positive().optional(),
  perpendicularity_mm: z.number().positive().optional(),
  concentricity_mm: z.number().positive().optional(),
  datum_chain_length: z.number().int().min(1).optional(),
}).passthrough();

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_CK_MS11_SCHEMAS: ActionSchemaMap = {

  stochastic_route: z.object({
    feature: featureInputZ,
    material: materialInputZ,
    machine: machineInputZ.optional(),
    algorithms: z.array(algorithmZ).optional()
      .describe("Subset of algorithms to rank. Default: all 22."),
    n_samples: z.number().int().min(50).max(5000).optional().default(500),
  }),

  stochastic_compare: z.object({
    algorithms: z.array(algorithmZ).min(2),
    feature: featureInputZ,
    material: materialInputZ,
    machine: machineInputZ.optional(),
  }),

  stochastic_sensitivity: z.object({
    algorithm: algorithmZ,
    feature: featureInputZ,
    material: materialInputZ,
    machine: machineInputZ.optional(),
  }),

  probe_wcs_setup_gen: z.object({
    datums: z.array(partDatumZ).min(1),
    config: probeConfigZ,
  }),

  probe_first_article_gen: z.object({
    features: z.array(inspectionFeatureZ).min(1),
    config: probeConfigZ,
  }),

  probe_in_process_gen: z.object({
    feature: inspectionFeatureZ,
    config: probeConfigZ,
  }),

  probe_tool_measure_gen: z.object({
    tool: z.object({
      tool_number: z.number().int().positive(),
      tool_type: z.enum(["endmill", "drill", "tap", "reamer", "boring_bar"]),
      nominal_length_mm: z.number().positive(),
      nominal_diameter_mm: z.number().positive(),
      offset_register: z.number().int().optional(),
      wear_comp_register: z.number().int().optional(),
    }),
    config: probeConfigZ,
  }),

  probe_auto_comp_gen: z.object({
    feature: inspectionFeatureZ,
    offset_register: z.number().int().positive(),
    axis: z.enum(["X", "Y", "Z"]),
    max_comp_mm: z.number().positive().optional().default(0.5),
    config: probeConfigZ,
  }),

  dfm_analyze: z.object({
    features: z.array(dfmFeatureZ).min(1),
    material: dfmMaterialZ,
    tolerances: z.array(dfmToleranceSpecZ).optional(),
  }),

  dfm_suggest: z.object({
    features: z.array(dfmFeatureZ).min(1),
    material: dfmMaterialZ,
    tolerances: z.array(dfmToleranceSpecZ).optional(),
  }),

  dfm_report: z.object({
    features: z.array(dfmFeatureZ).min(1),
    material: dfmMaterialZ,
    tolerances: z.array(dfmToleranceSpecZ).optional(),
    include_improvements: z.boolean().optional().default(true),
  }),

};
