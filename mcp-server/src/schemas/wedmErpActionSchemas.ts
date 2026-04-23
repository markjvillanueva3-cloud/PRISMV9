/**
 * WEDM-ERP-MS0 Route Input Schemas
 *
 * Zod validation schemas for the /api/v1/wedm-erp/* routes. Each schema
 * corresponds to one endpoint input shape. Keep these minimal and
 * permissive — engines do the heavy validation downstream.
 */
import { z } from "zod";

// ============================================================================
// QUOTE ENDPOINTS (U-WEDM-ERP04 + U-WEDM-ERP05)
// ============================================================================

/** POST /quote/estimate — quick cost estimate from dimensions */
export const wedmEstimateSchema = z.object({
  part_id: z.string().default("TMP-EST"),
  material: z.string().min(1),
  perimeter_mm: z.number().positive(),
  thickness_mm: z.number().positive(),
  pass_count: z.number().int().min(1).max(6).default(3),
  wire_type: z.enum(["brass", "coated", "molybdenum", "tungsten"]).default("brass"),
  wire_diameter_mm: z.number().positive().default(0.25),
  quantity: z.number().int().min(1).default(1),
  overhead_pct: z.number().min(0).max(0.5).optional(),
  margin_pct: z.number().min(0).max(0.5).optional(),
  machine_rate_per_hr: z.number().positive().optional(),
  setup_hrs: z.number().min(0).max(8).default(1),
});
export type WEDMEstimateInput = z.infer<typeof wedmEstimateSchema>;

/** POST /quote/from-program — quote directly from generated program */
export const wedmFromProgramSchema = z.object({
  program_result: z.any(), // WEDMProgramResult shape — engine validates
  quantity: z.number().int().min(1).default(1),
  customer: z.string().min(1).optional(),
  margin_pct: z.number().min(0).max(0.5).optional(),
});

/** POST /quote/quantity-breaks — cost per part for multiple quantities */
export const wedmQuantityBreaksSchema = z.object({
  cost_estimate: z.any(), // CostEstimate from prior estimate call
  quantities: z.array(z.number().int().min(1)).min(1).max(20),
  learning_rate: z.number().min(0.5).max(1).optional(),
});

/** POST /quote/batch — estimate for multiple parts in one call (U-WEDM-ERP04) */
export const wedmBatchEstimateSchema = z.object({
  parts: z
    .array(wedmEstimateSchema)
    .min(1, "at least one part required")
    .max(50, "batch limited to 50 parts"),
  customer: z.string().min(1).optional().describe("optional customer id for the batch"),
  combine_rates: z.boolean().default(true).describe("use shared rates across all parts"),
});
export type WEDMBatchEstimateInput = z.infer<typeof wedmBatchEstimateSchema>;

/** PUT /quote/:id — update an existing WEDM quote (U-WEDM-ERP05) */
export const wedmQuoteUpdateSchema = z.object({
  customer: z.string().min(1).optional(),
  part_name: z.string().min(1).optional(),
  quantity: z.number().int().min(1).max(100000).optional(),
  margin_pct: z.number().min(0).max(0.5).optional(),
  lead_time_days: z.number().int().min(0).max(365).optional(),
  valid_days: z.number().int().min(1).max(180).optional(),
  notes: z.array(z.string().max(500)).max(20).optional(),
  terms: z.array(z.string().max(200)).max(10).optional(),
});
export type WEDMQuoteUpdateInput = z.infer<typeof wedmQuoteUpdateSchema>;

/** POST /quote/:id/send — send quote to customer via email (U-WEDM-ERP05) */
export const wedmQuoteSendSchema = z.object({
  to: z.string().email().describe("customer email recipient"),
  cc: z.array(z.string().email()).max(10).optional(),
  message: z.string().max(2000).optional().describe("optional cover message"),
  attach_pdf: z.boolean().default(true),
});
export type WEDMQuoteSendInput = z.infer<typeof wedmQuoteSendSchema>;

/** POST /quote/compare — compare WEDM vs alternative processes (U-WEDM-ERP04) */
export const wedmCompareProcessesSchema = z.object({
  part: wedmEstimateSchema.describe("baseline WEDM estimate input for the part"),
  alternatives: z
    .array(z.enum(["laser", "waterjet", "stamping", "grinding", "milling"]))
    .min(1)
    .max(5)
    .default(["laser", "waterjet"])
    .describe("processes to compare WEDM against"),
  tolerance_um: z
    .number()
    .positive()
    .max(1000)
    .optional()
    .describe("required dimensional tolerance — rules out processes that cannot hold it"),
  surface_finish_ra_um: z
    .number()
    .positive()
    .max(12.5)
    .optional()
    .describe("required Ra — rules out processes that cannot meet it"),
});
export type WEDMCompareProcessesInput = z.infer<typeof wedmCompareProcessesSchema>;

/** POST /quote/credit-cost — credit-based pricing */
export const wedmCreditCostSchema = z.object({
  perimeter_mm: z.number().positive(),
  thickness_mm: z.number().positive(),
  passes: z.number().int().min(1).max(6),
  taper_count: z.number().int().min(0).default(0),
});

/** POST /quote/create — persist full quote with line items */
export const wedmQuoteCreateSchema = z.object({
  customer: z.string().min(1),
  part_name: z.string().min(1),
  part_number: z.string().optional(),
  cost_estimate: z.any(),
  quantity: z.number().int().min(1).default(1),
  quote_number: z.string().optional(),
  lead_time_days: z.number().int().min(1).default(7),
  valid_days: z.number().int().min(1).default(30),
});

// ============================================================================
// ERP ENDPOINTS (U-WEDM-ERP06 + U-WEDM-ERP07)
// ============================================================================

/** POST /job/create — create job packet from generated program */
export const wedmJobCreateSchema = z.object({
  program_result: z.any(),
  options: z.object({
    customer: z.string().optional(),
    part_number: z.string().optional(),
    part_name: z.string().optional(),
    quantity: z.number().int().min(1).optional(),
    due_date: z.string().optional(),
    priority: z.enum(["standard", "rush", "emergency"]).optional(),
    machine_id: z.string().optional(),
    operator: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  quote: z.any().optional(),
});

/** POST /job/:id/complete — mark job complete with actual metrics */
export const wedmJobCompleteSchema = z.object({
  actual_cutting_time_min: z.number().min(0),
  actual_wire_m: z.number().min(0),
  actual_passes: z.number().int().min(1),
  actual_cost_usd: z.number().min(0),
  completed_at: z.string().optional(),
  completion_notes: z.string().optional(),
  customer_id: z.string().optional(),
  customer_email: z.string().email().optional(),
  machine_rate_usd_per_hr: z.number().positive().optional(),
  wire_cost_usd_per_m: z.number().positive().optional(),
  tax_rate_pct: z.number().min(0).max(50).optional(),
  overage_threshold_pct: z.number().min(0).max(100).optional(),
});

/** WEDM-specific job status values — tracks high-level job position */
export const WEDM_JOB_STATUSES = [
  "scheduled",
  "threading",
  "rough_cutting",
  "skim_cutting",
  "qc",
  "complete",
  "on_hold",
  "cancelled",
] as const;
export type WEDMJobStatus = (typeof WEDM_JOB_STATUSES)[number];

/** PATCH /job/:id/status — update job status + optional department/note (U-WEDM-ERP06) */
export const wedmJobStatusUpdateSchema = z.object({
  status: z.enum(WEDM_JOB_STATUSES).describe("new top-level job status"),
  department_id: z.string().min(1).max(64).optional().describe("department to mark 'current' (e.g. 'setup', 'rough', 'skim1', 'qc', 'ship')"),
  note: z.string().max(500).optional(),
  operator: z.string().min(1).max(100).optional(),
});
export type WEDMJobStatusUpdateInput = z.infer<typeof wedmJobStatusUpdateSchema>;

/** GET /job/list — query filters (U-WEDM-ERP06) */
export const wedmJobListQuerySchema = z.object({
  status: z.enum(WEDM_JOB_STATUSES).optional(),
  machine_id: z.string().min(1).max(100).optional(),
  customer: z.string().min(1).max(200).optional(),
  priority: z.enum(["standard", "rush", "emergency"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(["due_date_asc", "due_date_desc", "priority_desc", "created_desc"]).default("priority_desc"),
});
export type WEDMJobListQuery = z.infer<typeof wedmJobListQuerySchema>;

/** POST /job/:id/actual — partial actuals update (in-progress recording, U-WEDM-ERP07) */
export const wedmJobActualSchema = z.object({
  actual_cutting_time_min: z.number().min(0).max(100000).optional(),
  actual_wire_m: z.number().min(0).max(100000).optional(),
  actual_passes: z.number().int().min(0).max(100).optional(),
  break_count: z.number().int().min(0).max(500).optional(),
  recovery_time_hr: z.number().min(0).max(100).optional(),
  operator_notes: z.string().max(2000).optional(),
});
export type WEDMJobActualInput = z.infer<typeof wedmJobActualSchema>;

/** POST /overage/:id/approve — customer approves overage */
export const wedmOverageApproveSchema = z.object({
  approver: z.string().min(1),
  notification_sent: z.boolean().optional(),
});

/** POST /overage/:id/reject — customer rejects overage */
export const wedmOverageRejectSchema = z.object({
  approver: z.string().min(1),
  reason: z.string().optional(),
});
