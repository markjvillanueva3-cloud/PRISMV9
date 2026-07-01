/**
 * BusinessStore.cache-regression
 * ==============================
 *
 * Regression lock for MISC-008 (P0 data-loss bug):
 *   "Fix getStore() data-loss bug — cache store instances so flush does not
 *    create empty InMemory store losing data"
 *
 * The fix lives at db/BusinessStore.ts:786-812 ("P0-1: instance cache —
 * same entity always returns same store instance"). Existing tests use
 * getStore() but none assert the *identity* invariant — so a future
 * refactor could silently re-introduce the bug by removing the cache,
 * and the type-checker would still pass.
 *
 * This file locks 3 behaviors:
 *   1. Same entity returns the SAME instance (reference equality, not deep-equal).
 *   2. Different entities return DIFFERENT instances (no accidental aliasing).
 *   3. resetStoreCache() actually clears the cache (post-reset instance is fresh).
 *
 * Coverage rationale: identity equality is the only assertion that catches
 * the original bug (returning a new empty InMemory store on every call,
 * which deep-equals to the previous empty store but loses every write).
 *
 * @unit MISC-008 (close-out)
 * @slot mike
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getStore, resetStoreCache } from "../db/BusinessStore.js";

beforeEach(() => {
  resetStoreCache();
});

describe("BusinessStore / instance-cache regression (MISC-008 close-out)", () => {
  it("returns the SAME instance for repeated calls with the same entity (reference equality)", () => {
    const a = getStore("materials");
    const b = getStore("materials");
    // Reference equality is the only assertion that catches the original bug:
    // a fresh-instance-per-call returns a new empty store on each invocation,
    // which still deep-equals the previous empty store but loses every write.
    expect(a).toBe(b);
  });

  it("returns DIFFERENT instances for different entities (no cache-key collision)", () => {
    const materials = getStore("materials");
    const machines = getStore("machines");
    expect(materials).not.toBe(machines);
  });

  it("data written through one handle is visible through a second getStore() call", async () => {
    // The functional consequence of the cache: after a writer-peer saves a record,
    // a reader-peer that re-calls getStore() for the same entity must see it.
    // Without the instance cache, the reader gets a fresh empty InMemory store
    // and findById returns no-record (the original data-loss symptom).
    const writer = getStore<{ id: string; name: string; sku: string }>("materials");
    const seedId = "regression-seed-MISC008";
    const saveRes = await writer.save({ id: seedId, name: "Cache Lock Test", sku: "RST-001" });
    expect(saveRes.ok).toBe(true);

    const reader = getStore<{ id: string; name: string; sku: string }>("materials");
    const found = await reader.findById(seedId);
    expect(found.ok).toBe(true);
    expect(found.data?.id).toBe(seedId);
    expect(found.data?.name).toBe("Cache Lock Test");

    // Cleanup so this test doesn't pollute other tests sharing the process.
    await reader.delete(seedId);
  });

  it("resetStoreCache() truly clears the cache (post-reset instance is fresh)", () => {
    const before = getStore("materials");
    resetStoreCache();
    const after = getStore("materials");
    // Post-reset must produce a *different* instance — proves the cache was emptied.
    expect(after).not.toBe(before);
  });

  it("unknown entity throws (no silent fallback that would mask config drift)", () => {
    expect(() => getStore("definitely-not-a-real-entity-xyz")).toThrow(/Unknown entity/);
  });
});
