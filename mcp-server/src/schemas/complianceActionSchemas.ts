/**
 * Zod action schemas for prism_compliance dispatcher (8 actions)
 *
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine actually reads
 * - Mark optional params with `.optional()`
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const apply_template = z.object({
  template_id: z.string().describe("Compliance template ID (e.g. ISO_13485, AS9100)"),
  provisioned_by: z.string().optional().describe("Who provisioned this template"),
  disclaimer_acknowledged: z.boolean().optional().describe("Whether disclaimer was acknowledged"),
}).passthrough();

const remove_template = z.object({
  template_id: z.string().describe("Compliance template ID to remove"),
}).passthrough();

const list_templates = z.object({}).passthrough();

const audit_status = z.object({
  template_id: z.string().optional().describe("Template ID to audit (optional — audits all if omitted)"),
}).passthrough();

const check_compliance = z.object({
  template_id: z.string().optional().describe("Template ID to check compliance for"),
}).passthrough();

const resolve_conflicts = z.object({}).passthrough();

const gap_analysis = z.object({
  template_id: z.string().optional().describe("Template ID for gap analysis"),
}).passthrough();

const config = z.object({
  updates: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe("Config updates — omit for read-only"),
}).passthrough();

export const ACTION_COMPLIANCE_SCHEMAS: ActionSchemaMap = {
  apply_template,
  remove_template,
  list_templates,
  audit_status,
  check_compliance,
  resolve_conflicts,
  gap_analysis,
  config,
};
