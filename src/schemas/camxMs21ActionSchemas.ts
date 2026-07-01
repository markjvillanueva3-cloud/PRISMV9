/**
 * CAMX-MS21 Action Schemas — Zod v4
 *
 * 6 dispatcher actions (ProductionBatchOptimizationEngine E1094):
 *   production_batch_optimize       — full BatchPlan for part + quantity
 *   production_batch_tool_changes   — Taylor tool life → change schedule
 *   production_batch_fixture        — tombstone/pallet/gang fixture loading plan
 *   production_batch_barstock       — bar stock optimization for turning
 *   production_batch_probing        — SPC-based probing schedule
 *   production_batch_cost           — batch cost analysis breakdown
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const batchToolZ = z.object({
  tool_id:   z.string().min(1).describe("Tool identifier / number, e.g. T01"),
  tool_type: z.string().describe("e.g. endmill | drill | insert | tap | boring_bar"),
  cutting_speed_vc_m_per_min: z.number().positive().describe(
    "Cutting speed Vc, m/min"
  ),
  taylor_C: z.number().positive().describe(
    "Taylor C constant — cutting speed for 1-minute tool life, m/min"
  ),
  taylor_n: z.number().positive().describe(
    "Taylor n exponent — typically 0.1–0.4 for carbide, 0.1–0.2 for HSS"
  ),
  tool_life_min: z.number().positive().optional().describe(
    "Override Taylor-computed life with a known value, min"
  ),
  tool_cost_usd:   z.number().nonnegative().describe("Cost per edge / insert, USD"),
  change_time_min: z.number().positive().describe("Time to change or index tool, min"),
  sister_tool:   z.boolean().optional().default(false).describe(
    "Enable sister tool strategy — automatic twin for lights-out production"
  ),
  sister_count: z.number().int().nonnegative().optional().default(1).describe(
    "Number of sister tools loaded in the carousel"
  ),
}).passthrough();

const partDimsZ = z.object({
  length_mm: z.number().positive(),
  width_mm:  z.number().positive(),
  height_mm: z.number().positive(),
  weight_kg: z.number().nonnegative().optional(),
}).passthrough();

const fixtureTypeZ = z.enum(["tombstone", "pallet", "gang", "vise", "chuck"]).describe(
  "tombstone=HMC column fixture | pallet=APC pallet | gang=inline row | vise=kurt | chuck=lathe"
);

const fixtureDimsZ = z.object({
  width_mm:    z.number().positive().describe("Usable face width, mm"),
  height_mm:   z.number().positive().describe("Usable face height, mm"),
  faces:       z.number().int().min(1).optional().default(4).describe(
    "Tombstone faces (2|4|6)"
  ),
  max_load_kg: z.number().positive().optional().describe("Maximum total load on fixture, kg"),
  clearance_mm: z.number().nonnegative().optional().default(5).describe(
    "Minimum part-to-part clearance, mm"
  ),
}).passthrough();

const toleranceSpecZ = z.object({
  feature:       z.string().describe("Feature name, e.g. bore_dia | flatness | position"),
  tolerance_mm:  z.number().positive().describe("Total tolerance band, mm"),
  nominal_mm:    z.number().optional().describe("Target nominal dimension, mm"),
}).passthrough();

const spcDataZ = z.object({
  feature:  z.string().describe("Feature name matching toleranceSpec"),
  cpk:      z.number().optional().describe("Process capability index Cpk"),
  sigma_mm: z.number().positive().optional().describe("Historical sigma, mm"),
  mean_mm:  z.number().optional().describe("Historical mean, mm"),
}).passthrough();

const machineParamsZ = z.object({
  name:              z.string().describe("Machine name, e.g. Haas VF-4"),
  rate_usd_per_hr:   z.number().positive().describe("Machine hourly rate, USD/hr"),
  setup_time_min:    z.number().nonnegative().describe("Setup time, min"),
  spindle_utilization: z.number().min(0).max(1).optional().default(0.8).describe(
    "Expected spindle-on fraction (0–1)"
  ),
}).passthrough();

const materialParamsZ = z.object({
  name:              z.string().describe("Material name, e.g. aluminum_6061"),
  cost_usd_per_kg:   z.number().nonnegative().describe("Billet/bar cost, USD/kg"),
  density_kg_per_m3: z.number().positive().optional().describe(
    "Density, kg/m³ (e.g. 2700 Al, 7850 steel)"
  ),
}).passthrough();

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS21_SCHEMAS: ActionSchemaMap = {

  /** Build a complete BatchPlan for a part × quantity combination. */
  production_batch_optimize: z.object({
    part_id:         z.string().min(1).describe("Part identifier"),
    quantity:        z.number().int().positive().describe("Batch quantity"),
    tools:           z.array(batchToolZ).min(1).describe("Tool list with Taylor parameters"),
    machine:         machineParamsZ,
    material:        materialParamsZ,
    part_dims:       partDimsZ,
    fixture_type:    fixtureTypeZ,
    fixture_dims:    fixtureDimsZ,
    cycle_time_min:  z.number().positive().describe("Estimated cycle time per part, min"),
    tolerances:      z.array(toleranceSpecZ).optional().default([]).describe(
      "Critical feature tolerances for probing schedule"
    ),
    spc_data:        z.array(spcDataZ).optional().describe(
      "SPC history to tune probe interval (Cpk per feature)"
    ),
    bar_length_mm:   z.number().positive().optional().describe(
      "Bar stock length for turning optimization (omit for milling)"
    ),
  }),

  /** Predict tool change schedule across N parts using Taylor's equation. */
  production_batch_tool_changes: z.object({
    tools:                 z.array(batchToolZ).min(1).describe("Tools with Taylor parameters"),
    cycle_time_min:        z.number().positive().describe("Cycle time per part, min"),
    quantity:              z.number().int().positive().describe("Batch quantity"),
  }),

  /** Optimize fixture loading — tombstone, pallet, gang, vise, or chuck. */
  production_batch_fixture: z.object({
    part_dims:    partDimsZ,
    fixture_type: fixtureTypeZ,
    fixture_dims: fixtureDimsZ,
  }),

  /** Optimize bar stock usage for turning operations. */
  production_batch_barstock: z.object({
    part_length_mm:  z.number().positive().describe("Finished part length, mm"),
    part_dia_mm:     z.number().positive().describe("Finished part diameter, mm"),
    bar_length_mm:   z.number().positive().describe("Raw bar stock length, mm"),
    grip_length_mm:  z.number().positive().optional().default(20).describe(
      "Chuck grip length (not usable), mm"
    ),
    cutoff_width_mm: z.number().positive().optional().default(3).describe(
      "Cutoff / parting blade width, mm"
    ),
    material:        materialParamsZ.optional().describe(
      "Material params for cost-per-part calculation"
    ),
  }),

  /** Generate SPC-based probing schedule (first-article, spot-check, last-article). */
  production_batch_probing: z.object({
    quantity:   z.number().int().positive().describe("Batch quantity"),
    tolerances: z.array(toleranceSpecZ).optional().default([]).describe(
      "Feature tolerance specs (tight tol → always probed)"
    ),
    spc_data:   z.array(spcDataZ).optional().describe(
      "SPC history — Cpk drives probe interval N"
    ),
  }),

  /** Compute batch cost breakdown: setup + machining + tool changes + waste. */
  production_batch_cost: z.object({
    part_id:       z.string().min(1),
    quantity:      z.number().int().positive(),
    machine:       machineParamsZ,
    material:      materialParamsZ,
    part_dims:     partDimsZ,
    cycle_time_min: z.number().positive().describe("Cycle time per part, min"),
    tool_schedules: z.array(z.object({
      tool_id:              z.string(),
      tool_type:            z.string(),
      tool_life_min:        z.number(),
      total_changes:        z.number().int(),
      total_change_time_min: z.number(),
      sister_strategy_active: z.boolean(),
      changes:              z.array(z.object({
        sister_takeover: z.boolean(),
      }).passthrough()),
      notes: z.array(z.string()),
    }).passthrough()).optional().default([]).describe(
      "Pre-computed tool schedules (from production_batch_tool_changes)"
    ),
    bar_plan: z.object({
      waste_pct:         z.number(),
      grip_length_mm:    z.number(),
      remnant_length_mm: z.number(),
      bars_required:     z.number().int(),
    }).passthrough().optional().describe("Bar stock plan (from production_batch_barstock)"),
  }),

};
