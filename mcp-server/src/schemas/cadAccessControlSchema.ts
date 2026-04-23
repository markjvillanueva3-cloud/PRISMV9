/**
 * cadAccessControlSchema — U-FS-12 (PHASE-47)
 *
 * Zod schemas for CAD access control: RBAC (viewer/editor/owner/auditor),
 * ABAC attributes (export control class, citizenship requirement), audit
 * log of every file open, session recording, and checkout/checkin soft locks.
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadAccessControlSchema
 */

import { z } from "zod";

// ── RBAC ────────────────────────────────────────────────────────────────────

export const RBAC_ROLES = ["viewer", "editor", "owner", "auditor"] as const;
export type RbacRole = (typeof RBAC_ROLES)[number];

export const ACTIONS = [
  "view",
  "edit",
  "delete",
  "grant",
  "checkout",
  "checkin",
  "audit_read",
  "download",
  "print",
] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * Role → action permission matrix. Auditor can *only* read the audit log.
 * Owner is a superset of editor; editor is a superset of viewer.
 */
export const ROLE_PERMISSIONS: Record<RbacRole, ReadonlyArray<Action>> = {
  viewer: ["view"],
  editor: ["view", "edit", "checkout", "checkin", "download"],
  owner: [
    "view",
    "edit",
    "delete",
    "grant",
    "checkout",
    "checkin",
    "download",
    "print",
  ],
  auditor: ["audit_read"],
};

// ── ABAC export control ─────────────────────────────────────────────────────

export const EXPORT_CLASSES = [
  "public",
  "proprietary",
  "export_controlled", // general EAR
  "itar",              // ITAR (U.S. persons only)
  "ear",               // specific EAR with country list
] as const;
export type ExportClass = (typeof EXPORT_CLASSES)[number];

export const AbacAttributesSchema = z
  .object({
    exportClass: z.enum(EXPORT_CLASSES),
    /** ISO-3166 country codes whose persons may access. Empty ⇒ unrestricted. */
    allowedCountries: z.array(z.string().length(2)).default([]),
    /** If true, user must be attested U.S. person (ITAR). */
    requiresUSPerson: z.boolean().default(false),
    /** Optional CAGE/license reference. */
    licenseRef: z.string().optional(),
  })
  .strict();

export type AbacAttributes = z.infer<typeof AbacAttributesSchema>;

// ── User / session identity ─────────────────────────────────────────────────

export const UserContextSchema = z
  .object({
    userId: z.string().min(1),
    /** ISO-3166 country code of user's citizenship. */
    countryCode: z.string().length(2),
    isUSPerson: z.boolean(),
    /** Roles granted on this specific file. */
    roles: z.array(z.enum(RBAC_ROLES)).default([]),
    /** If true, audit row is mandatory for every call. */
    investigative: z.boolean().default(false),
  })
  .strict();

export type UserContext = z.infer<typeof UserContextSchema>;

// ── File-level access policy ────────────────────────────────────────────────

export const AccessGrantSchema = z
  .object({
    userId: z.string().min(1),
    roles: z.array(z.enum(RBAC_ROLES)).nonempty(),
    grantedBy: z.string().min(1),
    grantedAt: z.string().min(1),
    /** ISO timestamp; grant expires after this. */
    expiresAt: z.string().optional(),
  })
  .strict();

export type AccessGrant = z.infer<typeof AccessGrantSchema>;

export const AccessPolicySchema = z
  .object({
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    abac: AbacAttributesSchema,
    grants: z.array(AccessGrantSchema).default([]),
    /** Soft-lock checkout — only one editor at a time. */
    checkedOutBy: z.string().optional(),
    checkedOutAt: z.string().optional(),
    /** True ⇒ every open is session-recorded. */
    recordSessions: z.boolean().default(false),
  })
  .strict();

export type AccessPolicy = z.infer<typeof AccessPolicySchema>;

// ── Audit log ───────────────────────────────────────────────────────────────

export const AUDIT_RESULTS = ["allowed", "denied"] as const;
export type AuditResult = (typeof AUDIT_RESULTS)[number];

export const AuditEventSchema = z
  .object({
    eventId: z.string().min(1),
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    userId: z.string().min(1),
    action: z.enum(ACTIONS),
    result: z.enum(AUDIT_RESULTS),
    reason: z.string().optional(),
    at: z.string().min(1),
    sessionId: z.string().optional(),
  })
  .strict();

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// ── Session recording ───────────────────────────────────────────────────────

export const SessionRecordSchema = z
  .object({
    sessionId: z.string().min(1),
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    userId: z.string().min(1),
    startedAt: z.string().min(1),
    endedAt: z.string().optional(),
    /** Sequential events captured in the session. */
    actions: z
      .array(
        z
          .object({
            action: z.enum(ACTIONS),
            at: z.string().min(1),
            meta: z.record(z.string(), z.string()).optional(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

export type SessionRecord = z.infer<typeof SessionRecordSchema>;

// ── Decision ────────────────────────────────────────────────────────────────

export const AccessDecisionSchema = z
  .object({
    allowed: z.boolean(),
    /** One-line explanation (always set for denials). */
    reason: z.string(),
    /** Which policy layer blocked (if denied). */
    failedLayer: z
      .enum(["rbac", "abac", "checkout", "expired_grant", "none"])
      .default("none"),
    auditEventId: z.string().min(1),
  })
  .strict();

export type AccessDecision = z.infer<typeof AccessDecisionSchema>;
