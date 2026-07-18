// scripts/ollama-stress-test-nosignal.test.mjs
//
// Proves the FALSE-0 guard in runTierSweep/runTaskOnModel: a case where the model produced NO
// usable output (call failed / timeout / empty text) is recorded as `noSignal`, DISTINCT from an
// answered-but-wrong case -- so a big model that cold-load-times-out under contention is no longer
// indistinguishable from a measured-incapable one. passRate stays byte-identical (back-compat).
// Hermetic: injected callFn, no network. (reference_ollama_generative_stratified_harness_2026_06_25)

import test from "node:test";
import assert from "node:assert/strict";
import { runTierSweep } from "./ollama-stress-test.mjs";

// A task with 3 cases keyed by a distinguishing prompt token; verify passes only on "GOOD".
const task = {
  id: "t",
  category: "c",
  cases: [{ k: "a" }, { k: "b" }, { k: "c" }],
  prompt: (c) => c.k,
  verify: (out) => out.trim() === "GOOD",
};
const pm0 = async (res) => res.perTask[0].perModel[0];

test("mixed: 1 right + 1 wrong + 1 no-signal -> passRate=1/3 (back-compat), answeredRate=1/2, noSignal=1", async () => {
  const callFn = async (_model, prompt) => {
    if (prompt === "a") return { ok: true, text: "GOOD", tokPerSec: 10, totalMs: 100 };
    if (prompt === "b") return { ok: true, text: "WRONG", tokPerSec: 10, totalMs: 100 };
    return { ok: false, reason: "timeout" }; // c -> no-signal
  };
  const m = await pm0(await runTierSweep({ models: ["m"], tasks: [task], callFn }));
  assert.equal(m.passed, 1);
  assert.equal(m.total, 3);
  assert.ok(Math.abs(m.passRate - 1 / 3) < 1e-9, "passRate is pass/ALL (back-compat)");
  assert.equal(m.noSignal, 1);
  assert.equal(m.answered, 2);
  assert.ok(Math.abs(m.answeredRate - 0.5) < 1e-9, "answeredRate excludes no-signal cases");
});

test("FALSE-0: every call times out -> passRate=0 BUT noSignal=total (absent, NOT incapable)", async () => {
  const callFn = async () => ({ ok: false, reason: "timeout" });
  const m = await pm0(await runTierSweep({ models: ["m"], tasks: [task], callFn }));
  assert.equal(m.passRate, 0);
  assert.equal(m.noSignal, 3);
  assert.equal(m.answered, 0);
  assert.equal(m.answeredRate, 0); // answered=0 -> 0, not NaN
  // The discriminator: noSignal === total means "never answered", NOT "answered all wrong".
  assert.equal(m.noSignal, m.total);
});

test("ok-but-EMPTY text counts as no-signal, not a measured fail (passRate unchanged)", async () => {
  const callFn = async () => ({ ok: true, text: "   ", tokPerSec: 5, totalMs: 50 });
  const m = await pm0(await runTierSweep({ models: ["m"], tasks: [task], callFn }));
  assert.equal(m.passRate, 0); // blank was never a pass (back-compat)
  assert.equal(m.noSignal, 3); // blank reclassified as no-signal
  assert.equal(m.answered, 0);
});

test("REAL-0: model answers every case but all wrong -> passRate=0 AND noSignal=0 (measured incapable)", async () => {
  const callFn = async () => ({ ok: true, text: "WRONG", tokPerSec: 8, totalMs: 80 });
  const m = await pm0(await runTierSweep({ models: ["m"], tasks: [task], callFn }));
  assert.equal(m.passRate, 0);
  assert.equal(m.noSignal, 0); // it ANSWERED -- this is a true 0, NOT a false-0
  assert.equal(m.answered, 3);
  assert.equal(m.answeredRate, 0);
});

test("all-right -> passRate=1, answeredRate=1, noSignal=0 (sanity / no regression)", async () => {
  const callFn = async () => ({ ok: true, text: "GOOD", tokPerSec: 12, totalMs: 60 });
  const m = await pm0(await runTierSweep({ models: ["m"], tasks: [task], callFn }));
  assert.equal(m.passRate, 1);
  assert.equal(m.answeredRate, 1);
  assert.equal(m.noSignal, 0);
});

test("GRADER ABSTAIN: an async verify returning null counts as noSignal, NOT a subject fail (judge false-0 guard)", async () => {
  // The SUBJECT answers every case (non-empty -> not subject-noSignal); the async GRADER decides:
  // "good"->true (pass), "wrong"->false (measured fail), "abstain"->null (could not grade).
  const judgedTask = {
    id: "tj",
    category: "c",
    cases: [{ k: "good" }, { k: "wrong" }, { k: "abstain" }],
    prompt: (c) => c.k,
    verify: async (out) => (out === "good" ? true : out === "wrong" ? false : null),
  };
  const callFn = async (_m, prompt) => ({ ok: true, text: prompt, tokPerSec: 5, totalMs: 50 });
  const m = await pm0(await runTierSweep({ models: ["m"], tasks: [judgedTask], callFn }));
  assert.equal(m.passed, 1); // only "good"
  assert.equal(m.total, 3);
  assert.equal(m.noSignal, 1); // "abstain" -> grader could not grade -> noSignal (NOT charged as a fail)
  assert.equal(m.answered, 2); // good + wrong (graded)
  assert.ok(Math.abs(m.passRate - 1 / 3) < 1e-9); // pass / ALL (back-compat)
  assert.ok(Math.abs(m.answeredRate - 0.5) < 1e-9); // pass / graded -- the honest rate
});
