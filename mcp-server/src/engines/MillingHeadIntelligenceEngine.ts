/**
 * MillingHeadIntelligenceEngine.ts
 * Intelligence for milling head configurations on turning centers
 *
 * Covers: B-axis tilting heads, orthogonal heads, universal heads,
 * nutating heads, angular heads, gear-driven attachments
 */

// EngineResult type for method returns
interface EngineResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Types
// ============================================================================

export type MillingHeadType =
  | "b_axis_continuous"
  | "b_axis_indexed"
  | "orthogonal_fixed"
  | "orthogonal_swivel"
  | "universal_ac"
  | "universal_bc"
  | "nutating"
  | "angular_fixed"
  | "angular_adjustable"
  | "gear_driven_90"
  | "gear_driven_adjustable";

export interface MillingHeadConfig {
  headId: string;
  headType: MillingHeadType;

  // B-axis parameters
  hasBAxis: boolean;
  bAxisRange_deg?: { min: number; max: number };
  bAxisResolution_deg?: number;
  bAxisClampingTorque_Nm?: number;
  bAxisIndexPositions?: number; // For indexed heads

  // Spindle parameters
  maxSpindleRpm: number;
  spindlePower_kW: number;
  spindleTorque_Nm: number;
  spindleInterface: string; // HSK-A63, CAT40, etc.

  // Physical parameters
  headWeight_kg: number;
  headLength_mm: number;
  minClearanceRadius_mm: number;
  coolantThroughSpindle: boolean;
  coolantPressure_bar?: number;

  // Capabilities
  supportedOperations: string[];
  maxToolDiameter_mm: number;
  maxToolLength_mm: number;
}

export interface BAxisOperation {
  operationId: string;
  operationType: string;
  requiredBAngle_deg: number;
  toleranceAngle_deg?: number;
  surfaceNormal: { x: number; y: number; z: number };
  approachVector: { x: number; y: number; z: number };
  material: string;
}

export interface BAxisPlan {
  isCapable: boolean;
  bPositions: BAxisPosition[];
  totalIndexTime_seconds: number;
  interpolationRequired: boolean;
  collisionRisks: string[];
  recommendations: string[];
}

export interface BAxisPosition {
  positionId: string;
  bAngle_deg: number;
  operation: string;
  clamped: boolean;
  dwellTime_seconds: number;
  approachClearance_mm: number;
}

export interface OrthogonalHeadAnalysis {
  headType: string;
  applicableOperations: string[];
  limitingFactors: string[];
  reachEnvelope: ReachEnvelope;
  powerAtAngle: PowerAtAngle[];
  recommendations: string[];
}

export interface ReachEnvelope {
  xRange_mm: { min: number; max: number };
  yRange_mm: { min: number; max: number };
  zRange_mm: { min: number; max: number };
  restrictedZones: RestrictedZone[];
}

export interface RestrictedZone {
  description: string;
  center: { x: number; y: number; z: number };
  radius_mm: number;
}

export interface PowerAtAngle {
  bAngle_deg: number;
  availablePower_kW: number;
  availableTorque_Nm: number;
  maxRpm: number;
  notes: string;
}

export interface UniversalHeadPlan {
  headConfiguration: string;
  aAngle_deg: number;
  cAngle_deg: number;
  toolVector: { x: number; y: number; z: number };
  reachable: boolean;
  singularityRisk: boolean;
  optimalApproach: string;
}

export interface AngularHeadAnalysis {
  headType: string;
  fixedAngle_deg?: number;
  adjustableRange_deg?: { min: number; max: number };
  gearRatio?: number;
  speedReduction_percent: number;
  torqueIncrease_percent: number;
  applications: string[];
  limitations: string[];
}

export interface HeadSelectionRecommendation {
  recommendedHead: MillingHeadType;
  alternativeHeads: MillingHeadType[];
  reasons: string[];
  tradeoffs: string[];
  estimatedCost: "low" | "medium" | "high";
}

export interface CollisionAnalysis {
  hasCollision: boolean;
  collisionPoints: CollisionPoint[];
  safeBRange_deg: { min: number; max: number };
  recommendations: string[];
}

export interface CollisionPoint {
  bAngle_deg: number;
  collidingWith: string;
  clearance_mm: number;
  severity: "warning" | "critical";
}

export interface InterpolationPlan {
  type: "simultaneous" | "positioning";
  axes: string[];
  feedRate_mmPerMin: number;
  interpolationPath: PathSegment[];
  estimatedTime_seconds: number;
  accuracy_mm: number;
}

export interface PathSegment {
  segmentId: string;
  startB_deg: number;
  endB_deg: number;
  startC_deg?: number;
  endC_deg?: number;
  linearMove: { x: number; y?: number; z: number };
  feedRate_mmPerMin: number;
}

// ============================================================================
// Engine Implementation
// ============================================================================

export class MillingHeadIntelligenceEngine {
  readonly name = "MillingHeadIntelligenceEngine";
  readonly version = "1.0.0";
  readonly description = "Intelligence for milling head configurations on turning centers";

  // Head type specifications
  private readonly headSpecs: Record<MillingHeadType, {
    description: string;
    typicalPower_kW: number;
    typicalRpm: number;
    interpolation: boolean;
    applications: string[];
  }> = {
    b_axis_continuous: {
      description: "Continuous B-axis with full interpolation capability",
      typicalPower_kW: 22,
      typicalRpm: 12000,
      interpolation: true,
      applications: ["5-axis contouring", "Blade machining", "Impeller", "Complex surfaces"],
    },
    b_axis_indexed: {
      description: "Indexed B-axis with discrete positioning",
      typicalPower_kW: 18,
      typicalRpm: 10000,
      interpolation: false,
      applications: ["3+2 machining", "Angular features", "Multi-face machining"],
    },
    orthogonal_fixed: {
      description: "Fixed 90° orthogonal head",
      typicalPower_kW: 15,
      typicalRpm: 8000,
      interpolation: false,
      applications: ["Side milling", "Undercuts", "Hidden features"],
    },
    orthogonal_swivel: {
      description: "Swiveling orthogonal head with limited B range",
      typicalPower_kW: 12,
      typicalRpm: 6000,
      interpolation: false,
      applications: ["Angular pockets", "Compound angles", "5-face machining"],
    },
    universal_ac: {
      description: "Universal head with A and C axes",
      typicalPower_kW: 20,
      typicalRpm: 15000,
      interpolation: true,
      applications: ["Full 5-axis", "Aerospace", "Die mold", "Complex forms"],
    },
    universal_bc: {
      description: "Universal head with B and C axes",
      typicalPower_kW: 22,
      typicalRpm: 12000,
      interpolation: true,
      applications: ["Mill-turn", "Turbine blades", "Medical implants"],
    },
    nutating: {
      description: "Nutating spindle head for continuous indexing",
      typicalPower_kW: 8,
      typicalRpm: 20000,
      interpolation: true,
      applications: ["Micro-milling", "Dental", "Jewelry", "Small precision parts"],
    },
    angular_fixed: {
      description: "Fixed-angle attachment head",
      typicalPower_kW: 5,
      typicalRpm: 4000,
      interpolation: false,
      applications: ["Angled holes", "Chamfers", "Specific angular features"],
    },
    angular_adjustable: {
      description: "Adjustable angle head attachment",
      typicalPower_kW: 7,
      typicalRpm: 5000,
      interpolation: false,
      applications: ["Multiple angles", "Setup flexibility", "Job shop work"],
    },
    gear_driven_90: {
      description: "90° gear-driven angle head",
      typicalPower_kW: 10,
      typicalRpm: 6000,
      interpolation: false,
      applications: ["Right-angle access", "Deep pockets", "Undercut features"],
    },
    gear_driven_adjustable: {
      description: "Adjustable gear-driven angle head",
      typicalPower_kW: 8,
      typicalRpm: 5000,
      interpolation: false,
      applications: ["Variable angles", "Complex fixtures", "Special applications"],
    },
  };

  // ============================================================================
  // B-Axis Planning
  // ============================================================================

  /**
   * Plan B-axis operations
   */
  planBAxisOperations(
    operations: BAxisOperation[],
    config: MillingHeadConfig
  ): EngineResult<BAxisPlan> {
    if (!config.hasBAxis) {
      return {
        success: false,
        error: "Machine configuration does not include B-axis capability",
      };
    }

    const bRange = config.bAxisRange_deg || { min: -120, max: 120 };
    const positions: BAxisPosition[] = [];
    const collisionRisks: string[] = [];
    const recommendations: string[] = [];
    let totalIndexTime = 0;
    let interpolationRequired = false;

    // Check each operation
    for (const op of operations) {
      // Calculate required B angle from surface normal
      const bAngle = this.calculateBAngleFromNormal(op.surfaceNormal);

      // Check if angle is achievable
      if (bAngle < bRange.min || bAngle > bRange.max) {
        collisionRisks.push(
          `Operation ${op.operationId}: Required B=${bAngle}° outside range [${bRange.min}°, ${bRange.max}°]`
        );
        continue;
      }

      // Check if indexed position is available (for indexed heads)
      if (config.headType === "b_axis_indexed" && config.bAxisIndexPositions) {
        const indexStep = 360 / config.bAxisIndexPositions;
        const nearestIndex = Math.round(bAngle / indexStep) * indexStep;
        const deviation = Math.abs(bAngle - nearestIndex);

        if (deviation > (op.toleranceAngle_deg || 0.5)) {
          collisionRisks.push(
            `Operation ${op.operationId}: B=${bAngle}° not available as indexed position`
          );
          continue;
        }
      }

      // Check for interpolation requirement
      if (
        op.operationType.includes("contour") ||
        op.operationType.includes("sculptured")
      ) {
        interpolationRequired = true;
        if (config.headType === "b_axis_indexed") {
          recommendations.push(
            `Operation ${op.operationId} requires B-axis interpolation - consider continuous B-axis`
          );
        }
      }

      // Calculate index time
      const lastPosition = positions[positions.length - 1];
      const indexDelta = lastPosition
        ? Math.abs(bAngle - lastPosition.bAngle_deg)
        : Math.abs(bAngle);
      const indexTime = indexDelta * 0.01; // ~0.01 sec per degree typical
      totalIndexTime += indexTime;

      // Calculate approach clearance
      const approachClearance = this.calculateApproachClearance(
        bAngle,
        config
      );

      positions.push({
        positionId: `B_POS_${positions.length + 1}`,
        bAngle_deg: Math.round(bAngle * 10) / 10,
        operation: op.operationId,
        clamped: config.bAxisClampingTorque_Nm !== undefined,
        dwellTime_seconds: 0.2,
        approachClearance_mm: approachClearance,
      });
    }

    // Recommendations based on analysis
    if (interpolationRequired && config.headType.includes("indexed")) {
      recommendations.push(
        "Upgrade to continuous B-axis for simultaneous interpolation capability"
      );
    }

    if (positions.length > 5) {
      recommendations.push(
        "Consider grouping operations by B-angle to minimize index time"
      );
    }

    const extremeAngles = positions.filter(
      (p) => Math.abs(p.bAngle_deg) > 90
    );
    if (extremeAngles.length > 0) {
      recommendations.push(
        "Extreme B-angles detected - verify spindle clearance to workpiece"
      );
    }

    return {
      success: true,
      data: {
        isCapable: positions.length === operations.length,
        bPositions: positions,
        totalIndexTime_seconds: Math.round(totalIndexTime * 10) / 10,
        interpolationRequired,
        collisionRisks,
        recommendations,
      },
    };
  }

  private calculateBAngleFromNormal(normal: {
    x: number;
    y: number;
    z: number;
  }): number {
    // B-axis rotates around Y, tilting tool from Z towards X
    // Angle = atan2(normal.x, normal.z)
    return Math.atan2(normal.x, normal.z) * (180 / Math.PI);
  }

  private calculateApproachClearance(
    bAngle_deg: number,
    config: MillingHeadConfig
  ): number {
    // Clearance reduces at extreme angles
    const baseClearance = config.minClearanceRadius_mm;
    const angleFactor = 1 - Math.abs(bAngle_deg) / 180;
    return baseClearance * angleFactor;
  }

  // ============================================================================
  // Orthogonal Head Analysis
  // ============================================================================

  /**
   * Analyze orthogonal head capabilities
   */
  analyzeOrthogonalHead(
    config: MillingHeadConfig,
    partEnvelope: { x: number; y: number; z: number }
  ): EngineResult<OrthogonalHeadAnalysis> {
    const headSpec = this.headSpecs[config.headType];

    if (!headSpec) {
      return {
        success: false,
        error: `Unknown head type: ${config.headType}`,
      };
    }

    const applicableOperations = config.supportedOperations || headSpec.applications;
    const limitingFactors: string[] = [];
    const recommendations: string[] = [];

    // Calculate reach envelope
    const headProjection = config.headLength_mm;
    const reachEnvelope: ReachEnvelope = {
      xRange_mm: {
        min: -headProjection,
        max: partEnvelope.x + config.maxToolLength_mm,
      },
      yRange_mm: {
        min: -partEnvelope.y / 2 - config.maxToolLength_mm,
        max: partEnvelope.y / 2 + config.maxToolLength_mm,
      },
      zRange_mm: {
        min: 0,
        max: partEnvelope.z + 50,
      },
      restrictedZones: [
        {
          description: "Headstock interference zone",
          center: { x: 0, y: 0, z: -50 },
          radius_mm: config.minClearanceRadius_mm,
        },
      ],
    };

    // Power at different angles
    const powerAtAngle: PowerAtAngle[] = [];

    if (config.headType.includes("swivel") || config.hasBAxis) {
      const angles = [-90, -45, 0, 45, 90];
      for (const angle of angles) {
        // Power typically reduces at extreme angles due to gear train losses
        const powerFactor = 1 - Math.abs(angle) / 180 * 0.1;
        powerAtAngle.push({
          bAngle_deg: angle,
          availablePower_kW: config.spindlePower_kW * powerFactor,
          availableTorque_Nm: config.spindleTorque_Nm * powerFactor,
          maxRpm: config.maxSpindleRpm * (angle === 0 ? 1 : 0.9),
          notes: angle === 0 ? "Nominal position" : `${Math.abs(angle)}° tilt`,
        });
      }
    } else {
      powerAtAngle.push({
        bAngle_deg: 90, // Orthogonal
        availablePower_kW: config.spindlePower_kW * 0.85, // Gear losses
        availableTorque_Nm: config.spindleTorque_Nm * 1.1, // Torque increase
        maxRpm: config.maxSpindleRpm * 0.8,
        notes: "Fixed 90° position",
      });
    }

    // Limiting factors
    if (config.headType === "orthogonal_fixed") {
      limitingFactors.push("Fixed angle limits approach flexibility");
      recommendations.push("Consider swivel head for multi-angle work");
    }

    if (config.headWeight_kg > 50) {
      limitingFactors.push("Heavy head may limit rapid traverse acceleration");
      recommendations.push("Reduce rapid rates when head is extended");
    }

    if (!config.coolantThroughSpindle) {
      limitingFactors.push("No through-spindle coolant - external coolant required");
      recommendations.push("Use flood coolant with proper nozzle positioning");
    }

    return {
      success: true,
      data: {
        headType: config.headType,
        applicableOperations,
        limitingFactors,
        reachEnvelope,
        powerAtAngle,
        recommendations,
      },
    };
  }

  // ============================================================================
  // Universal Head Planning
  // ============================================================================

  /**
   * Plan universal head orientation
   */
  planUniversalHeadOrientation(
    targetVector: { x: number; y: number; z: number },
    config: MillingHeadConfig
  ): EngineResult<UniversalHeadPlan> {
    if (!config.headType.includes("universal")) {
      return {
        success: false,
        error: "Configuration is not a universal head type",
      };
    }

    // Normalize target vector
    const mag = Math.sqrt(
      targetVector.x ** 2 + targetVector.y ** 2 + targetVector.z ** 2
    );
    const toolVector = {
      x: targetVector.x / mag,
      y: targetVector.y / mag,
      z: targetVector.z / mag,
    };

    let aAngle = 0;
    let cAngle = 0;
    let singularityRisk = false;
    let optimalApproach = "";

    if (config.headType === "universal_ac") {
      // A-C head: A tilts from Z towards X, C rotates around Z
      // A = acos(z), C = atan2(y, x)
      aAngle = Math.acos(toolVector.z) * (180 / Math.PI);
      cAngle = Math.atan2(toolVector.y, toolVector.x) * (180 / Math.PI);

      // Singularity at A=0 (tool pointing down)
      if (Math.abs(aAngle) < 5) {
        singularityRisk = true;
        optimalApproach = "Avoid vertical tool orientation - tilt slightly";
      }
    } else if (config.headType === "universal_bc") {
      // B-C head: B tilts from Z towards X, C rotates around Z
      const bAngle = Math.asin(toolVector.x) * (180 / Math.PI);
      cAngle = Math.atan2(toolVector.y, toolVector.z) * (180 / Math.PI);
      aAngle = bAngle; // Map to output

      // Singularity at B=±90
      if (Math.abs(bAngle) > 85) {
        singularityRisk = true;
        optimalApproach = "Avoid horizontal tool orientation parallel to X";
      }
    }

    // Check if reachable within axis limits
    const bRange = config.bAxisRange_deg || { min: -120, max: 120 };
    const reachable =
      aAngle >= bRange.min &&
      aAngle <= bRange.max &&
      Math.abs(cAngle) <= 360;

    if (!reachable) {
      optimalApproach =
        "Required orientation outside axis limits - consider part reorientation";
    }

    return {
      success: true,
      data: {
        headConfiguration: config.headType,
        aAngle_deg: Math.round(aAngle * 10) / 10,
        cAngle_deg: Math.round(cAngle * 10) / 10,
        toolVector,
        reachable,
        singularityRisk,
        optimalApproach: optimalApproach || "Standard approach viable",
      },
    };
  }

  // ============================================================================
  // Angular Head Analysis
  // ============================================================================

  /**
   * Analyze angular head attachment
   */
  analyzeAngularHead(
    headType: MillingHeadType,
    operation: {
      requiredAngle_deg: number;
      cuttingPower_kW: number;
      rpm: number;
    }
  ): EngineResult<AngularHeadAnalysis> {
    const spec = this.headSpecs[headType];

    if (!spec) {
      return {
        success: false,
        error: `Unknown head type: ${headType}`,
      };
    }

    // Gear ratio analysis for gear-driven heads
    let gearRatio: number | undefined;
    let speedReduction = 0;
    let torqueIncrease = 0;

    if (headType.includes("gear_driven")) {
      gearRatio = 1.5; // Typical for 90° heads
      speedReduction = ((gearRatio - 1) / gearRatio) * 100;
      torqueIncrease = (gearRatio - 1) * 100;
    } else {
      // Belt or direct drive
      speedReduction = 10; // Typical losses
      torqueIncrease = 0;
    }

    // Check operation feasibility
    const limitations: string[] = [];

    if (operation.rpm > spec.typicalRpm) {
      limitations.push(
        `Required RPM ${operation.rpm} exceeds head capacity ${spec.typicalRpm}`
      );
    }

    if (operation.cuttingPower_kW > spec.typicalPower_kW) {
      limitations.push(
        `Required power ${operation.cuttingPower_kW}kW exceeds head capacity ${spec.typicalPower_kW}kW`
      );
    }

    // Angle availability
    let fixedAngle: number | undefined;
    let adjustableRange: { min: number; max: number } | undefined;

    if (headType === "angular_fixed" || headType === "gear_driven_90") {
      fixedAngle = 90;
      if (operation.requiredAngle_deg !== 90) {
        limitations.push(
          `Fixed 90° head cannot achieve required angle ${operation.requiredAngle_deg}°`
        );
      }
    } else if (headType === "angular_adjustable" || headType === "gear_driven_adjustable") {
      adjustableRange = { min: 0, max: 90 };
      if (
        operation.requiredAngle_deg < adjustableRange.min ||
        operation.requiredAngle_deg > adjustableRange.max
      ) {
        limitations.push(
          `Required angle ${operation.requiredAngle_deg}° outside adjustable range`
        );
      }
    }

    return {
      success: true,
      data: {
        headType,
        fixedAngle_deg: fixedAngle,
        adjustableRange_deg: adjustableRange,
        gearRatio,
        speedReduction_percent: Math.round(speedReduction),
        torqueIncrease_percent: Math.round(torqueIncrease),
        applications: spec.applications,
        limitations,
      },
    };
  }

  // ============================================================================
  // Head Selection
  // ============================================================================

  /**
   * Recommend optimal milling head for operations
   */
  recommendMillingHead(
    operations: {
      type: string;
      angles: number[];
      powerRequired_kW: number;
      interpolation: boolean;
    }[],
    constraints: {
      budget: "low" | "medium" | "high";
      accuracy_mm: number;
      production: boolean;
    }
  ): EngineResult<HeadSelectionRecommendation> {
    const reasons: string[] = [];
    const tradeoffs: string[] = [];
    let recommendedHead: MillingHeadType = "b_axis_indexed";
    const alternativeHeads: MillingHeadType[] = [];

    // Analyze operation requirements
    const needsInterpolation = operations.some((op) => op.interpolation);
    const maxAngle = Math.max(...operations.flatMap((op) => op.angles.map(Math.abs)));
    const maxPower = Math.max(...operations.map((op) => op.powerRequired_kW));
    const hasMultipleAngles =
      new Set(operations.flatMap((op) => op.angles)).size > 3;

    // Decision logic
    if (needsInterpolation) {
      if (maxPower > 15) {
        recommendedHead = "b_axis_continuous";
        reasons.push("High-power continuous B-axis for interpolated heavy cuts");
        alternativeHeads.push("universal_bc");
      } else {
        recommendedHead = "universal_ac";
        reasons.push("Universal A-C head for full 5-axis interpolation");
        alternativeHeads.push("b_axis_continuous", "universal_bc");
      }
    } else if (maxAngle > 90) {
      recommendedHead = "universal_bc";
      reasons.push("Universal head required for angles beyond 90°");
      alternativeHeads.push("universal_ac");
    } else if (maxAngle === 90 && !hasMultipleAngles) {
      recommendedHead = "orthogonal_fixed";
      reasons.push("Fixed orthogonal head for dedicated 90° operations");
      alternativeHeads.push("gear_driven_90", "orthogonal_swivel");
      tradeoffs.push("Lower cost but limited to single angle");
    } else if (hasMultipleAngles) {
      recommendedHead = "b_axis_indexed";
      reasons.push("Indexed B-axis for multiple discrete angles");
      alternativeHeads.push("orthogonal_swivel", "angular_adjustable");
    } else {
      recommendedHead = "angular_adjustable";
      reasons.push("Adjustable angle head for occasional angular work");
      alternativeHeads.push("gear_driven_adjustable");
    }

    // Budget constraints
    let estimatedCost: HeadSelectionRecommendation["estimatedCost"];
    if (recommendedHead.includes("universal") || recommendedHead === "b_axis_continuous") {
      estimatedCost = "high";
      if (constraints.budget === "low") {
        tradeoffs.push(
          "Recommended head exceeds budget - consider indexed or fixed alternatives"
        );
      }
    } else if (recommendedHead.includes("indexed") || recommendedHead.includes("swivel")) {
      estimatedCost = "medium";
    } else {
      estimatedCost = "low";
    }

    // Accuracy constraints
    if (constraints.accuracy_mm < 0.01 && !recommendedHead.includes("continuous")) {
      reasons.push(
        "High accuracy requirement may need continuous B-axis for smooth surfaces"
      );
    }

    // Production constraints
    if (constraints.production && recommendedHead.includes("universal")) {
      tradeoffs.push(
        "Universal heads have longer index times - verify cycle time impact"
      );
    }

    return {
      success: true,
      data: {
        recommendedHead,
        alternativeHeads,
        reasons,
        tradeoffs,
        estimatedCost,
      },
    };
  }

  // ============================================================================
  // Collision Analysis
  // ============================================================================

  /**
   * Check for head-workpiece collision
   */
  checkCollision(
    config: MillingHeadConfig,
    partGeometry: {
      diameter_mm: number;
      length_mm: number;
      features: Array<{ position_mm: number; height_mm: number }>;
    }
  ): EngineResult<CollisionAnalysis> {
    const collisionPoints: CollisionPoint[] = [];
    const recommendations: string[] = [];

    const bRange = config.bAxisRange_deg || { min: -120, max: 120 };
    let safeMin = bRange.min;
    let safeMax = bRange.max;

    // Check at various B angles
    for (let bAngle = bRange.min; bAngle <= bRange.max; bAngle += 15) {
      const headSwing = config.headLength_mm * Math.sin(Math.abs(bAngle) * Math.PI / 180);
      const partRadius = partGeometry.diameter_mm / 2;

      // Check clearance to part OD
      const clearanceToOD = config.minClearanceRadius_mm - headSwing - partRadius;

      if (clearanceToOD < 0) {
        collisionPoints.push({
          bAngle_deg: bAngle,
          collidingWith: "Part OD",
          clearance_mm: clearanceToOD,
          severity: clearanceToOD < -10 ? "critical" : "warning",
        });

        if (bAngle > 0 && safeMax > bAngle) safeMax = bAngle - 15;
        if (bAngle < 0 && safeMin < bAngle) safeMin = bAngle + 15;
      }

      // Check clearance to features
      for (const feature of partGeometry.features) {
        const featureHeight = feature.height_mm;
        const zAtAngle = config.headLength_mm * Math.cos(bAngle * Math.PI / 180);

        if (zAtAngle < feature.position_mm + featureHeight && zAtAngle > feature.position_mm) {
          collisionPoints.push({
            bAngle_deg: bAngle,
            collidingWith: `Feature at Z=${feature.position_mm}mm`,
            clearance_mm: -featureHeight,
            severity: "warning",
          });
        }
      }
    }

    // Recommendations
    if (collisionPoints.length > 0) {
      const criticalPoints = collisionPoints.filter((p) => p.severity === "critical");
      if (criticalPoints.length > 0) {
        recommendations.push(
          `Critical collisions at B=${criticalPoints.map((p) => p.bAngle_deg).join(", ")}° - avoid these angles`
        );
      }
      recommendations.push(`Safe B-axis range: ${safeMin}° to ${safeMax}°`);
      recommendations.push("Consider shorter tooling or part repositioning");
    }

    return {
      success: true,
      data: {
        hasCollision: collisionPoints.length > 0,
        collisionPoints,
        safeBRange_deg: { min: safeMin, max: safeMax },
        recommendations,
      },
    };
  }

  // ============================================================================
  // Interpolation Planning
  // ============================================================================

  /**
   * Plan B-axis interpolation path
   */
  planInterpolation(
    startState: { b: number; c?: number; x: number; y?: number; z: number },
    endState: { b: number; c?: number; x: number; y?: number; z: number },
    config: MillingHeadConfig,
    material: string
  ): EngineResult<InterpolationPlan> {
    if (config.headType.includes("indexed") || config.headType.includes("fixed")) {
      return {
        success: false,
        error: "Head type does not support interpolation",
      };
    }

    const path: PathSegment[] = [];

    // Calculate deltas
    const deltaB = endState.b - startState.b;
    const deltaC = (endState.c || 0) - (startState.c || 0);
    const deltaX = endState.x - startState.x;
    const deltaY = (endState.y || 0) - (startState.y || 0);
    const deltaZ = endState.z - startState.z;

    // Linear distance
    const linearDist = Math.sqrt(deltaX ** 2 + deltaY ** 2 + deltaZ ** 2);

    // Determine type
    const isSimultaneous = Math.abs(deltaB) > 5 && linearDist > 5;

    // Calculate feed rate based on material
    const materialFactors: Record<string, number> = {
      aluminum: 1.5,
      steel: 1.0,
      titanium: 0.5,
      inconel: 0.3,
    };
    const baseFeed = 500; // mm/min
    const feedRate = baseFeed * (materialFactors[material.toLowerCase()] || 1.0);

    // Segment the path
    const segments = Math.max(1, Math.ceil(Math.abs(deltaB) / 15));
    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;

      path.push({
        segmentId: `SEG_${i + 1}`,
        startB_deg: startState.b + deltaB * t1,
        endB_deg: startState.b + deltaB * t2,
        startC_deg: startState.c !== undefined ? startState.c + deltaC * t1 : undefined,
        endC_deg: endState.c !== undefined ? startState.c! + deltaC * t2 : undefined,
        linearMove: {
          x: deltaX / segments,
          y: deltaY !== 0 ? deltaY / segments : undefined,
          z: deltaZ / segments,
        },
        feedRate_mmPerMin: feedRate,
      });
    }

    // Estimate time
    const angularTime = (Math.abs(deltaB) / 30) * 60; // ~30°/sec typical
    const linearTime = (linearDist / feedRate) * 60;
    const estimatedTime = Math.max(angularTime, linearTime);

    // Accuracy based on path complexity
    const accuracy = segments > 5 ? 0.05 : 0.02;

    return {
      success: true,
      data: {
        type: isSimultaneous ? "simultaneous" : "positioning",
        axes: isSimultaneous
          ? ["B", "X", "Y", "Z"].filter((a, i) => [deltaB, deltaX, deltaY, deltaZ][i] !== 0)
          : ["B"],
        feedRate_mmPerMin: feedRate,
        interpolationPath: path,
        estimatedTime_seconds: Math.round(estimatedTime * 10) / 10,
        accuracy_mm: accuracy,
      },
    };
  }

  // ============================================================================
  // Dispatcher Actions
  // ============================================================================

  async executeAction(
    action: string,
    params: Record<string, unknown>
  ): Promise<EngineResult<unknown>> {
    switch (action) {
      case "milling_head_plan_baxis":
        return this.planBAxisOperations(
          params.operations as BAxisOperation[],
          params.config as MillingHeadConfig
        );

      case "milling_head_analyze_orthogonal":
        return this.analyzeOrthogonalHead(
          params.config as MillingHeadConfig,
          params.partEnvelope as { x: number; y: number; z: number }
        );

      case "milling_head_plan_universal":
        return this.planUniversalHeadOrientation(
          params.targetVector as { x: number; y: number; z: number },
          params.config as MillingHeadConfig
        );

      case "milling_head_analyze_angular":
        return this.analyzeAngularHead(
          params.headType as MillingHeadType,
          params.operation as { requiredAngle_deg: number; cuttingPower_kW: number; rpm: number }
        );

      case "milling_head_recommend":
        return this.recommendMillingHead(
          params.operations as Array<{
            type: string;
            angles: number[];
            powerRequired_kW: number;
            interpolation: boolean;
          }>,
          params.constraints as {
            budget: "low" | "medium" | "high";
            accuracy_mm: number;
            production: boolean;
          }
        );

      case "milling_head_check_collision":
        return this.checkCollision(
          params.config as MillingHeadConfig,
          params.partGeometry as {
            diameter_mm: number;
            length_mm: number;
            features: Array<{ position_mm: number; height_mm: number }>;
          }
        );

      case "milling_head_plan_interpolation":
        return this.planInterpolation(
          params.startState as { b: number; c?: number; x: number; y?: number; z: number },
          params.endState as { b: number; c?: number; x: number; y?: number; z: number },
          params.config as MillingHeadConfig,
          params.material as string
        );

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }
}

export const millingHeadIntelligenceEngine = new MillingHeadIntelligenceEngine();
