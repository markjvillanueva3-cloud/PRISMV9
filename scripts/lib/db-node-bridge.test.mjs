/**
 * db-node-bridge.test.mjs — concrete-value tests for the unified DB
 * node-bridge contract.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-DB-NODE-BRIDGE
 * @slot echo · @iter 37 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NODE_BRIDGE_CONTRACT_VERSION,
  KNOWN_DB_SOURCES,
  REQUIRED_RESOLVER_METHODS,
  ALLOWED_QUERY_KINDS,
  createNodeBridge,
  validateContract,
  registerSource,
  listRegisteredSources,
  registeredSourceCount,
  routeQuery,
  recordHit,
  mergeResults,
  tallyHits,
  summarizeBridge,
} from "./db-node-bridge.mjs";

// Test fixture: a synthetic resolver that returns canned data.
function makeResolver(canned) {
  return {
    resolve: (query) => canned[query.kind] || null,
    describe: () => ({ name: "synthetic", version: "1.0" }),
  };
}

describe("constants", () => {
  it("NODE_BRIDGE_CONTRACT_VERSION = 1", () => {
    assert.equal(NODE_BRIDGE_CONTRACT_VERSION, 1);
  });
  it("KNOWN_DB_SOURCES has 23 entries (the audit-named source count)", () => {
    assert.equal(KNOWN_DB_SOURCES.length, 23);
  });
  it("KNOWN_DB_SOURCES includes 'tool_catalog'", () => {
    assert.equal(KNOWN_DB_SOURCES.includes("tool_catalog"), true);
  });
  it("KNOWN_DB_SOURCES includes 'material_catalog'", () => {
    assert.equal(KNOWN_DB_SOURCES.includes("material_catalog"), true);
  });
  it("KNOWN_DB_SOURCES includes 'kienzle_lookup'", () => {
    assert.equal(KNOWN_DB_SOURCES.includes("kienzle_lookup"), true);
  });
  it("KNOWN_DB_SOURCES includes 'taylor_lookup'", () => {
    assert.equal(KNOWN_DB_SOURCES.includes("taylor_lookup"), true);
  });
  it("REQUIRED_RESOLVER_METHODS = ['resolve','describe']", () => {
    assert.deepEqual(REQUIRED_RESOLVER_METHODS, ["resolve", "describe"]);
  });
  it("ALLOWED_QUERY_KINDS = ['lookup','search','list','describe']", () => {
    assert.deepEqual(ALLOWED_QUERY_KINDS, ["lookup", "search", "list", "describe"]);
  });
});

describe("createNodeBridge", () => {
  it("default bridgeId='default'", () => {
    assert.equal(createNodeBridge().bridgeId, "default");
  });
  it("custom bridgeId honored", () => {
    assert.equal(createNodeBridge({ bridgeId: "test-bridge" }).bridgeId, "test-bridge");
  });
  it("empty sources object on fresh bridge", () => {
    assert.deepEqual(createNodeBridge().sources, {});
  });
  it("empty hitTally object on fresh bridge", () => {
    assert.deepEqual(createNodeBridge().hitTally, {});
  });
  it("schemaVersion = 1", () => {
    assert.equal(createNodeBridge().schemaVersion, 1);
  });
});

describe("validateContract", () => {
  it("valid resolver with resolve+describe → ok=true", () => {
    assert.equal(validateContract(makeResolver({})).ok, true);
  });
  it("missing 'describe' method → ok=false", () => {
    const r = validateContract({ resolve: () => null });
    assert.equal(r.ok, false);
    assert.equal(r.errors[0].includes("describe"), true);
  });
  it("missing 'resolve' method → ok=false", () => {
    const r = validateContract({ describe: () => null });
    assert.equal(r.ok, false);
    assert.equal(r.errors[0].includes("resolve"), true);
  });
  it("null resolver → ok=false", () => {
    assert.equal(validateContract(null).ok, false);
  });
  it("resolver with resolve as string (not function) → ok=false", () => {
    assert.equal(validateContract({ resolve: "not-fn", describe: () => null }).ok, false);
  });
});

describe("registerSource", () => {
  it("valid sourceId + resolver → registered, count goes 0→1", () => {
    const b0 = createNodeBridge();
    const b1 = registerSource(b0, "tool_catalog", makeResolver({}));
    assert.equal(registeredSourceCount(b1), 1);
  });
  it("immutable: original bridge unchanged", () => {
    const b0 = createNodeBridge();
    registerSource(b0, "tool_catalog", makeResolver({}));
    assert.equal(registeredSourceCount(b0), 0);
  });
  it("unknown sourceId 'fake_db' → returns null (refused)", () => {
    const b0 = createNodeBridge();
    assert.equal(registerSource(b0, "fake_db", makeResolver({})), null);
  });
  it("invalid resolver (missing methods) → returns null", () => {
    const b0 = createNodeBridge();
    assert.equal(registerSource(b0, "tool_catalog", { resolve: () => null }), null);
  });
  it("hitTally initialized to 0 for newly registered source", () => {
    const b0 = createNodeBridge();
    const b1 = registerSource(b0, "tool_catalog", makeResolver({}));
    assert.equal(b1.hitTally.tool_catalog, 0);
  });
  it("registering 3 sources → count=3", () => {
    let b = createNodeBridge();
    b = registerSource(b, "tool_catalog", makeResolver({}));
    b = registerSource(b, "material_catalog", makeResolver({}));
    b = registerSource(b, "machine_capability", makeResolver({}));
    assert.equal(registeredSourceCount(b), 3);
  });
});

describe("listRegisteredSources", () => {
  it("empty bridge → []", () => {
    assert.deepEqual(listRegisteredSources(createNodeBridge()), []);
  });
  it("returns sorted source list", () => {
    let b = createNodeBridge();
    b = registerSource(b, "material_catalog", makeResolver({}));
    b = registerSource(b, "tool_catalog", makeResolver({}));
    b = registerSource(b, "kienzle_lookup", makeResolver({}));
    assert.deepEqual(listRegisteredSources(b), ["kienzle_lookup", "material_catalog", "tool_catalog"]);
  });
});

describe("routeQuery", () => {
  function buildBridge() {
    let b = createNodeBridge();
    b = registerSource(b, "tool_catalog", makeResolver({
      lookup: [{ id: "T1", diameter: 12.7 }],
      search: [{ id: "T1" }, { id: "T2" }],
      list: ["T1", "T2", "T3"],
      describe: { name: "tool_catalog_v1" },
    }));
    return b;
  }
  it("valid query → ok=true, result returned", () => {
    const r = routeQuery(buildBridge(), { sourceId: "tool_catalog", kind: "lookup" });
    assert.equal(r.ok, true);
    assert.deepEqual(r.result, [{ id: "T1", diameter: 12.7 }]);
  });
  it("valid query → sourceId echoed", () => {
    const r = routeQuery(buildBridge(), { sourceId: "tool_catalog", kind: "search" });
    assert.equal(r.sourceId, "tool_catalog");
  });
  it("unknown sourceId → ok=false with 'unknown sourceId' error", () => {
    const r = routeQuery(buildBridge(), { sourceId: "fake", kind: "lookup" });
    assert.equal(r.ok, false);
    assert.equal(r.error.includes("unknown sourceId"), true);
  });
  it("unknown query.kind → ok=false with 'unknown query.kind' error", () => {
    const r = routeQuery(buildBridge(), { sourceId: "tool_catalog", kind: "fake_kind" });
    assert.equal(r.ok, false);
    assert.equal(r.error.includes("unknown query.kind"), true);
  });
  it("source not registered → ok=false with 'no resolver' error", () => {
    const b = createNodeBridge();
    const r = routeQuery(b, { sourceId: "tool_catalog", kind: "lookup" });
    assert.equal(r.ok, false);
    assert.equal(r.error.includes("no resolver registered"), true);
  });
  it("resolver throws → ok=false with 'resolver threw' error", () => {
    let b = createNodeBridge();
    b = registerSource(b, "tool_catalog", {
      resolve: () => { throw new Error("boom"); },
      describe: () => ({}),
    });
    const r = routeQuery(b, { sourceId: "tool_catalog", kind: "lookup" });
    assert.equal(r.ok, false);
    assert.equal(r.error.includes("resolver threw"), true);
    assert.equal(r.error.includes("boom"), true);
  });
  it("null query → ok=false", () => {
    assert.equal(routeQuery(buildBridge(), null).ok, false);
  });
  it("null bridge → ok=false with 'bridge invalid'", () => {
    const r = routeQuery(null, { sourceId: "tool_catalog", kind: "lookup" });
    assert.equal(r.error, "bridge invalid");
  });
});

describe("recordHit", () => {
  it("first hit: 0 → 1", () => {
    let b = createNodeBridge();
    b = registerSource(b, "tool_catalog", makeResolver({}));
    b = recordHit(b, "tool_catalog");
    assert.equal(b.hitTally.tool_catalog, 1);
  });
  it("3 hits: 0 → 3", () => {
    let b = createNodeBridge();
    b = registerSource(b, "tool_catalog", makeResolver({}));
    b = recordHit(b, "tool_catalog");
    b = recordHit(b, "tool_catalog");
    b = recordHit(b, "tool_catalog");
    assert.equal(b.hitTally.tool_catalog, 3);
  });
  it("unknown sourceId → bridge unchanged", () => {
    const b0 = createNodeBridge();
    const b1 = recordHit(b0, "fake_db");
    assert.equal(b1, b0);
  });
});

describe("mergeResults: multi-source merge with provenance", () => {
  it("2 sources merged → all rows have _provenance", () => {
    const merged = mergeResults([
      { ok: true, sourceId: "tool_catalog", result: [{ id: "T1" }, { id: "T2" }] },
      { ok: true, sourceId: "tool_inventory", result: [{ id: "T3" }] },
    ]);
    assert.equal(merged.length, 3);
    assert.equal(merged[0]._provenance.sourceId, "tool_catalog");
    assert.equal(merged[2]._provenance.sourceId, "tool_inventory");
  });
  it("failed bundle skipped (ok=false)", () => {
    const merged = mergeResults([
      { ok: false, sourceId: "tool_catalog", result: null },
      { ok: true, sourceId: "tool_inventory", result: [{ id: "T1" }] },
    ]);
    assert.equal(merged.length, 1);
  });
  it("result not array → bundle skipped", () => {
    const merged = mergeResults([
      { ok: true, sourceId: "tool_catalog", result: "not-array" },
    ]);
    assert.equal(merged.length, 0);
  });
  it("empty bundles → []", () => {
    assert.deepEqual(mergeResults([]), []);
  });
  it("null input → []", () => {
    assert.deepEqual(mergeResults(null), []);
  });
  it("retrievedAtIso preserved in provenance", () => {
    const merged = mergeResults([
      { ok: true, sourceId: "tool_catalog", result: [{ id: "T1" }], retrievedAtIso: "2026-05-27T22:30:00Z" },
    ]);
    assert.equal(merged[0]._provenance.retrievedAtIso, "2026-05-27T22:30:00Z");
  });
});

describe("tallyHits", () => {
  it("returns sorted desc by hits", () => {
    let b = createNodeBridge();
    b = registerSource(b, "tool_catalog", makeResolver({}));
    b = registerSource(b, "material_catalog", makeResolver({}));
    b = recordHit(b, "material_catalog");
    b = recordHit(b, "material_catalog");
    b = recordHit(b, "material_catalog");
    b = recordHit(b, "tool_catalog");
    const t = tallyHits(b);
    assert.equal(t[0].sourceId, "material_catalog");
    assert.equal(t[0].hits, 3);
    assert.equal(t[1].sourceId, "tool_catalog");
    assert.equal(t[1].hits, 1);
  });
  it("empty bridge → []", () => {
    assert.deepEqual(tallyHits(createNodeBridge()), []);
  });
});

describe("summarizeBridge", () => {
  it("empty bridge: registeredSourceCount=0, coveragePct=0", () => {
    const s = summarizeBridge(createNodeBridge());
    assert.equal(s.registeredSourceCount, 0);
    assert.equal(s.coveragePct, 0);
  });
  it("3 sources registered: coveragePct = 3/23", () => {
    let b = createNodeBridge();
    b = registerSource(b, "tool_catalog", makeResolver({}));
    b = registerSource(b, "material_catalog", makeResolver({}));
    b = registerSource(b, "machine_capability", makeResolver({}));
    assert.equal(Math.abs(summarizeBridge(b).coveragePct - 3 / 23) < 1e-9, true);
  });
  it("knownSourceCount echoed as 23", () => {
    assert.equal(summarizeBridge(createNodeBridge()).knownSourceCount, 23);
  });
  it("totalHits aggregates across sources", () => {
    let b = createNodeBridge();
    b = registerSource(b, "tool_catalog", makeResolver({}));
    b = registerSource(b, "material_catalog", makeResolver({}));
    b = recordHit(b, "tool_catalog");
    b = recordHit(b, "tool_catalog");
    b = recordHit(b, "material_catalog");
    assert.equal(summarizeBridge(b).totalHits, 3);
  });
  it("topSources has at most 5 entries", () => {
    let b = createNodeBridge();
    for (const s of KNOWN_DB_SOURCES.slice(0, 7)) {
      b = registerSource(b, s, makeResolver({}));
      b = recordHit(b, s);
    }
    const s = summarizeBridge(b);
    assert.equal(s.topSources.length <= 5, true);
  });
  it("null bridge → null", () => {
    assert.equal(summarizeBridge(null), null);
  });
});
