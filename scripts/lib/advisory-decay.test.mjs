// scripts/lib/advisory-decay.test.mjs
// U-ADVISORY-DECAY (2026-06-09, slot:alpha): the decay gate must (1) measure
// conversion as taken/INJECTED not taken/fired, (2) NEVER mute a hook with no
// taken-signal (the false-mute trap), (3) protect real converters, (4) only mute
// confirmed noise, (5) keep an epsilon probe alive when muted, (6) fail-safe to
// FIRE on any uncertainty. Fixtures use the EXACT live byHook numbers (R9).
import { test } from "node:test";
import assert from "node:assert/strict";

import { classify, decayDecision, decayReport, DEFAULTS } from "./advisory-decay.mjs";

// ---- the live byHook snapshot this lib was calibrated against (2026-06-09) ----
const LIVE = {
  byHook: {
    "ollama-task-offloader": { fired: 220, offloaded: 12, kept: 186, suggested: 22 }, // 12/22 = 55%
    "grep-index-first": { fired: 828, suggested: 146 }, // NO offloaded key -> unmeasurable
    "ollama-route-pretooluse": { fired: 2374, offloaded: 2, kept: 2359, suggested: 13 }, // 2/13 = 15%, but <50 inj
    "fleet-reaper-coordinator": { fired: 99, offloaded: 0, kept: 0, suggested: 99 }, // 0/99 = NOISE in the report; but offloaded is the wrong metric for a reaper -- it never self-gates, so never muted
    "ollama-nav-enforce": { fired: 3, offloaded: 0, kept: 0, suggested: 3 }, // 3 inj -> insufficient
  },
};
const reader = (obj) => () => JSON.stringify(obj);

// ---------- classify (pure) ----------
test("classify: conversion is taken/INJECTED not taken/fired -- route's rate is 15%, not 0.1%", () => {
  // 2 offloaded / 13 injected = 15.4%. The wrong metric (2/2374 fired = 0.08%)
  // would have called this noise. The right metric shows 15%. With only 13
  // injections (< 50) it is INSUFFICIENT data to judge -- so it fires either way
  // (the live data cannot mute it; the fabricated "0.1% offender" label was wrong).
  const c = classify(LIVE.byHook["ollama-route-pretooluse"]);
  assert.equal(c.injected, 13);
  assert.equal(c.taken, 2);
  assert.ok(Math.abs(c.takeRate - 2 / 13) < 1e-9, "observed rate is 15%, not 0.1%");
  assert.equal(c.status, "insufficient", "13 injections < 50 -- too thin to confidently judge");
});

test("classify: a hook with NO offloaded key is UNMEASURABLE, never noise (the false-mute trap)", () => {
  const c = classify(LIVE.byHook["grep-index-first"]);
  assert.equal(c.hasTakenSignal, false);
  assert.equal(c.taken, null);
  assert.equal(c.takeRate, null);
  assert.equal(c.status, "unmeasurable", "0/146 with no signal != noise -- it is unmeasured");
});

test("classify: present-but-JUNK offloaded (null / '' / non-number) stays UNMEASURABLE, never a false 0% mute", () => {
  // The over-suppression trap: Number(null)===0 / Number('')===0 would manufacture
  // a 0% take-rate -> noise -> false mute. typeof-number guard must reject these.
  for (const junk of [null, "", "x", undefined, NaN, [], {}]) {
    const c = classify({ offloaded: junk, suggested: 120 });
    assert.equal(c.status, "unmeasurable", `offloaded=${JSON.stringify(junk)} must NOT be read as 0% noise`);
    assert.equal(c.taken, null);
  }
  // a real numeric 0 over enough injections IS noise (distinguished from junk):
  assert.equal(classify({ offloaded: 0, suggested: 120 }).status, "noise");
});

test("classify: real 0% converter WITH a signal and enough injections IS noise", () => {
  const c = classify({ fired: 900, offloaded: 0, kept: 880, suggested: 120 });
  assert.equal(c.status, "noise", "offloaded key present, 0/120 = 0% < 5%, >= 50 injections");
});

test("classify: live signal-bearing hooks are all thin-data -> insufficient (the honest live state)", () => {
  // task-offloader 12/22 = 55% looks great but 22 < 50 injections -> insufficient.
  // nav-enforce 3 injections -> insufficient. NONE of the live signal-bearing
  // hooks have enough injections to be confidently muted -- so none mute today.
  assert.equal(classify(LIVE.byHook["ollama-task-offloader"]).status, "insufficient"); // 22 < 50
  assert.equal(classify(LIVE.byHook["ollama-nav-enforce"]).status, "insufficient"); // 3 < 50
  // a SYNTHETIC hook with >= 50 injections at high conversion DOES read healthy:
  assert.equal(classify({ offloaded: 30, suggested: 60 }).status, "healthy"); // 50% over 60
});

test("classify: take-rate exactly at the threshold is NOT noise (strict <, conservative)", () => {
  // 5/100 = 0.05 exactly -> not < 0.05 -> healthy (keep firing at the boundary)
  assert.equal(classify({ offloaded: 5, suggested: 100 }).status, "healthy");
  assert.equal(classify({ offloaded: 4, suggested: 100 }).status, "noise"); // 4% < 5%
});

test("classify: injections exactly == minInjections is enough data", () => {
  assert.equal(classify({ offloaded: 0, suggested: 50 }).status, "noise"); // 50 >= 50, 0% noise
  assert.equal(classify({ offloaded: 0, suggested: 49 }).status, "insufficient");
});

// ---------- decayDecision (reads stats; fail-safe) ----------
test("decayDecision: live route-pretooluse FIRES (insufficient injections -- cannot mute)", () => {
  const d = decayDecision("ollama-route-pretooluse", { readImpl: reader(LIVE) });
  assert.equal(d.fire, true);
  assert.equal(d.muted, false);
  assert.equal(d.status, "insufficient", "13 injections < 50 -- thin data fails safe to fire");
});

test("decayDecision: live grep-index-first FIRES (unmeasurable -- cannot judge, must not mute)", () => {
  const d = decayDecision("grep-index-first", { readImpl: reader(LIVE) });
  assert.equal(d.fire, true);
  assert.equal(d.muted, false);
  assert.equal(d.status, "unmeasurable");
});

test("decayDecision: a confirmed-noise hook is MUTED (suppressed) off the probe tick", () => {
  // 1/100 = 1% < 5%, 100 injections. 100 % 20 == 0 -> that would be a probe tick,
  // so use 97 injections (97 % 20 = 17, not a tick) to see the SUPPRESS.
  const noisy = { byHook: { "noisy-advisory": { offloaded: 0, suggested: 97 } } };
  const d = decayDecision("noisy-advisory", { readImpl: reader(noisy) });
  assert.equal(d.muted, true);
  assert.equal(d.fire, false, "suppressed -- 97 % 20 != 0");
  assert.equal(d.reason, "noise-suppressed");
});

test("decayDecision: muted hook still FIRES on the epsilon probe tick (self-revival)", () => {
  // 100 injections, 100 % 20 == 0 -> probe fires despite muted, keeping the sample alive
  const noisy = { byHook: { "noisy-advisory": { offloaded: 1, suggested: 100 } } };
  const d = decayDecision("noisy-advisory", { readImpl: reader(noisy) });
  assert.equal(d.muted, true);
  assert.equal(d.probe, true);
  assert.equal(d.fire, true, "probe tick fires so a recovered take-rate can lift the mute");
  assert.equal(d.reason, "noise-probe-fire");
});

test("decayDecision: DISABLE knob -> always fire", () => {
  const noisy = { byHook: { x: { offloaded: 0, suggested: 200 } } };
  const d = decayDecision("x", { readImpl: reader(noisy), env: { PRISM_ADVISORY_DECAY_DISABLE: "1" } });
  assert.equal(d.fire, true);
  assert.equal(d.reason, "disabled");
});

test("decayDecision: unreadable/absent stats -> fail-safe FIRE", () => {
  const d = decayDecision("anything", { readImpl: () => { throw new Error("ENOENT"); } });
  assert.equal(d.fire, true);
  assert.equal(d.reason, "stats-unreadable-failsafe");
});

test("decayDecision: hook absent from telemetry -> fire (no-telemetry)", () => {
  const d = decayDecision("never-seen", { readImpl: reader(LIVE) });
  assert.equal(d.fire, true);
  assert.equal(d.reason, "no-telemetry-for-hook");
});

test("decayDecision: env knobs override threshold (tighten bar -> route becomes noise)", () => {
  // raise the bar to 20%: route's 15% now falls below -> noise. Proves knobs wire through.
  const d = decayDecision("ollama-route-pretooluse", {
    readImpl: reader(LIVE),
    env: { PRISM_ADVISORY_DECAY_MAX_TAKE: "0.20", PRISM_ADVISORY_DECAY_MIN_INJ: "10" },
  });
  assert.equal(d.status, "noise");
  assert.equal(d.muted, true);
});

// ---------- decayReport ----------
test("decayReport: ranks worst-first and classifies the live fleet honestly", () => {
  const rows = decayReport({ readImpl: reader(LIVE) });
  assert.equal(rows.length, 5);
  // The honest live snapshot. fleet-reaper-coordinator IS classified `noise`
  // (0/99, has a real offloaded key) -- BUT the report only OBSERVES; it never
  // mutes, because muting is opt-in (the hook must call decayDecision, and a
  // reaper -- whose success metric is NOT ollama-offload -- never does). The
  // signal-bearing offload hooks are insufficient (< 50 injections); grep has no
  // taken-signal -> unmeasurable.
  const byKey = Object.fromEntries(rows.map((r) => [r.hookKey, r.status]));
  assert.equal(byKey["ollama-route-pretooluse"], "insufficient");
  assert.equal(byKey["ollama-task-offloader"], "insufficient");
  assert.equal(byKey["grep-index-first"], "unmeasurable");
  assert.equal(byKey["fleet-reaper-coordinator"], "noise");
  assert.equal(byKey["ollama-nav-enforce"], "insufficient");
  // worst-first ranking: noise < unmeasurable < insufficient < healthy
  assert.equal(rows[0].hookKey, "fleet-reaper-coordinator", "noise sorts first");
  assert.ok(rows.findIndex((r) => r.status === "noise") < rows.findIndex((r) => r.status === "unmeasurable"));
  assert.ok(rows.findIndex((r) => r.status === "unmeasurable") < rows.findIndex((r) => r.status === "insufficient"));
});

test("decayReport: empty/unreadable stats -> []", () => {
  assert.deepEqual(decayReport({ readImpl: () => "not json" }), []);
});

test("DEFAULTS are the documented calibration (50 injections / 5% / probe 20)", () => {
  assert.equal(DEFAULTS.minInjections, 50);
  assert.equal(DEFAULTS.maxTakeRate, 0.05);
  assert.equal(DEFAULTS.probeInterval, 20);
});
