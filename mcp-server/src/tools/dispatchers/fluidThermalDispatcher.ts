/**
 * prism_fluid_thermal — Fluid, Thermal & Material Science Dispatcher
 *
 * 48 actions covering: heat exchangers, pumps, piping, hydraulic/pneumatic cylinders,
 *   valves, compressors, fans, nozzles, cooling towers, ventilation, tank design,
 *   water hammer, furnace heating, thermal expansion/fatigue, corrosion, creep, fracture,
 *   Coriolis/ultrasonic flowmeters, diaphragm/vane pumps, diffusers, ejectors, impellers,
 *   reciprocating/screw/scroll compressors, spray dryers, RTDs, thermocouples
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { FLUID_THERMAL_ACTION_SCHEMAS } from "../../schemas/fluidThermalActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

const engineCache: Record<string, any> = {};

async function getEngine(name: string, file: string, exportName: string): Promise<any> {
  if (!engineCache[name]) {
    const mod = await import(`../../engines/${file}.js`);
    engineCache[name] = mod[exportName];
  }
  return engineCache[name];
}

export const ACTION_MAP: Record<string, [string, string, string]> = {
  heat_exchanger_calculate: ["HeatExchangerEngine", "heatExchangerEngine", "calculate"],
  heat_exchanger_plate_calculate: ["HeatExchangerPlateEngine", "heatExchangerPlateEngine", "calculate"],
  pump_select: ["PumpSelectionEngine", "pumpSelectionEngine", "calculate"],
  centrifugal_pump_calculate: ["CentrifugalPumpEngine", "centrifugalPumpEngine", "calculate"],
  pipe_sizing_calculate: ["PipeSizingEngine", "pipeSizingEngine", "calculate"],
  pipe_stress_calculate: ["PipeStressEngine", "pipeStressEngine", "calculate"],
  piping_pressure_calculate: ["PipingPressureEngine", "pipingPressureEngine", "calculate"],
  hydraulic_cylinder_calculate: ["HydraulicCylinderEngine", "hydraulicCylinderEngine", "calculate"],
  hydraulic_motor_calculate: ["HydraulicMotorEngine", "hydraulicMotorEngine", "calculate"],
  hydraulic_press_calculate: ["HydraulicPressEngine", "hydraulicPressEngine", "calculate"],
  pneumatic_cylinder_calculate: ["PneumaticCylinderEngine", "pneumaticCylinderEngine", "calculate"],
  valve_design_calculate: ["ValveDesignEngine", "valveDesignEngine", "calculate"],
  valve_sizing_calculate: ["ValveSizingEngine", "valveSizingEngine", "calculate"],
  compressor_design_calculate: ["CompressorDesignEngine", "compressorDesignEngine", "calculate"],
  fan_select: ["FanSelectionEngine", "fanSelectionEngine", "calculate"],
  nozzle_calculate: ["NozzleEngine", "nozzleEngine", "calculate"],
  cooling_tower_calculate: ["CoolingTowerEngine", "coolingTowerEngine", "calculate"],
  condenser_calculate: ["CondenserDesignEngine", "condenserDesignEngine", "calculate"],
  evaporator_calculate: ["EvaporatorDesignEngine", "evaporatorDesignEngine", "calculate"],
  venturi_calculate: ["VenturiEngine", "venturiEngine", "calculate"],
  orifice_flowmeter_calculate: ["OrificeFlowMeterEngine", "orificeFlowMeterEngine", "calculate"],
  air_compressor_calculate: ["AirCompressorEngine", "airCompressorEngine", "calculate"],
  air_duct_calculate: ["AirDuctEngine", "airDuctEngine", "calculate"],
  blower_calculate: ["BlowerEngine", "blowerEngine", "calculate"],
  tank_design_calculate: ["TankDesignEngine", "tankDesignEngine", "calculate"],
  water_hammer_calculate: ["WaterHammerEngine", "waterHammerEngine", "calculate"],
  furnace_heating_calculate: ["FurnaceHeatingEngine", "furnaceHeatingEngine", "calculate"],
  absorption_chiller_calculate: ["AbsorptionChillerEngine", "absorptionChillerEngine", "calculate"],
  accumulator_calculate: ["AccumulatorEngine", "accumulatorEngine", "calculate"],
  boiler_tube_calculate: ["BoilerTubeEngine", "boilerTubeEngine", "calculate"],
  thermal_expansion_joint_calculate: ["ThermalExpansionJointEngine", "thermalExpansionJointEngine", "calculate"],
  thermal_fatigue_calculate: ["ThermalFatigueEngine", "thermalFatigueEngine", "calculate"],
  corrosion_rate_calculate: ["CorrosionRateEngine", "corrosionRateEngine", "calculate"],
  creep_life_calculate: ["CreepLifeEngine", "creepLifeEngine", "calculate"],
  fracture_toughness_calculate: ["FractureToughnessEngine", "fractureToughnessEngine", "calculate"],
  coriolis_flowmeter_calculate: ["CoriolisFlowMeterEngine", "coriolisFlowMeterEngine", "calculate"],
  diaphragm_pump_calculate: ["DiaphragmPumpEngine", "diaphragmPumpEngine", "calculate"],
  diffuser_calculate: ["DiffuserEngine", "diffuserEngine", "calculate"],
  ejector_calculate: ["EjectorEngine", "ejectorEngine", "calculate"],
  impeller_calculate: ["ImpellerEngine", "impellerEngine", "calculate"],
  reciprocating_compressor_calculate: ["ReciprocatingCompressorEngine", "reciprocatingCompressorEngine", "calculate"],
  rtd_calculate: ["RTDEngine", "rtdEngine", "calculate"],
  screw_compressor_calculate: ["ScrewCompressorEngine", "screwCompressorEngine", "calculate"],
  scroll_compressor_calculate: ["ScrollCompressorEngine", "scrollCompressorEngine", "calculate"],
  spray_dryer_calculate: ["SprayDryerEngine", "sprayDryerEngine", "calculate"],
  thermocouple_calculate: ["ThermocoupleEngine", "thermocoupleEngine", "calculate"],
  ultrasonic_flowmeter_calculate: ["UltrasonicFlowMeterEngine", "ultrasonicFlowMeterEngine", "calculate"],
  vane_pump_calculate: ["VanePumpEngine", "vanePumpEngine", "calculate"],
  fluidized_bed_calculate: ["FluidizedBedEngine", "fluidizedBedEngine", "calculate"],
  vacuum_pump_calculate: ["VacuumPumpEngine", "vacuumPumpEngine", "calculate"],
  peristaltic_pump_calculate: ["PeristalticPumpEngine", "peristalticPumpEngine", "calculate"],
  progressive_cavity_pump_calculate: ["ProgressiveCavityPumpEngine", "progressiveCavityPumpEngine", "calculate"],
  axial_piston_pump_calculate: ["AxialPistonPumpEngine", "axialPistonPumpEngine", "calculate"],
};

const ACTIONS = Object.keys(ACTION_MAP);

export function registerFluidThermalDispatcher(server: any): void {
  server.tool(
    "prism_fluid_thermal",
    `Fluid, thermal & material science: heat exchangers (shell-tube/plate), pumps (centrifugal/diaphragm/vane/selection), piping (sizing/stress/pressure drop), hydraulic cylinders/motors/presses, pneumatic cylinders, valves (design/sizing), compressors (reciprocating/screw/scroll/air), fans, nozzles, cooling towers, condensers, evaporators, flowmeters (Venturi/orifice/Coriolis/ultrasonic), air ducts, diffusers, ejectors, impellers, spray dryers, tank design, water hammer, furnace heating, thermal expansion/fatigue, temperature sensors (RTD/thermocouple), corrosion rate, creep life, fracture toughness, fluidized beds, vacuum/peristaltic/progressive-cavity/axial-piston pumps. 53 actions.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.string(), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_fluid_thermal] Action: ${action} (53 actions wired)`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, FLUID_THERMAL_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_fluid_thermal");
        }

        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "fluidThermalDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return { content: [{ type: "text", text: JSON.stringify({ blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action }) }] };
        }

        const mapping = ACTION_MAP[action];
        if (!mapping) {
          result = { error: `Unknown action: ${action}. Available: ${ACTIONS.join(", ")}` };
        } else {
          const [file, exportName, method] = mapping;
          const eng = await getEngine(action, file, exportName);
          result = eng[method]?.(params) ?? eng.compute?.(params) ?? { error: `${file} method '${method}' not found` };
        }

        try {
          await hookExecutor.execute("post-calculation", { ...hookCtx, metadata: { ...hookCtx.metadata, result } });
        } catch (postErr) {
          log.warn(`[prism_fluid_thermal] Post-hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_fluid_thermal");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
