#!/usr/bin/env node
// One-off smoke driver — plain assertions, no node:test runner.
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { stableIdFromSession, releaseSlot } from "../precompact-release-slot.mjs";

let pass = 0, fail = 0;
function t(name, fn) { try { fn(); console.log("ok", name); pass++; } catch (e) { console.log("FAIL", name, "::", e.message); fail++; } }

t("stableIdFromSession happy", () => {
  assert.equal(stableIdFromSession("549c9f4f-854a-47df-aad4-1783f66f881c"), "claude-549c9f4f");
});

t("stableIdFromSession uppercase", () => {
  assert.equal(stableIdFromSession("DEADBEEF-9999"), "claude-deadbeef");
});

t("stableIdFromSession null/empty/non-string", () => {
  assert.equal(stableIdFromSession(null), null);
  assert.equal(stableIdFromSession(""), null);
  assert.equal(stableIdFromSession(undefined), null);
  assert.equal(stableIdFromSession(42), null);
});

t("stableIdFromSession short hex", () => {
  assert.equal(stableIdFromSession("abc"), null);
  assert.equal(stableIdFromSession("1234567"), null);
  assert.equal(stableIdFromSession("g-g-g"), null);
});

t("stableIdFromSession adversarial NUL/control chars filtered", () => {
  assert.equal(stableIdFromSession("\x00\x1fabcdef12\x7frest"), "claude-abcdef12");
});

t("releaseSlot returns object with ok:boolean", () => {
  const r = releaseSlot("claude-deadbeef");
  assert.equal(typeof r, "object");
  assert.equal(typeof r.ok, "boolean");
});

t("hook file exists", () => {
  assert.ok(fs.existsSync("H:/prism/.claude/hooks/precompact-release-slot.mjs"));
});

t("hook source declares PreCompact event", () => {
  const src = fs.readFileSync("H:/prism/.claude/hooks/precompact-release-slot.mjs", "utf8");
  assert.match(src, /FIRES ON:\s*PreCompact/i);
  assert.match(src, /BLOCKING:\s*never/i);
});

t("hook source declares both knobs", () => {
  const src = fs.readFileSync("H:/prism/.claude/hooks/precompact-release-slot.mjs", "utf8");
  assert.match(src, /PRISM_PRECOMPACT_RELEASE_SLOT_DISABLE/);
  assert.match(src, /PRISM_PRECOMPACT_RELEASE_SLOT_VERBOSE/);
});

t("SILENCE constant present (fail-soft contract)", () => {
  const src = fs.readFileSync("H:/prism/.claude/hooks/precompact-release-slot.mjs", "utf8");
  assert.match(src, /SILENCE\s*=\s*\{\s*continue:\s*true,\s*suppressOutput:\s*true\s*\}/);
});

t("contract parity with sibling hook (8-hex stable id)", () => {
  // Both hooks use identical stableIdFromSession algorithm — same input → same output.
  const ins = ["549c9f4f-854a-47df-aad4-1783f66f881c", "ffffffff-0", "DEADBEEF-..."];
  const expected = ["claude-549c9f4f", "claude-ffffffff", "claude-deadbeef"];
  for (let i = 0; i < ins.length; i++) {
    assert.equal(stableIdFromSession(ins[i]), expected[i]);
  }
});

console.log(`\nPASS=${pass}  FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
