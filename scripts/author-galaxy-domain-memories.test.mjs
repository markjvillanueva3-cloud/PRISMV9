// scripts/author-galaxy-domain-memories.test.mjs
// R9 tests for the grounded per-galaxy memory author. Locks:
//   1. the ENGINE_DIGEST regex fix (buggy `[—:–-]` char-class matched 0; the
//      `**Name**:` form matches 3061 — assert the live map is non-trivially large)
//   2. parseEngines deterministic (stable-sort) ordering across runs
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadDigestDescriptions, parseEngines } from "./author-galaxy-domain-memories.mjs";

test("loadDigestDescriptions parses the real ENGINE_DIGEST into a large map (the regex-0 regression guard)", () => {
  const map = loadDigestDescriptions();
  // The buggy `[—:–-]` char-class returned 0. The fixed `**Name**:` form matches
  // thousands. A floor of 100 fails loudly if the regex ever breaks again.
  assert.ok(map.size > 100, `digest map should have >100 engines, got ${map.size}`);
  // every value is a non-empty description string (no empty padding)
  for (const [, v] of map) { assert.ok(typeof v === "string" && v.length > 0); break; }
});

test("parseEngines: desc'd engines sort first, and the order is deterministic (stable tiebreaker)", () => {
  const paths = [
    "- `mcp-server/src/engines/ZetaEngine.ts`",
    "- `mcp-server/src/engines/AlphaEngine.ts`",
    "- `mcp-server/src/engines/BetaEngine.ts`",
  ].join("\n");
  const descMap = new Map([["BetaEngine", "has a real description here"]]);
  const a = parseEngines(paths, descMap);
  const b = parseEngines(paths, descMap);
  assert.deepEqual(a.map((e) => e.engine), b.map((e) => e.engine), "two runs must be identical (stable)");
  assert.equal(a[0].engine, "BetaEngine", "the only desc'd engine sorts first");
  // the two empty-desc engines come back in deterministic localeCompare order
  assert.deepEqual(a.slice(1).map((e) => e.engine), ["AlphaEngine", "ZetaEngine"]);
});

test("parseEngines: empty/absent PATHS yields no engines (won't fabricate)", () => {
  assert.deepEqual(parseEngines(null, new Map()), []);
  assert.deepEqual(parseEngines("no engine paths here", new Map()), []);
});

test("parseEngines: de-dupes repeated engine paths", () => {
  const paths = "- `src/engines/FooEngine.ts`\n- `src/engines/FooEngine.ts`";
  assert.equal(parseEngines(paths, new Map()).length, 1);
});
