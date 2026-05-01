/**
 * CAD Drawing Knowledge Action Schemas — Zod v4
 * 11 actions for CADDrawingKnowledgeEngine
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const cad_select_gdt = z.object({ feature_type: z.string(), intent: z.string(), mating_condition: z.string().optional() }).passthrough();
const cad_get_gdt_rules = z.object({}).passthrough();
const cad_design_datums = z.object({ part_type: z.string(), primary_feature: z.string().optional(), functional_requirements: z.array(z.string()).optional() }).passthrough();
const cad_plan_drawing = z.object({ part_type: z.string(), complexity: z.string().optional(), has_internal_features: z.boolean().optional(), has_threads: z.boolean().optional(), max_dimension_mm: z.number().optional() }).passthrough();
const cad_modeling_rules = z.object({}).passthrough();
const cad_dfm_check = z.object({ processes: z.array(z.string()).optional(), features: z.array(z.any()).optional() }).passthrough();
const cad_get_dfm_rules = z.object({}).passthrough();
const cad_select_fit = z.object({ application: z.string(), size_range_mm: z.number().optional() }).passthrough();
const cad_get_fits = z.object({}).passthrough();
const cad_get_macro_patterns = z.object({}).passthrough();
const cad_fusion_modeling_tips = z.object({}).passthrough();

export const ACTION_CAD_DRAWING_KB_SCHEMAS: ActionSchemaMap = {
  cad_select_gdt, cad_get_gdt_rules, cad_design_datums, cad_plan_drawing,
  cad_modeling_rules, cad_dfm_check, cad_get_dfm_rules,
  cad_select_fit, cad_get_fits, cad_get_macro_patterns, cad_fusion_modeling_tips,
};
