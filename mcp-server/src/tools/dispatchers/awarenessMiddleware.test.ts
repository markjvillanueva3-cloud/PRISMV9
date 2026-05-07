/**
 * Tests for awarenessMiddleware
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  consultAwareness,
  clearAwarenessCache,
  awarenessCacheSize,
} from "./awarenessMiddleware.js";

describe("awarenessMiddleware", () => {
  beforeEach(() => {
    clearAwarenessCache();
  });

  it("returns ok=true for a valid request", async () => {
    const r = await consultAwareness({
      dispatcher: "edm",
      action: "wedm_print_to_program",
      keywords: ["wire_edm", "D2", "25mm"],
    });
    expect(r.ok).toBe(true);
  });

  it("first call is uncached, second identical call hits cache", async () => {
    const req = {
      dispatcher: "edm",
      action: "wedm_print_to_program",
      keywords: ["wire_edm", "D2", "25mm"],
    };
    const first = await consultAwareness(req);
    expect(first.cached).toBe(false);
    const second = await consultAwareness(req);
    expect(second.cached).toBe(true);
  });

  it("cached response has latencyMs === 0", async () => {
    const req = {
      dispatcher: "edm",
      action: "wedm_print_to_program",
      keywords: ["wire_edm", "D2"],
    };
    await consultAwareness(req);
    const second = await consultAwareness(req);
    expect(second.latencyMs).toBe(0);
  });

  it("different keywords produce different cache keys", async () => {
    await consultAwareness({
      dispatcher: "edm",
      action: "a",
      keywords: ["k1"],
    });
    await consultAwareness({
      dispatcher: "edm",
      action: "a",
      keywords: ["k2"],
    });
    expect(awarenessCacheSize()).toBe(2);
  });

  it("clearAwarenessCache empties the cache", async () => {
    await consultAwareness({
      dispatcher: "edm",
      action: "a",
      keywords: ["k"],
    });
    expect(awarenessCacheSize()).toBe(1);
    clearAwarenessCache();
    expect(awarenessCacheSize()).toBe(0);
  });

  it("keyword order does not affect cache key (normalized)", async () => {
    await consultAwareness({
      dispatcher: "edm",
      action: "a",
      keywords: ["x", "y", "z"],
    });
    const r2 = await consultAwareness({
      dispatcher: "edm",
      action: "a",
      keywords: ["z", "y", "x"],
    });
    expect(r2.cached).toBe(true);
  });

  it("response includes summary, topMatches, suggestions arrays", async () => {
    const r = await consultAwareness({
      dispatcher: "edm",
      action: "a",
      keywords: ["k"],
    });
    expect(Array.isArray(r.summary)).toBe(true);
    expect(Array.isArray(r.topMatches)).toBe(true);
    expect(Array.isArray(r.suggestions)).toBe(true);
  });

  it("query field reflects request parameters", async () => {
    const r = await consultAwareness({
      dispatcher: "edm",
      action: "wedm_test",
      keywords: ["foo", "bar"],
    });
    expect(r.query).toContain("edm");
    expect(r.query).toContain("wedm_test");
    expect(r.query).toContain("foo");
  });

  it("cache size never exceeds the max limit", async () => {
    for (let i = 0; i < 150; i++) {
      await consultAwareness({
        dispatcher: "edm",
        action: "a",
        keywords: [`k${i}`],
      });
    }
    expect(awarenessCacheSize()).toBeLessThanOrEqual(128);
  });

  it("latencyMs is a non-negative number", async () => {
    const r = await consultAwareness({
      dispatcher: "edm",
      action: "a",
      keywords: ["k"],
    });
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
