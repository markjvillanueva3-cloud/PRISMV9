// Tests for brain-health-inject.mjs (U-SIERRA-BRAIN-HEALTH-INJECT).
// Pure formatBrainHealth() unit tests: injected rollup + age, deterministic.
//
// INTENT (R9): this SessionStart inject fires ONLY on brain-MACHINERY failure (refresh failed /
// measurement stale / report missing / rollup itself stale). It must stay SILENT in the healthy
// steady state -- INCLUDING when a data-QUALITY content warn (supersession/contradiction/ambiguous)
// is present -- so it is ~zero-noise on every session and only speaks when the brain is actually broken.

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatBrainHealth } from "./brain-health-inject.mjs";

const ok = (over = {}) => ({ key: "brain-refresh", severity: "ok", state: "present", stale: false, ...over });
const rows = (extra = []) => [
  { key: "rot", severity: "ok", state: "present", stale: false },
  { key: "supersession", severity: "ok", state: "present", stale: false },
  { key: "contradiction", severity: "ok", state: "present", stale: false },
  ok(),
  ...extra,
];

test("healthy machinery -> SILENT (null)", () => {
  assert.equal(formatBrainHealth({ overall: "OK", rows: rows() }, { rollupAgeMs: 1000 }), null);
});

test("data-quality content WARN (supersession) but machinery fine -> STILL SILENT (the key noise-gate)", () => {
  // overall is WARN, but the warn is supersession CONTENT, not a brain-refresh failure or a stale
  // measurement. The inject must NOT fire -- that would be noise on every session.
  const r = rows();
  r[1] = { key: "supersession", severity: "warn", state: "present", stale: false }; // 45 stems, data-quality
  assert.equal(formatBrainHealth({ overall: "WARN", rows: r }, { rollupAgeMs: 1000 }), null);
});

test("brain-refresh pipeline FAILED -> fires, names the failed pipeline detail", () => {
  const r = rows();
  r[3] = ok({ severity: "warn", detail: "FAILED: galaxy-synth (3/4 pipelines ok)" });
  const out = formatBrainHealth({ overall: "WARN", rows: r }, { rollupAgeMs: 1000 });
  assert.ok(out && /Brain-health alert/.test(out), "fires");
  assert.match(out, /galaxy-synth/);
  assert.match(out, /brain-refresh FAILED/);
});

test("a STALE gap-sentinel -> fires (refresh stopped running)", () => {
  const r = rows();
  r[0] = { key: "rot", severity: "ok", state: "present", stale: true };
  const out = formatBrainHealth({ overall: "STALE", rows: r }, { rollupAgeMs: 1000 });
  assert.match(out, /stale brain measurement.*rot/);
});

test("a MISSING core brain report (rot) -> fires", () => {
  const r = rows();
  r[0] = { key: "rot", state: "missing" };
  const out = formatBrainHealth({ overall: "STALE", rows: r }, { rollupAgeMs: 1000 });
  assert.match(out, /missing brain report.*rot/);
});

test("NON-core stale/missing (contradiction/ambiguous) -> SILENT (their cadence is not brain-refresh; live false-positive guard)", () => {
  const r = rows();
  r[2] = { key: "contradiction", severity: "ok", state: "present", stale: true }; // not brain-refresh-owned
  r.push({ key: "ambiguous", severity: "info", state: "missing" });               // deliberate residual, not core
  assert.equal(formatBrainHealth({ overall: "STALE", rows: r }, { rollupAgeMs: 1000 }), null);
});

test("rollup itself very stale (>24h) -> fires (brain-refresh likely not firing)", () => {
  const out = formatBrainHealth({ overall: "OK", rows: rows() }, { rollupAgeMs: 30 * 3600_000 });
  assert.match(out, /summary itself is 30h stale/);
});

test("rollup stale within threshold -> still silent", () => {
  assert.equal(formatBrainHealth({ overall: "OK", rows: rows() }, { rollupAgeMs: 5 * 3600_000 }), null);
});

test("null/garbage input -> null, never throws", () => {
  for (const bad of [null, undefined, {}, { rows: "nope" }, 42]) assert.equal(formatBrainHealth(bad, {}), null);
});
