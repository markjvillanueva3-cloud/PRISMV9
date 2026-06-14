// scripts/append-cad-corrections-to-fix-ledger.test.mjs
// Tests for U-CAD-CAPTURE-LOOP writer: discover correction ledgers -> dedup-append net-new fix rows.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isCorrectionLedger,
  discoverCorrectionLedgers,
  existingKeySet,
  computeNewRows,
} from "./append-cad-corrections-to-fix-ledger.mjs";
import { correctionLedgerToFixRows, fixRowKey } from "./lib/cad-correction-to-fix-ledger.mjs";

const dieLedger = {
  ts: "2026-06-03T20:52:47.016Z", part: "die", docPrefix: "PRISM-DELTA-CLIVE-x", sourceFile: "cad-prototype-die-2026-05-19.json",
  cycle: { ok: true,
    before: { missing: ["bevel_face_chamfer", "cross_drilled_relief_holes"] },
    after: { verdict: "match", scorePct: 100, matched: ["bevel_face_chamfer", "cross_drilled_relief_holes"] },
    corrections: [
      { kind: "bevel_face_chamfer", op: { kind: "chamfer-edge", distanceMm: 1, edgeCount: 1 } },
      { kind: "cross_drilled_relief_holes", op: { kind: "radial-hole", radiusMm: 1.5, axis: "perpendicular" } },
    ] },
};

const FAKE_DIR = {
  "cad-correction-loop-live-ledger.json": JSON.stringify(dieLedger),
  "cad-die-roundtrip-ledger.json": JSON.stringify({ part: "die", built: {} }), // NOT a correction ledger (no cycle.before.missing)
  "other.json": "{}",
  "README.md": "x",
};
const fakeReaddir = () => Object.keys(FAKE_DIR);
const fakeRead = (p) => {
  const name = String(p).replace(/\\/g, "/").split("/").pop();
  if (!(name in FAKE_DIR)) throw new Error("ENOENT");
  return FAKE_DIR[name];
};

describe("isCorrectionLedger", () => {
  it("true only when cycle.before.missing is an array", () => {
    assert.equal(isCorrectionLedger(dieLedger), true);
    assert.equal(isCorrectionLedger({ part: "die" }), false);
    assert.equal(isCorrectionLedger({ cycle: { before: {} } }), false);
    assert.equal(isCorrectionLedger(null), false);
  });
});

describe("discoverCorrectionLedgers", () => {
  it("finds only cad-*.json with the correction shape (excludes roundtrip/other/README)", () => {
    const found = discoverCorrectionLedgers({ readdirImpl: fakeReaddir, readFileImpl: fakeRead });
    assert.equal(found.length, 1);
    assert.equal(found[0].name, "cad-correction-loop-live-ledger.json");
  });
  it("unreadable dir -> [] (fail-soft)", () => {
    assert.deepEqual(discoverCorrectionLedgers({ readdirImpl: () => { throw new Error("x"); } }), []);
  });
});

describe("existingKeySet", () => {
  it("parses jsonl rows into dedup keys, skips blank/malformed lines", () => {
    const rows = correctionLedgerToFixRows(dieLedger, { source: "L" });
    const text = JSON.stringify(rows[0]) + "\n\n{ bad json\n" + JSON.stringify(rows[1]);
    const set = existingKeySet(text);
    assert.equal(set.size, 2);
    assert.ok(set.has(fixRowKey(rows[0])));
  });
});

describe("computeNewRows", () => {
  it("die correction ledger vs EMPTY existing -> 2 net-new op-enriched rows", () => {
    const artifacts = discoverCorrectionLedgers({ readdirImpl: fakeReaddir, readFileImpl: fakeRead });
    const r = computeNewRows({ artifacts, existingText: "" });
    assert.equal(r.emitted, 2);
    assert.equal(r.netNew ?? r.newRows.length, 2);
    // rows sourced to the ledger basename (additive provenance, not the GT sourceFile)
    assert.ok(r.newRows.every((row) => row.source === "cad-correction-loop-live-ledger.json"));
    assert.ok(r.newRows.every((row) => row.trainsCadGen === true));
  });

  it("IDEMPOTENT: re-running against an existing ledger that already has the rows -> 0 net-new", () => {
    const artifacts = discoverCorrectionLedgers({ readdirImpl: fakeReaddir, readFileImpl: fakeRead });
    const first = computeNewRows({ artifacts, existingText: "" });
    const existingText = first.newRows.map((r) => JSON.stringify(r)).join("\n");
    const second = computeNewRows({ artifacts, existingText });
    assert.equal(second.newRows.length, 0);
    assert.equal(second.dup, 2);
  });

  it("ADDITIVE: rows do NOT collide with a GT-batch row of the same part/field (different source)", () => {
    // existing GT-batch die/bevel_face_chamfer row uses source = the GT catalog file
    const gtBatchRow = { part: "die", field: "bevel_face_chamfer", kind: "missing-feature", source: "cad-prototype-die-2026-05-19.json" };
    const artifacts = discoverCorrectionLedgers({ readdirImpl: fakeReaddir, readFileImpl: fakeRead });
    const r = computeNewRows({ artifacts, existingText: JSON.stringify(gtBatchRow) });
    assert.equal(r.newRows.length, 2); // correction-ledger source differs -> still net-new
  });
});
