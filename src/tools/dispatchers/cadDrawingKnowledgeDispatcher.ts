/**
 * prism_cad_drawing_kb — CAD Drawing Knowledge Dispatcher
 *
 * 11 actions: GD&T symbol selection, datum scheme design, drawing view layout,
 * feature modeling sequence rules, DFM checks (20+ rules), ISO 286 fit selection,
 * Fusion 360 modeling tips, G-code macro patterns.
 *
 * Wires to: cadDispatcher (existing), Fusion360CodeGeneratorEngine, Fusion360LiveBridgeEngine,
 *           GDTStackupEngine, MachiningKnowledgeBaseEngine
 *
 * @milestone PIPE-MS2
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { dispatcherError, dispatcherResult, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_CAD_DRAWING_KB_SCHEMAS } from "../../schemas/cadDrawingKnowledgeActionSchemas.js";

let _cadKb: any;

async function getEngine(): Promise<any> {
  return _cadKb ??= (
    await import("../../engines/CADDrawingKnowledgeEngine.js")
  ).cadDrawingKnowledgeEngine;
}

const ACTIONS = [
  "cad_select_gdt", "cad_get_gdt_rules", "cad_design_datums", "cad_plan_drawing",
  "cad_modeling_rules", "cad_dfm_check", "cad_get_dfm_rules",
  "cad_select_fit", "cad_get_fits", "cad_get_macro_patterns", "cad_fusion_modeling_tips",
] as const;

const actionEnum = z.enum(ACTIONS);

export function registerCADDrawingKnowledgeDispatcher(server: any): void {
  server.tool(
    "prism_cad_drawing_kb",
    `CAD Drawing Knowledge — GD&T selection (14 symbols per Y14.5-2018), datum scheme design (3-2-1),
drawing view layout (orthographic/section/detail/auxiliary), feature modeling sequence (Fusion 360),
DFM checks (20+ rules for milling/turning/drilling/sheet metal), ISO 286 fit selection (10 common fits),
G-code macro patterns (tool wear check, bolt circle, adaptive feed, multi-fixture).
Actions: ${ACTIONS.join(", ")}.`,
    {
      action: actionEnum,
      params: z.record(z.string(), z.any()).optional(),
    },
    async (args: any) => {
      const { action, params = {} } = args;
      log.info(`[prism_cad_drawing_kb] action=${action}`);

      const validation = validateActionParams(action, params, ACTION_CAD_DRAWING_KB_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_cad_drawing_kb");
      }

      try {
        const eng = await getEngine();
        const result = eng.calculate(action, params);
        return dispatcherResult(result);
      } catch (err: any) {
        return dispatcherError(err, action, "prism_cad_drawing_kb");
      }
    }
  );
}
