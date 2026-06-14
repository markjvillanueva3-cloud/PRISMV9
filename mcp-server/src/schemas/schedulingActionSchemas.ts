/**
 * Scheduling Dispatcher Action Schemas
 * ======================================
 * Per-action Zod schemas for all 8 prism_scheduling actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/schedulingActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optNum = z.number().optional();
const optPosNum = z.number().positive().optional();

const jobItem = z.object({
  id: z.string().optional(),
  machine: z.string().optional(),
  cycle_time_min: z.number().optional(),
  priority: z.enum(["critical", "high", "normal", "low"]).optional(),
  days_until_due: z.number().optional(),
  remaining_min: z.number().optional(),
}).passthrough();

const machineItem = z.object({
  id: z.string().optional(),
  utilization_pct: z.number().optional(),
}).passthrough();

// ============================================================================
// job_schedule
// ============================================================================

const job_schedule = z.object({
  jobs: z.array(jobItem).optional().describe("Jobs to schedule"),
}).passthrough();

// ============================================================================
// machine_assign
// ============================================================================

const machine_assign = z.object({
  jobs: z.array(jobItem).optional().describe("Jobs to assign"),
  machines: z.array(machineItem).optional().describe("Available machines"),
}).passthrough();

// ============================================================================
// capacity_plan
// ============================================================================

const capacity_plan = z.object({
  available_hours_per_day: optPosNum.describe("Available hours per day (default: 16)"),
  demand_hours: optPosNum.describe("Demand hours (default: 20)"),
}).passthrough();

// ============================================================================
// priority_queue
// ============================================================================

const priority_queue = z.object({
  jobs: z.array(jobItem).optional().describe("Jobs to prioritize"),
}).passthrough();

// ============================================================================
// bottleneck_find
// ============================================================================

const bottleneck_find = z.object({}).passthrough().describe("Params forwarded to BottleneckIdentificationEngine");

// ============================================================================
// lead_time_estimate
// ============================================================================

const operationItem = z.object({
  time_min: z.number().optional(),
}).passthrough();

const lead_time_estimate = z.object({
  operations: z.array(operationItem).optional().describe("Operations with time_min"),
  queue_factor: optNum.describe("Queue time multiplier (default: 2.5)"),
}).passthrough();

// ============================================================================
// due_date_track
// ============================================================================

const due_date_track = z.object({
  jobs: z.array(jobItem).optional().describe("Jobs with remaining_min and days_until_due"),
}).passthrough();

// ============================================================================
// resource_balance
// ============================================================================

const resource_balance = z.object({
  machines: z.array(machineItem).optional().describe("Machines with utilization_pct"),
}).passthrough();

// ============================================================================
// queue_lead_time — Kingman VUT honest lead-time (invention E7)
// ============================================================================

const queueWorkstation = z.object({
  id: z.string().describe("Workstation id"),
  effectiveProcessTime_min: z.number().describe("Effective process time te (minutes)"),
  arrivalCV: z.number().describe("Coefficient of variation of inter-arrival times Ca (>= 0)"),
  serviceCV: z.number().describe("Coefficient of variation of process time Cs (>= 0)"),
  utilization: z.number().describe("Utilization rho in (0,1); >= 1 means over capacity"),
}).passthrough();

const queue_lead_time = z.object({
  workstations: z.array(queueWorkstation).describe("Workstations on the job's routing"),
  jobRouting: z.array(z.string()).describe("Ordered workstation ids the job visits"),
}).passthrough();

// ============================================================================
// EXPORTED SCHEMA MAP
// ============================================================================

export const ACTION_SCHEDULING_SCHEMAS: ActionSchemaMap = {
  job_schedule,
  machine_assign,
  capacity_plan,
  priority_queue,
  bottleneck_find,
  lead_time_estimate,
  queue_lead_time,
  due_date_track,
  resource_balance,
};
