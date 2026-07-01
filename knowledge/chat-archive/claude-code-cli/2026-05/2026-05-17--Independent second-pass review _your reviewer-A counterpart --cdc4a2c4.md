---
type: "chat-session"
source: "claude-code-cli"
session_id: "cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81"
title: "Independent second-pass review (your reviewer-A counterpart already covers algor"
date: "2026-05-17"
first_ts: "2026-05-17T23:54:56.019Z"
last_ts: "2026-05-17T23:56:48.607Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 11
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-aa35723cf46ba914d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Independent second-pass review (your reviewer-A counterpart already covers algor

> **claude-code-cli** | 2026-05-17 | 24 msgs (11 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-aa35723cf46ba914d.jsonl`

## Transcript

### User | 2026-05-17T23:54:56.019Z

Independent second-pass review (your reviewer-A counterpart already covers algorithmic correctness — focus on what they're less likely to catch).

Files in this change-set:
- NEW: `H:/prism/scripts/lib/shipped-units-source-of-truth.mjs` (the helper)
- NEW: `H:/prism/scripts/lib/shipped-units-source-of-truth.test.mjs` (21 hermetic+real-data tests, all passing)
- EDITED: `H:/prism/scripts/slot-queue.mjs` (consumes helper)
- EDITED: `H:/prism/.claude/helpers/priority-queue.mjs` (consumes helper)

Background: claude-098ac2aa's prior /loop iter flagged `slot-queue.mjs --pick` as returning already-shipped units. Investigation found TWO bugs:
1. slot-queue.mjs treats `MILESTONE_PROGRESS.m.shipped` (a number) as an array → shipped set always empty → every unit appeared unshipped fleet-wide.
2. priority-queue.mjs reads `m.units[].shipped` correctly but misses envelope-complete-but-git-untagged units (6 live drift cases in CLEANUP-MS0).

Fix: new shared helper that unions both signals. Both pickers now route through it.

Focus your review on:
1. **Integration coupling** — read the actual call-sites in slot-queue.mjs and priority-queue.mjs after the edit. Did the type contract change? slot-queue used to read `m.shipped` (array of ids); now it gets a `Set<string>` from buildShippedIdsUnion. Are all old `.has()` callsites compatible with the new union'd Set?
2. **Backward compat** — priority-queue.mjs exports `buildShippedIds(progress)` and other modules may import it with a progress argument. After the refactor that arg is unused (void via comment). Anyone else importing buildShippedIds? Grep `from ".*priority-queue` across the repo.
3. **Naming + conventions** — match surrounding style? Snake-case file? camelCase fns?
4. **Test thoroughness** — does the test suite have a fail-on-revert oracle that specifically pins the bug? (test 18 + 21 do this.) Are there silent-failure modes the tests miss?
5. **Hidden coupling** — any hook, stop-gate, or skill that depends on the OLD behav
... [+957 chars truncated]

### Assistant | 2026-05-17T23:55:04.095Z

I'll review the actual files to verify the claims and check integration coupling.

### Assistant | 2026-05-17T23:55:05.513Z

[tool_use: Read]

### Assistant | 2026-05-17T23:55:05.123Z

[tool_use: Read]

### Assistant | 2026-05-17T23:55:04.604Z

[tool_use: Read]

### User | 2026-05-17T23:55:05.957Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\shipped-units-source-of-truth.mjs' was already read 19s ago in this session and is unchanged (mtime 1779061516662). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-05-17T23:55:08.812Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * priority-queue.mjs — runtime API over ROADMAP-CONSOLIDATED priority queue.
4	 *
5	 * Spec: PRIORITY-QUEUE-MS0 (slot juliett, forge7, 2026-05-16).
6	 *
7	 * Consumed by Stop hooks (stop-auto-pickup-next.mjs in particular) to suggest
8	 * the next-best unit for a chat to take. Uses the same `classifyUnit` from
9	 * scripts/generate-priority-queue-features.mjs so visu
... [+8378 chars truncated]

### User | 2026-05-17T23:55:08.814Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/slot-queue.mjs — per-slot unit queue API for /checkin-<nato> auto-loop
3	//
4	// Reads state/shared/slot-task-queues.json; cross-checks MILESTONE_PROGRESS (shipped)
5	// and slot-task-claims.json (peer-claimed in-flight) and depends_on graph.
6	//
7	// CLI:
8	//   node scripts/slot-queue.mjs --pick --slot <nato> [--json]    next eligible unit (skipped if shipped/
... [+7475 chars truncated]

### Assistant | 2026-05-17T23:55:13.678Z

[tool_use: Read]

### Assistant | 2026-05-17T23:55:14.774Z

[tool_use: Grep]

### User | 2026-05-17T23:55:15.135Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/shipped-units-source-of-truth.mjs
3	//
4	// Canonical set of unit-ids that should be SKIPPED by any /pick-unit picker.
5	//
6	// Two sources, unioned (a unit is "shipped" if EITHER source agrees):
7	//   (a) MILESTONE_PROGRESS.json — git-inferred (commit subject matches
8	//       [MILESTONE]/U-ID), authoritative for "git actually reflects this".
9	//   (b) m
... [+6143 chars truncated]

### User | 2026-05-17T23:55:35.220Z

[tool_result] Found 3 files
.claude\helpers\priority-queue.mjs
CLAUDE.md
.claude\helpers\priority-queue.test.mjs

### Assistant | 2026-05-17T23:55:41.615Z

[tool_use: Grep]

### Assistant | 2026-05-17T23:55:42.613Z

[tool_use: Grep]

### User | 2026-05-17T23:55:42.981Z

[tool_result] 4:import { collectUnits, buildShippedIds, buildClaimedIds, rankUnits } from "./priority-queue.mjs";
22:test("buildShippedIds — only shipped:true units, normalized uppercase", () => {
23:  const ids = buildShippedIds({

### Assistant | 2026-05-17T23:55:43.775Z

[tool_use: Bash]

### User | 2026-05-17T23:55:44.688Z

[tool_result] Found 3 files
.claude\helpers\priority-queue.mjs
.claude\helpers\priority-queue.test.mjs
.claude\hooks\lib\_audit_engine_quality.py

### User | 2026-05-17T23:55:50.542Z

[tool_result] 0
14M	H:/prism/mcp-server/data/milestones/

### Assistant | 2026-05-17T23:55:55.019Z

Acknowledged. I have enough context from already-read files; finalizing review without further shell exploration.

### Assistant | 2026-05-17T23:55:56.113Z

[tool_use: Read]

### User | 2026-05-17T23:55:56.889Z

[tool_result] 1	#!/usr/bin/env node
2	import test from "node:test";
3	import assert from "node:assert/strict";
4	import { collectUnits, buildShippedIds, buildClaimedIds, rankUnits } from "./priority-queue.mjs";
5	
6	test("collectUnits — flattens pending + prose + bridge into one list", () => {
7	  const units = collectUnits({
8	    pending_units: [{ unit_id: "U-P1", milestone: "M0", title: "p" }],
9	    unconso
... [+3408 chars truncated]

### Assistant | 2026-05-17T23:55:57.355Z

[tool_use: Grep]

### User | 2026-05-17T23:56:18.103Z

[tool_result] .claude\helpers\priority-queue.mjs:3: * priority-queue.mjs — runtime API over ROADMAP-CONSOLIDATED priority queue.
.claude\helpers\priority-queue.mjs:18: * Pure functions are exported for testability; CLI: `node priority-queue.mjs
.claude\helpers\priority-queue.mjs:172:  console.log("usage: node priority-queue.mjs --pick [--slot <name>] [--top N] [--exclude id,id] [--json] | --summary [--json]");

... [+2118 chars truncated]

### Assistant | 2026-05-17T23:56:48.607Z

Acknowledged. Reviewing the test file findings — `buildShippedIds` is exported and consumed by `priority-queue.test.mjs` line 23-31 passing a `{milestones: {...}}` object. The refactor signature change is the headline P0.

# Independent Second-Pass Review

**Grade: FAIL** (1 P0 must-fix before merge; 1 P1; 2 P2)

## P0 — Test breakage from signature change
`priority-queue.test.mjs:22-32` calls `buildShippedIds({milestones: {A: {units: [...]}}})` with a hermetic in-memory object. Post-refactor, `buildShippedIds()` ignores its argument (`void`) and reads from disk (`buildShippedIdsUnion()`). The test now silently reads real `MILESTONE_PROGRESS.json` + 14MB of real envelopes — the `assert.equal(ids.size, 2)` will FAIL against thousands of real shipped IDs. **The 21 new tests pass, but this pre-existing test was not updated.** Either update it to use the new helper's path-injection (`progressPath`/`envelopesDir`) OR delete it as obsolete. Don't ship until the existing suite is green.

## P1 — Performance / hot-path
`stop-auto-pickup-next.mjs` is wired in the Stop chain (fires every commit/stop in 13 chats). Each pickup invocation now does:
- 1× `readdirSync` on `mcp-server/data/milestones/` (~734 envelopes per CLAUDE.md count; live dir is 14MB)
- 734× synchronous `readFileSync + JSON.parse + recursive walk`
- All synchronous, no cache.

At ~14MB/Stop × 13 chats × multiple Stops/min the I/O cost is real. **Recommend:** memoize on max-mtime of `MILESTONE_PROGRESS.json` + `mcp-server/data/milestones/` dir (cheap stat, invalidate on either change). Per R10 checkpoint + the standing `## Recent regressions` pattern about silent-degrade on hot paths.

## P2 — Hidden coupling risk (back-compat partial)
`buildShippedIds(progress)` signature kept "for back-compat" but the `progress` arg is silently dropped. Any external caller passing a hermetic object (like the existing test) gets disk-read behavior instead. Either:
- Honor the arg if provided (`if (progress) return readShippedF
... [+1886 chars truncated]
