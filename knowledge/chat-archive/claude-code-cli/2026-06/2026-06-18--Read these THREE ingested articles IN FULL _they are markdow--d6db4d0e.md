---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Read these THREE ingested articles IN FULL (they are markdown at H:/prism): 1. s"
date: "2026-06-18"
first_ts: "2026-06-18T14:39:32.781Z"
last_ts: "2026-06-18T14:41:06.483Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a19f4a85cf25e45ba.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Read these THREE ingested articles IN FULL (they are markdown at H:/prism): 1. s

> **claude-code-cli** | 2026-06-18 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a19f4a85cf25e45ba.jsonl`

## Transcript

### User | 2026-06-18T14:39:32.781Z

Read these THREE ingested articles IN FULL (they are markdown at H:/prism):
1. state/shared/articles/2026-06-09-anthropic-harness-dynamic-workflows.md  (harnesses + dynamic workflows)
2. state/shared/articles/2026-06-10-addy-osmani-loop-engineering.md  (loop engineering)
3. state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md  (the canonical agent loop)

Extract EVERY concrete, actionable principle / recommendation / pattern about HARNESSES and AGENTIC LOOPS (loop design, iteration, convergence, eval-gating, stop conditions, context management, verification, dynamic tool/workflow dispatch).

PRISM context (so you map each principle to a real upgrade target): PRISM has an autonomous /loop driven by `.claude/helpers/loop-state.mjs` + a `loop-iteration-inject.mjs` UserPromptSubmit hook, a `stop-force-loop-continue.mjs` Stop hook (forces loop continuation + has a re-block-storm breaker), a `precompact-auto-trigger.mjs` hook (auto-compaction at token thresholds), and the `zulu-build-loop` cron.

OUTPUT FORMAT (markdown, terse, no preamble): a numbered list. Each item:
`N. [harness|loop] PRINCIPLE: <the principle, 1 line> -> PRISM: <which PRISM file/subsystem it could upgrade + how, 1 line> [concreteness: high|med|low]`
Only include items with a REAL PRISM application. Be exhaustive. Do NOT summarize the articles narratively -- just the actionable principle list.

### Assistant | 2026-06-18T14:39:43.431Z

I'll read all three articles in parallel to extract the principles.

### Assistant | 2026-06-18T14:39:43.956Z

[tool_use: Read]

### Assistant | 2026-06-18T14:39:44.342Z

[tool_use: Read]

### Assistant | 2026-06-18T14:39:44.785Z

[tool_use: Read]

### User | 2026-06-18T14:39:44.852Z

[tool_result] 1	# A Harness for Every Task: Dynamic Workflows in Claude Code
2	Source (canonical): https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code
3	Also posted: https://x.com/trq212/article/2061907337154367865 (Thariq Shihipar + Sid Bidasaria, Anthropic, 2026-06-02)
4	Captured: 2026-06-09 via claude.com mirror (X version login-walled) — zulu slot
5	
6	## Core concept
7	Claude 
... [+2622 chars truncated]

### User | 2026-06-18T14:39:45.383Z

[tool_result] 1	---
2	source: https://x.com/addyosmani/status/2064127981161959567
3	author: Addy Osmani (@addyosmani)
4	title: Loop Engineering
5	captured: 2026-06-10
6	captured_by: slot:zulu (claude-4b1bbdf2) via playwright
7	topics: [agentic-coding, loops, harness, sub-agents, skills, worktrees, memory, connectors]
8	prism_relevance: KEYSTONE — names every PRISM loop primitive 1:1 and the 3 failure modes
9	--
... [+17643 chars truncated]

### User | 2026-06-18T14:39:45.792Z

[tool_result] 1	# Boris Loop + Agent Doctrine for PRISM
2	
3	**Author:** claude-cee63f1f (synthesizing Boris Cherny's published Claude Code workflow + cyrilXBT/Thariq/darkzodchi/Ashwin/Akshay articles + Karpathy discipline)
4	**Date:** 2026-05-09
5	**Purpose:** Canonical reference embedded into `/forge*` and `/forge-audit*` so every PRISM build run uses loops as the **primary product-shipping mechanism**, not a
... [+18633 chars truncated]

### Assistant | 2026-06-18T14:41:06.483Z

1. [harness] PRINCIPLE: Isolated context windows per subagent prevent goal drift and self-preferential bias -> PRISM: most subagents in forge-team/pipeline-team share the parent tree context; add `isolation: worktree` as default on any subagent touching >2 files (`.claude/agents/*.md` + forge7 Phase 4 default) [concreteness: high]

2. [harness] PRINCIPLE: Adversarial verification requires INDEPENDENT agents — the maker must never grade its own output -> PRISM: per-file 2-arm scrutiny already uses 2 Claude agents, but arm B prompt says "don't assume A caught everything" — verify arm B has genuinely different weighting and receives no arm-A output before forming its verdict (`.claude/scripts/scrutiny-3way.mjs` prompt injection) [concreteness: high]

3. [harness] PRINCIPLE: Workflows must journal agent() calls so interrupted runs RESUME from last completed step, not restart from zero -> PRISM: `loop-state.mjs` tracks position but does NOT journal individual subagent completions — a mid-loop crash restarts the current tick; add per-tick subagent completion ledger to `loop-state.json` [concreteness: high]

4. [harness] PRINCIPLE: "Loop until done" pattern — keep spawning agents until a VERIFIABLE stop condition holds, checked by a SEPARATE model from the one that did the work -> PRISM: `stop-force-loop-continue.mjs` forces continuation but the done-check is self-assessed; wire a lightweight haiku/sonnet verifier subagent that evaluates the stop condition independently before allowing the loop to exit [concreteness: high]

5. [harness] PRINCIPLE: Classify-and-act — a classifier agent routes tasks to type-specific agents rather than one generalist handling everything -> PRISM: `loop-iteration-inject.mjs` injects the next unit as raw text; upgrade to dispatch a classifier pass first that selects the right subagent type (coder/dispatcher-wirer/physics-reviewer/test-runner) based on unit type before handing off [concreteness: high]

6. [harness] PRINCIPLE: Fan-out-and-synthes
... [+10566 chars truncated]
