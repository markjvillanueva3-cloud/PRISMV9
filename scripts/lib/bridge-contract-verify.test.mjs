/**
 * bridge-contract-verify.test.mjs — concrete-value tests for the
 * cross-target parity verifier + live integration test against iter33,
 * iter34, iter35 manifest modules.
 *
 * The live integration test (suite 'real cross-target parity (iter33+34+35
 * loaded')') is the load-bearing contract assertion: if any of the three
 * add-in manifests drifts from the shared contract, this test FAILS.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-BRIDGE-CONTRACT-VERIFY
 * @slot echo · @iter 36 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONTRACT_SCHEMA_VERSION,
  SHARED_CORE_CATEGORIES,
  SHARED_REQUIRED_MANIFEST_FIELDS,
  SHARED_REQUIRED_RESOURCE_FIELDS,
  ALL_BRIDGE_TARGETS,
  findMissing,
  describeTargetContract,
  verifyBridgeParity,
  findCommonDialectOps,
  findTargetOnlyDialectOps,
  canonicalizeResourceId,
  parseCanonicalResourceId,
  summarizeParity,
} from "./bridge-contract-verify.mjs";

import * as mastercam from "./mastercam-addin-resource-manifest.mjs";
import * as hypermill from "./hypermill-addin-resource-manifest.mjs";
import * as inventor from "./inventor-addin-resource-manifest.mjs";

describe("constants", () => {
  it("CONTRACT_SCHEMA_VERSION = 1", () => {
    assert.equal(CONTRACT_SCHEMA_VERSION, 1);
  });
  it("SHARED_CORE_CATEGORIES has 7 baseline categories", () => {
    assert.equal(SHARED_CORE_CATEGORIES.length, 7);
  });
  it("SHARED_REQUIRED_MANIFEST_FIELDS has 5 entries", () => {
    assert.equal(SHARED_REQUIRED_MANIFEST_FIELDS.length, 5);
  });
  it("SHARED_REQUIRED_RESOURCE_FIELDS = ['id','category','name','version']", () => {
    assert.deepEqual(SHARED_REQUIRED_RESOURCE_FIELDS, ["id", "category", "name", "version"]);
  });
  it("ALL_BRIDGE_TARGETS = ['mastercam','hypermill','inventor_hsm']", () => {
    assert.deepEqual(ALL_BRIDGE_TARGETS, ["mastercam", "hypermill", "inventor_hsm"]);
  });
});

describe("findMissing", () => {
  it("haystack has all needles → []", () => {
    assert.deepEqual(findMissing([1, 2, 3], [1, 2]), []);
  });
  it("haystack missing one needle → [that needle]", () => {
    assert.deepEqual(findMissing([1, 2], [1, 3]), [3]);
  });
  it("haystack missing all needles → all needles", () => {
    assert.deepEqual(findMissing([], [1, 2, 3]), [1, 2, 3]);
  });
  it("null haystack → all needles", () => {
    assert.deepEqual(findMissing(null, [1, 2]), [1, 2]);
  });
  it("null needles → empty", () => {
    assert.deepEqual(findMissing([1, 2, 3], null), []);
  });
});

describe("describeTargetContract", () => {
  it("invalid target → null", () => {
    assert.equal(describeTargetContract("fake", {}), null);
  });
  it("null exports → null", () => {
    assert.equal(describeTargetContract("mastercam", null), null);
  });
  it("valid target + exports → contract bundle with target field set", () => {
    const c = describeTargetContract("mastercam", mastercam);
    assert.equal(c.target, "mastercam");
  });
  it("schemaVersion extracted from MANIFEST_SCHEMA_VERSION", () => {
    const c = describeTargetContract("mastercam", mastercam);
    assert.equal(c.schemaVersion, 1);
  });
  it("addinTarget extracted from ADDIN_TARGET", () => {
    const c = describeTargetContract("mastercam", mastercam);
    assert.equal(c.addinTarget, "mastercam");
  });
  it("hasBuildResourceCatalog reflects function presence", () => {
    const c = describeTargetContract("mastercam", mastercam);
    assert.equal(c.hasBuildResourceCatalog, true);
  });
  it("missing function → hasFoo=false", () => {
    const broken = { ...mastercam, validateManifest: undefined };
    const c = describeTargetContract("mastercam", broken);
    assert.equal(c.hasValidateManifest, false);
  });
});

describe("verifyBridgeParity: synthetic cases", () => {
  it("missing target → ok=false with explicit missing error", () => {
    const r = verifyBridgeParity({ mastercam: mastercam, hypermill: hypermill });
    assert.equal(r.ok, false);
    assert.equal(r.mismatches.some((m) => m.includes("inventor_hsm")), true);
  });
  it("all targets present and conforming → ok=true", () => {
    const r = verifyBridgeParity({
      mastercam,
      hypermill,
      inventor_hsm: inventor,
    });
    assert.equal(r.ok, true);
  });
  it("schemaVersion divergence → flagged", () => {
    const brokenInventor = { ...inventor, MANIFEST_SCHEMA_VERSION: 99 };
    const r = verifyBridgeParity({
      mastercam,
      hypermill,
      inventor_hsm: brokenInventor,
    });
    assert.equal(r.ok, false);
    assert.equal(r.mismatches.some((m) => m.includes("schemaVersion divergence")), true);
  });
  it("missing core category → flagged", () => {
    const brokenInventor = { ...inventor, RESOURCE_CATEGORIES: ["tool"] }; // missing 6 of 7 core
    const r = verifyBridgeParity({
      mastercam,
      hypermill,
      inventor_hsm: brokenInventor,
    });
    assert.equal(r.ok, false);
    assert.equal(r.mismatches.some((m) => m.includes("missing core categories")), true);
  });
  it("missing function → flagged", () => {
    const brokenInventor = { ...inventor, resolveDialect: undefined };
    const r = verifyBridgeParity({
      mastercam,
      hypermill,
      inventor_hsm: brokenInventor,
    });
    assert.equal(r.ok, false);
    assert.equal(r.mismatches.some((m) => m.includes("missing resolveDialect")), true);
  });
  it("self-ID mismatch → flagged", () => {
    const brokenInventor = { ...inventor, ADDIN_TARGET: "wrong_id" };
    const r = verifyBridgeParity({
      mastercam,
      hypermill,
      inventor_hsm: brokenInventor,
    });
    assert.equal(r.ok, false);
    assert.equal(r.mismatches.some((m) => m.includes("addinTarget self-id mismatch")), true);
  });
});

describe("real cross-target parity (iter33+34+35 loaded)", () => {
  it("LIVE: all 3 add-in manifests pass parity → ok=true with zero mismatches", () => {
    const r = verifyBridgeParity({
      mastercam,
      hypermill,
      inventor_hsm: inventor,
    });
    assert.equal(r.ok, true);
    assert.equal(r.mismatches.length, 0);
  });
  it("LIVE: all 3 self-ID correctly (mastercam/hypermill/inventor_hsm)", () => {
    assert.equal(mastercam.ADDIN_TARGET, "mastercam");
    assert.equal(hypermill.ADDIN_TARGET, "hypermill");
    assert.equal(inventor.ADDIN_TARGET, "inventor_hsm");
  });
  it("LIVE: all 3 share schemaVersion=1", () => {
    assert.equal(mastercam.MANIFEST_SCHEMA_VERSION, 1);
    assert.equal(hypermill.MANIFEST_SCHEMA_VERSION, 1);
    assert.equal(inventor.MANIFEST_SCHEMA_VERSION, 1);
  });
  it("LIVE: all 3 cover SHARED_CORE_CATEGORIES (7 baseline)", () => {
    for (const tgt of [mastercam, hypermill, inventor]) {
      const missing = findMissing(tgt.RESOURCE_CATEGORIES, SHARED_CORE_CATEGORIES);
      assert.equal(missing.length, 0);
    }
  });
});

describe("findCommonDialectOps", () => {
  it("identical maps → all keys common", () => {
    const a = { flood_on: "M8", drill_cycle: "G81" };
    const b = { flood_on: "M8", drill_cycle: "G81" };
    assert.deepEqual(findCommonDialectOps([a, b]), ["drill_cycle", "flood_on"]);
  });
  it("disjoint maps → []", () => {
    const a = { flood_on: "M8" };
    const b = { tsc_on: "M88" };
    assert.deepEqual(findCommonDialectOps([a, b]), []);
  });
  it("partial overlap → only intersection", () => {
    const a = { flood_on: "M8", drill_cycle: "G81" };
    const b = { flood_on: "M8", peck_drill_cycle: "G83" };
    assert.deepEqual(findCommonDialectOps([a, b]), ["flood_on"]);
  });
  it("empty array → []", () => {
    assert.deepEqual(findCommonDialectOps([]), []);
  });
  it("null → []", () => {
    assert.deepEqual(findCommonDialectOps(null), []);
  });
  it("LIVE: 3 add-in dialect maps share flood_on='M8'", () => {
    const common = findCommonDialectOps([
      mastercam.MASTERCAM_DIALECT_MAP,
      hypermill.HYPERMILL_DIALECT_MAP,
      inventor.INVENTOR_DIALECT_MAP,
    ]);
    assert.equal(common.includes("flood_on"), true);
  });
  it("LIVE: 3 add-in maps share canonical drill_cycle='G81' op", () => {
    const common = findCommonDialectOps([
      mastercam.MASTERCAM_DIALECT_MAP,
      hypermill.HYPERMILL_DIALECT_MAP,
      inventor.INVENTOR_DIALECT_MAP,
    ]);
    assert.equal(common.includes("drill_cycle"), true);
  });
});

describe("findTargetOnlyDialectOps", () => {
  it("op only in target → returned", () => {
    const ops = findTargetOnlyDialectOps("a", {
      a: { unique_to_a: "X", shared: "S" },
      b: { shared: "S" },
    });
    assert.deepEqual(ops, ["unique_to_a"]);
  });
  it("op in multiple targets → not target-only", () => {
    const ops = findTargetOnlyDialectOps("a", {
      a: { shared: "S" },
      b: { shared: "S" },
    });
    assert.deepEqual(ops, []);
  });
  it("LIVE: heidenhain_drill_cycle is hyperMILL-only", () => {
    const ops = findTargetOnlyDialectOps("hypermill", {
      mastercam: mastercam.MASTERCAM_DIALECT_MAP,
      hypermill: hypermill.HYPERMILL_DIALECT_MAP,
      inventor_hsm: inventor.INVENTOR_DIALECT_MAP,
    });
    assert.equal(ops.includes("heidenhain_drill_cycle"), true);
  });
  it("LIVE: probe_pre_position is Inventor-only", () => {
    const ops = findTargetOnlyDialectOps("inventor_hsm", {
      mastercam: mastercam.MASTERCAM_DIALECT_MAP,
      hypermill: hypermill.HYPERMILL_DIALECT_MAP,
      inventor_hsm: inventor.INVENTOR_DIALECT_MAP,
    });
    assert.equal(ops.includes("probe_pre_position"), true);
  });
});

describe("canonicalizeResourceId / parseCanonicalResourceId", () => {
  it("canonicalize('mastercam', 'post-hurco-v11') → 'mastercam::post-hurco-v11'", () => {
    assert.equal(canonicalizeResourceId("mastercam", "post-hurco-v11"), "mastercam::post-hurco-v11");
  });
  it("invalid target → null", () => {
    assert.equal(canonicalizeResourceId("fake", "id1"), null);
  });
  it("empty id → null", () => {
    assert.equal(canonicalizeResourceId("mastercam", ""), null);
  });
  it("parse('hypermill::s1') → {target:'hypermill', id:'s1'}", () => {
    assert.deepEqual(parseCanonicalResourceId("hypermill::s1"), { target: "hypermill", id: "s1" });
  });
  it("parse non-canonical 'no-separator' → null", () => {
    assert.equal(parseCanonicalResourceId("no-separator"), null);
  });
  it("parse invalid target prefix 'fake::id1' → null", () => {
    assert.equal(parseCanonicalResourceId("fake::id1"), null);
  });
  it("round-trip: canonicalize → parse recovers original", () => {
    const c = canonicalizeResourceId("inventor_hsm", "r1");
    const p = parseCanonicalResourceId(c);
    assert.equal(p.target, "inventor_hsm");
    assert.equal(p.id, "r1");
  });
});

describe("summarizeParity", () => {
  it("3-target conforming bundle → ok=true, mismatchCount=0", () => {
    const s = summarizeParity({ mastercam, hypermill, inventor_hsm: inventor });
    assert.equal(s.ok, true);
    assert.equal(s.mismatchCount, 0);
  });
  it("bridgeTargets list echoed", () => {
    const s = summarizeParity({ mastercam, hypermill, inventor_hsm: inventor });
    assert.deepEqual(s.bridgeTargets, ["mastercam", "hypermill", "inventor_hsm"]);
  });
  it("coreCategories count = 7", () => {
    const s = summarizeParity({ mastercam, hypermill, inventor_hsm: inventor });
    assert.equal(s.coreCategories, 7);
  });
  it("missing target → ok=false + mismatch entries", () => {
    const s = summarizeParity({ mastercam, hypermill });
    assert.equal(s.ok, false);
    assert.equal(s.mismatchCount > 0, true);
  });
});
