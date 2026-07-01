/**
 * Tests for build-ghostwire-lora-dataset.mjs buildDataset() (U-DELTA-GHOSTWIRE-CONVERTER).
 * Run: node scripts/build-ghostwire-lora-dataset.test.mjs   (node:test auto-runs on exit)
 * fs is injected so the test is hermetic (no disk). Asserts the honest confirmed/pending split
 * and dedup survive the build layer (R9).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDataset } from "./build-ghostwire-lora-dataset.mjs";

test("buildDataset: confirmed-only + dedup with injected fs", () => {
  const confirmed = { engineName: "E1", proposedWiring: "prism_dev", reason: "r", validation: { status: "confirmed" } };
  const confirmed2 = { engineName: "E2", proposedWiring: "prism_cad", validation: { status: "confirmed" } };
  const pending = { engineName: "E3", proposedWiring: "prism_ai", validation: { status: "pending" } };
  const text = [confirmed, confirmed, confirmed2, pending].map((o) => JSON.stringify(o)).join("\n");
  const ds = buildDataset({ readFileImpl: () => text });
  assert.equal(ds.confirmed, 3, "three confirmed rows (E1 twice + E2)");
  assert.equal(ds.pending, 1, "one pending row, skipped");
  assert.equal(ds.rawPairs, 3, "three pairs pre-dedup");
  assert.equal(ds.uniquePairs, 2, "E1 dup collapses -> 2 unique");
  assert.equal(ds.duplicates, 1, "one collapsed duplicate");
});

test("buildDataset: missing/unreadable source -> all-zero, never throws", () => {
  const ds = buildDataset({ readFileImpl: () => { throw new Error("ENOENT"); } });
  assert.equal(ds.uniquePairs, 0);
  assert.equal(ds.confirmed, 0);
  assert.deepEqual(ds.rows, []);
});
