#!/usr/bin/env node
// Tests for ups-core-bundle.mjs (node:test) -- structural fidelity + knob + membership.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { SUB_HOOKS, isBundleDisabled } from "./ups-core-bundle.mjs";

test("exactly 75 members (60 C:-layer folds + 15 project-layer uniques)", () => {
  assert.equal(SUB_HOOKS.length, 75);
});

test("every SUB_HOOKS path exists on disk (typo guard for the hand-built list)", () => {
  const missing = SUB_HOOKS.filter((s) => !existsSync(s.path));
  assert.deepEqual(missing.map((s) => s.path), []);
});

test("no duplicate members", () => {
  const names = SUB_HOOKS.map((s) => s.path.toLowerCase());
  assert.equal(new Set(names).size, names.length);
});

test("every member carries a sane ms timeout (500..15000)", () => {
  for (const s of SUB_HOOKS) {
    assert.ok(Number.isFinite(s.timeout) && s.timeout >= 500 && s.timeout <= 15000, `${s.path}: ${s.timeout}`);
  }
});

test("block-capable members are present (their gate semantics ride the bundle's block propagation)", () => {
  const names = new Set(SUB_HOOKS.map((s) => s.path.split("/").pop()));
  for (const gate of ["comprehensive-build-enforce.mjs", "token-budget-gate.mjs"]) {
    assert.ok(names.has(gate), `missing ${gate}`);
  }
});

test("kill-switch: only exact '1' disables", () => {
  assert.equal(isBundleDisabled({ PRISM_UPS_CORE_DISABLE: "1" }), true);
  assert.equal(isBundleDisabled({ PRISM_UPS_CORE_DISABLE: "0" }), false);
  assert.equal(isBundleDisabled({ PRISM_UPS_CORE_DISABLE: "true" }), false);
  assert.equal(isBundleDisabled({}), false);
});
