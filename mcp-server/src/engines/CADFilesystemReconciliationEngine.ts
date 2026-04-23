/**
 * CADFilesystemReconciliationEngine — U-FS-13 (PHASE-47)
 *
 * Reconciles the CAS on-disk state with the registry. Detects:
 *   - Orphans: on disk, not in registry
 *   - Zombies: in registry, not on disk
 *   - Size mismatches: same hash, different bytes (hash collision / truncation)
 *
 * Runs garbage collection with guardrails (min orphan age, max-per-run, dry-run).
 * Applies lifecycle aging transitions (hot→warm→cold→glacier) based on last
 * access time. Generates per-tenant cost ledger entries from registry content.
 *
 * @module engines/CADFilesystemReconciliationEngine
 */

import {
  RegistryEntrySchema,
  DiskEntrySchema,
  ReconciliationReportSchema,
  GCPolicySchema,
  GCResultSchema,
  AgingTransitionSchema,
  CostLedgerEntrySchema,
  AGING_RULES,
  TIER_COST_GB_MONTH,
  type RegistryEntry,
  type DiskEntry,
  type ReconciliationReport,
  type GCPolicy,
  type GCResult,
  type AgingTransition,
  type CostLedgerEntry,
  type LifecycleTier,
} from "../schemas/cadFilesystemReconciliationSchema.js";

export interface ReconcileClock {
  now(): string;
}

export class CADFilesystemReconciliationEngine {
  private registry = new Map<string, RegistryEntry>();
  private clock: ReconcileClock;

  constructor(opts: { clock?: ReconcileClock } = {}) {
    this.clock = opts.clock ?? { now: () => new Date().toISOString() };
  }

  // ── Registry maintenance ──────────────────────────────────────────────────

  upsertRegistryEntry(e: RegistryEntry): RegistryEntry {
    const parsed = RegistryEntrySchema.parse({
      ...e,
      contentHash: e.contentHash.toLowerCase(),
    });
    this.registry.set(parsed.contentHash, parsed);
    return parsed;
  }

  touch(contentHash: string, at?: string): RegistryEntry {
    const rec = this.mustGet(contentHash);
    rec.lastAccessedAt = at ?? this.clock.now();
    const parsed = RegistryEntrySchema.parse(rec);
    this.registry.set(parsed.contentHash, parsed);
    return parsed;
  }

  removeRegistryEntry(contentHash: string): boolean {
    return this.registry.delete(contentHash.toLowerCase());
  }

  getRegistryEntry(contentHash: string): RegistryEntry | undefined {
    return this.registry.get(contentHash.toLowerCase());
  }

  allEntries(): RegistryEntry[] {
    return [...this.registry.values()];
  }

  // ── Reconciliation ────────────────────────────────────────────────────────

  reconcile(disk: DiskEntry[]): ReconciliationReport {
    const diskByHash = new Map<string, DiskEntry>();
    for (const d of disk) diskByHash.set(d.contentHash.toLowerCase(), d);

    const orphans: DiskEntry[] = [];
    const zombies: RegistryEntry[] = [];
    const mismatches: ReconciliationReport["mismatches"] = [];

    for (const [hash, d] of diskByHash) {
      const r = this.registry.get(hash);
      if (!r) {
        orphans.push(d);
        continue;
      }
      if (r.sizeBytes !== d.sizeBytes) {
        mismatches.push({
          contentHash: hash,
          registrySize: r.sizeBytes,
          diskSize: d.sizeBytes,
        });
      }
    }
    for (const [hash, r] of this.registry) {
      if (!diskByHash.has(hash)) zombies.push(r);
    }

    return ReconciliationReportSchema.parse({
      orphans,
      zombies,
      mismatches,
      scannedAt: this.clock.now(),
    });
  }

  // ── Garbage collection ────────────────────────────────────────────────────

  /**
   * Delete orphan entries, subject to policy. Returns the GC result.
   * For age gating, the `seenBefore` map should record when each orphan was
   * first noticed — we avoid deleting orphans we just saw.
   */
  collectGarbage(opts: {
    report: ReconciliationReport;
    firstSeen: Map<string, string>; // hash → ISO time
    policy?: Partial<GCPolicy>;
    deleter: (entry: DiskEntry) => void;
  }): GCResult {
    const policy = GCPolicySchema.parse({ ...opts.policy });
    const deleted: DiskEntry[] = [];
    const skipped: DiskEntry[] = [];
    const reason: Record<string, string> = {};
    const now = new Date(this.clock.now()).getTime();
    const minAgeMs = policy.minOrphanAgeMinutes * 60 * 1000;

    let freedBytes = 0;
    for (const orphan of opts.report.orphans) {
      const seenIso = opts.firstSeen.get(orphan.contentHash.toLowerCase());
      if (!seenIso) {
        skipped.push(orphan);
        reason[orphan.contentHash] = "First sighting — deferring";
        continue;
      }
      const age = now - new Date(seenIso).getTime();
      if (age < minAgeMs) {
        skipped.push(orphan);
        reason[orphan.contentHash] = `Age ${Math.floor(age / 60000)}min < min ${policy.minOrphanAgeMinutes}min`;
        continue;
      }
      if (deleted.length >= policy.maxDeletionsPerRun) {
        skipped.push(orphan);
        reason[orphan.contentHash] = "Reached maxDeletionsPerRun";
        continue;
      }
      if (!policy.dryRun) {
        opts.deleter(orphan);
      }
      deleted.push(orphan);
      freedBytes += orphan.sizeBytes;
    }
    return GCResultSchema.parse({
      deleted,
      skipped,
      reason,
      freedBytes,
      ranAt: this.clock.now(),
    });
  }

  // ── Lifecycle aging ───────────────────────────────────────────────────────

  /**
   * For every registry entry, check whether it has been idle long enough to
   * age down a tier. Returns planned transitions — caller applies them.
   */
  planAging(now?: string): AgingTransition[] {
    const ref = new Date(now ?? this.clock.now()).getTime();
    const transitions: AgingTransition[] = [];
    for (const rec of this.registry.values()) {
      const rule = AGING_RULES[rec.tier];
      if (!rule.next || !rule.idleDaysToNext) continue;
      const idleMs = ref - new Date(rec.lastAccessedAt).getTime();
      const idleDays = idleMs / (24 * 3600 * 1000);
      if (idleDays >= rule.idleDaysToNext) {
        transitions.push(
          AgingTransitionSchema.parse({
            contentHash: rec.contentHash,
            from: rec.tier,
            to: rule.next,
            at: new Date(ref).toISOString(),
          }),
        );
      }
    }
    return transitions;
  }

  applyTransition(tr: AgingTransition): RegistryEntry {
    const rec = this.mustGet(tr.contentHash);
    if (rec.tier !== tr.from) {
      throw new Error(
        `Transition mismatch for ${tr.contentHash}: registry is on ${rec.tier}, transition from ${tr.from}`,
      );
    }
    rec.tier = tr.to;
    const parsed = RegistryEntrySchema.parse(rec);
    this.registry.set(parsed.contentHash, parsed);
    return parsed;
  }

  // ── Cost ledger ───────────────────────────────────────────────────────────

  /**
   * Compute cost for a billing period given a snapshot-at-start.
   * Simple model: tier size at period start × days-in-period × $/GB-month.
   */
  costForTenant(tenantId: string, periodStart: string, periodEnd: string): CostLedgerEntry {
    const startT = new Date(periodStart).getTime();
    const endT = new Date(periodEnd).getTime();
    if (endT <= startT) throw new Error("periodEnd must be after periodStart");
    const days = (endT - startT) / (24 * 3600 * 1000);
    const monthFrac = days / 30;

    const byTier: Partial<Record<LifecycleTier, number>> = {};
    let totalBytes = 0;
    let totalUSD = 0;
    for (const rec of this.registry.values()) {
      if (rec.tenantId !== tenantId) continue;
      byTier[rec.tier] = (byTier[rec.tier] ?? 0) + rec.sizeBytes;
      totalBytes += rec.sizeBytes;
    }
    for (const [tier, bytes] of Object.entries(byTier) as [LifecycleTier, number][]) {
      const gb = bytes / 1024 ** 3;
      totalUSD += gb * TIER_COST_GB_MONTH[tier] * monthFrac;
    }
    return CostLedgerEntrySchema.parse({
      tenantId,
      periodStart,
      periodEnd,
      byTier,
      totalBytes,
      totalUSD,
    });
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private mustGet(contentHash: string): RegistryEntry {
    const rec = this.getRegistryEntry(contentHash);
    if (!rec) throw new Error(`No registry entry for ${contentHash}`);
    return rec;
  }
}

export const cadFilesystemReconciliationEngine = new CADFilesystemReconciliationEngine();
