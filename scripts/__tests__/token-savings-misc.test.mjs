import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isStableHit, writeStable, wikiCacheGet, wikiCachePut, aggregateToolCosts, formatTopCostReport,
} from "../lib/token-savings-misc.mjs";

// D2
test("isStableHit: fresh entry hits", () => {
  const c = writeStable(null, "k", "v");
  assert.equal(isStableHit(c, "k"), true);
});
test("isStableHit: expired returns false", () => {
  const old = Date.now() - 25 * 3600 * 1000;
  const c = writeStable(null, "k", "v", old);
  assert.equal(isStableHit(c, "k", 24), false);
});
test("isStableHit: missing key → false", () => {
  assert.equal(isStableHit({ entries: {} }, "nope"), false);
});

// D3
test("wikiCacheGet/Put: round-trip same session", () => {
  const c = wikiCachePut(null, "slug-x", "sess", "body");
  assert.equal(wikiCacheGet(c, "slug-x", "sess"), "body");
});
test("wikiCacheGet: different session → null (session-scoped)", () => {
  const c = wikiCachePut(null, "slug-x", "sess-a", "body");
  assert.equal(wikiCacheGet(c, "slug-x", "sess-b"), null);
});
test("wikiCacheGet: expired entry returns null", () => {
  const old = Date.now() - 40 * 60 * 1000;
  const c = wikiCachePut(null, "slug-x", "sess", "body", old);
  assert.equal(wikiCacheGet(c, "slug-x", "sess"), null);
});

// E1
test("aggregateToolCosts: sorts by token estimate desc", () => {
  const sidecar = { byToolName: { Bash: 5, Read: 20, Edit: 10 } };
  const out = aggregateToolCosts(sidecar);
  assert.equal(out[0].tool, "Read");
  assert.equal(out[1].tool, "Edit");
  assert.equal(out[2].tool, "Bash");
  assert.equal(out[0].fires, 20);
  assert.equal(out[0].estTokens, 20 * 8000);
});
test("aggregateToolCosts: empty input → []", () => {
  assert.deepEqual(aggregateToolCosts(null), []);
  assert.deepEqual(aggregateToolCosts({}), []);
});

// E2
test("formatTopCostReport: emits markdown table", () => {
  const r = formatTopCostReport([{ tool: "Read", fires: 50, estTokens: 400000 }]);
  assert.ok(r.includes("Read"));
  assert.ok(r.includes("400K"));
  assert.ok(r.includes("| Tool | Fires |"));
});
test("formatTopCostReport: empty → placeholder text", () => {
  assert.ok(formatTopCostReport([]).includes("No per-tool"));
});
