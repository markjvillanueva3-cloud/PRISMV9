/**
 * MCAT-MS0 P2-U02: Machine Capability Surface Engine
 *
 * Surfaces controller capabilities, spindle packages, and coolant strategies
 * directly from the machine-package truth model for calculator and downstream
 * consumer use.
 *
 * Key features:
 * - Unified capability queries across all machine packages
 * - Controller feature matrix (G-codes, M-codes, macros, canned cycles)
 * - Spindle package specifications (power curves, torque, speed ranges)
 * - Coolant strategy compatibility (through-spindle, flood, mist, MQL)
 * - Capability comparison across machines
 *
 * @module engines/MachineCapabilitySurfaceEngine
 * @milestone MCAT-MS0/P2-U02
 */

import { log } from "../utils/Logger.js";
import type { CanonicalMachinePackage, CanonicalMachineType } from "../types/MachinePackage.js";
import {
  machineGeometricAccuracyEngine,
  type AxisErrors6DOF,
  type SquarenessErrors,
  type BallBarMeasuredPoint,
  type VolumetricAccuracyOutput,
  type AbbeOffsetOutput,
  type BallBarOutput,
} from "./MachineGeometricAccuracyEngine.js";
import type { MachineAxisTopology } from "../contracts/userMachineProfile.js";
import { machineService } from "../services/MachineService.js";
import { machineVocabularyNormalizerEngine } from "./MachineVocabularyNormalizerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ControllerCapabilities {
  machineId: string;
  controllerFamily: string;
  controllerModel?: string;
  vendor: string;
  features: ControllerFeatureSet;
  programmingDialect: string;
  macroSupport: MacroCapabilities;
  cannedCycles: string[];
  customMCodes: string[];
  customGCodes: string[];
  limitations: string[];
}

export interface ControllerFeatureSet {
  highSpeedMachining: boolean;
  lookAhead: number;
  nanoSmoothing: boolean;
  aiContour: boolean;
  conversationalProgramming: boolean;
  toolLifeManagement: boolean;
  adaptiveControl: boolean;
  collisionAvoidance: boolean;
  thermalCompensation: boolean;
  volumetricCompensation: boolean;
}

export interface MacroCapabilities {
  supported: boolean;
  type: "fanuc" | "haas" | "siemens" | "mazak" | "okuma" | "custom" | "none";
  variableRange?: { min: number; max: number };
  localVariables: number;
  commonVariables: number;
  systemVariables: boolean;
}

export interface SpindlePackage {
  machineId: string;
  spindleId: string;
  type: "belt" | "gear" | "direct" | "motorized" | "electrospindle";
  maxRpm: number;
  minRpm: number;
  ratedPower: number;
  peakPower?: number;
  continuousTorque: number;
  peakTorque?: number;
  taper: string;
  bearingType: string;
  coolingType: string;
  powerCurve?: PowerCurvePoint[];
  speedRanges?: SpeedRange[];
  limitations: string[];
}

export interface PowerCurvePoint {
  rpm: number;
  power: number;
  torque: number;
}

export interface SpeedRange {
  name: string;
  minRpm: number;
  maxRpm: number;
  gearRatio?: number;
}

export interface CoolantStrategy {
  machineId: string;
  strategies: CoolantOption[];
  defaultStrategy: string;
  throughSpindleCapable: boolean;
  throughToolCapable: boolean;
  maxPressure: number;
  pressureUnit: "bar" | "psi";
  flowRate?: number;
  tankCapacity?: number;
  filtration: string;
}

export interface CoolantOption {
  id: string;
  type: "flood" | "mist" | "mql" | "through_spindle" | "through_tool" | "cryogenic" | "air" | "dry";
  pressure?: number;
  available: boolean;
  standard: boolean;
  priceAdder?: number;
}

export interface CapabilitySummary {
  machineId: string;
  manufacturer: string;
  model: string;
  type: string;
  controller: ControllerCapabilities;
  spindle: SpindlePackage;
  coolant: CoolantStrategy;
  overallCapabilityScore: number;
}

/**
 * U-DEA-november-P02: Accuracy envelope attached to a capability summary.
 *
 * Activates MachineGeometricAccuracyEngine (volumetric/abbe/ballbar) at the
 * point where downstream physics (deflection, thermal, surface finish) asks
 * for a machine's capability — so they consume REAL accuracy bounds rather
 * than nominals. All fields are optional: when no measured data + no controller
 * default is available, the field is `null` and `accuracy_source` flags it.
 */
export interface CapabilityWithAccuracy extends CapabilitySummary {
  accuracy: {
    /** Volumetric accuracy envelope (max/mean/p95) over the work envelope. */
    volumetric: {
      max_um: number;
      mean_um: number;
      p95_um: number;
      max_location: { x: number; y: number; z: number };
    } | null;
    /** Per-axis Abbe error contribution at a configured offset distance. */
    abbe: Array<{
      axis: string;
      abbe_error_um: number;
      contribution_pct: number;
      recommendation: string;
    }>;
    /** Ball-bar circularity + servo/backlash/squareness diagnosis. */
    ballBar: {
      circularity_um: number;
      servo_mismatch_um: number;
      squareness_error_urad: number;
      scaling_error_ppm: number;
      reversal_spike_um: number;
      diagnosed_issues: string[];
    } | null;
  };
  /**
   * Provenance of the accuracy envelope:
   *  - 'measured' when caller supplied real calibration data
   *  - 'controller-default' when defaults from the controller tier are used (ISO 230-2 typical bands)
   *  - 'no-data' when neither was available; downstream consumers should treat as unbounded.
   */
  accuracy_source: "measured" | "controller-default" | "no-data";
}

/** Optional measured-accuracy inputs the caller can supply to override defaults. */
export interface CapabilityAccuracyOptions {
  /** Per-axis 6-DOF errors. Overrides controller-tier defaults if present. */
  axis_errors?: { x_axis: AxisErrors6DOF; y_axis: AxisErrors6DOF; z_axis: AxisErrors6DOF };
  /** Inter-axis squareness errors (urad). Defaults to controller tier when absent. */
  squareness?: SquarenessErrors;
  /** Work envelope for volumetric calc. Defaults to a 500 mm cube centered on origin. */
  workspace?: { x_range: [number, number]; y_range: [number, number]; z_range: [number, number] };
  /** Grid-point density for volumetric calc. Defaults to 4 (64 sample points). */
  volumetric_grid_points?: number;
  /** Abbe-offset queries (axis + offset distance). Defaults to 3 stock cases (X@100, Y@100, Z@250). */
  abbe_queries?: Array<{ axis: string; offset_distance_mm: number }>;
  /** Measured ball-bar points. When absent, ball-bar is skipped (no synthetic data). */
  ball_bar?: {
    nominal_radius_mm: number;
    measured_points: BallBarMeasuredPoint[];
    feed_rate_mm_min: number;
    plane: "XY" | "XZ" | "YZ";
  };
}

export interface CapabilityComparison {
  machines: string[];
  controllerComparison: Record<string, Partial<ControllerFeatureSet>>;
  spindleComparison: Record<string, { maxRpm: number; power: number; torque: number }>;
  coolantComparison: Record<string, { types: string[]; maxPressure: number }>;
  recommendations: string[];
}

// ============================================================================
// CONTROLLER FEATURE PROFILES
// ============================================================================

const CONTROLLER_PROFILES: Record<string, Partial<ControllerFeatureSet>> = {
  "fanuc": {
    highSpeedMachining: true,
    lookAhead: 200,
    nanoSmoothing: true,
    aiContour: true,
    conversationalProgramming: false,
    toolLifeManagement: true,
    adaptiveControl: true,
    collisionAvoidance: true,
    thermalCompensation: true,
    volumetricCompensation: true,
  },
  "siemens": {
    highSpeedMachining: true,
    lookAhead: 150,
    nanoSmoothing: true,
    aiContour: false,
    conversationalProgramming: true,
    toolLifeManagement: true,
    adaptiveControl: true,
    collisionAvoidance: true,
    thermalCompensation: true,
    volumetricCompensation: true,
  },
  "haas": {
    highSpeedMachining: true,
    lookAhead: 80,
    nanoSmoothing: false,
    aiContour: false,
    conversationalProgramming: true,
    toolLifeManagement: true,
    adaptiveControl: false,
    collisionAvoidance: false,
    thermalCompensation: true,
    volumetricCompensation: false,
  },
  "mazak": {
    highSpeedMachining: true,
    lookAhead: 200,
    nanoSmoothing: true,
    aiContour: true,
    conversationalProgramming: true,
    toolLifeManagement: true,
    adaptiveControl: true,
    collisionAvoidance: true,
    thermalCompensation: true,
    volumetricCompensation: true,
  },
  "okuma": {
    highSpeedMachining: true,
    lookAhead: 180,
    nanoSmoothing: true,
    aiContour: false,
    conversationalProgramming: true,
    toolLifeManagement: true,
    adaptiveControl: true,
    collisionAvoidance: true,
    thermalCompensation: true,
    volumetricCompensation: true,
  },
  "dmg_mori": {
    highSpeedMachining: true,
    lookAhead: 200,
    nanoSmoothing: true,
    aiContour: true,
    conversationalProgramming: true,
    toolLifeManagement: true,
    adaptiveControl: true,
    collisionAvoidance: true,
    thermalCompensation: true,
    volumetricCompensation: true,
  },
};

const CANNED_CYCLES: Record<string, string[]> = {
  "fanuc": ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
  "siemens": ["CYCLE81", "CYCLE82", "CYCLE83", "CYCLE84", "CYCLE85", "CYCLE86", "CYCLE840", "POCKET1", "POCKET2"],
  "haas": ["G73", "G74", "G76", "G77", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
  "mazak": ["G73", "G74", "G76", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
  "okuma": ["G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89", "NAVI"],
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class MachineCapabilitySurfaceEngine {
  private packageCache: Map<string, CanonicalMachinePackage> = new Map();

  /**
   * Get controller capabilities for a machine
   */
  getControllerCapabilities(machineId: string): ControllerCapabilities | null {
    const pkg = this.getPackage(machineId);
    if (!pkg) return null;

    const ctrl = pkg.controller ?? {};
    const family = (ctrl.manufacturer ?? "unknown").toLowerCase();
    const normalized = machineVocabularyNormalizerEngine.normalizeController(ctrl.manufacturer ?? "");

    const baseFeatures = CONTROLLER_PROFILES[family] ?? CONTROLLER_PROFILES["fanuc"] ?? {};
    const features: ControllerFeatureSet = {
      highSpeedMachining: baseFeatures.highSpeedMachining ?? false,
      lookAhead: baseFeatures.lookAhead ?? 50,
      nanoSmoothing: baseFeatures.nanoSmoothing ?? false,
      aiContour: baseFeatures.aiContour ?? false,
      conversationalProgramming: baseFeatures.conversationalProgramming ?? false,
      toolLifeManagement: baseFeatures.toolLifeManagement ?? false,
      adaptiveControl: baseFeatures.adaptiveControl ?? false,
      collisionAvoidance: baseFeatures.collisionAvoidance ?? false,
      thermalCompensation: baseFeatures.thermalCompensation ?? false,
      volumetricCompensation: baseFeatures.volumetricCompensation ?? false,
    };

    const macroType = this.inferMacroType(family);

    return {
      machineId,
      controllerFamily: normalized.normalized?.family ?? ctrl.manufacturer ?? "Unknown",
      controllerModel: ctrl.model,
      vendor: normalized.normalized?.vendor ?? ctrl.manufacturer ?? "Unknown",
      features,
      programmingDialect: this.inferDialect(family),
      macroSupport: {
        supported: macroType !== "none",
        type: macroType,
        variableRange: macroType === "fanuc" ? { min: 100, max: 999 } : undefined,
        localVariables: macroType === "fanuc" ? 33 : macroType === "haas" ? 26 : 0,
        commonVariables: macroType === "fanuc" ? 100 : macroType === "haas" ? 100 : 0,
        systemVariables: macroType !== "none",
      },
      cannedCycles: CANNED_CYCLES[family] ?? CANNED_CYCLES["fanuc"] ?? [],
      customMCodes: [],
      customGCodes: [],
      limitations: this.inferControllerLimitations(features),
    };
  }

  /**
   * Get spindle package for a machine
   */
  getSpindlePackage(machineId: string): SpindlePackage | null {
    const pkg = this.getPackage(machineId);
    if (!pkg) return null;

    const spindle = pkg.spindle ?? {};
    const maxRpm = spindle.max_rpm ?? 10000;
    const power = spindle.power ?? 15;
    const torque = spindle.torque ?? this.estimateTorque(power, maxRpm);

    return {
      machineId,
      spindleId: `${machineId}-spindle-main`,
      type: this.inferSpindleType(maxRpm, power),
      maxRpm,
      minRpm: Math.max(50, Math.floor(maxRpm * 0.01)),
      ratedPower: power,
      peakPower: power * 1.25,
      continuousTorque: torque,
      peakTorque: torque * 1.5,
      taper: this.inferTaper(pkg.canonical_type, maxRpm),
      bearingType: maxRpm > 15000 ? "ceramic_hybrid" : "steel_roller",
      coolingType: maxRpm > 12000 ? "oil_air" : "oil_jacket",
      powerCurve: this.generatePowerCurve(maxRpm, power, torque),
      speedRanges: this.inferSpeedRanges(maxRpm, pkg.canonical_type),
      limitations: this.inferSpindleLimitations(maxRpm, power, torque),
    };
  }

  /**
   * Get coolant strategy for a machine
   */
  getCoolantStrategy(machineId: string): CoolantStrategy | null {
    const pkg = this.getPackage(machineId);
    if (!pkg) return null;

    const coolant = pkg.coolant ?? {};
    // MachineCoolant has no type/pressure fields; derive the coolant type
    // from the mist_coolant flag and default the pressure tier to medium.
    const coolType: string = "mist_coolant" in coolant && coolant.mist_coolant ? "mist" : "flood";
    const pressure: string = "medium";

    const strategies: CoolantOption[] = [
      { id: "flood", type: "flood", available: true, standard: true },
      { id: "mist", type: "mist", available: true, standard: false },
      { id: "air", type: "air", available: true, standard: true },
    ];

    const throughSpindleCapable = coolType === "through_spindle" || coolType === "through_tool" ||
      pressure === "high" || pressure === "ultra_high";
    const throughToolCapable = coolType === "through_tool" || pressure === "ultra_high";

    if (throughSpindleCapable) {
      strategies.push({ id: "tsc", type: "through_spindle", pressure: 70, available: true, standard: false });
    }
    if (throughToolCapable) {
      strategies.push({ id: "ttc", type: "through_tool", pressure: 100, available: true, standard: false });
    }

    const maxPressure = pressure === "ultra_high" ? 150 :
                        pressure === "high" ? 70 :
                        pressure === "medium" ? 20 : 5;

    return {
      machineId,
      strategies,
      defaultStrategy: coolType,
      throughSpindleCapable,
      throughToolCapable,
      maxPressure,
      pressureUnit: "bar",
      flowRate: maxPressure > 50 ? 20 : 40,
      tankCapacity: 200,
      filtration: maxPressure > 50 ? "fine_10um" : "standard_25um",
    };
  }

  /**
   * U-DEA-november-P02: Get capability summary enriched with predicted accuracy envelopes.
   *
   * Activates the precision-cluster engines (acc_volumetric, acc_abbe_offset,
   * acc_ball_bar) at capability-lookup time so downstream physics consumers see
   * realistic precision data instead of nominals. Pure function — no I/O, no
   * mutation of cached package data.
   *
   * Source priority for accuracy inputs:
   *   1. Caller-supplied `opts.axis_errors` / `opts.squareness` / `opts.ball_bar` (treated as measured)
   *   2. Controller-tier defaults from `getControllerAccuracyTier()` (ISO 230-2 typical bands)
   *   3. `null` field + `accuracy_source: "no-data"` when neither is available
   *
   * Ball-bar measurement is OPT-IN — without measured points the field is `null`
   * (no synthetic ballbar diagnosis to keep proof-grade integrity).
   *
   * @param machineId Machine identifier (must resolve to a package via getPackage)
   * @param opts Optional measured-accuracy data to override controller defaults
   * @returns CapabilityWithAccuracy or null if the base summary is null
   */
  getCapabilityWithAccuracy(
    machineId: string,
    opts: CapabilityAccuracyOptions = {}
  ): CapabilityWithAccuracy | null {
    const base = this.getCapabilitySummary(machineId);
    if (!base) return null;

    // Resolve accuracy inputs: caller override -> controller-tier default
    const tier = this.getControllerAccuracyTier(base.controller);
    const measured = !!(opts.axis_errors && opts.squareness);
    const axisErrors = opts.axis_errors ?? tier.default_axis_errors;
    const squareness = opts.squareness ?? tier.default_squareness;

    // Volumetric: defaults to 500mm cube, 4-point grid (64 sample points)
    const workspace = opts.workspace ?? {
      x_range: [-250, 250] as [number, number],
      y_range: [-250, 250] as [number, number],
      z_range: [-250, 250] as [number, number],
    };
    const gridPoints = opts.volumetric_grid_points ?? 4;

    let volumetric: CapabilityWithAccuracy["accuracy"]["volumetric"] = null;
    try {
      const vol: VolumetricAccuracyOutput = machineGeometricAccuracyEngine.volumetricAccuracy({
        workspace,
        grid_points: gridPoints,
        axis_errors: axisErrors,
        squareness,
      });
      volumetric = {
        max_um: vol.max_error_um,
        mean_um: vol.mean_error_um,
        p95_um: vol.volumetric_accuracy_um,
        max_location: vol.max_error_location,
      };
    } catch {
      // volumetricAccuracy throws on degenerate axis error config; surface as null
      volumetric = null;
    }

    // Abbe: defaults to X@100mm, Y@100mm, Z@250mm using each axis's yaw error
    const abbeQueries = opts.abbe_queries ?? [
      { axis: "x", offset_distance_mm: 100 },
      { axis: "y", offset_distance_mm: 100 },
      { axis: "z", offset_distance_mm: 250 },
    ];
    const abbe: CapabilityWithAccuracy["accuracy"]["abbe"] = [];
    for (const q of abbeQueries) {
      const angAxis = q.axis.toLowerCase();
      const angSource: AxisErrors6DOF | undefined =
        angAxis === "x" ? axisErrors.x_axis :
        angAxis === "y" ? axisErrors.y_axis :
        angAxis === "z" ? axisErrors.z_axis : undefined;
      if (!angSource) continue;
      // Use the largest 3-DOF angular as the conservative driver (roll/pitch/yaw)
      const angularErrorUrad = Math.max(
        Math.abs(angSource.roll),
        Math.abs(angSource.pitch),
        Math.abs(angSource.yaw)
      );
      if (!Number.isFinite(angularErrorUrad) || angularErrorUrad <= 0) continue;
      try {
        const out: AbbeOffsetOutput = machineGeometricAccuracyEngine.abbeOffset({
          angular_error_urad: angularErrorUrad,
          offset_distance_mm: q.offset_distance_mm,
          axis: q.axis,
        });
        abbe.push({
          axis: q.axis,
          abbe_error_um: out.abbe_error_um,
          contribution_pct: out.contribution_to_total_pct,
          recommendation: out.recommendation,
        });
      } catch {
        // skip degenerate per-axis abbe — don't fail whole envelope
      }
    }

    // Ball-bar: OPT-IN ONLY (measured points required — no synthetic data)
    let ballBar: CapabilityWithAccuracy["accuracy"]["ballBar"] = null;
    if (opts.ball_bar && Array.isArray(opts.ball_bar.measured_points) && opts.ball_bar.measured_points.length > 0) {
      try {
        const bb: BallBarOutput = machineGeometricAccuracyEngine.ballBarAnalysis({
          nominal_radius_mm: opts.ball_bar.nominal_radius_mm,
          measured_points: opts.ball_bar.measured_points,
          feed_rate_mm_min: opts.ball_bar.feed_rate_mm_min,
          plane: opts.ball_bar.plane,
        });
        ballBar = {
          circularity_um: bb.circularity_um,
          servo_mismatch_um: bb.servo_mismatch_um,
          squareness_error_urad: bb.squareness_error_urad,
          scaling_error_ppm: bb.scaling_error_ppm,
          reversal_spike_um: bb.reversal_spike_um,
          diagnosed_issues: bb.diagnosed_issues,
        };
      } catch {
        ballBar = null;
      }
    }

    const sourceTag: CapabilityWithAccuracy["accuracy_source"] =
      measured ? "measured" :
      (volumetric || abbe.length > 0) ? "controller-default" :
      "no-data";

    return {
      ...base,
      accuracy: { volumetric, abbe, ballBar },
      accuracy_source: sourceTag,
    };
  }

  /**
   * Map a controller capability set to a default machine-accuracy tier.
   *
   * Tiers track ISO 230-2 typical bands for VMCs by manufacturer class.
   * Premium tier (full volumetric compensation + nano smoothing) → tight defaults.
   * Mid tier → moderate. Economy tier (no volumetric comp) → loose defaults.
   *
   * Citations:
   *  - ISO 230-2:2014 — Test code for machine tools — accuracy/repeatability
   *  - Mazak Vertical Center Smart 530C spec: ±0.005mm positioning
   *  - Haas VF-2 spec: ±0.0025in (±0.064mm) positioning per axis
   *  - DMG MORI NHX-4000: ±0.004mm typical
   */
  private getControllerAccuracyTier(controller: ControllerCapabilities): {
    tier: "premium" | "mid" | "economy";
    default_axis_errors: { x_axis: AxisErrors6DOF; y_axis: AxisErrors6DOF; z_axis: AxisErrors6DOF };
    default_squareness: SquarenessErrors;
  } {
    const hasVolComp = controller.features.volumetricCompensation === true;
    const hasNano = controller.features.nanoSmoothing === true;
    const tier: "premium" | "mid" | "economy" =
      (hasVolComp && hasNano) ? "premium" :
      hasVolComp ? "mid" : "economy";

    // Tier-keyed magnitudes (µm for positioning/straightness, µrad for roll/pitch/yaw + squareness)
    const M: Record<typeof tier, { pos: number; straight: number; ang: number; sq: number }> = {
      premium: { pos: 5,  straight: 3,  ang: 5,  sq: 5 },
      mid:     { pos: 10, straight: 6,  ang: 10, sq: 10 },
      economy: { pos: 20, straight: 12, ang: 20, sq: 20 },
    };
    const m = M[tier];
    const axis: AxisErrors6DOF = {
      positioning: m.pos,
      straightness_y: m.straight,
      straightness_z: m.straight,
      roll: m.ang,
      pitch: m.ang,
      yaw: m.ang,
    };
    return {
      tier,
      default_axis_errors: { x_axis: { ...axis }, y_axis: { ...axis }, z_axis: { ...axis } },
      default_squareness: { xy: m.sq, xz: m.sq, yz: m.sq },
    };
  }

  /**
   * Get full capability summary for a machine
   */
  getCapabilitySummary(machineId: string): CapabilitySummary | null {
    const pkg = this.getPackage(machineId);
    if (!pkg) return null;

    const controller = this.getControllerCapabilities(machineId);
    const spindle = this.getSpindlePackage(machineId);
    const coolant = this.getCoolantStrategy(machineId);

    if (!controller || !spindle || !coolant) return null;

    const score = this.calculateCapabilityScore(controller, spindle, coolant);

    return {
      machineId,
      manufacturer: pkg.manufacturer,
      model: pkg.model,
      type: pkg.canonical_type,
      controller,
      spindle,
      coolant,
      overallCapabilityScore: score,
    };
  }

  /**
   * Compare capabilities across multiple machines
   */
  compareCapabilities(machineIds: string[]): CapabilityComparison {
    const controllerComparison: Record<string, Partial<ControllerFeatureSet>> = {};
    const spindleComparison: Record<string, { maxRpm: number; power: number; torque: number }> = {};
    const coolantComparison: Record<string, { types: string[]; maxPressure: number }> = {};
    const recommendations: string[] = [];

    for (const id of machineIds) {
      const ctrl = this.getControllerCapabilities(id);
      const spindle = this.getSpindlePackage(id);
      const coolant = this.getCoolantStrategy(id);

      if (ctrl) {
        controllerComparison[id] = ctrl.features;
      }
      if (spindle) {
        spindleComparison[id] = {
          maxRpm: spindle.maxRpm,
          power: spindle.ratedPower,
          torque: spindle.continuousTorque,
        };
      }
      if (coolant) {
        coolantComparison[id] = {
          types: coolant.strategies.filter(s => s.available).map(s => s.type),
          maxPressure: coolant.maxPressure,
        };
      }
    }

    // Generate recommendations
    const maxRpms = Object.values(spindleComparison).map(s => s.maxRpm);
    const maxPowers = Object.values(spindleComparison).map(s => s.power);

    if (maxRpms.length > 1) {
      const highest = Math.max(...maxRpms);
      const lowest = Math.min(...maxRpms);
      if (highest > lowest * 2) {
        recommendations.push(`Significant spindle speed variance (${lowest}-${highest} RPM) — consider application requirements`);
      }
    }

    const tscCapable = Object.entries(coolantComparison)
      .filter(([_, c]) => c.types.includes("through_spindle"))
      .map(([id]) => id);
    if (tscCapable.length > 0 && tscCapable.length < machineIds.length) {
      recommendations.push(`Only ${tscCapable.join(", ")} support through-spindle coolant`);
    }

    return {
      machines: machineIds,
      controllerComparison,
      spindleComparison,
      coolantComparison,
      recommendations,
    };
  }

  /**
   * Find machines by capability requirements
   */
  findByCapabilities(requirements: {
    minSpindleRpm?: number;
    minPower?: number;
    throughSpindleCoolant?: boolean;
    controllerFeatures?: (keyof ControllerFeatureSet)[];
  }): string[] {
    const matches: string[] = [];
    const packages = this.loadAllPackages();

    for (const pkg of packages) {
      const spindle = this.getSpindlePackage(pkg.canonical_id);
      const coolant = this.getCoolantStrategy(pkg.canonical_id);
      const controller = this.getControllerCapabilities(pkg.canonical_id);

      if (!spindle || !coolant || !controller) continue;

      if (requirements.minSpindleRpm && spindle.maxRpm < requirements.minSpindleRpm) continue;
      if (requirements.minPower && spindle.ratedPower < requirements.minPower) continue;
      if (requirements.throughSpindleCoolant && !coolant.throughSpindleCapable) continue;

      if (requirements.controllerFeatures) {
        const hasAll = requirements.controllerFeatures.every(f => controller.features[f]);
        if (!hasAll) continue;
      }

      matches.push(pkg.canonical_id);
    }

    return matches;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getPackage(machineId: string): CanonicalMachinePackage | null {
    if (this.packageCache.has(machineId)) {
      return this.packageCache.get(machineId)!;
    }

    try {
      const machine = machineService.getMachine(machineId);
      if (machine) {
        const pkg = this.convertToPackage(machine);
        if (pkg) {
          this.packageCache.set(machineId, pkg);
          return pkg;
        }
      }
    } catch { /* not found */ }

    // Try fallbacks
    const fallback = this.getFallbackPackage(machineId);
    if (fallback) {
      this.packageCache.set(machineId, fallback);
    }
    return fallback;
  }

  private loadAllPackages(): CanonicalMachinePackage[] {
    try {
      const machines = machineService.search({});
      return machines.map(m => this.convertToPackage(m)).filter((p): p is CanonicalMachinePackage => p !== null);
    } catch {
      return this.getFallbackPackages();
    }
  }

  private convertToPackage(machine: any): CanonicalMachinePackage | null {
    if (!machine?.id) return null;

    const manufacturer = machine.manufacturer ?? "Unknown";
    const canonicalType = this.toCanonicalType(machine.type);
    const now = new Date().toISOString();

    return {
      canonical_id: machine.id,
      source_record_ids: [machine.id],
      version: 1,
      manufacturer,
      manufacturer_id: String(manufacturer).toLowerCase().replace(/\s+/g, "-"),
      model: machine.model ?? machine.name ?? machine.id,
      raw_type: typeof machine.type === "string" ? machine.type : "unknown",
      canonical_type: canonicalType,
      topology: this.topologyForType(canonicalType),
      controller: machine.controller ?? { manufacturer: "other", model: "Unknown" },
      spindle: machine.spindle ?? { max_rpm: 10000, power: 15 },
      envelope: machine.envelope ?? { x: 500, y: 400, z: 400 },
      axes: machine.axes ?? { linear_axes: 3, rotary_axes: 0 },
      tool_changer: machine.tool_changer ?? { capacity: 20 },
      coolant: machine.coolant ?? { mist_coolant: false, high_pressure_option: false },
      controller_packages: [],
      spindle_packages: [],
      coolant_strategies: [],
      allowed_options: [],
      confidence: { controller: 0.5, spindle: 0.5, coolant: 0.5, envelope: 0.5, axes: 0.5, tool_changer: 0.5, overall: 0.5 },
      provenance: {},
      ambiguities: [],
      enrichment_history: [],
      primary_layer: "core",
      generated_at: now,
    };
  }

  /** Normalize an arbitrary raw machine-type string to a CanonicalMachineType (default VMC). */
  private toCanonicalType(raw: unknown): CanonicalMachineType {
    const s = String(raw ?? "").toLowerCase();
    if (s.includes("5") && s.includes("axis")) return "5AXIS";
    if (s.includes("hmc") || s.includes("horizontal")) return "HMC";
    if (s.includes("mill_turn") || s.includes("millturn") || s.includes("multitask")) return "MILL_TURN";
    if (s.includes("swiss")) return "SWISS";
    if (s.includes("vtl")) return "VTL";
    if (s.includes("lathe") || s.includes("turn")) return "LATHE";
    if (s.includes("grind")) return "GRINDER";
    if (s.includes("wire") && s.includes("edm")) return "EDM_WIRE";
    if (s.includes("sinker") || s.includes("edm")) return "EDM_SINKER";
    if (s.includes("laser")) return "LASER";
    if (s.includes("water")) return "WATERJET";
    if (s.includes("router")) return "ROUTER";
    if (s.includes("boring")) return "BORING_MILL";
    return "VMC";
  }

  /** Map a canonical machine type to its axis topology. */
  private topologyForType(type: CanonicalMachineType): MachineAxisTopology {
    switch (type) {
      case "HMC": return "3_axis_horizontal";
      case "5AXIS": return "5_axis_vertical";
      case "LATHE": return "2_axis_lathe";
      case "MILL_TURN": return "mill_turn";
      case "SWISS": return "swiss";
      case "VTL": return "vtl";
      case "EDM_WIRE": return "wire_edm";
      case "EDM_SINKER": return "sinker_edm";
      case "LASER": return "laser";
      case "WATERJET": return "waterjet";
      case "ROUTER": return "router";
      case "BORING_MILL": return "3_axis_horizontal";
      default: return "3_axis_vertical";
    }
  }

  private getFallbackPackage(machineId: string): CanonicalMachinePackage | null {
    const fallbacks = this.getFallbackPackages();
    return fallbacks.find(p => p.canonical_id === machineId) ?? null;
  }

  private getFallbackPackages(): CanonicalMachinePackage[] {
    const now = new Date().toISOString();
    const base = {
      version: 1,
      controller_packages: [],
      spindle_packages: [],
      coolant_strategies: [],
      allowed_options: [],
      provenance: {},
      ambiguities: [],
      enrichment_history: [],
      primary_layer: "core" as const,
      generated_at: now,
    };
    return [
      { ...base, canonical_id: "haas_vf2", source_record_ids: ["fallback"], manufacturer: "Haas", manufacturer_id: "haas", model: "VF-2", raw_type: "VMC", canonical_type: "VMC", topology: "3_axis_vertical", controller: { manufacturer: "haas", model: "NGC" }, spindle: { max_rpm: 8100, power: 22.4 }, coolant: { mist_coolant: false, high_pressure_option: false }, envelope: { x: 762, y: 406, z: 508 }, axes: { linear_axes: 3, rotary_axes: 0 }, tool_changer: { capacity: 20 }, confidence: { controller: 0.5, spindle: 0.5, coolant: 0.5, envelope: 0.5, axes: 0.5, tool_changer: 0.5, overall: 0.5 } },
      { ...base, canonical_id: "dmg_dmu50", source_record_ids: ["fallback"], manufacturer: "DMG MORI", manufacturer_id: "dmg-mori", model: "DMU 50", raw_type: "5AXIS", canonical_type: "5AXIS", topology: "5_axis_vertical", controller: { manufacturer: "siemens", model: "840D" }, spindle: { max_rpm: 14000, power: 25 }, coolant: { mist_coolant: false, high_pressure_option: true }, envelope: { x: 500, y: 450, z: 400 }, axes: { linear_axes: 3, rotary_axes: 2 }, tool_changer: { capacity: 30 }, confidence: { controller: 0.6, spindle: 0.6, coolant: 0.6, envelope: 0.6, axes: 0.6, tool_changer: 0.6, overall: 0.6 } },
      { ...base, canonical_id: "okuma_lb3000", source_record_ids: ["fallback"], manufacturer: "Okuma", manufacturer_id: "okuma", model: "LB3000 EX II", raw_type: "LATHE", canonical_type: "LATHE", topology: "2_axis_lathe", controller: { manufacturer: "okuma", model: "OSP-P300" }, spindle: { max_rpm: 5000, power: 22, torque: 190 }, coolant: { mist_coolant: false, high_pressure_option: false }, envelope: { x: 260, y: 0, z: 500 }, axes: { linear_axes: 2, rotary_axes: 0 }, tool_changer: { capacity: 12 }, confidence: { controller: 0.6, spindle: 0.7, coolant: 0.5, envelope: 0.6, axes: 0.6, tool_changer: 0.5, overall: 0.6 } },
    ];
  }

  private inferMacroType(family: string): MacroCapabilities["type"] {
    if (family.includes("fanuc") || family.includes("brother")) return "fanuc";
    if (family.includes("haas")) return "haas";
    if (family.includes("siemens")) return "siemens";
    if (family.includes("mazak") || family.includes("mazatrol")) return "mazak";
    if (family.includes("okuma") || family.includes("osp")) return "okuma";
    return "fanuc"; // Default to Fanuc-style
  }

  private inferDialect(family: string): string {
    if (family.includes("siemens")) return "ISO/Siemens";
    if (family.includes("mazatrol")) return "Mazatrol";
    if (family.includes("osp")) return "OSP";
    return "ISO/Fanuc";
  }

  private inferControllerLimitations(features: ControllerFeatureSet): string[] {
    const limitations: string[] = [];
    if (!features.nanoSmoothing) limitations.push("No nano-smoothing for complex surfaces");
    if (!features.collisionAvoidance) limitations.push("No automatic collision avoidance");
    if (!features.volumetricCompensation) limitations.push("Limited volumetric accuracy compensation");
    if (features.lookAhead < 100) limitations.push(`Limited look-ahead (${features.lookAhead} blocks)`);
    return limitations;
  }

  private inferSpindleType(maxRpm: number, power: number): SpindlePackage["type"] {
    if (maxRpm > 20000) return "electrospindle";
    if (maxRpm > 15000) return "motorized";
    if (power > 30) return "gear";
    return "belt";
  }

  private inferTaper(machineType: string, maxRpm: number): string {
    if (machineType === "LATHE") return "A2-6";
    if (maxRpm > 15000) return "HSK-A63";
    if (maxRpm > 10000) return "HSK-A63";
    return "BT40";
  }

  private estimateTorque(power: number, maxRpm: number): number {
    // Torque (Nm) = Power (kW) * 9549 / RPM at constant power region
    // Assume constant power starts at 50% of max RPM
    const constPowerRpm = maxRpm * 0.5;
    return Math.round((power * 9549) / constPowerRpm);
  }

  private generatePowerCurve(maxRpm: number, power: number, torque: number): PowerCurvePoint[] {
    const points: PowerCurvePoint[] = [];
    const constPowerRpm = maxRpm * 0.5;

    // Constant torque region
    for (let rpm = 500; rpm < constPowerRpm; rpm += Math.floor(constPowerRpm / 5)) {
      points.push({
        rpm,
        torque,
        power: (torque * rpm) / 9549,
      });
    }

    // Constant power region
    for (let rpm = constPowerRpm; rpm <= maxRpm; rpm += Math.floor((maxRpm - constPowerRpm) / 5)) {
      points.push({
        rpm,
        power,
        torque: (power * 9549) / rpm,
      });
    }

    return points;
  }

  private inferSpeedRanges(maxRpm: number, machineType: string): SpeedRange[] {
    if (machineType === "LATHE") {
      return [
        { name: "Low", minRpm: 50, maxRpm: Math.floor(maxRpm * 0.2), gearRatio: 4.0 },
        { name: "Medium", minRpm: Math.floor(maxRpm * 0.15), maxRpm: Math.floor(maxRpm * 0.6), gearRatio: 1.5 },
        { name: "High", minRpm: Math.floor(maxRpm * 0.4), maxRpm: maxRpm, gearRatio: 1.0 },
      ];
    }
    return [{ name: "Direct", minRpm: 100, maxRpm: maxRpm, gearRatio: 1.0 }];
  }

  private inferSpindleLimitations(maxRpm: number, power: number, torque: number): string[] {
    const limitations: string[] = [];
    if (maxRpm < 8000) limitations.push("Limited for aluminum high-speed machining");
    if (power < 15) limitations.push("May limit heavy roughing depths");
    if (torque < 100) limitations.push("Limited torque for large diameter tools");
    return limitations;
  }

  private calculateCapabilityScore(
    controller: ControllerCapabilities,
    spindle: SpindlePackage,
    coolant: CoolantStrategy
  ): number {
    let score = 50;

    // Controller features
    const features = controller.features;
    if (features.highSpeedMachining) score += 5;
    if (features.nanoSmoothing) score += 5;
    if (features.aiContour) score += 5;
    if (features.collisionAvoidance) score += 5;
    if (features.volumetricCompensation) score += 5;
    if (features.lookAhead > 100) score += 3;

    // Spindle
    if (spindle.maxRpm > 15000) score += 5;
    if (spindle.ratedPower > 25) score += 5;
    if (spindle.continuousTorque > 150) score += 5;

    // Coolant
    if (coolant.throughSpindleCapable) score += 5;
    if (coolant.throughToolCapable) score += 3;
    if (coolant.maxPressure > 70) score += 2;

    return Math.min(100, score);
  }

  // ============================================================================
  // SELF-AWARENESS
  // ============================================================================

  getSelfAwareness() {
    return {
      engine: "MachineCapabilitySurfaceEngine",
      purpose: "Surface controller capabilities, spindle packages, and coolant strategies from machine packages",
      milestone: "MCAT-MS0/P2-U02",
      capabilities: [
        "getControllerCapabilities",
        "getSpindlePackage",
        "getCoolantStrategy",
        "getCapabilitySummary",
        "getCapabilityWithAccuracy",
        "compareCapabilities",
        "findByCapabilities",
      ],
      controllerProfiles: Object.keys(CONTROLLER_PROFILES).length,
      packagesCached: this.packageCache.size,
    };
  }
}

export const machineCapabilitySurfaceEngine = new MachineCapabilitySurfaceEngine();
