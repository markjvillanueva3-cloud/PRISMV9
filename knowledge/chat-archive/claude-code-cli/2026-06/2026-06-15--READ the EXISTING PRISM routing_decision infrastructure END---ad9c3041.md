---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "READ the EXISTING PRISM routing/decision infrastructure END-TO-END so a synthesi"
date: "2026-06-15"
first_ts: "2026-06-15T05:45:16.439Z"
last_ts: "2026-06-15T05:49:47.551Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 11
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a1a73cf80191a931e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# READ the EXISTING PRISM routing/decision infrastructure END-TO-END so a synthesi

> **claude-code-cli** | 2026-06-15 | 24 msgs (11 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a1a73cf80191a931e.jsonl`

## Transcript

### User | 2026-06-15T05:45:16.439Z

READ the EXISTING PRISM routing/decision infrastructure END-TO-END so a synthesizer can COMPOSE them into ONE unified decision graph WITHOUT duplicating (R7/R8 — the operator's "graph to follow" must build ON these, not rebuild them).

Read each file fully:
- scripts/lib/task-substrate-router.mjs
- scripts/lib/cag-router.mjs
- scripts/lib/loop-goal-stack-advisor.mjs
- .claude/hooks/skill-auto-trigger.mjs
- .claude/hooks/model-tier-advisor.mjs (and any scripts/lib/model-routing-policy*.mjs it imports)
- the aiSystemRouterEngine (grep mcp-server/src/engines/ for the filename, then read it)

For EACH: file, role (1 line), inputs (what it keys its decision on), decides (the routing decision it emits), exportedApi (the EXACT exported function name(s) + signature a synthesizer would call), overlapsWith (other routers in this list it overlaps with — the unification surface).

Then unificationNotes: a clear statement of how these already-built routers compose into the operator's single followable graph — what is the SPINE (the entry router), what is genuinely MISSING (the gap the new graph fills), and what would DUPLICATE existing logic if naively rebuilt.

Return ONLY a single fenced ```json block:
{"routers":[{"file":"","role":"","inputs":"","decides":"","exportedApi":"","overlapsWith":""}],"unificationNotes":"..."}

### Assistant | 2026-06-15T05:45:26.670Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:45:27.601Z

[tool_use: Grep]

### User | 2026-06-15T05:46:01.377Z

[tool_result] Found 13 files
mcp-server\src\engines\knowledge-conversion\PATHS.md
mcp-server\src\engines\AISystemRouterEngine.ts
mcp-server\src\engines\PSNSynergyInspectorEngine.ts
mcp-server\src\engines\lib\zuluAwarenessReader.ts
mcp-server\src\engines\PSNSelfImprovingLoopEngine.ts
mcp-server\src\engines\QuotingDeepReasoningBridgeEngine.ts
mcp-server\src\engines\QuotingNeuralReasoningBridgeEngine.ts
mcp-server
... [+308 chars truncated]

### User | 2026-06-15T05:46:25.525Z

[tool_result] H:/prism/scripts/lib/cag-router.mjs
H:/prism/scripts/lib/loop-goal-stack-advisor.mjs
H:/prism/scripts/lib/task-substrate-router.mjs
H:/prism/.claude/hooks/model-tier-advisor.mjs
H:/prism/.claude/hooks/skill-auto-trigger.mjs
H:/prism/scripts/lib/model-routing-policy.mjs
H:/prism/scripts/lib/model-routing-policy.test.mjs

### Assistant | 2026-06-15T05:46:28.031Z

[tool_use: Read]

### Assistant | 2026-06-15T05:46:28.428Z

[tool_use: Read]

### Assistant | 2026-06-15T05:46:28.718Z

[tool_use: Read]

### User | 2026-06-15T05:46:46.600Z

[tool_result] 1	// RGS-PLANNING-LOOP-BRIDGE-MS0/U2 (2026-06-11, slot:tango)
2	// Per-task substrate-routing matrix: given a task + phase + context, decide the
3	// PRIMARY executor and emit the 5-substrate plan (Ollama / Obsidian / Hermes /
4	// Master-graph / PSN) with when/how/max-out for each. The "max out their
5	// capabilities" answer (U-SPEC-V2 section 4), made deterministic + testable.
6	//
7	// DEDUP: 
... [+6197 chars truncated]

### User | 2026-06-15T05:46:46.916Z

[tool_result] 1	// scripts/lib/cag-router.mjs
2	//
3	// CAG-Router — Classify a query as COLD (cache-augmented), HOT (retrieval-augmented),
4	// or HYBRID (both layers). Implements the Cache-Augmented Generation pattern
5	// (akshay_pachaar X tweet 2056714042455343160, 2026-05-19; foundational paper
6	// Chan et al. 2024 "Don't Do RAG: When Cache-Augmented Generation is All You Need").
7	//
8	// PURPOSE
9	// PR
... [+24660 chars truncated]

### User | 2026-06-15T05:46:47.238Z

[tool_result] 1	// scripts/lib/loop-goal-stack-advisor.mjs
2	//
3	// SELF-DRIVE-MS0 / U-STACK-ADVISOR (slot:alpha 2026-06-14) -- the per-iteration
4	// "deploy the WHOLE PRISM stack, optimally + variably + efficiently" advisor that
5	// the /loop and /goal script hooks inject. Operator directive 2026-06-14: make
6	// /goal + /loop develop utilizing all PRISM substrates (AI/learning/reasoning, PSN,
7	// system-v
... [+11656 chars truncated]

### Assistant | 2026-06-15T05:46:51.224Z

Now let me read the remaining files in parallel.

### Assistant | 2026-06-15T05:46:51.535Z

[tool_use: Read]

### Assistant | 2026-06-15T05:46:52.175Z

[tool_use: Read]

### Assistant | 2026-06-15T05:46:52.749Z

[tool_use: Read]

### User | 2026-06-15T05:47:02.628Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\skill-auto-trigger.mjs' was already read 15m ago in this session and is unchanged (mtime 1781203594217). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-15T05:47:13.213Z

[tool_result] 1	// tier: T2
2	/**
3	 * model-tier-advisor.mjs -- UserPromptSubmit hook (U-MODEL-TIER-ADVISOR, slot:india 2026-06-11).
4	 *
5	 * THE OPERATOR GOAL (2026-06-11, "fable demolished session limits"): auto-enforced model switching --
6	 * fable for deep planning/reasoning, opus for building/coding, ollama for verified-100% mechanical,
7	 * sonnet/haiku for capable tasks. The main-loop model CANNOT be 
... [+4626 chars truncated]

### User | 2026-06-15T05:47:14.005Z

[tool_result] 1	/**
2	 * AISystemRouterEngine
3	 *
4	 * Routes incoming AI work to the most appropriate execution system based on
5	 * task class. Spec from /forge Phase 0 Self-Awareness Protocol:
6	 *
7	 *   | Task                | System                       |
8	 *   |---------------------|------------------------------|
9	 *   | Physics validation  | Docker: physics-agent        |
10	 *   | Engine building 
... [+14070 chars truncated]

### Assistant | 2026-06-15T05:47:18.580Z

Now let me read the model-routing-policy.mjs and the skill-auto-trigger content (which was already read — I need to access it from context or grep key exports).

### Assistant | 2026-06-15T05:47:19.348Z

[tool_use: Read]

### Assistant | 2026-06-15T05:47:20.319Z

[tool_use: Grep]

### User | 2026-06-15T05:47:55.189Z

[tool_result] 1	/**
2	 * model-routing-policy.mjs -- pure: the SINGLE per-prompt model-routing verdict that fuses the
3	 * Claude-tier decision with the MEASURED Ollama capability matrix (U-MODEL-ROUTE-POLICY, slot:india
4	 * 2026-06-11). This is the brain the advisor hook calls.
5	 *
6	 * OPERATOR POLICY (2026-06-11, "fable demolished session limits") -> one verdict per prompt:
7	 *   - ollama  : mechanical ta
... [+4637 chars truncated]

### User | 2026-06-15T05:47:56.547Z

[tool_result] 87:export const LIFECYCLE_STATE_GATED_SKILLS = new Set([
90:export const INVOKE_NOW_SKILLS = new Set([
196:export function parsePipelineFrontmatter(content) {
269:export function readPipelines() {
332:export function matchPipelinesForPrompt(pipelines, prompt) {
347:export function matchPipelinesForTool(pipelines, toolName, toolInput) {
368:export function matchPipelinesForStop(pipelines) {
445:exp
... [+126 chars truncated]

### Assistant | 2026-06-15T05:49:47.551Z

Now I have all six files fully read. Let me compile the unified JSON output.

```json
{
  "routers": [
    {
      "file": "scripts/lib/task-substrate-router.mjs",
      "role": "Maps (taskType, forge-phase, ctx) to a 5-substrate execution plan with a primary executor, Hermes gate, and concurrency cap.",
      "inputs": "taskType string, phase (forge phase name), ctx.{available, hardware, itemCount, openEnded, needsVerification, cores, budgetTotal}",
      "decides": "primary executor (claude model or Ollama/local lane), whether Hermes fan-out fires, concurrencyCap, and the ordered substrate list (ollama / obsidian / hermes / master-graph / psn) with when/how/maxOut for each",
      "exportedApi": "routeTask(taskType: string, phase: string, ctx?: object) -> { taskType, phase, primary, hermesGated, concurrencyCap, substrates[] }",
      "overlapsWith": "loop-goal-stack-advisor.mjs (calls routeTask directly to build its advisory block); AISystemRouterEngine.ts (both classify tasks and pick an executor; AISystemRouterEngine is coarser and does not delegate here)"
    },
    {
      "file": "scripts/lib/cag-router.mjs",
      "role": "Classifies every incoming query as COLD (static doctrine cache hit), HOT (live-state retrieval), or HYBRID, and names the source files that should answer it — enabling prompt-cache reuse and RAG skip on doctrine-only queries.",
      "inputs": "query string (the user prompt or sub-prompt); options.preferColdOnTie, options.confidenceFloor; COLD_SOURCES keyword registry + HOT_TEMPORAL_MARKERS + HOT_LIVE_SURFACES + HOT_RAG_TRIGGERS + HYBRID_MARKERS lists",
      "decides": "tier (COLD/HOT/HYBRID), confidence score, matched evidence list, coldSources file paths, hotSources surface names (chat-slots.json, BUILD_STATE.json, qdrant collections, git log), estimated token/latency savings",
      "exportedApi": "classifyQuery(query: string, options?: object) -> { tier, confidence, evidence, coldSources, hotSources, normalizedQuery, scores, truncated
... [+10637 chars truncated]
