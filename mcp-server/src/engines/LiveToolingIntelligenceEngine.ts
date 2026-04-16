/**
 * LiveToolingIntelligenceEngine.ts
 * Deep intelligence for live/driven tooling on turning centers
 *
 * Covers: Driven tool types, C-axis modes, Y-axis milling, milling strategies,
 * polygon turning, thread milling, helical interpolation, off-center operations
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

export interface LiveToolingConfig {
  machineId: string;
  drivenToolType: 'integral' | 'belt_driven' | 'gear_driven' | 'direct_drive';
  maxDrivenRpm: number;
  drivenPower_kW: number;
  drivenTorque_Nm: number;
  cAxisType: 'indexing' | 'contouring' | 'both';
  cAxisResolution_deg: number;
  cAxisClampingTorque_Nm?: number;
  hasYAxis: boolean;
  yAxisTravel_mm?: number;
  yAxisResolution_mm?: number;
  toolHolderInterface: 'bmt' | 'vdi' | 'capto' | 'hsk' | 'proprietary';
  toolHolderSize: number; // BMT45, VDI40, etc.
  maxToolDiameter_mm: number;
  maxToolLength_mm: number;
  coolantThroughTool: boolean;
  coolantPressure_bar?: number;
}

export interface LiveToolingOperation {
  operationId: string;
  type: 'face_mill' | 'end_mill' | 'slot' | 'pocket' | 'drill' | 'tap' | 'ream' |
        'thread_mill' | 'helical_interpolate' | 'polygon' | 'keyway' | 'flat' |
        'cross_hole' | 'angular_hole' | 'contour' | 'engrave';
  position: 'radial' | 'axial' | 'angular';
  angle_deg?: number; // For angular operations
  diameter_mm?: number;
  depth_mm?: number;
  width_mm?: number;
  length_mm?: number;
  pitch_mm?: number; // For thread milling
  helixAngle_deg?: number;
  material: string;
  tolerance_mm?: number;
  surfaceFinish_Ra?: number;
}

export interface DrivenToolAnalysis {
  isCapable: boolean;
  drivenType: string;
  powerRequired_kW: number;
  torqueRequired_Nm: number;
  rpmRecommended: number;
  powerMargin_percent: number;
  torqueMargin_percent: number;
  limitingFactor: 'none' | 'power' | 'torque' | 'rpm' | 'tool_diameter';
  recommendations: string[];
}

export interface CAxisStrategy {
  mode: 'indexing' | 'contouring';
  positions: CAxisPosition[];
  totalIndexTime_seconds: number;
  contouringRequired: boolean;
  syncWithSpindle: boolean;
  clampingRequired: boolean;
  accuracyAchievable_deg: number;
}

export interface CAxisPosition {
  positionId: string;
  angle_deg: number;
  operation: string;
  dwellTime_seconds: number;
  clampBeforeCut: boolean;
}

export interface YAxisMillingPlan {
  isRequired: boolean;
  operations: YAxisOperation[];
  totalYTravel_mm: number;
  centerlineOffset_mm: number;
  accessibleFeatures: string[];
  limitations: string[];
}

export interface YAxisOperation {
  operationId: string;
  yPosition_mm: number;
  cutDirection: 'climb' | 'conventional';
  stepover_mm: number;
  strategy: 'linear' | 'zigzag' | 'contour' | 'pocket';
}

export interface MillingStrategyPlan {
  strategy: string;
  toolpath: ToolpathSegment[];
  cuttingParams: MillingCuttingParams;
  estimatedTime_seconds: number;
  chipLoad_mm: number;
  mrr_cm3PerMin: number;
  warnings: string[];
}

export interface ToolpathSegment {
  segmentId: string;
  type: 'rapid' | 'linear' | 'arc_cw' | 'arc_ccw' | 'helix';
  startPoint: { x: number; y?: number; z: number; c?: number };
  endPoint: { x: number; y?: number; z: number; c?: number };
  feedRate_mmPerMin?: number;
}

export interface MillingCuttingParams {
  spindleRpm: number;
  feedRate_mmPerMin: number;
  depthOfCut_mm: number;
  stepover_mm: number;
  coolant: 'flood' | 'mist' | 'through_tool' | 'air' | 'none';
  cutDirection: 'climb' | 'conventional';
}

export interface PolygonTurningPlan {
  isCapable: boolean;
  method: 'driven_polygon' | 'synchronized' | 'whirling';
  sides: number;
  inscribedDiameter_mm: number;
  flatWidth_mm: number;
  synchronizationRatio: number;
  workpieceRpm: number;
  toolRpm: number;
  feedRate_mmPerRev: number;
  surfaceSpeed_mPerMin: number;
  estimatedTime_seconds: number;
  toolRequirements: PolygonTooling;
}

export interface PolygonTooling {
  toolType: 'polygon_cutter' | 'fly_cutter' | 'form_tool';
  insertCount: number;
  diameter_mm: number;
  cuttingEdgeLength_mm: number;
}

export interface ThreadMillingPlan {
  isCapable: boolean;
  method: 'single_point' | 'multi_point' | 'solid' | 'indexable';
  threadForm: string;
  pitch_mm: number;
  diameter_mm: number;
  length_mm: number;
  helixPasses: number;
  radialPasses: number;
  entryMethod: 'radial' | 'helical' | 'arc';
  synchronization: ThreadMillSync;
  estimatedTime_seconds: number;
  advantages: string[];
}

export interface ThreadMillSync {
  helicalInterpolation: boolean;
  cAxisFeed_degPerMm: number;
  zFeedPerRevolution_mm: number;
  spindleRpm: number;
}

export interface HelicalInterpolationPlan {
  type: 'bore' | 'thread' | 'ramp' | 'pocket';
  startDiameter_mm: number;
  endDiameter_mm: number;
  pitch_mm: number;
  direction: 'climb' | 'conventional';
  helixAngle_deg: number;
  passes: number;
  interpolationParams: HelixParams;
  estimatedTime_seconds: number;
}

export interface HelixParams {
  iIncrement_mm: number;
  jIncrement_mm: number;
  zIncrement_mm: number;
  feedRate_mmPerMin: number;
}

export interface OffCenterOperationPlan {
  operations: OffCenterOp[];
  yAxisRequired: boolean;
  cAxisRequired: boolean;
  maxOffset_mm: number;
  toolReach_mm: number;
  collisionRisks: string[];
}

export interface OffCenterOp {
  operationId: string;
  type: string;
  xOffset_mm: number;
  yOffset_mm: number;
  cAngle_deg: number;
  approach: 'radial' | 'axial' | 'angular';
}

export interface LiveToolingProcessPlan {
  operations: PlannedLiveOp[];
  totalCycleTime_seconds: number;
  toolChanges: number;
  cAxisMoves: number;
  yAxisMoves: number;
  powerUtilization_percent: number;
  reasoningChain: ReasoningStep[];
}

export interface PlannedLiveOp {
  sequence: number;
  operationId: string;
  strategy: string;
  cuttingParams: MillingCuttingParams;
  estimatedTime_seconds: number;
  toolId: string;
  notes: string[];
}

export interface ReasoningStep {
  step: number;
  engine: string;
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  confidence: number;
  rationale: string;
}

// ============================================================================
// Engine Implementation
// ============================================================================

export class LiveToolingIntelligenceEngine {
  readonly name = 'LiveToolingIntelligenceEngine';
  readonly version = '1.0.0';
  readonly description = 'Deep intelligence for live/driven tooling on turning centers';

  // Material-specific cutting speed factors (relative to steel)
  private readonly materialSpeedFactors: Record<string, number> = {
    'aluminum': 3.0,
    'brass': 2.5,
    'bronze': 2.0,
    'steel_1018': 1.0,
    'steel_4140': 0.8,
    'steel_4340': 0.7,
    'stainless_303': 0.6,
    'stainless_304': 0.5,
    'stainless_316': 0.45,
    'titanium': 0.3,
    'inconel': 0.2,
    'plastic': 4.0,
  };

  // Tool type to base SFM
  private readonly baseSfm: Record<string, number> = {
    'face_mill': 400,
    'end_mill': 350,
    'slot': 300,
    'drill': 300,
    'tap': 100,
    'ream': 150,
    'thread_mill': 250,
    'polygon': 200,
  };

  // ============================================================================
  // Driven Tool Analysis
  // ============================================================================

  /**
   * Analyze driven tool capability for an operation
   */
  analyzeDrivenToolCapability(
    operation: LiveToolingOperation,
    config: LiveToolingConfig
  ): EngineResult<DrivenToolAnalysis> {
    const material = this.normalizeMaterial(operation.material);
    const speedFactor = this.materialSpeedFactors[material] || 1.0;

    // Calculate required cutting parameters
    const baseSfm = this.baseSfm[operation.type] || 300;
    const sfm = baseSfm * speedFactor;
    const toolDiameter = operation.diameter_mm || 10;

    // RPM = (SFM * 3.82) / diameter_inches
    const rpmRequired = (sfm * 3.82) / (toolDiameter / 25.4);
    const rpmRecommended = Math.min(rpmRequired, config.maxDrivenRpm);

    // Power calculation (rough estimate based on MRR)
    const doc = operation.depth_mm || 2;
    const width = operation.width_mm || toolDiameter * 0.5;
    const feedRate = this.calculateFeedRate(operation, rpmRecommended, material);
    const mrr = (doc * width * feedRate) / 1000; // cm³/min
    const specificPower = this.getSpecificPower(material);
    const powerRequired = mrr * specificPower;

    // Torque calculation
    const torqueRequired = (powerRequired * 9550) / rpmRecommended;

    // Margins
    const powerMargin = ((config.drivenPower_kW - powerRequired) / config.drivenPower_kW) * 100;
    const torqueMargin = ((config.drivenTorque_Nm - torqueRequired) / config.drivenTorque_Nm) * 100;

    // Determine limiting factor
    let limitingFactor: DrivenToolAnalysis['limitingFactor'] = 'none';
    const recommendations: string[] = [];

    if (powerMargin < 0) {
      limitingFactor = 'power';
      recommendations.push('Reduce depth of cut or feed rate to stay within power limits');
    } else if (torqueMargin < 0) {
      limitingFactor = 'torque';
      recommendations.push('Reduce cutting forces - consider smaller stepover');
    } else if (rpmRequired > config.maxDrivenRpm) {
      limitingFactor = 'rpm';
      recommendations.push(`Use larger tool diameter to achieve target surface speed at ${config.maxDrivenRpm} RPM`);
    } else if (toolDiameter > config.maxToolDiameter_mm) {
      limitingFactor = 'tool_diameter';
      recommendations.push(`Tool diameter exceeds machine limit of ${config.maxToolDiameter_mm}mm`);
    }

    if (powerMargin < 20 && powerMargin >= 0) {
      recommendations.push('Operating near power limit - monitor for spindle stall');
    }

    if (config.drivenToolType === 'belt_driven' && rpmRecommended > 4000) {
      recommendations.push('Belt-driven spindle may have reduced accuracy at high RPM');
    }

    return {
      success: true,
      data: {
        isCapable: limitingFactor === 'none' || limitingFactor === 'rpm',
        drivenType: config.drivenToolType,
        powerRequired_kW: Math.round(powerRequired * 100) / 100,
        torqueRequired_Nm: Math.round(torqueRequired * 10) / 10,
        rpmRecommended: Math.round(rpmRecommended),
        powerMargin_percent: Math.round(powerMargin),
        torqueMargin_percent: Math.round(torqueMargin),
        limitingFactor,
        recommendations
      }
    };
  }

  private calculateFeedRate(
    operation: LiveToolingOperation,
    rpm: number,
    material: string
  ): number {
    // Feed per tooth based on operation type
    const fptBase: Record<string, number> = {
      'face_mill': 0.15,
      'end_mill': 0.08,
      'slot': 0.05,
      'drill': 0.12,
      'tap': 1.0, // pitch
      'thread_mill': 0.05,
    };

    const fpt = (fptBase[operation.type] || 0.08) / (this.materialSpeedFactors[material] || 1.0);
    const teeth = operation.type.includes('mill') ? 4 : 2;

    return rpm * fpt * teeth; // mm/min
  }

  private getSpecificPower(material: string): number {
    // Specific cutting power in kW per cm³/min
    const powers: Record<string, number> = {
      'aluminum': 0.4,
      'brass': 0.5,
      'steel_1018': 1.0,
      'steel_4140': 1.3,
      'stainless_304': 1.5,
      'titanium': 1.8,
      'inconel': 2.2,
    };
    return powers[material] || 1.0;
  }

  // ============================================================================
  // C-Axis Strategy
  // ============================================================================

  /**
   * Plan C-axis strategy for operations
   */
  planCAxisStrategy(
    operations: LiveToolingOperation[],
    config: LiveToolingConfig
  ): EngineResult<CAxisStrategy> {
    if (config.cAxisType === 'indexing' && operations.some(op =>
      op.type === 'contour' || op.type === 'helical_interpolate' || op.type === 'thread_mill'
    )) {
      return {
        success: false,
        error: 'Contouring operations require C-axis contouring capability'
      };
    }

    const positions: CAxisPosition[] = [];
    let totalIndexTime = 0;
    let contouringRequired = false;
    const indexTimePerDegree = 0.005; // seconds per degree typical

    // Group operations by C-axis position
    const operationsByAngle = new Map<number, LiveToolingOperation[]>();

    for (const op of operations) {
      const angle = op.angle_deg || 0;
      const existing = operationsByAngle.get(angle) || [];
      existing.push(op);
      operationsByAngle.set(angle, existing);

      if (['contour', 'helical_interpolate', 'thread_mill', 'engrave'].includes(op.type)) {
        contouringRequired = true;
      }
    }

    // Generate positions
    let positionIndex = 1;
    const sortedAngles = [...operationsByAngle.keys()].sort((a, b) => a - b);
    let previousAngle = 0;

    for (const angle of sortedAngles) {
      const ops = operationsByAngle.get(angle)!;
      const indexDelta = Math.abs(angle - previousAngle);
      const indexTime = indexDelta * indexTimePerDegree;
      totalIndexTime += indexTime;

      // Determine if clamping needed
      const needsClamping = ops.some(op =>
        ['face_mill', 'end_mill', 'slot', 'pocket', 'keyway'].includes(op.type)
      );

      positions.push({
        positionId: `C_POS_${positionIndex++}`,
        angle_deg: angle,
        operation: ops.map(o => o.operationId).join(', '),
        dwellTime_seconds: needsClamping ? 0.2 : 0,
        clampBeforeCut: needsClamping && config.cAxisClampingTorque_Nm !== undefined
      });

      previousAngle = angle;
    }

    // Determine mode
    const mode = contouringRequired ? 'contouring' : 'indexing';

    // Check if spindle sync needed (for polygon, some threading)
    const syncWithSpindle = operations.some(op => op.type === 'polygon');

    return {
      success: true,
      data: {
        mode,
        positions,
        totalIndexTime_seconds: totalIndexTime,
        contouringRequired,
        syncWithSpindle,
        clampingRequired: positions.some(p => p.clampBeforeCut),
        accuracyAchievable_deg: config.cAxisResolution_deg
      }
    };
  }

  // ============================================================================
  // Y-Axis Milling
  // ============================================================================

  /**
   * Plan Y-axis milling operations
   */
  planYAxisMilling(
    operations: LiveToolingOperation[],
    config: LiveToolingConfig
  ): EngineResult<YAxisMillingPlan> {
    if (!config.hasYAxis) {
      return {
        success: true,
        data: {
          isRequired: false,
          operations: [],
          totalYTravel_mm: 0,
          centerlineOffset_mm: 0,
          accessibleFeatures: [],
          limitations: ['Machine does not have Y-axis capability']
        }
      };
    }

    const yAxisOps: YAxisOperation[] = [];
    const accessibleFeatures: string[] = [];
    const limitations: string[] = [];
    let maxYPosition = 0;

    // Identify operations that benefit from Y-axis
    for (const op of operations) {
      if (['keyway', 'flat', 'pocket', 'slot', 'contour'].includes(op.type)) {
        // Off-center features need Y-axis
        const yPosition = op.width_mm ? op.width_mm / 2 : 0;

        if (yPosition > (config.yAxisTravel_mm || 0) / 2) {
          limitations.push(`${op.operationId}: Y offset ${yPosition}mm exceeds travel`);
        } else {
          const strategy = op.type === 'pocket' ? 'pocket' :
                          op.type === 'contour' ? 'contour' :
                          op.type === 'slot' ? 'zigzag' : 'linear';

          yAxisOps.push({
            operationId: op.operationId,
            yPosition_mm: yPosition,
            cutDirection: 'climb', // Default to climb for better finish
            stepover_mm: (op.diameter_mm || 10) * 0.4,
            strategy
          });

          accessibleFeatures.push(op.operationId);
          maxYPosition = Math.max(maxYPosition, Math.abs(yPosition));
        }
      }
    }

    // Check for flat milling on OD
    const flatOps = operations.filter(op => op.type === 'flat');
    for (const flat of flatOps) {
      // Flat on OD requires Y-axis offset
      const flatDepth = flat.depth_mm || 2;
      const partRadius = 25; // Assume default, should come from part data

      // Y offset for flat: sqrt(R² - (R-d)²)
      const yOffset = Math.sqrt(Math.pow(partRadius, 2) - Math.pow(partRadius - flatDepth, 2));

      if (yOffset > (config.yAxisTravel_mm || 0) / 2) {
        limitations.push(`Flat ${flat.operationId}: Required Y offset ${yOffset.toFixed(1)}mm exceeds travel`);
      }
    }

    return {
      success: true,
      data: {
        isRequired: yAxisOps.length > 0,
        operations: yAxisOps,
        totalYTravel_mm: maxYPosition * 2,
        centerlineOffset_mm: maxYPosition,
        accessibleFeatures,
        limitations
      }
    };
  }

  // ============================================================================
  // Milling Strategy Selection
  // ============================================================================

  /**
   * Select optimal milling strategy for operation
   */
  selectMillingStrategy(
    operation: LiveToolingOperation,
    config: LiveToolingConfig
  ): EngineResult<MillingStrategyPlan> {
    const material = this.normalizeMaterial(operation.material);
    const speedFactor = this.materialSpeedFactors[material] || 1.0;

    // Select strategy based on operation type
    let strategy: string;
    const toolpath: ToolpathSegment[] = [];
    const warnings: string[] = [];

    switch (operation.type) {
      case 'face_mill':
        strategy = 'face_milling_single_pass';
        break;
      case 'slot':
        strategy = operation.depth_mm && operation.depth_mm > (operation.diameter_mm || 10) ?
          'slot_helical_entry' : 'slot_plunge_and_cut';
        break;
      case 'pocket':
        strategy = 'pocket_trochoidal';
        break;
      case 'keyway':
        strategy = 'keyway_plunge_and_slot';
        break;
      case 'contour':
        strategy = 'contour_with_caxis';
        break;
      case 'drill':
        strategy = 'drill_peck';
        break;
      case 'tap':
        strategy = 'rigid_tap';
        break;
      case 'thread_mill':
        strategy = 'thread_mill_helical';
        break;
      default:
        strategy = 'general_milling';
    }

    // Calculate cutting parameters
    const toolDiameter = operation.diameter_mm || 10;
    const baseSfm = this.baseSfm[operation.type] || 300;
    const sfm = baseSfm * speedFactor;
    const spindleRpm = Math.min(
      (sfm * 3.82) / (toolDiameter / 25.4),
      config.maxDrivenRpm
    );

    const feedPerTooth = 0.08 / speedFactor;
    const teeth = 4;
    const feedRate = Math.round(spindleRpm * feedPerTooth * teeth);

    const depthOfCut = operation.depth_mm || 2;
    const stepover = toolDiameter * 0.4;

    // Calculate chip load and MRR
    const chipLoad = feedRate / (spindleRpm * teeth);
    const mrr = (depthOfCut * stepover * feedRate) / 1000;

    // Coolant selection
    let coolant: MillingCuttingParams['coolant'] = 'flood';
    if (config.coolantThroughTool && operation.type === 'drill') {
      coolant = 'through_tool';
    } else if (material === 'aluminum') {
      coolant = 'mist';
    }

    // Generate basic toolpath
    toolpath.push({
      segmentId: 'RAPID_APPROACH',
      type: 'rapid',
      startPoint: { x: 50, z: 5 },
      endPoint: { x: operation.depth_mm || 2, z: 0 }
    });

    toolpath.push({
      segmentId: 'CUT_1',
      type: 'linear',
      startPoint: { x: operation.depth_mm || 2, z: 0 },
      endPoint: { x: operation.depth_mm || 2, z: -(operation.length_mm || 20) },
      feedRate_mmPerMin: feedRate
    });

    // Warnings
    if (spindleRpm < 1000) {
      warnings.push('Low spindle speed may cause poor surface finish');
    }
    if (chipLoad > 0.15) {
      warnings.push('High chip load - verify tool can handle the load');
    }

    // Estimate time
    const cutLength = operation.length_mm || 20;
    const estimatedTime = (cutLength / feedRate) * 60 + 5; // seconds

    return {
      success: true,
      data: {
        strategy,
        toolpath,
        cuttingParams: {
          spindleRpm: Math.round(spindleRpm),
          feedRate_mmPerMin: feedRate,
          depthOfCut_mm: depthOfCut,
          stepover_mm: stepover,
          coolant,
          cutDirection: 'climb'
        },
        estimatedTime_seconds: estimatedTime,
        chipLoad_mm: Math.round(chipLoad * 1000) / 1000,
        mrr_cm3PerMin: Math.round(mrr * 100) / 100,
        warnings
      }
    };
  }

  // ============================================================================
  // Polygon Turning
  // ============================================================================

  /**
   * Plan polygon turning operation
   */
  planPolygonTurning(
    sides: number,
    inscribedDiameter_mm: number,
    length_mm: number,
    material: string,
    config: LiveToolingConfig
  ): EngineResult<PolygonTurningPlan> {
    // Polygon turning requires synchronized spindles
    if (config.cAxisType === 'indexing') {
      return {
        success: false,
        error: 'Polygon turning requires contouring C-axis or spindle synchronization'
      };
    }

    // Calculate flat width
    // For regular polygon: flat_width = 2 * R * sin(π/n) where R is circumradius
    const circumradius = inscribedDiameter_mm / (2 * Math.cos(Math.PI / sides));
    const flatWidth = 2 * circumradius * Math.sin(Math.PI / sides);

    // Synchronization ratio: workpiece rotates n times while tool rotates (n-1) or (n+1) times
    // For external polygon: ratio = (sides - 1) / sides or (sides + 1) / sides
    const syncRatio = (sides - 1) / sides;

    // Calculate speeds
    const materialFactor = this.materialSpeedFactors[this.normalizeMaterial(material)] || 1.0;
    const baseSfm = 200 * materialFactor;

    // Surface speed determines workpiece RPM
    const workpieceRpm = (baseSfm * 3.82) / (inscribedDiameter_mm / 25.4);
    const cappedWorkpieceRpm = Math.min(workpieceRpm, 2000); // Typical limit for polygon

    // Tool RPM based on sync ratio
    const toolRpm = cappedWorkpieceRpm * syncRatio;

    // Check if tool RPM is achievable
    if (toolRpm > config.maxDrivenRpm) {
      return {
        success: false,
        error: `Required tool RPM ${Math.round(toolRpm)} exceeds machine limit ${config.maxDrivenRpm}`
      };
    }

    // Feed rate
    const feedRate = 0.1 / materialFactor; // mm/rev

    // Time estimate
    const estimatedTime = (length_mm / feedRate) / cappedWorkpieceRpm * 60;

    // Tooling
    const tooling: PolygonTooling = {
      toolType: sides <= 6 ? 'polygon_cutter' : 'fly_cutter',
      insertCount: sides <= 6 ? sides : 1,
      diameter_mm: circumradius * 2 + 10, // Cutter OD
      cuttingEdgeLength_mm: flatWidth + 2
    };

    return {
      success: true,
      data: {
        isCapable: true,
        method: 'synchronized',
        sides,
        inscribedDiameter_mm,
        flatWidth_mm: Math.round(flatWidth * 100) / 100,
        synchronizationRatio: syncRatio,
        workpieceRpm: Math.round(cappedWorkpieceRpm),
        toolRpm: Math.round(toolRpm),
        feedRate_mmPerRev: feedRate,
        surfaceSpeed_mPerMin: Math.round(baseSfm * 0.3048), // SFM to m/min
        estimatedTime_seconds: Math.round(estimatedTime),
        toolRequirements: tooling
      }
    };
  }

  // ============================================================================
  // Thread Milling
  // ============================================================================

  /**
   * Plan thread milling operation
   */
  planThreadMilling(
    threadDiameter_mm: number,
    pitch_mm: number,
    length_mm: number,
    threadType: 'internal' | 'external',
    material: string,
    config: LiveToolingConfig
  ): EngineResult<ThreadMillingPlan> {
    // Thread milling requires helical interpolation (C-axis contouring + Z)
    if (config.cAxisType === 'indexing') {
      return {
        success: false,
        error: 'Thread milling requires C-axis contouring capability'
      };
    }

    const materialFactor = this.materialSpeedFactors[this.normalizeMaterial(material)] || 1.0;

    // Determine method based on thread size
    let method: ThreadMillingPlan['method'];
    let toolDiameter: number;

    if (threadDiameter_mm < 10) {
      method = 'solid';
      toolDiameter = threadDiameter_mm * 0.6;
    } else if (threadDiameter_mm < 30) {
      method = 'single_point';
      toolDiameter = pitch_mm * 8; // Typical ratio
    } else {
      method = 'indexable';
      toolDiameter = pitch_mm * 10;
    }

    // Calculate number of helical passes
    const threadDepth = pitch_mm * 0.65; // Standard 60° thread
    const radialPassDepth = threadDepth / 3;
    const radialPasses = Math.ceil(threadDepth / radialPassDepth);

    // Helix passes (one full helix per thread)
    const threads = Math.ceil(length_mm / pitch_mm);
    const helixPasses = threads;

    // Cutting parameters
    const sfm = 250 * materialFactor;
    const spindleRpm = Math.min(
      (sfm * 3.82) / (toolDiameter / 25.4),
      config.maxDrivenRpm
    );

    // C-axis feed
    const cAxisFeed = 360 / pitch_mm; // degrees per mm of Z

    // Time estimate
    const helixLength = Math.sqrt(
      Math.pow(Math.PI * threadDiameter_mm, 2) + Math.pow(pitch_mm, 2)
    );
    const totalHelixLength = helixLength * threads * radialPasses;
    const feedRate = spindleRpm * 0.05 * 4; // mm/min
    const estimatedTime = (totalHelixLength / feedRate) * 60;

    // Entry method
    const entryMethod = threadType === 'internal' ? 'helical' : 'radial';

    return {
      success: true,
      data: {
        isCapable: true,
        method,
        threadForm: 'ISO_metric',
        pitch_mm,
        diameter_mm: threadDiameter_mm,
        length_mm,
        helixPasses,
        radialPasses,
        entryMethod,
        synchronization: {
          helicalInterpolation: true,
          cAxisFeed_degPerMm: cAxisFeed,
          zFeedPerRevolution_mm: pitch_mm,
          spindleRpm: Math.round(spindleRpm)
        },
        estimatedTime_seconds: Math.round(estimatedTime),
        advantages: [
          'Single tool for multiple thread sizes',
          'Can produce threads to shoulder',
          threadType === 'internal' ? 'No tap breakage risk' : 'Excellent thread quality',
          'Easy to adjust for thread fit'
        ]
      }
    };
  }

  // ============================================================================
  // Helical Interpolation
  // ============================================================================

  /**
   * Plan helical interpolation operation
   */
  planHelicalInterpolation(
    type: 'bore' | 'thread' | 'ramp' | 'pocket',
    startDiameter_mm: number,
    endDiameter_mm: number,
    depth_mm: number,
    material: string,
    config: LiveToolingConfig
  ): EngineResult<HelicalInterpolationPlan> {
    if (config.cAxisType === 'indexing') {
      return {
        success: false,
        error: 'Helical interpolation requires C-axis contouring capability'
      };
    }

    const materialFactor = this.materialSpeedFactors[this.normalizeMaterial(material)] || 1.0;

    // Calculate pitch based on type
    let pitch: number;
    switch (type) {
      case 'bore':
        pitch = 2.0; // Gentle helix for boring
        break;
      case 'ramp':
        pitch = 5.0; // Faster ramp for entry
        break;
      case 'pocket':
        pitch = 3.0; // Medium for pocketing
        break;
      case 'thread':
        pitch = 1.0; // Will be overridden by thread pitch
        break;
      default:
        pitch = 2.0;
    }

    // Number of passes based on diameter difference
    const diameterDiff = Math.abs(endDiameter_mm - startDiameter_mm);
    const stepover = 2.0 / materialFactor; // mm per pass
    const passes = Math.ceil(diameterDiff / 2 / stepover); // Radial passes

    // Helix parameters
    const avgDiameter = (startDiameter_mm + endDiameter_mm) / 2;
    const iIncrement = avgDiameter / 2; // I is radius
    const jIncrement = 0; // J typically 0 for C-axis helix
    const zIncrement = pitch;

    // Calculate feed rate
    const sfm = 300 * materialFactor;
    const toolDiameter = (endDiameter_mm - startDiameter_mm) / 2;
    const spindleRpm = Math.min(
      (sfm * 3.82) / (Math.max(toolDiameter, 6) / 25.4),
      config.maxDrivenRpm
    );
    const feedRate = spindleRpm * 0.06 * 4; // mm/min

    // Helix angle
    const helixCircumference = Math.PI * avgDiameter;
    const helixAngle = Math.atan(pitch / helixCircumference) * 180 / Math.PI;

    // Time estimate
    const helixesPerPass = depth_mm / pitch;
    const helixLength = Math.sqrt(
      Math.pow(helixCircumference, 2) + Math.pow(pitch, 2)
    ) * helixesPerPass;
    const totalLength = helixLength * passes;
    const estimatedTime = (totalLength / feedRate) * 60;

    return {
      success: true,
      data: {
        type,
        startDiameter_mm,
        endDiameter_mm,
        pitch_mm: pitch,
        direction: 'climb',
        helixAngle_deg: Math.round(helixAngle * 10) / 10,
        passes,
        interpolationParams: {
          iIncrement_mm: Math.round(iIncrement * 100) / 100,
          jIncrement_mm: jIncrement,
          zIncrement_mm: zIncrement,
          feedRate_mmPerMin: Math.round(feedRate)
        },
        estimatedTime_seconds: Math.round(estimatedTime)
      }
    };
  }

  // ============================================================================
  // Off-Center Operations
  // ============================================================================

  /**
   * Plan off-center operations (holes, features not on centerline)
   */
  planOffCenterOperations(
    operations: LiveToolingOperation[],
    partDiameter_mm: number,
    config: LiveToolingConfig
  ): EngineResult<OffCenterOperationPlan> {
    const offCenterOps: OffCenterOp[] = [];
    const collisionRisks: string[] = [];
    let maxOffset = 0;
    let yAxisRequired = false;
    let cAxisRequired = false;

    for (const op of operations) {
      // Check if operation is off-center
      const isOffCenter = op.position === 'radial' || op.position === 'angular';

      if (!isOffCenter) continue;

      // Calculate offsets
      let xOffset = 0;
      let yOffset = 0;
      let cAngle = op.angle_deg || 0;

      if (op.position === 'radial') {
        // Radial feature on OD surface
        xOffset = partDiameter_mm / 2;
        yOffset = 0;
        cAxisRequired = true;
      } else if (op.position === 'angular') {
        // Angular approach
        const angle = (op.angle_deg || 0) * Math.PI / 180;
        xOffset = (partDiameter_mm / 2) * Math.cos(angle);
        yOffset = (partDiameter_mm / 2) * Math.sin(angle);

        if (Math.abs(yOffset) > 0.1) {
          yAxisRequired = true;
        }
        cAxisRequired = true;
      }

      // Check Y-axis capability
      if (yAxisRequired && !config.hasYAxis) {
        collisionRisks.push(`${op.operationId}: Requires Y-axis which is not available`);
      } else if (yAxisRequired && Math.abs(yOffset) > (config.yAxisTravel_mm || 0) / 2) {
        collisionRisks.push(`${op.operationId}: Y offset ${yOffset.toFixed(1)}mm exceeds travel`);
      }

      offCenterOps.push({
        operationId: op.operationId,
        type: op.type,
        xOffset_mm: Math.round(xOffset * 100) / 100,
        yOffset_mm: Math.round(yOffset * 100) / 100,
        cAngle_deg: cAngle,
        approach: op.position
      });

      maxOffset = Math.max(maxOffset, Math.abs(yOffset));
    }

    // Tool reach check
    const toolReach = config.maxToolLength_mm;

    return {
      success: true,
      data: {
        operations: offCenterOps,
        yAxisRequired,
        cAxisRequired,
        maxOffset_mm: Math.round(maxOffset * 100) / 100,
        toolReach_mm: toolReach,
        collisionRisks
      }
    };
  }

  // ============================================================================
  // Complete Process Planning
  // ============================================================================

  /**
   * Generate complete live tooling process plan
   */
  generateProcessPlan(
    operations: LiveToolingOperation[],
    config: LiveToolingConfig
  ): EngineResult<LiveToolingProcessPlan> {
    const reasoningChain: ReasoningStep[] = [];
    let stepNumber = 1;

    const plannedOps: PlannedLiveOp[] = [];
    let totalCycleTime = 0;
    let toolChanges = 0;
    let cAxisMoves = 0;
    let yAxisMoves = 0;
    let maxPower = 0;

    // Analyze each operation
    for (const op of operations) {
      // Analyze capability
      const capabilityResult = this.analyzeDrivenToolCapability(op, config);
      if (!capabilityResult.success || !capabilityResult.data?.isCapable) {
        reasoningChain.push({
          step: stepNumber++,
          engine: this.name,
          action: 'analyzeDrivenToolCapability',
          input: { operation: op.operationId },
          output: { capable: false, reason: capabilityResult.data?.limitingFactor },
          confidence: 0.95,
          rationale: `Operation ${op.operationId} exceeds machine capability`
        });
        continue;
      }

      // Select milling strategy
      const strategyResult = this.selectMillingStrategy(op, config);
      if (!strategyResult.success) continue;

      const strategy = strategyResult.data!;

      plannedOps.push({
        sequence: plannedOps.length + 1,
        operationId: op.operationId,
        strategy: strategy.strategy,
        cuttingParams: strategy.cuttingParams,
        estimatedTime_seconds: strategy.estimatedTime_seconds,
        toolId: `T${plannedOps.length + 1}`,
        notes: strategy.warnings
      });

      totalCycleTime += strategy.estimatedTime_seconds;
      maxPower = Math.max(maxPower, capabilityResult.data!.powerRequired_kW);

      // Count axis moves
      if (op.angle_deg !== undefined && op.angle_deg !== 0) {
        cAxisMoves++;
      }
      if (op.position === 'angular' && config.hasYAxis) {
        yAxisMoves++;
      }

      toolChanges++;
    }

    // Add tool change time
    totalCycleTime += toolChanges * 8; // 8 seconds per tool change typical

    // Add axis positioning time
    totalCycleTime += cAxisMoves * 2;
    totalCycleTime += yAxisMoves * 1;

    // Power utilization
    const powerUtilization = (maxPower / config.drivenPower_kW) * 100;

    reasoningChain.push({
      step: stepNumber++,
      engine: this.name,
      action: 'generateProcessPlan',
      input: { operationCount: operations.length },
      output: { plannedCount: plannedOps.length, cycleTime: totalCycleTime },
      confidence: 0.88,
      rationale: `Planned ${plannedOps.length} of ${operations.length} operations`
    });

    return {
      success: true,
      data: {
        operations: plannedOps,
        totalCycleTime_seconds: Math.round(totalCycleTime),
        toolChanges,
        cAxisMoves,
        yAxisMoves,
        powerUtilization_percent: Math.round(powerUtilization),
        reasoningChain
      }
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private normalizeMaterial(material: string): string {
    const lower = material.toLowerCase();
    if (lower.includes('aluminum') || lower.includes('6061') || lower.includes('7075')) {
      return 'aluminum';
    }
    if (lower.includes('brass')) return 'brass';
    if (lower.includes('bronze')) return 'bronze';
    if (lower.includes('4140') || lower.includes('4340')) return 'steel_4140';
    if (lower.includes('304')) return 'stainless_304';
    if (lower.includes('316')) return 'stainless_316';
    if (lower.includes('titanium') || lower.includes('ti-')) return 'titanium';
    if (lower.includes('inconel') || lower.includes('718')) return 'inconel';
    if (lower.includes('plastic') || lower.includes('delrin')) return 'plastic';
    return 'steel_1018';
  }

  // ============================================================================
  // Dispatcher Actions
  // ============================================================================

  async executeAction(
    action: string,
    params: Record<string, unknown>
  ): Promise<EngineResult<unknown>> {
    switch (action) {
      case 'live_analyze_capability':
        return this.analyzeDrivenToolCapability(
          params.operation as LiveToolingOperation,
          params.config as LiveToolingConfig
        );

      case 'live_plan_caxis':
        return this.planCAxisStrategy(
          params.operations as LiveToolingOperation[],
          params.config as LiveToolingConfig
        );

      case 'live_plan_yaxis':
        return this.planYAxisMilling(
          params.operations as LiveToolingOperation[],
          params.config as LiveToolingConfig
        );

      case 'live_select_strategy':
        return this.selectMillingStrategy(
          params.operation as LiveToolingOperation,
          params.config as LiveToolingConfig
        );

      case 'live_plan_polygon':
        return this.planPolygonTurning(
          params.sides as number,
          params.inscribedDiameter_mm as number,
          params.length_mm as number,
          params.material as string,
          params.config as LiveToolingConfig
        );

      case 'live_plan_thread_mill':
        return this.planThreadMilling(
          params.threadDiameter_mm as number,
          params.pitch_mm as number,
          params.length_mm as number,
          params.threadType as 'internal' | 'external',
          params.material as string,
          params.config as LiveToolingConfig
        );

      case 'live_plan_helical':
        return this.planHelicalInterpolation(
          params.type as 'bore' | 'thread' | 'ramp' | 'pocket',
          params.startDiameter_mm as number,
          params.endDiameter_mm as number,
          params.depth_mm as number,
          params.material as string,
          params.config as LiveToolingConfig
        );

      case 'live_plan_offcenter':
        return this.planOffCenterOperations(
          params.operations as LiveToolingOperation[],
          params.partDiameter_mm as number,
          params.config as LiveToolingConfig
        );

      case 'live_generate_plan':
        return this.generateProcessPlan(
          params.operations as LiveToolingOperation[],
          params.config as LiveToolingConfig
        );

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }
}

export const liveToolingIntelligenceEngine = new LiveToolingIntelligenceEngine();
