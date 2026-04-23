/**
 * Thread Dispatcher Action Schemas
 * =================================
 * Per-action Zod schemas for all 13 prism_thread actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * Design:
 * - `.passthrough()` on all schemas: extra params flow through
 * - Only enforce fields the engine actually reads
 * - Aliases (thread_size → thread_designation) resolved by normalizeParams
 *
 * @module schemas/threadActionSchemas
 * @version 1.0.0
 * @milestone SYS-MS6-U02
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();
const optStr = z.string().optional();
const optBool = z.boolean().optional();
const threadDesignation = z.string().min(1);
const materialRef = z.string().min(1).optional();

// ============================================================================
// CALCULATION ACTIONS (10 actions)
// ============================================================================

const calculate_tap_drill = z.object({
  thread_designation: threadDesignation,
  engagement_percent: optNum,        // default: 75
  material: materialRef,
}).passthrough();

const calculate_thread_mill_params = z.object({
  thread_designation: threadDesignation,
  tool_diameter: posNum,
  material: z.string().min(1).default("steel"),
  single_point: z.boolean().default(true),
}).passthrough();

const calculate_thread_depth = z.object({
  thread_designation: threadDesignation,
  engagement_turns: optNum,
  engagement_length: optNum,
}).passthrough();

const calculate_engagement_percent = z.object({
  hole_diameter: posNum,
  thread_designation: threadDesignation,
}).passthrough();

const get_thread_specifications = z.object({
  thread_designation: threadDesignation,
}).passthrough();

const get_go_nogo_gauges = z.object({
  thread_designation: threadDesignation,
  fit_class: z.string().default("6H"),
}).passthrough();

const calculate_pitch_diameter = z.object({
  thread_designation: threadDesignation,
  fit_class: optStr,
}).passthrough();

const calculate_minor_major_diameter = z.object({
  thread_designation: threadDesignation,
}).passthrough();

const calculate_thread_cutting_params = z.object({
  thread_designation: threadDesignation,
  material: z.string().min(1),
  hardness: optNum,
  tool_type: z.string().default("carbide"),
}).passthrough();

const calculate_thread_stripping = z.object({
  thread_designation: threadDesignation,
  engagement_length: posNum,
  tensile_strength_mpa: z.number().positive().default(400),
}).passthrough();

// ============================================================================
// SELECTION / VALIDATION (2 actions)
// ============================================================================

const select_thread_insert = z.object({
  thread_type: z.string().min(1),
  material: z.string().min(1),
  production_volume: z.string().default("medium"),
  internal_external: z.string().default("external"),
}).passthrough();

const validate_thread_fit_class = z.object({
  thread_designation: threadDesignation,
  fit_class: z.string().min(1),
}).passthrough();

// ============================================================================
// CODE GENERATION (1 action)
// ============================================================================

const generate_thread_gcode = z.object({
  thread_designation: threadDesignation,
  operation: z.enum(["tap", "thread_mill"]),
  depth: posNum,
  tool_diameter: optPosNum,          // required if operation='thread_mill'
  controller: z.string().default("FANUC"),
  spindle_speed: z.number().positive().default(500),
}).passthrough();

// ============================================================================
// SCHEMA REGISTRY
// ============================================================================

/** A C T I O N_ T H R E A D_ S C H E M A S constant.
 */
export const ACTION_THREAD_SCHEMAS: ActionSchemaMap = {
  // Calculations
  calculate_tap_drill,
  calculate_thread_mill_params,
  calculate_thread_depth,
  calculate_engagement_percent,
  get_thread_specifications,
  get_go_nogo_gauges,
  calculate_pitch_diameter,
  calculate_minor_major_diameter,
  calculate_thread_cutting_params,
  calculate_thread_stripping,
  // Selection / Validation
  select_thread_insert,
  validate_thread_fit_class,
  // Code generation
  generate_thread_gcode,
};
