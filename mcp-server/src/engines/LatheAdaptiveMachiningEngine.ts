/**
 * LatheAdaptiveMachiningEngine — Turning-Specific Adaptive Intelligence
 *
 * Phase 0.26: Dynamic Adaptive Machining for Turning
 *
 * Lathe-specific adaptations that differ from milling:
 *
 * 1. ENGAGEMENT: Continuous engagement (no entry/exit like milling)
 *    - Constant chip load along cut
 *    - Radial depth varies with diameter (OD vs ID vs facing)
 *    - CSS (Constant Surface Speed) affects chip dynamics
 *
 * 2. FORCES: Different force model
 *    - Fc (tangential), Ff (feed), Fp (radial/passive)
 *    - Chip thickness = f * sin(κr) where κr = lead angle
 *    - No tooth-passing frequency, but insert nose radius matters
 *
 * 3. THERMAL: Rotating workpiece
 *    - Heat rotates with part (distributed differently than milling)
 *    - Thermal expansion affects diameter directly (critical for OD/ID)
 *    - Chuck jaw thermal grip changes
 *
 * 4. VIBRATION: Different modes
 *    - Workpiece whip (long parts)
 *    - Chatter at part frequency, not spindle harmonics
 *    - Tailstock/steady rest dynamics
 *
 * 5. WORKHOLDING: Rotational
 *    - Centrifugal force on part AND chuck
 *    - Jaw grip degradation at high RPM
 *    - Part pull-out risk (vs milling's part slip)
 *
 * @module engines/LatheAdaptiveMachiningEngine
 */

import { variabilityEnvelopeEngine } from "./VariabilityEnvelopeEngine.js";
import { variabilitySourceTrackerEngine } from "./VariabilitySourceTrackerEngine.js";
import { contextualBoundaryEngine } from "./ContextualBoundaryEngine.js";

// ============================================================================
// LATHE-SPECIFIC ENGAGEMENT
// ============================================================================

export interface TurningEngagement {
  operationType: "od_turning" | "id_boring" | "facing" | "grooving" | "threading" | "parting";
  currentDiameter: number; // mm
  depthOfCut: number; // mm (ap)
  feedPerRev: number; // mm/rev
  leadAngle: number; // degrees (κr)
  noseRadius: number; // mm
  cuttingSpeed: number; // m/min
  rpm: number;
  chipThickness: number; // h = f * sin(κr)
  chipWidth: number; // b = ap / sin(κr)
  undeformedChipArea: number; // mm²
  materialRemovalRate: number; // mm³/min
}

export interface TurningEngagementProfile {
  operationId: string;
  segments: TurningEngagementSegment[];
  diameterRange: { start: number; end: number };
  cssMode: boolean;
  rpmRange: { min: number; max: number };
}

export interface TurningEngagementSegment {
  startDiameter: number;
  endDiameter: number;
  engagement: TurningEngagement;
  estimatedTime: number; // seconds
  passNumber: number;
}

// ============================================================================
// LATHE-SPECIFIC FORCES
// ============================================================================

export interface TurningForces {
  Fc: number; // Tangential (main cutting) force, N
  Ff: number; // Feed force, N
  Fp: number; // Passive (radial) force, N
  resultant: number; // N
  torque: number; // Nm at spindle
  power: number; // kW
  specificCuttingForce: number; // kc, MPa
  bendingMoment: number; // Nm on tool
  clampingRequirement: number; // N minimum chuck force
}

export interface TurningForceFactors {
  wearFactor: number; // 1.0-1.5 based on tool wear
  bueFactor: number; // built-up edge effect
  chipBreakingFactor: number; // chip breaker resistance
  coolantFactor: number; // lubrication effect
  leadAngleFactor: number; // force distribution
}

// ============================================================================
// LATHE-SPECIFIC THERMAL
// ============================================================================

export interface TurningThermalState {
  toolTemperature: number; // °C
  chipTemperature: number; // °C
  partSurfaceTemperature: number; // °C
  partBulkTemperature: number; // °C
  chuckJawTemperature: number; // °C
  spindleBearingTemperature: number; // °C
  coolantTemperature: number; // °C

  // Turning-specific
  diameterExpansion: number; // μm (radial growth)
  lengthExpansion: number; // μm (axial growth)
  chuckGripChange: number; // % change in grip force

  // Heat distribution (turning: heat rotates with part)
  heatIntoChip: number; // % (typically 70-80% in turning)
  heatIntoPart: number; // %
  heatIntoTool: number; // %
}

// ============================================================================
// LATHE-SPECIFIC VIBRATION
// ============================================================================

export interface TurningVibrationState {
  // Part-related
  partWhipAmplitude: number; // μm (for slender parts)
  partNaturalFrequency: number; // Hz
  partDampingRatio: number;
  unsupportedLength: number; // mm from chuck/collet
  ldRatio: number; // length/diameter

  // Tool-related
  toolOverhang: number; // mm
  toolDeflection: number; // μm under load
  boringBarStiffness: number; // N/mm (for boring)

  // Support-related
  tailstockEngaged: boolean;
  tailstockForce: number; // N
  steadyRestPosition: number | null; // mm from chuck, null if not used
  steadyRestForce: number; // N

  // Chatter analysis
  chatterRisk: number; // 0-1
  chatterFrequency: number | null; // Hz if detected
  dominantMode: "stable" | "tool_chatter" | "part_whip" | "resonance";
  recommendedRpmShift: number; // % change to avoid chatter
}

// ============================================================================
// LATHE-SPECIFIC WORKHOLDING
// ============================================================================

export interface TurningWorkholdingState {
  workholdingType: "3jaw_chuck" | "collet" | "4jaw_chuck" | "faceplate" | "between_centers" | "mandrel";
  gripDiameter: number; // mm
  gripLength: number; // mm
  gripForce: number; // N
  jawType: "hard" | "soft" | "pie" | "special";

  // Centrifugal effects
  partMass: number; // kg
  partCentrifugalForce: number; // N (at current RPM)
  jawCentrifugalLoss: number; // N (grip force lost to jaw mass)
  effectiveGrip: number; // N (grip - centrifugal losses)

  // Safety
  pullOutRisk: number; // 0-1
  maxSafeRpm: number; // limited by centrifugal
  minRequiredGrip: number; // N (from cutting forces)
  safetyFactor: number; // effective grip / required grip
}

// ============================================================================
// LATHE ADAPTIVE FEED CONTROL
// ============================================================================

export interface LatheAdaptiveFeedConfig {
  targetChipThickness: number; // mm (h)
  cssEnabled: boolean;
  minRpm: number;
  maxRpm: number;
  wearCompensation: boolean;
  thermalCompensation: boolean;
  vibrationCompensation: boolean;
  constantPowerMode: boolean; // limit power, vary feed
  maxPower: number; // kW limit
}

export interface LatheAdaptiveFeedResult {
  originalFeed: number; // mm/rev
  adaptedFeed: number; // mm/rev
  originalRpm: number;
  adaptedRpm: number;
  feedAdjustmentFactor: number;
  rpmAdjustmentFactor: number;
  reason: string;
  constraints: string[];
  predictedForces: TurningForces;
  predictedThermal: Partial<TurningThermalState>;
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class LatheAdaptiveMachiningEngine {
  private operationHistory: TurningEngagementProfile[] = [];
  private readonly maxHistory = 100;

  /**
   * Calculate engagement for turning operation
   */
  calculateTurningEngagement(
    params: {
      operationType: TurningEngagement["operationType"];
      diameter: number;
      depthOfCut: number;
      feedPerRev: number;
      leadAngle: number;
      noseRadius: number;
      cuttingSpeed: number;
    }
  ): TurningEngagement {
    const rpm = (params.cuttingSpeed * 1000) / (Math.PI * params.diameter);
    const leadAngleRad = params.leadAngle * Math.PI / 180;

    // Chip geometry
    const chipThickness = params.feedPerRev * Math.sin(leadAngleRad);
    const chipWidth = params.depthOfCut / Math.sin(leadAngleRad);
    const undeformedChipArea = chipThickness * chipWidth;

    // MRR for turning
    const materialRemovalRate = params.depthOfCut * params.feedPerRev * params.cuttingSpeed * 1000 / 60;

    return {
      operationType: params.operationType,
      currentDiameter: params.diameter,
      depthOfCut: params.depthOfCut,
      feedPerRev: params.feedPerRev,
      leadAngle: params.leadAngle,
      noseRadius: params.noseRadius,
      cuttingSpeed: params.cuttingSpeed,
      rpm,
      chipThickness,
      chipWidth,
      undeformedChipArea,
      materialRemovalRate,
    };
  }

  /**
   * Calculate turning forces using Kienzle model
   */
  calculateTurningForces(
    engagement: TurningEngagement,
    materialKc11: number, // specific cutting force kc1.1
    mc: number, // Kienzle exponent
    factors: Partial<TurningForceFactors> = {}
  ): TurningForces {
    const {
      wearFactor = 1.0,
      bueFactor = 1.0,
      chipBreakingFactor = 1.0,
      coolantFactor = 1.0,
      leadAngleFactor = 1.0,
    } = factors;

    // Kienzle: Fc = kc * A = kc1.1 * h^(1-mc) * b * h = kc1.1 * b * h^(1-mc)
    const h = engagement.chipThickness;
    const b = engagement.chipWidth;

    if (h <= 0 || b <= 0) {
      return {
        Fc: 0, Ff: 0, Fp: 0, resultant: 0, torque: 0, power: 0,
        specificCuttingForce: 0, bendingMoment: 0, clampingRequirement: 0,
      };
    }

    const kc = materialKc11 * Math.pow(h, -mc);
    const totalFactor = wearFactor * bueFactor * chipBreakingFactor * coolantFactor * leadAngleFactor;

    const Fc = kc * b * h * totalFactor;

    // Force ratios depend on lead angle and nose radius
    const leadAngleRad = engagement.leadAngle * Math.PI / 180;
    const Ff = Fc * 0.3 * Math.cos(leadAngleRad); // Feed force
    const Fp = Fc * 0.4 * Math.sin(leadAngleRad); // Passive force

    const resultant = Math.sqrt(Fc * Fc + Ff * Ff + Fp * Fp);

    // Torque at spindle
    const torque = (Fc * engagement.currentDiameter / 2) / 1000; // Nm

    // Cutting power
    const power = (Fc * engagement.cuttingSpeed) / 60000; // kW

    // Bending moment on tool
    const toolOverhang = 30; // mm assumed
    const bendingMoment = (Fp * toolOverhang) / 1000; // Nm

    // Clamping requirement (friction method)
    const frictionCoeff = 0.25;
    const safetyFactor = 2.5;
    const clampingRequirement = (resultant * safetyFactor) / frictionCoeff;

    return {
      Fc,
      Ff,
      Fp,
      resultant,
      torque,
      power,
      specificCuttingForce: kc,
      bendingMoment,
      clampingRequirement,
    };
  }

  /**
   * Calculate thermal state for turning
   */
  calculateTurningThermal(
    engagement: TurningEngagement,
    forces: TurningForces,
    coolantType: "flood" | "mist" | "hpc" | "dry" | "mql",
    partLength: number,
    partDiameter: number
  ): TurningThermalState {
    // Heat generation = cutting power
    const heatRate = forces.power * 1000; // W

    // Heat partition (high speed → more into chip)
    const speedFactor = Math.min(1, engagement.cuttingSpeed / 300);
    const heatIntoChip = 0.7 + 0.15 * speedFactor;
    const heatIntoTool = 0.15 - 0.05 * speedFactor;
    const heatIntoPart = 1 - heatIntoChip - heatIntoTool;

    // Coolant effectiveness
    const coolantFactors: Record<typeof coolantType, number> = {
      dry: 1.0,
      mist: 0.7,
      mql: 0.6,
      flood: 0.4,
      hpc: 0.25,
    };
    const coolantFactor = coolantFactors[coolantType];

    // Temperature estimates
    const toolTemperature = 200 + (heatIntoTool * heatRate / 100) * coolantFactor;
    const chipTemperature = 400 + (heatIntoChip * heatRate / 50);
    const partSurfaceTemperature = 25 + (heatIntoPart * heatRate / 300) * coolantFactor;
    const partBulkTemperature = 20 + (partSurfaceTemperature - 20) * 0.3;

    // Thermal expansion (critical for turning!)
    const thermalExpCoeff = 12; // μm/m/°C for steel
    const tempRise = partSurfaceTemperature - 20;

    // Diameter expansion (radial growth affects OD/ID tolerance)
    const diameterExpansion = tempRise * thermalExpCoeff * partDiameter / 1000;

    // Length expansion (axial growth affects facing/shoulder)
    const lengthExpansion = tempRise * thermalExpCoeff * partLength / 1000;

    // Chuck grip change (thermal expansion of jaws and part)
    const chuckJawTemperature = 25 + tempRise * 0.2;
    const chuckGripChange = -(chuckJawTemperature - 25) * 0.5; // grip decreases with temp

    return {
      toolTemperature,
      chipTemperature,
      partSurfaceTemperature,
      partBulkTemperature,
      chuckJawTemperature,
      spindleBearingTemperature: 35,
      coolantTemperature: 22 + heatRate * 0.001,
      diameterExpansion,
      lengthExpansion,
      chuckGripChange,
      heatIntoChip: heatIntoChip * 100,
      heatIntoPart: heatIntoPart * 100,
      heatIntoTool: heatIntoTool * 100,
    };
  }

  /**
   * Assess turning vibration risk
   */
  assessTurningVibration(
    engagement: TurningEngagement,
    forces: TurningForces,
    partGeometry: {
      totalLength: number;
      grippedLength: number;
      minDiameter: number;
      mass: number;
    },
    toolGeometry: {
      overhang: number;
      shankSize: number;
      isBoring: boolean;
    },
    support: {
      tailstockEngaged: boolean;
      tailstockForce: number;
      steadyRestPosition: number | null;
      steadyRestForce: number;
    }
  ): TurningVibrationState {
    const unsupportedLength = support.tailstockEngaged
      ? partGeometry.totalLength / 2
      : partGeometry.totalLength - partGeometry.grippedLength;

    const ldRatio = unsupportedLength / partGeometry.minDiameter;

    // Part natural frequency (cantilever beam approximation)
    const E = 200000; // MPa (steel)
    const I = (Math.PI * Math.pow(partGeometry.minDiameter, 4)) / 64;
    const m = partGeometry.mass;
    const L = unsupportedLength;

    const effectiveLength = support.tailstockEngaged ? L * 0.7 : L;
    const partNaturalFrequency = effectiveLength > 0
      ? (1 / (2 * Math.PI)) * Math.sqrt((3 * E * 1e6 * I) / (m * Math.pow(effectiveLength, 3)))
      : 1000;

    // Part whip amplitude
    const partWhipAmplitude = ldRatio > 4
      ? (forces.Fp * Math.pow(unsupportedLength, 3)) / (3 * E * I) * 1000
      : 0;

    // Tool deflection
    const toolDeflection = toolGeometry.isBoring
      ? (forces.Fp * Math.pow(toolGeometry.overhang, 3)) / (3 * E * Math.pow(toolGeometry.shankSize, 4) / 64) * 1000
      : (forces.Fp * toolGeometry.overhang) / 1000;

    // Boring bar stiffness
    const boringBarStiffness = toolGeometry.isBoring
      ? (3 * E * Math.pow(toolGeometry.shankSize, 4) / 64) / Math.pow(toolGeometry.overhang, 3)
      : 0;

    // Chatter risk assessment
    let chatterRisk = 0;

    // L/D risk
    if (ldRatio > 6) chatterRisk += 0.4;
    else if (ldRatio > 4) chatterRisk += 0.2;

    // Tool overhang risk (boring)
    if (toolGeometry.isBoring && toolGeometry.overhang / toolGeometry.shankSize > 4) {
      chatterRisk += 0.3;
    }

    // Force level risk
    if (forces.Fp > 500) chatterRisk += 0.2;

    // Support mitigation
    if (support.tailstockEngaged) chatterRisk *= 0.6;
    if (support.steadyRestPosition !== null) chatterRisk *= 0.5;

    chatterRisk = Math.min(1, chatterRisk);

    let dominantMode: TurningVibrationState["dominantMode"] = "stable";
    if (chatterRisk > 0.6) {
      dominantMode = ldRatio > 4 ? "part_whip" : "tool_chatter";
    } else if (chatterRisk > 0.3) {
      dominantMode = "resonance";
    }

    // RPM shift recommendation (avoid integer ratio with natural freq)
    const currentToothFreq = engagement.rpm / 60;
    const ratio = partNaturalFrequency / currentToothFreq;
    const nearInteger = Math.abs(ratio - Math.round(ratio)) < 0.1;
    const recommendedRpmShift = nearInteger ? (ratio > Math.round(ratio) ? 10 : -10) : 0;

    return {
      partWhipAmplitude,
      partNaturalFrequency,
      partDampingRatio: 0.03,
      unsupportedLength,
      ldRatio,
      toolOverhang: toolGeometry.overhang,
      toolDeflection,
      boringBarStiffness,
      tailstockEngaged: support.tailstockEngaged,
      tailstockForce: support.tailstockForce,
      steadyRestPosition: support.steadyRestPosition,
      steadyRestForce: support.steadyRestForce,
      chatterRisk,
      chatterFrequency: chatterRisk > 0.5 ? partNaturalFrequency : null,
      dominantMode,
      recommendedRpmShift,
    };
  }

  /**
   * Assess workholding for turning
   */
  assessTurningWorkholding(
    workholdingParams: {
      type: TurningWorkholdingState["workholdingType"];
      gripDiameter: number;
      gripLength: number;
      gripForce: number;
      jawType: TurningWorkholdingState["jawType"];
      jawMass: number; // kg per jaw
      numJaws: number;
    },
    partParams: {
      mass: number;
      maxDiameter: number;
    },
    rpm: number,
    forces: TurningForces
  ): TurningWorkholdingState {
    const omega = (2 * Math.PI * rpm) / 60;

    // Centrifugal force on part (acts outward, helps grip on OD)
    const partCenterOfMass = workholdingParams.gripDiameter / 2;
    const partCentrifugalForce = partParams.mass * omega * omega * (partCenterOfMass / 1000);

    // Centrifugal force on jaws (reduces grip)
    const jawCenterOfMass = (workholdingParams.gripDiameter / 2 + 30) / 1000; // mm to m
    const jawCentrifugalLoss = workholdingParams.jawMass * workholdingParams.numJaws * omega * omega * jawCenterOfMass;

    // Effective grip (for OD chucking, part centrifugal helps slightly)
    const effectiveGrip = workholdingParams.gripForce - jawCentrifugalLoss + partCentrifugalForce * 0.3;

    // Minimum required grip
    const frictionCoeff = workholdingParams.jawType === "soft" ? 0.3 : 0.2;
    const safetyFactor = 2.5;
    const minRequiredGrip = (forces.resultant * safetyFactor) / frictionCoeff;

    // Pull-out risk
    const safetyFactorActual = effectiveGrip / minRequiredGrip;
    const pullOutRisk = safetyFactorActual < 1.5 ? Math.min(1, 1.5 / safetyFactorActual - 1) : 0;

    // Max safe RPM (grip = 150% of required)
    const targetGrip = minRequiredGrip * 1.5;
    const maxSafeOmega = workholdingParams.gripForce > targetGrip
      ? Math.sqrt((workholdingParams.gripForce - targetGrip) / (workholdingParams.jawMass * workholdingParams.numJaws * jawCenterOfMass))
      : 0;
    const maxSafeRpm = (maxSafeOmega * 60) / (2 * Math.PI);

    return {
      workholdingType: workholdingParams.type,
      gripDiameter: workholdingParams.gripDiameter,
      gripLength: workholdingParams.gripLength,
      gripForce: workholdingParams.gripForce,
      jawType: workholdingParams.jawType,
      partMass: partParams.mass,
      partCentrifugalForce,
      jawCentrifugalLoss,
      effectiveGrip: Math.max(0, effectiveGrip),
      pullOutRisk,
      maxSafeRpm: Math.max(0, maxSafeRpm),
      minRequiredGrip,
      safetyFactor: safetyFactorActual,
    };
  }

  /**
   * Adaptive feed control for turning
   */
  adaptTurningParameters(
    currentEngagement: TurningEngagement,
    forces: TurningForces,
    thermal: TurningThermalState,
    vibration: TurningVibrationState,
    workholding: TurningWorkholdingState,
    config: Partial<LatheAdaptiveFeedConfig> = {}
  ): LatheAdaptiveFeedResult {
    const {
      targetChipThickness = 0.1,
      cssEnabled = true,
      minRpm = 100,
      maxRpm = 4000,
      wearCompensation = true,
      thermalCompensation = true,
      vibrationCompensation = true,
      constantPowerMode = false,
      maxPower = 15,
    } = config;

    let feedFactor = 1.0;
    let rpmFactor = 1.0;
    const constraints: string[] = [];
    let reason = "nominal";

    // 1. Chip thickness compensation
    if (currentEngagement.chipThickness > 0) {
      const chipRatio = targetChipThickness / currentEngagement.chipThickness;
      feedFactor *= chipRatio;
      if (chipRatio !== 1) {
        reason = chipRatio > 1 ? "low chip thickness - feed increase" : "high chip thickness - feed decrease";
      }
    }

    // 2. Power limiting
    if (constantPowerMode && forces.power > maxPower) {
      const powerFactor = maxPower / forces.power;
      feedFactor *= powerFactor;
      constraints.push(`power limited to ${maxPower}kW`);
    }

    // 3. Vibration compensation
    if (vibrationCompensation && vibration.chatterRisk > 0.3) {
      const vibrationFactor = 1 - vibration.chatterRisk * 0.4;
      feedFactor *= vibrationFactor;
      constraints.push(`vibration: ${(vibrationFactor * 100).toFixed(0)}%`);

      // RPM shift for chatter avoidance
      if (vibration.recommendedRpmShift !== 0) {
        rpmFactor *= (1 + vibration.recommendedRpmShift / 100);
        constraints.push(`rpm shift: ${vibration.recommendedRpmShift > 0 ? "+" : ""}${vibration.recommendedRpmShift}%`);
      }
    }

    // 4. Thermal compensation
    if (thermalCompensation) {
      // Reduce feed if thermal expansion significant relative to tolerance
      const toleranceAssumed = 0.02; // mm
      if (thermal.diameterExpansion / 1000 > toleranceAssumed * 0.3) {
        const thermalFactor = 0.9;
        feedFactor *= thermalFactor;
        constraints.push(`thermal expansion ${thermal.diameterExpansion.toFixed(1)}μm`);
      }
    }

    // 5. Workholding safety
    if (workholding.safetyFactor < 2.0) {
      const workholdingFactor = Math.max(0.5, workholding.safetyFactor / 2.0);
      feedFactor *= workholdingFactor;
      constraints.push(`workholding safety: ${workholding.safetyFactor.toFixed(1)}x`);
    }

    // 6. RPM limits
    let adaptedRpm = currentEngagement.rpm * rpmFactor;
    adaptedRpm = Math.max(minRpm, Math.min(maxRpm, adaptedRpm));
    if (adaptedRpm !== currentEngagement.rpm * rpmFactor) {
      rpmFactor = adaptedRpm / currentEngagement.rpm;
      constraints.push(`rpm clamped to ${adaptedRpm.toFixed(0)}`);
    }

    // Final feed
    feedFactor = Math.max(0.3, Math.min(2.0, feedFactor));
    const adaptedFeed = currentEngagement.feedPerRev * feedFactor;

    // Predict new forces
    const adaptedEngagement = this.calculateTurningEngagement({
      operationType: currentEngagement.operationType,
      diameter: currentEngagement.currentDiameter,
      depthOfCut: currentEngagement.depthOfCut,
      feedPerRev: adaptedFeed,
      leadAngle: currentEngagement.leadAngle,
      noseRadius: currentEngagement.noseRadius,
      cuttingSpeed: (adaptedRpm * Math.PI * currentEngagement.currentDiameter) / 1000,
    });

    const predictedForces = this.calculateTurningForces(adaptedEngagement, 2000, 0.25);

    return {
      originalFeed: currentEngagement.feedPerRev,
      adaptedFeed,
      originalRpm: currentEngagement.rpm,
      adaptedRpm,
      feedAdjustmentFactor: feedFactor,
      rpmAdjustmentFactor: rpmFactor,
      reason,
      constraints,
      predictedForces,
      predictedThermal: {
        diameterExpansion: thermal.diameterExpansion * feedFactor,
        lengthExpansion: thermal.lengthExpansion * feedFactor,
      },
    };
  }

  /**
   * Generate CSS program with adaptive feed
   */
  generateAdaptiveCSSProgram(
    profile: TurningEngagementProfile,
    config: Partial<LatheAdaptiveFeedConfig> = {}
  ): string[] {
    const gcode: string[] = [
      "(PRISM LATHE ADAPTIVE CONTROL)",
      `(CSS Mode: ${profile.cssMode ? "ON" : "OFF"})`,
      `(Diameter range: ${profile.diameterRange.start} to ${profile.diameterRange.end})`,
      "",
    ];

    if (profile.cssMode) {
      gcode.push(`G96 S${Math.round(profile.segments[0]?.engagement.cuttingSpeed ?? 150)}`);
      gcode.push(`G50 S${Math.round(profile.rpmRange.max)}`);
    }

    for (const segment of profile.segments) {
      const comment = `(Pass ${segment.passNumber}: D${segment.startDiameter.toFixed(1)} to D${segment.endDiameter.toFixed(1)})`;
      gcode.push(comment);
      gcode.push(`F${segment.engagement.feedPerRev.toFixed(3)}`);
    }

    gcode.push("", "(PRISM AFC COMPLETE)");
    return gcode;
  }

  /**
   * Record operation for learning
   */
  recordOperation(profile: TurningEngagementProfile): void {
    this.operationHistory.push(profile);
    if (this.operationHistory.length > this.maxHistory) {
      this.operationHistory.shift();
    }
  }

  /**
   * Get operation history
   */
  getOperationHistory(): TurningEngagementProfile[] {
    return [...this.operationHistory];
  }
}

export const latheAdaptiveMachiningEngine = new LatheAdaptiveMachiningEngine();
