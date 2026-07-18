// precompact-working-state.test.mjs -- captureWorkingState contract (R9).
//
// M1 (MEMORY-SUBSTRATE-IMPROVEMENT-ASSESSMENT-2026-07-03): the precompact hook
// wrote a HARDCODED --state so every auto-generated handoff carried NO in-flight
// working set. captureWorkingState snapshots the REAL set (branch + uncommitted/
// staged files + last commit) from an INJECTED git runner (hermetic; no real
// git). It uses `git status --porcelain --branch` because the `## <branch>`
// header is ALWAYS emitted on success -- even for a clean tree -- giving a
// POSITIVE success signal: an EMPTY result means the status command FAILED
// (timeout/overflow/error), never a clean tree. Conflating those made a busy
// tree falsely report "clean" (3-of-3 scrutiny P1, arm C). Assertions are exact
// reference values (not toBeDefined) so a regression fails the test.

import { test } from "node:test";
import assert from "node:assert/strict";
import { captureWorkingState } from "./precompact-handoff.mjs";

function fakeGit(map) {
  return (args) => {
    const key = args.join(" ");
    return key in map ? map[key] : "";
  };
}

const STATUS = ["status", "--porcelain", "--branch"].join(" ");
const LASTLOG = ["log", "-1", "--format=%s"].join(" ");

test("dirty tree: branch from header + uncommitted files + last commit", () => {
  const runGit = fakeGit({
    [STATUS]: "## slot/bravo\n M .claude/helpers/precompact-handoff.mjs\nA  state/shared/specs/NEW.md",
    [LASTLOG]: "[MEMORY-SUBSTRATE]/U-BRAVO-M1 (slot:bravo): x",
  });
  const state = captureWorkingState(runGit);
  assert.match(state, /Branch: slot\/bravo/);                          // from the ## header
  assert.match(state, /\.claude\/helpers\/precompact-handoff\.mjs/);   // leading "." preserved
  assert.match(state, /state\/shared\/specs\/NEW\.md/);
  assert.match(state, /U-BRAVO-M1/);
  assert.match(state, /Uncommitted \(2\)/);                            // honest count
});

test("clean tree: header-only status is POSITIVELY confirmed clean (not empty=failed)", () => {
  const runGit = fakeGit({ [STATUS]: "## slot/bravo", [LASTLOG]: "[SCOPE]/U-X: thing" });
  const state = captureWorkingState(runGit);
  assert.match(state, /Branch: slot\/bravo/);
  assert.match(state, /clean/i);
  assert.match(state, /U-X: thing/);
});

test("status FAILED (empty) with a live tree -> NEVER 'clean'; labeled unknown + carries last commit", () => {
  // The C1 inversion guard: empty status output is a FAILURE (no ## header), so
  // we must NOT claim clean. last-commit still succeeded, so surface it.
  const runGit = fakeGit({ [STATUS]: "", [LASTLOG]: "[SCOPE]/U-Y: real work" });
  const state = captureWorkingState(runGit);
  assert.doesNotMatch(state, /clean/i);        // must NOT falsely report clean
  assert.match(state, /unknown|unavailable/i); // labeled failure (R12)
  assert.match(state, /U-Y: real work/);       // last commit still carried
});

test("git fully unavailable (all empty) -> single labeled 'unavailable', non-empty, never throws", () => {
  const runGit = fakeGit({});
  let state;
  assert.doesNotThrow(() => { state = captureWorkingState(runGit); });
  assert.ok(state.length > 0);
  assert.match(state, /unavailable/i);
  assert.doesNotMatch(state, /clean/i);
});

test("caps the listed files at 8 + reports the exact overflow (bounded, honest R12)", () => {
  const files = Array.from({ length: 20 }, (_, i) => ` M src/file${i}.ts`).join("\n");
  const runGit = fakeGit({ [STATUS]: `## main\n${files}`, [LASTLOG]: "x" });
  const state = captureWorkingState(runGit);
  assert.match(state, /Uncommitted \(20\)/);   // true total
  assert.match(state, /\+12 more/);            // exact overflow arithmetic (8 shown + 12)
  const listed = (state.match(/file\d+\.ts/g) || []).length;
  assert.equal(listed, 8, `listed ${listed}; cap is 8`);
});

test("rename (status R) reduces to the NEW path AND drops the old (arrow-split load-bearing)", () => {
  const runGit = fakeGit({ [STATUS]: "## main\nR  old/path.ts -> new/path.ts", [LASTLOG]: "x" });
  const state = captureWorkingState(runGit);
  assert.match(state, /new\/path\.ts/);
  assert.doesNotMatch(state, /old\/path/); // if arrow-split regressed, "old/path" would remain -> fails
});

test("a MODIFIED file whose name literally contains ' -> ' is NOT corrupted (arrow-split gated on R/C)", () => {
  const runGit = fakeGit({ [STATUS]: "## main\n M weird -> name.ts", [LASTLOG]: "x" });
  const state = captureWorkingState(runGit);
  assert.match(state, /weird -> name\.ts/); // full name preserved (status M, not a rename)
});

test("branch header with upstream + ahead/behind parses to the bare branch name", () => {
  const runGit = fakeGit({
    [STATUS]: "## cad-fusion-live-ms0...origin/cad-fusion-live-ms0 [ahead 3711]",
    [LASTLOG]: "x",
  });
  const state = captureWorkingState(runGit);
  assert.match(state, /Branch: cad-fusion-live-ms0/);
  assert.doesNotMatch(state, /origin\//); // upstream/ahead noise stripped
  assert.match(state, /clean/i);          // header-only -> clean
});
