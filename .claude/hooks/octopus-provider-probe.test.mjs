/**
 * octopus-provider-probe.test.mjs
 *
 * U-OCT-PROBE-FULL-FLEET (2026-05-23, slot:mike) — banner-builder behavior
 * coverage. The pre-fix banner only ever reported Codex+Ollama+Claude even
 * when Gemini/Grok were live, systematically undercounting fan-out capacity
 * fleet-wide. These tests pin the new 5-voice behavior + the
 * `probeEnvKey()` helper used to drive it.
 *
 * Run: node --test .claude/hooks/octopus-provider-probe.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBanner, probeEnvKey } from "./octopus-provider-probe.mjs";

// ── probeEnvKey ────────────────────────────────────────────────────────────
test("probeEnvKey: returns true on first non-empty env var", () => {
  process.env.__OCT_TEST_A = "yes";
  delete process.env.__OCT_TEST_B;
  try {
    assert.equal(probeEnvKey("__OCT_TEST_A"), true);
    assert.equal(probeEnvKey("__OCT_TEST_B", "__OCT_TEST_A"), true);
  } finally {
    delete process.env.__OCT_TEST_A;
  }
});

test("probeEnvKey: returns false when none set or all empty", () => {
  delete process.env.__OCT_TEST_X;
  process.env.__OCT_TEST_EMPTY = "   ";
  try {
    assert.equal(probeEnvKey("__OCT_TEST_X"), false);
    assert.equal(probeEnvKey("__OCT_TEST_EMPTY"), false);
  } finally {
    delete process.env.__OCT_TEST_EMPTY;
  }
});

test("probeEnvKey: ignores non-string values defensively", () => {
  // process.env coerces non-strings; this still must not throw.
  const before = process.env.__OCT_TEST_TYPE;
  process.env.__OCT_TEST_TYPE = "";
  try {
    assert.equal(probeEnvKey("__OCT_TEST_TYPE"), false);
  } finally {
    if (before === undefined) delete process.env.__OCT_TEST_TYPE;
    else process.env.__OCT_TEST_TYPE = before;
  }
});

// ── buildBanner — 5-voice fleet view ───────────────────────────────────────
test("buildBanner: FULLY OPERATIONAL when all 5 voices ready", () => {
  const out = buildBanner({
    codex: "authed",
    ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: true,
    geminiKeyPresent: true,
  });
  assert.match(out, /FULLY OPERATIONAL/);
  assert.match(out, /Claude/);
  assert.match(out, /Codex/);
  assert.match(out, /Ollama\(8 models\)/);
  assert.match(out, /Grok/);
  assert.match(out, /Gemini/);
  assert.doesNotMatch(out, /Missing/);
});

test("buildBanner: READY with 3-of-5 (the live state today)", () => {
  // Mirrors the current production probe: Claude + Ollama + Gemini live;
  // Codex unauth + no XAI_API_KEY. This is the case the pre-fix banner
  // misreported as "Consensus partial: Ollama + Claude" hiding Gemini.
  const out = buildBanner({
    codex: "missing",
    ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: false,
    geminiKeyPresent: true,
  });
  assert.match(out, /READY \(3\/5 voices\)/);
  assert.match(out, /Claude/);
  assert.match(out, /Ollama/);
  assert.match(out, /Gemini/);
  assert.match(out, /Missing:.*Codex/);
  assert.match(out, /Missing:.*Grok/);
});

test("buildBanner: READY with 4-of-5", () => {
  const out = buildBanner({
    codex: "authed",
    ollamaUp: true, ollamaModelCount: 4,
    xaiKeyPresent: false,
    geminiKeyPresent: true,
  });
  assert.match(out, /READY \(4\/5 voices\)/);
  assert.match(out, /Missing:.*Grok/);
});

test("buildBanner: partial with 2-of-5 (Claude + Ollama only)", () => {
  const out = buildBanner({
    codex: "missing",
    ollamaUp: true, ollamaModelCount: 2,
    xaiKeyPresent: false,
    geminiKeyPresent: false,
  });
  assert.match(out, /partial \(2\/5\)/);
  assert.match(out, /Missing:.*Codex/);
  assert.match(out, /Missing:.*Grok/);
  assert.match(out, /Missing:.*Gemini/);
});

test("buildBanner: DEGRADED with Claude only", () => {
  const out = buildBanner({
    codex: "missing",
    ollamaUp: false, ollamaModelCount: 0,
    xaiKeyPresent: false,
    geminiKeyPresent: false,
  });
  assert.match(out, /DEGRADED \(1\/5\)/);
  assert.match(out, /Missing:.*Ollama daemon/);
});

test("buildBanner: codex 'ok' status counts as ready (back-compat)", () => {
  const out = buildBanner({
    codex: "ok",
    ollamaUp: true, ollamaModelCount: 1,
    xaiKeyPresent: false,
    geminiKeyPresent: false,
  });
  assert.match(out, /Codex/);
  assert.match(out, /3\/5/);
});

test("buildBanner: ollama model count surfaces verbatim", () => {
  const out = buildBanner({
    codex: "missing",
    ollamaUp: true, ollamaModelCount: 12,
    xaiKeyPresent: false,
    geminiKeyPresent: false,
  });
  assert.match(out, /Ollama\(12 models\)/);
});
