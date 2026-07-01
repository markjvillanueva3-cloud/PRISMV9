// scripts/lib/__tests__/rtk-fraction-tune.test.mjs
//
// PSN-RTK-ADOPTION-MEASURE/U-RAM02 (2026-05-24, slot:alpha)
//
// Tests for the pure-function tuner. node --test compatible.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseAdoptionLedger,
  computeP50Fraction,
  tuneFractions,
  NOMINAL_VERBOSE_TOKENS,
} from "../rtk-fraction-tune.mjs";

// ---------------------------------------------------------------- helpers

function mkLine(base, observed_tokens, est_tokens = 700) {
  return JSON.stringify({
    ts: "2026-05-24T00:00:00.000Z",
    kind: "measured",
    base,
    est_tokens,
    observed_bytes: observed_tokens * 4,
    observed_tokens,
    delta_pct: 0,
    classification: "on-target",
  });
}

// ---------------------------------------------------------------- parseAdoptionLedger

test("parseAdoptionLedger — empty string returns empty map", () => {
  const { byBase } = parseAdoptionLedger("");
  assert.equal(byBase.size, 0);
});

test("parseAdoptionLedger — single-line single-base", () => {
  const line = mkLine("git", 500);
  const { byBase } = parseAdoptionLedger(line);
  assert.equal(byBase.size, 1);
  assert.equal(byBase.get("git").length, 1);
  assert.equal(byBase.get("git")[0].observed_tokens, 500);
  assert.equal(byBase.get("git")[0].est_tokens, 700);
});

test("parseAdoptionLedger — multi-base accumulates per base", () => {
  const txt = [
    mkLine("git", 400),
    mkLine("npm", 900),
    mkLine("git", 600),
    mkLine("vitest", 50),
    mkLine("git", 500),
  ].join("\n");
  const { byBase } = parseAdoptionLedger(txt);
  assert.equal(byBase.size, 3);
  assert.equal(byBase.get("git").length, 3);
  assert.equal(byBase.get("npm").length, 1);
  assert.equal(byBase.get("vitest").length, 1);
  assert.deepEqual(
    byBase.get("git").map((s) => s.observed_tokens),
    [400, 600, 500],
  );
});

test("parseAdoptionLedger — base is lowercased", () => {
  const { byBase } = parseAdoptionLedger(mkLine("GIT", 400));
  assert.ok(byBase.has("git"));
  assert.ok(!byBase.has("GIT"));
});

test("parseAdoptionLedger — bad JSON line is skipped fail-soft", () => {
  const txt = [
    mkLine("git", 400),
    "this is not json {{{",
    "",
    mkLine("git", 500),
    '{"oops":"no-base","observed_tokens":100}', // missing base
    '{"base":"npm"}',                            // missing observed_tokens
    '{"base":"npm","observed_tokens":"not-a-number"}', // non-finite
  ].join("\n");
  const { byBase } = parseAdoptionLedger(txt);
  assert.equal(byBase.get("git").length, 2);
  assert.ok(!byBase.has("npm"), "npm should be filtered — no valid samples");
});

test("parseAdoptionLedger — handles CRLF line endings", () => {
  const txt = `${mkLine("git", 400)}\r\n${mkLine("git", 500)}\r\n`;
  const { byBase } = parseAdoptionLedger(txt);
  assert.equal(byBase.get("git").length, 2);
});

// ---------------------------------------------------------------- computeP50Fraction

test("computeP50Fraction — known odd-length sample set", () => {
  // observed: [200, 400, 600] / 1000 = [0.2, 0.4, 0.6]; p50 = 0.4
  const samples = [200, 400, 600].map((o) => ({ observed_tokens: o }));
  assert.equal(computeP50Fraction(samples), 0.4);
});

test("computeP50Fraction — even-length uses lower-mid (deterministic)", () => {
  // observed: [100, 200, 300, 400] / 1000 = [0.1, 0.2, 0.3, 0.4]
  // lower-mid of 4 elems → index Math.floor((4-1)/2) = 1 → 0.2
  const samples = [100, 200, 300, 400].map((o) => ({ observed_tokens: o }));
  assert.equal(computeP50Fraction(samples), 0.2);
});

test("computeP50Fraction — empty returns NaN", () => {
  assert.ok(Number.isNaN(computeP50Fraction([])));
  assert.ok(Number.isNaN(computeP50Fraction(null)));
  assert.ok(Number.isNaN(computeP50Fraction(undefined)));
});

test("computeP50Fraction — filters non-finite samples", () => {
  const samples = [
    { observed_tokens: 500 },
    { observed_tokens: NaN },
    { observed_tokens: "junk" },
    { observed_tokens: -1 },         // negative filtered
    { observed_tokens: 700 },
  ];
  // valid → [500, 700] / 1000 = [0.5, 0.7]; lower-mid → 0.5
  assert.equal(computeP50Fraction(samples), 0.5);
});

// ---------------------------------------------------------------- tuneFractions

test("tuneFractions — blends correctly: current=0.7 + p50=0.5 + w=0.3 → 0.64", () => {
  // 5 samples of 500 observed_tokens → p50 = 0.5
  const ledger = Array.from({ length: 5 }, () => mkLine("git", 500)).join("\n");
  const cur = { git: 0.70 };
  const out = tuneFractions(cur, ledger, { minSamples: 5, blendWeight: 0.3 });
  // 0.7 * 0.7 + 0.5 * 0.3 = 0.49 + 0.15 = 0.64
  assert.ok(
    Math.abs(out.git - 0.64) < 1e-9,
    `expected ~0.64 got ${out.git}`,
  );
});

test("tuneFractions — preserves bases with <minSamples", () => {
  // Only 3 samples — below minSamples=5
  const ledger = Array.from({ length: 3 }, () => mkLine("git", 100)).join("\n");
  const cur = { git: 0.70, npm: 0.85 };
  const out = tuneFractions(cur, ledger, { minSamples: 5, blendWeight: 0.3 });
  assert.equal(out.git, 0.70, "git below minSamples — unchanged");
  assert.equal(out.npm, 0.85, "npm not in ledger — unchanged");
});

test("tuneFractions — empty ledger returns input table unchanged (copy)", () => {
  const cur = { git: 0.70, npm: 0.85, vitest: 0.95 };
  const out = tuneFractions(cur, "", {});
  assert.deepEqual(out, cur);
  // and it is a copy, not the same reference (pure-fn discipline)
  assert.notEqual(out, cur);
});

test("tuneFractions — bad JSON lines do not poison the result", () => {
  // 5 valid + 2 garbage → still hits minSamples
  const lines = [
    "not json",
    mkLine("git", 600),
    "{}",
    mkLine("git", 600),
    mkLine("git", 600),
    mkLine("git", 600),
    mkLine("git", 600),
  ];
  const out = tuneFractions({ git: 0.70 }, lines.join("\n"), {
    minSamples: 5,
    blendWeight: 0.5,
  });
  // p50 = 0.6, blend = 0.7*0.5 + 0.6*0.5 = 0.65
  assert.ok(Math.abs(out.git - 0.65) < 1e-9, `expected 0.65 got ${out.git}`);
});

test("tuneFractions — bases in ledger but NOT in table are ignored", () => {
  // 5 samples for an unknown base 'cargo' — should not appear in output
  const ledger = Array.from({ length: 5 }, () => mkLine("cargo", 100)).join("\n");
  const out = tuneFractions({ git: 0.70 }, ledger, { minSamples: 5, blendWeight: 0.3 });
  assert.ok(!("cargo" in out), "unknown base must not be added");
  assert.equal(out.git, 0.70);
});

test("tuneFractions — output clamped to [0.05, 0.99]", () => {
  // 5 samples of 5000 observed tokens → p50 = 5.0 (extreme)
  // blend with w=1.0 → out = 5.0, must clamp to 0.99
  const ledger = Array.from({ length: 5 }, () => mkLine("git", 5000)).join("\n");
  const out = tuneFractions({ git: 0.70 }, ledger, { minSamples: 5, blendWeight: 1.0 });
  assert.equal(out.git, 0.99);

  // 5 samples of 0 observed tokens → p50 = 0.0
  // blend with w=1.0 → out = 0.0, must clamp to 0.05
  const ledger2 = Array.from({ length: 5 }, () => mkLine("npm", 0)).join("\n");
  const out2 = tuneFractions({ npm: 0.85 }, ledger2, { minSamples: 5, blendWeight: 1.0 });
  assert.equal(out2.npm, 0.05);
});

test("tuneFractions — blendWeight clamped to [0, 1]", () => {
  const ledger = Array.from({ length: 5 }, () => mkLine("git", 500)).join("\n");
  // blendWeight = -1 → clamped to 0 → no change
  const noTrust = tuneFractions({ git: 0.70 }, ledger, { minSamples: 5, blendWeight: -1 });
  assert.equal(noTrust.git, 0.70);
  // blendWeight = 99 → clamped to 1 → full empirical
  const fullTrust = tuneFractions({ git: 0.70 }, ledger, { minSamples: 5, blendWeight: 99 });
  assert.ok(Math.abs(fullTrust.git - 0.5) < 1e-9, `expected 0.5 got ${fullTrust.git}`);
});

test("tuneFractions — defaults (minSamples=5, blendWeight=0.3)", () => {
  // 5 samples → just clears default minSamples
  const ledger = Array.from({ length: 5 }, () => mkLine("git", 500)).join("\n");
  const out = tuneFractions({ git: 0.70 }, ledger);
  // 0.7*0.7 + 0.5*0.3 = 0.64
  assert.ok(Math.abs(out.git - 0.64) < 1e-9);

  // 4 samples → fails default minSamples → no change
  const ledger2 = Array.from({ length: 4 }, () => mkLine("git", 500)).join("\n");
  const out2 = tuneFractions({ git: 0.70 }, ledger2);
  assert.equal(out2.git, 0.70);
});

test("tuneFractions — malformed inputs degrade gracefully", () => {
  assert.deepEqual(tuneFractions(null, ""), {});
  assert.deepEqual(tuneFractions(undefined, ""), {});
  assert.deepEqual(tuneFractions({ git: 0.70 }, null), { git: 0.70 });
  assert.deepEqual(tuneFractions({ git: 0.70 }, 42), { git: 0.70 });
});

test("NOMINAL_VERBOSE_TOKENS — matches the hook's heuristic baseline", () => {
  // If this changes, the hook's est_tokens = NOMINAL * fraction must too.
  assert.equal(NOMINAL_VERBOSE_TOKENS, 1000);
});
