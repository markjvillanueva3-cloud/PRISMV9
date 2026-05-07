/**
 * PrometheusMetricsEngine Tests — U-LPR-OBS2
 *
 * Tests for Prometheus metrics collection, cardinality management, and export.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OBS2
 * @phase PHASE-10 (Observability + SLO)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PrometheusMetricsEngine,
  prometheusMetricsEngine,
} from '../engines/PrometheusMetricsEngine.js';

describe('PrometheusMetricsEngine', () => {
  let engine: PrometheusMetricsEngine;

  beforeEach(() => {
    engine = new PrometheusMetricsEngine({
      namespace: 'test',
      subsystem: 'unit',
    });
  });

  // =========================================================================
  // Configuration
  // =========================================================================

  describe('configuration', () => {
    it('should use custom namespace', () => {
      const config = engine.getConfig();
      expect(config.namespace).toBe('test');
      expect(config.subsystem).toBe('unit');
    });

    it('should have default cardinality policy', () => {
      const config = engine.getConfig();
      expect(config.cardinalityPolicy.maxLabels).toBe(10);
      expect(config.cardinalityPolicy.allowedHighCardinalityLabels).toContain('part_id');
    });
  });

  // =========================================================================
  // Counter
  // =========================================================================

  describe('counter', () => {
    it('should register counter', () => {
      const result = engine.register({
        name: 'requests_total',
        help: 'Total requests',
        type: 'counter',
        labelNames: ['method', 'status'],
      });

      expect(result).toBe(true);
    });

    it('should reject duplicate registration', () => {
      engine.register({
        name: 'dup_counter',
        help: 'Test',
        type: 'counter',
        labelNames: [],
      });

      const result = engine.register({
        name: 'dup_counter',
        help: 'Test 2',
        type: 'counter',
        labelNames: [],
      });

      expect(result).toBe(false);
    });

    it('should increment counter', () => {
      engine.register({
        name: 'hits',
        help: 'Hit count',
        type: 'counter',
        labelNames: ['endpoint'],
      });

      engine.incCounter('hits', { endpoint: '/api/v1' });
      engine.incCounter('hits', { endpoint: '/api/v1' });
      engine.incCounter('hits', { endpoint: '/api/v1' }, 5);

      expect(engine.getCounter('hits', { endpoint: '/api/v1' })).toBe(7);
    });

    it('should track counters with different labels', () => {
      engine.register({
        name: 'multi',
        help: 'Multi-label counter',
        type: 'counter',
        labelNames: ['a', 'b'],
      });

      engine.incCounter('multi', { a: '1', b: '1' });
      engine.incCounter('multi', { a: '1', b: '2' }, 2);

      expect(engine.getCounter('multi', { a: '1', b: '1' })).toBe(1);
      expect(engine.getCounter('multi', { a: '1', b: '2' })).toBe(2);
    });

    it('should return false for unknown counter', () => {
      const result = engine.incCounter('unknown', {});
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // Gauge
  // =========================================================================

  describe('gauge', () => {
    it('should set gauge value', () => {
      engine.register({
        name: 'temperature',
        help: 'Current temperature',
        type: 'gauge',
        labelNames: ['sensor'],
      });

      engine.setGauge('temperature', 25.5, { sensor: 'room' });
      expect(engine.getGauge('temperature', { sensor: 'room' })).toBe(25.5);
    });

    it('should overwrite gauge value', () => {
      engine.register({
        name: 'level',
        help: 'Current level',
        type: 'gauge',
        labelNames: [],
      });

      engine.setGauge('level', 10);
      engine.setGauge('level', 20);
      expect(engine.getGauge('level')).toBe(20);
    });

    it('should increment gauge', () => {
      engine.register({
        name: 'active',
        help: 'Active count',
        type: 'gauge',
        labelNames: [],
      });

      engine.setGauge('active', 5);
      engine.incGauge('active', {}, 3);
      expect(engine.getGauge('active')).toBe(8);
    });

    it('should decrement gauge with negative delta', () => {
      engine.register({
        name: 'connections',
        help: 'Connection count',
        type: 'gauge',
        labelNames: [],
      });

      engine.setGauge('connections', 10);
      engine.incGauge('connections', {}, -2);
      expect(engine.getGauge('connections')).toBe(8);
    });

    it('should accept exemplar', () => {
      engine.register({
        name: 'latency',
        help: 'Current latency',
        type: 'gauge',
        labelNames: ['tenant_id'],
      });

      engine.setGauge('latency', 150, { tenant_id: 'jm-die' }, {
        labels: { trace_id: 'abc123' },
        value: 150,
        timestamp: Date.now(),
      });

      expect(engine.getGauge('latency', { tenant_id: 'jm-die' })).toBe(150);
    });
  });

  // =========================================================================
  // Histogram
  // =========================================================================

  describe('histogram', () => {
    it('should register histogram with custom buckets', () => {
      const result = engine.register({
        name: 'request_duration',
        help: 'Request duration',
        type: 'histogram',
        labelNames: ['method'],
        buckets: [0.1, 0.5, 1, 5, 10],
      });

      expect(result).toBe(true);
    });

    it('should observe histogram values', () => {
      engine.register({
        name: 'duration',
        help: 'Duration histogram',
        type: 'histogram',
        labelNames: [],
        buckets: [0.1, 0.5, 1, 5],
      });

      engine.observeHistogram('duration', 0.3);
      engine.observeHistogram('duration', 0.8);
      engine.observeHistogram('duration', 2.5);

      const hist = engine.getHistogram('duration');
      expect(hist?.count).toBe(3);
      expect(hist?.sum).toBeCloseTo(3.6);
    });

    it('should update buckets correctly', () => {
      engine.register({
        name: 'latency',
        help: 'Latency',
        type: 'histogram',
        labelNames: [],
        buckets: [1, 5, 10],
      });

      engine.observeHistogram('latency', 0.5);  // goes in bucket 1
      engine.observeHistogram('latency', 3);    // goes in bucket 5
      engine.observeHistogram('latency', 7);    // goes in bucket 10

      const hist = engine.getHistogram('latency');
      expect(hist?.buckets.get(1)).toBe(1);   // 1 value <= 1
      expect(hist?.buckets.get(5)).toBe(1);   // 1 value <= 5 (but > 1)
      expect(hist?.buckets.get(10)).toBe(1);  // 1 value <= 10 (but > 5)
    });

    it('should accept exemplar with observation', () => {
      engine.register({
        name: 'response_time',
        help: 'Response time',
        type: 'histogram',
        labelNames: [],
        buckets: [0.1, 0.5, 1],
      });

      engine.observeHistogram('response_time', 0.3, {}, {
        labels: { trace_id: 'xyz789' },
        value: 0.3,
        timestamp: Date.now(),
      });

      const hist = engine.getHistogram('response_time');
      expect(hist?.exemplars?.get(0.5)).toBeDefined();
    });
  });

  // =========================================================================
  // Summary
  // =========================================================================

  describe('summary', () => {
    it('should register summary', () => {
      const result = engine.register({
        name: 'request_size',
        help: 'Request size',
        type: 'summary',
        labelNames: [],
        percentiles: [0.5, 0.9, 0.99],
      });

      expect(result).toBe(true);
    });

    it('should observe summary values', () => {
      engine.register({
        name: 'size',
        help: 'Size summary',
        type: 'summary',
        labelNames: [],
        percentiles: [0.5, 0.99],
      });

      engine.observeSummary('size', 100);
      engine.observeSummary('size', 200);
      engine.observeSummary('size', 300);

      const stats = engine.getStats();
      expect(stats.summaries).toBe(1);
    });
  });

  // =========================================================================
  // Cardinality Policy
  // =========================================================================

  describe('cardinality policy', () => {
    it('should reject blocked labels', () => {
      const result = engine.validateLabels({ password: 'secret' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Blocked label: password');
    });

    it('should warn on high cardinality labels', () => {
      const result = engine.validateLabels({ part_id: 'P12345' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exemplar'))).toBe(true);
    });

    it('should accept normal labels', () => {
      const result = engine.validateLabels({
        tenant_id: 'jm-die',
        method: 'POST',
        status: '200',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject too many labels', () => {
      const labels: Record<string, string> = {};
      for (let i = 0; i < 15; i++) {
        labels[`label_${i}`] = 'value';
      }

      const result = engine.validateLabels(labels);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Too many labels'))).toBe(true);
    });

    it('should track cardinality violations', () => {
      engine.register({
        name: 'test_counter',
        help: 'Test',
        type: 'counter',
        labelNames: [],
      });

      engine.incCounter('test_counter', { password: 'bad' });
      expect(engine.getStats().cardinalityViolations).toBeGreaterThan(0);
    });

    it('should reject registration with blocked label name', () => {
      const result = engine.register({
        name: 'bad_metric',
        help: 'Test',
        type: 'counter',
        labelNames: ['token'],
      });

      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // Export
  // =========================================================================

  describe('export', () => {
    it('should export counter in Prometheus format', () => {
      engine.register({
        name: 'http_requests',
        help: 'HTTP requests',
        type: 'counter',
        labelNames: ['method'],
      });

      engine.incCounter('http_requests', { method: 'GET' }, 10);

      const output = engine.export();
      expect(output).toContain('# HELP test_unit_http_requests HTTP requests');
      expect(output).toContain('# TYPE test_unit_http_requests counter');
      expect(output).toContain('test_unit_http_requests{method="GET"} 10');
    });

    it('should export gauge in Prometheus format', () => {
      engine.register({
        name: 'temperature',
        help: 'Temperature',
        type: 'gauge',
        labelNames: [],
      });

      engine.setGauge('temperature', 25.5);

      const output = engine.export();
      expect(output).toContain('# TYPE test_unit_temperature gauge');
      expect(output).toContain('test_unit_temperature 25.5');
    });

    it('should export histogram with buckets', () => {
      engine.register({
        name: 'duration',
        help: 'Duration',
        type: 'histogram',
        labelNames: [],
        buckets: [0.1, 1, 10],
      });

      engine.observeHistogram('duration', 0.5);
      engine.observeHistogram('duration', 5);

      const output = engine.export();
      expect(output).toContain('# TYPE test_unit_duration histogram');
      expect(output).toContain('test_unit_duration_bucket{le="0.1"} 0');
      expect(output).toContain('test_unit_duration_bucket{le="1"} 1');
      expect(output).toContain('test_unit_duration_bucket{le="10"} 2');
      expect(output).toContain('test_unit_duration_bucket{le="+Inf"} 2');
      expect(output).toContain('test_unit_duration_sum');
      expect(output).toContain('test_unit_duration_count 2');
    });

    it('should export summary with quantiles', () => {
      engine.register({
        name: 'size',
        help: 'Size',
        type: 'summary',
        labelNames: [],
        percentiles: [0.5, 0.99],
      });

      engine.observeSummary('size', 100);

      const output = engine.export();
      expect(output).toContain('# TYPE test_unit_size summary');
      expect(output).toContain('test_unit_size{quantile="0.5"}');
      expect(output).toContain('test_unit_size{quantile="0.99"}');
      expect(output).toContain('test_unit_size_sum');
      expect(output).toContain('test_unit_size_count');
    });
  });

  // =========================================================================
  // Standard Metrics
  // =========================================================================

  describe('standard metrics', () => {
    it('should register standard PRISM metrics', () => {
      engine.registerStandardMetrics();
      const stats = engine.getStats();

      expect(stats.totalMetrics).toBeGreaterThan(5);
      expect(stats.counters).toBeGreaterThan(0);
      expect(stats.gauges).toBeGreaterThan(0);
      expect(stats.histograms).toBeGreaterThan(0);
    });

    it('should allow incrementing standard counters', () => {
      engine.registerStandardMetrics();

      engine.incCounter('http_requests_total', {
        method: 'POST',
        path: '/api/generate',
        status: '200',
        tenant_id: 'jm-die',
      });

      expect(engine.getCounter('http_requests_total', {
        method: 'POST',
        path: '/api/generate',
        status: '200',
        tenant_id: 'jm-die',
      })).toBe(1);
    });

    it('should allow observing program generation histogram', () => {
      engine.registerStandardMetrics();

      engine.observeHistogram('program_generation_duration_seconds', 15.5, {
        machine_type: 'lathe',
        operation_type: 'turning',
        tenant_id: 'jm-die',
      });

      const hist = engine.getHistogram('program_generation_duration_seconds', {
        machine_type: 'lathe',
        operation_type: 'turning',
        tenant_id: 'jm-die',
      });

      expect(hist?.count).toBe(1);
      expect(hist?.sum).toBe(15.5);
    });
  });

  // =========================================================================
  // Statistics
  // =========================================================================

  describe('statistics', () => {
    it('should track metric counts', () => {
      engine.register({ name: 'c1', help: 'C', type: 'counter', labelNames: [] });
      engine.register({ name: 'g1', help: 'G', type: 'gauge', labelNames: [] });
      engine.register({ name: 'h1', help: 'H', type: 'histogram', labelNames: [] });

      const stats = engine.getStats();
      expect(stats.totalMetrics).toBe(3);
      expect(stats.counters).toBe(1);
      expect(stats.gauges).toBe(1);
      expect(stats.histograms).toBe(1);
    });

    it('should track total series', () => {
      engine.register({ name: 'multi', help: 'M', type: 'counter', labelNames: ['k'] });

      engine.incCounter('multi', { k: '1' });
      engine.incCounter('multi', { k: '2' });
      engine.incCounter('multi', { k: '3' });

      expect(engine.getStats().totalSeries).toBe(3);
    });
  });

  // =========================================================================
  // Clear
  // =========================================================================

  describe('clear', () => {
    it('should clear all metrics', () => {
      engine.register({ name: 'test', help: 'T', type: 'counter', labelNames: [] });
      engine.incCounter('test');

      engine.clear();

      expect(engine.getStats().totalMetrics).toBe(0);
      expect(engine.getStats().totalSeries).toBe(0);
    });
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('singleton', () => {
    it('should export singleton instance', () => {
      expect(prometheusMetricsEngine).toBeInstanceOf(PrometheusMetricsEngine);
    });
  });
});
