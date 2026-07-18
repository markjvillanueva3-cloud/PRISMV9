/**
 * Tests for vec2d-ledger-to-training.mjs — the pure converter for the vec2d DXF training lane
 * (U-DELTA-VEC2D-TRAINING-LANE, slot:delta 2026-07-02, Domain 10 closed-loop).
 *
 * Real reference-value coverage (R9): exact instruction/input/output strings for inch / mm /
 * units-unknown / no-dims rows; the inch-trap (a units-unknown row never emits a positive mm
 * claim); describeDim rules (angular always deg, radial unit-unconfirmed, fixed-decimal fmtNum);
 * convertVec2d {rows,invalid,skipped} contract; dedup on the ASSEMBLER key
 * JSON.stringify([instruction,output]) (NOT the space-join); and the sourceId wiring guard.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  fmtNum,
  describeDim,
  vec2dRowToTrainingPairs,
  convertVec2d,
  dedupVec2dPairs,
} from "../vec2d-ledger-to-training.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const parsedRow = (over) => ({
  v: 1, ts: "2026-07-02T00:00:00.000Z", path: "C:/x.dxf", name: "x.dxf", format: "dxf",
  status: "parsed", ok: true, units: "in", units_unknown: false, mm_anomaly: false,
  entityCount: 4, dimCount: 0, dimensions: [], bounds: null, layers: ["0"], partInfo: null,
  reason: null, warnings: [], ...over,
});

// ── fmtNum ──
test("fmtNum collapses trailing zeros to one canonical token", () => {
  assert.equal(fmtNum(12.5), "12.5");
  assert.equal(fmtNum("12.5000"), "12.5");
  assert.equal(fmtNum(0.5), "0.5");
  assert.equal(fmtNum(90), "90");
  assert.equal(fmtNum("not-a-number"), "not-a-number"); // non-finite passthrough
});

// ── describeDim ──
test("describeDim: angular is ALWAYS deg, ignoring the header length unit", () => {
  assert.equal(describeDim({ type: "angular", value: 90, unit: "in" }, "in"), "an angular dimension of 90 deg");
});
test("describeDim: diameter/radial/linear carry the length unit; unconfirmed when unknown", () => {
  assert.equal(describeDim({ type: "diameter", value: 0.5, unit: "in" }, "in"), "a diameter of 0.5 in");
  assert.equal(describeDim({ type: "radial", value: 2, unit: "unknown" }, "unknown"), "a radius of 2 (unit unconfirmed)");
  assert.equal(describeDim({ type: "linear", value: 12.5, unit: undefined }, "mm"), "a linear dimension of 12.5 mm"); // falls back to drawing units
});

// ── vec2dRowToTrainingPairs: inch reference (exact strings) ──
test("inch drawing with linear+diameter dims → exact learnable pair", () => {
  const row = parsedRow({
    units: "in",
    dimensions: [
      { type: "linear", value: 12.5, unit: "in" },
      { type: "diameter", value: 0.5, unit: "in" },
    ],
    dimCount: 2,
  });
  const [p] = vec2dRowToTrainingPairs(row);
  assert.ok(p, "one pair emitted");
  assert.equal(p.input, "$INSUNITS=in\nDIM linear 12.5\nDIM diameter 0.5");
  assert.equal(
    p.output,
    "The drawing defines 2 dimensions: a linear dimension of 12.5 in; a diameter of 0.5 in. Units are in; values are in in and must not be rescaled.",
  );
  assert.match(p.instruction, /Restate each dimensional callout/);
  assert.ok(!p.instruction.includes("x.dxf"), "instruction is a CONSTANT frame — no filename leak");
});

// ── inch-trap: units-unknown emits a discipline clause, never a positive mm claim ──
test("units-unknown drawing → UNCONFIRMED clause, no positive mm claim (inch-trap)", () => {
  const row = parsedRow({ units: "unknown", units_unknown: true, dimensions: [{ type: "linear", value: 5, unit: "unknown" }], dimCount: 1 });
  const [p] = vec2dRowToTrainingPairs(row);
  assert.equal(p.input, "$INSUNITS=unresolved\nDIM linear 5");
  assert.match(p.output, /UNCONFIRMED/);
  assert.match(p.output, /do NOT assume/);
  // must never make a POSITIVE mm claim (the negative "do NOT assume millimeters" is legitimate)
  assert.ok(!/Units are mm/.test(p.output), "no false 'Units are mm'");
  assert.ok(!/values are in mm/.test(p.output), "no false 'values are in mm'");
});

// ── real mm ($INSUNITS=4) is accepted, not rejected ──
test("real mm drawing → valid mm pair (a genuine $INSUNITS=4 is not rejected)", () => {
  const row = parsedRow({ units: "mm", mm_anomaly: true, dimensions: [{ type: "linear", value: 25, unit: "mm" }], dimCount: 1 });
  const [p] = vec2dRowToTrainingPairs(row);
  assert.equal(p.input, "$INSUNITS=mm\nDIM linear 25");
  assert.match(p.output, /Units are mm; values are in mm and must not be rescaled\./);
});

// ── parsed-no-dims still emits a units-discipline pair (defect #7) ──
test("parsed-no-dims drawing → 1 units-discipline pair (no DIMENSION entities)", () => {
  const row = parsedRow({ status: "parsed-no-dims", units: "in", dimensions: [], dimCount: 0, entityCount: 3 });
  const [p] = vec2dRowToTrainingPairs(row);
  assert.ok(p, "still emits a pair");
  assert.equal(p.input, "$INSUNITS=in\nNO_DIMENSION_ENTITIES");
  assert.match(p.output, /no explicit DIMENSION callouts/);
  assert.match(p.output, /Units are in/);
});

// ── non-parsed statuses emit NO pair ──
test("dwg / parse-error / too-large / read-error / binary → NO pair", () => {
  for (const status of ["dwg-unsupported", "parse-error", "too-large", "read-error", "binary-nonparseable"]) {
    assert.deepEqual(vec2dRowToTrainingPairs({ status, ok: false, units: null }), [], `${status} → []`);
  }
  // a 'parsed' row with ok:false (malformed) also yields nothing
  assert.deepEqual(vec2dRowToTrainingPairs({ status: "parsed", ok: false }), []);
  assert.deepEqual(vec2dRowToTrainingPairs(null), []);
});

// ── convertVec2d contract ──
test("convertVec2d returns {rows,invalid,skipped}; non-parsed → skipped; bad JSON → invalid", () => {
  const lines = [
    JSON.stringify(parsedRow({ dimensions: [{ type: "linear", value: 1, unit: "in" }], dimCount: 1 })),
    JSON.stringify({ status: "dwg-unsupported", ok: false, units: null }),
    "{ not json",
    "",
    JSON.stringify({ status: "parse-error", ok: false, units: null }),
  ].join("\n");
  const { rows, invalid, skipped } = convertVec2d(lines);
  assert.equal(rows.length, 1, "one parsed row → one pair");
  assert.equal(invalid, 1, "one malformed JSON line");
  assert.equal(skipped, 2, "dwg + parse-error skipped");
});

// ── dedup on the ASSEMBLER key (defect #5): (instruction,output), input excluded ──
test("dedupVec2dPairs collapses same (instruction,output) with different input to one", () => {
  const a = { instruction: "I", input: "IN-A", output: "O" };
  const b = { instruction: "I", input: "IN-B", output: "O" }; // same instruction+output, diff input
  const { rows, duplicates } = dedupVec2dPairs([a, b]);
  assert.equal(rows.length, 1, "collapsed on (instruction,output)");
  assert.equal(duplicates, 1);
  // regression for the space-join collision: different output must NOT collapse
  const c = { instruction: "I", input: "x", output: "O2" };
  assert.equal(dedupVec2dPairs([a, c]).rows.length, 2, "different output kept");
});

// ── sourceId wiring guard (defect: UNWIRED-WITH-SIGNAL) ──
test("CLOSED_LOOP_LEDGERS cad-vec2d sourceId is registered as a lora-training-jsonl SOURCE", () => {
  const audit = fs.readFileSync(path.join(ROOT, "scripts", "audit-closed-loop-training-coverage.mjs"), "utf8");
  const inv = fs.readFileSync(path.join(ROOT, "scripts", "build-fleet-training-corpus-inventory.mjs"), "utf8");
  assert.match(audit, /sourceId:\s*["']cad-vec2d-training["']/, "auditor registers the sourceId");
  assert.match(audit, /convertVec2d/, "auditor imports + uses convertVec2d");
  assert.match(inv, /id:\s*["']cad-vec2d-training["']/, "inventory declares the source id");
  assert.match(inv, /cad-vec2d-training-dataset\.jsonl/, "inventory points at the produced dataset");
});
