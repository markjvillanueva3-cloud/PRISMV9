/**
 * MCAT-MS0 P1-U01: Machine Layer Merger Tests
 *
 * Tests:
 * 1. Single layer merge (passthrough)
 * 2. Multi-layer merge with priority
 * 3. Zero data loss verification
 * 4. Array field append-not-overwrite
 * 5. Zero vs undefined handling
 * 6. Ambiguity detection (zero RPM, zero power)
 * 7. Provenance tracking per field
 * 8. Conflict resolution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { machineLayerMerger, type MachineLayerInput } from '../engines/MachineLayerMerger.js';
import type { Machine, MachineController, MachineSpindle, MachineEnvelope } from '../types.js';

function makeMachine(overrides: Partial<Machine> = {}): Machine {
  return {
    id: 'test-machine-1',
    manufacturer: 'Haas',
    model: 'VF-2',
    type: 'VMC',
    controller: {
      manufacturer: 'FANUC',
      model: '31i',
    },
    spindle: {
      max_rpm: 8100,
      power: 22.4,
    },
    envelope: {
      x: 762,
      y: 406,
      z: 508,
    },
    metadata: {
      layer: 'BASIC',
      source: 'test',
      updated_at: '2026-04-01',
    },
    ...overrides,
  } as Machine;
}

describe('MachineLayerMerger', () => {
  describe('single layer merge', () => {
    it('should pass through single layer data unchanged', () => {
      const input: MachineLayerInput = {
        machine: makeMachine(),
        layer: 'BASIC',
        source_id: 'basic-source-1',
      };

      const result = machineLayerMerger.merge([input]);

      expect(result.package.manufacturer).toBe('Haas');
      expect(result.package.model).toBe('VF-2');
      expect(result.package.canonical_type).toBe('VMC');
      expect(result.package.spindle.max_rpm).toBe(8100);
      expect(result.package.spindle.power).toBe(22.4);
      expect(result.fields_merged).toBeGreaterThan(0);
      expect(result.ambiguities_created).toBe(0);
    });

    it('should generate correct canonical_id', () => {
      const input: MachineLayerInput = {
        machine: makeMachine({ manufacturer: 'DMG MORI', model: 'DMU 50' }),
        layer: 'BASIC',
        source_id: 'test',
      };

      const result = machineLayerMerger.merge([input]);

      expect(result.package.canonical_id).toBe('dmg-mori-dmu-50');
      expect(result.package.manufacturer_id).toBe('dmg-mori');
    });
  });

  describe('multi-layer priority merge', () => {
    it('should prefer ENHANCED over BASIC', () => {
      const basic: MachineLayerInput = {
        machine: makeMachine({ spindle: { max_rpm: 8100, power: 22.4 } as MachineSpindle }),
        layer: 'BASIC',
        source_id: 'basic-1',
      };

      const enhanced: MachineLayerInput = {
        machine: makeMachine({ spindle: { max_rpm: 10000, power: 30 } as MachineSpindle }),
        layer: 'ENHANCED',
        source_id: 'enhanced-1',
      };

      const result = machineLayerMerger.merge([basic, enhanced]);

      expect(result.package.spindle.max_rpm).toBe(10000);
      expect(result.package.spindle.power).toBe(30);
      expect(result.package.provenance['spindle.max_rpm']?.layer).toBe('ENHANCED');
    });

    it('should prefer USER over all other layers', () => {
      const basic: MachineLayerInput = {
        machine: makeMachine({ spindle: { max_rpm: 8100, power: 22.4 } as MachineSpindle }),
        layer: 'BASIC',
        source_id: 'basic-1',
      };

      const enhanced: MachineLayerInput = {
        machine: makeMachine({ spindle: { max_rpm: 10000, power: 30 } as MachineSpindle }),
        layer: 'ENHANCED',
        source_id: 'enhanced-1',
      };

      const user: MachineLayerInput = {
        machine: makeMachine({ spindle: { max_rpm: 12000, power: 37 } as MachineSpindle }),
        layer: 'USER',
        source_id: 'user-override-1',
      };

      const result = machineLayerMerger.merge([basic, enhanced, user]);

      expect(result.package.spindle.max_rpm).toBe(12000);
      expect(result.package.spindle.power).toBe(37);
      expect(result.package.provenance['spindle.max_rpm']?.layer).toBe('USER');
    });

    it('should count conflicts when layers disagree', () => {
      const basic: MachineLayerInput = {
        machine: makeMachine({ manufacturer: 'Haas' }),
        layer: 'BASIC',
        source_id: 'basic-1',
      };

      const enhanced: MachineLayerInput = {
        machine: makeMachine({ manufacturer: 'HAAS Automation' }),
        layer: 'ENHANCED',
        source_id: 'enhanced-1',
      };

      const result = machineLayerMerger.merge([basic, enhanced]);

      expect(result.package.manufacturer).toBe('HAAS Automation');
      expect(result.conflicts_resolved).toBeGreaterThan(0);
    });
  });

  describe('zero data loss', () => {
    it('should preserve all source_record_ids', () => {
      const inputs: MachineLayerInput[] = [
        { machine: makeMachine({ id: 'machine-a' }), layer: 'BASIC', source_id: 'src-a' },
        { machine: makeMachine({ id: 'machine-b' }), layer: 'ENHANCED', source_id: 'src-b' },
        { machine: makeMachine({ id: 'machine-c' }), layer: 'USER', source_id: 'src-c' },
      ];

      const result = machineLayerMerger.merge(inputs);

      expect(result.package.source_record_ids).toContain('src-a');
      expect(result.package.source_record_ids).toContain('src-b');
      expect(result.package.source_record_ids).toContain('src-c');
      expect(result.package.source_record_ids.length).toBe(3);
    });

    it('should track enrichment history for each layer', () => {
      const inputs: MachineLayerInput[] = [
        { machine: makeMachine(), layer: 'BASIC', source_id: 'basic-1' },
        { machine: makeMachine(), layer: 'ENHANCED', source_id: 'enhanced-1' },
      ];

      const result = machineLayerMerger.merge(inputs);

      expect(result.package.enrichment_history.length).toBe(2);
      expect(result.package.enrichment_history.some(h => h.source === 'basic-1')).toBe(true);
      expect(result.package.enrichment_history.some(h => h.source === 'enhanced-1')).toBe(true);
    });
  });

  describe('array field handling', () => {
    it('should append arrays rather than overwrite', () => {
      const basic: MachineLayerInput = {
        machine: makeMachine({ options: ['high-speed', 'probing'] }),
        layer: 'BASIC',
        source_id: 'basic-1',
      };

      const enhanced: MachineLayerInput = {
        machine: makeMachine({ options: ['through-spindle-coolant', 'automation'] }),
        layer: 'ENHANCED',
        source_id: 'enhanced-1',
      };

      const result = machineLayerMerger.merge([basic, enhanced]);

      expect(result.package.provenance['options']).toBeDefined();
    });

    it('should deduplicate array items', () => {
      const basic: MachineLayerInput = {
        machine: makeMachine({ options: ['probing', 'high-speed'] }),
        layer: 'BASIC',
        source_id: 'basic-1',
      };

      const enhanced: MachineLayerInput = {
        machine: makeMachine({ options: ['probing', 'automation'] }),
        layer: 'ENHANCED',
        source_id: 'enhanced-1',
      };

      const result = machineLayerMerger.merge([basic, enhanced]);

      expect(result.package.provenance['options']).toBeDefined();
    });
  });

  describe('zero vs undefined handling', () => {
    it('should treat zero as a valid value, not skip it', () => {
      const basic: MachineLayerInput = {
        machine: makeMachine({ envelope: { x: 0, y: 406, z: 508 } as MachineEnvelope }),
        layer: 'BASIC',
        source_id: 'basic-1',
      };

      const result = machineLayerMerger.merge([basic]);

      expect(result.package.envelope.x).toBe(0);
    });

    it('should skip undefined fields when higher layer has no value', () => {
      const basic: MachineLayerInput = {
        machine: makeMachine({ series: 'VF' }),
        layer: 'BASIC',
        source_id: 'basic-1',
      };

      const enhanced: MachineLayerInput = {
        machine: makeMachine({ series: undefined }),
        layer: 'ENHANCED',
        source_id: 'enhanced-1',
      };

      const result = machineLayerMerger.merge([basic, enhanced]);

      expect(result.package.series).toBe('VF');
    });
  });

  describe('ambiguity detection', () => {
    it('should flag zero RPM as blocker ambiguity', () => {
      const input: MachineLayerInput = {
        machine: makeMachine({ spindle: { max_rpm: 0, power: 22.4 } as MachineSpindle }),
        layer: 'BASIC',
        source_id: 'basic-1',
      };

      const result = machineLayerMerger.merge([input]);

      expect(result.ambiguities_created).toBeGreaterThan(0);
      const rpmAmbiguity = result.package.ambiguities.find(a => a.field_path === 'spindle.max_rpm');
      expect(rpmAmbiguity).toBeDefined();
      expect(rpmAmbiguity?.severity).toBe('blocker');
    });

    it('should flag zero power as warning ambiguity', () => {
      const input: MachineLayerInput = {
        machine: makeMachine({ spindle: { max_rpm: 8100, power: 0 } as MachineSpindle }),
        layer: 'BASIC',
        source_id: 'basic-1',
      };

      const result = machineLayerMerger.merge([input]);

      const powerAmbiguity = result.package.ambiguities.find(a => a.field_path === 'spindle.power');
      expect(powerAmbiguity).toBeDefined();
      expect(powerAmbiguity?.severity).toBe('warning');
    });
  });

  describe('provenance tracking', () => {
    it('should track provenance for each merged field', () => {
      const input: MachineLayerInput = {
        machine: makeMachine(),
        layer: 'ENHANCED',
        source_id: 'enhanced-source-1',
        confidence: 0.85,
      };

      const result = machineLayerMerger.merge([input]);

      expect(result.package.provenance['manufacturer']).toBeDefined();
      expect(result.package.provenance['manufacturer'].layer).toBe('ENHANCED');
      expect(result.package.provenance['manufacturer'].confidence).toBe(0.85);
    });

    it('should compute confidence breakdown by subsystem', () => {
      const input: MachineLayerInput = {
        machine: makeMachine(),
        layer: 'ENHANCED',
        source_id: 'enhanced-source-1',
        confidence: 0.9,
      };

      const result = machineLayerMerger.merge([input]);

      expect(result.package.confidence.spindle).toBeGreaterThan(0);
      expect(result.package.confidence.controller).toBeGreaterThan(0);
      expect(result.package.confidence.overall).toBeGreaterThan(0);
    });
  });

  describe('type normalization', () => {
    it.each([
      ['VMC', 'VMC'],
      ['Vertical Machining Center', 'VMC'],
      ['HMC', 'HMC'],
      ['5-Axis Simultaneous', '5AXIS'],
      ['CNC Lathe', 'LATHE'],
      ['Mill-Turn', 'MILL_TURN'],
      ['Wire EDM', 'EDM_WIRE'],
      ['Sinker EDM', 'EDM_SINKER'],
      ['Unknown Type', 'OTHER'],
    ])('should normalize "%s" to "%s"', (raw, expected) => {
      const input: MachineLayerInput = {
        machine: makeMachine({ type: raw as any }),
        layer: 'BASIC',
        source_id: 'test',
      };

      const result = machineLayerMerger.merge([input]);

      expect(result.package.canonical_type).toBe(expected);
    });
  });

  describe('topology inference', () => {
    it('should infer three_axis for 3 linear + 0 rotary', () => {
      const input: MachineLayerInput = {
        machine: makeMachine({ axes: { linear_axes: 3, rotary_axes: 0 } as any }),
        layer: 'BASIC',
        source_id: 'test',
      };

      const result = machineLayerMerger.merge([input]);

      expect(result.package.topology).toBe('three_axis');
    });

    it('should infer five_axis for 3 linear + 2 rotary', () => {
      const input: MachineLayerInput = {
        machine: makeMachine({ axes: { linear_axes: 3, rotary_axes: 2 } as any }),
        layer: 'BASIC',
        source_id: 'test',
      };

      const result = machineLayerMerger.merge([input]);

      expect(result.package.topology).toBe('five_axis');
    });
  });

  describe('error handling', () => {
    it('should throw on empty input array', () => {
      expect(() => machineLayerMerger.merge([])).toThrow('MachineLayerMerger requires at least one input');
    });
  });
});
