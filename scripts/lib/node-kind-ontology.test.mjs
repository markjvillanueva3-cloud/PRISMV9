#!/usr/bin/env node
/**
 * node-kind-ontology.test.mjs — tests for NN-GRAPH-MS0/U-NNG-EDGE-NORMALIZE
 * Run: node --test scripts/lib/node-kind-ontology.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  NODE_KIND_MAP_VERSION,
  NODE_KIND_BUCKETS,
  ONE_HOT_DIM,
  bucketForKind,
  nodeKindOneHot,
  rawKindsForBucket,
  bucketCounts,
} from "./node-kind-ontology.mjs";

describe("constants", () => {
  test("NODE_KIND_MAP_VERSION is positive integer", () => {
    assert.ok(Number.isInteger(NODE_KIND_MAP_VERSION) && NODE_KIND_MAP_VERSION > 0);
  });

  test("NODE_KIND_BUCKETS has exactly 14 entries", () => {
    assert.equal(NODE_KIND_BUCKETS.length, 14);
  });

  test("NODE_KIND_BUCKETS is frozen", () => {
    assert.throws(() => { NODE_KIND_BUCKETS.push("new"); });
  });

  test("ONE_HOT_DIM matches bucket count", () => {
    assert.equal(ONE_HOT_DIM, NODE_KIND_BUCKETS.length);
  });

  test("bucket names are all unique", () => {
    const unique = new Set(NODE_KIND_BUCKETS);
    assert.equal(unique.size, NODE_KIND_BUCKETS.length);
  });

  test("'other' is the last bucket (catch-all)", () => {
    assert.equal(NODE_KIND_BUCKETS[NODE_KIND_BUCKETS.length - 1], "other");
  });
});

describe("bucketForKind", () => {
  test("direct matches resolve correctly", () => {
    assert.equal(bucketForKind("engine"), "engine");
    assert.equal(bucketForKind("dispatcher"), "dispatcher");
    assert.equal(bucketForKind("hook"), "hook");
    assert.equal(bucketForKind("skill"), "skill");
    assert.equal(bucketForKind("wiki_entry"), "wiki_entry");
    assert.equal(bucketForKind("milestone"), "milestone");
    assert.equal(bucketForKind("combo"), "combo");
  });

  test("ghost.* prefix collapses to 'ghost'", () => {
    assert.equal(bucketForKind("ghost.unwired-engine"), "ghost");
    assert.equal(bucketForKind("ghost.milestone"), "ghost");
    assert.equal(bucketForKind("ghost.script"), "ghost");
    assert.equal(bucketForKind("ghost.hook"), "ghost");
    assert.equal(bucketForKind("ghost.skill"), "ghost");
    assert.equal(bucketForKind("ghost.pipeline"), "ghost");
    assert.equal(bucketForKind("ghost.engine"), "ghost");
  });

  test("ghost-roost is a 'ghost'", () => {
    assert.equal(bucketForKind("ghost-roost"), "ghost");
  });

  test("fs.* prefix collapses to 'fs'", () => {
    assert.equal(bucketForKind("fs.file"), "fs");
    assert.equal(bucketForKind("fs.bundle"), "fs");
    assert.equal(bucketForKind("fs.source"), "fs");
  });

  test("tier* prefix collapses to 'tier'", () => {
    assert.equal(bucketForKind("tier2_flow"), "tier");
    assert.equal(bucketForKind("tier3_specialist"), "tier");
  });

  test("planned-unit variant (hyphen and underscore both work)", () => {
    assert.equal(bucketForKind("planned-unit"), "planned_unit");
    assert.equal(bucketForKind("planned_unit"), "planned_unit");
  });

  test("design-spec variant", () => {
    assert.equal(bucketForKind("design-spec"), "design_spec");
    assert.equal(bucketForKind("design_spec"), "design_spec");
  });

  test("action accepts both dispatcher.action and bare", () => {
    assert.equal(bucketForKind("dispatcher.action"), "action");
    assert.equal(bucketForKind("action"), "action");
  });

  test("unknown / empty / non-string → 'other'", () => {
    assert.equal(bucketForKind("nonexistent_kind"), "other");
    assert.equal(bucketForKind(""), "other");
    assert.equal(bucketForKind(null), "other");
    assert.equal(bucketForKind(undefined), "other");
    assert.equal(bucketForKind(123), "other");
    assert.equal(bucketForKind({}), "other");
  });

  test("case sensitivity: only canonical lowercase forms match", () => {
    assert.equal(bucketForKind("Engine"), "other");
    assert.equal(bucketForKind("DISPATCHER"), "other");
  });
});

describe("nodeKindOneHot", () => {
  test("output length is ONE_HOT_DIM", () => {
    assert.equal(nodeKindOneHot("engine").length, ONE_HOT_DIM);
    assert.equal(nodeKindOneHot("totally-unknown").length, ONE_HOT_DIM);
  });

  test("invariant: sum is always exactly 1.0", () => {
    const samples = ["engine", "dispatcher", "ghost.unwired-engine", "unknown", "", null];
    for (const s of samples) {
      const sum = nodeKindOneHot(s).reduce((a, b) => a + b, 0);
      assert.equal(sum, 1, `sum=${sum} for kind=${String(s)}`);
    }
  });

  test("engine slot is index 0", () => {
    const vec = nodeKindOneHot("engine");
    assert.equal(vec[0], 1);
    assert.equal(vec.filter(v => v === 1).length, 1);
  });

  test("ghost collapse: subkinds all activate the same index", () => {
    const ghostIdx = NODE_KIND_BUCKETS.indexOf("ghost");
    const sub1 = nodeKindOneHot("ghost.unwired-engine");
    const sub2 = nodeKindOneHot("ghost.milestone");
    assert.equal(sub1[ghostIdx], 1);
    assert.equal(sub2[ghostIdx], 1);
  });

  test("unknown maps to 'other' slot", () => {
    const otherIdx = NODE_KIND_BUCKETS.indexOf("other");
    const vec = nodeKindOneHot("totally-fake");
    assert.equal(vec[otherIdx], 1);
  });

  test("each element is 0 or 1 (no fractions)", () => {
    const vec = nodeKindOneHot("hook");
    for (const v of vec) {
      assert.ok(v === 0 || v === 1, `non-binary element: ${v}`);
    }
  });
});

describe("rawKindsForBucket", () => {
  test("returns at least one raw for every canonical bucket", () => {
    for (const b of NODE_KIND_BUCKETS) {
      const raws = rawKindsForBucket(b);
      assert.ok(raws.length > 0, `bucket "${b}" has 0 raw mappings`);
    }
  });

  test("unknown bucket → empty array", () => {
    assert.deepEqual(rawKindsForBucket("nonexistent"), []);
  });
});

describe("bucketCounts", () => {
  test("counts a mix of kinds correctly", () => {
    const g = {
      nodes: [
        { kind: "engine" }, { kind: "engine" }, { kind: "engine" },
        { kind: "ghost.unwired-engine" }, { kind: "ghost.milestone" },
        { kind: "fs.file" }, { kind: "fs.bundle" },
        { kind: "totally-unknown" },
      ],
    };
    const c = bucketCounts(g);
    assert.equal(c.engine, 3);
    assert.equal(c.ghost, 2);
    assert.equal(c.fs, 2);
    assert.equal(c.other, 1);
    assert.equal(c.dispatcher, 0);
  });

  test("returns all 14 buckets even when all zero", () => {
    const c = bucketCounts({ nodes: [] });
    for (const b of NODE_KIND_BUCKETS) {
      assert.equal(c[b], 0, `bucket "${b}" missing`);
    }
  });

  test("graceful on invalid input", () => {
    const c = bucketCounts(null);
    assert.equal(c.engine, 0);
    assert.equal(c.other, 0);
  });

  test("sum of counts equals nodes.length", () => {
    const g = {
      nodes: Array.from({ length: 47 }, (_, i) => ({
        kind: ["engine", "dispatcher", "ghost.x", "unknown_z"][i % 4],
      })),
    };
    const c = bucketCounts(g);
    const sum = Object.values(c).reduce((a, b) => a + b, 0);
    assert.equal(sum, 47);
  });
});
