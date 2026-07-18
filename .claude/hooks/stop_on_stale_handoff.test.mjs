// Tests for stop_on_stale_handoff.mjs collectStaleSignals (AGENTIC-SUBSTRATE-BRIDGE, slot:bravo 2026-06-14).
// R9 intent-tests: they pin BOTH the scan-dir fix (was H:/prism root -> state/shared/handoffs/)
// AND the noise fix (was "ANY handoff >24h" -> "NEWEST handoff >24h"). Each fails on a revert.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collectStaleSignals } from "./stop_on_stale_handoff.mjs";

const DAY = 86400000;
const NOW = 1_800_000_000_000; // fixed reference instant (ms)

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "stale-handoff-")); }
function writeHandoff(dir, name, ageMs) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, "x");
  const mt = new Date(NOW - ageMs);
  fs.utimesSync(p, mt, mt);
  return p;
}

test("R9: a stale-only handoff dir IS found (fails on revert to the H:/prism root scan)", () => {
  const dir = tmp();
  writeHandoff(dir, "HANDOFF-claude-aaa-topic.md", 25 * 3600000); // 25h old, only file
  const stale = collectStaleSignals({ handoffDir: dir, survivalFile: null, now: NOW });
  assert.equal(stale.length, 1);
  assert.match(stale[0], /handoffs-stale/);
  assert.match(stale[0], /HANDOFF-claude-aaa-topic\.md/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a FRESH handoff -> pass (no stale signal)", () => {
  const dir = tmp();
  writeHandoff(dir, "HANDOFF-claude-bbb-topic.md", 2 * 3600000); // 2h old
  const stale = collectStaleSignals({ handoffDir: dir, survivalFile: null, now: NOW });
  assert.deepEqual(stale, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("R9 (NOISE FIX): old + fresh mix -> PASS because the NEWEST is fresh (fails on revert to any-stale)", () => {
  const dir = tmp();
  writeHandoff(dir, "HANDOFF-claude-old1-x.md", 5 * DAY);   // 5d old
  writeHandoff(dir, "HANDOFF-claude-old2-x.md", 3 * DAY);   // 3d old
  writeHandoff(dir, "HANDOFF-claude-fresh-x.md", 1 * 3600000); // 1h old -> fleet active
  const stale = collectStaleSignals({ handoffDir: dir, survivalFile: null, now: NOW });
  assert.deepEqual(stale, [], "a busy fleet with old handoffs but a recent one must NOT warn");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("R9 (26-slot fleet sim): many old + 1 fresh -> still PASS (no false-warn at scale)", () => {
  const dir = tmp();
  for (let i = 0; i < 25; i++) writeHandoff(dir, `HANDOFF-claude-slot${i}-x.md`, (2 + i) * DAY);
  writeHandoff(dir, "HANDOFF-claude-active-x.md", 30 * 60000); // 30m old
  const stale = collectStaleSignals({ handoffDir: dir, survivalFile: null, now: NOW });
  assert.deepEqual(stale, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("all handoffs stale (checkpointing genuinely quiet) -> found", () => {
  const dir = tmp();
  writeHandoff(dir, "HANDOFF-claude-old1-x.md", 5 * DAY);
  writeHandoff(dir, "HANDOFF-claude-old2-x.md", 2 * DAY);
  const stale = collectStaleSignals({ handoffDir: dir, survivalFile: null, now: NOW });
  assert.equal(stale.length, 1);
  assert.match(stale[0], /handoffs-stale/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("empty / missing handoff dir -> NOT stale (nothing to warn about yet)", () => {
  const dir = tmp();
  assert.deepEqual(collectStaleSignals({ handoffDir: dir, survivalFile: null, now: NOW }), []);
  fs.rmSync(dir, { recursive: true, force: true });
  // missing dir
  assert.deepEqual(collectStaleSignals({ handoffDir: path.join(dir, "nope"), survivalFile: null, now: NOW }), []);
});

test("non-HANDOFF files in the dir are ignored", () => {
  const dir = tmp();
  const p = path.join(dir, "consolidated-bravo.md"); // not a HANDOFF-*.md
  fs.writeFileSync(p, "x");
  const mt = new Date(NOW - 9 * DAY);
  fs.utimesSync(p, mt, mt);
  assert.deepEqual(collectStaleSignals({ handoffDir: dir, survivalFile: null, now: NOW }), []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("compaction-survival file stale -> found (preserved behavior)", () => {
  const dir = tmp();
  const survival = path.join(dir, ".compaction-survival.md");
  fs.writeFileSync(survival, "x");
  const mt = new Date(NOW - 2 * DAY);
  fs.utimesSync(survival, mt, mt);
  const stale = collectStaleSignals({ handoffDir: path.join(dir, "none"), survivalFile: survival, now: NOW });
  assert.deepEqual(stale, ["compaction-survival.md"]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("fresh compaction-survival -> not stale", () => {
  const dir = tmp();
  const survival = path.join(dir, ".compaction-survival.md");
  fs.writeFileSync(survival, "x");
  const mt = new Date(NOW - 3600000); // 1h
  fs.utimesSync(survival, mt, mt);
  assert.deepEqual(collectStaleSignals({ handoffDir: path.join(dir, "none"), survivalFile: survival, now: NOW }), []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("boundary: exactly 24h is NOT stale; just over IS", () => {
  const dir = tmp();
  writeHandoff(dir, "HANDOFF-claude-edge-x.md", DAY); // exactly 24h
  assert.deepEqual(collectStaleSignals({ handoffDir: dir, survivalFile: null, now: NOW }), [], "exactly maxAge is not yet stale");
  fs.rmSync(dir, { recursive: true, force: true });
  const dir2 = tmp();
  writeHandoff(dir2, "HANDOFF-claude-edge2-x.md", DAY + 60000); // 24h + 1m
  assert.equal(collectStaleSignals({ handoffDir: dir2, survivalFile: null, now: NOW }).length, 1);
  fs.rmSync(dir2, { recursive: true, force: true });
});
