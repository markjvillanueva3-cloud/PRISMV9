/**
 * Tests for SystemSnapshotEngine
 * ================================
 * Covers: getCompactSnapshot, getLayeredSnapshot, getChangeSummary, getDriftReport, getLiveCounts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SystemSnapshotEngine, systemSnapshotEngine } from '../engines/SystemSnapshotEngine.js';
import type { SnapshotDepth } from '../engines/SystemSnapshotEngine.js';

describe('SystemSnapshotEngine', () => {
  let engine: SystemSnapshotEngine;

  beforeEach(() => {
    engine = new SystemSnapshotEngine();
  });

  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe('singleton', () => {
    it('exports a singleton instance', () => {
      expect(systemSnapshotEngine).toBeInstanceOf(SystemSnapshotEngine);
    });

    it('singleton is stable reference', () => {
      expect(systemSnapshotEngine).toBe(systemSnapshotEngine);
    });
  });

  // ==========================================================================
  // getLiveCounts
  // ==========================================================================

  describe('getLiveCounts', () => {
    it('returns an object with all expected count fields', () => {
      const counts = engine.getLiveCounts();
      expect(counts).toHaveProperty('engines');
      expect(counts).toHaveProperty('dispatchers');
      expect(counts).toHaveProperty('algorithms');
      expect(counts).toHaveProperty('registries');
      expect(counts).toHaveProperty('hooks');
      expect(counts).toHaveProperty('testFiles');
      expect(counts).toHaveProperty('milestones');
      expect(counts).toHaveProperty('webTestFiles');
      expect(counts).toHaveProperty('cadTestFiles');
    });

    it('returns numeric values for all fields', () => {
      const counts = engine.getLiveCounts();
      for (const [, value] of Object.entries(counts)) {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
      }
    });

    it('detects engines (should be > 100 in PRISM)', () => {
      const counts = engine.getLiveCounts();
      expect(counts.engines).toBeGreaterThan(100);
    });

    it('detects dispatchers (should be > 30)', () => {
      const counts = engine.getLiveCounts();
      expect(counts.dispatchers).toBeGreaterThan(30);
    });

    it('detects test files (should be > 50)', () => {
      const counts = engine.getLiveCounts();
      expect(counts.testFiles).toBeGreaterThan(50);
    });

    it('caches results within TTL', () => {
      const first = engine.getLiveCounts();
      const second = engine.getLiveCounts();
      expect(first).toBe(second);
    });

    it('invalidateCache forces re-count', () => {
      const first = engine.getLiveCounts();
      engine.invalidateCache();
      const second = engine.getLiveCounts();
      expect(first).not.toBe(second);
      expect(first.engines).toBe(second.engines);
    });
  });

  // ==========================================================================
  // getCompactSnapshot
  // ==========================================================================

  describe('getCompactSnapshot', () => {
    it('returns a non-empty string', () => {
      const snapshot = engine.getCompactSnapshot();
      expect(typeof snapshot).toBe('string');
      expect(snapshot.length).toBeGreaterThan(0);
    });

    it('is under 200 characters', () => {
      const snapshot = engine.getCompactSnapshot();
      expect(snapshot.length).toBeLessThanOrEqual(200);
    });

    it('contains PRISM identifier', () => {
      const snapshot = engine.getCompactSnapshot();
      expect(snapshot).toContain('PRISM');
    });

    it('contains engine count indicator', () => {
      const snapshot = engine.getCompactSnapshot();
      expect(snapshot).toMatch(/\d+E/);
    });

    it('contains dispatcher count indicator', () => {
      const snapshot = engine.getCompactSnapshot();
      expect(snapshot).toMatch(/\d+D/);
    });

    it('contains algorithm count indicator', () => {
      const snapshot = engine.getCompactSnapshot();
      expect(snapshot).toMatch(/\d+Alg/);
    });

    it('contains registry count indicator', () => {
      const snapshot = engine.getCompactSnapshot();
      expect(snapshot).toMatch(/\d+R/);
    });
  });

  // ==========================================================================
  // getLayeredSnapshot
  // ==========================================================================

  describe('getLayeredSnapshot', () => {
    it('defaults to standard depth', () => {
      const snapshot = engine.getLayeredSnapshot();
      expect(snapshot).toContain('PRISM');
    });

    describe('minimal depth', () => {
      it('returns a compact string', () => {
        const snapshot = engine.getLayeredSnapshot('minimal');
        expect(typeof snapshot).toBe('string');
        expect(snapshot.length).toBeGreaterThan(0);
      });

      it('contains engine count', () => {
        const snapshot = engine.getLayeredSnapshot('minimal');
        expect(snapshot).toMatch(/E:\d+/);
      });

      it('contains dispatcher count', () => {
        const snapshot = engine.getLayeredSnapshot('minimal');
        expect(snapshot).toMatch(/D:\d+/);
      });

      it('contains test counts', () => {
        const snapshot = engine.getLayeredSnapshot('minimal');
        expect(snapshot).toMatch(/Tests:/);
      });

      it('is shorter than standard', () => {
        const minimal = engine.getLayeredSnapshot('minimal');
        const standard = engine.getLayeredSnapshot('standard');
        expect(minimal.length).toBeLessThan(standard.length);
      });
    });

    describe('standard depth', () => {
      it('contains system snapshot header', () => {
        const snapshot = engine.getLayeredSnapshot('standard');
        expect(snapshot).toContain('PRISM System Snapshot');
      });

      it('contains top dispatchers', () => {
        const snapshot = engine.getLayeredSnapshot('standard');
        expect(snapshot).toContain('Top dispatchers');
      });

      it('is shorter than full', () => {
        const standard = engine.getLayeredSnapshot('standard');
        const full = engine.getLayeredSnapshot('full');
        expect(standard.length).toBeLessThan(full.length);
      });
    });

    describe('full depth', () => {
      it('contains full header', () => {
        const snapshot = engine.getLayeredSnapshot('full');
        expect(snapshot).toContain('Full System Snapshot');
      });

      it('contains engine categories', () => {
        const snapshot = engine.getLayeredSnapshot('full');
        expect(snapshot).toContain('Engine Categories');
      });

      it('contains live vs documented counts table', () => {
        const snapshot = engine.getLayeredSnapshot('full');
        expect(snapshot).toContain('Live');
        expect(snapshot).toContain('Documented');
      });

      it('contains recent commits section', () => {
        const snapshot = engine.getLayeredSnapshot('full');
        expect(snapshot).toContain('Recent Commits');
      });

      it('contains top dispatchers', () => {
        const snapshot = engine.getLayeredSnapshot('full');
        expect(snapshot).toContain('Top Dispatchers');
      });
    });
  });

  // ==========================================================================
  // getChangeSummary
  // ==========================================================================

  describe('getChangeSummary', () => {
    it('returns a ChangeSummary object', () => {
      const summary = engine.getChangeSummary();
      expect(summary).toHaveProperty('since');
      expect(summary).toHaveProperty('commits');
      expect(summary).toHaveProperty('files');
      expect(summary).toHaveProperty('summary');
    });

    it('defaults to HEAD~10', () => {
      const summary = engine.getChangeSummary();
      expect(summary.since).toBe('HEAD~10');
    });

    it('accepts custom since parameter', () => {
      const summary = engine.getChangeSummary('HEAD~5');
      expect(summary.since).toBe('HEAD~5');
    });

    it('commits is a non-negative number', () => {
      const summary = engine.getChangeSummary();
      expect(typeof summary.commits).toBe('number');
      expect(summary.commits).toBeGreaterThanOrEqual(0);
    });

    it('files is an array', () => {
      const summary = engine.getChangeSummary();
      expect(Array.isArray(summary.files)).toBe(true);
    });

    it('summary is a non-empty string', () => {
      const summary = engine.getChangeSummary();
      expect(typeof summary.summary).toBe('string');
      expect(summary.summary.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // getDriftReport
  // ==========================================================================

  describe('getDriftReport', () => {
    it('returns a DriftReport object', () => {
      const report = engine.getDriftReport();
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('entries');
      expect(report).toHaveProperty('overallStatus');
      expect(report).toHaveProperty('summary');
    });

    it('timestamp is a valid ISO string', () => {
      const report = engine.getDriftReport();
      expect(new Date(report.timestamp).toISOString()).toBe(report.timestamp);
    });

    it('entries is a non-empty array', () => {
      const report = engine.getDriftReport();
      expect(Array.isArray(report.entries)).toBe(true);
      expect(report.entries.length).toBeGreaterThan(0);
    });

    it('each entry has required fields', () => {
      const report = engine.getDriftReport();
      for (const entry of report.entries) {
        expect(entry).toHaveProperty('category');
        expect(entry).toHaveProperty('live');
        expect(entry).toHaveProperty('documented');
        expect(entry).toHaveProperty('delta');
        expect(entry).toHaveProperty('status');
        expect(['ok', 'drift', 'major_drift']).toContain(entry.status);
      }
    });

    it('overallStatus is valid', () => {
      const report = engine.getDriftReport();
      expect(['ok', 'drift', 'major_drift']).toContain(report.overallStatus);
    });

    it('summary is a non-empty string', () => {
      const report = engine.getDriftReport();
      expect(typeof report.summary).toBe('string');
      expect(report.summary.length).toBeGreaterThan(0);
    });

    it('covers expected categories', () => {
      const report = engine.getDriftReport();
      const categories = report.entries.map(e => e.category);
      expect(categories).toContain('Engines');
      expect(categories).toContain('Dispatchers');
      expect(categories).toContain('Algorithms');
      expect(categories).toContain('Registries');
      expect(categories).toContain('Hooks');
      expect(categories).toContain('Test Files');
      expect(categories).toContain('Milestones');
    });

    it('delta equals live minus documented', () => {
      const report = engine.getDriftReport();
      for (const entry of report.entries) {
        expect(entry.delta).toBe(entry.live - entry.documented);
      }
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('getLayeredSnapshot with invalid depth falls through to full', () => {
      const snapshot = engine.getLayeredSnapshot('invalid' as SnapshotDepth);
      expect(typeof snapshot).toBe('string');
      expect(snapshot.length).toBeGreaterThan(0);
    });

    it('getChangeSummary with invalid commit ref gracefully handles', () => {
      const summary = engine.getChangeSummary('nonexistent_ref_abc123');
      expect(summary).toHaveProperty('summary');
      expect(summary.commits).toBe(0);
    });

    it('multiple rapid calls use cache', () => {
      const snap1 = engine.getCompactSnapshot();
      const snap2 = engine.getCompactSnapshot();
      expect(snap1).toBe(snap2);
    });
  });
});
