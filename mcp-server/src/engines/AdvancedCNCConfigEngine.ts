/**
 * AdvancedCNCConfigEngine.ts
 * Intelligence for advanced CNC configurations, mill-turn centers,
 * and complex machine capabilities
 *
 * Covers: Mill-turn configurations, multi-channel CNCs, advanced interpolation,
 * NURBS, high-speed machining modes, collision avoidance systems
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

export type MachineClass =
  | "turning_center"
  | "mill_turn"
  | "turn_mill"
  | "multi_task"
  | "vertical_turning"
  | "horizontal_boring"
  | "5axis_mill"
  | "swiss_type";

export type ControllerType =
  | "fanuc_0i"
  | "fanuc_30i"
  | "fanuc_31i"
  | "siemens_840d"
  | "siemens_828d"
  | "okuma_osp"
  | "mazak_mazatrol"
  | "dmg_celos"
  | "haas_ngc"
  | "mitsubishi_m80"
  | "heidenhain_tnc640"
  | "fagor_8070";

export interface AdvancedCNCConfig {
  machineId: string;
  machineClass: MachineClass;
  controllerType: ControllerType;

  // Channel configuration
  channelCount: number;
  channels: ChannelConfig[];

  // Axis configuration
  totalAxes: number;
  linearAxes: string[]; // X, Y, Z, W, U, V
  rotaryAxes: string[]; // A, B, C
  spindleAxes: string[]; // S1, S2

  // Advanced features
  features: AdvancedFeatures;

  // Workholding
  spindles: SpindleConfig[];
  turrets: TurretInfo[];

  // Performance
  lookAheadBlocks: number;
  blockProcessingTime_ms: number;
  maxProgramSize_mb: number;
}

export interface ChannelConfig {
  channelId: string;
  assignedAxes: string[];
  assignedSpindle: string;
  primaryFunction: "turning" | "milling" | "mixed";
  canSynchronize: boolean;
}

export interface AdvancedFeatures {
  highSpeedMachining: boolean;
  nurbsInterpolation: boolean;
  aiContourControl: boolean;
  smoothTcp: boolean; // Tool Center Point
  collisionAvoidance: boolean;
  adaptiveFeedControl: boolean;
  spindleSync: boolean;
  polygonTurning: boolean;
  threadMillingCycles: boolean;
  skivingCycles: boolean;
  multiAxisTurning: boolean;
  turretSync: boolean;
  balancedCutting: boolean;
  superimposedAxes: boolean;
  tiltedWorkPlane: boolean;
  dynamicFixtureOffset: boolean;
}

export interface SpindleConfig {
  spindleId: string;
  type: "main" | "sub" | "milling" | "driven";
  maxRpm: number;
  power_kW: number;
  torque_Nm: number;
  hasEncoder: boolean;
  cAxisCapable: boolean;
  cAxisResolution_deg?: number;
}

export interface TurretInfo {
  turretId: string;
  stationCount: number;
  drivenStations: number;
  position: "upper" | "lower" | "gang";
}

export interface MillTurnAnalysis {
  isCapable: boolean;
  configurationScore: number; // 0-100
  turningCapabilities: string[];
  millingCapabilities: string[];
  integratedCapabilities: string[];
  limitations: string[];
  recommendations: string[];
}

export interface ChannelSyncPlan {
  channels: ChannelOperation[];
  syncPoints: SyncPoint[];
  totalCycleTime_seconds: number;
  efficiency_percent: number;
  waitTime_seconds: number;
}

export interface ChannelOperation {
  channelId: string;
  operations: OperationStep[];
  startTime_seconds: number;
  endTime_seconds: number;
}

export interface OperationStep {
  stepId: string;
  operation: string;
  duration_seconds: number;
  axes: string[];
  requiresSync: boolean;
}

export interface SyncPoint {
  pointId: string;
  timeStamp_seconds: number;
  syncType: "wait" | "handoff" | "coordinated";
  channels: string[];
  description: string;
}

export interface InterpolationCapability {
  type: string;
  supported: boolean;
  accuracy_mm: number;
  maxFeed_mmPerMin: number;
  lookAhead: number;
  notes: string;
}

export interface HSMAnalysis {
  isEnabled: boolean;
  lookAheadBlocks: number;
  cornerRounding_mm: number;
  feedForwardGain: number;
  jerkLimit_mPerSec3: number;
  accelerationMode: string;
  recommendations: string[];
}

export interface CollisionAvoidanceConfig {
  isEnabled: boolean;
  checkInterval_ms: number;
  protectedZones: ProtectedZone[];
  responseAction: "stop" | "retract" | "alarm";
  overrideCapable: boolean;
}

export interface ProtectedZone {
  zoneId: string;
  description: string;
  geometry: "cylinder" | "box" | "sphere";
  dimensions: Record<string, number>;
  priority: "critical" | "warning";
}

export interface ControllerComparison {
  controller1: ControllerType;
  controller2: ControllerType;
  featureComparison: FeatureComparison[];
  recommendation: ControllerType;
  reasons: string[];
}

export interface FeatureComparison {
  feature: string;
  controller1Support: boolean | string;
  controller2Support: boolean | string;
  winner: 1 | 2 | "tie";
}

export interface WorkplaneSetup {
  workplaneId: string;
  tiltA_deg: number;
  tiltB_deg: number;
  rotateC_deg: number;
  origin: { x: number; y: number; z: number };
  isValid: boolean;
  gCode: string[];
  warnings: string[];
}

export interface PartTransferPlan {
  fromSpindle: string;
  toSpindle: string;
  method: "bar_pull" | "part_catch" | "robot" | "gantry";
  transferTime_seconds: number;
  syncRequired: boolean;
  steps: TransferStep[];
}

export interface TransferStep {
  stepNumber: number;
  action: string;
  channel: string;
  axes: string[];
  gCode: string;
}

// ============================================================================
// Engine Implementation
// ============================================================================

export class AdvancedCNCConfigEngine {
  readonly name = "AdvancedCNCConfigEngine";
  readonly version = "1.0.0";
  readonly description = "Intelligence for advanced CNC configurations and mill-turn centers";

  // Controller feature matrix
  private readonly controllerFeatures: Record<ControllerType, Record<string, boolean | number>> = {
    fanuc_0i: {
      hsm: false,
      nurbs: false,
      channels: 1,
      aiContour: false,
      lookAhead: 100,
    },
    fanuc_30i: {
      hsm: true,
      nurbs: true,
      channels: 4,
      aiContour: true,
      lookAhead: 1000,
    },
    fanuc_31i: {
      hsm: true,
      nurbs: true,
      channels: 2,
      aiContour: true,
      lookAhead: 400,
    },
    siemens_840d: {
      hsm: true,
      nurbs: true,
      channels: 10,
      aiContour: true,
      lookAhead: 2000,
    },
    siemens_828d: {
      hsm: true,
      nurbs: true,
      channels: 2,
      aiContour: true,
      lookAhead: 500,
    },
    okuma_osp: {
      hsm: true,
      nurbs: true,
      channels: 4,
      aiContour: true,
      lookAhead: 500,
    },
    mazak_mazatrol: {
      hsm: true,
      nurbs: true,
      channels: 4,
      aiContour: true,
      lookAhead: 600,
    },
    dmg_celos: {
      hsm: true,
      nurbs: true,
      channels: 5,
      aiContour: true,
      lookAhead: 1500,
    },
    haas_ngc: {
      hsm: true,
      nurbs: false,
      channels: 1,
      aiContour: false,
      lookAhead: 80,
    },
    mitsubishi_m80: {
      hsm: true,
      nurbs: true,
      channels: 4,
      aiContour: true,
      lookAhead: 800,
    },
    heidenhain_tnc640: {
      hsm: true,
      nurbs: true,
      channels: 2,
      aiContour: true,
      lookAhead: 2500,
    },
    fagor_8070: {
      hsm: true,
      nurbs: true,
      channels: 4,
      aiContour: true,
      lookAhead: 400,
    },
  };

  // ============================================================================
  // Mill-Turn Analysis
  // ============================================================================

  /**
   * Analyze mill-turn configuration capability
   */
  analyzeMillTurnCapability(
    config: AdvancedCNCConfig
  ): EngineResult<MillTurnAnalysis> {
    const turningCapabilities: string[] = [];
    const millingCapabilities: string[] = [];
    const integratedCapabilities: string[] = [];
    const limitations: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Check machine class
    if (!["mill_turn", "turn_mill", "multi_task"].includes(config.machineClass)) {
      return {
        success: true,
        data: {
          isCapable: false,
          configurationScore: 0,
          turningCapabilities: ["Basic turning only"],
          millingCapabilities: [],
          integratedCapabilities: [],
          limitations: ["Machine class does not support mill-turn operations"],
          recommendations: ["Consider dedicated mill-turn center for combined operations"],
        },
      };
    }

    // Turning capabilities
    if (config.spindles.some((s) => s.type === "main")) {
      turningCapabilities.push("Main spindle turning");
      score += 10;
    }

    if (config.spindles.some((s) => s.type === "sub")) {
      turningCapabilities.push("Sub-spindle backworking");
      integratedCapabilities.push("Part handoff between spindles");
      score += 15;
    }

    if (config.features.spindleSync) {
      turningCapabilities.push("Synchronized spindle operations");
      integratedCapabilities.push("Spinning part transfer");
      score += 10;
    }

    if (config.features.polygonTurning) {
      turningCapabilities.push("Polygon turning");
      score += 5;
    }

    // Milling capabilities
    if (config.spindles.some((s) => s.type === "milling")) {
      millingCapabilities.push("Dedicated milling spindle");
      score += 15;
    }

    if (config.features.tiltedWorkPlane) {
      millingCapabilities.push("Tilted workplane programming (G68.2/PLANE)");
      score += 10;
    }

    if (config.rotaryAxes.includes("B")) {
      millingCapabilities.push("B-axis milling capability");
      if (config.features.smoothTcp) {
        millingCapabilities.push("TCP (Tool Center Point) control");
        score += 10;
      }
      score += 10;
    }

    if (config.linearAxes.includes("Y")) {
      millingCapabilities.push("Y-axis off-center milling");
      score += 10;
    }

    // Check for C-axis milling
    const cAxisSpindles = config.spindles.filter((s) => s.cAxisCapable);
    if (cAxisSpindles.length > 0) {
      millingCapabilities.push(
        `C-axis contouring (${cAxisSpindles.length} spindle${cAxisSpindles.length > 1 ? "s" : ""})`
      );
      integratedCapabilities.push("Polar interpolation");
      score += 10;
    }

    // Integrated capabilities
    if (config.features.turretSync) {
      integratedCapabilities.push("Synchronized turret operations");
      score += 5;
    }

    if (config.features.balancedCutting) {
      integratedCapabilities.push("Balanced cutting with multiple tools");
      score += 5;
    }

    if (config.channelCount >= 2) {
      integratedCapabilities.push(`Multi-channel operation (${config.channelCount} channels)`);
      score += 5;
    }

    // Limitations
    const millingSpindle = config.spindles.find((s) => s.type === "milling");
    const drivenTool = config.spindles.find((s) => s.type === "driven");

    if (millingSpindle) {
      if (millingSpindle.power_kW < 10) {
        limitations.push("Limited milling power - may restrict heavy cuts");
      }
    } else if (drivenTool) {
      limitations.push("Driven tool milling only - limited power vs dedicated spindle");
      if (drivenTool.power_kW < 5) {
        limitations.push("Low driven tool power - light milling only");
      }
    }

    if (!config.features.collisionAvoidance) {
      limitations.push("No collision avoidance - careful programming required");
      recommendations.push("Consider enabling collision avoidance option");
    }

    // Recommendations
    if (score >= 80) {
      recommendations.push("Excellent mill-turn configuration - consider advanced techniques");
    } else if (score >= 60) {
      recommendations.push("Good mill-turn capability - monitor utilization");
    } else if (score >= 40) {
      recommendations.push("Basic mill-turn - may need secondary ops for complex parts");
    } else {
      recommendations.push("Limited mill-turn - consider machine upgrade for complex work");
    }

    return {
      success: true,
      data: {
        isCapable: score >= 30,
        configurationScore: Math.min(100, score),
        turningCapabilities,
        millingCapabilities,
        integratedCapabilities,
        limitations,
        recommendations,
      },
    };
  }

  // ============================================================================
  // Channel Synchronization
  // ============================================================================

  /**
   * Plan multi-channel synchronization
   */
  planChannelSync(
    operations: Array<{
      operationId: string;
      preferredChannel: string;
      duration_seconds: number;
      requiredAxes: string[];
      dependencies: string[];
    }>,
    config: AdvancedCNCConfig
  ): EngineResult<ChannelSyncPlan> {
    if (config.channelCount < 2) {
      return {
        success: false,
        error: "Multi-channel planning requires at least 2 channels",
      };
    }

    const channelOps: Map<string, ChannelOperation> = new Map();
    const syncPoints: SyncPoint[] = [];
    let totalTime = 0;
    let totalWait = 0;

    // Initialize channels
    for (const channel of config.channels) {
      channelOps.set(channel.channelId, {
        channelId: channel.channelId,
        operations: [],
        startTime_seconds: 0,
        endTime_seconds: 0,
      });
    }

    // Assign operations to channels
    const operationEndTimes: Map<string, number> = new Map();

    for (const op of operations) {
      const channel = channelOps.get(op.preferredChannel);
      if (!channel) continue;

      // Check dependencies
      let startTime = channel.endTime_seconds;
      for (const dep of op.dependencies) {
        const depEndTime = operationEndTimes.get(dep) || 0;
        if (depEndTime > startTime) {
          // Need sync point
          const waitTime = depEndTime - startTime;
          totalWait += waitTime;

          syncPoints.push({
            pointId: `SYNC_${syncPoints.length + 1}`,
            timeStamp_seconds: depEndTime,
            syncType: "wait",
            channels: [op.preferredChannel],
            description: `Wait for ${dep} to complete`,
          });

          startTime = depEndTime;
        }
      }

      // Check axis conflicts
      for (const [otherId, other] of channelOps) {
        if (otherId === op.preferredChannel) continue;

        // Check if other channel is using required axes
        const lastOp = other.operations[other.operations.length - 1];
        if (lastOp && other.endTime_seconds > startTime) {
          const conflictingAxes = lastOp.axes.filter((a) => op.requiredAxes.includes(a));
          if (conflictingAxes.length > 0) {
            // Axis conflict - need to wait
            const waitTime = other.endTime_seconds - startTime;
            totalWait += waitTime;
            startTime = other.endTime_seconds;

            syncPoints.push({
              pointId: `SYNC_${syncPoints.length + 1}`,
              timeStamp_seconds: startTime,
              syncType: "wait",
              channels: [op.preferredChannel, otherId],
              description: `Axis conflict on ${conflictingAxes.join(", ")}`,
            });
          }
        }
      }

      // Add operation
      const endTime = startTime + op.duration_seconds;
      channel.operations.push({
        stepId: op.operationId,
        operation: op.operationId,
        duration_seconds: op.duration_seconds,
        axes: op.requiredAxes,
        requiresSync: op.dependencies.length > 0,
      });

      channel.endTime_seconds = endTime;
      operationEndTimes.set(op.operationId, endTime);
    }

    // Calculate totals
    totalTime = Math.max(...Array.from(channelOps.values()).map((c) => c.endTime_seconds));
    const sequentialTime = operations.reduce((sum, op) => sum + op.duration_seconds, 0);
    const efficiency = ((sequentialTime - totalWait) / sequentialTime) * 100;

    return {
      success: true,
      data: {
        channels: Array.from(channelOps.values()),
        syncPoints,
        totalCycleTime_seconds: Math.round(totalTime * 10) / 10,
        efficiency_percent: Math.round(efficiency),
        waitTime_seconds: Math.round(totalWait * 10) / 10,
      },
    };
  }

  // ============================================================================
  // Interpolation Analysis
  // ============================================================================

  /**
   * Analyze interpolation capabilities
   */
  analyzeInterpolationCapabilities(
    config: AdvancedCNCConfig
  ): EngineResult<InterpolationCapability[]> {
    const capabilities: InterpolationCapability[] = [];
    const controllerFeats = this.controllerFeatures[config.controllerType] || {};

    // Linear interpolation (G01)
    capabilities.push({
      type: "Linear (G01)",
      supported: true,
      accuracy_mm: 0.001,
      maxFeed_mmPerMin: 30000,
      lookAhead: 1,
      notes: "Standard linear interpolation",
    });

    // Circular interpolation (G02/G03)
    capabilities.push({
      type: "Circular (G02/G03)",
      supported: true,
      accuracy_mm: 0.002,
      maxFeed_mmPerMin: 20000,
      lookAhead: 1,
      notes: "Arc interpolation in XY, XZ, YZ planes",
    });

    // Helical interpolation
    capabilities.push({
      type: "Helical",
      supported: true,
      accuracy_mm: 0.003,
      maxFeed_mmPerMin: 15000,
      lookAhead: 1,
      notes: "Circular + simultaneous linear axis",
    });

    // NURBS interpolation
    if (controllerFeats.nurbs) {
      capabilities.push({
        type: "NURBS (G06.2)",
        supported: true,
        accuracy_mm: 0.001,
        maxFeed_mmPerMin: 25000,
        lookAhead: controllerFeats.lookAhead as number,
        notes: "Smooth curves from CAD data - ideal for sculptured surfaces",
      });
    } else {
      capabilities.push({
        type: "NURBS (G06.2)",
        supported: false,
        accuracy_mm: 0,
        maxFeed_mmPerMin: 0,
        lookAhead: 0,
        notes: "Not available - use small line segments instead",
      });
    }

    // Polar interpolation
    if (config.spindles.some((s) => s.cAxisCapable)) {
      capabilities.push({
        type: "Polar (G12.1)",
        supported: true,
        accuracy_mm: 0.005,
        maxFeed_mmPerMin: 10000,
        lookAhead: config.lookAheadBlocks,
        notes: "XY coordinates mapped to C-X for face milling",
      });
    }

    // Cylindrical interpolation
    if (config.spindles.some((s) => s.cAxisCapable) && config.linearAxes.includes("Z")) {
      capabilities.push({
        type: "Cylindrical (G07.1)",
        supported: true,
        accuracy_mm: 0.005,
        maxFeed_mmPerMin: 8000,
        lookAhead: config.lookAheadBlocks,
        notes: "XY mapped to C-Z for cylindrical surface machining",
      });
    }

    // 5-axis interpolation
    if (config.rotaryAxes.length >= 2 || (config.rotaryAxes.length === 1 && config.spindles.some((s) => s.cAxisCapable))) {
      capabilities.push({
        type: "5-Axis TCP",
        supported: config.features.smoothTcp,
        accuracy_mm: config.features.smoothTcp ? 0.005 : 0.02,
        maxFeed_mmPerMin: 10000,
        lookAhead: controllerFeats.lookAhead as number,
        notes: config.features.smoothTcp
          ? "Full tool center point control"
          : "Limited - no TCP smoothing",
      });
    }

    // Involute interpolation (gear cutting)
    if (config.features.skivingCycles) {
      capabilities.push({
        type: "Involute (G02.4)",
        supported: true,
        accuracy_mm: 0.003,
        maxFeed_mmPerMin: 5000,
        lookAhead: 1,
        notes: "Gear tooth involute profiles",
      });
    }

    return {
      success: true,
      data: capabilities,
    };
  }

  // ============================================================================
  // High-Speed Machining
  // ============================================================================

  /**
   * Analyze HSM configuration
   */
  analyzeHSMConfiguration(
    config: AdvancedCNCConfig
  ): EngineResult<HSMAnalysis> {
    const recommendations: string[] = [];
    const controllerFeats = this.controllerFeatures[config.controllerType] || {};

    const isEnabled = controllerFeats.hsm === true;
    const lookAhead = (controllerFeats.lookAhead as number) || config.lookAheadBlocks;

    // Typical HSM parameters
    let cornerRounding = 0.05; // mm
    let feedForward = 0.9;
    let jerkLimit = 50; // m/s³
    let accelerationMode = "standard";

    if (isEnabled) {
      // Adjust based on controller
      if (config.controllerType.includes("siemens")) {
        accelerationMode = "BRISK/SOFT selectable";
        cornerRounding = 0.01;
        feedForward = 0.95;
        jerkLimit = 100;
      } else if (config.controllerType.includes("fanuc")) {
        accelerationMode = "AI Contour Control";
        cornerRounding = 0.02;
        feedForward = 0.92;
        jerkLimit = 80;
      } else if (config.controllerType === "heidenhain_tnc640") {
        accelerationMode = "ADP (Advanced Dynamic Prediction)";
        cornerRounding = 0.005;
        feedForward = 0.98;
        jerkLimit = 150;
      }

      // Recommendations
      if (lookAhead < 200) {
        recommendations.push("Increase look-ahead blocks for smoother motion");
      }

      if (!config.features.aiContourControl) {
        recommendations.push("Enable AI contour control for optimized corner behavior");
      }

      if (cornerRounding > 0.03) {
        recommendations.push("Consider tighter corner rounding for better accuracy");
      }
    } else {
      recommendations.push("HSM not enabled - consider upgrade for faster cycle times");
      recommendations.push("Use smaller feed rates at corners to compensate");
    }

    return {
      success: true,
      data: {
        isEnabled,
        lookAheadBlocks: lookAhead,
        cornerRounding_mm: cornerRounding,
        feedForwardGain: feedForward,
        jerkLimit_mPerSec3: jerkLimit,
        accelerationMode,
        recommendations,
      },
    };
  }

  // ============================================================================
  // Collision Avoidance
  // ============================================================================

  /**
   * Configure collision avoidance
   */
  configureCollisionAvoidance(
    config: AdvancedCNCConfig,
    components: Array<{
      name: string;
      geometry: "cylinder" | "box" | "sphere";
      dimensions: Record<string, number>;
      priority: "critical" | "warning";
    }>
  ): EngineResult<CollisionAvoidanceConfig> {
    if (!config.features.collisionAvoidance) {
      return {
        success: false,
        error: "Machine does not support collision avoidance",
      };
    }

    const protectedZones: ProtectedZone[] = components.map((comp, idx) => ({
      zoneId: `ZONE_${idx + 1}`,
      description: comp.name,
      geometry: comp.geometry,
      dimensions: comp.dimensions,
      priority: comp.priority,
    }));

    // Typical check interval based on controller
    let checkInterval = 10; // ms
    if (config.controllerType.includes("siemens")) {
      checkInterval = 4;
    } else if (config.controllerType.includes("fanuc_30i")) {
      checkInterval = 8;
    }

    return {
      success: true,
      data: {
        isEnabled: true,
        checkInterval_ms: checkInterval,
        protectedZones,
        responseAction: "stop",
        overrideCapable: true,
      },
    };
  }

  // ============================================================================
  // Controller Comparison
  // ============================================================================

  /**
   * Compare two controllers
   */
  compareControllers(
    controller1: ControllerType,
    controller2: ControllerType,
    requirements: string[]
  ): EngineResult<ControllerComparison> {
    const feat1 = this.controllerFeatures[controller1] || {};
    const feat2 = this.controllerFeatures[controller2] || {};

    const comparisons: FeatureComparison[] = [];
    let score1 = 0;
    let score2 = 0;
    const reasons: string[] = [];

    // Compare features
    const features = ["hsm", "nurbs", "channels", "aiContour", "lookAhead"];

    for (const feature of features) {
      const v1 = feat1[feature];
      const v2 = feat2[feature];

      let winner: 1 | 2 | "tie" = "tie";
      if (typeof v1 === "number" && typeof v2 === "number") {
        if (v1 > v2) {
          winner = 1;
          score1++;
        } else if (v2 > v1) {
          winner = 2;
          score2++;
        }
      } else if (typeof v1 === "boolean" && typeof v2 === "boolean") {
        if (v1 && !v2) {
          winner = 1;
          score1++;
        } else if (v2 && !v1) {
          winner = 2;
          score2++;
        }
      }

      comparisons.push({
        feature,
        controller1Support: v1 as boolean | string,
        controller2Support: v2 as boolean | string,
        winner,
      });
    }

    // Check specific requirements
    for (const req of requirements) {
      if (req === "high-speed" && feat1.hsm && !feat2.hsm) {
        score1 += 2;
        reasons.push(`${controller1} supports high-speed machining`);
      }
      if (req === "multi-channel" && (feat1.channels as number) > (feat2.channels as number)) {
        score1 += 2;
        reasons.push(`${controller1} has more channels (${feat1.channels})`);
      }
      if (req === "nurbs" && feat1.nurbs && !feat2.nurbs) {
        score1 += 2;
        reasons.push(`${controller1} supports NURBS interpolation`);
      }
    }

    const recommendation = score1 >= score2 ? controller1 : controller2;
    if (score1 === score2) {
      reasons.push("Controllers are equivalent for specified requirements");
    } else {
      reasons.push(
        `${recommendation} better matches requirements with score ${Math.max(score1, score2)}`
      );
    }

    return {
      success: true,
      data: {
        controller1,
        controller2,
        featureComparison: comparisons,
        recommendation,
        reasons,
      },
    };
  }

  // ============================================================================
  // Workplane Setup
  // ============================================================================

  /**
   * Setup tilted workplane
   */
  setupTiltedWorkplane(
    tiltA_deg: number,
    tiltB_deg: number,
    rotateC_deg: number,
    origin: { x: number; y: number; z: number },
    config: AdvancedCNCConfig
  ): EngineResult<WorkplaneSetup> {
    if (!config.features.tiltedWorkPlane) {
      return {
        success: false,
        error: "Controller does not support tilted workplane",
      };
    }

    const warnings: string[] = [];
    const gCode: string[] = [];

    // Validate angles against axis limits
    if (config.rotaryAxes.includes("A")) {
      // Check A limits
      if (Math.abs(tiltA_deg) > 90) {
        warnings.push("A-axis tilt beyond typical range - verify machine limits");
      }
    } else if (tiltA_deg !== 0) {
      return {
        success: false,
        error: "A-axis tilt requested but machine has no A-axis",
      };
    }

    if (config.rotaryAxes.includes("B") || config.features.smoothTcp) {
      if (Math.abs(tiltB_deg) > 110) {
        warnings.push("B-axis tilt beyond typical range - verify machine limits");
      }
    } else if (tiltB_deg !== 0) {
      return {
        success: false,
        error: "B-axis tilt requested but machine has no B-axis",
      };
    }

    // Generate G-code based on controller
    if (config.controllerType.includes("fanuc")) {
      gCode.push("G68.2 X0 Y0 Z0 I" + tiltA_deg + " J" + tiltB_deg + " K" + rotateC_deg);
      gCode.push("G53.1");
    } else if (config.controllerType.includes("siemens")) {
      gCode.push(`CYCLE800(1,"",0,57,0,${tiltA_deg},${tiltB_deg},${rotateC_deg},0,0,0,0,0,1)`);
    } else if (config.controllerType.includes("heidenhain")) {
      gCode.push(`PLANE SPATIAL SPA ${tiltA_deg} SPB ${tiltB_deg} SPC ${rotateC_deg} STAY`);
    } else if (config.controllerType.includes("mazak")) {
      gCode.push(`G68.2 X0 Y0 Z0 A${tiltA_deg} B${tiltB_deg} C${rotateC_deg}`);
    } else {
      // Generic
      gCode.push(`(TILTED WORKPLANE: A=${tiltA_deg} B=${tiltB_deg} C=${rotateC_deg})`);
      gCode.push("G68.2 X0 Y0 Z0 I" + tiltA_deg + " J" + tiltB_deg + " K" + rotateC_deg);
    }

    // Add origin offset
    gCode.push(`G54.1 P1 X${origin.x} Y${origin.y} Z${origin.z}`);

    return {
      success: true,
      data: {
        workplaneId: "WP_TILTED_1",
        tiltA_deg,
        tiltB_deg,
        rotateC_deg,
        origin,
        isValid: warnings.length === 0,
        gCode,
        warnings,
      },
    };
  }

  // ============================================================================
  // Part Transfer
  // ============================================================================

  /**
   * Plan part transfer between spindles
   */
  planPartTransfer(
    fromSpindle: string,
    toSpindle: string,
    partDiameter_mm: number,
    partLength_mm: number,
    config: AdvancedCNCConfig
  ): EngineResult<PartTransferPlan> {
    const fromSp = config.spindles.find((s) => s.spindleId === fromSpindle);
    const toSp = config.spindles.find((s) => s.spindleId === toSpindle);

    if (!fromSp || !toSp) {
      return {
        success: false,
        error: "Invalid spindle configuration",
      };
    }

    // Determine transfer method
    let method: PartTransferPlan["method"] = "bar_pull";
    let transferTime = 3; // seconds baseline

    if (fromSp.type === "main" && toSp.type === "sub") {
      method = "bar_pull";
      transferTime = 2 + partLength_mm / 100; // Longer parts take longer
    } else if (fromSp.type === "sub" && toSp.type === "main") {
      method = "part_catch";
      transferTime = 3;
    }

    const syncRequired = config.features.spindleSync;

    // Generate transfer steps
    const steps: TransferStep[] = [];
    const channel1 = config.channels[0]?.channelId || "CH1";
    const channel2 = config.channels[1]?.channelId || "CH2";

    if (method === "bar_pull") {
      steps.push({
        stepNumber: 1,
        action: "Position sub-spindle at handoff point",
        channel: channel2,
        axes: ["Z2"],
        gCode: "G0 Z2 = [HANDOFF_Z]",
      });

      steps.push({
        stepNumber: 2,
        action: "Close sub-spindle chuck",
        channel: channel2,
        axes: [],
        gCode: "M68",
      });

      if (syncRequired) {
        steps.push({
          stepNumber: 3,
          action: "Synchronize spindle speeds",
          channel: channel1,
          axes: ["S1", "S2"],
          gCode: "G97 S1 = S2 M5.1",
        });
      }

      steps.push({
        stepNumber: 4,
        action: "Open main spindle chuck",
        channel: channel1,
        axes: [],
        gCode: "M69",
      });

      steps.push({
        stepNumber: 5,
        action: "Retract sub-spindle with part",
        channel: channel2,
        axes: ["Z2"],
        gCode: "G0 Z2 = [SAFE_Z]",
      });
    }

    return {
      success: true,
      data: {
        fromSpindle,
        toSpindle,
        method,
        transferTime_seconds: Math.round(transferTime * 10) / 10,
        syncRequired,
        steps,
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
      case "cnc_analyze_millturn":
        return this.analyzeMillTurnCapability(params.config as AdvancedCNCConfig);

      case "cnc_plan_channel_sync":
        return this.planChannelSync(
          params.operations as Array<{
            operationId: string;
            preferredChannel: string;
            duration_seconds: number;
            requiredAxes: string[];
            dependencies: string[];
          }>,
          params.config as AdvancedCNCConfig
        );

      case "cnc_analyze_interpolation":
        return this.analyzeInterpolationCapabilities(params.config as AdvancedCNCConfig);

      case "cnc_analyze_hsm":
        return this.analyzeHSMConfiguration(params.config as AdvancedCNCConfig);

      case "cnc_configure_collision":
        return this.configureCollisionAvoidance(
          params.config as AdvancedCNCConfig,
          params.components as Array<{
            name: string;
            geometry: "cylinder" | "box" | "sphere";
            dimensions: Record<string, number>;
            priority: "critical" | "warning";
          }>
        );

      case "cnc_compare_controllers":
        return this.compareControllers(
          params.controller1 as ControllerType,
          params.controller2 as ControllerType,
          params.requirements as string[]
        );

      case "cnc_setup_workplane":
        return this.setupTiltedWorkplane(
          params.tiltA_deg as number,
          params.tiltB_deg as number,
          params.rotateC_deg as number,
          params.origin as { x: number; y: number; z: number },
          params.config as AdvancedCNCConfig
        );

      case "cnc_plan_transfer":
        return this.planPartTransfer(
          params.fromSpindle as string,
          params.toSpindle as string,
          params.partDiameter_mm as number,
          params.partLength_mm as number,
          params.config as AdvancedCNCConfig
        );

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }
}

export const advancedCNCConfigEngine = new AdvancedCNCConfigEngine();
