/**
 * CAM Action Schemas — Zod validation schemas for camDispatcher actions
 */
import { z } from "zod";

export const ACTION_CAM_SCHEMAS: Record<string, z.ZodType> = {
  lathe_masterpost_regression_run: z.object({
    machines: z.array(z.string()).optional(),
    jobs: z.array(z.string()).optional(),
    validators: z.array(z.enum(["syntax", "safety", "envelope", "dialect", "timing"])).optional(),
    updateBaseline: z.boolean().optional(),
    diffOnly: z.boolean().optional(),
  }),
  lathe_masterpost_regression_lock: z.object({
    cells: z.array(z.object({ machineId: z.string(), jobId: z.string() })).optional(),
    force: z.boolean().optional(),
  }),
  lathe_masterpost_regression_diff: z.object({
    machineId: z.string().optional(),
    jobId: z.string().optional(),
    threshold: z.number().optional(),
  }),
  lathe_masterpost_regression_stats: z.object({}),
  lathe_masterpost_regression_clear: z.object({}),

  // Deep Reasoning Engine actions
  lathe_masterpost_deep_explain: z.object({
    machineId: z.string().describe("Target machine ID"),
    operation: z.string().optional().describe("Operation type (turning, boring, threading, etc.)"),
    constraints: z.record(z.unknown()).optional().describe("Additional constraints"),
  }),
  lathe_masterpost_deep_causal: z.object({
    machineId: z.string().describe("Machine ID for causal inference"),
    operation: z.string().optional().describe("Operation context"),
  }),
  lathe_masterpost_deep_counterfactual: z.object({
    machineId: z.string().describe("Machine ID for counterfactual analysis"),
    hypotheticalChange: z.string().describe("Hypothetical change to analyze"),
  }),
  lathe_masterpost_deep_history: z.object({
    limit: z.number().optional().describe("Max trace entries to return"),
  }),
  lathe_masterpost_deep_stats: z.object({}),
  lathe_masterpost_deep_clear: z.object({}),

  // Ensemble Cross-Check Engine actions
  lathe_masterpost_ensemble_run: z.object({
    machineId: z.string().describe("Machine ID for ensemble run"),
    program: z.string().describe("G-code program to check"),
    operation: z.string().optional().describe("Operation type"),
  }),
  lathe_masterpost_ensemble_candidates: z.object({
    machineId: z.string().describe("Machine ID to find candidates for"),
    operation: z.string().optional().describe("Operation type filter"),
  }),
  lathe_masterpost_ensemble_ambiguous: z.object({
    machineId: z.string().describe("Machine ID to check for ambiguity"),
  }),
  lathe_masterpost_ensemble_divergences: z.object({
    outputs: z.array(z.object({
      postId: z.string(),
      gcode: z.array(z.string()),
    })).describe("Post outputs to compare"),
    threshold: z.number().optional().describe("Divergence threshold (0-1)"),
  }),
  lathe_masterpost_ensemble_history: z.object({
    limit: z.number().optional().describe("Max results to return"),
  }),
  lathe_masterpost_ensemble_stats: z.object({}),
  lathe_masterpost_ensemble_clear: z.object({}),

  // ============================================================================
  // MASTER POST ENGINES (JM Die canonical posts) — PPG-WIRE-MS0
  // ============================================================================

  /** Okuma LB250II-M lathe master post — JM Die canonical lathe post with OSP-P300L */
  master_post_okuma_b250: z.object({
    operations: z.array(z.object({
      operation_type: z.enum([
        "od_rough", "od_finish", "id_rough", "id_finish",
        "face", "groove", "thread", "drill", "bore", "part_off", "c_mill"
      ]).describe("Lathe operation type"),
      tool_number: z.number().int().min(1).max(99).describe("Tool station number (T01-T99)"),
      tool_orientation: z.number().int().min(1).max(9).describe("ISO tool orientation 1-9"),
      insert_radius_mm: z.number().positive().describe("Insert nose radius in mm"),
      tool_description: z.string().optional().describe("Tool description for comments"),
      material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
      spindle_rpm: z.number().positive().optional().describe("Direct RPM (mutually exclusive with CSS)"),
      css_m_min: z.number().positive().optional().describe("G96 constant surface speed m/min"),
      css_max_rpm: z.number().positive().optional().describe("G50 spindle speed clamp"),
      feed_mm_rev: z.number().positive().describe("Feed rate mm/rev"),
      depth_of_cut_mm: z.number().positive().describe("Depth of cut mm"),
      start_x: z.number().describe("Start X coordinate (diameter)"),
      start_z: z.number().describe("Start Z coordinate"),
      end_x: z.number().describe("End X coordinate (diameter)"),
      end_z: z.number().describe("End Z coordinate"),
      thread_pitch_mm: z.number().positive().optional().describe("Thread pitch for G76"),
      thread_depth_mm: z.number().positive().optional().describe("Thread depth for G76"),
      thread_passes: z.number().int().positive().optional().describe("Number of threading passes"),
      groove_width_mm: z.number().positive().optional().describe("Groove width for grooving ops"),
      coolant: z.enum(["flood", "off"]).optional().describe("Coolant mode"),
    })).min(1).describe("Array of turning operations to post-process"),
    config: z.object({
      program_number: z.number().int().min(1).max(9999).optional().describe("O-number (default: 1)"),
      program_comment: z.string().optional().describe("Program header comment"),
      units: z.enum(["metric", "inch"]).optional().describe("Output units (default: metric)"),
      work_offset: z.number().int().min(54).max(59).optional().describe("G54-G59 work offset"),
      safe_z_mm: z.number().optional().describe("Safe Z retract position"),
      chuck_pressure: z.enum(["high", "medium", "low"]).optional().describe("Chuck clamping pressure"),
      use_css: z.boolean().optional().describe("Use G96 constant surface speed (default: true)"),
      css_max_rpm: z.number().positive().optional().describe("G50 spindle clamp RPM (default: 3500)"),
      sub_spindle_enabled: z.boolean().optional().describe("Enable sub-spindle sync codes"),
      live_tooling_enabled: z.boolean().optional().describe("Enable live tooling M-codes"),
      c_axis_enabled: z.boolean().optional().describe("Enable C-axis positioning"),
      tailstock_position_mm: z.number().optional().describe("Tailstock engagement position"),
    }).optional().describe("Post processor configuration"),
  }),
};
