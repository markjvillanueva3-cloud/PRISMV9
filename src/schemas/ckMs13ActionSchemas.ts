/**
 * CK-MS13 Action Schemas — Zod v4
 *
 * 4 dispatcher actions (PipelineCostModelEngine, E1095):
 *   pipeline_cost_compute      — full cost-per-part breakdown (10 components)
 *   pipeline_cost_compare      — rank multiple options by total cost
 *   pipeline_cost_sensitivity  — identify top cost drivers via ±10% perturbation
 *   pipeline_cost_breakeven    — break-even quantity from setup/variable/price
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const machineTypeZ = z.enum(["3axis", "5axis", "custom", "lathe"]).optional()
  .describe("Machine type for default rate lookup: 3axis=$85/hr, 5axis=$125/hr, lathe=$95/hr");

const toolEntryZ = z.object({
  tool_price_usd:  z.number().positive().describe("Tool purchase price in USD"),
  parts_per_tool:  z.number().int().positive().describe("Expected parts produced before tool replacement"),
  label:           z.string().optional().describe("Tool identifier or description"),
}).passthrough();

const secondaryOpEntryZ = z.object({
  operation_id:          z.string().min(1).describe("SecondaryOpsEngine catalog ID or free-form label"),
  cost_per_part_override: z.number().nonnegative().optional()
    .describe("Override per-part cost (USD). If omitted, SecondaryOpsEngine lookup is expected by caller."),
  quantity:              z.number().int().positive().optional(),
}).passthrough();

const costInputZ = z.object({
  // Material
  stock_volume_cm3:       z.number().positive().describe("Raw stock/billet volume in cm³"),
  material_cost_per_cm3:  z.number().nonnegative().optional()
    .describe("Material cost per cm³ in USD. Provide directly or use material_id for lookup"),
  material_id:            z.string().optional()
    .describe("Material key for MarketMaterialPricingEngine e.g. 'aluminum_6061', 'steel_4140'"),
  material_form:          z.enum(["bar", "forging", "plate", "sheet", "tube"]).optional()
    .describe("Stock form for pricing lookup"),
  material_markup:        z.number().min(0).max(2).optional()
    .describe("Material markup fraction (default 0.10 = 10%)"),
  material_density_kg_cm3: z.number().positive().optional()
    .describe("Density in kg/cm³ — used for fallback cost estimation if material_id not resolved"),
  // Machine
  machine_type:           machineTypeZ,
  machine_rate_per_hr:    z.number().positive().optional()
    .describe("Override machine rate USD/hr (default by machine_type)"),
  cycle_time_min:         z.number().positive().describe("Machining cycle time in minutes (excludes setup)"),
  // Tooling
  tools:                  z.array(toolEntryZ).optional().describe("Tools consumed per cycle"),
  // Setup
  setup_time_min:         z.number().nonnegative().optional().describe("Total setup time in minutes"),
  batch_size:             z.number().int().positive().optional()
    .describe("Batch quantity — amortizes setup and programming cost"),
  // Programming
  programming_hours:      z.number().nonnegative().optional().describe("CAM programming hours"),
  programming_rate_per_hr: z.number().positive().optional()
    .describe("Programming labor rate USD/hr (default $75)"),
  // Energy
  power_kw:               z.number().nonnegative().optional().describe("Machine power draw in kW"),
  energy_rate_per_kwh:    z.number().positive().optional()
    .describe("Energy cost USD/kWh (default $0.12)"),
  // Overhead
  overhead_rate:          z.number().min(0).max(5).optional()
    .describe("Overhead rate as fraction (default 0.35 = 35%)"),
  // Scrap risk
  cpk:                    z.number().min(0).optional()
    .describe("Process Cpk — used to compute P(scrap) via erfc approximation"),
  scrap_probability:      z.number().min(0).max(1).optional()
    .describe("Override P(scrap) directly (0–1). Takes precedence over cpk"),
  // Secondary ops
  secondary_ops:          z.array(secondaryOpEntryZ).optional()
    .describe("Secondary/outside operations to include in cost"),
  // Inspection
  inspection_time_min:    z.number().nonnegative().optional()
    .describe("Inspection time per inspected part in minutes"),
  inspection_sample_size: z.number().int().positive().optional()
    .describe("1-of-N sampling: cost = inspection_time × labor_rate / sample_size"),
  // Labor
  labor_rate_per_hr:      z.number().positive().optional()
    .describe("Labor rate USD/hr (default $45)"),
  // Label
  label:                  z.string().optional().describe("Part or scenario label for reporting"),
}).passthrough();

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_CK_MS13_SCHEMAS: ActionSchemaMap = {

  /**
   * Compute full 10-component cost-per-part breakdown for a single part/scenario.
   * Returns CostBreakdown with line items, cost drivers, and assumptions.
   */
  pipeline_cost_compute: costInputZ,

  /**
   * Compare multiple manufacturing options (materials, processes, batch sizes).
   * Returns options ranked by total cost per part with savings vs baseline.
   * The first option in the array is used as the baseline.
   */
  pipeline_cost_compare: z.object({
    options: z.array(costInputZ).min(2).max(20)
      .describe("Array of cost scenarios to compare (min 2, max 20). First = baseline."),
  }),

  /**
   * Identify which cost drivers have the biggest impact by perturbing each
   * numeric input ±10% and measuring the resulting cost change.
   * Drivers ranked by absolute USD impact.
   */
  pipeline_cost_sensitivity: costInputZ,

  /**
   * Calculate the break-even production quantity given fixed setup cost,
   * per-part variable cost, and target selling price.
   * Formula: N = setup_cost / (target_price - variable_cost_per_part)
   */
  pipeline_cost_breakeven: z.object({
    setup_cost_usd:           z.number().nonnegative()
      .describe("One-time fixed setup cost in USD (tooling + fixtures + programming)"),
    per_part_variable_cost:   z.number().nonnegative()
      .describe("Variable cost per part (material + machining + tool wear + energy + inspection)"),
    target_price_per_part:    z.number().positive()
      .describe("Selling price per part in USD"),
  }),

};
