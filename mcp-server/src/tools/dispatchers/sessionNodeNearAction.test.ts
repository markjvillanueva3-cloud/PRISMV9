/**
 * Tests for sessionNodeNearAction.ts -- the prism_session:node_near runner.
 * Pure given an injected runCli spy; asserts param normalization, the happy
 * path, and every fail-soft branch (R9 -- real assertions, no stubs).
 */
import { describe, it, expect } from "vitest";
import {
  normalizeNearParams, runNodeNearAction, DEFAULT_NEAR_K, MAX_NEAR_K,
} from "./sessionNodeNearAction.js";

const GOOD = JSON.stringify({
  id: "eng.Foo", k: 3, total: 60218,
  neighbors: [
    { id: "eng.Bar", score: 0.98, label: "Bar", layer: "L6", kind: "eng" },
    { id: "eng.Baz", score: 0.91, label: "Baz", layer: "L6", kind: "eng" },
  ],
});

describe("normalizeNearParams", () => {
  it("resolves id from id / nodeId / node aliases", () => {
    expect(normalizeNearParams({ id: "a" }).id).toBe("a");
    expect(normalizeNearParams({ nodeId: "b" }).id).toBe("b");
    expect(normalizeNearParams({ node: "c" }).id).toBe("c");
  });
  it("trims and rejects blank / non-string ids", () => {
    expect(normalizeNearParams({ id: "  x  " }).id).toBe("x");
    expect(normalizeNearParams({ id: "   " }).id).toBeNull();
    expect(normalizeNearParams({ id: 42 }).id).toBeNull();
    expect(normalizeNearParams({}).id).toBeNull();
  });
  it("defaults k to 10, accepts number/string, caps at MAX_NEAR_K, rejects non-positive", () => {
    expect(normalizeNearParams({ id: "a" }).k).toBe(DEFAULT_NEAR_K);
    expect(normalizeNearParams({ id: "a", k: 5 }).k).toBe(5);
    expect(normalizeNearParams({ id: "a", k: "7" }).k).toBe(7);
    expect(normalizeNearParams({ id: "a", k: 9999 }).k).toBe(MAX_NEAR_K);
    expect(normalizeNearParams({ id: "a", k: 0 }).k).toBe(DEFAULT_NEAR_K);
    expect(normalizeNearParams({ id: "a", k: -3 }).k).toBe(DEFAULT_NEAR_K);
    expect(normalizeNearParams({ id: "a", k: "bad" }).k).toBe(DEFAULT_NEAR_K);
  });
});

describe("runNodeNearAction", () => {
  it("happy path: passes id+k to runCli and normalizes the CLI JSON", () => {
    let seenId = "", seenK = -1;
    const res = runNodeNearAction({ id: "eng.Foo", k: 3 }, {
      runCli: (id, k) => { seenId = id; seenK = k; return GOOD; },
    });
    expect(seenId).toBe("eng.Foo");
    expect(seenK).toBe(3);
    expect(res.success).toBe(true);
    expect(res.id).toBe("eng.Foo");
    expect(res.total).toBe(60218);
    expect(res.neighbors).toHaveLength(2);
    expect((res.neighbors as Array<{ id: string }>)[0].id).toBe("eng.Bar");
  });

  it("no id -> fail-soft error (never throws)", () => {
    const res = runNodeNearAction({}, { runCli: () => GOOD });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/requires params.id/);
  });

  it("runCli throw (e.g. ENOEMBED) -> fail-soft error", () => {
    const res = runNodeNearAction({ id: "ghost" }, {
      runCli: () => { throw new Error("no embedding for node id \"ghost\""); },
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/search failed/);
    expect(res.error).toMatch(/no embedding/);
  });

  it("non-JSON CLI output -> fail-soft error", () => {
    const res = runNodeNearAction({ id: "a" }, { runCli: () => "not json at all" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non-JSON/);
  });

  it("JSON missing neighbors[] -> fail-soft error", () => {
    const res = runNodeNearAction({ id: "a" }, { runCli: () => JSON.stringify({ id: "a", k: 10 }) });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/missing neighbors/);
  });

  it("ignores params.ids (single-id action; only id/nodeId/node are read)", () => {
    // node_card takes ids[]; node_near is single-id -> an ids[] alone yields no id.
    const res = runNodeNearAction({ ids: ["a", "b"] }, { runCli: () => GOOD });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/requires params.id/);
  });

  it("caps k at MAX_NEAR_K before forwarding to runCli (argv cannot be inflated)", () => {
    let seenK = -1;
    const res = runNodeNearAction({ id: "a", k: 9999 }, { runCli: (_id, k) => { seenK = k; return GOOD; } });
    expect(seenK).toBe(MAX_NEAR_K);   // 9999 -> 100, never passed raw to the CLI
    expect(res.success).toBe(true);
  });
});
