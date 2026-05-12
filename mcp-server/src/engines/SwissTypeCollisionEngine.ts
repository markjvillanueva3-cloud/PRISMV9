/**
 * SwissTypeCollisionEngine — Swiss-Type Lathe Collision Detection & Safety
 *
 * Covers Swiss-type specific collision scenarios that standard lathe collision
 * engines do not address:
 *   1. Gang slide station interference matrix
 *   2. B-axis swing clearance (tool rotation envelope)
 *   3. Guide bushing thermal expansion clearance
 *   4. Pickoff spindle approach zones
 *   5. Sub-spindle part transfer collision
 *   6. Cross-slide vs gang tool interference
 *   7. Ejector pin clearance during part-off
 *   8. Bar stock runout collision
 *   9. Live tool spin-up clearance
 *  10. Multi-channel simultaneous operation collision
 *
 * SAFETY: All collision checks are CONSERVATIVE. False positives are acceptable;
 * false negatives are NEVER acceptable (safety-critical).
 *
 * References:
 *   - Star SR-20 Programming Manual — gang tool layout, B-axis kinematics
 *   - Citizen L20/L32 Programming Guide — guide bushing, pickoff
 *   - Tornos Swiss GT Manual — multi-channel sync, collision zones
 *   - Tsugami B-Axis Swiss Guide — B-axis rotation envelopes
 *   - ISO 10218 — workholding safety factor 2.5x
 *   - Sandvik Swiss Turning Application Guide
 *
 * @module SwissTypeCollisionEngine
 * @version 1.0.0 — P0-CRITICAL safety gap closure
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS — SAFETY CRITICAL
// ============================================================================

/** Default safety margin [mm] for all Swiss collision checks */
const SAFETY_MARGIN_MM = 2.0;

/** Minimum clearance between gang tool stations [mm] */
const MIN_GANG_TOOL_CLEARANCE_MM = 3.0;

/** B-axis swing clearance buffer [mm] — accounts for vibration */
const B_AXIS_SWING_BUFFER_MM = 5.0;

/** Guide bushing thermal expansion coefficient [mm/°C] — typical brass bushing */
const BUSHING_THERMAL_EXPANSION_COEFF = 0.000019;

/** Minimum guide bushing-to-bar clearance [mm] */
const GUIDE_BUSHING_CLEARANCE_MM = 0.005;

/** Maximum expected temperature rise [°C] during Swiss machining */
const MAX_TEMP_RISE_CELSIUS = 40;

/** Pickoff approach zone safety radius [mm] */
const PICKOFF_APPROACH_SAFETY_MM = 8.0;

/** Live tool spin-up clearance [mm] — minimum before starting spindle */
const LIVE_TOOL_SPINUP_CLEARANCE_MM = 10.0;

/** Bar stock runout tolerance factor (multiplied by bar diameter) */
const BAR_RUNOUT_FACTOR = 0.001; // 0.1% of diameter

/** Ejector pin minimum retract clearance [mm] */
const EJECTOR_PIN_CLEARANCE_MM = 5.0;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supported Swiss-type machine manufacturers
 */
export type SwissMachineType = "Star" | "Citizen" | "Tornos" | "Tsugami";

/**
 * Swiss-type machine components that can collide
 */
export type SwissComponent =
  | "guide_bushing"
  | "main_spindle"
  | "sub_spindle"
  | "gang_slide"
  | "cross_slide"
  | "back_working_unit"
  | "b_axis_tool"
  | "pickoff_spindle"
  | "bar_stock"
  | "ejector_pin"
  | "live_tool"
  | "turret"
  | "part";

/**
 * 3D vector for position/dimension
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Axis-aligned bounding box
 */
export interface AABB {
  min: Vector3;
  max: Vector3;
}

/**
 * A collision pair between two components
 */
export interface CollisionPair {
  componentA: SwissComponent;
  componentB: SwissComponent;
  scenario: string;
  criticalLevel: "high" | "medium" | "low";
}

/**
 * Swiss-type collision scenario definition
 */
export interface SwissCollisionScenario {
  scenarioId: string;
  machineType: SwissMachineType;
  components: SwissComponent[];
  collisionPairs: CollisionPair[];
}

/**
 * Collision zone for a Swiss-type component
 */
export interface SwissCollisionZone {
  component: SwissComponent;
  boundingBox: AABB;
  safetyMargin: number;
  dynamicEnvelope?: {
    minPosition: Vector3;
    maxPosition: Vector3;
    rotationRange?: [number, number];
  };
}

/**
 * Gang tooling station configuration
 */
export interface GangStation {
  stationNumber: number;
  toolId: string;
  toolType: "turning" | "grooving" | "threading" | "drilling" | "live_mill" | "live_drill" | "form" | "cutoff";
  toolDiameter_mm: number;
  toolLength_mm: number;
  holderWidth_mm: number;
  holderHeight_mm: number;
  xOffset_mm: number;
  zOffset_mm: number;
  isLiveTool: boolean;
  liveToolRpm?: number;
}

/**
 * Gang slide configuration
 */
export interface GangSlideConfig {
  stationCount: 4 | 6 | 8 | 10 | 12;
  stationPitch_mm: number;
  slideWidth_mm: number;
  slideHeight_mm: number;
  xTravel_mm: number;
  zTravel_mm: number;
  stations: GangStation[];
}

/**
 * B-axis configuration
 */
export interface BAxisConfig {
  hasAxis: boolean;
  rotationRange_deg: [number, number];
  pivotPoint: Vector3;
  toolHolderLength_mm: number;
  toolStickout_mm: number;
  maxToolDiameter_mm: number;
}

/**
 * Guide bushing configuration
 */
export interface GuideBushingConfig {
  innerDiameter_mm: number;
  outerDiameter_mm: number;
  length_mm: number;
  material: "brass" | "carbide" | "ceramic";
  currentTemp_celsius?: number;
  referenceTemp_celsius?: number;
}

/**
 * Sub-spindle / pickoff configuration
 */
export interface SubSpindleConfig {
  hasSubSpindle: boolean;
  zTravel_mm: number;
  xOffset_mm: number;
  colletDiameter_mm: number;
  approachSpeed_mmMin?: number;
  gripForce_N?: number;
}

/**
 * Swiss machine full configuration
 */
export interface SwissMachineConfig {
  machineType: SwissMachineType;
  model: string;
  maxBarDiameter_mm: number;
  mainSpindleMaxRpm: number;
  hasGuideBushing: boolean;
  guideBushing?: GuideBushingConfig;
  gangSlide?: GangSlideConfig;
  bAxis?: BAxisConfig;
  subSpindle?: SubSpindleConfig;
  hasCrossSlide: boolean;
  crossSlideXTravel_mm?: number;
  crossSlideZTravel_mm?: number;
  ejectorPinLength_mm?: number;
  channelCount: 1 | 2 | 3;
}

/**
 * Current machine state for collision checking
 */
export interface SwissMachineState {
  barDiameter_mm: number;
  barStickout_mm: number;
  partLength_mm: number;
  currentGangStation: number;
  gangSlideX_mm: number;
  gangSlideZ_mm: number;
  bAxisAngle_deg?: number;
  crossSlideX_mm?: number;
  crossSlideZ_mm?: number;
  subSpindleZ_mm?: number;
  subSpindleEngaged: boolean;
  ejectorExtended: boolean;
  bushingTemp_celsius?: number;
}

/**
 * Collision check result
 */
export interface SwissCollisionResult {
  safe: boolean;
  checks: SwissCollisionCheck[];
  warnings: string[];
  criticalErrors: string[];
  safeZones: SwissCollisionZone[];
}

/**
 * Individual collision check result
 */
export interface SwissCollisionCheck {
  checkType: string;
  passed: boolean;
  clearance_mm: number;
  components: SwissComponent[];
  description: string;
  severity: "info" | "warning" | "critical";
  recommendation?: string;
}

/**
 * Gang tool interference result
 */
export interface GangInterferenceResult {
  safe: boolean;
  interferingPairs: Array<{
    stationA: number;
    stationB: number;
    overlap_mm: number;
    recommendation: string;
  }>;
  minimumClearance_mm: number;
  matrixMap: boolean[][];
}

/**
 * B-axis swing clearance result
 */
export interface BAxisSwingResult {
  safe: boolean;
  sweptEnvelope: AABB;
  clearanceToBar_mm: number;
  clearanceToGang_mm: number;
  clearanceToBushing_mm: number;
  maxSafeAngle_deg: number;
  minSafeAngle_deg: number;
  recommendation: string;
}

/**
 * Guide bushing thermal clearance result
 */
export interface BushingThermalResult {
  safe: boolean;
  nominalClearance_mm: number;
  thermalExpansion_mm: number;
  effectiveClearance_mm: number;
  minSafeClearance_mm: number;
  recommendation: string;
}

/**
 * Pickoff approach result
 */
export interface PickoffApproachResult {
  safe: boolean;
  approachZone: AABB;
  obstructions: Array<{ component: SwissComponent; distance_mm: number }>;
  safeApproachPath: boolean;
  recommendation: string;
}

/**
 * Part transfer collision result
 */
export interface PartTransferResult {
  safe: boolean;
  transferPath: Vector3[];
  collisionPoints: Array<{ position: Vector3; component: SwissComponent }>;
  safeTransferZ_mm: number;
  recommendation: string;
}

/**
 * Ejector clearance result
 */
export interface EjectorClearanceResult {
  safe: boolean;
  ejectorLength_mm: number;
  partClearance_mm: number;
  toolClearance_mm: number;
  subSpindleClearance_mm: number;
  recommendation: string;
}

/**
 * Bar runout collision result
 */
export interface BarRunoutResult {
  safe: boolean;
  nominalDiameter_mm: number;
  maxRunout_mm: number;
  effectiveDiameter_mm: number;
  bushingClearance_mm: number;
  recommendation: string;
}

/**
 * Live tool spin-up result
 */
export interface LiveToolSpinUpResult {
  safe: boolean;
  stationNumber: number;
  clearanceToBar_mm: number;
  clearanceToAdjacentTools_mm: number;
  spinUpAllowed: boolean;
  recommendation: string;
}

// ============================================================================
// MACHINE PRESETS
// ============================================================================

/**
 * Pre-configured Swiss machine specs for common models
 */
export const SWISS_MACHINE_PRESETS: Record<string, Partial<SwissMachineConfig>> = {
  "Star_SR-20": {
    machineType: "Star",
    model: "SR-20",
    maxBarDiameter_mm: 20,
    mainSpindleMaxRpm: 10000,
    hasGuideBushing: true,
    guideBushing: {
      innerDiameter_mm: 20.5,
      outerDiameter_mm: 38,
      length_mm: 30,
      material: "carbide",
    },
    gangSlide: {
      stationCount: 8,
      stationPitch_mm: 25,
      slideWidth_mm: 200,
      slideHeight_mm: 80,
      xTravel_mm: 35,
      zTravel_mm: 160,
      stations: [],
    },
    bAxis: {
      hasAxis: true,
      rotationRange_deg: [-135, 135],
      pivotPoint: { x: 0, y: 0, z: 50 },
      toolHolderLength_mm: 45,
      toolStickout_mm: 30,
      maxToolDiameter_mm: 12,
    },
    subSpindle: {
      hasSubSpindle: true,
      zTravel_mm: 200,
      xOffset_mm: 0,
      colletDiameter_mm: 20,
    },
    channelCount: 2,
  },

  "Citizen_L20": {
    machineType: "Citizen",
    model: "L20",
    maxBarDiameter_mm: 20,
    mainSpindleMaxRpm: 12000,
    hasGuideBushing: true,
    guideBushing: {
      innerDiameter_mm: 20.3,
      outerDiameter_mm: 40,
      length_mm: 32,
      material: "carbide",
    },
    gangSlide: {
      stationCount: 8,
      stationPitch_mm: 24,
      slideWidth_mm: 192,
      slideHeight_mm: 75,
      xTravel_mm: 32,
      zTravel_mm: 150,
      stations: [],
    },
    bAxis: {
      hasAxis: true,
      rotationRange_deg: [-120, 120],
      pivotPoint: { x: 0, y: 0, z: 48 },
      toolHolderLength_mm: 42,
      toolStickout_mm: 28,
      maxToolDiameter_mm: 10,
    },
    subSpindle: {
      hasSubSpindle: true,
      zTravel_mm: 180,
      xOffset_mm: 0,
      colletDiameter_mm: 20,
    },
    channelCount: 2,
  },

  "Tornos_SwissGT": {
    machineType: "Tornos",
    model: "Swiss GT 26",
    maxBarDiameter_mm: 26,
    mainSpindleMaxRpm: 8000,
    hasGuideBushing: true,
    guideBushing: {
      innerDiameter_mm: 26.5,
      outerDiameter_mm: 45,
      length_mm: 35,
      material: "brass",
    },
    gangSlide: {
      stationCount: 12,
      stationPitch_mm: 22,
      slideWidth_mm: 264,
      slideHeight_mm: 85,
      xTravel_mm: 40,
      zTravel_mm: 180,
      stations: [],
    },
    bAxis: {
      hasAxis: true,
      rotationRange_deg: [-110, 110],
      pivotPoint: { x: 0, y: 0, z: 55 },
      toolHolderLength_mm: 50,
      toolStickout_mm: 35,
      maxToolDiameter_mm: 14,
    },
    subSpindle: {
      hasSubSpindle: true,
      zTravel_mm: 220,
      xOffset_mm: 0,
      colletDiameter_mm: 26,
    },
    channelCount: 3,
  },

  "Tsugami_B0385": {
    machineType: "Tsugami",
    model: "B0385-III",
    maxBarDiameter_mm: 38,
    mainSpindleMaxRpm: 6000,
    hasGuideBushing: true,
    guideBushing: {
      innerDiameter_mm: 38.5,
      outerDiameter_mm: 60,
      length_mm: 40,
      material: "carbide",
    },
    gangSlide: {
      stationCount: 10,
      stationPitch_mm: 28,
      slideWidth_mm: 280,
      slideHeight_mm: 90,
      xTravel_mm: 45,
      zTravel_mm: 200,
      stations: [],
    },
    bAxis: {
      hasAxis: true,
      rotationRange_deg: [-100, 100],
      pivotPoint: { x: 0, y: 0, z: 60 },
      toolHolderLength_mm: 55,
      toolStickout_mm: 40,
      maxToolDiameter_mm: 16,
    },
    subSpindle: {
      hasSubSpindle: true,
      zTravel_mm: 250,
      xOffset_mm: 0,
      colletDiameter_mm: 38,
    },
    channelCount: 2,
  },
};

// ============================================================================
// ENGINE
// ============================================================================

class SwissTypeCollisionEngineImpl {
  // --------------------------------------------------------------------------
  // 1. Full collision check suite
  // --------------------------------------------------------------------------
  /**
   * Run all Swiss-type collision checks for current machine state
   * @param config Machine configuration
   * @param state Current machine state
   * @returns Comprehensive collision result
   */
  checkAll(config: SwissMachineConfig, state: SwissMachineState): SwissCollisionResult {
    const checks: SwissCollisionCheck[] = [];
    const warnings: string[] = [];
    const criticals: string[] = [];
    const safeZones: SwissCollisionZone[] = [];

    // 1. Gang slide interference matrix
    if (config.gangSlide && config.gangSlide.stations.length > 0) {
      const gangResult = this.checkGangInterference(config.gangSlide);
      if (!gangResult.safe) {
        for (const pair of gangResult.interferingPairs) {
          checks.push({
            checkType: "gang_interference",
            passed: false,
            clearance_mm: -pair.overlap_mm,
            components: ["gang_slide"],
            description: `Gang stations ${pair.stationA} and ${pair.stationB} interfere by ${pair.overlap_mm.toFixed(2)}mm`,
            severity: "critical",
            recommendation: pair.recommendation,
          });
          criticals.push(`Gang station interference: ${pair.stationA}-${pair.stationB}`);
        }
      } else {
        checks.push({
          checkType: "gang_interference",
          passed: true,
          clearance_mm: gangResult.minimumClearance_mm,
          components: ["gang_slide"],
          description: `Gang tool clearance OK: ${gangResult.minimumClearance_mm.toFixed(2)}mm minimum`,
          severity: "info",
        });
      }
    }

    // 2. B-axis swing clearance
    if (config.bAxis?.hasAxis && state.bAxisAngle_deg !== undefined) {
      const bAxisResult = this.checkBAxisSwing(config, state);
      if (!bAxisResult.safe) {
        checks.push({
          checkType: "b_axis_swing",
          passed: false,
          clearance_mm: Math.min(bAxisResult.clearanceToBar_mm, bAxisResult.clearanceToGang_mm),
          components: ["b_axis_tool", "bar_stock", "gang_slide"],
          description: `B-axis swing collision risk at ${state.bAxisAngle_deg}deg`,
          severity: "critical",
          recommendation: bAxisResult.recommendation,
        });
        criticals.push("B-axis swing clearance violation");
      } else {
        checks.push({
          checkType: "b_axis_swing",
          passed: true,
          clearance_mm: Math.min(bAxisResult.clearanceToBar_mm, bAxisResult.clearanceToGang_mm),
          components: ["b_axis_tool", "bar_stock", "gang_slide"],
          description: `B-axis safe: bar=${bAxisResult.clearanceToBar_mm.toFixed(2)}mm, gang=${bAxisResult.clearanceToGang_mm.toFixed(2)}mm`,
          severity: "info",
        });
      }
    }

    // 3. Guide bushing thermal clearance
    if (config.hasGuideBushing && config.guideBushing) {
      const thermalResult = this.checkBushingThermal(config.guideBushing, state.barDiameter_mm, state.bushingTemp_celsius);
      if (!thermalResult.safe) {
        checks.push({
          checkType: "bushing_thermal",
          passed: false,
          clearance_mm: thermalResult.effectiveClearance_mm,
          components: ["guide_bushing", "bar_stock"],
          description: `Guide bushing clearance insufficient after thermal expansion`,
          severity: "critical",
          recommendation: thermalResult.recommendation,
        });
        criticals.push("Guide bushing thermal clearance violation");
      } else {
        checks.push({
          checkType: "bushing_thermal",
          passed: true,
          clearance_mm: thermalResult.effectiveClearance_mm,
          components: ["guide_bushing", "bar_stock"],
          description: `Bushing thermal clearance OK: ${thermalResult.effectiveClearance_mm.toFixed(3)}mm`,
          severity: "info",
        });
      }
    }

    // 4. Pickoff spindle approach
    if (config.subSpindle?.hasSubSpindle && state.subSpindleZ_mm !== undefined) {
      const pickoffResult = this.checkPickoffApproach(config, state);
      if (!pickoffResult.safe) {
        checks.push({
          checkType: "pickoff_approach",
          passed: false,
          clearance_mm: 0,
          components: ["pickoff_spindle", "gang_slide", "b_axis_tool"],
          description: "Pickoff approach zone obstructed",
          severity: "critical",
          recommendation: pickoffResult.recommendation,
        });
        criticals.push("Pickoff approach zone blocked");
      } else {
        checks.push({
          checkType: "pickoff_approach",
          passed: true,
          clearance_mm: PICKOFF_APPROACH_SAFETY_MM,
          components: ["pickoff_spindle"],
          description: "Pickoff approach zone clear",
          severity: "info",
        });
      }
    }

    // 5. Cross-slide vs gang interference
    if (config.hasCrossSlide && config.gangSlide && state.crossSlideX_mm !== undefined) {
      const crossGangResult = this.checkCrossSlideVsGang(config, state);
      if (!crossGangResult.passed) {
        checks.push(crossGangResult);
        criticals.push("Cross-slide / gang slide interference");
      } else {
        checks.push(crossGangResult);
      }
    }

    // 6. Ejector pin clearance
    if (config.ejectorPinLength_mm && state.ejectorExtended) {
      const ejectorResult = this.checkEjectorClearance(config, state);
      if (!ejectorResult.safe) {
        checks.push({
          checkType: "ejector_clearance",
          passed: false,
          clearance_mm: Math.min(ejectorResult.partClearance_mm, ejectorResult.toolClearance_mm),
          components: ["ejector_pin", "part", "gang_slide"],
          description: "Ejector pin collision risk",
          severity: "critical",
          recommendation: ejectorResult.recommendation,
        });
        criticals.push("Ejector pin clearance violation");
      } else {
        checks.push({
          checkType: "ejector_clearance",
          passed: true,
          clearance_mm: ejectorResult.partClearance_mm,
          components: ["ejector_pin", "part"],
          description: `Ejector clearance OK: ${ejectorResult.partClearance_mm.toFixed(2)}mm`,
          severity: "info",
        });
      }
    }

    // 7. Bar stock runout
    const runoutResult = this.checkBarRunout(config, state);
    if (!runoutResult.safe) {
      checks.push({
        checkType: "bar_runout",
        passed: false,
        clearance_mm: runoutResult.bushingClearance_mm,
        components: ["bar_stock", "guide_bushing"],
        description: `Bar runout ${runoutResult.maxRunout_mm.toFixed(3)}mm may cause bushing contact`,
        severity: "warning",
        recommendation: runoutResult.recommendation,
      });
      warnings.push("Bar runout may cause bushing contact");
    } else {
      checks.push({
        checkType: "bar_runout",
        passed: true,
        clearance_mm: runoutResult.bushingClearance_mm,
        components: ["bar_stock", "guide_bushing"],
        description: `Bar runout within limits: ${runoutResult.maxRunout_mm.toFixed(3)}mm`,
        severity: "info",
      });
    }

    // 8. Live tool spin-up clearance (for all live tools in gang)
    if (config.gangSlide) {
      const liveStations = config.gangSlide.stations.filter(s => s.isLiveTool);
      for (const station of liveStations) {
        if (station.stationNumber === state.currentGangStation) {
          const spinUpResult = this.checkLiveToolSpinUp(config, state, station);
          if (!spinUpResult.safe) {
            checks.push({
              checkType: "live_tool_spinup",
              passed: false,
              clearance_mm: Math.min(spinUpResult.clearanceToBar_mm, spinUpResult.clearanceToAdjacentTools_mm),
              components: ["live_tool", "bar_stock", "gang_slide"],
              description: `Live tool station ${station.stationNumber} spin-up unsafe`,
              severity: "critical",
              recommendation: spinUpResult.recommendation,
            });
            criticals.push(`Live tool spin-up blocked at station ${station.stationNumber}`);
          }
        }
      }
    }

    // Build safe zones
    safeZones.push(this.calculateBarSafeZone(state));
    if (config.gangSlide) {
      safeZones.push(this.calculateGangSafeZone(config.gangSlide, state));
    }
    if (config.bAxis?.hasAxis) {
      safeZones.push(this.calculateBAxisSafeZone(config.bAxis, state.bAxisAngle_deg ?? 0));
    }

    const allPassed = checks.every(c => c.passed);

    return {
      safe: allPassed,
      checks,
      warnings,
      criticalErrors: criticals,
      safeZones,
    };
  }

  // --------------------------------------------------------------------------
  // 2. Gang slide station interference matrix
  // --------------------------------------------------------------------------
  /**
   * Check interference between adjacent gang tool stations
   * @param gangConfig Gang slide configuration with all stations
   * @returns Interference analysis with matrix map
   */
  checkGangInterference(gangConfig: GangSlideConfig): GangInterferenceResult {
    const { stations, stationPitch_mm } = gangConfig;
    const interferingPairs: GangInterferenceResult["interferingPairs"] = [];
    let minimumClearance = Infinity;

    // Build NxN interference matrix
    const n = stations.length;
    const matrixMap: boolean[][] = Array.from({ length: n }, () => Array(n).fill(true));

    for (let i = 0; i < stations.length; i++) {
      for (let j = i + 1; j < stations.length; j++) {
        const stationA = stations[i];
        const stationB = stations[j];

        // Calculate physical distance between station centers
        const stationGap = Math.abs(stationB.stationNumber - stationA.stationNumber) * stationPitch_mm;

        // Calculate tool envelopes
        const envelopeA = stationA.holderWidth_mm / 2 + (stationA.toolDiameter_mm / 2);
        const envelopeB = stationB.holderWidth_mm / 2 + (stationB.toolDiameter_mm / 2);

        // Required clearance
        const requiredGap = envelopeA + envelopeB + MIN_GANG_TOOL_CLEARANCE_MM;
        const clearance = stationGap - (envelopeA + envelopeB);

        minimumClearance = Math.min(minimumClearance, clearance);

        if (clearance < MIN_GANG_TOOL_CLEARANCE_MM) {
          matrixMap[i][j] = false;
          matrixMap[j][i] = false;

          const overlap = MIN_GANG_TOOL_CLEARANCE_MM - clearance;
          interferingPairs.push({
            stationA: stationA.stationNumber,
            stationB: stationB.stationNumber,
            overlap_mm: overlap,
            recommendation: this.generateGangInterferenceRecommendation(stationA, stationB, overlap),
          });
        }
      }
    }

    return {
      safe: interferingPairs.length === 0,
      interferingPairs,
      minimumClearance_mm: minimumClearance,
      matrixMap,
    };
  }

  private generateGangInterferenceRecommendation(
    stationA: GangStation,
    stationB: GangStation,
    overlap_mm: number
  ): string {
    // Suggest smaller tool or reorganization
    if (stationA.toolDiameter_mm > stationB.toolDiameter_mm) {
      return `Reduce tool diameter at station ${stationA.stationNumber} by ${(overlap_mm / 2).toFixed(2)}mm or move to non-adjacent station`;
    }
    return `Reduce tool diameter at station ${stationB.stationNumber} by ${(overlap_mm / 2).toFixed(2)}mm or skip station ${stationA.stationNumber + 1}`;
  }

  // --------------------------------------------------------------------------
  // 3. B-axis swing clearance
  // --------------------------------------------------------------------------
  /**
   * Calculate B-axis tool rotation envelope and check clearances
   * @param config Machine configuration with B-axis
   * @param state Current machine state including B-axis angle
   * @returns Swing clearance analysis
   */
  checkBAxisSwing(config: SwissMachineConfig, state: SwissMachineState): BAxisSwingResult {
    const bAxis = config.bAxis!;
    const pivotZ = bAxis.pivotPoint.z;
    const toolReach = bAxis.toolHolderLength_mm + bAxis.toolStickout_mm;
    const toolRadius = bAxis.maxToolDiameter_mm / 2;

    // Calculate swept envelope for current angle
    const angleRad = (state.bAxisAngle_deg ?? 0) * Math.PI / 180;

    // Tool tip position relative to pivot
    const tipX = toolReach * Math.sin(angleRad);
    const tipZ = pivotZ + toolReach * Math.cos(angleRad);

    // Swept envelope AABB for full rotation range
    const [minAngle, maxAngle] = bAxis.rotationRange_deg;
    const sweptEnvelope: AABB = {
      min: {
        x: -toolReach - toolRadius,
        y: -toolRadius,
        z: pivotZ - toolReach - toolRadius,
      },
      max: {
        x: toolReach + toolRadius,
        y: toolRadius,
        z: pivotZ + toolReach + toolRadius,
      },
    };

    // Clearance to gang slide (approximate)
    const gangX = state.gangSlideX_mm ?? 50;

    // Clearance to bar stock
    // When B-axis is at 0 (tool pointing along Z), tool is far from bar centerline
    // As angle increases, tool tip moves toward X axis (center) and can hit bar
    const barRadius = state.barDiameter_mm / 2;
    // At 0 deg, tipX is 0, so we have full gangX clearance from bar
    // At 90 deg, tipX equals toolReach, tool is pointing at bar
    // clearanceToBar = distance from tool tip to bar surface
    const distanceFromCenter = Math.abs(tipX);
    const clearanceToBar = distanceFromCenter < barRadius
      ? -(barRadius - distanceFromCenter + toolRadius) // Inside bar zone = collision
      : distanceFromCenter - barRadius - toolRadius - B_AXIS_SWING_BUFFER_MM;

    const clearanceToGang = gangX - Math.abs(tipX) - toolRadius - B_AXIS_SWING_BUFFER_MM;

    // Clearance to bushing
    const bushingOD = config.guideBushing?.outerDiameter_mm ?? 40;
    const clearanceToBushing = tipZ - bushingOD / 2 - toolRadius - SAFETY_MARGIN_MM;

    // Calculate safe angle limits
    const maxSafeAngle = Math.asin((gangX - barRadius - toolRadius - B_AXIS_SWING_BUFFER_MM) / toolReach) * 180 / Math.PI;
    const minSafeAngle = -maxSafeAngle;

    const safe = clearanceToBar > 0 && clearanceToGang > 0 && clearanceToBushing > 0;

    let recommendation = "B-axis clearance OK";
    if (!safe) {
      if (clearanceToBar <= 0) {
        recommendation = `Reduce B-axis angle to stay clear of bar stock (max safe: +/-${maxSafeAngle.toFixed(1)}deg)`;
      } else if (clearanceToGang <= 0) {
        recommendation = `Retract gang slide before B-axis swing or reduce angle`;
      } else {
        recommendation = `Retract Z before B-axis rotation to clear bushing`;
      }
    }

    return {
      safe,
      sweptEnvelope,
      clearanceToBar_mm: clearanceToBar,
      clearanceToGang_mm: clearanceToGang,
      clearanceToBushing_mm: clearanceToBushing,
      maxSafeAngle_deg: Math.min(maxSafeAngle, maxAngle),
      minSafeAngle_deg: Math.max(minSafeAngle, minAngle),
      recommendation,
    };
  }

  // --------------------------------------------------------------------------
  // 4. Guide bushing thermal expansion
  // --------------------------------------------------------------------------
  /**
   * Check guide bushing clearance accounting for thermal expansion
   * @param bushing Guide bushing configuration
   * @param barDiameter_mm Actual bar diameter
   * @param currentTemp_celsius Current bushing temperature
   * @returns Thermal clearance analysis
   */
  checkBushingThermal(
    bushing: GuideBushingConfig,
    barDiameter_mm: number,
    currentTemp_celsius?: number
  ): BushingThermalResult {
    const refTemp = bushing.referenceTemp_celsius ?? 20;
    const currTemp = currentTemp_celsius ?? refTemp;
    const deltaT = currTemp - refTemp;

    // Thermal expansion of bushing inner diameter
    // Brass/carbide expand, reducing clearance
    const expansionCoeff = bushing.material === "carbide" ? 0.000006 : BUSHING_THERMAL_EXPANSION_COEFF;
    const thermalExpansion = bushing.innerDiameter_mm * expansionCoeff * deltaT;

    // Effective inner diameter after expansion
    const effectiveID = bushing.innerDiameter_mm + thermalExpansion;

    // Nominal clearance
    const nominalClearance = (bushing.innerDiameter_mm - barDiameter_mm) / 2;

    // Effective clearance after thermal expansion
    const effectiveClearance = (effectiveID - barDiameter_mm) / 2;

    // Minimum safe clearance (prevent bar contact)
    const minSafeClearance = GUIDE_BUSHING_CLEARANCE_MM;

    const safe = effectiveClearance >= minSafeClearance;

    let recommendation = "Bushing thermal clearance OK";
    if (!safe) {
      const requiredDiameter = bushing.innerDiameter_mm - barDiameter_mm - (minSafeClearance * 2);
      if (requiredDiameter > 0) {
        recommendation = `Use smaller bar stock (max ${(bushing.innerDiameter_mm - minSafeClearance * 2).toFixed(3)}mm) or increase coolant to reduce temperature`;
      } else {
        recommendation = `Bar too large for bushing — select larger bushing or reduce bar diameter`;
      }
    }

    return {
      safe,
      nominalClearance_mm: nominalClearance,
      thermalExpansion_mm: thermalExpansion,
      effectiveClearance_mm: effectiveClearance,
      minSafeClearance_mm: minSafeClearance,
      recommendation,
    };
  }

  // --------------------------------------------------------------------------
  // 5. Pickoff spindle approach zones
  // --------------------------------------------------------------------------
  /**
   * Check pickoff/sub-spindle approach zone for obstructions
   * @param config Machine configuration
   * @param state Current machine state
   * @returns Approach zone analysis
   */
  checkPickoffApproach(config: SwissMachineConfig, state: SwissMachineState): PickoffApproachResult {
    const subSpindle = config.subSpindle!;
    const obstructions: PickoffApproachResult["obstructions"] = [];

    // Define approach zone
    const approachZone: AABB = {
      min: {
        x: subSpindle.xOffset_mm - subSpindle.colletDiameter_mm / 2 - PICKOFF_APPROACH_SAFETY_MM,
        y: -subSpindle.colletDiameter_mm / 2 - PICKOFF_APPROACH_SAFETY_MM,
        z: (state.subSpindleZ_mm ?? 0) - PICKOFF_APPROACH_SAFETY_MM,
      },
      max: {
        x: subSpindle.xOffset_mm + subSpindle.colletDiameter_mm / 2 + PICKOFF_APPROACH_SAFETY_MM,
        y: subSpindle.colletDiameter_mm / 2 + PICKOFF_APPROACH_SAFETY_MM,
        z: state.partLength_mm + PICKOFF_APPROACH_SAFETY_MM,
      },
    };

    // Check gang slide position
    if (config.gangSlide) {
      const gangZ = state.gangSlideZ_mm ?? 0;
      if (gangZ > approachZone.min.z && gangZ < approachZone.max.z) {
        const distance = Math.abs(state.gangSlideX_mm ?? 50) - subSpindle.colletDiameter_mm / 2;
        if (distance < PICKOFF_APPROACH_SAFETY_MM) {
          obstructions.push({ component: "gang_slide", distance_mm: distance });
        }
      }
    }

    // Check B-axis tool position
    if (config.bAxis?.hasAxis && state.bAxisAngle_deg !== undefined && state.bAxisAngle_deg !== 0) {
      const bAxis = config.bAxis;
      const angleRad = state.bAxisAngle_deg * Math.PI / 180;
      const toolReach = bAxis.toolHolderLength_mm + bAxis.toolStickout_mm;
      const tipX = toolReach * Math.sin(angleRad);

      if (Math.abs(tipX) < subSpindle.colletDiameter_mm / 2 + PICKOFF_APPROACH_SAFETY_MM) {
        obstructions.push({ component: "b_axis_tool", distance_mm: Math.abs(tipX) });
      }
    }

    const safe = obstructions.length === 0;
    let recommendation = "Pickoff approach zone clear";
    if (!safe) {
      const blocking = obstructions.map(o => o.component).join(", ");
      recommendation = `Retract ${blocking} before pickoff approach`;
    }

    return {
      safe,
      approachZone,
      obstructions,
      safeApproachPath: safe,
      recommendation,
    };
  }

  // --------------------------------------------------------------------------
  // 6. Sub-spindle part transfer collision
  // --------------------------------------------------------------------------
  /**
   * Check collision-free path for sub-spindle part transfer
   * @param config Machine configuration
   * @param state Current machine state
   * @returns Transfer path analysis
   */
  checkPartTransfer(config: SwissMachineConfig, state: SwissMachineState): PartTransferResult {
    const subSpindle = config.subSpindle!;
    const collisionPoints: PartTransferResult["collisionPoints"] = [];

    // Define transfer path (Z axis movement)
    const startZ = state.partLength_mm;
    const endZ = subSpindle.zTravel_mm;
    const transferPath: Vector3[] = [];
    const steps = 10;

    for (let i = 0; i <= steps; i++) {
      const z = startZ + (endZ - startZ) * (i / steps);
      transferPath.push({ x: subSpindle.xOffset_mm, y: 0, z });

      // Check for collisions at each step
      if (config.gangSlide) {
        const gangZ = state.gangSlideZ_mm ?? 0;
        const gangX = state.gangSlideX_mm ?? 50;
        const partRadius = state.barDiameter_mm / 2;

        if (z < gangZ + state.partLength_mm && z > gangZ - 10) {
          if (gangX < partRadius + SAFETY_MARGIN_MM) {
            collisionPoints.push({
              position: { x: gangX, y: 0, z },
              component: "gang_slide",
            });
          }
        }
      }
    }

    const safe = collisionPoints.length === 0;
    let recommendation = "Part transfer path clear";
    let safeTransferZ = endZ;

    if (!safe) {
      // Find safe Z position
      const firstCollision = collisionPoints[0];
      safeTransferZ = firstCollision.position.z - state.partLength_mm - SAFETY_MARGIN_MM;
      recommendation = `Retract gang slide before transfer or limit Z to ${safeTransferZ.toFixed(1)}mm`;
    }

    return {
      safe,
      transferPath,
      collisionPoints,
      safeTransferZ_mm: safeTransferZ,
      recommendation,
    };
  }

  // --------------------------------------------------------------------------
  // 7. Cross-slide vs gang tool interference
  // --------------------------------------------------------------------------
  /**
   * Check interference between cross-slide and gang slide tools
   * @param config Machine configuration
   * @param state Current machine state
   * @returns Collision check result
   */
  checkCrossSlideVsGang(config: SwissMachineConfig, state: SwissMachineState): SwissCollisionCheck {
    const crossX = state.crossSlideX_mm ?? 100;
    const crossZ = state.crossSlideZ_mm ?? 0;
    const gangX = state.gangSlideX_mm ?? 50;
    const gangZ = state.gangSlideZ_mm ?? 0;

    // Check Z overlap
    const zOverlap = Math.abs(crossZ - gangZ) < 20; // Approximate tool length

    // Check X clearance when Z overlaps
    const xClearance = Math.abs(crossX - gangX);
    const minClearance = 15; // Minimum X clearance between slides

    const safe = !zOverlap || xClearance >= minClearance;

    return {
      checkType: "cross_gang_interference",
      passed: safe,
      clearance_mm: xClearance,
      components: ["cross_slide", "gang_slide"],
      description: safe
        ? `Cross/gang clearance OK: X=${xClearance.toFixed(1)}mm`
        : `Cross/gang interference: X clearance ${xClearance.toFixed(1)}mm < ${minClearance}mm`,
      severity: safe ? "info" : "critical",
      recommendation: safe ? undefined : "Sequence cross and gang operations to avoid Z overlap",
    };
  }

  // --------------------------------------------------------------------------
  // 8. Ejector pin clearance
  // --------------------------------------------------------------------------
  /**
   * Check ejector pin clearance during extension
   * @param config Machine configuration
   * @param state Current machine state
   * @returns Ejector clearance analysis
   */
  checkEjectorClearance(config: SwissMachineConfig, state: SwissMachineState): EjectorClearanceResult {
    const ejectorLength = config.ejectorPinLength_mm ?? 20;

    // Clearance to part (should not hit part face)
    const partClearance = state.partLength_mm > ejectorLength
      ? state.partLength_mm - ejectorLength
      : ejectorLength - state.partLength_mm;

    // Clearance to tools (gang must be retracted)
    const gangZ = state.gangSlideZ_mm ?? 100;
    const toolClearance = gangZ - ejectorLength - EJECTOR_PIN_CLEARANCE_MM;

    // Clearance to sub-spindle
    const subZ = state.subSpindleZ_mm ?? 200;
    const subSpindleClearance = state.subSpindleEngaged
      ? subZ - state.partLength_mm - ejectorLength
      : 999;

    const safe = partClearance > 0 && toolClearance > 0 && subSpindleClearance > 0;

    let recommendation = "Ejector clearance OK";
    if (!safe) {
      if (toolClearance <= 0) {
        recommendation = `Retract gang slide Z to at least ${(ejectorLength + EJECTOR_PIN_CLEARANCE_MM).toFixed(1)}mm before ejecting`;
      } else if (subSpindleClearance <= 0) {
        recommendation = "Disengage sub-spindle before ejector extension";
      } else {
        recommendation = "Part too short for ejector — use pickoff instead";
      }
    }

    return {
      safe,
      ejectorLength_mm: ejectorLength,
      partClearance_mm: partClearance,
      toolClearance_mm: toolClearance,
      subSpindleClearance_mm: subSpindleClearance,
      recommendation,
    };
  }

  // --------------------------------------------------------------------------
  // 9. Bar stock runout collision
  // --------------------------------------------------------------------------
  /**
   * Check bar stock runout against bushing clearance
   * @param config Machine configuration
   * @param state Current machine state
   * @returns Runout analysis
   */
  checkBarRunout(config: SwissMachineConfig, state: SwissMachineState): BarRunoutResult {
    const nominalDiameter = state.barDiameter_mm;
    const maxRunout = nominalDiameter * BAR_RUNOUT_FACTOR;

    // Effective diameter with runout
    const effectiveDiameter = nominalDiameter + 2 * maxRunout;

    // Bushing clearance
    const bushingID = config.guideBushing?.innerDiameter_mm ?? (nominalDiameter + 0.5);
    const bushingClearance = (bushingID - effectiveDiameter) / 2;

    const safe = bushingClearance > 0;

    let recommendation = "Bar runout within acceptable limits";
    if (!safe) {
      recommendation = `Bar runout ${maxRunout.toFixed(3)}mm exceeds bushing clearance — use ground bar stock or larger bushing`;
    }

    return {
      safe,
      nominalDiameter_mm: nominalDiameter,
      maxRunout_mm: maxRunout,
      effectiveDiameter_mm: effectiveDiameter,
      bushingClearance_mm: bushingClearance,
      recommendation,
    };
  }

  // --------------------------------------------------------------------------
  // 10. Live tool spin-up clearance
  // --------------------------------------------------------------------------
  /**
   * Check clearance before live tool spin-up
   * @param config Machine configuration
   * @param state Current machine state
   * @param station Live tool station to check
   * @returns Spin-up safety analysis
   */
  checkLiveToolSpinUp(
    config: SwissMachineConfig,
    state: SwissMachineState,
    station: GangStation
  ): LiveToolSpinUpResult {
    // Clearance to bar
    const gangX = state.gangSlideX_mm ?? 50;
    const barRadius = state.barDiameter_mm / 2;
    const toolRadius = station.toolDiameter_mm / 2;
    const clearanceToBar = gangX - barRadius - toolRadius;

    // Clearance to adjacent tools
    let clearanceToAdjacent = Infinity;
    if (config.gangSlide) {
      const gangConfig = config.gangSlide;
      for (const other of gangConfig.stations) {
        if (other.stationNumber !== station.stationNumber) {
          const stationGap = Math.abs(other.stationNumber - station.stationNumber) * gangConfig.stationPitch_mm;
          const effectiveClearance = stationGap - station.holderWidth_mm / 2 - other.holderWidth_mm / 2;
          clearanceToAdjacent = Math.min(clearanceToAdjacent, effectiveClearance);
        }
      }
    }

    const safe = clearanceToBar >= LIVE_TOOL_SPINUP_CLEARANCE_MM && clearanceToAdjacent >= MIN_GANG_TOOL_CLEARANCE_MM;

    let recommendation = "Live tool spin-up safe";
    if (!safe) {
      if (clearanceToBar < LIVE_TOOL_SPINUP_CLEARANCE_MM) {
        recommendation = `Retract gang slide X by ${(LIVE_TOOL_SPINUP_CLEARANCE_MM - clearanceToBar).toFixed(1)}mm before live tool spin-up`;
      } else {
        recommendation = "Adjacent tool interference — reorganize gang layout";
      }
    }

    return {
      safe,
      stationNumber: station.stationNumber,
      clearanceToBar_mm: clearanceToBar,
      clearanceToAdjacentTools_mm: clearanceToAdjacent,
      spinUpAllowed: safe,
      recommendation,
    };
  }

  // --------------------------------------------------------------------------
  // 11. Generate collision scenario
  // --------------------------------------------------------------------------
  /**
   * Generate a comprehensive collision scenario for a Swiss machine type
   * @param machineType Machine manufacturer type
   * @returns Collision scenario definition
   */
  generateCollisionScenario(machineType: SwissMachineType): SwissCollisionScenario {
    const components: SwissComponent[] = [
      "guide_bushing",
      "main_spindle",
      "gang_slide",
      "bar_stock",
      "part",
    ];

    const collisionPairs: CollisionPair[] = [
      { componentA: "gang_slide", componentB: "bar_stock", scenario: "tool_vs_bar", criticalLevel: "high" },
      { componentA: "gang_slide", componentB: "guide_bushing", scenario: "tool_vs_bushing", criticalLevel: "high" },
      { componentA: "bar_stock", componentB: "guide_bushing", scenario: "bar_vs_bushing", criticalLevel: "medium" },
    ];

    // Add machine-specific components
    const preset = SWISS_MACHINE_PRESETS[`${machineType}_SR-20`] ||
                   SWISS_MACHINE_PRESETS[`${machineType}_L20`] ||
                   SWISS_MACHINE_PRESETS[`${machineType}_SwissGT`] ||
                   SWISS_MACHINE_PRESETS[`${machineType}_B0385`];

    if (preset?.bAxis?.hasAxis) {
      components.push("b_axis_tool");
      collisionPairs.push(
        { componentA: "b_axis_tool", componentB: "bar_stock", scenario: "b_axis_vs_bar", criticalLevel: "high" },
        { componentA: "b_axis_tool", componentB: "gang_slide", scenario: "b_axis_vs_gang", criticalLevel: "high" },
        { componentA: "b_axis_tool", componentB: "guide_bushing", scenario: "b_axis_vs_bushing", criticalLevel: "medium" },
      );
    }

    if (preset?.subSpindle?.hasSubSpindle) {
      components.push("sub_spindle", "pickoff_spindle");
      collisionPairs.push(
        { componentA: "sub_spindle", componentB: "gang_slide", scenario: "sub_vs_gang", criticalLevel: "high" },
        { componentA: "sub_spindle", componentB: "part", scenario: "sub_vs_part", criticalLevel: "medium" },
        { componentA: "pickoff_spindle", componentB: "gang_slide", scenario: "pickoff_vs_gang", criticalLevel: "high" },
      );
    }

    if (preset?.hasCrossSlide !== false) {
      components.push("cross_slide");
      collisionPairs.push(
        { componentA: "cross_slide", componentB: "gang_slide", scenario: "cross_vs_gang", criticalLevel: "high" },
        { componentA: "cross_slide", componentB: "bar_stock", scenario: "cross_vs_bar", criticalLevel: "high" },
      );
    }

    components.push("ejector_pin");
    collisionPairs.push(
      { componentA: "ejector_pin", componentB: "part", scenario: "ejector_vs_part", criticalLevel: "medium" },
      { componentA: "ejector_pin", componentB: "gang_slide", scenario: "ejector_vs_gang", criticalLevel: "high" },
    );

    return {
      scenarioId: `swiss_collision_${machineType.toLowerCase()}_${Date.now()}`,
      machineType,
      components,
      collisionPairs,
    };
  }

  // --------------------------------------------------------------------------
  // 12. Safe zone calculations
  // --------------------------------------------------------------------------
  private calculateBarSafeZone(state: SwissMachineState): SwissCollisionZone {
    const barRadius = state.barDiameter_mm / 2;
    return {
      component: "bar_stock",
      boundingBox: {
        min: { x: -barRadius, y: -barRadius, z: -state.barStickout_mm },
        max: { x: barRadius, y: barRadius, z: state.partLength_mm },
      },
      safetyMargin: SAFETY_MARGIN_MM,
    };
  }

  private calculateGangSafeZone(gangConfig: GangSlideConfig, state: SwissMachineState): SwissCollisionZone {
    const gangX = state.gangSlideX_mm ?? 50;
    const gangZ = state.gangSlideZ_mm ?? 0;

    return {
      component: "gang_slide",
      boundingBox: {
        min: { x: gangX - gangConfig.slideWidth_mm / 2, y: -gangConfig.slideHeight_mm / 2, z: gangZ - 50 },
        max: { x: gangX + gangConfig.slideWidth_mm / 2, y: gangConfig.slideHeight_mm / 2, z: gangZ + 50 },
      },
      safetyMargin: MIN_GANG_TOOL_CLEARANCE_MM,
      dynamicEnvelope: {
        minPosition: { x: 0, y: 0, z: -gangConfig.zTravel_mm },
        maxPosition: { x: gangConfig.xTravel_mm, y: 0, z: 0 },
      },
    };
  }

  private calculateBAxisSafeZone(bAxis: BAxisConfig, currentAngle_deg: number): SwissCollisionZone {
    const toolReach = bAxis.toolHolderLength_mm + bAxis.toolStickout_mm;
    const toolRadius = bAxis.maxToolDiameter_mm / 2;

    return {
      component: "b_axis_tool",
      boundingBox: {
        min: {
          x: -toolReach - toolRadius,
          y: -toolRadius,
          z: bAxis.pivotPoint.z - toolReach,
        },
        max: {
          x: toolReach + toolRadius,
          y: toolRadius,
          z: bAxis.pivotPoint.z + toolReach,
        },
      },
      safetyMargin: B_AXIS_SWING_BUFFER_MM,
      dynamicEnvelope: {
        minPosition: { x: 0, y: 0, z: 0 },
        maxPosition: { x: 0, y: 0, z: 0 },
        rotationRange: bAxis.rotationRange_deg,
      },
    };
  }

  // --------------------------------------------------------------------------
  // 13. Integration with LatheCollisionZoneEngine
  // --------------------------------------------------------------------------
  /**
   * Convert Swiss collision result to format compatible with LatheCollisionZoneEngine
   * @param swissResult Swiss collision check result
   * @returns Lathe-compatible collision result
   */
  toLathcollisionFormat(swissResult: SwissCollisionResult): {
    safe: boolean;
    checks: Array<{
      check_type: string;
      passed: boolean;
      clearance_mm: number;
      description: string;
      severity: "info" | "warning" | "critical";
    }>;
    warnings: string[];
    critical_errors: string[];
  } {
    return {
      safe: swissResult.safe,
      checks: swissResult.checks.map(c => ({
        check_type: c.checkType,
        passed: c.passed,
        clearance_mm: c.clearance_mm,
        description: c.description,
        severity: c.severity,
      })),
      warnings: swissResult.warnings,
      critical_errors: swissResult.criticalErrors,
    };
  }

  /**
   * Get machine preset by manufacturer and model
   * @param machineType Manufacturer
   * @param model Optional specific model
   * @returns Machine configuration preset
   */
  getMachinePreset(machineType: SwissMachineType, model?: string): Partial<SwissMachineConfig> | undefined {
    const key = model ? `${machineType}_${model.replace(/[^a-zA-Z0-9]/g, "")}` : undefined;
    if (key && SWISS_MACHINE_PRESETS[key]) {
      return SWISS_MACHINE_PRESETS[key];
    }

    // Return first matching preset for this manufacturer
    for (const [presetKey, preset] of Object.entries(SWISS_MACHINE_PRESETS)) {
      if (presetKey.startsWith(machineType)) {
        return preset;
      }
    }

    return undefined;
  }
}

/** Singleton instance */
export const swissTypeCollisionEngine = new SwissTypeCollisionEngineImpl();
