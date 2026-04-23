/**
 * SessionManagementEngine — U-LPR-SEC06
 *
 * Secure session handling with:
 * - Cryptographically secure session IDs
 * - Session binding (IP, user-agent fingerprint)
 * - Idle/absolute timeout enforcement
 * - Concurrent session limits
 * - Session revocation (single/all)
 * - Activity tracking
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC06
 * @phase PHASE-9 (Security + Compliance)
 */

import * as crypto from 'crypto';
import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export interface Session {
  id: string;
  tenantId: string;
  userId: string;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
  fingerprint?: string;
  metadata?: Record<string, unknown>;
  revoked: boolean;
  revokedAt?: number;
  revokedReason?: string;
}

export interface SessionConfig {
  tenantId: string;
  idleTimeoutMs: number;
  absoluteTimeoutMs: number;
  maxConcurrentSessions: number;
  bindToIp: boolean;
  bindToUserAgent: boolean;
  renewOnActivity: boolean;
}

export interface CreateSessionInput {
  tenantId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface ValidateSessionResult {
  valid: boolean;
  session?: Session;
  invalidReason?: string;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  revokedSessions: number;
  sessionsByTenant: Record<string, number>;
  sessionsByUser: Record<string, number>;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SessionManagementEngine {
  private sessions: Map<string, Session> = new Map();
  private configs: Map<string, SessionConfig> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  private defaultConfig: Omit<SessionConfig, 'tenantId'> = {
    idleTimeoutMs: 30 * 60 * 1000,
    absoluteTimeoutMs: 24 * 60 * 60 * 1000,
    maxConcurrentSessions: 5,
    bindToIp: false,
    bindToUserAgent: false,
    renewOnActivity: true,
  };

  /**
   * Sets session configuration for a tenant.
   */
  setConfig(config: SessionConfig): void {
    this.configs.set(config.tenantId, config);
    log.info(`[Session] Config set for tenant ${config.tenantId}`);
  }

  /**
   * Gets session configuration for a tenant.
   */
  getConfig(tenantId: string): SessionConfig {
    return this.configs.get(tenantId) || { tenantId, ...this.defaultConfig };
  }

  /**
   * Creates a new session.
   */
  createSession(input: CreateSessionInput): Session {
    const config = this.getConfig(input.tenantId);
    const now = Date.now();

    // Enforce concurrent session limit
    const userKey = `${input.tenantId}:${input.userId}`;
    const existingSessions = this.userSessions.get(userKey) || new Set();

    if (existingSessions.size >= config.maxConcurrentSessions) {
      // Remove oldest session
      const oldestId = this.findOldestSession(existingSessions);
      if (oldestId) {
        this.revokeSession(oldestId, 'concurrent_session_limit');
      }
    }

    // Generate secure session ID
    const sessionId = this.generateSessionId();

    // Generate fingerprint from IP + user agent
    const fingerprint = this.generateFingerprint(input.ipAddress, input.userAgent);

    const session: Session = {
      id: sessionId,
      tenantId: input.tenantId,
      userId: input.userId,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + config.absoluteTimeoutMs,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      fingerprint,
      metadata: input.metadata,
      revoked: false,
    };

    this.sessions.set(sessionId, session);

    // Track user sessions
    if (!this.userSessions.has(userKey)) {
      this.userSessions.set(userKey, new Set());
    }
    this.userSessions.get(userKey)!.add(sessionId);

    log.info(`[Session] Created: ${sessionId} for user ${input.userId}`);
    return session;
  }

  /**
   * Validates a session and optionally refreshes activity.
   */
  validateSession(
    sessionId: string,
    options?: { ipAddress?: string; userAgent?: string; refreshActivity?: boolean }
  ): ValidateSessionResult {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { valid: false, invalidReason: 'session_not_found' };
    }

    if (session.revoked) {
      return { valid: false, invalidReason: 'session_revoked', session };
    }

    const now = Date.now();
    const config = this.getConfig(session.tenantId);

    // Check absolute expiration
    if (now > session.expiresAt) {
      return { valid: false, invalidReason: 'session_expired', session };
    }

    // Check idle timeout
    const idleTime = now - session.lastActivityAt;
    if (idleTime > config.idleTimeoutMs) {
      return { valid: false, invalidReason: 'idle_timeout', session };
    }

    // Check IP binding
    if (config.bindToIp && options?.ipAddress && session.ipAddress) {
      if (options.ipAddress !== session.ipAddress) {
        return { valid: false, invalidReason: 'ip_mismatch', session };
      }
    }

    // Check user agent binding
    if (config.bindToUserAgent && options?.userAgent && session.userAgent) {
      if (options.userAgent !== session.userAgent) {
        return { valid: false, invalidReason: 'user_agent_mismatch', session };
      }
    }

    // Check fingerprint
    if (config.bindToIp || config.bindToUserAgent) {
      const currentFingerprint = this.generateFingerprint(options?.ipAddress, options?.userAgent);
      if (session.fingerprint && currentFingerprint !== session.fingerprint) {
        return { valid: false, invalidReason: 'fingerprint_mismatch', session };
      }
    }

    // Refresh activity if requested
    if (options?.refreshActivity !== false && config.renewOnActivity) {
      session.lastActivityAt = now;
    }

    return { valid: true, session };
  }

  /**
   * Gets a session by ID.
   */
  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Lists sessions for a user.
   */
  getUserSessions(tenantId: string, userId: string): Session[] {
    const userKey = `${tenantId}:${userId}`;
    const sessionIds = this.userSessions.get(userKey) || new Set();

    return [...sessionIds]
      .map(id => this.sessions.get(id))
      .filter((s): s is Session => s !== undefined)
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  }

  /**
   * Lists all sessions for a tenant.
   */
  getTenantSessions(tenantId: string, includeExpired = false): Session[] {
    const now = Date.now();
    return [...this.sessions.values()]
      .filter(s => s.tenantId === tenantId)
      .filter(s => includeExpired || (!s.revoked && s.expiresAt > now))
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  }

  /**
   * Revokes a specific session.
   */
  revokeSession(sessionId: string, reason: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.revoked) return false;

    session.revoked = true;
    session.revokedAt = Date.now();
    session.revokedReason = reason;

    log.info(`[Session] Revoked: ${sessionId} — ${reason}`);
    return true;
  }

  /**
   * Revokes all sessions for a user.
   */
  revokeUserSessions(tenantId: string, userId: string, reason: string): number {
    const userKey = `${tenantId}:${userId}`;
    const sessionIds = this.userSessions.get(userKey) || new Set();

    let count = 0;
    for (const sessionId of sessionIds) {
      if (this.revokeSession(sessionId, reason)) {
        count++;
      }
    }

    log.info(`[Session] Revoked ${count} sessions for user ${userId} — ${reason}`);
    return count;
  }

  /**
   * Revokes all sessions for a tenant.
   */
  revokeTenantSessions(tenantId: string, reason: string): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.tenantId === tenantId && !session.revoked) {
        if (this.revokeSession(session.id, reason)) {
          count++;
        }
      }
    }

    log.info(`[Session] Revoked ${count} sessions for tenant ${tenantId} — ${reason}`);
    return count;
  }

  /**
   * Refreshes session activity timestamp.
   */
  touchSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.revoked) return false;

    session.lastActivityAt = Date.now();
    return true;
  }

  /**
   * Extends session absolute expiration.
   */
  extendSession(sessionId: string, additionalMs: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.revoked) return false;

    session.expiresAt += additionalMs;
    log.info(`[Session] Extended: ${sessionId} by ${additionalMs}ms`);
    return true;
  }

  /**
   * Cleans up expired and revoked sessions.
   */
  cleanup(): { expired: number; cleaned: number } {
    const now = Date.now();
    let expired = 0;
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      const config = this.getConfig(session.tenantId);
      const isExpired = now > session.expiresAt;
      const isIdle = (now - session.lastActivityAt) > config.idleTimeoutMs;

      if (session.revoked || isExpired || isIdle) {
        if (!session.revoked && (isExpired || isIdle)) {
          expired++;
        }

        // Remove from user sessions map
        const userKey = `${session.tenantId}:${session.userId}`;
        this.userSessions.get(userKey)?.delete(sessionId);

        // Remove old revoked/expired sessions (older than 24h)
        const cleanupAge = 24 * 60 * 60 * 1000;
        if (session.revoked && session.revokedAt && (now - session.revokedAt) > cleanupAge) {
          this.sessions.delete(sessionId);
          cleaned++;
        } else if (isExpired && (now - session.expiresAt) > cleanupAge) {
          this.sessions.delete(sessionId);
          cleaned++;
        }
      }
    }

    if (expired > 0 || cleaned > 0) {
      log.info(`[Session] Cleanup: ${expired} expired, ${cleaned} removed`);
    }

    return { expired, cleaned };
  }

  /**
   * Gets session statistics.
   */
  getStats(): SessionStats {
    const now = Date.now();
    const stats: SessionStats = {
      totalSessions: this.sessions.size,
      activeSessions: 0,
      expiredSessions: 0,
      revokedSessions: 0,
      sessionsByTenant: {},
      sessionsByUser: {},
    };

    for (const session of this.sessions.values()) {
      const config = this.getConfig(session.tenantId);
      const isExpired = now > session.expiresAt;
      const isIdle = (now - session.lastActivityAt) > config.idleTimeoutMs;

      if (session.revoked) {
        stats.revokedSessions++;
      } else if (isExpired || isIdle) {
        stats.expiredSessions++;
      } else {
        stats.activeSessions++;
      }

      stats.sessionsByTenant[session.tenantId] =
        (stats.sessionsByTenant[session.tenantId] || 0) + 1;

      const userKey = `${session.tenantId}:${session.userId}`;
      stats.sessionsByUser[userKey] = (stats.sessionsByUser[userKey] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clears all sessions and configs (for testing).
   */
  clear(): void {
    this.sessions.clear();
    this.configs.clear();
    this.userSessions.clear();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateFingerprint(ip?: string, userAgent?: string): string {
    const data = `${ip || ''}|${userAgent || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private findOldestSession(sessionIds: Set<string>): string | null {
    let oldest: Session | null = null;
    let oldestId: string | null = null;

    for (const id of sessionIds) {
      const session = this.sessions.get(id);
      if (session && !session.revoked) {
        if (!oldest || session.lastActivityAt < oldest.lastActivityAt) {
          oldest = session;
          oldestId = id;
        }
      }
    }

    return oldestId;
  }
}

export const sessionManagementEngine = new SessionManagementEngine();
