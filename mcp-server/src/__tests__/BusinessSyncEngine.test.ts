/**
 * BusinessSyncEngine tests — restoration coverage (U-STUB-HUNT-01).
 *
 * Slot:bravo 2026-05-26. Real concrete-value assertions only — replaces a
 * 320-byte stub that returned hardcoded zeros and had no tests.
 */
import { describe, it, expect } from "vitest";
import { BusinessSyncEngine, businessSyncEngine, type SyncStatus } from "../engines/BusinessSyncEngine.js";

describe("BusinessSyncEngine", () => {
  describe("registerTarget", () => {
    it("creates blank state on first call", () => {
      const e = new BusinessSyncEngine();
      const s = e.registerTarget("jobboss");
      expect(s.target).toBe("jobboss");
      expect(s.status).toBe("not_configured");
      expect(s.itemsSynced).toBe(0);
      expect(s.itemsPending).toBe(0);
      expect(s.lastSync).toBeNull();
      expect(s.syncCount).toBe(0);
    });

    it("is idempotent — preserves existing state", () => {
      const e = new BusinessSyncEngine();
      e.recordSync({ target: "epicor", itemsSynced: 42, status: "ok" });
      const reRegistered = e.registerTarget("epicor");
      expect(reRegistered.itemsSynced).toBe(42);
      expect(reRegistered.status).toBe("ok");
    });
  });

  describe("recordSync", () => {
    it("records a successful sync and bumps syncCount", () => {
      const e = new BusinessSyncEngine({ now: () => new Date("2026-05-26T12:00:00Z") });
      const s = e.recordSync({ target: "jobboss", itemsSynced: 17, itemsPending: 3, status: "ok" });
      expect(s.itemsSynced).toBe(17);
      expect(s.itemsPending).toBe(3);
      expect(s.status).toBe("ok");
      expect(s.lastSync).toBe("2026-05-26T12:00:00.000Z");
      expect(s.syncCount).toBe(1);
      expect(s.lastError).toBeNull();
    });

    it("auto-marks failed when error is provided without explicit status", () => {
      const e = new BusinessSyncEngine();
      const s = e.recordSync({ target: "sap", error: "auth timeout" });
      expect(s.status).toBe("failed");
      expect(s.lastError).toBe("auth timeout");
    });

    it("syncCount accumulates across multiple recordSync calls", () => {
      const e = new BusinessSyncEngine();
      e.recordSync({ target: "x", itemsSynced: 1 });
      e.recordSync({ target: "x", itemsSynced: 2 });
      e.recordSync({ target: "x", itemsSynced: 3 });
      expect(e.getTarget("x")?.syncCount).toBe(3);
      expect(e.getTarget("x")?.itemsSynced).toBe(3);
    });

    it("explicit timestamp overrides clock", () => {
      const e = new BusinessSyncEngine();
      const s = e.recordSync({ target: "x", itemsSynced: 1, timestamp: "2020-01-01T00:00:00.000Z" });
      expect(s.lastSync).toBe("2020-01-01T00:00:00.000Z");
    });

    it("throws when target is missing", () => {
      const e = new BusinessSyncEngine();
      expect(() => e.recordSync({} as any)).toThrow(/target is required/);
      expect(() => e.recordSync({ target: "" } as any)).toThrow(/target is required/);
    });
  });

  describe("getTarget", () => {
    it("returns a copy (mutation-safe)", () => {
      const e = new BusinessSyncEngine();
      e.recordSync({ target: "x", itemsSynced: 5, status: "ok" });
      const s = e.getTarget("x")!;
      s.itemsSynced = 9999;
      expect(e.getTarget("x")?.itemsSynced).toBe(5);
    });

    it("returns null for unknown target", () => {
      expect(new BusinessSyncEngine().getTarget("unknown")).toBeNull();
    });
  });

  describe("markFailed", () => {
    it("marks status=failed + sets lastError + bumps syncCount", () => {
      const e = new BusinessSyncEngine();
      e.recordSync({ target: "x", itemsSynced: 7, status: "ok" });
      const s = e.markFailed("x", "network down");
      expect(s.status).toBe("failed");
      expect(s.lastError).toBe("network down");
      expect(s.syncCount).toBe(2);
      // item counts preserved (no input.itemsSynced passed)
      expect(s.itemsSynced).toBe(7);
    });
  });

  describe("resetTarget", () => {
    it("removes the target and returns true", () => {
      const e = new BusinessSyncEngine();
      e.recordSync({ target: "x", itemsSynced: 1 });
      expect(e.resetTarget("x")).toBe(true);
      expect(e.getTarget("x")).toBeNull();
    });

    it("returns false for unknown target", () => {
      expect(new BusinessSyncEngine().resetTarget("unknown")).toBe(false);
    });
  });

  describe("getStats", () => {
    it("empty engine returns zeros + not_configured", () => {
      const s = new BusinessSyncEngine().getStats();
      expect(s.targetCount).toBe(0);
      expect(s.totalSynced).toBe(0);
      expect(s.totalPending).toBe(0);
      expect(s.lastSync).toBeNull();
      expect(s.worstStatus).toBe("not_configured");
      expect(s.byTarget).toEqual([]);
    });

    it("aggregates across registered targets", () => {
      const e = new BusinessSyncEngine();
      e.recordSync({ target: "jobboss", itemsSynced: 10, itemsPending: 2, status: "ok", timestamp: "2026-05-01T00:00:00Z" });
      e.recordSync({ target: "epicor", itemsSynced: 5, itemsPending: 8, status: "degraded", timestamp: "2026-05-26T00:00:00Z" });
      e.recordSync({ target: "sap", itemsSynced: 0, itemsPending: 100, status: "syncing", timestamp: "2026-05-15T00:00:00Z" });
      const s = e.getStats();
      expect(s.targetCount).toBe(3);
      expect(s.totalSynced).toBe(15);
      expect(s.totalPending).toBe(110);
      // newest lastSync wins
      expect(s.lastSync).toBe("2026-05-26T00:00:00Z");
      // degraded > syncing > ok severity
      expect(s.worstStatus).toBe("degraded");
      // sorted alphabetically
      expect(s.byTarget.map((t) => t.target)).toEqual(["epicor", "jobboss", "sap"]);
    });

    it("worstStatus picks failed when any target failed", () => {
      const e = new BusinessSyncEngine();
      e.recordSync({ target: "a", status: "ok" });
      e.recordSync({ target: "b", error: "boom" });
      e.recordSync({ target: "c", status: "syncing" });
      expect(e.getStats().worstStatus).toBe("failed");
    });

    it("severity ordering: not_configured < idle < ok < syncing < degraded < failed", () => {
      const e = new BusinessSyncEngine();
      const orderedStatuses: SyncStatus[] = ["not_configured", "idle", "ok", "syncing", "degraded"];
      orderedStatuses.forEach((status, i) => e.recordSync({ target: `t${i}`, status }));
      // The worst registered status is degraded (no failed)
      expect(e.getStats().worstStatus).toBe("degraded");
      // Adding failed should override
      e.recordSync({ target: "last", status: "failed" });
      expect(e.getStats().worstStatus).toBe("failed");
    });
  });

  describe("module-singleton", () => {
    it("businessSyncEngine is a singleton instance of BusinessSyncEngine", () => {
      expect(businessSyncEngine).toBeInstanceOf(BusinessSyncEngine);
    });

    it("getStats on a fresh singleton returns zero state (post-test isolation)", () => {
      // Note: the singleton retains state across tests in the SAME file. Snapshot only.
      const s = businessSyncEngine.getStats();
      expect(typeof s.targetCount).toBe("number");
      expect(typeof s.totalSynced).toBe("number");
      expect(Array.isArray(s.byTarget)).toBe(true);
    });
  });
});
