/**
 * Tests for the Regimen #3 cascade-correctness eval runner.
 * node --test scripts/eval-wedm-passschedule.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isScheduleItem, isTaper, gradeItem, gradeAll } from "./eval-wedm-passschedule.mjs";

const SCHED = [
  "Family E12xx (4-pass):",
  "Pass 1 (rough): E1230, 0.12 ipm, H1 offset 0.0085 in",
  "Pass 2 (skim): E1240, 0.24 ipm, H2 offset 0.0064 in",
  "Pass 3 (skim): E1250, 0.21 ipm, H3 offset 0.0058 in",
  "Pass 4 (skim): E1260, 0.20 ipm, H4 offset 0.0053 in",
].join("\n");
const AP003 = SCHED.replace("H3 offset 0.0058 in", "H3 offset 0.0090 in"); // rises above prev

const validItem = { input: "D2 straight cut", output: SCHED, meta: { id: "a", kind: "tech_table" } };
const ap003Item = { input: "D2 straight cut", output: AP003, meta: { id: "b", kind: "tech_table" } };
const selectItem = { input: "D2 80mm", output: "Use family E12xx (4 passes, 2-axis).", meta: { id: "c", kind: "tech_select" } };

test("isScheduleItem — multi-pass cascade=true; tech_select/tech_pass/tech_trim=false", () => {
  assert.equal(isScheduleItem(validItem), true);
  assert.equal(isScheduleItem(selectItem), false);
  assert.equal(isScheduleItem({ output: "no passes here", meta: { kind: "tech_table" } }), false);
});

test("isTaper — taper/UV keywords detected", () => {
  assert.equal(isTaper({ input: "316 with 2 deg UV taper", output: "" }), true);
  assert.equal(isTaper({ input: "D2 straight cut", output: SCHED }), false);
});

test("gradeItem — valid cascade passes", () => {
  const r = gradeItem(validItem);
  assert.equal(r.graded, true);
  assert.equal(r.valid, true);
  assert.deepEqual(r.violations, []);
});

test("gradeItem — AP003 cascade fails with the right flag", () => {
  const r = gradeItem(ap003Item);
  assert.equal(r.graded, true);
  assert.equal(r.valid, false);
  assert.equal(r.ap003, true);
});

test("gradeItem — non-schedule item is skipped (graded:false), not a fail", () => {
  assert.deepEqual(gradeItem(selectItem), { graded: false });
});

test("gradeAll — aggregates valid_rate + ap003 count; skips non-schedule items", () => {
  const rep = gradeAll([validItem, ap003Item, selectItem]);
  assert.equal(rep.graded, 2); // selectItem skipped
  assert.equal(rep.valid, 1);
  assert.equal(rep.valid_rate, 0.5);
  assert.equal(rep.ap003_failures, 1);
  assert.equal(rep.failures.length, 1);
  assert.equal(rep.failures[0].id, "b");
});

test("gradeAll — all-valid corpus => valid_rate 1.0", () => {
  const rep = gradeAll([validItem, { ...validItem, meta: { id: "d", kind: "invariant" } }]);
  assert.equal(rep.valid_rate, 1);
  assert.equal(rep.ap003_failures, 0);
});
