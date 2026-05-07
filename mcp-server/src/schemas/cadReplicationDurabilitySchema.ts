/**
 * cadReplicationDurabilitySchema — U-FS-11 (PHASE-47)
 *
 * Models multi-tier replication (local + S3 + Glacier), erasure-coded
 * shard manifests (Reed-Solomon 10+4), RTO/RPO tracking, and CRDT
 * metadata with last-write-wins binary resolution.
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadReplicationDurabilitySchema
 */

import { z } from "zod";

// ── Storage tiers ───────────────────────────────────────────────────────────

export const STORAGE_TIERS = [
  "local",           // on-prem hot storage
  "s3_standard",     // hot cloud
  "s3_infrequent",   // IA
  "s3_onezone_ia",
  "glacier",         // cold
  "deep_archive",
] as const;

export type StorageTier = (typeof STORAGE_TIERS)[number];

export const REPLICATION_HEALTH = ["healthy", "degraded", "critical", "lost"] as const;
export type ReplicationHealth = (typeof REPLICATION_HEALTH)[number];

// ── Per-tier location record ────────────────────────────────────────────────

export const ReplicaLocationSchema = z
  .object({
    tier: z.enum(STORAGE_TIERS),
    /** Region / zone identifier (e.g. "us-east-1"). */
    region: z.string().min(1),
    /** Opaque URL/path where this replica lives. */
    uri: z.string().min(1),
    /** ISO timestamp of last successful sync. */
    lastSyncedAt: z.string().min(1),
    /** Bytes verified on this location. */
    sizeBytes: z.number().int().nonnegative(),
    /** If true, the tier is write-only (e.g. Glacier). */
    coldTier: z.boolean().default(false),
  })
  .strict();

export type ReplicaLocation = z.infer<typeof ReplicaLocationSchema>;

// ── Reed-Solomon shard manifest ─────────────────────────────────────────────

export const ERASURE_SCHEMES = [
  "rs_4_2",   // 4 data + 2 parity (m=6, k=4)
  "rs_6_3",
  "rs_10_4",  // canonical aerospace
  "rs_12_4",
] as const;

export type ErasureScheme = (typeof ERASURE_SCHEMES)[number];

export const ErasureShardSchema = z
  .object({
    shardIndex: z.number().int().nonnegative(),
    /** true if parity shard (otherwise data shard). */
    isParity: z.boolean(),
    /** Location of this shard. */
    location: ReplicaLocationSchema,
    /** SHA-256 of the shard bytes. */
    shardHash: z.string().regex(/^[0-9a-f]{64}$/),
    sizeBytes: z.number().int().nonnegative(),
  })
  .strict();

export type ErasureShard = z.infer<typeof ErasureShardSchema>;

// ── Per-object replication record ───────────────────────────────────────────

export const ReplicationRecordSchema = z
  .object({
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    /** Full replicas (non-erasure-coded). */
    replicas: z.array(ReplicaLocationSchema).default([]),
    /** Erasure-coded shard manifest. */
    erasureScheme: z.enum(ERASURE_SCHEMES).optional(),
    shards: z.array(ErasureShardSchema).default([]),
    /** Last durability health roll-up. */
    health: z.enum(REPLICATION_HEALTH),
    /** Lamport clock for CRDT metadata merge. */
    lamportClock: z.number().int().nonnegative(),
    /** ISO timestamp of last health check. */
    lastCheckedAt: z.string().min(1),
  })
  .strict();

export type ReplicationRecord = z.infer<typeof ReplicationRecordSchema>;

// ── RTO/RPO targets + actuals ───────────────────────────────────────────────

export const DurabilityTargetSchema = z
  .object({
    /** Recovery Time Objective in seconds. */
    rtoSeconds: z.number().int().positive(),
    /** Recovery Point Objective in seconds. */
    rpoSeconds: z.number().int().positive(),
    /** Nine-count durability target (e.g. 11 = 99.999999999 %). */
    durabilityNines: z.number().int().min(1).max(15),
  })
  .strict();

export type DurabilityTarget = z.infer<typeof DurabilityTargetSchema>;

export const DurabilityAssessmentSchema = z
  .object({
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    copies: z.number().int().nonnegative(),
    distinctRegions: z.number().int().nonnegative(),
    distinctTiers: z.number().int().nonnegative(),
    /** Shards available vs total (k / n). */
    shardsAvailable: z.number().int().nonnegative(),
    shardsTotal: z.number().int().nonnegative(),
    /** k (minimum data shards needed). */
    erasureK: z.number().int().nonnegative(),
    health: z.enum(REPLICATION_HEALTH),
    meetsTarget: z.boolean(),
  })
  .strict();

export type DurabilityAssessment = z.infer<typeof DurabilityAssessmentSchema>;
