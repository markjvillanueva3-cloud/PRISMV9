import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SWEEP_DEFAULTS, resolveSweepOpts, utcDayKey, planSweep, applySweepOutcome, idleSlotCount,
} from "./hermes-fleet-sweep-plan.mjs";

// A fixed reference instant: 2026-06-30T18:00:00Z.
const T = Date.UTC(2026, 5, 30, 18, 0, 0);
const DAY = "2026-06-30";
const HOUR = 3600_000;

test("utcDayKey: maps an instant to its UTC day; non-finite -> epoch day", () => {
  assert.equal(utcDayKey(T), DAY);
  assert.equal(utcDayKey(Date.UTC(2026, 0, 1, 23, 59, 0)), "2026-01-01");
  assert.equal(utcDayKey(NaN), "1970-01-01");
  assert.equal(utcDayKey(undefined), "1970-01-01");
});

test("resolveSweepOpts: env overrides win; absent/invalid fall back to conservative defaults", () => {
  const d = resolveSweepOpts({});
  assert.equal(d.dailyBudget, SWEEP_DEFAULTS.dailyBudget);
  assert.equal(d.minIntervalMs, SWEEP_DEFAULTS.minIntervalMs);
  assert.equal(d.maxParallel, SWEEP_DEFAULTS.maxParallel);
  const o = resolveSweepOpts({ PRISM_HERMES_SWEEP_DAILY_BUDGET: "50", PRISM_HERMES_SWEEP_MAX_PARALLEL: "4" });
  assert.equal(o.dailyBudget, 50);
  assert.equal(o.maxParallel, 4);
  // a non-positive / garbage override is ignored (never a 0 or negative budget)
  assert.equal(resolveSweepOpts({ PRISM_HERMES_SWEEP_DAILY_BUDGET: "0" }).dailyBudget, SWEEP_DEFAULTS.dailyBudget);
  assert.equal(resolveSweepOpts({ PRISM_HERMES_SWEEP_DAILY_BUDGET: "-9" }).dailyBudget, SWEEP_DEFAULTS.dailyBudget);
  assert.equal(resolveSweepOpts({ PRISM_HERMES_SWEEP_MAX_PARALLEL: "abc" }).maxParallel, SWEEP_DEFAULTS.maxParallel);
});

test("planSweep HAPPY: eligible quiet fleet fires; maxUnits scales with idle, maxParallel capped", () => {
  // 18 idle slots, last swept 2h ago, no budget spent today.
  const p = planSweep({ nowMs: T, idleSlots: 18, lastSweepMs: T - 2 * HOUR, dailyCallsUsed: 0, budgetDay: DAY });
  assert.equal(p.fire, true);
  assert.equal(p.reason, "eligible");
  // ceil(18 * 0.25) = 5, capped at maxUnitsCap(6) -> 5
  assert.equal(p.maxUnits, 5);
  // maxParallel capped at 2 (cloud-lane ceiling), <= maxUnits
  assert.equal(p.maxParallel, SWEEP_DEFAULTS.maxParallel);
  assert.ok(p.maxParallel <= p.maxUnits);
  assert.equal(p.remaining, SWEEP_DEFAULTS.dailyBudget);
});

test("planSweep BUSY FLEET: zero idle still fires at the floor (Hermes is free + off-Claude)", () => {
  const p = planSweep({ nowMs: T, idleSlots: 0, lastSweepMs: T - 2 * HOUR, dailyCallsUsed: 0, budgetDay: DAY });
  assert.equal(p.fire, true);
  assert.equal(p.maxUnits, SWEEP_DEFAULTS.minUnits); // floor = 1 unit
  assert.equal(p.maxParallel, 1);
});

test("planSweep GATE 1: daily budget exhausted -> no fire", () => {
  const p = planSweep({ nowMs: T, idleSlots: 18, lastSweepMs: T - 5 * HOUR, dailyCallsUsed: SWEEP_DEFAULTS.dailyBudget, budgetDay: DAY });
  assert.equal(p.fire, false);
  assert.equal(p.reason, "daily-budget-exhausted");
  assert.equal(p.remaining, 0);
  assert.equal(p.maxUnits, 0);
});

test("planSweep GATE 2: min interval not elapsed -> no fire, reports nextEligibleMs", () => {
  const last = T - 10 * 60_000; // only 10 min ago (< 45 min default)
  const p = planSweep({ nowMs: T, idleSlots: 18, lastSweepMs: last, dailyCallsUsed: 0, budgetDay: DAY });
  assert.equal(p.fire, false);
  assert.equal(p.reason, "min-interval-not-elapsed");
  assert.equal(p.nextEligibleMs, last + SWEEP_DEFAULTS.minIntervalMs);
});

test("planSweep BUDGET RESET: yesterday's spend does NOT count today -> fires", () => {
  // dailyCallsUsed huge but budgetDay is YESTERDAY -> resets to 0 today.
  const p = planSweep({ nowMs: T, idleSlots: 8, lastSweepMs: T - 5 * HOUR, dailyCallsUsed: 9999, budgetDay: "2026-06-29" });
  assert.equal(p.fire, true);
  assert.equal(p.usedToday, 0);
  assert.equal(p.remaining, SWEEP_DEFAULTS.dailyBudget);
  assert.equal(p.budgetDay, DAY);
});

test("planSweep BUDGET-BOUND: remaining budget caps maxUnits below the idle-derived size", () => {
  // idle 18 would want 5 units, but only 2 budget calls remain today -> maxUnits == 2.
  const p = planSweep({ nowMs: T, idleSlots: 18, lastSweepMs: T - 2 * HOUR, dailyCallsUsed: SWEEP_DEFAULTS.dailyBudget - 2, budgetDay: DAY });
  assert.equal(p.fire, true);
  assert.equal(p.remaining, 2);
  assert.equal(p.maxUnits, 2);
  assert.ok(p.maxParallel <= 2);
});

test("planSweep ADVERSARIAL: NaN/negative/missing fields -> safe, deterministic, never throws", () => {
  // a non-finite lastSweepMs (NaN / missing) is treated as never-swept -> the first sweep fires
  // (bounded: it stamps lastSweepMs, so the next tick is interval-gated). idleSlots<0 floors to 0.
  const corrupt = planSweep({ nowMs: T, idleSlots: -5, lastSweepMs: NaN, dailyCallsUsed: -3, budgetDay: DAY });
  assert.equal(corrupt.fire, true);
  assert.equal(corrupt.reason, "eligible");
  assert.equal(corrupt.maxUnits, SWEEP_DEFAULTS.minUnits); // idle floored to 0 -> floor unit count
  // a future lastSweepMs (clock skew) must NOT fire -- negative delta < interval (fail-safe)
  const future = planSweep({ nowMs: T, idleSlots: 4, lastSweepMs: T + HOUR, dailyCallsUsed: 0, budgetDay: DAY });
  assert.equal(future.fire, false);
  assert.equal(future.reason, "min-interval-not-elapsed");
  // entirely empty state -> nowMs 0, never-swept(0) but interval-not-elapsed from epoch... deterministic, no throw
  assert.doesNotThrow(() => planSweep({}));
  assert.doesNotThrow(() => planSweep());
});

test("idleSlotCount: real chat-slots shape -- null/stale = idle, fresh heartbeat = active", () => {
  const now = T;
  const fresh = new Date(now - 60_000).toISOString();   // 1 min ago -> active
  const stale = new Date(now - 30 * 60_000).toISOString(); // 30 min ago -> idle (> 10 min window)
  const parsed = {
    schemaVersion: 3,
    slots: {
      alpha: { lastHeartbeat: fresh, chatId: "claude-a" }, // active
      bravo: { lastHeartbeat: stale, chatId: "claude-b" }, // idle (stale)
      charlie: null,                                        // idle (unclaimed)
      delta: { lastHeartbeat: now + 5_000, chatId: "c" },  // future stamp -> treated active (conservative)
    },
  };
  // 4 slots, 2 active (alpha + delta) -> 2 idle
  assert.equal(idleSlotCount(parsed, now), 2);
  // accepts a bare slot map too
  assert.equal(idleSlotCount(parsed.slots, now), 2);
  // tighter window flips the stale judgement consistently; epoch-ms heartbeat also parsed
  assert.equal(idleSlotCount({ slots: { x: { lastHeartbeat: now - 1000 } } }, now), 0);
  // fail-soft: garbage / empty -> 0 (sweep then fires at floor)
  assert.equal(idleSlotCount(null, now), 0);
  assert.equal(idleSlotCount({}, now), 0);
  assert.equal(idleSlotCount({ slots: {} }, now), 0);
});

test("applySweepOutcome: increments today's spend by agents fired + stamps the sweep", () => {
  const next = applySweepOutcome({ budgetDay: DAY, dailyCallsUsed: 10, sweeps: 3 }, { nowMs: T, agentsFired: 5 });
  assert.equal(next.budgetDay, DAY);
  assert.equal(next.dailyCallsUsed, 15);
  assert.equal(next.lastSweepMs, T);
  assert.equal(next.sweeps, 4);
  assert.equal(next.schemaVersion, "1.0.0");
  // crossing the day boundary RESETS the running count to just-fired
  const crossed = applySweepOutcome({ budgetDay: "2026-06-29", dailyCallsUsed: 290, sweeps: 40 }, { nowMs: T, agentsFired: 3 });
  assert.equal(crossed.dailyCallsUsed, 3);
  assert.equal(crossed.budgetDay, DAY);
  // garbage agentsFired -> 0 increment, no throw
  assert.equal(applySweepOutcome({ budgetDay: DAY, dailyCallsUsed: 1 }, { nowMs: T, agentsFired: NaN }).dailyCallsUsed, 1);
});
