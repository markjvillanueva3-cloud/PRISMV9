---
type: "chat-session"
source: "claude-code-cli"
session_id: "e5840fb7-ef73-4b34-a9f0-20822aa90cab"
title: "Independent second-pass review of a fix to `H:/prism/scripts/build-milestone-pro"
date: "2026-05-22"
first_ts: "2026-05-22T16:48:39.670Z"
last_ts: "2026-05-22T16:50:20.089Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/e5840fb7-ef73-4b34-a9f0-20822aa90cab/subagents/agent-a54bea5560124c977.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Independent second-pass review of a fix to `H:/prism/scripts/build-milestone-pro

> **claude-code-cli** | 2026-05-22 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e5840fb7-ef73-4b34-a9f0-20822aa90cab/subagents/agent-a54bea5560124c977.jsonl`

## Transcript

### User | 2026-05-22T16:48:39.670Z

Independent second-pass review of a fix to `H:/prism/scripts/build-milestone-progress.mjs` (Node ESM, ~493 lines). Read the WHOLE file.

This script feeds `state/shared/MILESTONE_PROGRESS.json` — a fleet-load-bearing artifact: `/pick-unit` subtracts "shipped" units from candidate pools, and `/goal` close-out gates read it. Over-crediting → real shipped work looks done when it isn't, OR genuinely-pending work disappears from pick queues.

THE CHANGE: In `loadMilestones()`, the `phases[].units[]` branch previously read unit `status`/`commits` ONLY from a top-level `ms.units{}` overlay (empty `{}` for pure-phases envelopes). It now ALSO reads the phase unit's OWN `u.status` and `u.commits` fields (own fields first, overlay as fallback). A pre-existing unused-var (`key` in a `shipped.entries()` destructure near line ~258) was also cleaned to `shipped.values()`.

EMPIRICAL: after the fix, total shipped jumped 2107→2551 (+444), drift cases 191→190.

Your job — weighted toward what a logic-correctness reviewer might MISS:
1. INTEGRITY RISK: +444 units newly credited. Is the script's trust model sound — i.e. is it acceptable that an envelope JSON's per-unit `status:"complete"` is now authoritative for phases-shaped envelopes (it already is for the other two envelope shapes)? Could a stale/optimistic envelope now mask genuinely-pending work from `/pick-unit`?
2. CONSISTENCY: confirm the three envelope-shape branches (phases / flat / object-map) now treat unit `status`+`commits` identically. If not, name the divergence.
3. SILENT BREAKAGE: any path where `u.status` could be a non-string (number/object) and break the `??` chain or downstream `=== "complete"` comparison? Any envelope where `phase.units[]` entries are bare strings, not objects?
4. The downstream consumers — does anything write MILESTONE_PROGRESS-derived counts back into envelopes or roadmap-index in a way that could now loop/amplify?
5. Does the file have tests? If a `.test` file exists for it, does the fix need
... [+147 chars truncated]

### Assistant | 2026-05-22T16:48:53.141Z

I'll review the file and check for related tests.

### Assistant | 2026-05-22T16:48:53.622Z

[tool_use: Read]

### Assistant | 2026-05-22T16:48:53.767Z

[tool_use: Glob]

### User | 2026-05-22T16:49:04.489Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-milestone-progress.mjs' was already read 3s ago in this session and is unchanged (mtime 1779468491430). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-22T16:49:22.500Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-22T16:49:25.733Z

The file content isn't actually in my context — the read-once guard fired but I haven't seen the file this session. Let me read it and search for tests narrowly.

### Assistant | 2026-05-22T16:49:26.004Z

[tool_use: Read]

### Assistant | 2026-05-22T16:49:26.233Z

[tool_use: Glob]

### Assistant | 2026-05-22T16:49:26.416Z

[tool_use: Glob]

### User | 2026-05-22T16:49:35.714Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-milestone-progress.mjs' was already read 34s ago in this session and is unchanged (mtime 1779468491430). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-22T16:49:53.810Z

[tool_result] scripts\build-milestone-progress.test.mjs

### User | 2026-05-22T16:49:53.883Z

[tool_result] scripts\build-milestone-progress.test.mjs
scripts\build-milestone-progress.mjs

### Assistant | 2026-05-22T16:49:57.262Z

The read-once guard is blocking but the file is NOT in my context. Let me disable the cache and read the test file directly.

### Assistant | 2026-05-22T16:49:57.751Z

[tool_use: Bash]

### Assistant | 2026-05-22T16:49:57.943Z

[tool_use: Read]

### User | 2026-05-22T16:50:01.901Z

[tool_result] #!/usr/bin/env node
/**
 * build-milestone-progress.mjs
 *
 * Generates state/shared/MILESTONE_PROGRESS.md + .json — a delta surface
 * showing what's actually shipped per milestone vs what the milestone
 * envelope JSONs claim.
 *
 * Why: roadmap-index.json carries `status: "not_started"` for milestones
 * we've already shipped 5+ units of (e.g. XPROC-NEURAL-OPTIMIZE-MS0 has
 * U-NN-FIX
... [+21569 chars truncated]

### User | 2026-05-22T16:50:06.344Z

[tool_result] 1	/**
2	 * build-milestone-progress.test.mjs — joint-unit regex + expandCombinedIds
3	 *
4	 * Regression coverage for the silent-close-out class of bugs where ship
5	 * commits using joint subjects like `[INTEL-OLLAMA-OBSIDIAN-MS0]/P23-U01+U02`
6	 * failed to credit one or more of the joint units in MILESTONE_PROGRESS.json.
7	 *
8	 * Two failure modes are pinned here:
9	 *   1. The phase-style reg
... [+3774 chars truncated]

### Assistant | 2026-05-22T16:50:20.089Z

Review complete. I have the full file and the test file.

## Independent Second-Pass Review — `build-milestone-progress.mjs`

**1. INTEGRITY RISK (P1).** The trust model for the **phases branch is now WEAKER than the other two**. Lines ~178-192 (the phases `u` push) read `envelopeStatus: u.status ?? ...` — and `computeProgress` fallback (2) credits ANY unit with `envelopeStatus === "complete"` and empty `envelopeCommits` as shipped, source `envelope-status`. Phases-shaped envelopes are exactly the planner-authored shape most prone to optimistic `status:"complete"` set before commit. The +444 jump strongly suggests many of those new credits are `envelope-status` (no SHA, no git evidence) — `hit.sha:null`, `subject:"(envelope-asserted, no commit)"`. A stale envelope DOES now mask genuinely-pending work from `/pick-unit`. The other two shapes already carried this risk, but they are far less numerous than `phases[]` envelopes — so the change does not just "extend parity," it materially expands the blast radius. **Mitigation needed:** the JSON should expose a per-milestone `envelopeAssertedCount` (count of `source==="envelope-status"` units) so audit chats and `/pick-unit` can distinguish git-proven from envelope-claimed. Today both collapse into `shipped`.

**2. CONSISTENCY (PASS).** All three branches now set `envelopeStatus`/`envelopeCommits` from own fields, and the phases branch's Phase-B overlay enrichment is harmless (only fills nulls). Treatment is identical.

**3. SILENT BREAKAGE (P1).** No guard that `u.status` is a string. If a phase unit has `status: 1` or `status: {state:"done"}`, `envelopeStatus` becomes that non-string; fallback (2)'s `=== "complete"` simply yields false (safe), but a numeric/object value silently passes through `??` and could mislead future consumers. More concrete: **bare-string `phase.units[]` entries** — the phases branch does `if (u?.id)`, and a string `"P0-U01"` has no `.id`, so it's silently dropped (pre-existing, not a regression, 
... [+855 chars truncated]
