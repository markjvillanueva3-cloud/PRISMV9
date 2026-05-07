/**
 * AuditLoggingEngine Tests — U-LPR-SEC04
 *
 * Tests for comprehensive security event logging:
 * - Event logging with hash chaining
 * - Convenience methods (auth, authz, data access/mod)
 * - Query and filtering
 * - Chain integrity verification
 * - Retention policies
 * - Export functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AuditLoggingEngine,
  auditLoggingEngine,
  type AuditEvent,
} from '../engines/AuditLoggingEngine.js';

describe('AuditLoggingEngine', () => {
  let engine: AuditLoggingEngine;

  beforeEach(() => {
    engine = new AuditLoggingEngine();
  });

  describe('Basic Event Logging', () => {
    it('should log an event with generated ID and timestamp', () => {
      const event = engine.logEvent({
        tenantId: 'tenant-1',
        category: 'authentication',
        severity: 'info',
        action: 'login',
        outcome: 'success',
        actorId: 'user-123',
        actorType: 'user',
      });

      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.tenantId).toBe('tenant-1');
      expect(event.category).toBe('authentication');
      expect(event.hash).toBeDefined();
      expect(event.previousHash).toBe('GENESIS');
    });

    it('should chain events with hash linking', () => {
      const event1 = engine.logEvent({
        tenantId: 'tenant-1',
        category: 'authentication',
        severity: 'info',
        action: 'login',
        outcome: 'success',
        actorId: 'user-1',
        actorType: 'user',
      });

      const event2 = engine.logEvent({
        tenantId: 'tenant-1',
        category: 'data_access',
        severity: 'info',
        action: 'read',
        outcome: 'success',
        actorId: 'user-1',
        actorType: 'user',
      });

      expect(event2.previousHash).toBe(event1.hash);
    });

    it('should include resource information when provided', () => {
      const event = engine.logEvent({
        tenantId: 'tenant-1',
        category: 'data_access',
        severity: 'info',
        action: 'read',
        outcome: 'success',
        actorId: 'user-1',
        actorType: 'user',
        resourceType: 'file',
        resourceId: 'file-456',
        resourcePath: '/docs/secret.txt',
      });

      expect(event.resource).toBeDefined();
      expect(event.resource!.type).toBe('file');
      expect(event.resource!.id).toBe('file-456');
      expect(event.resource!.path).toBe('/docs/secret.txt');
    });

    it('should include actor IP and user agent when provided', () => {
      const event = engine.logEvent({
        tenantId: 'tenant-1',
        category: 'authentication',
        severity: 'info',
        action: 'login',
        outcome: 'success',
        actorId: 'user-1',
        actorType: 'user',
        actorIp: '192.168.1.100',
        actorUserAgent: 'Mozilla/5.0',
      });

      expect(event.actor.ip).toBe('192.168.1.100');
      expect(event.actor.userAgent).toBe('Mozilla/5.0');
    });
  });

  describe('Convenience Methods', () => {
    it('should log authentication events', () => {
      const event = engine.logAuthentication(
        'tenant-1',
        'user-123',
        'success',
        'password',
        '10.0.0.1',
        { mfa: true }
      );

      expect(event.category).toBe('authentication');
      expect(event.action).toBe('auth.password');
      expect(event.severity).toBe('info');
      expect(event.details).toEqual({ method: 'password', mfa: true });
    });

    it('should log failed authentication with warning severity', () => {
      const event = engine.logAuthentication(
        'tenant-1',
        'user-123',
        'failure',
        'password'
      );

      expect(event.severity).toBe('warning');
      expect(event.outcome).toBe('failure');
    });

    it('should log authorization events', () => {
      const event = engine.logAuthorization(
        'tenant-1',
        'user-123',
        '/admin/settings',
        'write',
        'failure',
        { reason: 'insufficient_permissions' }
      );

      expect(event.category).toBe('authorization');
      expect(event.action).toBe('authz.check.write');
      expect(event.resource?.path).toBe('/admin/settings');
    });

    it('should log data access events', () => {
      const event = engine.logDataAccess(
        'tenant-1',
        'user-123',
        'document',
        'doc-456',
        'read',
        'success'
      );

      expect(event.category).toBe('data_access');
      expect(event.action).toBe('data.read');
      expect(event.resource?.type).toBe('document');
    });

    it('should log data modification events', () => {
      const event = engine.logDataModification(
        'tenant-1',
        'user-123',
        'record',
        'rec-789',
        'delete',
        'success'
      );

      expect(event.category).toBe('data_modification');
      expect(event.action).toBe('data.delete');
      expect(event.severity).toBe('warning');
    });

    it('should log security alerts', () => {
      const event = engine.logSecurityAlert(
        'tenant-1',
        'brute_force',
        'critical',
        'attacker-ip',
        { attempts: 100, blocked: true }
      );

      expect(event.category).toBe('security_alert');
      expect(event.severity).toBe('critical');
      expect(event.outcome).toBe('failure');
    });

    it('should log configuration changes', () => {
      const event = engine.logConfigurationChange(
        'tenant-1',
        'admin-1',
        'security.mfa_required',
        'success',
        { oldValue: false, newValue: true }
      );

      expect(event.category).toBe('configuration');
      expect(event.action).toBe('config.change.security.mfa_required');
    });
  });

  describe('Querying Events', () => {
    beforeEach(() => {
      // Set up test events
      engine.logAuthentication('tenant-1', 'user-1', 'success', 'password');
      engine.logAuthentication('tenant-1', 'user-2', 'failure', 'password');
      engine.logAuthorization('tenant-1', 'user-1', '/data', 'read', 'success');
      engine.logDataModification('tenant-1', 'user-1', 'file', 'f1', 'create', 'success');
      engine.logAuthentication('tenant-2', 'user-3', 'success', 'sso');
    });

    it('should filter by tenant', () => {
      const results = engine.queryEvents({ tenantId: 'tenant-1' });
      expect(results.every(e => e.tenantId === 'tenant-1')).toBe(true);
      expect(results).toHaveLength(4);
    });

    it('should filter by category', () => {
      const results = engine.queryEvents({
        tenantId: 'tenant-1',
        categories: ['authentication'],
      });
      expect(results.every(e => e.category === 'authentication')).toBe(true);
      expect(results).toHaveLength(2);
    });

    it('should filter by severity', () => {
      const results = engine.queryEvents({
        tenantId: 'tenant-1',
        severities: ['warning'],
      });
      expect(results.every(e => e.severity === 'warning')).toBe(true);
    });

    it('should filter by outcome', () => {
      const results = engine.queryEvents({
        tenantId: 'tenant-1',
        outcomes: ['failure'],
      });
      expect(results.every(e => e.outcome === 'failure')).toBe(true);
    });

    it('should filter by actor', () => {
      const results = engine.queryEvents({
        tenantId: 'tenant-1',
        actorId: 'user-1',
      });
      expect(results.every(e => e.actor.id === 'user-1')).toBe(true);
    });

    it('should apply pagination', () => {
      const page1 = engine.queryEvents({ tenantId: 'tenant-1', limit: 2, offset: 0 });
      const page2 = engine.queryEvents({ tenantId: 'tenant-1', limit: 2, offset: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should count events', () => {
      const count = engine.countEvents({ tenantId: 'tenant-1' });
      expect(count).toBe(4);
    });
  });

  describe('Chain Integrity Verification', () => {
    it('should verify intact chain', () => {
      engine.logEvent({
        tenantId: 'tenant-1',
        category: 'authentication',
        severity: 'info',
        action: 'login',
        outcome: 'success',
        actorId: 'user-1',
        actorType: 'user',
      });

      engine.logEvent({
        tenantId: 'tenant-1',
        category: 'data_access',
        severity: 'info',
        action: 'read',
        outcome: 'success',
        actorId: 'user-1',
        actorType: 'user',
      });

      const result = engine.verifyChainIntegrity();
      expect(result.valid).toBe(true);
      expect(result.totalEvents).toBe(2);
      expect(result.verifiedEvents).toBe(2);
    });

    it('should verify chain for specific tenant', () => {
      engine.logAuthentication('tenant-1', 'user-1', 'success', 'password');
      engine.logAuthentication('tenant-2', 'user-2', 'success', 'password');

      const result = engine.verifyChainIntegrity('tenant-1');
      expect(result.valid).toBe(true);
      expect(result.totalEvents).toBe(1);
    });

    it('should return valid for empty log', () => {
      const result = engine.verifyChainIntegrity();
      expect(result.valid).toBe(true);
      expect(result.totalEvents).toBe(0);
    });
  });

  describe('Retention Policies', () => {
    it('should set and get retention policy', () => {
      const policy = {
        tenantId: 'tenant-1',
        retentionDays: 90,
        maxEventsPerDay: 10000,
        archiveEnabled: true,
        archivePath: '/archive/tenant-1',
      };

      engine.setRetentionPolicy(policy);
      const retrieved = engine.getRetentionPolicy('tenant-1');

      expect(retrieved).toEqual(policy);
    });

    it('should return null for missing policy', () => {
      const policy = engine.getRetentionPolicy('no-such-tenant');
      expect(policy).toBeNull();
    });
  });

  describe('Export Functionality', () => {
    it('should export events in JSON format', () => {
      engine.logAuthentication('tenant-1', 'user-1', 'success', 'password');
      engine.logDataAccess('tenant-1', 'user-1', 'file', 'f1', 'read', 'success');

      const exportData = engine.exportAuditLog(
        { tenantId: 'tenant-1' },
        'json'
      );

      expect(exportData.format).toBe('json');
      expect(exportData.events).toHaveLength(2);
      expect(exportData.exportedAt).toBeGreaterThan(0);
      expect(exportData.integrityHash).toBeDefined();
    });

    it('should include query in export', () => {
      engine.logAuthentication('tenant-1', 'user-1', 'success', 'password');

      const query = { tenantId: 'tenant-1', categories: ['authentication' as const] };
      const exportData = engine.exportAuditLog(query, 'json');

      expect(exportData.query).toEqual(query);
    });
  });

  describe('Event Retrieval', () => {
    it('should get event by ID', () => {
      const logged = engine.logAuthentication('tenant-1', 'user-1', 'success', 'password');
      const retrieved = engine.getEvent(logged.id);

      expect(retrieved).toEqual(logged);
    });

    it('should return null for non-existent event', () => {
      const event = engine.getEvent('non-existent');
      expect(event).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should track event statistics', () => {
      engine.logAuthentication('tenant-1', 'user-1', 'success', 'password');
      engine.logAuthentication('tenant-1', 'user-2', 'failure', 'password');
      engine.logDataAccess('tenant-2', 'user-3', 'file', 'f1', 'read', 'success');

      const stats = engine.getStats();

      expect(stats.totalEvents).toBe(3);
      expect(stats.eventsByTenant['tenant-1']).toBe(2);
      expect(stats.eventsByTenant['tenant-2']).toBe(1);
      expect(stats.eventsByCategory.authentication).toBe(2);
      expect(stats.eventsByCategory.data_access).toBe(1);
      expect(stats.eventsBySeverity.info).toBe(2);
      expect(stats.eventsBySeverity.warning).toBe(1);
      expect(stats.eventsByOutcome.success).toBe(2);
      expect(stats.eventsByOutcome.failure).toBe(1);
      expect(stats.chainIntegrity).toBe(true);
    });

    it('should track oldest and newest events', () => {
      const first = engine.logAuthentication('tenant-1', 'user-1', 'success', 'password');

      // Small delay to ensure different timestamps
      const second = engine.logAuthentication('tenant-1', 'user-2', 'success', 'password');

      const stats = engine.getStats();

      expect(stats.oldestEvent).toBe(first.timestamp);
      expect(stats.newestEvent).toBe(second.timestamp);
    });
  });

  describe('Clear', () => {
    it('should clear all events', () => {
      engine.logAuthentication('tenant-1', 'user-1', 'success', 'password');
      engine.logAuthentication('tenant-1', 'user-2', 'success', 'password');

      engine.clear();

      const stats = engine.getStats();
      expect(stats.totalEvents).toBe(0);
    });

    it('should reset hash chain after clear', () => {
      engine.logAuthentication('tenant-1', 'user-1', 'success', 'password');
      engine.clear();

      const newEvent = engine.logAuthentication('tenant-1', 'user-2', 'success', 'password');
      expect(newEvent.previousHash).toBe('GENESIS');
    });
  });

  describe('Singleton Export', () => {
    it('should export a singleton instance', () => {
      expect(auditLoggingEngine).toBeInstanceOf(AuditLoggingEngine);
    });
  });
});
