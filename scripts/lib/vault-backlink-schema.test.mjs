/**
 * Tests for vault-backlink-schema.mjs — the REVERSE-edge key/record contract.
 * node:test (test()+assert), matching the node-card-schema.test.mjs convention.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BACKLINK_SCHEMA_VERSION,
  NODE_CAP,
  normalizeVaultKey,
  sortNodeIds,
  makeBacklinkRecord,
  assertBacklink,
} from "./vault-backlink-schema.mjs";

// ─── normalizeVaultKey ───────────────────────────────────────────────────────

test("normalizeVaultKey: a full wiki path → prefix+suffix stripped, lowercased", () => {
  assert.equal(
    normalizeVaultKey("knowledge/wiki/architecture/Cheap-Node-Access-MS0.md"),
    "architecture/cheap-node-access-ms0",
  );
});

test("normalizeVaultKey: absolute repo-root wiki path with backslashes → same key as the relative form", () => {
  const abs = normalizeVaultKey("H:\\prism\\knowledge\\wiki\\architecture\\foo.md");
  const rel = normalizeVaultKey("architecture/foo");
  assert.equal(abs, "architecture/foo");
  assert.equal(abs, rel, "absolute and relative forms MUST canonicalize identically");
});

test("normalizeVaultKey: a memory slug (no slash, no .md) passes through lowercased", () => {
  assert.equal(normalizeVaultKey("feedback_Always_Fill_Gaps"), "feedback_always_fill_gaps");
});

test("normalizeVaultKey: a knowledge/memories/<type>/ path → bare slug key", () => {
  assert.equal(
    normalizeVaultKey("knowledge/memories/feedback/feedback_psn_definition.md"),
    "feedback_psn_definition",
  );
});

test("normalizeVaultKey: wiki keys retain a slash, memory keys do not → key spaces are disjoint", () => {
  const wiki = normalizeVaultKey("knowledge/wiki/lessons/x.md");
  const mem = normalizeVaultKey("reference_foo_bar");
  assert.ok(wiki.includes("/"), "wiki key keeps a slash");
  assert.ok(!mem.includes("/"), "memory slug has no slash");
  assert.notEqual(wiki, mem);
});

test("normalizeVaultKey: query form (no prefix/suffix) matches the stored form", () => {
  // An agent querying the human-friendly key gets the same canonical key the
  // builder stored from the full wiki path — the contract that makes lookups work.
  assert.equal(
    normalizeVaultKey("architecture/cheap-node-access-ms0"),
    normalizeVaultKey("knowledge/wiki/architecture/cheap-node-access-ms0.md"),
  );
});

test("normalizeVaultKey: non-string / empty / whitespace → empty key", () => {
  assert.equal(normalizeVaultKey(null), "");
  assert.equal(normalizeVaultKey(undefined), "");
  assert.equal(normalizeVaultKey(42), "");
  assert.equal(normalizeVaultKey(""), "");
  assert.equal(normalizeVaultKey("   "), "");
});

// ─── sortNodeIds ─────────────────────────────────────────────────────────────

test("sortNodeIds: lexicographic, does NOT dedupe (that's makeBacklinkRecord's job), non-mutating", () => {
  // sortNodeIds is a pure ordering helper — duplicates are preserved.
  assert.deepEqual(
    sortNodeIds(["eng.zebra", "eng.alpha", "ghost.x", "eng.alpha"]),
    ["eng.alpha", "eng.alpha", "eng.zebra", "ghost.x"],
  );
  assert.deepEqual(sortNodeIds(["c", "a", "b"]), ["a", "b", "c"]);
  const orig = ["b", "a"];
  sortNodeIds(orig);
  assert.deepEqual(orig, ["b", "a"], "input array must NOT be mutated");
});

// ─── makeBacklinkRecord ──────────────────────────────────────────────────────

test("makeBacklinkRecord: dedupes, sorts, sets total = pre-cap count", () => {
  const r = makeBacklinkRecord("architecture/foo", ["eng.b", "eng.a", "eng.b", "eng.c"]);
  assert.equal(r.key, "architecture/foo");
  assert.deepEqual(r.nodeIds, ["eng.a", "eng.b", "eng.c"]);
  assert.equal(r.total, 3, "total counts distinct ids, deduped");
});

test("makeBacklinkRecord: caps at NODE_CAP but total reflects the true pre-cap count", () => {
  const ids = Array.from({ length: NODE_CAP + 17 }, (_, i) => `eng.n${String(i).padStart(4, "0")}`);
  const r = makeBacklinkRecord("architecture/hot", ids);
  assert.equal(r.nodeIds.length, NODE_CAP, "capped to NODE_CAP");
  assert.equal(r.total, NODE_CAP + 17, "total is honest (pre-cap)");
  // capped set is the first NODE_CAP in sort order (deterministic, not random)
  assert.equal(r.nodeIds[0], "eng.n0000");
});

test("makeBacklinkRecord: empty key → null (never indexes nothing)", () => {
  assert.equal(makeBacklinkRecord("", ["eng.a"]), null);
  assert.equal(makeBacklinkRecord("   ", ["eng.a"]), null);
});

test("makeBacklinkRecord: no usable node ids → null", () => {
  assert.equal(makeBacklinkRecord("architecture/foo", []), null);
  assert.equal(makeBacklinkRecord("architecture/foo", [null, "", 42]), null, "non-string/empty ids filtered → none left → null");
});

test("makeBacklinkRecord: re-normalizes a raw full-path key", () => {
  const r = makeBacklinkRecord("knowledge/wiki/architecture/Bar.md", ["eng.a"]);
  assert.equal(r.key, "architecture/bar");
});

// ─── assertBacklink ──────────────────────────────────────────────────────────

test("assertBacklink: a valid record passes and returns itself", () => {
  const r = makeBacklinkRecord("architecture/foo", ["eng.a", "eng.b"]);
  assert.equal(assertBacklink(r), r);
});

test("assertBacklink: throws on non-object / missing key / bad nodeIds / bad total", () => {
  assert.throws(() => assertBacklink(null), /not an object/);
  assert.throws(() => assertBacklink([]), /not an object/);
  assert.throws(() => assertBacklink({ key: "", nodeIds: ["a"], total: 1 }), /non-empty string key/);
  assert.throws(() => assertBacklink({ key: "k", nodeIds: ["a", 7], total: 2 }), /non-empty-string array/);
  assert.throws(() => assertBacklink({ key: "k", nodeIds: ["a"], total: 0 }), /total must be finite/);
});

test("assertBacklink: throws when nodeIds exceeds NODE_CAP (cap is enforced, not advisory)", () => {
  const tooMany = Array.from({ length: NODE_CAP + 1 }, (_, i) => `eng.${i}`);
  assert.throws(() => assertBacklink({ key: "k", nodeIds: tooMany, total: tooMany.length }), /exceeds NODE_CAP/);
});

test("schema version is a non-empty string", () => {
  assert.equal(typeof BACKLINK_SCHEMA_VERSION, "string");
  assert.ok(BACKLINK_SCHEMA_VERSION.length > 0);
});
