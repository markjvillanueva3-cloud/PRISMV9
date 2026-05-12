/**
 * MultiTurretSyncEngine.ts
 * Multi-turret synchronization and optimization for twin/triple turret lathes
 *
 * Covers: Simultaneous cutting orchestration, turret collision avoidance,
 * balanced cut optimization, sync code generation, parallel operation cycle time reduction
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

export interface MultiTurretConfig {
  machineId: string;
  manufacturer: 'mazak' | 'okuma' | 'dmg_mori' | 'doosan' | 'nakamura' | 'miyano';
  model: string;
  turrets: TurretSpec[];
  hasSubSpindle: boolean;
  maxMainSpindleRpm: number;
  maxSubSpindleRpm: number;
  maxBarDiameter_mm: number;
  swingOverBed_mm: number;
  turretIndexTime_seconds: number;
}

export interface TurretSpec {
  turretId: 'upper' | 'lower' | 'third';
  toolStations: number;
  hasLiveTooling: boolean;
  maxLiveToolRpm?: number;
  hasYAxis: boolean;
  yAxisTravel_mm?: number;
  hasBAxis: boolean;
  bAxisRange_deg?: number;
  xTravel_mm: number;
  zTravel_mm: number;
  turretType: 'drum' | 'disc' | 'gang';
}

export interface MultiTurretPart {
  partId: string;
  stockDiameter_mm: number;
  finishedLength_mm: number;
  operations: TurretOperation[];
  material: string;
  tolerance_class: 'standard' | 'precision' | 'ultra_precision';
  productionVolume: number;
}

export interface TurretOperation {
  operationId: string;
  type: 'od_rough' | 'od_finish' | 'id_rough' | 'id_finish' | 'face' | 'groove' |
        'thread' | 'drill' | 'bore' | 'cutoff' | 'mill' | 'cross_drill' | 'chamfer';
  preferredTurret?: 'upper' | 'lower' | 'third' | 'any';
  zStart_mm: number;
  zEnd_mm: number;
  diameter_mm?: number;
  depth_mm?: number;
  cuttingTime_seconds: number;
  requiresSync: boolean;
  syncDependency?: string; // operationId this depends on
}

export interface SimultaneousCutPlan {
  cutPairs: CutPair[];
  totalCycleTime_seconds: number;
  cycleTimeReduction_percent: number;
  balanceScore: number; // 0-1, how well balanced the cuts are
  collisionRisk: 'none' | 'low' | 'medium' | 'high';
}

export interface CutPair {
  pairId: string;
  upperTurretOp: TurretOperation | null;
  lowerTurretOp: TurretOperation | null;
  cutType: 'balanced' | 'staggered' | 'sequential';
  startSync: string;
  endSync: string;
  forceBalance_percent: number;
  combinedCutTime_seconds: number;
  notes: string;
}

export interface CollisionAnalysis {
  zones: CollisionZone[];
  clearanceMap: ClearanceEntry[];
  safeOperatingEnvelope: OperatingEnvelope;
  riskLevel: 'safe' | 'caution' | 'danger';
  recommendations: string[];
}

export interface CollisionZone {
  zoneId: string;
  xRange: { min: number; max: number };
  zRange: { min: number; max: number };
  affectedTurrets: ('upper' | 'lower' | 'third')[];
  severity: 'critical' | 'warning' | 'info';
  description: string;
}

export interface ClearanceEntry {
  turret1: 'upper' | 'lower' | 'third';
  turret2: 'upper' | 'lower' | 'third';
  minClearance_mm: number;
  atPosition: { x: number; z: number };
}

export interface OperatingEnvelope {
  upperTurret: { xMin: number; xMax: number; zMin: number; zMax: number };
  lowerTurret: { xMin: number; xMax: number; zMin: number; zMax: number };
  thirdTurret?: { xMin: number; xMax: number; zMin: number; zMax: number };
  overlapZone: { zMin: number; zMax: number } | null;
}

export interface SyncCodePlan {
  syncCodes: SyncCode[];
  waitCodes: WaitCode[];
  programStructure: ProgramBlock[];
  estimatedOverhead_seconds: number;
}

export interface SyncCode {
  codeId: string;
  code: string; // e.g., M200, M201
  description: string;
  turrets: ('upper' | 'lower' | 'third')[];
  timing: 'start' | 'end' | 'checkpoint';
}

export interface WaitCode {
  codeId: string;
  code: string;
  waitingTurret: 'upper' | 'lower' | 'third';
  waitForTurret: 'upper' | 'lower' | 'third';
  maxWaitTime_seconds: number;
  reason: string;
}

export interface ProgramBlock {
  blockId: string;
  turret: 'upper' | 'lower' | 'third' | 'both';
  operations: string[];
  startSync?: string;
  endSync?: string;
  estimatedTime_seconds: number;
}

export interface BalancedCutAnalysis {
  isBalanceable: boolean;
  balanceRatio: number; // ratio of forces between turrets
  deflectionReduction_percent: number;
  vibrationReduction_percent: number;
  optimalOffsets: BalanceOffset[];
  warnings: string[];
}

export interface BalanceOffset {
  turret: 'upper' | 'lower' | 'third';
  xOffset_mm: number;
  zOffset_mm: number;
  depthOfCut_mm: number;
  feedRate_mmPerRev: number;
}

export interface CycleOptimization {
  originalCycleTime_seconds: number;
  optimizedCycleTime_seconds: number;
  reductionPercent: number;
  operationSequence: SequencedOperation[];
  bottleneck: string;
  improvementOpportunities: string[];
}

export interface SequencedOperation {
  sequence: number;
  operationId: string;
  turret: 'upper' | 'lower' | 'third';
  startTime_seconds: number;
  endTime_seconds: number;
  parallel: boolean;
  parallelWith?: string;
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

export class MultiTurretSyncEngine {
  readonly name = 'MultiTurretSyncEngine';
  readonly version = '1.0.0';
  readonly description = 'Multi-turret synchronization and optimization engine';

  // Material cutting force coefficients (relative to 1018 steel)
  private readonly forceCoefficients: Record<string, number> = {
    'aluminum': 0.35,
    'brass': 0.45,
    'steel_1018': 1.00,
    'steel_4140': 1.25,
    'stainless_304': 1.40,
    'stainless_316': 1.50,
    'titanium': 1.30,
    'inconel': 1.80
  };

  // ============================================================================
  // Simultaneous Cutting Planning
  // ============================================================================

  /**
   * Plan simultaneous cutting operations for multiple turrets
   */
  planSimultaneousCuts(
    part: MultiTurretPart,
    machine: MultiTurretConfig
  ): EngineResult<SimultaneousCutPlan> {
    // Separate operations by preferred/possible turret
    const upperOps = this.filterOperationsForTurret(part.operations, 'upper', machine);
    const lowerOps = this.filterOperationsForTurret(part.operations, 'lower', machine);

    // Find pairing opportunities
    const cutPairs = this.findCutPairs(upperOps, lowerOps, part, machine);

    // Calculate sequential operations (not paired)
    const pairedOpIds = new Set<string>();
    for (const pair of cutPairs) {
      if (pair.upperTurretOp) pairedOpIds.add(pair.upperTurretOp.operationId);
      if (pair.lowerTurretOp) pairedOpIds.add(pair.lowerTurretOp.operationId);
    }

    const unpairedOps = part.operations.filter(op => !pairedOpIds.has(op.operationId));

    // Calculate total cycle time
    const parallelTime = cutPairs.reduce((sum, p) => sum + p.combinedCutTime_seconds, 0);
    const sequentialTime = unpairedOps.reduce((sum, op) => sum + op.cuttingTime_seconds, 0);
    const totalCycleTime = parallelTime + sequentialTime + (machine.turretIndexTime_seconds * cutPairs.length);

    // Calculate original sequential time
    const originalTime = part.operations.reduce((sum, op) => sum + op.cuttingTime_seconds, 0);
    const reductionPercent = ((originalTime - totalCycleTime) / originalTime) * 100;

    // Calculate balance score
    const balanceScore = this.calculateBalanceScore(cutPairs);

    // Assess collision risk
    const collisionRisk = this.assessCollisionRisk(cutPairs, machine);

    return { success: true, data: {
      cutPairs,
      totalCycleTime_seconds: totalCycleTime,
      cycleTimeReduction_percent: Math.max(0, reductionPercent),
      balanceScore,
      collisionRisk
    } };
  }

  private filterOperationsForTurret(
    operations: TurretOperation[],
    turret: 'upper' | 'lower' | 'third',
    machine: MultiTurretConfig
  ): TurretOperation[] {
    const turretSpec = machine.turrets.find(t => t.turretId === turret);
    if (!turretSpec) return [];

    return operations.filter(op => {
      // Check preferred turret
      if (op.preferredTurret && op.preferredTurret !== 'any' && op.preferredTurret !== turret) {
        return false;
      }

      // Check if operation type is compatible with turret capabilities
      const needsLive = ['mill', 'cross_drill'].includes(op.type);
      if (needsLive && !turretSpec.hasLiveTooling) {
        return false;
      }

      // Check Y-axis requirement
      const needsY = ['mill'].includes(op.type);
      if (needsY && !turretSpec.hasYAxis) {
        return false;
      }

      return true;
    });
  }

  private findCutPairs(
    upperOps: TurretOperation[],
    lowerOps: TurretOperation[],
    part: MultiTurretPart,
    machine: MultiTurretConfig
  ): CutPair[] {
    const pairs: CutPair[] = [];
    const usedUpper = new Set<string>();
    const usedLower = new Set<string>();
    let pairIndex = 1;

    // Priority 1: Balanced roughing cuts (OD rough + OD rough at 180 degrees)
    for (const upperOp of upperOps.filter(o => o.type === 'od_rough')) {
      if (usedUpper.has(upperOp.operationId)) continue;

      for (const lowerOp of lowerOps.filter(o => o.type === 'od_rough')) {
        if (usedLower.has(lowerOp.operationId)) continue;

        // Check if Z ranges overlap for balanced cutting
        if (this.zRangesOverlap(upperOp, lowerOp)) {
          const forceBalance = this.calculateForceBalance(upperOp, lowerOp, part.material);
          pairs.push({
            pairId: `PAIR_${pairIndex++}`,
            upperTurretOp: upperOp,
            lowerTurretOp: lowerOp,
            cutType: forceBalance > 0.8 ? 'balanced' : 'staggered',
            startSync: `M${200 + pairIndex}`,
            endSync: `M${210 + pairIndex}`,
            forceBalance_percent: forceBalance * 100,
            combinedCutTime_seconds: Math.max(upperOp.cuttingTime_seconds, lowerOp.cuttingTime_seconds),
            notes: forceBalance > 0.8 ? 'Balanced cut reduces deflection' : 'Staggered cut for safety'
          });
          usedUpper.add(upperOp.operationId);
          usedLower.add(lowerOp.operationId);
          break;
        }
      }
    }

    // Priority 2: OD on upper + ID on lower (no interference)
    for (const upperOp of upperOps.filter(o => o.type.startsWith('od_'))) {
      if (usedUpper.has(upperOp.operationId)) continue;

      for (const lowerOp of lowerOps.filter(o => o.type.startsWith('id_'))) {
        if (usedLower.has(lowerOp.operationId)) continue;

        pairs.push({
          pairId: `PAIR_${pairIndex++}`,
          upperTurretOp: upperOp,
          lowerTurretOp: lowerOp,
          cutType: 'parallel',
          startSync: `M${200 + pairIndex}`,
          endSync: `M${210 + pairIndex}`,
          forceBalance_percent: 50, // Different operations, moderate balance
          combinedCutTime_seconds: Math.max(upperOp.cuttingTime_seconds, lowerOp.cuttingTime_seconds),
          notes: 'OD/ID parallel - no interference'
        });
        usedUpper.add(upperOp.operationId);
        usedLower.add(lowerOp.operationId);
        break;
      }
    }

    // Priority 3: Secondary operations in parallel
    const secondaryTypes = ['groove', 'chamfer', 'thread'];
    for (const upperOp of upperOps.filter(o => secondaryTypes.includes(o.type))) {
      if (usedUpper.has(upperOp.operationId)) continue;

      for (const lowerOp of lowerOps.filter(o => secondaryTypes.includes(o.type))) {
        if (usedLower.has(lowerOp.operationId)) continue;

        // Ensure no Z overlap for grooves
        if (!this.zRangesOverlap(upperOp, lowerOp)) {
          pairs.push({
            pairId: `PAIR_${pairIndex++}`,
            upperTurretOp: upperOp,
            lowerTurretOp: lowerOp,
            cutType: 'staggered',
            startSync: `M${200 + pairIndex}`,
            endSync: `M${210 + pairIndex}`,
            forceBalance_percent: 30,
            combinedCutTime_seconds: Math.max(upperOp.cuttingTime_seconds, lowerOp.cuttingTime_seconds),
            notes: 'Secondary operations in parallel at different Z'
          });
          usedUpper.add(upperOp.operationId);
          usedLower.add(lowerOp.operationId);
          break;
        }
      }
    }

    return pairs;
  }

  private zRangesOverlap(op1: TurretOperation, op2: TurretOperation): boolean {
    return op1.zStart_mm < op2.zEnd_mm && op2.zStart_mm < op1.zEnd_mm;
  }

  private calculateForceBalance(
    op1: TurretOperation,
    op2: TurretOperation,
    material: string
  ): number {
    // Calculate relative cutting forces
    const force1 = this.estimateCuttingForce(op1, material);
    const force2 = this.estimateCuttingForce(op2, material);

    const minForce = Math.min(force1, force2);
    const maxForce = Math.max(force1, force2);

    return minForce / maxForce; // 1.0 = perfectly balanced
  }

  private estimateCuttingForce(op: TurretOperation, material: string): number {
    const materialKey = this.normalizeMaterial(material);
    const coef = this.forceCoefficients[materialKey] || 1.0;

    // Base force by operation type
    const baseForces: Record<string, number> = {
      'od_rough': 100,
      'od_finish': 30,
      'id_rough': 80,
      'id_finish': 25,
      'face': 60,
      'groove': 70,
      'thread': 40,
      'drill': 50,
      'bore': 45,
      'cutoff': 90,
      'mill': 55,
      'cross_drill': 35,
      'chamfer': 20
    };

    const baseForce = baseForces[op.type] || 50;
    const depthFactor = 1 + ((op.depth_mm || 1) / 5);

    return baseForce * coef * depthFactor;
  }

  private normalizeMaterial(material: string): string {
    const lower = material.toLowerCase();
    if (lower.includes('aluminum')) return 'aluminum';
    if (lower.includes('brass')) return 'brass';
    if (lower.includes('4140') || lower.includes('4340')) return 'steel_4140';
    if (lower.includes('304')) return 'stainless_304';
    if (lower.includes('316')) return 'stainless_316';
    if (lower.includes('titanium')) return 'titanium';
    if (lower.includes('inconel')) return 'inconel';
    return 'steel_1018';
  }

  private calculateBalanceScore(pairs: CutPair[]): number {
    if (pairs.length === 0) return 0;

    const totalBalance = pairs.reduce((sum, p) => sum + p.forceBalance_percent, 0);
    return totalBalance / (pairs.length * 100);
  }

  private assessCollisionRisk(
    pairs: CutPair[],
    machine: MultiTurretConfig
  ): 'none' | 'low' | 'medium' | 'high' {
    // Check for risky combinations
    let riskScore = 0;

    for (const pair of pairs) {
      if (pair.cutType === 'balanced') {
        // Balanced cuts at same Z have some risk
        riskScore += 1;
      }

      // Check for operations that cross paths
      if (pair.upperTurretOp && pair.lowerTurretOp) {
        const zOverlap = this.zRangesOverlap(pair.upperTurretOp, pair.lowerTurretOp);
        if (zOverlap && pair.cutType !== 'balanced') {
          riskScore += 2;
        }
      }
    }

    if (riskScore === 0) return 'none';
    if (riskScore <= 2) return 'low';
    if (riskScore <= 5) return 'medium';
    return 'high';
  }

  // ============================================================================
  // Collision Analysis
  // ============================================================================

  /**
   * Analyze collision zones between turrets
   */
  analyzeCollisions(
    part: MultiTurretPart,
    machine: MultiTurretConfig
  ): EngineResult<CollisionAnalysis> {
    const zones: CollisionZone[] = [];
    const clearanceMap: ClearanceEntry[] = [];
    const recommendations: string[] = [];

    // Find the operating envelope for each turret
    const upperTurret = machine.turrets.find(t => t.turretId === 'upper');
    const lowerTurret = machine.turrets.find(t => t.turretId === 'lower');

    if (!upperTurret || !lowerTurret) {
      return { success: false, error: 'Machine requires both upper and lower turrets' };
    }

    // Calculate overlap zone
    const overlapZMin = 0; // Near chuck
    const overlapZMax = Math.min(upperTurret.zTravel_mm, lowerTurret.zTravel_mm);

    // Zone 1: Chuck interference zone
    zones.push({
      zoneId: 'CHUCK_ZONE',
      xRange: { min: 0, max: part.stockDiameter_mm / 2 + 20 },
      zRange: { min: -10, max: 30 },
      affectedTurrets: ['upper', 'lower'],
      severity: 'critical',
      description: 'Chuck jaw interference zone - both turrets must clear'
    });

    // Zone 2: Part surface zone
    zones.push({
      zoneId: 'PART_SURFACE',
      xRange: { min: 0, max: part.stockDiameter_mm / 2 },
      zRange: { min: 0, max: part.finishedLength_mm },
      affectedTurrets: ['upper', 'lower'],
      severity: 'warning',
      description: 'Part surface zone - coordinate turret movements'
    });

    // Zone 3: Tailstock/sub-spindle zone (if applicable)
    if (machine.hasSubSpindle) {
      zones.push({
        zoneId: 'SUBSPINDLE_ZONE',
        xRange: { min: 0, max: part.stockDiameter_mm / 2 + 30 },
        zRange: { min: part.finishedLength_mm - 10, max: part.finishedLength_mm + 50 },
        affectedTurrets: ['upper', 'lower'],
        severity: 'critical',
        description: 'Sub-spindle approach zone - clear before handoff'
      });
    }

    // Calculate clearances
    const upperXMin = upperTurret.xTravel_mm * -0.5; // Assumes center at 0
    const lowerXMin = lowerTurret.xTravel_mm * 0.5; // Lower turret opposite side

    clearanceMap.push({
      turret1: 'upper',
      turret2: 'lower',
      minClearance_mm: Math.abs(lowerXMin - upperXMin) - part.stockDiameter_mm,
      atPosition: { x: 0, z: part.finishedLength_mm / 2 }
    });

    // Operating envelope
    const safeOperatingEnvelope: OperatingEnvelope = {
      upperTurret: {
        xMin: -upperTurret.xTravel_mm / 2,
        xMax: part.stockDiameter_mm / 2 + 5,
        zMin: -5,
        zMax: upperTurret.zTravel_mm
      },
      lowerTurret: {
        xMin: -lowerTurret.xTravel_mm / 2,
        xMax: part.stockDiameter_mm / 2 + 5,
        zMin: -5,
        zMax: lowerTurret.zTravel_mm
      },
      overlapZone: { zMin: overlapZMin, zMax: overlapZMax }
    };

    // Recommendations
    recommendations.push('Use sync codes when both turrets operate in Z overlap zone');
    recommendations.push('Stagger tool changes to prevent collision during index');
    recommendations.push('Maintain minimum 10mm X clearance during parallel operations');
    if (machine.hasSubSpindle) {
      recommendations.push('Clear both turrets before sub-spindle approach');
    }

    // Overall risk level
    const criticalZones = zones.filter(z => z.severity === 'critical').length;
    const riskLevel = criticalZones > 1 ? 'danger' : criticalZones === 1 ? 'caution' : 'safe';

    return { success: true, data: {
      zones,
      clearanceMap,
      safeOperatingEnvelope,
      riskLevel,
      recommendations
    } };
  }

  // ============================================================================
  // Sync Code Generation
  // ============================================================================

  /**
   * Generate synchronization codes for multi-turret program
   */
  generateSyncCodes(
    cutPlan: SimultaneousCutPlan,
    machine: MultiTurretConfig
  ): EngineResult<SyncCodePlan> {
    const syncCodes: SyncCode[] = [];
    const waitCodes: WaitCode[] = [];
    const programBlocks: ProgramBlock[] = [];
    let codeIndex = 200;
    let estimatedOverhead = 0;

    // Generate sync codes for each cut pair
    for (const pair of cutPlan.cutPairs) {
      // Start sync
      syncCodes.push({
        codeId: `SYNC_START_${pair.pairId}`,
        code: `M${codeIndex}`,
        description: `Start synchronized operation ${pair.pairId}`,
        turrets: ['upper', 'lower'],
        timing: 'start'
      });

      // End sync
      syncCodes.push({
        codeId: `SYNC_END_${pair.pairId}`,
        code: `M${codeIndex + 10}`,
        description: `End synchronized operation ${pair.pairId}`,
        turrets: ['upper', 'lower'],
        timing: 'end'
      });

      // Generate wait code if operations have different durations
      if (pair.upperTurretOp && pair.lowerTurretOp) {
        const upperTime = pair.upperTurretOp.cuttingTime_seconds;
        const lowerTime = pair.lowerTurretOp.cuttingTime_seconds;

        if (Math.abs(upperTime - lowerTime) > 0.5) {
          const faster = upperTime < lowerTime ? 'upper' : 'lower';
          const slower = upperTime < lowerTime ? 'lower' : 'upper';

          waitCodes.push({
            codeId: `WAIT_${pair.pairId}`,
            code: `M${codeIndex + 5}`,
            waitingTurret: faster,
            waitForTurret: slower,
            maxWaitTime_seconds: Math.abs(upperTime - lowerTime) + 1,
            reason: `${faster} turret waits for ${slower} to complete`
          });

          estimatedOverhead += 0.2; // Sync overhead
        }
      }

      // Generate program block
      programBlocks.push({
        blockId: `BLOCK_${pair.pairId}`,
        turret: 'both',
        operations: [
          pair.upperTurretOp?.operationId || '',
          pair.lowerTurretOp?.operationId || ''
        ].filter(Boolean),
        startSync: `M${codeIndex}`,
        endSync: `M${codeIndex + 10}`,
        estimatedTime_seconds: pair.combinedCutTime_seconds
      });

      codeIndex += 20;
    }

    // Add turret index sync (index both turrets simultaneously to save time)
    if (cutPlan.cutPairs.length > 1) {
      syncCodes.push({
        codeId: 'SYNC_INDEX',
        code: 'M290',
        description: 'Synchronized turret index',
        turrets: ['upper', 'lower'],
        timing: 'checkpoint'
      });
      estimatedOverhead += machine.turretIndexTime_seconds * 0.3; // Overlap savings
    }

    return { success: true, data: {
      syncCodes,
      waitCodes,
      programStructure: programBlocks,
      estimatedOverhead_seconds: estimatedOverhead
    } };
  }

  // ============================================================================
  // Balanced Cut Analysis
  // ============================================================================

  /**
   * Analyze opportunities for balanced cutting
   */
  analyzeBalancedCuts(
    part: MultiTurretPart,
    machine: MultiTurretConfig
  ): EngineResult<BalancedCutAnalysis> {
    // Find OD roughing operations
    const roughOps = part.operations.filter(op => op.type === 'od_rough');

    if (roughOps.length < 2) {
      return { success: true, data: {
        isBalanceable: false,
        balanceRatio: 0,
        deflectionReduction_percent: 0,
        vibrationReduction_percent: 0,
        optimalOffsets: [],
        warnings: ['Insufficient OD roughing operations for balanced cutting']
      } };
    }

    // Calculate forces for potential balance
    const forces = roughOps.map(op => ({
      op,
      force: this.estimateCuttingForce(op, part.material)
    }));

    // Find best pair for balancing
    let bestPair: { op1: TurretOperation; op2: TurretOperation; ratio: number } | null = null;
    let bestRatio = 0;

    for (let i = 0; i < forces.length; i++) {
      for (let j = i + 1; j < forces.length; j++) {
        const ratio = Math.min(forces[i].force, forces[j].force) /
                      Math.max(forces[i].force, forces[j].force);
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestPair = { op1: forces[i].op, op2: forces[j].op, ratio };
        }
      }
    }

    if (!bestPair) {
      return { success: true, data: {
        isBalanceable: false,
        balanceRatio: 0,
        deflectionReduction_percent: 0,
        vibrationReduction_percent: 0,
        optimalOffsets: [],
        warnings: ['Could not find suitable operations for balancing']
      } };
    }

    // Calculate deflection and vibration reduction
    const deflectionReduction = bestRatio * 70; // Up to 70% reduction with perfect balance
    const vibrationReduction = bestRatio * 60; // Up to 60% vibration reduction

    // Calculate optimal offsets
    const avgDiameter = part.stockDiameter_mm;
    const materialCoef = this.forceCoefficients[this.normalizeMaterial(part.material)] || 1.0;

    const optimalOffsets: BalanceOffset[] = [
      {
        turret: 'upper',
        xOffset_mm: avgDiameter / 2 - 1,
        zOffset_mm: 0,
        depthOfCut_mm: 2.0 / materialCoef,
        feedRate_mmPerRev: 0.25 / materialCoef
      },
      {
        turret: 'lower',
        xOffset_mm: -(avgDiameter / 2 - 1), // Opposite side
        zOffset_mm: 0, // Same Z for balanced cut
        depthOfCut_mm: 2.0 / materialCoef,
        feedRate_mmPerRev: 0.25 / materialCoef
      }
    ];

    const warnings: string[] = [];
    if (bestRatio < 0.7) {
      warnings.push('Force imbalance > 30% - consider adjusting depth of cut');
    }
    if (part.tolerance_class === 'ultra_precision' && bestRatio < 0.9) {
      warnings.push('Ultra-precision part requires > 90% balance ratio');
    }

    return { success: true, data: {
      isBalanceable: bestRatio > 0.5,
      balanceRatio: bestRatio,
      deflectionReduction_percent: deflectionReduction,
      vibrationReduction_percent: vibrationReduction,
      optimalOffsets,
      warnings
    } };
  }

  // ============================================================================
  // Cycle Time Optimization
  // ============================================================================

  /**
   * Optimize cycle time through parallel operation sequencing
   */
  optimizeCycleTime(
    part: MultiTurretPart,
    machine: MultiTurretConfig
  ): EngineResult<CycleOptimization> {
    // Calculate original sequential time
    const originalTime = part.operations.reduce(
      (sum, op) => sum + op.cuttingTime_seconds, 0
    ) + (part.operations.length * machine.turretIndexTime_seconds);

    // Build dependency graph
    const dependencies = new Map<string, string[]>();
    for (const op of part.operations) {
      if (op.syncDependency) {
        const deps = dependencies.get(op.operationId) || [];
        deps.push(op.syncDependency);
        dependencies.set(op.operationId, deps);
      }
    }

    // Schedule operations
    const scheduled: SequencedOperation[] = [];
    const completed = new Set<string>();
    let currentTime = 0;
    let sequence = 1;

    while (completed.size < part.operations.length) {
      // Find ready operations (dependencies satisfied)
      const ready = part.operations.filter(op => {
        if (completed.has(op.operationId)) return false;
        const deps = dependencies.get(op.operationId) || [];
        return deps.every(d => completed.has(d));
      });

      if (ready.length === 0) {
        return { success: false, error: 'Circular dependency detected in operations' };
      }

      // Try to pair operations for parallel execution
      const upperReady = ready.filter(op =>
        op.preferredTurret === 'upper' || op.preferredTurret === 'any'
      );
      const lowerReady = ready.filter(op =>
        op.preferredTurret === 'lower' || op.preferredTurret === 'any'
      );

      if (upperReady.length > 0 && lowerReady.length > 0) {
        // Parallel execution
        const upperOp = upperReady[0];
        const lowerOp = lowerReady.find(op => op.operationId !== upperOp.operationId) || null;

        if (lowerOp) {
          const endTime = currentTime + Math.max(
            upperOp.cuttingTime_seconds,
            lowerOp.cuttingTime_seconds
          );

          scheduled.push({
            sequence: sequence++,
            operationId: upperOp.operationId,
            turret: 'upper',
            startTime_seconds: currentTime,
            endTime_seconds: endTime,
            parallel: true,
            parallelWith: lowerOp.operationId
          });

          scheduled.push({
            sequence: sequence++,
            operationId: lowerOp.operationId,
            turret: 'lower',
            startTime_seconds: currentTime,
            endTime_seconds: endTime,
            parallel: true,
            parallelWith: upperOp.operationId
          });

          currentTime = endTime;
          completed.add(upperOp.operationId);
          completed.add(lowerOp.operationId);
          continue;
        }
      }

      // Sequential execution
      const op = ready[0];
      const turret = op.preferredTurret === 'lower' ? 'lower' : 'upper';
      const endTime = currentTime + op.cuttingTime_seconds;

      scheduled.push({
        sequence: sequence++,
        operationId: op.operationId,
        turret,
        startTime_seconds: currentTime,
        endTime_seconds: endTime,
        parallel: false
      });

      currentTime = endTime;
      completed.add(op.operationId);
    }

    // Add index times
    const optimizedTime = currentTime + (scheduled.length * machine.turretIndexTime_seconds * 0.5);
    const reductionPercent = ((originalTime - optimizedTime) / originalTime) * 100;

    // Find bottleneck
    const longestOp = part.operations.reduce((max, op) =>
      op.cuttingTime_seconds > max.cuttingTime_seconds ? op : max
    );

    // Improvement opportunities
    const opportunities: string[] = [];
    const parallelOps = scheduled.filter(s => s.parallel).length;
    if (parallelOps / scheduled.length < 0.5) {
      opportunities.push('Increase parallel operations by reordering sequence');
    }
    if (longestOp.cuttingTime_seconds > optimizedTime * 0.3) {
      opportunities.push(`Split ${longestOp.type} operation into multiple passes`);
    }

    return { success: true, data: {
      originalCycleTime_seconds: originalTime,
      optimizedCycleTime_seconds: optimizedTime,
      reductionPercent: Math.max(0, reductionPercent),
      operationSequence: scheduled,
      bottleneck: `${longestOp.type} (${longestOp.cuttingTime_seconds}s)`,
      improvementOpportunities: opportunities
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
      case 'multiturret_plan_simultaneous':
        return this.planSimultaneousCuts(
          params.part as MultiTurretPart,
          params.machine as MultiTurretConfig
        );

      case 'multiturret_analyze_collisions':
        return this.analyzeCollisions(
          params.part as MultiTurretPart,
          params.machine as MultiTurretConfig
        );

      case 'multiturret_generate_sync_codes':
        return this.generateSyncCodes(
          params.cutPlan as SimultaneousCutPlan,
          params.machine as MultiTurretConfig
        );

      case 'multiturret_analyze_balanced_cuts':
        return this.analyzeBalancedCuts(
          params.part as MultiTurretPart,
          params.machine as MultiTurretConfig
        );

      case 'multiturret_optimize_cycle_time':
        return this.optimizeCycleTime(
          params.part as MultiTurretPart,
          params.machine as MultiTurretConfig
        );

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }
}

export const multiTurretSyncEngine = new MultiTurretSyncEngine();
