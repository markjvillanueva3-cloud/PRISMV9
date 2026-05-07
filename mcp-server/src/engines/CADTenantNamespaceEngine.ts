/**
 * CADTenantNamespaceEngine — U-FS-07 (PHASE-47)
 *
 * Multi-tenant namespace for CAD content.
 *
 * Core services:
 *   1. register / list / resolve per-tenant content
 *   2. access control: canAccess(viewerTenantId, content) enforces
 *      private | shared | public + NDA signatures
 *   3. cross-tenant collision detection (IP-leak alert) — same contentHash
 *      appearing under distinct tenants. Severity scaled by visibility mix.
 *   4. retention: apply policy + enumerate expired content for purge
 *   5. GDPR soft-delete: writes a tombstone; record remains auditable
 *
 * @module engines/CADTenantNamespaceEngine
 */

import {
  TenantContentSchema,
  NDAGateSchema,
  TombstoneSchema,
  CrossTenantCollisionSchema,
  type TenantContent,
  type TenantVisibility,
  type RetentionClass,
  type CrossTenantCollision,
  type Tombstone,
} from "../schemas/cadTenantNamespaceSchema.js";

const RETENTION_DAYS: Record<RetentionClass, number> = {
  ephemeral: 30,
  standard: 365 * 7,        // 7 years
  long_term: 365 * 20,      // 20 years
  indefinite: 365 * 1000,   // effectively forever
};

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export interface TenantClock {
  now(): string;
}

interface ContentKey {
  tenantId: string;
  contentHash: string;
}

function keyOf(k: ContentKey): string {
  return `${k.tenantId}::${k.contentHash}`;
}

export class CADTenantNamespaceEngine {
  private store = new Map<string, TenantContent>();
  /** contentHash → Set<tenantId> for collision detection. */
  private byHash = new Map<string, Set<string>>();
  private clock: TenantClock;

  constructor(clock?: TenantClock) {
    this.clock = clock ?? { now: () => new Date().toISOString() };
  }

  // ── Registration ───────────────────────────────────────────────────────────

  register(input: {
    tenantId: string;
    contentHash: string;
    canonicalName: string;
    visibility?: TenantVisibility;
    sharedWith?: string[];
    retentionClass?: RetentionClass;
    ndaRequired?: boolean;
    ndaId?: string;
  }): TenantContent {
    const ts = this.clock.now();
    const retentionClass = input.retentionClass ?? "standard";
    const rec: TenantContent = {
      tenantId: input.tenantId,
      contentHash: input.contentHash.toLowerCase(),
      canonicalName: input.canonicalName,
      visibility: input.visibility ?? "private",
      sharedWith: input.sharedWith ?? [],
      retentionClass,
      retentionExpiresAt: addDays(ts, RETENTION_DAYS[retentionClass]),
      createdAt: ts,
      ...(input.ndaRequired
        ? {
            ndaGate: NDAGateSchema.parse({
              required: true,
              ndaId: input.ndaId,
              signedBy: [],
              configuredAt: ts,
            }),
          }
        : {}),
    };
    const parsed = TenantContentSchema.parse(rec);
    const k = keyOf(parsed);
    this.store.set(k, parsed);

    if (!this.byHash.has(parsed.contentHash)) {
      this.byHash.set(parsed.contentHash, new Set());
    }
    this.byHash.get(parsed.contentHash)!.add(parsed.tenantId);
    return parsed;
  }

  get(tenantId: string, contentHash: string): TenantContent | undefined {
    return this.store.get(keyOf({ tenantId, contentHash: contentHash.toLowerCase() }));
  }

  listByTenant(tenantId: string): TenantContent[] {
    return [...this.store.values()].filter(
      (r) => r.tenantId === tenantId && !r.tombstone,
    );
  }

  listAll(): TenantContent[] {
    return [...this.store.values()];
  }

  // ── Access control ─────────────────────────────────────────────────────────

  /** Whether viewerTenantId may read content owned by ownerTenantId. */
  canAccess(
    viewerTenantId: string,
    content: TenantContent,
  ): { allowed: boolean; reason: string } {
    if (content.tombstone) {
      return { allowed: false, reason: "content_deleted" };
    }
    if (content.tenantId === viewerTenantId) {
      return { allowed: true, reason: "owner" };
    }
    if (content.visibility === "public") {
      return this.ndaCheck(viewerTenantId, content, "public");
    }
    if (content.visibility === "shared") {
      if (content.sharedWith.includes(viewerTenantId)) {
        return this.ndaCheck(viewerTenantId, content, "shared");
      }
      return { allowed: false, reason: "not_in_share_list" };
    }
    // private
    return { allowed: false, reason: "private" };
  }

  private ndaCheck(
    viewerTenantId: string,
    content: TenantContent,
    path: string,
  ): { allowed: boolean; reason: string } {
    if (content.ndaGate?.required && !content.ndaGate.signedBy.includes(viewerTenantId)) {
      return { allowed: false, reason: "nda_not_signed" };
    }
    return { allowed: true, reason: path };
  }

  /** Record a tenant's NDA signature, unlocking downloads. */
  signNDA(
    tenantId: string,
    contentHash: string,
    signerTenantId: string,
  ): TenantContent {
    const rec = this.mustGet(tenantId, contentHash);
    if (!rec.ndaGate?.required) {
      throw new Error("No NDA gate configured for this content");
    }
    if (rec.ndaGate.signedBy.includes(signerTenantId)) {
      return rec;
    }
    const next: TenantContent = {
      ...rec,
      ndaGate: {
        ...rec.ndaGate,
        signedBy: [...rec.ndaGate.signedBy, signerTenantId],
      },
    };
    const parsed = TenantContentSchema.parse(next);
    this.store.set(keyOf(parsed), parsed);
    return parsed;
  }

  // ── Cross-tenant collision detection ───────────────────────────────────────

  findCollisions(): CrossTenantCollision[] {
    const out: CrossTenantCollision[] = [];
    for (const [hash, tenants] of this.byHash) {
      if (tenants.size < 2) continue;
      const entries = [...tenants]
        .map((t) => this.store.get(keyOf({ tenantId: t, contentHash: hash })))
        .filter((r): r is TenantContent => !!r && !r.tombstone);
      if (entries.length < 2) continue;
      const visibilities = new Set(entries.map((e) => e.visibility));
      const maxVis: TenantVisibility = visibilities.has("public")
        ? "public"
        : visibilities.has("shared")
          ? "shared"
          : "private";
      // Severity: identical hash across tenants where at least one is private
      // is a potential IP-leak; public-only is benign.
      let severity: CrossTenantCollision["severity"];
      if (visibilities.size === 1 && visibilities.has("public")) severity = "low";
      else if (visibilities.has("private") && entries.length >= 3) severity = "critical";
      else if (visibilities.has("private")) severity = "high";
      else severity = "medium";

      out.push(
        CrossTenantCollisionSchema.parse({
          contentHash: hash,
          tenants: entries.map((e) => e.tenantId),
          maxVisibility: maxVis,
          severity,
        }),
      );
    }
    return out;
  }

  // ── Retention ──────────────────────────────────────────────────────────────

  /** Enumerate content whose retention has expired as of a given instant. */
  expiredAsOf(instantIso?: string): TenantContent[] {
    const instant = new Date(instantIso ?? this.clock.now()).getTime();
    return [...this.store.values()].filter((r) => {
      if (r.tombstone) return false;
      if (!r.retentionExpiresAt) return false;
      return new Date(r.retentionExpiresAt).getTime() <= instant;
    });
  }

  /** Update retention class for an existing record. */
  setRetention(
    tenantId: string,
    contentHash: string,
    retentionClass: RetentionClass,
  ): TenantContent {
    const rec = this.mustGet(tenantId, contentHash);
    const expires = addDays(rec.createdAt, RETENTION_DAYS[retentionClass]);
    const next: TenantContent = {
      ...rec,
      retentionClass,
      retentionExpiresAt: expires,
    };
    const parsed = TenantContentSchema.parse(next);
    this.store.set(keyOf(parsed), parsed);
    return parsed;
  }

  // ── GDPR tombstone delete ──────────────────────────────────────────────────

  tombstone(
    tenantId: string,
    contentHash: string,
    meta: { reason: string; requestedBy: string; ticketId?: string },
  ): TenantContent {
    const rec = this.mustGet(tenantId, contentHash);
    if (rec.tombstone) return rec; // idempotent
    const ts = this.clock.now();
    const tomb: Tombstone = TombstoneSchema.parse({
      reason: meta.reason,
      deletedAt: ts,
      requestedBy: meta.requestedBy,
      ...(meta.ticketId ? { ticketId: meta.ticketId } : {}),
    });
    const next: TenantContent = { ...rec, tombstone: tomb };
    const parsed = TenantContentSchema.parse(next);
    this.store.set(keyOf(parsed), parsed);

    const s = this.byHash.get(parsed.contentHash);
    if (s) s.delete(parsed.tenantId);
    return parsed;
  }

  // ── Customer archive export ────────────────────────────────────────────────

  /** Produce a read-only snapshot of every non-tombstoned record owned by a tenant. */
  exportArchive(tenantId: string): TenantContent[] {
    return this.listByTenant(tenantId);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private mustGet(tenantId: string, contentHash: string): TenantContent {
    const r = this.get(tenantId, contentHash);
    if (!r) throw new Error(`No content ${tenantId}::${contentHash}`);
    return r;
  }

  get size(): number {
    return this.store.size;
  }
}

export const cadTenantNamespaceEngine = new CADTenantNamespaceEngine();
