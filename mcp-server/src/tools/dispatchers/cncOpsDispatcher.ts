/**
 * prism_cnc_ops — CNC Operations Dispatcher
 *
 * 31 actions covering: ball end mill, bar feeder, broaching, center drill,
 *   chamfer, chamfer milling, circular interpolation, circular pocket,
 *   counterbore, counterboring, countersink, deburring, facing (mill+lathe),
 *   helical interpolation, honing, keyseat cutter, keyway, knurling,
 *   parting/grooving, power skiving, profiling, ramping, slotting,
 *   spot drilling, spring pass, taper turning, thread turning,
 *   waterjet, plasma cutting, plasma arc
 *
 * Engine dependencies: BallEndMillEngine, BarFeederEngine, BroachDesignEngine,
 *   CenterDrillEngine, ChamferEngine, ChamferMillingEngine, CircularInterpolationEngine,
 *   CircularPocketEngine, CounterboreSinkEngine, CounterboringEngine, CountersinkEngine,
 *   DeburringEngine, FacingEngine, HelicalInterpolationEngine, HoningEngine,
 *   KeyseatCutterEngine, KeywayEngine, KnurlingEngine, PartingGroovingEngine,
 *   PowerSkivingEngine, ProfilingEngine, RampingEngine, SlottingEngine,
 *   SpotDrillingEngine, SpringPassEngine, TaperTurningEngine, ThreadTurningEngine,
 *   WaterjetEngine, PlasmaCuttingEngine, PlasmaArcEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { CNC_OPS_ACTION_SCHEMAS } from "../../schemas/cncOpsActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

// Lazy-loaded engine singletons
let _ballEndMill: any, _barFeeder: any, _broach: any, _centerDrill: any;
let _chamfer: any, _chamferMilling: any, _circInterp: any, _circPocket: any;
let _counterboreSink: any, _counterboring: any, _countersink: any, _deburring: any;
let _facing: any, _helicalInterp: any, _honing: any, _keyseatCutter: any;
let _keyway: any, _knurling: any, _partingGrooving: any, _powerSkiving: any;
let _profiling: any, _ramping: any, _slotting: any, _spotDrilling: any;
let _springPass: any, _taperTurning: any, _threadTurning: any;
let _waterjet: any, _plasmaCutting: any, _plasmaArc: any;
let _deepHoleDrilling: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "ballEndMill": return _ballEndMill ??= (await import("../../engines/BallEndMillEngine.js")).ballEndMillEngine;
    case "barFeeder": return _barFeeder ??= (await import("../../engines/BarFeederEngine.js")).barFeederEngine;
    case "broach": return _broach ??= (await import("../../engines/BroachDesignEngine.js")).broachDesignEngine;
    case "centerDrill": return _centerDrill ??= (await import("../../engines/CenterDrillEngine.js")).centerDrillEngine;
    case "chamfer": return _chamfer ??= (await import("../../engines/ChamferEngine.js")).chamferEngine;
    case "chamferMilling": return _chamferMilling ??= (await import("../../engines/ChamferMillingEngine.js")).chamferMillingEngine;
    case "circInterp": return _circInterp ??= (await import("../../engines/CircularInterpolationEngine.js")).circularInterpolationEngine;
    case "circPocket": return _circPocket ??= (await import("../../engines/CircularPocketEngine.js")).circularPocketEngine;
    case "counterboreSink": return _counterboreSink ??= (await import("../../engines/CounterboreSinkEngine.js")).counterboreSinkEngine;
    case "counterboring": return _counterboring ??= (await import("../../engines/CounterboringEngine.js")).counterboringEngine;
    case "countersink": return _countersink ??= (await import("../../engines/CountersinkEngine.js")).countersinkEngine;
    case "deburring": return _deburring ??= (await import("../../engines/DeburringEngine.js")).deburringEngine;
    case "facing": return _facing ??= (await import("../../engines/FacingEngine.js")).facingEngine;
    case "helicalInterp": return _helicalInterp ??= (await import("../../engines/HelicalInterpolationEngine.js")).helicalInterpolationEngine;
    case "honing": return _honing ??= (await import("../../engines/HoningEngine.js")).honingEngine;
    case "keyseatCutter": return _keyseatCutter ??= (await import("../../engines/KeyseatCutterEngine.js")).keyseatCutterEngine;
    case "keyway": return _keyway ??= (await import("../../engines/KeywayEngine.js")).keywayEngine;
    case "knurling": return _knurling ??= (await import("../../engines/KnurlingEngine.js")).knurlingEngine;
    case "partingGrooving": return _partingGrooving ??= (await import("../../engines/PartingGroovingEngine.js")).partingGroovingEngine;
    case "powerSkiving": return _powerSkiving ??= (await import("../../engines/PowerSkivingEngine.js")).powerSkivingEngine;
    case "profiling": return _profiling ??= (await import("../../engines/ProfilingEngine.js")).profilingEngine;
    case "ramping": return _ramping ??= (await import("../../engines/RampingEngine.js")).rampingEngine;
    case "slotting": return _slotting ??= (await import("../../engines/SlottingEngine.js")).slottingEngine;
    case "spotDrilling": return _spotDrilling ??= (await import("../../engines/SpotDrillingEngine.js")).spotDrillingEngine;
    case "springPass": return _springPass ??= (await import("../../engines/SpringPassEngine.js")).springPassEngine;
    case "taperTurning": return _taperTurning ??= (await import("../../engines/TaperTurningEngine.js")).taperTurningEngine;
    case "threadTurning": return _threadTurning ??= (await import("../../engines/ThreadTurningEngine.js")).threadTurningEngine;
    case "waterjet": return _waterjet ??= (await import("../../engines/WaterjetEngine.js")).waterjetEngine;
    case "plasmaCutting": return _plasmaCutting ??= (await import("../../engines/PlasmaCuttingEngine.js")).plasmaCuttingEngine;
    case "plasmaArc": return _plasmaArc ??= (await import("../../engines/PlasmaArcEngine.js")).plasmaArcEngine;
    case "deepHoleDrilling": return _deepHoleDrilling ??= (await import("../../engines/DeepHoleDrillingPhysicsEngine.js")).deepHoleDrillingPhysicsEngine;
    default: throw new Error(`Unknown engine: ${name}`);
  }
}

const ACTIONS = [
  "ball_endmill_calculate", "ball_endmill_scallop",
  "bar_feeder_calculate", "broach_design",
  "center_drill_calculate",
  "chamfer_calculate", "chamfer_milling_calculate",
  "circular_interpolation_calculate", "circular_pocket_calculate",
  "counterbore_calculate", "counterboring_calculate", "countersink_calculate",
  "deburring_calculate",
  "face_mill_calculate", "lathe_face_calculate",
  "helical_interpolation_calculate",
  "honing_calculate",
  "keyseat_cutter_calculate", "keyway_calculate",
  "knurling_calculate",
  "parting_grooving_calculate",
  "power_skiving_calculate",
  "profiling_calculate",
  "ramping_calculate",
  "slotting_calculate",
  "spot_drilling_calculate",
  "spring_pass_calculate",
  "taper_turning_calculate",
  "thread_turning_calculate",
  "waterjet_calculate",
  "plasma_cutting_calculate", "plasma_arc_calculate",
  "deep_hole_thrust_force", "deep_hole_chip_evacuation",
  "deep_hole_whirl_vibration", "deep_hole_deviation",
  "deep_hole_surface_finish", "deep_hole_tool_life",
  "deep_hole_pecking_optimize", "deep_hole_power_energy",
  "deep_hole_compare_processes",
] as const;

export function registerCncOpsDispatcher(server: any): void {
  server.tool(
    "prism_cnc_ops",
    `CNC operations: ball end mill, broaching, chamfer, circular interpolation/pocket, counterbore/sink, deburring, facing, helical interp, honing, keyseat, keyway, knurling, parting/grooving, power skiving, profiling, ramping, slotting, spot drill, spring pass, taper turning, thread turning, waterjet, plasma.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_cnc_ops] Action: ${action} (31 actions wired)`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, CNC_OPS_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_cnc_ops"
          );
        }

        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "cncOpsDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy,
              reason: preResult.summary, action,
            }) }]
          };
        }

        switch (action) {
          case "ball_endmill_calculate": {
            const eng = await getEngine("ballEndMill");
            result = eng.calculate(params);
            break;
          }
          case "ball_endmill_scallop": {
            const eng = await getEngine("ballEndMill");
            result = eng.scallop(params);
            break;
          }
          case "bar_feeder_calculate": {
            const eng = await getEngine("barFeeder");
            result = eng.calculate(params);
            break;
          }
          case "broach_design": {
            const eng = await getEngine("broach");
            result = eng.calculate?.(params) ?? eng.design?.(params) ?? { error: "BroachDesign method not found" };
            break;
          }
          case "center_drill_calculate": {
            const eng = await getEngine("centerDrill");
            result = eng.calculate(params);
            break;
          }
          case "chamfer_calculate": {
            const eng = await getEngine("chamfer");
            result = eng.calculate(params);
            break;
          }
          case "chamfer_milling_calculate": {
            const eng = await getEngine("chamferMilling");
            result = eng.calculate(params);
            break;
          }
          case "circular_interpolation_calculate": {
            const eng = await getEngine("circInterp");
            result = eng.calculate(params);
            break;
          }
          case "circular_pocket_calculate": {
            const eng = await getEngine("circPocket");
            result = eng.calculate(params);
            break;
          }
          case "counterbore_calculate": {
            const eng = await getEngine("counterboreSink");
            result = eng.calculate(params);
            break;
          }
          case "counterboring_calculate": {
            const eng = await getEngine("counterboring");
            result = eng.calculate(params);
            break;
          }
          case "countersink_calculate": {
            const eng = await getEngine("countersink");
            result = eng.calculate(params);
            break;
          }
          case "deburring_calculate": {
            const eng = await getEngine("deburring");
            result = eng.calculate(params);
            break;
          }
          case "face_mill_calculate": {
            const eng = await getEngine("facing");
            result = eng.faceMill(params);
            break;
          }
          case "lathe_face_calculate": {
            const eng = await getEngine("facing");
            result = eng.latheFace(params);
            break;
          }
          case "helical_interpolation_calculate": {
            const eng = await getEngine("helicalInterp");
            result = eng.calculate(params);
            break;
          }
          case "honing_calculate": {
            const eng = await getEngine("honing");
            result = eng.calculate(params);
            break;
          }
          case "keyseat_cutter_calculate": {
            const eng = await getEngine("keyseatCutter");
            result = eng.calculate(params);
            break;
          }
          case "keyway_calculate": {
            const eng = await getEngine("keyway");
            result = eng.calculate(params);
            break;
          }
          case "knurling_calculate": {
            const eng = await getEngine("knurling");
            result = eng.calculate(params);
            break;
          }
          case "parting_grooving_calculate": {
            const eng = await getEngine("partingGrooving");
            result = eng.calculate(params);
            break;
          }
          case "power_skiving_calculate": {
            const eng = await getEngine("powerSkiving");
            result = eng.calculate(params);
            break;
          }
          case "profiling_calculate": {
            const eng = await getEngine("profiling");
            result = eng.calculate(params);
            break;
          }
          case "ramping_calculate": {
            const eng = await getEngine("ramping");
            result = eng.calculate(params);
            break;
          }
          case "slotting_calculate": {
            const eng = await getEngine("slotting");
            result = eng.calculate(params);
            break;
          }
          case "spot_drilling_calculate": {
            const eng = await getEngine("spotDrilling");
            result = eng.calculate(params);
            break;
          }
          case "spring_pass_calculate": {
            const eng = await getEngine("springPass");
            result = eng.calculate(params);
            break;
          }
          case "taper_turning_calculate": {
            const eng = await getEngine("taperTurning");
            result = eng.calculate(params);
            break;
          }
          case "thread_turning_calculate": {
            const eng = await getEngine("threadTurning");
            result = eng.calculate(params);
            break;
          }
          case "waterjet_calculate": {
            const eng = await getEngine("waterjet");
            result = eng.calculate(params);
            break;
          }
          case "plasma_cutting_calculate": {
            const eng = await getEngine("plasmaCutting");
            result = eng.calculate(params);
            break;
          }
          case "plasma_arc_calculate": {
            const eng = await getEngine("plasmaArc");
            result = eng.calculate(params);
            break;
          }
          case "deep_hole_thrust_force": {
            const eng = await getEngine("deepHoleDrilling");
            result = eng.thrustForceAndTorque(params);
            break;
          }
          case "deep_hole_chip_evacuation": {
            const eng = await getEngine("deepHoleDrilling");
            result = eng.chipEvacuation(params);
            break;
          }
          case "deep_hole_whirl_vibration": {
            const eng = await getEngine("deepHoleDrilling");
            result = eng.whirlVibration(params);
            break;
          }
          case "deep_hole_deviation": {
            const eng = await getEngine("deepHoleDrilling");
            result = eng.holeDeviation(params);
            break;
          }
          case "deep_hole_surface_finish": {
            const eng = await getEngine("deepHoleDrilling");
            result = eng.surfaceFinish(params);
            break;
          }
          case "deep_hole_tool_life": {
            const eng = await getEngine("deepHoleDrilling");
            result = eng.toolLife(params);
            break;
          }
          case "deep_hole_pecking_optimize": {
            const eng = await getEngine("deepHoleDrilling");
            result = eng.peckingOptimization(params);
            break;
          }
          case "deep_hole_power_energy": {
            const eng = await getEngine("deepHoleDrilling");
            result = eng.powerAndEnergy(params);
            break;
          }
          case "deep_hole_compare_processes": {
            const eng = await getEngine("deepHoleDrilling");
            result = eng.compareDrillProcesses(params);
            break;
          }
          default:
            result = { error: `Unknown action: ${action}` };
        }

        try {
          await hookExecutor.execute("post-calculation", {
            ...hookCtx, metadata: { ...hookCtx.metadata, result }
          });
        } catch (postErr) {
          log.warn(`[prism_cnc_ops] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_cnc_ops");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
