/**
 * Batch CAM Material Bridge Action Schemas — Zod v4
 *
 * 8 dispatcher actions (BatchCAMMaterialBridgeEngines E1116):
 *   mastercam_material_lookup, mastercam_material_search
 *   solidcam_material_lookup,  solidcam_material_search
 *   nx_material_lookup,        nx_material_search
 *   powermill_material_lookup, powermill_material_search
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const lookupSchema = z.object({
  material: z.string().min(1).describe(
    "Material name from the CAM system UI, ISO group letter (P/M/K/N/S/H), or common name (e.g. 'Inconel 718', 'Ti-6Al-4V', '6061')"
  ),
  strategy: z.string().optional().describe(
    "Optional CAM strategy name to retrieve per-strategy speed/feed multipliers (e.g. 'Dynamic_Motion', 'Vortex', 'Adaptive_Milling')"
  ),
});

const searchSchema = z.object({
  query: z.string().min(1).describe(
    "Search text — material name, ISO group, alloy code, or keyword (e.g. 'titanium', 'inconel', 'hardened', 'N')"
  ),
});

// ── Action Schemas ───────────────────────────────────────────────────────────

export const ACTION_BATCH_CAM_MATERIAL_BRIDGE_SCHEMAS: ActionSchemaMap = {
  // Mastercam — E1116 / MastercamMaterialBridgeEngine
  mastercam_material_lookup: lookupSchema,
  mastercam_material_search: searchSchema,
  // SolidCAM (iMachining) — E1116 / SolidCAMMaterialBridgeEngine
  solidcam_material_lookup: lookupSchema,
  solidcam_material_search: searchSchema,
  // NX CAM — E1116 / NXCAMMaterialBridgeEngine
  nx_material_lookup: lookupSchema,
  nx_material_search: searchSchema,
  // PowerMill — E1116 / PowerMillMaterialBridgeEngine
  powermill_material_lookup: lookupSchema,
  powermill_material_search: searchSchema,
};
