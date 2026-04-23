/**
 * Zod action schemas for prism_validate dispatcher (7 actions)
 *
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine actually reads
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const material = z.object({
  material: z.record(z.string(), z.unknown()).describe("Material object to validate"),
}).passthrough();

const kienzle = z.object({
  kc1_1: z.number().describe("Specific cutting force at 1mm chip thickness"),
  mc: z.number().describe("Kienzle exponent"),
  iso_group: z.string().optional().describe("ISO material group for range validation"),
}).passthrough();

const taylor = z.object({
  C: z.number().describe("Taylor constant C"),
  n: z.number().describe("Taylor exponent n"),
  iso_group: z.string().optional().describe("ISO material group for range validation"),
}).passthrough();

const johnson_cook = z.object({
  A: z.number().describe("Yield stress constant"),
  B: z.number().describe("Hardening constant"),
  n: z.number().describe("Hardening exponent"),
  C: z.number().describe("Strain rate sensitivity"),
  m: z.number().describe("Thermal softening exponent"),
  yield_strength: z.number().optional().describe("Reference yield strength"),
  tensile_strength: z.number().optional().describe("Reference tensile strength"),
}).passthrough();

const safety = z.object({
  material: z.record(z.string(), z.unknown()).optional().describe("Material data for safety scoring"),
  density: z.number().optional().describe("Material density (flat param fallback)"),
  kc1_1: z.number().optional().describe("Specific cutting force (flat param fallback)"),
}).passthrough();

const completeness = z.object({
  material: z.record(z.string(), z.unknown()).describe("Material object to check completeness"),
}).passthrough();

const anti_regression = z.object({
  old_content: z.string().describe("Previous content for regression comparison"),
  new_content: z.string().describe("New content for regression comparison"),
  file_type: z.string().optional().describe("File type hint (default: json)"),
}).passthrough();

export const ACTION_VALIDATION_SCHEMAS: ActionSchemaMap = {
  material,
  kienzle,
  taylor,
  johnson_cook,
  safety,
  completeness,
  anti_regression,
};
