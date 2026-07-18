import { test } from "node:test";
import assert from "node:assert/strict";
import { baseFromRtkCommand, calibrate } from "../posttool-rtk-adoption-measure.mjs";

test("baseFromRtkCommand: extracts base from 'rtk git status'", () => {
  assert.equal(baseFromRtkCommand("rtk git status"), "git");
});
test("baseFromRtkCommand: extracts from 'command rtk vitest run'", () => {
  assert.equal(baseFromRtkCommand("command rtk vitest run"), "vitest");
});
test("baseFromRtkCommand: lowercased", () => {
  assert.equal(baseFromRtkCommand("rtk Git status"), "git");
});
test("baseFromRtkCommand: non-rtk command → null", () => {
  assert.equal(baseFromRtkCommand("git status"), null);
});
test("baseFromRtkCommand: bare 'rtk' (no subcommand) → null", () => {
  assert.equal(baseFromRtkCommand("rtk"), null);
});
test("baseFromRtkCommand: empty/null → null", () => {
  assert.equal(baseFromRtkCommand(""), null);
  assert.equal(baseFromRtkCommand(null), null);
});

test("calibrate: on-target when within 15%", () => {
  const r = calibrate({ est_tokens: 700, observed_tokens: 730 });
  assert.equal(r.classification, "on-target");
  assert.ok(Math.abs(r.delta_pct - 4.3) < 0.5);
});
test("calibrate: underestimate when observed > est + 15%", () => {
  const r = calibrate({ est_tokens: 700, observed_tokens: 1500 });
  assert.equal(r.classification, "underestimate");
  assert.ok(r.delta_pct > 15);
});
test("calibrate: overestimate when observed < est - 15%", () => {
  const r = calibrate({ est_tokens: 700, observed_tokens: 200 });
  assert.equal(r.classification, "overestimate");
  assert.ok(r.delta_pct < -15);
});
test("calibrate: no-data on missing/zero/invalid est_tokens", () => {
  assert.equal(calibrate({ est_tokens: 0, observed_tokens: 100 }).classification, "no-data");
  assert.equal(calibrate({ est_tokens: null, observed_tokens: 100 }).classification, "no-data");
  assert.equal(calibrate({ est_tokens: 700 }).classification, "no-data");
});
