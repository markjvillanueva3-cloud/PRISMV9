/**
 * scripts/quoting-baseline-from-corpus.test.mjs — pure-function tests for the
 * corpus-source baseline bootstrap. node --test compatible.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  derivePartId,
  rateForMachineClass,
  timeForBucket,
  materialSpendForClass,
  mergeFileIntoRecord,
  finalizeRecord,
  normalizeClass,
} from "./quoting-baseline-from-corpus.mjs";

test("normalizeClass — strips vendor suffix to canonical class", () => {
  assert.equal(normalizeClass("mill"), "mill");
  assert.equal(normalizeClass("mill_hurco"), "mill");
  assert.equal(normalizeClass("lathe_okuma"), "lathe");
  assert.equal(normalizeClass("WEDM"), "wedm");
  // When neither full key nor prefix is canonical, return original (downstream defaults will apply).
  assert.equal(normalizeClass("nosuch_thing"), "nosuch_thing");
  assert.equal(normalizeClass(null), null);
  assert.equal(normalizeClass(""), null);
});

test("rateForMachineClass — known classes return real rates", () => {
  assert.equal(rateForMachineClass("wire-edm"), 110);
  assert.equal(rateForMachineClass("WEDM"), 110);
  assert.equal(rateForMachineClass("sinker"), 100);
  assert.equal(rateForMachineClass("mill"), 95);
  assert.equal(rateForMachineClass("lathe"), 85);
  assert.equal(rateForMachineClass("grinder"), 75);
});

test("rateForMachineClass — iter56 vendor-suffixed classes normalize", () => {
  assert.equal(rateForMachineClass("mill_hurco"), 95);
  assert.equal(rateForMachineClass("lathe_okuma"), 85);
  assert.equal(rateForMachineClass("LATHE_HAAS"), 85);
});

test("rateForMachineClass — unknown/null defaults to 95", () => {
  assert.equal(rateForMachineClass(null), 95);
  assert.equal(rateForMachineClass(undefined), 95);
  assert.equal(rateForMachineClass(""), 95);
  assert.equal(rateForMachineClass("nosuchclass"), 95);
  assert.equal(rateForMachineClass(123), 95);
});

test("timeForBucket — buckets map to seconds", () => {
  assert.equal(timeForBucket("program"), 3600);
  assert.equal(timeForBucket("cad"), 1800);
  assert.equal(timeForBucket("setup"), 1200);
  assert.equal(timeForBucket("scan"), 600);
  assert.equal(timeForBucket("other"), 300);
});

test("timeForBucket — unknown defaults to 300", () => {
  assert.equal(timeForBucket(null), 300);
  assert.equal(timeForBucket(""), 300);
  assert.equal(timeForBucket("nosuchbucket"), 300);
});

test("materialSpendForClass — known classes get class-specific spend", () => {
  assert.equal(materialSpendForClass("wire-edm"), 80);
  assert.equal(materialSpendForClass("lathe"), 50);
  assert.equal(materialSpendForClass("grinder"), 40);
  assert.equal(materialSpendForClass(null), 60); // mill default
});

test("derivePartId — parent folder with digits is the part_id", () => {
  // Real JM Die shapes from iter56 inventory sample
  assert.equal(derivePartId("H:/PRISM/JM DIE/_PART LIBRARY/AAAMECONINGPIN/R910/part.json"), "R910");
  assert.equal(derivePartId("H:/PRISM/JM DIE/_PART LIBRARY/AAAS/A0763-99-12/print.pdf"), "A0763-99-12");
});

test("derivePartId — non-numeric parent falls back to file basename", () => {
  assert.equal(derivePartId("H:/PRISM/JM DIE/CUSTOMER_X/program.MIN"), "PROGRAM");
});

test("derivePartId — handles Windows backslashes + edge inputs", () => {
  assert.equal(derivePartId("H:\\PRISM\\JM DIE\\_PART LIBRARY\\X\\R910\\file.pdf"), "R910");
  assert.equal(derivePartId(""), "_UNKNOWN_");
  assert.equal(derivePartId(null), "_UNKNOWN_");
});

test("mergeFileIntoRecord — null customer skipped", () => {
  const r = mergeFileIntoRecord(null, { customer: "", path: "/x/R910/p.json" }, null);
  assert.equal(r, null);
  const r2 = mergeFileIntoRecord(null, { customer: "_", path: "/x/R910/p.json" }, null);
  assert.equal(r2, null);
});

test("mergeFileIntoRecord — fresh record seeded from first file", () => {
  const file = {
    customer: "FONTANA",
    path: "/JM DIE/_PART LIBRARY/FONTANA/B-1234/print.pdf",
    bucket: "print",
    material: "1018",
    machine_class: "lathe",
  };
  const r = mergeFileIntoRecord(null, file, null);
  assert.equal(r.customer, "FONTANA");
  assert.equal(r.part_id, "B-1234");
  assert.equal(r.files.length, 1);
  assert.deepEqual(r.buckets, ["print"]);
  assert.deepEqual(r.machine_classes, ["lathe"]);
  assert.deepEqual(r.materials, ["1018"]);
});

test("mergeFileIntoRecord — file.machine_class wins over customer fallback", () => {
  const file = { customer: "X", path: "/x/R910/p.json", machine_class: "wire-edm" };
  const cust = { machine_classes_seen: ["mill"], materials_seen: ["A2"] };
  const r = mergeFileIntoRecord(null, file, cust);
  assert.deepEqual(r.machine_classes, ["wire-edm"]);
  assert.deepEqual(r.materials, ["A2"]); // file has no material; customer fallback applied
});

test("mergeFileIntoRecord — accumulates multiple files into same record", () => {
  const f1 = { customer: "X", path: "/x/R910/program.MIN", bucket: "program", machine_class: "mill" };
  const f2 = { customer: "X", path: "/x/R910/print.pdf", bucket: "print", machine_class: "mill" };
  let r = mergeFileIntoRecord(null, f1, null);
  r = mergeFileIntoRecord(r, f2, null);
  assert.equal(r.files.length, 2);
  assert.deepEqual(r.buckets, ["program", "print"]);
  assert.deepEqual(r.machine_classes, ["mill", "mill"]);
});

test("mergeFileIntoRecord — purity: does not mutate input", () => {
  const existing = { customer: "X", part_id: "R910", files: ["a"], buckets: ["cad"], machine_classes: [], materials: [] };
  const before = JSON.stringify(existing);
  mergeFileIntoRecord(existing, { customer: "X", path: "/x/R910/b.pdf", bucket: "print" }, null);
  assert.equal(JSON.stringify(existing), before);
});

test("finalizeRecord — produces canonical baseline-records shape", () => {
  const agg = {
    customer: "FONTANA",
    part_id: "B-1234",
    files: ["a", "b"],
    buckets: ["program", "program", "cad"],
    machine_classes: ["lathe", "lathe"],
    materials: ["1018"],
  };
  const r = finalizeRecord(agg, "2026-05-28");
  assert.equal(r.customer, "FONTANA");
  assert.equal(r.part_id, "B-1234");
  assert.equal(r.doc_date, "2026-05-28");
  assert.equal(r.machine_class, "lathe");
  assert.equal(r.material_iso, "1018");
  assert.equal(r.machine_rate_usd_per_hr, 85); // lathe
  assert.equal(r.estimated_time_in_cut_s, 3600); // dominant bucket = program
  assert.equal(r.estimated_material_spend_usd, 50); // lathe
  // cost = 1.0 * 85 + 50 = 135; revenue = 135 * 1.4 = 189
  assert.equal(r.actual_revenue_usd, 189);
  assert.equal(r._file_count, 2);
});

test("finalizeRecord — revenue floor applied", () => {
  const agg = {
    customer: "X",
    part_id: "P1",
    files: ["a"],
    buckets: ["doc"],          // 300s
    machine_classes: ["grinder"], // rate 75
    materials: [],
  };
  const r = finalizeRecord(agg, "2026-05-28");
  // cost = (300/3600)*75 + 40 = 6.25 + 40 = 46.25; revenue = 64.75 — above floor
  assert.equal(r.actual_revenue_usd, 64.75);
});

test("finalizeRecord — missing required fields returns null", () => {
  assert.equal(finalizeRecord(null, "2026-05-28"), null);
  assert.equal(finalizeRecord({ customer: "X" }, "2026-05-28"), null);
  assert.equal(finalizeRecord({ part_id: "P1" }, "2026-05-28"), null);
});

test("finalizeRecord — dominant class beats minority", () => {
  const agg = {
    customer: "X",
    part_id: "P1",
    files: ["a"],
    buckets: ["program"],
    machine_classes: ["mill", "mill", "mill", "lathe"], // mill dominates
    materials: [],
  };
  const r = finalizeRecord(agg, "2026-05-28");
  assert.equal(r.machine_class, "mill");
  assert.equal(r.machine_rate_usd_per_hr, 95);
});
