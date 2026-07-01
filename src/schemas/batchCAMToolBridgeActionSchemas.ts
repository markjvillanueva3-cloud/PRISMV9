/**
 * Batch CAM Tool Bridge Action Schemas — Zod v4
 *
 * 8 dispatcher actions (BatchCAMToolBridgeEngines E1143):
 *   mastercam_tool_import, mastercam_tool_drift
 *   solidcam_tool_import, solidcam_tool_drift
 *   nx_tool_import,       nx_tool_drift
 *   hypermill_tool_import, hypermill_tool_drift
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

/** Accepts raw native-format tool data (JSON object or array) */
const nativeDataSchema = z.object({}).catchall(z.any()).passthrough().describe(
  "Native CAM tool library data (JSON-parsed). Pass top-level object with 'tools' array, or pass array directly as { tools: [...] }."
);

/** Minimal ToolRecord shape for drift detection */
const toolRecordSchema = z.object({
  tool_number: z.number(),
  prism_id: z.string(),
  cam_native_id: z.string().optional(),
}).passthrough();

const driftSchema = z.object({
  native_tools: z.array(toolRecordSchema).describe(
    "Tools from the native CAM system (previously imported via *_tool_import)"
  ),
  prism_tools: z.array(toolRecordSchema).describe(
    "Current PRISM tool records to compare against the native library"
  ),
});

// ── Action Schemas ────────────────────────────────────────────────────────────

export const ACTION_BATCH_CAM_TOOL_BRIDGE_SCHEMAS: ActionSchemaMap = {
  // Mastercam — E1143 / MastercamToolBridgeEngine
  mastercam_tool_import: z.object({
    native_data: nativeDataSchema,
  }),
  mastercam_tool_drift: driftSchema,

  // SolidCAM — E1143 / SolidCAMToolBridgeEngine
  solidcam_tool_import: z.object({
    native_data: nativeDataSchema,
  }),
  solidcam_tool_drift: driftSchema,

  // NX CAM — E1143 / NXCAMToolBridgeEngine
  nx_tool_import: z.object({
    native_data: nativeDataSchema,
  }),
  nx_tool_drift: driftSchema,

  // hyperMILL — E1143 / HyperMillToolBridgeEngine
  hypermill_tool_import: z.object({
    native_data: nativeDataSchema,
  }),
  hypermill_tool_drift: driftSchema,
};
