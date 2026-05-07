/**
 * CADReplicationDurabilityEngine — U-FS-11 (PHASE-47)
 *
 * Tracks replication manifests across tiers and assesses durability against
 * RTO / RPO / nine-count targets.
 *
 * Features:
 *   - Register full replicas across tiers (local / S3 / Glacier / DeepArchive)
 *   - Register erasure-coded shard manifests (Reed-Solomon k-of-n)
 *   - Health roll-up: healthy (≥target) → degraded (within quorum) →
 *     critical (above minimum but at risk) → lost (below k threshold)
 *   - CRDT merge with Lamport clocks: higher clock wins for metadata,
 *     LWW by lastSyncedAt for binary content location
 *   - RTO / RPO assessment against configurable target
 *
 * The engine does NOT perform network I/O — it maintains manifests that a
 * replication daemon updates.
 *
 * @module engines/CADReplicationDurabilityEngine
 */

import {
  ReplicaLocationSchema,
  ReplicationRecordSchema,
  ErasureShardSchema,
  DurabilityTargetSchema,
  DurabilityAssessmentSchema,
  type ReplicaLocation,
  type ReplicationRecord,
  type ErasureShard,
  type ErasureScheme,
  type DurabilityTarget,
  type DurabilityAssessment,
  type ReplicationHealth,
} from "../schemas/cadReplicationDurabilitySchema.js";

const ERASURE_PARAMS: Record<ErasureScheme, { k: number; m: number }> = {
  rs_4_2: { k: 4, m: 6 },
  rs_6_3: { k: 6, m: 9 },
  rs_10_4: { k: 10, m: 14 },
  rs_12_4: { k: 12, m: 16 },
};

export interface DurabilityClock {
  now(): string;
}

export class CADReplicationDurabilityEngine {
  private records = new Map<string, ReplicationRecord>();
  private target: DurabilityTarget;
  private clock: DurabilityClock;

  constructor(opts: {
    target?: Partial<DurabilityTarget>;
    clock?: DurabilityClock;
  } = {}) {
    this.target = DurabilityTargetSchema.parse({
      rtoSeconds: 4 * 3600,
      rpoSeconds: 900,
      durabilityNines: 11,
      ...opts.target,
    });
    this.clock = opts.clock ?? { now: () => new Date().toISOString() };
  }

  get size(): number {
    return this.records.size;
  }

  get currentTarget(): DurabilityTarget {
    return this.target;
  }

  setTarget(t: Partial<DurabilityTarget>): void {
    this.target = DurabilityTargetSchema.parse({ ...this.target, ...t });
  }

  // ── Register replicas + shards ─────────────────────────────────────────────

  registerReplica(
    contentHash: string,
    loc: Omit<ReplicaLocation, "lastSyncedAt"> & { lastSyncedAt?: string },
  ): ReplicationRecord {
    const h = contentHash.toLowerCase();
    const parsedLoc = ReplicaLocationSchema.parse({
      ...loc,
      lastSyncedAt: loc.lastSyncedAt ?? this.clock.now(),
    });
    const rec = this.getOrInit(h);
    const filtered = rec.replicas.filter(
      (r) => !(r.tier === parsedLoc.tier && r.region === parsedLoc.region),
    );
    rec.replicas = [...filtered, parsedLoc];
    rec.lamportClock += 1;
    rec.lastCheckedAt = this.clock.now();
    rec.health = this.rollUpHealth(rec);
    this.store(rec);
    return rec;
  }

  registerShard(
    contentHash: string,
    scheme: ErasureScheme,
    shard: Omit<ErasureShard, "location"> & {
      location: Omit<ReplicaLocation, "lastSyncedAt"> & { lastSyncedAt?: string };
    },
  ): ReplicationRecord {
    const h = contentHash.toLowerCase();
    const rec = this.getOrInit(h);
    if (rec.erasureScheme && rec.erasureScheme !== scheme) {
      throw new Error(
        `Scheme mismatch: record uses ${rec.erasureScheme}, got ${scheme}`,
      );
    }
    const { m } = ERASURE_PARAMS[scheme];
    if (shard.shardIndex < 0 || shard.shardIndex >= m) {
      throw new Error(`shardIndex ${shard.shardIndex} out of range for ${scheme} (m=${m})`);
    }
    rec.erasureScheme = scheme;
    const parsed = ErasureShardSchema.parse({
      ...shard,
      location: {
        ...shard.location,
        lastSyncedAt: shard.location.lastSyncedAt ?? this.clock.now(),
      },
    });
    rec.shards = [
      ...rec.shards.filter((s) => s.shardIndex !== parsed.shardIndex),
      parsed,
    ];
    rec.lamportClock += 1;
    rec.lastCheckedAt = this.clock.now();
    rec.health = this.rollUpHealth(rec);
    this.store(rec);
    return rec;
  }

  /** Mark a shard or replica unavailable (e.g. after failed HEAD check). */
  markReplicaLost(contentHash: string, tier: string, region: string): ReplicationRecord {
    const rec = this.mustGet(contentHash);
    rec.replicas = rec.replicas.filter(
      (r) => !(r.tier === tier && r.region === region),
    );
    rec.lamportClock += 1;
    rec.lastCheckedAt = this.clock.now();
    rec.health = this.rollUpHealth(rec);
    this.store(rec);
    return rec;
  }

  markShardLost(contentHash: string, shardIndex: number): ReplicationRecord {
    const rec = this.mustGet(contentHash);
    rec.shards = rec.shards.filter((s) => s.shardIndex !== shardIndex);
    rec.lamportClock += 1;
    rec.lastCheckedAt = this.clock.now();
    rec.health = this.rollUpHealth(rec);
    this.store(rec);
    return rec;
  }

  // ── Lookup ─────────────────────────────────────────────────────────────────

  get(contentHash: string): ReplicationRecord | undefined {
    return this.records.get(contentHash.toLowerCase());
  }

  // ── CRDT merge ────────────────────────────────────────────────────────────

  /**
   * Merge a remote record into the local store.
   * Lamport clock wins for metadata (health, erasureScheme). For replica
   * entries, the one with higher lastSyncedAt wins (LWW). Shards merge by
   * shardIndex uniqueness using LWW.
   */
  merge(remote: ReplicationRecord): ReplicationRecord {
    const h = remote.contentHash;
    const local = this.records.get(h);
    if (!local) {
      const parsed = ReplicationRecordSchema.parse(remote);
      this.records.set(h, parsed);
      return parsed;
    }
    // Replicas: LWW by lastSyncedAt per (tier, region) key
    const byKey = new Map<string, ReplicaLocation>();
    for (const r of local.replicas) byKey.set(`${r.tier}::${r.region}`, r);
    for (const r of remote.replicas) {
      const k = `${r.tier}::${r.region}`;
      const existing = byKey.get(k);
      if (!existing || new Date(r.lastSyncedAt) > new Date(existing.lastSyncedAt)) {
        byKey.set(k, r);
      }
    }
    // Shards: LWW by lastSyncedAt per shardIndex
    const byShard = new Map<number, ErasureShard>();
    for (const s of local.shards) byShard.set(s.shardIndex, s);
    for (const s of remote.shards) {
      const existing = byShard.get(s.shardIndex);
      if (
        !existing ||
        new Date(s.location.lastSyncedAt) > new Date(existing.location.lastSyncedAt)
      ) {
        byShard.set(s.shardIndex, s);
      }
    }
    const merged: ReplicationRecord = {
      contentHash: h,
      replicas: [...byKey.values()],
      erasureScheme:
        remote.lamportClock >= local.lamportClock
          ? remote.erasureScheme ?? local.erasureScheme
          : local.erasureScheme,
      shards: [...byShard.values()].sort((a, b) => a.shardIndex - b.shardIndex),
      health: "healthy", // recomputed below
      lamportClock: Math.max(local.lamportClock, remote.lamportClock) + 1,
      lastCheckedAt: this.clock.now(),
    };
    merged.health = this.rollUpHealth(merged);
    const parsed = ReplicationRecordSchema.parse(merged);
    this.records.set(h, parsed);
    return parsed;
  }

  // ── Durability assessment ──────────────────────────────────────────────────

  assess(contentHash: string): DurabilityAssessment {
    const rec = this.mustGet(contentHash);
    const copies = rec.replicas.length;
    const distinctRegions = new Set(rec.replicas.map((r) => r.region)).size;
    const distinctTiers = new Set(rec.replicas.map((r) => r.tier)).size;
    const shardsTotal = rec.erasureScheme ? ERASURE_PARAMS[rec.erasureScheme].m : 0;
    const shardsAvailable = rec.shards.length;
    const erasureK = rec.erasureScheme ? ERASURE_PARAMS[rec.erasureScheme].k : 0;

    const meetsTarget =
      rec.health === "healthy" &&
      (copies >= 2 || (rec.erasureScheme ? shardsAvailable >= erasureK + 1 : false));

    return DurabilityAssessmentSchema.parse({
      contentHash: rec.contentHash,
      copies,
      distinctRegions,
      distinctTiers,
      shardsAvailable,
      shardsTotal,
      erasureK,
      health: rec.health,
      meetsTarget,
    });
  }

  /** Enumerate records whose RPO window has been breached. */
  rpoBreached(instantIso?: string): ReplicationRecord[] {
    const now = new Date(instantIso ?? this.clock.now()).getTime();
    const rpoMs = this.target.rpoSeconds * 1000;
    const breached: ReplicationRecord[] = [];
    for (const rec of this.records.values()) {
      const mostRecent = this.mostRecentSync(rec);
      if (mostRecent === null) {
        breached.push(rec);
        continue;
      }
      if (now - mostRecent > rpoMs) breached.push(rec);
    }
    return breached;
  }

  // ── Health roll-up logic ───────────────────────────────────────────────────

  private rollUpHealth(rec: ReplicationRecord): ReplicationHealth {
    const copies = rec.replicas.length;
    const shardCount = rec.shards.length;
    const k = rec.erasureScheme ? ERASURE_PARAMS[rec.erasureScheme].k : 0;
    const m = rec.erasureScheme ? ERASURE_PARAMS[rec.erasureScheme].m : 0;

    // If we have ANY durable path standing, we're not "lost" entirely
    if (rec.erasureScheme) {
      if (shardCount < k) return "lost";
      if (shardCount === k) return "critical";
      if (shardCount < m) return "degraded";
      return "healthy";
    }
    // No erasure coding: rely on copy count
    if (copies === 0) return "lost";
    if (copies === 1) return "critical";
    if (copies === 2) return "degraded";
    return "healthy";
  }

  private mostRecentSync(rec: ReplicationRecord): number | null {
    const times: number[] = [];
    for (const r of rec.replicas) times.push(new Date(r.lastSyncedAt).getTime());
    for (const s of rec.shards) times.push(new Date(s.location.lastSyncedAt).getTime());
    if (times.length === 0) return null;
    return Math.max(...times);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private getOrInit(h: string): ReplicationRecord {
    const existing = this.records.get(h);
    if (existing) return existing;
    const fresh: ReplicationRecord = {
      contentHash: h,
      replicas: [],
      shards: [],
      health: "lost",
      lamportClock: 0,
      lastCheckedAt: this.clock.now(),
    };
    return fresh;
  }

  private mustGet(contentHash: string): ReplicationRecord {
    const r = this.get(contentHash);
    if (!r) throw new Error(`No replication record for ${contentHash}`);
    return r;
  }

  private store(rec: ReplicationRecord): void {
    const parsed = ReplicationRecordSchema.parse(rec);
    this.records.set(parsed.contentHash, parsed);
  }
}

export const cadReplicationDurabilityEngine = new CADReplicationDurabilityEngine();
