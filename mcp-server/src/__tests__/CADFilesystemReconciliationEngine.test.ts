/**
 * CADFilesystemReconciliationEngine.test.ts — U-FS-13 (PHASE-47)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADFilesystemReconciliationEngine,
  type ReconcileClock,
} from "../engines/CADFilesystemReconciliationEngine.js";
import type {
  DiskEntry,
  RegistryEntry,
} from "../schemas/cadFilesystemReconciliationSchema.js";

const HASH = (c: string) => c.repeat(64);
const H1 = HASH("a");
const H2 = HASH("b");
const H3 = HASH("c");

function makeClock(start = "2026-04-20T00:00:00Z"): ReconcileClock & {
  advanceSeconds(s: number): void;
  advanceDays(d: number): void;
} {
  let t = new Date(start).getTime();
  return {
    now: () => new Date(t).toISOString(),
    advanceSeconds: (s) => {
      t += s * 1000;
    },
    advanceDays: (d) => {
      t += d * 24 * 3600 * 1000;
    },
  };
}

function entry(
  hash: string,
  overrides: Partial<RegistryEntry> = {},
): RegistryEntry {
  return {
    contentHash: hash,
    tenantId: overrides.tenantId ?? "acme",
    tier: overrides.tier ?? "hot",
    sizeBytes: overrides.sizeBytes ?? 1024,
    lastAccessedAt: overrides.lastAccessedAt ?? "2026-04-20T00:00:00Z",
    createdAt: overrides.createdAt ?? "2026-04-20T00:00:00Z",
    refCount: overrides.refCount ?? 0,
  };
}

function diskEntry(hash: string, sizeBytes = 1024, path?: string): DiskEntry {
  return { contentHash: hash, path: path ?? `/cas/${hash}`, sizeBytes };
}

describe("CADFilesystemReconciliationEngine (U-FS-13)", () => {
  let eng: CADFilesystemReconciliationEngine;
  let clock: ReturnType<typeof makeClock>;

  beforeEach(() => {
    clock = makeClock();
    eng = new CADFilesystemReconciliationEngine({ clock });
  });

  describe("reconcile", () => {
    it("detects orphans on disk not in registry", () => {
      eng.upsertRegistryEntry(entry(H1));
      const rpt = eng.reconcile([diskEntry(H1), diskEntry(H2)]);
      expect(rpt.orphans.length).toBe(1);
      expect(rpt.orphans[0].contentHash).toBe(H2);
      expect(rpt.zombies.length).toBe(0);
    });

    it("detects zombies in registry not on disk", () => {
      eng.upsertRegistryEntry(entry(H1));
      eng.upsertRegistryEntry(entry(H2));
      const rpt = eng.reconcile([diskEntry(H1)]);
      expect(rpt.zombies.length).toBe(1);
      expect(rpt.zombies[0].contentHash).toBe(H2);
    });

    it("detects size mismatches", () => {
      eng.upsertRegistryEntry(entry(H1, { sizeBytes: 1024 }));
      const rpt = eng.reconcile([diskEntry(H1, 2048)]);
      expect(rpt.mismatches.length).toBe(1);
      expect(rpt.mismatches[0].registrySize).toBe(1024);
      expect(rpt.mismatches[0].diskSize).toBe(2048);
    });

    it("clean state returns empty report", () => {
      eng.upsertRegistryEntry(entry(H1));
      const rpt = eng.reconcile([diskEntry(H1)]);
      expect(rpt.orphans).toEqual([]);
      expect(rpt.zombies).toEqual([]);
      expect(rpt.mismatches).toEqual([]);
    });
  });

  describe("garbage collection", () => {
    it("deletes orphans older than min age", () => {
      eng.upsertRegistryEntry(entry(H1));
      const rpt = eng.reconcile([diskEntry(H1), diskEntry(H2)]);
      const firstSeen = new Map<string, string>([
        [H2, "2026-04-19T22:00:00Z"], // 2h before clock
      ]);
      const deletes: DiskEntry[] = [];
      const result = eng.collectGarbage({
        report: rpt,
        firstSeen,
        policy: { minOrphanAgeMinutes: 60 },
        deleter: (e) => deletes.push(e),
      });
      expect(result.deleted.length).toBe(1);
      expect(deletes.length).toBe(1);
      expect(result.freedBytes).toBe(1024);
    });

    it("skips first-sighting orphans", () => {
      const rpt = eng.reconcile([diskEntry(H2)]);
      const result = eng.collectGarbage({
        report: rpt,
        firstSeen: new Map(),
        deleter: () => {},
      });
      expect(result.deleted.length).toBe(0);
      expect(result.skipped.length).toBe(1);
      expect(result.reason[H2]).toMatch(/First sighting/);
    });

    it("dry-run does not call deleter", () => {
      const rpt = eng.reconcile([diskEntry(H2)]);
      const firstSeen = new Map([[H2, "2026-04-19T22:00:00Z"]]);
      let deletedCount = 0;
      const result = eng.collectGarbage({
        report: rpt,
        firstSeen,
        policy: { dryRun: true, minOrphanAgeMinutes: 60 },
        deleter: () => {
          deletedCount++;
        },
      });
      expect(result.deleted.length).toBe(1);
      expect(deletedCount).toBe(0);
    });

    it("maxDeletionsPerRun caps the batch", () => {
      const rpt = eng.reconcile([diskEntry(H1), diskEntry(H2), diskEntry(H3)]);
      const firstSeen = new Map([
        [H1, "2026-04-19T22:00:00Z"],
        [H2, "2026-04-19T22:00:00Z"],
        [H3, "2026-04-19T22:00:00Z"],
      ]);
      const result = eng.collectGarbage({
        report: rpt,
        firstSeen,
        policy: { maxDeletionsPerRun: 2, minOrphanAgeMinutes: 60 },
        deleter: () => {},
      });
      expect(result.deleted.length).toBe(2);
      expect(result.skipped.length).toBe(1);
    });
  });

  describe("lifecycle aging", () => {
    it("plans hot→warm after 30 days idle", () => {
      eng.upsertRegistryEntry(entry(H1, { tier: "hot" }));
      clock.advanceDays(31);
      const plan = eng.planAging();
      expect(plan.length).toBe(1);
      expect(plan[0].from).toBe("hot");
      expect(plan[0].to).toBe("warm");
    });

    it("no transition for recently touched", () => {
      eng.upsertRegistryEntry(entry(H1, { tier: "hot" }));
      clock.advanceDays(10);
      expect(eng.planAging()).toEqual([]);
    });

    it("applyTransition updates registry", () => {
      eng.upsertRegistryEntry(entry(H1, { tier: "hot" }));
      clock.advanceDays(31);
      const plan = eng.planAging();
      eng.applyTransition(plan[0]);
      expect(eng.getRegistryEntry(H1)?.tier).toBe("warm");
    });

    it("applyTransition rejects mismatched from-tier", () => {
      eng.upsertRegistryEntry(entry(H1, { tier: "cold" }));
      expect(() =>
        eng.applyTransition({
          contentHash: H1,
          from: "hot",
          to: "warm",
          at: "2026-04-20T00:00:00Z",
        }),
      ).toThrow(/mismatch/);
    });

    it("glacier has no further transitions", () => {
      eng.upsertRegistryEntry(entry(H1, { tier: "glacier" }));
      clock.advanceDays(3650);
      expect(eng.planAging()).toEqual([]);
    });
  });

  describe("cost ledger", () => {
    it("sums hot-tier cost over a 30-day period", () => {
      eng.upsertRegistryEntry(
        entry(H1, { tier: "hot", sizeBytes: 1024 * 1024 * 1024 }), // 1 GB
      );
      const ledger = eng.costForTenant(
        "acme",
        "2026-04-01T00:00:00Z",
        "2026-05-01T00:00:00Z",
      );
      expect(ledger.totalBytes).toBe(1024 * 1024 * 1024);
      expect(ledger.totalUSD).toBeCloseTo(0.023, 3); // $0.023/GB-month
    });

    it("mixes tiers correctly", () => {
      eng.upsertRegistryEntry(entry(H1, { tier: "hot", sizeBytes: 1024 * 1024 * 1024 }));
      eng.upsertRegistryEntry(
        entry(H2, { tier: "glacier", sizeBytes: 1024 * 1024 * 1024 }),
      );
      const ledger = eng.costForTenant(
        "acme",
        "2026-04-01T00:00:00Z",
        "2026-05-01T00:00:00Z",
      );
      expect(ledger.byTier.hot).toBe(1024 ** 3);
      expect(ledger.byTier.glacier).toBe(1024 ** 3);
      // ~$0.023 + ~$0.00099 = ~$0.024
      expect(ledger.totalUSD).toBeCloseTo(0.02399, 3);
    });

    it("isolates tenants", () => {
      eng.upsertRegistryEntry(entry(H1, { tier: "hot", tenantId: "acme" }));
      eng.upsertRegistryEntry(entry(H2, { tier: "hot", tenantId: "other" }));
      const ledger = eng.costForTenant(
        "acme",
        "2026-04-01T00:00:00Z",
        "2026-05-01T00:00:00Z",
      );
      expect(ledger.totalBytes).toBe(1024);
    });

    it("rejects inverted periods", () => {
      expect(() =>
        eng.costForTenant(
          "acme",
          "2026-05-01T00:00:00Z",
          "2026-04-01T00:00:00Z",
        ),
      ).toThrow(/periodEnd must be after/);
    });
  });

  describe("touch + remove", () => {
    it("touch updates lastAccessedAt and defers aging", () => {
      eng.upsertRegistryEntry(entry(H1, { tier: "hot" }));
      clock.advanceDays(25);
      eng.touch(H1);
      clock.advanceDays(5); // total 30 but touched at 25 → only 5d idle
      expect(eng.planAging()).toEqual([]);
    });

    it("removeRegistryEntry deletes the row", () => {
      eng.upsertRegistryEntry(entry(H1));
      expect(eng.removeRegistryEntry(H1)).toBe(true);
      expect(eng.getRegistryEntry(H1)).toBeUndefined();
    });
  });
});
