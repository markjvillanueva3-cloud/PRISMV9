// nn-graph-retrain-lifecycle.heterophily.test.mjs -- BLACKWELL-AI-MS0/U-GNN-HETEROPHILY-RETRAIN-WIRE
// Verifies buildTrainArgs wires the H2GCN lever into the PRODUCTION retrain spawn: flag-gated
// (default OFF = byte-identical legacy args + heap), heap auto-bump when enabled, integer-guard,
// and no regression of the always-on trainer args. The live train is exercised separately
// (validate-heterophily-auroc.mjs); here we prove the arg construction deterministically.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTrainArgs, LIFECYCLE_DEFAULTS } from "./nn-graph-retrain-lifecycle.mjs";

const base = { ...LIFECYCLE_DEFAULTS };
const io = { candidatePath: "/c.json", graphPath: "/g.json" };

test("hops=0 (default): no --heterophily-hops; heap = cfg.heapMb (byte-identical legacy)", () => {
  const a = buildTrainArgs({ ...base, heterophilyHops: 0 }, io);
  assert.equal(a.includes("--heterophily-hops"), false);
  assert.ok(a.includes(`--max-old-space-size=${base.heapMb}`)); // 8192, unbumped
});

test("hops=3: passes --heterophily-hops 3 AND bumps the trainer heap to >=12288", () => {
  const a = buildTrainArgs({ ...base, heterophilyHops: 3 }, io);
  const i = a.indexOf("--heterophily-hops");
  assert.ok(i >= 0, "expected --heterophily-hops in args");
  assert.equal(a[i + 1], "3");
  assert.ok(a.includes("--max-old-space-size=12288"));
  assert.equal(a.includes(`--max-old-space-size=${base.heapMb}`), false); // not the unbumped 8192
});

test("hops=3 with a higher cfg.heapMb keeps the larger heap (Math.max, never shrinks)", () => {
  const a = buildTrainArgs({ ...base, heterophilyHops: 3, heapMb: 16384 }, io);
  assert.ok(a.includes("--max-old-space-size=16384"));
});

test("non-integer hops is ignored (Number.isInteger guard): no flag, heap unchanged", () => {
  const a = buildTrainArgs({ ...base, heterophilyHops: 3.5 }, io);
  assert.equal(a.includes("--heterophily-hops"), false);
  assert.ok(a.includes(`--max-old-space-size=${base.heapMb}`));
});

test("embedding-source is included when provided, absent otherwise", () => {
  const withEmbed = buildTrainArgs({ ...base }, { ...io, embeddingSourcePath: "/e.jsonl" });
  const ei = withEmbed.indexOf("--embedding-source");
  assert.ok(ei >= 0);
  assert.equal(withEmbed[ei + 1], "/e.jsonl");
  assert.equal(buildTrainArgs({ ...base }, io).includes("--embedding-source"), false);
});

test("always pins --out, --graph, --node-type-field, --neg-p-hard (no legacy-arg regression)", () => {
  const a = buildTrainArgs({ ...base, heterophilyHops: 0 }, io);
  assert.equal(a[a.indexOf("--out") + 1], "/c.json");
  assert.equal(a[a.indexOf("--graph") + 1], "/g.json");
  assert.equal(a[a.indexOf("--node-type-field") + 1], base.nodeTypeField); // "layer"
  assert.equal(a[a.indexOf("--neg-p-hard") + 1], String(base.negPHard));   // "0.7"
});
