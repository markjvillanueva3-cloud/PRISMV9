/**
 * Batch CAM Add-In Action Schemas — Zod v4
 *
 * 6 dispatcher actions (BatchCAMAddInGenerators E1145):
 *   mastercam_addin_generate
 *   solidcam_addin_generate
 *   nx_addin_generate
 *   hypermill_addin_generate
 *   powermill_addin_generate
 *   catia_addin_generate
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schema ─────────────────────────────────────────────────────────

const addInGeneratorOptionsSchema = z.object({
  language: z.enum(["python", "csharp", "vba", "javascript"]).optional().describe(
    "Override output language. Each generator selects a sensible default if omitted."
  ),
  features: z.array(
    z.enum(["http_client", "ui_panel", "tool_sync", "post_integration"])
  ).optional().describe(
    "Subset of add-in features to include. Defaults to all features the CAM system supports."
  ),
  company: z.string().optional().describe(
    "Company/shop name to embed in generated code comments."
  ),
  prism_host: z.string().optional().describe(
    "PRISM server host override (default: localhost)."
  ),
  prism_port: z.number().int().positive().optional().describe(
    "PRISM server port override (default: 18361)."
  ),
}).optional();

// ── Action Schemas ────────────────────────────────────────────────────────────

export const ACTION_BATCH_CAM_ADDIN_SCHEMAS: ActionSchemaMap = {
  // E1145 / MastercamAddInGenerator
  mastercam_addin_generate: z.object({
    options: addInGeneratorOptionsSchema,
  }),

  // E1145 / SolidCAMAddInGenerator
  solidcam_addin_generate: z.object({
    options: addInGeneratorOptionsSchema,
  }),

  // E1145 / NXCAMAddInGenerator
  nx_addin_generate: z.object({
    options: addInGeneratorOptionsSchema,
  }),

  // E1145 / HyperMillACAddInGenerator
  hypermill_addin_generate: z.object({
    options: addInGeneratorOptionsSchema,
  }),

  // E1145 / PowerMillAddInGenerator
  powermill_addin_generate: z.object({
    options: addInGeneratorOptionsSchema,
  }),

  // E1145 / CATIAAddInGenerator
  catia_addin_generate: z.object({
    options: addInGeneratorOptionsSchema,
  }),
};
