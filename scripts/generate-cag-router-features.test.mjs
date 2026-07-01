// scripts/generate-cag-router-features.test.mjs
//
// TOKEN-SAVINGS-PIVOT/U-CAG-DASHBOARD (sierra 2026-05-27).
// Unit tests for the CAG-router /system-viz augmentation generator.
// Pure-core probe+generate fns are dependency-injected for hermeticity.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  probeSidecars,
  probeAssets,
  generate,
  ROOST_ID,
  COLOR_LIVE,
  COLOR_PARTIAL,
  COLOR_OFFLINE,
} from "./generate-cag-router-features.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// Probe DI fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeFsFixture({ files = [], stats = {}, reads = {} } = {}) {
  return {
    existsImpl: (p) => p === "/sc" || files.some((f) => p.endsWith(f)),
    readdirImpl: () => files,
    statImpl: (p) => {
      const base = p.split(/[\\/]/).pop();
      return { mtimeMs: stats[base] ?? Date.now() };
    },
    readImpl: (p) => {
      const base = p.split(/[\\/]/).pop();
      return reads[base] ?? "{}";
    },
  };
}

describe("probeSidecars — pure-core", () => {
  it("returns null when sidecar dir is missing", () => {
    const r = probeSidecars({
      existsImpl: () => false,
      sidecarDir: "/nope",
    });
    assert.equal(r, null);
  });

  it("returns zero-counts when dir exists but has no latest-*.json files", () => {
    const fixt = makeFsFixture({ files: [] });
    const r = probeSidecars({ ...fixt, sidecarDir: "/sc" });
    assert.equal(r.totalSidecars, 0);
    assert.equal(r.sampled, 0);
    assert.deepEqual(r.tierCounts, { COLD: 0, HOT: 0, HYBRID: 0, other: 0 });
    assert.equal(r.latestMtimeMs, null);
  });

  it("ignores files that don't start with 'latest-' or don't end with '.json'", () => {
    const fixt = makeFsFixture({
      files: ["route-abc-deadbeef.json", "latest-x.txt", "latest-good.json", "random.md"],
      reads: { "latest-good.json": JSON.stringify({ decision: { tier: "COLD" } }) },
    });
    const r = probeSidecars({ ...fixt, sidecarDir: "/sc" });
    assert.equal(r.totalSidecars, 1);
    assert.equal(r.tierCounts.COLD, 1);
  });

  it("tabulates tier distribution across sampled sidecars", () => {
    const fixt = makeFsFixture({
      files: ["latest-a.json", "latest-b.json", "latest-c.json", "latest-d.json", "latest-e.json"],
      reads: {
        "latest-a.json": JSON.stringify({ decision: { tier: "COLD" } }),
        "latest-b.json": JSON.stringify({ decision: { tier: "COLD" } }),
        "latest-c.json": JSON.stringify({ decision: { tier: "HOT" } }),
        "latest-d.json": JSON.stringify({ decision: { tier: "HYBRID" } }),
        "latest-e.json": JSON.stringify({ decision: { tier: "WTF" } }),
      },
    });
    const r = probeSidecars({ ...fixt, sidecarDir: "/sc" });
    assert.equal(r.totalSidecars, 5);
    assert.equal(r.tierCounts.COLD, 2);
    assert.equal(r.tierCounts.HOT, 1);
    assert.equal(r.tierCounts.HYBRID, 1);
    assert.equal(r.tierCounts.other, 1);
  });

  it("counts unparseable JSON as 'other'", () => {
    const fixt = makeFsFixture({
      files: ["latest-bad.json"],
      reads: { "latest-bad.json": "not json {" },
    });
    const r = probeSidecars({ ...fixt, sidecarDir: "/sc" });
    assert.equal(r.tierCounts.other, 1);
  });

  it("respects sampleN cap", () => {
    const files = Array.from({ length: 200 }, (_, i) => `latest-${i}.json`);
    const reads = Object.fromEntries(files.map((f) => [f, JSON.stringify({ decision: { tier: "COLD" } })]));
    const fixt = makeFsFixture({ files, reads });
    const r = probeSidecars({ ...fixt, sidecarDir: "/sc", sampleN: 10 });
    assert.equal(r.totalSidecars, 200);
    assert.equal(r.sampled, 10);
    assert.equal(r.tierCounts.COLD, 10);
  });
});

describe("probeAssets — pure-core", () => {
  it("marks all assets present when existsImpl always returns true", () => {
    const a = probeAssets({ existsImpl: () => true, root: "/r" });
    assert.equal(a.producerRouter.present, true);
    assert.equal(a.consumeHelper.present, true);
    assert.equal(a.consumerTribal.present, true);
  });

  it("marks assets missing when existsImpl always returns false", () => {
    const a = probeAssets({ existsImpl: () => false, root: "/r" });
    for (const v of Object.values(a)) assert.equal(v.present, false);
  });

  it("preserves declared paths verbatim", () => {
    const a = probeAssets({ existsImpl: () => true, root: "/r" });
    assert.equal(a.producerRouter.path, ".claude/hooks/cag-router-inject.mjs");
    assert.equal(a.producerAnchor.path, ".claude/hooks/cag-cold-cache-anchor.mjs");
    assert.equal(a.consumeHelper.path, ".claude/helpers/cag-consume.mjs");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generate() — colour + edge + stats invariants
// ─────────────────────────────────────────────────────────────────────────────

function allPresentAssets() {
  return {
    producerRouter:   { path: "x", present: true },
    producerAnchor:   { path: "x", present: true },
    consumeHelper:    { path: "x", present: true },
    consumerMaster:   { path: "x", present: true },
    consumerMemory:   { path: "x", present: true },
    consumerTribal:   { path: "x", present: true },
    routerLib:        { path: "x", present: true },
  };
}

describe("generate — pure-core", () => {
  it("emits ghost.cag_router parent + 7 substrate children", () => {
    const sidecars = { totalSidecars: 10, sampled: 10, tierCounts: { COLD: 7, HOT: 2, HYBRID: 1, other: 0 }, latestMtimeMs: Date.now() };
    const { newNodes, newEdges, stats } = generate({ sidecars, assets: allPresentAssets() });
    const ids = new Set(newNodes.map((n) => n.id));
    assert.ok(ids.has(ROOST_ID));
    assert.equal(newNodes.length, 1 + 7); // parent + 7 substrate children
    assert.equal(stats.roostEmitted, 1);
    assert.equal(stats.assetsPresent, 7);
    assert.equal(stats.assetTotal, 7);
  });

  it("parent roost color = green when all assets present + recent sidecars", () => {
    const sidecars = { totalSidecars: 1, sampled: 1, tierCounts: { COLD: 1, HOT: 0, HYBRID: 0, other: 0 }, latestMtimeMs: Date.now() };
    const { newNodes } = generate({ sidecars, assets: allPresentAssets() });
    const roost = newNodes.find((n) => n.id === ROOST_ID);
    assert.equal(roost.color, COLOR_LIVE);
  });

  it("parent roost color = red when any asset missing", () => {
    const assets = allPresentAssets();
    assets.producerRouter.present = false;
    const sidecars = { totalSidecars: 1, sampled: 1, tierCounts: { COLD: 1, HOT: 0, HYBRID: 0, other: 0 }, latestMtimeMs: Date.now() };
    const { newNodes } = generate({ sidecars, assets });
    const roost = newNodes.find((n) => n.id === ROOST_ID);
    assert.equal(roost.color, COLOR_OFFLINE);
  });

  it("parent roost color = amber when assets present but no recent traffic (>24h)", () => {
    const sidecars = { totalSidecars: 5, sampled: 5, tierCounts: { COLD: 1, HOT: 1, HYBRID: 3, other: 0 }, latestMtimeMs: Date.now() - 48 * 3_600_000 };
    const { newNodes } = generate({ sidecars, assets: allPresentAssets() });
    const roost = newNodes.find((n) => n.id === ROOST_ID);
    assert.equal(roost.color, COLOR_PARTIAL);
  });

  it("emits fans-out-to edges from parent to every substrate", () => {
    const sidecars = { totalSidecars: 1, sampled: 1, tierCounts: { COLD: 1, HOT: 0, HYBRID: 0, other: 0 }, latestMtimeMs: Date.now() };
    const { newEdges } = generate({ sidecars, assets: allPresentAssets() });
    const fans = newEdges.filter((e) => e.from === ROOST_ID && e.kind === "fans-out-to");
    assert.equal(fans.length, 7);
  });

  it("emits writes-sidecar-for edges from producer to each of 3 consumers", () => {
    const sidecars = { totalSidecars: 1, sampled: 1, tierCounts: { COLD: 1, HOT: 0, HYBRID: 0, other: 0 }, latestMtimeMs: Date.now() };
    const { newEdges } = generate({ sidecars, assets: allPresentAssets() });
    const writes = newEdges.filter((e) => e.kind === "writes-sidecar-for");
    assert.equal(writes.length, 3);
    const targets = new Set(writes.map((e) => e.to));
    assert.ok(targets.has("ghost.cag.consumer.master-index"));
    assert.ok(targets.has("ghost.cag.consumer.memory-relevance"));
    assert.ok(targets.has("ghost.cag.consumer.tribal-by-domain"));
  });

  it("emits imported-by edges from shared helper to each of 3 consumers", () => {
    const sidecars = { totalSidecars: 1, sampled: 1, tierCounts: { COLD: 1, HOT: 0, HYBRID: 0, other: 0 }, latestMtimeMs: Date.now() };
    const { newEdges } = generate({ sidecars, assets: allPresentAssets() });
    const importedBy = newEdges.filter((e) => e.from === "ghost.cag.shared.consume-helper" && e.kind === "imported-by");
    assert.equal(importedBy.length, 3);
  });

  it("dedup: re-running generate with existing node ids emits no new nodes (edges re-emit; callers edge-dedup downstream)", () => {
    const sidecars = { totalSidecars: 1, sampled: 1, tierCounts: { COLD: 1, HOT: 0, HYBRID: 0, other: 0 }, latestMtimeMs: Date.now() };
    const first = generate({ sidecars, assets: allPresentAssets() });
    const existingIds = first.newNodes.map((n) => n.id);
    const second = generate({ sidecars, assets: allPresentAssets() }, existingIds);
    assert.equal(second.newNodes.length, 0);
    assert.ok(second.newEdges.length > 0, "edges always re-emit; merger handles edge dedup");
  });

  it("missing sidecars probe (null) → sidecarsLive=false, parent amber", () => {
    const { newNodes, stats } = generate({ sidecars: null, assets: allPresentAssets() });
    const roost = newNodes.find((n) => n.id === ROOST_ID);
    assert.equal(roost.color, COLOR_PARTIAL);
    assert.equal(stats.sidecarsLive, false);
    assert.equal(stats.latestMtimeMs, null);
  });

  it("info string on each substrate node includes MISSING marker when present=false", () => {
    const assets = allPresentAssets();
    assets.consumerTribal.present = false;
    const sidecars = { totalSidecars: 0, sampled: 0, tierCounts: { COLD: 0, HOT: 0, HYBRID: 0, other: 0 }, latestMtimeMs: null };
    const { newNodes } = generate({ sidecars, assets });
    const tribalNode = newNodes.find((n) => n.id === "ghost.cag.consumer.tribal-by-domain");
    assert.match(tribalNode.info, /MISSING:/);
    assert.equal(tribalNode.color, COLOR_OFFLINE);
  });
});
