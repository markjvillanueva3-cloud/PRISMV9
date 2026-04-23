/**
 * SessionManagementEngine Tests — U-LPR-SEC06
 *
 * Tests for secure session handling:
 * - Session creation with secure IDs
 * - Validation with binding checks
 * - Timeout enforcement
 * - Concurrent session limits
 * - Revocation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SessionManagementEngine,
  sessionManagementEngine,
} from '../engines/SessionManagementEngine.js';

describe('SessionManagementEngine', () => {
  let engine: SessionManagementEngine;

  beforeEach(() => {
    engine = new SessionManagementEngine();
  });

  describe('Session Creation', () => {
    it('should create a session with secure ID', () => {
      const session = engine.createSession({
        tenantId: 'tenant-1',
        userId: 'user-123',
      });

      expect(session.id).toBeDefined();
      expect(session.id.length).toBeGreaterThan(20);
      expect(session.tenantId).toBe('tenant-1');
      expect(session.userId).toBe('user-123');
      expect(session.revoked).toBe(false);
    });

    it('should set timestamps correctly', () => {
      const before = Date.now();
      const session = engine.createSession({
        tenantId: 'tenant-1',
        userId: 'user-123',
      });
      const after = Date.now();

      expect(session.createdAt).toBeGreaterThanOrEqual(before);
      expect(session.createdAt).toBeLessThanOrEqual(after);
      expect(session.lastActivityAt).toBe(session.createdAt);
      expect(session.expiresAt).toBeGreaterThan(session.createdAt);
    });

    it('should include IP and user agent when provided', () => {
      const session = engine.createSession({
        tenantId: 'tenant-1',
        userId: 'user-123',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      });

      expect(session.ipAddress).toBe('192.168.1.100');
      expect(session.userAgent).toBe('Mozilla/5.0');
      expect(session.fingerprint).toBeDefined();
    });

    it('should generate unique session IDs', () => {
      const sessions = Array.from({ length: 100 }, () =>
        engine.createSession({
          tenantId: 'tenant-1',
          userId: 'user-123',
        })
      );

      const ids = new Set(sessions.map(s => s.id));
      expect(ids.size).toBe(100);
    });
  });

  describe('Session Validation', () => {
    it('should validate active session', () => {
      const session = engine.createSession({
        tenantId: 'tenant-1',
        userId: 'user-123',
      });

      const result = engine.validateSession(session.id);

      expect(result.valid).toBe(true);
      expect(result.session).toBeDefined();
    });

    it('should reject non-existent session', () => {
      const result = engine.validateSession('non-existent');

      expect(result.valid).toBe(false);
      expect(result.invalidReason).toBe('session_not_found');
    });

    it('should reject revoked session', () => {
      const session = engine.createSession({
        tenantId: 'tenant-1',
        userId: 'user-123',
      });

      engine.revokeSession(session.id, 'test');
      const result = engine.validateSession(session.id);

      expect(result.valid).toBe(false);
      expect(result.invalidReason).toBe('session_revoked');
    });

    it('should refresh activity on validation', () => {
      const session = engine.createSession({
        tenantId: 'tenant-1',
        userId: 'user-123',
      });

      const originalActivity = session.lastActivityAt;

      // Small delay
      const delay = new Promise(resolve => setTimeout(resolve, 10));
      return delay.then(() => {
        engine.validateSession(session.id);
        const updated = engine.getSession(session.id);
        expect(updated!.lastActivityAt).toBeGreaterThanOrEqual(originalActivity);
      });
    });
  });

  describe('IP Binding', () => {
    beforeEach(() => {
      engine.setConfig({
        tenantId: 'tenant-1',
        idleTimeoutMs: 30 * 60 * 1000,
        absoluteTimeoutMs: 24 * 60 * 60 * 1000,
        maxConcurrentSessions: 5,
        bindToIp: true,
        bindToUserAgent: false,
        renewOnActivity: true,
      });
    });

    it('should validate with matching IP', () => {
      const session = engine.createSession({
        tenantId: 'tenant-1',
        userId: 'user-123',
        ipAddress: '192.168.1.100',
      });

      const result = engine.validateSession(session.id, {
        ipAddress: '192.168.1.100',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject with mismatched IP', () => {
      const session = engine.createSession({
        tenantId: 'tenant-1',
        userId: 'user-123',
        ipAddress: '192.168.1.100',
      });

      const result = engine.validateSession(session.id, {
        ipAddress: '10.0.0.1',
      });

      expect(result.valid).toBe(false);
      expect(result.invalidReason).toBe('ip_mismatch');
    });
  });

  describe('User Agent Binding', () => {
    beforeEach(() => {
      engine.setConfig({
        tenantId: 'tenant-1',
        idleTimeoutMs: 30 * 60 * 1000,
        absoluteTimeoutMs: 24 * 60 * 60 * 1000,
        maxConcurrentSessions: 5,
        bindToIp: false,
        bindToUserAgent: true,
        renewOnActivity: true,
      });
    });

    it('should validate with matching user agent', () => {
      const session = engine.createSession({
        tenantId: 'tenant-1',
        userId: 'user-123',
        userAgent: 'Mozilla/5.0',
      });

      const result = engine.validateSession(session.id, {
        userAgent: 'Mozilla/5.0',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject with mismatched user agent', () => {
      const session = engine.createSession({
        tenantId: 'tenant-1',
        userId: 'user-123',
        userAgent: 'Mozilla/5.0',
      });

      const result = engine.validateSession(session.id, {
        userAgent: 'Chrome/100',
      });

      expect(result.valid).toBe(false);
      expect(result.invalidReason).toBe('user_agent_mismatch');
    });
  });

  describe('Concurrent Session Limits', () => {
    beforeEach(() => {
      engine.setConfig({
        tenantId: 'tenant-1',
        idleTimeoutMs: 30 * 60 * 1000,
        absoluteTimeoutMs: 24 * 60 * 60 * 1000,
        maxConcurrentSessions: 2,
        bindToIp: false,
        bindToUserAgent: false,
        renewOnActivity: true,
      });
    });

    it('should enforce concurrent session limit', () => {
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-123' });
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-123' });

      // Third session should revoke the oldest
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-123' });

      const sessions = engine.getUserSessions('tenant-1', 'user-123');
      const activeSessions = sessions.filter(s => !s.revoked);

      expect(activeSessions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Session Revocation', () => {
    it('should revoke a single session', () => {
      const session = engine.createSession({
        tenantId: 'tenant-1',
        userId: 'user-123',
      });

      const revoked = engine.revokeSession(session.id, 'user_logout');

      expect(revoked).toBe(true);

      const updated = engine.getSession(session.id);
      expect(updated?.revoked).toBe(true);
      expect(updated?.revokedReason).toBe('user_logout');
    });

    it('should revoke all user sessions', () => {
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-123' });
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-123' });
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-123' });

      const count = engine.revokeUserSessions('tenant-1', 'user-123', 'security_alert');

      expect(count).toBe(3);

      const sessions = engine.getUserSessions('tenant-1', 'user-123');
      expect(sessions.every(s => s.revoked)).toBe(true);
    });

    it('should revoke all tenant sessions', () => {
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-1' });
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-2' });
      engine.createSession({ tenantId: 'tenant-2', userId: 'user-3' });

      const count = engine.revokeTenantSessions('tenant-1', 'breach_response');

      expect(count).toBe(2);

      const sessions = engine.getTenantSessions('tenant-1', true);
      expect(sessions.every(s => s.revoked)).toBe(true);
    });
  });

  describe('Session Touch/Extend', () => {
    it('should touch session to update activity', () => {
      const session = engine.createSession({
        tenantId: 'tenant-1',
        userId: 'user-123',
      });

      const original = session.lastActivityAt;

      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        engine.touchSession(session.id);
        const updated = engine.getSession(session.id);
        expect(updated!.lastActivityAt).toBeGreaterThan(original);
      });
    });

    it('should extend session expiration', () => {
      const session = engine.createSession({
        tenantId: 'tenant-1',
        userId: 'user-123',
      });

      const original = session.expiresAt;
      engine.extendSession(session.id, 60000);

      const updated = engine.getSession(session.id);
      expect(updated!.expiresAt).toBe(original + 60000);
    });
  });

  describe('Session Listing', () => {
    it('should list user sessions', () => {
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-1' });
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-1' });
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-2' });

      const sessions = engine.getUserSessions('tenant-1', 'user-1');
      expect(sessions).toHaveLength(2);
    });

    it('should list tenant sessions', () => {
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-1' });
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-2' });
      engine.createSession({ tenantId: 'tenant-2', userId: 'user-3' });

      const sessions = engine.getTenantSessions('tenant-1');
      expect(sessions).toHaveLength(2);
    });
  });

  describe('Configuration', () => {
    it('should set and get tenant config', () => {
      const config = {
        tenantId: 'tenant-1',
        idleTimeoutMs: 15 * 60 * 1000,
        absoluteTimeoutMs: 8 * 60 * 60 * 1000,
        maxConcurrentSessions: 3,
        bindToIp: true,
        bindToUserAgent: true,
        renewOnActivity: false,
      };

      engine.setConfig(config);
      const retrieved = engine.getConfig('tenant-1');

      expect(retrieved).toEqual(config);
    });

    it('should return default config for unconfigured tenant', () => {
      const config = engine.getConfig('new-tenant');

      expect(config.tenantId).toBe('new-tenant');
      expect(config.idleTimeoutMs).toBe(30 * 60 * 1000);
      expect(config.absoluteTimeoutMs).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('Statistics', () => {
    it('should track session statistics', () => {
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-1' });
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-2' });
      engine.createSession({ tenantId: 'tenant-2', userId: 'user-3' });

      const session = engine.createSession({ tenantId: 'tenant-1', userId: 'user-1' });
      engine.revokeSession(session.id, 'test');

      const stats = engine.getStats();

      expect(stats.totalSessions).toBe(4);
      expect(stats.activeSessions).toBe(3);
      expect(stats.revokedSessions).toBe(1);
      expect(stats.sessionsByTenant['tenant-1']).toBe(3);
      expect(stats.sessionsByTenant['tenant-2']).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should identify expired sessions', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        idleTimeoutMs: 1,
        absoluteTimeoutMs: 1,
        maxConcurrentSessions: 10,
        bindToIp: false,
        bindToUserAgent: false,
        renewOnActivity: false,
      });

      engine.createSession({ tenantId: 'tenant-1', userId: 'user-1' });

      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const result = engine.cleanup();
        expect(result.expired).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Clear', () => {
    it('should clear all sessions and configs', () => {
      engine.createSession({ tenantId: 'tenant-1', userId: 'user-1' });
      engine.setConfig({
        tenantId: 'tenant-1',
        idleTimeoutMs: 1000,
        absoluteTimeoutMs: 2000,
        maxConcurrentSessions: 1,
        bindToIp: false,
        bindToUserAgent: false,
        renewOnActivity: false,
      });

      engine.clear();

      const stats = engine.getStats();
      expect(stats.totalSessions).toBe(0);
    });
  });

  describe('Singleton Export', () => {
    it('should export a singleton instance', () => {
      expect(sessionManagementEngine).toBeInstanceOf(SessionManagementEngine);
    });
  });
});
