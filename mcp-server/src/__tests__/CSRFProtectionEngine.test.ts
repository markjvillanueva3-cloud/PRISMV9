/**
 * CSRFProtectionEngine Tests — U-LPR-SEC08
 *
 * Tests for CSRF protection:
 * - Token generation
 * - Token validation
 * - Origin/referer checks
 * - Double-submit cookie
 * - Token rotation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CSRFProtectionEngine,
  csrfProtectionEngine,
} from '../engines/CSRFProtectionEngine.js';

describe('CSRFProtectionEngine', () => {
  let engine: CSRFProtectionEngine;

  beforeEach(() => {
    engine = new CSRFProtectionEngine();
  });

  describe('Token Generation', () => {
    it('should generate a secure token', () => {
      const token = engine.generateToken('session-1', 'tenant-1');

      expect(token.token).toBeDefined();
      expect(token.token.length).toBeGreaterThan(20);
      expect(token.sessionId).toBe('session-1');
      expect(token.tenantId).toBe('tenant-1');
    });

    it('should set correct timestamps', () => {
      const before = Date.now();
      const token = engine.generateToken('session-1', 'tenant-1');
      const after = Date.now();

      expect(token.createdAt).toBeGreaterThanOrEqual(before);
      expect(token.createdAt).toBeLessThanOrEqual(after);
      expect(token.expiresAt).toBeGreaterThan(token.createdAt);
    });

    it('should generate unique tokens', () => {
      const tokens = Array.from({ length: 50 }, (_, i) =>
        engine.generateToken(`session-${i}`, 'tenant-1')
      );

      const tokenValues = new Set(tokens.map(t => t.token));
      expect(tokenValues.size).toBe(50);
    });

    it('should increment rotation count', () => {
      engine.generateToken('session-1', 'tenant-1');
      const token2 = engine.generateToken('session-1', 'tenant-1');
      const token3 = engine.generateToken('session-1', 'tenant-1');

      expect(token2.rotationCount).toBe(1);
      expect(token3.rotationCount).toBe(2);
    });
  });

  describe('Token Validation', () => {
    it('should validate correct token', () => {
      const token = engine.generateToken('session-1', 'tenant-1');

      const result = engine.validateToken({
        token: token.token,
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'POST',
      });

      expect(result.valid).toBe(true);
    });

    it('should skip validation for safe methods', () => {
      const result = engine.validateToken({
        token: 'any',
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'GET',
      });

      expect(result.valid).toBe(true);
      expect(result.reason).toBe('safe_method');
    });

    it('should reject non-existent token', () => {
      const result = engine.validateToken({
        token: 'non-existent',
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'POST',
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('token_not_found');
    });

    it('should reject mismatched token', () => {
      engine.generateToken('session-1', 'tenant-1');

      const result = engine.validateToken({
        token: 'wrong-token',
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'POST',
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('token_mismatch');
    });

    it('should reject expired token', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        tokenLifetimeMs: 1,
        maxRotations: 10,
        enforceOrigin: false,
        enforceReferer: false,
        sameSite: 'lax',
        allowedOrigins: [],
        doubleSubmitEnabled: false,
      });

      const token = engine.generateToken('session-1', 'tenant-1');

      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const result = engine.validateToken({
          token: token.token,
          sessionId: 'session-1',
          tenantId: 'tenant-1',
          method: 'POST',
        });

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('token_expired');
      });
    });

    it('should mark token as used', () => {
      const token = engine.generateToken('session-1', 'tenant-1');

      engine.validateToken({
        token: token.token,
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'POST',
      });

      const metadata = engine.getTokenMetadata('session-1', 'tenant-1');
      expect(metadata?.usedAt).toBeDefined();
    });
  });

  describe('Origin Validation', () => {
    beforeEach(() => {
      engine.setConfig({
        tenantId: 'tenant-1',
        tokenLifetimeMs: 8 * 60 * 60 * 1000,
        maxRotations: 10,
        enforceOrigin: true,
        enforceReferer: false,
        sameSite: 'lax',
        allowedOrigins: ['https://example.com', '*.trusted.com'],
        doubleSubmitEnabled: false,
      });
    });

    it('should accept allowed origin', () => {
      const token = engine.generateToken('session-1', 'tenant-1');

      const result = engine.validateToken({
        token: token.token,
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'POST',
        origin: 'https://example.com',
      });

      expect(result.valid).toBe(true);
    });

    it('should accept wildcard subdomain', () => {
      const token = engine.generateToken('session-1', 'tenant-1');

      const result = engine.validateToken({
        token: token.token,
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'POST',
        origin: 'https://app.trusted.com',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject disallowed origin', () => {
      const token = engine.generateToken('session-1', 'tenant-1');

      const result = engine.validateToken({
        token: token.token,
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'POST',
        origin: 'https://evil.com',
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('origin_mismatch');
    });
  });

  describe('Double-Submit Cookie', () => {
    beforeEach(() => {
      engine.setConfig({
        tenantId: 'tenant-1',
        tokenLifetimeMs: 8 * 60 * 60 * 1000,
        maxRotations: 10,
        enforceOrigin: false,
        enforceReferer: false,
        sameSite: 'lax',
        allowedOrigins: [],
        doubleSubmitEnabled: true,
      });
    });

    it('should validate matching cookie token', () => {
      const token = engine.generateToken('session-1', 'tenant-1');

      const result = engine.validateToken({
        token: token.token,
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'POST',
        cookieToken: token.token,
      });

      expect(result.valid).toBe(true);
    });

    it('should reject mismatched cookie token', () => {
      const token = engine.generateToken('session-1', 'tenant-1');

      const result = engine.validateToken({
        token: token.token,
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'POST',
        cookieToken: 'different-token',
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('cookie_mismatch');
    });
  });

  describe('Token Rotation', () => {
    it('should rotate token', () => {
      const original = engine.generateToken('session-1', 'tenant-1');
      const rotated = engine.rotateToken('session-1', 'tenant-1');

      expect(rotated.token).not.toBe(original.token);
      expect(rotated.rotationCount).toBe(1);
    });

    it('should invalidate old token after rotation', () => {
      const original = engine.generateToken('session-1', 'tenant-1');
      engine.rotateToken('session-1', 'tenant-1');

      const result = engine.validateToken({
        token: original.token,
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'POST',
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('Token Revocation', () => {
    it('should revoke token', () => {
      const token = engine.generateToken('session-1', 'tenant-1');

      const revoked = engine.revokeToken('session-1', 'tenant-1');
      expect(revoked).toBe(true);

      const result = engine.validateToken({
        token: token.token,
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'POST',
      });

      expect(result.valid).toBe(false);
    });

    it('should return false for non-existent token', () => {
      const revoked = engine.revokeToken('non-existent', 'tenant-1');
      expect(revoked).toBe(false);
    });

    it('should revoke multiple user tokens', () => {
      engine.generateToken('session-1', 'tenant-1');
      engine.generateToken('session-2', 'tenant-1');
      engine.generateToken('session-3', 'tenant-1');

      const count = engine.revokeUserTokens('tenant-1', ['session-1', 'session-2', 'session-3']);

      expect(count).toBe(3);
    });
  });

  describe('Cookie Header Generation', () => {
    it('should generate secure cookie header', () => {
      const token = engine.generateToken('session-1', 'tenant-1');
      const config = engine.getConfig('tenant-1');

      const header = engine.generateCookieHeader(token, config);

      expect(header).toContain('csrf_token=');
      expect(header).toContain('HttpOnly');
      expect(header).toContain('Secure');
      expect(header).toContain('SameSite=');
      expect(header).toContain('Path=/');
    });

    it('should use config sameSite value', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        tokenLifetimeMs: 8 * 60 * 60 * 1000,
        maxRotations: 10,
        enforceOrigin: false,
        enforceReferer: false,
        sameSite: 'strict',
        allowedOrigins: [],
        doubleSubmitEnabled: false,
      });

      const token = engine.generateToken('session-1', 'tenant-1');
      const config = engine.getConfig('tenant-1');
      const header = engine.generateCookieHeader(token, config);

      expect(header).toContain('SameSite=Strict');
    });
  });

  describe('Token Metadata', () => {
    it('should return metadata without token secret', () => {
      engine.generateToken('session-1', 'tenant-1');

      const metadata = engine.getTokenMetadata('session-1', 'tenant-1');

      expect(metadata).toBeDefined();
      expect(metadata?.sessionId).toBe('session-1');
      expect(metadata?.tenantId).toBe('tenant-1');
      expect((metadata as any).token).toBeUndefined();
    });

    it('should return null for non-existent session', () => {
      const metadata = engine.getTokenMetadata('non-existent', 'tenant-1');
      expect(metadata).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should clean up expired tokens', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        tokenLifetimeMs: 1,
        maxRotations: 10,
        enforceOrigin: false,
        enforceReferer: false,
        sameSite: 'lax',
        allowedOrigins: [],
        doubleSubmitEnabled: false,
      });

      engine.generateToken('session-1', 'tenant-1');
      engine.generateToken('session-2', 'tenant-1');

      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const result = engine.cleanup();

        expect(result.expired).toBeGreaterThanOrEqual(2);
        expect(result.removed).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Statistics', () => {
    it('should track generation count', () => {
      engine.generateToken('session-1', 'tenant-1');
      engine.generateToken('session-2', 'tenant-1');
      engine.generateToken('session-3', 'tenant-2');

      const stats = engine.getStats();

      expect(stats.totalTokensGenerated).toBe(3);
      expect(stats.tokensByTenant['tenant-1']).toBe(2);
      expect(stats.tokensByTenant['tenant-2']).toBe(1);
    });

    it('should track validation stats', () => {
      const token = engine.generateToken('session-1', 'tenant-1');

      engine.validateToken({
        token: token.token,
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'POST',
      });

      engine.validateToken({
        token: 'wrong',
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        method: 'POST',
      });

      const stats = engine.getStats();

      expect(stats.totalValidations).toBe(2);
      expect(stats.validationsSucceeded).toBe(1);
      expect(stats.validationsFailed).toBe(1);
      expect(stats.failureReasons['token_mismatch']).toBe(1);
    });
  });

  describe('Configuration', () => {
    it('should set and get config', () => {
      const config = {
        tenantId: 'tenant-1',
        tokenLifetimeMs: 3600000,
        maxRotations: 5,
        enforceOrigin: true,
        enforceReferer: true,
        sameSite: 'strict' as const,
        allowedOrigins: ['https://example.com'],
        doubleSubmitEnabled: true,
      };

      engine.setConfig(config);
      const retrieved = engine.getConfig('tenant-1');

      expect(retrieved).toEqual(config);
    });

    it('should return default config for unconfigured tenant', () => {
      const config = engine.getConfig('new-tenant');

      expect(config.tenantId).toBe('new-tenant');
      expect(config.tokenLifetimeMs).toBe(8 * 60 * 60 * 1000);
    });
  });

  describe('Clear', () => {
    it('should clear all state', () => {
      engine.generateToken('session-1', 'tenant-1');
      engine.setConfig({
        tenantId: 'tenant-1',
        tokenLifetimeMs: 1000,
        maxRotations: 5,
        enforceOrigin: true,
        enforceReferer: false,
        sameSite: 'lax',
        allowedOrigins: [],
        doubleSubmitEnabled: false,
      });

      engine.clear();

      const stats = engine.getStats();
      expect(stats.totalTokensGenerated).toBe(0);

      const metadata = engine.getTokenMetadata('session-1', 'tenant-1');
      expect(metadata).toBeNull();
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(csrfProtectionEngine).toBeInstanceOf(CSRFProtectionEngine);
    });
  });
});
