/**
 * Zod action schemas for prism_telemetry dispatcher (7 actions)
 *
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine actually reads
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const get_dashboard = z.object({}).passthrough();

const get_detail = z.object({
  dispatcher: z.string().optional().describe("Dispatcher name to get detail for"),
  name: z.string().optional().describe("Alias for dispatcher"),
}).passthrough();

const get_anomalies = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]).optional().describe("Filter by anomaly severity"),
  acknowledged: z.boolean().optional().describe("Filter by acknowledged status"),
}).passthrough();

const get_optimization = z.object({}).passthrough();

const acknowledge = z.object({
  anomaly_id: z.string().optional().describe("Anomaly ID to acknowledge"),
  id: z.string().optional().describe("Alias for anomaly_id"),
  operator_id: z.string().optional().describe("Operator performing acknowledgment"),
  operator: z.string().optional().describe("Alias for operator_id"),
}).passthrough();

const freeze_weights = z.object({
  dispatcher: z.string().optional().describe("Dispatcher to freeze (omit for all)"),
  reason: z.string().optional().describe("Reason for freeze"),
  operator_id: z.string().optional().describe("Operator requesting freeze"),
  frozen_by: z.string().optional().describe("Alias for operator_id"),
}).passthrough();

const unfreeze_weights = z.object({
  dispatcher: z.string().optional().describe("Dispatcher to unfreeze (omit for all)"),
}).passthrough();

export const ACTION_TELEMETRY_SCHEMAS: ActionSchemaMap = {
  get_dashboard,
  get_detail,
  get_anomalies,
  get_optimization,
  acknowledge,
  freeze_weights,
  unfreeze_weights,
};
