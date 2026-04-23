/**
 * Canonical Shop-Domain Schemas — ULT-MS0 P1-U01
 *
 * Single source of truth for all shop-floor entities.
 * Every backend engine, REST route, and WebSocket payload MUST share
 * these contracts instead of local DTOs.
 *
 * Entities: Job, Traveler (RoutingStep), LaborSession, QuantityActual,
 *           Approval, Attachment
 *
 * Conventions:
 *   - All IDs are string (UUID or prefixed: JOB-xxx, TRV-xxx, LAB-xxx)
 *   - All timestamps are ISO 8601 strings
 *   - Status enums are exhaustive (no open strings)
 *   - Provenance: created_by + created_at on every mutable entity
 *
 * @module schemas/shop/shopDomain
 */

import { z } from "zod";

// ============================================================================
// SHARED PRIMITIVES
// ============================================================================

export const ShopEntityId = z.string().min(1).describe("Unique entity identifier");
export const ISOTimestamp = z.string().datetime().describe("ISO 8601 timestamp");
export const UserId = z.string().min(1).describe("User/operator identifier");

export const Provenance = z.object({
  created_by: UserId,
  created_at: ISOTimestamp,
  updated_by: UserId.optional(),
  updated_at: ISOTimestamp.optional(),
});
export type Provenance = z.infer<typeof Provenance>;

// ============================================================================
// JOB
// ============================================================================

export const JobStatus = z.enum([
  "quoted", "ordered", "scheduled", "in_progress", "on_hold",
  "qc_pending", "qc_passed", "qc_failed", "finishing",
  "complete", "shipped", "invoiced", "closed",
]);
export type JobStatus = z.infer<typeof JobStatus>;

export const JobStatusEntry = z.object({
  status: JobStatus,
  previous_status: JobStatus.optional(),
  timestamp: ISOTimestamp,
  user: UserId,
  notes: z.string().optional(),
});

export const Job = z.object({
  id: ShopEntityId,
  quote_number: z.string().optional(),
  customer: z.string(),
  part_number: z.string(),
  part_name: z.string().optional(),
  status: JobStatus,
  status_history: z.array(JobStatusEntry),
  quantity: z.number().int().positive(),
  schedule: z.object({
    order_date: ISOTimestamp.optional(),
    due_date: ISOTimestamp,
    scheduled_start: ISOTimestamp.optional(),
    scheduled_end: ISOTimestamp.optional(),
    actual_start: ISOTimestamp.optional(),
    actual_end: ISOTimestamp.optional(),
  }),
  progress: z.object({
    percent_complete: z.number().min(0).max(100),
    parts_complete: z.number().int().min(0),
    parts_total: z.number().int().positive(),
  }),
  costs: z.object({
    estimated_total: z.number().min(0),
    actual_total: z.number().min(0),
  }).optional(),
  notes: z.array(z.string()),
  provenance: Provenance,
});
export type Job = z.infer<typeof Job>;

// ============================================================================
// TRAVELER (Routing Step)
// ============================================================================

export const TravelerStepStatus = z.enum([
  "pending", "setup", "running", "complete", "skipped", "hold",
]);
export type TravelerStepStatus = z.infer<typeof TravelerStepStatus>;

export const TravelerStep = z.object({
  id: ShopEntityId,
  job_id: ShopEntityId,
  step_number: z.number().int().positive(),
  operation: z.string(),
  machine_id: z.string().optional(),
  workcenter: z.string().optional(),
  description: z.string().optional(),
  status: TravelerStepStatus,
  est_setup_min: z.number().min(0),
  est_cycle_min: z.number().min(0),
  actual_setup_min: z.number().min(0).optional(),
  actual_cycle_min: z.number().min(0).optional(),
  parts_complete: z.number().int().min(0).optional(),
  parts_scrapped: z.number().int().min(0).optional(),
  operator_id: UserId.optional(),
  started_at: ISOTimestamp.optional(),
  completed_at: ISOTimestamp.optional(),
  is_inspection_gate: z.boolean().optional(),
  is_outside_service: z.boolean().optional(),
  vendor_name: z.string().optional(),
  notes: z.string().optional(),
  provenance: Provenance,
});
export type TravelerStep = z.infer<typeof TravelerStep>;

export const Traveler = z.object({
  job_id: ShopEntityId,
  steps: z.array(TravelerStep),
  total_steps: z.number().int(),
  completed_steps: z.number().int().min(0),
  current_step: z.number().int().optional(),
  pct_complete: z.number().min(0).max(100),
});
export type Traveler = z.infer<typeof Traveler>;

// ============================================================================
// LABOR SESSION
// ============================================================================

export const LaborType = z.enum([
  "setup", "production_run", "first_article", "rework",
  "inspection", "deburring", "secondary_ops", "programming",
  "material_handling",
]);
export type LaborType = z.infer<typeof LaborType>;

export const PauseReason = z.enum([
  "machine_down", "material_shortage", "setup_changeover", "tool_change",
  "break", "preventive_maintenance", "waiting_inspection", "idle",
  "shift_end", "other",
]);

export const PausePeriod = z.object({
  start: ISOTimestamp,
  end: ISOTimestamp.optional(),
  reason: z.string(),
  reason_category: PauseReason,
});

export const LaborSession = z.object({
  id: ShopEntityId,
  employee_id: ShopEntityId,
  shift_entry_id: ShopEntityId.optional(),
  job_id: ShopEntityId,
  routing_step_id: ShopEntityId.optional(),
  operation: z.string().optional(),
  machine_id: z.string().optional(),
  labor_type: LaborType,
  start_time: ISOTimestamp,
  end_time: ISOTimestamp.optional(),
  pause_periods: z.array(PausePeriod),
  status: z.enum(["active", "paused", "completed"]),
  total_minutes: z.number().min(0).optional(),
  productive_minutes: z.number().min(0).optional(),
  good_parts: z.number().int().min(0).optional(),
  scrap_count: z.number().int().min(0).optional(),
  scrap_reason: z.string().optional(),
  notes: z.string().optional(),
  provenance: Provenance,
});
export type LaborSession = z.infer<typeof LaborSession>;

// ============================================================================
// QUANTITY ACTUAL
// ============================================================================

export const QuantityActual = z.object({
  id: ShopEntityId,
  job_id: ShopEntityId,
  routing_step_id: ShopEntityId.optional(),
  timestamp: ISOTimestamp,
  good_parts: z.number().int().min(0),
  scrap_parts: z.number().int().min(0),
  rework_parts: z.number().int().min(0),
  recorded_by: UserId,
  lot_number: z.string().optional(),
  serial_numbers: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
export type QuantityActual = z.infer<typeof QuantityActual>;

// ============================================================================
// APPROVAL
// ============================================================================

export const ApprovalType = z.enum([
  "first_article", "in_process", "final", "deviation", "ncr_disposition",
  "material_cert", "customer_source", "engineering_change",
]);

export const ApprovalDecision = z.enum(["approved", "rejected", "conditional", "pending"]);

export const Approval = z.object({
  id: ShopEntityId,
  job_id: ShopEntityId,
  routing_step_id: ShopEntityId.optional(),
  type: ApprovalType,
  decision: ApprovalDecision,
  approver: UserId,
  timestamp: ISOTimestamp,
  conditions: z.string().optional(),
  measurements: z.array(z.object({
    dimension: z.string(),
    nominal: z.number(),
    actual: z.number(),
    tolerance: z.number(),
    in_spec: z.boolean(),
  })).optional(),
  notes: z.string().optional(),
});
export type Approval = z.infer<typeof Approval>;

// ============================================================================
// ATTACHMENT
// ============================================================================

export const AttachmentType = z.enum([
  "drawing", "setup_sheet", "nc_program", "photo", "inspection_report",
  "material_cert", "customer_po", "deviation", "traveler_scan", "other",
]);

export const Attachment = z.object({
  id: ShopEntityId,
  job_id: ShopEntityId,
  routing_step_id: ShopEntityId.optional(),
  type: AttachmentType,
  filename: z.string(),
  mime_type: z.string(),
  size_bytes: z.number().int().positive(),
  storage_path: z.string(),
  uploaded_by: UserId,
  uploaded_at: ISOTimestamp,
  description: z.string().optional(),
});
export type Attachment = z.infer<typeof Attachment>;
