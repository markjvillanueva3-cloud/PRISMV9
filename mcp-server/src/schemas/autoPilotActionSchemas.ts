/**
 * AutoPilot Dispatcher Action Schemas
 * ====================================
 * Per-action Zod schemas for all 7 prism_autopilot_d actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/autoPilotActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// autopilot — Full AutoPilot orchestration
// ============================================================================

const autopilot = z.object({
  task: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  enableSwarms: z.boolean().optional(),
  ralphLoops: z.number().int().min(0).optional(),
}).passthrough();

// ============================================================================
// autopilot_quick — Lightweight AutoPilot (no swarms, 1 loop, no formulas)
// ============================================================================

const autopilot_quick = z.object({
  task: z.string().optional(),
}).passthrough();

// ============================================================================
// brainstorm_lenses — 7-lens brainstorming via AutoPilot
// ============================================================================

const brainstorm_lenses = z.object({
  problem: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// ============================================================================
// formula_optimize — Formula registry lookup + optimization
// ============================================================================

const formula_optimize = z.object({
  task: z.string().optional(),
  domain: z.string().optional(),
  objective: z.enum(["maximize", "minimize"]).optional(),
}).passthrough();

// ============================================================================
// autopilot_v2 — AutoPilotV2 execution
// ============================================================================

const autopilot_v2 = z.object({
  task: z.string().optional(),
  format: z.enum(["compact", "detailed"]).optional(),
}).passthrough();

// ============================================================================
// registry_status — Registry manager status overview
// ============================================================================

const registry_status = z.object({}).passthrough();

// ============================================================================
// working_tools — List working MCP tools by category
// ============================================================================

const working_tools = z.object({
  category: z.string().optional(),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_AUTOPILOT_SCHEMAS: ActionSchemaMap = {
  autopilot,
  autopilot_quick,
  brainstorm_lenses,
  formula_optimize,
  autopilot_v2,
  registry_status,
  working_tools,
};
