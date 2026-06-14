/**
 * Tests for U-DAG-PICKER -- the dependency-aware pickup logic added to
 * .claude/helpers/priority-queue.mjs (buildEnvelopeIndex unitDeps capture +
 * depsSatisfied + partitionByDeps). The functions are pure (explicit inputs), so
 * these are hermetic fixtures; we import from the live patched main-tree helper.
 *
 * Run: node --test scripts/__tests__/dag-picker.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const PQ = "file:///H:/prism/.claude/helpers/priority-queue.mjs";
const { buildEnvelopeIndex, depsSatisfied, partitionByDeps } = await import(PQ);

describe("buildEnvelopeIndex captures dependency edges", () => {
  test("captures depends_on + dependencies(alt), normalized upper, skips empty", () => {
    const idx = buildEnvelopeIndex([
      { id: "M1", units: [
        { id: "u-a" },
        { id: "u-b", depends_on: ["u-a"] },
        { id: "u-c", dependencies: ["U-A", "u-b"] },
        { id: "u-d", depends_on: [] },        // empty -> not stored
      ] },
    ]);
    assert.ok(idx.unitDeps instanceof Map);
    assert.deepEqual(idx.unitDeps.get("U-B"), ["U-A"]);
    assert.deepEqual(idx.unitDeps.get("U-C"), ["U-A", "U-B"], "alt key + upper-normalized");
    assert.equal(idx.unitDeps.has("U-D"), false, "empty deps not stored");
    assert.equal(idx.unitDeps.has("U-A"), false, "no-deps unit absent");
  });
  test("handles nested phases[].units + bad input", () => {
    const idx = buildEnvelopeIndex([
      { id: "M2", phases: [{ units: [{ id: "u-x", depends_on: ["u-w"] }] }] },
      null, "garbage", { id: "", units: [{ id: "z", depends_on: ["a"] }] },
    ]);
    assert.deepEqual(idx.unitDeps.get("U-X"), ["U-W"]);
  });
  test("PHASE-LETTER ids excluded (collision + false-block hazard) — only canonical U- ids", () => {
    const idx = buildEnvelopeIndex([
      { id: "M-A", units: [{ id: "P0-U06", depends_on: ["P0-U02"] }] }, // phase-letter unit -> NO edge
      { id: "M-B", units: [{ id: "P0-U06", depends_on: ["P0-U99"] }] }, // same id, diff deps -> still excluded (no collision)
      { id: "M-C", units: [{ id: "U-REAL", depends_on: ["P0-U01", "U-DEP"] }] }, // canonical unit, mixed deps
      { id: "M-D", units: [{ id: "A2", depends_on: ["U-A"] }, { id: "H1", depends_on: ["U-B"] }] }, // letter ids -> excluded
    ]);
    assert.equal(idx.unitDeps.has("P0-U06"), false, "phase-letter unit gets no dep edge");
    assert.equal(idx.unitDeps.has("A2"), false);
    assert.equal(idx.unitDeps.has("H1"), false);
    assert.deepEqual(idx.unitDeps.get("U-REAL"), ["U-DEP"], "phase-letter dep dropped, canonical dep kept");
  });
  test("canonical key is FIRST-WINS (residual collision guard, never last-writer-wins)", () => {
    const idx = buildEnvelopeIndex([
      { id: "M1", units: [{ id: "U-X", depends_on: ["U-A"] }] },
      { id: "M2", units: [{ id: "U-X", depends_on: ["U-B"] }] }, // dup canonical -> first wins
    ]);
    assert.deepEqual(idx.unitDeps.get("U-X"), ["U-A"], "first-wins, not last-writer-wins");
  });
});

describe("depsSatisfied", () => {
  const idx = buildEnvelopeIndex([
    { id: "M", units: [{ id: "U-A" }, { id: "U-B", depends_on: ["U-A"] }, { id: "U-C", depends_on: ["U-A", "U-B"] }] },
  ]);
  test("no deps -> satisfied", () => {
    assert.equal(depsSatisfied({ unit_id: "U-A" }, idx, new Set()), true);
  });
  test("all deps shipped -> satisfied", () => {
    assert.equal(depsSatisfied({ unit_id: "U-B" }, idx, new Set(["U-A"])), true);
    assert.equal(depsSatisfied({ unit_id: "U-C" }, idx, new Set(["U-A", "U-B"])), true);
  });
  test("some dep unshipped -> blocked", () => {
    assert.equal(depsSatisfied({ unit_id: "U-B" }, idx, new Set()), false);
    assert.equal(depsSatisfied({ unit_id: "U-C" }, idx, new Set(["U-A"])), false, "U-B still unshipped");
  });
  test("fail-safe: no envIndex / no unitDeps / no unit_id -> satisfied (never block on missing data)", () => {
    assert.equal(depsSatisfied({ unit_id: "U-B" }, null, new Set()), true);
    assert.equal(depsSatisfied({ unit_id: "U-B" }, {}, new Set()), true);
    assert.equal(depsSatisfied({ title: "no id" }, idx, new Set()), true);
    assert.equal(depsSatisfied(null, idx, new Set()), true);
  });
});

describe("partitionByDeps", () => {
  const idx = buildEnvelopeIndex([
    { id: "M", units: [{ id: "U-A" }, { id: "U-B", depends_on: ["U-A"] }, { id: "U-C", depends_on: ["U-Z"] }] },
  ]);
  test("splits ready/blocked, preserves order, ready first when concatenated", () => {
    const units = [{ unit_id: "U-A" }, { unit_id: "U-B" }, { unit_id: "U-C" }, { unit_id: "U-D" }];
    const { ready, blocked } = partitionByDeps(units, idx, new Set(["U-A"])); // U-A shipped -> U-B ready; U-C blocked (U-Z)
    assert.deepEqual(ready.map((u) => u.unit_id), ["U-A", "U-B", "U-D"], "no-dep + satisfied-dep ready, order kept");
    assert.deepEqual(blocked.map((u) => u.unit_id), ["U-C"]);
  });
  test("empty / non-array -> empty partition", () => {
    assert.deepEqual(partitionByDeps([], idx, new Set()), { ready: [], blocked: [] });
    assert.deepEqual(partitionByDeps(null, idx, new Set()), { ready: [], blocked: [] });
  });
});
