/**
 * zulu-compact-verify.test.mjs -- U-ZULU-COMPACT-VERIFY (SENT != COMPACTED).
 *
 * The zulu sweep starts a 15-min cooldown on any resultOk SendKeys actuation --
 * but resultOk means keystrokes were DISPATCHED, not that the chat compacted (an
 * occluded/wrong WT tab swallows them). These tests pin the verify-leg that
 * catches the false-cooldown case by comparing the slot's CURRENT pressure
 * against when the /compact was sent.
 *
 * Pure functions, real reference values; node:test (scripts/ convention).
 *   Run: node H:/prism/scripts/__tests__/zulu-compact-verify.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classifyActuationEffectiveness,
  verifyCooldownActuation,
  DEFAULT_COMPACT_VERIFY_GRACE_MS,
  DEFAULT_COMPACT_VERIFY_LOOKBACK_MS,
} from "../lib/zulu-orchestrator-lib.mjs";

const MIN = 60 * 1000;
const NOW = Date.parse("2026-06-21T03:00:00.000Z");
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();

// ─── classifyActuationEffectiveness ─────────────────────────────────────────

test("classify: pressure dropped to clean -> effective", () => {
  const v = classifyActuationEffectiveness({ sentAt: NOW - MIN, currentPressureLevel: "clean", nowMs: NOW });
  assert.equal(v.outcome, "effective");
  assert.match(v.reason, /landed/);
});

test("classify: still critical but within grace -> pending (compacting)", () => {
  const v = classifyActuationEffectiveness({
    sentAt: NOW - MIN, currentPressureLevel: "critical", nowMs: NOW, graceMs: 3 * MIN,
  });
  assert.equal(v.outcome, "pending");
  assert.match(v.reason, /grace/);
});

test("classify: still critical past grace -> ineffective (the cooldown-breaking case)", () => {
  const v = classifyActuationEffectiveness({
    sentAt: NOW - 5 * MIN, currentPressureLevel: "critical", nowMs: NOW, graceMs: 3 * MIN,
  });
  assert.equal(v.outcome, "ineffective");
  assert.match(v.reason, /did not land/);
});

test("classify: ambiguous 'warn' past grace -> pending (fail-safe, keep cooldown)", () => {
  // warn is NOT a definitive non-compaction; never break a cooldown on it.
  const v = classifyActuationEffectiveness({
    sentAt: NOW - 5 * MIN, currentPressureLevel: "warn", nowMs: NOW, graceMs: 3 * MIN,
  });
  assert.equal(v.outcome, "pending");
  assert.match(v.reason, /ambiguous/);
});

test("classify: case-insensitive levels (CLEAN -> effective, Critical past grace -> ineffective)", () => {
  assert.equal(classifyActuationEffectiveness({ sentAt: NOW - MIN, currentPressureLevel: "CLEAN", nowMs: NOW }).outcome, "effective");
  assert.equal(classifyActuationEffectiveness({ sentAt: NOW - 5 * MIN, currentPressureLevel: "Critical", nowMs: NOW, graceMs: 3 * MIN }).outcome, "ineffective");
});

test("classify: missing sentAt -> pending", () => {
  assert.equal(classifyActuationEffectiveness({ sentAt: NaN, currentPressureLevel: "critical", nowMs: NOW }).outcome, "pending");
  assert.equal(classifyActuationEffectiveness({}).outcome, "pending");
});

test("classify: adversarial -- future sentAt (clock skew) -> pending, never ineffective", () => {
  const v = classifyActuationEffectiveness({ sentAt: NOW + 5000, currentPressureLevel: "critical", nowMs: NOW });
  assert.equal(v.outcome, "pending");
  assert.match(v.reason, /future/);
});

test("classify: no current pressure reading -> pending (keep cooldown, never re-fire blind)", () => {
  assert.equal(classifyActuationEffectiveness({ sentAt: NOW - 5 * MIN, currentPressureLevel: undefined, nowMs: NOW }).outcome, "pending");
  assert.equal(classifyActuationEffectiveness({ sentAt: NOW - 5 * MIN, currentPressureLevel: "", nowMs: NOW }).outcome, "pending");
});

test("classify: adversarial -- invalid graceMs (0/NaN) falls back to the default", () => {
  // default grace 3min; sentAt 2min ago + critical -> still within default grace -> pending,
  // proving a bad grace cannot make every actuation instantly ineffective.
  const v = classifyActuationEffectiveness({ sentAt: NOW - 2 * MIN, currentPressureLevel: "critical", nowMs: NOW, graceMs: 0 });
  assert.equal(v.outcome, "pending");
  assert.equal(DEFAULT_COMPACT_VERIFY_GRACE_MS, 3 * MIN);
});

// ─── verifyCooldownActuation ────────────────────────────────────────────────

const execCompact = (msAgo, slot = "alpha") => JSON.stringify({
  ts: iso(msAgo), slot, gate: "execute", resultOk: true, decision: "compact",
});

test("verify: executed /compact + still critical past grace -> ineffective", () => {
  const log = [execCompact(5 * MIN)];
  const v = verifyCooldownActuation(log, "alpha", "critical", { now: NOW, graceMs: 3 * MIN });
  assert.equal(v.outcome, "ineffective");
  assert.equal(v.decision, "compact");
  assert.equal(v.sentAt, iso(5 * MIN));
});

test("verify: executed /compact + pressure clean -> effective", () => {
  const v = verifyCooldownActuation([execCompact(5 * MIN)], "alpha", "clean", { now: NOW });
  assert.equal(v.outcome, "effective");
});

test("verify: a DRY-RUN actuation never gates -> pending (no executed actuation)", () => {
  const log = [JSON.stringify({ ts: iso(5 * MIN), slot: "alpha", gate: "dry-run", resultOk: true, decision: "compact" })];
  assert.equal(verifyCooldownActuation(log, "alpha", "critical", { now: NOW }).outcome, "pending");
});

test("verify: resultOk:false is not an actuation -> pending", () => {
  const log = [JSON.stringify({ ts: iso(5 * MIN), slot: "alpha", gate: "execute", resultOk: false, decision: "compact" })];
  assert.equal(verifyCooldownActuation(log, "alpha", "critical", { now: NOW }).outcome, "pending");
});

test("verify: a noop/advise decision is not a /compact -> pending", () => {
  const log = [JSON.stringify({ ts: iso(5 * MIN), slot: "alpha", gate: "execute", resultOk: true, decision: "noop" })];
  assert.equal(verifyCooldownActuation(log, "alpha", "critical", { now: NOW }).outcome, "pending");
});

test("verify: /clear actuations are verified too (clear also starts a cooldown)", () => {
  const log = [JSON.stringify({ ts: iso(5 * MIN), slot: "alpha", gate: "execute", resultOk: true, decision: "clear" })];
  const v = verifyCooldownActuation(log, "alpha", "critical", { now: NOW, graceMs: 3 * MIN });
  assert.equal(v.outcome, "ineffective");
  assert.equal(v.decision, "clear");
});

test("verify: out-of-lookback actuation is ignored -> pending", () => {
  const log = [execCompact(2 * DEFAULT_COMPACT_VERIFY_LOOKBACK_MS)];  // ~40 min ago, lookback 20 min
  assert.equal(verifyCooldownActuation(log, "alpha", "critical", { now: NOW }).outcome, "pending");
});

test("verify: most-recent executed actuation wins", () => {
  const log = [execCompact(15 * MIN), execCompact(5 * MIN)];
  const v = verifyCooldownActuation(log, "alpha", "critical", { now: NOW, graceMs: 3 * MIN });
  assert.equal(v.sentAt, iso(5 * MIN));
  assert.equal(v.outcome, "ineffective");
});

test("verify: only THIS slot's actuations are considered", () => {
  const log = [execCompact(5 * MIN, "bravo")];
  assert.equal(verifyCooldownActuation(log, "alpha", "critical", { now: NOW }).outcome, "pending");
});

test("verify: malformed lines / bad ts are skipped, not thrown", () => {
  const log = ["{not json", JSON.stringify({ slot: "alpha", gate: "execute", resultOk: true, decision: "compact" }), "", execCompact(5 * MIN)];
  const v = verifyCooldownActuation(log, "alpha", "critical", { now: NOW, graceMs: 3 * MIN });
  assert.equal(v.outcome, "ineffective");
});

test("verify: empty / non-array log -> pending", () => {
  assert.equal(verifyCooldownActuation([], "alpha", "critical", { now: NOW }).outcome, "pending");
  assert.equal(verifyCooldownActuation(null, "alpha", "critical", { now: NOW }).outcome, "pending");
});

// --- authoritative-source gate: the byte-estimate proxy must NOT break a cooldown
// (it over-reports 'critical' on a stale sidecar -- the 2026-06-10/11 false-critical class)

test("classify: still-critical but NON-authoritative (byte-estimate) -> pending, NOT ineffective", () => {
  const v = classifyActuationEffectiveness({
    sentAt: NOW - 5 * MIN, currentPressureLevel: "critical", nowMs: NOW, graceMs: 3 * MIN,
    authoritative: false,
  });
  assert.equal(v.outcome, "pending");
  assert.match(v.reason, /byte-estimate/);
});

test("classify: still-critical + EXPLICIT authoritative:true -> ineffective (sidecar zone is evidence)", () => {
  const v = classifyActuationEffectiveness({
    sentAt: NOW - 5 * MIN, currentPressureLevel: "critical", nowMs: NOW, graceMs: 3 * MIN,
    authoritative: true,
  });
  assert.equal(v.outcome, "ineffective");
});

test("verify: a byte-estimate 'critical' reading (authoritative:false) never breaks the cooldown", () => {
  const v = verifyCooldownActuation([execCompact(5 * MIN)], "alpha", "critical",
    { now: NOW, graceMs: 3 * MIN, authoritative: false });
  assert.equal(v.outcome, "pending");
});
