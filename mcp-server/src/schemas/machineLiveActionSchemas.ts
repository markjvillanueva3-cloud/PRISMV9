/**
 * Zod Action Schemas — machineLiveDispatcher
 * =============================================
 * 45 actions across 5 sub-engines / inline groups:
 *   machineConnectivity    (16 actions)
 *   adaptiveControl        (10 actions)
 *   predictiveMaintenance  (10 actions)
 *   l3Industry (inline)    (4 actions)
 *   mtConnectLiveStatus    (1 action — mtconnect_parse_status, pure parser)
 *   kiosk (inline)         (4 actions)
 *
 * Note: MQTT, RTMI and the eight MTConnect adapter actions are routed by the
 * dispatcher but currently rely on engine-internal validation (no entries in
 * this map). Adding their schemas is tracked separately.
 *
 * @version 1.1.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// SHARED FIELD HELPERS
// ============================================================================

const machine_id = z.string().min(1).describe("Machine identifier");
const optMachineId = z.string().min(1).optional().describe("Machine identifier");
const response_level = z.string().optional().describe("Response detail level");

// ============================================================================
// MACHINE CONNECTIVITY ACTIONS (16)
// ============================================================================

/** machine_register — Register a new machine connection */
const machine_register = z.object({
  name: z.string().min(1),
  protocol: z.string().optional(),
  ip: z.string().optional(),
  port: z.number().int().positive().optional(),
  controller: z.string().optional(),
  model: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  response_level,
}).passthrough();

/** machine_unregister — Remove a machine connection */
const machine_unregister = z.object({
  machine_id,
  response_level,
}).passthrough();

/** machine_list — List registered machines */
const machine_list = z.object({
  protocol: z.string().optional(),
  status: z.string().optional(),
  response_level,
}).passthrough();

/** machine_connect — Connect to a registered machine */
const machine_connect = z.object({
  machine_id,
  timeout_ms: z.number().int().positive().optional(),
  response_level,
}).passthrough();

/** machine_disconnect — Disconnect from a machine */
const machine_disconnect = z.object({
  machine_id,
  response_level,
}).passthrough();

/** machine_live_status — Get live status of a single machine */
const machine_live_status = z.object({
  machine_id,
  response_level,
}).passthrough();

/** machine_all_status — Get status of all connected machines */
const machine_all_status = z.object({
  response_level,
}).passthrough();

/** machine_ingest — Ingest real-time data from machine */
const machine_ingest = z.object({
  machine_id,
  data: z.record(z.string(), z.unknown()).optional(),
  spindle_rpm: z.number().nonnegative().optional(),
  feed_rate_mm_min: z.number().nonnegative().optional(),
  spindle_load_pct: z.number().min(0).max(100).optional(),
  temperature_C: z.number().optional(),
  vibration_mm_s: z.number().nonnegative().optional(),
  response_level,
}).passthrough();

/** chatter_detect_live — Real-time chatter detection */
const chatter_detect_live = z.object({
  machine_id: optMachineId,
  vibration_data: z.array(z.number()).optional(),
  spindle_rpm: z.number().positive().optional(),
  sampling_rate_hz: z.number().positive().optional(),
  response_level,
}).passthrough();

/** tool_wear_start — Begin tool wear monitoring */
const tool_wear_start = z.object({
  machine_id: optMachineId,
  tool_id: z.string().min(1).optional(),
  tool_type: z.string().optional(),
  initial_wear_pct: z.number().min(0).max(100).optional(),
  response_level,
}).passthrough();

/** tool_wear_update — Update tool wear reading */
const tool_wear_update = z.object({
  machine_id: optMachineId,
  tool_id: z.string().min(1).optional(),
  wear_pct: z.number().min(0).max(100).optional(),
  cutting_time_min: z.number().nonnegative().optional(),
  force_N: z.number().nonnegative().optional(),
  response_level,
}).passthrough();

/** tool_wear_status — Get current tool wear status */
const tool_wear_status = z.object({
  machine_id: optMachineId,
  tool_id: z.string().min(1).optional(),
  response_level,
}).passthrough();

/** thermal_update — Update thermal compensation data */
const thermal_update = z.object({
  machine_id: optMachineId,
  temperature_readings: z.array(z.number()).optional(),
  ambient_C: z.number().optional(),
  spindle_temp_C: z.number().optional(),
  response_level,
}).passthrough();

/** thermal_status — Get current thermal compensation status */
const thermal_status = z.object({
  machine_id: optMachineId,
  response_level,
}).passthrough();

/** alert_acknowledge — Acknowledge a machine alert */
const alert_acknowledge = z.object({
  machine_id: optMachineId,
  alert_id: z.string().min(1).optional(),
  acknowledged_by: z.string().optional(),
  response_level,
}).passthrough();

/** alert_history — Get machine alert history */
const alert_history = z.object({
  machine_id: optMachineId,
  limit: z.number().int().positive().optional(),
  severity: z.string().optional(),
  response_level,
}).passthrough();

// ============================================================================
// ADAPTIVE CONTROL ACTIONS (10)
// ============================================================================

/** adaptive_chipload — Adaptive chipload control */
const adaptive_chipload = z.object({
  machine_id: optMachineId,
  target_chipload_mm: z.number().positive().optional(),
  actual_chipload_mm: z.number().positive().optional(),
  spindle_rpm: z.number().positive().optional(),
  feed_rate_mm_min: z.number().positive().optional(),
  num_flutes: z.number().int().min(1).max(20).optional(),
  response_level,
}).passthrough();

/** adaptive_chatter — Adaptive chatter suppression */
const adaptive_chatter = z.object({
  machine_id: optMachineId,
  vibration_data: z.array(z.number()).optional(),
  spindle_rpm: z.number().positive().optional(),
  depth_of_cut_mm: z.number().positive().optional(),
  response_level,
}).passthrough();

/** adaptive_wear — Adaptive wear compensation */
const adaptive_wear = z.object({
  machine_id: optMachineId,
  tool_id: z.string().optional(),
  wear_pct: z.number().min(0).max(100).optional(),
  cutting_time_min: z.number().nonnegative().optional(),
  response_level,
}).passthrough();

/** adaptive_thermal — Adaptive thermal compensation */
const adaptive_thermal = z.object({
  machine_id: optMachineId,
  temperature_readings: z.array(z.number()).optional(),
  ambient_C: z.number().optional(),
  response_level,
}).passthrough();

/** adaptive_override — Apply adaptive override */
const adaptive_override = z.object({
  machine_id: optMachineId,
  channel: z.string().optional(),
  value_pct: z.number().min(0).max(200).optional(),
  response_level,
}).passthrough();

/** adaptive_status — Get adaptive control status */
const adaptive_status = z.object({
  machine_id: optMachineId,
  response_level,
}).passthrough();

/** adaptive_config — Configure adaptive control parameters */
const adaptive_config = z.object({
  machine_id: optMachineId,
  config: z.record(z.string(), z.unknown()).optional(),
  response_level,
}).passthrough();

/** adaptive_log — Get adaptive control log entries */
const adaptive_log = z.object({
  machine_id: optMachineId,
  limit: z.number().int().positive().optional(),
  response_level,
}).passthrough();

/** adaptive_history — Get adaptive control session history */
const adaptive_history = z.object({
  machine_id: optMachineId,
  limit: z.number().int().positive().optional(),
  response_level,
}).passthrough();

/** adaptive_get — Retrieve specific adaptive record */
const adaptive_get = z.object({
  id: z.string().optional(),
  query_id: z.string().optional(),
  machine_id: optMachineId,
  response_level,
}).passthrough();

// ============================================================================
// PREDICTIVE MAINTENANCE ACTIONS (10)
// ============================================================================

/** maint_analyze — Run predictive maintenance analysis */
const maint_analyze = z.object({
  machine_id,
  categories: z.array(z.string()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  response_level,
}).passthrough();

/** maint_trend — Get maintenance trend for a category */
const maint_trend = z.object({
  machine_id,
  category: z.string().min(1),
  period_days: z.number().int().positive().optional(),
  response_level,
}).passthrough();

/** maint_predict — Predict component failure */
const maint_predict = z.object({
  machine_id,
  category: z.string().min(1),
  component: z.string().optional(),
  response_level,
}).passthrough();

/** maint_schedule — Get maintenance schedule */
const maint_schedule = z.object({
  machine_ids: z.array(z.string()).optional(),
  priority: z.string().optional(),
  response_level,
}).passthrough();

/** maint_models — List available maintenance models */
const maint_models = z.object({
  category: z.string().optional(),
  response_level,
}).passthrough();

/** maint_thresholds — Get or set maintenance thresholds */
const maint_thresholds = z.object({
  category: z.string().min(1),
  warning: z.number().optional(),
  critical: z.number().optional(),
  response_level,
}).passthrough();

/** maint_alerts — Get active maintenance alerts */
const maint_alerts = z.object({
  machine_id: optMachineId,
  severity: z.string().optional(),
  limit: z.number().int().positive().optional(),
  response_level,
}).passthrough();

/** maint_status — Get overall maintenance status */
const maint_status = z.object({
  machine_id,
  response_level,
}).passthrough();

/** maint_history — Get maintenance history */
const maint_history = z.object({
  machine_id: optMachineId,
  category: z.string().optional(),
  limit: z.number().int().positive().optional(),
  response_level,
}).passthrough();

/** maint_get — Retrieve specific maintenance prediction */
const maint_get = z.object({
  prediction_id: z.string().min(1),
  response_level,
}).passthrough();

// ============================================================================
// L3 INDUSTRY 4.0 ACTIONS (4)
// ============================================================================

/** tool_crib_status — Tool crib inventory status */
const tool_crib_status = z.object({
  tools: z.array(z.record(z.string(), z.unknown())).optional(),
  low_stock_alerts: z.number().int().nonnegative().optional(),
  next_order: z.string().optional(),
  response_level,
}).passthrough();

/** digital_twin_state — Digital twin machine state */
const digital_twin_state = z.object({
  machine_id: optMachineId,
  state: z.string().optional(),
  spindle_rpm: z.number().nonnegative().optional(),
  feed_rate: z.number().nonnegative().optional(),
  spindle_load: z.number().min(0).max(100).optional(),
  temperature: z.number().optional(),
  vibration: z.number().nonnegative().optional(),
  health_score: z.number().min(0).max(1).optional(),
  response_level,
}).passthrough();

/** predictive_maintenance_alert — Get predictive maintenance alerts */
const predictive_maintenance_alert = z.object({
  machine_id: optMachineId,
  bearing_risk: z.number().min(0).max(100).optional(),
  ballscrew_risk: z.number().min(0).max(100).optional(),
  health: z.string().optional(),
  mtbf: z.number().positive().optional(),
  response_level,
}).passthrough();

/** energy_report — Energy consumption report */
const energy_report = z.object({
  period: z.string().optional(),
  kwh_consumed: z.number().nonnegative().optional(),
  parts_produced: z.number().int().nonnegative().optional(),
  rate_per_kwh: z.number().positive().optional(),
  idle_pct: z.number().min(0).max(100).optional(),
  response_level,
}).passthrough();

/** mtconnect_parse_status — Parse already-extracted MTConnect data items into canonical live status.
 *  Pure: no network call. Use when the caller already has parsed XML payload or path/value pairs. */
const mtconnect_parse_status = z.object({
  items: z.array(z.object({
    type: z.string().describe("Canonical MTConnect item type (execution, controller_mode, spindle_speed, position, alarm, ...)"),
    value: z.union([z.string(), z.number()]).describe("Data value as reported"),
    timestamp: z.string().optional().describe("ISO 8601 timestamp"),
    axis: z.string().optional().describe("Sub-axis tag for position items (X, Y, Z, S1)"),
  })).default([]).describe("MTConnect data items already extracted from /current or /sample"),
  total_blocks: z.number().int().positive().optional().describe("Total program blocks — enables progress estimate"),
  response_level,
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const MACHINE_LIVE_ACTION_SCHEMAS: ActionSchemaMap = {
  // Machine Connectivity (16)
  machine_register,
  machine_unregister,
  machine_list,
  machine_connect,
  machine_disconnect,
  machine_live_status,
  machine_all_status,
  machine_ingest,
  chatter_detect_live,
  tool_wear_start,
  tool_wear_update,
  tool_wear_status,
  thermal_update,
  thermal_status,
  alert_acknowledge,
  alert_history,
  // Adaptive Control (10)
  adaptive_chipload,
  adaptive_chatter,
  adaptive_wear,
  adaptive_thermal,
  adaptive_override,
  adaptive_status,
  adaptive_config,
  adaptive_log,
  adaptive_history,
  adaptive_get,
  // Predictive Maintenance (10)
  maint_analyze,
  maint_trend,
  maint_predict,
  maint_schedule,
  maint_models,
  maint_thresholds,
  maint_alerts,
  maint_status,
  maint_history,
  maint_get,
  // L3 Industry 4.0 (4)
  tool_crib_status,
  digital_twin_state,
  predictive_maintenance_alert,
  energy_report,
  // MTConnect canonical-state parser (1)
  mtconnect_parse_status,
  // Kiosk Mode (4)
  kiosk_quick_sf: z.object({
    materialCategory: z.enum([
      "steel", "stainless", "aluminum",
      "titanium", "cast_iron", "copper",
    ]),
    toolDiameter: z.number().positive(),
    operation: z.enum(["face", "pocket", "slot", "drill", "turn"]),
    response_level,
  }).passthrough(),
  kiosk_alarm_decode: z.object({
    code: z.string().min(1),
    controller: z.string().optional(),
    response_level,
  }).passthrough(),
  kiosk_setup_sheet: z.object({
    programId: z.string().optional(),
    machineId: z.string().optional(),
    response_level,
  }).passthrough(),
  kiosk_tool_life: z.object({
    toolId: z.string().min(1),
    response_level,
  }).passthrough(),
};
