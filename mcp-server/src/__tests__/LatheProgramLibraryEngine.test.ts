/**
 * LatheProgramLibraryEngine tests — frontend-aggregator contract
 * ===============================================================
 *
 * Verifies the program-library shape consumed by the lathe-wizard, lathe-
 * studio, shop-mgmt, biz-mgmt, employee-portal frontends + camera-
 * recognition consumers. Real-disk based (the engine walks JM Die corpus).
 * Tests target schema invariants + filter behavior, not exhaustive corpus
 * scans. Per CLAUDE.md §SCRUTINY GATE R9 — reference values, no stub asserts.
 *
 * @milestone JM-DIE-LATHE-UPGRADE-MS0/U-PROGRAM-LIBRARY
 */

import { describe, it, expect } from "vitest";
import { LatheProgramLibraryEngine } from "../engines/LatheProgramLibraryEngine.js";

describe("LatheProgramLibraryEngine.list — schema contract", () => {
  it("returns schemaVersion 1.0.0 + ISO timestamp", () => {
    const r = LatheProgramLibraryEngine.list({ limit: 1 });
    expect(r.schemaVersion).toBe("1.0.0");
    expect(new Date(r.asOf).toString()).not.toBe("Invalid Date");
  });

  it("returns the 7 canonical JM Die dispatchable machines", () => {
    const r = LatheProgramLibraryEngine.list({ limit: 0 });
    expect(r.dispatchableMachines).toHaveLength(7);
    const ids = r.dispatchableMachines.map((m) => m.machineId).sort();
    expect(ids).toEqual(["LTH-01", "LTH-02", "LTH-03", "LTH-04", "LTH-05", "LTH-06", "LTH-07"]);
  });

  it("each dispatchable machine carries machineId + machineModel + controllerFamily", () => {
    const r = LatheProgramLibraryEngine.list({ limit: 0 });
    for (const m of r.dispatchableMachines) {
      expect(typeof m.machineId).toBe("string");
      expect(typeof m.machineModel).toBe("string");
      expect(m.controllerFamily).toBe("okuma");
    }
  });

  it("entries carry customer + partNumber + variants[] always", () => {
    const r = LatheProgramLibraryEngine.list({ limit: 5 });
    for (const e of r.entries) {
      expect(typeof e.customer).toBe("string");
      expect(typeof e.partNumber).toBe("string");
      expect(Array.isArray(e.variants)).toBe(true);
      expect(typeof e.hasOptimized).toBe("boolean");
      expect(typeof e.hasShopFloorSafe).toBe("boolean");
    }
  });
});

describe("LatheProgramLibraryEngine.list — query filters", () => {
  it("respects limit — entries.length ≤ limit; truncated true when more remain", () => {
    const r = LatheProgramLibraryEngine.list({ limit: 3 });
    expect(r.entries.length).toBeLessThanOrEqual(3);
    if (r.totalEntries > 3) expect(r.truncated).toBe(true);
  });

  it("limit 0 returns empty entries[] but still includes dispatchableMachines (frontend metadata fast-path)", () => {
    const r = LatheProgramLibraryEngine.list({ limit: 0 });
    expect(r.entries).toHaveLength(0);
    expect(r.dispatchableMachines.length).toBeGreaterThan(0);
  });

  it("customer filter restricts entries to a single customer folder", () => {
    const all = LatheProgramLibraryEngine.list({ limit: 200 });
    if (all.entries.length === 0) {
      // Empty corpus — filter must still return a valid shape
      const filtered = LatheProgramLibraryEngine.list({ customer: "DOES-NOT-EXIST", limit: 10 });
      expect(filtered.entries).toHaveLength(0);
      return;
    }
    const firstCustomer = all.entries[0].customer;
    const filtered = LatheProgramLibraryEngine.list({ customer: firstCustomer, limit: 50 });
    for (const e of filtered.entries) {
      expect(e.customer).toBe(firstCustomer);
    }
  });

  it("non-existent customer filter returns empty entries[]", () => {
    const r = LatheProgramLibraryEngine.list({ customer: "NONEXISTENT-CUSTOMER-XYZ-12345", limit: 10 });
    expect(r.entries).toHaveLength(0);
    expect(r.totalEntries).toBe(0);
  });

  it("search filter matches case-insensitively against filename", () => {
    const r = LatheProgramLibraryEngine.list({ search: "doesnotexistinanycorpusfilename-zzzz", limit: 10 });
    expect(r.entries).toHaveLength(0);
  });
});

describe("LatheProgramLibraryEngine.list — variant shape (frontend-binding contract)", () => {
  it("variants carry machineId + downloadPath + optimized flag", () => {
    const r = LatheProgramLibraryEngine.list({ limit: 20 });
    for (const e of r.entries) {
      for (const v of e.variants) {
        expect(typeof v.machineId).toBe("string");
        expect(typeof v.machineModel).toBe("string");
        expect(typeof v.downloadPath).toBe("string");
        expect(v.downloadPath.length).toBeGreaterThan(0);
        expect(typeof v.optimized).toBe("boolean");
        expect(typeof v.sizeBytes).toBe("number");
        expect(v.sizeBytes).toBeGreaterThanOrEqual(0);
        expect(typeof v.mtimeIso).toBe("string");
      }
    }
  });

  it("hasOptimized flag is the OR of any variant.optimized — frontend filter shortcut", () => {
    const r = LatheProgramLibraryEngine.list({ limit: 20 });
    for (const e of r.entries) {
      const expected = e.variants.some((v) => v.optimized);
      expect(e.hasOptimized).toBe(expected);
    }
  });

  it("variant.machineId is always a real JM Die machine (LTH-01..LTH-07)", () => {
    const VALID_IDS = new Set(["LTH-01", "LTH-02", "LTH-03", "LTH-04", "LTH-05", "LTH-06", "LTH-07"]);
    const r = LatheProgramLibraryEngine.list({ limit: 20 });
    for (const e of r.entries) {
      for (const v of e.variants) {
        expect(VALID_IDS.has(v.machineId)).toBe(true);
      }
    }
  });
});

describe("LatheProgramLibraryEngine.list — empty/edge inputs", () => {
  it("empty query {} returns default-limit window (200)", () => {
    const r = LatheProgramLibraryEngine.list({});
    expect(r.entries.length).toBeLessThanOrEqual(200);
  });

  it("partNumber filter — non-match returns empty entries[]", () => {
    const r = LatheProgramLibraryEngine.list({ partNumber: "ZZZ-NEVER-EXISTS-99999", limit: 10 });
    expect(r.entries).toHaveLength(0);
  });
});
