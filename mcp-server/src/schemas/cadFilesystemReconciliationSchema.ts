/**
 * cadFilesystemReconciliationSchema — U-FS-13 (PHASE-47)
 *
 * CAS (content-addressable store) reconciliation: detect orphan disk entries,
 * zombie registry entries, manage lifecycle aging across storage tiers,
 * and record per-tenant cost ledger entries.
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadFilesystemReconciliationSchema
 */

import { z } from "zod";

// ── Storage tiers (reused from durability) ──────────────────────────────────

export const LIFECYCLE_TIERS = ["hot", "warm", "cold", "glacier"] as const;
export type LifecycleTier = (typeof LIFECYCLE_TIERS)[number];

/** Default per-GB-month cost per tier (USD). */
export const TIER_COST_GB_MONTH: Record<LifecycleTier, number> = {
  hot: 0.023,       // S3 Standard / local SSD
  warm: 0.0125,     // S3 IA
  cold: 0.004,      // Glacier Instant Retrieval
  glacier: 0.00099, // Deep Archive
};

export const AGING_RULES: Record<LifecycleTier, { idleDaysToNext?: number; next?: LifecycleTier }> = {
  hot: { idleDaysToNext: 30, next: "warm" },
  warm: { idleDaysToNext: 90, next: "cold" },
  cold: { idleDaysToNext: 365, next: "glacier" },
  glacier: {},
};

// ── Registry entry ──────────────────────────────────────────────────────────

export const RegistryEntrySchema = z
  .object({
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    tenantId: z.string().min(1),
    tier: z.enum(LIFECYCLE_TIERS),
    sizeBytes: z.number().int().nonnegative(),
    lastAccessedAt: z.string().min(1),
    createdAt: z.string().min(1),
    /** Optional upstream references (to detect true orphan vs transitional). */
    refCount: z.number().int().nonnegative().default(0),
  })
  .strict();

export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;

// ── Disk entry (as observed on storage) ─────────────────────────────────────

export const DiskEntrySchema = z
  .object({
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    path: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
  })
  .strict();

export type DiskEntry = z.infer<typeof DiskEntrySchema>;

// ── Reconciliation results ──────────────────────────────────────────────────

export const ReconciliationReportSchema = z
  .object({
    /** On disk but not in registry — candidate for deletion. */
    orphans: z.array(DiskEntrySchema).default([]),
    /** In registry but missing on disk — broken references. */
    zombies: z.array(RegistryEntrySchema).default([]),
    /** Size mismatch (same hash, different size) — hash collision or truncation. */
    mismatches: z
      .array(
        z.object({
          contentHash: z.string(),
          registrySize: z.number().int().nonnegative(),
          diskSize: z.number().int().nonnegative(),
        }),
      )
      .default([]),
    scannedAt: z.string().min(1),
  })
  .strict();

export type ReconciliationReport = z.infer<typeof ReconciliationReportSchema>;

// ── GC decision ─────────────────────────────────────────────────────────────

export const GCPolicySchema = z
  .object({
    /** Only delete orphans older than N minutes. */
    minOrphanAgeMinutes: z.number().int().nonnegative().default(60),
    /** Don't delete more than N entries per run. */
    maxDeletionsPerRun: z.number().int().positive().default(1000),
    /** Dry-run mode — don't actually delete, just list. */
    dryRun: z.boolean().default(false),
  })
  .strict();

export type GCPolicy = z.infer<typeof GCPolicySchema>;

export const GCResultSchema = z
  .object({
    deleted: z.array(DiskEntrySchema),
    skipped: z.array(DiskEntrySchema),
    reason: z.record(z.string(), z.string()).default({}),
    freedBytes: z.number().int().nonnegative(),
    ranAt: z.string().min(1),
  })
  .strict();

export type GCResult = z.infer<typeof GCResultSchema>;

// ── Aging transitions ───────────────────────────────────────────────────────

export const AgingTransitionSchema = z
  .object({
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    from: z.enum(LIFECYCLE_TIERS),
    to: z.enum(LIFECYCLE_TIERS),
    at: z.string().min(1),
  })
  .strict();

export type AgingTransition = z.infer<typeof AgingTransitionSchema>;

// ── Cost ledger ─────────────────────────────────────────────────────────────

export const CostLedgerEntrySchema = z
  .object({
    tenantId: z.string().min(1),
    periodStart: z.string().min(1),
    periodEnd: z.string().min(1),
    /** Bytes × days-in-period for each tier. */
    byTier: z
      .object({
        hot: z.number().nonnegative().optional(),
        warm: z.number().nonnegative().optional(),
        cold: z.number().nonnegative().optional(),
        glacier: z.number().nonnegative().optional(),
      })
      .strict()
      .default({}),
    totalBytes: z.number().nonnegative(),
    totalUSD: z.number().nonnegative(),
  })
  .strict();

export type CostLedgerEntry = z.infer<typeof CostLedgerEntrySchema>;
