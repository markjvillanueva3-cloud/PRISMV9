// tier: T4
// Tests for .claude/hooks/stop-consensus-drain.mjs
// (INTEL-OLLAMA-OBSIDIAN-MS0/LAYER-3-AUTOFIRE; refactored import-safe + covered 2026-06-10, slot:bravo).
//
// node:test -- hermetic: queueDepth/pickDrainer take explicit paths and run() takes an
// injected spawnImpl, so NO real queue, drainer, or child process is touched. Verifies the
// Stop hook spawns the drainer ONLY when the queue is non-empty AND a drainer exists, and
// never throws (Stop must never block).
//
// Run: node --test H:/prism/.claude/hooks/stop-consensus-drain.test.mjs

import { test, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { queueDepth, pickDrainer, run } from "./stop-consensus-drain.mjs";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "scd-drain-"));
const QUEUE = path.join(TMP, "queue.jsonl");
const DRAINER = path.join(TMP, "drainer.mjs");
fs.writeFileSync(DRAINER, "// fake drainer\n");

after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best-effort */ } });

test("queueDepth: missing file = 0; empty = 0; counts non-blank lines only", () => {
  assert.equal(queueDepth(path.join(TMP, "nope.jsonl")), 0);
  fs.writeFileSync(QUEUE, "");
  assert.equal(queueDepth(QUEUE), 0);
  fs.writeFileSync(QUEUE, "a\n\n  \nb\nc\n"); // 3 non-blank lines
  assert.equal(queueDepth(QUEUE), 3);
});

test("pickDrainer: returns first existing candidate; null when none exist", () => {
  assert.equal(pickDrainer([path.join(TMP, "missing1.mjs"), DRAINER]), DRAINER);
  assert.equal(pickDrainer([path.join(TMP, "missing1.mjs"), path.join(TMP, "missing2.mjs")]), null);
});

test("run: empty queue -> {continue:true}, drainer NEVER spawned (zero overhead)", () => {
  fs.writeFileSync(QUEUE, "");
  let spawned = false;
  const r = run({ queuePath: QUEUE, candidates: [DRAINER], spawnImpl: () => { spawned = true; return { unref() {} }; } });
  assert.deepEqual(r, { continue: true });
  assert.equal(spawned, false); // depth 0 short-circuits before spawn
});

test("run: non-empty queue + drainer present -> spawns detached with --max=1 + reports depth", () => {
  fs.writeFileSync(QUEUE, "x\ny\n"); // depth 2
  let args = null;
  let opts = null;
  let unrefed = false;
  const r = run({
    queuePath: QUEUE,
    candidates: [DRAINER],
    spawnImpl: (_bin, a, o) => { args = a; opts = o; return { unref() { unrefed = true; } }; },
  });
  assert.equal(r.continue, true);
  assert.match(r.systemMessage, /queue=2/);
  assert.match(r.systemMessage, /spawned/);
  assert.deepEqual(args, [DRAINER, "--max=1"]); // drainer invoked correctly
  assert.equal(opts.detached, true);
  assert.equal(unrefed, true);                   // child.unref() called so Stop is not held
});

test("run: non-empty queue but NO drainer -> reports not-found, never spawns", () => {
  fs.writeFileSync(QUEUE, "x\ny\nz\n");
  let spawned = false;
  const r = run({ queuePath: QUEUE, candidates: [path.join(TMP, "none.mjs")], spawnImpl: () => { spawned = true; return {}; } });
  assert.match(r.systemMessage, /drainer not found/);
  assert.match(r.systemMessage, /queue=3/);
  assert.equal(spawned, false);
});

test("run: a throwing spawn never propagates (Stop must never block)", () => {
  fs.writeFileSync(QUEUE, "x\n");
  const r = run({ queuePath: QUEUE, candidates: [DRAINER], spawnImpl: () => { throw new Error("spawn boom"); } });
  assert.equal(r.continue, true);                // swallowed -> still continues
  assert.match(r.systemMessage, /spawned/);      // reports the attempt; does not crash Stop
});
