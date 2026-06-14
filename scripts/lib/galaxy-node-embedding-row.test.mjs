/**
 * Tests for galaxy-node-embedding-row.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-NODEFEAT).
 * Reference-value tests for the GNN node-feature row builder (reuses india's
 * aggregateEmbeddings + quantizeInt8). Run:
 *   node --test scripts/lib/galaxy-node-embedding-row.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { galaxyNodeId, buildGalaxyEmbeddingRow, mergeRows } from "./galaxy-node-embedding-row.mjs";

// --- galaxyNodeId ---
test("galaxyNodeId: matches the graph roost node form ghost.galaxy.<g>", () => {
  assert.equal(galaxyNodeId("mill"), "ghost.galaxy.mill");
  assert.equal(galaxyNodeId(" lathe "), "ghost.galaxy.lathe");
});

// --- buildGalaxyEmbeddingRow: L2-normalize then int8-quantize (q[i] = round(unit_i * 127)) ---
test("buildGalaxyEmbeddingRow: single vector -> L2-normalized + quantized row", () => {
  // [3,4] -> /5 -> [0.6, 0.8] -> *127 -> [76.2, 101.6] -> round -> [76, 102]
  const r = buildGalaxyEmbeddingRow("mill", [[3, 4]]);
  assert.equal(r.n, "ghost.galaxy.mill");
  assert.deepEqual(r.q, [76, 102]);
});

test("buildGalaxyEmbeddingRow: averages multiple doc vectors (centroid) then normalizes", () => {
  // mean([1,0],[0,1]) = [0.5,0.5] -> L2 -> [0.7071,0.7071] -> *127 -> [89.8,89.8] -> [90,90]
  const r = buildGalaxyEmbeddingRow("g", [[1, 0], [0, 1]]);
  assert.equal(r.q.length, 2);
  assert.equal(r.q[0], r.q[1]);
  assert.equal(r.q[0], 90);
  // every component is a valid int8 in [-127,127]
  assert.ok(r.q.every((x) => Number.isInteger(x) && x >= -127 && x <= 127));
});

test("buildGalaxyEmbeddingRow: dequantization round-trips to the unit vector (trainer reads q/127)", () => {
  const r = buildGalaxyEmbeddingRow("g", [[3, 4]]);
  const recovered = r.q.map((x) => x / 127); // exactly what loadEmbeddingFeatures does
  assert.ok(Math.abs(recovered[0] - 0.6) < 0.01);
  assert.ok(Math.abs(recovered[1] - 0.8) < 0.01);
});

test("buildGalaxyEmbeddingRow: FAILURE/ADVERSARIAL -> null (bad galaxy / no vectors / empty)", () => {
  assert.equal(buildGalaxyEmbeddingRow("", [[1, 0]]), null);
  assert.equal(buildGalaxyEmbeddingRow(null, [[1, 0]]), null);
  assert.equal(buildGalaxyEmbeddingRow("g", []), null);
  assert.equal(buildGalaxyEmbeddingRow("g", null), null);
  assert.equal(buildGalaxyEmbeddingRow("g", [[0, 0]]), null); // all-zero centroid -> null (no corrupt row)
});

test("buildGalaxyEmbeddingRow: deterministic -- same input twice byte-identical (PURE)", () => {
  assert.deepEqual(buildGalaxyEmbeddingRow("g", [[1, 2, 3]]), buildGalaxyEmbeddingRow("g", [[1, 2, 3]]));
});

// --- mergeRows: dedup by n, new wins, existing preserved ---
test("mergeRows: preserves existing engine rows + adds galaxy rows, dedups by n (new wins)", () => {
  const existing = [
    { n: "eng.Foo", q: [1] },
    { n: "ghost.galaxy.mill", q: [9] }, // stale galaxy row -> should be REPLACED
  ];
  const fresh = [
    { n: "ghost.galaxy.mill", q: [76, 102] },
    { n: "ghost.galaxy.lathe", q: [50] },
  ];
  const merged = mergeRows(existing, fresh);
  const byId = Object.fromEntries(merged.map((r) => [r.n, r.q]));
  assert.deepEqual(byId["eng.Foo"], [1]); // existing engine row preserved
  assert.deepEqual(byId["ghost.galaxy.mill"], [76, 102]); // stale galaxy row replaced (new wins)
  assert.deepEqual(byId["ghost.galaxy.lathe"], [50]); // new galaxy row added
  assert.equal(merged.length, 3); // no duplicates
});

test("mergeRows: ADVERSARIAL null/empty inputs -> safe array (no throw)", () => {
  assert.deepEqual(mergeRows(null, null), []);
  assert.deepEqual(mergeRows([{ n: "a", q: [1] }], null), [{ n: "a", q: [1] }]);
  assert.deepEqual(mergeRows(null, [{ n: "b", q: [2] }]), [{ n: "b", q: [2] }]);
});
