/**
 * Industry Dispatcher Action Schemas
 * ====================================
 * Per-action Zod schemas for all 4 prism_industry actions.
 * Covers aerospace (AS9100), medical (ISO 13485), automotive (IATF 16949),
 * and oil & gas (API) compliance checks.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/industryActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// aerospace_check — AS9100D / NADCAP compliance verification
// ============================================================================

const aerospace_check = z.object({
  material_cert: z.boolean().optional().describe("Material certification available (AMS 2750)"),
  fai_complete: z.boolean().optional().describe("First article inspection complete (AS9102)"),
  nadcap_approved: z.boolean().optional().describe("NADCAP approval for special processes"),
  surface_verified: z.boolean().optional().describe("Surface finish verified per drawing"),
  cmm_complete: z.boolean().optional().describe("CMM dimensional report complete"),
}).passthrough();

// ============================================================================
// medical_check — ISO 13485 / FDA 21 CFR 820 compliance verification
// ============================================================================

const medical_check = z.object({
  biocompat_tested: z.boolean().optional().describe("Biocompatibility tested per ISO 10993"),
  lot_traceable: z.boolean().optional().describe("Full lot traceability from raw material"),
  cleaning_validated: z.boolean().optional().describe("Cleaning validation per device classification"),
  sterilization_checked: z.boolean().optional().describe("Sterilization compatibility checked"),
  udi_applied: z.boolean().optional().describe("UDI marking applied per FDA regulation"),
}).passthrough();

// ============================================================================
// automotive_check — IATF 16949 compliance verification
// ============================================================================

const automotive_check = z.object({
  ppap_level: z.number().int().min(1).max(5).optional().describe("PPAP submission level (1-5)"),
  control_plan: z.boolean().optional().describe("Control plan available"),
  msa_complete: z.boolean().optional().describe("MSA / Gauge R&R complete (AIAG 4th ed)"),
  cpk: z.number().optional().describe("Process capability index (min 1.33)"),
  fmea_complete: z.boolean().optional().describe("FMEA complete (AIAG/VDA)"),
}).passthrough();

// ============================================================================
// oil_gas_check — API / NACE / ASME compliance verification
// ============================================================================

const oil_gas_check = z.object({
  mtr_available: z.boolean().optional().describe("Material test report available (API 5CT / NACE MR0175)"),
  hardness_verified: z.boolean().optional().describe("Hardness verification (max HRC 22 sour service)"),
  ndt_complete: z.boolean().optional().describe("NDT inspection complete (UT, MT, PT per API)"),
  pressure_rated: z.boolean().optional().describe("Pressure rating verified (ASME B16.5 / API 6A)"),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_INDUSTRY_SCHEMAS: ActionSchemaMap = {
  aerospace_check,
  medical_check,
  automotive_check,
  oil_gas_check,
};
