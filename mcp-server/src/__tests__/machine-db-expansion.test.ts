/**
 * machine-db-expansion.test.ts — Tests for HobbyCNCProfileEngine + CobotMachiningEngine
 * 35+ tests covering machine search, controller profiles, G-code compatibility,
 * recommendation, cobot safety assessment, task planning, and cobot selection.
 */
import { describe, it, expect } from 'vitest';
import { hobbyCNCProfileEngine } from '../engines/HobbyCNCProfileEngine.js';
import { cobotMachiningEngine } from '../engines/CobotMachiningEngine.js';

// ════════════════════════════════════════════════════════════════════════
// HobbyCNCProfileEngine
// ════════════════════════════════════════════════════════════════════════

describe('HobbyCNCProfileEngine', () => {
  describe('getMachine', () => {
    it('should return Shapeoko 4 by ID', () => {
      const result = hobbyCNCProfileEngine.getMachine({ machine_id: 'shapeoko-4' });
      expect(result).not.toHaveProperty('error');
      const m = result as any;
      expect(m.name).toBe('Carbide3D Shapeoko 4');
      expect(m.controller).toBe('GRBL');
      expect(m.travel.x).toBe(838);
    });

    it('should return Tormach 1100MX', () => {
      const result = hobbyCNCProfileEngine.getMachine({ machine_id: 'tormach-1100mx' });
      expect(result).not.toHaveProperty('error');
      const m = result as any;
      expect(m.controller).toBe('PathPilot');
      expect(m.spindle_power_w).toBe(1500);
    });

    it('should return error for unknown machine', () => {
      const result = hobbyCNCProfileEngine.getMachine({ machine_id: 'nonexistent' });
      expect(result).toHaveProperty('error');
    });

    it('should return PocketNC with 5 axes', () => {
      const result = hobbyCNCProfileEngine.getMachine({ machine_id: 'pocketnc-v2-50' });
      expect(result).not.toHaveProperty('error');
      expect((result as any).max_axes).toBe(5);
      expect((result as any).controller).toBe('LinuxCNC');
    });
  });

  describe('searchMachines', () => {
    it('should find all GRBL machines', () => {
      const result = hobbyCNCProfileEngine.searchMachines({ controller: 'GRBL' });
      expect(result.count).toBeGreaterThan(5);
      result.machines.forEach(m => expect(m.controller).toBe('GRBL'));
    });

    it('should find machines with min travel X >= 800', () => {
      const result = hobbyCNCProfileEngine.searchMachines({ min_travel_x: 800 });
      expect(result.count).toBeGreaterThan(0);
      result.machines.forEach(m => expect(m.travel.x).toBeGreaterThanOrEqual(800));
    });

    it('should filter by max price', () => {
      const result = hobbyCNCProfileEngine.searchMachines({ max_price: 1000 });
      expect(result.count).toBeGreaterThan(0);
      result.machines.forEach(m => expect(m.price_min_usd).toBeLessThanOrEqual(1000));
    });

    it('should filter by spindle power minimum', () => {
      const result = hobbyCNCProfileEngine.searchMachines({ spindle_power_min: 1500 });
      expect(result.count).toBeGreaterThan(0);
      result.machines.forEach(m => expect(m.spindle_power_w).toBeGreaterThanOrEqual(1500));
    });

    it('should filter by material suitability', () => {
      const result = hobbyCNCProfileEngine.searchMachines({ material: 'steel' });
      expect(result.count).toBeGreaterThan(0);
      result.machines.forEach(m => expect(m.suitable_materials).toContain('steel'));
    });

    it('should filter by manufacturer', () => {
      const result = hobbyCNCProfileEngine.searchMachines({ manufacturer: 'Tormach' });
      expect(result.count).toBeGreaterThanOrEqual(2);
      result.machines.forEach(m => {
        expect(m.manufacturer.toLowerCase()).toContain('tormach');
      });
    });

    it('should combine multiple filters', () => {
      const result = hobbyCNCProfileEngine.searchMachines({
        controller: 'GRBL',
        min_travel_x: 500,
        max_price: 3000,
      });
      expect(result.count).toBeGreaterThan(0);
      result.machines.forEach(m => {
        expect(m.controller).toBe('GRBL');
        expect(m.travel.x).toBeGreaterThanOrEqual(500);
        expect(m.price_min_usd).toBeLessThanOrEqual(3000);
      });
    });

    it('should return empty for impossible filters', () => {
      const result = hobbyCNCProfileEngine.searchMachines({
        max_price: 10,
      });
      expect(result.count).toBe(0);
    });
  });

  describe('getControllerProfile', () => {
    it('should return GRBL profile with no canned cycles', () => {
      const result = hobbyCNCProfileEngine.getControllerProfile({ controller: 'GRBL' });
      expect(result).not.toHaveProperty('error');
      const p = result as any;
      expect(p.supports_canned_cycles).toBe(false);
      expect(p.tool_change).toBe(false);
      expect(p.max_axes).toBe(3);
      expect(p.probe_support).toBe(true);
    });

    it('should return LinuxCNC profile with full features', () => {
      const result = hobbyCNCProfileEngine.getControllerProfile({ controller: 'LinuxCNC' });
      expect(result).not.toHaveProperty('error');
      const p = result as any;
      expect(p.supports_canned_cycles).toBe(true);
      expect(p.tool_change).toBe(true);
      expect(p.max_axes).toBe(9);
    });

    it('should return PathPilot profile', () => {
      const result = hobbyCNCProfileEngine.getControllerProfile({ controller: 'PathPilot' });
      expect(result).not.toHaveProperty('error');
      const p = result as any;
      expect(p.supports_canned_cycles).toBe(true);
      expect(p.gcode_dialect).toBe('pathpilot');
    });

    it('should return Marlin profile with limited CNC support', () => {
      const result = hobbyCNCProfileEngine.getControllerProfile({ controller: 'Marlin' });
      expect(result).not.toHaveProperty('error');
      const p = result as any;
      expect(p.supports_canned_cycles).toBe(false);
      expect(p.tool_change).toBe(false);
      expect(p.unsupported_gcodes.length).toBeGreaterThan(10);
    });

    it('should return error for unknown controller', () => {
      const result = hobbyCNCProfileEngine.getControllerProfile({ controller: 'Fanuc' });
      expect(result).toHaveProperty('error');
    });
  });

  describe('checkCompatibility', () => {
    it('should detect unsupported canned cycles on GRBL', () => {
      const gcode = 'G90 G21\nG81 X10 Y10 Z-5 R2 F100\nM30';
      const result = hobbyCNCProfileEngine.checkCompatibility({
        machine_id: 'shapeoko-4',
        gcode,
      });
      expect(result.compatible).toBe(false);
      expect(result.unsupported_codes).toContain('G81');
      expect(result.suggested_replacements.length).toBeGreaterThan(0);
    });

    it('should mark simple G0/G1 program as compatible on GRBL', () => {
      const gcode = 'G90 G21\nG0 X0 Y0 Z5\nG1 X10 Y10 Z-2 F500\nM30';
      const result = hobbyCNCProfileEngine.checkCompatibility({
        machine_id: 'shapeoko-4',
        gcode,
      });
      expect(result.compatible).toBe(true);
      expect(result.unsupported_codes).toHaveLength(0);
    });

    it('should allow canned cycles on LinuxCNC machine', () => {
      const gcode = 'G90 G21\nG83 X10 Y10 Z-20 Q5 R2 F100\nG80\nM30';
      const result = hobbyCNCProfileEngine.checkCompatibility({
        machine_id: 'centroid-acorn',
        gcode,
      });
      expect(result.compatible).toBe(true);
    });

    it('should detect M6 tool change on GRBL machines', () => {
      const gcode = 'T1 M6\nG0 X0 Y0\nM30';
      const result = hobbyCNCProfileEngine.checkCompatibility({
        machine_id: 'x-carve',
        gcode,
      });
      expect(result.compatible).toBe(false);
      expect(result.unsupported_codes).toContain('M6');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn about large program on GRBL (64KB limit)', () => {
      const gcode = 'G1 X1 Y1 F500\n'.repeat(10000); // ~150KB
      const result = hobbyCNCProfileEngine.checkCompatibility({
        machine_id: 'shapeoko-4',
        gcode,
      });
      expect(result.warnings.some(w => w.includes('size'))).toBe(true);
    });

    it('should detect cutter comp on buildbotics controller', () => {
      const gcode = 'G41 D1\nG1 X10 Y10 F500\nG40\nM30';
      const result = hobbyCNCProfileEngine.checkCompatibility({
        machine_id: 'onefinity-woodworker',
        gcode,
      });
      expect(result.compatible).toBe(false);
      expect(result.unsupported_codes).toContain('G41');
    });

    it('should handle unknown machine gracefully', () => {
      const result = hobbyCNCProfileEngine.checkCompatibility({
        machine_id: 'nonexistent',
        gcode: 'G0 X0',
      });
      expect(result.compatible).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('recommendMachine', () => {
    it('should recommend machines within budget', () => {
      const result = hobbyCNCProfileEngine.recommendMachine({ budget: 3000 });
      expect(result.recommendations.length).toBeGreaterThan(0);
      result.recommendations.forEach(r => {
        expect(r.machine.price_min_usd).toBeLessThanOrEqual(3000);
      });
    });

    it('should rank steel-capable machines higher for steel', () => {
      const result = hobbyCNCProfileEngine.recommendMachine({
        material: 'steel',
        budget: 20000,
      });
      expect(result.recommendations.length).toBeGreaterThan(0);
      const top = result.recommendations[0];
      expect(top.machine.suitable_materials).toContain('steel');
    });

    it('should respect work area requirements', () => {
      const result = hobbyCNCProfileEngine.recommendMachine({
        work_area_needed: { x: 1000, y: 1000, z: 100 },
        budget: 15000,
      });
      expect(result.recommendations.length).toBeGreaterThan(0);
      const topMachine = result.recommendations[0].machine;
      expect(topMachine.travel.x).toBeGreaterThanOrEqual(1000);
      expect(topMachine.travel.y).toBeGreaterThanOrEqual(1000);
    });

    it('should score tool change feature correctly', () => {
      const result = hobbyCNCProfileEngine.recommendMachine({
        features_needed: ['tool_change'],
        budget: 20000,
      });
      expect(result.recommendations.length).toBeGreaterThan(0);
      // Top recommendation should support tool changes
      const topReasons = result.recommendations[0].reasons;
      expect(topReasons.some(r => r.toLowerCase().includes('tool'))).toBe(true);
    });

    it('should return sorted by score descending', () => {
      const result = hobbyCNCProfileEngine.recommendMachine({ budget: 50000 });
      for (let i = 1; i < result.recommendations.length; i++) {
        expect(result.recommendations[i].score)
          .toBeLessThanOrEqual(result.recommendations[i - 1].score);
      }
    });
  });

  describe('listMachines / listControllers', () => {
    it('should list 28+ machines', () => {
      const result = hobbyCNCProfileEngine.listMachines();
      expect(result.count).toBeGreaterThanOrEqual(28);
    });

    it('should list 9 controllers', () => {
      const result = hobbyCNCProfileEngine.listControllers();
      expect(result.controllers).toContain('GRBL');
      expect(result.controllers).toContain('LinuxCNC');
      expect(result.controllers).toContain('Mach3');
      expect(result.controllers).toContain('Mach4');
      expect(result.controllers).toContain('PathPilot');
      expect(result.controllers).toContain('Marlin');
      expect(result.controllers).toContain('buildbotics');
      expect(result.controllers).toContain('FluidNC');
      expect(result.controllers).toContain('UCCNC');
    });
  });

  describe('calculate (dispatcher entry point)', () => {
    it('should route "get" method', () => {
      const result = hobbyCNCProfileEngine.calculate({
        method: 'get', machine_id: 'nomad-3',
      });
      expect(result.name).toBe('Carbide3D Nomad 3');
    });

    it('should route "search" method', () => {
      const result = hobbyCNCProfileEngine.calculate({
        method: 'search', controller: 'PathPilot',
      });
      expect(result.count).toBeGreaterThan(0);
    });

    it('should return error for unknown method', () => {
      const result = hobbyCNCProfileEngine.calculate({ method: 'foo' });
      expect(result).toHaveProperty('error');
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// CobotMachiningEngine
// ════════════════════════════════════════════════════════════════════════

describe('CobotMachiningEngine', () => {
  describe('assessSafety', () => {
    it('should assess safe low-force deburring', () => {
      const result = cobotMachiningEngine.assessSafety({
        cobot_model: 'ur5e',
        operation: 'deburring',
        tool_rpm: 5000,
        cutting_force_N: 30,
        operator_distance_m: 1.5,
      });
      expect(result.safe).toBe(true);
      expect(result.risk_level).toBe('low');
      expect(result.force_limit_N).toBe(150);
      expect(result.ppe_required).toContain('safety_glasses');
    });

    it('should flag high force milling as unsafe', () => {
      const result = cobotMachiningEngine.assessSafety({
        cobot_model: 'ur10e',
        operation: 'milling',
        tool_rpm: 12000,
        cutting_force_N: 100,
        operator_distance_m: 0.5,
      });
      // 100N * 2.0 factor = 200N > 150N limit
      expect(result.safe).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should reduce speed limit at close distance', () => {
      const close = cobotMachiningEngine.assessSafety({
        cobot_model: 'ur5e',
        operation: 'polishing',
        tool_rpm: 3000,
        cutting_force_N: 10,
        operator_distance_m: 0.2,
      });
      const far = cobotMachiningEngine.assessSafety({
        cobot_model: 'ur5e',
        operation: 'polishing',
        tool_rpm: 3000,
        cutting_force_N: 10,
        operator_distance_m: 2.0,
      });
      expect(close.speed_limit_mm_s).toBeLessThan(far.speed_limit_mm_s);
    });

    it('should require more PPE for grinding', () => {
      const result = cobotMachiningEngine.assessSafety({
        cobot_model: 'fanuc-crx-10ia',
        operation: 'grinding',
        tool_rpm: 8000,
        cutting_force_N: 40,
        operator_distance_m: 1.0,
      });
      expect(result.ppe_required).toContain('hearing_protection');
      expect(result.ppe_required).toContain('face_shield');
    });

    it('should handle unknown cobot with warnings', () => {
      const result = cobotMachiningEngine.assessSafety({
        cobot_model: 'custom-bot',
        operation: 'deburring',
        tool_rpm: 3000,
        cutting_force_N: 20,
        operator_distance_m: 1.5,
      });
      expect(result.warnings.some(w => w.includes('not in database'))).toBe(true);
      expect(result.iso_references).toContain('ISO/TS 15066:2016');
    });

    it('should warn about high RPM at close range', () => {
      const result = cobotMachiningEngine.assessSafety({
        cobot_model: 'ur10e',
        operation: 'drilling',
        tool_rpm: 16000,
        cutting_force_N: 30,
        operator_distance_m: 0.8,
      });
      expect(result.risk_level).toBe('high');
      expect(result.warnings.some(w => w.includes('RPM'))).toBe(true);
    });
  });

  describe('planMachiningTask', () => {
    it('should plan feasible aluminum deburring', () => {
      const result = cobotMachiningEngine.planMachiningTask({
        cobot_payload_kg: 10,
        spindle_weight_kg: 3,
        part_material: 'aluminum',
        operation: 'deburring',
        reach_mm: 800,
      });
      expect(result.feasible).toBe(true);
      expect(result.payload_margin_kg).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should reject overweight spindle', () => {
      const result = cobotMachiningEngine.planMachiningTask({
        cobot_payload_kg: 5,
        spindle_weight_kg: 8,
        part_material: 'plastic',
        operation: 'milling',
        reach_mm: 500,
      });
      expect(result.feasible).toBe(false);
      expect(result.payload_margin_kg).toBeLessThan(0);
      expect(result.limitations.some(l => l.includes('payload'))).toBe(true);
    });

    it('should reduce speed for steel', () => {
      const result = cobotMachiningEngine.planMachiningTask({
        cobot_payload_kg: 16,
        spindle_weight_kg: 5,
        part_material: 'steel',
        operation: 'milling',
        reach_mm: 600,
      });
      expect(result.recommended_speed_pct).toBeLessThan(100);
    });

    it('should have higher cycle multiplier for milling vs polishing', () => {
      const milling = cobotMachiningEngine.planMachiningTask({
        cobot_payload_kg: 10,
        spindle_weight_kg: 3,
        part_material: 'aluminum',
        operation: 'milling',
        reach_mm: 600,
      });
      const polishing = cobotMachiningEngine.planMachiningTask({
        cobot_payload_kg: 10,
        spindle_weight_kg: 3,
        part_material: 'aluminum',
        operation: 'polishing',
        reach_mm: 600,
      });
      expect(milling.cycle_time_multiplier)
        .toBeGreaterThan(polishing.cycle_time_multiplier);
    });
  });

  describe('selectCobot', () => {
    it('should recommend cobots for deburring application', () => {
      const result = cobotMachiningEngine.selectCobot({
        application: 'deburring aluminum parts',
        payload_needed_kg: 5,
        reach_needed_mm: 800,
      });
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].score).toBeGreaterThan(50);
    });

    it('should prefer IP67 for wet/coolant applications', () => {
      const result = cobotMachiningEngine.selectCobot({
        application: 'wet machining with coolant',
        payload_needed_kg: 8,
        reach_needed_mm: 1000,
      });
      // FANUC CRX (IP67) should rank highly
      const fanuc = result.recommendations.find(
        r => r.cobot.manufacturer === 'FANUC'
      );
      expect(fanuc).toBeDefined();
      expect(fanuc!.reasons.some(r => r.includes('IP67'))).toBe(true);
    });

    it('should filter by budget', () => {
      const result = cobotMachiningEngine.selectCobot({
        application: 'polishing',
        payload_needed_kg: 5,
        reach_needed_mm: 800,
        budget: 30000,
      });
      const withinBudget = result.recommendations.filter(
        r => r.cobot.price_min_usd <= 30000
      );
      expect(withinBudget.length).toBeGreaterThan(0);
    });

    it('should penalize insufficient payload', () => {
      const result = cobotMachiningEngine.selectCobot({
        application: 'heavy milling',
        payload_needed_kg: 20,
        reach_needed_mm: 500,
      });
      // Many cobots should have limitations about payload
      const underPayload = result.recommendations.filter(
        r => r.cobot.payload_kg < 20
      );
      underPayload.forEach(r => {
        expect(r.limitations.some(l => l.includes('Payload'))).toBe(true);
      });
    });

    it('should sort by score descending', () => {
      const result = cobotMachiningEngine.selectCobot({
        application: 'deburring',
        payload_needed_kg: 8,
        reach_needed_mm: 900,
      });
      for (let i = 1; i < result.recommendations.length; i++) {
        expect(result.recommendations[i].score)
          .toBeLessThanOrEqual(result.recommendations[i - 1].score);
      }
    });

    it('should return up to 6 recommendations', () => {
      const result = cobotMachiningEngine.selectCobot({
        application: 'general',
        payload_needed_kg: 5,
        reach_needed_mm: 500,
      });
      expect(result.recommendations.length).toBeLessThanOrEqual(6);
    });
  });

  describe('listCobots', () => {
    it('should list 12 cobots', () => {
      const result = cobotMachiningEngine.listCobots();
      expect(result.count).toBe(12);
      expect(result.cobots[0]).toHaveProperty('id');
      expect(result.cobots[0]).toHaveProperty('payload_kg');
    });
  });

  describe('calculate (dispatcher entry point)', () => {
    it('should route assess_safety method', () => {
      const result = cobotMachiningEngine.calculate({
        method: 'assess_safety',
        cobot_model: 'ur5e',
        operation: 'polishing',
        tool_rpm: 3000,
        cutting_force_N: 15,
        operator_distance_m: 1.5,
      });
      expect(result).toHaveProperty('safe');
      expect(result).toHaveProperty('risk_level');
    });

    it('should route select method', () => {
      const result = cobotMachiningEngine.calculate({
        method: 'select',
        application: 'deburring',
        payload_needed_kg: 5,
        reach_needed_mm: 800,
      });
      expect(result).toHaveProperty('recommendations');
    });

    it('should return error for unknown method', () => {
      const result = cobotMachiningEngine.calculate({ method: 'unknown' });
      expect(result).toHaveProperty('error');
    });
  });
});
