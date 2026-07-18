// Tests for class-name-node-resolver.mjs. Run direct: `node scripts/lib/class-name-node-resolver.test.mjs`.
import test from "node:test";
import assert from "node:assert/strict";
import { buildClassNameIndex, makeClassNameResolver, loadOracleIds } from "./class-name-node-resolver.mjs";

test("buildClassNameIndex keys on lowercased last id-segment", () => {
  const idx = buildClassNameIndex(["eng.cam.masterpostprocessorengine"]);
  assert.equal(idx.get("masterpostprocessorengine"), "eng.cam.masterpostprocessorengine");
});

test("buildClassNameIndex prefers eng.* over a non-eng id for the same key", () => {
  const idx = buildClassNameIndex(["wiki.foo.thing", "eng.cam.thing"]);
  assert.equal(idx.get("thing"), "eng.cam.thing");
  // order-independent
  const idx2 = buildClassNameIndex(["eng.cam.thing", "wiki.foo.thing"]);
  assert.equal(idx2.get("thing"), "eng.cam.thing");
});

test("buildClassNameIndex deterministic lexicographic tiebreak between two eng.* ids", () => {
  const a = buildClassNameIndex(["eng.mill.foo", "eng.cam.foo"]);
  const b = buildClassNameIndex(["eng.cam.foo", "eng.mill.foo"]);
  // both insertion orders must yield the SAME (lexicographically smaller) id -> no regen churn
  assert.equal(a.get("foo"), "eng.cam.foo");
  assert.equal(b.get("foo"), "eng.cam.foo");
  assert.equal(a.get("foo"), b.get("foo"));
});

test("buildClassNameIndex skips non-string ids and empty keys", () => {
  const idx = buildClassNameIndex(["eng.cam.x", null, 42, undefined, "."]);
  assert.equal(idx.size, 1);
  assert.equal(idx.get("x"), "eng.cam.x");
});

test("resolver passes through an id already in validIds (e.g. a roost's own new node)", () => {
  const resolve = makeClassNameResolver(["eng.cam.x"]);
  const valid = new Set(["eng.cam.x", "ghost.roost.child"]);
  assert.equal(resolve("ghost.roost.child", valid), "ghost.roost.child");
});

test("resolver maps a bare class-name to its node-id", () => {
  const resolve = makeClassNameResolver(["eng.cam.masterpostprocessorengine"]);
  const valid = new Set(["eng.cam.masterpostprocessorengine"]);
  assert.equal(resolve("MasterPostProcessorEngine", valid), "eng.cam.masterpostprocessorengine");
});

test("resolver returns null for a genuinely un-graphed class-name", () => {
  const resolve = makeClassNameResolver(["eng.cam.x"]);
  const valid = new Set(["eng.cam.x"]);
  assert.equal(resolve("CamToolpathEngine", valid), null);
});

test("resolver returns null when the index hit is not in validIds", () => {
  // class-name resolves in the index, but that node is not currently valid -> drop (never a dangler)
  const resolve = makeClassNameResolver(["eng.cam.thing"]);
  const valid = new Set(["eng.other.node"]); // thing not present
  assert.equal(resolve("Thing", valid), null);
});

test("resolver handles null/undefined ref", () => {
  const resolve = makeClassNameResolver(["eng.cam.x"]);
  const valid = new Set(["eng.cam.x"]);
  assert.equal(resolve(null, valid), null);
  assert.equal(resolve(undefined, valid), null);
});

test("loadOracleIds reads real node-card offsets (live integration)", () => {
  const ids = loadOracleIds();
  assert.ok(Array.isArray(ids));
  assert.ok(ids.length > 100000, `expected >100k live ids, got ${ids.length}`);
  // a known engine class must resolve against the live oracle
  const resolve = makeClassNameResolver(ids);
  const valid = new Set(ids);
  const hit = resolve("MasterPostProcessorEngine", valid);
  assert.ok(hit && hit.startsWith("eng."), `MasterPostProcessorEngine should resolve to an eng.* id, got ${hit}`);
});
