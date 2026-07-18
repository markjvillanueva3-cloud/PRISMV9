// tier: T3
// Tests for buildAdvisory (fleet-task-health-stop.mjs) — the Stop-hook arm that
// surfaces the watchdog's last verdict. Focus: the 2026-06-09 (golf) age-stamp —
// the WARN must DISCLOSE how old its telemetry row is, so a reader who just
// fixed a task knows the verdict may not reflect it yet (anti-cry-wolf companion
// to the peer's migration-freeze-marker producer fix). Pure function, nowMs
// injected → fully deterministic, no clock/IO mocking.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAdvisory } from "../fleet-task-health-stop.mjs";

const NOW = Date.parse("2026-06-09T14:00:00.000Z");
const at = (offsetMs) => new Date(NOW - offsetMs).toISOString();
const warnRow = (over = {}) => ({
  level: "warn",
  ts: at(8 * 60_000),
  healthyCount: 42,
  taskCount: 50,
  degraded: [{ name: "PRISM Blueprint OCR Batch", status: "stale" }],
  missing: [],
  ...over,
});

test("age-stamp: a fresh warn row discloses the audit age in minutes", () => {
  const msg = buildAdvisory(warnRow(), NOW);
  assert.match(msg, /\(audit 8m ago\)/, "must stamp the 8-minute age");
  assert.match(msg, /WARN/);
  assert.match(msg, /42\/50 tasks healthy/);
  assert.match(msg, /PRISM Blueprint OCR Batch=stale/);
});

test("age-stamp: sub-minute age reads 'just now', never '0m ago' or negative", () => {
  const msg = buildAdvisory(warnRow({ ts: at(20_000) }), NOW);
  assert.match(msg, /\(audit just now\)/);
  assert.doesNotMatch(msg, /-\d+m ago/, "never a negative age (nowMs<tsMs clamps to 0)");
});

test("age-stamp: a future-skewed ts clamps to 'just now' (no negative age)", () => {
  const msg = buildAdvisory(warnRow({ ts: at(-5 * 60_000) }), NOW); // ts 5m in the future
  assert.match(msg, /\(audit just now\)/);
});

test("critical rows keep the CRITICAL tag and still carry the age", () => {
  const msg = buildAdvisory(warnRow({ level: "critical", ts: at(3 * 60_000) }), NOW);
  assert.match(msg, /CRITICAL \(audit 3m ago\)/);
});

test("REGRESSION: clean (non-warn) rows still return null", () => {
  assert.equal(buildAdvisory(warnRow({ level: "ok" }), NOW), null);
});

test("REGRESSION: a row older than the 30-min freshness window returns null", () => {
  assert.equal(buildAdvisory(warnRow({ ts: at(40 * 60_000) }), NOW), null);
});

test("REGRESSION: null / malformed / ts-less rows return null (never throw)", () => {
  assert.equal(buildAdvisory(null, NOW), null);
  assert.equal(buildAdvisory({}, NOW), null);
  assert.equal(buildAdvisory({ level: "warn", ts: "not-a-date" }, NOW), null);
});

test("REGRESSION: degraded + missing names are deduped and rendered", () => {
  const msg = buildAdvisory(
    warnRow({
      degraded: [{ name: "Task A", status: "disabled" }, { name: "Task A", status: "disabled" }],
      missing: ["Task B"],
    }),
    NOW,
  );
  assert.match(msg, /Task A=disabled/);
  assert.match(msg, /Task B=MISSING/);
  assert.equal((msg.match(/Task A/g) || []).length, 1, "Task A deduped to one mention");
});

// --- G10: auto-re-enable outcome surfacing -----------------------------------

test("G10: a healed auto-re-enable is surfaced inline (self-heal visible to the stopping chat)", () => {
  const msg = buildAdvisory(
    warnRow({
      degraded: [{ name: "PRISM Zombie Reaper v2", status: "disabled" }],
      autoReenable: { attempted: ["PRISM Zombie Reaper v2"], healed: ["PRISM Zombie Reaper v2"], failed: [] },
    }),
    NOW,
  );
  assert.match(msg, /auto-re-enabled 1: PRISM Zombie Reaper v2/);
  assert.match(msg, /verify next audit/);
});

test("G10: a failed auto-re-enable surfaces the ELEVATED-shell guidance (R12 - no false heal claim)", () => {
  const msg = buildAdvisory(
    warnRow({
      degraded: [{ name: "PRISM Fleet Reaper", status: "disabled" }],
      autoReenable: { attempted: ["PRISM Fleet Reaper"], healed: [], failed: [{ name: "PRISM Fleet Reaper", error: "Access is denied" }] },
    }),
    NOW,
  );
  assert.match(msg, /1 still need an ELEVATED Enable-ScheduledTask: PRISM Fleet Reaper/);
  assert.doesNotMatch(msg, /auto-re-enabled/, "a failed enable is NEVER reported as healed");
});

test("G10 REGRESSION: a row WITHOUT autoReenable renders the unchanged advisory (back-compat)", () => {
  const msg = buildAdvisory(warnRow(), NOW);
  assert.doesNotMatch(msg, /auto-re-enabled|ELEVATED Enable-ScheduledTask/);
  assert.match(msg, /42\/50 tasks healthy/, "the pre-G10 advisory body is unchanged when no heal occurred");
});
