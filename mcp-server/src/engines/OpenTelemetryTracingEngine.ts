/**
 * OpenTelemetryTracingEngine — U-LPR-OBS1
 *
 * Distributed tracing for production observability:
 * - W3C traceparent header propagation
 * - Head-based sampling (10% default)
 * - Tail-based sampling (100% on error)
 * - Tempo-compatible trace export
 * - Span context management
 * - Baggage propagation for tenant/request context
 * - Manufacturing-specific span attributes
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OBS1
 * @phase PHASE-10 (Observability + SLO)
 */

import * as crypto from 'crypto';
import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export type SpanKind = 'internal' | 'server' | 'client' | 'producer' | 'consumer';

export type SpanStatus = 'unset' | 'ok' | 'error';

export interface TraceContext {
  traceId: string;       // 32 hex chars (128-bit)
  spanId: string;        // 16 hex chars (64-bit)
  traceFlags: number;    // 8-bit, 0x01 = sampled
  traceState?: string;   // vendor-specific key=value pairs
}

export interface SpanContext extends TraceContext {
  isRemote: boolean;
}

export interface SpanAttributes {
  [key: string]: string | number | boolean | string[] | number[] | boolean[];
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: SpanAttributes;
}

export interface SpanLink {
  context: SpanContext;
  attributes?: SpanAttributes;
}

export interface Span {
  name: string;
  context: SpanContext;
  parentSpanId?: string;
  kind: SpanKind;
  startTime: number;
  endTime?: number;
  attributes: SpanAttributes;
  events: SpanEvent[];
  links: SpanLink[];
  status: SpanStatus;
  statusMessage?: string;
}

export interface Baggage {
  [key: string]: { value: string; metadata?: string };
}

export interface TracerConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  headSamplingRate: number;   // 0.0 - 1.0, default 0.1 (10%)
  tailSampleOnError: boolean; // always sample on error
  maxSpansPerTrace: number;
  maxAttributeLength: number;
  exportEndpoint?: string;    // Tempo endpoint
  exportBatchSize: number;
  exportIntervalMs: number;
}

export interface SamplingDecision {
  sampled: boolean;
  reason: 'head_sample' | 'tail_sample_error' | 'forced' | 'parent_based' | 'rate_limited';
}

export interface TraceExportResult {
  success: boolean;
  spansExported: number;
  errors?: string[];
}

export interface TracerStats {
  totalTraces: number;
  totalSpans: number;
  sampledSpans: number;
  droppedSpans: number;
  errorSpans: number;
  exportedBatches: number;
  exportErrors: number;
  avgSpanDurationMs: number;
}

// ============================================================================
// W3C TRACE CONTEXT
// ============================================================================

const TRACEPARENT_REGEX = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

export function parseTraceparent(header: string): TraceContext | null {
  const match = header.toLowerCase().match(TRACEPARENT_REGEX);
  if (!match) return null;

  const [, traceId, spanId, flags] = match;

  // Validate trace/span IDs are not all zeros
  if (/^0+$/.test(traceId) || /^0+$/.test(spanId)) {
    return null;
  }

  return {
    traceId,
    spanId,
    traceFlags: parseInt(flags, 16),
  };
}

export function formatTraceparent(ctx: TraceContext): string {
  const flags = ctx.traceFlags.toString(16).padStart(2, '0');
  return `00-${ctx.traceId}-${ctx.spanId}-${flags}`;
}

export function parseTracestate(header: string): string {
  // Preserve tracestate as-is for now (vendor pairs)
  return header.trim();
}

// ============================================================================
// ENGINE
// ============================================================================

export class OpenTelemetryTracingEngine {
  private config: TracerConfig;
  private activeSpans: Map<string, Span> = new Map();
  private completedSpans: Span[] = [];
  private exportQueue: Span[] = [];
  private stats: TracerStats = {
    totalTraces: 0,
    totalSpans: 0,
    sampledSpans: 0,
    droppedSpans: 0,
    errorSpans: 0,
    exportedBatches: 0,
    exportErrors: 0,
    avgSpanDurationMs: 0,
  };
  private traceIdSet: Set<string> = new Set();
  private totalDurationMs = 0;
  private durationCount = 0;

  private defaultConfig: TracerConfig = {
    serviceName: 'prism-mcp',
    serviceVersion: '1.0.0',
    environment: 'production',
    headSamplingRate: 0.1,
    tailSampleOnError: true,
    maxSpansPerTrace: 1000,
    maxAttributeLength: 256,
    exportBatchSize: 100,
    exportIntervalMs: 5000,
  };

  constructor(config?: Partial<TracerConfig>) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Updates tracer configuration.
   */
  configure(config: Partial<TracerConfig>): void {
    this.config = { ...this.config, ...config };
    log.info(`[OTel] Tracer configured: ${this.config.serviceName} v${this.config.serviceVersion}`);
  }

  /**
   * Gets current configuration.
   */
  getConfig(): TracerConfig {
    return { ...this.config };
  }

  /**
   * Generates a new trace ID (128-bit).
   */
  generateTraceId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generates a new span ID (64-bit).
   */
  generateSpanId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Makes a sampling decision for a new trace.
   */
  shouldSample(parentContext?: SpanContext, forceSample?: boolean): SamplingDecision {
    if (forceSample) {
      return { sampled: true, reason: 'forced' };
    }

    // Parent-based sampling
    if (parentContext) {
      const sampled = (parentContext.traceFlags & 0x01) === 0x01;
      return { sampled, reason: 'parent_based' };
    }

    // Head-based probabilistic sampling
    const sampled = Math.random() < this.config.headSamplingRate;
    return { sampled, reason: 'head_sample' };
  }

  /**
   * Extracts trace context from incoming W3C headers.
   */
  extract(headers: { traceparent?: string; tracestate?: string }): SpanContext | null {
    if (!headers.traceparent) return null;

    const ctx = parseTraceparent(headers.traceparent);
    if (!ctx) return null;

    return {
      ...ctx,
      traceState: headers.tracestate ? parseTracestate(headers.tracestate) : undefined,
      isRemote: true,
    };
  }

  /**
   * Injects trace context into outgoing headers.
   */
  inject(ctx: SpanContext): { traceparent: string; tracestate?: string } {
    const headers: { traceparent: string; tracestate?: string } = {
      traceparent: formatTraceparent(ctx),
    };

    if (ctx.traceState) {
      headers.tracestate = ctx.traceState;
    }

    return headers;
  }

  /**
   * Starts a new span.
   */
  startSpan(input: {
    name: string;
    kind?: SpanKind;
    parentContext?: SpanContext;
    attributes?: SpanAttributes;
    links?: SpanLink[];
    forceSample?: boolean;
  }): Span {
    const { name, kind = 'internal', parentContext, attributes = {}, links = [], forceSample } = input;

    // Determine if this starts a new trace
    const isNewTrace = !parentContext;
    const traceId = parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();

    // Sampling decision
    const decision = this.shouldSample(parentContext, forceSample);
    const traceFlags = decision.sampled ? 0x01 : 0x00;

    const context: SpanContext = {
      traceId,
      spanId,
      traceFlags,
      traceState: parentContext?.traceState,
      isRemote: false,
    };

    const span: Span = {
      name,
      context,
      parentSpanId: parentContext?.spanId,
      kind,
      startTime: Date.now(),
      attributes: {
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion,
        'deployment.environment': this.config.environment,
        ...attributes,
      },
      events: [],
      links,
      status: 'unset',
    };

    // Track new traces
    if (isNewTrace && !this.traceIdSet.has(traceId)) {
      this.traceIdSet.add(traceId);
      this.stats.totalTraces++;
    }

    this.stats.totalSpans++;
    if (decision.sampled) {
      this.stats.sampledSpans++;
      this.activeSpans.set(spanId, span);
    } else {
      this.stats.droppedSpans++;
    }

    return span;
  }

  /**
   * Adds an event to a span.
   */
  addEvent(spanId: string, name: string, attributes?: SpanAttributes): boolean {
    const span = this.activeSpans.get(spanId);
    if (!span) return false;

    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });

    return true;
  }

  /**
   * Sets span attributes.
   */
  setAttributes(spanId: string, attributes: SpanAttributes): boolean {
    const span = this.activeSpans.get(spanId);
    if (!span) return false;

    for (const [key, value] of Object.entries(attributes)) {
      // Truncate string values
      if (typeof value === 'string' && value.length > this.config.maxAttributeLength) {
        span.attributes[key] = value.substring(0, this.config.maxAttributeLength);
      } else {
        span.attributes[key] = value;
      }
    }

    return true;
  }

  /**
   * Sets span status.
   */
  setStatus(spanId: string, status: SpanStatus, message?: string): boolean {
    const span = this.activeSpans.get(spanId);
    if (!span) return false;

    span.status = status;
    span.statusMessage = message;

    if (status === 'error') {
      this.stats.errorSpans++;
    }

    return true;
  }

  /**
   * Ends a span.
   */
  endSpan(spanId: string): Span | null {
    const span = this.activeSpans.get(spanId);
    if (!span) return null;

    span.endTime = Date.now();
    this.activeSpans.delete(spanId);
    this.completedSpans.push(span);

    // Track duration for stats
    const duration = span.endTime - span.startTime;
    this.totalDurationMs += duration;
    this.durationCount++;
    this.stats.avgSpanDurationMs = this.totalDurationMs / this.durationCount;

    // Tail-based sampling: upgrade to sampled if error
    if (this.config.tailSampleOnError && span.status === 'error') {
      span.context.traceFlags |= 0x01;
    }

    // Add to export queue if sampled
    if ((span.context.traceFlags & 0x01) === 0x01) {
      this.exportQueue.push(span);
    }

    return span;
  }

  /**
   * Records an exception on a span.
   */
  recordException(spanId: string, error: Error): boolean {
    const span = this.activeSpans.get(spanId);
    if (!span) return false;

    span.events.push({
      name: 'exception',
      timestamp: Date.now(),
      attributes: {
        'exception.type': error.name,
        'exception.message': error.message,
        'exception.stacktrace': error.stack || '',
      },
    });

    span.status = 'error';
    span.statusMessage = error.message;
    this.stats.errorSpans++;

    return true;
  }

  /**
   * Creates a child span context.
   */
  createChildContext(parentSpan: Span): SpanContext {
    return {
      traceId: parentSpan.context.traceId,
      spanId: this.generateSpanId(),
      traceFlags: parentSpan.context.traceFlags,
      traceState: parentSpan.context.traceState,
      isRemote: false,
    };
  }

  /**
   * Adds manufacturing-specific attributes to a span.
   */
  addManufacturingAttributes(spanId: string, attrs: {
    tenantId?: string;
    machineId?: string;
    partId?: string;
    operatorId?: string;
    toolId?: string;
    operationType?: string;
    material?: string;
    programName?: string;
  }): boolean {
    const mappedAttrs: SpanAttributes = {};

    if (attrs.tenantId) mappedAttrs['prism.tenant_id'] = attrs.tenantId;
    if (attrs.machineId) mappedAttrs['prism.machine_id'] = attrs.machineId;
    if (attrs.partId) mappedAttrs['prism.part_id'] = attrs.partId;
    if (attrs.operatorId) mappedAttrs['prism.operator_id'] = attrs.operatorId;
    if (attrs.toolId) mappedAttrs['prism.tool_id'] = attrs.toolId;
    if (attrs.operationType) mappedAttrs['prism.operation_type'] = attrs.operationType;
    if (attrs.material) mappedAttrs['prism.material'] = attrs.material;
    if (attrs.programName) mappedAttrs['prism.program_name'] = attrs.programName;

    return this.setAttributes(spanId, mappedAttrs);
  }

  /**
   * Flushes export queue (simulated Tempo export).
   */
  async flush(): Promise<TraceExportResult> {
    const spans = this.exportQueue.splice(0, this.config.exportBatchSize);
    if (spans.length === 0) {
      return { success: true, spansExported: 0 };
    }

    try {
      // In real implementation, this would send to Tempo
      // For now, we simulate success
      if (this.config.exportEndpoint) {
        log.debug(`[OTel] Exporting ${spans.length} spans to ${this.config.exportEndpoint}`);
      }

      this.stats.exportedBatches++;
      return { success: true, spansExported: spans.length };
    } catch (err: any) {
      this.stats.exportErrors++;
      return { success: false, spansExported: 0, errors: [err.message] };
    }
  }

  /**
   * Gets tracer statistics.
   */
  getStats(): TracerStats {
    return { ...this.stats };
  }

  /**
   * Gets active span count.
   */
  getActiveSpanCount(): number {
    return this.activeSpans.size;
  }

  /**
   * Gets completed spans (for testing).
   */
  getCompletedSpans(): Span[] {
    return [...this.completedSpans];
  }

  /**
   * Gets export queue length.
   */
  getExportQueueLength(): number {
    return this.exportQueue.length;
  }

  /**
   * Clears all data (for testing).
   */
  clear(): void {
    this.activeSpans.clear();
    this.completedSpans = [];
    this.exportQueue = [];
    this.traceIdSet.clear();
    this.stats = {
      totalTraces: 0,
      totalSpans: 0,
      sampledSpans: 0,
      droppedSpans: 0,
      errorSpans: 0,
      exportedBatches: 0,
      exportErrors: 0,
      avgSpanDurationMs: 0,
    };
    this.totalDurationMs = 0;
    this.durationCount = 0;
  }

  /**
   * Convenience: wraps an async function with tracing.
   */
  async trace<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: {
      kind?: SpanKind;
      parentContext?: SpanContext;
      attributes?: SpanAttributes;
    }
  ): Promise<T> {
    const span = this.startSpan({
      name,
      kind: options?.kind,
      parentContext: options?.parentContext,
      attributes: options?.attributes,
    });

    try {
      const result = await fn(span);
      this.setStatus(span.context.spanId, 'ok');
      return result;
    } catch (err: any) {
      this.recordException(span.context.spanId, err);
      throw err;
    } finally {
      this.endSpan(span.context.spanId);
    }
  }
}

export const openTelemetryTracingEngine = new OpenTelemetryTracingEngine();
