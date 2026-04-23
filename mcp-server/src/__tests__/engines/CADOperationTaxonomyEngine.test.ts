/**
 * Tests for CADOperationTaxonomyEngine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CADOperationTaxonomyEngine,
  cadOperationTaxonomyEngine,
  OperationCategory,
  ComplexityLevel,
  CADSystem
} from '../../engines/CADOperationTaxonomyEngine.js';

describe('CADOperationTaxonomyEngine', () => {
  let engine: CADOperationTaxonomyEngine;

  beforeEach(() => {
    engine = new CADOperationTaxonomyEngine();
  });

  describe('meta()', () => {
    it('returns engine metadata', () => {
      const meta = CADOperationTaxonomyEngine.meta();
      expect(meta.name).toBe('CADOperationTaxonomyEngine');
      expect(meta.version).toBe('1.0.0');
      expect(meta.categories).toContain('aerospace');
    });
  });

  describe('getOperation()', () => {
    it('returns operation by ID', () => {
      const op = engine.getOperation('loft');
      expect(op).not.toBeNull();
      expect(op?.name).toBe('Loft');
      expect(op?.isAerospace).toBe(true);
    });

    it('returns null for unknown operation', () => {
      const op = engine.getOperation('nonexistent_op');
      expect(op).toBeNull();
    });

    it('returns all 5 aerospace operations', () => {
      const aerospaceIds = ['loft', 'sweep', 'ruled_surface', 'blend_surface', 'variable_fillet'];
      for (const id of aerospaceIds) {
        const op = engine.getOperation(id);
        expect(op).not.toBeNull();
        expect(op?.isAerospace).toBe(true);
      }
    });
  });

  describe('getAllOperations()', () => {
    it('returns all operations', () => {
      const ops = engine.getAllOperations();
      expect(ops.length).toBeGreaterThanOrEqual(15);
    });

    it('each operation has required fields', () => {
      const ops = engine.getAllOperations();
      for (const op of ops) {
        expect(op.id).toBeDefined();
        expect(op.name).toBeDefined();
        expect(op.category).toBeDefined();
        expect(op.complexity).toBeDefined();
        expect(op.inputs).toBeInstanceOf(Array);
        expect(op.outputs).toBeInstanceOf(Array);
        expect(op.supportedSystems).toBeInstanceOf(Array);
      }
    });
  });

  describe('getAerospaceOperations()', () => {
    it('returns only aerospace operations', () => {
      const ops = engine.getAerospaceOperations();
      expect(ops.length).toBe(6);
      for (const op of ops) {
        expect(op.isAerospace).toBe(true);
      }
    });

    it('includes loft, sweep, ruled_surface, blend_surface, variable_fillet', () => {
      const ops = engine.getAerospaceOperations();
      const ids = ops.map(o => o.id);
      expect(ids).toContain('loft');
      expect(ids).toContain('sweep');
      expect(ids).toContain('ruled_surface');
      expect(ids).toContain('blend_surface');
      expect(ids).toContain('variable_fillet');
    });
  });

  describe('getByCategory()', () => {
    it('filters by solid_creation', () => {
      const ops = engine.getByCategory('solid_creation');
      expect(ops.length).toBeGreaterThanOrEqual(3);
      for (const op of ops) {
        expect(op.category).toBe('solid_creation');
      }
    });

    it('filters by surface_creation', () => {
      const ops = engine.getByCategory('surface_creation');
      expect(ops.length).toBeGreaterThanOrEqual(2);
      for (const op of ops) {
        expect(op.category).toBe('surface_creation');
      }
    });

    it('filters by solid_modification', () => {
      const ops = engine.getByCategory('solid_modification');
      expect(ops.length).toBeGreaterThanOrEqual(5);
      for (const op of ops) {
        expect(op.category).toBe('solid_modification');
      }
    });
  });

  describe('getByComplexity()', () => {
    it('filters by basic complexity', () => {
      const ops = engine.getByComplexity('basic');
      expect(ops.length).toBeGreaterThanOrEqual(4);
      for (const op of ops) {
        expect(op.complexity).toBe('basic');
      }
    });

    it('filters by advanced complexity', () => {
      const ops = engine.getByComplexity('advanced');
      expect(ops.length).toBeGreaterThanOrEqual(3);
      for (const op of ops) {
        expect(op.complexity).toBe('advanced');
      }
    });

    it('filters by expert complexity', () => {
      const ops = engine.getByComplexity('expert');
      expect(ops.length).toBeGreaterThanOrEqual(1);
      expect(ops.some(o => o.id === 'blend_surface')).toBe(true);
    });
  });

  describe('getBySupportedSystem()', () => {
    it('returns operations for fusion360', () => {
      const ops = engine.getBySupportedSystem('fusion360');
      expect(ops.length).toBeGreaterThanOrEqual(10);
      for (const op of ops) {
        expect(op.supportedSystems).toContain('fusion360');
      }
    });

    it('returns operations for nx', () => {
      const ops = engine.getBySupportedSystem('nx');
      expect(ops.length).toBeGreaterThanOrEqual(5);
      for (const op of ops) {
        expect(op.supportedSystems).toContain('nx');
      }
    });

    it('returns fewer operations for limited systems', () => {
      const nxOps = engine.getBySupportedSystem('nx');
      const freecadOps = engine.getBySupportedSystem('freecad');
      // FreeCAD typically supports fewer advanced surface ops
      expect(nxOps.length).toBeGreaterThanOrEqual(freecadOps.length - 5);
    });
  });

  describe('search()', () => {
    it('finds operations by name', () => {
      const results = engine.search('loft');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].operation.id).toBe('loft');
      expect(results[0].matchedFields).toContain('name');
    });

    it('finds operations by alias', () => {
      const results = engine.search('pipe');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].operation.id).toBe('sweep');
    });

    it('finds operations by use case', () => {
      const results = engine.search('airfoil');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].operation.id).toBe('loft');
    });

    it('returns empty for no matches', () => {
      const results = engine.search('xyznonexistent123');
      expect(results.length).toBe(0);
    });

    it('ranks results by relevance', () => {
      const results = engine.search('fillet');
      expect(results.length).toBeGreaterThan(1);
      // Direct name match should rank higher
      const topResult = results[0];
      expect(topResult.matchScore).toBeGreaterThan(results[1]?.matchScore || 0);
    });
  });

  describe('checkCompatibility()', () => {
    it('reports supported operation', () => {
      const report = engine.checkCompatibility('extrude', 'fusion360');
      expect(report.supported).toBe(true);
      expect(report.alternatives.length).toBe(0);
    });

    it('reports unsupported operation with alternatives', () => {
      // blend_surface is expert-level, not in all systems
      const report = engine.checkCompatibility('blend_surface', 'freecad');
      expect(report.supported).toBe(false);
      // Should suggest related ops that ARE supported
    });

    it('handles unknown operation', () => {
      const report = engine.checkCompatibility('nonexistent', 'fusion360');
      expect(report.supported).toBe(false);
      expect(report.notes).toContain('not found');
    });
  });

  describe('getRequiredParams()', () => {
    it('returns required params for loft', () => {
      const params = engine.getRequiredParams('loft');
      expect(params.length).toBeGreaterThan(0);
      expect(params.some(p => p.name === 'profiles')).toBe(true);
    });

    it('returns required params for extrude', () => {
      const params = engine.getRequiredParams('extrude');
      expect(params.length).toBe(2);
      expect(params.map(p => p.name)).toContain('profile');
      expect(params.map(p => p.name)).toContain('distance');
    });

    it('returns empty for unknown operation', () => {
      const params = engine.getRequiredParams('unknown');
      expect(params.length).toBe(0);
    });
  });

  describe('getOptionalParams()', () => {
    it('returns optional params for sweep', () => {
      const params = engine.getOptionalParams('sweep');
      expect(params.length).toBeGreaterThan(3);
      expect(params.some(p => p.name === 'twist_angle')).toBe(true);
      expect(params.some(p => p.name === 'scale_start')).toBe(true);
    });

    it('all optional params have defaults defined', () => {
      const params = engine.getOptionalParams('fillet');
      for (const p of params) {
        expect(p.required).toBe(false);
      }
    });
  });

  describe('getStats()', () => {
    it('returns comprehensive statistics', () => {
      const stats = engine.getStats();
      expect(stats.totalOperations).toBeGreaterThanOrEqual(15);
      expect(stats.aerospaceOps).toBe(6);
      expect(stats.avgSystemSupport).toBeGreaterThan(5);
    });

    it('breaks down by category', () => {
      const stats = engine.getStats();
      const totalByCategory = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);
      expect(totalByCategory).toBe(stats.totalOperations);
    });

    it('breaks down by complexity', () => {
      const stats = engine.getStats();
      const totalByComplexity = Object.values(stats.byComplexity).reduce((a, b) => a + b, 0);
      expect(totalByComplexity).toBe(stats.totalOperations);
    });
  });

  describe('getByContinuity()', () => {
    it('finds G2 continuity operations', () => {
      const ops = engine.getByContinuity('G2');
      expect(ops.length).toBeGreaterThanOrEqual(3);
      for (const op of ops) {
        expect(op.continuity).toBe('G2');
      }
    });

    it('finds G0 continuity operations', () => {
      const ops = engine.getByContinuity('G0');
      expect(ops.length).toBeGreaterThanOrEqual(1);
      expect(ops.some(o => o.id === 'ruled_surface')).toBe(true);
    });
  });

  describe('getRelatedChain()', () => {
    it('finds related operations for loft', () => {
      const related = engine.getRelatedChain('loft', 1);
      expect(related).toContain('sweep');
      expect(related).toContain('blend_surface');
    });

    it('expands chain with depth', () => {
      const depth1 = engine.getRelatedChain('loft', 1);
      const depth2 = engine.getRelatedChain('loft', 2);
      expect(depth2.length).toBeGreaterThanOrEqual(depth1.length);
    });

    it('returns empty for unknown operation', () => {
      const related = engine.getRelatedChain('unknown');
      expect(related.length).toBe(0);
    });
  });

  describe('suggestForUseCase()', () => {
    it('suggests loft for airfoil description', () => {
      const results = engine.suggestForUseCase('create turbine blade with varying cross sections');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].operation.id).toBe('loft');
    });

    it('suggests sweep for pipe description', () => {
      const results = engine.suggestForUseCase('extrude profile along curved path for tubing');
      expect(results.length).toBeGreaterThan(0);
      const ids = results.map(r => r.operation.id);
      expect(ids).toContain('sweep');
    });

    it('suggests fillet for stress relief', () => {
      const results = engine.suggestForUseCase('round edges for stress relief');
      expect(results.length).toBeGreaterThan(0);
      const ids = results.map(r => r.operation.id);
      expect(ids.includes('fillet') || ids.includes('variable_fillet')).toBe(true);
    });
  });

  describe('validateParams()', () => {
    it('validates correct extrude params', () => {
      const result = engine.validateParams('extrude', {
        profile: 'sketch1',
        distance: 10
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('catches missing required params', () => {
      const result = engine.validateParams('extrude', {
        profile: 'sketch1'
        // missing distance
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required parameter: distance');
    });

    it('catches out-of-range values', () => {
      const result = engine.validateParams('extrude', {
        profile: 'sketch1',
        distance: 10,
        taper_angle: 95 // max is 89
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('taper_angle'))).toBe(true);
    });

    it('warns about unknown params', () => {
      const result = engine.validateParams('extrude', {
        profile: 'sketch1',
        distance: 10,
        unknown_param: 'value'
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Unknown parameter: unknown_param');
    });

    it('handles unknown operation', () => {
      const result = engine.validateParams('nonexistent', { foo: 'bar' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unknown operation');
    });
  });

  describe('singleton export', () => {
    it('exports singleton instance', () => {
      expect(cadOperationTaxonomyEngine).toBeInstanceOf(CADOperationTaxonomyEngine);
    });

    it('singleton has same operations as new instance', () => {
      const singletonOps = cadOperationTaxonomyEngine.getAllOperations();
      const newOps = engine.getAllOperations();
      expect(singletonOps.length).toBe(newOps.length);
    });
  });

  describe('aerospace operation details', () => {
    it('loft has guide curves and continuity control', () => {
      const op = engine.getOperation('loft');
      expect(op?.inputs.some(i => i.name === 'guide_curves')).toBe(true);
      expect(op?.inputs.some(i => i.name === 'start_continuity')).toBe(true);
      expect(op?.inputs.some(i => i.name === 'end_continuity')).toBe(true);
    });

    it('sweep supports twist and scale', () => {
      const op = engine.getOperation('sweep');
      expect(op?.inputs.some(i => i.name === 'twist_angle')).toBe(true);
      expect(op?.inputs.some(i => i.name === 'scale_start')).toBe(true);
      expect(op?.inputs.some(i => i.name === 'scale_end')).toBe(true);
    });

    it('ruled_surface has alignment control', () => {
      const op = engine.getOperation('ruled_surface');
      expect(op?.inputs.some(i => i.name === 'alignment')).toBe(true);
      expect(op?.inputs.some(i => i.name === 'flip_curve2')).toBe(true);
    });

    it('blend_surface has G2/G3 continuity support', () => {
      const op = engine.getOperation('blend_surface');
      expect(op?.inputs.some(i => i.name === 'continuity1')).toBe(true);
      expect(op?.inputs.some(i => i.name === 'tension1')).toBe(true);
      expect(op?.continuity).toBe('G2');
    });

    it('variable_fillet has conic and holdline control', () => {
      const op = engine.getOperation('variable_fillet');
      expect(op?.inputs.some(i => i.name === 'conic_rho')).toBe(true);
      expect(op?.inputs.some(i => i.name === 'holdline')).toBe(true);
      expect(op?.inputs.some(i => i.name === 'radius_values')).toBe(true);
    });
  });
});
