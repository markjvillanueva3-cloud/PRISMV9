// Tests for bench-embed-quantize-recall.mjs exports (U-EMBED-BINARY-QUANTIZE validation harness).
// The recall math is the already-tested lib; here we pin the harness's arg parsing + row loading.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs, loadVectors } from "./bench-embed-quantize-recall.mjs";

test("parseArgs -- defaults + flag overrides + positional file", () => {
  const d = parseArgs([]);
  assert.equal(d.k, 5);
  assert.equal(d.cand, 100);
  assert.equal(d.limit, Infinity);
  assert.ok(d.file.endsWith(path.join("nn-graph", "ghost-node-embeddings.jsonl")));
  const o = parseArgs(["--k=10", "--cand=50", "--limit=20"]);
  assert.deepEqual([o.k, o.cand, o.limit], [10, 50, 20]);
  // a bad numeric flag falls back to the default, never NaN
  assert.equal(parseArgs(["--k=oops"]).k, 5);
});

test("loadVectors -- skips the __meta header + non-vector rows, honours limit", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bench-"));
  const f = path.join(dir, "e.jsonl");
  fs.writeFileSync(f, [
    JSON.stringify({ __meta: true, model: "nomic", dim: 3 }),
    JSON.stringify({ id: "a", q: [1, -2, 3] }),
    JSON.stringify({ id: "b", q: [-1, 2, -3] }),
    JSON.stringify({ id: "novec", text: "no q field" }), // skipped
    "",                                                    // blank skipped
    JSON.stringify({ id: "c", q: [4, 5, 6] }),
  ].join("\n"));
  assert.equal(loadVectors(f, Infinity).length, 3, "3 vector rows, meta + non-vector + blank skipped");
  assert.deepEqual(loadVectors(f, 2)[1], [-1, 2, -3], "limit honoured, vectors in order");
  assert.equal(loadVectors(f, 1).length, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});
