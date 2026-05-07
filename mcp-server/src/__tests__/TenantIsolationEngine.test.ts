/**
 * TenantIsolationEngine Tests — U-LPR-SEC01
 *
 * Comprehensive test coverage for:
 * - JWT claim validation and freezing
 * - Parameterized query enforcement
 * - 50+ attack vector blocking (100% block rate)
 * - Cross-tenant access prevention
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TenantIsolationEngine,
  tenantIsolationEngine,
  type IsolationContext,
  type AttackCategory,
} from '../engines/TenantIsolationEngine.js';

describe('TenantIsolationEngine', () => {
  let engine: TenantIsolationEngine;

  beforeEach(() => {
    engine = new TenantIsolationEngine();
  });

  describe('Attack Vector Catalog', () => {
    it('should have at least 50 attack vectors', () => {
      const catalog = engine.getAttackVectorCatalog();
      expect(catalog.total).toBeGreaterThanOrEqual(50);
    });

    it('should cover all required attack categories', () => {
      const catalog = engine.getAttackVectorCatalog();
      const requiredCategories: AttackCategory[] = [
        'sql_injection',
        'nosql_injection',
        'path_traversal',
        'command_injection',
        'jwt_manipulation',
        'tenant_confusion',
        'privilege_escalation',
        'data_exfiltration',
        'ssrf',
        'idor',
      ];

      for (const category of requiredCategories) {
        expect(catalog.by_category[category]).toBeGreaterThan(0);
      }
    });

    it('should block 100% of attack vectors', () => {
      const results = engine.runAttackVectorTests();
      expect(results.passed).toBe(results.total);
      expect(results.failed).toBe(0);
    });
  });

  describe('JWT Validation', () => {
    const createTestJWT = (payload: Record<string, unknown>): string => {
      const header = { alg: 'HS256', typ: 'JWT' };
      const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = 'test-signature';
      return `${headerB64}.${payloadB64}.${signature}`;
    };

    it('should validate well-formed JWT with all required claims', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = createTestJWT({
        sub: 'user-123',
        tenant_id: 'tenant-abc',
        iss: 'prism',
        aud: 'prism-api',
        iat: now - 60,
        exp: now + 3600,
      });

      const result = engine.validateJWT(token);
      expect(result.valid).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.context?.tenant_id).toBe('tenant-abc');
      expect(result.context?.frozen).toBe(true);
    });

    it('should reject malformed JWT structure', () => {
      const result = engine.validateJWT('not.a.valid.jwt.format');
      expect(result.valid).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('Invalid JWT structure');
    });

    it('should reject JWT missing required claims', () => {
      const token = createTestJWT({ sub: 'user-123' });
      const result = engine.validateJWT(token);
      expect(result.valid).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('Missing required JWT claims');
    });

    it('should reject expired JWT', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = createTestJWT({
        sub: 'user-123',
        tenant_id: 'tenant-abc',
        iss: 'prism',
        aud: 'prism-api',
        iat: now - 7200,
        exp: now - 3600, // Expired 1 hour ago
      });

      const result = engine.validateJWT(token);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('should reject JWT with tenant_id mismatch', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = createTestJWT({
        sub: 'user-123',
        tenant_id: 'tenant-abc',
        iss: 'prism',
        aud: 'prism-api',
        iat: now - 60,
        exp: now + 3600,
      });

      const result = engine.validateJWT(token, 'tenant-xyz');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Tenant ID mismatch');
    });

    it('should detect algorithm=none attack', () => {
      const header = { alg: 'none', typ: 'JWT' };
      const payload = { sub: 'user', tenant_id: 't', iat: 1, exp: 9999999999 };
      const token = `${Buffer.from(JSON.stringify(header)).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.`;

      const result = engine.validateJWT(token);
      expect(result.valid).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.attack?.id).toBe('JWT-001');
    });

    it('should create frozen context that cannot be modified', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = createTestJWT({
        sub: 'user-123',
        tenant_id: 'tenant-abc',
        iss: 'prism',
        aud: 'prism-api',
        iat: now - 60,
        exp: now + 3600,
        roles: ['operator'],
      });

      const result = engine.validateJWT(token);
      expect(result.context).toBeDefined();

      // Verify frozen
      expect(Object.isFrozen(result.context)).toBe(true);
      expect(Object.isFrozen(result.context!.roles)).toBe(true);

      // Attempt modification should throw
      expect(() => {
        (result.context as any).tenant_id = 'hacked';
      }).toThrow();
    });
  });

  describe('SQL Injection Prevention', () => {
    const context: IsolationContext = Object.freeze({
      tenant_id: 'tenant-123',
      user_id: 'user-456',
      roles: Object.freeze(['operator']),
      permissions: Object.freeze([]),
      issued_at: Date.now(),
      expires_at: Date.now() + 3600000,
      jwt_id: 'jwt-789',
      request_id: 'req-001',
      frozen: true as const,
    });

    it('should allow parameterized queries', () => {
      const result = engine.validateQuery(
        'SELECT * FROM parts WHERE id = $1',
        ['part-123'],
        context
      );
      expect(result.valid).toBe(true);
    });

    it('should block UNION SELECT injection', () => {
      const result = engine.validateQuery(
        "SELECT * FROM parts WHERE id = '" + "' UNION SELECT password FROM users--",
        [],
        context
      );
      expect(result.valid).toBe(false);
      expect(result.attack_detected?.id).toBe('SQLI-001');
    });

    it('should block boolean-based blind injection', () => {
      const result = engine.validateQuery(
        "SELECT * FROM users WHERE name = '' OR '1'='1'",
        [],
        context
      );
      expect(result.valid).toBe(false);
      expect(result.attack_detected?.category).toBe('sql_injection');
    });

    it('should block time-based blind injection', () => {
      const result = engine.validateQuery(
        "SELECT * FROM users WHERE id = 1; WAITFOR DELAY '0:0:5'",
        [],
        context
      );
      expect(result.valid).toBe(false);
    });

    it('should block injection in parameters', () => {
      const result = engine.validateQuery(
        'SELECT * FROM parts WHERE name = $1',
        ["' OR '1'='1"],
        context
      );
      expect(result.valid).toBe(false);
    });

    it('should reject query with interpolated tenant_id', () => {
      const result = engine.validateQuery(
        `SELECT * FROM parts WHERE tenant_id = '${context.tenant_id}'`,
        [],
        context
      );
      expect(result.valid).toBe(false);
    });

    it('should auto-inject tenant scope when missing', () => {
      const result = engine.validateQuery(
        'SELECT * FROM parts WHERE status = $1',
        ['active'],
        context
      );
      expect(result.valid).toBe(true);
      expect(result.sanitized_query).toContain('tenant_id');
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should block MongoDB operator injection', () => {
      const result = engine.validateInput('{"username": {"$gt": ""}}');
      expect(result.valid).toBe(false);
      expect(result.attack?.category).toBe('nosql_injection');
    });

    it('should block $where JavaScript injection', () => {
      const result = engine.validateInput('{"$where": "function(){return true}"}');
      expect(result.valid).toBe(false);
    });

    it('should block prototype pollution', () => {
      const result = engine.validateInput('{"__proto__": {"admin": true}}');
      expect(result.valid).toBe(false);
      expect(result.attack?.id).toBe('NOSQLI-004');
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should block basic directory traversal', () => {
      const result = engine.validatePath('../../../etc/passwd', 'tenant-123');
      expect(result.valid).toBe(false);
      expect(result.attack?.category).toBe('path_traversal');
    });

    it('should block URL-encoded traversal', () => {
      const result = engine.validatePath('%2e%2e%2fetc/passwd', 'tenant-123');
      expect(result.valid).toBe(false);
    });

    it('should block paths outside tenant directory', () => {
      const result = engine.validatePath('/data/tenant-other/files/secret.txt', 'tenant-123');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('does not belong to tenant');
    });

    it('should allow paths within tenant directory', () => {
      const result = engine.validatePath('/data/tenant-123/files/program.nc', 'tenant-123');
      expect(result.valid).toBe(true);
    });
  });

  describe('Command Injection Prevention', () => {
    it('should block shell metacharacters', () => {
      const result = engine.validateInput('test; cat /etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.attack?.category).toBe('command_injection');
    });

    it('should block backtick execution', () => {
      const result = engine.validateInput('`whoami`');
      expect(result.valid).toBe(false);
    });

    it('should block process substitution', () => {
      const result = engine.validateInput('$(cat /etc/passwd)');
      expect(result.valid).toBe(false);
    });
  });

  describe('Tenant Confusion Prevention', () => {
    it('should block tenant_id override attempts', () => {
      const result = engine.validateInput('tenant_id=malicious-tenant');
      expect(result.valid).toBe(false);
      expect(result.attack?.category).toBe('tenant_confusion');
    });

    it('should block wildcard tenant access', () => {
      const result = engine.validateInput('tenant_id=*');
      expect(result.valid).toBe(false);
    });

    it('should block system tenant impersonation', () => {
      const result = engine.validateInput('tenant_id=system');
      expect(result.valid).toBe(false);
    });
  });

  describe('Privilege Escalation Prevention', () => {
    it('should block role elevation attempts', () => {
      const result = engine.validateInput('role=admin');
      expect(result.valid).toBe(false);
      expect(result.attack?.category).toBe('privilege_escalation');
    });

    it('should block isAdmin flag manipulation', () => {
      const result = engine.validateInput('isAdmin=true');
      expect(result.valid).toBe(false);
    });

    it('should block ACL bypass attempts', () => {
      const result = engine.validateInput('bypass_acl=true');
      expect(result.valid).toBe(false);
    });
  });

  describe('SSRF Prevention', () => {
    it('should block internal IP access', () => {
      const result = engine.validateURL('http://127.0.0.1/admin');
      expect(result.valid).toBe(false);
      expect(result.attack?.category).toBe('ssrf');
    });

    it('should block cloud metadata access', () => {
      const result = engine.validateURL('http://169.254.169.254/latest/meta-data');
      expect(result.valid).toBe(false);
    });

    it('should block file:// protocol', () => {
      const result = engine.validateURL('file:///etc/passwd');
      expect(result.valid).toBe(false);
    });

    it('should allow external HTTPS URLs', () => {
      const result = engine.validateURL('https://api.example.com/data');
      expect(result.valid).toBe(true);
    });
  });

  describe('Data Exfiltration Prevention', () => {
    it('should block bulk export attempts', () => {
      const result = engine.validateInput('limit=999999');
      expect(result.valid).toBe(false);
      expect(result.attack?.category).toBe('data_exfiltration');
    });

    it('should block sensitive field extraction', () => {
      const result = engine.validateInput('fields=password,secret_key');
      expect(result.valid).toBe(false);
    });

    it('should block debug mode injection', () => {
      const result = engine.validateInput('debug=true');
      expect(result.valid).toBe(false);
    });
  });

  describe('Query Scoping', () => {
    const context: IsolationContext = Object.freeze({
      tenant_id: 'tenant-123',
      user_id: 'user-456',
      roles: Object.freeze(['operator']),
      permissions: Object.freeze([]),
      issued_at: Date.now(),
      expires_at: Date.now() + 3600000,
      jwt_id: 'jwt-789',
      request_id: 'req-001',
      frozen: true as const,
    });

    it('should add tenant_id to queries without WHERE', () => {
      const result = engine.scopeQuery('SELECT * FROM parts', [], context);
      expect(result.query).toContain('tenant_id');
      expect(result.params).toContain('tenant-123');
    });

    it('should add tenant_id to existing WHERE clause', () => {
      const result = engine.scopeQuery(
        'SELECT * FROM parts WHERE status = $1',
        ['active'],
        context
      );
      expect(result.query).toContain('tenant_id = $2');
      expect(result.params).toEqual(['active', 'tenant-123']);
    });

    it('should not duplicate tenant_id if already present', () => {
      const result = engine.scopeQuery(
        'SELECT * FROM parts WHERE tenant_id = $1',
        ['tenant-123'],
        context
      );
      expect(result.query).toBe('SELECT * FROM parts WHERE tenant_id = $1');
      expect(result.params).toEqual(['tenant-123']);
    });
  });

  describe('Cross-Tenant Access', () => {
    const operatorContext: IsolationContext = Object.freeze({
      tenant_id: 'tenant-a',
      user_id: 'user-1',
      roles: Object.freeze(['operator']),
      permissions: Object.freeze([]),
      issued_at: Date.now(),
      expires_at: Date.now() + 3600000,
      jwt_id: 'jwt-1',
      request_id: 'req-1',
      frozen: true as const,
    });

    const adminContext: IsolationContext = Object.freeze({
      tenant_id: 'tenant-a',
      user_id: 'admin-1',
      roles: Object.freeze(['admin']),
      permissions: Object.freeze(['cross_tenant:read']),
      issued_at: Date.now(),
      expires_at: Date.now() + 3600000,
      jwt_id: 'jwt-2',
      request_id: 'req-2',
      frozen: true as const,
    });

    it('should allow same-tenant access', () => {
      const result = engine.validateCrossTenantAccess(operatorContext, 'tenant-a');
      expect(result.valid).toBe(true);
    });

    it('should block cross-tenant access for regular users', () => {
      const result = engine.validateCrossTenantAccess(operatorContext, 'tenant-b');
      expect(result.valid).toBe(false);
      expect(result.blocked).toBe(true);
    });

    it('should allow cross-tenant access for admins', () => {
      const result = engine.validateCrossTenantAccess(adminContext, 'tenant-b');
      expect(result.valid).toBe(true);
    });
  });

  describe('Category-Specific Validation', () => {
    it('should validate only SQL injection patterns when specified', () => {
      const sqlResult = engine.validateInput("' OR '1'='1", ['sql_injection']);
      expect(sqlResult.valid).toBe(false);

      // Same input should pass if only checking path_traversal
      const pathResult = engine.validateInput("' OR '1'='1", ['path_traversal']);
      expect(pathResult.valid).toBe(true);
    });

    it('should validate only SSRF patterns when specified', () => {
      const ssrfResult = engine.validateInput('http://127.0.0.1', ['ssrf']);
      expect(ssrfResult.valid).toBe(false);

      const sqlResult = engine.validateInput('http://127.0.0.1', ['sql_injection']);
      expect(sqlResult.valid).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track blocked attempts', () => {
      engine.validateInput("' OR '1'='1");
      engine.validateInput('../etc/passwd');
      engine.validateInput('; rm -rf /');

      const stats = engine.getStats();
      expect(stats.blocked_attempts).toBe(3);
    });

    it('should track validated queries', () => {
      engine.validateQuery('SELECT * FROM parts WHERE id = $1', ['123']);
      engine.validateQuery('SELECT * FROM users WHERE email = $1', ['test@test.com']);

      const stats = engine.getStats();
      expect(stats.validated_queries).toBe(2);
    });

    it('should track attacks by ID', () => {
      engine.validateInput("' OR '1'='1");
      engine.validateInput("' UNION SELECT * FROM users--");

      const stats = engine.getStats();
      expect(Object.keys(stats.attacks_by_id).length).toBeGreaterThan(0);
    });
  });

  describe('Singleton Export', () => {
    it('should export a singleton instance', () => {
      expect(tenantIsolationEngine).toBeInstanceOf(TenantIsolationEngine);
    });
  });
});
