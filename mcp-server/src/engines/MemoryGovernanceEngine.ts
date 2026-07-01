/**
 * MemoryGovernanceEngine — HMEMV03 TTL + audit + scrub for stored memories.
 *
 * Pure-core governance layer over U-HMEMV01 TieredMemory: enforces TTL
 * policies, emits an immutable audit-log entry on every mutation, and
 * provides a "scrub" surface that hard-deletes entries matching an
 * operator-supplied predicate (PII redaction, tenant-offboarding).
 *
 * Composes with U-HAGI02 UnifiedControlPlane: operator-driven scrubs
 * should be gated by the control plane before reaching this engine.
 *
 * @module engines/MemoryGovernanceEngine
 */

import { z } from "zod";

export const GovernanceActionSchema = z.enum([
  "insert", "update", "delete", "scrub", "ttl-expire", "tag", "untag",
]);
export type GovernanceAction = z.infer<typeof GovernanceActionSchema>;

export const AuditEntrySchema = z.object({
  audit_id: z.string().min(1).max(120),
  entry_id: z.string().min(1).max(120),
  action: GovernanceActionSchema,
  actor: z.string().min(1).max(100),
  at: z.string().min(1),
  reason: z.string().max(500).optional(),
  before_hash: z.string().max(64).optional(),
  after_hash: z.string().max(64).optional(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

export const ScrubRequestSchema = z.object({
  scrub_id: z.string().min(1).max(120),
  actor: z.string().min(1).max(100),
  match_keys: z.array(z.string()).max(500).default([]),
  match_tags: z.array(z.string()).max(50).default([]),
  reason: z.string().min(1).max(500),
  approved_by: z.string().max(100).optional(),
});
export type ScrubRequest = z.infer<typeof ScrubRequestSchema>;

export interface GovernedEntry {
  entry_id: string;
  key: string;
  value: unknown;
  created_at: string;
  ttl_ms?: number;
  tags: readonly string[];
}

export interface ScrubResult {
  scrub_id: string;
  scrubbed_count: number;
  remaining_count: number;
  audit_entries: AuditEntry[];
}

const HARD_SCRUB_CEILING = 500;

export class MemoryGovernanceEngine {
  static validateAudit(a: unknown): AuditEntry { return AuditEntrySchema.parse(a); }
  static validateScrub(s: unknown): ScrubRequest { return ScrubRequestSchema.parse(s); }

  /** Compute a deterministic FNV-1a 64-bit hash of an entry's serialized
   *  form.  Used for before/after audit hashes. */
  static hashEntry(entry: GovernedEntry): string {
    const json = JSON.stringify({ key: entry.key, value: entry.value, tags: [...entry.tags].sort() });
    let h = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    for (let i = 0; i < json.length; i += 1) {
      h ^= BigInt(json.charCodeAt(i));
      h = (h * prime) & 0xffffffffffffffffn;
    }
    return h.toString(16).padStart(16, "0");
  }

  /** Find entries expired at `now`.  Pure: returns the filter result + audit
   *  entries describing what would be evicted. */
  static findExpired(
    entries: readonly GovernedEntry[],
    now_at: string,
    actor: string = "ttl-sweeper",
  ): { kept: GovernedEntry[]; expired: GovernedEntry[]; audit: AuditEntry[] } {
    const nowMs = Date.parse(now_at);
    const kept: GovernedEntry[] = [];
    const expired: GovernedEntry[] = [];
    for (const e of entries) {
      if (e.ttl_ms === undefined) { kept.push(e); continue; }
      const expiresAt = Date.parse(e.created_at) + e.ttl_ms;
      if (expiresAt <= nowMs) expired.push(e);
      else kept.push(e);
    }
    const audit: AuditEntry[] = expired.map((e, i) => ({
      audit_id: `audit_ttl_${now_at}_${i}`,
      entry_id: e.entry_id,
      action: "ttl-expire" as const,
      actor,
      at: now_at,
      reason: `ttl_ms=${e.ttl_ms} elapsed`,
      before_hash: MemoryGovernanceEngine.hashEntry(e),
    }));
    return { kept, expired, audit };
  }

  /** Run a scrub request: delete every entry whose key is in match_keys OR
   *  whose tags intersect match_tags.  Emits one audit entry per deleted
   *  entry.  Throws if the scrub would exceed the safety ceiling. */
  static scrub(
    entries: readonly GovernedEntry[],
    request: ScrubRequest,
    now_at: string = new Date().toISOString(),
  ): { kept: GovernedEntry[]; result: ScrubResult } {
    ScrubRequestSchema.parse(request);
    if (request.match_keys.length === 0 && request.match_tags.length === 0) {
      throw new Error("MemoryGovernance.scrub: at least one of match_keys/match_tags must be set");
    }
    const keySet = new Set(request.match_keys);
    const tagSet = new Set(request.match_tags);
    const matched: GovernedEntry[] = [];
    const kept: GovernedEntry[] = [];
    for (const e of entries) {
      const keyHit = keySet.has(e.key);
      const tagHit = e.tags.some((t) => tagSet.has(t));
      if (keyHit || tagHit) matched.push(e);
      else kept.push(e);
    }
    if (matched.length > HARD_SCRUB_CEILING) {
      throw new Error(
        `MemoryGovernance.scrub: matched ${matched.length} exceeds safety ceiling ${HARD_SCRUB_CEILING} — narrow the criteria`,
      );
    }
    const audit_entries: AuditEntry[] = matched.map((e, i) => ({
      audit_id: `audit_scrub_${request.scrub_id}_${i}`,
      entry_id: e.entry_id,
      action: "scrub" as const,
      actor: request.actor,
      at: now_at,
      reason: request.reason,
      before_hash: MemoryGovernanceEngine.hashEntry(e),
    }));
    return {
      kept,
      result: {
        scrub_id: request.scrub_id,
        scrubbed_count: matched.length,
        remaining_count: kept.length,
        audit_entries,
      },
    };
  }

  /** Emit a single audit entry for an out-of-engine mutation (caller passes
   *  before + after states). */
  static recordAudit(args: {
    audit_id: string;
    entry_id: string;
    action: GovernanceAction;
    actor: string;
    at?: string;
    reason?: string;
    before?: GovernedEntry;
    after?: GovernedEntry;
  }): AuditEntry {
    const at = args.at ?? new Date().toISOString();
    const audit: AuditEntry = {
      audit_id: args.audit_id,
      entry_id: args.entry_id,
      action: args.action,
      actor: args.actor,
      at,
      reason: args.reason,
      before_hash: args.before ? MemoryGovernanceEngine.hashEntry(args.before) : undefined,
      after_hash: args.after ? MemoryGovernanceEngine.hashEntry(args.after) : undefined,
    };
    return AuditEntrySchema.parse(audit);
  }

  /** Render an audit log for operator review. */
  static renderAudit(audits: readonly AuditEntry[]): string {
    if (audits.length === 0) return "[AUDIT] (empty)";
    return [
      `[AUDIT] ${audits.length} entry(ies)`,
      ...audits.map((a) =>
        `  ${a.at} ${a.action.padEnd(11)} ${a.actor} → ${a.entry_id}${a.reason ? ` (${a.reason})` : ""}`,
      ),
    ].join("\n");
  }
}

export const memoryGovernanceEngine = MemoryGovernanceEngine;
