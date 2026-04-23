/**
 * SecurityHeadersEngine Tests — U-LPR-SEC09
 *
 * Tests for HTTP security headers:
 * - CSP generation and parsing
 * - Header validation
 * - HSTS configuration
 * - Permissions-Policy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SecurityHeadersEngine,
  securityHeadersEngine,
} from '../engines/SecurityHeadersEngine.js';

describe('SecurityHeadersEngine', () => {
  let engine: SecurityHeadersEngine;

  beforeEach(() => {
    engine = new SecurityHeadersEngine();
  });

  describe('Header Generation', () => {
    it('should generate all security headers', () => {
      const headers = engine.generateHeaders('tenant-1');

      expect(headers['X-Frame-Options']).toBeDefined();
      expect(headers['X-XSS-Protection']).toBeDefined();
      expect(headers['Referrer-Policy']).toBeDefined();
      expect(headers['Content-Security-Policy']).toBeDefined();
    });

    it('should generate X-Content-Type-Options when enabled', () => {
      const headers = engine.generateHeaders('tenant-1');

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should generate HSTS header', () => {
      const headers = engine.generateHeaders('tenant-1');

      expect(headers['Strict-Transport-Security']).toContain('max-age=');
    });

    it('should include HSTS includeSubDomains', () => {
      engine.setConfig({
        ...engine.getConfig('tenant-1'),
        hstsIncludeSubdomains: true,
      });

      const headers = engine.generateHeaders('tenant-1');

      expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
    });

    it('should include HSTS preload', () => {
      engine.setConfig({
        ...engine.getConfig('tenant-1'),
        hstsPreload: true,
      });

      const headers = engine.generateHeaders('tenant-1');

      expect(headers['Strict-Transport-Security']).toContain('preload');
    });
  });

  describe('CSP Building', () => {
    it('should build CSP from directives', () => {
      const csp = engine.buildCSP({
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://cdn.example.com'],
        'upgrade-insecure-requests': true,
      });

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain('script-src');
      expect(csp).toContain('https://cdn.example.com');
      expect(csp).toContain('upgrade-insecure-requests');
    });

    it('should handle empty directives', () => {
      const csp = engine.buildCSP({});

      expect(csp).toBe('');
    });

    it('should skip false boolean directives', () => {
      const csp = engine.buildCSP({
        'default-src': ["'self'"],
        'upgrade-insecure-requests': false,
      });

      expect(csp).not.toContain('upgrade-insecure-requests');
    });
  });

  describe('CSP Parsing', () => {
    it('should parse CSP string to directives', () => {
      const cspString = "default-src 'self'; script-src 'self' https://cdn.example.com; upgrade-insecure-requests";

      const directives = engine.parseCSP(cspString);

      expect(directives['default-src']).toEqual(["'self'"]);
      expect(directives['script-src']).toEqual(["'self'", 'https://cdn.example.com']);
      expect(directives['upgrade-insecure-requests']).toBe(true);
    });

    it('should handle empty CSP string', () => {
      const directives = engine.parseCSP('');

      expect(Object.keys(directives)).toHaveLength(0);
    });
  });

  describe('CSP Validation', () => {
    it('should warn about unsafe-inline', () => {
      const result = engine.validateCSP({
        'script-src': ["'self'", "'unsafe-inline'"],
      });

      expect(result.warnings.some(w => w.includes('unsafe-inline'))).toBe(true);
    });

    it('should warn about unsafe-eval', () => {
      const result = engine.validateCSP({
        'script-src': ["'self'", "'unsafe-eval'"],
      });

      expect(result.warnings.some(w => w.includes('unsafe-eval'))).toBe(true);
    });

    it('should warn about wildcard', () => {
      const result = engine.validateCSP({
        'img-src': ['*'],
      });

      expect(result.warnings.some(w => w.includes('wildcard'))).toBe(true);
    });

    it('should warn about missing frame-ancestors', () => {
      const result = engine.validateCSP({
        'default-src': ["'self'"],
      });

      expect(result.warnings.some(w => w.includes('frame-ancestors'))).toBe(true);
    });

    it('should pass validation for secure CSP', () => {
      const result = engine.validateCSP({
        'default-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': true,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('CSP Directive Management', () => {
    it('should add CSP directive', () => {
      engine.setConfig({
        ...engine.getConfig('tenant-1'),
        csp: { 'script-src': ["'self'"] },
      });

      const updated = engine.addCSPDirective('tenant-1', 'script-src', 'https://cdn.example.com');

      expect(updated['script-src']).toContain('https://cdn.example.com');
    });

    it('should not duplicate directive value', () => {
      engine.setConfig({
        ...engine.getConfig('tenant-1'),
        csp: { 'script-src': ["'self'"] },
      });

      engine.addCSPDirective('tenant-1', 'script-src', "'self'");

      const config = engine.getConfig('tenant-1');
      const scriptSrc = config.csp['script-src'] as string[];
      expect(scriptSrc.filter(v => v === "'self'")).toHaveLength(1);
    });

    it('should remove CSP directive', () => {
      engine.setConfig({
        ...engine.getConfig('tenant-1'),
        csp: { 'script-src': ["'self'", 'https://cdn.example.com'] },
      });

      const updated = engine.removeCSPDirective('tenant-1', 'script-src', 'https://cdn.example.com');

      expect(updated['script-src']).not.toContain('https://cdn.example.com');
      expect(updated['script-src']).toContain("'self'");
    });
  });

  describe('Nonce Generation', () => {
    it('should generate unique nonces', () => {
      const nonces = Array.from({ length: 50 }, () => engine.generateNonce());
      const unique = new Set(nonces);

      expect(unique.size).toBe(50);
    });

    it('should generate base64 nonce', () => {
      const nonce = engine.generateNonce();

      expect(nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should add nonce to CSP', () => {
      const csp = { 'script-src': ["'self'"] };
      const nonce = 'abc123';

      const updated = engine.addNonceToCSP(csp, nonce, 'script-src');

      expect(updated['script-src']).toContain("'nonce-abc123'");
    });
  });

  describe('Permissions-Policy', () => {
    it('should build Permissions-Policy header', () => {
      const policy = engine.buildPermissionsPolicy({
        'geolocation': [],
        'camera': ['self'],
        'microphone': ['https://trusted.com'],
      });

      expect(policy).toContain('geolocation=()');
      expect(policy).toContain('camera=(self)');
      expect(policy).toContain('microphone=("https://trusted.com")');
    });

    it('should handle empty policies', () => {
      const policy = engine.buildPermissionsPolicy({});

      expect(policy).toBe('');
    });
  });

  describe('Recommended Configurations', () => {
    it('should return strict config', () => {
      const config = engine.getRecommendedConfig('strict');

      expect(config.csp['default-src']).toEqual(["'none'"]);
      expect(config.frameOptions).toBe('DENY');
      expect(config.hstsPreload).toBe(true);
      expect(config.referrerPolicy).toBe('no-referrer');
    });

    it('should return moderate config', () => {
      const config = engine.getRecommendedConfig('moderate');

      expect(config.csp['default-src']).toEqual(["'self'"]);
      expect(config.hstsPreload).toBe(false);
    });

    it('should return relaxed config', () => {
      const config = engine.getRecommendedConfig('relaxed');

      expect(config.csp['script-src']).toContain("'unsafe-inline'");
      expect(config.frameOptions).toBe('SAMEORIGIN');
    });
  });

  describe('CSP Merging', () => {
    it('should merge CSP directives', () => {
      const base = {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
      };

      const override = {
        'script-src': ['https://cdn.example.com'],
        'img-src': ['https:'],
      };

      const merged = engine.mergeCSP(base, override);

      expect(merged['default-src']).toEqual(["'self'"]);
      expect(merged['script-src']).toContain("'self'");
      expect(merged['script-src']).toContain('https://cdn.example.com');
      expect(merged['img-src']).toEqual(['https:']);
    });

    it('should deduplicate values', () => {
      const base = { 'script-src': ["'self'", 'https://a.com'] };
      const override = { 'script-src': ["'self'", 'https://b.com'] };

      const merged = engine.mergeCSP(base, override);
      const scriptSrc = merged['script-src'] as string[];

      expect(scriptSrc.filter(v => v === "'self'")).toHaveLength(1);
    });
  });

  describe('Report-Only Mode', () => {
    it('should use Report-Only header when enabled', () => {
      engine.setConfig({
        ...engine.getConfig('tenant-1'),
        reportOnly: true,
      });

      const headers = engine.generateHeaders('tenant-1');

      expect(headers['Content-Security-Policy-Report-Only']).toBeDefined();
      expect(headers['Content-Security-Policy']).toBeUndefined();
    });
  });

  describe('Configuration', () => {
    it('should set and get config', () => {
      const config = {
        tenantId: 'tenant-1',
        csp: { 'default-src': ["'self'"] },
        frameOptions: 'SAMEORIGIN' as const,
        contentTypeOptions: true,
        hstsMaxAge: 3600,
        hstsIncludeSubdomains: false,
        hstsPreload: false,
        xssProtection: '1' as const,
        referrerPolicy: 'origin',
        permissionsPolicy: {},
        reportOnly: false,
      };

      engine.setConfig(config);
      const retrieved = engine.getConfig('tenant-1');

      expect(retrieved.frameOptions).toBe('SAMEORIGIN');
      expect(retrieved.hstsMaxAge).toBe(3600);
    });

    it('should return default config for unconfigured tenant', () => {
      const config = engine.getConfig('new-tenant');

      expect(config.tenantId).toBe('new-tenant');
      expect(config.frameOptions).toBe('DENY');
    });
  });

  describe('Statistics', () => {
    it('should track generation count', () => {
      engine.generateHeaders('tenant-1');
      engine.generateHeaders('tenant-1');
      engine.generateHeaders('tenant-2');

      const stats = engine.getStats();

      expect(stats.totalGenerations).toBe(3);
      expect(stats.generationsByTenant['tenant-1']).toBe(2);
      expect(stats.generationsByTenant['tenant-2']).toBe(1);
    });

    it('should track report-only count', () => {
      engine.setConfig({
        ...engine.getConfig('tenant-1'),
        reportOnly: true,
      });

      engine.generateHeaders('tenant-1');

      const stats = engine.getStats();
      expect(stats.reportOnlyCount).toBe(1);
    });
  });

  describe('Clear', () => {
    it('should clear all state', () => {
      engine.setConfig({
        ...engine.getConfig('tenant-1'),
        frameOptions: 'SAMEORIGIN',
      });
      engine.generateHeaders('tenant-1');

      engine.clear();

      const stats = engine.getStats();
      expect(stats.totalGenerations).toBe(0);

      const config = engine.getConfig('tenant-1');
      expect(config.frameOptions).toBe('DENY'); // back to default
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(securityHeadersEngine).toBeInstanceOf(SecurityHeadersEngine);
    });
  });
});
