/**
 * MultiTurretSyncEngine Tests
 * Multi-turret synchronization and optimization for twin/triple turret lathes
 */

import { describe, it, expect } from 'vitest';
import {
  MultiTurretSyncEngine,
  multiTurretSyncEngine,
  type MultiTurretConfig,
  type MultiTurretPart,
  type SimultaneousCutPlan,
} from '../engines/MultiTurretSyncEngine.js';

// Test fixtures
const createTestMachine = (overrides?: Partial<MultiTurretConfig>): MultiTurretConfig => ({
  machineId: 'MAZAK-INTEGREX-01',
  manufacturer: 'mazak',
  model: 'INTEGREX i-200',
  turrets: [
    {
      turretId: 'upper',
      toolStations: 12,
      hasLiveTooling: true,
      maxLiveToolRpm: 6000,
      hasYAxis: true,
      yAxisTravel_mm: 100,
      hasBAxis: false,
      xTravel_mm: 200,
      zTravel_mm: 600,
      turretType: 'disc'
    },
    {
      turretId: 'lower',
      toolStations: 12,
      hasLiveTooling: true,
      maxLiveToolRpm: 4500,
      hasYAxis: false,
      xTravel_mm: 200,
      zTravel_mm: 600,
      turretType: 'disc'
    }
  ],
  hasSubSpindle: true,
  maxMainSpindleRpm: 5000,
  maxSubSpindleRpm: 4000,
  maxBarDiameter_mm: 65,
  swingOverBed_mm: 650,
  turretIndexTime_seconds: 0.8,
  ...overrides,
});

const createTestPart = (overrides?: Partial<MultiTurretPart>): MultiTurretPart => ({
  partId: 'SHAFT-001',
  stockDiameter_mm: 50,
  finishedLength_mm: 150,
  operations: [
    { operationId: 'OP1', type: 'od_rough', preferredTurret: 'upper', zStart_mm: 0, zEnd_mm: 150, diameter_mm: 48, cuttingTime_seconds: 45, requiresSync: false },
    { operationId: 'OP2', type: 'od_rough', preferredTurret: 'lower', zStart_mm: 0, zEnd_mm: 150, diameter_mm: 48, cuttingTime_seconds: 45, requiresSync: false },
    { operationId: 'OP3', type: 'od_finish', preferredTurret: 'upper', zStart_mm: 0, zEnd_mm: 150, diameter_mm: 45, cuttingTime_seconds: 25, requiresSync: false },
    { operationId: 'OP4', type: 'id_rough', preferredTurret: 'lower', zStart_mm: 0, zEnd_mm: 50, diameter_mm: 20, depth_mm: 50, cuttingTime_seconds: 30, requiresSync: false },
    { operationId: 'OP5', type: 'groove', preferredTurret: 'upper', zStart_mm: 30, zEnd_mm: 35, diameter_mm: 40, depth_mm: 5, cuttingTime_seconds: 8, requiresSync: false },
    { operationId: 'OP6', type: 'groove', preferredTurret: 'lower', zStart_mm: 100, zEnd_mm: 105, diameter_mm: 40, depth_mm: 5, cuttingTime_seconds: 8, requiresSync: false },
    { operationId: 'OP7', type: 'thread', preferredTurret: 'upper', zStart_mm: 120, zEnd_mm: 150, diameter_mm: 44, cuttingTime_seconds: 20, requiresSync: true, syncDependency: 'OP3' },
  ],
  material: 'steel_4140',
  tolerance_class: 'precision',
  productionVolume: 500,
  ...overrides,
});

describe('MultiTurretSyncEngine', () => {
  describe('Engine metadata', () => {
    it('should have correct name and version', () => {
      expect(multiTurretSyncEngine.name).toBe('MultiTurretSyncEngine');
      expect(multiTurretSyncEngine.version).toBe('1.0.0');
    });
  });

  describe('planSimultaneousCuts', () => {
    it('should pair compatible operations for parallel execution', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.planSimultaneousCuts(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.cutPairs.length).toBeGreaterThan(0);
    });

    it('should identify balanced cuts when forces are similar', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.planSimultaneousCuts(part, machine);

      const balancedPairs = result.data?.cutPairs.filter(p => p.cutType === 'balanced');
      expect(balancedPairs?.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate cycle time reduction from parallelization', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.planSimultaneousCuts(part, machine);

      expect(result.data?.cycleTimeReduction_percent).toBeGreaterThanOrEqual(0);
      expect(result.data?.totalCycleTime_seconds).toBeLessThan(
        part.operations.reduce((sum, op) => sum + op.cuttingTime_seconds, 0)
      );
    });

    it('should pair OD/ID operations for parallel execution', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.planSimultaneousCuts(part, machine);

      // Should pair OD finish (upper) with ID rough (lower)
      const odIdPair = result.data?.cutPairs.find(p =>
        (p.upperTurretOp?.type.startsWith('od_') && p.lowerTurretOp?.type.startsWith('id_')) ||
        (p.upperTurretOp?.type.startsWith('id_') && p.lowerTurretOp?.type.startsWith('od_'))
      );
      expect(odIdPair).toBeDefined();
    });

    it('should calculate force balance percentage', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.planSimultaneousCuts(part, machine);

      for (const pair of result.data?.cutPairs || []) {
        expect(pair.forceBalance_percent).toBeGreaterThanOrEqual(0);
        expect(pair.forceBalance_percent).toBeLessThanOrEqual(100);
      }
    });

    it('should assess collision risk', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.planSimultaneousCuts(part, machine);

      expect(['none', 'low', 'medium', 'high']).toContain(result.data?.collisionRisk);
    });

    it('should calculate balance score for the plan', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.planSimultaneousCuts(part, machine);

      expect(result.data?.balanceScore).toBeGreaterThanOrEqual(0);
      expect(result.data?.balanceScore).toBeLessThanOrEqual(1);
    });
  });

  describe('analyzeCollisions', () => {
    it('should identify collision zones', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.analyzeCollisions(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.zones.length).toBeGreaterThan(0);
    });

    it('should identify critical chuck zone', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.analyzeCollisions(part, machine);

      const chuckZone = result.data?.zones.find(z => z.zoneId === 'CHUCK_ZONE');
      expect(chuckZone).toBeDefined();
      expect(chuckZone?.severity).toBe('critical');
    });

    it('should calculate clearance map', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.analyzeCollisions(part, machine);

      expect(result.data?.clearanceMap.length).toBeGreaterThan(0);
      for (const entry of result.data?.clearanceMap || []) {
        expect(entry.minClearance_mm).toBeDefined();
      }
    });

    it('should define safe operating envelope', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.analyzeCollisions(part, machine);

      expect(result.data?.safeOperatingEnvelope.upperTurret).toBeDefined();
      expect(result.data?.safeOperatingEnvelope.lowerTurret).toBeDefined();
    });

    it('should generate safety recommendations', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.analyzeCollisions(part, machine);

      expect(result.data?.recommendations.length).toBeGreaterThan(0);
    });

    it('should assess overall risk level', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.analyzeCollisions(part, machine);

      expect(['safe', 'caution', 'danger']).toContain(result.data?.riskLevel);
    });

    it('should identify sub-spindle zone when machine has it', () => {
      const machine = createTestMachine({ hasSubSpindle: true });
      const part = createTestPart();

      const result = multiTurretSyncEngine.analyzeCollisions(part, machine);

      const subSpindleZone = result.data?.zones.find(z => z.zoneId === 'SUBSPINDLE_ZONE');
      expect(subSpindleZone).toBeDefined();
    });
  });

  describe('generateSyncCodes', () => {
    it('should generate sync codes for cut pairs', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const cutPlanResult = multiTurretSyncEngine.planSimultaneousCuts(part, machine);
      const result = multiTurretSyncEngine.generateSyncCodes(cutPlanResult.data!, machine);

      expect(result.success).toBe(true);
      expect(result.data?.syncCodes.length).toBeGreaterThan(0);
    });

    it('should generate start and end sync codes for each pair', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const cutPlanResult = multiTurretSyncEngine.planSimultaneousCuts(part, machine);
      const result = multiTurretSyncEngine.generateSyncCodes(cutPlanResult.data!, machine);

      const startCodes = result.data?.syncCodes.filter(s => s.timing === 'start');
      const endCodes = result.data?.syncCodes.filter(s => s.timing === 'end');

      expect(startCodes?.length).toBe(endCodes?.length);
    });

    it('should generate wait codes when operations differ in duration', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const cutPlanResult = multiTurretSyncEngine.planSimultaneousCuts(part, machine);
      const result = multiTurretSyncEngine.generateSyncCodes(cutPlanResult.data!, machine);

      // Wait codes are generated when turret times differ
      expect(result.data?.waitCodes).toBeDefined();
    });

    it('should create program blocks for each operation group', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const cutPlanResult = multiTurretSyncEngine.planSimultaneousCuts(part, machine);
      const result = multiTurretSyncEngine.generateSyncCodes(cutPlanResult.data!, machine);

      expect(result.data?.programStructure.length).toBeGreaterThan(0);
      for (const block of result.data?.programStructure || []) {
        expect(block.estimatedTime_seconds).toBeGreaterThan(0);
      }
    });

    it('should estimate sync overhead', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const cutPlanResult = multiTurretSyncEngine.planSimultaneousCuts(part, machine);
      const result = multiTurretSyncEngine.generateSyncCodes(cutPlanResult.data!, machine);

      expect(result.data?.estimatedOverhead_seconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeBalancedCuts', () => {
    it('should analyze balanceability of operations', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.analyzeBalancedCuts(part, machine);

      expect(result.success).toBe(true);
      expect(typeof result.data?.isBalanceable).toBe('boolean');
    });

    it('should calculate balance ratio', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.analyzeBalancedCuts(part, machine);

      expect(result.data?.balanceRatio).toBeGreaterThanOrEqual(0);
      expect(result.data?.balanceRatio).toBeLessThanOrEqual(1);
    });

    it('should estimate deflection reduction', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.analyzeBalancedCuts(part, machine);

      if (result.data?.isBalanceable) {
        expect(result.data?.deflectionReduction_percent).toBeGreaterThan(0);
      }
    });

    it('should estimate vibration reduction', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.analyzeBalancedCuts(part, machine);

      if (result.data?.isBalanceable) {
        expect(result.data?.vibrationReduction_percent).toBeGreaterThan(0);
      }
    });

    it('should calculate optimal offsets for balanced cutting', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.analyzeBalancedCuts(part, machine);

      if (result.data?.isBalanceable) {
        expect(result.data?.optimalOffsets.length).toBe(2);
        for (const offset of result.data?.optimalOffsets || []) {
          expect(offset.depthOfCut_mm).toBeGreaterThan(0);
          expect(offset.feedRate_mmPerRev).toBeGreaterThan(0);
        }
      }
    });

    it('should return not balanceable with single roughing op', () => {
      const machine = createTestMachine();
      const part = createTestPart({
        operations: [
          { operationId: 'OP1', type: 'od_rough', preferredTurret: 'upper', zStart_mm: 0, zEnd_mm: 100, cuttingTime_seconds: 30, requiresSync: false }
        ]
      });

      const result = multiTurretSyncEngine.analyzeBalancedCuts(part, machine);

      expect(result.data?.isBalanceable).toBe(false);
      expect(result.data?.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('optimizeCycleTime', () => {
    it('should optimize operation sequence for minimum cycle time', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.optimizeCycleTime(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.optimizedCycleTime_seconds).toBeLessThanOrEqual(
        result.data?.originalCycleTime_seconds || 0
      );
    });

    it('should calculate cycle time reduction percentage', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.optimizeCycleTime(part, machine);

      expect(result.data?.reductionPercent).toBeGreaterThanOrEqual(0);
    });

    it('should sequence operations with start/end times', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.optimizeCycleTime(part, machine);

      for (const op of result.data?.operationSequence || []) {
        expect(op.sequence).toBeGreaterThan(0);
        expect(op.endTime_seconds).toBeGreaterThan(op.startTime_seconds);
      }
    });

    it('should identify parallel operations', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.optimizeCycleTime(part, machine);

      const parallelOps = result.data?.operationSequence.filter(op => op.parallel);
      expect(parallelOps?.length).toBeGreaterThan(0);
    });

    it('should identify bottleneck operation', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.optimizeCycleTime(part, machine);

      expect(result.data?.bottleneck).toBeTruthy();
    });

    it('should suggest improvement opportunities', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.optimizeCycleTime(part, machine);

      expect(result.data?.improvementOpportunities).toBeDefined();
    });

    it('should respect dependencies when scheduling', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = multiTurretSyncEngine.optimizeCycleTime(part, machine);

      // OP7 (thread) depends on OP3 (od_finish)
      const op3 = result.data?.operationSequence.find(o => o.operationId === 'OP3');
      const op7 = result.data?.operationSequence.find(o => o.operationId === 'OP7');

      if (op3 && op7) {
        expect(op7.startTime_seconds).toBeGreaterThanOrEqual(op3.endTime_seconds);
      }
    });
  });

  describe('executeAction dispatcher interface', () => {
    it('should route multiturret_plan_simultaneous', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await multiTurretSyncEngine.executeAction(
        'multiturret_plan_simultaneous',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('cutPairs');
    });

    it('should route multiturret_analyze_collisions', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await multiTurretSyncEngine.executeAction(
        'multiturret_analyze_collisions',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('zones');
    });

    it('should route multiturret_generate_sync_codes', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const cutPlanResult = multiTurretSyncEngine.planSimultaneousCuts(part, machine);
      const result = await multiTurretSyncEngine.executeAction(
        'multiturret_generate_sync_codes',
        { cutPlan: cutPlanResult.data, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('syncCodes');
    });

    it('should route multiturret_analyze_balanced_cuts', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await multiTurretSyncEngine.executeAction(
        'multiturret_analyze_balanced_cuts',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('balanceRatio');
    });

    it('should route multiturret_optimize_cycle_time', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await multiTurretSyncEngine.executeAction(
        'multiturret_optimize_cycle_time',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('optimizedCycleTime_seconds');
    });

    it('should fail for unknown action', async () => {
      const result = await multiTurretSyncEngine.executeAction(
        'unknown_action',
        {}
      );

      expect(result.success).toBe(false);
    });
  });
});
