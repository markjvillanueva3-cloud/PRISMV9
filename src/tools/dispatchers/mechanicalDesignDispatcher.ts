/**
 * prism_mechanical — Mechanical Design Dispatcher
 *
 * 51 actions covering: ball screws, bearings, belt/chain drives, gears (bevel/hypoid/planetary/worm/harmonic/cycloid/rack-pinion),
 *   bolted/riveted/spline joints, cams, clutches, couplings, brakes, springs, shafts, linear motion, flywheels, gaskets, seals, etc.
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { MECHANICAL_DESIGN_ACTION_SCHEMAS } from "../../schemas/mechanicalDesignActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

// Engine cache - all lazy loaded
const engineCache: Record<string, any> = {};

async function getEngine(name: string, file: string, exportName: string): Promise<any> {
  if (!engineCache[name]) {
    const mod = await import(`../../engines/${file}.js`);
    engineCache[name] = mod[exportName];
  }
  return engineCache[name];
}

// Map action → [engineFile, exportName, method]
const ACTION_MAP: Record<string, [string, string, string]> = {
  ball_screw_calculate: ["BallScrewEngine", "ballScrewEngine", "calculate"],
  ball_screw_select: ["BallScrewSelectionEngine", "ballScrewSelectionEngine", "calculate"],
  bearing_select: ["BearingSelectionEngine", "bearingSelectionEngine", "calculate"],
  belt_drive_calculate: ["BeltDriveEngine", "beltDriveEngine", "calculate"],
  bevel_gear_calculate: ["BevelGearEngine", "bevelGearEngine", "calculate"],
  bolt_torque_calculate: ["BoltTorqueEngine", "boltTorqueEngine", "calculate"],
  bolted_joint_calculate: ["BoltedJointEngine", "boltedJointEngine", "calculate"],
  cam_design_calculate: ["CamDesignEngine", "camDesignEngine", "calculate"],
  cam_profile_calculate: ["CamProfileEngine", "camProfileEngine", "calculate"],
  chain_drive_calculate: ["ChainDriveEngine", "chainDriveEngine", "calculate"],
  clutch_design_calculate: ["ClutchDesignEngine", "clutchDesignEngine", "calculate"],
  coupling_calculate: ["CouplingEngine", "couplingEngine", "calculate"],
  coupling_select: ["CouplingSelectionEngine", "couplingSelectionEngine", "calculate"],
  crankshaft_design: ["CrankshaftDesignEngine", "crankshaftDesignEngine", "calculate"],
  flywheel_calculate: ["FlywheelEngine", "flywheelEngine", "calculate"],
  gasket_design_calculate: ["GasketDesignEngine", "gasketDesignEngine", "calculate"],
  gear_train_calculate: ["GearTrainEngine", "gearTrainEngine", "calculate"],
  harmonic_drive_calculate: ["HarmonicDriveEngine", "harmonicDriveEngine", "calculate"],
  hypoid_gear_calculate: ["HypoidGearEngine", "hypoidGearEngine", "calculate"],
  journal_bearing_calculate: ["JournalBearingEngine", "journalBearingEngine", "calculate"],
  keyway_design_calculate: ["KeywayDesignEngine", "keywayDesignEngine", "calculate"],
  keyway_stress_calculate: ["KeywayStressEngine", "keywayStressEngine", "calculate"],
  lead_screw_calculate: ["LeadScrewEngine", "leadScrewEngine", "calculate"],
  leaf_spring_calculate: ["LeafSpringEngine", "leafSpringEngine", "calculate"],
  linear_guide_calculate: ["LinearGuideEngine", "linearGuideEngine", "calculate"],
  linear_motion_calculate: ["LinearMotionEngine", "linearMotionEngine", "calculate"],
  planetary_gear_calculate: ["PlanetaryGearEngine", "planetaryGearEngine", "calculate"],
  rack_pinion_calculate: ["RackPinionEngine", "rackPinionEngine", "calculate"],
  rolling_bearing_calculate: ["RollingBearingEngine", "rollingBearingEngine", "calculate"],
  rolling_contact_calculate: ["RollingContactEngine", "rollingContactEngine", "calculate"],
  seal_select: ["SealSelectionEngine", "sealSelectionEngine", "calculate"],
  shaft_alignment_calculate: ["ShaftAlignmentEngine", "shaftAlignmentEngine", "calculate"],
  shock_absorber_calculate: ["ShockAbsorberEngine", "shockAbsorberEngine", "calculate"],
  spline_joint_calculate: ["SplineJointEngine", "splineJointEngine", "calculate"],
  spline_stress_calculate: ["SplineStressEngine", "splineStressEngine", "calculate"],
  spring_calculate: ["SpringCalcEngine", "springCalcEngine", "calculate"],
  spring_design: ["SpringDesignEngine", "springDesignEngine", "calculate"],
  torsion_bar_calculate: ["TorsionBarEngine", "torsionBarEngine", "calculate"],
  worm_gear_calculate: ["WormGearEngine", "wormGearEngine", "calculate"],
  disk_brake_calculate: ["DiskBrakeEngine", "diskBrakeEngine", "calculate"],
  drum_brake_calculate: ["DrumBrakeEngine", "drumBrakeEngine", "calculate"],
  rivet_joint_calculate: ["RivetJointEngine", "rivetJointEngine", "calculate"],
  flange_bolt_calculate: ["FlangeBoltEngine", "flangeBoltEngine", "calculate"],
  cycloid_drive_calculate: ["CycloidDriveEngine", "cycloidDriveEngine", "calculate"],
  connecting_rod_calculate: ["ConnectingRodEngine", "connectingRodEngine", "calculate"],
  piston_design_calculate: ["PistonDesignEngine", "pistonDesignEngine", "calculate"],
  screw_jack_calculate: ["ScrewJackEngine", "screwJackEngine", "calculate"],
  gear_pump_calculate: ["GearPumpEngine", "gearPumpEngine", "calculate"],
  clutch_brake_calculate: ["ClutchBrakeEngine", "clutchBrakeEngine", "calculate"],
  hertz_contact_calculate: ["HertzContactEngine", "hertzContactEngine", "calculate"],
  column_buckling_calculate: ["ColumnBucklingEngine", "columnBucklingEngine", "calculate"],
  capacitor_bank_calculate: ["CapacitorBankEngine", "capacitorBankEngine", "calculate"],
  cathodic_protection_calculate: ["CathodicProtectionEngine", "cathodicProtectionEngine", "calculate"],
};

const ACTIONS = Object.keys(ACTION_MAP) as unknown as readonly string[];

export function registerMechanicalDesignDispatcher(server: any): void {
  server.tool(
    "prism_mechanical",
    `Mechanical design: ball screws, bearings (journal/rolling), belt/chain drives, gears (spur/bevel/hypoid/planetary/worm/harmonic/cycloid/rack-pinion), bolted/riveted/spline joints, cams, clutches/brakes (disk/drum), couplings, springs (compression/extension/torsion), shafts, linear guides/motion, flywheels, gaskets, seals, shock absorbers, Hertz contact, column buckling. 51 actions.
Actions: ${Object.keys(ACTION_MAP).join(", ")}.`,
    { action: z.string(), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_mechanical] Action: ${action} (51 actions wired)`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, MECHANICAL_DESIGN_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_mechanical");
        }

        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "mechanicalDesignDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return { content: [{ type: "text", text: JSON.stringify({ blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action }) }] };
        }

        const mapping = ACTION_MAP[action];
        if (!mapping) {
          result = { error: `Unknown action: ${action}. Available: ${Object.keys(ACTION_MAP).join(", ")}` };
        } else {
          const [file, exportName, method] = mapping;
          const eng = await getEngine(action, file, exportName);
          result = eng[method]?.(params) ?? eng.compute?.(params) ?? { error: `${file} method '${method}' not found` };
        }

        try {
          await hookExecutor.execute("post-calculation", { ...hookCtx, metadata: { ...hookCtx.metadata, result } });
        } catch (postErr) {
          log.warn(`[prism_mechanical] Post-hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_mechanical");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
