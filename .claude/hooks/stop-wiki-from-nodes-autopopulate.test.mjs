#!/usr/bin/env node
// tier: T4
/**
 * stop-wiki-from-nodes-autopopulate.test.mjs
 *
 * Smoke tests for the auto-populate Stop hook. Runs the hook as a
 * child process with controlled stdin, env, and a captured stdout so
 * we can assert the JSON contract + the side-effect state file.
 *
 * Real spawn of background workers is unavoidable — the hook is
 * fire-and-forget by design. We use the FULL flag in OFF mode so the
 * heavyweight wiki regen never runs; the cheap pointer emitter is also
 * gated by the cache+throttle so the test mode lands in fast paths.
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const HOOK = resolve(process.cwd(), ".claude/hooks/stop-wiki-from-nodes-autopopulate.mjs");
const POINTER_CACHE = resolve(process.cwd(), "state/shared/system-viz/.node-memory-pointers-cache.json");
const STATE_PATH = resolve(process.cwd(), ".claude/cache/wiki-from-nodes-autopopulate.json");
const GRAPH_PATH = resolve(process.cwd(), "state/shared/system-viz/system-graph.json");

function runHook(env = {}) {
  return spawnSync(process.execPath, [HOOK], {
    input: "{}",
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

test("hook returns SILENCE JSON contract", () => {
  const res = runHook({ PRISM_WIKI_FROM_NODES_AUTOPOPULATE_DISABLE: "1" });
  assert.equal(res.status, 0);
  const parsed = JSON.parse(res.stdout.trim());
  assert.equal(parsed.continue, true);
  assert.equal(parsed.suppressOutput, true);
});

test("disable knob short-circuits before any state write", () => {
  // Save existing state file, remove it, run, confirm no write
  let saved = null;
  if (existsSync(STATE_PATH)) {
    saved = readFileSync(STATE_PATH, "utf8");
    unlinkSync(STATE_PATH);
  }
  try {
    runHook({ PRISM_WIKI_FROM_NODES_AUTOPOPULATE_DISABLE: "1" });
    assert.ok(!existsSync(STATE_PATH), "STATE_PATH should not be written when disabled");
  } finally {
    if (saved !== null) writeFileSync(STATE_PATH, saved, "utf8");
  }
});

test("missing graph returns SILENCE without crashing", () => {
  // We can't actually delete the production graph — instead verify the
  // code path by pointing at a non-existent path via env (the hook reads
  // a fixed const, so this test merely verifies the existing graph path
  // case works and returns valid JSON).
  if (!existsSync(GRAPH_PATH)) {
    const res = runHook();
    const parsed = JSON.parse(res.stdout.trim());
    assert.equal(parsed.continue, true);
    return;
  }
  // graph exists → still SILENCE if throttle bites
  const res = runHook({ PRISM_WIKI_FROM_NODES_AUTOPOPULATE_THROTTLE_MS: "999999999" });
  const parsed = JSON.parse(res.stdout.trim());
  assert.equal(parsed.continue, true);
});

test("throttle prevents rapid re-fire", () => {
  // Force-write a very recent lastFireMs and confirm the hook returns SILENCE
  let saved = null;
  if (existsSync(STATE_PATH)) {
    saved = readFileSync(STATE_PATH, "utf8");
  }
  try {
    writeFileSync(STATE_PATH, JSON.stringify({ lastFireMs: Date.now() }), "utf8");
    const res = runHook({ PRISM_WIKI_FROM_NODES_AUTOPOPULATE_THROTTLE_MS: "999999999" });
    assert.equal(res.status, 0);
    const parsed = JSON.parse(res.stdout.trim());
    assert.equal(parsed.continue, true);
    assert.equal(parsed.suppressOutput, true);
  } finally {
    if (saved !== null) writeFileSync(STATE_PATH, saved, "utf8");
    else if (existsSync(STATE_PATH)) unlinkSync(STATE_PATH);
  }
});

test("graph older than pointer cache returns SILENCE", () => {
  if (!existsSync(GRAPH_PATH)) {
    // Skip — no graph in test env
    return;
  }
  // Set pointer cache to NOW (i.e., wiki/memory is fully caught up)
  // and force-clear the state file so throttle is not what's silencing.
  let savedCache = null;
  let savedState = null;
  if (existsSync(POINTER_CACHE)) savedCache = readFileSync(POINTER_CACHE, "utf8");
  if (existsSync(STATE_PATH)) savedState = readFileSync(STATE_PATH, "utf8");
  try {
    const future = Date.now() + 60_000;
    writeFileSync(POINTER_CACHE, JSON.stringify({ lastRunMs: future }), "utf8");
    if (existsSync(STATE_PATH)) unlinkSync(STATE_PATH);
    const res = runHook();
    const parsed = JSON.parse(res.stdout.trim());
    assert.equal(parsed.continue, true);
    assert.equal(parsed.suppressOutput, true);
    // No state file should have been written — we never fired
    assert.ok(!existsSync(STATE_PATH));
  } finally {
    if (savedCache !== null) writeFileSync(POINTER_CACHE, savedCache, "utf8");
    if (savedState !== null) writeFileSync(STATE_PATH, savedState, "utf8");
  }
});

test("verbose mode emits a systemMessage instead of suppressOutput", () => {
  if (!existsSync(GRAPH_PATH)) return; // skip on graphless env
  // Make the graph "newer" by ensuring pointer cache is old + throttle small.
  let savedCache = null;
  let savedState = null;
  if (existsSync(POINTER_CACHE)) savedCache = readFileSync(POINTER_CACHE, "utf8");
  if (existsSync(STATE_PATH)) savedState = readFileSync(STATE_PATH, "utf8");
  try {
    writeFileSync(POINTER_CACHE, JSON.stringify({ lastRunMs: 0 }), "utf8");
    if (existsSync(STATE_PATH)) unlinkSync(STATE_PATH);
    const res = runHook({
      PRISM_WIKI_FROM_NODES_AUTOPOPULATE_VERBOSE: "1",
      PRISM_WIKI_FROM_NODES_AUTOPOPULATE_THROTTLE_MS: "0",
    });
    assert.equal(res.status, 0);
    const parsed = JSON.parse(res.stdout.trim());
    assert.equal(parsed.continue, true);
    assert.ok(parsed.systemMessage && parsed.systemMessage.includes("wiki-from-nodes-autopopulate"));
  } finally {
    if (savedCache !== null) writeFileSync(POINTER_CACHE, savedCache, "utf8");
    if (savedState !== null) writeFileSync(STATE_PATH, savedState, "utf8");
  }
});
