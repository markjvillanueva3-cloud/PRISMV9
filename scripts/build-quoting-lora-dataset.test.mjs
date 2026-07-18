/**
 * Tests for build-quoting-lora-dataset.mjs — recordToExample / splitDataset / build.
 * Real-value assertions (cost math, margin, source-tagging) + adversarial inputs.
 * Run: node --test scripts/build-quoting-lora-dataset.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { recordToExample, splitDataset, build } from "./build-quoting-lora-dataset.mjs";

const REC = {
  customer: "ACME", part_id: "AF-102", doc_date: "2026-05-28",
  actual_revenue_usd: 200, estimated_time_in_cut_s: 3600, machine_rate_usd_per_hr: 95,
  estimated_material_spend_usd: 60, machine_class: "mill", material_iso: "P", revenue_source: "docustrata-real",
};

test("recordToExample: honest cost derivation (labor + material = total, margin)", () => {
  const ex = recordToExample(REC, 0);
  // labor = (3600/3600)*95 = 95; total = 95 + 60 = 155; margin = (200-155)/200 = 22.5%
  assert.ok(ex.output.includes("$95"), "labor cost shown");
  assert.ok(ex.output.includes("$155"), "total cost shown");
  assert.ok(ex.output.includes("22.5%"), "margin derived");
  assert.equal(ex.metadata.total_cost_usd, 155);
  assert.equal(ex.metadata.margin_pct, 22.5);
  assert.equal(ex.metadata.revenue_source, "docustrata-real");
  assert.ok(ex.id.includes("AF-102") && ex.id.includes("ACME"));
  assert.ok(ex.instruction.includes("AF-102"));
  assert.ok(!ex.output.includes("data-ceiling"), "real source → no synth caveat");
});

test("recordToExample: synth source → R12 data-ceiling caveat stamped", () => {
  const ex = recordToExample({ ...REC, revenue_source: "docustrata-synth" }, 1);
  assert.ok(ex.output.includes("data-ceiling"), "synth label carries the honesty caveat");
  assert.ok(ex.output.includes("SYNTH"));
});

test("recordToExample: no revenue label → states it, no fabricated margin", () => {
  const ex = recordToExample({ ...REC, actual_revenue_usd: null }, 2);
  assert.ok(ex.output.includes("No realized revenue label"));
  assert.equal(ex.metadata.margin_pct, null);
});

test("recordToExample: defensive on null/empty/missing fields (gotcha #6)", () => {
  const ex = recordToExample(null, 7);
  assert.equal(ex.metadata.customer, "UNSPECIFIED");
  assert.ok(ex.id.includes("part-7"));
  assert.equal(ex.metadata.total_cost_usd, 0);
  const ex2 = recordToExample({ customer: "X" }, 3);
  assert.equal(ex2.metadata.machine_class, "unspecified");
});

test("splitDataset: deterministic index-based split, all examples accounted for", () => {
  const xs = Array.from({ length: 30 }, (_, i) => ({ id: "e" + i }));
  const { train, val, test } = splitDataset(xs);
  assert.equal(train.length + val.length + test.length, 30, "no example lost or duplicated");
  assert.ok(val.length > 0 && test.length > 0 && train.length > 0);
  // deterministic: index 0 → val (0 % 5 === 0)
  assert.equal(val[0].id, "e0");
  // re-run identical
  const again = splitDataset(xs);
  assert.deepEqual(again.train.map((e) => e.id), train.map((e) => e.id));
});

test("splitDataset: defensive on null/non-array", () => {
  const s = splitDataset(null);
  assert.deepEqual([s.train, s.val, s.test], [[], [], []]);
});

test("build: injected records → counts + splits (no fs)", () => {
  const records = Array.from({ length: 12 }, (_, i) => ({ ...REC, part_id: "P" + i }));
  const res = build({ records, limit: 10 });
  assert.equal(res.ok, true);
  assert.equal(res.counts.source, 12);
  assert.equal(res.counts.used, 10);
  assert.equal(res.counts.train + res.counts.val + res.counts.test, 10);
  assert.equal(res.splits.train[0].metadata.domain, "quoting");
});

test("build: corpus read failure → {ok:false} with reason (fail-loud R12)", () => {
  const res = build({ corpusPath: "H:/prism/__does_not_exist__.json", records: undefined });
  assert.equal(res.ok, false);
  assert.ok(/corpus read failed/.test(res.reason));
});
