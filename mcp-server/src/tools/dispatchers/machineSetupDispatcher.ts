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
  "machine_warmup_calculate", "machine_warmup_with_laser_interferometer", "rtcp_compensation_calculate",
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
  "handbook_get", "handbook_search", "handbook_list", "handbook_stats",
  "handbook_extract", "handbook_acquire", "handbook_batch_acquire",
  "alarm_intelligence_lookup", "alarm_intelligence_search", "alarm_intelligence_index", "alarm_intelligence_stats",
  "machine_capability_lookup", "machine_capability_query", "machine_capability_reconcile", "machine_capability_stats",
  "maintenance_schedule", "maintenance_parts_bom", "maintenance_cost_estimate", "maintenance_calendar", "maintenance_compare",
  // HBK-MS10: Handbook intelligence + controller programming
  "handbook_lookup", "handbook_ingest", "handbook_coverage", "handbook_compare",
  "controller_programming_profile", "controller_custom_codes", "controller_macro_variables",
  "controller_validate_dialect", "controller_enrichment_patch",
] as const;

export function registerMachineSetupDispatcher(server: any): void {
  server.tool(
    "prism_machine_setup",
    `Machine setup & quality: spindle analysis (load/runout/speed variation/critical speed), dynamic balancing, RTCP compensation, machine warmup/leveling/kinematics, work envelope, tool magazine optimization, fixture plate, press/shrink fit, gauging, parallelism, surface integrity, thread gages, tolerance stackup, stepover optimization, SPC, hobby CNC profiles (GRBL/LinuxCNC/Mach3/Mach4/PathPilot/Marlin/FluidNC), cobot machining safety (ISO 10218/15066).
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_machine_setup] Action: ${action} (${ACTIONS.length} actions wired)`);
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
          surface_integrity_assess: "surfIntegrity",
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

        // ── HBK: Machine Handbook Registry + Extraction actions (H1 fix: inside main chain) ──
        } else if (action === "handbook_get") {
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = params.machine_id
            ? machineHandbookRegistry.getByMachineId(params.machine_id as string)
            : machineHandbookRegistry.get(params.id as string);
          result = result ?? { error: "Handbook not found" };
        } else if (action === "handbook_search") {
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = machineHandbookRegistry.search(params as any);
        } else if (action === "handbook_list") {
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = machineHandbookRegistry.list();
        } else if (action === "handbook_stats") {
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = machineHandbookRegistry.stats();
        } else if (action === "handbook_extract") {
          const { extractHandbook } = await import("../../engines/HandbookExtractionEngine.js");
          result = extractHandbook(params as any);
        } else if (action === "handbook_acquire") {
          const { acquireHandbook, HandbookIntakeSchema } = await import("../../engines/HandbookAcquisitionPipelineEngine.js");
          const validated = HandbookIntakeSchema.parse(params);
          const batchId = `single-${Date.now()}`;
          result = acquireHandbook(validated, batchId, !!(params as any).dryRun, !!(params as any).forceOverwrite);
        } else if (action === "handbook_batch_acquire") {
          const { batchAcquire } = await import("../../engines/HandbookAcquisitionPipelineEngine.js");
          result = batchAcquire(params as any);

        // ── HBK-MS3: Alarm Intelligence ──
        } else if (action === "alarm_intelligence_lookup") {
          const { alarmIntelligenceEngine, AlarmLookupEnhancedSchema } = await import("../../engines/AlarmIntelligenceEngine.js");
          const validated = AlarmLookupEnhancedSchema.parse(params);
          result = alarmIntelligenceEngine.lookupAlarmEnhanced(validated);
        } else if (action === "alarm_intelligence_search") {
          const { alarmIntelligenceEngine, AlarmSearchSchema } = await import("../../engines/AlarmIntelligenceEngine.js");
          const validated = AlarmSearchSchema.parse(params);
          result = alarmIntelligenceEngine.searchAlarmIntelligence(validated.query, validated.machine_id, validated.limit);
        } else if (action === "alarm_intelligence_index") {
          const { alarmIntelligenceEngine, AlarmIndexQuerySchema } = await import("../../engines/AlarmIntelligenceEngine.js");
          const validated = AlarmIndexQuerySchema.parse(params);
          result = alarmIntelligenceEngine.queryAlarmIndex(validated);
        } else if (action === "alarm_intelligence_stats") {
          const { alarmIntelligenceEngine } = await import("../../engines/AlarmIntelligenceEngine.js");
          result = alarmIntelligenceEngine.getAlarmIntelligenceStats();

        // ── HBK-MS4: Machine Capability Intelligence ──
        } else if (action === "machine_capability_lookup") {
          const { machineCapabilityIntelligenceEngine, CapabilityLookupSchema } = await import("../../engines/MachineCapabilityIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          const { MACHINE_TORQUE_CURVES } = await import("../../data/machine-torque-curves.js");
          const { SPINDLE_CORRECTIONS } = await import("../../data/machine-spindle-corrections.js");
          const validated = CapabilityLookupSchema.parse(params);
          result = machineCapabilityIntelligenceEngine.getProfile(validated, {
            handbookRegistry: machineHandbookRegistry,
            torqueCurves: MACHINE_TORQUE_CURVES,
            spindleCorrections: SPINDLE_CORRECTIONS,
            machineRegistry: null,
          });
        } else if (action === "machine_capability_reconcile") {
          const { machineCapabilityIntelligenceEngine, ReconciliationSchema } = await import("../../engines/MachineCapabilityIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          const { MACHINE_TORQUE_CURVES } = await import("../../data/machine-torque-curves.js");
          const { SPINDLE_CORRECTIONS } = await import("../../data/machine-spindle-corrections.js");
          const validated = ReconciliationSchema.parse(params);
          result = machineCapabilityIntelligenceEngine.reconcile(validated, {
            handbookRegistry: machineHandbookRegistry,
            torqueCurves: MACHINE_TORQUE_CURVES,
            spindleCorrections: SPINDLE_CORRECTIONS,
            machineRegistry: null,
          });
        } else if (action === "machine_capability_query") {
          const { machineCapabilityIntelligenceEngine, CapabilityQuerySchema, CapabilityLookupSchema } = await import("../../engines/MachineCapabilityIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          const { MACHINE_TORQUE_CURVES } = await import("../../data/machine-torque-curves.js");
          const { SPINDLE_CORRECTIONS } = await import("../../data/machine-spindle-corrections.js");
          const validated = CapabilityQuerySchema.parse(params);
          // Filter machines from torque curve keys + handbook list
          const allIds = new Set([
            ...Object.keys(MACHINE_TORQUE_CURVES).filter(id => (MACHINE_TORQUE_CURVES as any)[id]?.source !== "skip"),
            ...machineHandbookRegistry.list().map((h: any) => h.machine_id),
          ]);
          const deps = { handbookRegistry: machineHandbookRegistry, torqueCurves: MACHINE_TORQUE_CURVES, spindleCorrections: SPINDLE_CORRECTIONS, machineRegistry: null };
          const matches: any[] = [];
          for (const id of allIds) {
            if (matches.length >= (validated.limit ?? 20)) break;
            const profile = machineCapabilityIntelligenceEngine.getProfile({ machine_id: id }, deps);
            if (!profile.spindle && profile.axes.length === 0) continue;
            if (validated.manufacturer && !profile.manufacturer?.toLowerCase().includes(validated.manufacturer.toLowerCase())) continue;
            if (validated.min_spindle_rpm && (!profile.spindle || profile.spindle.max_rpm.value < validated.min_spindle_rpm)) continue;
            if (validated.min_power_kw && (!profile.spindle || profile.spindle.power_continuous_kw.value < validated.min_power_kw)) continue;
            if (validated.min_torque_nm && (!profile.spindle || profile.spindle.torque_max_nm.value < validated.min_torque_nm)) continue;
            if (validated.simultaneous_axes && (!profile.simultaneous_axes || profile.simultaneous_axes.value < validated.simultaneous_axes)) continue;
            matches.push({ machine_id: id, manufacturer: profile.manufacturer, model: profile.model, spindle_rpm: profile.spindle?.max_rpm.value, power_kw: profile.spindle?.power_continuous_kw.value, torque_nm: profile.spindle?.torque_max_nm.value, axes: profile.axes.length, confidence: profile.avg_confidence });
          }
          result = { total: matches.length, machines: matches };
        } else if (action === "machine_capability_stats") {
          const { machineCapabilityIntelligenceEngine } = await import("../../engines/MachineCapabilityIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          const { MACHINE_TORQUE_CURVES } = await import("../../data/machine-torque-curves.js");
          // Note: spindle corrections are not enumerated separately in stats — they are
          // corrections to machines already tracked via torque curves or registry, not standalone entries.
          result = machineCapabilityIntelligenceEngine.getStats({
            handbookRegistry: machineHandbookRegistry,
            torqueCurves: MACHINE_TORQUE_CURVES,
            machineRegistry: null,
          });

        // ── HBK-MS5: Maintenance Intelligence ──
        } else if (action === "maintenance_schedule") {
          const { handbookMaintenanceIntelligenceEngine } = await import("../../engines/HandbookMaintenanceIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = handbookMaintenanceIntelligenceEngine.getMaintenanceSchedule(params.machine_id, machineHandbookRegistry);
        } else if (action === "maintenance_parts_bom") {
          const { handbookMaintenanceIntelligenceEngine } = await import("../../engines/HandbookMaintenanceIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = handbookMaintenanceIntelligenceEngine.getPartsBOM(params.machine_id, machineHandbookRegistry);
        } else if (action === "maintenance_cost_estimate") {
          const { handbookMaintenanceIntelligenceEngine, MaintenanceCostConfigSchema } = await import("../../engines/HandbookMaintenanceIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          const validated = MaintenanceCostConfigSchema.parse(params);
          result = handbookMaintenanceIntelligenceEngine.estimateAnnualCost(validated, machineHandbookRegistry);
        } else if (action === "maintenance_calendar") {
          const { handbookMaintenanceIntelligenceEngine } = await import("../../engines/HandbookMaintenanceIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = handbookMaintenanceIntelligenceEngine.getMaintenanceCalendar(params.machine_id, machineHandbookRegistry);
        } else if (action === "maintenance_compare") {
          const { handbookMaintenanceIntelligenceEngine } = await import("../../engines/HandbookMaintenanceIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = handbookMaintenanceIntelligenceEngine.compareMachines(params.machine_ids ?? [], machineHandbookRegistry, params);

        // ── HBK-MS10: Handbook Intelligence Actions ──
        } else if (action === "handbook_lookup") {
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          const hbk = machineHandbookRegistry.getByMachineId(params.machine_id);
          if (!hbk) { result = { error: `No handbook found for machine ${params.machine_id}` }; }
          else if (params.section) {
            result = { machine_id: params.machine_id, section: params.section, data: (hbk as any)[params.section] ?? null };
          } else {
            result = { machine_id: params.machine_id, sections: Object.keys(hbk).filter(k => !["id", "version", "created_at", "updated_at"].includes(k)) };
          }
        } else if (action === "handbook_ingest") {
          const { handbookAcquisitionPipelineEngine } = await import("../../engines/HandbookAcquisitionPipelineEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = handbookAcquisitionPipelineEngine.acquireHandbook({
            rawText: params.raw_text ?? "",
            machineId: params.machine_id,
            manufacturer: params.manufacturer ?? "Unknown",
            model: params.model ?? "Unknown",
            extractionMethod: params.format ?? "manual",
            handbookTitle: params.handbook_title,
          }, `ingest-${Date.now()}`);
        } else if (action === "handbook_coverage") {
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          const allHandbooks = machineHandbookRegistry.list();
          const total = 910; // fleet size from MachineRegistry
          const ingested = allHandbooks.length;
          const sections = ["controller_features", "alarm_codes", "maintenance_schedule", "parts_book", "safety_limits", "programming_tips"];
          const sectionCoverage: Record<string, number> = {};
          for (const sec of sections) {
            sectionCoverage[sec] = allHandbooks.filter((h: any) => h[sec] && (Array.isArray(h[sec]) ? h[sec].length > 0 : Object.keys(h[sec]).length > 0)).length;
          }
          result = { fleet_size: total, handbooks_ingested: ingested, coverage_pct: Math.round((ingested / total) * 1000) / 10, section_coverage: sectionCoverage };
        } else if (action === "handbook_compare") {
          const { machineCapabilityIntelligenceEngine } = await import("../../engines/MachineCapabilityIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          const { MACHINE_TORQUE_CURVES } = await import("../../data/machine-torque-curves.js");
          const { SPINDLE_CORRECTIONS } = await import("../../data/machine-spindle-corrections.js");
          const ids = params.machine_ids ?? [];
          const deps = { handbookRegistry: machineHandbookRegistry, torqueCurves: MACHINE_TORQUE_CURVES, spindleCorrections: SPINDLE_CORRECTIONS, machineRegistry: null };
          const profiles = ids.map((id: string) => ({ machine_id: id, profile: machineCapabilityIntelligenceEngine.getProfile({ machine_id: id }, deps) }));
          result = { comparison: profiles, count: profiles.length };

        // ── HBK-MS6: Controller Programming Intelligence ──
        } else if (action === "controller_programming_profile") {
          const { controllerProgrammingIntelligenceEngine } = await import("../../engines/ControllerProgrammingIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = controllerProgrammingIntelligenceEngine.getProfile({ machine_id: params.machine_id, validate_dialect: params.validate_dialect }, machineHandbookRegistry as any);
        } else if (action === "controller_custom_codes") {
          const { controllerProgrammingIntelligenceEngine } = await import("../../engines/ControllerProgrammingIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = controllerProgrammingIntelligenceEngine.getCustomCodes(params.machine_id, machineHandbookRegistry as any);
        } else if (action === "controller_macro_variables") {
          const { controllerProgrammingIntelligenceEngine } = await import("../../engines/ControllerProgrammingIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = controllerProgrammingIntelligenceEngine.getMacroVariables(params.machine_id, machineHandbookRegistry as any);
        } else if (action === "controller_validate_dialect") {
          const { controllerProgrammingIntelligenceEngine } = await import("../../engines/ControllerProgrammingIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = controllerProgrammingIntelligenceEngine.validateAgainstDialect(params.machine_id, machineHandbookRegistry as any);
        } else if (action === "controller_enrichment_patch") {
          const { controllerProgrammingIntelligenceEngine } = await import("../../engines/ControllerProgrammingIntelligenceEngine.js");
          const { machineHandbookRegistry } = await import("../../engines/MachineHandbookRegistryEngine.js");
          result = controllerProgrammingIntelligenceEngine.getEnrichmentPatch(params.machine_id, machineHandbookRegistry as any);

        // ── U-DEA-november-P04: warmup + laser-interferometer overlay orchestrator ──
        } else if (action === "machine_warmup_with_laser_interferometer") {
          const { machineWarmupEngine } = await import("../../engines/MachineWarmupEngine.js");
          type WarmupOverlayInput = Parameters<typeof machineWarmupEngine.calculateWithLaserInterferometer>[1];
          const rawOverlay = (params.laser_overlay ?? params.laserOverlay ?? null) as Record<string, unknown> | null;
          let overlay: WarmupOverlayInput | undefined;
          if (rawOverlay) {
            overlay = {
              wavelength: (rawOverlay.wavelength ?? undefined) as WarmupOverlayInput extends { wavelength?: infer W } ? W : never,
              comp_table: (rawOverlay.comp_table ?? rawOverlay.compTable ?? undefined) as WarmupOverlayInput extends { comp_table?: infer C } ? C : never,
              deadpath_length_mm: rawOverlay.deadpath_length_mm !== undefined
                ? Number(rawOverlay.deadpath_length_mm)
                : rawOverlay.deadpathLengthMm !== undefined
                  ? Number(rawOverlay.deadpathLengthMm)
                  : undefined,
              target_accuracy_um: rawOverlay.target_accuracy_um !== undefined
                ? Number(rawOverlay.target_accuracy_um)
                : rawOverlay.targetAccuracyUm !== undefined
                  ? Number(rawOverlay.targetAccuracyUm)
                  : undefined,
            };
          }
          result = machineWarmupEngine.calculateWithLaserInterferometer(params as Parameters<typeof machineWarmupEngine.calculateWithLaserInterferometer>[0], overlay);

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
