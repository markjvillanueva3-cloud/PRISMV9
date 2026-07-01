/**
 * Batch CAM Operation Catalog Action Schemas — Zod v4
 *
 * 8 dispatcher actions (BatchCAMOperationCatalogEngines E1142):
 *   mastercam_op_get, mastercam_op_list
 *   solidcam_op_get,  solidcam_op_list
 *   nx_op_get,        nx_op_list
 *   powermill_op_get, powermill_op_list
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const opGetSchema = z.object({
  name: z.string().min(1).describe(
    "Exact operation name (e.g. 'cavity_mill', 'vortex', 'imachining_2d'). " +
    "Use the list action to enumerate available names."
  ),
  material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe(
    "ISO material group for adjusted default parameters. " +
    "P=steel, M=stainless, K=cast iron, N=aluminium, S=superalloy, H=hardened. " +
    "Defaults to P if omitted."
  ),
});

const opListSchema = z.object({
  category: z.enum([
    "2d", "3d", "drilling", "turning", "roughing", "finishing",
    "multi_axis", "specialty", "imachining", "hsr", "hss",
  ]).optional().describe(
    "Filter by operation category. Omit to list all operations."
  ),
  feature_type: z.enum([
    "pocket", "contour", "slot", "face", "bore", "hole", "freeform_3d",
    "steep_wall", "flat_area", "groove", "thread", "turning_external",
    "turning_internal", "impeller", "ruled_surface", "rib", "chamfer_edge",
    "engraved_text", "circular_boss", "thin_wall",
  ]).optional().describe(
    "If provided, returns only operations suitable for this feature type, " +
    "ranked by minimum axis count."
  ),
}).passthrough();

// ── Action Schemas ───────────────────────────────────────────────────────────

export const ACTION_BATCH_CAM_OP_CATALOG_SCHEMAS: ActionSchemaMap = {
  // Mastercam — E1142 / MastercamOperationCatalogEngine
  mastercam_op_get:  opGetSchema,
  mastercam_op_list: opListSchema,
  // SolidCAM — E1142 / SolidCAMOperationCatalogEngine
  solidcam_op_get:   opGetSchema,
  solidcam_op_list:  opListSchema,
  // NX CAM — E1142 / NXCAMOperationCatalogEngine
  nx_op_get:         opGetSchema,
  nx_op_list:        opListSchema,
  // PowerMill — E1142 / PowerMillOperationCatalogEngine
  powermill_op_get:  opGetSchema,
  powermill_op_list: opListSchema,
};
