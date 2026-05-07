/**
 * cadGrasshopperComponentSchema.ts — Zod schemas for PRISM Grasshopper components
 *
 * Defines the component registry, parameter specs, and runtime state for
 * Grasshopper components that invoke PRISM manufacturing intelligence.
 *
 * @module schemas/cadGrasshopperComponentSchema
 */

import { z } from "zod";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

export const GH_PARAM_TYPES = [
  "number",
  "integer",
  "boolean",
  "text",
  "point",
  "vector",
  "curve",
  "surface",
  "brep",
  "mesh",
  "geometry",
  "color",
  "material",
  "path",
] as const;
export type GHParamType = (typeof GH_PARAM_TYPES)[number];

export const GH_PARAM_ACCESS = ["item", "list", "tree"] as const;
export type GHParamAccess = (typeof GH_PARAM_ACCESS)[number];

export const PRISM_GH_CATEGORIES = [
  "PRISM Speed/Feed",
  "PRISM DFM",
  "PRISM Quote",
  "PRISM Tribal",
  "PRISM Analysis",
  "PRISM Toolpath",
  "PRISM Export",
] as const;
export type PRISMGHCategory = (typeof PRISM_GH_CATEGORIES)[number];

export const PRISM_COMPONENT_IDS = [
  "prism.gh.speedfeed",
  "prism.gh.dfm_check",
  "prism.gh.quote",
  "prism.gh.tribal_tip",
  "prism.gh.material_lookup",
  "prism.gh.tool_select",
  "prism.gh.cycle_time",
  "prism.gh.tolerance_check",
  "prism.gh.surface_finish",
  "prism.gh.force_calc",
  "prism.gh.deflection",
  "prism.gh.thermal",
  "prism.gh.toolpath_preview",
  "prism.gh.step_export",
  "prism.gh.setup_sheet",
] as const;
export type PRISMComponentId = (typeof PRISM_COMPONENT_IDS)[number];

// ────────────────────────────────────────────────────────────────────────────
// Parameter schemas
// ────────────────────────────────────────────────────────────────────────────

export const GHParamSpecSchema = z.object({
  name: z.string().min(1),
  nickname: z.string().min(1).max(3),
  description: z.string(),
  type: z.enum(GH_PARAM_TYPES),
  access: z.enum(GH_PARAM_ACCESS).default("item"),
  optional: z.boolean().default(false),
  defaultValue: z.unknown().optional(),
});
export type GHParamSpec = z.infer<typeof GHParamSpecSchema>;

export const GHInputValueSchema = z.object({
  paramName: z.string(),
  value: z.unknown(),
  branchPath: z.array(z.number().int().nonnegative()).optional(),
});
export type GHInputValue = z.infer<typeof GHInputValueSchema>;

export const GHOutputValueSchema = z.object({
  paramName: z.string(),
  value: z.unknown(),
  branchPath: z.array(z.number().int().nonnegative()).optional(),
});
export type GHOutputValue = z.infer<typeof GHOutputValueSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Component definition schema
// ────────────────────────────────────────────────────────────────────────────

export const PRISMGHComponentDefSchema = z.object({
  componentId: z.enum(PRISM_COMPONENT_IDS),
  name: z.string(),
  nickname: z.string().max(5),
  description: z.string(),
  category: z.enum(PRISM_GH_CATEGORIES),
  subcategory: z.string(),
  iconName: z.string(),
  inputs: z.array(GHParamSpecSchema),
  outputs: z.array(GHParamSpecSchema),
  exposure: z.enum(["primary", "secondary", "tertiary", "obscure", "hidden"]).default("primary"),
  obsolete: z.boolean().default(false),
  // Maps to PRISM dispatcher action
  prismAction: z.string(),
  prismDispatcher: z.string(),
});
export type PRISMGHComponentDef = z.infer<typeof PRISMGHComponentDefSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Runtime execution schemas
// ────────────────────────────────────────────────────────────────────────────

export const GHComponentExecutionContextSchema = z.object({
  instanceGuid: z.string().uuid(),
  componentId: z.enum(PRISM_COMPONENT_IDS),
  iteration: z.number().int().nonnegative(),
  branchPath: z.array(z.number().int().nonnegative()),
  documentPath: z.string().optional(),
  rhinoUnits: z.enum(["millimeters", "centimeters", "meters", "inches", "feet"]).optional(),
});
export type GHComponentExecutionContext = z.infer<typeof GHComponentExecutionContextSchema>;

export const GHComponentResultSchema = z.object({
  success: z.boolean(),
  outputs: z.array(GHOutputValueSchema),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  durationMs: z.number().nonnegative(),
  prismCallId: z.string().optional(),
});
export type GHComponentResult = z.infer<typeof GHComponentResultSchema>;

export const GHRuntimeMessageSchema = z.object({
  level: z.enum(["blank", "remark", "warning", "error"]),
  message: z.string(),
  componentId: z.enum(PRISM_COMPONENT_IDS).optional(),
  instanceGuid: z.string().uuid().optional(),
});
export type GHRuntimeMessage = z.infer<typeof GHRuntimeMessageSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Component registry schema
// ────────────────────────────────────────────────────────────────────────────

export const PRISMGHComponentRegistrySchema = z.object({
  version: z.string(),
  buildDate: z.string().datetime(),
  components: z.array(PRISMGHComponentDefSchema),
});
export type PRISMGHComponentRegistry = z.infer<typeof PRISMGHComponentRegistrySchema>;
