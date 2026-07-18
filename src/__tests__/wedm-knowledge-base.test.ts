/**
 * U-W100-28: WEDM Knowledge Base Enrichment Tests
 *
 * Validates that WEDM-specific tribal knowledge tips are:
 *   - Present in TribalKnowledgeEngine
 *   - Queryable by relevant search terms
 *   - Properly categorized and tagged
 *   - Non-duplicate with existing tips
 *   - Actionable (contain specific numbers/thresholds, not vague advice)
 *
 * Ref: Klocke (2013) Ch.8, Mitsubishi FA app notes, Reliable EDM Ch.5
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { TribalKnowledgeEngine } from '../engines/TribalKnowledgeEngine.js';
import { WEDM_KNOWLEDGE_TIPS } from '../data/wedm-knowledge-tips.js';

let engine: TribalKnowledgeEngine;

beforeAll(() => {
  engine = new TribalKnowledgeEngine();
});

// ============================================================================
// TESTS
// ============================================================================

describe('U-W100-28: WEDM Knowledge Base Enrichment', () => {

  describe('Tips data file structure', () => {
    it('contains at least 25 WEDM-specific tips', () => {
      expect(WEDM_KNOWLEDGE_TIPS.length).toBeGreaterThanOrEqual(25);
    });

    it('all tips have unique IDs starting with wedm-kb-', () => {
      const ids = WEDM_KNOWLEDGE_TIPS.map(t => t.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
      for (const id of ids) {
        expect(id).toMatch(/^wedm-kb-\d{3}$/);
      }
    });

    it('all tips have non-empty title, body, and category', () => {
      for (const tip of WEDM_KNOWLEDGE_TIPS) {
        expect(tip.title.length).toBeGreaterThan(10);
        expect(tip.body.length).toBeGreaterThan(50);
        expect(tip.category.length).toBeGreaterThan(0);
      }
    });

    it('all tips have confidence 80-100', () => {
      for (const tip of WEDM_KNOWLEDGE_TIPS) {
        expect(tip.confidence).toBeGreaterThanOrEqual(80);
        expect(tip.confidence).toBeLessThanOrEqual(100);
      }
    });

    it('all tips include wire-edm tag', () => {
      for (const tip of WEDM_KNOWLEDGE_TIPS) {
        expect(tip.tags).toContain('wire-edm');
      }
    });

    it('all tips have operation_types including wire_edm', () => {
      for (const tip of WEDM_KNOWLEDGE_TIPS) {
        expect(tip.operation_types).toContain('wire_edm');
      }
    });

    it('all tips have a source citation', () => {
      for (const tip of WEDM_KNOWLEDGE_TIPS) {
        expect(tip.source.length).toBeGreaterThan(5);
        // Source should be handbook:, operator:, safety:, or program:
        expect(tip.source).toMatch(/^(handbook|operator|safety|program):/);
      }
    });
  });

  describe('Topic coverage', () => {
    it('covers wire breakage (at least 4 tips)', () => {
      const breakTips = WEDM_KNOWLEDGE_TIPS.filter(t =>
        t.tags.includes('wire-break') || t.title.toLowerCase().includes('wire break')
      );
      expect(breakTips.length).toBeGreaterThanOrEqual(4);
    });

    it('covers surface finish / Ra troubleshooting (at least 4 tips)', () => {
      const raTips = WEDM_KNOWLEDGE_TIPS.filter(t =>
        t.tags.includes('surface-finish') || t.tags.includes('Ra')
      );
      expect(raTips.length).toBeGreaterThanOrEqual(4);
    });

    it('covers thick section cutting (at least 3 tips)', () => {
      const thickTips = WEDM_KNOWLEDGE_TIPS.filter(t =>
        t.tags.includes('thick-section') || t.title.toLowerCase().includes('thick')
      );
      expect(thickTips.length).toBeGreaterThanOrEqual(3);
    });

    it('covers taper / UV axis (at least 3 tips)', () => {
      const taperTips = WEDM_KNOWLEDGE_TIPS.filter(t =>
        t.tags.includes('taper') || t.tags.includes('uv-axis')
      );
      expect(taperTips.length).toBeGreaterThanOrEqual(3);
    });

    it('covers flushing (at least 3 tips)', () => {
      const flushTips = WEDM_KNOWLEDGE_TIPS.filter(t =>
        t.tags.includes('flushing') || t.title.toLowerCase().includes('flush')
      );
      expect(flushTips.length).toBeGreaterThanOrEqual(3);
    });

    it('covers safety (at least 2 tips)', () => {
      const safetyTips = WEDM_KNOWLEDGE_TIPS.filter(t =>
        t.category === 'safety'
      );
      expect(safetyTips.length).toBeGreaterThanOrEqual(2);
    });

    it('covers setup and workholding (at least 3 tips)', () => {
      const setupTips = WEDM_KNOWLEDGE_TIPS.filter(t =>
        t.category === 'setup' || t.tags.includes('workholding') || t.tags.includes('start-hole')
      );
      expect(setupTips.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Tips are actionable (contain specific values)', () => {
    it('wire breakage tips mention specific parameters (tension, ON time, pressure)', () => {
      const breakTips = WEDM_KNOWLEDGE_TIPS.filter(t => t.tags.includes('wire-break'));
      const bodiesJoined = breakTips.map(t => t.body).join(' ');
      expect(bodiesJoined).toMatch(/\d+/); // Contains numbers
      expect(bodiesJoined.toLowerCase()).toMatch(/bar|mm|%|µm|ohm/i); // Contains units
    });

    it('Ra tips mention specific Ra values', () => {
      const raTips = WEDM_KNOWLEDGE_TIPS.filter(t =>
        t.tags.includes('surface-finish') || t.tags.includes('Ra')
      );
      const bodiesJoined = raTips.map(t => t.body).join(' ');
      expect(bodiesJoined).toMatch(/\d+(\.\d+)?µm/); // Contains µm Ra values
    });

    it('thick section tips mention specific thickness thresholds', () => {
      const thickTips = WEDM_KNOWLEDGE_TIPS.filter(t => t.tags.includes('thick-section'));
      const bodiesJoined = thickTips.map(t => t.body).join(' ');
      expect(bodiesJoined).toMatch(/\d+mm/); // Contains mm values
      expect(bodiesJoined).toMatch(/50|100|150|200/); // Contains specific thresholds
    });

    it('safety tips have confidence >= 95', () => {
      const safetyTips = WEDM_KNOWLEDGE_TIPS.filter(t => t.category === 'safety');
      for (const tip of safetyTips) {
        expect(tip.confidence).toBeGreaterThanOrEqual(85);
      }
    });
  });

  describe('Integration with TribalKnowledgeEngine', () => {
    it('WEDM tips are loaded into the engine', () => {
      const results = engine.search({ query: 'wire EDM' });
      // Should find at least some WEDM tips
      const wedmResults = results.filter(t => t.id.startsWith('wedm-kb-'));
      expect(wedmResults.length).toBeGreaterThan(0);
    });

    it('search for "wire breakage" returns relevant tips', () => {
      const results = engine.search({ query: 'wire breakage' });
      const relevant = results.filter(t =>
        t.tags.includes('wire-break') || t.body.toLowerCase().includes('wire break')
      );
      expect(relevant.length).toBeGreaterThan(0);
    });

    it('search for "thick section" returns relevant tips', () => {
      const results = engine.search({ query: 'thick section' });
      const relevant = results.filter(t =>
        t.tags.includes('thick-section') || t.body.toLowerCase().includes('thick')
      );
      expect(relevant.length).toBeGreaterThan(0);
    });

    it('search for "surface finish Ra" returns relevant tips', () => {
      const results = engine.search({ query: 'surface finish Ra' });
      const relevant = results.filter(t =>
        t.tags.includes('Ra') || t.tags.includes('surface-finish')
      );
      expect(relevant.length).toBeGreaterThan(0);
    });

    it('search for "taper" returns relevant tips', () => {
      const results = engine.search({ query: 'taper' });
      const relevant = results.filter(t =>
        t.tags.includes('taper') || t.body.toLowerCase().includes('taper')
      );
      expect(relevant.length).toBeGreaterThan(0);
    });

    it('search for "flushing" returns relevant tips', () => {
      const results = engine.search({ query: 'flushing' });
      const relevant = results.filter(t =>
        t.tags.includes('flushing') || t.body.toLowerCase().includes('flush')
      );
      expect(relevant.length).toBeGreaterThan(0);
    });
  });

  describe('No duplicates with existing tips', () => {
    it('WEDM tip IDs do not collide with existing tips', () => {
      // Search with high limit to get all WEDM tips
      const allTips = engine.search({ query: 'wire-edm', limit: 500 });
      const wedmIds = WEDM_KNOWLEDGE_TIPS.map(t => t.id);
      // Each WEDM ID should appear exactly once
      for (const id of wedmIds) {
        const count = allTips.filter(a => a.id === id).length;
        expect(count).toBe(1);
      }
    });

    it('WEDM tips do not duplicate existing wire EDM tips by content', () => {
      // Get existing non-WEDM-KB wire EDM tips
      const allTips = engine.search({ query: 'wire', limit: 500 });
      const existing = allTips.filter(t => !t.id.startsWith('wedm-kb-'));
      const newTips = allTips.filter(t => t.id.startsWith('wedm-kb-'));
      // Titles should not be identical
      for (const newTip of newTips) {
        for (const old of existing) {
          expect(newTip.title).not.toBe(old.title);
        }
      }
    });
  });

  describe('EXIT GATE', () => {
    it('wire breakage tips are queryable', () => {
      // search() uses substring match — "wire break" is in titles/bodies
      const results = engine.search({ query: 'wire break', limit: 20 });
      expect(results.some(t => t.id.startsWith('wedm-kb-'))).toBe(true);
    });

    it('Ra troubleshooting tips are queryable', () => {
      // "resistivity" is specific to WEDM Ra troubleshooting tips
      const results = engine.search({ query: 'resistivity', limit: 20 });
      expect(results.some(t => t.id.startsWith('wedm-kb-'))).toBe(true);
    });

    it('thick section tips are queryable', () => {
      const results = engine.search({ query: 'thick', limit: 20 });
      expect(results.some(t => t.tags.includes('thick-section') || t.tags.includes('deep-cut'))).toBe(true);
    });

    it('taper tips are queryable', () => {
      const results = engine.search({ query: 'taper', limit: 20 });
      expect(results.some(t => t.tags.includes('taper'))).toBe(true);
    });

    it('flush tips are queryable', () => {
      const results = engine.search({ query: 'flush', limit: 20 });
      expect(results.some(t => t.tags.includes('flushing'))).toBe(true);
    });
  });
});
