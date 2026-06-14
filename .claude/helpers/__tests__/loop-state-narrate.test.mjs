// .claude/helpers/__tests__/loop-state-narrate.test.mjs
// U-LOOP-NARRATE-WIRE (2026-06-10, slot:alpha): the additive `narrate` subcommand must
// (1) store the model narration onto the latest iteration + a session lastNarration,
// (2) flag verdictMismatch when the tick's recorded status disagrees with the
// code-decided pass (the honesty win), (3) be FAIL-SOFT (a narrator throw never breaks
// the loop record). Hermetic: injected narrator (no network) + a temp state file (R9).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

import { computeVerdictMismatch, cmdNarrate } from "../loop-state.mjs";

const STATE_DIR = path.join("H:", "prism", "state", "shared", "loop-state");
function statePath(sid) {
  const safe = String(sid || "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global";
  return path.join(STATE_DIR, `loop-${safe}.json`);
}
function seed(sid, state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(statePath(sid), JSON.stringify(state, null, 2) + "\n");
}
function readState(sid) { return JSON.parse(fs.readFileSync(statePath(sid), "utf-8")); }
function cleanup(sid) { try { fs.unlinkSync(statePath(sid)); } catch { /* ignore */ } }

// cmdNarrate writes a JSON line to stdout; suppress it so node:test TAP stays clean.
async function quiet(fn) {
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = () => true;
  try { return await fn(); } finally { process.stdout.write = orig; }
}

// ---- computeVerdictMismatch (pure honesty cross-check) ----
test("computeVerdictMismatch: recorded ok vs code-pass agree -> no mismatch", () => {
  assert.equal(computeVerdictMismatch("ok", true), false);
  assert.equal(computeVerdictMismatch("fail", false), false);
});

test("computeVerdictMismatch: recorded status DISAGREES with code-pass -> mismatch", () => {
  assert.equal(computeVerdictMismatch("ok", false), true);   // tick said ok, exit code said fail
  assert.equal(computeVerdictMismatch("fail", true), true);  // tick said fail, exit code said pass
});

test("computeVerdictMismatch: unknown side never claims a mismatch (fail-safe)", () => {
  assert.equal(computeVerdictMismatch("ok", null), false);
  assert.equal(computeVerdictMismatch(null, true), false);
  assert.equal(computeVerdictMismatch(undefined, undefined), false);
});

// ---- cmdNarrate (state read/write + injected narrator) ----
test("cmdNarrate: stores narration on the latest iteration + session lastNarration", async () => {
  const sid = `loop-narrate-test-store-${process.pid}`;
  seed(sid, { sessionId: sid, iterations: [{ iter: 1, status: "ok" }], status: "running" });
  try {
    await quiet(() => cmdNarrate({ session: sid, "test-exit": "0", diff: "--- a/x\n+++ b/x" },
      { narrate: async () => ({ summary: "added a helper; tests passed", passed: true, source: "ollama" }) }));
    const s = readState(sid);
    assert.equal(s.lastNarration.narration, "added a helper; tests passed");
    assert.equal(s.lastNarration.passed, true);
    assert.equal(s.lastNarration.source, "ollama");
    assert.equal(s.lastNarration.verdictMismatch, false);
    assert.equal(s.iterations[0].narration, "added a helper; tests passed");
  } finally { cleanup(sid); }
});

test("cmdNarrate: verdictMismatch flagged when recorded status disagrees with code-pass", async () => {
  const sid = `loop-narrate-test-mismatch-${process.pid}`;
  // tick recorded "fail" but the narrator's exit-code-derived pass is true -> mismatch
  seed(sid, { sessionId: sid, iterations: [{ iter: 1, status: "fail" }], status: "running" });
  try {
    await quiet(() => cmdNarrate({ session: sid, "test-exit": "0" },
      { narrate: async () => ({ summary: "x narration here", passed: true, source: "ollama" }) }));
    const s = readState(sid);
    assert.equal(s.lastNarration.verdictMismatch, true);
    assert.equal(s.iterations[0].verdictMismatch, true);
  } finally { cleanup(sid); }
});

test("cmdNarrate: FAIL-SOFT -- a narrator throw never breaks the loop record", async () => {
  const sid = `loop-narrate-test-failsoft-${process.pid}`;
  seed(sid, { sessionId: sid, iterations: [{ iter: 1, status: "ok" }], status: "running" });
  try {
    await quiet(() => cmdNarrate({ session: sid, "test-exit": "0" },
      { narrate: async () => { throw new Error("ollama down"); } }));
    const s = readState(sid);
    assert.equal(s.lastNarration.source, "error");
    assert.equal(s.lastNarration.narration, null);
    // the iteration record survives (loop state never corrupted by a narration failure)
    assert.equal(s.iterations[0].iter, 1);
  } finally { cleanup(sid); }
});

test("cmdNarrate: no prior loop state -> ok:false, no file created, never throws", async () => {
  const sid = `loop-narrate-test-nostate-${process.pid}`;
  cleanup(sid); // ensure absent
  await quiet(() => cmdNarrate({ session: sid }, { narrate: async () => ({ summary: "x", passed: true }) }));
  assert.equal(fs.existsSync(statePath(sid)), false, "must not create state when none exists");
});
