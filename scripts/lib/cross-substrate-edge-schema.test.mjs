/**
 * cross-substrate-edge-schema.test.mjs — node:test suite for the typed,
 * ADD-only cross-substrate edge contract (U-XSUB-EDGE-SCHEMA, slot:sierra).
 *
 * Run: node --test scripts/lib/cross-substrate-edge-schema.test.mjs
 *
 * Tests verify INTENT (R9): each case asserts a concrete acceptance/rejection
 * REASON, not a stub. A function that hardcoded {valid:true} would fail the
 * rejection cases; one that hardcoded {valid:false} would fail the accept cases.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA_VERSION,
  EDGE_TYPES,
  ALLOWED_TYPES,
  edgeKey,
  validateEdge,
  assertValidEdge,
  validateEdgeBatch,
  assertAddOnly,
} from "./cross-substrate-edge-schema.mjs";

// A canonical valid edge fixture — every test mutates ONE field off this so a
// failure points at exactly the rule under test.
const ok = () => ({
  from: "MillingForceEngine",
  to: "feedback-psn-definition",
  type: "documented-by",
  source: "memory-frontmatter:feedback-psn-definition",
  confidence: 0.9,
  addedBy: "sierra",
  addedAt: "2026-06-03T15:30:00.000Z",
});

test("schema exposes the 4 canonical typed edges and ALLOWED_TYPES mirrors them", () => {
  assert.equal(SCHEMA_VERSION, "1.0.0");
  assert.deepEqual([...ALLOWED_TYPES].sort(), ["consensus-of", "documented-by", "embeds", "owned-by-slot"]);
  for (const t of ALLOWED_TYPES) assert.ok(EDGE_TYPES[t].from && EDGE_TYPES[t].to, `${t} declares from/to`);
});

test("a fully-formed edge validates", () => {
  const res = validateEdge(ok());
  assert.equal(res.valid, true, JSON.stringify(res.errors));
  assert.equal(res.errors.length, 0);
});

test("unknown edge type is rejected (keeps the space falsifiable)", () => {
  const res = validateEdge({ ...ok(), type: "related-to" });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.startsWith("type:")));
});

test("missing/empty from is rejected", () => {
  assert.equal(validateEdge({ ...ok(), from: "" }).valid, false);
  assert.equal(validateEdge({ ...ok(), from: undefined }).valid, false);
});

test("self-loop is rejected (not a cross-substrate edge)", () => {
  const res = validateEdge({ ...ok(), from: "X", to: "X" });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.startsWith("self-loop")));
});

test("missing provenance source is rejected", () => {
  const res = validateEdge({ ...ok(), source: "" });
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.startsWith("source:")));
});

test("confidence out of [0,1] or NaN is rejected", () => {
  assert.equal(validateEdge({ ...ok(), confidence: 1.5 }).valid, false);
  assert.equal(validateEdge({ ...ok(), confidence: -0.1 }).valid, false);
  assert.equal(validateEdge({ ...ok(), confidence: Number.NaN }).valid, false);
  assert.equal(validateEdge({ ...ok(), confidence: "0.9" }).valid, false);
  // boundary values are allowed
  assert.equal(validateEdge({ ...ok(), confidence: 0 }).valid, true);
  assert.equal(validateEdge({ ...ok(), confidence: 1 }).valid, true);
});

test("non-ISO addedAt is rejected, ISO accepted", () => {
  assert.equal(validateEdge({ ...ok(), addedAt: "yesterday" }).valid, false);
  assert.equal(validateEdge({ ...ok(), addedAt: "2026-06-03T00:00:00Z" }).valid, true);
});

test("missing addedBy is rejected", () => {
  assert.equal(validateEdge({ ...ok(), addedBy: "" }).valid, false);
});

test("non-object / array edge is rejected without throwing", () => {
  assert.equal(validateEdge(null).valid, false);
  assert.equal(validateEdge(42).valid, false);
  assert.equal(validateEdge([]).valid, false);
});

test("assertValidEdge throws on invalid, returns edge on valid", () => {
  assert.throws(() => assertValidEdge({ ...ok(), type: "bogus" }), /invalid cross-substrate edge/);
  const e = ok();
  assert.equal(assertValidEdge(e), e);
});

test("edgeKey is direction-significant and null on missing parts", () => {
  const e = ok();
  const k = edgeKey(e);
  assert.ok(typeof k === "string" && k.includes(e.from) && k.includes(e.to) && k.includes(e.type));
  // reversing from/to yields a different key
  assert.notEqual(edgeKey({ ...e, from: e.to, to: e.from }), k);
  assert.equal(edgeKey({ from: "a", to: "b" }), null); // no type
  assert.equal(edgeKey(null), null);
});

test("validateEdgeBatch separates valid from invalid and reports indices", () => {
  const res = validateEdgeBatch([ok(), { ...ok(), type: "nope" }, ok2()]);
  assert.equal(res.validEdges.length, 2);
  assert.equal(res.valid, false);
  assert.equal(res.errors[0].index, 1);
});

test("validateEdgeBatch dedups by edgeKey (first wins, dup index reported)", () => {
  const res = validateEdgeBatch([ok(), ok(), ok2()]);
  assert.equal(res.validEdges.length, 2, "identical edge collapsed");
  assert.deepEqual(res.duplicates, [1]);
});

test("validateEdgeBatch rejects a non-array batch", () => {
  const res = validateEdgeBatch("not-an-array");
  assert.equal(res.valid, false);
  assert.equal(res.errors[0].index, -1);
});

test("assertAddOnly passes when every existing key is preserved and reports added", () => {
  const existing = new Set(["a", "b"]);
  const proposed = new Set(["a", "b", "c"]);
  const r = assertAddOnly(existing, proposed);
  assert.deepEqual(r.added, ["c"]);
  assert.equal(r.addedCount, 1);
});

test("assertAddOnly THROWS when an existing edge would be dropped (deletion guard)", () => {
  const existing = new Set(["a", "b"]);
  const proposed = new Set(["a", "c"]); // b dropped
  assert.throws(() => assertAddOnly(existing, proposed), /ADD-only violation/);
});

test("assertAddOnly accepts plain arrays as well as Sets", () => {
  const r = assertAddOnly(["x"], ["x", "y"]);
  assert.equal(r.addedCount, 1);
});

// Second valid fixture with a different type for batch tests.
function ok2() {
  return {
    from: "cam",
    to: "kilo",
    type: "owned-by-slot",
    source: "slot-soul:kilo",
    confidence: 1,
    addedBy: "sierra",
    addedAt: "2026-06-03T15:30:00.000Z",
  };
}
