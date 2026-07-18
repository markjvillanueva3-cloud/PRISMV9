// scripts/octopus-multimodel-wiring.test.mjs
//
// OCTOPUS-HERMES-MULTIMODEL wiring (R15 round-trip) -- the --hermes-models flag must
// thread a list of DISTINCT Grok models all the way to runLive, auto-enable the Grok
// voice, and buildLocalOnlyAskOverrides must surface it in askOverrides ONLY when
// non-empty (default byte-identical). Hermetic: injected runLive, no network.

import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs, runUtilizationTick } from "./octopus-utilization-driver.mjs";
import { buildLocalOnlyAskOverrides } from "./octopus-first-live-record.mjs";

test("parseArgs: --hermes-models parses a comma list into distinct trimmed ids", () => {
  const o = parseArgs(["--hermes-models", "grok-4.3, grok-4.20-0309-reasoning ,grok-build-0.1"]);
  assert.deepEqual(o.hermesGrokModels, ["grok-4.3", "grok-4.20-0309-reasoning", "grok-build-0.1"]);
});

test("parseArgs: absent --hermes-models -> empty list (back-compat)", () => {
  const o = parseArgs(["--count", "1"]);
  assert.deepEqual(o.hermesGrokModels, []);
});

test("runUtilizationTick: hermesGrokModels reach runLive AND auto-enable the Grok voice", async () => {
  const seen = [];
  const fakeRunLive = async (a) => {
    seen.push(a);
    return { ok: true, summary: { ok: true, successCount: 2, voiceCount: 2, verdict: "ok", reason: "ok" } };
  };
  const out = await runUtilizationTick({
    count: 1,
    hermesGrokModels: ["grok-4.3", "grok-4.20-0309-reasoning"],
    runLive: fakeRunLive,
    pool: [{ id: "q0", domain: "token-optimization", prompt: "x" }],
    readLedgerCount: () => 0,
  });
  assert.equal(out.attempted, 1);
  assert.equal(seen.length, 1);
  // The model list threaded through unchanged...
  assert.deepEqual(seen[0].hermesGrokModels, ["grok-4.3", "grok-4.20-0309-reasoning"]);
  // ...and an explicit list AUTO-ENABLES the Grok voice even without --with-hermes-grok.
  assert.equal(seen[0].includeHermesGrok, true);
});

test("runUtilizationTick: no list + no flag -> single-voice path, includeHermesGrok false (back-compat)", async () => {
  const seen = [];
  const fakeRunLive = async (a) => {
    seen.push(a);
    return { ok: true, summary: { ok: true, reason: "ok" } };
  };
  await runUtilizationTick({
    count: 1,
    runLive: fakeRunLive,
    pool: [{ id: "q0", domain: "token-optimization", prompt: "x" }],
    readLedgerCount: () => 0,
  });
  assert.equal(seen[0].includeHermesGrok, false);
  assert.deepEqual(seen[0].hermesGrokModels, []);
});

test("buildLocalOnlyAskOverrides: non-empty hermesGrokModels surfaces in askOverrides", () => {
  const ov = buildLocalOnlyAskOverrides({ includeHermesGrok: true, hermesGrokModels: ["grok-4.3", "grok-build-0.1"] });
  assert.equal(ov.includeGrok, true);
  assert.deepEqual(ov.hermesGrokModels, ["grok-4.3", "grok-build-0.1"]);
});

test("buildLocalOnlyAskOverrides: default omits hermesGrokModels (byte-identical back-compat)", () => {
  const ov = buildLocalOnlyAskOverrides({});
  assert.equal("hermesGrokModels" in ov, false);
  assert.equal(ov.includeGrok, false);
});

test("buildLocalOnlyAskOverrides: all-garbage list is filtered to empty -> key omitted", () => {
  const ov = buildLocalOnlyAskOverrides({ includeHermesGrok: true, hermesGrokModels: ["", "  ", null, 42] });
  assert.equal("hermesGrokModels" in ov, false);
});
