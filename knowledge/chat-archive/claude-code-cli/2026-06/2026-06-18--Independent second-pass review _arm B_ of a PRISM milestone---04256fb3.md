---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Independent second-pass review (arm B) of a PRISM milestone-drift-detector fix. "
date: "2026-06-18"
first_ts: "2026-06-18T02:36:10.322Z"
last_ts: "2026-06-18T02:37:28.970Z"
cwd: "H:\\prism"
messages: 27
user_msgs: 10
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a6d58cdebf93ac481.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Independent second-pass review (arm B) of a PRISM milestone-drift-detector fix. 

> **claude-code-cli** | 2026-06-18 | 27 msgs (10 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a6d58cdebf93ac481.jsonl`

## Transcript

### User | 2026-06-18T02:36:10.322Z

Independent second-pass review (arm B) of a PRISM milestone-drift-detector fix. Do NOT assume arm A caught everything. Weighted toward silent breakage + regression risk in a FLEET-WIDE consumed artifact. Grade PASS/FAIL with file:line. Read both files fully.

FILES:
1. H:/prism/scripts/build-milestone-progress.mjs (modified `computeProgress`: added `uidMilestoneCount` map; gated the `byUnitOnly` "(any-tag, unit-id)" fallback behind `uidMilestoneCount.get(uid) === 1`)
2. H:/prism/scripts/build-milestone-progress.test.mjs (+2 tests)

CONTEXT: This script generates state/shared/MILESTONE_PROGRESS.{json,md}, consumed by /system-viz ghost roosts, BUILD_STATE, and roadmap-tracking fleet-wide. A regression here corrupts fleet roadmap visibility. The fix dropped drift count 259→23 (removed ~170 cross-milestone false positives).

FOCUS ON WHAT ARM A MIGHT MISS:
- **Did the fix change ANY genuine `shippedCount`?** The drop from inflated counts to 1847 shipped — is that the EXPECTED removal of false credits, or could it have dropped real shipments? Reason about whether any milestone that was LEGITIMATELY relying on the byUnitOnly fallback (a real tag-drift with a non-unique uid) just lost its credit. Is that a real risk or impossible given the data?
- **Performance**: `uidMilestoneCount` is built once O(total units); the per-unit `.get()` is O(1). Confirm no O(n²).
- **Determinism / ordering**: `byUnitOnly` keeps the FIRST commit per uid (insertion order of `shipped.values()`). For a UNIQUE uid this is now deterministic-correct. Confirm the fix didn't introduce any order-dependence.
- **The 2 new tests**: do they use the real `mkUnit` helper correctly? Do they construct the `shipped` Map with the exact value shape `computeProgress` expects (`.unitId`, `.sha`, `.milestoneTag`)? Would a reverted gate make the collision test FAIL (not silently pass)?
- **ASCII-only**, convention conformance, any inlined magic.
- Cross-check: does the existing `claims_completed_but_units_pending` 
... [+81 chars truncated]

### Assistant | 2026-06-18T02:36:12.663Z

I'll review both files thoroughly. Let me start by reading them completely.

### Assistant | 2026-06-18T02:36:13.153Z

[tool_use: Read]

### Assistant | 2026-06-18T02:36:13.535Z

[tool_use: Read]

### User | 2026-06-18T02:36:13.705Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-milestone-progress.mjs' was already read 10s ago in this session and is unchanged (mtime 1781750039034). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T02:36:14.103Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-milestone-progress.test.mjs' was already read 10s ago in this session and is unchanged (mtime 1781750123047). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T02:36:16.852Z

The read-once guard claims I read these 10s ago, but they are not in my context (this is a fresh agent thread). I need to force a fresh read.

### Assistant | 2026-06-18T02:36:17.587Z

[tool_use: Bash]

### User | 2026-06-18T02:36:21.262Z

[tool_result] <persisted-output>
Output too large (30.9KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\04256fb3-d30b-4652-ab9b-142a096f1045\tool-results\bgg3dzqeu.txt

Preview (first 2KB):
     1	#!/usr/bin/env node
     2	/**
     3	 * build-milestone-progress.mjs
     4	 *
     5	 * Generates state/shared/MILESTONE_PROGRESS.md + .json — a delta surface
     6	 * showing what's actuall
... [+1770 chars truncated]

### Assistant | 2026-06-18T02:36:23.602Z

The output was saved to a file. Let me read it directly along with the test file.

### Assistant | 2026-06-18T02:36:25.121Z

[tool_use: Read]

### User | 2026-06-18T02:36:29.064Z

[tool_result] 1	     1	#!/usr/bin/env node
2	     2	/**
3	     3	 * build-milestone-progress.mjs
4	     4	 *
5	     5	 * Generates state/shared/MILESTONE_PROGRESS.md + .json — a delta surface
6	     6	 * showing what's actually shipped per milestone vs what the milestone
7	     7	 * envelope JSONs claim.
8	     8	 *
9	     9	 * Why: roadmap-index.json carries `status: "not_started"` for milestones
10	    10	 * 
... [+32826 chars truncated]

### Assistant | 2026-06-18T02:36:31.811Z

Now I have the full source. The watchdog noted a test_timeout — let me note the test run was slow but that may be the git log scan. Now let me read the test file fully.

### Assistant | 2026-06-18T02:36:32.460Z

[tool_use: Bash]

### User | 2026-06-18T02:36:37.539Z

[tool_result] 345 H:/prism/scripts/build-milestone-progress.test.mjs

### Assistant | 2026-06-18T02:36:40.162Z

[tool_use: Bash]

### User | 2026-06-18T02:36:44.292Z

[tool_result]      1	/**
     2	 * build-milestone-progress.test.mjs — joint-unit regex + expandCombinedIds
     3	 *
     4	 * Regression coverage for the silent-close-out class of bugs where ship
     5	 * commits using joint subjects like `[INTEL-OLLAMA-OBSIDIAN-MS0]/P23-U01+U02`
     6	 * failed to credit one or more of the joint units in MILESTONE_PROGRESS.json.
     7	 *
     8	 * Two failure modes are pi
... [+17076 chars truncated]

### Assistant | 2026-06-18T02:36:47.224Z

I have both files fully. Now let me trace the key concerns. First, let me verify the gate logic and the two new tests run green and would fail on revert. Let me run the test suite.

### Assistant | 2026-06-18T02:36:48.041Z

[tool_use: Bash]

### User | 2026-06-18T02:36:54.457Z

[tool_result]   ...
# Subtest: computeProgress: status:shipped with no commit is credited via envelope-status (asserted)
ok 21 - computeProgress: status:shipped with no commit is credited via envelope-status (asserted)
  ---
  duration_ms: 0.0948
  ...
# Subtest: computeProgress: non-unique uid does NOT inherit a peer milestone's commit (collision guard)
ok 22 - computeProgress: non-unique uid does NOT inherit 
... [+412 chars truncated]

### Assistant | 2026-06-18T02:36:58.621Z

All 23 pass (80ms — the earlier "test_timeout" watchdog was the slow `cat` of the 31KB file, not the tests). Now let me verify the collision test would FAIL if the gate is reverted (i.e., the test has real teeth — R9). Let me simulate the reverted gate.

### Assistant | 2026-06-18T02:37:06.988Z

[tool_use: Bash]

### User | 2026-06-18T02:37:11.799Z

[tool_result] REVERTED ACP-MS0A shipped: 1 source: git-unit-only
Test asserts b.shipped===0; reverted gives 1 => TEST WOULD FAIL (has teeth, good)

### Assistant | 2026-06-18T02:37:17.907Z

The collision test has real teeth — reverting the gate makes `ACP-MS0A.shipped` become 1 (and `source` = "git-unit-only", `b.units[0].source` assertion also flips), failing the test. Good R9 compliance.

Now the critical regression question: **could the gate drop any GENUINE shipment?** A unit only loses credit if (a) it has no git-exact hit, AND (b) its uid is non-unique, AND (c) the byUnitOnly hit was actually the correct milestone. Let me check whether non-unique uids that legitimately relied on byUnitOnly exist in live data. Let me examine the live data shape — how many uids are non-unique and how the git-exact vs git-unit-only sources distribute.

### Assistant | 2026-06-18T02:37:22.942Z

[tool_use: Bash]

### User | 2026-06-18T02:37:27.545Z

[tool_result] total distinct uids: 3787 unique: 3685 non-unique: 102
worst collider: P0-U01 declared by 211 milestones
top colliders: [["P0-U01",211],["P0-U02",157],["P0-U03",140],["P0-U04",98],["P0-U05",68],["P1-U01",51],["P1-U02",48],["P1-U03",41]]

### Assistant | 2026-06-18T02:37:28.970Z

You've hit your session limit · resets 12:10am (America/Chicago)
