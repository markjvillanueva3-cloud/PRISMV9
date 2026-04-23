/**
 * OpenTelemetryTracingEngine Tests — U-LPR-OBS1
 *
 * Tests for W3C trace context, sampling, span lifecycle, and export.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OBS1
 * @phase PHASE-10 (Observability + SLO)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OpenTelemetryTracingEngine,
  openTelemetryTracingEngine,
  parseTraceparent,
  formatTraceparent,
  TraceContext,
  Span,
} from '../engines/OpenTelemetryTracingEngine.js';

describe('OpenTelemetryTracingEngine', () => {
  let engine: OpenTelemetryTracingEngine;

  beforeEach(() => {
    engine = new OpenTelemetryTracingEngine({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      environment: 'test',
      headSamplingRate: 1.0, // 100% for tests
    });
  });

  // =========================================================================
  // W3C Trace Context
  // =========================================================================

  describe('W3C traceparent', () => {
    it('should parse valid traceparent', () => {
      const ctx = parseTraceparent('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01');
      expect(ctx).not.toBeNull();
      expect(ctx?.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
      expect(ctx?.spanId).toBe('b7ad6b7169203331');
      expect(ctx?.traceFlags).toBe(1);
    });

    it('should parse unsampled traceparent', () => {
      const ctx = parseTraceparent('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-00');
      expect(ctx?.traceFlags).toBe(0);
    });

    it('should reject invalid traceparent format', () => {
      expect(parseTraceparent('invalid')).toBeNull();
      expect(parseTraceparent('00-short-span-01')).toBeNull();
      expect(parseTraceparent('')).toBeNull();
    });

    it('should reject all-zero trace ID', () => {
      const ctx = parseTraceparent('00-00000000000000000000000000000000-b7ad6b7169203331-01');
      expect(ctx).toBeNull();
    });

    it('should reject all-zero span ID', () => {
      const ctx = parseTraceparent('00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01');
      expect(ctx).toBeNull();
    });

    it('should format traceparent correctly', () => {
      const ctx: TraceContext = {
        traceId: '0af7651916cd43dd8448eb211c80319c',
        spanId: 'b7ad6b7169203331',
        traceFlags: 1,
      };
      expect(formatTraceparent(ctx)).toBe('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01');
    });

    it('should format unsampled traceparent', () => {
      const ctx: TraceContext = {
        traceId: 'abcdef1234567890abcdef1234567890',
        spanId: '1234567890abcdef',
        traceFlags: 0,
      };
      expect(formatTraceparent(ctx)).toBe('00-abcdef1234567890abcdef1234567890-1234567890abcdef-00');
    });
  });

  // =========================================================================
  // Configuration
  // =========================================================================

  describe('configuration', () => {
    it('should use default config', () => {
      const defaultEngine = new OpenTelemetryTracingEngine();
      const config = defaultEngine.getConfig();
      expect(config.headSamplingRate).toBe(0.1);
      expect(config.tailSampleOnError).toBe(true);
      expect(config.exportBatchSize).toBe(100);
    });

    it('should accept custom config', () => {
      const config = engine.getConfig();
      expect(config.serviceName).toBe('test-service');
      expect(config.headSamplingRate).toBe(1.0);
    });

    it('should update config', () => {
      engine.configure({ headSamplingRate: 0.5 });
      expect(engine.getConfig().headSamplingRate).toBe(0.5);
    });
  });

  // =========================================================================
  // ID Generation
  // =========================================================================

  describe('ID generation', () => {
    it('should generate valid trace ID', () => {
      const traceId = engine.generateTraceId();
      expect(traceId).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should generate valid span ID', () => {
      const spanId = engine.generateSpanId();
      expect(spanId).toMatch(/^[0-9a-f]{16}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(engine.generateTraceId());
      }
      expect(ids.size).toBe(100);
    });
  });

  // =========================================================================
  // Sampling
  // =========================================================================

  describe('sampling', () => {
    it('should respect forced sampling', () => {
      const decision = engine.shouldSample(undefined, true);
      expect(decision.sampled).toBe(true);
      expect(decision.reason).toBe('forced');
    });

    it('should use parent-based sampling', () => {
      const sampledParent = {
        traceId: engine.generateTraceId(),
        spanId: engine.generateSpanId(),
        traceFlags: 0x01,
        isRemote: true,
      };
      const decision = engine.shouldSample(sampledParent);
      expect(decision.sampled).toBe(true);
      expect(decision.reason).toBe('parent_based');
    });

    it('should not sample when parent is unsampled', () => {
      const unsampledParent = {
        traceId: engine.generateTraceId(),
        spanId: engine.generateSpanId(),
        traceFlags: 0x00,
        isRemote: true,
      };
      const decision = engine.shouldSample(unsampledParent);
      expect(decision.sampled).toBe(false);
      expect(decision.reason).toBe('parent_based');
    });

    it('should apply head-based sampling rate', () => {
      const lowRateEngine = new OpenTelemetryTracingEngine({ headSamplingRate: 0 });
      const decision = lowRateEngine.shouldSample();
      expect(decision.sampled).toBe(false);
      expect(decision.reason).toBe('head_sample');
    });
  });

  // =========================================================================
  // Context Extraction/Injection
  // =========================================================================

  describe('context propagation', () => {
    it('should extract context from headers', () => {
      const ctx = engine.extract({
        traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
        tracestate: 'vendor=value',
      });

      expect(ctx).not.toBeNull();
      expect(ctx?.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
      expect(ctx?.isRemote).toBe(true);
      expect(ctx?.traceState).toBe('vendor=value');
    });

    it('should return null for missing traceparent', () => {
      const ctx = engine.extract({});
      expect(ctx).toBeNull();
    });

    it('should inject context into headers', () => {
      const ctx = {
        traceId: '0af7651916cd43dd8448eb211c80319c',
        spanId: 'b7ad6b7169203331',
        traceFlags: 1,
        traceState: 'vendor=value',
        isRemote: false,
      };

      const headers = engine.inject(ctx);
      expect(headers.traceparent).toBe('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01');
      expect(headers.tracestate).toBe('vendor=value');
    });
  });

  // =========================================================================
  // Span Lifecycle
  // =========================================================================

  describe('span lifecycle', () => {
    it('should start span with new trace', () => {
      const span = engine.startSpan({ name: 'test-span' });

      expect(span.name).toBe('test-span');
      expect(span.context.traceId).toMatch(/^[0-9a-f]{32}$/);
      expect(span.context.spanId).toMatch(/^[0-9a-f]{16}$/);
      expect(span.parentSpanId).toBeUndefined();
      expect(span.kind).toBe('internal');
      expect(span.startTime).toBeLessThanOrEqual(Date.now());
    });

    it('should start child span with parent context', () => {
      const parent = engine.startSpan({ name: 'parent' });
      const child = engine.startSpan({
        name: 'child',
        parentContext: parent.context,
      });

      expect(child.context.traceId).toBe(parent.context.traceId);
      expect(child.parentSpanId).toBe(parent.context.spanId);
    });

    it('should end span with end time', () => {
      const span = engine.startSpan({ name: 'test' });
      const ended = engine.endSpan(span.context.spanId);

      expect(ended?.endTime).toBeDefined();
      expect(ended?.endTime).toBeGreaterThanOrEqual(ended!.startTime);
    });

    it('should add service attributes', () => {
      const span = engine.startSpan({ name: 'test' });

      expect(span.attributes['service.name']).toBe('test-service');
      expect(span.attributes['service.version']).toBe('1.0.0');
      expect(span.attributes['deployment.environment']).toBe('test');
    });

    it('should accept custom span kind', () => {
      const span = engine.startSpan({ name: 'server', kind: 'server' });
      expect(span.kind).toBe('server');
    });
  });

  // =========================================================================
  // Span Events
  // =========================================================================

  describe('span events', () => {
    it('should add event to span', () => {
      const span = engine.startSpan({ name: 'test' });
      const result = engine.addEvent(span.context.spanId, 'checkpoint', { count: 5 });

      expect(result).toBe(true);

      const ended = engine.endSpan(span.context.spanId);
      expect(ended?.events).toHaveLength(1);
      expect(ended?.events[0].name).toBe('checkpoint');
      expect(ended?.events[0].attributes?.count).toBe(5);
    });

    it('should return false for unknown span', () => {
      const result = engine.addEvent('unknown', 'event');
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // Span Attributes
  // =========================================================================

  describe('span attributes', () => {
    it('should set attributes on span', () => {
      const span = engine.startSpan({ name: 'test' });
      engine.setAttributes(span.context.spanId, {
        'http.method': 'POST',
        'http.status_code': 200,
      });

      const ended = engine.endSpan(span.context.spanId);
      expect(ended?.attributes['http.method']).toBe('POST');
      expect(ended?.attributes['http.status_code']).toBe(200);
    });

    it('should truncate long string attributes', () => {
      const longValue = 'x'.repeat(500);
      const span = engine.startSpan({ name: 'test' });
      engine.setAttributes(span.context.spanId, { longAttr: longValue });

      const ended = engine.endSpan(span.context.spanId);
      expect((ended?.attributes.longAttr as string).length).toBe(256);
    });
  });

  // =========================================================================
  // Span Status
  // =========================================================================

  describe('span status', () => {
    it('should set ok status', () => {
      const span = engine.startSpan({ name: 'test' });
      engine.setStatus(span.context.spanId, 'ok');

      const ended = engine.endSpan(span.context.spanId);
      expect(ended?.status).toBe('ok');
    });

    it('should set error status with message', () => {
      const span = engine.startSpan({ name: 'test' });
      engine.setStatus(span.context.spanId, 'error', 'Something went wrong');

      const ended = engine.endSpan(span.context.spanId);
      expect(ended?.status).toBe('error');
      expect(ended?.statusMessage).toBe('Something went wrong');
    });

    it('should track error spans in stats', () => {
      const span = engine.startSpan({ name: 'test' });
      engine.setStatus(span.context.spanId, 'error');
      engine.endSpan(span.context.spanId);

      expect(engine.getStats().errorSpans).toBe(1);
    });
  });

  // =========================================================================
  // Exception Recording
  // =========================================================================

  describe('exception recording', () => {
    it('should record exception as event', () => {
      const span = engine.startSpan({ name: 'test' });
      const error = new Error('Test error');
      engine.recordException(span.context.spanId, error);

      const ended = engine.endSpan(span.context.spanId);
      expect(ended?.events).toHaveLength(1);
      expect(ended?.events[0].name).toBe('exception');
      expect(ended?.events[0].attributes?.['exception.type']).toBe('Error');
      expect(ended?.events[0].attributes?.['exception.message']).toBe('Test error');
      expect(ended?.status).toBe('error');
    });
  });

  // =========================================================================
  // Manufacturing Attributes
  // =========================================================================

  describe('manufacturing attributes', () => {
    it('should add prism-specific attributes', () => {
      const span = engine.startSpan({ name: 'machining-op' });
      engine.addManufacturingAttributes(span.context.spanId, {
        tenantId: 'jm-die',
        machineId: 'okuma-lb3000',
        partId: 'part-12345',
        operationType: 'turning',
        material: 'D2',
        programName: 'ROUGHING.MIN',
      });

      const ended = engine.endSpan(span.context.spanId);
      expect(ended?.attributes['prism.tenant_id']).toBe('jm-die');
      expect(ended?.attributes['prism.machine_id']).toBe('okuma-lb3000');
      expect(ended?.attributes['prism.material']).toBe('D2');
    });
  });

  // =========================================================================
  // Tail-Based Sampling
  // =========================================================================

  describe('tail-based sampling', () => {
    it('should upgrade to sampled on error', () => {
      // Start with a sampled span (need it stored to track)
      const span = engine.startSpan({ name: 'test' });

      // Set error status
      engine.setStatus(span.context.spanId, 'error');
      const ended = engine.endSpan(span.context.spanId);

      // After error, trace flags should remain sampled
      expect((ended?.context.traceFlags ?? 0) & 0x01).toBe(0x01);
      expect(ended?.status).toBe('error');
    });

    it('should add error span to export queue', () => {
      const span = engine.startSpan({ name: 'error-span' });
      engine.setStatus(span.context.spanId, 'error');
      engine.endSpan(span.context.spanId);

      expect(engine.getExportQueueLength()).toBe(1);
    });
  });

  // =========================================================================
  // Export Queue
  // =========================================================================

  describe('export queue', () => {
    it('should queue sampled spans for export', () => {
      const span = engine.startSpan({ name: 'test' });
      engine.endSpan(span.context.spanId);

      expect(engine.getExportQueueLength()).toBe(1);
    });

    it('should flush export queue', async () => {
      engine.startSpan({ name: 'span-1' });
      engine.startSpan({ name: 'span-2' });

      const spans = engine.getCompletedSpans();
      // End spans to add to queue
      for (const span of [...engine['activeSpans'].values()]) {
        engine.endSpan(span.context.spanId);
      }

      const result = await engine.flush();
      expect(result.success).toBe(true);
      expect(result.spansExported).toBe(2);
      expect(engine.getExportQueueLength()).toBe(0);
    });
  });

  // =========================================================================
  // Statistics
  // =========================================================================

  describe('statistics', () => {
    it('should track total spans', () => {
      engine.startSpan({ name: 'span-1' });
      engine.startSpan({ name: 'span-2' });

      expect(engine.getStats().totalSpans).toBe(2);
    });

    it('should track total traces', () => {
      engine.startSpan({ name: 'trace-1' });
      engine.startSpan({ name: 'trace-2' });

      expect(engine.getStats().totalTraces).toBe(2);
    });

    it('should track child spans under same trace', () => {
      const parent = engine.startSpan({ name: 'parent' });
      engine.startSpan({ name: 'child', parentContext: parent.context });

      expect(engine.getStats().totalTraces).toBe(1);
      expect(engine.getStats().totalSpans).toBe(2);
    });

    it('should track average span duration', () => {
      const span = engine.startSpan({ name: 'test' });
      engine.endSpan(span.context.spanId);

      expect(engine.getStats().avgSpanDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // Trace Wrapper
  // =========================================================================

  describe('trace wrapper', () => {
    it('should wrap async function with tracing', async () => {
      const result = await engine.trace('wrapped-op', async (span) => {
        expect(span.name).toBe('wrapped-op');
        return 42;
      });

      expect(result).toBe(42);
      expect(engine.getCompletedSpans()).toHaveLength(1);
      expect(engine.getCompletedSpans()[0].status).toBe('ok');
    });

    it('should record exception on throw', async () => {
      await expect(
        engine.trace('failing-op', async () => {
          throw new Error('Oops');
        })
      ).rejects.toThrow('Oops');

      const completed = engine.getCompletedSpans();
      expect(completed).toHaveLength(1);
      expect(completed[0].status).toBe('error');
      expect(completed[0].events[0].name).toBe('exception');
    });
  });

  // =========================================================================
  // Clear
  // =========================================================================

  describe('clear', () => {
    it('should clear all state', () => {
      engine.startSpan({ name: 'test' });
      engine.clear();

      expect(engine.getActiveSpanCount()).toBe(0);
      expect(engine.getCompletedSpans()).toHaveLength(0);
      expect(engine.getExportQueueLength()).toBe(0);
      expect(engine.getStats().totalSpans).toBe(0);
    });
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('singleton', () => {
    it('should export singleton instance', () => {
      expect(openTelemetryTracingEngine).toBeInstanceOf(OpenTelemetryTracingEngine);
    });
  });
});
