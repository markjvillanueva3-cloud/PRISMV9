/**
 * CAMX-MS10 U06 Action Schemas — Zod
 *
 * 2 dispatcher actions (CuttingDataExportEngine E1128):
 *   cutting_data_export   — export PRISM physics-computed cutting data to a CAM system format
 *   cutting_data_compute  — compute Kienzle/Taylor cutting data for a single tool+material
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const CuttingToolSchema = z.object({
  id:                  z.string().optional().describe("Tool identifier / catalogue number"),
  designation:         z.string().optional().describe("Full tool designation string"),
  manufacturer:        z.string().optional().describe("Tool manufacturer"),
  tool_type:           z.string().optional().describe("Tool type (endmill, drill, tap, ballnose, face_mill, bull_nose, reamer, thread_mill)"),
  type:                z.string().optional().describe("Alias for tool_type"),
  diameter_mm:         z.number().positive().describe("Cutting / nominal diameter, mm"),
  flutes:              z.number().int().positive().optional().describe("Number of cutting flutes"),
  flute_count:         z.number().int().positive().optional().describe("Alias for flutes"),
  coating:             z.string().optional().describe("Coating (uncoated, TiN, TiCN, TiAlN, AlTiN, AlCrN, DLC, diamond)"),
  material:            z.string().optional().describe("Substrate material (carbide, hss, ceramic, cbn, pcd, cermet)"),
  corner_radius_mm:    z.number().min(0).optional().describe("Corner radius, mm (0 = sharp)"),
  helix_angle_deg:     z.number().min(0).max(90).optional().describe("Helix angle, degrees"),
  cutting_length_mm:   z.number().positive().optional().describe("Flute / cutting length, mm"),
  overall_length_mm:   z.number().positive().optional().describe("Overall tool length, mm"),
  taper:               z.string().optional().describe("Holder taper (CAT40, BT40, HSK-A63, etc.)"),
  gauge_length_mm:     z.number().positive().optional().describe("Gauge / projection length, mm"),
}).describe("A PRISM tool record");

const MaterialRecordSchema = z.object({
  id:          z.string().optional().describe("Material identifier"),
  name:        z.string().describe("Material name (e.g. AISI 4140, Inconel 718, 6061-T6)"),
  iso_group:   z.enum(["P", "M", "K", "N", "S", "H"]).describe(
    "ISO material group: P=Steel, M=Stainless, K=Cast Iron, N=Non-Ferrous, S=Superalloy, H=Hardened"
  ),
  coolant:     z.string().optional().describe("Coolant strategy (flood, mql, dry, hpc, cryogenic, air_blast, mist)"),
  hardness_hb: z.number().positive().optional().describe("Material hardness, HB"),
}).describe("A material record with ISO group classification");

const CAMSystemSchema = z.enum([
  "mastercam",
  "solidcam",
  "nx",
  "hypermill",
  "fusion360",
  "csv",
]).describe("Target CAM system format");

const OperationTypeSchema = z.enum([
  "roughing",
  "semi_finishing",
  "finishing",
  "high_speed",
]).describe("Machining operation type — affects DOC/speed scaling");

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS10_U06_SCHEMAS: ActionSchemaMap = {

  /**
   * Export PRISM physics-computed cutting data (Kienzle/Taylor-backed Vc, fz,
   * ap, ae, tool life, power) for an array of tools × materials into a CAM
   * system's native cutting data format.
   *
   * Physics:
   *   Vc  = VC_BASE[iso] × coating_mult × coolant_mult
   *   fz  = D × chip_load_factor[iso]
   *   Fc  = kc1_1 × ap × fz^(1-mc)  (Kienzle)
   *   T   = (C/Vc)^(1/n)            (Taylor)
   *   P   = Fc × Vc / 60000         (kW)
   *
   * When list_systems=true, returns the list of supported CAM systems.
   * When export_all=true, exports to all 6 systems simultaneously.
   */
  cutting_data_export: z.object({
    tools: z.array(CuttingToolSchema).min(1).max(200).optional().describe(
      "Array of PRISM tool records (1–200 tools). Required unless list_systems=true."
    ),
    materials: z.array(MaterialRecordSchema).min(1).max(20).optional().describe(
      "Array of material records (1–20 materials). Required unless list_systems=true."
    ),
    cam_system: CAMSystemSchema.optional().describe(
      "Target CAM system. Required unless export_all=true or list_systems=true."
    ),
    operation: OperationTypeSchema.optional().describe(
      "Machining operation type (default: semi_finishing). Scales Vc, fz, ap, ae."
    ),
    export_all: z.boolean().optional().describe(
      "When true, export to all 6 CAM systems simultaneously. Returns per_system map."
    ),
    list_systems: z.boolean().optional().describe(
      "When true, return the list of supported CAM systems and their export formats."
    ),
  }),

  /**
   * Compute physics-backed cutting data for a single tool + material combination.
   *
   * Returns:
   *   Vc_mpm, fz_mm, ap_mm, ae_mm, rpm, Vf_mmpm — kinematics
   *   Fc_N        — Kienzle cutting force
   *   power_kW    — Fc × Vc / 60000
   *   tool_life_min — Taylor T = (C/Vc)^(1/n)
   */
  cutting_data_compute: z.object({
    tool: CuttingToolSchema.describe("The tool to compute cutting data for"),
    material: MaterialRecordSchema.describe("The workpiece material"),
    operation: OperationTypeSchema.optional().describe(
      "Machining operation type (default: semi_finishing)"
    ),
  }),
};
