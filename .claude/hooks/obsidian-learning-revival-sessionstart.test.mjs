/**
 * obsidian-learning-revival-sessionstart.test.mjs — tests for the pure advisory
 * builder of the SessionStart revival hook. node:test.
 *
 * buildAdvisory is the one piece of logic worth covering: it decides what the
 * operator sees at boot. R9 — each test fails if the surfacing rule drifts.
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { buildAdvisory } from "./obsidian-learning-revival-sessionstart.mjs";

const NOW = Date.parse("2026-06-08T16:00:00Z");
const fresh = "2026-06-08T15:55:00Z";   // 5 min ago — within 6h window
const stale = "2026-06-08T08:00:00Z";   // 8h ago — outside 6h window

test("buildAdvisory: clean pass is silent (no noise across 26 boots)", () => {
  assert.equal(buildAdvisory({ level: "clean", ts: fresh, outcomes: [] }, NOW), null);
});

test("buildAdvisory: a recent revival surfaces the self-heal note with the durable fix", () => {
  const msg = buildAdvisory({
    level: "revived", ts: fresh,
    outcomes: [{ key: "dream-cycle", action: "revived" }, { key: "self-reflect", action: "skip" }],
  }, NOW);
  assert.ok(msg, "a revival must surface");
  assert.match(msg, /dream-cycle/);
  assert.ok(!/self-reflect,/.test(msg), "skipped engine not listed as revived");
  assert.match(msg, /Enable-ScheduledTask/, "must name the durable elevated fix");
});

test("buildAdvisory: a failure surfaces FAILED + the diagnose command (actionable)", () => {
  const msg = buildAdvisory({
    level: "failed", ts: fresh,
    outcomes: [{ key: "dream-cycle", action: "failed", error: "engine exited 2: synth boom" }],
  }, NOW);
  assert.ok(msg);
  assert.match(msg, /FAILED/);
  assert.match(msg, /dream-cycle/);
  assert.match(msg, /synth boom/);
  assert.match(msg, /--json/, "must name the diagnose command");
});

test("buildAdvisory: failure-mode — stale telemetry is not surfaced (avoid stale alarms)", () => {
  assert.equal(buildAdvisory({ level: "revived", ts: stale, outcomes: [{ key: "k", action: "revived" }] }, NOW), null);
});

test("buildAdvisory: failure-mode — null / malformed / missing-ts rows yield null, never throw", () => {
  assert.equal(buildAdvisory(null, NOW), null);
  assert.equal(buildAdvisory({}, NOW), null);
  assert.equal(buildAdvisory({ level: "revived" }, NOW), null);         // no ts
  assert.equal(buildAdvisory({ level: "revived", ts: "not-a-date", outcomes: [] }, NOW), null);
  assert.equal(buildAdvisory("garbage", NOW), null);
});

test("buildAdvisory: ADVERSARIAL — level 'revived' but zero revived outcomes → null (no empty brag)", () => {
  // A row tagged revived whose outcomes are all skips must not emit a content-free
  // "revived " line — only a genuine revived key surfaces.
  const msg = buildAdvisory({ level: "revived", ts: fresh, outcomes: [{ key: "k", action: "skip" }] }, NOW);
  assert.equal(msg, null);
});

test("buildAdvisory: ADVERSARIAL — failed level with non-array outcomes degrades safely to null", () => {
  assert.equal(buildAdvisory({ level: "failed", ts: fresh, outcomes: "boom" }, NOW), null);
});
