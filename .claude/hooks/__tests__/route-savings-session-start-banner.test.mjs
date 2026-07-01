// TOKEN-SAVINGS-PIVOT/U-PSN-BANNER-FAIL-LOUD (iter2, 2026-05-23, slot:alpha)
// Tests for the R12 fail-loud fix in route-savings-session-start-inject.mjs.
// Pre-fix bug: when totalTakeups === 0, the rate fell back to 0.30 "doctrine"
// and estimated savings were computed from that fake rate — banner lied about
// ~98K saved when actual was 0K saved on 0/41 measured.

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatBanner, computeRateBand, shouldEmitBanner } from "../route-savings-session-start-inject.mjs";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HOOK_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "route-savings-session-start-inject.mjs");

// --- core R12 regression: zero takeups must report zero savings ---

test("formatBanner: zero takeups + many fires → reports 0K saved (NOT projected from doctrine)", () => {
  const banner = formatBanner({
    totalFires: 41,
    takeupTotals: { totalTakeups: 0 },
    byToolName: { Read: 12, Bash: 8 },
    byClassifier: { doctrineSurface: 15, isVerboseBash: 8 },
  });
  assert.ok(banner !== null);
  assert.ok(banner.includes("~0K tokens"), `pre-fix bug: banner claimed ~98K when actual was 0. Got: ${banner}`);
  assert.ok(!banner.includes("30% doctrine"), "must NOT show the pre-fix doctrine label");
  assert.ok(banner.includes("0/41"), "must show measured takeups/fires");
  assert.ok(banner.includes("0.0%"), "must show the actual 0% rate");
});

// U-ROUTE-SAVINGS-MEASUREMENT-GAP (2026-06-15, slot:alpha) SUPERSEDES the prior intent here.
// 0 takeups on >=50 fires is almost certainly a measurement gap (the takeup hook only credits a
// nudge when a prism_*:* MCP action runs in-window, so a persistently-offline MCP bridge zeroes
// the rate regardless of behavior) -- NOT the model ignoring suggestions. The banner must name the
// real cause, not send chats chasing a behavioral "below target" fix for an environment problem.
test("formatBanner: zero takeups + MANY fires (>=50) -> MEASUREMENT GAP label, NOT 'below target'", () => {
  const banner = formatBanner({
    totalFires: 100,
    takeupTotals: { totalTakeups: 0 },
  });
  assert.ok(banner.includes("MEASUREMENT GAP"), "0/100 must be flagged as a measurement gap");
  assert.ok(banner.includes("/route-suggest-stats"), "must point at the verify path");
  assert.ok(!banner.includes("below"), "must NOT mislabel an env gap as a behavioral below-target miss");
  assert.ok(banner.includes("~0K tokens"), "savings still honest (0 actual takeups)");
});

test("formatBanner: boundary -- exactly 50 fires + 0 takeups -> measurement gap (>= threshold)", () => {
  const banner = formatBanner({ totalFires: 50, takeupTotals: { totalTakeups: 0 } });
  assert.ok(banner.includes("MEASUREMENT GAP"));
  assert.ok(!banner.includes("below"));
});

test("formatBanner: boundary -- 49 fires + 0 takeups -> still 'below target' (under the 50 floor)", () => {
  // Below the measurement-gap floor, 0 takeups is too small a sample to call a wiring gap with
  // confidence, so it keeps the honest below-target framing (mirrors the audit's 'keep' band).
  const banner = formatBanner({ totalFires: 49, takeupTotals: { totalTakeups: 0 } });
  assert.ok(banner.includes("49"));
  assert.ok(banner.includes("below"), "49<50 fires + 0 takes stays below-target, not measurement-gap");
  assert.ok(!banner.includes("MEASUREMENT GAP"));
});

test("formatBanner: ANY takeups>0 below target is a REAL behavioral miss, NOT a measurement gap", () => {
  // The gap label is reserved for the ZERO-takeup wiring-suspect case. Once even one takeup is
  // credited, the mechanism is proven live -> a low rate is a genuine below-target signal.
  const banner = formatBanner({ totalFires: 200, takeupTotals: { totalTakeups: 3 } });
  assert.ok(banner.includes("below"), "3/200 with a working mechanism is a real below-target miss");
  assert.ok(!banner.includes("MEASUREMENT GAP"));
  assert.ok(banner.includes("3/200"));
});

// --- evaluations denominator: GENUINE low-take-rate vs unexercised (U-TAKEUP-EVAL-DENOMINATOR) ---
// The `evaluations` denominator (added to mcp-route-takeup.mjs) proves whether the credit path was
// EXERCISED. evaluations>0 means the takeup hook checked creditable routes yet 0 landed in-window
// -> the wiring is PROVEN LIVE and 0 takes is GENUINE, NOT a measurement gap. This banner must
// mirror the mcp-route-takerate audit's genuine-low-take-rate vs takeup-wiring-broken split.

test("formatBanner: 0 takes + >=50 fires + evaluations>0 -> GENUINE low-take-rate (PROVEN LIVE), NOT a measurement gap", () => {
  const banner = formatBanner({
    totalFires: 672,
    takeupTotals: { totalTakeups: 0, evaluations: 9 },
  });
  assert.ok(banner.includes("PROVEN LIVE"), "evaluations>0 must surface the credit path as proven live");
  assert.ok(banner.includes("GENUINE"), "0 takes with a live path is a genuine low take-rate");
  assert.ok(banner.includes("9 route-checks"), "must surface the evaluation count");
  assert.ok(!banner.includes("MEASUREMENT GAP"), "a proven-live path is NOT a measurement gap");
  assert.ok(banner.includes("~0K tokens"), "savings still honest (0 actual takeups)");
});

test("formatBanner: 0 takes + >=50 fires + evaluations===0 -> MEASUREMENT GAP preserved (cause unexercised)", () => {
  // Backward-compat lock: with the credit path never exercised, the cause is unproven and the
  // legacy MEASUREMENT GAP framing must remain (so old sidecars without the field don't regress).
  const banner = formatBanner({
    totalFires: 100,
    takeupTotals: { totalTakeups: 0, evaluations: 0 },
  });
  assert.ok(banner.includes("MEASUREMENT GAP"), "evaluations===0 keeps the cause-unproven framing");
  assert.ok(!banner.includes("PROVEN LIVE"));
});

// --- warming state (< 5 fires) ---

test("formatBanner: 0/3 fires → 'warming up' label (no premature alarm)", () => {
  const banner = formatBanner({
    totalFires: 3,
    takeupTotals: { totalTakeups: 0 },
  });
  assert.ok(banner.includes("warming up"));
  assert.ok(banner.includes("0/3"));
  // No "below target" tag — too early to evaluate
  assert.ok(!banner.includes("below"));
});

test("formatBanner: 1/4 fires (low n) → 'warming up' (not yet a real measurement)", () => {
  const banner = formatBanner({
    totalFires: 4,
    takeupTotals: { totalTakeups: 1 },
  });
  assert.ok(banner.includes("warming up"));
  assert.ok(banner.includes("1/4"));
});

// --- above-target state (measured ≥ 30%) ---

test("formatBanner: 35/100 → 'measured ✓' tag (target reached)", () => {
  const banner = formatBanner({
    totalFires: 100,
    takeupTotals: { totalTakeups: 35 },
  });
  assert.ok(banner.includes("35.0% measured"));
  assert.ok(banner.includes("✓"), "above-target ✓ tag");
  assert.ok(!banner.includes("below"));
});

test("formatBanner: exactly 30/100 → at target, '✓' tag", () => {
  const banner = formatBanner({
    totalFires: 100,
    takeupTotals: { totalTakeups: 30 },
  });
  assert.ok(banner.includes("30.0% measured"));
  assert.ok(banner.includes("✓"));
});

// --- below-target state (5 ≤ fires, < 30%) ---

test("formatBanner: 5/50 (10%) → below-target label with gap context", () => {
  const banner = formatBanner({
    totalFires: 50,
    takeupTotals: { totalTakeups: 5 },
  });
  assert.ok(banner.includes("5/50"));
  assert.ok(banner.includes("10.0%"));
  assert.ok(banner.includes("below"));
  assert.ok(banner.includes("30%"));
});

// --- savings calculation is honest (no projection) ---

test("formatBanner: savings = takeups × 8K tokens, period", () => {
  // 25 takeups × 8000 tokens = 200,000 tokens = 200K
  const banner = formatBanner({
    totalFires: 100,
    takeupTotals: { totalTakeups: 25 },
  });
  assert.ok(banner.includes("~200K tokens"));
});

test("formatBanner: 1 takeup → ~8K saved, never extrapolated", () => {
  const banner = formatBanner({
    totalFires: 100,
    takeupTotals: { totalTakeups: 1 },
  });
  assert.ok(banner.includes("~8K tokens"));
});

// --- failure modes (≥3 per build-enforce floor) ---

test("formatBanner: null input returns null", () => {
  assert.equal(formatBanner(null), null);
});

test("formatBanner: undefined input returns null", () => {
  assert.equal(formatBanner(undefined), null);
});

test("formatBanner: non-object input returns null", () => {
  assert.equal(formatBanner("not-an-object"), null);
  assert.equal(formatBanner(42), null);
});

test("formatBanner: zero fires returns null (no banner for empty sidecar)", () => {
  assert.equal(formatBanner({ totalFires: 0 }), null);
  assert.equal(formatBanner({ totalFires: 0, takeupTotals: { totalTakeups: 0 } }), null);
});

test("formatBanner: missing totalFires field returns null", () => {
  assert.equal(formatBanner({ byToolName: {} }), null);
});

// --- adversarial inputs (≥2 per build-enforce floor) ---

test("formatBanner: negative totalFires returns null (don't trust corrupt sidecar)", () => {
  assert.equal(formatBanner({ totalFires: -5 }), null);
});

test("formatBanner: NaN totalFires returns null", () => {
  assert.equal(formatBanner({ totalFires: NaN }), null);
});

test("formatBanner: missing takeupTotals → treated as zero takeups (real-world: sidecar just initialized)", () => {
  const banner = formatBanner({ totalFires: 10 });
  assert.ok(banner !== null);
  assert.ok(banner.includes("0/10"));
  assert.ok(banner.includes("~0K tokens"));
});

test("formatBanner: missing byToolName/byClassifier → '—' placeholder", () => {
  const banner = formatBanner({
    totalFires: 10,
    takeupTotals: { totalTakeups: 5 },
  });
  assert.ok(banner.includes("Top tool: —"));
  assert.ok(banner.includes("Top classifier: —"));
});

// --- variability floor: 3 spanning states (warming / below / above) ---

test("variability spanning: warming state renders cleanly", () => {
  const b = formatBanner({ totalFires: 2, takeupTotals: { totalTakeups: 0 } });
  assert.ok(b.includes("warming"));
});

test("variability spanning: below-target state renders cleanly", () => {
  const b = formatBanner({ totalFires: 100, takeupTotals: { totalTakeups: 10 } });
  assert.ok(b.includes("below"));
});

test("variability spanning: at/above-target state renders cleanly", () => {
  const b = formatBanner({ totalFires: 100, takeupTotals: { totalTakeups: 45 } });
  assert.ok(b.includes("✓"));
});

// --- shape ---

test("formatBanner: returns canonical 3-line banner shape", () => {
  const banner = formatBanner({
    totalFires: 41,
    takeupTotals: { totalTakeups: 0 },
    byToolName: { Read: 12 },
    byClassifier: { doctrineSurface: 15 },
  });
  const lines = banner.split("\n");
  assert.equal(lines.length, 3);
  assert.ok(lines[0].startsWith("## 💰 Route-savings telemetry"));
  assert.ok(lines[1].includes("Fires:"));
  assert.ok(lines[2].includes("/route-suggest-stats"));
});

// =====================================================================
// U-ROUTE-SAVINGS-BAND-GATE (2026-06-10, slot:bravo) — rate-band gate so the
// banner emits only on a fleet-wide band change (or daily refresh), not the
// same "0.4% below target" nag every session. Backlog #6b.
// =====================================================================

// --- computeRateBand: pure band tokenization ---

test("computeRateBand: no fires / malformed -> null (no band)", () => {
  assert.equal(computeRateBand(null), null);
  assert.equal(computeRateBand(undefined), null);
  assert.equal(computeRateBand({ totalFires: 0 }), null);
  assert.equal(computeRateBand({ totalFires: -5 }), null);
  assert.equal(computeRateBand({ totalFires: NaN }), null);
  assert.equal(computeRateBand("nope"), null);
});

test("computeRateBand: < WARMING_FIRES (5) -> 'warming'", () => {
  assert.equal(computeRateBand({ totalFires: 3, takeupTotals: { totalTakeups: 0 } }), "warming");
  assert.equal(computeRateBand({ totalFires: 4, takeupTotals: { totalTakeups: 2 } }), "warming");
});

test("computeRateBand: 0.4% (the steady-state nag) -> 'b0' (5pp band)", () => {
  // 4/1000 = 0.4% -> floor(0.4/5) = 0
  assert.equal(computeRateBand({ totalFires: 1000, takeupTotals: { totalTakeups: 4 } }), "b0");
});

test("computeRateBand: band boundaries at 5pp width (5% -> b1, 10% -> b2, 30% -> b6)", () => {
  assert.equal(computeRateBand({ totalFires: 1000, takeupTotals: { totalTakeups: 50 } }), "b1"); // 5%
  assert.equal(computeRateBand({ totalFires: 1000, takeupTotals: { totalTakeups: 100 } }), "b2"); // 10%
  assert.equal(computeRateBand({ totalFires: 100, takeupTotals: { totalTakeups: 30 } }), "b6"); // 30% target
  assert.equal(computeRateBand({ totalFires: 100, takeupTotals: { totalTakeups: 35 } }), "b7"); // 35%
  assert.equal(computeRateBand({ totalFires: 100, takeupTotals: { totalTakeups: 100 } }), "b20"); // 100%
});

test("computeRateBand: just-below vs just-above a boundary land in different bands", () => {
  // 49/1000 = 4.9% -> b0 ; 50/1000 = 5.0% -> b1 (R9: the band MUST flip at the boundary)
  assert.equal(computeRateBand({ totalFires: 1000, takeupTotals: { totalTakeups: 49 } }), "b0");
  assert.equal(computeRateBand({ totalFires: 1000, takeupTotals: { totalTakeups: 50 } }), "b1");
});

test("computeRateBand: custom width honored (width 10 -> 30% is b3)", () => {
  assert.equal(computeRateBand({ totalFires: 100, takeupTotals: { totalTakeups: 30 } }, 10), "b3");
});

test("computeRateBand: invalid width (0 / negative / NaN) falls back to default 5pp", () => {
  const stats = { totalFires: 100, takeupTotals: { totalTakeups: 30 } }; // 30% -> b6 at width 5
  assert.equal(computeRateBand(stats, 0), "b6");
  assert.equal(computeRateBand(stats, -3), "b6");
  assert.equal(computeRateBand(stats, NaN), "b6");
  assert.equal(computeRateBand(stats, "x"), "b6");
});

// --- shouldEmitBanner: pure emit decision ---

const NOW = 1_000_000_000_000; // fixed clock for determinism
const DAY = 24 * 60 * 60 * 1000;

test("shouldEmitBanner: gate disabled -> always emit (legacy)", () => {
  assert.equal(shouldEmitBanner({ band: "b0", shownAt: NOW }, "b0", { gateDisabled: true, nowMs: NOW }), true);
});

test("shouldEmitBanner: no prior state -> emit (first show / baseline)", () => {
  assert.equal(shouldEmitBanner(null, "b0", { nowMs: NOW }), true);
  assert.equal(shouldEmitBanner(undefined, "b0", { nowMs: NOW }), true);
  assert.equal(shouldEmitBanner("corrupt", "b0", { nowMs: NOW }), true);
});

test("shouldEmitBanner: band changed (up OR down) -> emit", () => {
  assert.equal(shouldEmitBanner({ band: "b0", shownAt: NOW }, "b2", { nowMs: NOW }), true); // up
  assert.equal(shouldEmitBanner({ band: "b2", shownAt: NOW }, "b0", { nowMs: NOW }), true); // down (regression signal)
  assert.equal(shouldEmitBanner({ band: "warming", shownAt: NOW }, "b0", { nowMs: NOW }), true);
});

test("shouldEmitBanner: unchanged band shown recently -> SUPPRESS (the win)", () => {
  assert.equal(shouldEmitBanner({ band: "b0", shownAt: NOW }, "b0", { nowMs: NOW + 60_000 }), false);
});

test("shouldEmitBanner: unchanged band but stale (> maxSilentMs) -> emit (daily refresh)", () => {
  assert.equal(shouldEmitBanner({ band: "b0", shownAt: NOW }, "b0", { nowMs: NOW + DAY + 1 }), true);
});

test("shouldEmitBanner: unchanged band, missing/zero shownAt -> emit (never trust a tsless state)", () => {
  assert.equal(shouldEmitBanner({ band: "b0" }, "b0", { nowMs: NOW }), true);
  assert.equal(shouldEmitBanner({ band: "b0", shownAt: 0 }, "b0", { nowMs: NOW }), true);
});

test("shouldEmitBanner: FUTURE shownAt (clock skew / corrupt state) -> emit, never over-suppress within a band", () => {
  // Ollama-review finding #5 (R12-verified, hardened): a future ts makes
  // (nowMs - shownAt) negative; without the guard it would suppress forever.
  assert.equal(shouldEmitBanner({ band: "b0", shownAt: NOW + 5_000_000 }, "b0", { nowMs: NOW }), true);
  // sanity: a shownAt slightly in the PAST within the window still suppresses
  assert.equal(shouldEmitBanner({ band: "b0", shownAt: NOW - 1000 }, "b0", { nowMs: NOW }), false);
});

test("shouldEmitBanner: currentBand null -> never emit (no banner to show)", () => {
  assert.equal(shouldEmitBanner(null, null, { nowMs: NOW }), false);
  assert.equal(shouldEmitBanner({ band: "b0", shownAt: NOW }, null, { nowMs: NOW }), false);
});

// --- E2E subprocess: real hook run with hermetic sidecar + state overrides ---

function runHook(env) {
  const r = spawnSync(process.execPath, [HOOK_PATH], {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  return JSON.parse(r.stdout);
}

test("E2E: first run emits banner + writes band state; identical 2nd run SUPPRESSES", () => {
  const dir = mkdtempSync(join(tmpdir(), "rsbg-"));
  try {
    const sidecar = join(dir, "stats.json");
    const state = join(dir, "band.json");
    // 0.4% steady-state nag (4/1000) -> band b0
    writeFileSync(sidecar, JSON.stringify({
      totalFires: 1000, takeupTotals: { totalTakeups: 4 },
      byToolName: { Read: 100 }, byClassifier: { doctrineSurface: 80 },
    }));
    const env = {
      PRISM_ROUTE_SUGGEST_SIDECAR: sidecar,
      PRISM_ROUTE_SAVINGS_BANNER_STATE: state,
      PRISM_ROUTE_SAVINGS_INJECT_DISABLE: "",
      PRISM_ROUTE_SAVINGS_BANNER_BAND: "",
    };

    const first = runHook(env);
    assert.ok(first.hookSpecificOutput?.additionalContext?.includes("Route-savings telemetry"),
      "first run must surface the banner");
    assert.ok(existsSync(state), "first run must persist the band-state file");
    const saved = JSON.parse(readFileSync(state, "utf8"));
    assert.equal(saved.band, "b0", "persisted band must be b0 for a 0.4% rate");

    const second = runHook(env);
    assert.equal(second.continue, true);
    assert.equal(second.hookSpecificOutput, undefined,
      "identical 2nd run (same band, fresh state) must SUPPRESS the redundant banner");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E2E: a band change re-surfaces the banner", () => {
  const dir = mkdtempSync(join(tmpdir(), "rsbg-"));
  try {
    const sidecar = join(dir, "stats.json");
    const state = join(dir, "band.json");
    const env = {
      PRISM_ROUTE_SUGGEST_SIDECAR: sidecar,
      PRISM_ROUTE_SAVINGS_BANNER_STATE: state,
      PRISM_ROUTE_SAVINGS_INJECT_DISABLE: "",
      PRISM_ROUTE_SAVINGS_BANNER_BAND: "",
    };
    // start at b0
    writeFileSync(sidecar, JSON.stringify({ totalFires: 1000, takeupTotals: { totalTakeups: 4 } }));
    assert.ok(runHook(env).hookSpecificOutput, "baseline b0 emits");
    assert.equal(runHook(env).hookSpecificOutput, undefined, "b0 repeat suppressed");
    // rate climbs to 12% -> band b2
    writeFileSync(sidecar, JSON.stringify({ totalFires: 1000, takeupTotals: { totalTakeups: 120 } }));
    const climbed = runHook(env);
    assert.ok(climbed.hookSpecificOutput?.additionalContext?.includes("Route-savings"),
      "a band change (b0 -> b2) must re-surface the banner");
    assert.equal(JSON.parse(readFileSync(state, "utf8")).band, "b2");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E2E: legacy gate (PRISM_ROUTE_SAVINGS_BANNER_BAND=0) always emits, never writes state", () => {
  const dir = mkdtempSync(join(tmpdir(), "rsbg-"));
  try {
    const sidecar = join(dir, "stats.json");
    const state = join(dir, "band.json");
    writeFileSync(sidecar, JSON.stringify({ totalFires: 1000, takeupTotals: { totalTakeups: 4 } }));
    const env = {
      PRISM_ROUTE_SUGGEST_SIDECAR: sidecar,
      PRISM_ROUTE_SAVINGS_BANNER_STATE: state,
      PRISM_ROUTE_SAVINGS_BANNER_BAND: "0",
      PRISM_ROUTE_SAVINGS_INJECT_DISABLE: "",
    };
    assert.ok(runHook(env).hookSpecificOutput, "legacy: emits");
    assert.ok(runHook(env).hookSpecificOutput, "legacy: STILL emits on repeat (no band gate)");
    assert.equal(existsSync(state), false, "legacy mode must not touch the band-state file");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E2E: daily-refresh floor (MAX_SILENT_MS=0) re-emits even on an unchanged band", () => {
  const dir = mkdtempSync(join(tmpdir(), "rsbg-"));
  try {
    const sidecar = join(dir, "stats.json");
    const state = join(dir, "band.json");
    writeFileSync(sidecar, JSON.stringify({ totalFires: 1000, takeupTotals: { totalTakeups: 4 } }));
    const env = {
      PRISM_ROUTE_SUGGEST_SIDECAR: sidecar,
      PRISM_ROUTE_SAVINGS_BANNER_STATE: state,
      PRISM_ROUTE_SAVINGS_BANNER_MAX_SILENT_MS: "0",
      PRISM_ROUTE_SAVINGS_BANNER_BAND: "",
      PRISM_ROUTE_SAVINGS_INJECT_DISABLE: "",
    };
    assert.ok(runHook(env).hookSpecificOutput, "first emits");
    assert.ok(runHook(env).hookSpecificOutput,
      "with a 0ms silent floor, an unchanged band still refreshes every session");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E2E: full disable (PRISM_ROUTE_SAVINGS_INJECT_DISABLE=1) emits nothing", () => {
  const dir = mkdtempSync(join(tmpdir(), "rsbg-"));
  try {
    const sidecar = join(dir, "stats.json");
    writeFileSync(sidecar, JSON.stringify({ totalFires: 1000, takeupTotals: { totalTakeups: 4 } }));
    const out = runHook({
      PRISM_ROUTE_SUGGEST_SIDECAR: sidecar,
      PRISM_ROUTE_SAVINGS_BANNER_STATE: join(dir, "band.json"),
      PRISM_ROUTE_SAVINGS_INJECT_DISABLE: "1",
    });
    assert.equal(out.continue, true);
    assert.equal(out.hookSpecificOutput, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
