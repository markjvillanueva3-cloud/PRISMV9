/**
 * Zod action schemas for prism_omega dispatcher (6 actions)
 *
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine actually reads
 * - R/C/P/S/L are all optional with default 0.0 in dispatcher
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

/** Omega component score — clamped to [0,1] by dispatcher */
const componentScore = z.number().min(0).max(1).optional();

const compute = z.object({
  R: componentScore.describe("Reliability score"),
  C: componentScore.describe("Completeness score"),
  P: componentScore.describe("Performance score"),
  S: componentScore.describe("Safety score"),
  L: componentScore.describe("Linting/code-quality score"),
}).passthrough();

const breakdown = z.object({
  R: componentScore.describe("Reliability score"),
  C: componentScore.describe("Completeness score"),
  P: componentScore.describe("Performance score"),
  S: componentScore.describe("Safety score"),
  L: componentScore.describe("Linting/code-quality score"),
}).passthrough();

const validate = z.object({
  omega: z.number().optional().describe("Pre-computed omega score to validate"),
  S: z.number().optional().describe("Safety score to validate"),
}).passthrough();

const optimize = z.object({
  R: componentScore.describe("Reliability score"),
  C: componentScore.describe("Completeness score"),
  P: componentScore.describe("Performance score"),
  S: componentScore.describe("Safety score"),
  L: componentScore.describe("Linting/code-quality score"),
  target: z.number().optional().describe("Target omega score (default: 0.70)"),
}).passthrough();

const history = z.object({
  n: z.number().optional().describe("Number of history entries to return (default: 10)"),
}).passthrough();

const auto_score = z.object({
  R: componentScore.describe("Override reliability score"),
  C: componentScore.describe("Override completeness score"),
  P: componentScore.describe("Override performance score"),
  S: componentScore.describe("Override safety score"),
  L: componentScore.describe("Override linting score"),
  material: z.record(z.string(), z.unknown()).optional().describe("Material data for safety scoring override"),
}).passthrough();

export const ACTION_OMEGA_SCHEMAS: ActionSchemaMap = {
  compute,
  breakdown,
  validate,
  optimize,
  history,
  auto_score,
};
