// slot-worktree-cwd-advisory.test.mjs — node:test
// Run: node --test H:/prism/.claude/hooks/slot-worktree-cwd-advisory.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  normalizePath,
  expectedWorktreeFor,
  classifyCwdVsSlot,
  buildAdvisory,
  loadState,
  saveState,
  throttleKey,
  shouldEmit,
  recordEmit,
  readSlotBindingFromFile,
  checkWorktreeExists,
  runCheck,
} from "./slot-worktree-cwd-advisory.mjs";

// ── normalizePath ──
test("normalizePath: handles backslashes, trailing slashes, case", () => {
  assert.equal(normalizePath("H:\\prism\\foo\\"), "h:/prism/foo");
  assert.equal(normalizePath("H:/Prism/Foo"), "h:/prism/foo");
  assert.equal(normalizePath(""), "");
  assert.equal(normalizePath(null), "");
  assert.equal(normalizePath(undefined), "");
});

// ── expectedWorktreeFor ──
test("expectedWorktreeFor: valid NATO names", () => {
  assert.equal(expectedWorktreeFor("alpha"), "H:/prism-slot-alpha");
  assert.equal(expectedWorktreeFor("golf"), "H:/prism-slot-golf");
  assert.equal(expectedWorktreeFor("zulu"), "H:/prism-slot-zulu");
});
test("expectedWorktreeFor: rejects non-lowercase / non-alpha", () => {
  assert.equal(expectedWorktreeFor("Alpha"), null);
  assert.equal(expectedWorktreeFor("alpha1"), null);
  assert.equal(expectedWorktreeFor(""), null);
  assert.equal(expectedWorktreeFor(null), null);
});

// ── classifyCwdVsSlot ──
test("classify: no slot → no-slot", () => {
  const r = classifyCwdVsSlot({ cwd: "H:/prism", slot: null, mainTreeRoot: "H:/prism", expectedWorktree: null, worktreeExists: false });
  assert.equal(r.kind, "no-slot");
  assert.equal(r.match, null);
});
test("classify: no cwd → no-cwd", () => {
  const r = classifyCwdVsSlot({ cwd: "", slot: "golf", mainTreeRoot: "H:/prism", expectedWorktree: "H:/prism-slot-golf", worktreeExists: true });
  assert.equal(r.kind, "no-cwd");
});
test("classify: worktree missing → worktree-missing advisory", () => {
  const r = classifyCwdVsSlot({ cwd: "H:/prism", slot: "zulu", mainTreeRoot: "H:/prism", expectedWorktree: "H:/prism-slot-zulu", worktreeExists: false });
  assert.equal(r.kind, "worktree-missing");
  assert.equal(r.match, false);
  assert.equal(r.slot, "zulu");
});
test("classify: cwd inside slot tree → match true", () => {
  const r = classifyCwdVsSlot({ cwd: "H:/prism-slot-golf", slot: "golf", mainTreeRoot: "H:/prism", expectedWorktree: "H:/prism-slot-golf", worktreeExists: true });
  assert.equal(r.match, true);
  assert.equal(r.kind, "in-slot-tree");
});
test("classify: cwd inside slot tree subdir → match true (prefix)", () => {
  const r = classifyCwdVsSlot({ cwd: "H:/prism-slot-golf/mcp-server/src", slot: "golf", mainTreeRoot: "H:/prism", expectedWorktree: "H:/prism-slot-golf", worktreeExists: true });
  assert.equal(r.match, true);
});
test("classify: cwd in MAIN tree → in-main-tree advisory", () => {
  const r = classifyCwdVsSlot({ cwd: "H:/prism", slot: "golf", mainTreeRoot: "H:/prism", expectedWorktree: "H:/prism-slot-golf", worktreeExists: true });
  assert.equal(r.kind, "in-main-tree");
  assert.equal(r.match, false);
  assert.equal(r.slot, "golf");
});
test("classify: cwd in OTHER worktree → in-other-tree advisory", () => {
  const r = classifyCwdVsSlot({ cwd: "H:/prism-slot-alpha", slot: "golf", mainTreeRoot: "H:/prism", expectedWorktree: "H:/prism-slot-golf", worktreeExists: true });
  assert.equal(r.kind, "in-other-tree");
  assert.equal(r.match, false);
});
test("classify: Windows backslashes normalize correctly", () => {
  const r = classifyCwdVsSlot({ cwd: "H:\\prism-slot-golf\\subdir", slot: "golf", mainTreeRoot: "H:/prism", expectedWorktree: "H:/prism-slot-golf", worktreeExists: true });
  assert.equal(r.match, true);
});
test("classify: H:/prism is NOT a prefix-match for H:/prism-slot-golf (boundary check)", () => {
  // The main-tree path H:/prism is a prefix of H:/prism-slot-golf as a string
  // — must NOT match-as-main when actually in the slot tree.
  const r = classifyCwdVsSlot({ cwd: "H:/prism-slot-golf", slot: "golf", mainTreeRoot: "H:/prism", expectedWorktree: "H:/prism-slot-golf", worktreeExists: true });
  // The expected wins because slot check happens FIRST. But also verify the
  // converse: cwd === H:/prism is treated as main, not as a slot tree.
  assert.equal(r.kind, "in-slot-tree");
  const r2 = classifyCwdVsSlot({ cwd: "H:/prism", slot: "golf", mainTreeRoot: "H:/prism", expectedWorktree: "H:/prism-slot-golf", worktreeExists: true });
  assert.equal(r2.kind, "in-main-tree");
});

// ── buildAdvisory ──
test("buildAdvisory: in-slot-tree → null (no advisory)", () => {
  assert.equal(buildAdvisory({ match: true, kind: "in-slot-tree", slot: "golf" }), null);
});
test("buildAdvisory: no-slot → null", () => {
  assert.equal(buildAdvisory({ match: null, kind: "no-slot" }), null);
});
test("buildAdvisory: worktree-missing → bootstrap command", () => {
  const a = buildAdvisory({ match: false, kind: "worktree-missing", slot: "zulu", expected: "H:/prism-slot-zulu" });
  assert.match(a, /worktree-missing|does not exist/i);
  assert.match(a, /slot-worktree-bootstrap\.mjs.*--slot zulu.*--apply/);
});
test("buildAdvisory: in-main-tree → migration cd command", () => {
  const a = buildAdvisory({ match: false, kind: "in-main-tree", slot: "golf", expected: "H:/prism-slot-golf", actual: "H:/prism" });
  assert.match(a, /SHARED MAIN tree/);
  assert.match(a, /cd H:\/prism-slot-golf/);
});
test("buildAdvisory: in-other-tree → migration cd command", () => {
  const a = buildAdvisory({ match: false, kind: "in-other-tree", slot: "golf", expected: "H:/prism-slot-golf", actual: "H:/prism-slot-alpha" });
  assert.match(a, /wrong worktree/);
  assert.match(a, /cd H:\/prism-slot-golf/);
});

// ── Throttle ──
test("throttleKey: deterministic for (sid prefix, slot)", () => {
  assert.equal(throttleKey("claude-cedef311", "golf"), "claude-c|golf");
  assert.equal(throttleKey("cedef3115678", "golf"), "cedef311|golf");
});
test("shouldEmit: empty state → true", () => {
  assert.equal(shouldEmit({ state: {}, sessionId: "abc12345", slot: "golf", force: false }), true);
});
test("shouldEmit: already-emitted → false", () => {
  const state = { "abc12345|golf": { kind: "in-main-tree", ts: "2026-01-01" } };
  assert.equal(shouldEmit({ state, sessionId: "abc12345", slot: "golf", force: false }), false);
});
test("shouldEmit: force=true overrides throttle", () => {
  const state = { "abc12345|golf": { kind: "in-main-tree" } };
  assert.equal(shouldEmit({ state, sessionId: "abc12345", slot: "golf", force: true }), true);
});
test("recordEmit: writes session-keyed entry", () => {
  const next = recordEmit({ state: {}, sessionId: "abc12345", slot: "golf", kind: "in-main-tree" });
  assert.equal(next["abc12345|golf"].kind, "in-main-tree");
  assert.match(next["abc12345|golf"].ts, /^\d{4}-\d{2}-\d{2}T/);
});

// ── State file I/O (round-trip) ──
test("state file round-trip: empty → write → read", () => {
  const dir = mkdtempSync(join(tmpdir(), "slot-cwd-adv-"));
  try {
    const p = join(dir, "state.json");
    assert.deepEqual(loadState(p), {});
    saveState(p, { "abc|golf": { kind: "in-main-tree" } });
    assert.deepEqual(loadState(p), { "abc|golf": { kind: "in-main-tree" } });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("loadState: corrupt JSON → empty object (no throw)", () => {
  const dir = mkdtempSync(join(tmpdir(), "slot-cwd-adv-"));
  try {
    const p = join(dir, "corrupt.json");
    writeFileSync(p, "{not valid json");
    assert.deepEqual(loadState(p), {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── readSlotBindingFromFile ──
test("readSlotBindingFromFile: finds session by short id suffix", () => {
  const dir = mkdtempSync(join(tmpdir(), "slot-cwd-adv-"));
  try {
    const p = join(dir, "chat-slots.json");
    writeFileSync(p, JSON.stringify({
      slots: {
        golf: { chatId: "claude-cedef311" },
        alpha: { chatId: "claude-deadbeef" },
        bravo: { chatId: "" },
      }
    }));
    assert.equal(readSlotBindingFromFile("cedef311abcdef", p), "golf");
    assert.equal(readSlotBindingFromFile("deadbeef", p), "alpha");
    assert.equal(readSlotBindingFromFile("nope0000", p), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("readSlotBindingFromFile: missing file → null", () => {
  assert.equal(readSlotBindingFromFile("abc12345", "/nonexistent/path.json"), null);
});

// ── runCheck integration (with injected deps) ──
test("runCheck: PRISM_SLOT_CWD_ADVISORY_DISABLE=1 → silent", async () => {
  const r = await runCheck({ env: { PRISM_SLOT_CWD_ADVISORY_DISABLE: "1" }, sessionId: "abc12345", cwd: "H:/prism", slot: "golf" });
  assert.deepEqual(r, { continue: true });
});
test("runCheck: in-main-tree → emits advisory", async () => {
  const dir = mkdtempSync(join(tmpdir(), "slot-cwd-adv-"));
  try {
    const r = await runCheck({
      env: {},
      sessionId: "abc12345",
      cwd: "H:/prism",
      slot: "golf",
      worktreeExists: true,
      statePath: join(dir, "state.json"),
    });
    assert.equal(r.continue, true);
    assert.ok(r.hookSpecificOutput?.additionalContext);
    assert.match(r.hookSpecificOutput.additionalContext, /SHARED MAIN tree/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("runCheck: in-slot-tree → silent (no advisory)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "slot-cwd-adv-"));
  try {
    const r = await runCheck({
      env: {},
      sessionId: "abc12345",
      cwd: "H:/prism-slot-golf",
      slot: "golf",
      worktreeExists: true,
      statePath: join(dir, "state.json"),
    });
    assert.deepEqual(r, { continue: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("runCheck: throttle suppresses second emission in same session", async () => {
  const dir = mkdtempSync(join(tmpdir(), "slot-cwd-adv-"));
  try {
    const statePath = join(dir, "state.json");
    const opts = {
      env: {},
      sessionId: "abc12345",
      cwd: "H:/prism",
      slot: "golf",
      worktreeExists: true,
      statePath,
    };
    const r1 = await runCheck(opts);
    assert.ok(r1.hookSpecificOutput?.additionalContext);
    const r2 = await runCheck(opts);
    assert.deepEqual(r2, { continue: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("runCheck: FORCE=1 bypasses throttle", async () => {
  const dir = mkdtempSync(join(tmpdir(), "slot-cwd-adv-"));
  try {
    const statePath = join(dir, "state.json");
    const baseOpts = {
      sessionId: "abc12345",
      cwd: "H:/prism",
      slot: "golf",
      worktreeExists: true,
      statePath,
    };
    const r1 = await runCheck({ ...baseOpts, env: {} });
    assert.ok(r1.hookSpecificOutput?.additionalContext);
    const r2 = await runCheck({ ...baseOpts, env: { PRISM_SLOT_CWD_ADVISORY_FORCE: "1" } });
    assert.ok(r2.hookSpecificOutput?.additionalContext);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("runCheck: no slot binding → silent (no advisory)", async () => {
  const r = await runCheck({ env: {}, sessionId: "abc12345", cwd: "H:/prism", slot: null });
  assert.deepEqual(r, { continue: true });
});
test("runCheck: worktree missing → bootstrap-command advisory", async () => {
  const dir = mkdtempSync(join(tmpdir(), "slot-cwd-adv-"));
  try {
    const r = await runCheck({
      env: {},
      sessionId: "abc12345",
      cwd: "H:/prism",
      slot: "zulu",
      worktreeExists: false,
      statePath: join(dir, "state.json"),
    });
    assert.ok(r.hookSpecificOutput?.additionalContext);
    assert.match(r.hookSpecificOutput.additionalContext, /slot-worktree-bootstrap\.mjs.*--slot zulu.*--apply/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
