/**
 * Lathe Master Post API Action Schemas — LATHE-MASTER U-LTH30
 * ============================================================
 * Zod schemas for lathe master post API actions.
 *
 * Actions:
 *   lathe_masterpost_route       — Route job to optimal sub-post
 *   lathe_masterpost_emit        — Emit G-code from routed sub-post
 *   lathe_masterpost_validate    — Validate program against machine/dialect
 *   lathe_masterpost_explain     — Explain routing decision chain
 *   lathe_masterpost_cross_check — Cross-check multiple sub-posts (ensemble)
 *   lathe_masterpost_audit       — Audit master post selection history
 *
 * @module schemas/latheMasterPostAPIActionSchemas
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH30
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ─── Shared Schemas ───────────────────────────────────────────────────────

const DialectSchema = z
  .enum(["okuma", "fanuc", "mitsubishi", "haas", "mazak", "citizen", "generic"])
  .describe("Controller dialect.");

const MachineIdSchema = z
  .string()
  .min(1)
  .describe("Machine identifier from inventory (e.g., 'okuma-lb3000').");

const ProgramSchema = z
  .string()
  .min(1)
  .describe("G-code program or NC code to process.");

const OperationSchema = z
  .enum(["turning", "facing", "grooving", "threading", "boring", "drilling", "parting", "profiling", "swiss", "mill_turn"])
  .describe("Operation type for routing optimization.");

// ─── lathe_masterpost_route ───────────────────────────────────────────────

const lathe_masterpost_route = z
  .object({
    machineId: MachineIdSchema,
    program: ProgramSchema,
    operation: OperationSchema.optional().describe("Operation type. Default: auto-detect."),
    preferredDialect: DialectSchema.optional().describe("Preferred dialect if multiple available."),
    requireCapabilities: z
      .array(z.string())
      .optional()
      .describe("Required capabilities (e.g., ['live_tooling', 'c_axis'])."),
  })
  .describe("Route job to optimal sub-post based on machine, operation, and capabilities.");

// ─── lathe_masterpost_emit ────────────────────────────────────────────────

const lathe_masterpost_emit = z
  .object({
    machineId: MachineIdSchema,
    program: ProgramSchema,
    operation: OperationSchema.optional().describe("Operation type."),
    dialect: DialectSchema.optional().describe("Force specific dialect. Default: machine primary."),
    includeHeader: z.boolean().optional().describe("Include standard header. Default: true."),
    includeFooter: z.boolean().optional().describe("Include standard footer. Default: true."),
    lineNumbers: z.boolean().optional().describe("Add line numbers. Default: false."),
    lineNumberStart: z.number().int().positive().optional().describe("Line number start."),
    lineNumberIncrement: z.number().int().positive().optional().describe("Line number increment."),
  })
  .describe("Emit G-code from routed sub-post with formatting options.");

// ─── lathe_masterpost_validate ────────────────────────────────────────────

const lathe_masterpost_validate = z
  .object({
    machineId: MachineIdSchema,
    program: ProgramSchema,
    dialect: DialectSchema.optional().describe("Dialect to validate against."),
    strictMode: z.boolean().optional().describe("Enable strict validation. Default: false."),
    checkEnvelope: z.boolean().optional().describe("Check work envelope limits. Default: true."),
    checkToolNumbers: z.boolean().optional().describe("Validate tool numbers. Default: true."),
    checkSpindleLimits: z.boolean().optional().describe("Check spindle RPM limits. Default: true."),
    checkFeedLimits: z.boolean().optional().describe("Check feed rate limits. Default: true."),
  })
  .describe("Validate program against machine capabilities and dialect rules.");

// ─── lathe_masterpost_explain ─────────────────────────────────────────────

const lathe_masterpost_explain = z
  .object({
    machineId: MachineIdSchema,
    program: ProgramSchema,
    operation: OperationSchema.optional().describe("Operation type."),
    verbosity: z
      .enum(["brief", "normal", "detailed"])
      .optional()
      .describe("Explanation verbosity. Default: normal."),
    includeAlternatives: z.boolean().optional().describe("Include alternative routing options. Default: false."),
  })
  .describe("Explain routing decision chain with human-readable reasoning.");

// ─── lathe_masterpost_cross_check ─────────────────────────────────────────

const lathe_masterpost_cross_check = z
  .object({
    machineId: MachineIdSchema,
    program: ProgramSchema,
    operation: OperationSchema.optional().describe("Operation type."),
    thresholds: z
      .object({
        blockCountPercent: z.number().positive().optional().describe("Block count divergence threshold %. Default: 10."),
        cycleTimePercent: z.number().positive().optional().describe("Cycle time divergence threshold %. Default: 5."),
        toolChangesPercent: z.number().positive().optional().describe("Tool changes divergence threshold %. Default: 15."),
      })
      .optional()
      .describe("Custom divergence thresholds."),
    includeGcode: z.boolean().optional().describe("Include full G-code in response. Default: false."),
  })
  .describe("Cross-check multiple sub-posts via ensemble, flag divergences.");

// ─── lathe_masterpost_audit ───────────────────────────────────────────────

const lathe_masterpost_audit = z
  .object({
    machineId: MachineIdSchema.optional().describe("Filter by machine. Default: all machines."),
    operation: OperationSchema.optional().describe("Filter by operation type."),
    dialect: DialectSchema.optional().describe("Filter by dialect."),
    limit: z.number().int().positive().max(1000).optional().describe("Max records to return. Default: 100."),
    startDate: z.string().optional().describe("Filter by start date (ISO 8601)."),
    endDate: z.string().optional().describe("Filter by end date (ISO 8601)."),
    includeStatistics: z.boolean().optional().describe("Include aggregate statistics. Default: true."),
  })
  .describe("Audit master post selection history with filtering and statistics.");

// ─── Export map ───────────────────────────────────────────────────────────

export const ACTION_LATHE_MASTERPOST_API_SCHEMAS: ActionSchemaMap = {
  lathe_masterpost_route,
  lathe_masterpost_emit,
  lathe_masterpost_validate,
  lathe_masterpost_explain,
  lathe_masterpost_cross_check,
  lathe_masterpost_audit,
};
