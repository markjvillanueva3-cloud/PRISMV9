/**
 * AccessControlListEngine Tests — U-LPR-SEC03
 *
 * Tests for file-level Access Control Lists:
 * - Rule CRUD operations
 * - Access decisions (allow/deny)
 * - Pattern matching for resources
 * - Subject matching (user/role/group)
 * - Deny audit logging
 * - Condition evaluation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AccessControlListEngine,
  accessControlListEngine,
  type ACLEntry,
  type AccessRequest,
} from '../engines/AccessControlListEngine.js';

describe('AccessControlListEngine', () => {
  let engine: AccessControlListEngine;

  beforeEach(() => {
    engine = new AccessControlListEngine();
  });

  describe('Rule CRUD', () => {
    it('should create a rule with generated ID', () => {
      const rule = engine.createRule({
        resourcePattern: '/files/**',
        subjectType: 'user',
        subjectId: 'user-123',
        tenantId: 'tenant-a',
        permissions: ['read', 'write'],
        decision: 'allow',
        priority: 100,
        createdBy: 'admin',
      });

      expect(rule.id).toBeDefined();
      expect(rule.createdAt).toBeGreaterThan(0);
      expect(rule.resourcePattern).toBe('/files/**');
    });

    it('should update an existing rule', () => {
      const rule = engine.createRule({
        resourcePattern: '/data/*',
        subjectType: 'role',
        subjectId: 'viewer',
        tenantId: 'tenant-a',
        permissions: ['read'],
        decision: 'allow',
        priority: 50,
        createdBy: 'admin',
      });

      const updated = engine.updateRule(rule.id, { priority: 75 });
      expect(updated?.priority).toBe(75);
      expect(updated?.permissions).toEqual(['read']);
    });

    it('should return null when updating non-existent rule', () => {
      const result = engine.updateRule('non-existent-id', { priority: 100 });
      expect(result).toBeNull();
    });

    it('should delete a rule', () => {
      const rule = engine.createRule({
        resourcePattern: '/temp/*',
        subjectType: 'user',
        subjectId: 'user-456',
        tenantId: 'tenant-a',
        permissions: ['delete'],
        decision: 'allow',
        priority: 10,
        createdBy: 'admin',
      });

      expect(engine.deleteRule(rule.id)).toBe(true);
      expect(engine.getRule(rule.id)).toBeNull();
    });

    it('should return false when deleting non-existent rule', () => {
      expect(engine.deleteRule('non-existent')).toBe(false);
    });

    it('should list rules for a tenant', () => {
      engine.createRule({
        resourcePattern: '/a/*',
        subjectType: 'user',
        subjectId: 'u1',
        tenantId: 'tenant-a',
        permissions: ['read'],
        decision: 'allow',
        priority: 10,
        createdBy: 'admin',
      });
      engine.createRule({
        resourcePattern: '/b/*',
        subjectType: 'user',
        subjectId: 'u2',
        tenantId: 'tenant-b',
        permissions: ['read'],
        decision: 'allow',
        priority: 20,
        createdBy: 'admin',
      });

      const rulesA = engine.listRules('tenant-a');
      expect(rulesA).toHaveLength(1);
      expect(rulesA[0].tenantId).toBe('tenant-a');
    });
  });

  describe('Access Decisions', () => {
    beforeEach(() => {
      engine.createRule({
        resourcePattern: '/projects/**',
        subjectType: 'user',
        subjectId: 'owner-1',
        tenantId: 'tenant-x',
        permissions: ['*'],
        decision: 'allow',
        priority: 100,
        createdBy: 'system',
      });

      engine.createRule({
        resourcePattern: '/projects/secret/**',
        subjectType: 'user',
        subjectId: '*',
        tenantId: 'tenant-x',
        permissions: ['read', 'write', 'delete'],
        decision: 'deny',
        priority: 200,
        createdBy: 'system',
      });
    });

    it('should allow access when rule matches', () => {
      const result = engine.checkAccess({
        subjectId: 'owner-1',
        subjectType: 'user',
        tenantId: 'tenant-x',
        resourcePath: '/projects/main/file.txt',
        permission: 'read',
      });

      expect(result.allowed).toBe(true);
      expect(result.decision).toBe('allow');
      expect(result.matchedRule).toBeDefined();
    });

    it('should deny access with explicit deny rule (higher priority)', () => {
      const result = engine.checkAccess({
        subjectId: 'owner-1',
        subjectType: 'user',
        tenantId: 'tenant-x',
        resourcePath: '/projects/secret/classified.doc',
        permission: 'read',
      });

      expect(result.allowed).toBe(false);
      expect(result.decision).toBe('deny');
      expect(result.deniedReason).toContain('Explicit deny');
    });

    it('should deny access when no rules match (default deny)', () => {
      const result = engine.checkAccess({
        subjectId: 'random-user',
        subjectType: 'user',
        tenantId: 'tenant-x',
        resourcePath: '/other/path',
        permission: 'read',
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedReason).toContain('No matching rules');
    });

    it('should allow access when default deny is disabled', () => {
      engine.setDefaultDeny(false);

      const result = engine.checkAccess({
        subjectId: 'any-user',
        subjectType: 'user',
        tenantId: 'tenant-x',
        resourcePath: '/unprotected/file',
        permission: 'read',
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('Pattern Matching', () => {
    it('should match exact paths', () => {
      engine.createRule({
        resourcePattern: '/exact/path.txt',
        subjectType: 'user',
        subjectId: '*',
        tenantId: 'tenant-1',
        permissions: ['read'],
        decision: 'allow',
        priority: 50,
        createdBy: 'admin',
      });

      const result = engine.checkAccess({
        subjectId: 'user-1',
        subjectType: 'user',
        tenantId: 'tenant-1',
        resourcePath: '/exact/path.txt',
        permission: 'read',
      });

      expect(result.allowed).toBe(true);
    });

    it('should match single-level wildcards', () => {
      engine.createRule({
        resourcePattern: '/users/*/profile',
        subjectType: 'user',
        subjectId: '*',
        tenantId: 'tenant-1',
        permissions: ['read'],
        decision: 'allow',
        priority: 50,
        createdBy: 'admin',
      });

      const result = engine.checkAccess({
        subjectId: 'user-1',
        subjectType: 'user',
        tenantId: 'tenant-1',
        resourcePath: '/users/john/profile',
        permission: 'read',
      });

      expect(result.allowed).toBe(true);
    });

    it('should match multi-level wildcards (**)', () => {
      engine.createRule({
        resourcePattern: '/data/**',
        subjectType: 'user',
        subjectId: '*',
        tenantId: 'tenant-1',
        permissions: ['read'],
        decision: 'allow',
        priority: 50,
        createdBy: 'admin',
      });

      const result = engine.checkAccess({
        subjectId: 'user-1',
        subjectType: 'user',
        tenantId: 'tenant-1',
        resourcePath: '/data/a/b/c/deep/file.json',
        permission: 'read',
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('Subject Matching', () => {
    it('should match by role', () => {
      engine.createRule({
        resourcePattern: '/admin/**',
        subjectType: 'role',
        subjectId: 'administrator',
        tenantId: 'tenant-1',
        permissions: ['*'],
        decision: 'allow',
        priority: 100,
        createdBy: 'system',
      });

      const result = engine.checkAccess({
        subjectId: 'user-999',
        subjectType: 'user',
        subjectRoles: ['administrator', 'viewer'],
        tenantId: 'tenant-1',
        resourcePath: '/admin/settings',
        permission: 'write',
      });

      expect(result.allowed).toBe(true);
    });

    it('should match by group', () => {
      engine.createRule({
        resourcePattern: '/team/**',
        subjectType: 'group',
        subjectId: 'engineering',
        tenantId: 'tenant-1',
        permissions: ['read', 'write'],
        decision: 'allow',
        priority: 80,
        createdBy: 'system',
      });

      const result = engine.checkAccess({
        subjectId: 'user-123',
        subjectType: 'user',
        subjectGroups: ['engineering', 'contractors'],
        tenantId: 'tenant-1',
        resourcePath: '/team/docs/spec.md',
        permission: 'read',
      });

      expect(result.allowed).toBe(true);
    });

    it('should not match when subject has no matching role', () => {
      engine.createRule({
        resourcePattern: '/secure/**',
        subjectType: 'role',
        subjectId: 'superuser',
        tenantId: 'tenant-1',
        permissions: ['*'],
        decision: 'allow',
        priority: 100,
        createdBy: 'system',
      });

      const result = engine.checkAccess({
        subjectId: 'user-123',
        subjectType: 'user',
        subjectRoles: ['viewer', 'editor'],
        tenantId: 'tenant-1',
        resourcePath: '/secure/data',
        permission: 'read',
      });

      expect(result.allowed).toBe(false);
    });
  });

  describe('Permission Matching', () => {
    it('should match wildcard permission', () => {
      engine.createRule({
        resourcePattern: '/all-access/**',
        subjectType: 'user',
        subjectId: 'superuser',
        tenantId: 'tenant-1',
        permissions: ['*'],
        decision: 'allow',
        priority: 100,
        createdBy: 'system',
      });

      const result = engine.checkAccess({
        subjectId: 'superuser',
        subjectType: 'user',
        tenantId: 'tenant-1',
        resourcePath: '/all-access/anything',
        permission: 'delete',
      });

      expect(result.allowed).toBe(true);
    });

    it('should match admin permission as wildcard', () => {
      engine.createRule({
        resourcePattern: '/managed/**',
        subjectType: 'role',
        subjectId: 'admin',
        tenantId: 'tenant-1',
        permissions: ['admin'],
        decision: 'allow',
        priority: 100,
        createdBy: 'system',
      });

      const result = engine.checkAccess({
        subjectId: 'user-admin',
        subjectType: 'user',
        subjectRoles: ['admin'],
        tenantId: 'tenant-1',
        resourcePath: '/managed/resource',
        permission: 'execute',
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate equality condition', () => {
      engine.createRule({
        resourcePattern: '/conditional/**',
        subjectType: 'user',
        subjectId: '*',
        tenantId: 'tenant-1',
        permissions: ['read'],
        decision: 'allow',
        priority: 50,
        createdBy: 'system',
        conditions: [{ field: 'env', operator: 'eq', value: 'production' }],
      });

      const result = engine.checkAccess({
        subjectId: 'user-1',
        subjectType: 'user',
        tenantId: 'tenant-1',
        resourcePath: '/conditional/data',
        permission: 'read',
        context: { env: 'production' },
      });

      expect(result.allowed).toBe(true);
    });

    it('should fail when condition not met', () => {
      engine.createRule({
        resourcePattern: '/conditional/**',
        subjectType: 'user',
        subjectId: '*',
        tenantId: 'tenant-1',
        permissions: ['read'],
        decision: 'allow',
        priority: 50,
        createdBy: 'system',
        conditions: [{ field: 'env', operator: 'eq', value: 'production' }],
      });

      const result = engine.checkAccess({
        subjectId: 'user-1',
        subjectType: 'user',
        tenantId: 'tenant-1',
        resourcePath: '/conditional/data',
        permission: 'read',
        context: { env: 'staging' },
      });

      expect(result.allowed).toBe(false);
    });

    it('should evaluate "in" condition', () => {
      engine.createRule({
        resourcePattern: '/region-locked/**',
        subjectType: 'user',
        subjectId: '*',
        tenantId: 'tenant-1',
        permissions: ['read'],
        decision: 'allow',
        priority: 50,
        createdBy: 'system',
        conditions: [{ field: 'region', operator: 'in', value: ['US', 'CA', 'MX'] }],
      });

      const result = engine.checkAccess({
        subjectId: 'user-1',
        subjectType: 'user',
        tenantId: 'tenant-1',
        resourcePath: '/region-locked/data',
        permission: 'read',
        context: { region: 'CA' },
      });

      expect(result.allowed).toBe(true);
    });

    it('should evaluate numeric gt/lt conditions', () => {
      engine.createRule({
        resourcePattern: '/premium/**',
        subjectType: 'user',
        subjectId: '*',
        tenantId: 'tenant-1',
        permissions: ['read'],
        decision: 'allow',
        priority: 50,
        createdBy: 'system',
        conditions: [{ field: 'tier', operator: 'gt', value: 2 }],
      });

      const allowedResult = engine.checkAccess({
        subjectId: 'user-1',
        subjectType: 'user',
        tenantId: 'tenant-1',
        resourcePath: '/premium/content',
        permission: 'read',
        context: { tier: 3 },
      });

      const deniedResult = engine.checkAccess({
        subjectId: 'user-2',
        subjectType: 'user',
        tenantId: 'tenant-1',
        resourcePath: '/premium/content',
        permission: 'read',
        context: { tier: 1 },
      });

      expect(allowedResult.allowed).toBe(true);
      expect(deniedResult.allowed).toBe(false);
    });
  });

  describe('Deny Audit Logging', () => {
    it('should log denied access attempts', () => {
      const result = engine.checkAccess({
        subjectId: 'intruder',
        subjectType: 'user',
        tenantId: 'tenant-1',
        resourcePath: '/protected/secret',
        permission: 'read',
      });

      expect(result.allowed).toBe(false);

      const auditLog = engine.getDenyAuditLog('tenant-1');
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].subjectId).toBe('intruder');
      expect(auditLog[0].resourcePath).toBe('/protected/secret');
    });

    it('should filter audit log by tenant', () => {
      engine.checkAccess({
        subjectId: 'user-a',
        subjectType: 'user',
        tenantId: 'tenant-a',
        resourcePath: '/a',
        permission: 'read',
      });

      engine.checkAccess({
        subjectId: 'user-b',
        subjectType: 'user',
        tenantId: 'tenant-b',
        resourcePath: '/b',
        permission: 'read',
      });

      const logA = engine.getDenyAuditLog('tenant-a');
      const logB = engine.getDenyAuditLog('tenant-b');

      expect(logA.every(e => e.tenantId === 'tenant-a')).toBe(true);
      expect(logB.every(e => e.tenantId === 'tenant-b')).toBe(true);
    });
  });

  describe('Rule Expiration', () => {
    it('should ignore expired rules', () => {
      engine.createRule({
        resourcePattern: '/temp/**',
        subjectType: 'user',
        subjectId: '*',
        tenantId: 'tenant-1',
        permissions: ['read'],
        decision: 'allow',
        priority: 100,
        createdBy: 'system',
        expiresAt: Date.now() - 1000, // Already expired
      });

      const result = engine.checkAccess({
        subjectId: 'user-1',
        subjectType: 'user',
        tenantId: 'tenant-1',
        resourcePath: '/temp/file',
        permission: 'read',
      });

      expect(result.allowed).toBe(false);
    });

    it('should apply non-expired rules', () => {
      engine.createRule({
        resourcePattern: '/valid/**',
        subjectType: 'user',
        subjectId: '*',
        tenantId: 'tenant-1',
        permissions: ['read'],
        decision: 'allow',
        priority: 100,
        createdBy: 'system',
        expiresAt: Date.now() + 86400000, // Expires tomorrow
      });

      const result = engine.checkAccess({
        subjectId: 'user-1',
        subjectType: 'user',
        tenantId: 'tenant-1',
        resourcePath: '/valid/file',
        permission: 'read',
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('Batch Operations', () => {
    it('should check multiple permissions at once', () => {
      engine.createRule({
        resourcePattern: '/docs/**',
        subjectType: 'role',
        subjectId: 'editor',
        tenantId: 'tenant-1',
        permissions: ['read', 'write'],
        decision: 'allow',
        priority: 50,
        createdBy: 'system',
      });

      const results = engine.checkMultiplePermissions(
        {
          subjectId: 'user-1',
          subjectType: 'user',
          subjectRoles: ['editor'],
          tenantId: 'tenant-1',
          resourcePath: '/docs/file.txt',
        },
        ['read', 'write', 'delete', 'admin']
      );

      expect(results.read.allowed).toBe(true);
      expect(results.write.allowed).toBe(true);
      expect(results.delete.allowed).toBe(false);
      expect(results.admin.allowed).toBe(false);
    });

    it('should get effective permissions for a subject', () => {
      engine.createRule({
        resourcePattern: '/shared/**',
        subjectType: 'user',
        subjectId: 'user-1',
        tenantId: 'tenant-1',
        permissions: ['read', 'execute'],
        decision: 'allow',
        priority: 50,
        createdBy: 'system',
      });

      const effective = engine.getEffectivePermissions(
        'tenant-1',
        'user-1',
        'user',
        '/shared/script.sh'
      );

      expect(effective.allowed).toContain('read');
      expect(effective.allowed).toContain('execute');
      expect(effective.denied).toContain('write');
      expect(effective.denied).toContain('delete');
    });
  });

  describe('Resource Hierarchy', () => {
    it('should create hierarchy rules for owner/admin/operator', () => {
      const rules = engine.createResourceHierarchyRules(
        'tenant-1',
        '/projects/proj-123',
        'owner-user',
        'system'
      );

      expect(rules).toHaveLength(3);
      expect(rules[0].subjectId).toBe('owner-user');
      expect(rules[1].subjectId).toBe('admin');
      expect(rules[2].subjectId).toBe('operator');
    });
  });

  describe('Statistics', () => {
    it('should track ACL statistics', () => {
      engine.createRule({
        resourcePattern: '/a/*',
        subjectType: 'user',
        subjectId: 'u1',
        tenantId: 'tenant-1',
        permissions: ['read'],
        decision: 'allow',
        priority: 10,
        createdBy: 'admin',
      });

      engine.createRule({
        resourcePattern: '/b/*',
        subjectType: 'user',
        subjectId: 'u2',
        tenantId: 'tenant-2',
        permissions: ['read'],
        decision: 'deny',
        priority: 20,
        createdBy: 'admin',
      });

      engine.checkAccess({
        subjectId: 'test',
        subjectType: 'user',
        tenantId: 'tenant-1',
        resourcePath: '/c',
        permission: 'read',
      });

      const stats = engine.getStats();
      expect(stats.totalRules).toBe(2);
      expect(stats.rulesByTenant['tenant-1']).toBe(1);
      expect(stats.rulesByTenant['tenant-2']).toBe(1);
      expect(stats.rulesByDecision.allow).toBe(1);
      expect(stats.rulesByDecision.deny).toBe(1);
      expect(stats.evaluationCount).toBe(1);
    });
  });

  describe('Singleton Export', () => {
    it('should export a singleton instance', () => {
      expect(accessControlListEngine).toBeInstanceOf(AccessControlListEngine);
    });
  });
});
