// session-reorient-inject.test.mjs
// Tests for the mid-session GOAL re-anchor revival (operator directive 2026-06-11):
// the brief used to emit nothing when state.anchors was empty (dormant in production);
// it now re-anchors to the per-chat HANDOFF resume directive every promptInterval.
// R9: each test pins the INTENT (re-anchor the real objective; fail-soft when absent),
// not a hardcoded string.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  extractResume,
  readStandingGoal,
  buildBrief,
} from "../session-reorient-inject.mjs";

const RESUME_BODY =
  "Last work (slot zulu): wire mid-session goal re-anchor. Next: verify + commit. " +
  "Re-enter: /startup-zulu /loop [10m] /goal.";

function handoffFixture(resumeBody) {
  return [
    "---",
    "session: claude-deadbeef",
    "topic: zulu-test",
    "slot: zulu",
    "---",
    "",
    "# HANDOFF: claude-deadbeef",
    "",
    "## STATE",
    "(precompact auto-write -- slot zulu)",
    "",
    "## RESUME",
    resumeBody,
    "",
    "## CONTEXT",
    "",
    "## MEMORY_SEED",
    "noise that must NOT appear in the extracted goal",
  ].join("\n");
}

// ---- extractResume (pure parser) ----

test("extractResume pulls the ## RESUME body and stops at the next ## header", () => {
  const got = extractResume(handoffFixture(RESUME_BODY));
  assert.equal(got, RESUME_BODY);
  assert.ok(!got.includes("MEMORY_SEED"), "must not bleed into the next section");
  assert.ok(!got.includes("## CONTEXT"), "must stop at the next header");
});

test("extractResume handles ## RESUME at end-of-file (no trailing header)", () => {
  const txt = "# H\n\n## RESUME\nthe only objective line\n";
  assert.equal(extractResume(txt), "the only objective line");
});

test("extractResume matches a DECORATED RESUME header but not RESUMED", () => {
  assert.equal(
    extractResume("# H\n\n## RESUME DIRECTIVE\nthe decorated objective\n\n## CONTEXT\n"),
    "the decorated objective"
  );
  // "RESUMED" must NOT be treated as a RESUME header (word boundary).
  assert.equal(extractResume("# H\n\n## RESUMED LATER\nnot a resume section\n"), null);
});

test("extractResume returns null when there is no RESUME section or empty input", () => {
  assert.equal(extractResume("# H\n\n## STATE\nnothing here\n"), null);
  assert.equal(extractResume(""), null);
  assert.equal(extractResume(null), null);
  assert.equal(extractResume("## RESUME\n   \n## NEXT\n"), null, "whitespace-only body -> null");
});

test("extractResume keeps a MULTI-LINE RESUME body intact (does not truncate at line 1)", () => {
  const txt = "## RESUME\nline one of the plan\nline two continues it\n\n## CONTEXT\n";
  const got = extractResume(txt);
  assert.ok(got.includes("line one"), "line 1 kept");
  assert.ok(got.includes("line two"), "line 2 kept");
  assert.ok(!got.includes("CONTEXT"), "stops at next header");
});

test("extractResume caps an oversized directive and marks truncation", () => {
  const big = "x".repeat(900);
  const got = extractResume(`## RESUME\n${big}\n`);
  assert.ok(got.length <= 604, `capped length, got ${got.length}`);
  assert.ok(got.endsWith("..."), "truncation marker present");
});

// ---- readStandingGoal (glob + newest + read + extract, fail-soft) ----

test("readStandingGoal reads the NEWEST matching handoff for the session", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reorient-"));
  try {
    // older file
    fs.writeFileSync(path.join(dir, "HANDOFF-claude-deadbeef-old.md"), handoffFixture("OLD objective"));
    // newer file (bump mtime explicitly so the sort is deterministic)
    const newer = path.join(dir, "HANDOFF-claude-deadbeef-new.md");
    fs.writeFileSync(newer, handoffFixture("NEW objective is current"));
    const future = new Date(Date.now() + 60_000);
    fs.utimesSync(newer, future, future);

    const got = readStandingGoal("claude-deadbeef", dir);
    assert.equal(got, "NEW objective is current");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("readStandingGoal is fail-soft: missing dir, no match, and 'default' sid all -> null", () => {
  assert.equal(readStandingGoal("claude-deadbeef", path.join(os.tmpdir(), "no-such-dir-xyz")), null);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reorient-"));
  try {
    fs.writeFileSync(path.join(dir, "HANDOFF-claude-other-x.md"), handoffFixture("not mine"));
    assert.equal(readStandingGoal("claude-deadbeef", dir), null, "no file for this sid -> null");
    assert.equal(readStandingGoal("default", dir), null, "'default' sid is never goal-anchored");
    assert.equal(readStandingGoal("", dir), null, "empty sid -> null");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- buildBrief integration: the revival behavior ----

const EMPTY_STATE = { anchors: [], config: {}, stats: { promptsSeen: 15, toolCallsSeen: 3 } };

test("buildBrief surfaces the STANDING GOAL even when anchors are empty (the revival)", () => {
  const brief = buildBrief(EMPTY_STATE, "prompt_interval (15/15)", RESUME_BODY);
  assert.ok(brief.includes("STANDING GOAL"), "goal section present");
  assert.ok(brief.includes("verify + commit"), "the actual objective text is injected");
});

test("buildBrief omits the STANDING GOAL section when no goal is available (unchanged path)", () => {
  const brief = buildBrief(EMPTY_STATE, "prompt_interval (15/15)", null);
  assert.ok(!brief.includes("STANDING GOAL"), "no goal section without a goal");
  // still a valid brief envelope
  assert.ok(brief.includes("SESSION REORIENTATION"), "header still emitted");
});

test("buildBrief places STANDING GOAL ABOVE the inferred OBJECTIVE (anti-lost-in-the-middle)", () => {
  const state = {
    anchors: [{ active: true, type: "task_anchor", summary: "inferred task", tags: ["t"] }],
    config: {},
    stats: { promptsSeen: 15, toolCallsSeen: 3 },
  };
  const brief = buildBrief(state, "prompt_interval (15/15)", "the real standing goal");
  const gi = brief.indexOf("STANDING GOAL");
  const oi = brief.indexOf("OBJECTIVE:");
  assert.ok(gi >= 0 && oi >= 0, "both present");
  assert.ok(gi < oi, "standing goal appears before the inferred objective");
});
