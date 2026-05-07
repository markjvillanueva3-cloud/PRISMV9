/**
 * cadTenantNamespaceSchema — U-FS-07 (PHASE-47)
 *
 * Models multi-tenant namespacing for CAD content:
 *   - private: tenant-only
 *   - shared:  explicit cross-tenant share list
 *   - public:  readable by all tenants (e.g. standard-library parts)
 *
 * Supports:
 *   - Cross-tenant content-hash collision detection (IP-leak alert)
 *   - Retention policy with expiry timestamp
 *   - Soft-delete tombstones for GDPR right-to-delete
 *   - NDA gating on download/access
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadTenantNamespaceSchema
 */

import { z } from "zod";

// ── Visibility ──────────────────────────────────────────────────────────────

export const TENANT_VISIBILITIES = ["private", "shared", "public"] as const;
export type TenantVisibility = (typeof TENANT_VISIBILITIES)[number];

// ── Retention class ─────────────────────────────────────────────────────────

export const RETENTION_CLASSES = [
  "ephemeral",    // ≤30 days
  "standard",     // default policy (e.g. 7 years)
  "long_term",    // 20+ years (aerospace / medical)
  "indefinite",   // keep forever
] as const;

export type RetentionClass = (typeof RETENTION_CLASSES)[number];

// ── NDA gate record ─────────────────────────────────────────────────────────

export const NDAGateSchema = z
  .object({
    required: z.boolean().default(false),
    /** NDA document id (external). */
    ndaId: z.string().optional(),
    /** List of tenantIds that have signed. */
    signedBy: z.array(z.string()).default([]),
    /** ISO timestamp when the NDA gate was configured. */
    configuredAt: z.string().min(1),
  })
  .strict();

export type NDAGate = z.infer<typeof NDAGateSchema>;

// ── Tombstone ────────────────────────────────────────────────────────────────

export const TombstoneSchema = z
  .object({
    /** Why the content was deleted. */
    reason: z.string().min(1),
    /** ISO timestamp. */
    deletedAt: z.string().min(1),
    /** Who requested the deletion. */
    requestedBy: z.string().min(1),
    /** GDPR DSR ticket or similar id. */
    ticketId: z.string().optional(),
  })
  .strict();

export type Tombstone = z.infer<typeof TombstoneSchema>;

// ── Content record in the tenant namespace ──────────────────────────────────

export const TenantContentSchema = z
  .object({
    tenantId: z.string().min(1),
    /** SHA-256 content hash (lowercase hex). */
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    /** Canonical name inside the tenant (e.g. drawing number). */
    canonicalName: z.string().min(1),
    visibility: z.enum(TENANT_VISIBILITIES).default("private"),
    /** Tenants explicitly granted read access when visibility=shared. */
    sharedWith: z.array(z.string()).default([]),
    retentionClass: z.enum(RETENTION_CLASSES).default("standard"),
    /** ISO timestamp when the content may be purged. */
    retentionExpiresAt: z.string().optional(),
    ndaGate: NDAGateSchema.optional(),
    createdAt: z.string().min(1),
    /** Present iff soft-deleted. */
    tombstone: TombstoneSchema.optional(),
  })
  .strict();

export type TenantContent = z.infer<typeof TenantContentSchema>;

// ── Collision alert ─────────────────────────────────────────────────────────

export const CrossTenantCollisionSchema = z
  .object({
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    tenants: z.array(z.string()).min(2),
    /** Highest visibility across the conflicting entries. */
    maxVisibility: z.enum(TENANT_VISIBILITIES),
    /** Severity bucket for triage. */
    severity: z.enum(["low", "medium", "high", "critical"]),
  })
  .strict();

export type CrossTenantCollision = z.infer<typeof CrossTenantCollisionSchema>;
