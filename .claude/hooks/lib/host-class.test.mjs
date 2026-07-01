// tier: T4
// Tests for .claude/hooks/lib/host-class.mjs (BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-HW-DETECT).
//
// Uses node:test (vite-bug-immune in this repo — see ollama-cost-router.test.mjs).
// All IO is injected (env / host / readFile / fileExists) so the resolver is
// exercised without touching disk or the real hostname.
//
// Run: node --test H:/prism/.claude/hooks/lib/host-class.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { detectHostClass, VALID_PROFILES, LABEL_TO_PROFILE } from "./host-class.mjs";

// Build an injected preset file with the given hostname→label entries.
const presetFile = (presets) => ({
  fileExists: () => true,
  readFile: () => JSON.stringify({ schemaVersion: 1, presets }),
});

// ── 1. env override wins ──────────────────────────────────────────────────────

test("explicit PRISM_HARDWARE_PROFILE override wins over everything", () => {
  const r = detectHostClass({
    env: { PRISM_HARDWARE_PROFILE: "home_blackwell" },
    host: "any-host",
    fileExists: () => true,
    readFile: () => JSON.stringify({ schemaVersion: 1, presets: { "any-host": { label: "work" } } }),
  });
  assert.equal(r, "home_blackwell");
});

test("an invalid env override is ignored and falls through to preset", () => {
  const r = detectHostClass({
    env: { PRISM_HARDWARE_PROFILE: "totally-bogus" },
    host: "DESKTOP-N7MI1VB",
    ...presetFile({ "DESKTOP-N7MI1VB": { label: "blackwell" } }),
  });
  assert.equal(r, "home_blackwell");
});

// ── 2. golf preset label → HardwareProfile ────────────────────────────────────

test("blackwell preset label resolves to home_blackwell", () => {
  const r = detectHostClass({
    env: {},
    host: "DESKTOP-N7MI1VB",
    ...presetFile({ "DESKTOP-N7MI1VB": { label: "blackwell" } }),
  });
  assert.equal(r, "home_blackwell");
});

test("home preset label resolves to home_4080", () => {
  const r = detectHostClass({
    env: {},
    host: "HOME-PC",
    ...presetFile({ "HOME-PC": { label: "home" } }),
  });
  assert.equal(r, "home_4080");
});

test("work preset label resolves to work_3080", () => {
  const r = detectHostClass({
    env: {},
    host: "MarkV",
    ...presetFile({ MarkV: { label: "work" } }),
  });
  assert.equal(r, "work_3080");
});

test("host lookup is case-insensitive (matches golf's getPresetForHost)", () => {
  const r = detectHostClass({
    env: {},
    host: "desktop-n7mi1vb", // lowercase vs the uppercase key
    ...presetFile({ "DESKTOP-N7MI1VB": { label: "blackwell" } }),
  });
  assert.equal(r, "home_blackwell");
});

// ── 3. unknown → null (caller falls back conservatively) ──────────────────────

test("a host with no preset entry resolves to null", () => {
  const r = detectHostClass({
    env: {},
    host: "UNKNOWN-HOST",
    ...presetFile({ "DESKTOP-N7MI1VB": { label: "blackwell" } }),
  });
  assert.equal(r, null);
});

test("a missing preset file resolves to null (never throws)", () => {
  const r = detectHostClass({
    env: {},
    host: "DESKTOP-N7MI1VB",
    fileExists: () => false,
    readFile: () => { throw new Error("should not be read"); },
  });
  assert.equal(r, null);
});

test("an unrecognised preset label (e.g. custom) resolves to null", () => {
  const r = detectHostClass({
    env: {},
    host: "DESKTOP-N7MI1VB",
    ...presetFile({ "DESKTOP-N7MI1VB": { label: "custom" } }),
  });
  assert.equal(r, null);
});

test("corrupt preset JSON degrades to null, does not throw", () => {
  const r = detectHostClass({
    env: {},
    host: "DESKTOP-N7MI1VB",
    fileExists: () => true,
    readFile: () => "{ not valid json",
  });
  assert.equal(r, null);
});

// ── 4. exported constants are the canonical vocabulary ────────────────────────

test("VALID_PROFILES is the ModelRoutingEngine HardwareProfile vocabulary", () => {
  assert.deepEqual(
    [...VALID_PROFILES].sort(),
    ["cloud_only", "home_4080", "home_blackwell", "work_3080"],
  );
});

test("LABEL_TO_PROFILE maps every golf label to a valid profile", () => {
  assert.equal(LABEL_TO_PROFILE.blackwell, "home_blackwell");
  assert.equal(LABEL_TO_PROFILE.home, "home_4080");
  assert.equal(LABEL_TO_PROFILE.work, "work_3080");
  for (const profile of Object.values(LABEL_TO_PROFILE)) {
    assert.ok(VALID_PROFILES.includes(profile), `${profile} must be a valid profile`);
  }
});
