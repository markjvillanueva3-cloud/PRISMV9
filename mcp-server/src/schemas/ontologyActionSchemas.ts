/**
 * ontologyActionSchemas.ts — Schemas for CAM-UIX ontology translation actions
 *
 * @unit CAM-UIX-MS0/U-ONTOLOGY-SEED01
 */
import { z } from "zod";

export const ACTION_ONTOLOGY_SCHEMAS = {
  ontology_translate: z.object({
    sourceCAM: z.string().describe("Source CAM system (e.g., 'mastercam', 'fusion360')"),
    targetCAM: z.string().describe("Target CAM system"),
    fieldName: z.string().describe("Field name to translate"),
  }),

  ontology_translate_strategy: z.object({
    sourceCAM: z.string().describe("Source CAM system"),
    targetCAM: z.string().describe("Target CAM system"),
    strategyName: z.string().describe("Strategy name to translate (e.g., 'Dynamic Mill')"),
  }),

  ontology_get_canonical: z.object({
    cam: z.string().describe("CAM system"),
    fieldName: z.string().describe("Field name to look up"),
  }),

  ontology_get_aliases: z.object({
    canonical: z.string().describe("Canonical field name"),
    cam: z.string().optional().describe("Optional: filter to specific CAM system"),
  }),

  ontology_list_canonicals: z.object({}),

  ontology_list_cams: z.object({}),

  ontology_stats: z.object({}),

  ontology_get_range: z.object({
    canonical: z.string().describe("Canonical field name"),
  }),

  ontology_get_valid_values: z.object({
    canonical: z.string().describe("Canonical field name"),
  }),

  ontology_check_applicable: z.object({
    canonical: z.string().describe("Canonical field name"),
    machineType: z.string().describe("Machine type to check applicability"),
  }),
};
