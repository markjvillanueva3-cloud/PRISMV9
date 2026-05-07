/**
 * AuditLoggingEngine — U-LPR-SEC04
 *
 * Comprehensive security event logging with:
 * - Tamper-evident log chains (hash chaining)
 * - Structured audit events (who, what, when, where, outcome)
 * - Retention policies with automatic rotation
 * - Event severity classification
 * - Compliance-ready export (SIEM integration)
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC04
 * @phase PHASE-9 (Security + Compliance)
 */

import * as crypto from 'crypto';
import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export type EventSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type EventCategory =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'configuration'
  | 'security_alert'
  | 'compliance'
  | 'system';

export type EventOutcome = 'success' | 'failure' | 'error' | 'unknown';

export interface AuditEvent {
  id: string;
  timestamp: number;
  tenantId: string;
  category: EventCategory;
  severity: EventSeverity;
  action: string;
  outcome: EventOutcome;
  actor: {
    id: string;
    type: 'user' | 'service' | 'system';
    ip?: string;
    userAgent?: string;
  };
  resource?: {
    type: string;
    id: string;
    path?: string;
  };
  details?: Record<string, unknown>;
  previousHash: string;
  hash: string;
}

export interface AuditEventInput {
  tenantId: string;
  category: EventCategory;
  severity: EventSeverity;
  action: string;
  outcome: EventOutcome;
  actorId: string;
  actorType: 'user' | 'service' | 'system';
  actorIp?: string;
  actorUserAgent?: string;
  resourceType?: string;
  resourceId?: string;
  resourcePath?: string;
  details?: Record<string, unknown>;
}

export interface RetentionPolicy {
  tenantId: string;
  retentionDays: number;
  maxEventsPerDay: number;
  archiveEnabled: boolean;
  archivePath?: string;
}

export interface AuditQuery {
  tenantId: string;
  startTime?: number;
  endTime?: number;
  categories?: EventCategory[];
  severities?: EventSeverity[];
  outcomes?: EventOutcome[];
  actorId?: string;
  resourceId?: string;
  limit?: number;
  offset?: number;
}

export interface AuditExport {
  format: 'json' | 'csv' | 'cef';
  events: AuditEvent[];
  exportedAt: number;
  tenantId: string;
  query: AuditQuery;
  integrityHash: string;
}

export interface ChainVerificationResult {
  valid: boolean;
  totalEvents: number;
  verifiedEvents: number;
  firstBrokenAt?: number;
  brokenEventId?: string;
}

export interface AuditStats {
  totalEvents: number;
  eventsByTenant: Record<string, number>;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByOutcome: Record<string, number>;
  chainIntegrity: boolean;
  oldestEvent?: number;
  newestEvent?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class AuditLoggingEngine {
  private events: AuditEvent[] = [];
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private lastHash: string = 'GENESIS';
  private maxEvents: number = 100000;

  /**
   * Logs an audit event with hash chaining.
   */
  logEvent(input: AuditEventInput): AuditEvent {
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      tenantId: input.tenantId,
      category: input.category,
      severity: input.severity,
      action: input.action,
      outcome: input.outcome,
      actor: {
        id: input.actorId,
        type: input.actorType,
        ip: input.actorIp,
        userAgent: input.actorUserAgent,
      },
      resource: input.resourceType ? {
        type: input.resourceType,
        id: input.resourceId || '',
        path: input.resourcePath,
      } : undefined,
      details: input.details,
      previousHash: this.lastHash,
      hash: '', // Will be computed
    };

    // Compute hash for tamper evidence
    event.hash = this.computeEventHash(event);
    this.lastHash = event.hash;

    this.events.push(event);
    this.enforceRetention(input.tenantId);

    // Log critical events to system logger
    if (input.severity === 'critical' || input.severity === 'error') {
      log.warn(`[AUDIT] ${input.severity.toUpperCase()}: ${input.action} by ${input.actorId} — ${input.outcome}`);
    }

    return event;
  }

  /**
   * Logs authentication event.
   */
  logAuthentication(
    tenantId: string,
    actorId: string,
    outcome: EventOutcome,
    method: string,
    ip?: string,
    details?: Record<string, unknown>
  ): AuditEvent {
    return this.logEvent({
      tenantId,
      category: 'authentication',
      severity: outcome === 'failure' ? 'warning' : 'info',
      action: `auth.${method}`,
      outcome,
      actorId,
      actorType: 'user',
      actorIp: ip,
      details: { method, ...details },
    });
  }

  /**
   * Logs authorization event.
   */
  logAuthorization(
    tenantId: string,
    actorId: string,
    resourcePath: string,
    permission: string,
    outcome: EventOutcome,
    details?: Record<string, unknown>
  ): AuditEvent {
    return this.logEvent({
      tenantId,
      category: 'authorization',
      severity: outcome === 'failure' ? 'warning' : 'info',
      action: `authz.check.${permission}`,
      outcome,
      actorId,
      actorType: 'user',
      resourceType: 'path',
      resourcePath,
      details: { permission, ...details },
    });
  }

  /**
   * Logs data access event.
   */
  logDataAccess(
    tenantId: string,
    actorId: string,
    resourceType: string,
    resourceId: string,
    operation: 'read' | 'list' | 'export',
    outcome: EventOutcome,
    details?: Record<string, unknown>
  ): AuditEvent {
    return this.logEvent({
      tenantId,
      category: 'data_access',
      severity: 'info',
      action: `data.${operation}`,
      outcome,
      actorId,
      actorType: 'user',
      resourceType,
      resourceId,
      details,
    });
  }

  /**
   * Logs data modification event.
   */
  logDataModification(
    tenantId: string,
    actorId: string,
    resourceType: string,
    resourceId: string,
    operation: 'create' | 'update' | 'delete',
    outcome: EventOutcome,
    details?: Record<string, unknown>
  ): AuditEvent {
    return this.logEvent({
      tenantId,
      category: 'data_modification',
      severity: operation === 'delete' ? 'warning' : 'info',
      action: `data.${operation}`,
      outcome,
      actorId,
      actorType: 'user',
      resourceType,
      resourceId,
      details,
    });
  }

  /**
   * Logs security alert.
   */
  logSecurityAlert(
    tenantId: string,
    alertType: string,
    severity: EventSeverity,
    actorId: string,
    details: Record<string, unknown>
  ): AuditEvent {
    return this.logEvent({
      tenantId,
      category: 'security_alert',
      severity,
      action: `security.alert.${alertType}`,
      outcome: 'failure',
      actorId,
      actorType: 'user',
      details,
    });
  }

  /**
   * Logs configuration change.
   */
  logConfigurationChange(
    tenantId: string,
    actorId: string,
    configKey: string,
    outcome: EventOutcome,
    details?: Record<string, unknown>
  ): AuditEvent {
    return this.logEvent({
      tenantId,
      category: 'configuration',
      severity: 'warning',
      action: `config.change.${configKey}`,
      outcome,
      actorId,
      actorType: 'user',
      details,
    });
  }

  /**
   * Queries audit events with filtering.
   */
  queryEvents(query: AuditQuery): AuditEvent[] {
    let results = this.events.filter(e => e.tenantId === query.tenantId);

    if (query.startTime) {
      results = results.filter(e => e.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter(e => e.timestamp <= query.endTime!);
    }
    if (query.categories?.length) {
      results = results.filter(e => query.categories!.includes(e.category));
    }
    if (query.severities?.length) {
      results = results.filter(e => query.severities!.includes(e.severity));
    }
    if (query.outcomes?.length) {
      results = results.filter(e => query.outcomes!.includes(e.outcome));
    }
    if (query.actorId) {
      results = results.filter(e => e.actor.id === query.actorId);
    }
    if (query.resourceId) {
      results = results.filter(e => e.resource?.id === query.resourceId);
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    return results.slice(offset, offset + limit);
  }

  /**
   * Exports audit log in specified format.
   */
  exportAuditLog(query: AuditQuery, format: 'json' | 'csv' | 'cef'): AuditExport {
    const events = this.queryEvents(query);
    const integrityHash = this.computeExportHash(events);

    return {
      format,
      events,
      exportedAt: Date.now(),
      tenantId: query.tenantId,
      query,
      integrityHash,
    };
  }

  /**
   * Verifies the integrity of the audit chain.
   */
  verifyChainIntegrity(tenantId?: string): ChainVerificationResult {
    const events = tenantId
      ? this.events.filter(e => e.tenantId === tenantId)
      : this.events;

    if (events.length === 0) {
      return { valid: true, totalEvents: 0, verifiedEvents: 0 };
    }

    let previousHash = 'GENESIS';
    let verifiedCount = 0;

    for (const event of events) {
      // Check previous hash link
      if (event.previousHash !== previousHash) {
        return {
          valid: false,
          totalEvents: events.length,
          verifiedEvents: verifiedCount,
          firstBrokenAt: event.timestamp,
          brokenEventId: event.id,
        };
      }

      // Verify event hash
      const computedHash = this.computeEventHash({ ...event, hash: '' });
      if (computedHash !== event.hash) {
        return {
          valid: false,
          totalEvents: events.length,
          verifiedEvents: verifiedCount,
          firstBrokenAt: event.timestamp,
          brokenEventId: event.id,
        };
      }

      previousHash = event.hash;
      verifiedCount++;
    }

    return {
      valid: true,
      totalEvents: events.length,
      verifiedEvents: verifiedCount,
    };
  }

  /**
   * Sets retention policy for a tenant.
   */
  setRetentionPolicy(policy: RetentionPolicy): void {
    this.retentionPolicies.set(policy.tenantId, policy);
    this.enforceRetention(policy.tenantId);
  }

  /**
   * Gets retention policy for a tenant.
   */
  getRetentionPolicy(tenantId: string): RetentionPolicy | null {
    return this.retentionPolicies.get(tenantId) || null;
  }

  /**
   * Gets a specific event by ID.
   */
  getEvent(id: string): AuditEvent | null {
    return this.events.find(e => e.id === id) || null;
  }

  /**
   * Gets count of events matching criteria.
   */
  countEvents(query: Omit<AuditQuery, 'limit' | 'offset'>): number {
    return this.queryEvents({ ...query, limit: Number.MAX_SAFE_INTEGER }).length;
  }

  /**
   * Gets audit statistics.
   */
  getStats(): AuditStats {
    const stats: AuditStats = {
      totalEvents: this.events.length,
      eventsByTenant: {},
      eventsByCategory: {},
      eventsBySeverity: {},
      eventsByOutcome: {},
      chainIntegrity: true,
    };

    for (const event of this.events) {
      stats.eventsByTenant[event.tenantId] = (stats.eventsByTenant[event.tenantId] || 0) + 1;
      stats.eventsByCategory[event.category] = (stats.eventsByCategory[event.category] || 0) + 1;
      stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
      stats.eventsByOutcome[event.outcome] = (stats.eventsByOutcome[event.outcome] || 0) + 1;

      if (!stats.oldestEvent || event.timestamp < stats.oldestEvent) {
        stats.oldestEvent = event.timestamp;
      }
      if (!stats.newestEvent || event.timestamp > stats.newestEvent) {
        stats.newestEvent = event.timestamp;
      }
    }

    // Quick integrity check
    stats.chainIntegrity = this.verifyChainIntegrity().valid;

    return stats;
  }

  /**
   * Clears all events (for testing).
   */
  clear(): void {
    this.events = [];
    this.lastHash = 'GENESIS';
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private computeEventHash(event: Omit<AuditEvent, 'hash'> & { hash?: string }): string {
    const payload = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp,
      tenantId: event.tenantId,
      category: event.category,
      severity: event.severity,
      action: event.action,
      outcome: event.outcome,
      actor: event.actor,
      resource: event.resource,
      details: event.details,
      previousHash: event.previousHash,
    });

    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  private computeExportHash(events: AuditEvent[]): string {
    const payload = events.map(e => e.hash).join('|');
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  private enforceRetention(tenantId: string): void {
    const policy = this.retentionPolicies.get(tenantId);
    if (!policy) return;

    const cutoffTime = Date.now() - (policy.retentionDays * 24 * 60 * 60 * 1000);

    // Remove events older than retention period
    this.events = this.events.filter(e =>
      e.tenantId !== tenantId || e.timestamp >= cutoffTime
    );

    // Enforce max events per tenant
    const tenantEvents = this.events.filter(e => e.tenantId === tenantId);
    if (tenantEvents.length > policy.maxEventsPerDay * policy.retentionDays) {
      const excess = tenantEvents.length - (policy.maxEventsPerDay * policy.retentionDays);
      const idsToRemove = new Set(tenantEvents.slice(0, excess).map(e => e.id));
      this.events = this.events.filter(e => !idsToRemove.has(e.id));
    }

    // Global max events cap
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }
}

export const auditLoggingEngine = new AuditLoggingEngine();
