---
type: "chat-session"
source: "claude-code-cli"
session_id: "5378a15b-ade4-4ecb-9cb2-45f2dfeea317"
title: "Map PRISM's OLLAMA / local-GPU OFFLOAD infrastructure and define its CORRECT rol"
date: "2026-06-12"
first_ts: "2026-06-12T17:03:59.322Z"
last_ts: "2026-06-12T17:10:17.116Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 51
user_msgs: 22
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism-slot-oscar/5378a15b-ade4-4ecb-9cb2-45f2dfeea317/subagents/workflows/wf_08d5780c-1fa/agent-ad17ff8d6adce9aca.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Map PRISM's OLLAMA / local-GPU OFFLOAD infrastructure and define its CORRECT rol

> **claude-code-cli** | 2026-06-12 | 51 msgs (22 user / 29 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/5378a15b-ade4-4ecb-9cb2-45f2dfeea317/subagents/workflows/wf_08d5780c-1fa/agent-ad17ff8d6adce9aca.jsonl`

## Transcript

### User | 2026-06-12T17:03:59.322Z

Map PRISM's OLLAMA / local-GPU OFFLOAD infrastructure and define its CORRECT role for SFC fine-tuning. Read in H:/prism-slot-oscar/mcp-server and H:/prism-slot-oscar: scripts/ask-ollama.mjs, scripts/lib/ollama-verified-offload.mjs (verifiedOffload run/verify/fallback), any ollama-fanout script, scripts/lib/galaxy-reasoning-bridge.mjs. Establish the Blackwell model roster (qwen2.5-coder:32b heavy code, gpt-oss:120b deep reasoning, gpt-oss:20b mid, :1.5b trivial) and the verified-offload keystone (model proposes, CODE verifies, fail-safe fallback). CRITICAL CONSTRAINT to encode: Ollama must NOT compute physics (deterministic TS does that on CPU); its legitimate roles are (a) triage/cluster millions of divergence rows, (b) deep-reason WHY a formula diverges, (c) classify vendor catalog rows, (d) PROPOSE candidate constant/formula corrections that MUST pass deterministic re-check + physics-reviewer before any change. What offload primitives are reusable, what's missing. Cite file:line.

### Assistant | 2026-06-12T17:04:03.530Z

I'll systematically read the relevant files to map PRISM's Ollama/local-GPU offload infrastructure.

### Assistant | 2026-06-12T17:04:04.523Z

[tool_use: Bash]

### Assistant | 2026-06-12T17:04:04.635Z

[tool_use: Glob]

### User | 2026-06-12T17:04:07.825Z

[tool_result] H:\prism-slot-oscar\.claude\commands\ollama-route-check.md
H:\prism-slot-oscar\.claude\commands\ollama-architecture-plan.md
H:\prism-slot-oscar\.claude\commands\ollama-bridge.md
H:\prism-slot-oscar\.claude\hooks\__tests__\ollama-cost-router.test.mjs
H:\prism-slot-oscar\.claude\hooks\__tests__\ollama-route-pretooluse.test.mjs
H:\prism-slot-oscar\.claude\hooks\__tests__\ollama-task-offloader-autoexe
... [+7318 chars truncated]

### User | 2026-06-12T17:04:27.282Z

[tool_result] add-ollama-skill-policy-frontmatter.mjs*
add-ollama-skill-policy-frontmatter.test.mjs
ask-ollama-fallback.test.mjs
ask-ollama.mjs*
drift-close-iollama-session.mjs
ollama-docker-health.mjs*
ollama-hook-fire-audit.mjs*
ollama-hook-fire-audit.test.mjs
ollama-l3-agent.mjs*
ollama-l3-agent.test.mjs
ollama-offload-dashboard.mjs*
ollama-prism-bridge.mjs*
summarize-all-scripts-via-ollama.mjs*

### Assistant | 2026-06-12T17:04:29.574Z

Let me read the key files in parallel.

### Assistant | 2026-06-12T17:04:30.069Z

[tool_use: Read]

### Assistant | 2026-06-12T17:04:30.996Z

[tool_use: Glob]

### Assistant | 2026-06-12T17:04:31.417Z

[tool_use: Glob]

### User | 2026-06-12T17:04:33.009Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+27574 chars truncated]

### User | 2026-06-12T17:04:33.384Z

[tool_result] No files found

### User | 2026-06-12T17:04:33.994Z

[tool_result] No files found

### Assistant | 2026-06-12T17:04:38.685Z

The verified-offload lib exists. Let me read it and the galaxy-reasoning bridge, plus check for fanout scripts.

### Assistant | 2026-06-12T17:04:39.680Z

[tool_use: Glob]

### Assistant | 2026-06-12T17:04:40.201Z

[tool_use: Glob]

### Assistant | 2026-06-12T17:04:40.543Z

[tool_use: Glob]

### User | 2026-06-12T17:04:48.962Z

[tool_result] No files found

### User | 2026-06-12T17:04:48.995Z

[tool_result] No files found

### User | 2026-06-12T17:04:49.010Z

[tool_result] No files found

### Assistant | 2026-06-12T17:04:51.754Z

[tool_use: Glob]

### Assistant | 2026-06-12T17:04:51.986Z

[tool_use: Glob]

### User | 2026-06-12T17:05:00.287Z

[tool_result] No files found

### User | 2026-06-12T17:05:00.344Z

[tool_result] No files found

### Assistant | 2026-06-12T17:05:02.528Z

Let me check where the lib files actually live in this worktree.

### Assistant | 2026-06-12T17:05:03.622Z

[tool_use: Bash]

### User | 2026-06-12T17:06:06.849Z

[tool_result] INDEX_TEMPLATE.js
MODULE_TEMPLATE.js
__fixtures__/
__tests__/
_archive/
_fix_ref_hb.js
_prism_paths.py
_restore-3-critical-hooks.mjs*
_restore-continuity-hooks.mjs*
_wire-hook.mjs*
_wire-stop-regression-bundle.mjs*
adapt-router-thresholds.mjs*
add-ollama-skill-policy-frontmatter.mjs*
add-ollama-skill-policy-frontmatter.test.mjs
add-parent-contains-edges.mjs*
add_atcs_renames.js
adv_audit.js
agents
... [+27126 chars truncated]

### Assistant | 2026-06-12T17:06:11.820Z

The `ollama-verified-offload` lib is in the system-viz graph as `scriptlib.ollama-verified-offload` but not yet on disk. Let me now read the key existing files in parallel.

### Assistant | 2026-06-12T17:06:12.737Z

[tool_use: Read]

### Assistant | 2026-06-12T17:06:13.767Z

[tool_use: Read]

### Assistant | 2026-06-12T17:06:13.939Z

[tool_use: Read]

### User | 2026-06-12T17:06:21.456Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1140 of 1888 total (35190 tokens, cap 25000). Call Read with offset=1141 limit=1140 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	#!/usr/bin/env node
2	/**
3	 * ollama-prism-bridge.mjs — Ollama → PRISM agentic harness (OLLAMA-EXPAND
... [+55490 chars truncated]

### User | 2026-06-12T17:06:21.717Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-l3-agent.mjs — U-OE-L3 (OLLAMA-EXPAND-MS0 L3 layer)
4	 *
5	 * Sustained multi-step agent loop built on top of L2 (`runAgentLoop` in
6	 * `scripts/ollama-prism-bridge.mjs`). Where L2 runs a single
7	 * question-to-answer round-trip with tool calls, L3 wraps that into a
8	 * goal-oriented loop:
9	 *
10	 *   - Take a high-level GOAL (e.g. "summarize the recent 
... [+10724 chars truncated]

### User | 2026-06-12T17:06:21.848Z

[tool_result] 1	// tier: T4
2	/**
3	 * ollama-hook-bridge.mjs
4	 * Shared helper for hooks to call local Ollama with fast timeout and graceful fallback.
5	 *
6	 * Usage:
7	 *   import { queryOllama, isOllamaAvailable } from './lib/ollama-hook-bridge.mjs';
8	 *   const result = await queryOllama(prompt, { hookType: 'grep_index', timeoutMs: 300 });
9	 *   if (result.success) { use result.response } else { use reg
... [+6877 chars truncated]

### Assistant | 2026-06-12T17:06:27.982Z

Now I have enough. Let me also check the spec for ollama-verified-offload and the feedback on token routing, plus the SFC-specific hook.

### Assistant | 2026-06-12T17:06:28.523Z

[tool_use: Read]

### Assistant | 2026-06-12T17:06:29.585Z

[tool_use: Glob]

### Assistant | 2026-06-12T17:06:30.103Z

[tool_use: Read]

### User | 2026-06-12T17:06:33.603Z

[tool_result] 1	---
2	name: Ollama/qwen reroutes cost-heavy work to save Claude tokens
3	description: PRISM uses local Ollama (qwen2.5-coder:7b) to reroute tool calls, hook injections, and routine LLM tasks away from Claude API tokens. Always prefer Ollama for tasks that don't need Claude-class reasoning.
4	type: feedback
5	originSessionId: 9c056864-b507-4e43-9c29-e96467819e74
6	---
7	User explicitly stated (20
... [+2479 chars truncated]

### User | 2026-06-12T17:06:33.788Z

[tool_result] No files found

### User | 2026-06-12T17:06:34.245Z

[tool_result] 1	# Speed-Feed (SFC) Galaxy MEMORY.md — OSCAR slot per-domain working brain
2	
3	> Append-only · pointer-style · ≤140 chars/entry. Older entries archive to MEMORY-ARCHIVE.md.
4	> Clone of `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha-owned canonical) — fine-tuned for SFC; brain wiring NOT re-derived.
5	
6	## Master-brain link
7	- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H
... [+11287 chars truncated]

### Assistant | 2026-06-12T17:06:38.162Z

Now I have sufficient coverage to produce the structured output. Let me check the ollama-verified-offload spec and the hook bridge one more time for the model roster.

### Assistant | 2026-06-12T17:06:39.111Z

[tool_use: Read]

### Assistant | 2026-06-12T17:06:39.823Z

[tool_use: Glob]

### User | 2026-06-12T17:06:48.869Z

[tool_result] No files found

### User | 2026-06-12T17:06:49.624Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+4932 chars truncated]

### Assistant | 2026-06-12T17:06:52.741Z

I now have everything needed to produce the structured output.

### Assistant | 2026-06-12T17:08:44.452Z

[tool_use: StructuredOutput]

### User | 2026-06-12T17:08:46.196Z

[tool_result] Output does not match required schema: /reusable_building_blocks: must be array

### Assistant | 2026-06-12T17:10:11.639Z

[tool_use: StructuredOutput]

### User | 2026-06-12T17:10:17.116Z

[tool_result] Structured output provided successfully
