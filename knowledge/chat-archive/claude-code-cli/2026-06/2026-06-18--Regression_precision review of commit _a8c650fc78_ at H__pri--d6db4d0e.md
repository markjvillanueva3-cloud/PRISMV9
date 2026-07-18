---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Regression/precision review of commit `a8c650fc78` at H:/prism: `cd /h/prism && "
date: "2026-06-18"
first_ts: "2026-06-18T13:34:30.489Z"
last_ts: "2026-06-18T13:35:43.981Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a409078c85845608d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Regression/precision review of commit `a8c650fc78` at H:/prism: `cd /h/prism && 

> **claude-code-cli** | 2026-06-18 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a409078c85845608d.jsonl`

## Transcript

### User | 2026-06-18T13:34:30.489Z

Regression/precision review of commit `a8c650fc78` at H:/prism: `cd /h/prism && git show a8c650fc78` (rtk git show) + Read scripts/lib/zulu-build-queue.mjs + its test fully.

CONTEXT: `parseShippedFromCommits` is read by the fleet-wide PRISM Zulu Build Loop cron (scripts/zulu-build-loop.mjs -> buildQueueFromTexts) to decide which capability units are shipped (so the loop doesn't re-drive built work). The fix adds detection of the `[HERMES-CAPABILITY-C<n>]` commit scope.

HUNT FOR (cite file:line):
1. FALSE-POSITIVE RISK: could the new `/HERMES-CAPABILITY-C(\d+)\b/gi` over-match? Consider commit subjects mentioning "HERMES-CAPABILITY" in prose, or the spec scope `[HERMES-CAPABILITY-EXPANSION]` (note: the existing test line ~178 has `[HERMES-CAPABILITY-EXPANSION]/U-ZULU-CAP-C1C2C3` -- does the new branch double-count or mis-extract there? `EXPANSION` has no `-C<digit>` so it should NOT match -- VERIFY).
2. CONFLATION: the detector now returns C1-C8 on the live log because the engines shipped under U-ZBL-C1-C8 AND C1-C5 wired under HERMES-CAPABILITY. Is the UNION semantics correct (a C-id shipped under EITHER format = shipped)? Any double-add bug (Set dedupes, so no)?
3. REGRESSION: confirm the U-ZBL / U-ZULU-CAP / combined-form / revert-guard / adversarial (empty/null/no-marker/casual-prose) behaviors are byte-unchanged.
4. The fix's effect on the live pointer: the cron now writes drained=true done=8 (verified live). Is that a HONEST outcome given C6-C8 engines exist (U-ZBL) but their wiring is spec-deferred? (The commit msg notes 'shipped'=engine-built, wiring-status tracked in handoff -- assess whether that scoping is defensible or a silent-completeness trap.)

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines (file:line), then <=4 notes.

### Assistant | 2026-06-18T13:34:34.585Z

I'll investigate commit `a8c650fc78` and the build-queue logic.

### Assistant | 2026-06-18T13:34:35.333Z

[tool_use: Bash]

### Assistant | 2026-06-18T13:34:35.520Z

[tool_use: Read]

### User | 2026-06-18T13:34:38.333Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\zulu-build-queue.mjs' was already read 4s ago in this session and is unchanged (mtime 1781789306365). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T13:34:43.453Z

[tool_result] commit a8c650fc7891ac820d9c643dd865b1728834e24f
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 08:32:38 2026 -0500

    [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-DETECT-HERMES-FORMAT (slot:bravo): build-loop shipped-detection recognizes the [HERMES-CAPABILITY-C<n>] commit format
    
    parseShippedFromCommits (scripts/lib/zulu-build-queue.mjs) recognized only U-ZBL-C<n>
... [+12360 chars truncated]

### Assistant | 2026-06-18T13:34:47.145Z

The diff is fully in context. Let me read the actual file end-to-end to verify the live code matches the diff and check the surrounding functions (`parseCapabilitySpec`, `parseShipped`, `computeQueue`) for integration coupling, plus trace the cron consumer.

### Assistant | 2026-06-18T13:34:47.621Z

[tool_use: Read]

### Assistant | 2026-06-18T13:34:48.810Z

[tool_use: Grep]

### User | 2026-06-18T13:34:49.341Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * zulu-build-queue.mjs -- pure build-queue reader/selector for the ZULU autonomous
4	 * build-loop orchestrator (slot:zulu, 2026-06-15, U-ZULU-BUILDLOOP INCR 1).
5	 *
6	 * WHY: the operator wants "autonomous continuous building". The build-loop driver
7	 * (INCR 2) needs to know WHAT to build next. This is the verifiable pure core (R13):
8	 * given the capability spe
... [+8439 chars truncated]

### User | 2026-06-18T13:34:50.444Z

[tool_result] scripts\lib\zulu-build-queue.mjs:103:export function parseShippedFromCommits(gitLogText) {
scripts\lib\zulu-build-queue.mjs:104:  const text = String(gitLogText || "");
scripts\lib\zulu-build-queue.mjs:157: * reality-grounded git-commit signal (parseShippedFromCommits over opts.gitLogText, when
scripts\lib\zulu-build-queue.mjs:159: * queue as pending. opts.gitLogText is optional; omit it for the l
... [+4397 chars truncated]

### Assistant | 2026-06-18T13:34:54.500Z

Now let me verify the cron consumer — how `readShippedCommitsText()` produces the git log text (`--oneline` shape, depth) and how `done`/`drained` are written — since the revert-guard regex and the live `done=8` honesty claim both depend on the exact input shape.

### Assistant | 2026-06-18T13:34:55.367Z

[tool_use: Read]

### User | 2026-06-18T13:34:56.197Z

[tool_result] 80	    blocked: (queue.blocked || []).map((c) => c.id),
81	    blockedCount: (queue.blocked || []).length,
82	    note: next
83	      ? `Next GATED build for bravo: ${next.id} ${next.title} (effort ${next.effort || "?"}). Pick up via /checkin-bravo /loop -- comprehensive-build floor + per-unit 3-of-3 scrutiny; NEVER auto-commit unreviewed.`
84	      : "Build queue DRAINED -- all non-gated capabili
... [+2901 chars truncated]

### Assistant | 2026-06-18T13:34:58.751Z

Let me read `readShippedCommitsText()` to confirm the exact git log shape (hash prefix, depth, oneline) the revert-guard regex relies on.

### Assistant | 2026-06-18T13:34:59.473Z

[tool_use: Read]

### User | 2026-06-18T13:35:00.534Z

[tool_result] 30	import { fileURLToPath } from "node:url";
31	import { buildQueueFromTexts } from "./lib/zulu-build-queue.mjs";
32	
33	const ROOT = process.env.PRISM_ROOT || "H:/prism";
34	const SPEC_PATH = process.env.PRISM_ZBL_SPEC || path.join(ROOT, "state/shared/specs/HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-15.md");
35	const BRIEF_PATH = process.env.PRISM_ZBL_BRIEF || path.join(ROOT, "state/shared/sl
... [+2218 chars truncated]

### Assistant | 2026-06-18T13:35:11.631Z

I now have full visibility. Let me verify the four hunt items by tracing each regex against the real input shape.

The git log feed is `git log --oneline -400`, so every line is `<hash> <subject>`. This confirms the revert-guard anchor (`^\S+\s+revert\b`) matches the `<hash> Revert ...` shape correctly.

Let me check the one precision risk the prompt flagged: the spec scope `[HERMES-CAPABILITY-EXPANSION]` and whether `HERMES-CAPABILITY-C(\d+)` can ever mis-fire on it.

The regex `/HERMES-CAPABILITY-C(\d+)\b/gi` requires `-C` immediately followed by a digit. `[HERMES-CAPABILITY-EXPANSION]` has `-E`, so no match — correct. But there is a subtle edge: the combined-ship commit in the test fixture and live log is `[HERMES-CAPABILITY-EXPANSION]/U-ZULU-CAP-C1C2C3-HERMETIC`. Let me confirm that line is handled by the U-ZULU-CAP branch (not the HERMES branch) and produces C1,C2,C3 with no double-count and no false C-id from "EXPANSION". The U-ZULU-CAP branch matches `U-ZULU-CAP-C1C2C3` → C1,C2,C3; the HERMES branch finds no `-C<digit>` in `HERMES-CAPABILITY-EXPANSION`. Set dedupes anyway. Verified.

Now the one genuine concern I want to nail down: the revert-guard interaction with `git log --oneline` wrapping. With `--oneline` there is no line-wrapping (each commit is exactly one line), so a multi-line body cannot leak. Confirmed by the consumer at line 52.

Let me also confirm there's no other consumer of `parseShipped`/`buildQueueFromTexts` that the signature change could silently break.

### Assistant | 2026-06-18T13:35:12.158Z

[tool_use: Grep]

### User | 2026-06-18T13:35:16.988Z

[tool_result] Found 26 files
mcp-server\data\state\session-file-ownership.json
state\shared\dashboards\injection-dedup-cache.json
knowledge\memories\reference\reference_zulu_parseshipped_prose_miscount_fix_2026_06_15.md
knowledge\memories\reference\reference_zulu_build_cron_git_grounded_2026_06_16.md
knowledge\memories\reference\reference_romeo_triage_ctor_parse_fix_2026_06_17.md
knowledge\memories\reference\re
... [+1310 chars truncated]

### Assistant | 2026-06-18T13:35:43.981Z

The only code consumers of `zulu-build-queue.mjs` are `scripts/zulu-build-loop.mjs` (the cron) and its test. The rest are docs/memories/state. The `buildQueueFromTexts` signature change is purely additive (new optional `opts.gitLogText`), and the sole caller already passes it. No silent break in the blast radius.

I have everything needed to render the verdict.

VERDICT: PASS

summary: The new `parseShippedFromCommits` branch is correctly anchored to the `HERMES-CAPABILITY-C<digit>` scope, so it cannot over-match the spec scope `[HERMES-CAPABILITY-EXPANSION]` (no `-C<digit>`) nor a bare `U-C<n>` from another galaxy; UNION semantics via `Set` dedupe cleanly, and the U-ZBL/U-ZULU-CAP/revert-guard/adversarial paths are byte-unchanged. The change to `buildQueueFromTexts` is purely additive (optional `opts.gitLogText`) and the only code consumer (the cron) already passes it, so there is no un-updated caller. The `done=8` live outcome is honest at the function's documented contract (engine-built), though it conflates build with wiring at the directive layer (P2, below).

BLOCKER: none.

notes:
1. [P2 — honesty/completeness scoping, not a code bug] `scripts/lib/zulu-build-queue.mjs:103` + `scripts/zulu-build-loop.mjs:130` — "shipped/done" means *engine-built* (a `U-ZBL-C<n>` commit landed), NOT *wired*. C6-C8 engines exist but their wiring is spec-deferred per the commit message, yet the cron writes `drained=true done=8` and the directive note reads "all non-gated capability units shipped" (`zulu-build-loop.mjs:84`). This is a defensible scoping ONLY because the unit of the build-loop is "build the engine, scrutiny+wiring happens in the gated bravo `/loop` pickup" (note at `zulu-build-loop.mjs:83` says builds are GATED, never auto-committed). The residual trap: a future reader of `zulu-build-loop-next.json` sees `drained` and may conclude C6-C8 are fully delivered. The commit honestly flags this in its body; no silent over-claim in the code. Acceptable, but the divergence 
... [+2334 chars truncated]
