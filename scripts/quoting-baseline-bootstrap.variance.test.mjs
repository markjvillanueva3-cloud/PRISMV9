/**
 * quoting-baseline-bootstrap.variance — iter13 unit test for deriveRecordDefaults.
 *
 * Pre-iter13 every baseline record was stamped with identical defaults — the
 * training engine saw zero variance in machine_rate/time/material. iter13
 * derives realistic per-record variance from file path + size. This test pins
 * the derivation semantics so the training engine can rely on the signal shape.
 *
 * Run: node --test scripts/quoting-baseline-bootstrap.variance.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-VARIANCE-INJECT (charlie /goal-yolo iter13)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveRecordDefaults } from "./quoting-baseline-bootstrap.mjs";

// ---------- machine-class inference: path hint wins ----------

test("deriveRecordDefaults: /WIRE EDM/ path -> wire-EDM rate 110", () => {
  const d = deriveRecordDefaults("H:/PRISM/JM DIE/WIRE EDM/ALCOA/p1.NC", 100_000);
  assert.equal(d.machine_class, "wire-edm");
  assert.equal(d.machine_rate_usd_per_hr, 110);
  assert.equal(d.estimated_material_spend_usd, 35); // wire-EDM material spend
});

test("deriveRecordDefaults: /WEDM/ path -> wire-EDM", () => {
  const d = deriveRecordDefaults("H:/PRISM/JM DIE/WEDM/ITW/p2.NC", 100_000);
  assert.equal(d.machine_class, "wire-edm");
});

test("deriveRecordDefaults: /LATHE/ path -> lathe rate 85", () => {
  const d = deriveRecordDefaults("H:/PRISM/JM DIE/LATHE/BRADY/p3.NC", 100_000);
  assert.equal(d.machine_class, "lathe");
  assert.equal(d.machine_rate_usd_per_hr, 85);
});

test("deriveRecordDefaults: /CNC MILL/ path -> mill rate 95", () => {
  const d = deriveRecordDefaults("H:/PRISM/JM DIE/CNC MILL/SFS/p4.NC", 100_000);
  assert.equal(d.machine_class, "mill");
  assert.equal(d.machine_rate_usd_per_hr, 95);
});

test("deriveRecordDefaults: /SINKER/ path -> sinker-EDM rate 100", () => {
  const d = deriveRecordDefaults("H:/PRISM/JM DIE/SINKER/OPTIMAS/p5.NC", 100_000);
  assert.equal(d.machine_class, "sinker-edm");
  assert.equal(d.machine_rate_usd_per_hr, 100);
});

test("deriveRecordDefaults: /GRINDER/ path -> grinder rate 75", () => {
  const d = deriveRecordDefaults("H:/PRISM/JM DIE/GRINDER/HOLO-KROME/p6.NC", 100_000);
  assert.equal(d.machine_class, "grinder");
  assert.equal(d.machine_rate_usd_per_hr, 75);
});

// ---------- extension fallback when path doesn't hint ----------

test("deriveRecordDefaults: .I extension -> wire-EDM (path-agnostic)", () => {
  const d = deriveRecordDefaults("H:/PRISM/JM DIE/ALCOA/p1.I", 100_000);
  assert.equal(d.machine_class, "wire-edm");
  assert.equal(d.machine_rate_usd_per_hr, 110);
});

test("deriveRecordDefaults: .H extension -> mill-heidenhain rate 100", () => {
  const d = deriveRecordDefaults("H:/PRISM/JM DIE/ITW/p2.H", 100_000);
  assert.equal(d.machine_class, "mill-heidenhain");
  assert.equal(d.machine_rate_usd_per_hr, 100);
});

test("deriveRecordDefaults: .CNC extension -> lathe", () => {
  const d = deriveRecordDefaults("H:/PRISM/JM DIE/BRADY/p3.CNC", 100_000);
  assert.equal(d.machine_class, "lathe");
  assert.equal(d.machine_rate_usd_per_hr, 85);
});

test("deriveRecordDefaults: .MIN extension -> mill (Mastercam)", () => {
  const d = deriveRecordDefaults("H:/PRISM/JM DIE/SFS/p4.MIN", 100_000);
  assert.equal(d.machine_class, "mill");
});

test("deriveRecordDefaults: case-insensitive extension matching", () => {
  const dUpper = deriveRecordDefaults("H:/p.MIN", 100_000);
  const dLower = deriveRecordDefaults("H:/p.min", 100_000);
  const dMixed = deriveRecordDefaults("H:/p.Min", 100_000);
  assert.equal(dUpper.machine_class, dLower.machine_class);
  assert.equal(dUpper.machine_class, dMixed.machine_class);
});

// ---------- time-in-cut bucket from file size ----------

test("deriveRecordDefaults: time bucket — small <50KB -> 600s (10min)", () => {
  const d = deriveRecordDefaults("/p.NC", 30_000);
  assert.equal(d.estimated_time_in_cut_s, 600);
});

test("deriveRecordDefaults: time bucket — mid <500KB -> 1800s (30min)", () => {
  const d = deriveRecordDefaults("/p.NC", 200_000);
  assert.equal(d.estimated_time_in_cut_s, 1800);
});

test("deriveRecordDefaults: time bucket — large <5MB -> 3600s (60min)", () => {
  const d = deriveRecordDefaults("/p.NC", 2_000_000);
  assert.equal(d.estimated_time_in_cut_s, 3600);
});

test("deriveRecordDefaults: time bucket — huge >=5MB -> 7200s (120min)", () => {
  const d = deriveRecordDefaults("/p.NC", 10_000_000);
  assert.equal(d.estimated_time_in_cut_s, 7200);
});

test("deriveRecordDefaults: time bucket — zero size -> default 1800s (mid)", () => {
  const d = deriveRecordDefaults("/p.NC", 0);
  assert.equal(d.estimated_time_in_cut_s, 1800);
});

// ---------- precedence: path hint > extension ----------

test("deriveRecordDefaults: /WIRE EDM/ path WINS over .MIN extension (path > ext)", () => {
  const d = deriveRecordDefaults("H:/PRISM/JM DIE/WIRE EDM/ALCOA/p1.MIN", 100_000);
  // .MIN would say "mill" but /WIRE EDM/ path overrides -> wire-edm
  assert.equal(d.machine_class, "wire-edm");
  assert.equal(d.machine_rate_usd_per_hr, 110);
});

test("deriveRecordDefaults: /CNC MILL/ path WINS over .I extension", () => {
  const d = deriveRecordDefaults("H:/PRISM/JM DIE/CNC MILL/ALCOA/p1.I", 100_000);
  // .I would say "wire-edm" but /CNC MILL/ path overrides -> mill
  assert.equal(d.machine_class, "mill");
  assert.equal(d.machine_rate_usd_per_hr, 95);
});

// ---------- adversarial: non-string / non-number / nullish ----------

test("deriveRecordDefaults: non-string path falls to default mill rate", () => {
  const d = deriveRecordDefaults(null, 100_000);
  assert.equal(d.machine_class, "mill");
  assert.equal(d.machine_rate_usd_per_hr, 95);
});

test("deriveRecordDefaults: undefined path -> default mill", () => {
  const d = deriveRecordDefaults(undefined, 100_000);
  assert.equal(d.machine_class, "mill");
});

test("deriveRecordDefaults: number path -> default mill", () => {
  const d = deriveRecordDefaults(42, 100_000);
  assert.equal(d.machine_class, "mill");
});

test("deriveRecordDefaults: object path -> default mill", () => {
  const d = deriveRecordDefaults({}, 100_000);
  assert.equal(d.machine_class, "mill");
});

test("deriveRecordDefaults: non-finite size falls to default time 1800", () => {
  const dNaN = deriveRecordDefaults("/p.NC", NaN);
  const dInf = deriveRecordDefaults("/p.NC", Infinity);
  const dNeg = deriveRecordDefaults("/p.NC", -1000);
  const dNull = deriveRecordDefaults("/p.NC", null);
  for (const d of [dNaN, dInf, dNeg, dNull]) {
    assert.equal(d.estimated_time_in_cut_s, 1800);
  }
});

// ---------- backslash Windows paths ----------

test("deriveRecordDefaults: Windows backslash path normalized", () => {
  const d = deriveRecordDefaults("H:\\PRISM\\JM DIE\\WIRE EDM\\ALCOA\\p1.NC", 100_000);
  assert.equal(d.machine_class, "wire-edm");
});

// ---------- no extension / no path ----------

test("deriveRecordDefaults: empty path string -> default mill + default time", () => {
  const d = deriveRecordDefaults("", 100_000);
  assert.equal(d.machine_class, "mill");
  assert.equal(d.estimated_time_in_cut_s, 1800);
});

test("deriveRecordDefaults: filename with no extension -> default mill", () => {
  const d = deriveRecordDefaults("H:/PRISM/random/programfile", 100_000);
  assert.equal(d.machine_class, "mill");
});

test("deriveRecordDefaults: unknown extension -> default mill (graceful fallback)", () => {
  const d = deriveRecordDefaults("H:/PRISM/random/p.xyz", 100_000);
  assert.equal(d.machine_class, "mill");
  assert.equal(d.machine_rate_usd_per_hr, 95);
});

// ---------- shape stability ----------

test("deriveRecordDefaults: stable 5-key return shape (incl. material_iso, iter45 U-QP-BOOTSTRAP-REAL-DEFAULTS)", () => {
  const d = deriveRecordDefaults("/p.NC", 100_000);
  assert.deepEqual(Object.keys(d).sort(), [
    "estimated_material_spend_usd",
    "estimated_time_in_cut_s",
    "machine_class",
    "machine_rate_usd_per_hr",
    "material_iso",
  ]);
  // iter45 contract: material_iso is null when the path names no material
  // (else the detected ISO group "P|M|K|N|S|H"). A /p.NC path has no material.
  assert.equal(d.material_iso, null, "no material detected in path -> material_iso is null");
});

// ---------- variance verification: a mixed cohort produces a distribution, not a single point ----------

test("deriveRecordDefaults: mixed cohort yields VARIANCE (the load-bearing point)", () => {
  const samples = [
    deriveRecordDefaults("H:/JM DIE/WIRE EDM/A/p.NC", 30_000),    // wire-EDM small
    deriveRecordDefaults("H:/JM DIE/CNC MILL/B/p.NC", 200_000),   // mill mid
    deriveRecordDefaults("H:/JM DIE/LATHE/C/p.CNC", 2_000_000),   // lathe large
    deriveRecordDefaults("H:/JM DIE/GRINDER/D/p.NC", 30_000),     // grinder small
    deriveRecordDefaults("H:/JM DIE/E/p.H", 10_000_000),          // heidenhain huge
  ];
  const rates = new Set(samples.map(s => s.machine_rate_usd_per_hr));
  const times = new Set(samples.map(s => s.estimated_time_in_cut_s));
  const classes = new Set(samples.map(s => s.machine_class));
  const materials = new Set(samples.map(s => s.estimated_material_spend_usd));
  // The whole point of iter13: distinct distributions, not a single repeated value.
  assert.ok(rates.size >= 3, `rate distribution must span >= 3 distinct values, got ${rates.size}`);
  assert.ok(times.size >= 3, `time distribution must span >= 3 distinct buckets, got ${times.size}`);
  assert.ok(classes.size >= 4, `class distribution must span >= 4 machine classes, got ${classes.size}`);
  assert.ok(materials.size >= 3, `material distribution must span >= 3 values, got ${materials.size}`);
});
