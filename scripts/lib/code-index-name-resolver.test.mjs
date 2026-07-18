// scripts/lib/code-index-name-resolver.test.mjs
// Tests for U-GREP-FORCE-ACTIVATE name->path resolver. Real reference-value asserts (R9).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildNameIndex, resolveNameToPaths, loadCodeIndex, makeResolver, MAX_INDEX_BYTES,
} from "./code-index-name-resolver.mjs";

// A CODE_SYSTEM_INDEX.json-shaped fixture (matches the real .codes / _meta.root shape).
const FIXTURE = {
  _meta: { version: "3.0.0", root: "mcp-server/" },
  codes: {
    E0001: { code: "E0001", path: "src/engines/AHPEngine.ts", name: "AHP", category: "E" },
    E0002: { code: "E0002", path: "src/engines/TokenAwarenessEngine.ts", name: "TokenAwareness", category: "E" },
    D0001: { code: "D0001", path: "src/tools/dispatchers/calcDispatcher.ts", name: "calc", category: "D" },
  },
};

// ---- buildNameIndex --------------------------------------------------------
test("buildNameIndex: keys by short name AND file-stem, paths made repo-relative via _meta.root", () => {
  const idx = buildNameIndex(FIXTURE);
  // short name "AHP" -> mcp-server/-prefixed path
  assert.deepEqual(resolveNameToPaths("AHP", idx), ["mcp-server/src/engines/AHPEngine.ts"]);
  // file stem "AHPEngine" resolves the same file
  assert.deepEqual(resolveNameToPaths("AHPEngine", idx), ["mcp-server/src/engines/AHPEngine.ts"]);
  // case-insensitive
  assert.deepEqual(resolveNameToPaths("ahpengine", idx), ["mcp-server/src/engines/AHPEngine.ts"]);
  // a dispatcher stem
  assert.deepEqual(resolveNameToPaths("calcDispatcher", idx), ["mcp-server/src/tools/dispatchers/calcDispatcher.ts"]);
});
test("buildNameIndex: adversarial -- null / no codes / malformed entries -> empty map (no throw)", () => {
  assert.equal(buildNameIndex(null).size, 0);
  assert.equal(buildNameIndex({}).size, 0);
  assert.equal(buildNameIndex({ codes: "nope" }).size, 0);
  // entries without a path are skipped, valid ones still indexed
  const idx = buildNameIndex({ _meta: { root: "" }, codes: { X: { name: "X" }, Y: { name: "Y", path: "a/Y.ts" } } });
  assert.deepEqual(resolveNameToPaths("Y", idx), ["a/Y.ts"]);
  assert.deepEqual(resolveNameToPaths("X", idx), []);
});
test("buildNameIndex: root not double-prefixed when path already starts with root", () => {
  const idx = buildNameIndex({ _meta: { root: "mcp-server/" }, codes: { Z: { name: "Z", path: "mcp-server/src/Z.ts" } } });
  assert.deepEqual(resolveNameToPaths("Z", idx), ["mcp-server/src/Z.ts"]);
});
test("buildNameIndex: a name mapping to multiple files yields all of them", () => {
  const idx = buildNameIndex({ _meta: { root: "" }, codes: {
    A: { name: "dup", path: "a/dup.ts" },
    B: { name: "dup", path: "b/dup.ts" },
  } });
  const paths = resolveNameToPaths("dup", idx).sort();
  assert.deepEqual(paths, ["a/dup.ts", "b/dup.ts"]);
});

// ---- resolveNameToPaths edge cases -----------------------------------------
test("resolveNameToPaths: empty/null/non-map -> []", () => {
  const idx = buildNameIndex(FIXTURE);
  assert.deepEqual(resolveNameToPaths("", idx), []);
  assert.deepEqual(resolveNameToPaths(null, idx), []);
  assert.deepEqual(resolveNameToPaths("NoSuchThing", idx), []);
  assert.deepEqual(resolveNameToPaths("AHP", null), []);
  assert.deepEqual(resolveNameToPaths("AHP", {}), []);
});
test("resolveNameToPaths: exact key only -- a substring does NOT resolve (force must not over-fire)", () => {
  const idx = buildNameIndex(FIXTURE);
  assert.deepEqual(resolveNameToPaths("Token", idx), []);        // substring of TokenAwareness -> no match
  assert.deepEqual(resolveNameToPaths("Engine", idx), []);       // common suffix -> no match
});

// ---- loadCodeIndex (injected I/O) ------------------------------------------
test("loadCodeIndex: parses valid JSON; fail-soft to null on missing/corrupt/oversize", () => {
  const ok = loadCodeIndex("x.json", { existsImpl: () => true, readImpl: () => JSON.stringify(FIXTURE) });
  assert.equal(ok._meta.root, "mcp-server/");
  assert.equal(loadCodeIndex("x.json", { existsImpl: () => false }), null);              // missing
  assert.equal(loadCodeIndex("x.json", { existsImpl: () => true, readImpl: () => "{bad" }), null); // corrupt
  // oversize guard
  const huge = "x".repeat(MAX_INDEX_BYTES + 1);
  assert.equal(loadCodeIndex("x.json", { existsImpl: () => true, readImpl: () => huge }), null);
});

// ---- makeResolver -----------------------------------------------------------
test("makeResolver: returns a working resolver fn from a loadable index, null otherwise", () => {
  const resolve = makeResolver("x.json", { existsImpl: () => true, readImpl: () => JSON.stringify(FIXTURE) });
  assert.equal(typeof resolve, "function");
  assert.deepEqual(resolve("AHPEngine"), ["mcp-server/src/engines/AHPEngine.ts"]);
  // unloadable -> null (force stays dormant, never throws)
  assert.equal(makeResolver("x.json", { existsImpl: () => false }), null);
  // empty index -> null
  assert.equal(makeResolver("x.json", { existsImpl: () => true, readImpl: () => JSON.stringify({ codes: {} }) }), null);
});

// ---- LIVE: the real CODE_SYSTEM_INDEX.json resolves a known engine ----------
test("LIVE: the real index resolves a known engine name to an on-disk path (regression oracle)", () => {
  const resolve = makeResolver();   // default path mcp-server/data/docs/CODE_SYSTEM_INDEX.json
  if (!resolve) { return; }         // index absent in this checkout -> skip (fail-soft, never fail the suite)
  // AHPEngine is a verified-catalogued asset (file stem in .codes). When the index IS present, a
  // non-empty resolution is REQUIRED -- this fails loud if the resolver silently empties (P2 hardening).
  const paths = resolve("AHPEngine");
  assert.ok(paths.length > 0, "the real index must resolve AHPEngine (resolver regressed if empty)");
  assert.match(paths[0], /AHPEngine\.ts$/);
  // a short-name + a dispatcher stem also resolve (proves both keying paths against live data)
  assert.ok(resolve("calcDispatcher").length > 0, "dispatcher file-stem resolves");
});
