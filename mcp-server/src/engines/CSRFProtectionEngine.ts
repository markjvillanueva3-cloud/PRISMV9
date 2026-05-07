/**
 * CSRFProtectionEngine — U-LPR-SEC08
 *
 * Cross-Site Request Forgery protection with:
 * - Synchronizer token pattern
 * - Double-submit cookie
 * - Origin/referer validation
 * - Same-site cookie enforcement
 * - Token rotation on auth
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC08
 * @phase PHASE-9 (Security + Compliance)
 */

import * as crypto from 'crypto';
import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export interface CSRFToken {
  token: string;
  sessionId: string;
  tenantId: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
  rotationCount: number;
}

export interface CSRFConfig {
  tenantId: string;
  tokenLifetimeMs: number;
  maxRotations: number;
  enforceOrigin: boolean;
  enforceReferer: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  allowedOrigins: string[];
  doubleSubmitEnabled: boolean;
}

export interface CSRFValidationRequest {
  token: string;
  sessionId: string;
  tenantId: string;
  origin?: string;
  referer?: string;
  method: string;
  cookieToken?: string;
}

export interface CSRFValidationResult {
  valid: boolean;
  reason?: string;
  token?: CSRFToken;
}

export interface CSRFStats {
  totalTokensGenerated: number;
  totalValidations: number;
  validationsSucceeded: number;
  validationsFailed: number;
  failureReasons: Record<string, number>;
  tokensByTenant: Record<string, number>;
}

// ============================================================================
// ENGINE
// ============================================================================

export class CSRFProtectionEngine {
  private tokens: Map<string, CSRFToken> = new Map();
  private configs: Map<string, CSRFConfig> = new Map();
  private stats: CSRFStats = {
    totalTokensGenerated: 0,
    totalValidations: 0,
    validationsSucceeded: 0,
    validationsFailed: 0,
    failureReasons: {},
    tokensByTenant: {},
  };

  private defaultConfig: Omit<CSRFConfig, 'tenantId'> = {
    tokenLifetimeMs: 8 * 60 * 60 * 1000, // 8 hours
    maxRotations: 10,
    enforceOrigin: true,
    enforceReferer: false,
    sameSite: 'lax',
    allowedOrigins: [],
    doubleSubmitEnabled: true,
  };

  // Safe methods that don't require CSRF protection
  private safeMethods = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

  /**
   * Sets CSRF configuration for a tenant.
   */
  setConfig(config: CSRFConfig): void {
    this.configs.set(config.tenantId, config);
    log.info(`[CSRF] Config set for tenant ${config.tenantId}`);
  }

  /**
   * Gets CSRF configuration for a tenant.
   */
  getConfig(tenantId: string): CSRFConfig {
    return this.configs.get(tenantId) || { tenantId, ...this.defaultConfig };
  }

  /**
   * Generates a new CSRF token for a session.
   */
  generateToken(sessionId: string, tenantId: string): CSRFToken {
    const config = this.getConfig(tenantId);
    const now = Date.now();

    // Check for existing token and rotate if present
    const existingKey = this.getTokenKey(sessionId, tenantId);
    const existing = this.tokens.get(existingKey);

    const token: CSRFToken = {
      token: this.createSecureToken(),
      sessionId,
      tenantId,
      createdAt: now,
      expiresAt: now + config.tokenLifetimeMs,
      rotationCount: existing ? existing.rotationCount + 1 : 0,
    };

    // Check max rotations
    if (token.rotationCount > config.maxRotations) {
      log.warn(`[CSRF] Max rotations exceeded for session ${sessionId}`);
    }

    this.tokens.set(existingKey, token);
    this.stats.totalTokensGenerated++;
    this.stats.tokensByTenant[tenantId] = (this.stats.tokensByTenant[tenantId] || 0) + 1;

    log.info(`[CSRF] Token generated for session ${sessionId}`);
    return token;
  }

  /**
   * Validates a CSRF token.
   */
  validateToken(request: CSRFValidationRequest): CSRFValidationResult {
    this.stats.totalValidations++;
    const config = this.getConfig(request.tenantId);

    // Safe methods don't need CSRF validation
    if (this.safeMethods.has(request.method.toUpperCase())) {
      this.stats.validationsSucceeded++;
      return { valid: true, reason: 'safe_method' };
    }

    // Validate origin header
    if (config.enforceOrigin && request.origin) {
      if (!this.isAllowedOrigin(request.origin, config)) {
        return this.fail('origin_mismatch');
      }
    }

    // Validate referer header
    if (config.enforceReferer && request.referer) {
      if (!this.isAllowedOrigin(request.referer, config)) {
        return this.fail('referer_mismatch');
      }
    }

    // Get stored token
    const key = this.getTokenKey(request.sessionId, request.tenantId);
    const storedToken = this.tokens.get(key);

    if (!storedToken) {
      return this.fail('token_not_found');
    }

    // Check expiration
    if (Date.now() > storedToken.expiresAt) {
      return this.fail('token_expired');
    }

    // Validate token match
    if (!this.secureCompare(request.token, storedToken.token)) {
      return this.fail('token_mismatch');
    }

    // Double-submit cookie validation
    if (config.doubleSubmitEnabled && request.cookieToken) {
      if (!this.secureCompare(request.token, request.cookieToken)) {
        return this.fail('cookie_mismatch');
      }
    }

    // Mark as used
    storedToken.usedAt = Date.now();

    this.stats.validationsSucceeded++;
    log.info(`[CSRF] Token validated for session ${request.sessionId}`);
    return { valid: true, token: storedToken };
  }

  /**
   * Rotates token after successful authentication.
   */
  rotateToken(sessionId: string, tenantId: string): CSRFToken {
    // Generate new token (resets rotation count conceptually)
    return this.generateToken(sessionId, tenantId);
  }

  /**
   * Revokes token for a session.
   */
  revokeToken(sessionId: string, tenantId: string): boolean {
    const key = this.getTokenKey(sessionId, tenantId);
    const existed = this.tokens.has(key);
    this.tokens.delete(key);

    if (existed) {
      log.info(`[CSRF] Token revoked for session ${sessionId}`);
    }
    return existed;
  }

  /**
   * Revokes all tokens for a user's sessions.
   */
  revokeUserTokens(tenantId: string, sessionIds: string[]): number {
    let count = 0;
    for (const sessionId of sessionIds) {
      if (this.revokeToken(sessionId, tenantId)) {
        count++;
      }
    }
    log.info(`[CSRF] Revoked ${count} tokens for tenant ${tenantId}`);
    return count;
  }

  /**
   * Gets token metadata for a session (no secret exposed).
   */
  getTokenMetadata(sessionId: string, tenantId: string): Omit<CSRFToken, 'token'> | null {
    const key = this.getTokenKey(sessionId, tenantId);
    const token = this.tokens.get(key);

    if (!token) return null;

    const { token: _secret, ...metadata } = token;
    return metadata;
  }

  /**
   * Generates cookie header value for double-submit.
   */
  generateCookieHeader(token: CSRFToken, config: CSRFConfig): string {
    const parts = [
      `csrf_token=${token.token}`,
      'HttpOnly',
      'Secure',
      `SameSite=${config.sameSite.charAt(0).toUpperCase() + config.sameSite.slice(1)}`,
      `Max-Age=${Math.floor(config.tokenLifetimeMs / 1000)}`,
      'Path=/',
    ];
    return parts.join('; ');
  }

  /**
   * Cleans up expired tokens.
   */
  cleanup(): { expired: number; removed: number } {
    const now = Date.now();
    let expired = 0;
    let removed = 0;

    for (const [key, token] of this.tokens) {
      if (now > token.expiresAt) {
        expired++;
        this.tokens.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      log.info(`[CSRF] Cleanup: ${removed} expired tokens removed`);
    }

    return { expired, removed };
  }

  /**
   * Gets CSRF statistics.
   */
  getStats(): CSRFStats {
    return {
      ...this.stats,
      failureReasons: { ...this.stats.failureReasons },
      tokensByTenant: { ...this.stats.tokensByTenant },
    };
  }

  /**
   * Clears all tokens and configs (for testing).
   */
  clear(): void {
    this.tokens.clear();
    this.configs.clear();
    this.stats = {
      totalTokensGenerated: 0,
      totalValidations: 0,
      validationsSucceeded: 0,
      validationsFailed: 0,
      failureReasons: {},
      tokensByTenant: {},
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private getTokenKey(sessionId: string, tenantId: string): string {
    return `${tenantId}:${sessionId}`;
  }

  private createSecureToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  private isAllowedOrigin(origin: string, config: CSRFConfig): boolean {
    // Parse origin to get host
    try {
      const url = new URL(origin);
      const originHost = url.origin;

      // Check against allowed origins
      for (const allowed of config.allowedOrigins) {
        if (originHost === allowed || origin === allowed) {
          return true;
        }
        // Wildcard subdomain matching
        if (allowed.startsWith('*.')) {
          const baseDomain = allowed.slice(2);
          if (url.hostname.endsWith(baseDomain)) {
            return true;
          }
        }
      }

      return config.allowedOrigins.length === 0;
    } catch {
      return false;
    }
  }

  private fail(reason: string): CSRFValidationResult {
    this.stats.validationsFailed++;
    this.stats.failureReasons[reason] = (this.stats.failureReasons[reason] || 0) + 1;
    log.warn(`[CSRF] Validation failed: ${reason}`);
    return { valid: false, reason };
  }
}

export const csrfProtectionEngine = new CSRFProtectionEngine();
