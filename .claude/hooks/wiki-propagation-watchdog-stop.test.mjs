// tier: T3
/**
 * Tests for wiki-propagation-watchdog-stop.mjs
 *
 * Covers the three exported pure functions (no IO):
 *   - repoPaths(here)         — path resolution relative to hook location
 *   - throttleDecision(...)   — stamp-age throttle math
 *   - buildAdvisory(row,now)  — telemetry → Stop-verdict string (or null)
 *
 * The main() side-effects (stdin drain, spawn, emit) are NOT unit-tested here —
 * a subprocess integration smoke (echo '{}' | node ...) is run live in the
 * commit's verify step (the "pure-core + real-data E2E" doctrine).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  repoPaths,
  throttleDecision,
  buildAdvisory,
  decideRecoveryAction,
} from "./wiki-propagation-watchdog-stop.mjs";

describe("repoPaths(here)", () => {
  test("resolves watchdog script under repo-root/scripts/", () => {
    const p = repoPaths("H:/prism/.claude/hooks");
    assert.match(
      p.watchdogScript,
      /scripts[\\/]wiki-propagation-watchdog\.mjs$/,
    );
  });
  test("resolves telemetry under state/shared/", () => {
    const p = repoPaths("H:/prism/.claude/hooks");
    assert.match(
      p.telemetryFile,
      /state[\\/]shared[\\/]wiki-propagation-watchdog\.jsonl$/,
    );
  });
  test("resolves stamp under state/shared/ with dot-prefix", () => {
    const p = repoPaths("H:/prism/.claude/hooks");
    assert.match(p.stampFile, /state[\\/]shared[\\/]\.wiki-watchdog-stop\.stamp$/);
  });
  test("relative resolution is worktree-portable", () => {
    const a = repoPaths("H:/prism-slot-lima/.claude/hooks");
    const b = repoPaths("H:/prism/.claude/hooks");
    // Both end with the same suffix; only the repo prefix differs.
    assert.ok(a.watchdogScript.endsWith("scripts\\wiki-propagation-watchdog.mjs")
      || a.watchdogScript.endsWith("scripts/wiki-propagation-watchdog.mjs"));
    assert.notEqual(a.watchdogScript, b.watchdogScript);
  });
});

describe("throttleDecision(stampMtimeMs, nowMs, throttleMs)", () => {
  const NOW = 2_000_000;
  const THROTTLE = 15 * 60 * 1000;

  test("no stamp → not throttled (no-stamp reason)", () => {
    const r = throttleDecision(null, NOW, THROTTLE);
    assert.equal(r.throttled, false);
    assert.equal(r.reason, "no-stamp");
  });
  test("NaN stamp → not throttled", () => {
    const r = throttleDecision(NaN, NOW, THROTTLE);
    assert.equal(r.throttled, false);
    assert.equal(r.reason, "no-stamp");
  });
  test("recent stamp (1s ago) → throttled", () => {
    const r = throttleDecision(NOW - 1000, NOW, THROTTLE);
    assert.equal(r.throttled, true);
    assert.match(r.reason, /recent-peer-sweep/);
  });
  test("stamp at exactly throttle window → NOT throttled (strict <)", () => {
    const r = throttleDecision(NOW - THROTTLE, NOW, THROTTLE);
    assert.equal(r.throttled, false);
    assert.match(r.reason, /stamp-stale/);
  });
  test("stamp older than throttle → not throttled", () => {
    const r = throttleDecision(NOW - 2 * THROTTLE, NOW, THROTTLE);
    assert.equal(r.throttled, false);
    assert.match(r.reason, /stamp-stale/);
  });
  test("future stamp (clock skew) → throttled (negative age)", () => {
    // A future-dated stamp should still throttle — clock skew defends against
    // a peer that just stamped from a different host with a slightly forward clock.
    const r = throttleDecision(NOW + 5000, NOW, THROTTLE);
    assert.equal(r.throttled, true);
  });
});

describe("buildAdvisory(row, nowMs)", () => {
  const NOW = Date.parse("2026-05-18T20:00:00Z");
  const FRESH_TS = "2026-05-18T19:55:00Z"; // 5 min ago — fresh

  test("null row → null", () => {
    assert.equal(buildAdvisory(null, NOW), null);
  });
  test("non-object row → null", () => {
    assert.equal(buildAdvisory("bogus", NOW), null);
    assert.equal(buildAdvisory(42, NOW), null);
    assert.equal(buildAdvisory(undefined, NOW), null);
  });
  test("clean status → null (nothing to surface)", () => {
    const r = buildAdvisory({ status: "clean", ts: FRESH_TS, stages: [] }, NOW);
    assert.equal(r, null);
  });
  test("stale telemetry (>1h old) → null", () => {
    const r = buildAdvisory(
      { status: "critical", ts: "2026-05-18T18:00:00Z", staleCount: 3, stages: [] },
      NOW,
    );
    assert.equal(r, null);
  });
  test("malformed ts → null (R12 fail-safe)", () => {
    const r = buildAdvisory(
      { status: "critical", ts: "not-a-date", stages: [] },
      NOW,
    );
    assert.equal(r, null);
  });
  test("warn-1-stage → string with stage name + WARN tag", () => {
    const r = buildAdvisory(
      {
        status: "warn",
        ts: FRESH_TS,
        staleCount: 1,
        stages: [
          { stage: "system-viz", stale: true, ageHrs: 5.2, reason: "5.2h > 4h" },
          { stage: "leaf-index", stale: false, ageHrs: 0.3 },
        ],
      },
      NOW,
    );
    assert.match(r, /WARN/);
    assert.match(r, /system-viz=5\.2h/);
    assert.match(r, /1 stage\(s\) stale/);
  });
  test("critical-3-stages → string with all 3 + CRITICAL tag", () => {
    const r = buildAdvisory(
      {
        status: "critical",
        ts: FRESH_TS,
        staleCount: 3,
        stages: [
          { stage: "system-viz", stale: true, ageHrs: 4.3, reason: "4.3h > 4h" },
          { stage: "embeddings", stale: true, ageHrs: 89.3, reason: "89.3h > 48h" },
          {
            stage: "obsidian-feed",
            stale: true,
            ageHrs: null,
            reason: "no-stamp-file-found",
          },
        ],
      },
      NOW,
    );
    assert.match(r, /CRITICAL/);
    assert.match(r, /system-viz=4\.3h/);
    assert.match(r, /embeddings=89\.3h/);
    assert.match(r, /obsidian-feed=\?h/); // null age → "?h"
    assert.match(r, /3 stage\(s\) stale/);
  });
  test("dedup repeated stage names", () => {
    const r = buildAdvisory(
      {
        status: "warn",
        ts: FRESH_TS,
        staleCount: 2,
        stages: [
          { stage: "leaf-index", stale: true, ageHrs: 30 },
          { stage: "leaf-index", stale: true, ageHrs: 30 }, // dup
        ],
      },
      NOW,
    );
    const matches = r.match(/leaf-index=/g) || [];
    assert.equal(matches.length, 1, "deduped: only one leaf-index=");
  });
  test("contains refresh-command guidance", () => {
    const r = buildAdvisory(
      {
        status: "critical",
        ts: FRESH_TS,
        staleCount: 4,
        stages: [{ stage: "system-viz", stale: true, ageHrs: 99 }],
      },
      NOW,
    );
    assert.match(r, /regen-wiki-from-viz/);
    assert.match(r, /build-wiki-embeddings/);
    assert.match(r, /system-viz-on-commit/);
  });
  test("non-array stages → 'see telemetry' fallback (R12 fail-safe)", () => {
    const r = buildAdvisory(
      { status: "critical", ts: FRESH_TS, staleCount: 9, stages: "bogus" },
      NOW,
    );
    assert.match(r, /see telemetry/);
  });
  test("missing staleCount → '?' placeholder", () => {
    const r = buildAdvisory(
      {
        status: "warn",
        ts: FRESH_TS,
        stages: [{ stage: "system-viz", stale: true, ageHrs: 5 }],
      },
      NOW,
    );
    assert.match(r, /\? stage\(s\) stale/);
  });
  test("invalid status (not warn/critical) → null", () => {
    assert.equal(
      buildAdvisory({ status: "info", ts: FRESH_TS, stages: [] }, NOW),
      null,
    );
    assert.equal(
      buildAdvisory({ status: "", ts: FRESH_TS, stages: [] }, NOW),
      null,
    );
  });
});

describe("decideRecoveryAction(row, nowMs) — iter13 actuator", () => {
  const NOW = Date.parse("2026-05-18T20:00:00Z");
  const FRESH_TS = "2026-05-18T19:55:00Z"; // 5 min ago — fresh

  test("null row → null", () => {
    assert.equal(decideRecoveryAction(null, NOW), null);
  });
  test("non-object row → null", () => {
    assert.equal(decideRecoveryAction("bogus", NOW), null);
    assert.equal(decideRecoveryAction(42, NOW), null);
    assert.equal(decideRecoveryAction(undefined, NOW), null);
  });
  test("stale telemetry (>1h old) → null (don't act on stale data)", () => {
    const r = decideRecoveryAction(
      {
        status: "critical",
        ts: "2026-05-18T18:00:00Z",
        stages: [{ stage: "system-viz", stale: true, ageHrs: 50 }],
      },
      NOW,
    );
    assert.equal(r, null);
  });
  test("clean status → null (nothing to recover)", () => {
    const r = decideRecoveryAction(
      {
        status: "clean",
        ts: FRESH_TS,
        stages: [{ stage: "system-viz", stale: false, ageHrs: 0.5 }],
      },
      NOW,
    );
    assert.equal(r, null);
  });
  test("warn stage BELOW hard threshold → null (advisory only, no action)", () => {
    // system-viz warn threshold = 4h, hard threshold = 8h → 5h is warn-only
    const r = decideRecoveryAction(
      {
        status: "warn",
        ts: FRESH_TS,
        stages: [{ stage: "system-viz", stale: true, ageHrs: 5 }],
      },
      NOW,
    );
    assert.equal(r, null);
  });
  test("critical stage AT hard threshold → action returned", () => {
    const r = decideRecoveryAction(
      {
        status: "critical",
        ts: FRESH_TS,
        stages: [{ stage: "system-viz", stale: true, ageHrs: 8 }],
      },
      NOW,
    );
    assert.ok(r, "expected non-null action");
    assert.equal(r.stage, "system-viz");
    assert.match(r.command, /scripts[\\/]system-viz-on-commit\.mjs$/);
  });
  test("critical stage OVER hard threshold → action with reason", () => {
    const r = decideRecoveryAction(
      {
        status: "critical",
        ts: FRESH_TS,
        stages: [
          { stage: "embeddings", stale: true, ageHrs: 120, reason: "120h > 48h" },
        ],
      },
      NOW,
    );
    assert.ok(r);
    assert.equal(r.stage, "embeddings");
    assert.match(r.command, /scripts[\\/]build-wiki-embeddings\.mjs$/);
    assert.match(r.reason, /embeddings=120\.0h > 96h hard threshold/);
  });
  test("obsidian-feed stale → null (no auto-recovery command — operator-only)", () => {
    const r = decideRecoveryAction(
      {
        status: "critical",
        ts: FRESH_TS,
        stages: [
          { stage: "obsidian-feed", stale: true, ageHrs: 200 },
        ],
      },
      NOW,
    );
    assert.equal(r, null);
  });
  test("multiple stale stages → picks the oldest", () => {
    const r = decideRecoveryAction(
      {
        status: "critical",
        ts: FRESH_TS,
        stages: [
          { stage: "system-viz", stale: true, ageHrs: 10 },
          { stage: "embeddings", stale: true, ageHrs: 200 },
          { stage: "leaf-index", stale: true, ageHrs: 50 },
        ],
      },
      NOW,
    );
    assert.ok(r);
    assert.equal(r.stage, "embeddings"); // 200h is the largest
  });
  test("unknown stage → ignored (returns null when only unknown stales exist)", () => {
    const r = decideRecoveryAction(
      {
        status: "critical",
        ts: FRESH_TS,
        stages: [{ stage: "mystery-stage", stale: true, ageHrs: 1000 }],
      },
      NOW,
    );
    assert.equal(r, null);
  });
  test("non-array stages → null (R12 fail-safe)", () => {
    const r = decideRecoveryAction(
      { status: "critical", ts: FRESH_TS, stages: "bogus" },
      NOW,
    );
    assert.equal(r, null);
  });
  test("NaN ageHrs → ignored", () => {
    const r = decideRecoveryAction(
      {
        status: "critical",
        ts: FRESH_TS,
        stages: [{ stage: "system-viz", stale: true, ageHrs: "bad" }],
      },
      NOW,
    );
    assert.equal(r, null);
  });
  test("warn status with critically-old stage still acts (warn is permissive)", () => {
    // status=warn (1 stage stale, watchdog grading), but THAT stage is 200h old
    const r = decideRecoveryAction(
      {
        status: "warn",
        ts: FRESH_TS,
        stages: [{ stage: "leaf-index", stale: true, ageHrs: 200 }],
      },
      NOW,
    );
    assert.ok(r);
    assert.equal(r.stage, "leaf-index");
  });
});
