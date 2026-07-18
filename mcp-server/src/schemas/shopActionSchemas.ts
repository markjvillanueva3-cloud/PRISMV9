/**
 * shopActionSchemas.ts — Zod input schemas for the prism_shop dispatcher.
 *
 * One schema per action group. Organized to mirror the dispatcher's
 * logical sections (completeness, cost, dashboard, job, quote, schedule,
 * machine-overlay, shop-state).
 *
 * @module schemas/shopActionSchemas
 * @milestone PSN-SYNERGY / SHOP-WIRING
 */

import { z } from "zod";

// ─── Shared primitives ────────────────────────────────────────────────────────

export const EmptyInputSchema = z.object({}).describe("No parameters required");

// ─── ShopDataCompletenessEngine ───────────────────────────────────────────────

export const CompletenessCalculateSchema = z.object({
  profileId: z.string().optional().describe("Shop profile ID; defaults to active profile"),
});

export const CompletenessDomainGapSchema = z.object({
  domainId: z
    .enum(["programs", "employee_database", "machines", "controllers", "tool_holders", "tooling", "materials", "prints"])
    .describe("Seed domain to inspect"),
  profileId: z.string().optional().describe("Shop profile ID; defaults to active profile"),
});

// ─── ShopFloorCostEngine ──────────────────────────────────────────────────────

export const CostClockInSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
  operationId: z.string().min(1).describe("Operation identifier"),
  employeeId: z.string().min(1).describe("Employee identifier"),
  employeeName: z.string().min(1).describe("Employee display name"),
  department: z.string().min(1).describe("Department (e.g. Lathe, Mill, Wire EDM)"),
  hourlyRate: z.number().positive().describe("Employee hourly rate in USD"),
  isSetup: z.boolean().default(false).describe("True when clocking in for setup time"),
});

export const CostClockOutSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
  employeeId: z.string().min(1).describe("Employee identifier"),
});

export const CostChargeMaterialSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
  materialCode: z.string().min(1).describe("Material stock code"),
  description: z.string().min(1).describe("Material description"),
  quantityUsed: z.number().positive().describe("Quantity consumed"),
  unitCost: z.number().positive().describe("Cost per unit in USD"),
});

export const CostJobSummarySchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
});

export const CostSetEstimatedSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
  labor: z.number().min(0).describe("Estimated labor cost USD"),
  material: z.number().min(0).describe("Estimated material cost USD"),
  overhead: z.number().min(0).describe("Estimated overhead cost USD"),
});

// ─── ShopFloorDashboardEngine ─────────────────────────────────────────────────

export const DashboardGetSchema = z.object({
  shopId: z.string().min(1).describe("Shop identifier"),
  includeOffline: z.boolean().default(false).describe("Include offline machines in the view"),
  timeRangeHours: z.number().default(8).describe("OEE/alert lookback window in hours"),
  departmentFilter: z.string().optional().describe("Filter machines by department name fragment"),
});

export const DashboardMachineStatusSchema = z.object({
  machineId: z.string().min(1).describe("Machine identifier"),
});

export const DashboardAlertsSchema = z.object({
  severity: z
    .enum(["critical", "high", "medium", "low"])
    .optional()
    .describe("Filter alerts by severity"),
});

export const DashboardAcknowledgeAlertSchema = z.object({
  alertId: z.string().min(1).describe("Alert identifier to acknowledge"),
});

export const DashboardMachineOEESchema = z.object({
  machineId: z.string().min(1).describe("Machine identifier"),
  hoursBack: z.number().positive().default(8).describe("Hours to look back for OEE calculation"),
});

// ─── ShopFloorJobEngine ───────────────────────────────────────────────────────

export const JobCreateSchema = z.object({
  partNumber: z.string().min(1).describe("Part number"),
  revision: z.string().default("A").describe("Part revision letter"),
  customer: z.string().min(1).describe("Customer name"),
  quantityRequired: z.number().int().positive().describe("Quantity to produce"),
  dueDate: z.string().min(1).describe("Due date (ISO date or string)"),
  priority: z.enum(["critical", "high", "normal", "low"]).default("normal").describe("Job priority"),
  operations: z
    .array(
      z.object({
        code: z.string().describe("Operation code, e.g. OP10"),
        description: z.string().describe("Operation description"),
        department: z.string().describe("Department, e.g. Lathe, Mill"),
        machineType: z.string().optional().describe("Machine type, e.g. lathe, mill"),
        setupMinutes: z.number().min(0).describe("Setup time in minutes"),
        cycleMinutes: z.number().min(0).describe("Cycle time per piece in minutes"),
      }),
    )
    .min(1)
    .describe("Ordered operation sequence"),
  notes: z.string().optional().describe("Free-text notes"),
});

export const JobGetSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
});

export const JobListSchema = z.object({
  status: z
    .enum(["not_started", "in_progress", "on_hold", "complete", "cancelled"])
    .optional()
    .describe("Filter by job status"),
  priority: z.enum(["critical", "high", "normal", "low"]).optional().describe("Filter by priority"),
  customer: z.string().optional().describe("Filter by customer name fragment"),
});

export const JobUpdateSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
  quantityComplete: z.number().min(0).optional().describe("Updated quantity complete"),
  quantityScrap: z.number().min(0).optional().describe("Updated scrap count"),
  status: z
    .enum(["not_started", "in_progress", "on_hold", "complete", "cancelled"])
    .optional()
    .describe("Updated status"),
  priority: z.enum(["critical", "high", "normal", "low"]).optional().describe("Updated priority"),
  notes: z.string().optional().describe("Updated notes"),
});

export const JobCompleteOperationSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
  operationId: z.string().min(1).describe("Operation identifier (e.g. OP1)"),
  quantityComplete: z.number().min(0).describe("Quantity completed in this operation"),
  quantityScrap: z.number().min(0).default(0).describe("Scrap quantity"),
  operatorId: z.string().optional().describe("Operator identifier"),
  machineId: z.string().optional().describe("Machine identifier"),
  notes: z.string().optional().describe("Completion notes"),
});

export const JobDueSoonSchema = z.object({
  daysAhead: z.number().int().positive().default(7).describe("Days ahead to look for due jobs"),
});

export const JobCompletionSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
});

// ─── ShopFloorQuoteEngine ─────────────────────────────────────────────────────

export const QuoteGenerateSchema = z.object({
  partNumber: z.string().min(1).describe("Part number"),
  material: z.string().min(1).describe("Material designation (e.g. D2 Tool Steel)"),
  materialCostPerUnit: z.number().positive().describe("Material cost per piece in USD"),
  quantity: z.number().int().positive().describe("Quantity to quote"),
  operations: z
    .array(
      z.object({
        code: z.string().describe("Operation code"),
        description: z.string().describe("Operation description"),
        department: z.string().describe("Department (e.g. Lathe, Mill, Wire EDM)"),
        setupMinutes: z.number().min(0).describe("Setup time minutes"),
        cycleMinutes: z.number().min(0).describe("Cycle time per piece minutes"),
      }),
    )
    .min(1)
    .describe("Operations list"),
  rushOrder: z.boolean().default(false).describe("Apply rush premium"),
  targetMargin: z.number().min(0).max(1).default(0.25).describe("Target margin as decimal (0.25 = 25%)"),
});

export const QuoteHistoricalJobsSchema = z.object({
  partNumber: z.string().min(1).describe("Part number to look up historical jobs for"),
});

export const QuoteSuggestedPriceSchema = z.object({
  partNumber: z.string().min(1).describe("Part number"),
  quantity: z.number().int().positive().describe("Quantity to price"),
});

export const QuoteAnalyzeMarginSchema = z.object({
  quotePrice: z.number().positive().describe("Proposed quote price in USD"),
  estimatedCost: z.number().positive().describe("Estimated cost in USD"),
});

// ─── ShopFloorScheduleEngine ──────────────────────────────────────────────────

export const ScheduleOperationSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
  operationCode: z.string().min(1).describe("Operation code (e.g. OP10)"),
  machineId: z.string().min(1).describe("Machine identifier to schedule on"),
  durationMinutes: z.number().positive().describe("Duration in minutes"),
  priority: z.number().int().min(1).default(5).describe("Priority (lower = higher priority)"),
  preferredStart: z.string().optional().describe("ISO datetime for preferred start; defaults to next available slot"),
});

export const ScheduleMachineCapacitySchema = z.object({
  machineId: z.string().min(1).describe("Machine identifier"),
});

export const ScheduleAllCapacitySchema = z.object({
  machineType: z.string().optional().describe("Filter by machine type (lathe, mill, wire_edm, etc.)"),
  department: z.string().optional().describe("Filter by department name"),
});

export const ScheduleJobSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
});

export const ScheduleRescheduleSchema = z.object({
  operationId: z.string().min(1).describe("Scheduled operation identifier (e.g. SCH-001)"),
  newStart: z.string().min(1).describe("New start time as ISO datetime"),
});

export const ScheduleFindSlotSchema = z.object({
  machineType: z.string().min(1).describe("Machine type needed (lathe, mill, wire_edm, etc.)"),
  durationMinutes: z.number().positive().describe("Required duration in minutes"),
});

// ─── ShopMachineOverlayEngine ─────────────────────────────────────────────────

export const OverlayCreateSchema = z.object({
  shop_machine_id: z.string().min(1).describe("Shop machine ID from ShopConfigurationEngine"),
  canonical_package_id: z.string().optional().describe("Canonical package ID; auto-resolved if omitted"),
  display_name: z.string().optional().describe("Display name for the overlay"),
  is_calculator_preset: z.boolean().optional().describe("Mark as a calculator preset"),
  preset_name: z.string().optional().describe("Preset name (required when is_calculator_preset=true)"),
  enabled_consumers: z
    .array(z.enum(["calculator", "program_release", "print_to_cnc", "quote_builder", "shop_floor"]))
    .optional()
    .describe("Which consumers can use this overlay"),
  user_id: z.string().min(1).describe("User ID creating the overlay"),
  overrides: z.record(z.string(), z.unknown()).optional().describe("Partial overlay field overrides"),
});

export const OverlayUpdateSchema = z.object({
  overlay_id: z.string().min(1).describe("Overlay ID to update"),
  updates: z.record(z.string(), z.unknown()).describe("Fields to update on the overlay"),
  user_id: z.string().min(1).describe("User ID making the update"),
});

export const OverlayGetSchema = z.object({
  overlay_id: z.string().min(1).describe("Overlay identifier"),
});

export const OverlayForMachineSchema = z.object({
  shopMachineId: z.string().min(1).describe("Shop machine ID to retrieve overlays for"),
});

export const OverlayPresetSchema = z.object({
  presetName: z.string().min(1).describe("Calculator preset name"),
});

export const OverlaySetDefaultSchema = z.object({
  overlay_id: z.string().min(1).describe("Overlay ID to set as default"),
  userId: z.string().min(1).describe("User ID performing the action"),
});

export const OverlayDeleteSchema = z.object({
  overlay_id: z.string().min(1).describe("Overlay ID to delete"),
});

export const OverlayMergedViewSchema = z.object({
  shopMachineId: z.string().min(1).describe("Shop machine ID to get merged view for"),
});

export const OverlayBulkCreateSchema = z.object({
  userId: z.string().min(1).describe("User ID creating overlays for all shop machines"),
});

// ─── ShopStateEngine ──────────────────────────────────────────────────────────

export const StateCreateJobSchema = z.object({
  customer: z.string().min(1).describe("Customer name"),
  part_number: z.string().min(1).describe("Part number"),
  part_name: z.string().optional().describe("Part display name"),
  quantity: z.number().int().positive().describe("Required quantity"),
  due_date: z.string().min(1).describe("Due date as ISO string"),
  created_by: z.string().min(1).describe("User ID creating the job"),
});

export const StateJobIdSchema = z.object({
  id: z.string().min(1).describe("Job identifier"),
});

export const StateListJobsSchema = z.object({
  status: z.string().optional().describe("Filter by status (ordered, in_progress, complete, etc.)"),
  customer: z.string().optional().describe("Filter by customer name fragment"),
  limit: z.number().int().positive().optional().describe("Max jobs to return"),
});

export const StateUpdateJobStatusSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
  newStatus: z
    .enum(["ordered", "in_progress", "on_hold", "complete", "shipped", "invoiced", "closed", "cancelled"])
    .describe("New job status"),
  userId: z.string().min(1).describe("User ID making the change"),
  notes: z.string().optional().describe("Optional change notes"),
});

export const StateUpdateProgressSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
  partsComplete: z.number().int().min(0).describe("Number of parts complete so far"),
});

export const StateTravelerJobSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier to retrieve traveler for"),
});

export const StateStartStepSchema = z.object({
  stepId: z.string().min(1).describe("Traveler step identifier"),
  operatorId: z.string().min(1).describe("Operator starting the step"),
});

export const StateCompleteStepSchema = z.object({
  stepId: z.string().min(1).describe("Traveler step identifier"),
  operatorId: z.string().min(1).describe("Operator completing the step"),
});

export const StateStartLaborSchema = z.object({
  employee_id: z.string().min(1).describe("Employee identifier"),
  job_id: z.string().min(1).describe("Job identifier"),
  labor_type: z
    .enum(["setup", "run", "inspect", "rework", "cleanup"])
    .describe("Type of labor session"),
  machine_id: z.string().optional().describe("Machine identifier"),
  routing_step_id: z.string().optional().describe("Routing step identifier"),
});

export const StatePauseLaborSchema = z.object({
  sessionId: z.string().min(1).describe("Labor session identifier"),
  reason: z.string().min(1).describe("Reason for pause"),
  reasonCategory: z.string().min(1).describe("Category (e.g. break, material, machine, quality)"),
});

export const StateResumeLaborSchema = z.object({
  sessionId: z.string().min(1).describe("Labor session identifier"),
});

export const StateCompleteLaborSchema = z.object({
  sessionId: z.string().min(1).describe("Labor session identifier"),
  goodParts: z.number().int().min(0).optional().describe("Good parts produced"),
  scrapCount: z.number().int().min(0).optional().describe("Scrap parts"),
});

export const StateActiveSessionsSchema = z.object({
  employeeId: z.string().min(1).describe("Employee identifier"),
});

export const StateRecordQuantitySchema = z.object({
  job_id: z.string().min(1).describe("Job identifier"),
  routing_step_id: z.string().optional().describe("Routing step identifier"),
  good_parts: z.number().int().min(0).describe("Good parts count"),
  scrap_parts: z.number().int().min(0).describe("Scrap parts count"),
  rework_parts: z.number().int().min(0).describe("Rework parts count"),
  recorded_by: z.string().min(1).describe("User ID recording quantity"),
  lot_number: z.string().optional().describe("Lot number if applicable"),
});

export const StateGetApprovalsSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
});

export const StateGetAttachmentsSchema = z.object({
  jobId: z.string().min(1).describe("Job identifier"),
});
