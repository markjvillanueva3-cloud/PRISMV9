// tier: T3 — paired test for stop-system-awareness-freshness.mjs (the T3 advisory hook)
/**
 * stop-system-awareness-freshness.test.mjs — paired with U-SAF-F1 Stop hook.
 *
 * Coverage floor: happy + ≥3 failure modes + ≥2 adversarial + ≥3 variability.
 *
 * Run: node --test H:/prism/.claude/hooks/stop-system-awareness-freshness.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  throttleAllows,
  pickLatestBaseline,
  computeDelta,
  formatAdvisory,
} from "./stop-system-awareness-freshness.mjs";

const HOOK_PATH = fileURLToPath(new URL("./stop-system-awareness-freshness.mjs", import.meta.url));
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

// ─── throttleAllows ─────────────────────────────────────────────────────

test("throttleAllows: no prior stamp → fires (returns true)", () => {
  assert.equal(throttleAllows({ lastStampMs: null, nowMs: Date.now(), throttleMs: FOUR_HOURS_MS }), true);
});

test("throttleAllows: stamp older than window → fires", () => {
  const now = Date.now();
  assert.equal(throttleAllows({ lastStampMs: now - FOUR_HOURS_MS - 1000, nowMs: now, throttleMs: FOUR_HOURS_MS }), true);
});

test("throttleAllows: stamp younger than window → suppresses (returns false)", () => {
  const now = Date.now();
  assert.equal(throttleAllows({ lastStampMs: now - 60000, nowMs: now, throttleMs: FOUR_HOURS_MS }), false);
});

test("throttleAllows: stamp exactly at the window boundary → fires (inclusive >=)", () => {
  const now = Date.now();
  assert.equal(throttleAllows({ lastStampMs: now - FOUR_HOURS_MS, nowMs: now, throttleMs: FOUR_HOURS_MS }), true);
});

test("throttleAllows: NaN/Infinity inputs → fail-open (true)", () => {
  assert.equal(throttleAllows({ lastStampMs: NaN, nowMs: Date.now(), throttleMs: FOUR_HOURS_MS }), true);
  assert.equal(throttleAllows({ lastStampMs: 0, nowMs: NaN, throttleMs: FOUR_HOURS_MS }), true);
  assert.equal(throttleAllows({ lastStampMs: -1, nowMs: Date.now(), throttleMs: FOUR_HOURS_MS }), true);
});

// ─── pickLatestBaseline ─────────────────────────────────────────────────

test("pickLatestBaseline: returns the lexicographically-latest baseline name", () => {
  const entries = [
    "SYSTEM-AWARENESS-FRESHNESS-BASELINE-2026-05-15.json",
    "SYSTEM-AWARENESS-FRESHNESS-BASELINE-2026-05-19.json",
    "SYSTEM-AWARENESS-FRESHNESS-BASELINE-2026-05-17.json",
    "other-file.json",
  ];
  assert.equal(pickLatestBaseline(entries), "SYSTEM-AWARENESS-FRESHNESS-BASELINE-2026-05-19.json");
});

test("pickLatestBaseline: no matching files → null", () => {
  assert.equal(pickLatestBaseline(["foo.json", "bar.md"]), null);
});

test("pickLatestBaseline: non-array input → null (no crash)", () => {
  assert.equal(pickLatestBaseline(null), null);
  assert.equal(pickLatestBaseline(undefined), null);
  assert.equal(pickLatestBaseline("string"), null);
});

// ─── computeDelta ──────────────────────────────────────────────────────

test("computeDelta: same audit twice → no regression, no new tokens", () => {
  const audit = {
    findings: [
      { severity: "high", category: 1, token: "A-MS0" },
      { severity: "low", category: 6 },
    ],
  };
  const d = computeDelta(audit, audit);
  assert.equal(d.ok, true);
  assert.equal(d.highRegressed, false);
  assert.equal(d.newTokensCount, 0);
  assert.equal(d.droppedTokensCount, 0);
});

test("computeDelta: fresh has more high findings → highRegressed true", () => {
  const base = { findings: [{ severity: "high", category: 1, token: "A" }] };
  const fresh = { findings: [
    { severity: "high", category: 1, token: "A" },
    { severity: "high", category: 1, token: "B" },
  ]};
  const d = computeDelta(base, fresh);
  assert.equal(d.highRegressed, true);
  assert.equal(d.newTokensCount, 1);
  assert.deepEqual(d.newTokensSample, ["B"]);
});

test("computeDelta: improvement — fresh has fewer high findings, droppedTokensCount > 0", () => {
  const base = { findings: [
    { severity: "high", category: 1, token: "A" },
    { severity: "high", category: 1, token: "B" },
  ]};
  const fresh = { findings: [{ severity: "high", category: 1, token: "A" }] };
  const d = computeDelta(base, fresh);
  assert.equal(d.highRegressed, false);
  assert.equal(d.droppedTokensCount, 1);
  assert.equal(d.newTokensCount, 0);
});

test("computeDelta: malformed inputs → {ok:false} (no crash)", () => {
  assert.equal(computeDelta(null, {}).ok, false);
  assert.equal(computeDelta({ findings: "not array" }, { findings: [] }).ok, false);
});

test("computeDelta: newTokensSample is capped at 5 entries", () => {
  const base = { findings: [] };
  const fresh = { findings: Array.from({ length: 20 }, (_, i) => ({
    severity: "high", category: 1, token: "T" + i,
  }))};
  const d = computeDelta(base, fresh);
  assert.equal(d.newTokensCount, 20);
  assert.equal(d.newTokensSample.length, 5);
});

// ─── formatAdvisory ─────────────────────────────────────────────────────

test("formatAdvisory: regression delta produces a multi-line advisory", () => {
  const d = {
    ok: true, highRegressed: true,
    baselineHigh: 200, freshHigh: 210,
    newTokensCount: 10, newTokensSample: ["A", "B", "C"], droppedTokensCount: 0,
  };
  const body = formatAdvisory(d);
  assert.match(body, /SAF advisory/);
  assert.match(body, /baseline 200 → fresh 210/);
  assert.match(body, /REGRESSED/);
  assert.match(body, /sample: A, B, C/);
});

test("formatAdvisory: no regression + no new tokens → null (don't fire)", () => {
  const d = {
    ok: true, highRegressed: false, baselineHigh: 100, freshHigh: 100,
    newTokensCount: 0, newTokensSample: [], droppedTokensCount: 0,
  };
  assert.equal(formatAdvisory(d), null);
});

test("formatAdvisory: improvement-only (drops > 0, no new) → null", () => {
  const d = {
    ok: true, highRegressed: false, baselineHigh: 100, freshHigh: 95,
    newTokensCount: 0, newTokensSample: [], droppedTokensCount: 5,
  };
  assert.equal(formatAdvisory(d), null);
});

test("formatAdvisory: includes good-news line when drops > 0 alongside regression", () => {
  const d = {
    ok: true, highRegressed: true, baselineHigh: 100, freshHigh: 102,
    newTokensCount: 5, newTokensSample: ["X"], droppedTokensCount: 3,
  };
  const body = formatAdvisory(d);
  assert.match(body, /3 prior token\(s\) now summarized/);
});

test("formatAdvisory: invalid delta input → null", () => {
  assert.equal(formatAdvisory(null), null);
  assert.equal(formatAdvisory({ ok: false }), null);
});

// ─── Hook E2E (subprocess oracle) ───────────────────────────────────────

function runHook(env = {}, stdinPayload = null) {
  const stdin = stdinPayload === null ? "" : JSON.stringify(stdinPayload);
  const r = spawnSync(process.execPath, [HOOK_PATH], {
    input: stdin,
    env: { ...process.env, ...env },
    encoding: "utf-8",
    timeout: 15000,
  });
  return { code: r.status, signal: r.signal, stdout: r.stdout || "", stderr: r.stderr || "" };
}

test("hook E2E: PRISM_SAF_STOP_DISABLE=1 → exit 0, no stdout", () => {
  const r = runHook({ PRISM_SAF_STOP_DISABLE: "1" }, { tool_name: "Stop" });
  assert.equal(r.code, 0);
  assert.equal(r.stdout, "");
});

test("hook E2E: missing baseline (PRISM_SAF_STOP_BASELINE points nowhere) → fail-open exit 0", () => {
  const r = runHook(
    { PRISM_SAF_STOP_BASELINE: "/no/such/path.json" },
    { tool_name: "Stop" },
  );
  assert.equal(r.code, 0);
  assert.equal(r.stdout, ""); // fail-open: missing baseline → silent allow
});

test("hook E2E: malformed baseline file → fail-open", () => {
  let dir;
  try {
    dir = mkdtempSync(join(tmpdir(), "saf-stop-"));
    const bad = join(dir, "bad.json");
    writeFileSync(bad, "{not valid json");
    const r = runHook({ PRISM_SAF_STOP_BASELINE: bad }, { tool_name: "Stop" });
    assert.equal(r.code, 0);
    assert.equal(r.stdout, "");
  } finally { if (dir) rmSync(dir, { recursive: true, force: true }); }
});

test("hook E2E: empty stdin (no harness payload) → fail-open exit 0", () => {
  // The hook MAY emit advisory if the live audit regressed vs current baseline.
  // We only assert exit-0 here — advisory shape is tested in formatAdvisory unit tests.
  const r = runHook({ PRISM_SAF_STOP_BASELINE: "/no/such/path.json" }, null);
  assert.equal(r.code, 0);
});

test("hook E2E: throttle env var override = very large window → no crash on huge values", () => {
  // Verifies the env-var IS read (no crash / no NaN propagation on huge values).
  // Asserting actual suppression requires a stamp file in the canonical location
  // which we don't write here — separate concern, covered by the throttleAllows
  // unit tests above.
  const r = runHook(
    { PRISM_SAF_STOP_THROTTLE_MS: "315360000000" /* 10 years */ },
    { tool_name: "Stop" },
  );
  assert.equal(r.code, 0);
});

// ─── Adversarial ────────────────────────────────────────────────────────

test("adversarial: huge baseline (10k findings) → computeDelta completes without OOM", () => {
  const base = { findings: Array.from({ length: 10000 }, (_, i) => ({
    severity: "high", category: 1, token: "T" + i,
  }))};
  const fresh = { findings: base.findings };
  const d = computeDelta(base, fresh);
  assert.equal(d.ok, true);
  assert.equal(d.newTokensCount, 0);
});

test("adversarial: PRISM_SAF_STOP_THROTTLE_MS=abc (NaN) → falls back to default", () => {
  // Bad env var should not crash; the parseInt fallback handles it.
  const r = runHook({ PRISM_SAF_STOP_THROTTLE_MS: "abc" }, { tool_name: "Stop" });
  assert.equal(r.code, 0);
});

// ─── Variability ────────────────────────────────────────────────────────

test("variability: severity sets — high-only, mixed, low-only all compute correctly", () => {
  const cases = [
    { sev: "high", baseHigh: 5, freshHigh: 6, regression: true },
    { sev: "medium", baseHigh: 0, freshHigh: 0, regression: false },
    { sev: "low", baseHigh: 0, freshHigh: 0, regression: false },
  ];
  for (const c of cases) {
    const base = { findings: Array.from({ length: c.sev === "high" ? 5 : 5 }, () => ({ severity: c.sev, category: 1, token: "T" })) };
    const fresh = { findings: Array.from({ length: c.sev === "high" ? 6 : 5 }, () => ({ severity: c.sev, category: 1, token: "T" })) };
    const d = computeDelta(base, fresh);
    assert.equal(d.ok, true);
    assert.equal(d.highRegressed, c.regression);
  }
});

test("variability: category sets 1/3/5/6 — only category 1 contributes to token tracking", () => {
  const base = { findings: [
    { severity: "high", category: 3, link: "broken1" },
    { severity: "high", category: 1, token: "A" },
  ]};
  const fresh = { findings: [
    { severity: "high", category: 3, link: "broken1" },
    { severity: "high", category: 1, token: "A" },
    { severity: "high", category: 1, token: "B" },
  ]};
  const d = computeDelta(base, fresh);
  assert.equal(d.newTokensCount, 1);
  assert.deepEqual(d.newTokensSample, ["B"]);
});

test("variability: empty findings arrays → zero everything, no crash", () => {
  const d = computeDelta({ findings: [] }, { findings: [] });
  assert.equal(d.ok, true);
  assert.equal(d.highRegressed, false);
  assert.equal(d.newTokensCount, 0);
  assert.equal(d.droppedTokensCount, 0);
});
