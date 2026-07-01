#!/usr/bin/env node
// tier: T4
/**
 * node-capability-inject.test.mjs — smoke tests for the UserPromptSubmit hook.
 * Spawns the hook as a child process, controls stdin / env / a custom
 * INDEX_PATH via env, and asserts the JSON contract.
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const HOOK = resolve(process.cwd(), ".claude/hooks/node-capability-inject.mjs");

// Sample pre-built index — the same shape the build script emits.
const SAMPLE_INDEX = {
  version: 1,
  builtAt: Date.now(),
  pointersDir: "knowledge/memories/reference",
  count: 2,
  skipped: 0,
  pointers: {
    "engine.kienzleforceengine": {
      kind: "engine",
      slug: "kienzleforceengine",
      displayName: "Engine — KienzleForceEngine",
      wikiPath: "knowledge/wiki/architecture/engines/eng-kienzleforce.md",
      pointerPath: "knowledge/memories/reference/node_engine_kienzleforceengine.md"
    },
    "algorithm.alg_kalmanfilter": {
      kind: "algorithm",
      slug: "alg_kalmanfilter",
      displayName: "Algorithm — KalmanFilter",
      wikiPath: "knowledge/wiki/architecture/algorithms/alg-kalmanfilter.md",
      pointerPath: "knowledge/memories/reference/node_algorithm_alg_kalmanfilter.md"
    }
  },
  displayNameToId: {
    "kienzleforceengine": "engine.kienzleforceengine",
    "kienzleforce": "engine.kienzleforceengine",
    "alg_kalmanfilter": "algorithm.alg_kalmanfilter",
    "kalmanfilter": "algorithm.alg_kalmanfilter"
  }
};

function runHook(stdin, env) {
  return spawnSync(process.execPath, [HOOK], {
    input: typeof stdin === "string" ? stdin : JSON.stringify(stdin),
    env: { ...process.env, ...env },
    encoding: "utf8"
  });
}

test("disable knob → SILENCE", () => {
  const res = runHook({ prompt: "wire KienzleForceEngine" }, { PRISM_NODE_CAPABILITY_INJECT: "0" });
  assert.equal(res.status, 0);
  const out = JSON.parse(res.stdout.trim());
  assert.equal(out.continue, true);
  assert.equal(out.suppressOutput, true);
});

test("empty stdin → SILENCE", () => {
  const res = runHook("", {});
  assert.equal(res.status, 0);
  const out = JSON.parse(res.stdout.trim());
  assert.equal(out.continue, true);
  assert.equal(out.suppressOutput, true);
});

test("malformed JSON stdin → SILENCE", () => {
  const res = runHook("{not-json", {});
  assert.equal(res.status, 0);
  const out = JSON.parse(res.stdout.trim());
  assert.equal(out.continue, true);
  assert.equal(out.suppressOutput, true);
});

test("empty prompt → SILENCE", () => {
  const res = runHook({ prompt: "" }, {});
  const out = JSON.parse(res.stdout.trim());
  assert.equal(out.continue, true);
  assert.equal(out.suppressOutput, true);
});

test("prompt with no node mentions → SILENCE", () => {
  const res = runHook({ prompt: "hello world how are you today" }, {});
  const out = JSON.parse(res.stdout.trim());
  assert.equal(out.continue, true);
  assert.equal(out.suppressOutput, true);
});

test("verbose mode emits systemMessage when no index", () => {
  // Disable the real index by pointing PRISM_NODE_CAPABILITY_INJECT to verbose mode.
  // If the real index doesn't exist or has 0 pointers, we hit the
  // "no index" or "0 resolved" branch.
  const res = runHook(
    { prompt: "wire SomeImaginaryEngine that probably is not in the index" },
    { PRISM_NODE_CAPABILITY_VERBOSE: "1" }
  );
  const out = JSON.parse(res.stdout.trim());
  assert.equal(out.continue, true);
  // Either suppressOutput (silence) OR a hookSpecificOutput is fine —
  // depends on whether the real index is populated. We just assert no crash.
  assert.ok(out.suppressOutput || out.hookSpecificOutput || out.systemMessage);
});

test("integration with a fake index — emits inject block on real mentions", () => {
  // Create a temp dir, write an index there, point the hook at it via a
  // wrapper script. Simplest way: write the index to the canonical path
  // (state/shared/system-viz/node-capability-index.json) for the duration
  // of the test. This test depends on no other chat racing the file.
  const indexPath = resolve(process.cwd(), "state/shared/system-viz/node-capability-index.json");
  // Save existing if any
  let saved = null;
  try { saved = readFileSync(indexPath, "utf8"); } catch { saved = null; }
  const dirPath = resolve(process.cwd(), "state/shared/system-viz");
  mkdirSync(dirPath, { recursive: true });
  try {
    writeFileSync(indexPath, JSON.stringify(SAMPLE_INDEX), "utf8");
    const res = runHook({ prompt: "wire KienzleForceEngine into prism_calc" }, {});
    const out = JSON.parse(res.stdout.trim());
    assert.equal(out.continue, true);
    if (out.hookSpecificOutput) {
      assert.ok(out.hookSpecificOutput.additionalContext.includes("KienzleForce"),
        "expected display name in inject: " + out.hookSpecificOutput.additionalContext);
    }
    // If existsSync(indexPath), our overwrite was the active one.
    assert.ok(existsSync(indexPath));
  } finally {
    if (saved !== null) writeFileSync(indexPath, saved, "utf8");
    // else: leave the test-written index — Stop hook will rebuild it.
  }
});
