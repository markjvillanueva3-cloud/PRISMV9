/**
 * prism_machine_setup — Machine Setup & Quality Dispatcher
 *
 * 46 actions: balancing, maintenance, critical speed, dynamic balance,
 *   kinematics, leveling, warmup, RTCP, spindle load/runout/speed variation,
 *   work envelope, tool magazine, tool balancing, fixture plate, magnetic bearing,
 *   press fit, shrink fit, gauging, parallelism, surface integrity, thread gage,
 *   tolerance stackup, stepover optimization, statistical process,
 *   hobby CNC profiles, cobot machining, OPC-UA connector,
 *   machine strategy constraint, fixture-aware strategy selection (CAMX-MS12/U07)
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { MACHINE_SETUP_ACTION_SCHEMAS } from "../../schemas/machineSetupActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

let _balancing: any, _cncMaint: any, _critSpeed: any, _dynBalance: any;
let _kinematics: any, _leveling: any, _warmup: any, _rtcp: any;
let _spindleLoad: any, _spindleRunout: any, _spindleSpeedVar: any;
let _workEnvelope: any, _toolMag: any, _toolBalance: any;
let _fixture: any, _magBearing: any, _pressFit: any, _shrinkFit: any;
let _gauging: any, _parallelism: any, _surfIntegrity: any, _threadGage: any;
let _tolStackup: any, _stepover: any, _statProcess: any;
let _hobbyCNC: any, _cobotMachining: any;
let _opcua: any;
let _machineStrategyConstraint: any;
let _fixtureAwareStrategy: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "balancing": return _balancing ??= (await import("../../engines/BalancingMachineEngine.js")).balancingMachineEngine;
    case "cncMaint": return _cncMaint ??= (await import("../../engines/CNCMaintenanceEngine.js")).cncMaintenanceEngine;
    case "critSpeed": return _critSpeed ??= (await import("../../engines/CriticalSpeedEngine.js")).criticalSpeedEngine;
    case "dynBalance": return _dynBalance ??= (await import("../../engines/DynamicBalanceEngine.js")).dynamicBalanceEngine;
    case "kinematics": return _kinematics ??= await import("../../engines/MachineKinematicsEngine.js") as any;
    case "leveling": return _leveling ??= (await import("../../engines/MachineLevelingEngine.js")).machineLevelingEngine;
    case "warmup": return _warmup ??= (await import("../../engines/MachineWarmupEngine.js")).machineWarmupEngine;
    case "rtcp": return _rtcp ??= (await import("../../engines/RTCP_CompensationEngine.js")).rtcpCompensationEngine;
    case "spindleLoad": return _spindleLoad ??= (await import("../../engines/SpindleLoadMonitorEngine.js")).spindleLoadMonitorEngine;
    case "spindleRunout": return _spindleRunout ??= (await import("../../engines/SpindleRunoutEngine.js")).spindleRunoutEngine;
    case "spindleSpeedVar": return _spindleSpeedVar ??= (await import("../../engines/SpindleSpeedVariationEngine.js")).spindleSpeedVariationEngine;
    case "workEnvelope": return _workEnvelope ??= (await import("../../engines/WorkEnvelopeEngine.js")).workEnvelopeEngine;
    case "toolMag": return _toolMag ??= (await import("../../engines/ToolMagazineOptimizationEngine.js")).toolMagazineOptimizationEngine;
    case "toolBalance": return _toolBalance ??= (await import("../../engines/ToolBalancingEngine.js")).toolBalancingEngine;
    case "fixture": return _fixture ??= (await import("../../engines/FixturePlateEngine.js")).fixturePlateEngine;
    case "magBearing": return _magBearing ??= (await import("../../engines/MagneticBearingEngine.js")).magneticBearingEngine;
    case "pressFit": return _pressFit ??= (await import("../../engines/PressFitEngine.js")).pressFitEngine;
    case "shrinkFit": return _shrinkFit ??= (await import("../../engines/ShrinkFitEngine.js")).shrinkFitEngine;
    case "gauging": return _gauging ??= (await import("../../engines/GaugingEngine.js")).gaugingEngine;
    case "parallelism": return _parallelism ??= (await import("../../engines/ParallelismEngine.js")).parallelismEngine;
    case "surfIntegrity": return _surfIntegrity ??= (await import("../../engines/SurfaceIntegrityEngine.js")).surfaceIntegrityEngine;
    case "threadGage": return _threadGage ??= (await import("../../engines/ThreadGageEngine.js")).threadGageEngine;
    case "tolStackup": return _tolStackup ??= (await import("../../engines/ToleranceStackUpEngine.js")).toleranceStackUpEngine;
    case "stepover": return _stepover ??= (await import("../../engines/StepoverOptimizationEngine.js")).stepoverOptimizationEngine;
    case "statProcess": return _statProcess ??= (await import("../../engines/StatisticalProcessEngine.js")).statisticalProcessEngine;
    case "hobbyCNC": return _hobbyCNC ??= (await import("../../engines/HobbyCNCProfileEngine.js")).hobbyCNCProfileEngine;
    case "cobotMachining": return _cobotMachining ??= (await import("../../engines/CobotMachiningEngine.js")).cobotMachiningEngine;
    case "opcua": return _opcua ??= (await import("../../engines/OpcUaConnectorEngine.js")).OpcUaConnectorEngine;
    case "machineStrategyConstraint": return _machineStrategyConstraint ??= (await import("../../engines/MachineStrategyConstraintEngine.js")).machineStrategyConstraintEngine;
    case "fixtureAwareStrategy": return _fixtureAwareStrategy ??= (await import("../../engines/FixtureAwareStrategyEngine.js")).fixtureAwareStrategyEngine;
    default: throw new Error(`Unknown engine: ${name}`);
  }
}

const ACTIONS = [
  "balancing_machine_calculate", "cnc_maintenance_calculate",
  "critical_speed_calculate", "dynamic_balance_calculate",
  "machine_kinematics_calculate", "machine_leveling_calculate",
  "machine_warmup_calculate", "rtcp_compensation_calculate",
  "spindle_load_monitor", "spindle_runout_calculate", "spindle_speed_variation",
  "work_envelope_calculate", "tool_magazine_optimize", "tool_balancing_calculate",
  "fixture_plate_calculate", "magnetic_bearing_calculate",
  "press_fit_calculate", "shrink_fit_calculate",
  "gauging_calculate", "parallelism_calculate", "surface_integrity_assess",
  "thread_gage_calculate", "tolerance_stackup_calculate",
  "stepover_optimize", "statistical_process_calculate",
  "hobby_cnc_get", "hobby_cnc_search", "hobby_cnc_controller",
  "hobby_cnc_compatibility", "hobby_cnc_recommend",
  "cobot_assess_safety", "cobot_plan_task", "cobot_select",
  "opcua_connect", "opcua_disconnect", "opcua_read", "opcua_read_batch",
  "opcua_subscribe", "opcua_unsubscribe", "opcua_browse",
  "opcua_controller_profile", "opcua_machine_status", "opcua_monitor_alarms",
  "machine_strategy_validate", "machine_strategy_find_best", "machine_strategy_requirements",
  "fixture_strategy_adjust", "fixture_strategy_validate", "fixture_recommend",
  "workholding_infer_surfaces", "workholding_track_survival", "workholding_detect_dead_ends",
] as const;

export function registerMachineSetupDispatcher(server: any): void {
  server.tool(
    "prism_machine_setup",
    `Machine setup & quality: spindle analysis (load/runout/speed variation/critical speed), dynamic balancing, RTCP compensation, machine warmup/leveling/kinematics, work envelope, tool magazine optimization, fixture plate, press/shrink fit, gauging, parallelism, surface integrity, thread gages, tolerance stackup, stepover optimization, SPC, hobby CNC profiles (GRBL/LinuxCNC/Mach3/Mach4/PathPilot/Marlin/FluidNC), cobot machining safety (ISO 10218/15066).
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_machine_setup] Action: ${action} (46 actions wired)`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, MACHINE_SETUP_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_machine_setup");
        }

        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "machineSetupDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return { content: [{ type: "text", text: JSON.stringify({ blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action }) }] };
        }

        // Map action → engine key for uniform calculate() pattern
        const engineMap: Record<string, string> = {
          balancing_machine_calculate: "balancing",
          cnc_maintenance_calculate: "cncMaint",
          critical_speed_calculate: "critSpeed",
          dynamic_balance_calculate: "dynBalance",
          machine_kinematics_calculate: "kinematics",
          machine_leveling_calculate: "leveling",
          machine_warmup_calculate: "warmup",
          rtcp_compensation_calculate: "rtcp",
          spindle_load_monitor: "spindleLoad",
          spindle_runout_calculate: "spindleRunout",
          spindle_speed_variation: "spindleSpeedVar",
          work_envelope_calculate: "workEnvelope",
          tool_magazine_optimize: "toolMag",
          tool_balancing_calculate: "toolBalance",
          fixture_plate_calculate: "fixture",
          magnetic_bearing_calculate: "magBearing",
          press_fit_calculate: "pressFit",
          shrink_fit_calculate: "shrinkFit",
          gauging_calculate: "gauging",
          parallelism_calculate: "parallelism",
          tolerance_stackup_calculate: "tolStackup",
          stepover_optimize: "stepover",
          statistical_process_calculate: "statProcess",
          thread_gage_calculate: "threadGage",
        };

        // Hobby CNC actions
        if (action === "hobby_cnc_get") {
          const eng = await getEngine("hobbyCNC");
          result = eng.getMachine(params);
        } else if (action === "hobby_cnc_search") {
          const eng = await getEngine("hobbyCNC");
          result = eng.searchMachines(params);
        } else if (action === "hobby_cnc_controller") {
          const eng = await getEngine("hobbyCNC");
          result = eng.getControllerProfile(params);
        } else if (action === "hobby_cnc_compatibility") {
          const eng = await getEngine("hobbyCNC");
          result = eng.checkCompatibility(params);
        } else if (action === "hobby_cnc_recommend") {
          const eng = await getEngine("hobbyCNC");
          result = eng.recommendMachine(params);
        // Cobot machining actions
        } else if (action === "cobot_assess_safety") {
          const eng = await getEngine("cobotMachining");
          result = eng.assessSafety(params);
        } else if (action === "cobot_plan_task") {
          const eng = await getEngine("cobotMachining");
          result = eng.planMachiningTask(params);
        } else if (action === "cobot_select") {
          const eng = await getEngine("cobotMachining");
          result = eng.selectCobot(params);
        // OPC-UA Connector actions
        } else if (action === "opcua_connect") {
          const eng = await getEngine("opcua");
          result = await eng.connect(params);
        } else if (action === "opcua_disconnect") {
          const eng = await getEngine("opcua");
          result = await eng.disconnect(params);
        } else if (action === "opcua_read") {
          const eng = await getEngine("opcua");
          result = await eng.readVariable(params);
        } else if (action === "opcua_read_batch") {
          const eng = await getEngine("opcua");
          result = await eng.readMultiple(params);
        } else if (action === "opcua_subscribe") {
          const eng = await getEngine("opcua");
          result = await eng.subscribe(params);
        } else if (action === "opcua_unsubscribe") {
          const eng = await getEngine("opcua");
          result = await eng.unsubscribe(params);
        } else if (action === "opcua_browse") {
          const eng = await getEngine("opcua");
          result = await eng.browseNodes(params);
        } else if (action === "opcua_controller_profile") {
          const eng = await getEngine("opcua");
          result = eng.getControllerProfile(params);
        } else if (action === "opcua_machine_status") {
          const eng = await getEngine("opcua");
          result = await eng.getMachineStatus(params);
        } else if (action === "opcua_monitor_alarms") {
          const eng = await getEngine("opcua");
          result = await eng.monitorAlarms(params);
        // Machine Strategy Constraint actions (CAMX-MS2/U02)
        } else if (action === "machine_strategy_validate") {
          const eng = await getEngine("machineStrategyConstraint");
          result = eng.validate(params);
        } else if (action === "machine_strategy_find_best") {
          const eng = await getEngine("machineStrategyConstraint");
          result = eng.findBestMachine(params);
        } else if (action === "machine_strategy_requirements") {
          const eng = await getEngine("machineStrategyConstraint");
          result = eng.getRequirements(params);
        // Fixture Aware Strategy actions (CAMX-MS12/U07)
        } else if (action === "fixture_strategy_adjust") {
          const eng = await getEngine("fixtureAwareStrategy");
          result = eng.adjustStrategy(params);
        } else if (action === "fixture_strategy_validate") {
          const eng = await getEngine("fixtureAwareStrategy");
          result = eng.validateForFixture(params);
        } else if (action === "fixture_recommend") {
          const eng = await getEngine("fixtureAwareStrategy");
          result = eng.recommendFixture(params.feature, params.strategies);
        // Workholding Surface Inference (0-D-7a: E1085 orphan wiring)
        } else if (action === "workholding_infer_surfaces") {
          const { workholdingSurfaceInferenceEngine } = await import("../../engines/WorkholdingSurfaceInferenceEngine.js");
          result = workholdingSurfaceInferenceEngine.inferSurfaces(params as any);
        } else if (action === "workholding_track_survival") {
          const { workholdingSurfaceInferenceEngine } = await import("../../engines/WorkholdingSurfaceInferenceEngine.js");
          result = workholdingSurfaceInferenceEngine.trackSurvival(params as any);
        } else if (action === "workholding_detect_dead_ends") {
          const { workholdingSurfaceInferenceEngine } = await import("../../engines/WorkholdingSurfaceInferenceEngine.js");
          result = workholdingSurfaceInferenceEngine.detectDeadEndsDirect(params as any);
        // Special cases
        } else if (action === "surface_integrity_assess") {
          const eng = await getEngine("surfIntegrity");
          result = eng.assess?.(params) ?? eng.calculate?.(params) ?? { error: "SurfaceIntegrity method not found" };
        } else if (action === "tool_magazine_optimize") {
          const eng = await getEngine("toolMag");
          result = eng.optimize?.(params) ?? eng.calculate?.(params) ?? { error: "ToolMagazineOptimization method not found" };
        } else if (action === "spindle_load_monitor") {
          const eng = await getEngine("spindleLoad");
          result = eng.monitor?.(params) ?? eng.calculate?.(params) ?? { error: "SpindleLoadMonitor method not found" };
        } else if (action === "stepover_optimize") {
          const eng = await getEngine("stepover");
          result = eng.optimize?.(params) ?? eng.calculate?.(params) ?? { error: "StepoverOptimization method not found" };
        } else {
          const engineKey = engineMap[action];
          if (!engineKey) {
            result = { error: `Unknown action: ${action}` };
          } else {
            const eng = await getEngine(engineKey);
            result = eng.calculate?.(params) ?? eng.compute?.(params) ?? { error: `${engineKey} method not found` };
          }
        }

        try {
          await hookExecutor.execute("post-calculation", { ...hookCtx, metadata: { ...hookCtx.metadata, result } });
        } catch (postErr) {
          log.warn(`[prism_machine_setup] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_machine_setup");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
