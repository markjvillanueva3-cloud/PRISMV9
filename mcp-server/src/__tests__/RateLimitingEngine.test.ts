/**
 * RateLimitingEngine Tests — U-LPR-SEC05
 *
 * Tests for token bucket rate limiting:
 * - Config CRUD
 * - Token bucket algorithm
 * - Sliding window algorithm
 * - Scope-based limiting
 * - Throttling
 * - Rate limit headers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RateLimitingEngine,
  rateLimitingEngine,
  type RateLimitConfig,
} from '../engines/RateLimitingEngine.js';

describe('RateLimitingEngine', () => {
  let engine: RateLimitingEngine;

  beforeEach(() => {
    engine = new RateLimitingEngine();
  });

  describe('Config CRUD', () => {
    it('should create a rate limit config', () => {
      const config = engine.createConfig({
        scope: 'tenant',
        scopeId: 'tenant-1',
        maxRequests: 100,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });

      expect(config.id).toBe('tenant:tenant-1');
      expect(config.maxRequests).toBe(100);
      expect(config.burstLimit).toBe(100);
    });

    it('should update a config', () => {
      engine.createConfig({
        scope: 'tenant',
        scopeId: 'tenant-1',
        maxRequests: 100,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });

      const updated = engine.updateConfig('tenant:tenant-1', { maxRequests: 200 });
      expect(updated?.maxRequests).toBe(200);
    });

    it('should delete a config', () => {
      engine.createConfig({
        scope: 'tenant',
        scopeId: 'tenant-1',
        maxRequests: 100,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });

      expect(engine.deleteConfig('tenant:tenant-1')).toBe(true);
      expect(engine.getConfig('tenant:tenant-1')).toBeNull();
    });

    it('should list configs filtered by scope', () => {
      engine.createConfig({
        scope: 'tenant',
        scopeId: 'tenant-1',
        maxRequests: 100,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });
      engine.createConfig({
        scope: 'user',
        scopeId: 'user-1',
        maxRequests: 50,
        windowMs: 60000,
        enabled: true,
        priority: 20,
      });

      const tenantConfigs = engine.listConfigs('tenant');
      expect(tenantConfigs).toHaveLength(1);
      expect(tenantConfigs[0].scope).toBe('tenant');
    });
  });

  describe('Token Bucket Algorithm', () => {
    beforeEach(() => {
      engine.createConfig({
        scope: 'tenant',
        scopeId: '*',
        maxRequests: 5,
        windowMs: 1000,
        enabled: true,
        priority: 10,
      });
    });

    it('should allow requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        const result = engine.checkLimit({ tenantId: 'tenant-1' });
        expect(result.allowed).toBe(true);
      }
    });

    it('should deny requests over limit', () => {
      for (let i = 0; i < 5; i++) {
        engine.checkLimit({ tenantId: 'tenant-1' });
      }

      const result = engine.checkLimit({ tenantId: 'tenant-1' });
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });

    it('should return remaining count', () => {
      const result = engine.checkLimit({ tenantId: 'tenant-1' });
      expect(result.remaining).toBe(4);
    });

    it('should support cost parameter', () => {
      const result = engine.checkLimit({ tenantId: 'tenant-1', cost: 3 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should deny if cost exceeds remaining', () => {
      engine.checkLimit({ tenantId: 'tenant-1', cost: 4 });

      const result = engine.checkLimit({ tenantId: 'tenant-1', cost: 3 });
      expect(result.allowed).toBe(false);
    });
  });

  describe('Sliding Window Algorithm', () => {
    beforeEach(() => {
      engine.createConfig({
        scope: 'tenant',
        scopeId: '*',
        maxRequests: 5,
        windowMs: 1000,
        enabled: true,
        priority: 10,
      });
    });

    it('should allow requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        const result = engine.checkSlidingWindow({ tenantId: 'tenant-1' });
        expect(result.allowed).toBe(true);
      }
    });

    it('should deny requests over limit', () => {
      for (let i = 0; i < 5; i++) {
        engine.checkSlidingWindow({ tenantId: 'tenant-1' });
      }

      const result = engine.checkSlidingWindow({ tenantId: 'tenant-1' });
      expect(result.allowed).toBe(false);
    });
  });

  describe('Scope-Based Limiting', () => {
    it('should apply tenant-scoped limits', () => {
      engine.createConfig({
        scope: 'tenant',
        scopeId: 'tenant-a',
        maxRequests: 2,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });

      engine.checkLimit({ tenantId: 'tenant-a' });
      engine.checkLimit({ tenantId: 'tenant-a' });

      const resultA = engine.checkLimit({ tenantId: 'tenant-a' });
      expect(resultA.allowed).toBe(false);

      // Different tenant should not be affected
      const resultB = engine.checkLimit({ tenantId: 'tenant-b' });
      expect(resultB.allowed).toBe(true);
    });

    it('should apply user-scoped limits', () => {
      engine.createConfig({
        scope: 'user',
        scopeId: '*',
        maxRequests: 2,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });

      engine.checkLimit({ tenantId: 'tenant-1', userId: 'user-1' });
      engine.checkLimit({ tenantId: 'tenant-1', userId: 'user-1' });

      const result1 = engine.checkLimit({ tenantId: 'tenant-1', userId: 'user-1' });
      expect(result1.allowed).toBe(false);

      // Different user should not be affected
      const result2 = engine.checkLimit({ tenantId: 'tenant-1', userId: 'user-2' });
      expect(result2.allowed).toBe(true);
    });

    it('should apply IP-scoped limits', () => {
      engine.createConfig({
        scope: 'ip',
        scopeId: '*',
        maxRequests: 2,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });

      engine.checkLimit({ tenantId: 'tenant-1', ip: '192.168.1.1' });
      engine.checkLimit({ tenantId: 'tenant-1', ip: '192.168.1.1' });

      const result1 = engine.checkLimit({ tenantId: 'tenant-1', ip: '192.168.1.1' });
      expect(result1.allowed).toBe(false);

      // Different IP should not be affected
      const result2 = engine.checkLimit({ tenantId: 'tenant-1', ip: '192.168.1.2' });
      expect(result2.allowed).toBe(true);
    });

    it('should apply global limits', () => {
      engine.createConfig({
        scope: 'global',
        scopeId: '*',
        maxRequests: 3,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });

      engine.checkLimit({ tenantId: 'tenant-1' });
      engine.checkLimit({ tenantId: 'tenant-2' });
      engine.checkLimit({ tenantId: 'tenant-3' });

      const result = engine.checkLimit({ tenantId: 'tenant-4' });
      expect(result.allowed).toBe(false);
    });

    it('should respect config priority', () => {
      // Lower priority tenant config
      engine.createConfig({
        scope: 'tenant',
        scopeId: '*',
        maxRequests: 100,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });

      // Higher priority user config
      engine.createConfig({
        scope: 'user',
        scopeId: '*',
        maxRequests: 2,
        windowMs: 60000,
        enabled: true,
        priority: 20,
      });

      engine.checkLimit({ tenantId: 'tenant-1', userId: 'user-1' });
      engine.checkLimit({ tenantId: 'tenant-1', userId: 'user-1' });

      const result = engine.checkLimit({ tenantId: 'tenant-1', userId: 'user-1' });
      expect(result.allowed).toBe(false);
    });
  });

  describe('Rate Limit Headers', () => {
    beforeEach(() => {
      engine.createConfig({
        scope: 'tenant',
        scopeId: '*',
        maxRequests: 10,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });
    });

    it('should include standard headers on allow', () => {
      const result = engine.checkLimit({ tenantId: 'tenant-1' });

      expect(result.headers['X-RateLimit-Limit']).toBe('10');
      expect(result.headers['X-RateLimit-Remaining']).toBeDefined();
      expect(result.headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should include Retry-After on deny', () => {
      for (let i = 0; i < 10; i++) {
        engine.checkLimit({ tenantId: 'tenant-1' });
      }

      const result = engine.checkLimit({ tenantId: 'tenant-1' });

      expect(result.headers['Retry-After']).toBeDefined();
      expect(result.headers['X-RateLimit-Remaining']).toBe('0');
    });
  });

  describe('Throttling', () => {
    it('should manually throttle a scope', () => {
      engine.createConfig({
        scope: 'tenant',
        scopeId: '*',
        maxRequests: 100,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });

      engine.throttle('tenant:tenant-1', 5000);

      const result = engine.checkLimit({ tenantId: 'tenant-1' });
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should unthrottle a scope', () => {
      engine.createConfig({
        scope: 'tenant',
        scopeId: '*',
        maxRequests: 100,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });

      engine.throttle('tenant:tenant-1', 60000);
      engine.unthrottle('tenant:tenant-1');

      const result = engine.checkLimit({ tenantId: 'tenant-1' });
      expect(result.allowed).toBe(true);
    });

    it('should get throttle state', () => {
      engine.throttle('tenant:tenant-1', 5000);

      const state = engine.getThrottleState('tenant:tenant-1');
      expect(state?.throttled).toBe(true);
      expect(state?.throttleUntil).toBeGreaterThan(Date.now());
    });
  });

  describe('Scope Reset', () => {
    it('should reset scope state', () => {
      engine.createConfig({
        scope: 'tenant',
        scopeId: '*',
        maxRequests: 2,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });

      engine.checkLimit({ tenantId: 'tenant-1' });
      engine.checkLimit({ tenantId: 'tenant-1' });

      engine.resetScope('tenant:tenant-1');

      const result = engine.checkLimit({ tenantId: 'tenant-1' });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('No Config Behavior', () => {
    it('should allow all requests when no config exists', () => {
      const result = engine.checkLimit({ tenantId: 'tenant-1' });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });
  });

  describe('Disabled Config', () => {
    it('should ignore disabled configs', () => {
      engine.createConfig({
        scope: 'tenant',
        scopeId: '*',
        maxRequests: 1,
        windowMs: 60000,
        enabled: false,
        priority: 10,
      });

      engine.checkLimit({ tenantId: 'tenant-1' });
      const result = engine.checkLimit({ tenantId: 'tenant-1' });

      expect(result.allowed).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track rate limit statistics', () => {
      engine.createConfig({
        scope: 'tenant',
        scopeId: '*',
        maxRequests: 2,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });

      engine.checkLimit({ tenantId: 'tenant-1' });
      engine.checkLimit({ tenantId: 'tenant-1' });
      engine.checkLimit({ tenantId: 'tenant-1' });

      const stats = engine.getStats();

      expect(stats.totalRequests).toBe(3);
      expect(stats.allowedRequests).toBe(2);
      expect(stats.deniedRequests).toBe(1);
      expect(stats.activeConfigs).toBe(1);
    });
  });

  describe('Clear', () => {
    it('should clear all state', () => {
      engine.createConfig({
        scope: 'tenant',
        scopeId: '*',
        maxRequests: 10,
        windowMs: 60000,
        enabled: true,
        priority: 10,
      });

      engine.checkLimit({ tenantId: 'tenant-1' });
      engine.clear();

      const stats = engine.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.activeConfigs).toBe(0);
    });
  });

  describe('Singleton Export', () => {
    it('should export a singleton instance', () => {
      expect(rateLimitingEngine).toBeInstanceOf(RateLimitingEngine);
    });
  });
});
