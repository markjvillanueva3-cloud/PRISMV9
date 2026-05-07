/**
 * SecretManagementEngine Tests — U-LPR-SEC10
 *
 * Tests for secret and credential management:
 * - Secret creation and encryption
 * - Secret access and decryption
 * - Rotation and versioning
 * - Expiration enforcement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SecretManagementEngine,
  secretManagementEngine,
} from '../engines/SecretManagementEngine.js';

describe('SecretManagementEngine', () => {
  let engine: SecretManagementEngine;

  beforeEach(() => {
    engine = new SecretManagementEngine('test-master-key');
  });

  describe('Secret Creation', () => {
    it('should create a secret', () => {
      const secret = engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'sk_live_abc123',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      expect(secret.id).toBeDefined();
      expect(secret.id).toMatch(/^sec_/);
      expect(secret.name).toBe('api-key');
      expect(secret.type).toBe('api_key');
      expect(secret.version).toBe(1);
      expect(secret.active).toBe(true);
    });

    it('should set timestamps correctly', () => {
      const before = Date.now();
      const secret = engine.createSecret({
        name: 'test-secret',
        type: 'password',
        value: 'secret123',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });
      const after = Date.now();

      expect(secret.createdAt).toBeGreaterThanOrEqual(before);
      expect(secret.createdAt).toBeLessThanOrEqual(after);
    });

    it('should set expiration from config', () => {
      const secret = engine.createSecret({
        name: 'test-secret',
        type: 'token',
        value: 'token123',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      expect(secret.expiresAt).toBeDefined();
      expect(secret.expiresAt).toBeGreaterThan(secret.createdAt);
    });

    it('should set custom expiration', () => {
      const customExpiry = Date.now() + 3600000;
      const secret = engine.createSecret({
        name: 'test-secret',
        type: 'token',
        value: 'token123',
        tenantId: 'tenant-1',
        createdBy: 'admin',
        expiresAt: customExpiry,
      });

      expect(secret.expiresAt).toBe(customExpiry);
    });

    it('should store metadata and tags', () => {
      const secret = engine.createSecret({
        name: 'db-password',
        type: 'password',
        value: 'pass123',
        tenantId: 'tenant-1',
        createdBy: 'admin',
        metadata: { database: 'production' },
        tags: ['production', 'database'],
      });

      expect(secret.metadata?.database).toBe('production');
      expect(secret.tags).toContain('production');
    });
  });

  describe('Secret Access', () => {
    it('should retrieve and decrypt secret', () => {
      const created = engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'sk_live_abc123',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      const result = engine.getSecret(created.id, 'user-1');

      expect(result).not.toBeNull();
      expect(result?.value).toBe('sk_live_abc123');
    });

    it('should track access count', () => {
      const created = engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'sk_live_abc123',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      engine.getSecret(created.id, 'user-1');
      engine.getSecret(created.id, 'user-2');
      engine.getSecret(created.id, 'user-1');

      const metadata = engine.getSecretMetadata(created.id);
      expect(metadata?.accessCount).toBe(3);
    });

    it('should update last accessed timestamp', () => {
      const created = engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'sk_live_abc123',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      engine.getSecret(created.id, 'user-1');

      const metadata = engine.getSecretMetadata(created.id);
      expect(metadata?.lastAccessedAt).toBeDefined();
    });

    it('should return null for non-existent secret', () => {
      const result = engine.getSecret('non-existent', 'user-1');
      expect(result).toBeNull();
    });

    it('should deny access to expired secrets', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        defaultExpirationMs: 1,
        defaultRotationMs: 1000,
        maxVersions: 5,
        requireRotation: false,
        auditAccess: true,
      });

      const created = engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'sk_live_abc123',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const result = engine.getSecret(created.id, 'user-1');
        expect(result).toBeNull();
      });
    });
  });

  describe('Secret Rotation', () => {
    it('should rotate secret with new value', () => {
      const created = engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'old_value',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      const result = engine.rotateSecret(created.id, 'new_value', 'admin');

      expect(result).not.toBeNull();
      expect(result?.oldVersion).toBe(1);
      expect(result?.newVersion).toBe(2);
    });

    it('should return new value after rotation', () => {
      const created = engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'old_value',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      engine.rotateSecret(created.id, 'new_value', 'admin');

      const access = engine.getSecret(created.id, 'user-1');
      expect(access?.value).toBe('new_value');
    });

    it('should preserve version history', () => {
      const created = engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'v1',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      engine.rotateSecret(created.id, 'v2', 'admin');
      engine.rotateSecret(created.id, 'v3', 'admin');

      const history = engine.getVersionHistory(created.id);
      expect(history.length).toBe(3);
    });

    it('should update rotation timestamp', () => {
      const created = engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'old_value',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      engine.rotateSecret(created.id, 'new_value', 'admin');

      const metadata = engine.getSecretMetadata(created.id);
      expect(metadata?.lastRotatedAt).toBeDefined();
    });
  });

  describe('Secret Deletion', () => {
    it('should deactivate secret on delete', () => {
      const created = engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'sk_live_abc123',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      const deleted = engine.deleteSecret(created.id, 'admin');
      expect(deleted).toBe(true);

      const access = engine.getSecret(created.id, 'user-1');
      expect(access).toBeNull();
    });

    it('should purge secret completely', () => {
      const created = engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'sk_live_abc123',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      const purged = engine.purgeSecret(created.id);
      expect(purged).toBe(true);

      const metadata = engine.getSecretMetadata(created.id);
      expect(metadata).toBeNull();
    });
  });

  describe('Secret Listing', () => {
    beforeEach(() => {
      engine.createSecret({
        name: 'api-key-1',
        type: 'api_key',
        value: 'key1',
        tenantId: 'tenant-1',
        createdBy: 'admin',
        tags: ['production'],
      });
      engine.createSecret({
        name: 'password-1',
        type: 'password',
        value: 'pass1',
        tenantId: 'tenant-1',
        createdBy: 'admin',
        tags: ['staging'],
      });
      engine.createSecret({
        name: 'api-key-2',
        type: 'api_key',
        value: 'key2',
        tenantId: 'tenant-2',
        createdBy: 'admin',
      });
    });

    it('should list secrets for tenant', () => {
      const secrets = engine.listSecrets('tenant-1');
      expect(secrets.length).toBe(2);
    });

    it('should filter by type', () => {
      const secrets = engine.listSecrets('tenant-1', { type: 'api_key' });
      expect(secrets.length).toBe(1);
      expect(secrets[0].name).toBe('api-key-1');
    });

    it('should filter by tag', () => {
      const secrets = engine.listSecrets('tenant-1', { tag: 'production' });
      expect(secrets.length).toBe(1);
      expect(secrets[0].name).toBe('api-key-1');
    });

    it('should exclude inactive by default', () => {
      const created = engine.createSecret({
        name: 'deleted-secret',
        type: 'password',
        value: 'pass',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });
      engine.deleteSecret(created.id, 'admin');

      const secrets = engine.listSecrets('tenant-1');
      expect(secrets.some(s => s.name === 'deleted-secret')).toBe(false);
    });

    it('should include inactive when requested', () => {
      const created = engine.createSecret({
        name: 'deleted-secret',
        type: 'password',
        value: 'pass',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });
      engine.deleteSecret(created.id, 'admin');

      const secrets = engine.listSecrets('tenant-1', { includeInactive: true });
      expect(secrets.some(s => s.name === 'deleted-secret')).toBe(true);
    });
  });

  describe('Rotation Due', () => {
    it('should identify secrets due for rotation', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        defaultExpirationMs: 1000000,
        defaultRotationMs: 1,
        maxVersions: 5,
        requireRotation: true,
        auditAccess: true,
      });

      engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'key',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const due = engine.getRotationDue('tenant-1');
        expect(due.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Expired Secrets', () => {
    it('should identify expired secrets', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        defaultExpirationMs: 1,
        defaultRotationMs: 1000000,
        maxVersions: 5,
        requireRotation: false,
        auditAccess: true,
      });

      engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'key',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const expired = engine.getExpired('tenant-1');
        expect(expired.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Access Log', () => {
    it('should log secret access', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        defaultExpirationMs: 1000000,
        defaultRotationMs: 1000000,
        maxVersions: 5,
        requireRotation: false,
        auditAccess: true,
      });

      const created = engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'key',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      engine.getSecret(created.id, 'user-1');
      engine.getSecret(created.id, 'user-2');

      const log = engine.getAccessLog(created.id);
      expect(log.length).toBe(2);
      expect(log[0].accessedBy).toBe('user-1');
    });
  });

  describe('Environment Variable Generation', () => {
    it('should generate env vars from secrets', () => {
      engine.createSecret({
        name: 'database-url',
        type: 'connection_string',
        value: 'postgres://localhost/db',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });
      engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'sk_live_123',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      const envVars = engine.generateEnvVars('tenant-1', 'deployer', 'APP_');

      expect(envVars['APP_DATABASE_URL']).toBe('postgres://localhost/db');
      expect(envVars['APP_API_KEY']).toBe('sk_live_123');
    });

    it('should skip expired secrets', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        defaultExpirationMs: 1,
        defaultRotationMs: 1000000,
        maxVersions: 5,
        requireRotation: false,
        auditAccess: false,
      });

      engine.createSecret({
        name: 'api-key',
        type: 'api_key',
        value: 'expired',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const envVars = engine.generateEnvVars('tenant-1', 'deployer');
        expect(envVars['API_KEY']).toBeUndefined();
      });
    });
  });

  describe('Configuration', () => {
    it('should set and get config', () => {
      const config = {
        tenantId: 'tenant-1',
        defaultExpirationMs: 3600000,
        defaultRotationMs: 1800000,
        maxVersions: 3,
        requireRotation: true,
        auditAccess: true,
      };

      engine.setConfig(config);
      const retrieved = engine.getConfig('tenant-1');

      expect(retrieved).toEqual(config);
    });

    it('should return default config for unconfigured tenant', () => {
      const config = engine.getConfig('new-tenant');

      expect(config.tenantId).toBe('new-tenant');
      expect(config.maxVersions).toBe(5);
    });
  });

  describe('Statistics', () => {
    it('should track secret counts', () => {
      engine.createSecret({
        name: 'key1',
        type: 'api_key',
        value: 'v1',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });
      engine.createSecret({
        name: 'pass1',
        type: 'password',
        value: 'v2',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });
      engine.createSecret({
        name: 'key2',
        type: 'api_key',
        value: 'v3',
        tenantId: 'tenant-2',
        createdBy: 'admin',
      });

      const stats = engine.getStats();

      expect(stats.totalSecrets).toBe(3);
      expect(stats.activeSecrets).toBe(3);
      expect(stats.secretsByType['api_key']).toBe(2);
      expect(stats.secretsByType['password']).toBe(1);
      expect(stats.secretsByTenant['tenant-1']).toBe(2);
    });
  });

  describe('Clear', () => {
    it('should clear all data', () => {
      engine.createSecret({
        name: 'key1',
        type: 'api_key',
        value: 'v1',
        tenantId: 'tenant-1',
        createdBy: 'admin',
      });

      engine.clear();

      const stats = engine.getStats();
      expect(stats.totalSecrets).toBe(0);
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(secretManagementEngine).toBeInstanceOf(SecretManagementEngine);
    });
  });
});
