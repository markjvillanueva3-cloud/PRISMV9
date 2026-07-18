#!/usr/bin/env node
/**
 * Tests for lathe-jm-fleet-envelope.mjs.
 * Run: node scripts/lib/lathe-jm-fleet-envelope.test.mjs
 * R9: real JM fleet values + the floor/max invariant + exclusion logic.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fleetEnvelope } from "./lathe-jm-fleet-envelope.mjs";

// The real JM lathe fleet (ShopConfigurationEngine LTH-01..07), abbreviated.
const JM_LATHES = [
  { id: "LTH-01", type: "Lathe", max_rpm: 5000, max_power_kw: 15 },
  { id: "LTH-02", type: "Lathe", max_rpm: 5000, max_power_kw: 11 },
  { id: "LTH-03", type: "Lathe", max_rpm: 4000, max_power_kw: 11 },
  { id: "LTH-04", type: "Lathe", max_rpm: 3800, max_power_kw: 11 },
  { id: "LTH-05", type: "Lathe", max_rpm: 3800, max_power_kw: 22 },
  { id: "LTH-06", type: "Lathe", max_rpm: 3800, max_power_kw: 22 },
  { id: "LTH-07", type: "Lathe", max_rpm: 5000, max_power_kw: 22 },
];

test("real JM fleet -> FLOOR is the most restrictive lathe (3800 rpm / 11 kW)", () => {
  const e = fleetEnvelope(JM_LATHES);
  assert.equal(e.ok, true);
  assert.equal(e.lathe_count, 7);
  assert.equal(e.floor.max_spindle_rpm, 3800); // min rpm across fleet
  assert.equal(e.floor.max_power_kW, 11);       // min power across fleet
  assert.equal(e.max.max_spindle_rpm, 5000);    // max rpm
  assert.equal(e.max.max_power_kW, 22);         // max power
});

test("floor never exceeds max (safety invariant)", () => {
  const e = fleetEnvelope(JM_LATHES);
  assert.ok(e.floor.max_spindle_rpm <= e.max.max_spindle_rpm);
  assert.ok(e.floor.max_power_kW <= e.max.max_power_kW);
});

test("only lathe-type machines are counted (mills/wedm excluded)", () => {
  const mixed = [
    ...JM_LATHES,
    { id: "VMC-01", type: "VMC", max_rpm: 12000, max_power_kw: 30 },     // mill -> excluded
    { id: "EDM-01", type: "Wire EDM", max_rpm: 0, max_power_kw: 5 },     // wedm -> excluded
    { id: "MILL", type: "Mill", max_rpm: 20000, max_power_kw: 40 },      // excluded
  ];
  const e = fleetEnvelope(mixed);
  assert.equal(e.lathe_count, 7);              // mills/wedm not counted
  assert.equal(e.max.max_spindle_rpm, 5000);   // not 12000/20000 from the mills
});

test("lathes missing/zero/non-finite limits are excluded", () => {
  const e = fleetEnvelope([
    { id: "GOOD", type: "Lathe", max_rpm: 4000, max_power_kw: 12 },
    { id: "NO_RPM", type: "Lathe", max_power_kw: 10 },                   // excluded (no rpm)
    { id: "ZERO", type: "Lathe", max_rpm: 0, max_power_kw: 10 },         // excluded (zero)
    { id: "NAN", type: "Lathe", max_rpm: NaN, max_power_kw: 10 },        // excluded
    { id: "INF", type: "Lathe", max_rpm: Infinity, max_power_kw: 10 },   // excluded
  ]);
  assert.equal(e.ok, true);
  assert.equal(e.lathe_count, 1);
  assert.equal(e.floor.max_spindle_rpm, 4000);
});

test("single lathe -> floor == max", () => {
  const e = fleetEnvelope([{ type: "Lathe", max_rpm: 4200, max_power_kw: 13 }]);
  assert.deepEqual(e.floor, e.max);
  assert.equal(e.floor.max_spindle_rpm, 4200);
});

test("no lathes / empty / null -> ok:false (no throw)", () => {
  assert.equal(fleetEnvelope([]).ok, false);
  assert.equal(fleetEnvelope(null).ok, false);
  assert.equal(fleetEnvelope([{ type: "VMC", max_rpm: 10000, max_power_kw: 20 }]).ok, false);
});
