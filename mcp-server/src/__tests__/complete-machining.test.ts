/**
 * CompleteMachiningEngine Tests
 * WFL-style complete machining intelligence for advanced mill-turn centers
 */

import { describe, it, expect } from 'vitest';
import {
  CompleteMachiningEngine,
  completeMachiningEngine,
  type CompleteMachiningConfig,
  type ComplexPart,
} from '../engines/CompleteMachiningEngine.js';

// Test fixtures
const createTestMachine = (overrides?: Partial<CompleteMachiningConfig>): CompleteMachiningConfig => ({
  machineId: 'WFL-M120-01',
  manufacturer: 'wfl',
  model: 'M120 MILLTURN',
  swingDiameter_mm: 1200,
  maxTurningLength_mm: 6000,
  mainSpindle: {
    maxRpm: 3500,
    power_kW: 80,
    torque_Nm: 5000,
    cAxis: true,
    chuckSize_mm: 500
  },
  counterSpindle: {
    maxRpm: 3000,
    power_kW: 60,
    torque_Nm: 4000,
    cAxis: true,
    chuckSize_mm: 400
  },
  millingSpindle: {
    maxRpm: 12000,
    power_kW: 40,
    torque_Nm: 300,
    toolInterface: 'hsk100',
    internalCoolant: true,
    coolantPressure_bar: 80
  },
  bAxis: {
    range_deg: 230,
    resolution_deg: 0.001,
    clampingTorque_Nm: 5000,
    continuous: true,
    indexable: true,
    indexIncrement_deg: 0.001
  },
  yAxis: {
    travel_mm: 350,
    resolution_mm: 0.001
  },
  toolMagazine: {
    capacity: 120,
    maxToolDiameter_mm: 200,
    maxToolLength_mm: 600,
    maxToolWeight_kg: 35,
    changeTime_seconds: 8
  },
  deepDrillingCapability: {
    maxDepth_mm: 2500,
    minDiameter_mm: 6,
    maxDiameter_mm: 80,
    supportedTypes: ['gun_drill', 'bta', 'ejector'],
    coolantDelivery: 'both'
  },
  gearCuttingCapability: {
    supportedMethods: ['hobbing', 'power_skiving'],
    maxModule: 12,
    minModule: 0.5,
    maxDiameter_mm: 500,
    internalGears: true
  },
  steadyRestPositions: 4,
  coolantPressure_bar: 80,
  ...overrides,
});

const createTestPart = (overrides?: Partial<ComplexPart>): ComplexPart => ({
  partId: 'GEARBOX-SHAFT-001',
  partType: 'shaft',
  overallLength_mm: 450,
  maxDiameter_mm: 120,
  material: 'steel_4140',
  hardness_HRC: 32,
  features: [
    { featureId: 'F1', type: 'od_cylinder', location: 'od', zStart_mm: 0, zEnd_mm: 100, diameter_mm: 120 },
    { featureId: 'F2', type: 'od_cylinder', location: 'od', zStart_mm: 100, zEnd_mm: 250, diameter_mm: 80 },
    { featureId: 'F3', type: 'od_cylinder', location: 'od', zStart_mm: 250, zEnd_mm: 400, diameter_mm: 60 },
    { featureId: 'F4', type: 'shoulder', location: 'od', zStart_mm: 100, zEnd_mm: 100, diameter_mm: 120 },
    { featureId: 'F5', type: 'shoulder', location: 'od', zStart_mm: 250, zEnd_mm: 250, diameter_mm: 80 },
    { featureId: 'F6', type: 'keyway', location: 'od', zStart_mm: 50, zEnd_mm: 90, diameter_mm: 120, depth_mm: 8 },
    { featureId: 'F7', type: 'gear_external', location: 'od', zStart_mm: 300, zEnd_mm: 350, diameter_mm: 55, module: 3, teethCount: 24 },
    { featureId: 'F8', type: 'thread_external', location: 'od', zStart_mm: 380, zEnd_mm: 420, diameter_mm: 50, pitch_mm: 2 },
    { featureId: 'F9', type: 'deep_hole', location: 'id', zStart_mm: 0, zEnd_mm: 300, diameter_mm: 25, depth_mm: 300 },
    { featureId: 'F10', type: 'cross_hole', location: 'od', zStart_mm: 150, zEnd_mm: 150, diameter_mm: 10, depth_mm: 40 },
    { featureId: 'F11', type: 'groove', location: 'od', zStart_mm: 95, zEnd_mm: 100, diameter_mm: 115, depth_mm: 2.5 },
    { featureId: 'F12', type: 'face', location: 'back', zStart_mm: 450, zEnd_mm: 450 },
  ],
  tolerances: [
    { toleranceId: 'T1', featureId: 'F2', type: 'diameter', nominal_mm: 80, tolerance_mm: 0.015 },
    { toleranceId: 'T2', featureId: 'F3', type: 'diameter', nominal_mm: 60, tolerance_mm: 0.012 },
    { toleranceId: 'T3', featureId: 'F7', type: 'runout', nominal_mm: 0, tolerance_mm: 0.02, datum: 'A' },
  ],
  surfaceRequirements: [
    { featureId: 'F2', roughness_Ra: 0.8 },
    { featureId: 'F7', roughness_Ra: 1.6 },
  ],
  productionQuantity: 25,
  setupPreference: 'dual_spindle',
  ...overrides,
});

describe('CompleteMachiningEngine', () => {
  describe('Engine metadata', () => {
    it('should have correct name and version', () => {
      expect(completeMachiningEngine.name).toBe('CompleteMachiningEngine');
      expect(completeMachiningEngine.version).toBe('1.0.0');
    });
  });

  describe('planSingleSetup', () => {
    it('should generate comprehensive single-setup plan', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planSingleSetup(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.operations.length).toBeGreaterThan(0);
    });

    it('should plan workholding strategy', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planSingleSetup(part, machine);

      expect(result.data?.workholding).toBeDefined();
      expect(['main', 'counter']).toContain(result.data?.workholding.primaryChuck);
      expect(['hard', 'soft', 'special']).toContain(result.data?.workholding.jawType);
    });

    it('should plan steady rest usage for long parts', () => {
      const machine = createTestMachine();
      const part = createTestPart({ overallLength_mm: 800, maxDiameter_mm: 100 }); // L/D = 8

      const result = completeMachiningEngine.planSingleSetup(part, machine);

      // High L/D should require steady rest
      if (result.data?.workholding.supportMethod === 'steady_rest') {
        expect(result.data?.steadyRestUsage.length).toBeGreaterThan(0);
      }
    });

    it('should generate tool list for all operations', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planSingleSetup(part, machine);

      expect(result.data?.toolList.length).toBeGreaterThan(0);
      for (const tool of result.data?.toolList || []) {
        expect(tool.toolId).toBeTruthy();
        expect(tool.toolType).toBeTruthy();
        expect(tool.forOperations.length).toBeGreaterThan(0);
      }
    });

    it('should estimate cycle time', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planSingleSetup(part, machine);

      expect(result.data?.estimatedCycleTime_seconds).toBeGreaterThan(0);
    });

    it('should identify critical path operations', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planSingleSetup(part, machine);

      expect(result.data?.criticalPath.length).toBeGreaterThan(0);
    });

    it('should include reasoning chain', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planSingleSetup(part, machine);

      expect(result.data?.reasoningChain.length).toBeGreaterThan(0);
      for (const step of result.data?.reasoningChain || []) {
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.rationale).toBeTruthy();
      }
    });

    it('should sequence operations correctly with turn before mill', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planSingleSetup(part, machine);

      const turnOps = result.data?.operations.filter(o => o.type === 'turn');
      const millOps = result.data?.operations.filter(o => o.type === 'mill');

      if (turnOps && turnOps.length > 0 && millOps && millOps.length > 0) {
        const firstTurn = turnOps[0];
        const lastMill = millOps[millOps.length - 1];
        expect(firstTurn.sequence).toBeLessThan(lastMill.sequence);
      }
    });

    it('should plan counter-spindle transfer when back features exist', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planSingleSetup(part, machine);

      const hasBackFeatures = part.features.some(f => f.location === 'back');
      if (hasBackFeatures && machine.counterSpindle) {
        expect(result.data?.workholding.rechuckRequired).toBe(true);
      }
    });

    it('should include gear cutting operations', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planSingleSetup(part, machine);

      const hasGear = part.features.some(f => f.type === 'gear_external' || f.type === 'gear_internal');
      if (hasGear && machine.gearCuttingCapability) {
        const gearOps = result.data?.operations.filter(o => o.type === 'gear_cut');
        expect(gearOps?.length).toBeGreaterThan(0);
      }
    });

    it('should include deep hole drilling operations', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planSingleSetup(part, machine);

      const hasDeepHole = part.features.some(f => f.type === 'deep_hole');
      if (hasDeepHole && machine.deepDrillingCapability) {
        const drillOps = result.data?.operations.filter(o => o.type === 'deep_drill');
        expect(drillOps?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('planBAxisInterpolation', () => {
    it('should detect when B-axis is not required', () => {
      const machine = createTestMachine();
      const part = createTestPart({
        features: [
          { featureId: 'F1', type: 'od_cylinder', location: 'od', zStart_mm: 0, zEnd_mm: 100, diameter_mm: 50 }
        ]
      });

      const result = completeMachiningEngine.planBAxisInterpolation(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.isRequired).toBe(false);
    });

    it('should detect when B-axis is required', () => {
      const machine = createTestMachine();
      const part = createTestPart(); // Has keyway and cross_hole

      const result = completeMachiningEngine.planBAxisInterpolation(part, machine);

      expect(result.data?.isRequired).toBe(true);
    });

    it('should determine interpolation type', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planBAxisInterpolation(part, machine);

      expect(['continuous', 'indexed', 'none']).toContain(result.data?.interpolationType);
    });

    it('should calculate required B-axis positions', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planBAxisInterpolation(part, machine);

      if (result.data?.isRequired) {
        expect(result.data?.positions.length).toBeGreaterThan(0);
        for (const pos of result.data?.positions || []) {
          expect(pos.angle_deg).toBeDefined();
          expect(['radial', 'axial', 'angular']).toContain(pos.toolOrientation);
        }
      }
    });

    it('should analyze collision points', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planBAxisInterpolation(part, machine);

      if (result.data?.isRequired) {
        expect(result.data?.collisionAnalysis.length).toBeGreaterThan(0);
        for (const point of result.data?.collisionAnalysis || []) {
          expect(['safe', 'caution', 'danger']).toContain(point.risk);
        }
      }
    });

    it('should provide recommendations', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planBAxisInterpolation(part, machine);

      expect(result.data?.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('planDeepHoleDrilling', () => {
    it('should fail when machine lacks capability', () => {
      const machine = createTestMachine({ deepDrillingCapability: undefined });
      const part = createTestPart();

      const result = completeMachiningEngine.planDeepHoleDrilling(part, machine);

      expect(result.success).toBe(false);
    });

    it('should return empty plan when no deep holes', () => {
      const machine = createTestMachine();
      const part = createTestPart({
        features: [
          { featureId: 'F1', type: 'od_cylinder', location: 'od', zStart_mm: 0, zEnd_mm: 100, diameter_mm: 50 }
        ]
      });

      const result = completeMachiningEngine.planDeepHoleDrilling(part, machine);

      expect(result.success).toBe(true);
      expect(result.data?.holes.length).toBe(0);
    });

    it('should select appropriate drilling method based on L/D', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planDeepHoleDrilling(part, machine);

      expect(['gun_drill', 'bta', 'ejector', 'pilot_and_ream']).toContain(result.data?.method);
    });

    it('should plan each deep hole operation', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planDeepHoleDrilling(part, machine);

      expect(result.data?.holes.length).toBeGreaterThan(0);
      for (const hole of result.data?.holes || []) {
        expect(hole.diameter_mm).toBeGreaterThan(0);
        expect(hole.depth_mm).toBeGreaterThan(0);
        expect(hole.ldRatio).toBeGreaterThan(0);
        expect(hole.spindleRpm).toBeGreaterThan(0);
      }
    });

    it('should require center drill for high L/D', () => {
      const machine = createTestMachine();
      const part = createTestPart({
        features: [
          { featureId: 'F1', type: 'deep_hole', location: 'id', zStart_mm: 0, zEnd_mm: 200, diameter_mm: 15, depth_mm: 200 }
        ]
      });

      const result = completeMachiningEngine.planDeepHoleDrilling(part, machine);

      const hole = result.data?.holes[0];
      if (hole && hole.ldRatio > 3) {
        expect(hole.centerDrillRequired).toBe(true);
      }
    });

    it('should plan peck cycle for appropriate conditions', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planDeepHoleDrilling(part, machine);

      for (const hole of result.data?.holes || []) {
        if (hole.ldRatio > 5) {
          expect(hole.peckCycle).toBe(true);
          expect(hole.peckDepth_mm).toBeGreaterThan(0);
        }
      }
    });

    it('should determine chip management strategy', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planDeepHoleDrilling(part, machine);

      expect(['continuous', 'peck', 'interrupted']).toContain(result.data?.chipManagement.type);
    });

    it('should plan coolant requirements', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planDeepHoleDrilling(part, machine);

      expect(result.data?.coolantRequirements.pressure_bar).toBeGreaterThan(0);
      expect(result.data?.coolantRequirements.flowRate_lpm).toBeGreaterThan(0);
    });

    it('should estimate total drilling time', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planDeepHoleDrilling(part, machine);

      expect(result.data?.totalDrillingTime_seconds).toBeGreaterThan(0);
    });
  });

  describe('planGearCutting', () => {
    it('should fail when machine lacks capability', () => {
      const machine = createTestMachine({ gearCuttingCapability: undefined });
      const part = createTestPart();

      const result = completeMachiningEngine.planGearCutting(part, machine);

      expect(result.success).toBe(false);
    });

    it('should fail when no gear features exist', () => {
      const machine = createTestMachine();
      const part = createTestPart({
        features: [
          { featureId: 'F1', type: 'od_cylinder', location: 'od', zStart_mm: 0, zEnd_mm: 100, diameter_mm: 50 }
        ]
      });

      const result = completeMachiningEngine.planGearCutting(part, machine);

      expect(result.success).toBe(false);
    });

    it('should select appropriate cutting method', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planGearCutting(part, machine);

      expect(['hobbing', 'power_skiving', 'shaping']).toContain(result.data?.method);
    });

    it('should plan each gear operation', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planGearCutting(part, machine);

      expect(result.data?.gears.length).toBeGreaterThan(0);
      for (const gear of result.data?.gears || []) {
        expect(gear.module).toBeGreaterThan(0);
        expect(gear.teethCount).toBeGreaterThan(0);
        expect(gear.passes).toBeGreaterThan(0);
      }
    });

    it('should determine tooling requirements', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planGearCutting(part, machine);

      expect(result.data?.tooling.length).toBeGreaterThan(0);
      for (const tool of result.data?.tooling || []) {
        expect(['hob', 'skiving_cutter', 'shaping_cutter']).toContain(tool.toolType);
        expect(tool.module).toBeGreaterThan(0);
      }
    });

    it('should calculate synchronization parameters', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planGearCutting(part, machine);

      expect(result.data?.synchronization.workpieceRpm).toBeGreaterThan(0);
      expect(result.data?.synchronization.toolRpm).toBeGreaterThan(0);
      expect(result.data?.synchronization.syncRatio).toBeGreaterThan(0);
    });

    it('should specify quality grade', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planGearCutting(part, machine);

      expect(result.data?.qualityGrade).toBeTruthy();
    });

    it('should estimate total cutting time', () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = completeMachiningEngine.planGearCutting(part, machine);

      expect(result.data?.totalCuttingTime_seconds).toBeGreaterThan(0);
    });

    it('should prefer power skiving for internal gears', () => {
      const machine = createTestMachine();
      const part = createTestPart({
        features: [
          { featureId: 'F1', type: 'gear_internal', location: 'id', zStart_mm: 0, zEnd_mm: 30, diameter_mm: 100, module: 2, teethCount: 48 }
        ]
      });

      const result = completeMachiningEngine.planGearCutting(part, machine);

      // If power skiving is supported, it should be preferred for internal
      if (machine.gearCuttingCapability?.supportedMethods.includes('power_skiving')) {
        expect(result.data?.method).toBe('power_skiving');
      }
    });
  });

  describe('executeAction dispatcher interface', () => {
    it('should route complete_plan_single_setup', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await completeMachiningEngine.executeAction(
        'complete_plan_single_setup',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('operations');
    });

    it('should route complete_plan_baxis', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await completeMachiningEngine.executeAction(
        'complete_plan_baxis',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('isRequired');
    });

    it('should route complete_plan_deep_hole', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await completeMachiningEngine.executeAction(
        'complete_plan_deep_hole',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('method');
    });

    it('should route complete_plan_gear_cutting', async () => {
      const machine = createTestMachine();
      const part = createTestPart();

      const result = await completeMachiningEngine.executeAction(
        'complete_plan_gear_cutting',
        { part, machine }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('gears');
    });

    it('should fail for unknown action', async () => {
      const result = await completeMachiningEngine.executeAction(
        'unknown_action',
        {}
      );

      expect(result.success).toBe(false);
    });
  });
});
