/**
 * Export Dispatcher Action Schemas
 * ==================================
 * Per-action Zod schemas for prism_export actions (8 actions).
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * Design:
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the dispatcher/engine actually reads
 * - Export actions are lower-traffic; schemas are intentionally permissive
 *   since data payloads vary widely by format
 *
 * Actions: render_pdf, render_csv, render_excel, render_dxf,
 *          render_step, render_gcode, render_setup_sheet, batch_export
 *
 * @module schemas/exportActionSchemas
 * @version 1.0.0
 * @milestone SYS-MS6-U03
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELDS
// ============================================================================

const optStr = z.string().optional();
const optPosInt = z.number().int().positive().optional();

// Common render fields shared across most render_* actions
const renderBase = {
  title: optStr,
  data: z.record(z.string(), z.unknown()).optional(),
  template: optStr,
};

// ============================================================================
// PDF (1)
// ============================================================================

const render_pdf = z.object({
  ...renderBase,
}).passthrough();

// ============================================================================
// CSV (1)
// ============================================================================

const render_csv = z.object({
  ...renderBase,
  data: z.union([z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown()))]).optional(),
  rows: z.array(z.record(z.string(), z.unknown())).optional(),
  columns: z.array(z.string()).optional(),
}).passthrough();

// ============================================================================
// EXCEL (1)
// ============================================================================

const render_excel = z.object({
  ...renderBase,
  sheets: optPosInt,
}).passthrough();

// ============================================================================
// DXF (1)
// ============================================================================

const render_dxf = z.object({
  ...renderBase,
  entities: z.number().int().min(0).optional(),
  layers: z.array(z.string()).optional(),
}).passthrough();

// ============================================================================
// STEP (1)
// ============================================================================

const render_step = z.object({
  ...renderBase,
  protocol: optStr,
  bodies: optPosInt,
}).passthrough();

// ============================================================================
// G-CODE (1)
// ============================================================================

const render_gcode = z.object({
  ...renderBase,
  gcode: z.union([z.string(), z.array(z.string())]).optional(),
  controller: optStr,
}).passthrough();

// ============================================================================
// SETUP SHEET (1) — delegated to ReportEngine.generateSetupSheet
// ============================================================================

const render_setup_sheet = z.object({}).passthrough();

// ============================================================================
// BATCH EXPORT (1)
// ============================================================================

const batch_export = z.object({
  items: z.array(z.object({
    format: optStr,
    title: optStr,
    data: z.record(z.string(), z.unknown()).optional(),
  }).passthrough()).min(1),
}).passthrough();

// ============================================================================
// EXPORT: ACTION_EXPORT_SCHEMAS
// ============================================================================

/** A C T I O N_ E X P O R T_ S C H E M A S constant.
 */
export const ACTION_EXPORT_SCHEMAS: ActionSchemaMap = {
  // Document renders
  render_pdf,
  render_csv,
  render_excel,
  render_dxf,
  render_step,
  render_gcode,
  // Report
  render_setup_sheet,
  // Batch
  batch_export,
};
