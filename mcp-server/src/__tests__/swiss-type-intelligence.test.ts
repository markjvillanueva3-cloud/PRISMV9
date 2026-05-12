/**
 * SwissTypeIntelligenceEngine Tests
 * Deep Swiss-type machine intelligence for sliding headstock lathes
 */

import { describe, it, expect } from 'vitest';
import {
  SwissTypeIntelligenceEngine,
  swissTypeIntelligenceEngine,
  type SwissMachineConfig,
  type SwissPartDefinition,
} from '../engines/SwissTypeIntelligenceEngine.js';

// Test fixtures
const createTestMachine = (overrides?: Partial<SwissMachineConfig>): SwissMachineConfig => ({
  machineId: 'CITIZEN-L20-01',
  manufacturer: 'citizen',
  model: 'L20-XII',
  maxBarDiameter_mm: 20,
  guideBushingType: 'rotating',
  gangToolPositions: 8,
  backToolPositions: 5,
  hasSubSpindle: true,
  subSpindleTravel_mm: 180,
  hasYAxis: true,
  yAxisTravel_mm: 40,
  hasBAxis: false,
  maxMainSpindleRpm: 10000,
  maxSubSpindleRpm: 8000,
  coolantType: 'oil',
  ...overrides,
});

const createTestPart = (overrides?: Partial<SwissPartDefinition>): SwissPartDefinition => ({
  partId: 'MEDICAL-PIN-001',
  barDiameter_mm: 6,
  finishedLength_mm: 45,
  maxOD_mm: 5.8,
  minID_mm: 1.5,
  features: [
    { featureId: 'F1', type: 'od_turn', location: 'front', zStart_mm: 0, zEnd_mm: 30, diameter_mm: 5.8 },
    { featureId: 'F2', type: 'groove', location: 'front', zStart_mm: 15, zEnd_mm: 16, diameter_mm: 4.5, depth_mm: 0.65 },
    { featureId: 'F3', type: 'thread', location: 'front', zStart_mm: 25, zEnd_mm: 35, diameter_mm: 5, threadPitch_mm: 0.5 },
    { featureId: 'F4', type: 'cross_hole', location: 'front', zStart_mm: 20, zEnd_mm: 20, diameter_mm: 1.5, depth_mm: 3 },
    { featureId: 'F5', type: 'backwork_face', location: 'back', zStart_mm: 45, zEnd_mm: 45, depth_mm: 0.3 },
    { featureId: 'F6', type: 'backwork_bore', location: 'back', zStart_mm: 42, zEnd_mm: 45, diameter_mm: 2, depth_mm: 3 },
  ],
  material: 'stainless_316',
  tolerance_class: 'precision',
  surfaceFinish_Ra: 0.8,
  annualVolume: 50000,
  ...overrides,
});

describe('SwissTypeIntelligenceEngine', () => {
  describe('Engine metadata', () => {
    it('should have correct name and version', () => {
      expect(swissTypeIntelligenceEngine.name).toBe('SwissTypeIntelligenceEngine');
      expect(swissTypeIntelligenceEngine.version).toBe('1.0.0');
    });
  });

  describe('analyzeGuideBushing', () => {
    it('should recommend guide bushing for high L/D ratio parts', () => {
      const machine = createTestMachine();
      const part = createTestPart({ finishedLength_mm: 60, barDiameter_mm: 5 }); // L/D = 12

      const result = swissTypeIntelligenceEngine.analyzeGuideBushing(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.recommendation).toBe('use_bushing');
      expect(result.data?.deflectionRisk).toBe('high');
      expect(result.data?.ldRatio).toBe(12);
    });

    it('should allow bushingless for low L/D ratio standard parts', () => {
      const machine = createTestMachine();
      const part = createTestPart({
        finishedLength_mm: 10,
        barDiameter_mm: 8,
        tolerance_class: 'standard'
      }); // L/D = 1.25

      const result = swissTypeIntelligenceEngine.analyzeGuideBushing(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.recommendation).toBe('bushingless');
      expect(result.data?.deflectionRisk).toBe('low');
    });

    it('should prefer bushing for ultra-precision even with medium L/D', () => {
      const machine = createTestMachine();
      const part = createTestPart({
        finishedLength_mm: 25,
        barDiameter_mm: 5,
        tolerance_class: 'ultra_precision'
      }); // L/D = 5

      const result = swissTypeIntelligenceEngine.analyzeGuideBushing(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.recommendation).toBe('use_bushing');
    });

    it('should consider material when calculating effective L/D', () => {
      const machine = createTestMachine();
      const aluminumPart = createTestPart({ material: 'aluminum_6061', finishedLength_mm: 40, barDiameter_mm: 6 });
      const titaniumPart = createTestPart({ material: 'titanium_6al4v', finishedLength_mm: 40, barDiameter_mm: 6 });

      const alResult = swissTypeIntelligenceEngine.analyzeGuideBushing(aluminumPart, machine);
      const tiResult = swissTypeIntelligenceEngine.analyzeGuideBushing(titaniumPart, machine);

      // Same L/D but titanium is harder to cut, increasing effective deflection risk
      expect(tiResult.data?.deflectionRisk).toBe('high');
      // Aluminum easier to cut
      expect(['medium', 'low']).toContain(alResult.data?.deflectionRisk);
    });

    it('should assess bushing wear based on volume and material', () => {
      const machine = createTestMachine();
      const highVolumePart = createTestPart({ annualVolume: 150000, material: 'inconel_718' });

      const result = swissTypeIntelligenceEngine.analyzeGuideBushing(highVolumePart, machine);

      expect(result.data?.bushingWear).toBe('significant');
    });

    it('should report minimal wear for soft materials at low volume', () => {
      const machine = createTestMachine();
      const lowVolumePart = createTestPart({ annualVolume: 5000, material: 'brass' });

      const result = swissTypeIntelligenceEngine.analyzeGuideBushing(lowVolumePart, machine);

      expect(result.data?.bushingWear).toBe('minimal');
    });
  });

  describe('optimizeGangToolLayout', () => {
    it('should assign tools to gang positions based on operations', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const tools = ['DNMG_150608', 'GIP_3.0_L', 'THREAD_16ER_05', 'CARBIDE_DRILL_1.5', 'CHAMFER_45'];

      const result = swissTypeIntelligenceEngine.optimizeGangToolLayout(part, machine, tools);

      expect(result.success).toBe(true);
      expect(result.data?.totalTools).toBeGreaterThan(0);
      expect(result.data?.positions.length).toBeLessThanOrEqual(machine.gangToolPositions);
    });

    it('should identify live tool operations', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const tools = ['DNMG_150608', 'ENDMILL_3.0'];

      const result = swissTypeIntelligenceEngine.optimizeGangToolLayout(part, machine, tools);

      const liveTools = result.data?.positions.filter(p => p.isLive);
      expect(liveTools?.length).toBeGreaterThan(0);
    });

    it('should determine optimal tool change strategy', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const tools = ['DNMG_150608', 'GIP_3.0', 'THREAD_16ER'];

      const result = swissTypeIntelligenceEngine.optimizeGangToolLayout(part, machine, tools);

      expect(['index', 'slide', 'combined']).toContain(result.data?.toolChangeStrategy);
      expect(result.data?.estimatedCycleImpact_seconds).toBeGreaterThanOrEqual(0);
    });

    it('should assign RPM for live tools based on material', () => {
      const machine = createTestMachine();
      const part = createTestPart({ material: 'aluminum_6061' });
      const tools = ['ENDMILL_3.0'];

      const result = swissTypeIntelligenceEngine.optimizeGangToolLayout(part, machine, tools);

      const liveTool = result.data?.positions.find(p => p.isLive);
      expect(liveTool?.rpmIfLive).toBeGreaterThan(3000); // Aluminum allows higher speeds
    });
  });

  describe('planSpindleSync', () => {
    it('should fail gracefully when machine has no sub-spindle', () => {
      const machine = createTestMachine({ hasSubSpindle: false });
      const part = createTestPart();

      const result = swissTypeIntelligenceEngine.planSpindleSync(part, machine);

      expect(result.success).toBe(false);
      expect(result.error).toContain('sub-spindle');
    });

    it('should generate sync points for handoff and cutoff', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = swissTypeIntelligenceEngine.planSpindleSync(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.syncPoints.length).toBeGreaterThanOrEqual(3);

      const syncDescriptions = result.data?.syncPoints.map(s => s.description);
      expect(syncDescriptions?.some(d => d.includes('pickup'))).toBe(true);
      expect(syncDescriptions?.some(d => d.includes('transfer') || d.includes('handoff'))).toBe(true);
    });

    it('should identify overlap opportunities', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = swissTypeIntelligenceEngine.planSpindleSync(part, machine);

      expect(result.data?.overlapOperations.length).toBeGreaterThanOrEqual(0);
      expect(result.data?.cycleTimeReduction_percent).toBeGreaterThanOrEqual(0);
    });

    it('should choose simultaneous clamp for small precision parts', () => {
      const machine = createTestMachine();
      const part = createTestPart({
        barDiameter_mm: 2.5,
        tolerance_class: 'ultra_precision'
      });

      const result = swissTypeIntelligenceEngine.planSpindleSync(part, machine);

      expect(result.data?.handoffMethod).toBe('simultaneous_clamp');
    });

    it('should identify collision zones', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = swissTypeIntelligenceEngine.planSpindleSync(part, machine);

      expect(result.data?.collisionZones.length).toBeGreaterThan(0);
      const cutoffZone = result.data?.collisionZones.find(z => z.zoneId.includes('CUTOFF'));
      expect(cutoffZone).toBeDefined();
    });
  });

  describe('planBarFeeding', () => {
    it('should calculate parts per bar correctly', () => {
      const machine = createTestMachine();
      const part = createTestPart({ finishedLength_mm: 20 });
      const barLength = 3000;

      const result = swissTypeIntelligenceEngine.planBarFeeding(part, machine, barLength);

      expect(result.success).toBe(true);
      // Cutoff width ~2.5mm, so ~22.5mm per part, about 130 parts from 3m bar
      expect(result.data?.partsPerBar).toBeGreaterThan(100);
      expect(result.data?.partsPerBar).toBeLessThan(150);
    });

    it('should calculate material utilization', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = swissTypeIntelligenceEngine.planBarFeeding(part, machine);

      expect(result.data?.materialUtilization_percent).toBeGreaterThan(50);
      expect(result.data?.materialUtilization_percent).toBeLessThanOrEqual(100);
    });

    it('should recommend automatic bar change for high frequency', () => {
      const machine = createTestMachine();
      const part = createTestPart({ finishedLength_mm: 100 }); // Fewer parts per bar

      const result = swissTypeIntelligenceEngine.planBarFeeding(part, machine);

      // With longer parts, more bar changes needed
      expect(result.data?.barChangeFrequency).toBeGreaterThan(0);
    });

    it('should select feed method based on part geometry', () => {
      const machine = createTestMachine();
      const smallPart = createTestPart({ barDiameter_mm: 3 });
      const longPart = createTestPart({ finishedLength_mm: 80, barDiameter_mm: 6 }); // L/D > 10

      const smallResult = swissTypeIntelligenceEngine.planBarFeeding(smallPart, machine);
      const longResult = swissTypeIntelligenceEngine.planBarFeeding(longPart, machine);

      expect(smallResult.data?.feedMethod).toBe('collet_advance');
      expect(longResult.data?.feedMethod).toBe('pull');
    });
  });

  describe('planBackworking', () => {
    it('should fail when machine has no sub-spindle', () => {
      const machine = createTestMachine({ hasSubSpindle: false });
      const part = createTestPart();

      const result = swissTypeIntelligenceEngine.planBackworking(part, machine);

      expect(result.success).toBe(false);
    });

    it('should return empty plan when no back features', () => {
      const machine = createTestMachine();
      const part = createTestPart({
        features: [
          { featureId: 'F1', type: 'od_turn', location: 'front', zStart_mm: 0, zEnd_mm: 20 }
        ]
      });

      const result = swissTypeIntelligenceEngine.planBackworking(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.operations.length).toBe(0);
    });

    it('should generate operations for back features', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = swissTypeIntelligenceEngine.planBackworking(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.operations.length).toBeGreaterThan(0);
    });

    it('should calculate backwork cycle time', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = swissTypeIntelligenceEngine.planBackworking(part, machine);

      expect(result.data?.backworkCycleTime_seconds).toBeGreaterThan(0);
    });

    it('should mark quality-critical operations', () => {
      const machine = createTestMachine();
      const part = createTestPart({
        features: [
          { featureId: 'F1', type: 'backwork_thread', location: 'back', zStart_mm: 40, zEnd_mm: 45, threadPitch_mm: 0.5 }
        ],
        tolerance_class: 'precision'
      });

      const result = swissTypeIntelligenceEngine.planBackworking(part, machine);

      expect(result.data?.qualityCritical).toBe(true);
    });

    it('should determine sub-spindle approach direction', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = swissTypeIntelligenceEngine.planBackworking(part, machine);

      expect(['axial', 'radial', 'combined']).toContain(result.data?.subSpindleApproach);
    });
  });

  describe('generateProcessPlan', () => {
    it('should generate comprehensive process plan', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const tools = ['DNMG_150608', 'GIP_3.0', 'THREAD_16ER', 'DRILL_1.5', 'CHAMFER_45'];

      const result = swissTypeIntelligenceEngine.generateProcessPlan(part, machine, tools);

      expect(result.success).toBe(true);
      expect(result.data?.guideBushing).toBeDefined();
      expect(result.data?.gangLayout).toBeDefined();
      expect(result.data?.spindleSync).toBeDefined();
      expect(result.data?.barFeed).toBeDefined();
      expect(result.data?.backworking).toBeDefined();
    });

    it('should include reasoning chain with confidence scores', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const tools = ['DNMG_150608'];

      const result = swissTypeIntelligenceEngine.generateProcessPlan(part, machine, tools);

      expect(result.data?.reasoningChain.length).toBeGreaterThan(0);
      for (const step of result.data?.reasoningChain || []) {
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
        expect(step.rationale).toBeTruthy();
      }
    });

    it('should estimate cycle time and production rate', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const tools = ['DNMG_150608'];

      const result = swissTypeIntelligenceEngine.generateProcessPlan(part, machine, tools);

      expect(result.data?.estimatedCycleTime_seconds).toBeGreaterThan(0);
      expect(result.data?.productionRate_partsPerHour).toBeGreaterThan(0);
    });

    it('should estimate setup time', () => {
      const machine = createTestMachine();
      const part = createTestPart();
      const tools = ['DNMG_150608', 'GIP_3.0', 'THREAD_16ER'];

      const result = swissTypeIntelligenceEngine.generateProcessPlan(part, machine, tools);

      expect(result.data?.setupTime_minutes).toBeGreaterThan(30);
    });
  });

  describe('executeAction dispatcher interface', () => {
    it('should route swiss_analyze_guide_bushing', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await swissTypeIntelligenceEngine.executeAction(
        'swiss_analyze_guide_bushing',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('recommendation');
    });

    it('should route swiss_optimize_gang_layout', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await swissTypeIntelligenceEngine.executeAction(
        'swiss_optimize_gang_layout',
        { part, machine, availableTools: ['DNMG', 'DRILL'] }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('positions');
    });

    it('should route swiss_plan_spindle_sync', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await swissTypeIntelligenceEngine.executeAction(
        'swiss_plan_spindle_sync',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('syncPoints');
    });

    it('should route swiss_plan_bar_feeding', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await swissTypeIntelligenceEngine.executeAction(
        'swiss_plan_bar_feeding',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('partsPerBar');
    });

    it('should route swiss_plan_backworking', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await swissTypeIntelligenceEngine.executeAction(
        'swiss_plan_backworking',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('operations');
    });

    it('should route swiss_generate_process_plan', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await swissTypeIntelligenceEngine.executeAction(
        'swiss_generate_process_plan',
        { part, machine, availableTools: ['DNMG'] }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('reasoningChain');
    });

    it('should fail for unknown action', async () => {
      const result = await swissTypeIntelligenceEngine.executeAction(
        'unknown_action',
        {}
      );

      expect(result.success).toBe(false);
    });
  });
});
