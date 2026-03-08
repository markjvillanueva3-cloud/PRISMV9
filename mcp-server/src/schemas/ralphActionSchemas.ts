/**
 * Ralph Dispatcher Action Schemas
 * =================================
 * Per-action Zod schemas for all 3 prism_ralph actions.
 * Covers full 4-phase validation loops, single-pass scrutiny,
 * and standalone Opus assessment.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/ralphActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// loop — Full 4-phase Ralph validation (SCRUTINIZE -> IMPROVE -> VALIDATE -> ASSESS)
// ============================================================================

const loop = z.object({
  content: z.string().optional().describe("Content to validate (alias: target)"),
  target: z.string().optional().describe("Content to validate (alias: content)"),
  validators: z.array(z.string()).optional().describe("Validator names to use (default: SAFETY_AUDITOR, CODE_REVIEWER, COMPLETENESS_CHECKER)"),
  safety_threshold: z.number().min(0).max(1).optional().describe("Safety score threshold (default 0.7)"),
}).passthrough();

// ============================================================================
// scrutinize — Single validator pass on content
// ============================================================================

const scrutinize = z.object({
  content: z.string().optional().describe("Content to scrutinize"),
  validator: z.string().optional().describe("Validator to use (default: CODE_REVIEWER)"),
}).passthrough();

// ============================================================================
// assess — Standalone Phase 4 assessment with Opus
// ============================================================================

const assess = z.object({
  content: z.string().optional().describe("Content to assess"),
  context: z.string().optional().describe("Additional context for assessment"),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_RALPH_SCHEMAS: ActionSchemaMap = {
  loop,
  scrutinize,
  assess,
};
