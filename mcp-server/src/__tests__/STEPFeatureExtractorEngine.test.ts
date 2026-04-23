/**
 * STEPFeatureExtractorEngine Tests
 *
 * Tests STEP file feature extraction, part classification,
 * manufacturing sequence inference, and operation generation.
 */

import { describe, it, expect } from 'vitest';
import { stepFeatureExtractorEngine } from '../engines/hypermill/STEPFeatureExtractorEngine.js';
import type { RecognizedFeature } from '../engines/FeatureRecognitionEngine.js';

describe('STEPFeatureExtractorEngine', () => {
  const makeFeature = (
    type: RecognizedFeature['type'],
    dims: Partial<RecognizedFeature['dimensions']> = {}
  ): RecognizedFeature => ({
    id: `feat_${Math.random().toString(36).slice(2, 8)}`,
    type,
    dimensions: {
      width_mm: dims.width_mm,
      length_mm: dims.length_mm,
      depth_mm: dims.depth_mm ?? 10,
      diameter_mm: dims.diameter_mm,
      pitch_mm: dims.pitch_mm,
    },
    position: { x: 0, y: 0, z: 0 },
    normal: { x: 0, y: 0, z: 1 },
    confidence: 0.9,
    source: 'test',
  });

  describe('extract', () => {
    it('extracts features and generates operations', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'TestPart',
        material: 'aluminum_6061',
        boundingBox: { x: 100, y: 80, z: 30 },
        features: [
          makeFeature('face', { width_mm: 100, length_mm: 80, depth_mm: 2 }),
          makeFeature('pocket_rectangular', { width_mm: 40, length_mm: 50, depth_mm: 15 }),
          makeFeature('through_hole', { diameter_mm: 10, depth_mm: 30 }),
        ],
      });

      expect(result.record.source).toBe('step_inferred');
      expect(result.record.partName).toBe('TestPart');
      expect(result.stats.featureCount).toBe(3);
      expect(result.stats.inferredOperations).toBeGreaterThan(0);
    });

    it('assigns unique operation indices', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'IndexTest',
        material: 'steel_1045',
        boundingBox: { x: 50, y: 50, z: 20 },
        features: [
          makeFeature('pocket_rectangular', { width_mm: 30, length_mm: 30, depth_mm: 10 }),
          makeFeature('through_hole', { diameter_mm: 8, depth_mm: 20 }),
        ],
      });

      const indices = result.record.operations.map(op => op.index);
      const uniqueIndices = new Set(indices);
      expect(uniqueIndices.size).toBe(indices.length);
    });

    it('generates stock with allowance', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'StockTest',
        material: 'aluminum_7075',
        boundingBox: { x: 100, y: 60, z: 25 },
        features: [makeFeature('face')],
      });

      expect(result.record.stock.dimensions.x).toBeGreaterThan(100);
      expect(result.record.stock.dimensions.y).toBeGreaterThan(60);
      expect(result.record.stock.dimensions.z).toBeGreaterThan(25);
    });

    it('calculates complexity score', () => {
      const simple = stepFeatureExtractorEngine.extract({
        partName: 'Simple',
        material: 'aluminum',
        boundingBox: { x: 50, y: 50, z: 10 },
        features: [makeFeature('face')],
      });

      const complex = stepFeatureExtractorEngine.extract({
        partName: 'Complex',
        material: 'titanium',
        boundingBox: { x: 100, y: 100, z: 50 },
        features: [
          makeFeature('face'),
          makeFeature('pocket_rectangular', { depth_mm: 20 }),
          makeFeature('pocket_freeform', { depth_mm: 15 }),
          makeFeature('contour_3d', { depth_mm: 10 }),
          makeFeature('through_hole', { diameter_mm: 10 }),
          makeFeature('through_hole', { diameter_mm: 6 }),
          makeFeature('chamfer', { depth_mm: 2 }),
        ],
      });

      expect(complex.analysis.complexityScore).toBeGreaterThan(simple.analysis.complexityScore);
    });

    it('computes extraction confidence', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'ConfidenceTest',
        material: 'steel',
        boundingBox: { x: 80, y: 60, z: 30 },
        features: [
          makeFeature('pocket_rectangular', { depth_mm: 15 }),
          makeFeature('through_hole', { diameter_mm: 8 }),
        ],
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('classifyPart', () => {
    it('classifies prismatic parts', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'Prismatic',
        material: 'aluminum',
        boundingBox: { x: 100, y: 80, z: 40 },
        features: [
          makeFeature('face'),
          makeFeature('pocket_rectangular'),
          makeFeature('step'),
        ],
      });

      expect(result.analysis.partClass).toBe('prismatic');
    });

    it('classifies cylindrical parts', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'Cylindrical',
        material: 'steel',
        boundingBox: { x: 50, y: 50, z: 100 },
        features: [
          makeFeature('through_hole', { diameter_mm: 20 }),
          makeFeature('through_hole', { diameter_mm: 10 }),
          makeFeature('blind_hole', { diameter_mm: 6 }),
          makeFeature('tapped_hole', { diameter_mm: 8, pitch_mm: 1.25 }),
          makeFeature('groove'),
        ],
      });

      expect(result.analysis.partClass).toBe('cylindrical');
    });

    it('classifies freeform parts', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'Freeform',
        material: 'aluminum',
        boundingBox: { x: 80, y: 60, z: 30 },
        features: [
          makeFeature('contour_3d'),
          makeFeature('pocket_freeform'),
        ],
      });

      expect(result.analysis.partClass).toBe('freeform');
    });

    it('classifies thin wall parts', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'ThinWall',
        material: 'aluminum',
        boundingBox: { x: 200, y: 150, z: 3 },
        features: [makeFeature('face')],
      });

      expect(result.analysis.partClass).toBe('thin_wall');
    });
  });

  describe('sortByManufacturingOrder', () => {
    it('sequences facing before pockets', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'Sequence',
        material: 'aluminum',
        boundingBox: { x: 100, y: 80, z: 30 },
        features: [
          makeFeature('pocket_rectangular', { depth_mm: 15 }),
          makeFeature('face', { depth_mm: 2 }),
        ],
      });

      const faceOpIdx = result.record.operations.findIndex(op => op.cycleCode === 'FACE_MILLING');
      const pocketOpIdx = result.record.operations.findIndex(op => op.cycleCode === 'POCKET_2D');

      expect(faceOpIdx).toBeLessThan(pocketOpIdx);
    });

    it('sequences holes after pockets', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'HoleAfterPocket',
        material: 'steel',
        boundingBox: { x: 80, y: 60, z: 25 },
        features: [
          makeFeature('through_hole', { diameter_mm: 10 }),
          makeFeature('pocket_rectangular', { depth_mm: 15 }),
        ],
      });

      const pocketOps = result.record.operations.filter(op => op.cycleCode === 'POCKET_2D');
      const holeOps = result.record.operations.filter(op => op.cycleCode === 'DRILLING');

      if (pocketOps.length > 0 && holeOps.length > 0) {
        const lastPocketIdx = Math.max(...pocketOps.map(op => op.index));
        const firstHoleIdx = Math.min(...holeOps.map(op => op.index));
        expect(lastPocketIdx).toBeLessThan(firstHoleIdx);
      }
    });

    it('sequences tapping after drilling', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'TapAfterDrill',
        material: 'aluminum',
        boundingBox: { x: 60, y: 60, z: 20 },
        features: [
          makeFeature('tapped_hole', { diameter_mm: 8, depth_mm: 15, pitch_mm: 1.25 }),
        ],
      });

      const drillOp = result.record.operations.find(op => op.cycleCode === 'DRILLING');
      const tapOp = result.record.operations.find(op => op.cycleCode === 'TAPPING');

      if (drillOp && tapOp) {
        expect(drillOp.index).toBeLessThan(tapOp.index);
      }
    });
  });

  describe('inferOperations', () => {
    it('generates roughing and finishing for deep pockets', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'DeepPocket',
        material: 'steel_4140',
        boundingBox: { x: 100, y: 100, z: 50 },
        features: [
          makeFeature('pocket_rectangular', { width_mm: 40, length_mm: 60, depth_mm: 25 }),
        ],
      });

      const roughOps = result.record.operations.filter(op => op.operationType === 'roughing');
      const finishOps = result.record.operations.filter(op => op.operationType === 'finishing');

      expect(roughOps.length).toBeGreaterThan(0);
      expect(finishOps.length).toBeGreaterThan(0);
    });

    it('assigns appropriate tools by feature type', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'ToolAssignment',
        material: 'aluminum',
        boundingBox: { x: 80, y: 80, z: 30 },
        features: [
          makeFeature('face'),
          makeFeature('through_hole', { diameter_mm: 10 }),
        ],
      });

      const faceOp = result.record.operations.find(op => op.cycleCode === 'FACE_MILLING');
      const drillOp = result.record.operations.find(op => op.cycleCode === 'DRILLING');

      expect(faceOp?.tool.type).toBe('face_mill');
      expect(drillOp?.tool.type).toBe('drill');
    });

    it('applies material-specific speed/feed defaults', () => {
      const aluminum = stepFeatureExtractorEngine.extract({
        partName: 'Aluminum',
        material: 'aluminum_6061',
        boundingBox: { x: 50, y: 50, z: 20 },
        features: [makeFeature('pocket_rectangular', { depth_mm: 10 })],
      });

      const steel = stepFeatureExtractorEngine.extract({
        partName: 'Steel',
        material: 'steel_4140',
        boundingBox: { x: 50, y: 50, z: 20 },
        features: [makeFeature('pocket_rectangular', { depth_mm: 10 })],
      });

      const aluOp = aluminum.record.operations.find(op => op.parameters.spindle_rpm);
      const steelOp = steel.record.operations.find(op => op.parameters.spindle_rpm);

      if (aluOp && steelOp) {
        expect(aluOp.parameters.spindle_rpm).toBeGreaterThan(steelOp.parameters.spindle_rpm as number);
      }
    });

    it('estimates cycle time for operations', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'CycleTime',
        material: 'aluminum',
        boundingBox: { x: 100, y: 80, z: 40 },
        features: [
          makeFeature('pocket_rectangular', { width_mm: 50, length_mm: 60, depth_mm: 20 }),
        ],
      });

      for (const op of result.record.operations) {
        expect(op.estimatedCycleTimeSec).toBeGreaterThan(0);
      }
      expect(result.record.totalCycleTimeSec).toBeGreaterThan(0);
    });
  });

  describe('material ISO group inference', () => {
    it('infers N group for aluminum', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'Alu',
        material: 'aluminum_7075-T6',
        boundingBox: { x: 50, y: 50, z: 20 },
        features: [makeFeature('face')],
      });

      expect(result.record.stock.isoGroup).toBe('N');
    });

    it('infers P group for carbon steel', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'Steel',
        material: '1045 steel',
        boundingBox: { x: 50, y: 50, z: 20 },
        features: [makeFeature('face')],
      });

      expect(result.record.stock.isoGroup).toBe('P');
    });

    it('infers M group for stainless', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'Stainless',
        material: '316L stainless steel',
        boundingBox: { x: 50, y: 50, z: 20 },
        features: [makeFeature('face')],
      });

      expect(result.record.stock.isoGroup).toBe('M');
    });

    it('infers S group for titanium', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'Titanium',
        material: 'Ti-6Al-4V',
        boundingBox: { x: 50, y: 50, z: 20 },
        features: [makeFeature('face')],
      });

      expect(result.record.stock.isoGroup).toBe('S');
    });

    it('infers H group for hardened tool steel', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'ToolSteel',
        material: 'D2 hardened 60 HRC',
        boundingBox: { x: 50, y: 50, z: 20 },
        features: [makeFeature('face')],
      });

      expect(result.record.stock.isoGroup).toBe('H');
    });
  });

  describe('featureBreakdown', () => {
    it('counts features by type', () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: 'Breakdown',
        material: 'aluminum',
        boundingBox: { x: 100, y: 80, z: 30 },
        features: [
          makeFeature('through_hole'),
          makeFeature('through_hole'),
          makeFeature('through_hole'),
          makeFeature('pocket_rectangular'),
          makeFeature('face'),
        ],
      });

      expect(result.analysis.featureBreakdown.through_hole).toBe(3);
      expect(result.analysis.featureBreakdown.pocket_rectangular).toBe(1);
      expect(result.analysis.featureBreakdown.face).toBe(1);
    });
  });
});
