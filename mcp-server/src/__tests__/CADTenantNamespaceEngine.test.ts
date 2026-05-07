/**
 * CADTenantNamespaceEngine.test.ts — U-FS-07 (PHASE-47)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADTenantNamespaceEngine,
  type TenantClock,
} from "../engines/CADTenantNamespaceEngine.js";

const HASH = (c: string) => c.repeat(64);

function makeClock(startIso = "2026-01-01T00:00:00Z"): TenantClock & {
  advanceDays(n: number): void;
} {
  let t = new Date(startIso).getTime();
  return {
    now: () => new Date(t).toISOString(),
    advanceDays(n) {
      t += n * 86400 * 1000;
    },
  };
}

describe("CADTenantNamespaceEngine (U-FS-07)", () => {
  let clock: ReturnType<typeof makeClock>;
  let eng: CADTenantNamespaceEngine;

  beforeEach(() => {
    clock = makeClock();
    eng = new CADTenantNamespaceEngine(clock);
  });

  describe("register + retrieve", () => {
    it("registers content with private default visibility", () => {
      const r = eng.register({
        tenantId: "JMDIE",
        contentHash: HASH("a"),
        canonicalName: "PN-0100",
      });
      expect(r.visibility).toBe("private");
      expect(r.retentionClass).toBe("standard");
      expect(r.retentionExpiresAt).toBeTruthy();
    });

    it("supports public + shared visibility", () => {
      eng.register({
        tenantId: "JMDIE",
        contentHash: HASH("b"),
        canonicalName: "STD-BOLT",
        visibility: "public",
      });
      const shared = eng.register({
        tenantId: "ALCOA",
        contentHash: HASH("c"),
        canonicalName: "ALCOA-100",
        visibility: "shared",
        sharedWith: ["JMDIE"],
      });
      expect(shared.sharedWith).toEqual(["JMDIE"]);
    });
  });

  describe("access control", () => {
    beforeEach(() => {
      eng.register({
        tenantId: "ALCOA",
        contentHash: HASH("1"),
        canonicalName: "alcoa-private",
      });
      eng.register({
        tenantId: "ALCOA",
        contentHash: HASH("2"),
        canonicalName: "alcoa-shared",
        visibility: "shared",
        sharedWith: ["JMDIE"],
      });
      eng.register({
        tenantId: "ALCOA",
        contentHash: HASH("3"),
        canonicalName: "alcoa-public",
        visibility: "public",
      });
    });

    it("owner always has access", () => {
      const r = eng.get("ALCOA", HASH("1"))!;
      const res = eng.canAccess("ALCOA", r);
      expect(res.allowed).toBe(true);
      expect(res.reason).toBe("owner");
    });

    it("blocks private content from other tenants", () => {
      const r = eng.get("ALCOA", HASH("1"))!;
      const res = eng.canAccess("JMDIE", r);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("private");
    });

    it("allows shared content for listed tenant", () => {
      const r = eng.get("ALCOA", HASH("2"))!;
      expect(eng.canAccess("JMDIE", r).allowed).toBe(true);
      expect(eng.canAccess("ITW", r).allowed).toBe(false);
    });

    it("allows public content for anyone", () => {
      const r = eng.get("ALCOA", HASH("3"))!;
      expect(eng.canAccess("JMDIE", r).allowed).toBe(true);
      expect(eng.canAccess("ITW", r).allowed).toBe(true);
    });
  });

  describe("NDA gating", () => {
    it("blocks access when NDA required + not signed", () => {
      eng.register({
        tenantId: "ALCOA",
        contentHash: HASH("4"),
        canonicalName: "secret",
        visibility: "shared",
        sharedWith: ["JMDIE"],
        ndaRequired: true,
        ndaId: "NDA-001",
      });
      const r = eng.get("ALCOA", HASH("4"))!;
      const res = eng.canAccess("JMDIE", r);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("nda_not_signed");
    });

    it("unblocks access after signNDA", () => {
      eng.register({
        tenantId: "ALCOA",
        contentHash: HASH("4"),
        canonicalName: "secret",
        visibility: "shared",
        sharedWith: ["JMDIE"],
        ndaRequired: true,
        ndaId: "NDA-001",
      });
      eng.signNDA("ALCOA", HASH("4"), "JMDIE");
      const r = eng.get("ALCOA", HASH("4"))!;
      expect(eng.canAccess("JMDIE", r).allowed).toBe(true);
    });

    it("throws signNDA when no gate configured", () => {
      eng.register({
        tenantId: "ALCOA",
        contentHash: HASH("5"),
        canonicalName: "plain",
      });
      expect(() => eng.signNDA("ALCOA", HASH("5"), "JMDIE")).toThrow(/No NDA/);
    });
  });

  describe("cross-tenant collisions", () => {
    it("flags identical hash across two tenants (high severity)", () => {
      eng.register({ tenantId: "A", contentHash: HASH("c"), canonicalName: "x" });
      eng.register({ tenantId: "B", contentHash: HASH("c"), canonicalName: "x" });
      const coll = eng.findCollisions();
      expect(coll.length).toBe(1);
      expect(coll[0].tenants.sort()).toEqual(["A", "B"]);
      expect(coll[0].severity).toBe("high"); // both private
    });

    it("critical severity on 3+ private tenants", () => {
      eng.register({ tenantId: "A", contentHash: HASH("d"), canonicalName: "x" });
      eng.register({ tenantId: "B", contentHash: HASH("d"), canonicalName: "x" });
      eng.register({ tenantId: "C", contentHash: HASH("d"), canonicalName: "x" });
      const coll = eng.findCollisions();
      expect(coll[0].severity).toBe("critical");
    });

    it("low severity when all visibilities are public", () => {
      eng.register({
        tenantId: "A",
        contentHash: HASH("e"),
        canonicalName: "std",
        visibility: "public",
      });
      eng.register({
        tenantId: "B",
        contentHash: HASH("e"),
        canonicalName: "std",
        visibility: "public",
      });
      const coll = eng.findCollisions();
      expect(coll[0].severity).toBe("low");
    });

    it("does not flag single-tenant content", () => {
      eng.register({ tenantId: "A", contentHash: HASH("f"), canonicalName: "solo" });
      expect(eng.findCollisions().length).toBe(0);
    });
  });

  describe("retention + expiry", () => {
    it("ephemeral expires at 30 days", () => {
      eng.register({
        tenantId: "A",
        contentHash: HASH("0"),
        canonicalName: "temp",
        retentionClass: "ephemeral",
      });
      // day 29 → not expired
      clock.advanceDays(29);
      expect(eng.expiredAsOf().length).toBe(0);
      // day 31 → expired
      clock.advanceDays(2);
      expect(eng.expiredAsOf().length).toBe(1);
    });

    it("setRetention updates expiry relative to createdAt", () => {
      eng.register({
        tenantId: "A",
        contentHash: HASH("0"),
        canonicalName: "x",
        retentionClass: "ephemeral",
      });
      const upgraded = eng.setRetention("A", HASH("0"), "long_term");
      expect(upgraded.retentionClass).toBe("long_term");
      // 20 years ≈ won't expire in days
      clock.advanceDays(100);
      expect(eng.expiredAsOf().length).toBe(0);
    });
  });

  describe("GDPR tombstone", () => {
    it("soft-deletes; canAccess returns content_deleted", () => {
      eng.register({
        tenantId: "A",
        contentHash: HASH("2"),
        canonicalName: "pii",
        visibility: "public",
      });
      eng.tombstone("A", HASH("2"), {
        reason: "GDPR",
        requestedBy: "user@alcoa.com",
        ticketId: "DSR-42",
      });
      const r = eng.get("A", HASH("2"))!;
      expect(r.tombstone).toBeTruthy();
      expect(r.tombstone!.ticketId).toBe("DSR-42");
      const res = eng.canAccess("B", r);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("content_deleted");
    });

    it("tombstoned record no longer collides", () => {
      eng.register({ tenantId: "A", contentHash: HASH("5"), canonicalName: "x" });
      eng.register({ tenantId: "B", contentHash: HASH("5"), canonicalName: "x" });
      expect(eng.findCollisions().length).toBe(1);
      eng.tombstone("A", HASH("5"), { reason: "DSR", requestedBy: "user" });
      expect(eng.findCollisions().length).toBe(0);
    });

    it("listByTenant excludes tombstoned records", () => {
      eng.register({ tenantId: "A", contentHash: HASH("6"), canonicalName: "x" });
      eng.tombstone("A", HASH("6"), { reason: "DSR", requestedBy: "u" });
      expect(eng.listByTenant("A").length).toBe(0);
    });
  });

  describe("exportArchive", () => {
    it("returns all active content for a tenant", () => {
      eng.register({ tenantId: "A", contentHash: HASH("7"), canonicalName: "x1" });
      eng.register({ tenantId: "A", contentHash: HASH("8"), canonicalName: "x2" });
      eng.register({ tenantId: "B", contentHash: HASH("9"), canonicalName: "y1" });
      const arc = eng.exportArchive("A");
      expect(arc.length).toBe(2);
      expect(arc.every((r) => r.tenantId === "A")).toBe(true);
    });
  });
});
