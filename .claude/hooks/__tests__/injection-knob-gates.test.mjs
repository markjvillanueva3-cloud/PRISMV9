// TOKEN-EFFICIENCY-INJECT/U-KNOB-CLOSE (2026-06-10, slot:bravo)
// Proves the 3 disable/silence knobs added to the previously-knobless context
// injectors actually silence the hook. Closes the loop opened by
// U-INJECTION-SURFACE-CENSUS (census found these 3; here we verify the fix).
//
// Subprocess tests (run the real hook); hermetic where a hook has side effects
// (auto-consensus negative uses a temp queue; chat-state-isolator dir is cleaned).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HOOKS = dirname(fileURLToPath(import.meta.url)) + "/..";
const run = (rel, stdin, env) => {
  const r = spawnSync(process.execPath, [join(HOOKS, rel)], {
    input: stdin, env: { ...process.env, ...env }, encoding: "utf8",
  });
  return JSON.parse(r.stdout);
};

// --- auto-consensus-userprompt: PRISM_AUTO_CONSENSUS_DISABLE ---

test("auto-consensus: DISABLE=1 emits empty additionalContext (silenced)", () => {
  const out = run("auto-consensus-userprompt.mjs",
    '{"prompt":"build a new engine to implement consensus review now"}',
    { PRISM_AUTO_CONSENSUS_DISABLE: "1" });
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput?.additionalContext, "", "disabled -> no context");
});

test("auto-consensus: WITHOUT the knob, a dev-intent prompt DOES emit (knob is load-bearing, R9)", () => {
  const dir = mkdtempSync(join(tmpdir(), "knob-"));
  try {
    const out = run("auto-consensus-userprompt.mjs",
      '{"prompt":"build a new engine to implement consensus review now"}',
      { PRISM_AUTO_CONSENSUS_DISABLE: "", PRISM_CONSENSUS_QUEUE: join(dir, "q.jsonl") });
    // dev-intent + cache-miss -> a non-empty "Consensus queued" notice
    assert.ok((out.hookSpecificOutput?.additionalContext || "").length > 0,
      "without the knob the hook must still emit -> proves the knob is what silences");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- session-reorient-inject: PRISM_SESSION_REORIENT_DISABLE ---

test("session-reorient: DISABLE=1 returns bare {continue:true} (silenced before stdin/state read)", () => {
  const out = run("session-reorient-inject.mjs",
    '{"prompt":"x","session_id":"knobtest-reorient"}',
    { PRISM_SESSION_REORIENT_DISABLE: "1" });
  assert.deepEqual(out, { continue: true });
});

// --- chat-state-isolator: PRISM_CHAT_STATE_ISOLATOR_SILENT (keeps the work) ---

test("chat-state-isolator: SILENT=1 drops the context line but keeps isolation work", () => {
  const sid = "knobtest-isolator-xyz";
  const chatDir = "H:/prism/state/chat-isolated/" + sid;
  try {
    const out = run("chat-state-isolator.mjs",
      `{"session_id":"${sid}"}`,
      { PRISM_CHAT_STATE_ISOLATOR_SILENT: "1" });
    assert.equal(out.continue, true);
    assert.equal(out.hookSpecificOutput, undefined, "silent -> no additionalContext");
    // The load-bearing isolation dir MUST still be created (work preserved).
    assert.equal(existsSync(chatDir), true, "isolation dir must still be created when silenced");
  } finally {
    rmSync(chatDir, { recursive: true, force: true });
  }
});
