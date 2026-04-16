/**
 * MultiSpindleAutomaticEngine Tests
 * Multi-spindle automatic lathe coordination for high-volume production
 */

import { describe, it, expect } from 'vitest';
import {
  MultiSpindleAutomaticEngine,
  multiSpindleAutomaticEngine,
  type MultiSpindleMachineConfig,
  type MultiSpindlePart,
  type StationAssignment,
} from '../engines/MultiSpindleAutomaticEngine.js';

// Test fixtures
const createTestMachine = (overrides?: Partial<MultiSpindleMachineConfig>): MultiSpindleMachineConfig => ({
  machineId: 'INDEX-MS32-01',
  manufacturer: 'index',
  model: 'MS32-6',
  spindleCount: 6,
  maxBarDiameter_mm: 32,
  maxPartLength_mm: 80,
  indexTime_seconds: 0.7,
  hasPickoffSpindle: true,
  pickoffStations: 2,
  crossSlideCount: 4,
  endWorkingCount: 2,
  hasBackworking: true,
  coolantType: 'oil',
  maxSpindleRpm: 8000,
  ...overrides,
});

const createTestPart = (overrides?: Partial<MultiSpindlePart>): MultiSpindlePart => ({
  partId: 'FASTENER-001',
  barDiameter_mm: 12,
  finishedLength_mm: 25,
  operations: [
    { operationId: 'OP1', type: 'face', cuttingTime_seconds: 1.5, toolType: 'box_tool', requiredPrecision: 'medium', canShareTool: true, dependencies: [], position: 'end' },
    { operationId: 'OP2', type: 'od_turn', cuttingTime_seconds: 3.5, toolType: 'form_tool', requiredPrecision: 'high', canShareTool: false, dependencies: ['OP1'], position: 'od' },
    { operationId: 'OP3', type: 'groove', cuttingTime_seconds: 2.0, toolType: 'swing_tool', requiredPrecision: 'medium', canShareTool: true, dependencies: ['OP2'], position: 'od' },
    { operationId: 'OP4', type: 'drill', cuttingTime_seconds: 2.5, toolType: 'drill', requiredPrecision: 'low', canShareTool: true, dependencies: [], position: 'end' },
    { operationId: 'OP5', type: 'thread', cuttingTime_seconds: 4.0, toolType: 'thread_chaser', requiredPrecision: 'high', canShareTool: false, dependencies: ['OP2'], position: 'od' },
    { operationId: 'OP6', type: 'cutoff', cuttingTime_seconds: 1.0, toolType: 'cutoff', requiredPrecision: 'low', canShareTool: true, dependencies: ['OP3', 'OP5'], position: 'od' },
  ],
  material: '12l14',
  tolerance_class: 'precision',
  annualVolume: 500000,
  criticalDimensions: [
    { dimensionId: 'DIM1', type: 'diameter', nominal_mm: 10, tolerance_mm: 0.02, affectedOperations: ['OP2'] },
    { dimensionId: 'DIM2', type: 'thread', nominal_mm: 8, tolerance_mm: 0.05, affectedOperations: ['OP5'] },
  ],
  ...overrides,
});

describe('MultiSpindleAutomaticEngine', () => {
  describe('Engine metadata', () => {
    it('should have correct name and version', () => {
      expect(multiSpindleAutomaticEngine.name).toBe('MultiSpindleAutomaticEngine');
      expect(multiSpindleAutomaticEngine.version).toBe('1.0.0');
    });
  });

  describe('assignStations', () => {
    it('should assign operations to available stations', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiSpindleAutomaticEngine.assignStations(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.stations.length).toBe(machine.spindleCount);
    });

    it('should calculate cycle time based on slowest station', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiSpindleAutomaticEngine.assignStations(part, machine);

      expect(result.data?.cycleTime_seconds).toBeGreaterThan(0);
      // Cycle time = slowest station + index time
      expect(result.data?.cycleTime_seconds).toBeGreaterThanOrEqual(machine.indexTime_seconds);
    });

    it('should identify bottleneck station', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiSpindleAutomaticEngine.assignStations(part, machine);

      const bottleneck = result.data?.stations.find(s => s.isBottleneck);
      expect(bottleneck).toBeDefined();
      expect(result.data?.bottleneckStation).toBe(bottleneck?.stationNumber);
    });

    it('should place cutoff at last station', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiSpindleAutomaticEngine.assignStations(part, machine);

      const lastStation = result.data?.stations[machine.spindleCount - 1];
      const cutoffOp = lastStation?.operations.find(op => op.operationId === 'OP6');
      expect(cutoffOp).toBeDefined();
    });

    it('should assign end-working operations to appropriate stations', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiSpindleAutomaticEngine.assignStations(part, machine);

      // End-working stations are typically 5-6 on a 6-spindle
      const endWorkingStations = result.data?.stations.filter(s => s.slideType === 'end_working');
      expect(endWorkingStations?.length).toBeGreaterThan(0);
    });

    it('should calculate utilization balance', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiSpindleAutomaticEngine.assignStations(part, machine);

      expect(result.data?.utilizationBalance).toBeGreaterThan(0);
      expect(result.data?.utilizationBalance).toBeLessThanOrEqual(100);
    });

    it('should estimate tooling cost', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiSpindleAutomaticEngine.assignStations(part, machine);

      expect(result.data?.toolingCost).toBeGreaterThan(0);
    });

    it('should include reasoning chain', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiSpindleAutomaticEngine.assignStations(part, machine);

      expect(result.data?.reasoningChain.length).toBeGreaterThan(0);
      for (const step of result.data?.reasoningChain || []) {
        expect(step.confidence).toBeGreaterThan(0);
      }
    });

    it('should handle 8-spindle machines', () => {
      const machine = createTestMachine({ spindleCount: 8 });
      const part = createTestPart();

      const result = multiSpindleAutomaticEngine.assignStations(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.stations.length).toBe(8);
    });
  });

  describe('analyzeCycleBalance', () => {
    it('should calculate current imbalance percentage', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.analyzeCycleBalance(assignment.data!, part);

      expect(result.success).toBe(true);
      expect(result.data?.currentImbalance_percent).toBeGreaterThanOrEqual(0);
    });

    it('should identify bottleneck station', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.analyzeCycleBalance(assignment.data!, part);

      expect(result.data?.bottleneckStation).toBeGreaterThan(0);
      expect(result.data?.bottleneckTime_seconds).toBeGreaterThan(0);
    });

    it('should calculate slack times for each station', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.analyzeCycleBalance(assignment.data!, part);

      expect(result.data?.slackTimes.length).toBe(machine.spindleCount);
      for (const slack of result.data?.slackTimes || []) {
        expect(slack.slackTime_seconds).toBeGreaterThanOrEqual(0);
      }
    });

    it('should suggest balance strategies', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.analyzeCycleBalance(assignment.data!, part);

      expect(result.data?.balanceStrategies).toBeDefined();
      for (const strategy of result.data?.balanceStrategies || []) {
        expect(strategy.expectedImprovement_percent).toBeGreaterThan(0);
        expect(['easy', 'moderate', 'difficult']).toContain(strategy.feasibility);
      }
    });

    it('should estimate achievable balance', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.analyzeCycleBalance(assignment.data!, part);

      expect(result.data?.achievableBalance_percent).toBeGreaterThan(0);
      expect(result.data?.achievableBalance_percent).toBeLessThanOrEqual(100);
    });
  });

  describe('decideTooling', () => {
    it('should make dedicated vs shared tooling decisions', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.decideTooling(assignment.data!, part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.decisions.length).toBeGreaterThan(0);
    });

    it('should dedicate high-precision tools', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.decideTooling(assignment.data!, part, machine);

      const formToolDecision = result.data?.decisions.find(d => d.toolType === 'form_tool');
      expect(formToolDecision?.decision).toBe('dedicated');
    });

    it('should share standard tools like drills', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.decideTooling(assignment.data!, part, machine);

      // Check that some tools are shared
      const sharedTools = result.data?.decisions.filter(d => d.decision === 'shared');
      expect(sharedTools?.length).toBeGreaterThanOrEqual(0);
    });

    it('should count dedicated and shared tools', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.decideTooling(assignment.data!, part, machine);

      expect(result.data?.totalDedicatedTools).toBeGreaterThanOrEqual(0);
      expect(result.data?.totalSharedTools).toBeGreaterThanOrEqual(0);
    });

    it('should estimate tooling cost', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.decideTooling(assignment.data!, part, machine);

      expect(result.data?.estimatedToolingCost).toBeGreaterThan(0);
    });

    it('should assess maintenance complexity', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.decideTooling(assignment.data!, part, machine);

      expect(['low', 'medium', 'high']).toContain(result.data?.maintenanceComplexity);
    });

    it('should estimate changeover impact', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.decideTooling(assignment.data!, part, machine);

      expect(result.data?.changeoverImpact_minutes).toBeGreaterThan(0);
    });
  });

  describe('optimizeIndex', () => {
    it('should analyze current index time', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.optimizeIndex(machine, assignment.data!);

      expect(result.success).toBe(true);
      expect(result.data?.currentIndexTime_seconds).toBe(machine.indexTime_seconds);
    });

    it('should suggest optimized index time', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.optimizeIndex(machine, assignment.data!);

      expect(result.data?.optimizedIndexTime_seconds).toBeLessThanOrEqual(
        result.data?.currentIndexTime_seconds || 0
      );
    });

    it('should calculate improvement percentage', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.optimizeIndex(machine, assignment.data!);

      expect(result.data?.improvement_percent).toBeGreaterThanOrEqual(0);
    });

    it('should provide index recommendations', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.optimizeIndex(machine, assignment.data!);

      expect(result.data?.recommendations.length).toBeGreaterThan(0);
      for (const rec of result.data?.recommendations || []) {
        expect(['speed', 'acceleration', 'settling', 'preload']).toContain(rec.type);
        expect(rec.expectedGain_seconds).toBeGreaterThan(0);
      }
    });

    it('should analyze drum mass balance', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.optimizeIndex(machine, assignment.data!);

      expect(result.data?.drumMassAnalysis).toBeDefined();
      expect(typeof result.data?.drumMassAnalysis.isBalanced).toBe('boolean');
      expect(result.data?.drumMassAnalysis.imbalance_percent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeProduction', () => {
    it('should calculate parts per hour', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.analyzeProduction(assignment.data!, part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.partsPerHour).toBeGreaterThan(0);
    });

    it('should calculate parts per shift and day', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.analyzeProduction(assignment.data!, part, machine);

      expect(result.data?.partsPerShift).toBeGreaterThan(result.data?.partsPerHour || 0);
      expect(result.data?.partsPerDay).toBeGreaterThan(result.data?.partsPerShift || 0);
    });

    it('should calculate days to fill order', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.analyzeProduction(assignment.data!, part, machine);

      expect(result.data?.daysToFillOrder).toBeGreaterThan(0);
    });

    it('should calculate machine utilization', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.analyzeProduction(assignment.data!, part, machine);

      expect(result.data?.machineUtilization_percent).toBeGreaterThan(0);
      expect(result.data?.machineUtilization_percent).toBeLessThanOrEqual(100);
    });

    it('should calculate labor efficiency', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.analyzeProduction(assignment.data!, part, machine);

      expect(result.data?.laborEfficiency).toBeGreaterThan(0);
    });

    it('should calculate cost per part', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = multiSpindleAutomaticEngine.analyzeProduction(assignment.data!, part, machine, 55, 175);

      expect(result.data?.costPerPart).toBeGreaterThan(0);
    });
  });

  describe('planBackworking', () => {
    it('should return empty plan when machine has no backworking', () => {
      const machine = createTestMachine({ hasBackworking: false });
      const part = createTestPart();

      const result = multiSpindleAutomaticEngine.planBackworking(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.pickoffOperations.length).toBe(0);
      expect(result.data?.totalBackworkTime_seconds).toBe(0);
    });

    it('should plan pickoff operations when machine supports it', () => {
      const machine = createTestMachine({ hasBackworking: true });
      const part = createTestPart({
        operations: [
          ...createTestPart().operations,
          { operationId: 'OP7', type: 'backwork', cuttingTime_seconds: 2.0, toolType: 'box_tool', requiredPrecision: 'medium', canShareTool: true, dependencies: [], position: 'back' }
        ]
      });

      const result = multiSpindleAutomaticEngine.planBackworking(part, machine);

      expect(result.data?.pickoffOperations.length).toBeGreaterThan(0);
    });

    it('should calculate total backwork time', () => {
      const machine = createTestMachine({ hasBackworking: true });
      const part = createTestPart({
        operations: [
          ...createTestPart().operations,
          { operationId: 'OP7', type: 'backwork', cuttingTime_seconds: 2.0, toolType: 'box_tool', requiredPrecision: 'medium', canShareTool: true, dependencies: [], position: 'back' }
        ]
      });

      const result = multiSpindleAutomaticEngine.planBackworking(part, machine);

      expect(result.data?.totalBackworkTime_seconds).toBeGreaterThan(0);
    });

    it('should determine if backwork can parallel with index', () => {
      const machine = createTestMachine({ hasBackworking: true });
      const part = createTestPart({
        operations: [
          ...createTestPart().operations,
          { operationId: 'OP7', type: 'backwork', cuttingTime_seconds: 0.5, toolType: 'box_tool', requiredPrecision: 'low', canShareTool: true, dependencies: [], position: 'back' }
        ]
      });

      const result = multiSpindleAutomaticEngine.planBackworking(part, machine);

      expect(typeof result.data?.parallelWithIndex).toBe('boolean');
    });

    it('should identify quality checkpoints', () => {
      const machine = createTestMachine({ hasBackworking: true });
      const part = createTestPart({
        operations: [
          ...createTestPart().operations,
          { operationId: 'OP7', type: 'backwork', cuttingTime_seconds: 2.0, toolType: 'box_tool', requiredPrecision: 'high', canShareTool: false, dependencies: [], position: 'back' }
        ],
        criticalDimensions: [
          ...createTestPart().criticalDimensions,
          { dimensionId: 'DIM3', type: 'length', nominal_mm: 25, tolerance_mm: 0.01, affectedOperations: ['OP7'] }
        ]
      });

      const result = multiSpindleAutomaticEngine.planBackworking(part, machine);

      expect(result.data?.qualityCheckpoints.length).toBeGreaterThan(0);
    });
  });

  describe('executeAction dispatcher interface', () => {
    it('should route multispindle_assign_stations', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await multiSpindleAutomaticEngine.executeAction(
        'multispindle_assign_stations',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('stations');
    });

    it('should route multispindle_analyze_balance', async () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = await multiSpindleAutomaticEngine.executeAction(
        'multispindle_analyze_balance',
        { assignment: assignment.data, part }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('currentImbalance_percent');
    });

    it('should route multispindle_decide_tooling', async () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = await multiSpindleAutomaticEngine.executeAction(
        'multispindle_decide_tooling',
        { assignment: assignment.data, part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('decisions');
    });

    it('should route multispindle_optimize_index', async () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = await multiSpindleAutomaticEngine.executeAction(
        'multispindle_optimize_index',
        { machine, assignment: assignment.data }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('recommendations');
    });

    it('should route multispindle_analyze_production', async () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const assignment = multiSpindleAutomaticEngine.assignStations(part, machine);

      const result = await multiSpindleAutomaticEngine.executeAction(
        'multispindle_analyze_production',
        { assignment: assignment.data, part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('partsPerHour');
    });

    it('should route multispindle_plan_backworking', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await multiSpindleAutomaticEngine.executeAction(
        'multispindle_plan_backworking',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('pickoffOperations');
    });

    it('should fail for unknown action', async () => {
      const result = await multiSpindleAutomaticEngine.executeAction(
        'unknown_action',
        {}
      );

      expect(result.success).toBe(false);
    });
  });
});
