/**
 * CADReplicationDurabilityEngine.test.ts — U-FS-11 (PHASE-47)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADReplicationDurabilityEngine,
  type DurabilityClock,
} from "../engines/CADReplicationDurabilityEngine.js";

const HASH = (c: string) => c.repeat(64);
const H1 = HASH("a");

function makeClock(start = "2026-01-01T00:00:00Z"): DurabilityClock & {
  advanceSeconds(s: number): void;
  setIso(iso: string): void;
} {
  let t = new Date(start).getTime();
  return {
    now: () => new Date(t).toISOString(),
    advanceSeconds: (s) => {
      t += s * 1000;
    },
    setIso: (iso) => {
      t = new Date(iso).getTime();
    },
  };
}

describe("CADReplicationDurabilityEngine (U-FS-11)", () => {
  let eng: CADReplicationDurabilityEngine;
  let clock: ReturnType<typeof makeClock>;

  beforeEach(() => {
    clock = makeClock();
    eng = new CADReplicationDurabilityEngine({ clock });
  });

  describe("registerReplica + health roll-up (non-erasure)", () => {
    it("one replica → critical", () => {
      const r = eng.registerReplica(H1, {
        tier: "local",
        region: "dc1",
        uri: "/local/a",
        sizeBytes: 1024,
      });
      expect(r.health).toBe("critical");
    });

    it("two replicas → degraded", () => {
      eng.registerReplica(H1, {
        tier: "local",
        region: "dc1",
        uri: "/local/a",
        sizeBytes: 1024,
      });
      const r = eng.registerReplica(H1, {
        tier: "s3_standard",
        region: "us-east-1",
        uri: "s3://bk/a",
        sizeBytes: 1024,
      });
      expect(r.health).toBe("degraded");
    });

    it("three replicas → healthy", () => {
      eng.registerReplica(H1, {
        tier: "local",
        region: "dc1",
        uri: "/a",
        sizeBytes: 1024,
      });
      eng.registerReplica(H1, {
        tier: "s3_standard",
        region: "us-east-1",
        uri: "s3://a",
        sizeBytes: 1024,
      });
      const r = eng.registerReplica(H1, {
        tier: "glacier",
        region: "us-west-2",
        uri: "glacier://a",
        sizeBytes: 1024,
      });
      expect(r.health).toBe("healthy");
    });

    it("idempotent re-register at same (tier, region) replaces entry", () => {
      eng.registerReplica(H1, {
        tier: "local",
        region: "dc1",
        uri: "/v1",
        sizeBytes: 100,
      });
      const r2 = eng.registerReplica(H1, {
        tier: "local",
        region: "dc1",
        uri: "/v2",
        sizeBytes: 200,
      });
      expect(r2.replicas.length).toBe(1);
      expect(r2.replicas[0].uri).toBe("/v2");
    });
  });

  describe("erasure coding (Reed-Solomon)", () => {
    it("rs_10_4: 10 shards → critical, 11+ → degraded, 14 → healthy", () => {
      for (let i = 0; i < 10; i++) {
        eng.registerShard(H1, "rs_10_4", {
          shardIndex: i,
          isParity: false,
          shardHash: HASH((i).toString(16).padStart(1, "0").repeat(1) === "0" ? "1" : "b"),
          sizeBytes: 100,
          location: { tier: "s3_standard", region: "us-east-1", uri: `s3://a/${i}`, sizeBytes: 100 },
        });
      }
      const critical = eng.get(H1)!;
      expect(critical.health).toBe("critical");
      // Add 1 parity → 11 shards → degraded
      eng.registerShard(H1, "rs_10_4", {
        shardIndex: 10,
        isParity: true,
        shardHash: HASH("c"),
        sizeBytes: 100,
        location: { tier: "s3_standard", region: "us-east-1", uri: "s3://a/p10", sizeBytes: 100 },
      });
      expect(eng.get(H1)!.health).toBe("degraded");
      // Add 3 more parity → 14 shards → healthy
      for (let i = 11; i < 14; i++) {
        eng.registerShard(H1, "rs_10_4", {
          shardIndex: i,
          isParity: true,
          shardHash: HASH(i.toString(16).repeat(1) === "" ? "d" : "e"),
          sizeBytes: 100,
          location: {
            tier: "s3_standard",
            region: "us-east-1",
            uri: `s3://a/p${i}`,
            sizeBytes: 100,
          },
        });
      }
      expect(eng.get(H1)!.health).toBe("healthy");
    });

    it("rejects mismatched erasure scheme", () => {
      eng.registerShard(H1, "rs_4_2", {
        shardIndex: 0,
        isParity: false,
        shardHash: HASH("a"),
        sizeBytes: 100,
        location: { tier: "local", region: "dc1", uri: "/s0", sizeBytes: 100 },
      });
      expect(() =>
        eng.registerShard(H1, "rs_10_4", {
          shardIndex: 0,
          isParity: false,
          shardHash: HASH("b"),
          sizeBytes: 100,
          location: { tier: "local", region: "dc1", uri: "/s0b", sizeBytes: 100 },
        }),
      ).toThrow(/Scheme mismatch/);
    });

    it("rejects shardIndex out of range", () => {
      expect(() =>
        eng.registerShard(H1, "rs_4_2", {
          shardIndex: 10,
          isParity: false,
          shardHash: HASH("a"),
          sizeBytes: 100,
          location: { tier: "local", region: "dc1", uri: "/s", sizeBytes: 100 },
        }),
      ).toThrow(/out of range/);
    });
  });

  describe("loss handling", () => {
    it("markReplicaLost downgrades health", () => {
      eng.registerReplica(H1, {
        tier: "local",
        region: "dc1",
        uri: "/a",
        sizeBytes: 100,
      });
      eng.registerReplica(H1, {
        tier: "s3_standard",
        region: "us-east-1",
        uri: "s3://a",
        sizeBytes: 100,
      });
      eng.registerReplica(H1, {
        tier: "glacier",
        region: "us-west-2",
        uri: "g://a",
        sizeBytes: 100,
      });
      expect(eng.get(H1)!.health).toBe("healthy");
      eng.markReplicaLost(H1, "glacier", "us-west-2");
      expect(eng.get(H1)!.health).toBe("degraded");
    });

    it("markShardLost below k → lost", () => {
      eng.registerShard(H1, "rs_4_2", {
        shardIndex: 0,
        isParity: false,
        shardHash: HASH("a"),
        sizeBytes: 100,
        location: { tier: "local", region: "dc1", uri: "/0", sizeBytes: 100 },
      });
      eng.registerShard(H1, "rs_4_2", {
        shardIndex: 1,
        isParity: false,
        shardHash: HASH("b"),
        sizeBytes: 100,
        location: { tier: "local", region: "dc1", uri: "/1", sizeBytes: 100 },
      });
      eng.registerShard(H1, "rs_4_2", {
        shardIndex: 2,
        isParity: false,
        shardHash: HASH("c"),
        sizeBytes: 100,
        location: { tier: "local", region: "dc1", uri: "/2", sizeBytes: 100 },
      });
      expect(eng.get(H1)!.health).toBe("lost"); // 3 < k=4
    });
  });

  describe("assess + target", () => {
    it("assesses distinct regions + tiers + meetsTarget", () => {
      eng.registerReplica(H1, {
        tier: "local",
        region: "dc1",
        uri: "/a",
        sizeBytes: 100,
      });
      eng.registerReplica(H1, {
        tier: "s3_standard",
        region: "us-east-1",
        uri: "s3://a",
        sizeBytes: 100,
      });
      const a = eng.assess(H1);
      expect(a.copies).toBe(2);
      expect(a.distinctRegions).toBe(2);
      expect(a.distinctTiers).toBe(2);
    });

    it("setTarget updates durability target", () => {
      eng.setTarget({ rpoSeconds: 60 });
      expect(eng.currentTarget.rpoSeconds).toBe(60);
    });
  });

  describe("RPO breach detection", () => {
    it("flags records whose sync is older than RPO", () => {
      eng.setTarget({ rpoSeconds: 60 });
      eng.registerReplica(H1, {
        tier: "s3_standard",
        region: "us-east-1",
        uri: "s3://a",
        sizeBytes: 100,
      });
      expect(eng.rpoBreached().length).toBe(0);
      clock.advanceSeconds(120); // 2 min > 60s RPO
      expect(eng.rpoBreached().length).toBe(1);
    });
  });

  describe("CRDT merge", () => {
    it("remote wins on higher lastSyncedAt per (tier, region)", () => {
      eng.registerReplica(H1, {
        tier: "local",
        region: "dc1",
        uri: "/local-v1",
        sizeBytes: 100,
        lastSyncedAt: "2026-01-01T00:00:00Z",
      });
      const remoteRec = {
        contentHash: H1,
        replicas: [
          {
            tier: "local" as const,
            region: "dc1",
            uri: "/local-v2",
            sizeBytes: 100,
            lastSyncedAt: "2026-02-01T00:00:00Z",
            coldTier: false,
          },
          {
            tier: "s3_standard" as const,
            region: "us-east-1",
            uri: "s3://a",
            sizeBytes: 100,
            lastSyncedAt: "2026-02-01T00:00:00Z",
            coldTier: false,
          },
        ],
        shards: [],
        health: "degraded" as const,
        lamportClock: 5,
        lastCheckedAt: "2026-02-01T00:00:00Z",
      };
      const merged = eng.merge(remoteRec);
      const local = merged.replicas.find((r) => r.tier === "local")!;
      expect(local.uri).toBe("/local-v2"); // remote won LWW
      expect(merged.replicas.length).toBe(2);
    });

    it("merge is commutative wrt final replica set", () => {
      const engB = new CADReplicationDurabilityEngine({ clock });
      eng.registerReplica(H1, {
        tier: "local",
        region: "dc1",
        uri: "/A",
        sizeBytes: 100,
      });
      engB.registerReplica(H1, {
        tier: "s3_standard",
        region: "us-east-1",
        uri: "/B",
        sizeBytes: 100,
      });
      eng.merge(engB.get(H1)!);
      engB.merge(eng.get(H1)!);
      expect(eng.get(H1)!.replicas.length).toBe(2);
      expect(engB.get(H1)!.replicas.length).toBe(2);
    });

    it("merge adopts remote record when local absent", () => {
      const engB = new CADReplicationDurabilityEngine({ clock });
      engB.registerReplica(H1, {
        tier: "local",
        region: "dc1",
        uri: "/fresh",
        sizeBytes: 100,
      });
      eng.merge(engB.get(H1)!);
      expect(eng.get(H1)?.replicas.length).toBe(1);
    });
  });
});
