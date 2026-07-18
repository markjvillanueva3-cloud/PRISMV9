/**
 * U-BRAVO-EMBED-CIRCUIT-THRESHOLD -- tests for the consecutive-failure embed
 * circuit breaker in memory-index-search-lib.mjs.
 *   node --test scripts/lib/memory-embed-circuit.test.mjs
 *
 * Why this exists: the original breaker OPENED on a SINGLE embed failure and,
 * because its state file is one global path shared by all 26 fleet slots, one
 * transient blip darkened dense/semantic recall fleet-wide for 2 minutes
 * (measured 2026-07-02: a warm n=50 recall-eval engaged hybrid on 2 queries then
 * fell to BM25-only for 48 after one early timeout). The fix requires >=N
 * CONSECUTIVE failures within the cooldown window before opening.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  embedCircuitFailureThreshold,
  readEmbedCircuit,
  embedCircuitTripped,
  recordEmbedFailure,
  clearEmbedCircuit,
} from "./memory-index-search-lib.mjs";

const CIRCUIT_PATH = "H:/prism/state/shared/.memory-embed-circuit.json";
const COOLDOWN_MS = 120_000;

// In-memory fs doubles keyed by path (no disk I/O; deterministic).
function mkFs(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    existsImpl: (p) => store.has(p),
    readFileImpl: (p) => { if (!store.has(p)) throw new Error(`ENOENT ${p}`); return store.get(p); },
    writeFileImpl: (p, data) => { store.set(p, data); },
    unlinkImpl: (p) => { store.delete(p); },
  };
}

test("threshold knob: default 3, env override, floors + guards invalid", () => {
  const prev = process.env.PRISM_MEMORY_EMBED_CIRCUIT_THRESHOLD;
  try {
    delete process.env.PRISM_MEMORY_EMBED_CIRCUIT_THRESHOLD;
    assert.equal(embedCircuitFailureThreshold(), 3, "default is 3");
    process.env.PRISM_MEMORY_EMBED_CIRCUIT_THRESHOLD = "1";
    assert.equal(embedCircuitFailureThreshold(), 1, "1 = legacy 1-strike");
    process.env.PRISM_MEMORY_EMBED_CIRCUIT_THRESHOLD = "5.9";
    assert.equal(embedCircuitFailureThreshold(), 5, "floored");
    process.env.PRISM_MEMORY_EMBED_CIRCUIT_THRESHOLD = "0"; // < 1 -> default
    assert.equal(embedCircuitFailureThreshold(), 3, "sub-1 rejected");
    process.env.PRISM_MEMORY_EMBED_CIRCUIT_THRESHOLD = "nonsense";
    assert.equal(embedCircuitFailureThreshold(), 3, "non-numeric rejected");
  } finally {
    if (prev === undefined) delete process.env.PRISM_MEMORY_EMBED_CIRCUIT_THRESHOLD;
    else process.env.PRISM_MEMORY_EMBED_CIRCUIT_THRESHOLD = prev;
  }
});

test("readEmbedCircuit: absent -> pristine; legacy shape -> one failure; full parsed; corrupt -> pristine", () => {
  const absent = mkFs();
  assert.deepEqual(readEmbedCircuit(absent.readFileImpl, absent.existsImpl),
    { consecutiveFailures: 0, lastFailureMs: 0 });

  // legacy pre-threshold file carried only {lastFailureMs}
  const legacy = mkFs({ [CIRCUIT_PATH]: JSON.stringify({ lastFailureMs: 5000 }) });
  assert.deepEqual(readEmbedCircuit(legacy.readFileImpl, legacy.existsImpl),
    { consecutiveFailures: 1, lastFailureMs: 5000 });

  const full = mkFs({ [CIRCUIT_PATH]: JSON.stringify({ consecutiveFailures: 2, lastFailureMs: 9000 }) });
  assert.deepEqual(readEmbedCircuit(full.readFileImpl, full.existsImpl),
    { consecutiveFailures: 2, lastFailureMs: 9000 });

  // adversarial: unparseable content must never throw, must degrade to pristine
  const corrupt = mkFs({ [CIRCUIT_PATH]: "}{ not json" });
  assert.deepEqual(readEmbedCircuit(corrupt.readFileImpl, corrupt.existsImpl),
    { consecutiveFailures: 0, lastFailureMs: 0 });
});

test("embedCircuitTripped: below threshold CLOSED; at threshold + in-window OPEN; window-expired CLOSED", () => {
  // 1 consecutive failure -> below default threshold 3 -> a single blip stays CLOSED
  const one = mkFs({ [CIRCUIT_PATH]: JSON.stringify({ consecutiveFailures: 1, lastFailureMs: 1000 }) });
  assert.equal(embedCircuitTripped(one.readFileImpl, one.existsImpl, 1500), false,
    "one blip does NOT open the breaker");

  // 3 consecutive, last one fresh -> OPEN
  const three = mkFs({ [CIRCUIT_PATH]: JSON.stringify({ consecutiveFailures: 3, lastFailureMs: 1000 }) });
  assert.equal(embedCircuitTripped(three.readFileImpl, three.existsImpl, 1500), true,
    "3-in-a-row within window opens the breaker");

  // 3 consecutive but last failure older than the cooldown -> window expired -> CLOSED
  assert.equal(embedCircuitTripped(three.readFileImpl, three.existsImpl, 1000 + COOLDOWN_MS + 1), false,
    "expired window closes even at/over threshold");

  // explicit threshold override (independent of env)
  const two = mkFs({ [CIRCUIT_PATH]: JSON.stringify({ consecutiveFailures: 2, lastFailureMs: 1000 }) });
  assert.equal(embedCircuitTripped(two.readFileImpl, two.existsImpl, 1500, 2), true, "threshold 2 opens at 2");
  assert.equal(embedCircuitTripped(two.readFileImpl, two.existsImpl, 1500, 3), false, "threshold 3 stays closed at 2");
});

test("recordEmbedFailure: first=1, consecutive-in-window increments, gap > cooldown resets to 1", () => {
  const fs = mkFs();
  recordEmbedFailure(fs.readFileImpl, fs.writeFileImpl, fs.existsImpl, 1000);
  assert.deepEqual(JSON.parse(fs.store.get(CIRCUIT_PATH)), { consecutiveFailures: 1, lastFailureMs: 1000 });

  recordEmbedFailure(fs.readFileImpl, fs.writeFileImpl, fs.existsImpl, 2000);
  assert.deepEqual(JSON.parse(fs.store.get(CIRCUIT_PATH)), { consecutiveFailures: 2, lastFailureMs: 2000 });

  recordEmbedFailure(fs.readFileImpl, fs.writeFileImpl, fs.existsImpl, 3000);
  assert.equal(JSON.parse(fs.store.get(CIRCUIT_PATH)).consecutiveFailures, 3);

  // a failure after a gap LONGER than the cooldown means the streak had lapsed -> reset to 1
  recordEmbedFailure(fs.readFileImpl, fs.writeFileImpl, fs.existsImpl, 3000 + COOLDOWN_MS + 1);
  assert.deepEqual(JSON.parse(fs.store.get(CIRCUIT_PATH)),
    { consecutiveFailures: 1, lastFailureMs: 3000 + COOLDOWN_MS + 1 });
});

test("clearEmbedCircuit: removes when present, idempotent when absent", () => {
  const fs = mkFs({ [CIRCUIT_PATH]: JSON.stringify({ consecutiveFailures: 3, lastFailureMs: 1000 }) });
  clearEmbedCircuit(fs.existsImpl, fs.unlinkImpl);
  assert.equal(fs.store.has(CIRCUIT_PATH), false, "cleared");
  clearEmbedCircuit(fs.existsImpl, fs.unlinkImpl);
  assert.equal(fs.store.has(CIRCUIT_PATH), false, "no-op second time");
});

test("end-to-end streak: 1-2 blips stay CLOSED, 3rd OPENS, success CLEARS (the regression this fixes)", () => {
  const fs = mkFs();
  const isOpen = (now) => embedCircuitTripped(fs.readFileImpl, fs.existsImpl, now);

  recordEmbedFailure(fs.readFileImpl, fs.writeFileImpl, fs.existsImpl, 1000);
  assert.equal(isOpen(1100), false, "one transient blip must NOT darken recall (the whole point)");

  recordEmbedFailure(fs.readFileImpl, fs.writeFileImpl, fs.existsImpl, 1100);
  assert.equal(isOpen(1200), false, "two blips still below threshold");

  recordEmbedFailure(fs.readFileImpl, fs.writeFileImpl, fs.existsImpl, 1200);
  assert.equal(isOpen(1300), true, "3 consecutive failures OPEN the breaker to protect the 5s hook budget");

  // a subsequent successful embed clears the breaker
  clearEmbedCircuit(fs.existsImpl, fs.unlinkImpl);
  assert.equal(isOpen(1400), false, "success closes the breaker");
});
