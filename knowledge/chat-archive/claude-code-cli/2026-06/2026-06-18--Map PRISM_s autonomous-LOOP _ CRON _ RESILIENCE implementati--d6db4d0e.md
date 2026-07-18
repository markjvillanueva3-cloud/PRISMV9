---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Map PRISM's autonomous-LOOP + CRON + RESILIENCE implementation. Read these files"
date: "2026-06-18"
first_ts: "2026-06-18T14:39:46.957Z"
last_ts: "2026-06-18T14:41:22.745Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 7
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-af0200471ca05d108.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Map PRISM's autonomous-LOOP + CRON + RESILIENCE implementation. Read these files

> **claude-code-cli** | 2026-06-18 | 15 msgs (7 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-af0200471ca05d108.jsonl`

## Transcript

### User | 2026-06-18T14:39:46.957Z

Map PRISM's autonomous-LOOP + CRON + RESILIENCE implementation. Read these files IN FULL at H:/prism:
- .claude/helpers/loop-state.mjs  (the /loop state machine: eval/decide/next)
- .claude/hooks/loop-iteration-inject.mjs  (UserPromptSubmit loop injector)
- .claude/hooks/stop-force-loop-continue.mjs  (Stop hook: forces loop continuation + re-block-storm breaker)
- .claude/hooks/precompact-auto-trigger.mjs  (auto-compaction trigger)
- scripts/zulu-build-loop.mjs  (the build-loop cron writer)
- .claude/scripts/consensus-queue-drain.mjs  (consensus queue drain)

For EACH file, document its role (1 line). Then list every GAP / weakness / missing-capability you can substantiate from the code, each with the file and a severity (P0/P1/P2/P3). Look specifically for: missing per-iteration VALUE/eval-gate, no convergence/exhaustion detection, fragile /compact resumption, no cron overlap-lock or health/failure alerting, no jitter/stagger across the 77 tasks, missing idempotency, stale-pointer regeneration, spiral detection limited to re-block-storm only, no cost-budget gate on the loop.

OUTPUT FORMAT (markdown, terse, no preamble):
## Components
- `<file>` -- <role>
## Gaps
- [P<n>] `<file>`: <gap, 1-2 lines, cite a function/line if you can>
Be precise and cite real code (function names). Do NOT propose fixes -- just map state + gaps.

### Assistant | 2026-06-18T14:39:50.606Z

I'll read all six files in parallel.

### Assistant | 2026-06-18T14:39:51.110Z

[tool_use: Read]

### Assistant | 2026-06-18T14:39:51.603Z

[tool_use: Read]

### Assistant | 2026-06-18T14:39:52.127Z

[tool_use: Read]

### Assistant | 2026-06-18T14:39:52.132Z

[tool_use: Read]

### Assistant | 2026-06-18T14:39:52.652Z

[tool_use: Read]

### User | 2026-06-18T14:39:52.692Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * loop-state.mjs — Per-session /loop iteration state helper.
4	 *
5	 * Why: `/loop` runs N iterations of a task. If a chat crashes mid-loop, the next
6	 * chat has no idea the loop was running. This helper persists iteration metadata
7	 * so /loop can resume cleanly + surface "you have a paused loop" warnings on /checkin.
8	 *
9	 * Layout: state/shared/loop-state/loo
... [+32063 chars truncated]

### Assistant | 2026-06-18T14:39:52.879Z

[tool_use: Read]

### User | 2026-06-18T14:39:53.132Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * loop-iteration-inject.mjs — UserPromptSubmit hook for /loop awareness.
5	 *
6	 * Fires when the user types `/loop` (with or without interval). Surfaces:
7	 *   - any paused/active loop state for this session (sessionId from stdin)
8	 *   - global list of running loops (so a chat doesn't accidentally start a 2nd)
9	 *   - reminder of Karpathy R10 (chec
... [+9560 chars truncated]

### User | 2026-06-18T14:39:53.854Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-force-loop-continue.mjs — AUTONOMOUS-FLEET-MS0/U-AF-STOP-FORCE-LOOP-CONTINUE
5	 *
6	 * Stop hook that detects an ACTIVE /loop falling off the rails mid-target,
7	 * and injects a RESUME_LOOP directive into the per-agent handoff so the next
8	 * SessionStart / /startup auto-continuation picks it up.
9	 *
10	 * Problem: when a chat is running /loop
... [+15439 chars truncated]

### User | 2026-06-18T14:39:54.240Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * precompact-auto-trigger.mjs — Enforce /precompact at 160K tokens.
5	 *
6	 * Goal:
7	 *   Claude runs with a 1M token context window (Opus 4.5). At 900K tokens we MUST run
8	 *   /precompact (writes the per-chat handoff so /startup can resume). The
9	 *   100K remaining buffer is writing-room for the handoff and for Claude's
10	 *   subsequent invocati
... [+29336 chars truncated]

### User | 2026-06-18T14:39:54.424Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * zulu-build-loop.mjs -- ZULU autonomous build-loop driver (slot:zulu, 2026-06-15,
4	 * U-ZULU-BUILDLOOP INCR 2). The cron-safe orchestration tick for "autonomous
5	 * continuous building".
6	 *
7	 * WHAT IT DOES each run:
8	 *   1. Reads the capability spec + bravo brief (the Obsidian/specs build-queue sources).
9	 *   2. Computes the ranked PENDING queue + next uni
... [+7220 chars truncated]

### User | 2026-06-18T14:39:54.483Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * consensus-queue-drain.mjs — drain the auto-fire consensus queue.
4	 *
5	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AUTO-FIRE.
6	 *
7	 * The hooks `auto-consensus-userprompt.mjs` and `auto-consensus-critical-edit.mjs`
8	 * both ENQUEUE pending consensus tasks instead of running consensus
9	 * inline (because consensus is 30-60s — too slow for any critical-pat
... [+15276 chars truncated]

### Assistant | 2026-06-18T14:41:22.745Z

## Components

- `H:/prism/.claude/helpers/loop-state.mjs` — Per-session /loop FSM: start/tick/read/end/next/narrate/list/reap; persists iteration metadata, eval scores, planning decisions, and auto-roll to next unit.
- `H:/prism/.claude/hooks/loop-iteration-inject.mjs` — UserPromptSubmit hook: surfaces active loop state + fleet loops + loop-discipline rules + stack advisor on every `/loop` prompt.
- `H:/prism/.claude/hooks/stop-force-loop-continue.mjs` — Stop hook: detects active loop (status=running, iter<target), appends RESUME_LOOP to handoff, optionally blocks Stop (PRISM_FORCE_LOOP_BLOCK=1) with stuck-detector and token-ceiling release.
- `H:/prism/.claude/hooks/precompact-auto-trigger.mjs` — PreToolUse hook: soft-injects at 880K tokens and hard-blocks at 940K tokens to force handoff authoring before native autocompact at 950K.
- `H:/prism/scripts/zulu-build-loop.mjs` — Cron-safe read-only driver: ranks pending capability units from a spec file, Ollama-summarizes the next unit, writes an atomic `zulu-build-loop-next.json` pointer for a gated builder chat; never builds or commits.
- `H:/prism/.claude/scripts/consensus-queue-drain.mjs` — Stop-hook drain: atomically claims entries from `consensus-queue.jsonl` under `exclusive-file-lock.mjs`, runs local-only (qwen2.5-coder:32b + gpt-oss:20b) consensus via `MultiModelConsensusEngine.ask()`, appends to processed audit log.

---

## Gaps

**loop-state.mjs**

- [P1] `loop-state.mjs:cmdTick` — No per-iteration VALUE eval gate is enforced by the helper itself; `evalScore` is stored but `cmdTick` never blocks or warns when a score falls below `EVAL_PASS_THRESHOLD`. The gate lives only in `decidePlanningAction` called from `cmdNext`, which fires only on roll — a loop with `target=1e9` and no explicit `next` call accumulates unlimited failing iters with zero gate action.
- [P1] `loop-state.mjs:cmdNext / deriveLoopSignals` — `budgetRemaining` collapses to `Infinity` when `target === 0` (line 132: `target > 0 ? target - iter
... [+10123 chars truncated]
