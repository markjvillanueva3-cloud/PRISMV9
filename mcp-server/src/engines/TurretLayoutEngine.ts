/**
 * TurretLayoutEngine.ts
 * Intelligence for turret configurations, tool holder interfaces,
 * and tool positioning optimization on turning centers
 *
 * Covers: BMT, VDI, Capto, HSK, proprietary interfaces
 * Gang tooling, drum turrets, disc turrets, chain magazines
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

export type ToolHolderInterface =
  | "bmt_45"
  | "bmt_55"
  | "bmt_65"
  | "vdi_30"
  | "vdi_40"
  | "vdi_50"
  | "capto_c3"
  | "capto_c4"
  | "capto_c5"
  | "capto_c6"
  | "hsk_a40"
  | "hsk_a50"
  | "hsk_a63"
  | "hsk_t40"
  | "hsk_t63"
  | "proprietary";

export type TurretType =
  | "disc_12"
  | "disc_16"
  | "disc_24"
  | "drum_8"
  | "drum_10"
  | "drum_12"
  | "gang"
  | "chain_40"
  | "chain_60"
  | "chain_120";

export interface TurretConfig {
  turretId: string;
  turretType: TurretType;
  stationCount: number;
  interfaceType: ToolHolderInterface;
  drivenStations: number[];
  maxDrivenRpm: number;
  drivenPower_kW: number;
  indexTime_seconds: number;
  coolantThroughSpindle: boolean;
  stationSpacing_deg?: number;
  maxToolDiameter_mm: number;
  maxToolLength_mm: number;
  rapidTraverse_mPerMin: number;
}

export interface ToolAssignment {
  stationNumber: number;
  toolId: string;
  toolType: string;
  diameter_mm: number;
  length_mm: number;
  isDriven: boolean;
  orientation: "radial" | "axial" | "angular";
  overhang_mm: number;
  cuttingLength_mm: number;
}

export interface TurretOptimizationInput {
  operations: OperationSequence[];
  availableTools: ToolOption[];
  config: TurretConfig;
  priorities: {
    minimizeCycleTime: number;  // 0-1 weight
    minimizeToolChanges: number;
    minimizeToolCount: number;
    maximizeToolLife: number;
  };
}

export interface OperationSequence {
  operationId: string;
  type: string;
  requiredToolType: string;
  minDiameter_mm?: number;
  maxDiameter_mm?: number;
  material: string;
  cuttingTime_seconds: number;
  toolChangeRequired: boolean;
}

export interface ToolOption {
  toolId: string;
  toolType: string;
  diameter_mm: number;
  length_mm: number;
  isDriven: boolean;
  orientation: "radial" | "axial" | "angular";
  capabilities: string[];
  cost: number;
}

export interface TurretLayoutPlan {
  assignments: ToolAssignment[];
  cycleTimeReduction_percent: number;
  toolChangeCount: number;
  utilizationByStation: Record<number, number>;
  recommendations: string[];
  collisionZones: CollisionZone[];
}

export interface CollisionZone {
  stationA: number;
  stationB: number;
  riskLevel: "none" | "low" | "medium" | "high";
  mitigation: string;
}

export interface InterfaceSpec {
  interface: ToolHolderInterface;
  maxTorque_Nm: number;
  maxRpm: number;
  repeatability_mm: number;
  stiffness_NPerMm: number;
  coolantCapable: boolean;
  quickChange: boolean;
  balanceGrade: string;
  applications: string[];
}

export interface TurretCapabilityAnalysis {
  turretType: TurretType;
  totalCapacity: number;
  drivenCapacity: number;
  effectiveStations: number;
  interfaceSpecs: InterfaceSpec;
  limitingFactors: string[];
  recommendations: string[];
}

export interface GangToolLayout {
  positions: GangPosition[];
  totalWidth_mm: number;
  rapidDistance_mm: number;
  cycleTimeSavings_percent: number;
  limitations: string[];
}

export interface GangPosition {
  positionId: string;
  xPosition_mm: number;
  toolId: string;
  toolType: string;
  cutDirection: "towards_headstock" | "towards_tailstock";
}

export interface ToolInterferenceCheck {
  hasInterference: boolean;
  interferences: InterferenceDetail[];
  safeConfiguration: boolean;
  requiredClearance_mm: number;
}

export interface InterferenceDetail {
  tool1: string;
  tool2: string;
  interferenceType: "radial" | "axial" | "angular";
  overlap_mm: number;
  mitigation: string;
}

// ============================================================================
// Engine Implementation
// ============================================================================

export class TurretLayoutEngine {
  readonly name = "TurretLayoutEngine";
  readonly version = "1.0.0";
  readonly description = "Intelligence for turret configurations and tool holder interfaces";

  // Interface specifications database
  private readonly interfaceSpecs: Record<string, InterfaceSpec> = {
    bmt_45: {
      interface: "bmt_45",
      maxTorque_Nm: 45,
      maxRpm: 6000,
      repeatability_mm: 0.002,
      stiffness_NPerMm: 150000,
      coolantCapable: true,
      quickChange: true,
      balanceGrade: "G2.5",
      applications: ["Small precision parts", "Swiss-type", "Production turning"],
    },
    bmt_55: {
      interface: "bmt_55",
      maxTorque_Nm: 80,
      maxRpm: 5000,
      repeatability_mm: 0.002,
      stiffness_NPerMm: 200000,
      coolantCapable: true,
      quickChange: true,
      balanceGrade: "G2.5",
      applications: ["Medium turning", "Mill-turn", "Live tooling"],
    },
    bmt_65: {
      interface: "bmt_65",
      maxTorque_Nm: 120,
      maxRpm: 4500,
      repeatability_mm: 0.003,
      stiffness_NPerMm: 280000,
      coolantCapable: true,
      quickChange: true,
      balanceGrade: "G6.3",
      applications: ["Heavy turning", "Large parts", "High torque operations"],
    },
    vdi_30: {
      interface: "vdi_30",
      maxTorque_Nm: 25,
      maxRpm: 8000,
      repeatability_mm: 0.005,
      stiffness_NPerMm: 80000,
      coolantCapable: false,
      quickChange: false,
      balanceGrade: "G6.3",
      applications: ["Small parts", "Standard turning", "Economy tooling"],
    },
    vdi_40: {
      interface: "vdi_40",
      maxTorque_Nm: 55,
      maxRpm: 6000,
      repeatability_mm: 0.005,
      stiffness_NPerMm: 120000,
      coolantCapable: true,
      quickChange: false,
      balanceGrade: "G6.3",
      applications: ["General turning", "Drilling", "Standard production"],
    },
    vdi_50: {
      interface: "vdi_50",
      maxTorque_Nm: 100,
      maxRpm: 5000,
      repeatability_mm: 0.005,
      stiffness_NPerMm: 180000,
      coolantCapable: true,
      quickChange: false,
      balanceGrade: "G6.3",
      applications: ["Heavy turning", "Large boring bars", "High power operations"],
    },
    capto_c3: {
      interface: "capto_c3",
      maxTorque_Nm: 90,
      maxRpm: 20000,
      repeatability_mm: 0.001,
      stiffness_NPerMm: 250000,
      coolantCapable: true,
      quickChange: true,
      balanceGrade: "G2.5",
      applications: ["High-speed turning", "Precision milling", "Multi-task"],
    },
    capto_c4: {
      interface: "capto_c4",
      maxTorque_Nm: 200,
      maxRpm: 15000,
      repeatability_mm: 0.001,
      stiffness_NPerMm: 350000,
      coolantCapable: true,
      quickChange: true,
      balanceGrade: "G2.5",
      applications: ["Mill-turn", "Heavy milling", "Multi-task machining"],
    },
    capto_c5: {
      interface: "capto_c5",
      maxTorque_Nm: 340,
      maxRpm: 12000,
      repeatability_mm: 0.001,
      stiffness_NPerMm: 500000,
      coolantCapable: true,
      quickChange: true,
      balanceGrade: "G2.5",
      applications: ["Large mill-turn", "Heavy cutting", "Aerospace"],
    },
    capto_c6: {
      interface: "capto_c6",
      maxTorque_Nm: 600,
      maxRpm: 10000,
      repeatability_mm: 0.001,
      stiffness_NPerMm: 700000,
      coolantCapable: true,
      quickChange: true,
      balanceGrade: "G2.5",
      applications: ["Heavy mill-turn", "Large diameter turning", "Power machining"],
    },
    hsk_a40: {
      interface: "hsk_a40",
      maxTorque_Nm: 100,
      maxRpm: 25000,
      repeatability_mm: 0.001,
      stiffness_NPerMm: 200000,
      coolantCapable: true,
      quickChange: true,
      balanceGrade: "G2.5",
      applications: ["High-speed milling", "5-axis", "Die mold"],
    },
    hsk_a50: {
      interface: "hsk_a50",
      maxTorque_Nm: 180,
      maxRpm: 20000,
      repeatability_mm: 0.001,
      stiffness_NPerMm: 300000,
      coolantCapable: true,
      quickChange: true,
      balanceGrade: "G2.5",
      applications: ["Mill-turn", "High-speed cutting", "Production milling"],
    },
    hsk_a63: {
      interface: "hsk_a63",
      maxTorque_Nm: 340,
      maxRpm: 18000,
      repeatability_mm: 0.001,
      stiffness_NPerMm: 450000,
      coolantCapable: true,
      quickChange: true,
      balanceGrade: "G2.5",
      applications: ["Heavy milling", "Mill-turn centers", "Production machining"],
    },
    hsk_t40: {
      interface: "hsk_t40",
      maxTorque_Nm: 120,
      maxRpm: 20000,
      repeatability_mm: 0.001,
      stiffness_NPerMm: 220000,
      coolantCapable: true,
      quickChange: true,
      balanceGrade: "G2.5",
      applications: ["Turning centers", "Live tooling", "Multi-task"],
    },
    hsk_t63: {
      interface: "hsk_t63",
      maxTorque_Nm: 400,
      maxRpm: 15000,
      repeatability_mm: 0.001,
      stiffness_NPerMm: 500000,
      coolantCapable: true,
      quickChange: true,
      balanceGrade: "G2.5",
      applications: ["Heavy turning", "Large mill-turn", "Power turning"],
    },
  };

  // ============================================================================
  // Interface Analysis
  // ============================================================================

  /**
   * Analyze tool holder interface capabilities
   */
  analyzeInterface(
    interfaceType: ToolHolderInterface
  ): EngineResult<InterfaceSpec> {
    const interfaceKey = interfaceType.replace("-", "_").toLowerCase();
    const spec = this.interfaceSpecs[interfaceKey];

    if (!spec) {
      return {
        success: false,
        error: `Unknown interface type: ${interfaceType}`,
      };
    }

    return {
      success: true,
      data: spec,
    };
  }

  /**
   * Compare two interfaces for application suitability
   */
  compareInterfaces(
    interface1: ToolHolderInterface,
    interface2: ToolHolderInterface,
    application: string
  ): EngineResult<{
    recommendation: ToolHolderInterface;
    reasons: string[];
    tradeoffs: string[];
  }> {
    const spec1 = this.interfaceSpecs[interface1];
    const spec2 = this.interfaceSpecs[interface2];

    if (!spec1 || !spec2) {
      return {
        success: false,
        error: "One or both interfaces not found",
      };
    }

    const reasons: string[] = [];
    const tradeoffs: string[] = [];
    let score1 = 0;
    let score2 = 0;

    // Application-specific scoring
    if (application.includes("high-speed") || application.includes("precision")) {
      if (spec1.maxRpm > spec2.maxRpm) {
        score1 += 2;
        reasons.push(`${interface1}: Higher max RPM (${spec1.maxRpm} vs ${spec2.maxRpm})`);
      } else if (spec2.maxRpm > spec1.maxRpm) {
        score2 += 2;
        reasons.push(`${interface2}: Higher max RPM (${spec2.maxRpm} vs ${spec1.maxRpm})`);
      }

      if (spec1.repeatability_mm < spec2.repeatability_mm) {
        score1 += 2;
        reasons.push(`${interface1}: Better repeatability (${spec1.repeatability_mm}mm)`);
      } else if (spec2.repeatability_mm < spec1.repeatability_mm) {
        score2 += 2;
        reasons.push(`${interface2}: Better repeatability (${spec2.repeatability_mm}mm)`);
      }
    }

    if (application.includes("heavy") || application.includes("power")) {
      if (spec1.maxTorque_Nm > spec2.maxTorque_Nm) {
        score1 += 2;
        reasons.push(`${interface1}: Higher torque (${spec1.maxTorque_Nm}Nm)`);
      } else if (spec2.maxTorque_Nm > spec1.maxTorque_Nm) {
        score2 += 2;
        reasons.push(`${interface2}: Higher torque (${spec2.maxTorque_Nm}Nm)`);
      }

      if (spec1.stiffness_NPerMm > spec2.stiffness_NPerMm) {
        score1 += 1;
        reasons.push(`${interface1}: Higher stiffness`);
      } else if (spec2.stiffness_NPerMm > spec1.stiffness_NPerMm) {
        score2 += 1;
        reasons.push(`${interface2}: Higher stiffness`);
      }
    }

    // Quick change preference
    if (spec1.quickChange && !spec2.quickChange) {
      score1 += 1;
      reasons.push(`${interface1}: Quick-change capability`);
    } else if (spec2.quickChange && !spec1.quickChange) {
      score2 += 1;
      reasons.push(`${interface2}: Quick-change capability`);
    }

    // Tradeoffs
    if (spec1.maxTorque_Nm > spec2.maxTorque_Nm && spec2.maxRpm > spec1.maxRpm) {
      tradeoffs.push(`${interface1} offers more torque, ${interface2} offers higher speed`);
    }

    const recommendation = score1 >= score2 ? interface1 : interface2;

    return {
      success: true,
      data: {
        recommendation,
        reasons,
        tradeoffs,
      },
    };
  }

  // ============================================================================
  // Turret Capability Analysis
  // ============================================================================

  /**
   * Analyze turret capability
   */
  analyzeTurretCapability(
    config: TurretConfig
  ): EngineResult<TurretCapabilityAnalysis> {
    const interfaceKey = config.interfaceType.replace("-", "_").toLowerCase();
    const interfaceSpec = this.interfaceSpecs[interfaceKey] || this.interfaceSpecs["vdi_40"];

    const limitingFactors: string[] = [];
    const recommendations: string[] = [];

    // Effective stations (accounting for large tool occupation)
    let effectiveStations = config.stationCount;
    if (config.maxToolDiameter_mm > 40) {
      effectiveStations = Math.floor(config.stationCount * 0.8);
      limitingFactors.push("Large tool diameter reduces effective station count");
    }

    // Driven station analysis
    if (config.drivenStations.length === 0) {
      limitingFactors.push("No driven stations - limited to turning operations only");
      recommendations.push("Consider machine with driven tooling for mill-turn operations");
    } else if (config.drivenStations.length < config.stationCount / 4) {
      limitingFactors.push("Limited driven stations may cause bottlenecks");
    }

    // Index time analysis
    if (config.indexTime_seconds > 0.5) {
      limitingFactors.push(`Slow index time (${config.indexTime_seconds}s) impacts cycle time`);
      recommendations.push("Optimize tool layout to minimize long indexes");
    }

    // Turret type specific
    if (config.turretType === "gang") {
      recommendations.push("Gang tooling: Optimize X-axis positioning for fastest cycles");
      recommendations.push("Consider tool arrangement for minimum rapid distance");
    } else if (config.turretType.startsWith("chain")) {
      recommendations.push("Chain magazine: Pre-position next tool during machining");
      recommendations.push("Random access beneficial for complex part families");
    }

    return {
      success: true,
      data: {
        turretType: config.turretType,
        totalCapacity: config.stationCount,
        drivenCapacity: config.drivenStations.length,
        effectiveStations,
        interfaceSpecs: interfaceSpec,
        limitingFactors,
        recommendations,
      },
    };
  }

  // ============================================================================
  // Tool Layout Optimization
  // ============================================================================

  /**
   * Optimize tool layout for minimum cycle time
   */
  optimizeToolLayout(
    input: TurretOptimizationInput
  ): EngineResult<TurretLayoutPlan> {
    const { operations, availableTools, config, priorities } = input;
    const assignments: ToolAssignment[] = [];
    const usedStations = new Set<number>();
    const utilizationByStation: Record<number, number> = {};
    const recommendations: string[] = [];
    let toolChangeCount = 0;

    // Match operations to tools
    const toolAssignments: Array<{
      operation: OperationSequence;
      tool: ToolOption;
      station: number;
    }> = [];

    for (const op of operations) {
      // Find matching tool
      const matchingTools = availableTools.filter(
        (t) =>
          t.toolType === op.requiredToolType &&
          (!op.minDiameter_mm || t.diameter_mm >= op.minDiameter_mm) &&
          (!op.maxDiameter_mm || t.diameter_mm <= op.maxDiameter_mm)
      );

      if (matchingTools.length === 0) {
        recommendations.push(`No suitable tool found for operation ${op.operationId}`);
        continue;
      }

      // Select best tool based on priorities
      let bestTool = matchingTools[0];
      if (priorities.maximizeToolLife > 0.5) {
        // Prefer larger tools for better life
        bestTool = matchingTools.reduce((a, b) =>
          a.diameter_mm > b.diameter_mm ? a : b
        );
      } else if (priorities.minimizeToolCount > 0.5) {
        // Try to reuse existing tools
        const existingTool = matchingTools.find((t) =>
          toolAssignments.some((a) => a.tool.toolId === t.toolId)
        );
        if (existingTool) bestTool = existingTool;
      }

      // Find available station
      let station = 1;
      const needsDriven = bestTool.isDriven;

      if (needsDriven) {
        // Must use driven station
        const availableDriven = config.drivenStations.filter(
          (s) => !usedStations.has(s)
        );
        if (availableDriven.length === 0) {
          // Reuse driven station
          const drivenWithSameTool = toolAssignments.find(
            (a) =>
              config.drivenStations.includes(a.station) &&
              a.tool.toolId === bestTool.toolId
          );
          if (drivenWithSameTool) {
            station = drivenWithSameTool.station;
          } else {
            recommendations.push(
              `Insufficient driven stations for ${op.operationId}`
            );
            continue;
          }
        } else {
          station = availableDriven[0];
        }
      } else {
        // Find any available station
        for (let s = 1; s <= config.stationCount; s++) {
          if (!usedStations.has(s)) {
            station = s;
            break;
          }
        }
      }

      // Check if already assigned (tool reuse)
      const existingAssignment = toolAssignments.find(
        (a) => a.tool.toolId === bestTool.toolId
      );
      if (existingAssignment) {
        station = existingAssignment.station;
      } else {
        usedStations.add(station);
      }

      toolAssignments.push({ operation: op, tool: bestTool, station });

      // Track utilization
      utilizationByStation[station] =
        (utilizationByStation[station] || 0) + op.cuttingTime_seconds;
    }

    // Count tool changes
    let lastStation = 0;
    for (const assignment of toolAssignments) {
      if (assignment.station !== lastStation) {
        toolChangeCount++;
        lastStation = assignment.station;
      }
    }

    // Build final assignments
    const stationTools = new Map<number, ToolAssignment>();
    for (const assignment of toolAssignments) {
      if (!stationTools.has(assignment.station)) {
        stationTools.set(assignment.station, {
          stationNumber: assignment.station,
          toolId: assignment.tool.toolId,
          toolType: assignment.tool.toolType,
          diameter_mm: assignment.tool.diameter_mm,
          length_mm: assignment.tool.length_mm,
          isDriven: assignment.tool.isDriven,
          orientation: assignment.tool.orientation,
          overhang_mm: assignment.tool.length_mm * 0.3, // Estimate
          cuttingLength_mm: assignment.tool.length_mm * 0.5,
        });
      }
    }

    // Check for collisions
    const collisionZones = this.checkCollisionZones(
      Array.from(stationTools.values()),
      config
    );

    // Calculate cycle time improvement
    const baselineToolChanges = operations.filter((o) => o.toolChangeRequired).length;
    const cycleTimeReduction =
      baselineToolChanges > 0
        ? ((baselineToolChanges - toolChangeCount) / baselineToolChanges) * 100
        : 0;

    // Optimization recommendations
    if (Object.keys(utilizationByStation).length < config.stationCount * 0.5) {
      recommendations.push("Low station utilization - consider consolidating tools");
    }

    const maxUtilization = Math.max(...Object.values(utilizationByStation));
    const minUtilization = Math.min(...Object.values(utilizationByStation));
    if (maxUtilization > minUtilization * 3) {
      recommendations.push("Unbalanced tool utilization - consider load balancing");
    }

    return {
      success: true,
      data: {
        assignments: Array.from(stationTools.values()),
        cycleTimeReduction_percent: Math.round(cycleTimeReduction),
        toolChangeCount,
        utilizationByStation,
        recommendations,
        collisionZones,
      },
    };
  }

  private checkCollisionZones(
    assignments: ToolAssignment[],
    config: TurretConfig
  ): CollisionZone[] {
    const zones: CollisionZone[] = [];
    const stationSpacing = config.stationSpacing_deg || 360 / config.stationCount;

    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const a = assignments[i];
        const b = assignments[j];

        const stationDiff = Math.abs(a.stationNumber - b.stationNumber);
        const adjacent = stationDiff === 1 || stationDiff === config.stationCount - 1;

        if (adjacent) {
          // Check for potential collision
          const combinedOverhang = a.overhang_mm + b.overhang_mm;
          const clearance = stationSpacing * (config.maxToolDiameter_mm / 360);

          let riskLevel: CollisionZone["riskLevel"] = "none";
          let mitigation = "";

          if (combinedOverhang > clearance * 1.5) {
            riskLevel = "high";
            mitigation = "Reduce tool overhang or add stations between these tools";
          } else if (combinedOverhang > clearance) {
            riskLevel = "medium";
            mitigation = "Verify clearance in simulation before running";
          } else if (combinedOverhang > clearance * 0.8) {
            riskLevel = "low";
            mitigation = "Monitor during first article run";
          }

          if (riskLevel !== "none") {
            zones.push({
              stationA: a.stationNumber,
              stationB: b.stationNumber,
              riskLevel,
              mitigation,
            });
          }
        }
      }
    }

    return zones;
  }

  // ============================================================================
  // Gang Tool Layout
  // ============================================================================

  /**
   * Plan gang tool layout
   */
  planGangToolLayout(
    tools: ToolOption[],
    operations: OperationSequence[],
    maxWidth_mm: number
  ): EngineResult<GangToolLayout> {
    const positions: GangPosition[] = [];
    let currentX = 0;
    const limitations: string[] = [];

    // Sort tools by operation sequence
    const toolOrder: ToolOption[] = [];
    for (const op of operations) {
      const tool = tools.find((t) => t.toolType === op.requiredToolType);
      if (tool && !toolOrder.includes(tool)) {
        toolOrder.push(tool);
      }
    }

    // Position tools with minimum spacing
    const toolSpacing = 15; // mm between tools

    for (const tool of toolOrder) {
      const toolWidth = tool.diameter_mm;

      if (currentX + toolWidth > maxWidth_mm) {
        limitations.push(
          `Tool ${tool.toolId} exceeds gang width limit - cannot be positioned`
        );
        continue;
      }

      positions.push({
        positionId: `G${positions.length + 1}`,
        xPosition_mm: currentX + toolWidth / 2,
        toolId: tool.toolId,
        toolType: tool.toolType,
        cutDirection:
          positions.length % 2 === 0 ? "towards_headstock" : "towards_tailstock",
      });

      currentX += toolWidth + toolSpacing;
    }

    const totalWidth = currentX - toolSpacing;

    // Calculate rapid distance (worst case)
    const rapidDistance = totalWidth;

    // Estimate cycle time savings vs turret
    // Gang eliminates index time, only X rapids
    const turretIndexTime = 0.4; // typical
    const rapidTime = rapidDistance / (30 * 1000 / 60); // 30 m/min rapid
    const savingsPerChange = turretIndexTime - rapidTime;
    const cycleTimeSavings = Math.max(0, (savingsPerChange / turretIndexTime) * 100);

    if (positions.length < tools.length) {
      limitations.push(
        `Only ${positions.length} of ${tools.length} tools could be positioned`
      );
    }

    return {
      success: true,
      data: {
        positions,
        totalWidth_mm: Math.round(totalWidth),
        rapidDistance_mm: Math.round(rapidDistance),
        cycleTimeSavings_percent: Math.round(cycleTimeSavings),
        limitations,
      },
    };
  }

  // ============================================================================
  // Tool Interference Check
  // ============================================================================

  /**
   * Check for tool interference
   */
  checkToolInterference(
    assignments: ToolAssignment[],
    config: TurretConfig
  ): EngineResult<ToolInterferenceCheck> {
    const interferences: InterferenceDetail[] = [];
    const stationSpacing = config.stationSpacing_deg || 360 / config.stationCount;

    // Check each pair of adjacent tools
    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const a = assignments[i];
        const b = assignments[j];

        const stationDiff = Math.abs(a.stationNumber - b.stationNumber);

        // Only check adjacent stations
        if (stationDiff !== 1 && stationDiff !== config.stationCount - 1) {
          continue;
        }

        // Calculate angular overlap
        const angularSpace = stationSpacing;
        const aAngularExtent = Math.atan2(a.diameter_mm, a.overhang_mm) * (180 / Math.PI);
        const bAngularExtent = Math.atan2(b.diameter_mm, b.overhang_mm) * (180 / Math.PI);

        const totalExtent = aAngularExtent + bAngularExtent;

        if (totalExtent > angularSpace) {
          const overlap = totalExtent - angularSpace;
          interferences.push({
            tool1: a.toolId,
            tool2: b.toolId,
            interferenceType: "radial",
            overlap_mm: Math.round(overlap * 10) / 10,
            mitigation: overlap > 10
              ? "Relocate one tool to non-adjacent station"
              : "Reduce tool overhang if possible",
          });
        }

        // Check axial interference (tools with different orientations)
        if (a.orientation !== b.orientation) {
          const axialOverlap = Math.max(
            0,
            Math.min(a.cuttingLength_mm, b.cuttingLength_mm) -
              Math.abs(a.overhang_mm - b.overhang_mm)
          );

          if (axialOverlap > 5) {
            interferences.push({
              tool1: a.toolId,
              tool2: b.toolId,
              interferenceType: "axial",
              overlap_mm: axialOverlap,
              mitigation: "Verify Z-axis clearance during rapid moves",
            });
          }
        }
      }
    }

    const requiredClearance = Math.max(
      ...assignments.map((a) => a.diameter_mm / 2 + 5),
      10
    );

    return {
      success: true,
      data: {
        hasInterference: interferences.length > 0,
        interferences,
        safeConfiguration: interferences.length === 0,
        requiredClearance_mm: requiredClearance,
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
      case "turret_analyze_interface":
        return this.analyzeInterface(params.interfaceType as ToolHolderInterface);

      case "turret_compare_interfaces":
        return this.compareInterfaces(
          params.interface1 as ToolHolderInterface,
          params.interface2 as ToolHolderInterface,
          params.application as string
        );

      case "turret_analyze_capability":
        return this.analyzeTurretCapability(params.config as TurretConfig);

      case "turret_optimize_layout":
        return this.optimizeToolLayout(params as TurretOptimizationInput);

      case "turret_plan_gang":
        return this.planGangToolLayout(
          params.tools as ToolOption[],
          params.operations as OperationSequence[],
          params.maxWidth_mm as number
        );

      case "turret_check_interference":
        return this.checkToolInterference(
          params.assignments as ToolAssignment[],
          params.config as TurretConfig
        );

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }
}

export const turretLayoutEngine = new TurretLayoutEngine();
