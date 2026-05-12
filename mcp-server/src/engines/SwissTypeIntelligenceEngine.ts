/**
 * SwissTypeIntelligenceEngine.ts
 * Deep Swiss-type machine intelligence for sliding headstock lathes
 *
 * Covers: Guide bushing mechanics, gang tooling optimization, main/sub-spindle
 * synchronization, sliding headstock kinematics, bar feeding, backworking operations
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

export interface SwissMachineConfig {
  machineId: string;
  manufacturer: 'citizen' | 'star' | 'tornos' | 'tsugami' | 'hanwha' | 'marubeni';
  model: string;
  maxBarDiameter_mm: number;
  guideBushingType: 'fixed' | 'rotating' | 'bushingless';
  gangToolPositions: number;
  backToolPositions: number;
  hasSubSpindle: boolean;
  subSpindleTravel_mm?: number;
  hasYAxis: boolean;
  yAxisTravel_mm?: number;
  hasBAxis: boolean;
  bAxisRange_deg?: number;
  maxMainSpindleRpm: number;
  maxSubSpindleRpm: number;
  coolantType: 'oil' | 'water_soluble' | 'both';
}

export interface SwissPartDefinition {
  partId: string;
  barDiameter_mm: number;
  finishedLength_mm: number;
  maxOD_mm: number;
  minID_mm?: number;
  features: SwissPartFeature[];
  material: string;
  tolerance_class: 'standard' | 'precision' | 'ultra_precision';
  surfaceFinish_Ra?: number;
  annualVolume: number;
}

export interface SwissPartFeature {
  featureId: string;
  type: 'od_turn' | 'groove' | 'thread' | 'cross_hole' | 'flat' | 'polygon' |
        'id_drill' | 'id_bore' | 'id_thread' | 'knurl' | 'chamfer' | 'radius' |
        'backwork_face' | 'backwork_bore' | 'backwork_thread' | 'eccentric';
  location: 'front' | 'back' | 'both';
  zStart_mm: number;
  zEnd_mm: number;
  diameter_mm?: number;
  depth_mm?: number;
  angle_deg?: number;
  threadPitch_mm?: number;
}

export interface GuideBushingAnalysis {
  recommendation: 'use_bushing' | 'bushingless' | 'either';
  reason: string;
  deflectionRisk: 'low' | 'medium' | 'high';
  supportDistance_mm: number;
  ldRatio: number;
  bushingWear: 'minimal' | 'moderate' | 'significant';
}

export interface GangToolLayout {
  positions: GangToolPosition[];
  totalTools: number;
  toolChangeStrategy: 'index' | 'slide' | 'combined';
  estimatedCycleImpact_seconds: number;
}

export interface GangToolPosition {
  position: number;
  toolType: string;
  toolId: string;
  operation: string;
  zOffset_mm: number;
  xOffset_mm: number;
  isLive: boolean;
  rpmIfLive?: number;
}

export interface SpindleSyncPlan {
  syncPoints: SyncPoint[];
  handoffMethod: 'clamp_transfer' | 'push_transfer' | 'simultaneous_clamp';
  overlapOperations: OverlapOperation[];
  cycleTimeReduction_percent: number;
  collisionZones: CollisionZone[];
}

export interface SyncPoint {
  pointId: string;
  mainSpindleAction: string;
  subSpindleAction: string;
  syncCode: string;
  waitRequired: boolean;
  description: string;
}

export interface OverlapOperation {
  mainOperation: string;
  subOperation: string;
  overlapType: 'parallel' | 'staggered' | 'sequential';
  timeSaved_seconds: number;
}

export interface CollisionZone {
  zoneId: string;
  zStart_mm: number;
  zEnd_mm: number;
  affectedTools: string[];
  clearanceRequired_mm: number;
}

export interface BarFeedStrategy {
  feedMethod: 'push' | 'pull' | 'collet_advance';
  remnantLength_mm: number;
  barChangeFrequency: number;
  partsPerBar: number;
  materialUtilization_percent: number;
  automaticBarChange: boolean;
}

export interface BackworkingPlan {
  operations: BackworkOperation[];
  subSpindleApproach: 'axial' | 'radial' | 'combined';
  partoffToHandoffTime_seconds: number;
  backworkCycleTime_seconds: number;
  qualityCritical: boolean;
}

export interface BackworkOperation {
  operationId: string;
  type: 'face' | 'chamfer' | 'bore' | 'thread' | 'drill' | 'tap' | 'groove';
  toolPosition: number;
  cutDepth_mm: number;
  feedRate_mmPerRev: number;
  spindleRpm: number;
  coolantRequired: boolean;
}

export interface SwissProcessPlan {
  machineConfig: SwissMachineConfig;
  guideBushing: GuideBushingAnalysis;
  gangLayout: GangToolLayout;
  spindleSync: SpindleSyncPlan;
  barFeed: BarFeedStrategy;
  backworking: BackworkingPlan;
  estimatedCycleTime_seconds: number;
  productionRate_partsPerHour: number;
  setupTime_minutes: number;
  reasoningChain: ReasoningStep[];
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

export class SwissTypeIntelligenceEngine {
  readonly name = 'SwissTypeIntelligenceEngine';
  readonly version = '1.0.0';
  readonly description = 'Deep Swiss-type machine intelligence for sliding headstock lathes';

  // Material-specific guide bushing coefficients
  private readonly bushingCoefficients: Record<string, number> = {
    'aluminum': 0.85,
    'brass': 0.90,
    'steel_1018': 1.00,
    'steel_4140': 1.10,
    'stainless_303': 1.05,
    'stainless_316': 1.15,
    'titanium': 1.25,
    'inconel': 1.35,
    'plastic_delrin': 0.70,
    'plastic_peek': 0.75
  };

  // ============================================================================
  // Guide Bushing Analysis
  // ============================================================================

  /**
   * Analyze whether to use guide bushing or bushingless mode
   */
  analyzeGuideBushing(
    part: SwissPartDefinition,
    machine: SwissMachineConfig
  ): EngineResult<GuideBushingAnalysis> {
    const ldRatio = part.finishedLength_mm / part.barDiameter_mm;
    const supportDistance = this.calculateSupportDistance(part, machine);

    // Get material coefficient
    const materialKey = this.normalizeMaterial(part.material);
    const materialCoef = this.bushingCoefficients[materialKey] || 1.0;

    // Deflection risk based on L/D ratio and material
    const effectiveLdRatio = ldRatio * materialCoef;
    let deflectionRisk: 'low' | 'medium' | 'high';
    let recommendation: 'use_bushing' | 'bushingless' | 'either';
    let reason: string;

    if (effectiveLdRatio > 8) {
      deflectionRisk = 'high';
      recommendation = 'use_bushing';
      reason = `High L/D ratio (${ldRatio.toFixed(1)}) with ${part.material} requires guide bushing support`;
    } else if (effectiveLdRatio > 4) {
      deflectionRisk = 'medium';
      if (part.tolerance_class === 'ultra_precision') {
        recommendation = 'use_bushing';
        reason = `Medium L/D with ultra-precision tolerance requires guide bushing`;
      } else {
        recommendation = 'either';
        reason = `Medium L/D ratio allows either mode; bushing preferred for tighter tolerances`;
      }
    } else {
      deflectionRisk = 'low';
      if (part.tolerance_class === 'standard') {
        recommendation = 'bushingless';
        reason = `Low L/D ratio (${ldRatio.toFixed(1)}) with standard tolerance - bushingless mode saves setup`;
      } else {
        recommendation = 'either';
        reason = `Low L/D allows bushingless but bushing provides extra rigidity`;
      }
    }

    // Bushing wear assessment
    const bushingWear = this.assessBushingWear(part, machine);

    return { success: true, data: {
      recommendation,
      reason,
      deflectionRisk,
      supportDistance_mm: supportDistance,
      ldRatio,
      bushingWear
    } };
  }

  private calculateSupportDistance(
    part: SwissPartDefinition,
    machine: SwissMachineConfig
  ): number {
    // Support distance from guide bushing to cutting zone
    const baseSupport = 2.0; // mm from bushing face
    const toolClearance = 5.0; // mm for tool approach

    // Find the furthest feature from the bushing
    let maxZ = 0;
    for (const feature of part.features) {
      if (feature.location === 'front' || feature.location === 'both') {
        maxZ = Math.max(maxZ, feature.zEnd_mm);
      }
    }

    return baseSupport + maxZ + toolClearance;
  }

  private assessBushingWear(
    part: SwissPartDefinition,
    machine: SwissMachineConfig
  ): 'minimal' | 'moderate' | 'significant' {
    const materialKey = this.normalizeMaterial(part.material);
    const coef = this.bushingCoefficients[materialKey] || 1.0;

    // High volume + abrasive material = significant wear
    if (part.annualVolume > 100000 && coef > 1.1) {
      return 'significant';
    } else if (part.annualVolume > 50000 || coef > 1.2) {
      return 'moderate';
    }
    return 'minimal';
  }

  private normalizeMaterial(material: string): string {
    const lower = material.toLowerCase();
    if (lower.includes('aluminum') || lower.includes('6061') || lower.includes('7075')) {
      return 'aluminum';
    }
    if (lower.includes('brass') || lower.includes('bronze')) {
      return 'brass';
    }
    if (lower.includes('1018') || lower.includes('1020') || lower.includes('12l14')) {
      return 'steel_1018';
    }
    if (lower.includes('4140') || lower.includes('4340') || lower.includes('8620')) {
      return 'steel_4140';
    }
    if (lower.includes('303') || lower.includes('304')) {
      return 'stainless_303';
    }
    if (lower.includes('316') || lower.includes('17-4')) {
      return 'stainless_316';
    }
    if (lower.includes('titanium') || lower.includes('ti-6al')) {
      return 'titanium';
    }
    if (lower.includes('inconel') || lower.includes('718')) {
      return 'inconel';
    }
    if (lower.includes('delrin') || lower.includes('acetal')) {
      return 'plastic_delrin';
    }
    if (lower.includes('peek') || lower.includes('ultem')) {
      return 'plastic_peek';
    }
    return 'steel_1018'; // default
  }

  // ============================================================================
  // Gang Tool Layout Optimization
  // ============================================================================

  /**
   * Optimize gang tool layout for minimum cycle time
   */
  optimizeGangToolLayout(
    part: SwissPartDefinition,
    machine: SwissMachineConfig,
    availableTools: string[]
  ): EngineResult<GangToolLayout> {
    const frontFeatures = part.features.filter(
      f => f.location === 'front' || f.location === 'both'
    );

    // Group features by operation type for tool selection
    const operationGroups = this.groupFeaturesByOperation(frontFeatures);

    const positions: GangToolPosition[] = [];
    let positionIndex = 1;

    // Assign tools to positions based on operation sequence
    for (const [opType, features] of Object.entries(operationGroups)) {
      const tool = this.selectToolForOperation(opType, features, availableTools);
      if (tool && positionIndex <= machine.gangToolPositions) {
        const isLive = this.isLiveToolOperation(opType);
        positions.push({
          position: positionIndex,
          toolType: tool.type,
          toolId: tool.id,
          operation: opType,
          zOffset_mm: this.calculateZOffset(features),
          xOffset_mm: this.calculateXOffset(features, part.barDiameter_mm),
          isLive,
          rpmIfLive: isLive ? this.calculateLiveToolRpm(opType, part.material) : undefined
        });
        positionIndex++;
      }
    }

    // Determine tool change strategy
    const toolChangeStrategy = this.determineToolChangeStrategy(positions, machine);
    const cycleImpact = this.estimateToolChangeCycleImpact(positions, toolChangeStrategy);

    return { success: true, data: {
      positions,
      totalTools: positions.length,
      toolChangeStrategy,
      estimatedCycleImpact_seconds: cycleImpact
    } };
  }

  private groupFeaturesByOperation(
    features: SwissPartFeature[]
  ): Record<string, SwissPartFeature[]> {
    const groups: Record<string, SwissPartFeature[]> = {};
    for (const feature of features) {
      const opType = feature.type;
      if (!groups[opType]) {
        groups[opType] = [];
      }
      groups[opType].push(feature);
    }
    return groups;
  }

  private selectToolForOperation(
    opType: string,
    features: SwissPartFeature[],
    availableTools: string[]
  ): { type: string; id: string } | null {
    // Tool selection based on operation type
    const toolMap: Record<string, string[]> = {
      'od_turn': ['DNMG', 'CNMG', 'VNMG', 'TNMG'],
      'groove': ['GIP', 'GRIP', 'MGMN'],
      'thread': ['16ER', '16IR', 'THREAD'],
      'cross_hole': ['DRILL', 'CARBIDE_DRILL'],
      'flat': ['ENDMILL', 'FACEMILL'],
      'polygon': ['POLYGON_INSERT'],
      'id_drill': ['DRILL', 'CARBIDE_DRILL'],
      'id_bore': ['BORING_BAR', 'S06', 'S08'],
      'id_thread': ['16IR', 'INTERNAL_THREAD'],
      'knurl': ['KNURL'],
      'chamfer': ['CHAMFER', 'SPOT_DRILL'],
      'radius': ['RADIUS_TOOL', 'FORM_TOOL']
    };

    const candidates = toolMap[opType] || ['GENERAL_PURPOSE'];
    for (const candidate of candidates) {
      const match = availableTools.find(t =>
        t.toUpperCase().includes(candidate)
      );
      if (match) {
        return { type: candidate, id: match };
      }
    }

    // Default tool if no match
    return { type: candidates[0], id: `${candidates[0]}_001` };
  }

  private isLiveToolOperation(opType: string): boolean {
    return ['cross_hole', 'flat', 'polygon', 'eccentric'].includes(opType);
  }

  private calculateZOffset(features: SwissPartFeature[]): number {
    // Average Z position for the feature group
    const zPositions = features.map(f => (f.zStart_mm + f.zEnd_mm) / 2);
    return zPositions.reduce((a, b) => a + b, 0) / zPositions.length;
  }

  private calculateXOffset(features: SwissPartFeature[], barDiameter: number): number {
    // X offset based on feature diameter
    const diameters = features.filter(f => f.diameter_mm).map(f => f.diameter_mm!);
    if (diameters.length === 0) return barDiameter / 2;
    const avgDiameter = diameters.reduce((a, b) => a + b, 0) / diameters.length;
    return avgDiameter / 2;
  }

  private calculateLiveToolRpm(opType: string, material: string): number {
    // Base RPM for live tooling
    const baseRpm: Record<string, number> = {
      'cross_hole': 3000,
      'flat': 4000,
      'polygon': 2000,
      'eccentric': 2500
    };

    const materialFactor = this.bushingCoefficients[this.normalizeMaterial(material)] || 1.0;
    return Math.round((baseRpm[opType] || 3000) / materialFactor);
  }

  private determineToolChangeStrategy(
    positions: GangToolPosition[],
    machine: SwissMachineConfig
  ): 'index' | 'slide' | 'combined' {
    // If all tools are in sequence, slide is most efficient
    const zOffsets = positions.map(p => p.zOffset_mm).sort((a, b) => a - b);
    const isSequential = zOffsets.every((z, i) =>
      i === 0 || z >= zOffsets[i - 1]
    );

    if (isSequential && positions.length <= 4) {
      return 'slide';
    } else if (positions.some(p => p.isLive)) {
      return 'combined';
    }
    return 'index';
  }

  private estimateToolChangeCycleImpact(
    positions: GangToolPosition[],
    strategy: 'index' | 'slide' | 'combined'
  ): number {
    const timesPerTool: Record<string, number> = {
      'index': 0.3,
      'slide': 0.1,
      'combined': 0.5
    };
    return positions.length * (timesPerTool[strategy] || 0.3);
  }

  // ============================================================================
  // Main/Sub Spindle Synchronization
  // ============================================================================

  /**
   * Plan main and sub-spindle synchronization for optimal cycle time
   */
  planSpindleSync(
    part: SwissPartDefinition,
    machine: SwissMachineConfig
  ): EngineResult<SpindleSyncPlan> {
    if (!machine.hasSubSpindle) {
      return { success: false, error: 'Machine does not have sub-spindle' };
    }

    const frontFeatures = part.features.filter(
      f => f.location === 'front' || f.location === 'both'
    );
    const backFeatures = part.features.filter(
      f => f.location === 'back' || f.location === 'both'
    );

    // Generate sync points
    const syncPoints = this.generateSyncPoints(frontFeatures, backFeatures, part);

    // Determine handoff method
    const handoffMethod = this.determineHandoffMethod(part, machine);

    // Find overlap opportunities
    const overlapOperations = this.findOverlapOperations(frontFeatures, backFeatures);

    // Calculate cycle time reduction
    const cycleTimeReduction = this.calculateCycleTimeReduction(overlapOperations);

    // Identify collision zones
    const collisionZones = this.identifyCollisionZones(machine, part);

    return { success: true, data: {
      syncPoints,
      handoffMethod,
      overlapOperations,
      cycleTimeReduction_percent: cycleTimeReduction,
      collisionZones
    } };
  }

  private generateSyncPoints(
    frontFeatures: SwissPartFeature[],
    backFeatures: SwissPartFeature[],
    part: SwissPartDefinition
  ): SyncPoint[] {
    const syncPoints: SyncPoint[] = [];
    let pointIndex = 1;

    // Sync point 1: Sub-spindle approach for pickup
    syncPoints.push({
      pointId: `SYNC_${pointIndex++}`,
      mainSpindleAction: 'complete_front_ops',
      subSpindleAction: 'approach_pickup_position',
      syncCode: 'M200',
      waitRequired: true,
      description: 'Sub-spindle approaches for part pickup'
    });

    // Sync point 2: Part handoff
    syncPoints.push({
      pointId: `SYNC_${pointIndex++}`,
      mainSpindleAction: 'release_part',
      subSpindleAction: 'clamp_part',
      syncCode: 'M201',
      waitRequired: true,
      description: 'Part transfer from main to sub-spindle'
    });

    // Sync point 3: Cutoff
    syncPoints.push({
      pointId: `SYNC_${pointIndex++}`,
      mainSpindleAction: 'cutoff_operation',
      subSpindleAction: 'hold_part',
      syncCode: 'M202',
      waitRequired: true,
      description: 'Cutoff while sub-spindle holds part'
    });

    // If backworking operations exist
    if (backFeatures.length > 0) {
      syncPoints.push({
        pointId: `SYNC_${pointIndex++}`,
        mainSpindleAction: 'start_next_part',
        subSpindleAction: 'begin_backwork',
        syncCode: 'M203',
        waitRequired: false,
        description: 'Parallel operation: main starts next part while sub does backwork'
      });
    }

    return syncPoints;
  }

  private determineHandoffMethod(
    part: SwissPartDefinition,
    machine: SwissMachineConfig
  ): 'clamp_transfer' | 'push_transfer' | 'simultaneous_clamp' {
    // For very small parts, simultaneous clamp is safest
    if (part.barDiameter_mm < 3) {
      return 'simultaneous_clamp';
    }

    // For precision parts, clamp transfer with overlap
    if (part.tolerance_class === 'ultra_precision') {
      return 'simultaneous_clamp';
    }

    // Standard parts can use push transfer for speed
    if (part.finishedLength_mm < 20 && part.tolerance_class === 'standard') {
      return 'push_transfer';
    }

    return 'clamp_transfer';
  }

  private findOverlapOperations(
    frontFeatures: SwissPartFeature[],
    backFeatures: SwissPartFeature[]
  ): OverlapOperation[] {
    const overlaps: OverlapOperation[] = [];

    // Find operations that can run in parallel
    const frontOps = frontFeatures.map(f => f.type);
    const backOps = backFeatures.map(f => f.type);

    // OD turning on front can overlap with facing on back
    if (frontOps.includes('od_turn') && backOps.includes('backwork_face')) {
      overlaps.push({
        mainOperation: 'od_turn',
        subOperation: 'backwork_face',
        overlapType: 'parallel',
        timeSaved_seconds: 2.5
      });
    }

    // Drilling on front can overlap with chamfering on back
    if (frontOps.includes('id_drill') && backOps.includes('backwork_bore')) {
      overlaps.push({
        mainOperation: 'id_drill',
        subOperation: 'backwork_bore',
        overlapType: 'staggered',
        timeSaved_seconds: 1.8
      });
    }

    // Threading operations typically cannot overlap due to sync requirements
    if (frontOps.includes('thread') && backOps.includes('backwork_thread')) {
      overlaps.push({
        mainOperation: 'thread',
        subOperation: 'backwork_thread',
        overlapType: 'sequential',
        timeSaved_seconds: 0
      });
    }

    return overlaps;
  }

  private calculateCycleTimeReduction(overlaps: OverlapOperation[]): number {
    const totalTimeSaved = overlaps.reduce((sum, op) => sum + op.timeSaved_seconds, 0);
    // Estimate base cycle time of 30 seconds
    const baseCycleTime = 30;
    return (totalTimeSaved / baseCycleTime) * 100;
  }

  private identifyCollisionZones(
    machine: SwissMachineConfig,
    part: SwissPartDefinition
  ): CollisionZone[] {
    const zones: CollisionZone[] = [];

    // Zone 1: Cutoff area
    zones.push({
      zoneId: 'CUTOFF_ZONE',
      zStart_mm: part.finishedLength_mm - 2,
      zEnd_mm: part.finishedLength_mm + 5,
      affectedTools: ['cutoff', 'sub_spindle'],
      clearanceRequired_mm: 3
    });

    // Zone 2: Handoff area
    zones.push({
      zoneId: 'HANDOFF_ZONE',
      zStart_mm: part.finishedLength_mm,
      zEnd_mm: part.finishedLength_mm + (machine.subSpindleTravel_mm || 50),
      affectedTools: ['main_collet', 'sub_collet'],
      clearanceRequired_mm: 1
    });

    // Zone 3: Gang tool area (if cross operations)
    const hasCrossOps = part.features.some(f =>
      f.type === 'cross_hole' || f.type === 'flat' || f.type === 'polygon'
    );
    if (hasCrossOps) {
      zones.push({
        zoneId: 'CROSS_TOOL_ZONE',
        zStart_mm: 0,
        zEnd_mm: part.finishedLength_mm,
        affectedTools: ['gang_live_tools', 'back_tools'],
        clearanceRequired_mm: 5
      });
    }

    return zones;
  }

  // ============================================================================
  // Bar Feeding Intelligence
  // ============================================================================

  /**
   * Plan bar feeding strategy for optimal material utilization
   */
  planBarFeeding(
    part: SwissPartDefinition,
    machine: SwissMachineConfig,
    barLength_mm: number = 3000
  ): EngineResult<BarFeedStrategy> {
    // Calculate part length including cutoff
    const cutoffWidth = 2.5; // typical carbide cutoff width
    const stockPerPart = part.finishedLength_mm + cutoffWidth;

    // Account for remnant (unusable bar end)
    const colletDepth = 15; // mm gripped by collet
    const usableBarLength = barLength_mm - colletDepth;

    // Calculate parts per bar
    const partsPerBar = Math.floor(usableBarLength / stockPerPart);
    const remnantLength = usableBarLength - (partsPerBar * stockPerPart);

    // Material utilization
    const utilizedLength = partsPerBar * part.finishedLength_mm;
    const materialUtilization = (utilizedLength / barLength_mm) * 100;

    // Determine feed method based on machine and part
    const feedMethod = this.determineFeedMethod(part, machine);

    // Calculate bar changes per shift (assuming 8-hour shift, cycle time estimate)
    const estimatedCycleTime = this.estimateCycleTime(part);
    const partsPerShift = (8 * 3600) / estimatedCycleTime;
    const barChangeFrequency = Math.ceil(partsPerShift / partsPerBar);

    return { success: true, data: {
      feedMethod,
      remnantLength_mm: remnantLength,
      barChangeFrequency,
      partsPerBar,
      materialUtilization_percent: materialUtilization,
      automaticBarChange: barChangeFrequency > 3
    } };
  }

  private determineFeedMethod(
    part: SwissPartDefinition,
    machine: SwissMachineConfig
  ): 'push' | 'pull' | 'collet_advance' {
    // For very small diameter parts, collet advance is most reliable
    if (part.barDiameter_mm < 5) {
      return 'collet_advance';
    }

    // For long parts relative to diameter, pull is better
    if (part.finishedLength_mm / part.barDiameter_mm > 10) {
      return 'pull';
    }

    // Default to push for most applications
    return 'push';
  }

  private estimateCycleTime(part: SwissPartDefinition): number {
    // Rough cycle time estimate based on features
    let cycleTime = 5; // base handling time

    for (const feature of part.features) {
      switch (feature.type) {
        case 'od_turn':
          cycleTime += 3;
          break;
        case 'groove':
        case 'chamfer':
        case 'radius':
          cycleTime += 1;
          break;
        case 'thread':
        case 'id_thread':
        case 'backwork_thread':
          cycleTime += 4;
          break;
        case 'cross_hole':
        case 'flat':
          cycleTime += 2;
          break;
        case 'id_drill':
        case 'id_bore':
        case 'backwork_bore':
          cycleTime += 2.5;
          break;
        case 'polygon':
        case 'eccentric':
          cycleTime += 5;
          break;
        default:
          cycleTime += 1.5;
      }
    }

    return cycleTime;
  }

  // ============================================================================
  // Backworking Planning
  // ============================================================================

  /**
   * Plan backworking operations on sub-spindle
   */
  planBackworking(
    part: SwissPartDefinition,
    machine: SwissMachineConfig
  ): EngineResult<BackworkingPlan> {
    if (!machine.hasSubSpindle) {
      return { success: false, error: 'Machine does not have sub-spindle for backworking' };
    }

    const backFeatures = part.features.filter(
      f => f.location === 'back' || f.location === 'both'
    );

    if (backFeatures.length === 0) {
      return { success: true, data: {
        operations: [],
        subSpindleApproach: 'axial',
        partoffToHandoffTime_seconds: 2,
        backworkCycleTime_seconds: 0,
        qualityCritical: false
      } };
    }

    // Generate backwork operations
    const operations = this.generateBackworkOperations(backFeatures, part, machine);

    // Determine approach direction
    const subSpindleApproach = this.determineSubSpindleApproach(backFeatures, machine);

    // Calculate timing
    const handoffTime = 2.5;
    const backworkCycleTime = operations.reduce((sum, op) => {
      return sum + this.estimateOperationTime(op);
    }, 0);

    // Quality criticality
    const qualityCritical = backFeatures.some(f =>
      f.type === 'backwork_thread' ||
      (part.tolerance_class !== 'standard' && f.type === 'backwork_bore')
    );

    return { success: true, data: {
      operations,
      subSpindleApproach,
      partoffToHandoffTime_seconds: handoffTime,
      backworkCycleTime_seconds: backworkCycleTime,
      qualityCritical
    } };
  }

  private generateBackworkOperations(
    backFeatures: SwissPartFeature[],
    part: SwissPartDefinition,
    machine: SwissMachineConfig
  ): BackworkOperation[] {
    const operations: BackworkOperation[] = [];
    let opIndex = 1;

    // Sort features by typical operation order: face, drill, bore, thread, chamfer
    const sortOrder = ['backwork_face', 'id_drill', 'backwork_bore', 'backwork_thread', 'chamfer', 'groove'];
    const sortedFeatures = [...backFeatures].sort((a, b) => {
      const aIndex = sortOrder.indexOf(a.type);
      const bIndex = sortOrder.indexOf(b.type);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    for (const feature of sortedFeatures) {
      const operation = this.createBackworkOperation(feature, part, machine, opIndex++);
      operations.push(operation);
    }

    return operations;
  }

  private createBackworkOperation(
    feature: SwissPartFeature,
    part: SwissPartDefinition,
    machine: SwissMachineConfig,
    position: number
  ): BackworkOperation {
    const materialKey = this.normalizeMaterial(part.material);
    const materialFactor = this.bushingCoefficients[materialKey] || 1.0;

    // Base parameters
    let type: BackworkOperation['type'] = 'face';
    let cutDepth = feature.depth_mm || 0.5;
    let feedRate = 0.1;
    let spindleRpm = 2000;

    switch (feature.type) {
      case 'backwork_face':
        type = 'face';
        cutDepth = 0.3;
        feedRate = 0.08 / materialFactor;
        spindleRpm = Math.round(3000 / materialFactor);
        break;
      case 'backwork_bore':
        type = 'bore';
        cutDepth = feature.depth_mm || 5;
        feedRate = 0.05 / materialFactor;
        spindleRpm = Math.round(2500 / materialFactor);
        break;
      case 'backwork_thread':
        type = 'thread';
        cutDepth = feature.depth_mm || 10;
        feedRate = feature.threadPitch_mm || 1.0;
        spindleRpm = Math.round(800 / materialFactor);
        break;
      case 'id_drill':
        type = 'drill';
        cutDepth = feature.depth_mm || 10;
        feedRate = 0.08 / materialFactor;
        spindleRpm = Math.round(2000 / materialFactor);
        break;
      case 'chamfer':
        type = 'chamfer';
        cutDepth = feature.depth_mm || 0.5;
        feedRate = 0.1;
        spindleRpm = Math.round(2500 / materialFactor);
        break;
      case 'groove':
        type = 'groove';
        cutDepth = feature.depth_mm || 2;
        feedRate = 0.03 / materialFactor;
        spindleRpm = Math.round(1500 / materialFactor);
        break;
    }

    return {
      operationId: `BACKWORK_${position}`,
      type,
      toolPosition: position,
      cutDepth_mm: cutDepth,
      feedRate_mmPerRev: feedRate,
      spindleRpm,
      coolantRequired: type !== 'chamfer'
    };
  }

  private determineSubSpindleApproach(
    backFeatures: SwissPartFeature[],
    machine: SwissMachineConfig
  ): 'axial' | 'radial' | 'combined' {
    const hasAxialFeatures = backFeatures.some(f =>
      ['backwork_face', 'backwork_bore', 'backwork_thread', 'id_drill'].includes(f.type)
    );
    const hasRadialFeatures = backFeatures.some(f =>
      ['groove', 'chamfer'].includes(f.type)
    );

    if (hasAxialFeatures && hasRadialFeatures) {
      return 'combined';
    } else if (hasRadialFeatures) {
      return 'radial';
    }
    return 'axial';
  }

  private estimateOperationTime(operation: BackworkOperation): number {
    // Rough time estimates in seconds
    const baseTimes: Record<string, number> = {
      'face': 1.5,
      'chamfer': 0.8,
      'bore': 3.0,
      'thread': 4.0,
      'drill': 2.0,
      'tap': 3.5,
      'groove': 2.0
    };

    const baseTime = baseTimes[operation.type] || 2.0;
    // Adjust for depth
    const depthFactor = 1 + (operation.cutDepth_mm / 10);

    return baseTime * depthFactor;
  }

  // ============================================================================
  // Comprehensive Process Planning
  // ============================================================================

  /**
   * Generate comprehensive Swiss-type process plan
   */
  generateProcessPlan(
    part: SwissPartDefinition,
    machine: SwissMachineConfig,
    availableTools: string[]
  ): EngineResult<SwissProcessPlan> {
    const reasoningChain: ReasoningStep[] = [];
    let stepNumber = 1;

    // Step 1: Guide bushing analysis
    const bushingResult = this.analyzeGuideBushing(part, machine);
    if (!bushingResult.success) {
      return { success: false, error: `Guide bushing analysis failed: ${bushingResult.error}` };
    }
    reasoningChain.push({
      step: stepNumber++,
      engine: this.name,
      action: 'analyzeGuideBushing',
      input: { partId: part.partId, barDiameter: part.barDiameter_mm },
      output: { recommendation: bushingResult.data!.recommendation },
      confidence: 0.95,
      rationale: bushingResult.data!.reason
    });

    // Step 2: Gang tool layout
    const gangResult = this.optimizeGangToolLayout(part, machine, availableTools);
    if (!gangResult.success) {
      return { success: false, error: `Gang tool optimization failed: ${gangResult.error}` };
    }
    reasoningChain.push({
      step: stepNumber++,
      engine: this.name,
      action: 'optimizeGangToolLayout',
      input: { features: part.features.length, positions: machine.gangToolPositions },
      output: { totalTools: gangResult.data!.totalTools, strategy: gangResult.data!.toolChangeStrategy },
      confidence: 0.90,
      rationale: `Assigned ${gangResult.data!.totalTools} tools with ${gangResult.data!.toolChangeStrategy} strategy`
    });

    // Step 3: Spindle synchronization
    const syncResult = this.planSpindleSync(part, machine);
    if (!syncResult.success && machine.hasSubSpindle) {
      return { success: false, error: `Spindle sync planning failed: ${syncResult.error}` };
    }
    if (syncResult.success) {
      reasoningChain.push({
        step: stepNumber++,
        engine: this.name,
        action: 'planSpindleSync',
        input: { hasSubSpindle: machine.hasSubSpindle },
        output: {
          syncPoints: syncResult.data!.syncPoints.length,
          cycleReduction: syncResult.data!.cycleTimeReduction_percent
        },
        confidence: 0.88,
        rationale: `${syncResult.data!.syncPoints.length} sync points with ${syncResult.data!.cycleTimeReduction_percent.toFixed(1)}% cycle reduction`
      });
    }

    // Step 4: Bar feeding
    const barResult = this.planBarFeeding(part, machine);
    if (!barResult.success) {
      return { success: false, error: `Bar feed planning failed: ${barResult.error}` };
    }
    reasoningChain.push({
      step: stepNumber++,
      engine: this.name,
      action: 'planBarFeeding',
      input: { partLength: part.finishedLength_mm, barDiameter: part.barDiameter_mm },
      output: {
        partsPerBar: barResult.data!.partsPerBar,
        utilization: barResult.data!.materialUtilization_percent
      },
      confidence: 0.95,
      rationale: `${barResult.data!.partsPerBar} parts per bar at ${barResult.data!.materialUtilization_percent.toFixed(1)}% utilization`
    });

    // Step 5: Backworking
    const backResult = this.planBackworking(part, machine);
    if (!backResult.success && machine.hasSubSpindle) {
      return { success: false, error: `Backworking planning failed: ${backResult.error}` };
    }
    if (backResult.success && backResult.data!.operations.length > 0) {
      reasoningChain.push({
        step: stepNumber++,
        engine: this.name,
        action: 'planBackworking',
        input: { backFeatures: part.features.filter(f => f.location === 'back').length },
        output: {
          operations: backResult.data!.operations.length,
          cycleTime: backResult.data!.backworkCycleTime_seconds
        },
        confidence: 0.87,
        rationale: `${backResult.data!.operations.length} backwork operations in ${backResult.data!.backworkCycleTime_seconds.toFixed(1)}s`
      });
    }

    // Calculate totals
    const estimatedCycleTime = this.estimateCycleTime(part);
    const productionRate = 3600 / estimatedCycleTime;
    const setupTime = this.estimateSetupTime(gangResult.data!, machine);

    return { success: true, data: {
      machineConfig: machine,
      guideBushing: bushingResult.data!,
      gangLayout: gangResult.data!,
      spindleSync: syncResult.data || {
        syncPoints: [],
        handoffMethod: 'clamp_transfer',
        overlapOperations: [],
        cycleTimeReduction_percent: 0,
        collisionZones: []
      },
      barFeed: barResult.data!,
      backworking: backResult.data || {
        operations: [],
        subSpindleApproach: 'axial',
        partoffToHandoffTime_seconds: 0,
        backworkCycleTime_seconds: 0,
        qualityCritical: false
      },
      estimatedCycleTime_seconds: estimatedCycleTime,
      productionRate_partsPerHour: productionRate,
      setupTime_minutes: setupTime,
      reasoningChain
    } };
  }

  private estimateSetupTime(gangLayout: GangToolLayout, machine: SwissMachineConfig): number {
    // Base setup time in minutes
    let setupTime = 30; // minimum setup

    // Add time per tool
    setupTime += gangLayout.totalTools * 5;

    // Add time for guide bushing setup
    if (machine.guideBushingType !== 'bushingless') {
      setupTime += 15;
    }

    // Add time for sub-spindle setup
    if (machine.hasSubSpindle) {
      setupTime += 20;
    }

    // Add time for Y-axis or B-axis setup
    if (machine.hasYAxis) setupTime += 10;
    if (machine.hasBAxis) setupTime += 15;

    return setupTime;
  }

  // ============================================================================
  // Dispatcher Actions
  // ============================================================================

  /**
   * Execute dispatcher action
   */
  async executeAction(
    action: string,
    params: Record<string, unknown>
  ): Promise<EngineResult<unknown>> {
    switch (action) {
      case 'swiss_analyze_guide_bushing':
        return this.analyzeGuideBushing(
          params.part as SwissPartDefinition,
          params.machine as SwissMachineConfig
        );

      case 'swiss_optimize_gang_layout':
        return this.optimizeGangToolLayout(
          params.part as SwissPartDefinition,
          params.machine as SwissMachineConfig,
          params.availableTools as string[]
        );

      case 'swiss_plan_spindle_sync':
        return this.planSpindleSync(
          params.part as SwissPartDefinition,
          params.machine as SwissMachineConfig
        );

      case 'swiss_plan_bar_feeding':
        return this.planBarFeeding(
          params.part as SwissPartDefinition,
          params.machine as SwissMachineConfig,
          params.barLength_mm as number | undefined
        );

      case 'swiss_plan_backworking':
        return this.planBackworking(
          params.part as SwissPartDefinition,
          params.machine as SwissMachineConfig
        );

      case 'swiss_generate_process_plan':
        return this.generateProcessPlan(
          params.part as SwissPartDefinition,
          params.machine as SwissMachineConfig,
          params.availableTools as string[]
        );

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }
}

export const swissTypeIntelligenceEngine = new SwissTypeIntelligenceEngine();
