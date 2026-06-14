#!/usr/bin/env node
// Tests for session-reorient-capture.mjs (PostToolUse anchor capture + mid-turn re-anchor).
// Run: node --test H:/prism/.claude/hooks/__tests__/session-reorient-capture.test.mjs
//
// Intent (R9): these tests pin the 2026-06-12 fixes --
//   1. sid resolution parity with the inject companion (stdin -> CLAUDE_CODE_SESSION_ID,
//      sanitized against path traversal, unsafe candidate falls through),
//   2. anti-clobber WIRING: an existing-but-unreadable state file is left byte-identical
//      (not just the loadState flag -- the main() skip-save path itself),
//   3. counter coordination: capture increments but NEVER resets the shared
//      toolCallsSinceLastBrief (inject's trigger); mid-turn uses its OWN counter;
//      and inject's reset paths preserve capture's counter --
// plus the new mid-turn standing-goal emission (real-data E2E through the CLI).

import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  resolveSid,
  stateFileFor,
  classify,
  midTurnThreshold,
  buildMidTurnBrief,
  loadState,
  saveState,
} from "../session-reorient-capture.mjs";
import { resolveSessionId as injectResolveSessionId } from "../session-reorient-inject.mjs";

// Resolve hooks RELATIVE to this test file so a slot-worktree run exercises the
// worktree copy, not the main tree (scrutiny P1: split-brain false-PASS vector).
const HOOK = fileURLToPath(new URL("../session-reorient-capture.mjs", import.meta.url));
const INJECT_HOOK = fileURLToPath(new URL("../session-reorient-inject.mjs", import.meta.url));
const STATE_DIR = "H:/prism/state/session-reorientation";
const HANDOFF_DIR = "H:/prism/state/shared/handoffs";

function runHook(payload, env = {}, hook = HOOK) {
  const r = spawnSync(process.execPath, [hook], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    encoding: "utf8",
    timeout: 15000,
    env: {
      ...process.env,
      // Pin the knobs OFF-able by the ambient operator env (false-FAIL guard).
      PRISM_SESSION_REORIENT_DISABLE: "",
      PRISM_REORIENT_CAPTURE_DISABLE: "",
      ...env,
    },
  });
  return { stdout: r.stdout || "", stderr: r.stderr || "", status: r.status };
}

// Remove the named files AND any atomic-write tmp siblings (a timeout-killed
// child can orphan reorientation-*.json.<pid>.tmp in the live dir).
function cleanup(files) {
  for (const f of files) {
    try { fs.unlinkSync(f); } catch { /* already gone */ }
    try {
      const dir = path.dirname(f);
      const base = path.basename(f);
      for (const sib of fs.readdirSync(dir)) {
        if (sib.startsWith(base) && sib.endsWith(".tmp")) {
          try { fs.unlinkSync(path.join(dir, sib)); } catch { /* best-effort */ }
        }
      }
    } catch { /* dir may not exist */ }
  }
}

function withCleanEnv(fn) {
  const prevA = process.env.CLAUDE_CODE_SESSION_ID;
  const prevB = process.env.CLAUDE_SESSION_ID;
  delete process.env.CLAUDE_CODE_SESSION_ID;
  delete process.env.CLAUDE_SESSION_ID;
  try { return fn(); } finally {
    if (prevA !== undefined) process.env.CLAUDE_CODE_SESSION_ID = prevA;
    if (prevB !== undefined) process.env.CLAUDE_SESSION_ID = prevB;
  }
}

// ---------- resolveSid ----------

test("resolveSid: stdin session_id wins and produces inject-compatible claude-<8>", () => {
  assert.equal(resolveSid("db273e77-fb5e-4444-aaaa-bbbbccccdddd"), "claude-db273e77");
});

test("resolveSid: falls back to CLAUDE_CODE_SESSION_ID when stdin sid missing", () => {
  withCleanEnv(() => {
    process.env.CLAUDE_CODE_SESSION_ID = "e21368ad-5c14-4669-987a-a911beedb626";
    assert.equal(resolveSid(undefined), "claude-e21368ad");
  });
});

test("resolveSid: returns default when nothing available (failure mode)", () => {
  withCleanEnv(() => {
    assert.equal(resolveSid(undefined), "default");
    assert.equal(resolveSid("short"), "default"); // < 8 chars
  });
});

test("resolveSid: ADVERSARIAL path-traversal session_id cannot escape the state dir", () => {
  withCleanEnv(() => {
    for (const hostile of ["/../../ab", "..\\..\\xx", "a/../b/cc", "........"]) {
      const sid = resolveSid(hostile);
      assert.equal(sid, "default", `hostile "${hostile}" must sanitize away (no env anchor set)`);
      const resolved = path.resolve(stateFileFor(sid));
      assert.ok(
        resolved.toLowerCase().startsWith(path.resolve(STATE_DIR).toLowerCase() + path.sep),
        `state file escaped: ${resolved}`
      );
    }
  });
});

test("resolveSid PARITY with inject.resolveSessionId: normal uuid AND hostile-stdin-with-env-anchor", () => {
  // Normal uuid: both must land on the identical state-file key.
  const uuid = "db273e77-fb5e-4444-aaaa-bbbbccccdddd";
  assert.equal(resolveSid(uuid), injectResolveSessionId(uuid));
  // Hostile stdin + valid env anchor: BOTH must fall through to the SAME env-derived
  // id (a divergence here splits the shared state file -- the dormant-anchor bug).
  withCleanEnv(() => {
    process.env.CLAUDE_CODE_SESSION_ID = "e21368ad-5c14-4669-987a-a911beedb626";
    const hostile = "/../../ab";
    assert.equal(resolveSid(hostile), "claude-e21368ad");
    assert.equal(injectResolveSessionId(hostile), "claude-e21368ad");
  });
});

// ---------- midTurnThreshold ----------

test("midTurnThreshold: default 75, explicit value honored, 0 disables, garbage/negative falls back", () => {
  assert.equal(midTurnThreshold({}), 75);
  assert.equal(midTurnThreshold({ PRISM_REORIENT_MIDTURN_TOOLCALLS: "120" }), 120);
  assert.equal(midTurnThreshold({ PRISM_REORIENT_MIDTURN_TOOLCALLS: "0" }), 0);
  assert.equal(midTurnThreshold({ PRISM_REORIENT_MIDTURN_TOOLCALLS: "banana" }), 75);
  assert.equal(midTurnThreshold({ PRISM_REORIENT_MIDTURN_TOOLCALLS: "-5" }), 75);
});

// ---------- classify (behavior preserved from pre-rewrite version) ----------

test("classify: engine Write -> decision anchor; vitest PASS -> error_resolved; FAIL -> null", () => {
  const eng = classify("Write", { file_path: "H:/x/FooEngine.ts" }, undefined);
  assert.equal(eng.type, "decision");
  assert.match(eng.summary, /FooEngine\.ts/);

  const green = classify("Bash", { command: "npx vitest run foo" }, "12 passed (3.2s)");
  assert.equal(green.type, "error_resolved");

  const red = classify("Bash", { command: "npx vitest run foo" }, "3 failed, 9 passed");
  assert.equal(red, null);

  const commit = classify("Bash", { command: 'git commit -m "fix the thing"' }, "");
  assert.equal(commit.type, "milestone");
  assert.match(commit.summary, /fix the thing/);
});

// ---------- buildMidTurnBrief ----------

test("buildMidTurnBrief: contains the goal, frames as awareness NOT a context warning", () => {
  const brief = buildMidTurnBrief("ship U-FOO then U-BAR\nthen validate", 80);
  assert.match(brief, /STANDING GOAL/);
  assert.match(brief, /ship U-FOO then U-BAR/);
  assert.match(brief, /NOT a context warning/);
  assert.match(brief, /80 tool calls/);
});

test("buildMidTurnBrief: enriches with working set (files newest-first dedup) + decisions + search-first surfaces", () => {
  const state = {
    anchors: [
      { type: "decision", summary: "Wired dispatcher: BarDispatcher.ts", files: ["H:/x/BarDispatcher.ts"], active: true },
      { type: "decision", summary: "Created engine: FooEngine.ts", files: ["H:/x/FooEngine.ts"], active: true },
      { type: "decision", summary: "Edited FooEngine.ts", files: ["H:/x/FooEngine.ts"], active: true }, // dup file, most recent
    ],
  };
  const brief = buildMidTurnBrief("ship U-FOO", 80, state);
  assert.match(brief, /ACTIVE FILES/);
  assert.match(brief, /RECENT DECISIONS/);
  assert.match(brief, /search-first surfaces/);
  // Newest-first dedup: FooEngine.ts (touched most recently) listed once, before BarDispatcher.ts.
  const files = brief.split("\n").filter((l) => l.startsWith("  - H:/x/"));
  assert.deepEqual(files, ["  - H:/x/FooEngine.ts", "  - H:/x/BarDispatcher.ts"]);
});

test("buildMidTurnBrief: returns null when neither goal nor working set exists (no bare-header noise)", () => {
  assert.equal(buildMidTurnBrief(null, 80, null), null);
  assert.equal(buildMidTurnBrief(null, 80, { anchors: [] }), null);
  // Inactive anchors and content-less anchors (no files, no decisions) must not produce a header-only brief.
  assert.equal(buildMidTurnBrief(null, 80, { anchors: [{ type: "decision", summary: "x", files: ["f"], active: false }] }), null);
  assert.equal(buildMidTurnBrief(null, 80, { anchors: [{ type: "error_resolved", summary: "build green", active: true }] }), null);
});

test("buildMidTurnBrief: ADVERSARIAL oversized goal truncates at the cap (bounded injection)", () => {
  const brief = buildMidTurnBrief("x".repeat(10000), 80, null);
  assert.ok(brief.length <= 2400 + 40, `brief leaked past the cap: ${brief.length}`);
  assert.match(brief, /re-anchor truncated/);
});

// ---------- loadState anti-clobber (unit level) ----------

test("loadState: missing file -> fresh state, unreadable=false (happy)", () => {
  const tmp = path.join(os.tmpdir(), `reorient-test-missing-${process.pid}.json`);
  cleanup([tmp]);
  const { state, unreadable } = loadState(tmp, "claude-testxxxx");
  assert.equal(unreadable, false);
  assert.equal(state.sessionId, "claude-testxxxx");
  assert.deepEqual(state.anchors, []);
});

test("loadState: ADVERSARIAL corrupt existing file -> unreadable=true (anti-clobber gate)", () => {
  const tmp = path.join(os.tmpdir(), `reorient-test-corrupt-${process.pid}.json`);
  fs.writeFileSync(tmp, "{ torn json never closed");
  try {
    const { unreadable } = loadState(tmp, "claude-testxxxx");
    assert.equal(unreadable, true, "exists-but-unparseable MUST flag unreadable so caller skips save");
  } finally {
    cleanup([tmp]);
  }
});

test("saveState/loadState round-trip is atomic-shaped (no tmp residue)", () => {
  const tmp = path.join(os.tmpdir(), `reorient-test-rt-${process.pid}.json`);
  const { state } = loadState(tmp, "claude-testxxxx");
  state.stats.toolCallsSeen = 42;
  assert.equal(saveState(tmp, state), true, "successful write must report true (emission gate)");
  const back = loadState(tmp, "claude-testxxxx");
  assert.equal(back.unreadable, false);
  assert.equal(back.state.stats.toolCallsSeen, 42);
  const residue = fs.readdirSync(path.dirname(tmp)).filter((f) => f.startsWith(path.basename(tmp)) && f.endsWith(".tmp"));
  assert.equal(residue.length, 0, "tmp file leaked");
  cleanup([tmp]);
});

test("saveState: ADVERSARIAL unwritable target reports false (anti-spam emission gate contract)", () => {
  // Parent "directory" is actually a FILE -> the tmp write cannot land, cross-platform.
  const parentFile = path.join(os.tmpdir(), `reorient-parent-${process.pid}`);
  fs.writeFileSync(parentFile, "i am a file, not a directory");
  try {
    const { state } = loadState(path.join(parentFile, "x.json"), "claude-testxxxx");
    assert.equal(saveState(path.join(parentFile, "x.json"), state), false,
      "failed persist must report false so main() drops the brief instead of re-emitting every call");
  } finally {
    cleanup([parentFile]);
  }
});

// ---------- E2E through the CLI (real harness payload shapes) ----------

const E2E_SID = "testcapa-0000-e2e";
const E2E_STATE = path.join(STATE_DIR, "reorientation-claude-testcapa.json");

function cleanStaleHandoffs() {
  try {
    for (const f of fs.readdirSync(HANDOFF_DIR)) {
      if (f.startsWith("HANDOFF-claude-testcapa-")) {
        try { fs.unlinkSync(path.join(HANDOFF_DIR, f)); } catch { /* best-effort */ }
      }
    }
  } catch { /* dir may not exist yet */ }
}

test("E2E: tool call increments BOTH counters; shared counter is never reset by capture", () => {
  cleanup([E2E_STATE]);
  try {
    const payload = { session_id: E2E_SID, tool_name: "Read", tool_input: { file_path: "x.md" } };
    // High threshold so mid-turn cannot fire.
    const env = { PRISM_REORIENT_MIDTURN_TOOLCALLS: "9999" };
    let out = runHook(payload, env);
    assert.equal(out.status, 0);
    assert.deepEqual(JSON.parse(out.stdout.trim()), { continue: true });

    let st = JSON.parse(fs.readFileSync(E2E_STATE, "utf8"));
    assert.equal(st.stats.toolCallsSinceLastBrief, 1);
    assert.equal(st.stats.toolCallsSinceMidTurnAnchor, 1);

    // Simulate inject having seen 10 calls already -- capture must only ADD.
    st.stats.toolCallsSinceLastBrief = 10;
    fs.writeFileSync(E2E_STATE, JSON.stringify(st));
    out = runHook(payload, env);
    assert.equal(out.status, 0);
    st = JSON.parse(fs.readFileSync(E2E_STATE, "utf8"));
    assert.equal(st.stats.toolCallsSinceLastBrief, 11, "capture must increment, never reset, the shared counter");
  } finally {
    cleanup([E2E_STATE]);
  }
});

test("E2E: mid-turn re-anchor emits the standing goal and resets ONLY its own counter (distinct-value oracle)", () => {
  fs.mkdirSync(HANDOFF_DIR, { recursive: true });
  cleanStaleHandoffs();
  const handoff = path.join(HANDOFF_DIR, "HANDOFF-claude-testcapa-capture-e2e-test.md");
  cleanup([E2E_STATE, handoff]);
  fs.writeFileSync(handoff, "# H\n\n## RESUME\ncontinue U-CAPTURE-E2E: validate mid-turn re-anchor\n\n## STATE\nirrelevant\n");
  try {
    // Seed: one call below the threshold of 2.
    let out = runHook({ session_id: E2E_SID, tool_name: "Read", tool_input: {} }, { PRISM_REORIENT_MIDTURN_TOOLCALLS: "2" });
    assert.equal(out.status, 0);
    assert.deepEqual(JSON.parse(out.stdout.trim()), { continue: true }, "below threshold: no emission");

    // Make the shared counter value DISTINCT from threshold/actualCalls (oracle
    // strength: a regression assigning the wrong variable cannot collide on 2).
    let st = JSON.parse(fs.readFileSync(E2E_STATE, "utf8"));
    st.stats.toolCallsSinceLastBrief = 10;
    fs.writeFileSync(E2E_STATE, JSON.stringify(st));

    // Crossing call: emits additionalContext with the handoff goal.
    out = runHook({ session_id: E2E_SID, tool_name: "Read", tool_input: {} }, { PRISM_REORIENT_MIDTURN_TOOLCALLS: "2" });
    assert.equal(out.status, 0);
    const parsed = JSON.parse(out.stdout.trim());
    assert.equal(parsed.continue, true);
    assert.equal(parsed.hookSpecificOutput?.hookEventName, "PostToolUse");
    assert.match(parsed.hookSpecificOutput?.additionalContext || "", /U-CAPTURE-E2E: validate mid-turn re-anchor/);
    assert.match(parsed.hookSpecificOutput?.additionalContext || "", /NOT a context warning/);

    st = JSON.parse(fs.readFileSync(E2E_STATE, "utf8"));
    assert.equal(st.stats.toolCallsSinceMidTurnAnchor, 0, "own counter resets after emission");
    assert.equal(st.stats.toolCallsSinceLastBrief, 11, "shared counter must keep incrementing, untouched by mid-turn reset");
    assert.equal(st.stats.midTurnReanchors, 1);
  } finally {
    cleanup([E2E_STATE, handoff]);
  }
});

test("E2E: goal-less chat past threshold resets own counter, emits nothing (failure mode)", () => {
  cleanStaleHandoffs();
  cleanup([E2E_STATE]);
  try {
    const env = { PRISM_REORIENT_MIDTURN_TOOLCALLS: "1" };
    const out = runHook({ session_id: E2E_SID, tool_name: "Read", tool_input: {} }, env);
    assert.equal(out.status, 0);
    assert.deepEqual(JSON.parse(out.stdout.trim()), { continue: true }, "no handoff -> no emission");
    const st = JSON.parse(fs.readFileSync(E2E_STATE, "utf8"));
    assert.equal(st.stats.toolCallsSinceMidTurnAnchor, 0, "counter still resets so the handoff is not re-read per call");
  } finally {
    cleanup([E2E_STATE]);
  }
});

test("E2E: goal-less chat WITH a working set emits the working-set re-anchor (anchors-only path)", () => {
  cleanStaleHandoffs();
  cleanup([E2E_STATE]);
  try {
    const env = { PRISM_REORIENT_MIDTURN_TOOLCALLS: "2" };
    // Call 1: engine Write records a decision anchor (counter 1, below threshold).
    let out = runHook({ session_id: E2E_SID, tool_name: "Write", tool_input: { file_path: "H:/x/QuxEngine.ts" } }, env);
    assert.equal(out.status, 0);
    assert.deepEqual(JSON.parse(out.stdout.trim()), { continue: true }, "below threshold: no emission");
    // Call 2 crosses: no handoff goal exists, but the captured working set does.
    out = runHook({ session_id: E2E_SID, tool_name: "Read", tool_input: {} }, env);
    assert.equal(out.status, 0);
    const parsed = JSON.parse(out.stdout.trim());
    assert.equal(parsed.hookSpecificOutput?.hookEventName, "PostToolUse");
    assert.match(parsed.hookSpecificOutput?.additionalContext || "", /QuxEngine\.ts/);
    assert.match(parsed.hookSpecificOutput?.additionalContext || "", /NOT a context warning/);
    const st = JSON.parse(fs.readFileSync(E2E_STATE, "utf8"));
    assert.equal(st.stats.midTurnReanchors, 1, "anchors-only brief must count as a re-anchor");
  } finally {
    cleanup([E2E_STATE]);
  }
});

test("E2E: ADVERSARIAL torn state file is left byte-identical (anti-clobber WIRING, not just the flag)", () => {
  cleanup([E2E_STATE]);
  const torn = "{ torn json never closed";
  fs.writeFileSync(E2E_STATE, torn);
  try {
    const out = runHook({ session_id: E2E_SID, tool_name: "Read", tool_input: {} }, { PRISM_REORIENT_MIDTURN_TOOLCALLS: "9999" });
    assert.equal(out.status, 0);
    assert.deepEqual(JSON.parse(out.stdout.trim()), { continue: true });
    assert.equal(fs.readFileSync(E2E_STATE, "utf8"), torn, "unreadable existing state must NOT be overwritten (a3e6d3ca97 clobber class)");
  } finally {
    cleanup([E2E_STATE]);
  }
});

test("E2E: disable knob is a pure pass-through (no state file created)", () => {
  cleanup([E2E_STATE]);
  try {
    const out = runHook(
      { session_id: E2E_SID, tool_name: "Read", tool_input: {} },
      { PRISM_REORIENT_CAPTURE_DISABLE: "1" }
    );
    assert.equal(out.status, 0);
    assert.deepEqual(JSON.parse(out.stdout.trim()), { continue: true });
    assert.equal(fs.existsSync(E2E_STATE), false, "disabled hook must not touch state");
  } finally {
    cleanup([E2E_STATE]);
  }
});

test("E2E: ADVERSARIAL garbage stdin never breaks the tool call (always continue:true)", () => {
  const out = runHook("not json at all {{{");
  assert.equal(out.status, 0);
  assert.deepEqual(JSON.parse(out.stdout.trim()), { continue: true });
});

test("E2E: tool_response (harness field) drives error_resolved anchors", () => {
  cleanup([E2E_STATE]);
  try {
    const out = runHook(
      {
        session_id: E2E_SID,
        tool_name: "Bash",
        tool_input: { command: "npx vitest run foo.test.ts" },
        tool_response: "Test Files  3 passed (3)\n12 passed (3.2s)",
      },
      { PRISM_REORIENT_MIDTURN_TOOLCALLS: "9999" }
    );
    assert.equal(out.status, 0);
    const st = JSON.parse(fs.readFileSync(E2E_STATE, "utf8"));
    assert.equal(st.stats.anchorsRecorded, 1, "tool_response field must reach classify()");
    assert.equal(st.anchors[0].type, "error_resolved");
  } finally {
    cleanup([E2E_STATE]);
  }
});

test("E2E COORDINATION: inject's counter-reset paths preserve capture's mid-turn counter", () => {
  cleanStaleHandoffs();
  cleanup([E2E_STATE]);
  try {
    // Seed a state where inject's prompt_interval trigger fires on the next prompt
    // (14+1 >= 15) but no anchors and no handoff exist -> inject takes its
    // empty-brief SKIP path, which resets promptsSinceLastBrief AND the shared
    // toolCallsSinceLastBrief. Capture's own counter must survive both resets.
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(E2E_STATE, JSON.stringify({
      sessionId: "claude-testcapa",
      anchors: [],
      config: {},
      stats: {
        promptsSeen: 14, toolCallsSeen: 60, anchorsRecorded: 0, briefsGenerated: 0,
        midTurnReanchors: 0, lastBriefAt: null,
        promptsSinceLastBrief: 14, toolCallsSinceLastBrief: 60,
        toolCallsSinceMidTurnAnchor: 7,
      },
      briefHistory: [],
    }));
    const out = runHook({ session_id: E2E_SID, prompt: "next unit please" }, {}, INJECT_HOOK);
    assert.equal(out.status, 0);
    const st = JSON.parse(fs.readFileSync(E2E_STATE, "utf8"));
    assert.equal(st.stats.promptsSinceLastBrief, 0, "inject's skip path reset its own counters (precondition)");
    assert.equal(st.stats.toolCallsSinceMidTurnAnchor, 7, "capture's counter must SURVIVE inject's reset (coordination contract)");
  } finally {
    cleanup([E2E_STATE]);
  }
});

test("E2E READ-PARITY: inject leaves an exists-but-unreadable state file byte-identical (U-REORIENT-INJECT-READ-PARITY)", () => {
  // Pre-fix, inject's fail-open read returned null for a torn file, synthesized
  // a fresh state, and SAVED it -- clobbering capture's anchors (a3e6d3ca97
  // class). Parity with capture: exists-but-unreadable -> pure pass-through.
  cleanup([E2E_STATE]);
  const torn = "{ torn json never closed";
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(E2E_STATE, torn);
  try {
    const out = runHook({ session_id: E2E_SID, prompt: "a real prompt long enough to count" }, {}, INJECT_HOOK);
    assert.equal(out.status, 0);
    assert.deepEqual(JSON.parse(out.stdout.trim()), { continue: true });
    assert.equal(fs.readFileSync(E2E_STATE, "utf8"), torn,
      "inject must NOT overwrite an unreadable existing state (read-parity with capture)");
  } finally {
    cleanup([E2E_STATE]);
  }
});

test("E2E COORDINATION: inject's brief-EMIT path DOES reset the mid-turn counter (defer-after-fresh-re-anchor)", () => {
  cleanStaleHandoffs();
  cleanup([E2E_STATE]);
  try {
    // Anchored state where inject's prompt_interval fires AND the brief is non-empty
    // (task_anchor present) -> the EMIT path runs, which must restart capture's
    // mid-turn counter so the next mid-turn re-anchor lands ~threshold calls later
    // instead of duplicating this brief's content.
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(E2E_STATE, JSON.stringify({
      sessionId: "claude-testcapa",
      anchors: [{ type: "task_anchor", summary: "ship U-MIDTURN-WORKINGSET", active: true, createdAt: "2026-06-12T00:00:00Z" }],
      config: {},
      stats: {
        promptsSeen: 14, toolCallsSeen: 60, anchorsRecorded: 1, briefsGenerated: 0,
        midTurnReanchors: 0, lastBriefAt: null,
        promptsSinceLastBrief: 14, toolCallsSinceLastBrief: 60,
        toolCallsSinceMidTurnAnchor: 7,
      },
      briefHistory: [],
    }));
    const out = runHook({ session_id: E2E_SID, prompt: "next unit please" }, {}, INJECT_HOOK);
    assert.equal(out.status, 0);
    const parsed = JSON.parse(out.stdout.trim());
    assert.ok(parsed.hookSpecificOutput?.additionalContext, "precondition: inject's brief actually EMITTED");
    const st = JSON.parse(fs.readFileSync(E2E_STATE, "utf8"));
    assert.equal(st.stats.toolCallsSinceMidTurnAnchor, 0, "emit path must restart the mid-turn counter (anti-duplicate-brief)");
  } finally {
    cleanup([E2E_STATE]);
  }
});
