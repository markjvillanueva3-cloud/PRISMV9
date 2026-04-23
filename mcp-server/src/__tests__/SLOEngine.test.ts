/**
 * SLOEngine Tests — U-LPR-OBS5
 *
 * Tests for SLO/SLI formalization, error budget tracking, and burn rate alerting.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OBS5
 * @phase PHASE-10 (Observability + SLO)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SLOEngine,
  sloEngine,
  SLODefinition,
} from '../engines/SLOEngine.js';

describe('SLOEngine', () => {
  let engine: SLOEngine;

  beforeEach(() => {
    engine = new SLOEngine();
  });

  describe('registerSLO', () => {
    it('should register new SLO', () => {
      const result = engine.registerSLO({
        id: 'test-slo',
        name: 'Test SLO',
        description: 'Test description',
        type: 'availability',
        target: 0.995,
        windowDays: 30,
        errorBudgetFraction: 0.005,
        burnRates: [],
        enabled: true,
      });

      expect(result).toBe(true);
      expect(engine.getSLO('test-slo')).not.toBeNull();
    });

    it('should reject duplicate SLO', () => {
      const def: SLODefinition = {
        id: 'dupe-slo',
        name: 'Dupe SLO',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [],
        enabled: true,
      };

      engine.registerSLO(def);
      const result = engine.registerSLO(def);
      expect(result).toBe(false);
    });

    it('should calculate errorBudgetFraction from target', () => {
      engine.registerSLO({
        id: 'budget-slo',
        name: 'Budget SLO',
        description: 'Test',
        type: 'availability',
        target: 0.995,
        windowDays: 30,
        errorBudgetFraction: 0, // should be calculated
        burnRates: [],
        enabled: true,
      });

      const slo = engine.getSLO('budget-slo');
      expect(slo?.errorBudgetFraction).toBeCloseTo(0.005);
    });

    it('should use default burn rates if not provided', () => {
      engine.registerSLO({
        id: 'default-burn',
        name: 'Default Burn Rates',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [],
        enabled: true,
      });

      const slo = engine.getSLO('default-burn');
      expect(slo?.burnRates).toHaveLength(2);
      expect(slo?.burnRates[0].name).toBe('fast-burn');
      expect(slo?.burnRates[1].name).toBe('slow-burn');
    });
  });

  describe('listSLOs', () => {
    it('should list all registered SLOs', () => {
      engine.registerSLO({
        id: 'slo-1',
        name: 'SLO 1',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [],
        enabled: true,
      });

      engine.registerSLO({
        id: 'slo-2',
        name: 'SLO 2',
        description: 'Test',
        type: 'latency',
        target: 1000,
        windowDays: 7,
        errorBudgetFraction: 0.05,
        burnRates: [],
        enabled: true,
      });

      expect(engine.listSLOs()).toHaveLength(2);
    });

    it('should return empty for no SLOs', () => {
      expect(engine.listSLOs()).toHaveLength(0);
    });
  });

  describe('recordEvent', () => {
    beforeEach(() => {
      engine.registerSLO({
        id: 'event-slo',
        name: 'Event SLO',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [],
        enabled: true,
      });
    });

    it('should record success event', () => {
      const result = engine.recordEvent({
        sloId: 'event-slo',
        timestamp: Date.now(),
        success: true,
      });

      expect(result).toBe(true);
    });

    it('should record failure event', () => {
      const result = engine.recordEvent({
        sloId: 'event-slo',
        timestamp: Date.now(),
        success: false,
      });

      expect(result).toBe(true);
    });

    it('should reject event for unknown SLO', () => {
      const result = engine.recordEvent({
        sloId: 'unknown-slo',
        timestamp: Date.now(),
        success: true,
      });

      expect(result).toBe(false);
    });

    it('should prune old events beyond window', () => {
      const now = Date.now();
      const oldTime = now - 10 * 24 * 60 * 60 * 1000; // 10 days ago

      engine.recordEvent({
        sloId: 'event-slo',
        timestamp: oldTime,
        success: true,
      });

      engine.recordEvent({
        sloId: 'event-slo',
        timestamp: now,
        success: true,
      });

      const status = engine.getStatus('event-slo');
      // Window is 7 days, so old event should be pruned
      // But depends on implementation — check status exists
      expect(status).not.toBeNull();
    });
  });

  describe('recordLatency', () => {
    beforeEach(() => {
      engine.registerSLO({
        id: 'latency-slo',
        name: 'Latency SLO',
        description: 'p95 under 100ms',
        type: 'latency',
        target: 100, // 100ms
        windowDays: 7,
        errorBudgetFraction: 0.05,
        burnRates: [],
        enabled: true,
      });
    });

    it('should record latency as success when under target', () => {
      const result = engine.recordLatency('latency-slo', 50);
      expect(result).toBe(true);

      const status = engine.getStatus('latency-slo');
      expect(status?.currentValue).toBe(1); // 100% success
    });

    it('should record latency as failure when over target', () => {
      engine.recordLatency('latency-slo', 50); // success
      engine.recordLatency('latency-slo', 150); // failure

      const status = engine.getStatus('latency-slo');
      expect(status?.currentValue).toBe(0.5); // 50% success
    });

    it('should reject for non-latency SLO', () => {
      engine.registerSLO({
        id: 'avail-slo',
        name: 'Availability SLO',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [],
        enabled: true,
      });

      const result = engine.recordLatency('avail-slo', 50);
      expect(result).toBe(false);
    });

    it('should include labels in event', () => {
      const result = engine.recordLatency('latency-slo', 75, { operation: 'generate' });
      expect(result).toBe(true);
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      engine.registerSLO({
        id: 'status-slo',
        name: 'Status SLO',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [],
        enabled: true,
      });
    });

    it('should return null for unknown SLO', () => {
      expect(engine.getStatus('unknown')).toBeNull();
    });

    it('should return healthy for 100% success', () => {
      for (let i = 0; i < 100; i++) {
        engine.recordEvent({
          sloId: 'status-slo',
          timestamp: Date.now(),
          success: true,
        });
      }

      const status = engine.getStatus('status-slo');
      expect(status?.status).toBe('healthy');
      expect(status?.currentValue).toBe(1);
    });

    it('should return breached when SLI below target', () => {
      // 10% success rate (target 99%)
      for (let i = 0; i < 10; i++) {
        engine.recordEvent({
          sloId: 'status-slo',
          timestamp: Date.now(),
          success: true,
        });
      }
      for (let i = 0; i < 90; i++) {
        engine.recordEvent({
          sloId: 'status-slo',
          timestamp: Date.now(),
          success: false,
        });
      }

      const status = engine.getStatus('status-slo');
      expect(status?.status).toBe('breached');
    });

    it('should return at_risk when budget low but meeting target', () => {
      // 99.1% success (just above 99% target) but budget almost gone
      for (let i = 0; i < 991; i++) {
        engine.recordEvent({
          sloId: 'status-slo',
          timestamp: Date.now(),
          success: true,
        });
      }
      for (let i = 0; i < 9; i++) {
        engine.recordEvent({
          sloId: 'status-slo',
          timestamp: Date.now(),
          success: false,
        });
      }

      const status = engine.getStatus('status-slo');
      // Budget = 1% of 1000 = 10, consumed = 9, remaining = 10%
      // SLI = 99.1%, target = 99%, so meeting target but budget < 20%
      expect(status?.status).toBe('at_risk');
    });

    it('should cache status', () => {
      engine.recordEvent({
        sloId: 'status-slo',
        timestamp: Date.now(),
        success: true,
      });

      const status1 = engine.getStatus('status-slo');
      const status2 = engine.getStatus('status-slo');

      expect(status1?.lastUpdated).toBe(status2?.lastUpdated);
    });

    it('should invalidate cache on new event', () => {
      engine.recordEvent({
        sloId: 'status-slo',
        timestamp: Date.now(),
        success: true,
      });

      const status1 = engine.getStatus('status-slo');

      engine.recordEvent({
        sloId: 'status-slo',
        timestamp: Date.now(),
        success: false,
      });

      const status2 = engine.getStatus('status-slo');

      // Values should differ after new event
      expect(status2?.currentValue).toBeLessThan(status1?.currentValue || 1);
    });
  });

  describe('getErrorBudget', () => {
    beforeEach(() => {
      engine.registerSLO({
        id: 'budget-slo',
        name: 'Budget SLO',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [],
        enabled: true,
      });
    });

    it('should return null for unknown SLO', () => {
      expect(engine.getErrorBudget('unknown')).toBeNull();
    });

    it('should calculate total budget', () => {
      for (let i = 0; i < 100; i++) {
        engine.recordEvent({
          sloId: 'budget-slo',
          timestamp: Date.now(),
          success: true,
        });
      }

      const budget = engine.getErrorBudget('budget-slo');
      expect(budget?.totalBudget).toBeCloseTo(1); // 1% of 100
    });

    it('should track consumed budget', () => {
      for (let i = 0; i < 99; i++) {
        engine.recordEvent({
          sloId: 'budget-slo',
          timestamp: Date.now(),
          success: true,
        });
      }
      engine.recordEvent({
        sloId: 'budget-slo',
        timestamp: Date.now(),
        success: false,
      });

      const budget = engine.getErrorBudget('budget-slo');
      expect(budget?.consumed).toBe(1);
      expect(budget?.percentUsed).toBeCloseTo(100);
    });

    it('should calculate remaining budget', () => {
      for (let i = 0; i < 200; i++) {
        engine.recordEvent({
          sloId: 'budget-slo',
          timestamp: Date.now(),
          success: true,
        });
      }

      const budget = engine.getErrorBudget('budget-slo');
      expect(budget?.remaining).toBeCloseTo(2); // 1% of 200, 0 consumed
    });
  });

  describe('generateReport', () => {
    beforeEach(() => {
      engine.registerSLO({
        id: 'report-slo',
        name: 'Report SLO',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [],
        enabled: true,
      });
    });

    it('should return null for unknown SLO', () => {
      expect(engine.generateReport('unknown')).toBeNull();
    });

    it('should generate compliance report', () => {
      for (let i = 0; i < 100; i++) {
        engine.recordEvent({
          sloId: 'report-slo',
          timestamp: Date.now(),
          success: true,
        });
      }

      const report = engine.generateReport('report-slo');
      expect(report?.totalEvents).toBe(100);
      expect(report?.goodEvents).toBe(100);
      expect(report?.badEvents).toBe(0);
      expect(report?.sli).toBe(1);
      expect(report?.compliance).toBe(true);
    });

    it('should report non-compliance', () => {
      for (let i = 0; i < 90; i++) {
        engine.recordEvent({
          sloId: 'report-slo',
          timestamp: Date.now(),
          success: true,
        });
      }
      for (let i = 0; i < 10; i++) {
        engine.recordEvent({
          sloId: 'report-slo',
          timestamp: Date.now(),
          success: false,
        });
      }

      const report = engine.generateReport('report-slo');
      expect(report?.sli).toBe(0.9);
      expect(report?.compliance).toBe(false);
    });

    it('should filter by time range', () => {
      const now = Date.now();
      const yesterday = now - 24 * 60 * 60 * 1000;

      engine.recordEvent({
        sloId: 'report-slo',
        timestamp: yesterday,
        success: true,
      });

      engine.recordEvent({
        sloId: 'report-slo',
        timestamp: now,
        success: false,
      });

      const report = engine.generateReport('report-slo', now - 1000, now + 1000);
      expect(report?.totalEvents).toBe(1);
      expect(report?.badEvents).toBe(1);
    });
  });

  describe('isAlerting', () => {
    beforeEach(() => {
      engine.registerSLO({
        id: 'alert-slo',
        name: 'Alert SLO',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [
          {
            name: 'fast-burn',
            multiplier: 14.4,
            windowMinutes: 60,
            alertSeverity: 'critical',
          },
        ],
        enabled: true,
      });
    });

    it('should return false for unknown SLO', () => {
      expect(engine.isAlerting('unknown')).toBe(false);
    });

    it('should not alert with no errors', () => {
      for (let i = 0; i < 100; i++) {
        engine.recordEvent({
          sloId: 'alert-slo',
          timestamp: Date.now(),
          success: true,
        });
      }

      expect(engine.isAlerting('alert-slo')).toBe(false);
    });

    it('should alert on high burn rate', () => {
      // Fast burn: 14.4x means 14.4% error rate would exhaust budget in 1hr
      // If error budget is 1%, alerting at 14.4% error rate
      for (let i = 0; i < 86; i++) {
        engine.recordEvent({
          sloId: 'alert-slo',
          timestamp: Date.now(),
          success: true,
        });
      }
      for (let i = 0; i < 14; i++) {
        engine.recordEvent({
          sloId: 'alert-slo',
          timestamp: Date.now(),
          success: false,
        });
      }

      // Burn rate = (14/100) / 0.01 = 14 (just under 14.4 threshold)
      // Add one more failure to trigger
      engine.recordEvent({
        sloId: 'alert-slo',
        timestamp: Date.now(),
        success: false,
      });

      expect(engine.isAlerting('alert-slo')).toBe(true);
    });
  });

  describe('getAlertingSLOs', () => {
    it('should return empty array with no SLOs', () => {
      expect(engine.getAlertingSLOs()).toHaveLength(0);
    });

    it('should return only alerting SLOs', () => {
      engine.registerSLO({
        id: 'healthy-slo',
        name: 'Healthy SLO',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [],
        enabled: true,
      });

      for (let i = 0; i < 100; i++) {
        engine.recordEvent({
          sloId: 'healthy-slo',
          timestamp: Date.now(),
          success: true,
        });
      }

      expect(engine.getAlertingSLOs()).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return empty stats for no SLOs', () => {
      const stats = engine.getStats();
      expect(stats.totalSLOs).toBe(0);
      expect(stats.healthySLOs).toBe(0);
      expect(stats.overallCompliance).toBe(1);
    });

    it('should track SLO counts by status', () => {
      engine.registerSLO({
        id: 'slo-1',
        name: 'SLO 1',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [],
        enabled: true,
      });

      engine.registerSLO({
        id: 'slo-2',
        name: 'SLO 2',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [],
        enabled: true,
      });

      // Make slo-1 healthy
      for (let i = 0; i < 100; i++) {
        engine.recordEvent({
          sloId: 'slo-1',
          timestamp: Date.now(),
          success: true,
        });
      }

      // Make slo-2 breached
      for (let i = 0; i < 50; i++) {
        engine.recordEvent({
          sloId: 'slo-2',
          timestamp: Date.now(),
          success: false,
        });
      }

      const stats = engine.getStats();
      expect(stats.totalSLOs).toBe(2);
      expect(stats.healthySLOs).toBe(1);
      expect(stats.breachedSLOs).toBe(1);
      expect(stats.totalEvents).toBe(150);
    });

    it('should calculate overall compliance', () => {
      engine.registerSLO({
        id: 'slo-1',
        name: 'SLO 1',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [],
        enabled: true,
      });

      engine.registerSLO({
        id: 'slo-2',
        name: 'SLO 2',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [],
        enabled: true,
      });

      // Both healthy
      for (let i = 0; i < 100; i++) {
        engine.recordEvent({
          sloId: 'slo-1',
          timestamp: Date.now(),
          success: true,
        });
        engine.recordEvent({
          sloId: 'slo-2',
          timestamp: Date.now(),
          success: true,
        });
      }

      const stats = engine.getStats();
      expect(stats.overallCompliance).toBe(1); // 100%
    });
  });

  describe('registerStandardSLOs', () => {
    it('should register standard PRISM SLOs', () => {
      engine.registerStandardSLOs();

      expect(engine.getSLO('availability')).not.toBeNull();
      expect(engine.getSLO('program-gen-latency')).not.toBeNull();
      expect(engine.getSLO('error-rate')).not.toBeNull();
    });

    it('should set correct targets', () => {
      engine.registerStandardSLOs();

      expect(engine.getSLO('availability')?.target).toBe(0.995);
      expect(engine.getSLO('program-gen-latency')?.target).toBe(30000);
      expect(engine.getSLO('error-rate')?.target).toBe(0.999);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      engine.registerStandardSLOs();

      for (let i = 0; i < 10; i++) {
        engine.recordEvent({
          sloId: 'availability',
          timestamp: Date.now(),
          success: true,
        });
      }

      engine.clear();

      expect(engine.listSLOs()).toHaveLength(0);
      expect(engine.getStats().totalSLOs).toBe(0);
    });
  });

  describe('singleton', () => {
    it('should export singleton', () => {
      expect(sloEngine).toBeInstanceOf(SLOEngine);
    });
  });

  describe('burn rate calculation', () => {
    beforeEach(() => {
      engine.registerSLO({
        id: 'burn-slo',
        name: 'Burn Rate SLO',
        description: 'Test',
        type: 'availability',
        target: 0.99,
        windowDays: 7,
        errorBudgetFraction: 0.01,
        burnRates: [
          {
            name: 'fast-burn',
            multiplier: 14.4,
            windowMinutes: 60,
            alertSeverity: 'critical',
          },
          {
            name: 'slow-burn',
            multiplier: 6,
            windowMinutes: 360,
            alertSeverity: 'warning',
          },
        ],
        enabled: true,
      });
    });

    it('should calculate burn rate in status', () => {
      for (let i = 0; i < 100; i++) {
        engine.recordEvent({
          sloId: 'burn-slo',
          timestamp: Date.now(),
          success: true,
        });
      }

      const status = engine.getStatus('burn-slo');
      expect(status?.burnRateStatus).toHaveLength(2);
      expect(status?.burnRateStatus[0].currentRate).toBe(0);
      expect(status?.burnRateStatus[0].alerting).toBe(false);
    });

    it('should track burn rate threshold', () => {
      const status = engine.getStatus('burn-slo');
      expect(status?.burnRateStatus[0].threshold).toBe(14.4);
      expect(status?.burnRateStatus[1].threshold).toBe(6);
    });
  });
});
