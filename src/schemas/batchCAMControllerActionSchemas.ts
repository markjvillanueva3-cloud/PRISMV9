/**
 * Batch CAM Controller Catalog Action Schemas — Zod v4
 *
 * 8 dispatcher actions (BatchCAMControllerEngines E1141):
 *   mastercam_controller_lookup, mastercam_controller_list
 *   solidcam_controller_lookup, solidcam_controller_list
 *   nx_controller_lookup, nx_controller_list
 *   powermill_controller_lookup, powermill_controller_list
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const controllerLookupSchema = z.object({
  controller: z.string().min(1).describe(
    "Controller name or partial match (e.g. 'Fanuc 31i-B5', 'Siemens 840D', 'Haas NGC')"
  ),
});

const controllerListSchema = z.object({}).passthrough().describe(
  "No parameters required — lists all controllers in the catalog"
);

// ── Action Schemas ───────────────────────────────────────────────────────────

export const ACTION_BATCH_CAM_CONTROLLER_SCHEMAS: ActionSchemaMap = {
  // Mastercam — E1141 / MastercamControllerCatalogEngine
  mastercam_controller_lookup: controllerLookupSchema,
  mastercam_controller_list: controllerListSchema,
  // SolidCAM — E1141 / SolidCAMControllerCatalogEngine
  solidcam_controller_lookup: controllerLookupSchema,
  solidcam_controller_list: controllerListSchema,
  // NX CAM — E1141 / NXCAMControllerCatalogEngine
  nx_controller_lookup: controllerLookupSchema,
  nx_controller_list: controllerListSchema,
  // PowerMill — E1141 / PowerMillControllerCatalogEngine
  powermill_controller_lookup: controllerLookupSchema,
  powermill_controller_list: controllerListSchema,
};
