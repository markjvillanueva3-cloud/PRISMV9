/**
 * prism_forming — Forming & Casting Dispatcher
 *
 * 20 actions: blow molding, casting defect, extrusion, filament winding,
 *   powder compaction, press brake, pultrusion, resin transfer, rolling mill,
 *   sheet metal nesting, stamping die, thermoforming, tube forming,
 *   wire drawing, flat pattern, calendering, compression molding,
 *   rotational molding, vacuum casting, centrifugal casting
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { FORMING_CASTING_ACTION_SCHEMAS } from "../../schemas/formingCastingActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

let _blowMold: any, _castingDefect: any, _extrusion: any, _filamentWind: any;
let _powderCompact: any, _pressBrake: any, _pultrusion: any, _resinTransfer: any;
let _rollingMill: any, _sheetNesting: any, _stampingDie: any, _thermoform: any;
let _tubeForm: any, _wireDraw: any, _flatPattern: any, _calender: any;
let _compressionMold: any, _rotationalMold: any, _vacuumCast: any, _centrifugalCast: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "blowMold": return _blowMold ??= (await import("../../engines/BlowMoldingEngine.js")).blowMoldingEngine;
    case "castingDefect": return _castingDefect ??= (await import("../../engines/CastingDefectEngine.js")).castingDefectEngine;
    case "extrusion": return _extrusion ??= (await import("../../engines/ExtrusionForceEngine.js")).extrusionForceEngine;
    case "filamentWind": return _filamentWind ??= (await import("../../engines/FilamentWindingEngine.js")).filamentWindingEngine;
    case "powderCompact": return _powderCompact ??= (await import("../../engines/PowderCompactionEngine.js")).powderCompactionEngine;
    case "pressBrake": return _pressBrake ??= (await import("../../engines/PressBrakeEngine.js")).pressBrakeEngine;
    case "pultrusion": return _pultrusion ??= (await import("../../engines/PultrusionProcessEngine.js")).pultrusionProcessEngine;
    case "resinTransfer": return _resinTransfer ??= (await import("../../engines/ResinTransferEngine.js")).resinTransferEngine;
    case "rollingMill": return _rollingMill ??= (await import("../../engines/RollingMillEngine.js")).rollingMillEngine;
    case "sheetNesting": return _sheetNesting ??= (await import("../../engines/SheetMetalNestingEngine.js")).sheetMetalNestingEngine;
    case "stampingDie": return _stampingDie ??= (await import("../../engines/StampingDieEngine.js")).stampingDieEngine;
    case "thermoform": return _thermoform ??= (await import("../../engines/ThermoformingEngine.js")).thermoformingEngine;
    case "tubeForm": return _tubeForm ??= (await import("../../engines/TubeFormingEngine.js")).tubeFormingEngine;
    case "wireDraw": return _wireDraw ??= (await import("../../engines/WireDrawingEngine.js")).wireDrawingEngine;
    case "flatPattern": return _flatPattern ??= (await import("../../engines/FlatPatternEngine.js")).flatPatternEngine;
    case "calender": return _calender ??= (await import("../../engines/CalenderingEngine.js")).calenderingEngine;
    case "compressionMold": return _compressionMold ??= (await import("../../engines/CompressionMoldingEngine.js")).compressionMoldingEngine;
    case "rotationalMold": return _rotationalMold ??= (await import("../../engines/RotationalMoldingEngine.js")).rotationalMoldingEngine;
    case "vacuumCast": return _vacuumCast ??= (await import("../../engines/VacuumCastingEngine.js")).vacuumCastingEngine;
    case "centrifugalCast": return _centrifugalCast ??= (await import("../../engines/CentrifugalCastingEngine.js")).centrifugalCastingEngine;
    default: throw new Error(`Unknown engine: ${name}`);
  }
}

const ACTIONS = [
  "blow_molding_calculate", "casting_defect_analyze", "extrusion_force_calculate",
  "filament_winding_calculate", "powder_compaction_calculate", "press_brake_calculate",
  "pultrusion_calculate", "resin_transfer_calculate", "rolling_mill_calculate",
  "sheet_metal_nesting_optimize", "stamping_die_calculate", "thermoforming_calculate",
  "tube_forming_calculate", "wire_drawing_calculate", "flat_pattern_calculate",
  "calendering_calculate",
  "compression_molding_calc", "rotational_molding_calc", "vacuum_casting_calc",
  "centrifugal_casting_calc",
] as const;

export function registerFormingCastingDispatcher(server: any): void {
  server.tool(
    "prism_forming",
    `Forming & casting: blow molding, casting defect analysis, extrusion force, filament winding, powder compaction, press brake (bend force/tonnage), pultrusion, resin transfer, rolling mill, sheet metal nesting, stamping die, thermoforming, tube forming/bending, wire drawing, flat pattern (K-factor), calendering, compression molding, rotational molding, vacuum casting, centrifugal casting.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_forming] Action: ${action} (20 actions wired)`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, FORMING_CASTING_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_forming");
        }

        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "formingCastingDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return { content: [{ type: "text", text: JSON.stringify({ blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action }) }] };
        }

        const engineMap: Record<string, string> = {
          blow_molding_calculate: "blowMold", casting_defect_analyze: "castingDefect",
          extrusion_force_calculate: "extrusion", filament_winding_calculate: "filamentWind",
          powder_compaction_calculate: "powderCompact", press_brake_calculate: "pressBrake",
          pultrusion_calculate: "pultrusion", resin_transfer_calculate: "resinTransfer",
          rolling_mill_calculate: "rollingMill", sheet_metal_nesting_optimize: "sheetNesting",
          stamping_die_calculate: "stampingDie", thermoforming_calculate: "thermoform",
          tube_forming_calculate: "tubeForm", wire_drawing_calculate: "wireDraw",
          flat_pattern_calculate: "flatPattern", calendering_calculate: "calender",
          compression_molding_calc: "compressionMold", rotational_molding_calc: "rotationalMold",
          vacuum_casting_calc: "vacuumCast", centrifugal_casting_calc: "centrifugalCast",
        };

        const engineKey = engineMap[action];
        const eng = await getEngine(engineKey);

        if (action === "casting_defect_analyze") {
          result = eng.analyze?.(params) ?? eng.calculate?.(params) ?? { error: "CastingDefect method not found" };
        } else if (action === "sheet_metal_nesting_optimize") {
          result = eng.optimize?.(params) ?? eng.calculate?.(params) ?? { error: "SheetMetalNesting method not found" };
        } else {
          result = eng.calculate?.(params) ?? eng.compute?.(params) ?? { error: `${engineKey} method not found` };
        }

        try {
          await hookExecutor.execute("post-calculation", { ...hookCtx, metadata: { ...hookCtx.metadata, result } });
        } catch (postErr) {
          log.warn(`[prism_forming] Post-hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_forming");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
