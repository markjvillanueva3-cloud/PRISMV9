/**
 * LokiLogSinkEngine Tests — U-LPR-OBS4
 *
 * Tests for log aggregation, trace correlation, and querying.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OBS4
 * @phase PHASE-10 (Observability + SLO)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LokiLogSinkEngine,
  lokiLogSinkEngine,
} from '../engines/LokiLogSinkEngine.js';

describe('LokiLogSinkEngine', () => {
  let engine: LokiLogSinkEngine;

  beforeEach(() => {
    engine = new LokiLogSinkEngine({
      batchSize: 10,
      defaultLabels: { app: 'test-app' },
    });
  });

  describe('configuration', () => {
    it('should use custom config', () => {
      const config = engine.getConfig();
      expect(config.batchSize).toBe(10);
      expect(config.defaultLabels.app).toBe('test-app');
    });

    it('should have default retention policy', () => {
      const policy = engine.getRetentionPolicy();
      expect(policy.hotRetentionDays).toBe(30);
      expect(policy.archiveRetentionDays).toBe(365);
    });
  });

  describe('logging', () => {
    it('should log entry', () => {
      engine.log({
        level: 'info',
        message: 'Test message',
        labels: { service: 'api' },
      });

      expect(engine.getBufferSize()).toBe(1);
    });

    it('should include default labels', () => {
      engine.info('Test', { custom: 'label' });

      const logs = engine.query({});
      expect(logs[0].labels.app).toBe('test-app');
      expect(logs[0].labels.custom).toBe('label');
    });

    it('should set timestamp automatically', () => {
      engine.info('Test');
      const logs = engine.query({});
      expect(logs[0].timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('convenience methods', () => {
    it('should log debug', () => {
      engine.debug('Debug message');
      expect(engine.query({ levelMin: 'debug' })[0].level).toBe('debug');
    });

    it('should log info', () => {
      engine.info('Info message');
      expect(engine.query({})[0].level).toBe('info');
    });

    it('should log warn', () => {
      engine.warn('Warning message');
      expect(engine.query({})[0].level).toBe('warn');
    });

    it('should log error', () => {
      engine.error('Error message');
      expect(engine.query({})[0].level).toBe('error');
    });

    it('should log fatal', () => {
      engine.fatal('Fatal message');
      expect(engine.query({})[0].level).toBe('fatal');
    });

    it('should include metadata', () => {
      engine.info('Test', {}, { userId: '123', action: 'login' });
      const logs = engine.query({});
      expect(logs[0].metadata?.userId).toBe('123');
    });
  });

  describe('trace correlation', () => {
    it('should log with trace ID', () => {
      engine.logWithTrace('info', 'Traced log', 'trace-abc123', 'span-xyz');

      const logs = engine.getLogsByTraceId('trace-abc123');
      expect(logs).toHaveLength(1);
      expect(logs[0].spanId).toBe('span-xyz');
    });

    it('should track logs with trace', () => {
      engine.logWithTrace('info', 'Log 1', 'trace-1');
      engine.info('Log without trace');

      expect(engine.getStats().logsWithTrace).toBe(1);
    });
  });

  describe('tenant logging', () => {
    it('should log for tenant', () => {
      engine.logForTenant('jm-die', 'info', 'Tenant log', { operation: 'generate' });

      const logs = engine.getLogsForTenant('jm-die');
      expect(logs).toHaveLength(1);
      expect(logs[0].labels.tenant_id).toBe('jm-die');
    });
  });

  describe('querying', () => {
    beforeEach(() => {
      engine.info('Info 1', { service: 'api' });
      engine.warn('Warning 1', { service: 'api' });
      engine.error('Error 1', { service: 'worker' });
      engine.logWithTrace('info', 'Traced', 'trace-123');
      engine.logForTenant('tenant-a', 'info', 'Tenant log');
    });

    it('should filter by labels', () => {
      const logs = engine.query({ labels: { service: 'api' } });
      expect(logs).toHaveLength(2);
    });

    it('should filter by minimum level', () => {
      const logs = engine.query({ levelMin: 'warn' });
      expect(logs).toHaveLength(2); // warn + error
    });

    it('should filter by trace ID', () => {
      const logs = engine.query({ traceId: 'trace-123' });
      expect(logs).toHaveLength(1);
    });

    it('should filter by tenant ID', () => {
      const logs = engine.query({ tenantId: 'tenant-a' });
      expect(logs).toHaveLength(1);
    });

    it('should filter by pattern', () => {
      const logs = engine.query({ pattern: 'warning' });
      expect(logs).toHaveLength(1);
    });

    it('should limit results', () => {
      const logs = engine.query({ limit: 2 });
      expect(logs).toHaveLength(2);
    });

    it('should sort by timestamp descending', () => {
      const logs = engine.query({});
      for (let i = 1; i < logs.length; i++) {
        expect(logs[i - 1].timestamp).toBeGreaterThanOrEqual(logs[i].timestamp);
      }
    });
  });

  describe('getRecentErrors', () => {
    it('should return errors and fatals', () => {
      engine.info('Info');
      engine.error('Error 1');
      engine.fatal('Fatal 1');
      engine.warn('Warn');

      const errors = engine.getRecentErrors();
      expect(errors).toHaveLength(2);
      expect(errors.every(e => e.level === 'error' || e.level === 'fatal')).toBe(true);
    });
  });

  describe('flush', () => {
    it('should flush buffer', async () => {
      engine.info('Log 1');
      engine.info('Log 2');

      const result = await engine.flush();
      expect(result.success).toBe(true);
      expect(result.entriesFlushed).toBe(2);
    });

    it('should return 0 for empty buffer', async () => {
      const result = await engine.flush();
      expect(result.entriesFlushed).toBe(0);
    });

    it('should auto-flush at batch size', () => {
      for (let i = 0; i < 10; i++) {
        engine.info(`Log ${i}`);
      }
      // Batch size is 10, so should have triggered flush
      expect(engine.getStats().batchesFlushed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('statistics', () => {
    it('should track total logs', () => {
      engine.info('1');
      engine.warn('2');
      engine.error('3');

      expect(engine.getStats().totalLogs).toBe(3);
    });

    it('should track logs by level', () => {
      engine.info('1');
      engine.info('2');
      engine.error('3');

      const stats = engine.getStats();
      expect(stats.logsByLevel.info).toBe(2);
      expect(stats.logsByLevel.error).toBe(1);
    });

    it('should estimate bytes buffered', () => {
      engine.info('Short message');

      const stats = engine.getStats();
      expect(stats.bytesBuffered).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear buffer and stats', () => {
      engine.info('Test');
      engine.clear();

      expect(engine.getBufferSize()).toBe(0);
      expect(engine.getStats().totalLogs).toBe(0);
    });
  });

  describe('singleton', () => {
    it('should export singleton', () => {
      expect(lokiLogSinkEngine).toBeInstanceOf(LokiLogSinkEngine);
    });
  });
});
