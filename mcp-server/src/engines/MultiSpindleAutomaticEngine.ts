/**
 * MultiSpindleAutomaticEngine.ts
 * Multi-spindle automatic lathe coordination for high-volume production
 *
 * Covers: 6/8-spindle drum coordination, station sequencing, cycle time balancing,
 * dedicated vs shared tooling decisions, index timing optimization
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

export interface MultiSpindleMachineConfig {
  machineId: string;
  manufacturer: 'schutte' | 'index' | 'tornos' | 'gildemeister' | 'wickman' | 'davenport';
  model: string;
  spindleCount: 6 | 8;
  maxBarDiameter_mm: number;
  maxPartLength_mm: number;
  indexTime_seconds: number;
  hasPickoffSpindle: boolean;
  pickoffStations?: number;
  crossSlideCount: number;
  endWorkingCount: number;
  hasBackworking: boolean;
  coolantType: 'oil' | 'water_soluble';
  maxSpindleRpm: number;
}

export interface MultiSpindlePart {
  partId: string;
  barDiameter_mm: number;
  finishedLength_mm: number;
  operations: SpindleOperation[];
  material: string;
  tolerance_class: 'standard' | 'precision' | 'ultra_precision';
  annualVolume: number;
  criticalDimensions: CriticalDimension[];
}

export interface SpindleOperation {
  operationId: string;
  type: 'od_turn' | 'face' | 'groove' | 'thread' | 'knurl' | 'form' |
        'drill' | 'bore' | 'ream' | 'tap' | 'cutoff' | 'chamfer' |
        'cross_drill' | 'slot' | 'polygon' | 'backwork';
  cuttingTime_seconds: number;
  toolType: string;
  requiredPrecision: 'low' | 'medium' | 'high';
  canShareTool: boolean;
  dependencies: string[];
  position: 'od' | 'id' | 'end' | 'back';
}

export interface CriticalDimension {
  dimensionId: string;
  type: 'diameter' | 'length' | 'thread' | 'concentricity';
  nominal_mm: number;
  tolerance_mm: number;
  affectedOperations: string[];
}

export interface StationAssignment {
  stations: StationConfig[];
  cycleTime_seconds: number;
  bottleneckStation: number;
  utilizationBalance: number;
  toolingCost: number;
  reasoningChain: ReasoningStep[];
}

export interface StationConfig {
  stationNumber: number;
  operations: AssignedOperation[];
  totalTime_seconds: number;
  utilizationPercent: number;
  toolSlots: ToolSlot[];
  slideType: 'cross' | 'end_working' | 'backwork';
  isBottleneck: boolean;
  notes: string;
}

export interface AssignedOperation {
  operationId: string;
  sequence: number;
  startTime_seconds: number;
  endTime_seconds: number;
  toolSlot: number;
}

export interface ToolSlot {
  slotNumber: number;
  toolType: string;
  toolId: string;
  dedicatedOrShared: 'dedicated' | 'shared';
  usedByStations: number[];
}

export interface CycleBalanceAnalysis {
  currentImbalance_percent: number;
  bottleneckStation: number;
  bottleneckTime_seconds: number;
  slackTimes: StationSlack[];
  balanceStrategies: BalanceStrategy[];
  achievableBalance_percent: number;
}

export interface StationSlack {
  station: number;
  slackTime_seconds: number;
  utilizationPercent: number;
  canAbsorbOperations: string[];
}

export interface BalanceStrategy {
  strategyId: string;
  description: string;
  moveOperation: string;
  fromStation: number;
  toStation: number;
  expectedImprovement_percent: number;
  feasibility: 'easy' | 'moderate' | 'difficult';
  toolingChange: boolean;
}

export interface ToolingDecision {
  decisions: ToolDecision[];
  totalDedicatedTools: number;
  totalSharedTools: number;
  estimatedToolingCost: number;
  maintenanceComplexity: 'low' | 'medium' | 'high';
  changeoverImpact_minutes: number;
}

export interface ToolDecision {
  toolId: string;
  toolType: string;
  decision: 'dedicated' | 'shared';
  usedAtStations: number[];
  reasoning: string;
  costImpact: number;
}

export interface IndexOptimization {
  currentIndexTime_seconds: number;
  optimizedIndexTime_seconds: number;
  improvement_percent: number;
  recommendations: IndexRecommendation[];
  drumMassAnalysis: DrumMassBalance;
}

export interface IndexRecommendation {
  recommendationId: string;
  type: 'speed' | 'acceleration' | 'settling' | 'preload';
  description: string;
  expectedGain_seconds: number;
  implementationCost: 'low' | 'medium' | 'high';
}

export interface DrumMassBalance {
  isBalanced: boolean;
  heaviestStation: number;
  lightestStation: number;
  imbalance_percent: number;
  recommendations: string[];
}

export interface ProductionAnalysis {
  cycleTime_seconds: number;
  partsPerHour: number;
  partsPerShift: number;
  partsPerDay: number;
  daysToFillOrder: number;
  machineUtilization_percent: number;
  laborEfficiency: number;
  costPerPart: number;
}

export interface BackworkingPlan {
  pickoffOperations: PickoffOperation[];
  totalBackworkTime_seconds: number;
  parallelWithIndex: boolean;
  qualityCheckpoints: QualityCheckpoint[];
}

export interface PickoffOperation {
  operationId: string;
  type: 'face' | 'chamfer' | 'drill' | 'tap' | 'bore' | 'groove';
  toolPosition: number;
  cuttingTime_seconds: number;
  criticalForQuality: boolean;
}

export interface QualityCheckpoint {
  checkpointId: string;
  dimension: string;
  method: 'gauge' | 'probe' | 'visual';
  frequency: 'every_part' | 'sampling' | 'hourly';
  station: number;
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

export class MultiSpindleAutomaticEngine {
  readonly name = 'MultiSpindleAutomaticEngine';
  readonly version = '1.0.0';
  readonly description = 'Multi-spindle automatic lathe coordination engine';

  // Operation time factors by material
  private readonly materialFactors: Record<string, number> = {
    'aluminum': 0.7,
    'brass': 0.8,
    '12l14': 0.85,
    'steel_1018': 1.0,
    'steel_4140': 1.3,
    'stainless_303': 1.2,
    'stainless_316': 1.5,
    'titanium': 1.6
  };

  // Tool costs (relative units)
  private readonly toolCosts: Record<string, number> = {
    'form_tool': 150,
    'box_tool': 80,
    'swing_tool': 60,
    'drill': 25,
    'tap': 45,
    'thread_chaser': 120,
    'knurl': 70,
    'cutoff': 35,
    'boring_bar': 55
  };

  // ============================================================================
  // Station Assignment
  // ============================================================================

  /**
   * Assign operations to stations for optimal cycle time
   */
  assignStations(
    part: MultiSpindlePart,
    machine: MultiSpindleMachineConfig
  ): EngineResult<StationAssignment> {
    const reasoningChain: ReasoningStep[] = [];
    let stepNumber = 1;

    // Build operation dependency graph
    const operations = [...part.operations];

    // Sort operations by dependencies and type
    const sortedOps = this.topologicalSort(operations);

    reasoningChain.push({
      step: stepNumber++,
      engine: this.name,
      action: 'topologicalSort',
      input: { operationCount: operations.length },
      output: { sortedCount: sortedOps.length },
      confidence: 0.95,
      rationale: 'Sorted operations by dependencies'
    });

    // Initialize stations
    const stations: StationConfig[] = [];
    for (let i = 1; i <= machine.spindleCount; i++) {
      const slideType = this.determineSlideType(i, machine);
      stations.push({
        stationNumber: i,
        operations: [],
        totalTime_seconds: 0,
        utilizationPercent: 0,
        toolSlots: [],
        slideType,
        isBottleneck: false,
        notes: ''
      });
    }

    // Assign operations to stations
    const assignedOps = new Set<string>();

    // Phase 1: Assign constrained operations (specific position requirements)
    for (const op of sortedOps) {
      if (assignedOps.has(op.operationId)) continue;

      // Cutoff always goes last
      if (op.type === 'cutoff') {
        const lastStation = stations[machine.spindleCount - 1];
        this.assignOperationToStation(op, lastStation, stations);
        assignedOps.add(op.operationId);
        continue;
      }

      // Backwork goes to pickoff
      if (op.type === 'backwork' && machine.hasBackworking) {
        // Handled separately
        continue;
      }

      // End-working operations
      if (op.position === 'end' || op.position === 'id') {
        const endStation = stations.find(s =>
          s.slideType === 'end_working' && s.totalTime_seconds < this.getTargetCycleTime(part)
        );
        if (endStation) {
          this.assignOperationToStation(op, endStation, stations);
          assignedOps.add(op.operationId);
        }
      }
    }

    // Phase 2: Balance remaining operations across stations
    for (const op of sortedOps) {
      if (assignedOps.has(op.operationId)) continue;

      // Find station with lowest load that can accept this operation
      const eligibleStations = stations.filter(s =>
        this.canStationAccept(s, op, machine)
      );

      if (eligibleStations.length === 0) {
        return { success: false, error: `No eligible station for operation ${op.operationId}` };
      }

      // Select station with lowest current time
      const targetStation = eligibleStations.reduce((min, s) =>
        s.totalTime_seconds < min.totalTime_seconds ? s : min
      );

      this.assignOperationToStation(op, targetStation, stations);
      assignedOps.add(op.operationId);
    }

    reasoningChain.push({
      step: stepNumber++,
      engine: this.name,
      action: 'balanceStations',
      input: { operations: assignedOps.size },
      output: { stationsUsed: stations.filter(s => s.operations.length > 0).length },
      confidence: 0.88,
      rationale: 'Balanced operations across stations by load'
    });

    // Calculate cycle time (slowest station + index)
    const stationTimes = stations.map(s => s.totalTime_seconds);
    const cycleTime = Math.max(...stationTimes) + machine.indexTime_seconds;

    // Update utilization percentages
    const bottleneckTime = Math.max(...stationTimes);
    for (const station of stations) {
      station.utilizationPercent = (station.totalTime_seconds / bottleneckTime) * 100;
      station.isBottleneck = station.totalTime_seconds === bottleneckTime;
    }

    // Calculate tooling cost
    const toolingCost = this.calculateToolingCost(stations);

    // Utilization balance (how evenly loaded are stations)
    const avgUtil = stations.reduce((s, st) => s + st.utilizationPercent, 0) / stations.length;
    const utilVariance = stations.reduce((s, st) =>
      s + Math.pow(st.utilizationPercent - avgUtil, 2), 0
    ) / stations.length;
    const utilizationBalance = 100 - Math.sqrt(utilVariance);

    const bottleneckStation = stations.find(s => s.isBottleneck)?.stationNumber || 1;

    return { success: true, data: {
      stations,
      cycleTime_seconds: cycleTime,
      bottleneckStation,
      utilizationBalance,
      toolingCost,
      reasoningChain
    } };
  }

  private topologicalSort(operations: SpindleOperation[]): SpindleOperation[] {
    const sorted: SpindleOperation[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (op: SpindleOperation): void => {
      if (visited.has(op.operationId)) return;
      if (visiting.has(op.operationId)) {
        throw new Error(`Circular dependency at ${op.operationId}`);
      }

      visiting.add(op.operationId);

      // Visit dependencies first
      for (const depId of op.dependencies) {
        const depOp = operations.find(o => o.operationId === depId);
        if (depOp) visit(depOp);
      }

      visiting.delete(op.operationId);
      visited.add(op.operationId);
      sorted.push(op);
    };

    for (const op of operations) {
      visit(op);
    }

    return sorted;
  }

  private determineSlideType(
    station: number,
    machine: MultiSpindleMachineConfig
  ): 'cross' | 'end_working' | 'backwork' {
    // Typical 6-spindle layout: stations 1-4 cross, 5-6 end-working
    // Typical 8-spindle layout: stations 1-5 cross, 6-8 end-working
    if (machine.spindleCount === 6) {
      if (station <= 4) return 'cross';
      return 'end_working';
    } else {
      if (station <= 5) return 'cross';
      if (station === 8 && machine.hasBackworking) return 'backwork';
      return 'end_working';
    }
  }

  private getTargetCycleTime(part: MultiSpindlePart): number {
    // Calculate target based on annual volume
    const shiftsPerYear = 250 * 2; // 250 days, 2 shifts
    const hoursPerShift = 7.5; // effective hours
    const totalHours = shiftsPerYear * hoursPerShift;
    const targetPartsPerHour = part.annualVolume / totalHours;
    return 3600 / targetPartsPerHour; // target cycle time in seconds
  }

  private canStationAccept(
    station: StationConfig,
    op: SpindleOperation,
    machine: MultiSpindleMachineConfig
  ): boolean {
    // Check slide type compatibility
    if (op.position === 'end' || op.position === 'id') {
      if (station.slideType !== 'end_working') return false;
    }
    if (op.position === 'back') {
      if (station.slideType !== 'backwork') return false;
    }

    // Check tool slot availability
    const usedSlots = station.toolSlots.length;
    const maxSlots = station.slideType === 'cross' ? 3 : 2;
    if (usedSlots >= maxSlots) return false;

    return true;
  }

  private assignOperationToStation(
    op: SpindleOperation,
    station: StationConfig,
    allStations: StationConfig[]
  ): void {
    const sequence = station.operations.length + 1;
    const startTime = station.totalTime_seconds;
    const endTime = startTime + op.cuttingTime_seconds;

    station.operations.push({
      operationId: op.operationId,
      sequence,
      startTime_seconds: startTime,
      endTime_seconds: endTime,
      toolSlot: station.toolSlots.length + 1
    });

    station.totalTime_seconds = endTime;

    // Add tool slot
    const isShared = op.canShareTool && this.shouldShareTool(op, allStations);
    station.toolSlots.push({
      slotNumber: station.toolSlots.length + 1,
      toolType: op.toolType,
      toolId: `${op.toolType}_${station.stationNumber}_${station.toolSlots.length + 1}`,
      dedicatedOrShared: isShared ? 'shared' : 'dedicated',
      usedByStations: [station.stationNumber]
    });
  }

  private shouldShareTool(op: SpindleOperation, stations: StationConfig[]): boolean {
    // Don't share precision tools
    if (op.requiredPrecision === 'high') return false;

    // Share standard tools like drills and taps
    if (['drill', 'tap', 'chamfer'].includes(op.type)) return true;

    return false;
  }

  private calculateToolingCost(stations: StationConfig[]): number {
    let totalCost = 0;
    for (const station of stations) {
      for (const slot of station.toolSlots) {
        const baseCost = this.toolCosts[slot.toolType] || 50;
        // Shared tools cost less per station
        const costMultiplier = slot.dedicatedOrShared === 'shared' ?
          0.6 / slot.usedByStations.length : 1.0;
        totalCost += baseCost * costMultiplier;
      }
    }
    return totalCost;
  }

  // ============================================================================
  // Cycle Balance Analysis
  // ============================================================================

  /**
   * Analyze and suggest improvements to station balance
   */
  analyzeCycleBalance(
    assignment: StationAssignment,
    part: MultiSpindlePart
  ): EngineResult<CycleBalanceAnalysis> {
    const stations = assignment.stations;
    const bottleneckTime = Math.max(...stations.map(s => s.totalTime_seconds));

    // Calculate current imbalance
    const times = stations.map(s => s.totalTime_seconds);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxDev = Math.max(...times.map(t => Math.abs(t - avgTime)));
    const imbalance = (maxDev / avgTime) * 100;

    // Find slack times
    const slackTimes: StationSlack[] = stations.map(s => ({
      station: s.stationNumber,
      slackTime_seconds: bottleneckTime - s.totalTime_seconds,
      utilizationPercent: s.utilizationPercent,
      canAbsorbOperations: this.findAbsorbableOperations(s, part.operations, bottleneckTime)
    }));

    // Generate balance strategies
    const strategies: BalanceStrategy[] = [];
    const bottleneckStation = stations.find(s => s.isBottleneck);

    if (bottleneckStation) {
      // Try moving operations from bottleneck to underutilized stations
      for (const assignedOp of bottleneckStation.operations) {
        const op = part.operations.find(o => o.operationId === assignedOp.operationId);
        if (!op) continue;

        // Find potential target stations
        for (const slack of slackTimes) {
          if (slack.slackTime_seconds >= op.cuttingTime_seconds) {
            strategies.push({
              strategyId: `MOVE_${op.operationId}_TO_${slack.station}`,
              description: `Move ${op.type} from station ${bottleneckStation.stationNumber} to ${slack.station}`,
              moveOperation: op.operationId,
              fromStation: bottleneckStation.stationNumber,
              toStation: slack.station,
              expectedImprovement_percent: (op.cuttingTime_seconds / bottleneckTime) * 100,
              feasibility: op.dependencies.length === 0 ? 'easy' : 'moderate',
              toolingChange: true
            });
          }
        }
      }
    }

    // Sort strategies by expected improvement
    strategies.sort((a, b) => b.expectedImprovement_percent - a.expectedImprovement_percent);

    // Calculate achievable balance
    const bestStrategy = strategies[0];
    const achievableBalance = bestStrategy ?
      100 - (imbalance - bestStrategy.expectedImprovement_percent) : 100 - imbalance;

    return { success: true, data: {
      currentImbalance_percent: imbalance,
      bottleneckStation: assignment.bottleneckStation,
      bottleneckTime_seconds: bottleneckTime,
      slackTimes,
      balanceStrategies: strategies.slice(0, 5), // Top 5 strategies
      achievableBalance_percent: Math.min(100, achievableBalance)
    } };
  }

  private findAbsorbableOperations(
    station: StationConfig,
    allOps: SpindleOperation[],
    maxTime: number
  ): string[] {
    const slack = maxTime - station.totalTime_seconds;
    return allOps
      .filter(op => op.cuttingTime_seconds <= slack)
      .map(op => op.operationId);
  }

  // ============================================================================
  // Tooling Decision
  // ============================================================================

  /**
   * Decide dedicated vs shared tooling for cost optimization
   */
  decideTooling(
    assignment: StationAssignment,
    part: MultiSpindlePart,
    machine: MultiSpindleMachineConfig
  ): EngineResult<ToolingDecision> {
    const decisions: ToolDecision[] = [];
    let totalDedicated = 0;
    let totalShared = 0;
    let totalCost = 0;

    // Group tools by type across all stations
    const toolsByType = new Map<string, ToolSlot[]>();
    for (const station of assignment.stations) {
      for (const slot of station.toolSlots) {
        const existing = toolsByType.get(slot.toolType) || [];
        existing.push(slot);
        toolsByType.set(slot.toolType, existing);
      }
    }

    // Decide for each tool type
    for (const [toolType, slots] of toolsByType.entries()) {
      const baseCost = this.toolCosts[toolType] || 50;

      // Find operations using this tool type
      const ops = part.operations.filter(op => op.toolType === toolType);
      const highPrecision = ops.some(op => op.requiredPrecision === 'high');
      const usedAtStations = [...new Set(slots.map(s =>
        assignment.stations.find(st =>
          st.toolSlots.some(ts => ts.toolId === s.toolId)
        )?.stationNumber || 0
      ))].filter(n => n > 0);

      let decision: 'dedicated' | 'shared';
      let reasoning: string;
      let costImpact: number;

      if (highPrecision) {
        decision = 'dedicated';
        reasoning = 'High precision requirement mandates dedicated tooling';
        costImpact = baseCost * slots.length;
        totalDedicated += slots.length;
      } else if (slots.length === 1) {
        decision = 'dedicated';
        reasoning = 'Single use - no sharing benefit';
        costImpact = baseCost;
        totalDedicated++;
      } else if (usedAtStations.length > 1) {
        decision = 'shared';
        reasoning = `Shared across ${usedAtStations.length} stations reduces cost`;
        costImpact = baseCost * 0.6;
        totalShared++;
      } else {
        decision = 'dedicated';
        reasoning = 'Default to dedicated for reliability';
        costImpact = baseCost * slots.length;
        totalDedicated += slots.length;
      }

      decisions.push({
        toolId: slots[0].toolId,
        toolType,
        decision,
        usedAtStations,
        reasoning,
        costImpact
      });

      totalCost += costImpact;
    }

    // Calculate maintenance complexity
    const sharedRatio = totalShared / (totalDedicated + totalShared);
    const maintenanceComplexity: 'low' | 'medium' | 'high' =
      sharedRatio > 0.5 ? 'high' : sharedRatio > 0.2 ? 'medium' : 'low';

    // Changeover impact
    const changeoverImpact = totalDedicated * 2 + totalShared * 5; // minutes

    return { success: true, data: {
      decisions,
      totalDedicatedTools: totalDedicated,
      totalSharedTools: totalShared,
      estimatedToolingCost: totalCost,
      maintenanceComplexity,
      changeoverImpact_minutes: changeoverImpact
    } };
  }

  // ============================================================================
  // Index Optimization
  // ============================================================================

  /**
   * Optimize drum index time and timing
   */
  optimizeIndex(
    machine: MultiSpindleMachineConfig,
    assignment: StationAssignment
  ): EngineResult<IndexOptimization> {
    const currentIndex = machine.indexTime_seconds;
    const recommendations: IndexRecommendation[] = [];
    let totalGain = 0;

    // Analyze drum mass balance
    const stationLoads = assignment.stations.map(s => {
      // Estimate mass based on tool count and type
      let mass = 10; // base kg
      for (const slot of s.toolSlots) {
        const toolMass: Record<string, number> = {
          'form_tool': 2,
          'box_tool': 3,
          'swing_tool': 2.5,
          'drill': 0.5,
          'tap': 0.5,
          'boring_bar': 1.5
        };
        mass += toolMass[slot.toolType] || 1;
      }
      return { station: s.stationNumber, mass };
    });

    const masses = stationLoads.map(s => s.mass);
    const avgMass = masses.reduce((a, b) => a + b, 0) / masses.length;
    const heaviest = stationLoads.reduce((max, s) => s.mass > max.mass ? s : max);
    const lightest = stationLoads.reduce((min, s) => s.mass < min.mass ? s : min);
    const massImbalance = ((heaviest.mass - lightest.mass) / avgMass) * 100;

    const drumMassAnalysis: DrumMassBalance = {
      isBalanced: massImbalance < 10,
      heaviestStation: heaviest.station,
      lightestStation: lightest.station,
      imbalance_percent: massImbalance,
      recommendations: massImbalance > 10 ?
        ['Consider counterweights', 'Redistribute heavy tools'] : []
    };

    // Index speed recommendation
    if (currentIndex > 0.8) {
      recommendations.push({
        recommendationId: 'INDEX_SPEED_1',
        type: 'speed',
        description: 'Increase index motor speed by 10%',
        expectedGain_seconds: currentIndex * 0.1,
        implementationCost: 'low'
      });
      totalGain += currentIndex * 0.1;
    }

    // Acceleration profile
    if (currentIndex > 0.6) {
      recommendations.push({
        recommendationId: 'INDEX_ACCEL_1',
        type: 'acceleration',
        description: 'Optimize S-curve acceleration profile',
        expectedGain_seconds: 0.05,
        implementationCost: 'low'
      });
      totalGain += 0.05;
    }

    // Settling time
    if (drumMassAnalysis.isBalanced) {
      recommendations.push({
        recommendationId: 'INDEX_SETTLE_1',
        type: 'settling',
        description: 'Reduce settling dwell (balanced drum)',
        expectedGain_seconds: 0.08,
        implementationCost: 'low'
      });
      totalGain += 0.08;
    }

    // Preload optimization
    recommendations.push({
      recommendationId: 'INDEX_PRELOAD_1',
      type: 'preload',
      description: 'Pre-position next station tooling during cut',
      expectedGain_seconds: 0.1,
      implementationCost: 'medium'
    });
    totalGain += 0.1;

    const optimizedIndex = Math.max(0.3, currentIndex - totalGain);
    const improvement = ((currentIndex - optimizedIndex) / currentIndex) * 100;

    return { success: true, data: {
      currentIndexTime_seconds: currentIndex,
      optimizedIndexTime_seconds: optimizedIndex,
      improvement_percent: improvement,
      recommendations,
      drumMassAnalysis
    } };
  }

  // ============================================================================
  // Production Analysis
  // ============================================================================

  /**
   * Analyze production capacity and economics
   */
  analyzeProduction(
    assignment: StationAssignment,
    part: MultiSpindlePart,
    machine: MultiSpindleMachineConfig,
    laborRate_perHour: number = 50,
    machineRate_perHour: number = 150
  ): EngineResult<ProductionAnalysis> {
    const cycleTime = assignment.cycleTime_seconds;

    // Parts production
    const partsPerHour = 3600 / cycleTime;
    const partsPerShift = partsPerHour * 7.5; // 7.5 effective hours
    const partsPerDay = partsPerShift * 2; // 2 shifts
    const daysToFillOrder = part.annualVolume / partsPerDay;

    // Machine utilization
    const cuttingTime = assignment.stations.reduce(
      (sum, s) => sum + s.totalTime_seconds, 0
    ) / assignment.stations.length;
    const machineUtilization = (cuttingTime / cycleTime) * 100;

    // Labor efficiency (multi-spindle requires less operator attention)
    const laborEfficiency = 0.85 * (machine.spindleCount / 6); // scale with spindle count

    // Cost per part
    const laborCostPerPart = (laborRate_perHour / partsPerHour) * (1 / laborEfficiency);
    const machineCostPerPart = machineRate_perHour / partsPerHour;
    const toolingCostPerPart = assignment.toolingCost / (partsPerHour * 1000); // amortize over 1000 hours
    const costPerPart = laborCostPerPart + machineCostPerPart + toolingCostPerPart;

    return { success: true, data: {
      cycleTime_seconds: cycleTime,
      partsPerHour,
      partsPerShift,
      partsPerDay,
      daysToFillOrder,
      machineUtilization_percent: machineUtilization,
      laborEfficiency,
      costPerPart
    } };
  }

  // ============================================================================
  // Backworking Planning
  // ============================================================================

  /**
   * Plan backworking operations for pickoff spindle
   */
  planBackworking(
    part: MultiSpindlePart,
    machine: MultiSpindleMachineConfig
  ): EngineResult<BackworkingPlan> {
    if (!machine.hasBackworking) {
      return { success: true, data: {
        pickoffOperations: [],
        totalBackworkTime_seconds: 0,
        parallelWithIndex: false,
        qualityCheckpoints: []
      } };
    }

    // Find backwork operations
    const backOps = part.operations.filter(op => op.type === 'backwork' || op.position === 'back');

    const pickoffOperations: PickoffOperation[] = backOps.map((op, i) => ({
      operationId: op.operationId,
      type: this.mapToPickoffType(op.type),
      toolPosition: i + 1,
      cuttingTime_seconds: op.cuttingTime_seconds,
      criticalForQuality: op.requiredPrecision === 'high'
    }));

    const totalBackworkTime = pickoffOperations.reduce(
      (sum, op) => sum + op.cuttingTime_seconds, 0
    );

    // Check if backwork can happen during index
    const parallelWithIndex = totalBackworkTime <= machine.indexTime_seconds * 1.5;

    // Quality checkpoints
    const qualityCheckpoints: QualityCheckpoint[] = [];

    // Add checkpoints for critical dimensions
    for (const dim of part.criticalDimensions) {
      const hasBackworkOp = dim.affectedOperations.some(
        opId => backOps.some(op => op.operationId === opId)
      );
      if (hasBackworkOp) {
        qualityCheckpoints.push({
          checkpointId: `QC_${dim.dimensionId}`,
          dimension: dim.type,
          method: dim.tolerance_mm < 0.01 ? 'probe' : 'gauge',
          frequency: part.tolerance_class === 'ultra_precision' ? 'every_part' : 'sampling',
          station: machine.spindleCount // last station
        });
      }
    }

    return { success: true, data: {
      pickoffOperations,
      totalBackworkTime_seconds: totalBackworkTime,
      parallelWithIndex,
      qualityCheckpoints
    } };
  }

  private mapToPickoffType(opType: string): PickoffOperation['type'] {
    const mapping: Record<string, PickoffOperation['type']> = {
      'backwork': 'face',
      'face': 'face',
      'chamfer': 'chamfer',
      'drill': 'drill',
      'tap': 'tap',
      'bore': 'bore',
      'groove': 'groove'
    };
    return mapping[opType] || 'face';
  }

  // ============================================================================
  // Dispatcher Actions
  // ============================================================================

  async executeAction(
    action: string,
    params: Record<string, unknown>
  ): Promise<EngineResult<unknown>> {
    switch (action) {
      case 'multispindle_assign_stations':
        return this.assignStations(
          params.part as MultiSpindlePart,
          params.machine as MultiSpindleMachineConfig
        );

      case 'multispindle_analyze_balance':
        return this.analyzeCycleBalance(
          params.assignment as StationAssignment,
          params.part as MultiSpindlePart
        );

      case 'multispindle_decide_tooling':
        return this.decideTooling(
          params.assignment as StationAssignment,
          params.part as MultiSpindlePart,
          params.machine as MultiSpindleMachineConfig
        );

      case 'multispindle_optimize_index':
        return this.optimizeIndex(
          params.machine as MultiSpindleMachineConfig,
          params.assignment as StationAssignment
        );

      case 'multispindle_analyze_production':
        return this.analyzeProduction(
          params.assignment as StationAssignment,
          params.part as MultiSpindlePart,
          params.machine as MultiSpindleMachineConfig,
          params.laborRate as number | undefined,
          params.machineRate as number | undefined
        );

      case 'multispindle_plan_backworking':
        return this.planBackworking(
          params.part as MultiSpindlePart,
          params.machine as MultiSpindleMachineConfig
        );

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }
}

export const multiSpindleAutomaticEngine = new MultiSpindleAutomaticEngine();
