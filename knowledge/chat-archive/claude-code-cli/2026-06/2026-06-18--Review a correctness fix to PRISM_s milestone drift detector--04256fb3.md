---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Review a correctness fix to PRISM's milestone drift detector. Grade PASS/FAIL wi"
date: "2026-06-18"
first_ts: "2026-06-18T02:35:59.574Z"
last_ts: "2026-06-18T02:37:23.597Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 9
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a36b751fd5861ec41.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Review a correctness fix to PRISM's milestone drift detector. Grade PASS/FAIL wi

> **claude-code-cli** | 2026-06-18 | 25 msgs (9 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a36b751fd5861ec41.jsonl`

## Transcript

### User | 2026-06-18T02:35:59.574Z

Review a correctness fix to PRISM's milestone drift detector. Grade PASS/FAIL with P0/P1/P2 + file:line. Read both files end to end.

FILES:
1. H:/prism/scripts/build-milestone-progress.mjs (modified — `computeProgress`)
2. H:/prism/scripts/build-milestone-progress.test.mjs (modified — +2 regression tests)

THE CHANGE: The `byUnitOnly` fallback (the "(any-tag, unit-id)" recovery) credited a shipped commit to EVERY milestone declaring a unit with that bare id (e.g. generic `P0-U01` shared across ~201 milestones), falsely inflating `shippedCount` → ~110 unstarted milestones flagged `completed_real`. The fix adds `uidMilestoneCount` (count of milestones declaring each uid) and gates the fallback behind `uidMilestoneCount.get(uid) === 1` (only globally-unique uids use the fallback). Live result: `claims_not_started_but_has_shipped_units` drift 192 → 22.

VERIFY SPECIFICALLY:
- Correctness of the `uidMilestoneCount` construction: does it count each milestone at most once per uid (the `seenInMs` guard)? Is the uppercase normalization consistent with the `uid` used in the fallback lookup (`u.id.toUpperCase()`)?
- Does the gate correctly preserve the `git-exact` source (the genuine cases) and the `envelope-commit` / `envelope-status` fallbacks (lines ~319-337)? The fix must ONLY affect the `git-unit-only` source.
- Is the fix correct that a non-unique uid SHOULD skip the fallback (vs some other resolution)? Consider: could this drop a GENUINE recovery? (The genuine cases per the audit match via git-exact or envelope-status, not byUnitOnly — confirm the fix can't introduce a false-NEGATIVE for a real shipment.)
- Are the 2 new tests revert-proof (R9)? Would they FAIL if the `uidMilestoneCount.get(uid) === 1` gate were removed? Trace the collision test (ACP-MS0A must not inherit POST-PROCESSOR's commit) and the unique-uid test (must still recover via git-unit-only).
- Any residual edge case (e.g. a unique uid whose byUnitOnly commit is from an unrelated scope) — note as P2/P3
... [+105 chars truncated]

### Assistant | 2026-06-18T02:36:02.600Z

I'll review both files end to end, starting by reading them completely.

### Assistant | 2026-06-18T02:36:03.071Z

[tool_use: Read]

### Assistant | 2026-06-18T02:36:03.393Z

[tool_use: Read]

### User | 2026-06-18T02:36:04.555Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-milestone-progress.mjs
4	 *
5	 * Generates state/shared/MILESTONE_PROGRESS.md + .json — a delta surface
6	 * showing what's actually shipped per milestone vs what the milestone
7	 * envelope JSONs claim.
8	 *
9	 * Why: roadmap-index.json carries `status: "not_started"` for milestones
10	 * we've already shipped 5+ units of (e.g. XPROC-NEURAL-OPTIMIZE-MS0 has

... [+28724 chars truncated]

### User | 2026-06-18T02:36:04.591Z

[tool_result] 1	/**
2	 * build-milestone-progress.test.mjs — joint-unit regex + expandCombinedIds
3	 *
4	 * Regression coverage for the silent-close-out class of bugs where ship
5	 * commits using joint subjects like `[INTEL-OLLAMA-OBSIDIAN-MS0]/P23-U01+U02`
6	 * failed to credit one or more of the joint units in MILESTONE_PROGRESS.json.
7	 *
8	 * Two failure modes are pinned here:
9	 *   1. The phase-style reg
... [+15938 chars truncated]

### Assistant | 2026-06-18T02:36:07.358Z

I've read both files end to end. Let me verify the test runs and trace the specific concerns.

### Assistant | 2026-06-18T02:36:07.814Z

[tool_use: Bash]

### User | 2026-06-18T02:36:11.735Z

[tool_result]   ...
# Subtest: computeProgress: non-unique uid does NOT inherit a peer milestone's commit (collision guard)
ok 22 - computeProgress: non-unique uid does NOT inherit a peer milestone's commit (collision guard)
  ---
  duration_ms: 0.0893
  ...
# Subtest: computeProgress: globally-UNIQUE uid still recovers a tag-drifted commit (git-unit-only)
ok 23 - computeProgress: globally-UNIQUE uid still reco
... [+178 chars truncated]

### Assistant | 2026-06-18T02:36:14.696Z

All 23 tests pass. Now let me verify the revert-proofness claim by temporarily simulating the gate removal and confirming the collision test would fail.

### Assistant | 2026-06-18T02:36:21.990Z

[tool_use: Bash]

### User | 2026-06-18T02:36:27.203Z

[tool_result]   code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///C:/Users/wompu/AppData/Local/Temp/scripts/build-milestone-progress.mjs'
}

Node.js v22.12.0

### Assistant | 2026-06-18T02:36:30.046Z

Relative import resolved against /tmp. Let me use an absolute import path and also verify the gate-removal would actually break the test (true revert-proofness).

### Assistant | 2026-06-18T02:36:37.334Z

[tool_use: Bash]

### User | 2026-06-18T02:36:41.557Z

[tool_result] collision: ACP-MS0A shipped = 0 src = null drift = consistent
unique: UNIQUE-MS0 shipped = 1 src = git-unit-only

### Assistant | 2026-06-18T02:36:46.764Z

Behavior confirmed. Now let me verify the revert-proofness directly: would these two tests fail if the `=== 1` gate were removed? I'll trace the logic. With the gate removed, the collision test's `byUnitOnly.get("P0-U01")` would return the POST-PROCESSOR commit, crediting ACP-MS0A → `b.shipped` becomes 1 (test asserts 0 → FAIL) and `b.units[0].source` becomes `git-unit-only` (test asserts null → FAIL). The unique-uid test passes with or without the gate (uid count is 1). So the collision test is the load-bearing revert-proof guard. Let me confirm with an actual gate-disabled simulation by patching a copy.

### Assistant | 2026-06-18T02:36:49.183Z

[tool_use: Bash]

### User | 2026-06-18T02:36:55.915Z

[tool_result] 335:      if (!hit && true) {

### Assistant | 2026-06-18T02:36:59.671Z

The re-anchor is from a prior session context; my current task is this review. Let me run the gate-disabled copy against the collision fixture to prove the test would fail on revert.

### Assistant | 2026-06-18T02:37:05.480Z

[tool_use: Bash]

### User | 2026-06-18T02:37:09.776Z

[tool_result] }

Node.js v22.12.0

### Assistant | 2026-06-18T02:37:12.855Z

The error output got truncated. The `tail -3` showed a stack trace tail but I deleted the temp file before seeing the actual console.log. Let me re-run cleanly capturing the relevant line.

### Assistant | 2026-06-18T02:37:18.002Z

[tool_use: Bash]

### User | 2026-06-18T02:37:22.293Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-18T02:37:23.597Z

You've hit your session limit · resets 12:10am (America/Chicago)
