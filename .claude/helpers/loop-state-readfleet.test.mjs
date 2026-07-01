// Tests for readFleetLoops (U-LOOP-STATE-READ-API, slot:bravo 2026-06-14).
// The exported data-half of cmdList: programmatic fleet loop-state query. R9 intent-tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readFleetLoops } from "./loop-state.mjs";

const NOW = 1_800_000_000_000;
function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "loopfleet-")); }
function writeLoop(dir, sid, o = {}) {
  fs.writeFileSync(path.join(dir, `loop-${sid}.json`), JSON.stringify({
    sessionId: sid, task: o.task ?? "t", iter: o.iter ?? 0, target: o.target ?? 10,
    status: o.status ?? "running", lastTickAt: new Date(o.lastTickAt ?? NOW).toISOString(),
  }));
}

test("readFleetLoops returns all loops sorted freshest-first with correct staleMs", () => {
  const dir = tmp();
  writeLoop(dir, "aaa", { lastTickAt: NOW - 60000, task: "old" });
  writeLoop(dir, "bbb", { lastTickAt: NOW - 1000, task: "fresh" });
  const r = readFleetLoops({ dir, now: NOW });
  assert.equal(r.count, 2);
  assert.equal(r.loops[0].sessionId, "bbb"); // freshest first
  assert.equal(r.loops[0].staleMs, 1000);
  assert.equal(r.loops[0].task, "fresh");
  assert.equal(r.loops[1].sessionId, "aaa");
  assert.equal(r.loops[1].staleMs, 60000);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readFleetLoops carries iter/target/status fields", () => {
  const dir = tmp();
  writeLoop(dir, "ccc", { iter: 3, target: 8, status: "running", lastTickAt: NOW });
  const r = readFleetLoops({ dir, now: NOW });
  assert.equal(r.loops[0].iter, 3);
  assert.equal(r.loops[0].target, 8);
  assert.equal(r.loops[0].status, "running");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readFleetLoops fail-soft: missing dir -> empty", () => {
  const dir = tmp();
  assert.deepEqual(readFleetLoops({ dir: path.join(dir, "nope"), now: NOW }), { count: 0, loops: [] });
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readFleetLoops skips corrupt files, keeps valid ones", () => {
  const dir = tmp();
  writeLoop(dir, "ddd", { lastTickAt: NOW });
  fs.writeFileSync(path.join(dir, "loop-bad.json"), "{not json");
  const r = readFleetLoops({ dir, now: NOW });
  assert.equal(r.count, 1);
  assert.equal(r.loops[0].sessionId, "ddd");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readFleetLoops ignores non-loop-*.json files", () => {
  const dir = tmp();
  writeLoop(dir, "eee", { lastTickAt: NOW });
  fs.writeFileSync(path.join(dir, "other.json"), JSON.stringify({ x: 1 }));
  fs.writeFileSync(path.join(dir, "loop-eee.txt"), "x");
  const r = readFleetLoops({ dir, now: NOW });
  assert.equal(r.count, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readFleetLoops empty dir -> count 0", () => {
  const dir = tmp();
  assert.deepEqual(readFleetLoops({ dir, now: NOW }), { count: 0, loops: [] });
  fs.rmSync(dir, { recursive: true, force: true });
});
