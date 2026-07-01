// Tests for stop-sync-cli-context.mjs detectDrift -- MULTI-CLI-SYNC-HOOK-MS28 (slot:golf).
// Run: node .claude/hooks/stop-sync-cli-context.test.mjs   (node:test auto-runs on exit;
// `node --test <file>` reports 0 tests in this env -- see the 2026-06-17 regression note).
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDrift } from "./stop-sync-cli-context.mjs";

// Deterministic mtime oracle: a map of path -> mtimeMs (absent = 0 = "missing file").
const mk = (map) => (p) => (Object.prototype.hasOwnProperty.call(map, p) ? map[p] : 0);

const A = "H:/PRISM/CLAUDE.md";
const B = "/home/u/.claude/CLAUDE.md";
const C = "/home/u/.claude/projects/H--PRISM/memory/MEMORY.md";

test("no source newer than the stamp -> no drift (common no-op Stop)", () => {
  // all sources last modified at t=1000, stamp at t=2000 (synced after the edits)
  assert.equal(detectDrift([A, B, C], 2000, mk({ [A]: 1000, [B]: 1000, [C]: 1000 })), false);
});

test("a source modified after the stamp -> drift", () => {
  // CLAUDE.md edited at t=3000, last sync stamp t=2000
  assert.equal(detectDrift([A, B, C], 2000, mk({ [A]: 3000, [B]: 1000, [C]: 1000 })), true);
});

test("only ONE of several sources drifted -> still drift", () => {
  assert.equal(detectDrift([A, B, C], 2000, mk({ [A]: 1000, [B]: 1000, [C]: 9999 })), true);
});

test("missing source (mtime 0) is NEVER drift", () => {
  // none of the sources exist on disk -> mtime 0 -> not > stamp
  assert.equal(detectDrift([A, B, C], 0, mk({})), false);
});

test("source mtime EXACTLY equal to stamp -> not drift (strictly-after)", () => {
  assert.equal(detectDrift([A], 2000, mk({ [A]: 2000 })), false);
});

test("first run (stampTs=0) with an existing source -> drift (forces initial sync)", () => {
  assert.equal(detectDrift([A], 0, mk({ [A]: 1700000000000 })), true);
});

test("adversarial: NaN/negative stampTs coerces to 0 -> existing source drifts", () => {
  assert.equal(detectDrift([A], NaN, mk({ [A]: 5 })), true);
  assert.equal(detectDrift([A], -999, mk({ [A]: 5 })), true);
});

test("adversarial: empty source list -> no drift", () => {
  assert.equal(detectDrift([], 0, mk({})), false);
});

test("adversarial: a missing source does not mask a real drift in another", () => {
  // B missing (0), A genuinely drifted -> must still report drift
  assert.equal(detectDrift([A, B], 1000, mk({ [A]: 2000 })), true);
});
