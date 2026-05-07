/**
 * SecretManagementEngine — U-LPR-SEC10
 *
 * Secure secret and credential management:
 * - Encrypted secret storage
 * - Secret versioning
 * - Rotation policies
 * - Access audit
 * - Expiration enforcement
 * - Environment variable injection
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC10
 * @phase PHASE-9 (Security + Compliance)
 */

import * as crypto from 'crypto';
import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export type SecretType = 'api_key' | 'password' | 'token' | 'certificate' | 'connection_string' | 'generic';

export interface Secret {
  id: string;
  name: string;
  type: SecretType;
  tenantId: string;
  version: number;
  encryptedValue: string;
  iv: string;
  authTag: string;
  createdAt: number;
  createdBy: string;
  expiresAt?: number;
  rotateAfter?: number;
  lastRotatedAt?: number;
  lastAccessedAt?: number;
  accessCount: number;
  metadata?: Record<string, string>;
  tags?: string[];
  active: boolean;
}

export interface SecretConfig {
  tenantId: string;
  defaultExpirationMs: number;
  defaultRotationMs: number;
  maxVersions: number;
  requireRotation: boolean;
  auditAccess: boolean;
}

export interface CreateSecretInput {
  name: string;
  type: SecretType;
  value: string;
  tenantId: string;
  createdBy: string;
  expiresAt?: number;
  rotateAfter?: number;
  metadata?: Record<string, string>;
  tags?: string[];
}

export interface SecretAccessResult {
  value: string;
  secret: Omit<Secret, 'encryptedValue' | 'iv' | 'authTag'>;
  accessedAt: number;
}

export interface RotationResult {
  secretId: string;
  oldVersion: number;
  newVersion: number;
  rotatedAt: number;
}

export interface SecretStats {
  totalSecrets: number;
  activeSecrets: number;
  expiredSecrets: number;
  rotationsDue: number;
  secretsByType: Record<SecretType, number>;
  secretsByTenant: Record<string, number>;
  totalAccesses: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SecretManagementEngine {
  private secrets: Map<string, Secret> = new Map();
  private secretVersions: Map<string, Secret[]> = new Map();
  private configs: Map<string, SecretConfig> = new Map();
  private accessLog: Array<{ secretId: string; accessedBy: string; accessedAt: number; tenantId: string }> = [];

  private masterKey: Buffer;

  private defaultConfig: Omit<SecretConfig, 'tenantId'> = {
    defaultExpirationMs: 90 * 24 * 60 * 60 * 1000, // 90 days
    defaultRotationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxVersions: 5,
    requireRotation: true,
    auditAccess: true,
  };

  constructor(masterKey?: string) {
    this.masterKey = masterKey
      ? crypto.scryptSync(masterKey, 'prism-secrets', 32)
      : crypto.randomBytes(32);
  }

  /**
   * Sets configuration for a tenant.
   */
  setConfig(config: SecretConfig): void {
    this.configs.set(config.tenantId, config);
    log.info(`[Secrets] Config set for tenant ${config.tenantId}`);
  }

  /**
   * Gets configuration for a tenant.
   */
  getConfig(tenantId: string): SecretConfig {
    return this.configs.get(tenantId) || { tenantId, ...this.defaultConfig };
  }

  /**
   * Creates a new secret.
   */
  createSecret(input: CreateSecretInput): Omit<Secret, 'encryptedValue' | 'iv' | 'authTag'> {
    const config = this.getConfig(input.tenantId);
    const now = Date.now();

    // Encrypt the secret value
    const { encrypted, iv, authTag } = this.encrypt(input.value);

    const secret: Secret = {
      id: this.generateId(),
      name: input.name,
      type: input.type,
      tenantId: input.tenantId,
      version: 1,
      encryptedValue: encrypted,
      iv,
      authTag,
      createdAt: now,
      createdBy: input.createdBy,
      expiresAt: input.expiresAt || (config.defaultExpirationMs ? now + config.defaultExpirationMs : undefined),
      rotateAfter: input.rotateAfter || (config.defaultRotationMs ? now + config.defaultRotationMs : undefined),
      accessCount: 0,
      metadata: input.metadata,
      tags: input.tags,
      active: true,
    };

    this.secrets.set(secret.id, secret);
    this.secretVersions.set(secret.id, [{ ...secret }]);

    log.info(`[Secrets] Created: ${secret.name} (${secret.type}) for tenant ${input.tenantId}`);

    const { encryptedValue: _e, iv: _i, authTag: _a, ...metadata } = secret;
    return metadata;
  }

  /**
   * Gets a secret value (decrypted).
   */
  getSecret(secretId: string, accessedBy: string): SecretAccessResult | null {
    const secret = this.secrets.get(secretId);
    if (!secret || !secret.active) {
      return null;
    }

    const config = this.getConfig(secret.tenantId);
    const now = Date.now();

    // Check expiration
    if (secret.expiresAt && now > secret.expiresAt) {
      log.warn(`[Secrets] Access denied: ${secretId} is expired`);
      return null;
    }

    // Decrypt
    const value = this.decrypt(secret.encryptedValue, secret.iv, secret.authTag);

    // Update access tracking
    secret.lastAccessedAt = now;
    secret.accessCount++;

    // Audit log
    if (config.auditAccess) {
      this.accessLog.push({
        secretId,
        accessedBy,
        accessedAt: now,
        tenantId: secret.tenantId,
      });
    }

    const { encryptedValue: _e, iv: _i, authTag: _a, ...metadata } = secret;
    return { value, secret: metadata, accessedAt: now };
  }

  /**
   * Gets secret metadata without decrypting.
   */
  getSecretMetadata(secretId: string): Omit<Secret, 'encryptedValue' | 'iv' | 'authTag'> | null {
    const secret = this.secrets.get(secretId);
    if (!secret) return null;

    const { encryptedValue: _e, iv: _i, authTag: _a, ...metadata } = secret;
    return metadata;
  }

  /**
   * Rotates a secret with a new value.
   */
  rotateSecret(secretId: string, newValue: string, rotatedBy: string): RotationResult | null {
    const secret = this.secrets.get(secretId);
    if (!secret || !secret.active) {
      return null;
    }

    const config = this.getConfig(secret.tenantId);
    const now = Date.now();

    // Archive current version
    const versions = this.secretVersions.get(secretId) || [];
    versions.push({ ...secret });

    // Trim old versions
    while (versions.length > config.maxVersions) {
      versions.shift();
    }
    this.secretVersions.set(secretId, versions);

    // Update secret
    const { encrypted, iv, authTag } = this.encrypt(newValue);
    const oldVersion = secret.version;

    secret.version++;
    secret.encryptedValue = encrypted;
    secret.iv = iv;
    secret.authTag = authTag;
    secret.lastRotatedAt = now;
    secret.rotateAfter = config.defaultRotationMs ? now + config.defaultRotationMs : undefined;

    log.info(`[Secrets] Rotated: ${secret.name} v${oldVersion} -> v${secret.version}`);

    return {
      secretId,
      oldVersion,
      newVersion: secret.version,
      rotatedAt: now,
    };
  }

  /**
   * Deletes (deactivates) a secret.
   */
  deleteSecret(secretId: string, deletedBy: string): boolean {
    const secret = this.secrets.get(secretId);
    if (!secret) return false;

    secret.active = false;
    log.info(`[Secrets] Deleted: ${secret.name} by ${deletedBy}`);
    return true;
  }

  /**
   * Permanently purges a secret and all versions.
   */
  purgeSecret(secretId: string): boolean {
    const existed = this.secrets.has(secretId);
    this.secrets.delete(secretId);
    this.secretVersions.delete(secretId);

    if (existed) {
      log.info(`[Secrets] Purged: ${secretId}`);
    }
    return existed;
  }

  /**
   * Lists secrets for a tenant.
   */
  listSecrets(tenantId: string, options?: { type?: SecretType; tag?: string; includeInactive?: boolean }): Array<Omit<Secret, 'encryptedValue' | 'iv' | 'authTag'>> {
    const results: Array<Omit<Secret, 'encryptedValue' | 'iv' | 'authTag'>> = [];

    for (const secret of this.secrets.values()) {
      if (secret.tenantId !== tenantId) continue;
      if (!options?.includeInactive && !secret.active) continue;
      if (options?.type && secret.type !== options.type) continue;
      if (options?.tag && !secret.tags?.includes(options.tag)) continue;

      const { encryptedValue: _e, iv: _i, authTag: _a, ...metadata } = secret;
      results.push(metadata);
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Gets secrets due for rotation.
   */
  getRotationDue(tenantId?: string): Array<Omit<Secret, 'encryptedValue' | 'iv' | 'authTag'>> {
    const now = Date.now();
    const results: Array<Omit<Secret, 'encryptedValue' | 'iv' | 'authTag'>> = [];

    for (const secret of this.secrets.values()) {
      if (!secret.active) continue;
      if (tenantId && secret.tenantId !== tenantId) continue;
      if (secret.rotateAfter && now > secret.rotateAfter) {
        const { encryptedValue: _e, iv: _i, authTag: _a, ...metadata } = secret;
        results.push(metadata);
      }
    }

    return results;
  }

  /**
   * Gets expired secrets.
   */
  getExpired(tenantId?: string): Array<Omit<Secret, 'encryptedValue' | 'iv' | 'authTag'>> {
    const now = Date.now();
    const results: Array<Omit<Secret, 'encryptedValue' | 'iv' | 'authTag'>> = [];

    for (const secret of this.secrets.values()) {
      if (!secret.active) continue;
      if (tenantId && secret.tenantId !== tenantId) continue;
      if (secret.expiresAt && now > secret.expiresAt) {
        const { encryptedValue: _e, iv: _i, authTag: _a, ...metadata } = secret;
        results.push(metadata);
      }
    }

    return results;
  }

  /**
   * Gets secret version history.
   */
  getVersionHistory(secretId: string): Array<{ version: number; createdAt: number }> {
    const versions = this.secretVersions.get(secretId) || [];
    return versions.map(v => ({ version: v.version, createdAt: v.createdAt }));
  }

  /**
   * Gets access log for a secret.
   */
  getAccessLog(secretId: string, limit = 100): Array<{ accessedBy: string; accessedAt: number }> {
    return this.accessLog
      .filter(e => e.secretId === secretId)
      .slice(-limit)
      .map(({ accessedBy, accessedAt }) => ({ accessedBy, accessedAt }));
  }

  /**
   * Generates environment variables from secrets.
   */
  generateEnvVars(tenantId: string, accessedBy: string, prefix = ''): Record<string, string> {
    const envVars: Record<string, string> = {};

    for (const secret of this.secrets.values()) {
      if (secret.tenantId !== tenantId || !secret.active) continue;
      if (secret.expiresAt && Date.now() > secret.expiresAt) continue;

      const result = this.getSecret(secret.id, accessedBy);
      if (result) {
        const envName = `${prefix}${secret.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
        envVars[envName] = result.value;
      }
    }

    return envVars;
  }

  /**
   * Gets statistics.
   */
  getStats(): SecretStats {
    const now = Date.now();
    const stats: SecretStats = {
      totalSecrets: this.secrets.size,
      activeSecrets: 0,
      expiredSecrets: 0,
      rotationsDue: 0,
      secretsByType: {} as Record<SecretType, number>,
      secretsByTenant: {},
      totalAccesses: this.accessLog.length,
    };

    for (const secret of this.secrets.values()) {
      if (!secret.active) continue;

      stats.activeSecrets++;
      stats.secretsByType[secret.type] = (stats.secretsByType[secret.type] || 0) + 1;
      stats.secretsByTenant[secret.tenantId] = (stats.secretsByTenant[secret.tenantId] || 0) + 1;

      if (secret.expiresAt && now > secret.expiresAt) {
        stats.expiredSecrets++;
      }
      if (secret.rotateAfter && now > secret.rotateAfter) {
        stats.rotationsDue++;
      }
    }

    return stats;
  }

  /**
   * Clears all data (for testing).
   */
  clear(): void {
    this.secrets.clear();
    this.secretVersions.clear();
    this.configs.clear();
    this.accessLog = [];
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private generateId(): string {
    return `sec_${crypto.randomBytes(16).toString('hex')}`;
  }

  private encrypt(value: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    let encrypted = cipher.update(value, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
    };
  }

  private decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.masterKey,
      Buffer.from(iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

export const secretManagementEngine = new SecretManagementEngine();
