/**
 * CompleteMachiningEngine.ts
 * WFL-style complete machining intelligence for advanced mill-turn centers
 *
 * Covers: Mill-turn integration, B-axis interpolation, deep hole drilling,
 * gear cutting (hobbing, power skiving), single-setup complex part planning
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

export interface CompleteMachiningConfig {
  machineId: string;
  manufacturer: 'wfl' | 'dmg_mori' | 'mazak' | 'okuma' | 'weisser' | 'emco';
  model: string;
  swingDiameter_mm: number;
  maxTurningLength_mm: number;
  mainSpindle: SpindleSpec;
  counterSpindle?: SpindleSpec;
  millingSpindle: MillingSpindleSpec;
  bAxis: BAxisSpec;
  yAxis: YAxisSpec;
  toolMagazine: ToolMagazineSpec;
  deepDrillingCapability?: DeepDrillingSpec;
  gearCuttingCapability?: GearCuttingSpec;
  steadyRestPositions: number;
  coolantPressure_bar: number;
}

export interface SpindleSpec {
  maxRpm: number;
  power_kW: number;
  torque_Nm: number;
  cAxis: boolean;
  chuckSize_mm: number;
}

export interface MillingSpindleSpec {
  maxRpm: number;
  power_kW: number;
  torque_Nm: number;
  toolInterface: 'hsk63' | 'hsk100' | 'capto_c6' | 'capto_c8' | 'bt40' | 'bt50';
  internalCoolant: boolean;
  coolantPressure_bar: number;
}

export interface BAxisSpec {
  range_deg: number;
  resolution_deg: number;
  clampingTorque_Nm: number;
  continuous: boolean;
  indexable: boolean;
  indexIncrement_deg?: number;
}

export interface YAxisSpec {
  travel_mm: number;
  resolution_mm: number;
}

export interface ToolMagazineSpec {
  capacity: number;
  maxToolDiameter_mm: number;
  maxToolLength_mm: number;
  maxToolWeight_kg: number;
  changeTime_seconds: number;
}

export interface DeepDrillingSpec {
  maxDepth_mm: number;
  minDiameter_mm: number;
  maxDiameter_mm: number;
  supportedTypes: ('gun_drill' | 'bta' | 'ejector' | 'indexable')[];
  coolantDelivery: 'through_tool' | 'external' | 'both';
}

export interface GearCuttingSpec {
  supportedMethods: ('hobbing' | 'power_skiving' | 'shaping' | 'broaching')[];
  maxModule: number;
  minModule: number;
  maxDiameter_mm: number;
  internalGears: boolean;
}

export interface ComplexPart {
  partId: string;
  partType: 'shaft' | 'housing' | 'gear' | 'spindle' | 'coupling' | 'valve_body' | 'turbine';
  overallLength_mm: number;
  maxDiameter_mm: number;
  material: string;
  hardness_HRC?: number;
  features: PartFeature[];
  tolerances: DimensionalTolerance[];
  surfaceRequirements: SurfaceRequirement[];
  productionQuantity: number;
  setupPreference: 'single' | 'dual_spindle' | 'with_steady_rest';
}

export interface PartFeature {
  featureId: string;
  type: 'od_cylinder' | 'od_taper' | 'od_contour' | 'id_bore' | 'id_taper' |
        'face' | 'shoulder' | 'groove' | 'thread_external' | 'thread_internal' |
        'keyway' | 'spline' | 'gear_external' | 'gear_internal' | 'hex' | 'flat' |
        'pocket' | 'hole_pattern' | 'deep_hole' | 'cross_hole' | 'angular_hole' |
        'freeform' | 'polygon';
  location: 'front' | 'back' | 'od' | 'id' | 'end';
  zStart_mm: number;
  zEnd_mm: number;
  diameter_mm?: number;
  depth_mm?: number;
  angle_deg?: number;
  pitch_mm?: number;
  module?: number;
  teethCount?: number;
}

export interface DimensionalTolerance {
  toleranceId: string;
  featureId: string;
  type: 'diameter' | 'length' | 'position' | 'runout' | 'concentricity' | 'perpendicularity';
  nominal_mm: number;
  tolerance_mm: number;
  datum?: string;
}

export interface SurfaceRequirement {
  featureId: string;
  roughness_Ra: number;
  method?: 'turned' | 'ground' | 'milled' | 'honed' | 'burnished';
}

export interface SingleSetupPlan {
  operations: SetupOperation[];
  workholding: WorkholdingPlan;
  steadyRestUsage: SteadyRestPlan[];
  toolList: ToolRequirement[];
  estimatedCycleTime_seconds: number;
  criticalPath: string[];
  reasoningChain: ReasoningStep[];
}

export interface SetupOperation {
  operationId: string;
  sequence: number;
  type: 'turn' | 'mill' | 'drill' | 'bore' | 'thread' | 'gear_cut' | 'deep_drill';
  spindle: 'main' | 'counter' | 'milling';
  bAxisPosition_deg: number;
  features: string[];
  cuttingParams: CuttingParameters;
  estimatedTime_seconds: number;
  collisionRisks: string[];
}

export interface CuttingParameters {
  spindleRpm?: number;
  feedRate_mmPerRev?: number;
  feedRate_mmPerMin?: number;
  depthOfCut_mm?: number;
  coolant: 'flood' | 'mist' | 'high_pressure' | 'through_tool' | 'none';
  strategy?: string;
}

export interface WorkholdingPlan {
  primaryChuck: 'main' | 'counter';
  supportMethod: 'center' | 'steady_rest' | 'counter_spindle' | 'none';
  jawType: 'hard' | 'soft' | 'special';
  clampingDiameter_mm: number;
  clampingLength_mm: number;
  rechuckRequired: boolean;
  rechuckPosition_mm?: number;
}

export interface SteadyRestPlan {
  position_mm: number;
  supportDiameter_mm: number;
  loadDuringOperations: string[];
  reason: string;
}

export interface ToolRequirement {
  toolId: string;
  toolType: string;
  description: string;
  forOperations: string[];
  magazineSlot?: number;
  specialRequirements?: string[];
}

export interface BAxisInterpolation {
  isRequired: boolean;
  interpolationType: 'continuous' | 'indexed' | 'none';
  positions: BAxisPosition[];
  collisionAnalysis: CollisionPoint[];
  recommendations: string[];
}

export interface BAxisPosition {
  positionId: string;
  angle_deg: number;
  operation: string;
  toolOrientation: 'radial' | 'axial' | 'angular';
  accessibleFeatures: string[];
}

export interface CollisionPoint {
  pointId: string;
  bAngle_deg: number;
  zPosition_mm: number;
  risk: 'safe' | 'caution' | 'danger';
  affectedComponents: string[];
  clearance_mm: number;
}

export interface DeepHolePlan {
  method: 'gun_drill' | 'bta' | 'ejector' | 'pilot_and_ream';
  holes: DeepHoleOperation[];
  chipManagement: ChipStrategy;
  coolantRequirements: CoolantPlan;
  totalDrillingTime_seconds: number;
}

export interface DeepHoleOperation {
  holeId: string;
  diameter_mm: number;
  depth_mm: number;
  ldRatio: number;
  centerDrillRequired: boolean;
  pilotDrillDiameter_mm?: number;
  peckCycle: boolean;
  peckDepth_mm?: number;
  dwellTime_seconds?: number;
  spindleRpm: number;
  feedRate_mmPerMin: number;
  estimatedTime_seconds: number;
}

export interface ChipStrategy {
  type: 'continuous' | 'peck' | 'interrupted';
  chipBreakingMethod: 'feed_variation' | 'spindle_variation' | 'coolant_pulse' | 'none';
  evacuationMethod: 'coolant_flush' | 'retract' | 'through_hole';
}

export interface CoolantPlan {
  pressure_bar: number;
  flowRate_lpm: number;
  type: 'oil' | 'emulsion' | 'synthetic';
  filtration_micron: number;
}

export interface GearCuttingPlan {
  method: 'hobbing' | 'power_skiving' | 'shaping';
  gears: GearOperation[];
  tooling: GearTooling[];
  synchronization: GearSyncParams;
  qualityGrade: string;
  totalCuttingTime_seconds: number;
}

export interface GearOperation {
  gearId: string;
  type: 'external' | 'internal';
  module: number;
  teethCount: number;
  faceWidth_mm: number;
  helixAngle_deg: number;
  pressureAngle_deg: number;
  passes: number;
  roughingCuts: number;
  finishingCuts: number;
  estimatedTime_seconds: number;
}

export interface GearTooling {
  toolId: string;
  toolType: 'hob' | 'skiving_cutter' | 'shaping_cutter';
  module: number;
  numberOfStarts?: number;
  diameter_mm: number;
  coatingRequired: boolean;
}

export interface GearSyncParams {
  workpieceRpm: number;
  toolRpm: number;
  syncRatio: number;
  axialFeed_mmPerRev: number;
  shiftStrategy: 'tangential' | 'radial' | 'diagonal';
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

export class CompleteMachiningEngine {
  readonly name = 'CompleteMachiningEngine';
  readonly version = '1.0.0';
  readonly description = 'WFL-style complete machining intelligence for advanced mill-turn centers';

  // Material machinability (relative to 1018 steel)
  private readonly machinability: Record<string, number> = {
    'aluminum_6061': 2.5,
    'aluminum_7075': 2.0,
    'brass': 2.2,
    'steel_1018': 1.0,
    'steel_4140': 0.7,
    'steel_4340': 0.65,
    'stainless_304': 0.5,
    'stainless_316': 0.45,
    'stainless_17-4': 0.4,
    'titanium_6al4v': 0.25,
    'inconel_718': 0.15,
    'tool_steel_d2': 0.3,
    'tool_steel_h13': 0.35
  };

  // ============================================================================
  // Single Setup Planning
  // ============================================================================

  /**
   * Generate comprehensive single-setup process plan
   */
  planSingleSetup(
    part: ComplexPart,
    machine: CompleteMachiningConfig
  ): EngineResult<SingleSetupPlan> {
    const reasoningChain: ReasoningStep[] = [];
    let stepNumber = 1;

    // Analyze part geometry for setup requirements
    const geometryAnalysis = this.analyzeGeometry(part, machine);
    reasoningChain.push({
      step: stepNumber++,
      engine: this.name,
      action: 'analyzeGeometry',
      input: { features: part.features.length, length: part.overallLength_mm },
      output: geometryAnalysis,
      confidence: 0.92,
      rationale: `Analyzed ${part.features.length} features for setup optimization`
    });

    // Plan workholding
    const workholding = this.planWorkholding(part, machine);
    reasoningChain.push({
      step: stepNumber++,
      engine: this.name,
      action: 'planWorkholding',
      input: { diameter: part.maxDiameter_mm, length: part.overallLength_mm },
      output: { method: workholding.supportMethod, rechuck: workholding.rechuckRequired },
      confidence: 0.90,
      rationale: `${workholding.supportMethod} support with ${workholding.jawType} jaws`
    });

    // Plan steady rest usage if needed
    const steadyRests = this.planSteadyRests(part, machine, workholding);

    // Generate operation sequence
    const operations = this.generateOperationSequence(part, machine, workholding);
    reasoningChain.push({
      step: stepNumber++,
      engine: this.name,
      action: 'sequenceOperations',
      input: { features: part.features.length },
      output: { operations: operations.length },
      confidence: 0.88,
      rationale: `Sequenced ${operations.length} operations for optimal cycle time`
    });

    // Generate tool list
    const toolList = this.generateToolList(operations, part, machine);
    reasoningChain.push({
      step: stepNumber++,
      engine: this.name,
      action: 'selectTooling',
      input: { operations: operations.length },
      output: { tools: toolList.length },
      confidence: 0.85,
      rationale: `Selected ${toolList.length} tools for complete machining`
    });

    // Calculate cycle time
    const cycleTime = this.calculateCycleTime(operations, machine);

    // Identify critical path
    const criticalPath = this.identifyCriticalPath(operations);

    return { success: true, data: {
      operations,
      workholding,
      steadyRestUsage: steadyRests,
      toolList,
      estimatedCycleTime_seconds: cycleTime,
      criticalPath,
      reasoningChain
    } };
  }

  private analyzeGeometry(
    part: ComplexPart,
    machine: CompleteMachiningConfig
  ): Record<string, unknown> {
    const ldRatio = part.overallLength_mm / part.maxDiameter_mm;
    const needsSteadyRest = ldRatio > 6;
    const needsCounterSpindle = part.features.some(f => f.location === 'back');

    const featuresByType = new Map<string, number>();
    for (const feature of part.features) {
      const count = featuresByType.get(feature.type) || 0;
      featuresByType.set(feature.type, count + 1);
    }

    return {
      ldRatio,
      needsSteadyRest,
      needsCounterSpindle,
      featureDistribution: Object.fromEntries(featuresByType),
      complexity: part.features.length > 20 ? 'high' : part.features.length > 10 ? 'medium' : 'low'
    };
  }

  private planWorkholding(
    part: ComplexPart,
    machine: CompleteMachiningConfig
  ): WorkholdingPlan {
    const ldRatio = part.overallLength_mm / part.maxDiameter_mm;
    const hasBackFeatures = part.features.some(f => f.location === 'back');

    let supportMethod: WorkholdingPlan['supportMethod'];
    let rechuckRequired = false;
    let rechuckPosition: number | undefined;

    if (hasBackFeatures && machine.counterSpindle) {
      supportMethod = 'counter_spindle';
      rechuckRequired = true;
      rechuckPosition = part.overallLength_mm * 0.6; // transfer at 60%
    } else if (ldRatio > 6) {
      supportMethod = 'steady_rest';
    } else if (ldRatio > 3) {
      supportMethod = 'center';
    } else {
      supportMethod = 'none';
    }

    // Jaw type based on tolerance
    const hasPrecisionOD = part.tolerances.some(t =>
      t.type === 'diameter' && t.tolerance_mm < 0.02
    );
    const jawType = hasPrecisionOD ? 'soft' : 'hard';

    // Clamping on largest OD feature near front
    const frontOdFeatures = part.features.filter(f =>
      f.type === 'od_cylinder' && f.zStart_mm < part.overallLength_mm * 0.3
    );
    const clampingDiameter = frontOdFeatures.length > 0 ?
      Math.max(...frontOdFeatures.map(f => f.diameter_mm || part.maxDiameter_mm)) :
      part.maxDiameter_mm;

    return {
      primaryChuck: 'main',
      supportMethod,
      jawType,
      clampingDiameter_mm: clampingDiameter,
      clampingLength_mm: Math.min(50, part.overallLength_mm * 0.15),
      rechuckRequired,
      rechuckPosition_mm: rechuckPosition
    };
  }

  private planSteadyRests(
    part: ComplexPart,
    machine: CompleteMachiningConfig,
    workholding: WorkholdingPlan
  ): SteadyRestPlan[] {
    if (workholding.supportMethod !== 'steady_rest') {
      return [];
    }

    const steadyRests: SteadyRestPlan[] = [];
    const ldRatio = part.overallLength_mm / part.maxDiameter_mm;

    // Position steady rest at optimal locations
    const restCount = Math.min(machine.steadyRestPositions, Math.ceil(ldRatio / 5));

    for (let i = 0; i < restCount; i++) {
      const position = part.overallLength_mm * ((i + 1) / (restCount + 1));

      // Find diameter at this position
      const featureAtPosition = part.features.find(f =>
        f.zStart_mm <= position && f.zEnd_mm >= position && f.type === 'od_cylinder'
      );
      const diameter = featureAtPosition?.diameter_mm || part.maxDiameter_mm;

      // Find operations that need this support
      const operationsNeedingSupport = part.features
        .filter(f => f.zStart_mm >= position - 50 && f.zEnd_mm <= position + 50)
        .map(f => f.featureId);

      steadyRests.push({
        position_mm: position,
        supportDiameter_mm: diameter,
        loadDuringOperations: operationsNeedingSupport,
        reason: `Support for L/D=${ldRatio.toFixed(1)} at ${position.toFixed(0)}mm`
      });
    }

    return steadyRests;
  }

  private generateOperationSequence(
    part: ComplexPart,
    machine: CompleteMachiningConfig,
    workholding: WorkholdingPlan
  ): SetupOperation[] {
    const operations: SetupOperation[] = [];
    let sequence = 1;

    // Phase 1: Front-side turning operations
    const frontTurnFeatures = part.features.filter(f =>
      (f.type.startsWith('od_') || f.type === 'face' || f.type === 'shoulder') &&
      f.location !== 'back'
    );

    if (frontTurnFeatures.length > 0) {
      operations.push({
        operationId: `OP_${sequence++}_FRONT_ROUGH`,
        sequence: operations.length + 1,
        type: 'turn',
        spindle: 'main',
        bAxisPosition_deg: 0,
        features: frontTurnFeatures.filter(f => f.type.includes('od')).map(f => f.featureId),
        cuttingParams: this.calculateTurningParams(part, 'rough'),
        estimatedTime_seconds: this.estimateOperationTime(frontTurnFeatures, 'rough'),
        collisionRisks: []
      });

      operations.push({
        operationId: `OP_${sequence++}_FRONT_FINISH`,
        sequence: operations.length + 1,
        type: 'turn',
        spindle: 'main',
        bAxisPosition_deg: 0,
        features: frontTurnFeatures.map(f => f.featureId),
        cuttingParams: this.calculateTurningParams(part, 'finish'),
        estimatedTime_seconds: this.estimateOperationTime(frontTurnFeatures, 'finish'),
        collisionRisks: []
      });
    }

    // Phase 2: Front ID operations
    const frontIdFeatures = part.features.filter(f =>
      f.type.startsWith('id_') && f.location !== 'back'
    );

    if (frontIdFeatures.length > 0) {
      operations.push({
        operationId: `OP_${sequence++}_FRONT_BORE`,
        sequence: operations.length + 1,
        type: 'bore',
        spindle: 'main',
        bAxisPosition_deg: 0,
        features: frontIdFeatures.map(f => f.featureId),
        cuttingParams: this.calculateBoringParams(part),
        estimatedTime_seconds: this.estimateOperationTime(frontIdFeatures, 'bore'),
        collisionRisks: []
      });
    }

    // Phase 3: Milling operations (require B-axis)
    const millingFeatures = part.features.filter(f =>
      ['keyway', 'spline', 'hex', 'flat', 'pocket', 'hole_pattern', 'freeform', 'polygon'].includes(f.type)
    );

    for (const feature of millingFeatures) {
      const bAngle = this.determineBAxisAngle(feature, machine);
      operations.push({
        operationId: `OP_${sequence++}_MILL_${feature.featureId}`,
        sequence: operations.length + 1,
        type: 'mill',
        spindle: 'milling',
        bAxisPosition_deg: bAngle,
        features: [feature.featureId],
        cuttingParams: this.calculateMillingParams(part, feature),
        estimatedTime_seconds: this.estimateMillingTime(feature),
        collisionRisks: bAngle > 45 ? ['Check milling head clearance'] : []
      });
    }

    // Phase 4: Deep hole drilling
    const deepHoles = part.features.filter(f =>
      f.type === 'deep_hole' || (f.type.includes('hole') && (f.depth_mm || 0) > 50)
    );

    if (deepHoles.length > 0 && machine.deepDrillingCapability) {
      operations.push({
        operationId: `OP_${sequence++}_DEEP_DRILL`,
        sequence: operations.length + 1,
        type: 'deep_drill',
        spindle: 'milling',
        bAxisPosition_deg: 0,
        features: deepHoles.map(f => f.featureId),
        cuttingParams: this.calculateDeepDrillParams(part, deepHoles[0]),
        estimatedTime_seconds: this.estimateDeepDrillTime(deepHoles),
        collisionRisks: ['Monitor chip evacuation']
      });
    }

    // Phase 5: Gear cutting
    const gearFeatures = part.features.filter(f =>
      f.type === 'gear_external' || f.type === 'gear_internal' || f.type === 'spline'
    );

    if (gearFeatures.length > 0 && machine.gearCuttingCapability) {
      for (const gear of gearFeatures) {
        operations.push({
          operationId: `OP_${sequence++}_GEAR_${gear.featureId}`,
          sequence: operations.length + 1,
          type: 'gear_cut',
          spindle: 'milling',
          bAxisPosition_deg: machine.gearCuttingCapability.supportedMethods.includes('hobbing') ? 90 : 0,
          features: [gear.featureId],
          cuttingParams: this.calculateGearCutParams(gear, machine),
          estimatedTime_seconds: this.estimateGearCutTime(gear),
          collisionRisks: ['Synchronized spindle operation required']
        });
      }
    }

    // Phase 6: Threading
    const threadFeatures = part.features.filter(f =>
      f.type === 'thread_external' || f.type === 'thread_internal'
    );

    for (const thread of threadFeatures) {
      operations.push({
        operationId: `OP_${sequence++}_THREAD_${thread.featureId}`,
        sequence: operations.length + 1,
        type: 'thread',
        spindle: 'main',
        bAxisPosition_deg: 0,
        features: [thread.featureId],
        cuttingParams: this.calculateThreadingParams(thread),
        estimatedTime_seconds: this.estimateThreadingTime(thread),
        collisionRisks: []
      });
    }

    // Phase 7: Back-side operations (if counter spindle)
    if (workholding.rechuckRequired && machine.counterSpindle) {
      const backFeatures = part.features.filter(f => f.location === 'back');

      if (backFeatures.length > 0) {
        // Transfer operation
        operations.push({
          operationId: `OP_${sequence++}_TRANSFER`,
          sequence: operations.length + 1,
          type: 'turn', // technically a handoff
          spindle: 'counter',
          bAxisPosition_deg: 0,
          features: [],
          cuttingParams: { coolant: 'none' },
          estimatedTime_seconds: 5,
          collisionRisks: ['Synchronize spindles for handoff']
        });

        // Back-side machining
        operations.push({
          operationId: `OP_${sequence++}_BACK_MACHINE`,
          sequence: operations.length + 1,
          type: 'turn',
          spindle: 'counter',
          bAxisPosition_deg: 0,
          features: backFeatures.map(f => f.featureId),
          cuttingParams: this.calculateTurningParams(part, 'finish'),
          estimatedTime_seconds: this.estimateOperationTime(backFeatures, 'finish'),
          collisionRisks: []
        });
      }
    }

    // Phase 8: Grooves (after finish turning)
    const grooveFeatures = part.features.filter(f => f.type === 'groove');

    for (const groove of grooveFeatures) {
      operations.push({
        operationId: `OP_${sequence++}_GROOVE_${groove.featureId}`,
        sequence: operations.length + 1,
        type: 'turn',
        spindle: 'main',
        bAxisPosition_deg: 0,
        features: [groove.featureId],
        cuttingParams: this.calculateGroovingParams(part),
        estimatedTime_seconds: 15,
        collisionRisks: []
      });
    }

    return operations;
  }

  private determineBAxisAngle(feature: PartFeature, machine: CompleteMachiningConfig): number {
    // Determine optimal B-axis angle for feature access
    switch (feature.type) {
      case 'keyway':
        return 90; // Radial access
      case 'flat':
        return 90;
      case 'hex':
        return 90;
      case 'pocket':
        return feature.angle_deg || 90;
      case 'cross_hole':
        return 90;
      case 'angular_hole':
        return feature.angle_deg || 45;
      case 'spline':
        return machine.gearCuttingCapability?.supportedMethods.includes('hobbing') ? 90 : 0;
      default:
        return 0;
    }
  }

  private calculateTurningParams(part: ComplexPart, cutType: 'rough' | 'finish'): CuttingParameters {
    const materialKey = this.normalizeMaterial(part.material);
    const machinabilityFactor = this.machinability[materialKey] || 1.0;

    if (cutType === 'rough') {
      return {
        spindleRpm: Math.round(800 * machinabilityFactor),
        feedRate_mmPerRev: 0.3 * machinabilityFactor,
        depthOfCut_mm: 2.5,
        coolant: 'flood'
      };
    } else {
      return {
        spindleRpm: Math.round(1200 * machinabilityFactor),
        feedRate_mmPerRev: 0.15 * machinabilityFactor,
        depthOfCut_mm: 0.3,
        coolant: 'flood'
      };
    }
  }

  private calculateBoringParams(part: ComplexPart): CuttingParameters {
    const materialKey = this.normalizeMaterial(part.material);
    const machinabilityFactor = this.machinability[materialKey] || 1.0;

    return {
      spindleRpm: Math.round(600 * machinabilityFactor),
      feedRate_mmPerRev: 0.08 * machinabilityFactor,
      depthOfCut_mm: 0.5,
      coolant: 'through_tool'
    };
  }

  private calculateMillingParams(part: ComplexPart, feature: PartFeature): CuttingParameters {
    const materialKey = this.normalizeMaterial(part.material);
    const machinabilityFactor = this.machinability[materialKey] || 1.0;

    return {
      spindleRpm: Math.round(3000 * machinabilityFactor),
      feedRate_mmPerMin: Math.round(500 * machinabilityFactor),
      depthOfCut_mm: feature.depth_mm || 2,
      coolant: 'high_pressure',
      strategy: feature.type === 'pocket' ? 'trochoidal' : 'conventional'
    };
  }

  private calculateDeepDrillParams(part: ComplexPart, hole: PartFeature): CuttingParameters {
    const materialKey = this.normalizeMaterial(part.material);
    const machinabilityFactor = this.machinability[materialKey] || 1.0;

    return {
      spindleRpm: Math.round(800 * machinabilityFactor),
      feedRate_mmPerMin: Math.round(50 * machinabilityFactor),
      coolant: 'through_tool'
    };
  }

  private calculateGearCutParams(gear: PartFeature, machine: CompleteMachiningConfig): CuttingParameters {
    const method = machine.gearCuttingCapability?.supportedMethods[0] || 'hobbing';

    if (method === 'power_skiving') {
      return {
        spindleRpm: 500, // Workpiece
        feedRate_mmPerRev: 0.1,
        coolant: 'high_pressure',
        strategy: 'power_skiving'
      };
    } else {
      return {
        spindleRpm: 200, // Workpiece
        feedRate_mmPerRev: 2.0, // Axial feed
        coolant: 'flood',
        strategy: 'hobbing'
      };
    }
  }

  private calculateThreadingParams(thread: PartFeature): CuttingParameters {
    return {
      spindleRpm: 400,
      feedRate_mmPerRev: thread.pitch_mm || 1.0,
      depthOfCut_mm: 0.2,
      coolant: 'flood'
    };
  }

  private calculateGroovingParams(part: ComplexPart): CuttingParameters {
    const materialKey = this.normalizeMaterial(part.material);
    const machinabilityFactor = this.machinability[materialKey] || 1.0;

    return {
      spindleRpm: Math.round(500 * machinabilityFactor),
      feedRate_mmPerRev: 0.05 * machinabilityFactor,
      coolant: 'flood'
    };
  }

  private estimateOperationTime(features: PartFeature[], type: string): number {
    let baseTime = 0;
    for (const feature of features) {
      const length = Math.abs(feature.zEnd_mm - feature.zStart_mm);
      const diameter = feature.diameter_mm || 50;

      if (type === 'rough') {
        baseTime += (length * diameter * 0.002) + 5;
      } else if (type === 'finish') {
        baseTime += (length * diameter * 0.001) + 3;
      } else if (type === 'bore') {
        const depth = feature.depth_mm || length;
        baseTime += (depth * 0.5) + 10;
      }
    }
    return baseTime;
  }

  private estimateMillingTime(feature: PartFeature): number {
    const area = (feature.depth_mm || 5) * Math.abs(feature.zEnd_mm - feature.zStart_mm);
    return (area * 0.1) + 20;
  }

  private estimateDeepDrillTime(holes: PartFeature[]): number {
    let time = 0;
    for (const hole of holes) {
      const depth = hole.depth_mm || 100;
      const diameter = hole.diameter_mm || 10;
      // Deeper holes require more peck cycles and slower feed
      const ldRatio = depth / diameter;
      time += depth * 0.3 * (1 + ldRatio * 0.1);
    }
    return time;
  }

  private estimateGearCutTime(gear: PartFeature): number {
    const teeth = gear.teethCount || 20;
    const module = gear.module || 2;
    const faceWidth = Math.abs(gear.zEnd_mm - gear.zStart_mm);

    // More teeth and larger module = more time
    return teeth * module * faceWidth * 0.05 + 60;
  }

  private estimateThreadingTime(thread: PartFeature): number {
    const length = Math.abs(thread.zEnd_mm - thread.zStart_mm);
    const pitch = thread.pitch_mm || 1.0;
    const passes = Math.ceil(4 / pitch) + 2; // More passes for coarser pitch

    return length * passes * 0.3 + 10;
  }

  private generateToolList(
    operations: SetupOperation[],
    part: ComplexPart,
    machine: CompleteMachiningConfig
  ): ToolRequirement[] {
    const tools: ToolRequirement[] = [];
    let slot = 1;

    // Turning tools
    if (operations.some(op => op.type === 'turn')) {
      tools.push({
        toolId: `T${slot++}`,
        toolType: 'turning_rough',
        description: 'OD Roughing Insert CNMG 120408',
        forOperations: operations.filter(op => op.operationId.includes('ROUGH')).map(op => op.operationId)
      });

      tools.push({
        toolId: `T${slot++}`,
        toolType: 'turning_finish',
        description: 'OD Finishing Insert DNMG 150604',
        forOperations: operations.filter(op => op.operationId.includes('FINISH')).map(op => op.operationId)
      });
    }

    // Boring tools
    if (operations.some(op => op.type === 'bore')) {
      tools.push({
        toolId: `T${slot++}`,
        toolType: 'boring_bar',
        description: 'Boring Bar with CCMT Insert',
        forOperations: operations.filter(op => op.type === 'bore').map(op => op.operationId)
      });
    }

    // Milling tools
    const millingOps = operations.filter(op => op.type === 'mill');
    if (millingOps.length > 0) {
      tools.push({
        toolId: `T${slot++}`,
        toolType: 'endmill',
        description: '16mm Carbide Endmill',
        forOperations: millingOps.map(op => op.operationId)
      });

      // Add keyway cutter if needed
      if (part.features.some(f => f.type === 'keyway')) {
        tools.push({
          toolId: `T${slot++}`,
          toolType: 'keyway_cutter',
          description: 'Woodruff Keyway Cutter',
          forOperations: millingOps.filter(op => op.features.some(
            fId => part.features.find(f => f.featureId === fId)?.type === 'keyway'
          )).map(op => op.operationId)
        });
      }
    }

    // Deep drilling tools
    if (operations.some(op => op.type === 'deep_drill')) {
      const deepHoles = part.features.filter(f => f.type === 'deep_hole');
      for (const hole of deepHoles) {
        tools.push({
          toolId: `T${slot++}`,
          toolType: 'gun_drill',
          description: `Gun Drill ${hole.diameter_mm}mm`,
          forOperations: operations.filter(op => op.type === 'deep_drill').map(op => op.operationId),
          specialRequirements: ['High pressure coolant', 'Chip conveyor active']
        });
      }
    }

    // Gear cutting tools
    if (operations.some(op => op.type === 'gear_cut') && machine.gearCuttingCapability) {
      const gears = part.features.filter(f => f.type === 'gear_external' || f.type === 'gear_internal');
      for (const gear of gears) {
        const method = machine.gearCuttingCapability.supportedMethods[0];
        tools.push({
          toolId: `T${slot++}`,
          toolType: method === 'hobbing' ? 'hob' : 'skiving_cutter',
          description: `${method} Cutter M${gear.module || 2}`,
          forOperations: operations.filter(op => op.features.includes(gear.featureId)).map(op => op.operationId),
          specialRequirements: ['Synchronized spindle operation']
        });
      }
    }

    // Threading tools
    if (operations.some(op => op.type === 'thread')) {
      tools.push({
        toolId: `T${slot++}`,
        toolType: 'thread_insert',
        description: 'Threading Insert 60 deg',
        forOperations: operations.filter(op => op.type === 'thread').map(op => op.operationId)
      });
    }

    // Grooving tools
    if (part.features.some(f => f.type === 'groove')) {
      tools.push({
        toolId: `T${slot++}`,
        toolType: 'grooving_insert',
        description: 'Grooving Insert 3mm',
        forOperations: operations.filter(op => op.operationId.includes('GROOVE')).map(op => op.operationId)
      });
    }

    return tools;
  }

  private calculateCycleTime(operations: SetupOperation[], machine: CompleteMachiningConfig): number {
    let totalTime = 0;

    for (const op of operations) {
      totalTime += op.estimatedTime_seconds;
      totalTime += machine.toolMagazine.changeTime_seconds; // Tool change
    }

    // Add positioning time
    totalTime += operations.length * 2;

    return totalTime;
  }

  private identifyCriticalPath(operations: SetupOperation[]): string[] {
    // Sort by time descending to find bottlenecks
    const sorted = [...operations].sort((a, b) =>
      b.estimatedTime_seconds - a.estimatedTime_seconds
    );

    // Return top 3 longest operations
    return sorted.slice(0, 3).map(op => op.operationId);
  }

  private normalizeMaterial(material: string): string {
    const lower = material.toLowerCase();
    if (lower.includes('6061') || lower.includes('aluminum')) return 'aluminum_6061';
    if (lower.includes('7075')) return 'aluminum_7075';
    if (lower.includes('brass')) return 'brass';
    if (lower.includes('4140')) return 'steel_4140';
    if (lower.includes('4340')) return 'steel_4340';
    if (lower.includes('304')) return 'stainless_304';
    if (lower.includes('316')) return 'stainless_316';
    if (lower.includes('17-4')) return 'stainless_17-4';
    if (lower.includes('ti') || lower.includes('titanium')) return 'titanium_6al4v';
    if (lower.includes('inconel') || lower.includes('718')) return 'inconel_718';
    if (lower.includes('d2')) return 'tool_steel_d2';
    if (lower.includes('h13')) return 'tool_steel_h13';
    return 'steel_1018';
  }

  // ============================================================================
  // B-Axis Interpolation Planning
  // ============================================================================

  /**
   * Plan B-axis interpolation for complex features
   */
  planBAxisInterpolation(
    part: ComplexPart,
    machine: CompleteMachiningConfig
  ): EngineResult<BAxisInterpolation> {
    // Find features requiring B-axis
    const bAxisFeatures = part.features.filter(f =>
      ['keyway', 'flat', 'hex', 'pocket', 'cross_hole', 'angular_hole', 'freeform'].includes(f.type)
    );

    if (bAxisFeatures.length === 0) {
      return { success: true, data: {
        isRequired: false,
        interpolationType: 'none',
        positions: [],
        collisionAnalysis: [],
        recommendations: ['No B-axis features detected']
      } };
    }

    // Determine interpolation type
    const hasContour = bAxisFeatures.some(f => f.type === 'freeform');
    const interpolationType = hasContour && machine.bAxis.continuous ?
      'continuous' : 'indexed';

    // Calculate required positions
    const positions: BAxisPosition[] = [];
    for (const feature of bAxisFeatures) {
      const angle = this.determineBAxisAngle(feature, machine);

      positions.push({
        positionId: `B_${feature.featureId}`,
        angle_deg: angle,
        operation: feature.type,
        toolOrientation: angle === 90 ? 'radial' : angle === 0 ? 'axial' : 'angular',
        accessibleFeatures: [feature.featureId]
      });
    }

    // Analyze collisions at each position
    const collisionAnalysis: CollisionPoint[] = positions.map((pos, i) => ({
      pointId: `COL_${i + 1}`,
      bAngle_deg: pos.angle_deg,
      zPosition_mm: part.features.find(f => f.featureId === pos.accessibleFeatures[0])?.zStart_mm || 0,
      risk: pos.angle_deg > 60 ? 'caution' : 'safe',
      affectedComponents: pos.angle_deg > 60 ? ['milling_head', 'chuck'] : [],
      clearance_mm: pos.angle_deg > 60 ? 15 : 50
    }));

    // Generate recommendations
    const recommendations: string[] = [];
    if (positions.some(p => p.angle_deg > 60)) {
      recommendations.push('Verify milling head clearance at angles > 60 deg');
    }
    if (interpolationType === 'continuous') {
      recommendations.push('Use continuous B-axis for freeform surfaces');
    }
    if (positions.length > 5) {
      recommendations.push('Consider toolpath optimization to minimize B-axis movements');
    }

    return { success: true, data: {
      isRequired: true,
      interpolationType,
      positions,
      collisionAnalysis,
      recommendations
    } };
  }

  // ============================================================================
  // Deep Hole Drilling Planning
  // ============================================================================

  /**
   * Plan deep hole drilling operations
   */
  planDeepHoleDrilling(
    part: ComplexPart,
    machine: CompleteMachiningConfig
  ): EngineResult<DeepHolePlan> {
    if (!machine.deepDrillingCapability) {
      return { success: false, error: 'Machine does not have deep drilling capability' };
    }

    const deepHoles = part.features.filter(f =>
      f.type === 'deep_hole' || (f.depth_mm && f.diameter_mm && f.depth_mm / f.diameter_mm > 10)
    );

    if (deepHoles.length === 0) {
      return { success: true, data: {
        method: 'gun_drill',
        holes: [],
        chipManagement: { type: 'continuous', chipBreakingMethod: 'none', evacuationMethod: 'through_hole' },
        coolantRequirements: { pressure_bar: 70, flowRate_lpm: 20, type: 'oil', filtration_micron: 10 },
        totalDrillingTime_seconds: 0
      } };
    }

    // Determine best method based on hole geometry
    const avgLdRatio = deepHoles.reduce((sum, h) =>
      sum + (h.depth_mm || 100) / (h.diameter_mm || 10), 0
    ) / deepHoles.length;

    const method = avgLdRatio > 30 ? 'bta' :
                   avgLdRatio > 20 ? 'ejector' :
                   'gun_drill';

    // Plan each hole
    const holes: DeepHoleOperation[] = deepHoles.map(hole => {
      const diameter = hole.diameter_mm || 10;
      const depth = hole.depth_mm || 100;
      const ldRatio = depth / diameter;

      const materialKey = this.normalizeMaterial(part.material);
      const machinability = this.machinability[materialKey] || 1.0;

      // Calculate drilling parameters
      const spindleRpm = Math.round(800 * machinability * (10 / diameter));
      const feedRate = Math.round(80 * machinability * (diameter / 10));

      // Determine if peck cycle needed
      const peckCycle = ldRatio > 5;
      const peckDepth = peckCycle ? diameter * 3 : undefined;

      // Estimate time
      const baseTime = depth / (feedRate / 60);
      const peckFactor = peckCycle ? 1.5 : 1.0;
      const estimatedTime = baseTime * peckFactor + 30; // 30s setup

      return {
        holeId: hole.featureId,
        diameter_mm: diameter,
        depth_mm: depth,
        ldRatio,
        centerDrillRequired: ldRatio > 3,
        pilotDrillDiameter_mm: ldRatio > 5 ? diameter * 0.5 : undefined,
        peckCycle,
        peckDepth_mm: peckDepth,
        dwellTime_seconds: peckCycle ? 0.5 : undefined,
        spindleRpm,
        feedRate_mmPerMin: feedRate,
        estimatedTime_seconds: estimatedTime
      };
    });

    // Chip management strategy
    const chipManagement: ChipStrategy = {
      type: method === 'gun_drill' && avgLdRatio > 15 ? 'peck' : 'continuous',
      chipBreakingMethod: avgLdRatio > 20 ? 'feed_variation' : 'none',
      evacuationMethod: method === 'bta' ? 'through_hole' : 'coolant_flush'
    };

    // Coolant requirements
    const coolantRequirements: CoolantPlan = {
      pressure_bar: method === 'gun_drill' ? 70 : method === 'bta' ? 100 : 80,
      flowRate_lpm: method === 'bta' ? 50 : 25,
      type: part.material.toLowerCase().includes('aluminum') ? 'emulsion' : 'oil',
      filtration_micron: method === 'bta' ? 5 : 10
    };

    const totalDrillingTime = holes.reduce((sum, h) => sum + h.estimatedTime_seconds, 0);

    return { success: true, data: {
      method,
      holes,
      chipManagement,
      coolantRequirements,
      totalDrillingTime_seconds: totalDrillingTime
    } };
  }

  // ============================================================================
  // Gear Cutting Planning
  // ============================================================================

  /**
   * Plan gear cutting operations
   */
  planGearCutting(
    part: ComplexPart,
    machine: CompleteMachiningConfig
  ): EngineResult<GearCuttingPlan> {
    if (!machine.gearCuttingCapability) {
      return { success: false, error: 'Machine does not have gear cutting capability' };
    }

    const gearFeatures = part.features.filter(f =>
      f.type === 'gear_external' || f.type === 'gear_internal' || f.type === 'spline'
    );

    if (gearFeatures.length === 0) {
      return { success: false, error: 'No gear features found in part' };
    }

    // Determine best method
    const hasInternal = gearFeatures.some(f => f.type === 'gear_internal');
    const methods = machine.gearCuttingCapability.supportedMethods;

    let method: 'hobbing' | 'power_skiving' | 'shaping';
    if (hasInternal && methods.includes('power_skiving')) {
      method = 'power_skiving';
    } else if (hasInternal && methods.includes('shaping')) {
      method = 'shaping';
    } else if (methods.includes('hobbing')) {
      method = 'hobbing';
    } else {
      method = methods[0] as 'hobbing' | 'power_skiving' | 'shaping';
    }

    // Plan each gear
    const gears: GearOperation[] = gearFeatures.map(gear => {
      const module = gear.module || 2;
      const teeth = gear.teethCount || 20;
      const faceWidth = Math.abs(gear.zEnd_mm - gear.zStart_mm);
      const isInternal = gear.type === 'gear_internal';

      // Estimate passes based on module and method
      const roughingCuts = Math.ceil(module / 0.5);
      const finishingCuts = 2;
      const totalPasses = roughingCuts + finishingCuts;

      // Estimate time
      const timePerPass = teeth * module * 0.1;
      const estimatedTime = totalPasses * timePerPass + 30;

      return {
        gearId: gear.featureId,
        type: isInternal ? 'internal' : 'external',
        module,
        teethCount: teeth,
        faceWidth_mm: faceWidth,
        helixAngle_deg: 0, // spur gear default
        pressureAngle_deg: 20,
        passes: totalPasses,
        roughingCuts,
        finishingCuts,
        estimatedTime_seconds: estimatedTime
      };
    });

    // Generate tooling requirements
    const tooling: GearTooling[] = [];
    const uniqueModules = [...new Set(gears.map(g => g.module))];

    for (const mod of uniqueModules) {
      tooling.push({
        toolId: `GEAR_TOOL_M${mod}`,
        toolType: method === 'hobbing' ? 'hob' : method === 'power_skiving' ? 'skiving_cutter' : 'shaping_cutter',
        module: mod,
        numberOfStarts: method === 'hobbing' ? 1 : undefined,
        diameter_mm: method === 'hobbing' ? mod * 15 : mod * 10,
        coatingRequired: part.hardness_HRC ? part.hardness_HRC > 30 : false
      });
    }

    // Synchronization parameters
    const avgTeeth = gears.reduce((sum, g) => sum + g.teethCount, 0) / gears.length;
    const syncParams: GearSyncParams = {
      workpieceRpm: method === 'hobbing' ? 100 : 300,
      toolRpm: method === 'hobbing' ? 500 : 3000,
      syncRatio: method === 'hobbing' ? 1 / avgTeeth : 1,
      axialFeed_mmPerRev: method === 'hobbing' ? 2 : 0.1,
      shiftStrategy: 'tangential'
    };

    const totalCuttingTime = gears.reduce((sum, g) => sum + g.estimatedTime_seconds, 0);

    return { success: true, data: {
      method,
      gears,
      tooling,
      synchronization: syncParams,
      qualityGrade: 'DIN 7',
      totalCuttingTime_seconds: totalCuttingTime
    } };
  }

  // ============================================================================
  // Dispatcher Actions
  // ============================================================================

  async executeAction(
    action: string,
    params: Record<string, unknown>
  ): Promise<EngineResult<unknown>> {
    switch (action) {
      case 'complete_plan_single_setup':
        return this.planSingleSetup(
          params.part as ComplexPart,
          params.machine as CompleteMachiningConfig
        );

      case 'complete_plan_baxis':
        return this.planBAxisInterpolation(
          params.part as ComplexPart,
          params.machine as CompleteMachiningConfig
        );

      case 'complete_plan_deep_hole':
        return this.planDeepHoleDrilling(
          params.part as ComplexPart,
          params.machine as CompleteMachiningConfig
        );

      case 'complete_plan_gear_cutting':
        return this.planGearCutting(
          params.part as ComplexPart,
          params.machine as CompleteMachiningConfig
        );

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }
}

export const completeMachiningEngine = new CompleteMachiningEngine();
