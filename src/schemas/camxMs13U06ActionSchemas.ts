/**
 * CAMX-MS13 U06 Action Schemas — Zod v4
 *
 * 4 dispatcher actions (TCODashboardEngine, E1136):
 *   tco_dashboard   — generate full TCO dashboard for a job
 *   tco_compare     — compare current vs. optimized parameters with delta table
 *   tco_savings     — ranked list of savings opportunities with ROI
 *   tco_drivers     — Pareto cost driver analysis
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
  operation_id:           z.string().min(1).describe("SecondaryOpsEngine catalog ID or free-form label"),
  cost_per_part_override: z.number().nonnegative().optional()
    .describe("Override per-part cost (USD). If omitted, $0 is used (SecondaryOpsEngine lookup expected by caller)."),
  quantity:               z.number().int().positive().optional(),
}).passthrough();

/**
 * TCO job input — PipelineCostInput fields plus dashboard-specific extras.
 */
const tcoJobInputZ = z.object({
  // ── Core cost inputs (from PipelineCostModelEngine) ──────────────────────
  stock_volume_cm3:        z.number().positive().describe("Raw stock/billet volume in cm³"),
  material_cost_per_cm3:   z.number().nonnegative().optional()
    .describe("Material cost per cm³ in USD. Provide directly or use material_id for lookup"),
  material_id:             z.string().optional()
    .describe("Material key for MarketMaterialPricingEngine e.g. 'aluminum_6061', 'steel_4140'"),
  material_form:           z.enum(["bar", "forging", "plate", "sheet", "tube"]).optional()
    .describe("Stock form for pricing lookup"),
  material_markup:         z.number().min(0).max(2).optional()
    .describe("Material markup fraction (default 0.10 = 10%)"),
  material_density_kg_cm3: z.number().positive().optional()
    .describe("Density in kg/cm³ — used for fallback cost estimation if material_id not resolved"),
  machine_type:            machineTypeZ,
  machine_rate_per_hr:     z.number().positive().optional()
    .describe("Override machine rate USD/hr (default by machine_type)"),
  cycle_time_min:          z.number().positive().describe("Machining cycle time in minutes (excludes setup)"),
  tools:                   z.array(toolEntryZ).optional().describe("Tools consumed per cycle"),
  setup_time_min:          z.number().nonnegative().optional().describe("Total setup time in minutes"),
  batch_size:              z.number().int().positive().optional()
    .describe("Batch quantity — amortizes setup and programming cost"),
  programming_hours:       z.number().nonnegative().optional().describe("CAM programming hours"),
  programming_rate_per_hr: z.number().positive().optional()
    .describe("Programming labor rate USD/hr (default $75)"),
  power_kw:                z.number().nonnegative().optional().describe("Machine power draw in kW"),
  energy_rate_per_kwh:     z.number().positive().optional()
    .describe("Energy cost USD/kWh (default $0.12)"),
  overhead_rate:           z.number().min(0).max(5).optional()
    .describe("Overhead rate as fraction (default 0.35 = 35%)"),
  cpk:                     z.number().min(0).optional()
    .describe("Process Cpk — used to compute P(scrap) via erfc approximation"),
  scrap_probability:       z.number().min(0).max(1).optional()
    .describe("Override P(scrap) directly (0–1). Takes precedence over cpk"),
  secondary_ops:           z.array(secondaryOpEntryZ).optional()
    .describe("Secondary/outside operations to include in cost"),
  inspection_time_min:     z.number().nonnegative().optional()
    .describe("Inspection time per inspected part in minutes"),
  inspection_sample_size:  z.number().int().positive().optional()
    .describe("1-of-N sampling: cost = inspection_time × labor_rate / sample_size"),
  labor_rate_per_hr:       z.number().positive().optional()
    .describe("Labor rate USD/hr (default $45)"),
  label:                   z.string().optional().describe("Part or scenario label for reporting"),

  // ── Dashboard-specific extras ─────────────────────────────────────────────
  part_number:             z.string().optional()
    .describe("Part number for historical trend correlation"),
  machine_id:              z.string().optional()
    .describe("Machine identifier for utilization context"),
  utilization_pct:         z.number().min(0).max(1).optional()
    .describe("Machine utilization fraction (0–1). Used for lights-out shift opportunity."),
  annual_machine_hours:    z.number().positive().optional()
    .describe("Annual machine hours — used for idle cost and MQL savings calculations"),
  flood_coolant_cost_per_year: z.number().nonnegative().optional()
    .describe("Annual flood coolant cost USD (default $6,000 if not provided)"),
  annual_volume:           z.number().int().positive().optional()
    .describe("Annual production volume — enables annual cost and per-part MQL/shift savings"),
}).passthrough();

const machineUtilInputZ = z.object({
  machine:               z.string().min(1).describe("Machine identifier label (e.g. 'DMG-DMU50', 'Haas-VF4')"),
  machine_type:          z.enum(["3axis", "5axis", "lathe", "custom"])
    .describe("Machine type for default hourly rate: 3axis=$85/hr, 5axis=$125/hr, lathe=$95/hr"),
  hourly_rate_override:  z.number().positive().optional()
    .describe("Override hourly rate USD/hr (ownership + maintenance + space)"),
  utilization_pct:       z.number().min(0.01).max(1)
    .describe("Actual utilization fraction 0–1 (e.g. 0.75 = 75%). Min 0.01 to avoid division by zero."),
  annual_hours:          z.number().positive().optional()
    .describe("Annual machine hours — enables idle cost calculation"),
}).passthrough();

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS13_U06_SCHEMAS: ActionSchemaMap = {

  /**
   * Generate a full TCO dashboard for a manufacturing job.
   *
   * Returns:
   *   - Full 10-component cost breakdown (material, machining, tooling, setup,
   *     programming, energy, overhead, scrap, secondary ops, inspection)
   *   - Top 5 cost drivers
   *   - Total per-part and batch costs
   *   - Optional annual cost (requires annual_volume)
   *   - Potential savings headline (aggregated from savingsOpportunities)
   *   - Assumptions list
   */
  tco_dashboard: tcoJobInputZ,

  /**
   * Compare current manufacturing parameters vs. optimized parameters.
   *
   * Returns component-level delta table showing where cost changes occur,
   * absolute and percentage savings, and ROI in parts if upfront_cost_delta provided.
   *
   * Both current_params and optimized_params accept the full TCO job input.
   * Use label field to identify each scenario.
   */
  tco_compare: z.object({
    current_params:   tcoJobInputZ
      .describe("Current (baseline) manufacturing parameters"),
    optimized_params: tcoJobInputZ.extend({
      upfront_cost_delta: z.number().nonnegative().optional()
        .describe("One-time upfront investment to achieve the optimized parameters (USD). Used for ROI calculation."),
    }).passthrough()
      .describe("Optimized manufacturing parameters (tool upgrade, faster cycle, larger batch, etc.)"),
  }),

  /**
   * Ranked list of actionable savings opportunities for a job.
   *
   * Evaluates 5 canonical opportunity types:
   *   1. adaptive_clearing   — 20% cycle-time reduction via trochoidal engagement
   *   2. premium_tool        — 2.2× tool life at 1.4× price → ~36% tooling reduction
   *   3. setup_reduction     — 15-min setup reduction amortized over batch
   *   4. mql_coolant         — MQL vs. flood → save ~65% of coolant cost/year
   *   5. lights_out_shift    — unattended second shift → 35% CPP reduction
   *
   * Returns opportunities ranked by savings_per_part with priority (high/medium/low)
   * and ROI in parts (where upfront investment is required).
   *
   * Tips for best results:
   *   - Provide annual_volume to enable MQL and lights-out shift calculations
   *   - Provide utilization_pct < 0.7 to trigger lights-out shift opportunity
   *   - Provide tools[] with real pricing for premium tool analysis
   *   - Provide setup_time_min > 15 for setup reduction analysis
   */
  tco_savings: tcoJobInputZ,

  /**
   * Pareto cost driver analysis.
   *
   * Sorts all 10 cost components by USD amount descending and computes
   * the cumulative percentage curve (for Pareto chart rendering).
   * Identifies the "80% threshold" index — the first N drivers that
   * account for ≥80% of total cost.
   *
   * Returns:
   *   - drivers[]:         sorted components with amount and % of total
   *   - pareto_data:       full Pareto dataset including cumulative_pct curve
   *   - pareto_threshold:  index of the driver that tips cumulative to ≥80%
   */
  tco_drivers: tcoJobInputZ,

};
