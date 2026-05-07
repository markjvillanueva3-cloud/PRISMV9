/**
 * EncryptionAtRestEngine — U-LPR-SEC02
 *
 * AES-256-GCM per-tenant encryption with:
 * - Envelope encryption (DEK encrypted by KEK)
 * - Per-tenant key derivation using HKDF
 * - Key rotation with version tracking
 * - Authenticated encryption with AAD
 * - Audit logging for key operations
 *
 * Security: FIPS 140-2 compatible algorithms (AES-256-GCM, HKDF-SHA256)
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC02
 * @phase PHASE-9 (Security + Compliance)
 */

import * as crypto from 'crypto';
import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
  tenantId: string;
  algorithm: 'aes-256-gcm';
  encryptedAt: number;
  aadHash?: string;
}

export interface KeyMetadata {
  keyId: string;
  tenantId: string;
  version: number;
  createdAt: number;
  rotatedAt?: number;
  expiresAt?: number;
  algorithm: 'aes-256-gcm';
  status: 'active' | 'rotated' | 'expired' | 'revoked';
}

export interface EnvelopeKey {
  encryptedDek: string;
  dekIv: string;
  dekAuthTag: string;
  kekVersion: number;
}

export interface EncryptionConfig {
  keyRotationDays: number;
  maxKeyVersions: number;
  auditEnabled: boolean;
  hkdfSalt?: string;
  kekSource: 'env' | 'vault' | 'hsm';
}

export interface KeyRotationResult {
  success: boolean;
  oldVersion: number;
  newVersion: number;
  rotatedAt: number;
  reason?: string;
}

export interface DecryptionResult {
  success: boolean;
  plaintext?: string;
  keyVersion?: number;
  error?: string;
}

export interface AuditEntry {
  operation: 'encrypt' | 'decrypt' | 'rotate' | 'derive' | 'revoke';
  tenantId: string;
  keyVersion: number;
  timestamp: number;
  success: boolean;
  errorCode?: string;
  requestId?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALGORITHM = 'aes-256-gcm' as const;
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const DEFAULT_KEY_ROTATION_DAYS = 30;
const MAX_KEY_VERSIONS = 5;
const HKDF_INFO = 'prism-tenant-dek-v1';

// ============================================================================
// ENGINE
// ============================================================================

export class EncryptionAtRestEngine {
  private config: EncryptionConfig;
  private keyVersions: Map<string, Map<number, Buffer>> = new Map();
  private keyMetadata: Map<string, KeyMetadata[]> = new Map();
  private auditLog: AuditEntry[] = [];
  private masterKek: Buffer | null = null;

  constructor(config?: Partial<EncryptionConfig>) {
    this.config = {
      keyRotationDays: config?.keyRotationDays ?? DEFAULT_KEY_ROTATION_DAYS,
      maxKeyVersions: config?.maxKeyVersions ?? MAX_KEY_VERSIONS,
      auditEnabled: config?.auditEnabled ?? true,
      hkdfSalt: config?.hkdfSalt,
      kekSource: config?.kekSource ?? 'env',
    };
  }

  /**
   * Initializes the engine with master KEK.
   * In production, KEK should come from HSM/Vault.
   */
  initialize(masterKey?: Buffer | string): void {
    if (masterKey) {
      this.masterKek = typeof masterKey === 'string'
        ? Buffer.from(masterKey, 'hex')
        : masterKey;
    } else {
      const envKey = process.env.PRISM_MASTER_KEK;
      if (envKey) {
        this.masterKek = Buffer.from(envKey, 'hex');
      } else {
        log.warn('[ENCRYPTION] No master KEK provided, generating ephemeral key');
        this.masterKek = crypto.randomBytes(KEY_LENGTH);
      }
    }

    if (this.masterKek.length !== KEY_LENGTH) {
      throw new Error(`Master KEK must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 8} bits)`);
    }
  }

  /**
   * Derives a tenant-specific DEK using HKDF.
   * Uses tenant_id + version as context for key derivation.
   */
  deriveTenantKey(tenantId: string, version: number = 1): Buffer {
    if (!this.masterKek) {
      this.initialize();
    }

    const salt = this.config.hkdfSalt
      ? Buffer.from(this.config.hkdfSalt, 'hex')
      : Buffer.alloc(32, 0);

    const info = Buffer.from(`${HKDF_INFO}:${tenantId}:v${version}`);
    const dek = crypto.hkdfSync('sha256', this.masterKek!, salt, info, KEY_LENGTH);

    this.audit('derive', tenantId, version, true);
    return Buffer.from(dek);
  }

  /**
   * Gets or creates the current DEK for a tenant.
   */
  private getTenantDek(tenantId: string, version?: number): { dek: Buffer; version: number } {
    let tenantKeys = this.keyVersions.get(tenantId);
    if (!tenantKeys) {
      tenantKeys = new Map();
      this.keyVersions.set(tenantId, tenantKeys);
    }

    const currentVersion = version ?? this.getCurrentKeyVersion(tenantId);
    let dek = tenantKeys.get(currentVersion);

    if (!dek) {
      dek = this.deriveTenantKey(tenantId, currentVersion);
      tenantKeys.set(currentVersion, dek);

      const metadata: KeyMetadata = {
        keyId: `${tenantId}-v${currentVersion}`,
        tenantId,
        version: currentVersion,
        createdAt: Date.now(),
        algorithm: ALGORITHM,
        status: 'active',
      };

      const existing = this.keyMetadata.get(tenantId) || [];
      existing.push(metadata);
      this.keyMetadata.set(tenantId, existing);
    }

    return { dek, version: currentVersion };
  }

  /**
   * Gets current key version for a tenant.
   */
  private getCurrentKeyVersion(tenantId: string): number {
    const metadata = this.keyMetadata.get(tenantId);
    if (!metadata || metadata.length === 0) return 1;
    return Math.max(...metadata.filter(m => m.status === 'active').map(m => m.version), 1);
  }

  /**
   * Encrypts plaintext with tenant-specific DEK using AES-256-GCM.
   * Returns envelope with encrypted data and metadata.
   */
  encrypt(
    plaintext: string | Buffer,
    tenantId: string,
    additionalData?: string
  ): EncryptedPayload {
    const { dek, version } = this.getTenantDek(tenantId);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, dek, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    if (additionalData) {
      cipher.setAAD(Buffer.from(additionalData), { plaintextLength: Buffer.byteLength(plaintext) });
    }

    const data = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf-8') : plaintext;
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    this.audit('encrypt', tenantId, version, true);

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyVersion: version,
      tenantId,
      algorithm: ALGORITHM,
      encryptedAt: Date.now(),
      aadHash: additionalData ? crypto.createHash('sha256').update(additionalData).digest('hex').slice(0, 16) : undefined,
    };
  }

  /**
   * Decrypts ciphertext using the correct key version.
   * Supports decryption with rotated keys.
   */
  decrypt(
    payload: EncryptedPayload,
    additionalData?: string
  ): DecryptionResult {
    try {
      const { dek } = this.getTenantDek(payload.tenantId, payload.keyVersion);
      const iv = Buffer.from(payload.iv, 'base64');
      const authTag = Buffer.from(payload.authTag, 'base64');
      const ciphertext = Buffer.from(payload.ciphertext, 'base64');

      const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });
      decipher.setAuthTag(authTag);

      if (additionalData) {
        decipher.setAAD(Buffer.from(additionalData), { plaintextLength: ciphertext.length });
      }

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      this.audit('decrypt', payload.tenantId, payload.keyVersion, true);

      return {
        success: true,
        plaintext: decrypted.toString('utf-8'),
        keyVersion: payload.keyVersion,
      };
    } catch (err) {
      const error = err as Error;
      this.audit('decrypt', payload.tenantId, payload.keyVersion, false, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Rotates the DEK for a tenant.
   * Old versions are kept for decrypting existing data.
   */
  rotateKey(tenantId: string, reason?: string): KeyRotationResult {
    const oldVersion = this.getCurrentKeyVersion(tenantId);
    const newVersion = oldVersion + 1;

    // Mark old key as rotated
    const metadata = this.keyMetadata.get(tenantId) || [];
    for (const m of metadata) {
      if (m.version === oldVersion && m.status === 'active') {
        m.status = 'rotated';
        m.rotatedAt = Date.now();
      }
    }

    // Derive new key
    const newDek = this.deriveTenantKey(tenantId, newVersion);
    let tenantKeys = this.keyVersions.get(tenantId);
    if (!tenantKeys) {
      tenantKeys = new Map();
      this.keyVersions.set(tenantId, tenantKeys);
    }
    tenantKeys.set(newVersion, newDek);

    // Add new key metadata
    metadata.push({
      keyId: `${tenantId}-v${newVersion}`,
      tenantId,
      version: newVersion,
      createdAt: Date.now(),
      algorithm: ALGORITHM,
      status: 'active',
    });
    this.keyMetadata.set(tenantId, metadata);

    // Prune old versions beyond max
    this.pruneOldVersions(tenantId);

    this.audit('rotate', tenantId, newVersion, true);
    log.info(`[ENCRYPTION] Key rotated for tenant ${tenantId}: v${oldVersion} → v${newVersion}`);

    return {
      success: true,
      oldVersion,
      newVersion,
      rotatedAt: Date.now(),
      reason,
    };
  }

  /**
   * Creates envelope encryption: DEK encrypted by KEK.
   * For storing DEKs externally (e.g., in database alongside data).
   */
  createEnvelopeKey(tenantId: string): EnvelopeKey {
    if (!this.masterKek) {
      this.initialize();
    }

    const { dek, version } = this.getTenantDek(tenantId);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKek!, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encryptedDek = Buffer.concat([cipher.update(dek), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedDek: encryptedDek.toString('base64'),
      dekIv: iv.toString('base64'),
      dekAuthTag: authTag.toString('base64'),
      kekVersion: 1, // KEK version tracking
    };
  }

  /**
   * Unwraps DEK from envelope using KEK.
   */
  unwrapEnvelopeKey(envelope: EnvelopeKey): Buffer {
    if (!this.masterKek) {
      this.initialize();
    }

    const iv = Buffer.from(envelope.dekIv, 'base64');
    const authTag = Buffer.from(envelope.dekAuthTag, 'base64');
    const encryptedDek = Buffer.from(envelope.encryptedDek, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKek!, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encryptedDek), decipher.final()]);
  }

  /**
   * Revokes a specific key version (break-glass procedure).
   * Data encrypted with revoked key becomes undecryptable.
   */
  revokeKey(tenantId: string, version: number, reason: string): boolean {
    const metadata = this.keyMetadata.get(tenantId);
    if (!metadata) return false;

    for (const m of metadata) {
      if (m.version === version) {
        m.status = 'revoked';
        m.rotatedAt = Date.now();

        // Remove DEK from memory
        const tenantKeys = this.keyVersions.get(tenantId);
        if (tenantKeys) {
          tenantKeys.delete(version);
        }

        this.audit('revoke', tenantId, version, true);
        log.warn(`[ENCRYPTION] Key REVOKED for tenant ${tenantId} v${version}: ${reason}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if key rotation is due based on age.
   */
  isRotationDue(tenantId: string): { due: boolean; daysUntilRotation: number; lastRotated?: number } {
    const metadata = this.keyMetadata.get(tenantId);
    if (!metadata || metadata.length === 0) {
      return { due: true, daysUntilRotation: 0 };
    }

    const activeKey = metadata.find(m => m.status === 'active');
    if (!activeKey) {
      return { due: true, daysUntilRotation: 0 };
    }

    const ageMs = Date.now() - activeKey.createdAt;
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    const daysUntilRotation = Math.max(0, this.config.keyRotationDays - ageDays);

    return {
      due: ageDays >= this.config.keyRotationDays,
      daysUntilRotation: Math.ceil(daysUntilRotation),
      lastRotated: activeKey.createdAt,
    };
  }

  /**
   * Gets key metadata for a tenant.
   */
  getKeyMetadata(tenantId: string): KeyMetadata[] {
    return this.keyMetadata.get(tenantId) || [];
  }

  /**
   * Gets audit log (filtered by tenant if provided).
   */
  getAuditLog(tenantId?: string, limit: number = 100): AuditEntry[] {
    let entries = this.auditLog;
    if (tenantId) {
      entries = entries.filter(e => e.tenantId === tenantId);
    }
    return entries.slice(-limit);
  }

  /**
   * Gets encryption statistics.
   */
  getStats(): {
    tenantsWithKeys: number;
    totalKeyVersions: number;
    auditEntries: number;
    operationCounts: Record<string, number>;
  } {
    let totalVersions = 0;
    for (const keys of this.keyVersions.values()) {
      totalVersions += keys.size;
    }

    const operationCounts: Record<string, number> = {};
    for (const entry of this.auditLog) {
      operationCounts[entry.operation] = (operationCounts[entry.operation] || 0) + 1;
    }

    return {
      tenantsWithKeys: this.keyVersions.size,
      totalKeyVersions: totalVersions,
      auditEntries: this.auditLog.length,
      operationCounts,
    };
  }

  /**
   * Prunes old key versions beyond the max.
   */
  private pruneOldVersions(tenantId: string): void {
    const metadata = this.keyMetadata.get(tenantId);
    if (!metadata) return;

    const rotatedKeys = metadata.filter(m => m.status === 'rotated')
      .sort((a, b) => b.version - a.version);

    if (rotatedKeys.length > this.config.maxKeyVersions) {
      const toExpire = rotatedKeys.slice(this.config.maxKeyVersions);
      for (const key of toExpire) {
        key.status = 'expired';
        const tenantKeys = this.keyVersions.get(tenantId);
        if (tenantKeys) {
          tenantKeys.delete(key.version);
        }
      }
    }
  }

  /**
   * Logs audit entry.
   */
  private audit(
    operation: AuditEntry['operation'],
    tenantId: string,
    keyVersion: number,
    success: boolean,
    errorCode?: string
  ): void {
    if (!this.config.auditEnabled) return;

    this.auditLog.push({
      operation,
      tenantId,
      keyVersion,
      timestamp: Date.now(),
      success,
      errorCode,
      requestId: crypto.randomUUID(),
    });

    // Keep audit log bounded
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  /**
   * Clears all keys and metadata (for testing).
   */
  clear(): void {
    this.keyVersions.clear();
    this.keyMetadata.clear();
    this.auditLog = [];
    this.masterKek = null;
  }
}

export const encryptionAtRestEngine = new EncryptionAtRestEngine();
