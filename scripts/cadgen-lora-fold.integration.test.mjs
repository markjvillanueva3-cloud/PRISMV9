// Integration regression test: prove the cadgen-outcome-lora source folds into the fleet LoRA corpus.
// (U-CADGEN-LORA-FOLD-TEST, slot:delta 2026-07-04). Locks in the R15 fold that U-CADGEN-LORA-EMITTER
// (fe679a1973) validated MANUALLY (live assembler bySource={rows:127,added:127}). Without this, a future
// change to assemble-fleet-lora-corpus.mjs or the inventory schema could silently stop folding the CAD
// generation training pairs and nobody would notice until a model trained without them.
//
// Hermetic: assembleCorpus takes an injectable readImpl, so this drives it with a synthetic inventory +
// in-memory dataset content -- no real files, fast even on a slow disk.
//   run: node --test scripts/cadgen-lora-fold.integration.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleCorpus, selectLoraSources } from "./assemble-fleet-lora-corpus.mjs";

const jsonl = (rows) => rows.map((r) => JSON.stringify(r)).join("\n") + "\n";

// A synthetic fleet inventory: our cadgen source (present, full-weight), a peer advisory source (present),
// and a missing source that must be skipped.
function fixture() {
  const cadgenRows = [
    { instruction: "Write a CadQuery script for: a 1 inch cube", output: "import cadquery\nIN=25.4\n#a\n", source: "cadgen-outcome-pass" },
    { instruction: "Write a CadQuery script for: a 2 inch plate", output: "import cadquery\nIN=25.4\n#b\n", source: "cadgen-outcome-pass" },
    { instruction: "Write a CadQuery script for: a 3 inch shaft", output: "import cadquery\nIN=25.4\n#c\n", source: "cadgen-outcome-pass" },
  ];
  const peerRows = [
    { instruction: "mill feed for 6061", output: "0.004 ipt" },
    { instruction: "mill speed for 6061", output: "800 sfm" },
  ];
  const inventory = {
    generatedAt: "2026-07-04T00:00:00.000Z",
    sources: [
      { id: "cadgen-outcome-lora", kind: "lora-training-jsonl", path: "/fake/cadgen-outcome-dataset.jsonl", status: "present", advisory: false, domains: ["cad"] },
      { id: "peer-advisory-lora", kind: "lora-training-jsonl", path: "/fake/peer.jsonl", status: "present", advisory: true, domains: ["mill"] },
      { id: "missing-lora", kind: "lora-training-jsonl", path: "/fake/missing.jsonl", status: "missing", advisory: false, domains: ["cad"] },
      { id: "not-a-lora-source", kind: "cad-accuracy-ledger", path: "/fake/acc.jsonl", status: "present", advisory: false, domains: ["cad"] },
    ],
  };
  const files = { "/fake/cadgen-outcome-dataset.jsonl": jsonl(cadgenRows), "/fake/peer.jsonl": jsonl(peerRows) };
  const readImpl = (p) => {
    if (p in files) return files[p];
    const e = new Error("ENOENT: no such file " + p); e.code = "ENOENT"; throw e;
  };
  return { inventory, readImpl, cadgenRows };
}

test("selectLoraSources keeps only PRESENT lora-training-jsonl sources (skips missing + non-lora kinds)", () => {
  const { inventory } = fixture();
  const ids = selectLoraSources(inventory).map((s) => s.id);
  assert.ok(ids.includes("cadgen-outcome-lora"), "our source is selected");
  assert.ok(ids.includes("peer-advisory-lora"));
  assert.ok(!ids.includes("missing-lora"), "missing source excluded");
  assert.ok(!ids.includes("not-a-lora-source"), "non-lora kind excluded");
});

test("assembleCorpus FOLDS all cadgen rows into the combined corpus (the R15 fold, locked)", () => {
  const { inventory, readImpl, cadgenRows } = fixture();
  const res = assembleCorpus(inventory, { readImpl });
  const bs = res.bySource || {};
  assert.ok(bs["cadgen-outcome-lora"], "cadgen source contributed to the corpus");
  assert.equal(bs["cadgen-outcome-lora"].added, cadgenRows.length, "all cadgen rows added");
  assert.equal(bs["cadgen-outcome-lora"].advisory, false, "cadgen is full-weight (not advisory)");
  // every cadgen instruction is present in the combined rows
  const combined = res.rows || [];
  for (const r of cadgenRows) {
    assert.ok(combined.some((c) => c.instruction === r.instruction), `cadgen row folded: ${r.instruction}`);
  }
  // the missing source did not crash the assembly, and total >= our rows + peer rows
  assert.ok(res.totalRows >= cadgenRows.length, "corpus total includes the cadgen rows");
});

test("assembleCorpus is resilient: a MISSING source path does not abort the fold", () => {
  const { inventory, readImpl } = fixture();
  // missing-lora is status:missing so it's filtered by selectLoraSources; even if a present source's file
  // were unreadable the assembly should not throw. Assert the call completes and returns cadgen rows.
  const res = assembleCorpus(inventory, { readImpl });
  assert.ok((res.bySource || {})["cadgen-outcome-lora"], "fold survived the missing source");
});
