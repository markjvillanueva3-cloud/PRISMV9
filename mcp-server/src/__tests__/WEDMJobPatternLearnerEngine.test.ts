/**
 * WEDMJobPatternLearnerEngine Tests
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-21
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { wedmJobPatternLearnerEngine, WEDMJobPatternLearnerEngine, JobRecord } from '../engines/WEDMJobPatternLearnerEngine.js';

describe('WEDMJobPatternLearnerEngine', () => {
  let engine: WEDMJobPatternLearnerEngine;

  const sampleJobs: JobRecord[] = [
    {
      job_id: 'J001', customer: 'ALCOA', material: 'tool_steel', thickness_mm: 25,
      wire_type: 'brass', skim_passes: 4, surface_finish_target_um: 0.8,
      has_thin_walls: false, has_sharp_corners: false, was_successful: true,
      timestamp: new Date('2026-04-01'),
    },
    {
      job_id: 'J002', customer: 'ALCOA', material: 'tool_steel', thickness_mm: 30,
      wire_type: 'brass', skim_passes: 4, surface_finish_target_um: 0.8,
      has_thin_walls: false, has_sharp_corners: true, was_successful: true,
      timestamp: new Date('2026-04-05'),
    },
    {
      job_id: 'J003', customer: 'ALCOA', material: 'D2', thickness_mm: 20,
      wire_type: 'brass', skim_passes: 4, surface_finish_target_um: 0.6,
      has_thin_walls: false, has_sharp_corners: false, was_successful: true,
      timestamp: new Date('2026-04-10'),
    },
    {
      job_id: 'J004', customer: 'ITW', material: 'tool_steel', thickness_mm: 15,
      wire_type: 'zinc_coated', skim_passes: 3, surface_finish_target_um: 1.0,
      has_thin_walls: true, has_sharp_corners: false, was_successful: true,
      timestamp: new Date('2026-04-02'),
    },
    {
      job_id: 'J005', customer: 'ITW', material: 'aluminum', thickness_mm: 10,
      wire_type: 'zinc_coated', skim_passes: 3, surface_finish_target_um: 1.2,
      has_thin_walls: true, has_sharp_corners: false, was_successful: true,
      timestamp: new Date('2026-04-08'),
    },
    {
      job_id: 'J006', customer: 'ITW', material: 'tool_steel', thickness_mm: 18,
      wire_type: 'zinc_coated', skim_passes: 3, surface_finish_target_um: 1.0,
      has_thin_walls: false, has_sharp_corners: true, was_successful: true,
      timestamp: new Date('2026-04-12'),
    },
    {
      job_id: 'J007', customer: 'FASTENAL', material: 'carbide', thickness_mm: 8,
      wire_type: 'brass', skim_passes: 5, surface_finish_target_um: 0.4,
      has_thin_walls: true, has_sharp_corners: true, was_successful: true,
      timestamp: new Date('2026-04-03'),
    },
    {
      job_id: 'J008', customer: 'FASTENAL', material: 'carbide', thickness_mm: 6,
      wire_type: 'brass', skim_passes: 5, surface_finish_target_um: 0.4,
      has_thin_walls: true, has_sharp_corners: true, was_successful: true,
      timestamp: new Date('2026-04-09'),
    },
    {
      job_id: 'J009', customer: 'FASTENAL', material: 'tool_steel', thickness_mm: 12,
      wire_type: 'brass', skim_passes: 5, surface_finish_target_um: 0.5,
      has_thin_walls: false, has_sharp_corners: false, was_successful: true,
      timestamp: new Date('2026-04-14'),
    },
  ];

  beforeEach(() => {
    engine = new WEDMJobPatternLearnerEngine();
  });

  describe('learn', () => {
    it('returns pattern learner result', () => {
      const result = engine.learn(sampleJobs);
      expect(result).toBeDefined();
      expect(result.patterns_found).toBeDefined();
      expect(Array.isArray(result.patterns_found)).toBe(true);
    });

    it('finds customer preference patterns', () => {
      const result = engine.learn(sampleJobs);
      expect(result.top_customer_preferences.length).toBeGreaterThan(0);
    });

    it('finds material patterns', () => {
      const result = engine.learn(sampleJobs);
      expect(result.top_material_patterns.length).toBeGreaterThan(0);
    });

    it('calculates coverage percentage', () => {
      const result = engine.learn(sampleJobs);
      expect(result.coverage_pct.value).toBeGreaterThanOrEqual(0);
      expect(result.coverage_pct.value).toBeLessThanOrEqual(100);
      expect(result.coverage_pct.unit).toBe('%');
    });

    it('calculates data quality score', () => {
      const result = engine.learn(sampleJobs);
      expect(result.data_quality_score.value).toBeGreaterThanOrEqual(0);
      expect(result.data_quality_score.value).toBeLessThanOrEqual(1);
    });

    it('ALCOA prefers 4 skim passes', () => {
      const result = engine.learn(sampleJobs);
      const alcoaPattern = result.patterns_found.find(
        p => p.human_readable.includes('ALCOA') && p.human_readable.includes('skim')
      );
      expect(alcoaPattern).toBeDefined();
      expect(alcoaPattern?.recommendation.value).toBe(4);
    });

    it('ITW prefers zinc_coated wire', () => {
      const result = engine.learn(sampleJobs);
      const itwPattern = result.patterns_found.find(
        p => p.human_readable.includes('ITW') && p.human_readable.includes('wire')
      );
      expect(itwPattern).toBeDefined();
      expect(itwPattern?.recommendation.value).toBe('zinc_coated');
    });
  });

  describe('match', () => {
    it('matches patterns for ALCOA job', () => {
      engine.learn(sampleJobs);
      const result = engine.match({
        customer: 'ALCOA',
        material: 'tool_steel',
        thickness_mm: 22,
      });
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('returns recommended settings', () => {
      engine.learn(sampleJobs);
      const result = engine.match({
        customer: 'ALCOA',
        material: 'tool_steel',
      });
      expect(result.recommended_settings).toBeDefined();
      expect(Object.keys(result.recommended_settings).length).toBeGreaterThan(0);
    });

    it('provides confidence overall', () => {
      engine.learn(sampleJobs);
      const result = engine.match({ customer: 'ITW' });
      expect(result.confidence_overall.value).toBeGreaterThanOrEqual(0);
      expect(result.confidence_overall.value).toBeLessThanOrEqual(1);
    });

    it('provides reasoning strings', () => {
      engine.learn(sampleJobs);
      const result = engine.match({ customer: 'ALCOA' });
      expect(Array.isArray(result.reasoning)).toBe(true);
    });

    it('returns empty for unknown customer', () => {
      engine.learn(sampleJobs);
      const result = engine.match({ customer: 'UNKNOWN_CORP' });
      expect(result.matches.filter(m => m.type === 'customer_preference').length).toBe(0);
    });
  });

  describe('getCustomerPatterns', () => {
    it('returns patterns for specific customer', () => {
      engine.learn(sampleJobs);
      const patterns = engine.getCustomerPatterns('ALCOA');
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every(p => p.type === 'customer_preference')).toBe(true);
    });

    it('returns empty for customer with no patterns', () => {
      engine.learn(sampleJobs);
      const patterns = engine.getCustomerPatterns('NONEXISTENT');
      expect(patterns.length).toBe(0);
    });
  });

  describe('addJob', () => {
    it('updates existing patterns', () => {
      engine.learn(sampleJobs);
      const initialPatterns = engine.learn(sampleJobs).pattern_count;

      const newJob: JobRecord = {
        job_id: 'J010', customer: 'ALCOA', material: 'tool_steel', thickness_mm: 28,
        wire_type: 'brass', skim_passes: 4, surface_finish_target_um: 0.8,
        has_thin_walls: false, has_sharp_corners: false, was_successful: true,
        timestamp: new Date('2026-04-16'),
      };

      const result = engine.addJob(newJob);
      expect(result.updated_patterns.length).toBeGreaterThan(0);
    });
  });

  describe('pattern types', () => {
    it('creates thickness patterns', () => {
      const result = engine.learn(sampleJobs);
      const thicknessPatterns = result.patterns_found.filter(
        p => p.type === 'thickness_pattern'
      );
      expect(thicknessPatterns.length).toBeGreaterThan(0);
    });

    it('creates feature patterns for thin walls', () => {
      const result = engine.learn(sampleJobs);
      const thinWallPattern = result.patterns_found.find(
        p => p.type === 'feature_pattern' && p.id === 'thin-wall-handling'
      );
      expect(thinWallPattern).toBeDefined();
    });

    it('creates feature patterns for sharp corners', () => {
      const result = engine.learn(sampleJobs);
      const cornerPattern = result.patterns_found.find(
        p => p.type === 'feature_pattern' && p.id === 'sharp-corner-handling'
      );
      expect(cornerPattern).toBeDefined();
    });
  });

  describe('confidence scoring', () => {
    it('higher support = higher confidence', () => {
      const result = engine.learn(sampleJobs);
      const alcoaPatterns = result.patterns_found.filter(p =>
        p.conditions.some(c => c.value === 'ALCOA')
      );
      for (const p of alcoaPatterns) {
        expect(p.confidence.value).toBeGreaterThanOrEqual(0.6);
      }
    });

    it('patterns have support counts', () => {
      const result = engine.learn(sampleJobs);
      for (const p of result.patterns_found) {
        expect(p.support_count).toBeGreaterThan(0);
      }
    });
  });

  describe('edge cases', () => {
    it('handles empty job list', () => {
      const result = engine.learn([]);
      expect(result.patterns_found.length).toBe(0);
      expect(result.coverage_pct.value).toBe(0);
    });

    it('handles single job', () => {
      const result = engine.learn([sampleJobs[0]]);
      expect(result.patterns_found.length).toBe(0);  // Need minimum support
    });

    it('handles all failed jobs', () => {
      const failedJobs = sampleJobs.map(j => ({ ...j, was_successful: false }));
      const result = engine.learn(failedJobs);
      expect(result.patterns_found.length).toBe(0);
    });
  });

  describe('recency scoring', () => {
    it('patterns have recency scores', () => {
      const result = engine.learn(sampleJobs);
      for (const p of result.patterns_found) {
        expect(p.recency_score).toBeGreaterThanOrEqual(0);
        expect(p.recency_score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('human readable descriptions', () => {
    it('all patterns have human readable text', () => {
      const result = engine.learn(sampleJobs);
      for (const p of result.patterns_found) {
        expect(p.human_readable).toBeDefined();
        expect(p.human_readable.length).toBeGreaterThan(5);
      }
    });

    it('patterns have example job IDs', () => {
      const result = engine.learn(sampleJobs);
      for (const p of result.patterns_found) {
        expect(Array.isArray(p.examples)).toBe(true);
        expect(p.examples.length).toBeGreaterThan(0);
      }
    });
  });
});
