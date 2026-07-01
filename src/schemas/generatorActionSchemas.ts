/**
 * Generator Dispatcher Action Schemas
 * ====================================
 * Per-action Zod schemas for all 6 prism_generator actions.
 * Covers hook generation, batch generation, validation, template retrieval,
 * domain listing, and stats.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/generatorActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// stats — Get hook generator statistics
// ============================================================================

const stats = z.object({}).passthrough();

// ============================================================================
// list_domains — List all available domain templates
// ============================================================================

const list_domains = z.object({}).passthrough();

// ============================================================================
// generate — Generate hooks for a single domain
// ============================================================================

const generate = z.object({
  domain: z.string().describe("Domain name to generate hooks for"),
  validate: z.boolean().optional().describe("Whether to validate generated hooks (default true)"),
}).passthrough();

// ============================================================================
// generate_batch — Batch generate hooks for multiple domains
// ============================================================================

const generate_batch = z.object({
  domains: z.array(z.string()).optional().describe("List of domain names (default: all)"),
  output_dir: z.string().optional().describe("Output directory for generated files"),
  format: z.enum(["json", "typescript", "both"]).optional().describe("Output format (default: both)"),
  validate: z.boolean().optional().describe("Whether to validate (default true)"),
}).passthrough();

// ============================================================================
// validate — Validate generated hooks for a domain or all
// ============================================================================

const validate = z.object({
  domain: z.string().optional().describe("Domain to validate (default: all domains)"),
}).passthrough();

// ============================================================================
// get_template — Get a specific domain template
// ============================================================================

const get_template = z.object({
  domain: z.string().describe("Domain name to retrieve template for"),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_GENERATOR_SCHEMAS: ActionSchemaMap = {
  stats,
  list_domains,
  generate,
  generate_batch,
  validate,
  get_template,
};
