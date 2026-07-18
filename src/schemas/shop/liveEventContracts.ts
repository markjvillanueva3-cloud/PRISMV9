/**
 * Live Event Contracts — ULT-MS0 P1-U01
 *
 * Canonical WebSocket event schemas for real-time shop-floor updates.
 * Three room types: job rooms, department rooms, employee rooms.
 *
 * All events share: event_id, event_type, timestamp, source, payload.
 * Room names follow: job:{job_id}, dept:{dept_id}, emp:{emp_id}
 *
 * @module schemas/shop/liveEventContracts
 */

import { z } from "zod";
import {
  ShopEntityId, ISOTimestamp, UserId,
  JobStatus, TravelerStepStatus, LaborType,
} from "./shopDomain.js";

// ============================================================================
// BASE EVENT
// ============================================================================

export const ShopEventType = z.enum([
  // Job lifecycle
  "job.created", "job.status_changed", "job.progress_updated",
  "job.schedule_updated", "job.completed", "job.shipped",
  // Traveler
  "traveler.step_started", "traveler.step_completed", "traveler.step_skipped",
  // Labor
  "labor.session_started", "labor.session_paused", "labor.session_resumed",
  "labor.session_completed", "labor.parts_recorded",
  // Quality
  "quality.approval_submitted", "quality.ncr_created", "quality.fai_completed",
  // Shift
  "shift.clock_in", "shift.clock_out", "shift.handoff",
  // Attachment
  "attachment.uploaded",
]);
export type ShopEventType = z.infer<typeof ShopEventType>;

export const ShopEvent = z.object({
  event_id: z.string(),
  event_type: ShopEventType,
  timestamp: ISOTimestamp,
  source: z.string().describe("Engine or route that emitted the event"),
  room: z.string().describe("Target room: job:{id}, dept:{id}, emp:{id}"),
  payload: z.record(z.string(), z.unknown()),
  correlation_id: z.string().optional(),
});
export type ShopEvent = z.infer<typeof ShopEvent>;

// ============================================================================
// JOB ROOM EVENTS
// ============================================================================

export const JobCreatedPayload = z.object({
  job_id: ShopEntityId,
  customer: z.string(),
  part_number: z.string(),
  quantity: z.number().int(),
  due_date: ISOTimestamp,
});

export const JobStatusChangedPayload = z.object({
  job_id: ShopEntityId,
  previous_status: JobStatus,
  new_status: JobStatus,
  changed_by: UserId,
  notes: z.string().optional(),
});

export const JobProgressPayload = z.object({
  job_id: ShopEntityId,
  percent_complete: z.number(),
  parts_complete: z.number().int(),
  parts_total: z.number().int(),
});

// ============================================================================
// DEPARTMENT ROOM EVENTS
// ============================================================================

export const ShiftClockInPayload = z.object({
  employee_id: ShopEntityId,
  employee_name: z.string(),
  department: z.string(),
  clock_in: ISOTimestamp,
});

export const ShiftClockOutPayload = z.object({
  employee_id: ShopEntityId,
  employee_name: z.string(),
  clock_out: ISOTimestamp,
  total_hours: z.number(),
});

// ============================================================================
// EMPLOYEE ROOM EVENTS
// ============================================================================

export const LaborSessionStartedPayload = z.object({
  session_id: ShopEntityId,
  employee_id: ShopEntityId,
  job_id: ShopEntityId,
  labor_type: LaborType,
  machine_id: z.string().optional(),
  start_time: ISOTimestamp,
});

export const LaborPartsRecordedPayload = z.object({
  session_id: ShopEntityId,
  job_id: ShopEntityId,
  good_parts: z.number().int(),
  scrap_count: z.number().int(),
  timestamp: ISOTimestamp,
});

export const TravelerStepCompletedPayload = z.object({
  job_id: ShopEntityId,
  step_id: ShopEntityId,
  step_number: z.number().int(),
  operation: z.string(),
  status: TravelerStepStatus,
  completed_by: UserId,
});

// ============================================================================
// ROOM NAME HELPERS
// ============================================================================

export function jobRoom(jobId: string): string { return `job:${jobId}`; }
export function deptRoom(deptId: string): string { return `dept:${deptId}`; }
export function empRoom(empId: string): string { return `emp:${empId}`; }
export function shopBroadcast(): string { return "shop:all"; }
