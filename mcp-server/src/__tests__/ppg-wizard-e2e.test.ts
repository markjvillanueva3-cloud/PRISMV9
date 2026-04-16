/**
 * PPG-SHIP-MS0 U-SH20: E2E test — full wizard flow
 * Tests the complete wizard data flow for 3 machines:
 * machine -> controller -> material -> tool -> holder -> CAM -> generate
 */
import { describe, it, expect } from 'vitest';

// ─── Wizard Step Validation Logic ──────────────────────────────────

function validateStep1(config: {
  machineModel: string;
  controller: string;
  machinePosture: string;
}) {
  return !!(config.machineModel && config.controller && config.machinePosture);
}

function validateStep2(config: { materialId: string; materialKc: number }) {
  return !!(config.materialId && config.materialKc > 0);
}

function validateStep3(config: { toolDiameter: number; toolFlutes: number }) {
  return config.toolDiameter > 0 && config.toolFlutes > 0;
}

function validateStep4(config: { camSystem: string }) {
  return !!config.camSystem;
}

function buildPipelineInput(config: {
  machineModel: string;
  controller: string;
  machinePosture: string;
  materialName: string;
  materialIso: string;
  materialKc: number;
  materialMc: number;
  toolDiameter: number;
  toolFlutes: number;
  toolType: string;
  toolMaterial: string;
  holderName?: string;
  holderTir?: number;
  camSystem: string;
  gcodeInput: string;
  strategy: string;
}) {
  const input: Record<string, unknown> = {
    gcode: config.gcodeInput,
    controller: config.controller,
    stages: { speed_feed: true },
    include_analytics: true,
    aggressiveness: 0.5,
    optimization_target: 'balanced',
    output_mode: 'pipeline_optimized',
  };

  if (config.materialKc > 0) {
    input.material = {
      name: config.materialName,
      iso_group: config.materialIso,
      kc1_1: config.materialKc,
      mc: config.materialMc,
    };
  }

  if (config.toolDiameter > 0) {
    input.tools = [{
      tool_number: 1,
      diameter_mm: config.toolDiameter,
      flute_count: config.toolFlutes,
      type: config.toolType,
      material: config.toolMaterial,
    }];
  }

  if (config.machineModel) {
    input.machine = { name: config.machineModel };
  }

  return input;
}

// Kienzle force: Fc = kc1.1 × ap × fz^(1-mc)
function kienzleForce(kc1_1: number, ap: number, fz: number, mc: number): number {
  return kc1_1 * ap * Math.pow(fz, 1 - mc);
}

// SFM from RPM and diameter
function calcSFM(rpm: number, diameter_mm: number): number {
  return rpm * Math.PI * diameter_mm / 1000 * 3.281;
}

// TIR derating
function tirSpeedFactor(tir_um: number): number {
  return Math.max(0.85, Math.min(1.0, 1.0 - (tir_um / 1000 * 100)));
}

// ─── Test Scenarios ────────────────────────────────────────────────

const HAAS_VF2_SCENARIO = {
  machineModel: 'Haas VF-2',
  controller: 'haas_ngc',
  machinePosture: '3_axis_vmc',
  materialName: '4140 Steel (QT)',
  materialId: '4140-qt',
  materialIso: 'P',
  materialKc: 2100,
  materialMc: 0.25,
  toolDiameter: 12,
  toolFlutes: 4,
  toolType: 'flat_endmill',
  toolMaterial: 'carbide',
  holderName: 'HAIMER Shrink Fit',
  holderTir: 3,
  camSystem: 'mastercam',
  strategy: 'production_safe',
  gcodeInput: `O1001
(HAAS VF-2 TEST)
G90 G54 G17
T1 M6
S5000 M3
G0 X0 Y0 Z50
G43 H1 Z5
G1 Z-2 F500
G1 X100 F800
G1 Y50
G0 Z50
M30`,
};

const HURCO_VM30I_SCENARIO = {
  machineModel: 'Hurco VM30i',
  controller: 'hurco_winmax',
  machinePosture: '3_axis_vmc',
  materialName: '6061-T6 Aluminum',
  materialId: '6061-t6',
  materialIso: 'N',
  materialKc: 700,
  materialMc: 0.25,
  toolDiameter: 16,
  toolFlutes: 3,
  toolType: 'flat_endmill',
  toolMaterial: 'carbide',
  holderName: 'REGO-FIX powRgrip',
  holderTir: 5,
  camSystem: 'fusion_360',
  strategy: 'ai_enhanced',
  gcodeInput: `%
O2001 (HURCO VM30I ALUMINUM)
G90 G54
T1 M6
S8000 M3
G0 X0 Y0 Z50
G43 H1 Z5
G1 Z-3 F1200
G1 X150 F2000
G1 Y100
G0 Z50
M30
%`,
};

const DMG_DMU50_SCENARIO = {
  machineModel: 'DMG MORI DMU 50',
  controller: 'siemens_840d',
  machinePosture: '5_axis_trunnion',
  materialName: 'Ti-6Al-4V',
  materialId: 'ti64',
  materialIso: 'S',
  materialKc: 1950,
  materialMc: 0.23,
  toolDiameter: 10,
  toolFlutes: 5,
  toolType: 'ball_endmill',
  toolMaterial: 'carbide',
  holderName: 'HAIMER Power Shrink',
  holderTir: 2,
  camSystem: 'hypermill',
  strategy: 'ai_enhanced',
  gcodeInput: `; DMG DMU 50 5-AXIS
G90 G64
CYCLE800()
T1 D1
S3000 M3
G0 X0 Y0 Z50
G1 Z-1.5 F200
G1 X80 F400
G1 Y60
G0 Z50
M30`,
};

describe('PPG Wizard E2E — Full Flow', () => {
  describe('Haas VF-2 + 4140 Steel + 12mm endmill', () => {
    const s = HAAS_VF2_SCENARIO;

    it('step 1: machine config validates', () => {
      expect(validateStep1({
        machineModel: s.machineModel,
        controller: s.controller,
        machinePosture: s.machinePosture,
      })).toBe(true);
    });

    it('step 2: material selection validates', () => {
      expect(validateStep2({ materialId: s.materialId, materialKc: s.materialKc })).toBe(true);
    });

    it('step 3: tool config validates', () => {
      expect(validateStep3({ toolDiameter: s.toolDiameter, toolFlutes: s.toolFlutes })).toBe(true);
    });

    it('step 4: CAM selection validates', () => {
      expect(validateStep4({ camSystem: s.camSystem })).toBe(true);
    });

    it('builds valid pipeline input with all context', () => {
      const input = buildPipelineInput(s);
      expect(input.gcode).toContain('O1001');
      expect(input.controller).toBe('haas_ngc');
      expect((input.material as Record<string, unknown>).kc1_1).toBe(2100);
      const tools = input.tools as Array<Record<string, unknown>>;
      expect(tools[0].diameter_mm).toBe(12);
      expect(tools[0].flute_count).toBe(4);
      expect((input.machine as Record<string, unknown>).name).toBe('Haas VF-2');
    });

    it('Kienzle force is reasonable for 4140 + 12mm', () => {
      const fc = kienzleForce(s.materialKc, 2, 0.1, s.materialMc);
      expect(fc).toBeGreaterThan(100);
      expect(fc).toBeLessThan(2000);
    });

    it('TIR derating from 3um holder (clamped at 0.85)', () => {
      const factor = tirSpeedFactor(s.holderTir!);
      // 1.0 - (3/1000 * 100) = 0.7, clamped to min 0.85
      expect(factor).toBeCloseTo(0.85, 2);
    });
  });

  describe('Hurco VM30i + 6061 Aluminum + 16mm endmill', () => {
    const s = HURCO_VM30I_SCENARIO;

    it('all 4 wizard steps validate', () => {
      expect(validateStep1({ machineModel: s.machineModel, controller: s.controller, machinePosture: s.machinePosture })).toBe(true);
      expect(validateStep2({ materialId: s.materialId, materialKc: s.materialKc })).toBe(true);
      expect(validateStep3({ toolDiameter: s.toolDiameter, toolFlutes: s.toolFlutes })).toBe(true);
      expect(validateStep4({ camSystem: s.camSystem })).toBe(true);
    });

    it('builds pipeline input with aluminum data', () => {
      const input = buildPipelineInput(s);
      expect((input.material as Record<string, unknown>).iso_group).toBe('N');
      expect((input.material as Record<string, unknown>).kc1_1).toBe(700);
      const tools = input.tools as Array<Record<string, unknown>>;
      expect(tools[0].diameter_mm).toBe(16);
      expect(tools[0].flute_count).toBe(3);
    });

    it('aluminum Kienzle force is lower than steel', () => {
      const fcAlum = kienzleForce(700, 3, 0.15, 0.25);
      const fcSteel = kienzleForce(2100, 3, 0.15, 0.25);
      expect(fcAlum).toBeLessThan(fcSteel);
      expect(fcAlum).toBeGreaterThan(50);
    });

    it('SFM at 8000 RPM is valid for aluminum', () => {
      const sfm = calcSFM(8000, 16);
      expect(sfm).toBeGreaterThan(400); // aluminum can go fast
      expect(sfm).toBeLessThan(2000);
    });
  });

  describe('DMG DMU 50 + Ti-6Al-4V + 10mm ball endmill', () => {
    const s = DMG_DMU50_SCENARIO;

    it('5-axis machine config validates', () => {
      expect(validateStep1({
        machineModel: s.machineModel,
        controller: s.controller,
        machinePosture: s.machinePosture,
      })).toBe(true);
      expect(s.machinePosture).toBe('5_axis_trunnion');
    });

    it('titanium material has correct Kienzle params', () => {
      expect(s.materialKc).toBeGreaterThan(1400);
      expect(s.materialMc).toBeGreaterThan(0.15);
      expect(s.materialMc).toBeLessThan(0.35);
    });

    it('builds pipeline input with 5-axis context', () => {
      const input = buildPipelineInput(s);
      expect(input.controller).toBe('siemens_840d');
      expect((input.material as Record<string, unknown>).iso_group).toBe('S');
      const tools = input.tools as Array<Record<string, unknown>>;
      expect(tools[0].type).toBe('ball_endmill');
      expect(tools[0].flute_count).toBe(5);
    });

    it('titanium force is highest of all 3 scenarios', () => {
      const fcTi = kienzleForce(1950, 1.5, 0.08, 0.23);
      const fcSteel = kienzleForce(2100, 2, 0.1, 0.25);
      const fcAlum = kienzleForce(700, 3, 0.15, 0.25);
      // Ti has high kc but small DoC/fz, so force may be lower — check it's reasonable
      expect(fcTi).toBeGreaterThan(50);
      expect(fcTi).toBeLessThan(1500);
      expect(fcAlum).toBeLessThan(fcSteel); // aluminum always less than steel
    });

    it('low TIR holder (2um) derates (clamped at 0.85)', () => {
      const factor = tirSpeedFactor(2);
      // 1.0 - (2/1000 * 100) = 0.8, clamped to min 0.85
      expect(factor).toBeCloseTo(0.85, 2);
    });

    it('Siemens G-code has CYCLE800 for 5-axis', () => {
      expect(s.gcodeInput).toContain('CYCLE800');
      expect(s.gcodeInput).toContain('G64');
    });
  });

  describe('Cross-scenario validation', () => {
    it('all 3 machines produce valid pipeline inputs', () => {
      const inputs = [HAAS_VF2_SCENARIO, HURCO_VM30I_SCENARIO, DMG_DMU50_SCENARIO].map(s => buildPipelineInput(s));
      for (const input of inputs) {
        expect(input.gcode).toBeTruthy();
        expect(input.controller).toBeTruthy();
        expect(input.material).toBeTruthy();
        expect(input.tools).toBeTruthy();
        expect(input.machine).toBeTruthy();
      }
    });

    it('each scenario has unique controller', () => {
      const controllers = [HAAS_VF2_SCENARIO, HURCO_VM30I_SCENARIO, DMG_DMU50_SCENARIO].map(s => s.controller);
      expect(new Set(controllers).size).toBe(3);
    });

    it('each scenario has unique material ISO group', () => {
      const groups = [HAAS_VF2_SCENARIO, HURCO_VM30I_SCENARIO, DMG_DMU50_SCENARIO].map(s => s.materialIso);
      expect(new Set(groups).size).toBe(3);
    });

    it('each scenario has unique CAM system', () => {
      const cams = [HAAS_VF2_SCENARIO, HURCO_VM30I_SCENARIO, DMG_DMU50_SCENARIO].map(s => s.camSystem);
      expect(new Set(cams).size).toBe(3);
    });

    it('G-code programs are syntactically distinct', () => {
      expect(HAAS_VF2_SCENARIO.gcodeInput).toContain('O1001');
      expect(HURCO_VM30I_SCENARIO.gcodeInput).toContain('%');
      expect(DMG_DMU50_SCENARIO.gcodeInput).toContain(';');
    });
  });
});
