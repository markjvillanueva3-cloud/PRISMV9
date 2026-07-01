---
type: "chat-session"
source: "claude-code-cli"
session_id: "f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de"
title: "PRISM rails: NEVER stub/placeholder. Real reference-value tests (no toBeDefined)"
date: "2026-06-14"
first_ts: "2026-06-14T16:03:05.953Z"
last_ts: "2026-06-14T16:07:09.828Z"
cwd: "H:\\PRISM"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de/subagents/workflows/wf_56d5d401-adb/agent-ac879c03c976c56be.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# PRISM rails: NEVER stub/placeholder. Real reference-value tests (no toBeDefined)

> **claude-code-cli** | 2026-06-14 | 20 msgs (8 user / 12 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de/subagents/workflows/wf_56d5d401-adb/agent-ac879c03c976c56be.jsonl`

## Transcript

### User | 2026-06-14T16:03:05.953Z

PRISM rails: NEVER stub/placeholder. Real reference-value tests (no toBeDefined). Wire to ALL consumers in same commit (R15). Fail-loud (R12). These are LIVE FLEET-WIDE hooks firing on every UserPromptSubmit/PreToolUse across 26 chat slots -- a bad edit degrades the whole fleet. Blast radius is paramount. Read the named files END-TO-END before designing (R8). Glob-confirm every path you cite. Do NOT fabricate file:line -- if unverified, say so. The offload substrate is FREE local Ollama (13 models up: gpt-oss:120b/qwen2.5-coder:32b/qwen2.5vl:32b). ask-ollama.mjs is the single-shot client; ask-hermes.mjs the agentic one.

TASK: #3 Hermes rung in the offload ladder

Design inserting Hermes (free-local agentic loop) as the agentic-offload / Sonnet-tier rung in `scripts/lib/task-substrate-router.mjs`. Read that router end-to-end + `scripts/ask-hermes.mjs` + `scripts/ask-ollama.mjs`. The router test pins substrates ["ollama","obsidian","hermes","master-graph","psn"] and hermes only when hermesGated. Distinguish Hermes (multi-step agentic mechanical) from Ollama (single-shot). Design the routing rule: which task classes -> Hermes vs Ollama vs escalate to Sonnet/Opus. Preserve the existing test shape (string-only edits where possible). Specify exact edits, fallback when the Hermes proxy is down (degrade ollama->sonnet), test cases, wiring, done-signal.

Return a complete, surgical implementation blueprint. Ground every cited path/line in an actual read.

### Assistant | 2026-06-14T16:03:13.091Z

I'll read the relevant files end-to-end before designing anything.

### Assistant | 2026-06-14T16:03:13.092Z

[tool_use: Read]

### User | 2026-06-14T16:03:38.121Z

[tool_result] 1	// RGS-PLANNING-LOOP-BRIDGE-MS0/U2 (2026-06-11, slot:tango)
2	// Per-task substrate-routing matrix: given a task + phase + context, decide the
3	// PRIMARY executor and emit the 5-substrate plan (Ollama / Obsidian / Hermes /
4	// Master-graph / PSN) with when/how/max-out for each. The "max out their
5	// capabilities" answer (U-SPEC-V2 section 4), made deterministic + testable.
6	//
7	// DEDUP: 
... [+6197 chars truncated]

### Assistant | 2026-06-14T16:03:43.292Z

Now let me read the other two files in parallel.

### Assistant | 2026-06-14T16:03:43.677Z

[tool_use: Read]

### Assistant | 2026-06-14T16:03:43.856Z

[tool_use: Read]

### User | 2026-06-14T16:04:20.329Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+51768 chars truncated]

### User | 2026-06-14T16:04:20.508Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-hermes.mjs -- PRISM bridge to the local Hermes OpenAI-compatible proxy
4	 * (HERMES-BRIDGE-MS0/U-ASK-HERMES).
5	 *
6	 * Hermes (Nous) exposes `hermes proxy start` -- a local HTTP server that speaks
7	 * the OpenAI /v1 protocol and forwards to an OAuth-authenticated upstream
8	 * (xAI Grok / Nous Portal), attaching the user's real managed credential. This
9	 * s
... [+13674 chars truncated]

### Assistant | 2026-06-14T16:04:25.346Z

Now let me read the existing test file and the hermes-workflow-planner to understand the test shape and the hermesGated gate contract.

### Assistant | 2026-06-14T16:04:26.412Z

[tool_use: Glob]

### Assistant | 2026-06-14T16:04:26.568Z

[tool_use: Read]

### User | 2026-06-14T16:05:02.037Z

[tool_result] 1	// scripts/lib/hermes-workflow-planner.mjs
2	//
3	// Hermes Dynamic-Workflow Planner — the "coder brain" that makes Hermes (the
4	// PRISM fleet orchestrator) behave like a skilled Claude Code coder who reaches
5	// for Dynamic Workflows instead of hand-chaining 50 prompts.
6	//
7	// Source doctrine: 0xCodez, "How to master Dynamic Workflows in Claude Code:
8	// 6 patterns and 14 steps Anthropic
... [+37612 chars truncated]

### User | 2026-06-14T16:05:06.437Z

[tool_result] scripts\lib\task-substrate-router.test.mjs
scripts\lib\task-substrate-router.mjs

### Assistant | 2026-06-14T16:05:11.980Z

Now read the existing test file end-to-end.

### Assistant | 2026-06-14T16:05:12.594Z

[tool_use: Read]

### User | 2026-06-14T16:05:41.640Z

[tool_result] 1	// Tests for task-substrate-router.mjs (U2). Real values; every assertion fails on
2	// a real routing regression (R9). routeTask is pure (its deps are pure imports).
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import { routeTask } from "./task-substrate-router.mjs";
6	import { routeForgePhase, forgeConcurrencyCap } from "./forge-route.mjs";
7	
8	const names 
... [+2941 chars truncated]

### Assistant | 2026-06-14T16:05:46.048Z

I now have everything I need. All files are read end-to-end. Let me assemble the complete blueprint.

### Assistant | 2026-06-14T16:07:03.158Z

[tool_use: StructuredOutput]

### User | 2026-06-14T16:07:09.828Z

[tool_result] Structured output provided successfully
