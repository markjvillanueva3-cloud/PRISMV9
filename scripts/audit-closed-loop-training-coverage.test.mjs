// scripts/audit-closed-loop-training-coverage.test.mjs
// Tests for U-CLOSED-LOOP-COVERAGE: fleet closed-loop training coverage auditor.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { auditEntry, auditSources } from "./audit-closed-loop-training-coverage.mjs";

// A converter stub: emits one pair per non-blank line whose text contains "good".
const stubConvert = (text) => ({
  rows: String(text || "").split("\n").filter((l) => l.includes("good")).map((l, i) => ({ instruction: `q${i}`, output: l.trim() })),
  invalid: 0, skipped: 0,
});

function reader(map) {
  return (abs) => {
    const key = Object.keys(map).find((k) => abs.replace(/\\/g, "/").endsWith(k));
    if (key === undefined) { const e = new Error("ENOENT"); throw e; }
    return map[key];
  };
}

describe("auditEntry", () => {
  it("wired-with-signal: pairs exist AND the source id is registered", () => {
    const e = auditEntry(
      { domain: "x", paths: ["a.jsonl"], convert: stubConvert, sourceId: "src-x" },
      { readFileImpl: reader({ "a.jsonl": "good one\ngood two\nnope" }), isRegistered: (id) => id === "src-x" },
    );
    assert.equal(e.rows, 3);
    assert.equal(e.trainablePairs, 2);
    assert.equal(e.wired, true);
    assert.equal(e.status, "wired-with-signal");
  });

  it("UNWIRED-WITH-SIGNAL: pairs exist but the source is NOT registered (the actionable gap)", () => {
    const e = auditEntry(
      { domain: "x", paths: ["a.jsonl"], convert: stubConvert, sourceId: "src-x" },
      { readFileImpl: reader({ "a.jsonl": "good one" }), isRegistered: () => false },
    );
    assert.equal(e.status, "UNWIRED-WITH-SIGNAL");
  });

  it("sparse: ledger present but yields 0 trainable pairs (needs data, not wiring)", () => {
    const e = auditEntry(
      { domain: "x", paths: ["a.jsonl"], convert: stubConvert, sourceId: "src-x" },
      { readFileImpl: reader({ "a.jsonl": "nope\nstill nope" }), isRegistered: () => true },
    );
    assert.equal(e.trainablePairs, 0);
    assert.equal(e.status, "sparse");
  });

  it("no-converter: rows present but no converter maps the schema", () => {
    const e = auditEntry(
      { domain: "x", paths: ["a.jsonl"], convert: null, sourceId: null },
      { readFileImpl: reader({ "a.jsonl": "row1\nrow2" }) },
    );
    assert.equal(e.rows, 2);
    assert.equal(e.trainablePairs, null);
    assert.equal(e.status, "no-converter");
  });

  it("absent: the ledger file does not exist", () => {
    const e = auditEntry(
      { domain: "x", paths: ["missing.jsonl"], convert: stubConvert, sourceId: "src-x" },
      { readFileImpl: reader({}), isRegistered: () => true },
    );
    assert.equal(e.status, "absent");
    assert.equal(e.rows, 0);
  });

  it("multi-path: sums rows + dedups pairs across files", () => {
    const e = auditEntry(
      { domain: "x", paths: ["a.jsonl", "b.jsonl"], convert: stubConvert, sourceId: "src-x" },
      { readFileImpl: reader({ "a.jsonl": "good one", "b.jsonl": "good one\ngood two" }), isRegistered: () => true },
    );
    assert.equal(e.rows, 3);
    assert.equal(e.trainablePairs, 2); // "good one" dedups across a+b
  });
});

describe("auditSources", () => {
  it("summarizes statuses across entries", () => {
    const ledgers = [
      { domain: "a", paths: ["a.jsonl"], convert: stubConvert, sourceId: "s" },
      { domain: "b", paths: ["miss.jsonl"], convert: stubConvert, sourceId: "s2" },
    ];
    const { summary } = auditSources(ledgers, {
      readFileImpl: reader({ "a.jsonl": "good x" }), isRegistered: () => true,
    });
    assert.equal(summary.total, 2);
    assert.equal(summary.wiredWithSignal, 1);
    assert.equal(summary.absent, 1);
  });
});
