/**
 * SpatialAddressBookEngine.test.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC05
 *
 * Hermetic: an injected node set (no 65MB find-cache load). Covers the 5 spec
 * tests (exact / fuzzy / ambiguous / unknown / malformed) + isCanonical +
 * resolveMany + 2 adversarial cases (concurrent-resolve determinism = no race
 * divergence; node-deleted-while-cached -> isCanonical false, no confident hit).
 */
import { describe, it, expect } from "vitest";
import { spatialAddressBookEngine } from "../engines/SpatialAddressBookEngine.js";
import type { FindCacheNode } from "../engines/GraphRAGRetrievalEngine.js";

const NODES: FindCacheNode[] = [
  { id: "eng.mill", label: "MillEngine", layer: "L6" },
  { id: "eng.mill.toolpath", label: "Mill Toolpath", layer: "L6" },
  { id: "disp.prism_ai", label: "prism_ai", layer: "L4" },
  { id: "eng.lathe", label: "LatheEngine", layer: "L6" },
  { id: "ghost.dup", label: "Duplicate Label", layer: "L9" },
  { id: "ghost.dup2", label: "Duplicate Label", layer: "L9" },
];
const opts = (extra: Record<string, unknown> = {}) => ({ nodes: NODES, ...extra });

describe("resolveAlias -- resolution ladder", () => {
  it("exact-id: the text already IS a canonical id (confidence 1.0)", () => {
    const r = spatialAddressBookEngine.resolveAlias("eng.mill", opts());
    expect(r.method).toBe("exact-id");
    expect(r.nodeId).toBe("eng.mill");
    expect(r.confidence).toBe(1);
  });

  it("exact-label: unique case-insensitive label match", () => {
    const r = spatialAddressBookEngine.resolveAlias("latheengine", opts()); // lower-case alias
    expect(r.method).toBe("exact-label");
    expect(r.nodeId).toBe("eng.lathe");
    expect(r.confidence).toBeCloseTo(0.95, 5);
  });

  it("fuzzy: token-overlap clear winner -> single canonical id", () => {
    const r = spatialAddressBookEngine.resolveAlias("lathe", opts());
    expect(r.method).toBe("fuzzy");
    expect(r.nodeId).toBe("eng.lathe");
    expect(r.confidence).toBeGreaterThan(0.34);
    expect(r.confidence).toBeLessThanOrEqual(0.9);
  });

  it("ambiguous (label): identical labels -> candidate list, no single id", () => {
    const r = spatialAddressBookEngine.resolveAlias("Duplicate Label", opts());
    expect(r.method).toBe("ambiguous");
    expect(r.nodeId).toBeNull();
    expect(r.candidates.map((c) => c.id).sort()).toEqual(["ghost.dup", "ghost.dup2"]);
  });

  it("ambiguous (fuzzy near-tie): 'mill' hits eng.mill and eng.mill.toolpath equally", () => {
    const r = spatialAddressBookEngine.resolveAlias("mill", opts());
    expect(r.method).toBe("ambiguous");
    expect(r.nodeId).toBeNull();
    expect(r.candidates.map((c) => c.id)).toEqual(expect.arrayContaining(["eng.mill", "eng.mill.toolpath"]));
  });

  it("unknown: nothing overlaps -> null, no candidates", () => {
    const r = spatialAddressBookEngine.resolveAlias("zzzqqwxyz", opts());
    expect(r.method).toBe("unknown");
    expect(r.nodeId).toBeNull();
    expect(r.candidates).toEqual([]);
  });

  it("malformed alias (empty / non-string) throws", () => {
    expect(() => spatialAddressBookEngine.resolveAlias("", opts())).toThrow(/non-empty string/);
    expect(() => spatialAddressBookEngine.resolveAlias("   ", opts())).toThrow(/non-empty string/);
    // @ts-expect-error intentional bad type
    expect(() => spatialAddressBookEngine.resolveAlias(null, opts())).toThrow(/non-empty string/);
  });
});

describe("isCanonical", () => {
  it("true for a present id, false for an absent / malformed id", () => {
    expect(spatialAddressBookEngine.isCanonical("eng.mill", opts())).toBe(true);
    expect(spatialAddressBookEngine.isCanonical("eng.gone", opts())).toBe(false);
    expect(spatialAddressBookEngine.isCanonical("", opts())).toBe(false);
  });
});

describe("resolveMany (handoff canonicalization batch)", () => {
  it("resolves each alias; malformed entries degrade to unknown (no throw)", () => {
    const results = spatialAddressBookEngine.resolveMany(["eng.mill", "", "lathe", 123 as any], opts());
    expect(results).toHaveLength(4);
    expect(results[0].method).toBe("exact-id");
    expect(results[1].method).toBe("unknown"); // empty string
    expect(results[2].method).toBe("fuzzy");
    expect(results[3].method).toBe("unknown"); // non-string
  });
  it("throws on a non-array input", () => {
    // @ts-expect-error intentional bad type
    expect(() => spatialAddressBookEngine.resolveMany("not-an-array", opts())).toThrow(/must be an array/);
  });
});

describe("adversarial", () => {
  it("resolution is deterministic + repeatable (no divergence on a fixed graph)", () => {
    // resolveAlias is a pure synchronous function of (text, node set): two callers
    // (here, two sequential invocations) MUST agree. The ASCII tiebreak (score desc,
    // then plain id comparison) removes any locale/ordering nondeterminism, so
    // concurrent chats on a fixed graph converge without coordination.
    const a = spatialAddressBookEngine.resolveAlias("lathe", opts());
    const b = spatialAddressBookEngine.resolveAlias("lathe", opts());
    expect(a.nodeId).toBe(b.nodeId);
    expect(a.method).toBe(b.method);
    // a genuine score tie resolves to AMBIGUOUS (null) -- the safe non-divergent outcome,
    // never a coin-flip between two ids.
    const tie = spatialAddressBookEngine.resolveAlias("Duplicate Label", opts());
    expect(tie.nodeId).toBeNull();
  });

  it("node deleted while alias cached: isCanonical false + no confident exact hit for the gone id", () => {
    const without = NODES.filter((n) => n.id !== "eng.lathe");
    expect(spatialAddressBookEngine.isCanonical("eng.lathe", { nodes: without })).toBe(false);
    const r = spatialAddressBookEngine.resolveAlias("eng.lathe", { nodes: without });
    // the deleted id is no longer an exact-id hit (it degrades to fuzzy/ambiguous/unknown),
    // never silently returns the stale id as a confident exact match.
    expect(r.method).not.toBe("exact-id");
    expect(r.confidence).toBeLessThan(1);
  });
});
