/**
 * CAMX-MS20 U05 Action Schemas — Zod
 *
 * 3 dispatcher actions (VericutBridgeEngine E1130):
 *   vericut_export           — package G-code + machine + stock + tools + fixture for VERICUT
 *   vericut_import_optipath  — import VERICUT OptiPath feed optimization, apply to G-code
 *   vericut_import_collision — import VERICUT collision / material removal / force report
 *
 * Force analysis (importForceAnalysis) is embedded within vericut_import_collision
 * via an optional force_data array + iso_group param.
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ─────────────────────────────────────────────────────

const VericutToolSchema = z.object({
  id:                z.string().optional().describe("PRISM tool ID / catalogue number"),
  description:       z.string().optional().describe("Tool description"),
  tool_type:         z.string().optional().describe(
    "Tool type: endmill, ballnose, bull_nose, drill, tap, reamer, face_mill, thread_mill, boring_bar, chamfer, custom"
  ),
  diameter_mm:       z.number().positive().describe("Cutting diameter (mm)"),
  flutes:            z.number().int().positive().optional().describe("Number of cutting flutes"),
  corner_radius_mm:  z.number().min(0).optional().describe("Corner/nose radius (mm), 0 = sharp"),
  cutting_length_mm: z.number().positive().optional().describe("Flute/cutting length (mm)"),
  overall_length_mm: z.number().positive().optional().describe("Overall tool length (mm)"),
  shank_diameter_mm: z.number().positive().optional().describe("Shank diameter (mm)"),
  gauge_length_mm:   z.number().positive().optional().describe("Gauge/projection length (mm)"),
  taper:             z.string().optional().describe("Holder taper (CAT40, BT40, HSK-A63, BT50, etc.)"),
  material:          z.string().optional().describe("Substrate material (carbide, hss, ceramic, cbn, pcd)"),
  coating:           z.string().optional().describe("Coating (TiN, TiCN, TiAlN, AlTiN, AlCrN, DLC, diamond, uncoated)"),
  t_number:          z.number().int().positive().optional().describe("T-code (tool pocket number, 1-based)"),
  h_number:          z.number().int().min(0).optional().describe("Length offset H register"),
  d_number:          z.number().int().min(0).optional().describe("Diameter offset D register"),
}).describe("A PRISM tool record for VERICUT export");

const VericutMachineSchema = z.object({
  name:         z.string().describe("PRISM machine profile name (e.g. 'Haas VF-2', 'DMG DMU 50')"),
  model:        z.string().optional().describe("Machine model string"),
  type:         z.enum(["3axis", "4axis", "5axis", "lathe", "mill_turn", "swiss", "grinder", "edm"])
                  .optional().describe("Machine type / kinematic category"),
  controller:   z.string().optional().describe("CNC controller (fanuc, heidenhain, siemens, mitsubishi, okuma, haas)"),
  manufacturer: z.string().optional().describe("Machine manufacturer"),
}).describe("PRISM machine profile for VERICUT machine library mapping");

const VericutStockSchema = z.object({
  length_mm:      z.number().positive().describe("Stock block length (mm)"),
  width_mm:       z.number().positive().describe("Stock block width (mm)"),
  height_mm:      z.number().positive().describe("Stock block height (mm)"),
  material_name:  z.string().describe("Material name (e.g. 'AISI 4140', 'Inconel 718', 'Al 6061-T6')"),
  iso_group:      z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe(
    "ISO material group: P=Steel, M=Stainless, K=Cast Iron, N=Non-Ferrous, S=Superalloy, H=Hardened"
  ),
  origin_x_mm:    z.number().optional().describe("Stock origin X offset from WCS (mm)"),
  origin_y_mm:    z.number().optional().describe("Stock origin Y offset from WCS (mm)"),
  origin_z_mm:    z.number().optional().describe("Stock origin Z offset from WCS (mm)"),
  is_cylindrical: z.boolean().optional().describe("True for bar/cylinder stock (use diameter_mm + bar_length_mm)"),
  diameter_mm:    z.number().positive().optional().describe("Bar/cylinder diameter (mm) — used when is_cylindrical=true"),
  bar_length_mm:  z.number().positive().optional().describe("Bar/cylinder length (mm) — used when is_cylindrical=true"),
}).describe("Stock definition for VERICUT workpiece setup");

const VericutFixtureSchema = z.object({
  type: z.enum(["vise", "chuck", "tombstone", "fixture_plate", "vacuum",
                "collet", "indexer", "pallet", "custom"])
         .describe("Workholding type"),
  description:    z.string().optional().describe("Fixture description or part number"),
  position_x_mm:  z.number().optional().describe("Fixture X position on machine table (mm)"),
  position_y_mm:  z.number().optional().describe("Fixture Y position on machine table (mm)"),
  position_z_mm:  z.number().optional().describe("Fixture Z position on machine table (mm)"),
  rotation_a_deg: z.number().optional().describe("Fixture A-axis rotation (degrees)"),
  rotation_b_deg: z.number().optional().describe("Fixture B-axis rotation (degrees)"),
  rotation_c_deg: z.number().optional().describe("Fixture C-axis rotation (degrees)"),
}).describe("Workholding/fixture definition for VERICUT");

const VericutWCSSchema = z.object({
  wcs_number: z.number().int().positive().optional().describe("WCS number (1=G54, 2=G55, 3=G56, …)"),
  g_code:     z.string().optional().describe("G-code address (G54, G55, G56, G57, G58, G59, G59.1, …)"),
  x_mm:       z.number().optional().describe("WCS X offset from machine reference (mm)"),
  y_mm:       z.number().optional().describe("WCS Y offset from machine reference (mm)"),
  z_mm:       z.number().optional().describe("WCS Z offset from machine reference (mm)"),
  a_deg:      z.number().optional().describe("WCS A rotation (degrees) — for tilted WCS on 5-axis"),
  b_deg:      z.number().optional().describe("WCS B rotation (degrees)"),
  c_deg:      z.number().optional().describe("WCS C rotation (degrees)"),
}).describe("Work coordinate system definition");

const OptiPathBlockSchema = z.object({
  block_number:          z.number().int().min(0).describe("G-code line number / block index"),
  original_block:        z.string().describe("Original G-code block text"),
  optimized_feed_mmmin:  z.number().positive().describe("VERICUT OptiPath recommended feed rate (mm/min)"),
  vericut_force_N:       z.number().min(0).optional().describe("VERICUT predicted cutting force at this block (N)"),
  chip_load_mm:          z.number().min(0).optional().describe("Chip load per tooth (mm/tooth)"),
  mrr_mm3min:            z.number().min(0).optional().describe("Material removal rate at optimized feed (mm³/min)"),
}).describe("A single VERICUT OptiPath block record");

const CollisionEventSchema = z.object({
  block_number:    z.number().int().min(0).describe("Block number where collision occurred"),
  block_text:      z.string().optional().describe("G-code block text"),
  severity:        z.string().describe("Severity: gouge, collision, near_miss, warning"),
  component_1:     z.string().optional().describe("First component involved (e.g. 'tool', 'spindle', 'fixture')"),
  component_2:     z.string().optional().describe("Second component involved (e.g. 'fixture', 'stock', 'table')"),
  penetration_mm:  z.number().min(0).optional().describe("Penetration depth (mm) — 0 for near-miss"),
  position_x_mm:   z.number().optional().describe("Collision X position in machine coordinates (mm)"),
  position_y_mm:   z.number().optional().describe("Collision Y position in machine coordinates (mm)"),
  position_z_mm:   z.number().optional().describe("Collision Z position in machine coordinates (mm)"),
  description:     z.string().optional().describe("Additional context from VERICUT report"),
}).describe("A single collision/gouge event from VERICUT simulation");

const ForceBlockSchema = z.object({
  block_number:     z.number().int().min(0).describe("Block number"),
  block_text:       z.string().optional().describe("G-code block text"),
  vericut_force_N:  z.number().min(0).describe("VERICUT predicted cutting force (N)"),
  chip_load_mm:     z.number().min(0).optional().describe("Chip load per tooth (mm/tooth)"),
  ap_mm:            z.number().min(0).optional().describe("Axial depth of cut (mm)"),
  ae_mm:            z.number().min(0).optional().describe("Radial depth of cut (mm)"),
  feed_mmmin:       z.number().min(0).optional().describe("Feed rate (mm/min)"),
  vc_mmin:          z.number().min(0).optional().describe("Cutting speed (m/min)"),
  mrr_mm3min:       z.number().min(0).optional().describe("Material removal rate (mm³/min)"),
}).describe("A single VERICUT force analysis block record");

// ── Action schemas ─────────────────────────────────────────────────────────

export const ACTION_CAMX_MS20_U05_SCHEMAS: ActionSchemaMap = {

  /**
   * Package all data needed by CGTech VERICUT for simulation verification.
   *
   * Bundles into a VericutExportPackage:
   *   1. G-code program (already generated by PRISM)
   *   2. Machine model (PRISM profile → VERICUT library ID via 50+ machine mappings)
   *   3. Stock definition (block or cylinder, material, ISO group, position)
   *   4. Fixture definition (workholding type, location, orientation)
   *   5. Tool list with full geometry (from PRISM tool catalog, up to 200 tools)
   *   6. Work coordinate systems (G54..G59.x offsets)
   *
   * Machine mapping covers:
   *   Haas (VF-2 … VF-6, ST-10/20/30, DS-30, VR-8/11)
   *   DMG Mori (DMU 50/65/80/85/125, CTX, NEF)
   *   Mazak (Variaxis i-500/700/800, Integrex i-200/300/400, Nexus, QTU)
   *   Okuma (MU-400/500/6300, MB-46V, Genos, LB3000)
   *   Makino (A51NX, A61NX, D200, PS105)
   *   Hermle (C 400/600, C 42U), Grob (G350/G550/G750)
   *   Brother Speedio, Matsuura, Fanuc Robodrill, Chiron, Index/Traub
   *   Nakamura-Tome, Star SR-20, Citizen L20
   *   Fallback: generic_3ax_vmc, generic_5ax_vmc, generic_lathe, generic_mill_turn
   *
   * Returns: VericutExportPackage (+ VericutProjectFile XML if generate_project=true)
   */
  vericut_export: z.object({
    program: z.object({
      name:       z.string().describe("Program name / O-number (e.g. 'O1234', 'PART_OP10')"),
      gcode:      z.string().min(1).describe("Full G-code program text"),
      controller: z.string().optional().describe("Controller dialect (fanuc, heidenhain, siemens, haas, okuma)"),
    }).describe("PRISM G-code program to simulate in VERICUT"),

    machine: VericutMachineSchema,
    stock:   VericutStockSchema,
    fixture: VericutFixtureSchema,

    tools: z.array(VericutToolSchema).min(1).max(200)
             .describe("Tool list from PRISM catalog (1–200 tools, must include all tools used in G-code)"),

    wcs_list: z.array(VericutWCSSchema).max(99).optional()
                .describe("Work coordinate systems — defaults to a single G54 at origin if omitted"),

    generate_project: z.boolean().optional()
                        .describe("When true, also return a complete .vcproject XML file (opens directly in VERICUT)"),

    machine_mapping_only: z.boolean().optional()
                            .describe("When true, only run the machine lookup and return the VERICUT machine ID (no full export)"),
  }),

  /**
   * Import VERICUT OptiPath® per-block feed rate optimization data.
   *
   * VERICUT OptiPath uses a force-model-based approach to optimize feed rates
   * block-by-block. It can increase feeds in light-cut regions (saving time)
   * and reduce feeds in heavy-cut regions (protecting tool life / machine load).
   *
   * This action:
   *   1. Accepts VERICUT's OptiPath block output (block_number, original_block,
   *      optimized_feed_mmmin, vericut_force_N, chip_load_mm, mrr_mm3min)
   *   2. Applies optimized feed rates to the G-code (F-word replacement)
   *   3. Returns OptimizedProgram with reconstructed G-code + statistics
   *
   * Statistics:
   *   - Blocks increased / reduced / unchanged
   *   - Average feed ratio (optimized / original)
   *   - Estimated cycle time change % (negative = faster)
   *   - Max cutting force (N) from VERICUT
   */
  vericut_import_optipath: z.object({
    optipath_data: z.array(OptiPathBlockSchema).min(1).max(50000)
                     .describe("Per-block OptiPath data from VERICUT (1–50,000 blocks)"),

    session_id: z.string().optional()
                  .describe("Export session ID from vericut_export for traceability"),
  }),

  /**
   * Import VERICUT collision report and (optionally) per-block force analysis.
   *
   * Collision / material removal import:
   *   - All collision/gouge events: severity, block number, position, penetration depth, components
   *   - Material removal verification vs. CAD nominal model:
   *       max gouge depth (mm), max excess material (mm), surface conformance %
   *   - VERICUT's accurate cycle time (kinematic model, more accurate than PRISM estimate)
   *   - Verdict: PASS / WARN / FAIL
   *
   * Force analysis (when force_data provided):
   *   Compares VERICUT per-block force predictions against PRISM Kienzle baseline:
   *     Fc = kc1.1 × ap × fz^(1 − mc)   [N]
   *   where kc1.1 and mc are ISO-group-specific constants.
   *
   *   Agreement metrics:
   *     MAE (N) — mean absolute error
   *     RMSE (N) — root mean square error
   *     MAPE (%) — mean absolute percentage error
   *     R² — coefficient of determination
   *     Rating: excellent (<10%), good (<20%), fair (<35%), poor (≥35%)
   *
   * Returns:
   *   collision: CollisionAnalysis
   *   force:     ForceComparison (only when force_data is provided)
   */
  vericut_import_collision: z.object({
    events: z.array(CollisionEventSchema).optional()
               .describe("Collision/gouge events from VERICUT simulation report"),

    material_removal: z.object({
      max_gouge_mm:            z.number().min(0).optional().describe("Maximum gouge depth into CAD model (mm)"),
      max_excess_mm:           z.number().min(0).optional().describe("Maximum excess/remaining material (mm)"),
      gouge_count:             z.number().int().min(0).optional().describe("Number of distinct gouge locations"),
      excess_count:            z.number().int().min(0).optional().describe("Number of excess material locations"),
      surface_conformance_pct: z.number().min(0).max(100).optional()
                                 .describe("Percentage of nominal surface area within tolerance"),
    }).optional().describe("Material removal verification results from VERICUT vs. CAD nominal model"),

    cycle_time_min: z.number().min(0).optional()
                      .describe("VERICUT accurate cycle time prediction (minutes) from kinematic simulation"),

    session_id: z.string().optional()
                  .describe("Export session ID from vericut_export for traceability"),

    force_data: z.array(ForceBlockSchema).optional()
                  .describe("Per-block VERICUT force data for comparison vs. PRISM Kienzle baseline. When provided, returns a ForceComparison in addition to CollisionAnalysis."),

    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional()
                 .describe("ISO material group for Kienzle force baseline. Required when force_data is provided. P=Steel, M=Stainless, K=Cast Iron, N=Non-Ferrous, S=Superalloy, H=Hardened"),
  }),
};
