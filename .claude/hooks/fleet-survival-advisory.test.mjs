// Tests for fleet-survival-advisory.mjs -- the proactive UserPromptSubmit
// advisory that surfaces the 5h-limit survival verdict ONLY when actionable
// (fleet WILL block AND proximity has climbed into warn/critical), throttled.
// R9: each test fails if the gating/throttle logic changes.
//
// Run directly:  node .claude/hooks/fleet-survival-advisory.test.mjs   (node:test auto-runs)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ZONE_RANK,
  stableIdFromPayload,
  shouldRunCheck,
  decideAdvisory,
  stampKeyOf,
  computeAdvisory,
} from "./fleet-survival-advisory.mjs";

const HOUR = 60 * 60 * 1000;
const COOLDOWN = 30 * 60 * 1000;

// A "will block" verdict shaped like runSurvivalStatus() output, in warn zone.
const WILLBLOCK_WARN = {
  survives: false,
  armed: false,
  preflightGrade: "RED",
  currentAccount: null,
  nextTarget: "account-1",
  verdict: "WILL BLOCK at the next 5h limit -- 2 blocker(s).",
  blockers: ["account-switch is NOT armed", "account set is not arm-safe (RED)"],
  actions: [
    "Re-capture the CURRENT login so the account is identifiable: `node scripts/capture-claude-credentials.mjs account-N`",
    "Once the account set is GREEN, arm: `node scripts/arm-account-switch.mjs --auto`",
  ],
  proximity: { zone: "warn", pctUsed: 88, etaMinutes: 20, burnPerMin: 500000, armTrigger: 67_000_000, armWouldFire: false },
};
const SURVIVABLE = {
  survives: true,
  armed: true,
  preflightGrade: "GREEN",
  actions: [],
  proximity: { zone: "critical", pctUsed: 93, etaMinutes: 8, burnPerMin: 500000 },
};

// --- ZONE_RANK ---
test("ZONE_RANK: ok/unknown rank below warn below critical", () => {
  assert.equal(ZONE_RANK.ok, 0);
  assert.equal(ZONE_RANK.unknown, 0);
  assert.ok(ZONE_RANK.warn > ZONE_RANK.ok);
  assert.ok(ZONE_RANK.critical > ZONE_RANK.warn);
});

// --- stableIdFromPayload ---
test("stableIdFromPayload: valid uuid -> claude-<8hex>", () => {
  assert.equal(stableIdFromPayload({ session_id: "2bb2ef8a-06f5-4b6f-8801-35a9db88efb7" }), "claude-2bb2ef8a");
});
test("stableIdFromPayload: missing / short / non-object -> null", () => {
  assert.equal(stableIdFromPayload({}), null);
  assert.equal(stableIdFromPayload({ session_id: "abc" }), null);
  assert.equal(stableIdFromPayload(null), null);
  assert.equal(stableIdFromPayload("nope"), null);
});

// --- shouldRunCheck ---
test("shouldRunCheck: no prior check (NaN) -> always run", () => {
  assert.equal(shouldRunCheck(1000, NaN, 300_000), true);
});
test("shouldRunCheck: within interval -> skip; at/after interval -> run", () => {
  const now = 1_000_000;
  assert.equal(shouldRunCheck(now, now - 100_000, 300_000), false); // 100s < 300s
  assert.equal(shouldRunCheck(now, now - 300_000, 300_000), true);  // exactly elapsed
  assert.equal(shouldRunCheck(now, now - 400_000, 300_000), true);  // past elapsed
});

// --- decideAdvisory: silence paths ---
test("decideAdvisory: null survival -> no nudge", () => {
  const d = decideAdvisory({ survival: null, nowMs: 0, lastNudgeMs: NaN, cooldownMs: COOLDOWN });
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "no-survival");
});
test("decideAdvisory: survivable (armed+GREEN) -> silent even at critical proximity", () => {
  const d = decideAdvisory({ survival: SURVIVABLE, nowMs: 0, lastNudgeMs: NaN, cooldownMs: COOLDOWN });
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "survivable");
});
test("decideAdvisory: will-block but proximity ok -> silent (not climbing yet)", () => {
  const okProx = { ...WILLBLOCK_WARN, proximity: { zone: "ok", pctUsed: 22 } };
  const d = decideAdvisory({ survival: okProx, nowMs: 0, lastNudgeMs: NaN, cooldownMs: COOLDOWN });
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "proximity-ok");
});
test("decideAdvisory: will-block but proximity zone missing/unknown -> silent", () => {
  const noProx = { ...WILLBLOCK_WARN, proximity: undefined };
  const d = decideAdvisory({ survival: noProx, nowMs: 0, lastNudgeMs: NaN, cooldownMs: COOLDOWN });
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "proximity-ok");
});

// --- decideAdvisory: nudge paths (R9 mutation guards) ---
test("decideAdvisory: will-block + WARN + cooldown elapsed -> NUDGE with actions+eta+pct", () => {
  const d = decideAdvisory({ survival: WILLBLOCK_WARN, nowMs: 10 * HOUR, lastNudgeMs: NaN, cooldownMs: COOLDOWN });
  assert.equal(d.nudge, true);
  assert.equal(d.reason, "actionable-warn");
  assert.match(d.text, /5h SESSION LIMIT/);
  assert.match(d.text, /88%/);              // pct
  assert.match(d.text, /~20 min/);          // eta
  assert.match(d.text, /NOT armed/);        // armed state
  assert.match(d.text, /RED/);              // preflight grade
  assert.match(d.text, /arm-account-switch\.mjs --auto/); // action surfaced
  assert.match(d.text, /operator-gated/);   // RED-gate never auto-fired
});
test("decideAdvisory: WARN is included (boundary) -- mutation rank<=warn would drop it", () => {
  // If the gate were `rank <= ZONE_RANK.warn` this would be silenced -> regression caught.
  const d = decideAdvisory({ survival: WILLBLOCK_WARN, nowMs: 10 * HOUR, lastNudgeMs: NaN, cooldownMs: COOLDOWN });
  assert.equal(d.nudge, true);
});
test("decideAdvisory: CRITICAL but not armed -> NUDGE (separate from the armed=silent case)", () => {
  const crit = { ...WILLBLOCK_WARN, proximity: { ...WILLBLOCK_WARN.proximity, zone: "critical", pctUsed: 95, etaMinutes: 5 } };
  const d = decideAdvisory({ survival: crit, nowMs: 10 * HOUR, lastNudgeMs: NaN, cooldownMs: COOLDOWN });
  assert.equal(d.nudge, true);
  assert.equal(d.reason, "actionable-critical");
});
test("decideAdvisory: within cooldown -> suppressed even when actionable", () => {
  const now = 10 * HOUR;
  const d = decideAdvisory({ survival: WILLBLOCK_WARN, nowMs: now, lastNudgeMs: now - 60_000, cooldownMs: COOLDOWN });
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "cooldown");
});
test("decideAdvisory: cooldown exactly elapsed -> nudges again", () => {
  const now = 10 * HOUR;
  const d = decideAdvisory({ survival: WILLBLOCK_WARN, nowMs: now, lastNudgeMs: now - COOLDOWN, cooldownMs: COOLDOWN });
  assert.equal(d.nudge, true);
});

// --- adversarial shapes ---
test("decideAdvisory: empty actions array -> still nudges, no action bullets, no crash", () => {
  const noActions = { ...WILLBLOCK_WARN, actions: [] };
  const d = decideAdvisory({ survival: noActions, nowMs: 10 * HOUR, lastNudgeMs: NaN, cooldownMs: COOLDOWN });
  assert.equal(d.nudge, true);
  assert.doesNotMatch(d.text, /To make the fleet survive autonomously:/);
});
test("decideAdvisory: missing pct/eta -> graceful placeholders, still nudges", () => {
  const sparse = { ...WILLBLOCK_WARN, proximity: { zone: "warn" } };
  const d = decideAdvisory({ survival: sparse, nowMs: 10 * HOUR, lastNudgeMs: NaN, cooldownMs: COOLDOWN });
  assert.equal(d.nudge, true);
  assert.match(d.text, /\(\? of ceiling\)/); // pct placeholder (no % when not a number)
  assert.match(d.text, /time-to-limit soon/); // eta placeholder
});
test("decideAdvisory: non-object survival (string) -> no nudge", () => {
  const d = decideAdvisory({ survival: "WILL BLOCK", nowMs: 0, lastNudgeMs: NaN, cooldownMs: COOLDOWN });
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "no-survival");
});

// --- stampKeyOf ---
test("stampKeyOf: valid session -> sanitized stable id; none -> 'unknown'", () => {
  assert.equal(stampKeyOf({ session_id: "2bb2ef8a-06f5-4b6f-8801-35a9db88efb7" }), "claude-2bb2ef8a");
  assert.equal(stampKeyOf({}), "unknown");
  assert.equal(stampKeyOf(null), "unknown");
});

// --- computeAdvisory (orchestration with injected IO) ---
const PAYLOAD = { session_id: "2bb2ef8a-06f5-4b6f-8801-35a9db88efb7" };
const CHECK = 5 * 60 * 1000;
const throwingSurvival = () => { throw new Error("survivalFn must NOT be called within the check interval"); };

test("computeAdvisory: within check-interval -> SKIPS the expensive compute (survivalFn never called)", () => {
  const now = 10 * HOUR;
  let wrote = null;
  const r = computeAdvisory({
    payload: PAYLOAD, nowMs: now, cooldownMs: COOLDOWN, checkMs: CHECK,
    readStampFn: () => ({ lastCheckMs: now - 60_000, lastNudgeMs: NaN }), // 60s ago < 5m
    writeStampFn: (k, doc) => { wrote = doc; },
    survivalFn: throwingSurvival, // would throw if the gate failed to short-circuit
  });
  assert.equal(r.computed, false);
  assert.equal(r.reason, "check-throttled");
  assert.equal(r.additionalContext, null);
  assert.equal(r.wrote, false);
  assert.equal(wrote, null); // no stamp write on a skip
});

test("computeAdvisory: no prior stamp -> runs compute (does not skip on NaN lastCheckMs)", () => {
  let called = false;
  const r = computeAdvisory({
    payload: PAYLOAD, nowMs: 10 * HOUR, cooldownMs: COOLDOWN, checkMs: CHECK,
    readStampFn: () => null, // -> default {NaN,NaN}
    writeStampFn: () => {},
    survivalFn: () => { called = true; return SURVIVABLE; },
  });
  assert.equal(called, true);
  assert.equal(r.computed, true);
});

test("computeAdvisory: interval elapsed + survivable -> no nudge, but lastCheckMs persisted (lastNudge preserved)", () => {
  const now = 10 * HOUR;
  let wrote = null;
  const r = computeAdvisory({
    payload: PAYLOAD, nowMs: now, cooldownMs: COOLDOWN, checkMs: CHECK,
    readStampFn: () => ({ lastCheckMs: now - CHECK, lastNudgeMs: 12345 }),
    writeStampFn: (k, doc) => { wrote = doc; },
    survivalFn: () => SURVIVABLE,
  });
  assert.equal(r.additionalContext, null);
  assert.equal(r.computed, true);
  assert.equal(wrote.lastCheckMs, now);   // refreshed so we don't recompute next prompt
  assert.equal(wrote.lastNudgeMs, 12345); // preserved -- a non-nudge must not reset the cooldown
});

test("computeAdvisory: interval elapsed + actionable + cooldown clear -> NUDGE, lastNudgeMs=now", () => {
  const now = 10 * HOUR;
  let wrote = null;
  const r = computeAdvisory({
    payload: PAYLOAD, nowMs: now, cooldownMs: COOLDOWN, checkMs: CHECK,
    readStampFn: () => ({ lastCheckMs: now - CHECK, lastNudgeMs: NaN }),
    writeStampFn: (k, doc) => { wrote = doc; },
    survivalFn: () => WILLBLOCK_WARN,
  });
  assert.match(r.additionalContext, /5h SESSION LIMIT/);
  assert.equal(r.reason, "actionable-warn");
  assert.equal(wrote.lastNudgeMs, now); // nudge resets the cooldown clock
});

test("computeAdvisory: actionable but within cooldown -> no nudge, lastCheckMs still refreshed", () => {
  const now = 10 * HOUR;
  let wrote = null;
  const r = computeAdvisory({
    payload: PAYLOAD, nowMs: now, cooldownMs: COOLDOWN, checkMs: CHECK,
    readStampFn: () => ({ lastCheckMs: now - CHECK, lastNudgeMs: now - 60_000 }), // nudged 1m ago
    writeStampFn: (k, doc) => { wrote = doc; },
    survivalFn: () => WILLBLOCK_WARN,
  });
  assert.equal(r.additionalContext, null);
  assert.equal(r.reason, "cooldown");
  assert.equal(wrote.lastCheckMs, now);
  assert.equal(wrote.lastNudgeMs, now - 60_000); // cooldown clock untouched
});

test("computeAdvisory: survivalFn throws -> fail-soft (no nudge) but lastCheckMs still stamped", () => {
  const now = 10 * HOUR;
  let wrote = null;
  const r = computeAdvisory({
    payload: PAYLOAD, nowMs: now, cooldownMs: COOLDOWN, checkMs: CHECK,
    readStampFn: () => ({ lastCheckMs: now - CHECK, lastNudgeMs: NaN }),
    writeStampFn: (k, doc) => { wrote = doc; },
    survivalFn: () => { throw new Error("transcript unreadable"); },
  });
  assert.equal(r.additionalContext, null);
  assert.equal(r.reason, "no-survival");
  assert.equal(r.computed, true);
  assert.equal(wrote.lastCheckMs, now); // do not re-hammer next prompt
});
