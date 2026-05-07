/**
 * CADAccessControlRBACABACEngine — U-FS-12 (PHASE-47)
 *
 * Policy engine enforcing:
 *   - RBAC: viewer / editor / owner / auditor per-file grants
 *   - ABAC: ITAR / EAR / export-controlled attributes, US-person attestation,
 *           country allow-list
 *   - Soft-lock checkout: one editor at a time
 *   - Session recording: every open is captured when policy demands it
 *   - Immutable audit trail: allowed + denied decisions
 *
 * The engine is deterministic and side-effect-free except for writing to an
 * internal audit log and session registry. No network or disk I/O.
 *
 * @module engines/CADAccessControlRBACABACEngine
 */

import {
  AccessPolicySchema,
  AccessGrantSchema,
  AuditEventSchema,
  SessionRecordSchema,
  AccessDecisionSchema,
  ROLE_PERMISSIONS,
  type AccessPolicy,
  type AccessGrant,
  type AbacAttributes,
  type UserContext,
  type AuditEvent,
  type SessionRecord,
  type AccessDecision,
  type Action,
  type RbacRole,
} from "../schemas/cadAccessControlSchema.js";

export interface AccessClock {
  now(): string;
}

export interface IdProvider {
  newId(): string;
}

export class CADAccessControlRBACABACEngine {
  private policies = new Map<string, AccessPolicy>();
  private audit: AuditEvent[] = [];
  private sessions = new Map<string, SessionRecord>();
  private clock: AccessClock;
  private ids: IdProvider;

  constructor(opts: { clock?: AccessClock; ids?: IdProvider } = {}) {
    this.clock = opts.clock ?? { now: () => new Date().toISOString() };
    let counter = 0;
    this.ids =
      opts.ids ?? {
        newId: () => {
          counter += 1;
          return `evt-${counter.toString(36)}-${Date.now().toString(36)}`;
        },
      };
  }

  // ── Policy management ─────────────────────────────────────────────────────

  upsertPolicy(p: AccessPolicy): AccessPolicy {
    const parsed = AccessPolicySchema.parse({
      ...p,
      contentHash: p.contentHash.toLowerCase(),
    });
    this.policies.set(parsed.contentHash, parsed);
    return parsed;
  }

  getPolicy(contentHash: string): AccessPolicy | undefined {
    return this.policies.get(contentHash.toLowerCase());
  }

  grant(contentHash: string, grant: Omit<AccessGrant, "grantedAt"> & { grantedAt?: string }): AccessPolicy {
    const h = contentHash.toLowerCase();
    const pol = this.mustGet(h);
    const parsed = AccessGrantSchema.parse({
      ...grant,
      grantedAt: grant.grantedAt ?? this.clock.now(),
    });
    // Replace by userId (users have at most one active grant per file)
    pol.grants = [...pol.grants.filter((g) => g.userId !== parsed.userId), parsed];
    const updated = AccessPolicySchema.parse(pol);
    this.policies.set(h, updated);
    return updated;
  }

  revoke(contentHash: string, userId: string): AccessPolicy {
    const pol = this.mustGet(contentHash);
    pol.grants = pol.grants.filter((g) => g.userId !== userId);
    const updated = AccessPolicySchema.parse(pol);
    this.policies.set(pol.contentHash, updated);
    return updated;
  }

  setAbac(contentHash: string, abac: AbacAttributes): AccessPolicy {
    const pol = this.mustGet(contentHash);
    pol.abac = abac;
    const updated = AccessPolicySchema.parse(pol);
    this.policies.set(pol.contentHash, updated);
    return updated;
  }

  setSessionRecording(contentHash: string, on: boolean): AccessPolicy {
    const pol = this.mustGet(contentHash);
    pol.recordSessions = on;
    const updated = AccessPolicySchema.parse(pol);
    this.policies.set(pol.contentHash, updated);
    return updated;
  }

  // ── Checkout / checkin soft lock ──────────────────────────────────────────

  checkout(contentHash: string, user: UserContext): AccessDecision {
    const pol = this.mustGet(contentHash);
    const pre = this.check(contentHash, user, "checkout");
    if (!pre.allowed) return pre;
    if (pol.checkedOutBy && pol.checkedOutBy !== user.userId) {
      return this.deny(contentHash, user, "checkout", "checkout", `Already checked out by ${pol.checkedOutBy}`);
    }
    pol.checkedOutBy = user.userId;
    pol.checkedOutAt = this.clock.now();
    this.policies.set(pol.contentHash, AccessPolicySchema.parse(pol));
    return pre;
  }

  checkin(contentHash: string, user: UserContext): AccessDecision {
    const pol = this.mustGet(contentHash);
    const pre = this.check(contentHash, user, "checkin");
    if (!pre.allowed) return pre;
    if (pol.checkedOutBy && pol.checkedOutBy !== user.userId) {
      return this.deny(contentHash, user, "checkin", "checkout", `Held by ${pol.checkedOutBy}`);
    }
    pol.checkedOutBy = undefined;
    pol.checkedOutAt = undefined;
    this.policies.set(pol.contentHash, AccessPolicySchema.parse(pol));
    return pre;
  }

  // ── Decision + audit ──────────────────────────────────────────────────────

  /**
   * Evaluate whether `user` may perform `action` on `contentHash`.
   * Always emits an audit event.
   */
  check(contentHash: string, user: UserContext, action: Action): AccessDecision {
    const h = contentHash.toLowerCase();
    const pol = this.policies.get(h);
    if (!pol) {
      return this.denyPolicyMissing(h, user, action);
    }
    // RBAC
    const roles = this.effectiveRoles(pol, user);
    if (!rolesAllow(roles, action)) {
      return this.deny(h, user, action, "rbac", `No role permits ${action} (effective: ${roles.join(",") || "none"})`);
    }
    // Expired grants
    const active = pol.grants.filter((g) => g.userId === user.userId);
    if (active.length > 0) {
      const now = new Date(this.clock.now()).getTime();
      const everActive = active.some((g) => !g.expiresAt || new Date(g.expiresAt).getTime() >= now);
      if (!everActive) {
        return this.deny(h, user, action, "expired_grant", "Grant expired");
      }
    }
    // ABAC: export control
    const abacDecision = this.evaluateAbac(pol.abac, user, action);
    if (!abacDecision.ok) {
      return this.deny(h, user, action, "abac", abacDecision.reason);
    }
    return this.allow(h, user, action);
  }

  /** Open a file — returns the session id if recording is active. */
  open(contentHash: string, user: UserContext): {
    decision: AccessDecision;
    sessionId?: string;
  } {
    const pol = this.policies.get(contentHash.toLowerCase());
    const decision = this.check(contentHash, user, "view");
    if (!decision.allowed || !pol) return { decision };
    if (pol.recordSessions) {
      const sessionId = `sess-${this.ids.newId()}`;
      const rec = SessionRecordSchema.parse({
        sessionId,
        contentHash: pol.contentHash,
        userId: user.userId,
        startedAt: this.clock.now(),
        actions: [{ action: "view", at: this.clock.now() }],
      });
      this.sessions.set(sessionId, rec);
      return { decision, sessionId };
    }
    return { decision };
  }

  recordSessionAction(
    sessionId: string,
    action: Action,
    meta?: Record<string, string>,
  ): SessionRecord {
    const rec = this.sessions.get(sessionId);
    if (!rec) throw new Error(`Unknown session ${sessionId}`);
    if (rec.endedAt) throw new Error(`Session ${sessionId} already ended`);
    rec.actions = [...rec.actions, { action, at: this.clock.now(), meta }];
    const parsed = SessionRecordSchema.parse(rec);
    this.sessions.set(sessionId, parsed);
    return parsed;
  }

  endSession(sessionId: string): SessionRecord {
    const rec = this.sessions.get(sessionId);
    if (!rec) throw new Error(`Unknown session ${sessionId}`);
    rec.endedAt = this.clock.now();
    const parsed = SessionRecordSchema.parse(rec);
    this.sessions.set(sessionId, parsed);
    return parsed;
  }

  // ── Read-only accessors ────────────────────────────────────────────────────

  auditEvents(contentHash?: string, userId?: string): AuditEvent[] {
    const h = contentHash?.toLowerCase();
    return this.audit.filter((e) => {
      if (h && e.contentHash !== h) return false;
      if (userId && e.userId !== userId) return false;
      return true;
    });
  }

  session(sessionId: string): SessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  sessionsFor(contentHash: string): SessionRecord[] {
    const h = contentHash.toLowerCase();
    return [...this.sessions.values()].filter((s) => s.contentHash === h);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private effectiveRoles(pol: AccessPolicy, user: UserContext): RbacRole[] {
    const fromGrants = pol.grants
      .filter((g) => g.userId === user.userId)
      .flatMap((g) => g.roles);
    return [...new Set([...user.roles, ...fromGrants])];
  }

  private evaluateAbac(
    abac: AbacAttributes,
    user: UserContext,
    action: Action,
  ): { ok: true } | { ok: false; reason: string } {
    if (abac.exportClass === "public") return { ok: true };
    if (abac.exportClass === "proprietary") return { ok: true };
    // Export controlled / ITAR / EAR: gate on US-person + allow list
    if (abac.requiresUSPerson && !user.isUSPerson) {
      return { ok: false, reason: "ITAR requires attested US person" };
    }
    if (abac.allowedCountries.length > 0) {
      const cc = user.countryCode.toUpperCase();
      if (!abac.allowedCountries.map((c) => c.toUpperCase()).includes(cc)) {
        return {
          ok: false,
          reason: `Country ${cc} not on ${abac.exportClass} allow-list`,
        };
      }
    }
    // Download/print on ITAR always requires US-person regardless
    if (abac.exportClass === "itar" && (action === "download" || action === "print")) {
      if (!user.isUSPerson) {
        return { ok: false, reason: "ITAR controlled materials may not leave U.S. persons" };
      }
    }
    return { ok: true };
  }

  private allow(contentHash: string, user: UserContext, action: Action): AccessDecision {
    const eventId = this.ids.newId();
    const event = AuditEventSchema.parse({
      eventId,
      contentHash,
      userId: user.userId,
      action,
      result: "allowed",
      at: this.clock.now(),
    });
    this.audit.push(event);
    return AccessDecisionSchema.parse({
      allowed: true,
      reason: "OK",
      failedLayer: "none",
      auditEventId: eventId,
    });
  }

  private deny(
    contentHash: string,
    user: UserContext,
    action: Action,
    layer: AccessDecision["failedLayer"],
    reason: string,
  ): AccessDecision {
    const eventId = this.ids.newId();
    const event = AuditEventSchema.parse({
      eventId,
      contentHash,
      userId: user.userId,
      action,
      result: "denied",
      reason,
      at: this.clock.now(),
    });
    this.audit.push(event);
    return AccessDecisionSchema.parse({
      allowed: false,
      reason,
      failedLayer: layer,
      auditEventId: eventId,
    });
  }

  private denyPolicyMissing(
    contentHash: string,
    user: UserContext,
    action: Action,
  ): AccessDecision {
    const eventId = this.ids.newId();
    const event = AuditEventSchema.parse({
      eventId,
      contentHash,
      userId: user.userId,
      action,
      result: "denied",
      reason: "No policy",
      at: this.clock.now(),
    });
    this.audit.push(event);
    return AccessDecisionSchema.parse({
      allowed: false,
      reason: "No policy",
      failedLayer: "rbac",
      auditEventId: eventId,
    });
  }

  private mustGet(contentHash: string): AccessPolicy {
    const p = this.getPolicy(contentHash);
    if (!p) throw new Error(`No policy for ${contentHash}`);
    return p;
  }
}

function rolesAllow(roles: RbacRole[], action: Action): boolean {
  for (const r of roles) {
    if (ROLE_PERMISSIONS[r].includes(action)) return true;
  }
  return false;
}

export const cadAccessControlRBACABACEngine = new CADAccessControlRBACABACEngine();
