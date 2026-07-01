---
type: "chat-session"
source: "claude-code-cli"
session_id: "93351de7-9846-43b7-a9a7-d6bd1f9b2abc"
title: "Review two documentation files for ACCURACY against the shipped code (the danger"
date: "2026-05-18"
first_ts: "2026-05-18T01:12:53.113Z"
last_ts: "2026-05-18T01:14:13.791Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-ac4873192ea1bf229.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Review two documentation files for ACCURACY against the shipped code (the danger

> **claude-code-cli** | 2026-05-18 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-ac4873192ea1bf229.jsonl`

## Transcript

### User | 2026-05-18T01:12:53.113Z

Review two documentation files for ACCURACY against the shipped code (the danger with docs is they describe behavior the code doesn't actually have). Read all four:
- DOC 1: H:/prism/state/shared/dashboards/patches/CLAUDE-MD-PATCH-r13-task-freshness.md
- DOC 2: H:/prism/knowledge/wiki/architecture/task-freshness-gate.md
- CODE 1: H:/prism/.claude/helpers/task-freshness.mjs
- CODE 2: H:/prism/.claude/hooks/task-freshness-gate.mjs

Verify every concrete claim in the docs matches the code:
1. The 7 decideFreshness branch names/order in DOC 2's table — do they exactly match the `severity` strings and branch order in task-freshness.mjs `decideFreshness`? (already-shipped / gen-unknown-* / gen-in-future / gen-anchor-untrusted / freshness-unprovable / stale-by-age / stale-by-activity / fresh)
2. The knob names + defaults (STALE_HRS=24, PEER_COMMITS_TRIGGER=5, ACK_TTL_MIN=30, GATE_DISABLE, BYPASS, GIT_TIMEOUT_MS, VERBOSE) — do they match the actual `process.env.PRISM_TASK_FRESHNESS_*` reads in both code files? Any documented knob that doesn't exist in code, or code knob not documented?
3. The 4-surface timestamp-field table (envelope `created_at` + unit `status`/`completed_at`; inventory `generatedAt`; handoff `written_at`) — matches `TS_FIELDS` + the readGenerationTimestamp cascade?
4. DOC 1's "Recent regressions row" claim that hook-runner reads `parsed.decision==="block"` only and the bundle re-derives exit-2 — accurate vs the code's emit() always-exit-0 + the bundle wiring?
5. The CLAUDE.md patch claims "no settings.json change" and wiring is via bash-bundle.mjs BASH_HOOKS — confirm bash-bundle.mjs actually has the entry and settings.json was NOT touched.
6. Exports list (8) in DOC 2 — matches actual `export function` count in task-freshness.mjs?
7. Test count "36 node:test" + "2 real-data E2E" — matches scripts/__tests__/task-freshness.test.mjs?

Flag any inaccuracy as P1 (a doc that lies about a security gate is worse than no doc). Operator-clarity P2. Grade PASS/FAIL
... [+33 chars truncated]

### Assistant | 2026-05-18T01:12:59.748Z

I'll review all four files for documentation accuracy against the shipped code.

### Assistant | 2026-05-18T01:13:00.144Z

[tool_use: Read]

### Assistant | 2026-05-18T01:13:01.041Z

[tool_use: Read]

### Assistant | 2026-05-18T01:13:01.475Z

[tool_use: Read]

### Assistant | 2026-05-18T01:13:01.558Z

[tool_use: Read]

### User | 2026-05-18T01:13:04.552Z

[tool_result] 1	# CLAUDE-MD PATCH — R13 task-freshness doctrine + TASK-FRESHNESS-GATE-MS0
2	
3	**Why a patch-sibling:** `CLAUDE.md` is peer-claimed by bravo (OBSIDIAN-BRAIN-FIX-MS0/U-OBF-F1+F2 drain, chat-bus 2026-05-17T21:28Z). Per the PATCH-SIBLING convention (JULIETT-12CHAT-ALLOCATION-MS0), foxtrot writes the intended CLAUDE.md delta here; the lock-holder (or a later foxtrot pass) splices it into the live fi
... [+4184 chars truncated]

### User | 2026-05-18T01:13:05.700Z

[tool_result] 1	---
2	name: task-freshness-gate
3	type: architecture
4	domain: fleet-discipline
5	created: 2026-05-18
6	slot: foxtrot
7	tags: [pretooluse-hook, doctrine-r13, slot-task-claim, staleness, bash-bundle, fail-open]
8	---
9	
10	# TASK-FRESHNESS-GATE-MS0 — R13 enforcement
11	
12	## Why
13	
14	A task's ground truth is its generation timestamp. PRISM gated this for only two
15	narrow surfaces before (goa
... [+6115 chars truncated]

### User | 2026-05-18T01:13:05.954Z

[tool_result] 1	#!/usr/bin/env node
2	// task-freshness.mjs — TASK-FRESHNESS-GATE-MS0/U-TFG01 (2026-05-18)
3	//
4	// Pure, dependency-injectable core for the task-freshness gate (R13 doctrine).
5	// A task's ground truth is its generation timestamp. Before a chat commits to
6	// building a unit, this module answers: "was this task's source generated
7	// before recent fleet activity, such that it may already be
... [+24718 chars truncated]

### User | 2026-05-18T01:13:05.996Z

[tool_result] 1	#!/usr/bin/env node
2	// task-freshness-gate.mjs — TASK-FRESHNESS-GATE-MS0/U-TFG01 (2026-05-18)
3	// tier: T1
4	//
5	// PreToolUse(Bash) gate enforcing CLAUDE.md doctrine R13: a task generated
6	// before recent fleet activity may already be shipped / rescoped / invalid.
7	// This hook intercepts `slot-task-claim.mjs claim --unit <MS::U-ID>` — the
8	// moment a chat commits to building a unit — 
... [+14427 chars truncated]

### Assistant | 2026-05-18T01:13:09.578Z

Now let me verify the bash-bundle.mjs wiring claim (DOC 1 PATCH 3) and the test count.

### Assistant | 2026-05-18T01:13:12.039Z

[tool_use: Bash]

### User | 2026-05-18T01:13:19.260Z

[tool_result] 0 matches for 'task-freshness'
---SETTINGS---
H:/.claude/settings.json:0
C:/Users/wompu/.claude/settings.json:0
---TESTCOUNT---
36
---EXPORTS---
8

### Assistant | 2026-05-18T01:13:21.810Z

task-freshness is not in bash-bundle.mjs. Let me confirm the file exists and check more carefully, plus the test E2E count.

### Assistant | 2026-05-18T01:13:25.562Z

[tool_use: Bash]

### User | 2026-05-18T01:13:33.030Z

[tool_result] NO BUNDLE FILE
---BASH_HOOKS array---
0 matches for 'BASH_HOOKS\|commit-ownership-guard\|worktree-commit-route'
---grep freshness all hooks dir---
.claude/hooks/task-freshness-gate.mjs
---E2E real-data---
11 matches in 8 files:

456:0:a known-completed unit in a live envelope → already-shipped", () => {
460:0:/prism/mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json";
463:0:${envPath} not found
... [+296 chars truncated]

### Assistant | 2026-05-18T01:13:36.015Z

`bash-bundle.mjs` does not exist. Let me check what bundle actually wires bash hooks and whether the test header says 1 or 2 E2E.

### Assistant | 2026-05-18T01:13:38.035Z

[tool_use: Bash]

### User | 2026-05-18T01:13:48.317Z

[tool_result] ---bundle files in hooks---
---which bundle refs task-freshness or claim guards---
.claude/hooks/auto-fork-executor.mjs
.claude/hooks/commit-ownership-guard.mjs
.claude/hooks/file-ownership-tracker.mjs
.claude/hooks/git-add-lane-guard.mjs
.claude/hooks/main-tree-write-block.mjs
.claude/hooks/pre-edit-lane-guard.mjs
.claude/hooks/stop-cross-tree-collision-advisory.mjs
.claude/hooks/task-freshness-g
... [+2293 chars truncated]

### Assistant | 2026-05-18T01:14:13.791Z

I have enough to render a verdict. The bundle wiring claim is the critical finding.

---

## Code Review: task-freshness docs vs shipped code

### GRADE: **FAIL** — P1 wiring inaccuracy in both docs

### P1 — The wiring claim is FALSE in both docs (security-gate-grade)

DOC 1 PATCH 3 asserts: *"wired via the `bash-bundle.mjs` BASH_HOOKS array."* DOC 2 line 55-56 asserts the hook *"runs INSIDE `bash-bundle.mjs` (`BASH_HOOKS` entry between commit-ownership-guard and worktree-commit-route)."* The R13 bullet (DOC 1 line 13) repeats *"wired in `bash-bundle.mjs`"*.

**`.claude/hooks/bash-bundle.mjs` does not exist.** No `*bundle*.mjs` file exists in `.claude/hooks/`. No file in `.claude/hooks/` contains `BASH_HOOKS` or references `task-freshness-gate`. settings.json (both C: and H:) has zero `task-freshness` matches — consistent with DOC 1's "no settings.json change" claim, but combined with the missing bundle this means **the gate is not wired anywhere**. A doc that claims a security gate is active when it is not is exactly the "doc that lies about a security gate" failure mode. The sibling guards it claims to sit between (`commit-ownership-guard.mjs`, `worktree-commit-route.mjs`) exist as standalone hooks — there is no bundle aggregating them. Open task #4 ("Wire hook into bash-bundle.mjs") is `completed` but the wiring is absent — the doc memorialized an intended state as shipped (R12 violation).

### P1 — Test count "2 real-data E2E" is wrong

DOC 1 line 21 and DOC 2 lines 92-94 claim **"2 real-data E2E"**. The test file header explicitly says **"+ 1 real-data E2E"** (line 3). There are in fact 2 `test()` blocks under the REAL-DATA E2E banner (completed-unit + non-existent-unit), so the count "2" is arguably defensible by block count, but the canonical source-of-truth header says 1 — the docs contradict the code's own stated contract. Operator reading the doc cannot reconcile. (36 node:test and 8 exports both verified correct.)

### PASS — items 1, 2, 3, 4, 6 accurate
... [+1907 chars truncated]
