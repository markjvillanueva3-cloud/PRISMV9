/**
 * CAMX-MS12 U02 Action Schemas — Zod v4
 *
 * 3 dispatcher actions (StrategyBenchmarkEngine E1096):
 *   strategy_benchmark             — benchmark single strategy (physics + MC)
 *   strategy_benchmark_compare     — compare and rank multiple strategies
 *   strategy_benchmark_monte_carlo — full stochastic analysis with raw samples
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const strategyZ = z.object({
  strategy_id: z.string().min(1).describe(
    "Unique strategy identifier, e.g. 'hm_optimized_roughing' or 'f360_adaptive'"
  ),
  ae_mm: z.number().positive().describe(
    "Radial depth of cut ae, mm (also called stepover or width of cut)"
  ),
  ap_mm: z.number().positive().describe(
    "Axial depth of cut ap, mm (also called depth of cut or doc)"
  ),
  fz_mm: z.number().positive().describe(
    "Feed per tooth fz, mm/tooth"
  ),
  vc_m_min: z.number().positive().describe(
    "Cutting speed Vc, m/min"
  ),
  overhead_min: z.number().nonnegative().optional().default(0.5).describe(
    "Overhead time per operation (retract, approach, rapid moves), min. Default 0.5 min"
  ),
  category: z.enum([
    "roughing", "semi_finishing", "finishing", "hsm_roughing",
    "trochoidal", "adaptive", "contour", "plunge", "pencil", "custom",
  ]).optional().describe(
    "Strategy category for classification"
  ),
}).passthrough();

const featureZ = z.object({
  volume_cm3: z.number().positive().describe(
    "Volume of material to remove, cm³"
  ),
  tolerance_mm: z.number().positive().describe(
    "Required surface tolerance (bilateral ±), mm. Used for Cpk prediction (USL = tolerance/4 as Ra spec)"
  ),
  type: z.enum([
    "pocket", "contour", "slot", "face", "bore", "thread",
    "profile", "freeform", "cavity", "step",
  ]).optional().describe(
    "Feature type for classification"
  ),
}).passthrough();

const materialZ = z.object({
  kc1_1_n_mm2: z.number().positive().describe(
    "Specific cutting force coefficient kc1_1, N/mm². e.g. aluminum~700, steel~2800, Ti-6Al-4V~3500, Inconel~4200"
  ),
  mc: z.number().positive().describe(
    "Chip thickness exponent mc (dimensionless, typically 0.2–0.4)"
  ),
  taylor_C: z.number().positive().describe(
    "Taylor C constant — cutting speed for 1-minute tool life, m/min. e.g. Al6061~600, 4140~90, Ti-6Al-4V~55"
  ),
  taylor_n: z.number().positive().describe(
    "Taylor n exponent (dimensionless). e.g. carbide~0.25, HSS~0.125, ceramic~0.45"
  ),
  cost_per_cm3_usd: z.number().nonnegative().optional().describe(
    "Material cost per cm³, USD. Provide this OR density + cost_per_kg"
  ),
  density_g_cm3: z.number().positive().optional().describe(
    "Material density, g/cm³. e.g. Al~2.7, steel~7.85, Ti~4.43, Inconel~8.19"
  ),
  cost_per_kg_usd: z.number().nonnegative().optional().describe(
    "Material cost per kg, USD. Used if cost_per_cm3_usd not provided"
  ),
}).passthrough();

const toolZ = z.object({
  diameter_mm: z.number().positive().describe(
    "Tool (end mill / insert) diameter, mm"
  ),
  flute_count: z.number().int().min(1).max(12).describe(
    "Number of flutes / inserts"
  ),
  corner_radius_mm: z.number().positive().describe(
    "Corner or nose radius r, mm. Used in Ra = fz²/(32r) scallop model"
  ),
  overhang_mm: z.number().positive().describe(
    "Tool overhang from holder face, mm. Used for deflection correction in Ra model"
  ),
  cost_usd: z.number().nonnegative().describe(
    "Tool / insert purchase cost, USD per edge"
  ),
  expected_parts: z.number().positive().optional().describe(
    "Expected parts per tool edge before replacement (baseline, for reference only)"
  ),
}).passthrough();

const machineZ = z.object({
  rate_usd_hr: z.number().positive().optional().default(85).describe(
    "Machine hourly rate, USD/hr. Default $85/hr (3-axis VMC)"
  ),
  spindle_power_kw: z.number().positive().describe(
    "Available spindle power, kW"
  ),
  overhead_usd_per_part: z.number().nonnegative().optional().default(0.5).describe(
    "Machine overhead per part (setup amortized), USD. Default $0.50"
  ),
}).passthrough();

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS12_U02_SCHEMAS: ActionSchemaMap = {

  /**
   * Benchmark a single strategy with physics + 500-trial Monte Carlo.
   * Returns: cycle_time_min, cycle_time_ci95, tool_life_min, tool_life_weibull,
   *          Ra_um, Ra_ci95, Cpk_predicted, cost_per_part, cost_ci95, score
   */
  strategy_benchmark: z.object({
    strategy: strategyZ.describe("Candidate strategy parameters"),
    feature:  featureZ.describe("Feature geometry and tolerance"),
    material: materialZ.describe("Workpiece material properties"),
    tool:     toolZ.describe("Cutting tool parameters"),
    machine:  machineZ.describe("Machine parameters and rates"),
    trials:   z.number().int().min(50).max(5000).optional().default(500).describe(
      "Number of Monte Carlo trials. Default 500"
    ),
  }),

  /**
   * Compare and rank multiple strategies for the same feature/material/tool/machine.
   * Returns ranked array with delta vs best strategy.
   */
  strategy_benchmark_compare: z.object({
    strategies: z.array(strategyZ).min(2).max(20).describe(
      "2–20 candidate strategies to compare"
    ),
    feature:  featureZ.describe("Feature geometry and tolerance"),
    material: materialZ.describe("Workpiece material properties"),
    tool:     toolZ.describe("Cutting tool parameters"),
    machine:  machineZ.describe("Machine parameters and rates"),
    trials:   z.number().int().min(50).max(5000).optional().default(500).describe(
      "Number of Monte Carlo trials per strategy. Default 500"
    ),
  }),

  /**
   * Full stochastic Monte Carlo analysis for a single strategy.
   * Returns result plus full sample distributions for cycle time, tool life, Ra and cost.
   * Use when you need p5/p95 values, histograms, or custom post-processing.
   */
  strategy_benchmark_monte_carlo: z.object({
    strategy: strategyZ.describe("Candidate strategy parameters"),
    feature:  featureZ.describe("Feature geometry and tolerance"),
    material: materialZ.describe("Workpiece material properties"),
    tool:     toolZ.describe("Cutting tool parameters"),
    machine:  machineZ.describe("Machine parameters and rates"),
    trials:   z.number().int().min(50).max(5000).optional().default(500).describe(
      "Number of Monte Carlo trials. Default 500"
    ),
  }),
};
