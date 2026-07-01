---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "You are the completeness/parity-gap mapper for U-HERMES-OLLAMA-PARITY. Goal: mak"
date: "2026-06-17"
first_ts: "2026-06-17T18:43:35.221Z"
last_ts: "2026-06-17T18:46:23.014Z"
cwd: "H:\\prism"
messages: 79
user_msgs: 35
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-abd33993841d95b20.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# You are the completeness/parity-gap mapper for U-HERMES-OLLAMA-PARITY. Goal: mak

> **claude-code-cli** | 2026-06-17 | 79 msgs (35 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-abd33993841d95b20.jsonl`

## Transcript

### User | 2026-06-17T18:43:35.221Z

You are the completeness/parity-gap mapper for U-HERMES-OLLAMA-PARITY. Goal: make ask-hermes (H:/prism/scripts/ask-hermes.mjs) FULLY match ask-ollama (H:/prism/scripts/ask-ollama.mjs) as a Claude-Code offload lane, INCLUDING cloning the task-specific /ollama-* skills as /hermes-*. L1a (safety/robustness parity) is DONE. Produce a precise, enumerated scoping map (R12 — counts + exact paths, never estimates). Search breadth: very thorough.

Report these four sections:

(1) MODE GAPS — read the MODES/FILE_MODES/TEXT_MODES/ALL_MODES sets + the mode switch in BOTH scripts. ask-ollama has viz + rerank (system-viz graph search) that ask-hermes lacks; ask-hermes has classify that ask-ollama lacks. List exactly which modes each script supports, and which graph helpers ask-ollama EXPORTS that ask-hermes could reuse to gain viz/rerank (e.g. searchGraph/renderHits/buildVizPrompt/loadGraph — confirm exact exported names + signatures).

(2) SKILL FAMILY — glob H:/prism/.claude/commands/ AND C:/Users/wompu/.claude/commands/ for every `ollama-*.md` skill file. Report the EXACT count and every filename. For each, one line on what it does (read the first ~15 lines). Also report whether a `/hermes-*` equivalent already exists for any of them, and whether `/ask-hermes` and `/ask-ollama` skills both exist.

(3) OFFLOAD-ROUTING LAYER — find the scripts that auto-route work to Ollama: search scripts/ and scripts/lib/ for files matching route-recommend*, *task-offloader*, *skill-suggest*, *cost-router*, ollama-* . For each, report path + whether it is Ollama-hardcoded or already Hermes-aware (grep for "hermes" / "ask-hermes" in each). This scopes L3.

(4) RISK NOTES — any place where naively cloning Ollama→Hermes would be WRONG because Hermes is a PAID 1M-ctx remote lane (not a free local rung): e.g. cheapest-qualified routers (smart-executor / model-routing-policy / ollama-cost-router) should NOT treat Hermes as a $0 default.

Output a concise structured report (sections 1-4, paths + coun
... [+15 chars truncated]

### Assistant | 2026-06-17T18:43:38.648Z

I'll conduct a thorough parity-gap analysis between ask-hermes and ask-ollama, mapping the completeness gaps. Let me start by examining both scripts and their ecosystem.

### Assistant | 2026-06-17T18:43:38.789Z

[tool_use: Read]

### Assistant | 2026-06-17T18:43:39.698Z

[tool_use: Read]

### Assistant | 2026-06-17T18:43:39.997Z

[tool_use: Glob]

### User | 2026-06-17T18:43:40.857Z

[tool_result] read-once-guard: 'H:\prism\scripts\ask-hermes.mjs' was already read 18s ago in this session and is unchanged (mtime 1781721535143). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T18:43:44.091Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+51768 chars truncated]

### User | 2026-06-17T18:43:44.240Z

[tool_result] scripts\materials_rebuild\generate.mjs
scripts\convert_to_ts.mjs
scripts\fix_imports.mjs
scripts\_archive\materials-legacy\fix_and_build.mjs
scripts\_archive\materials-legacy\fix_buffer_zones.mjs
scripts\extract-machines.mjs
scripts\gap-analysis.mjs
scripts\regen-code-index.mjs
scripts\extract-core-machines.mjs
scripts\index\build-shared-index-surfaces.mjs
scripts\_archive\audit\build-hook-skill-c
... [+3636 chars truncated]

### Assistant | 2026-06-17T18:43:47.300Z

I'll conduct a thorough parity-gap analysis. Let me search for the ask-hermes script and the Ollama-related ecosystem more strategically.

### Assistant | 2026-06-17T18:43:47.712Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:43:48.043Z

[tool_use: Glob]

### Assistant | 2026-06-17T18:43:48.392Z

[tool_use: Glob]

### Assistant | 2026-06-17T18:43:48.566Z

[tool_use: Bash]

### User | 2026-06-17T18:43:49.830Z

[tool_result] .claude\commands\ollama-classify.md
.claude\commands\ollama-explain.md
.claude\commands\ollama-docstring.md
.claude\commands\ollama-test-stub.md
.claude\commands\ollama-error-triage.md
.claude\commands\ollama-boilerplate.md
.claude\commands\ollama-route-check.md
.claude\commands\ollama-diff-summary.md
.claude\commands\ollama-extract.md
.claude\commands\ollama-summarize.md
.claude\commands\ollama-a
... [+53 chars truncated]

### User | 2026-06-17T18:43:51.331Z

[tool_result] .claude\commands\hermes-workflow.md
.claude\commands\hermes-control.md

### User | 2026-06-17T18:43:54.554Z

[tool_result] H:/prism/scripts/ask-hermes.mjs
H:/prism/scripts/ask-hermes.test.mjs
H:/prism/scripts/ask-ollama-fallback.test.mjs
H:/prism/scripts/ask-ollama.mjs
H:/prism/scripts/ask-ollama.test.mjs
H:/prism/scripts/ask-openrouter.mjs
H:/prism/scripts/ask-openrouter.test.mjs

### User | 2026-06-17T18:43:55.166Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-17T18:43:57.590Z

Now let me search for the routing/cost-decision layer and read both scripts in detail.

### Assistant | 2026-06-17T18:43:57.786Z

[tool_use: Read]

### User | 2026-06-17T18:43:58.371Z

[tool_result] read-once-guard: 'H:\prism\scripts\ask-hermes.mjs' was already read 37s ago in this session and is unchanged (mtime 1781721535143). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T18:43:58.464Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:43:59.088Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:43:59.352Z

[tool_use: Bash]

### User | 2026-06-17T18:44:03.227Z

[tool_result] H:/prism/scripts/adapt-router-thresholds.mjs
H:/prism/scripts/ask-openrouter.mjs
H:/prism/scripts/ask-openrouter.test.mjs
H:/prism/scripts/audit-mcp-route-takerate.mjs
H:/prism/scripts/audit-mcp-route-takerate.test.mjs
H:/prism/scripts/audit-route-lazy-coverage.mjs
H:/prism/scripts/course-data-router.cli.test.mjs
H:/prism/scripts/course-data-router.mjs
H:/prism/scripts/feature-route.mjs
H:/prism/s
... [+1511 chars truncated]

### User | 2026-06-17T18:44:08.979Z

[tool_result] H:/prism/scripts/lib/cag-router.mjs
H:/prism/scripts/lib/cag-router.test.mjs
H:/prism/scripts/lib/catalog-extraction-router.mjs
H:/prism/scripts/lib/catalog-extraction-router.test.mjs
H:/prism/scripts/lib/claude-tier-router.mjs
H:/prism/scripts/lib/claude-tier-router.test.mjs
H:/prism/scripts/lib/command-ollama-routes.mjs
H:/prism/scripts/lib/course-data-router-lib.mjs
H:/prism/scripts/lib/course-
... [+555 chars truncated]

### User | 2026-06-17T18:44:09.502Z

[tool_result] H:/prism/.claude/hooks/ai-auto-command-router.mjs
H:/prism/.claude/hooks/ai-system-router-inject.mjs
H:/prism/.claude/hooks/cag-router-inject.mjs
H:/prism/.claude/hooks/cag-router-inject.test.mjs
H:/prism/.claude/hooks/mcp-route-suggest.mjs
H:/prism/.claude/hooks/mcp-route-takeup.mjs
H:/prism/.claude/hooks/ollama-auto-router.mjs
H:/prism/.claude/hooks/ollama-route-check-inject.mjs
H:/prism/.claude
... [+636 chars truncated]

### Assistant | 2026-06-17T18:44:12.422Z

Excellent—the task list anchors my search. Let me now examine the routing layer and skill families systematically.

### Assistant | 2026-06-17T18:44:14.539Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:44:14.626Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:44:14.755Z

[tool_use: Read]

### Assistant | 2026-06-17T18:44:14.808Z

[tool_use: Read]

### User | 2026-06-17T18:44:17.807Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-route-recommender.mjs — UserPromptSubmit hook
5	 *
6	 * Event: UserPromptSubmit
7	 *
8	 * Layer 3 of Ollama Architecture:
9	 * Instead of Claude searching dispatchers to find the right action:
10	 * 1. Extract task intent from prompt
11	 * 2. Query Ollama with pre-indexed action patterns
12	 * 3. Inject recommended route (50 tokens vs 500+ for 
... [+2244 chars truncated]

### User | 2026-06-17T18:44:17.836Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+4354 chars truncated]

### User | 2026-06-17T18:44:22.329Z

[tool_result] H:/prism/scripts/lib/task-substrate-router.mjs
H:/prism/scripts/lib/task-substrate-router.test.mjs

### User | 2026-06-17T18:44:22.385Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-17T18:44:26.751Z

Perfect. Now let me efficiently gather the remaining intelligence on modes, skill families, and routing layer awareness.

### Assistant | 2026-06-17T18:44:27.567Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:44:28.579Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:44:28.832Z

[tool_use: Read]

### Assistant | 2026-06-17T18:44:28.839Z

[tool_use: Bash]

### User | 2026-06-17T18:44:30.074Z

[tool_result] 1	---
2	policy:
3	  tier: 2
4	  triggers:
5	    - "ollama-classify"
6	    - "engines"
7	    - "classify"
8	    - "categorize"
9	    - "what kind of"
10	    - "what type of file"
11	    - "classify this error"
12	  token_cost_estimate: 80
13	  cost_model: "ollama-local"
14	  description: "Local Ollama task/file/error classification — zero Claude tokens"
15	---

### User | 2026-06-17T18:44:32.590Z

[tool_result] const MODES = new Set(["ask", "summarize", "explain", "triage", "classify"]);
// File modes take a path/stdin (capped + safety-guarded, like ask-ollama's FILE_MODES);
// ask/classify take literal text. Kept in sync with ask-ollama's FILE_MODES set.
const FILE_MODES = new Set(["summarize", "explain", "triage"]);

// HERMES-UTIL-TRACK (2026-06-14): ask-hermes was bridged but UNMEASURED --
// byHook[
... [+3157 chars truncated]

### User | 2026-06-17T18:44:33.596Z

[tool_result] import { buildRerankPrompt, rerankCandidates } from "./lib/ollama-search-rerank.mjs";
export const FILE_MODES = new Set(["summarize", "explain", "triage"]);
export const TEXT_MODES = new Set(["viz", "ask", "rerank"]);
export const ALL_MODES = new Set([...FILE_MODES, ...TEXT_MODES]);
  if (!ALL_MODES.has(mode)) return { error: `unknown mode: ${mode}` };
  if (!input) return { error: `mode '${mode}'
... [+641 chars truncated]

### User | 2026-06-17T18:44:38.474Z

[tool_result] === ollama-architecture-plan.md ===
  ---
  policy:
    tier: 3
    triggers:
      - "ollama-architecture-plan"
  consumes:
    - "prism_ai:route_recommend"
    - "prism_calc:cutting_force_kienzle"
    - "prism_cam:toolpath_generate"
  ---
  # Ollama-Powered PRISM Architecture Plan
  
=== ollama-boilerplate.md ===
  ---
  policy:
    tier: 2
    triggers:
      - "ollama-boilerplate"
      - "boi
... [+3150 chars truncated]

### Assistant | 2026-06-17T18:44:40.959Z

Excellent. Now let me examine the routing layer's Hermes awareness and complete the picture.

### Assistant | 2026-06-17T18:44:41.653Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:44:42.134Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:44:42.261Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:44:42.504Z

[tool_use: Read]

### User | 2026-06-17T18:44:44.633Z

[tool_result] 1	// tier: T4
2	// HERMES-EFFICIENCY-ROUTER / U1 (keystone) — Local-LLM task-routing brain.
3	//
4	// composes: ollama-cost-router (routeModelForTask) + host-aware-synthesis-model
5	//   (fetchInstalledModels) + host-class (detectHostClass). It is a COMPOSER, not a
6	//   new policy — model-tier selection is DELEGATED to routeModelForTask (the
7	//   canonical, Blackwell-tuned, install-truthful pi
... [+5771 chars truncated]

### User | 2026-06-17T18:44:46.451Z

[tool_result] (Bash completed with no output)

### User | 2026-06-17T18:44:47.289Z

[tool_result] 2:// HERMES-EFFICIENCY-ROUTER / U1 (keystone) — Local-LLM task-routing brain.

### User | 2026-06-17T18:44:47.531Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-17T18:44:49.828Z

Now let me check if ask-hermes has viz/rerank modes and examine the exported functions from ask-ollama.

### Assistant | 2026-06-17T18:44:50.712Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:44:50.875Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:44:51.310Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:44:51.556Z

[tool_use: Bash]

### User | 2026-06-17T18:44:57.435Z

[tool_result] (Bash completed with no output)

### User | 2026-06-17T18:44:59.586Z

[tool_result] -rw-r--r-- 1 wompu 197611 2951 Jun 17 11:49 H:/prism/.claude/commands/hermes-control.md
-rw-r--r-- 1 wompu 197611 3583 Jun  4 12:20 H:/prism/.claude/commands/hermes-workflow.md

### User | 2026-06-17T18:44:59.731Z

[tool_result] export const MAX_FILE_BYTES = 256 * 1024;
export const FILE_MODES = new Set(["summarize", "explain", "triage"]);
export const TEXT_MODES = new Set(["viz", "ask", "rerank"]);
export const ALL_MODES = new Set([...FILE_MODES, ...TEXT_MODES]);
export function truncate(s, max) {
export function estimateTokens(s) {
export function scaleTimeoutForBytes(bytes, base = DEFAULT_TIMEOUT_MS) {
export function 
... [+863 chars truncated]

### User | 2026-06-17T18:45:17.937Z

[tool_result] H:/prism/.claude/commands/ask-hermes.md
H:/prism/.claude/commands/hermes-control.md
H:/prism/.claude/commands/hermes-workflow.md
H:/prism/.claude/projects/H--prism/memory/feedback_bravo_launches_hermes_obsidian_apps.md
H:/prism/.claude/projects/H--prism/memory/reference_bravo_hermes_zulu_engine_surface.md
H:/prism/.claude/projects/H--prism/memory/reference_bravo_hermes_zulu_hooks.md
H:/prism/.clau
... [+1318 chars truncated]

### Assistant | 2026-06-17T18:45:21.422Z

Perfect. Let me now compile the final structured report with exact counts and paths. Let me verify the exact skill count and check one more routing file.

### Assistant | 2026-06-17T18:45:21.574Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:45:21.783Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:45:22.430Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:45:22.502Z

[tool_use: Bash]

### User | 2026-06-17T18:45:27.290Z

[tool_result] 12

### User | 2026-06-17T18:45:27.754Z

[tool_result] H:/prism/.claude/commands/hermes-control.md
H:/prism/.claude/commands/hermes-workflow.md

### User | 2026-06-17T18:45:28.190Z

[tool_result] (Bash completed with no output)

### User | 2026-06-17T18:45:29.343Z

[tool_result] H:/prism/.claude/hooks/obsidian-learning-revival-sessionstart.mjs
H:/prism/.claude/hooks/outcome-bus-auto-tap.mjs
H:/prism/.claude/hooks/prism-shared-config-sync.mjs
H:/prism/.claude/hooks/prompt-route-inject.mjs
H:/prism/.claude/hooks/prompt-route-inject.test.mjs
H:/prism/.claude/hooks/slot-context-bundle-inject.mjs
H:/prism/.claude/hooks/stop-cross-slot-skill-suggest.mjs
H:/prism/.claude/hooks/s
... [+192 chars truncated]

### Assistant | 2026-06-17T18:45:31.548Z

Now let me read the ask-hermes skill to understand its current mode support better.

### Assistant | 2026-06-17T18:45:31.581Z

[tool_use: Read]

### Assistant | 2026-06-17T18:45:32.062Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:45:32.351Z

[tool_use: Bash]

### User | 2026-06-17T18:45:33.090Z

[tool_result] 1	---
2	name: ask-hermes
3	description: Query Hermes (Nous) from any Claude Code chat slot. Routes a prompt through the local Hermes OpenAI-compatible proxy to a managed-OAuth provider (xAI Grok) -- a STRONGER/different model than local Ollama, reached via Hermes' credential management, processed outside the Claude context window. Auto-falls-back to free local Ollama if the proxy is down. Use when
... [+959 chars truncated]

### User | 2026-06-17T18:45:37.430Z

[tool_result] name: ask-hermes
      - ask-hermes
# /ask-hermes -- query Hermes from any chat slot
`:8645/v1`) via `scripts/ask-hermes.mjs`. The proxy forwards to a managed-OAuth
node scripts/ask-hermes.mjs ask "explain the tradeoff between climb and conventional milling"
node scripts/ask-hermes.mjs summarize mcp-server/src/engines/SomeEngine.ts
node scripts/ask-hermes.mjs explain   scripts/regen-viz.mjs
node s
... [+226 chars truncated]

### User | 2026-06-17T18:45:37.665Z

[tool_result] const MODES = new Set(["ask", "summarize", "explain", "triage", "classify"]);
// File modes take a path/stdin (capped + safety-guarded, like ask-ollama's FILE_MODES);
// ask/classify take literal text. Kept in sync with ask-ollama's FILE_MODES set.
const FILE_MODES = new Set(["summarize", "explain", "triage"]);
  return FILE_MODES.has(mode) && !allowUnsafe && looksLikeNcProgram(text);
  return (FI
... [+85 chars truncated]

### Assistant | 2026-06-17T18:46:23.014Z

Excellent. Now I have enough signal. Let me compile the comprehensive structured report.

---

## U-HERMES-OLLAMA-PARITY: Completeness & Scoping Map

### (1) MODE GAPS — Graph Capabilities

**ask-ollama MODES** (5 total):
- `FILE_MODES`: summarize, explain, triage
- `TEXT_MODES`: viz, ask, rerank
- **Exported viz-support functions**: `searchGraph(query, graph, maxHits)`, `renderHits(hits)`, `buildVizPrompt(query, hits)`, `buildRerankPrompt(...)` [via import from `lib/ollama-search-rerank.mjs`]

**ask-hermes MODES** (5 total):
- `FILE_MODES`: summarize, explain, triage
- `TEXT_MODES`: ask, classify
- **MISSING**: viz, rerank modes + all graph-search helpers (searchGraph, renderHits, buildVizPrompt, buildRerankPrompt)

**MODE PARITY STATUS**: ❌ **L1b BLOCKER**
- ask-ollama: `[summarize, explain, triage] ∪ [viz, ask, rerank]` = 6 distinct modes
- ask-hermes: `[summarize, explain, triage] ∪ [ask, classify]` = 5 distinct modes
- ask-hermes has **classify** (not in ask-ollama); ask-ollama has **viz + rerank** (not in ask-hermes)
- Gap: ask-hermes **lacks viz/rerank graph-search capability**; ask-ollama lacks classify

**Graph helpers in ask-ollama** (exported):
1. `searchGraph(query, graph, maxHits)` — line 259
2. `renderHits(hits)` — line 280
3. `buildVizPrompt(query, hits)` — line 291
4. `tokenizeQuery(query)` — line 226
5. `scoreNode(node, tokens)` — line 241
6. `loadGraph({root, readImpl, existsImpl, statImpl})` — line 400

**Hermes-friendly reuse**: These are all PURE functions + loadGraph is injectable-dep. Portable to ask-hermes with zero changes.

---

### (2) SKILL FAMILY — Ollama Task Skills Inventory

**ask-ollama Family Count**: **12 skills in H:/prism/.claude/commands/ollama-*.md**

| Skill | Purpose | Hermes Equiv? |
|-------|---------|---------------|
| `ollama-architecture-plan.md` | Multi-step architecture investigation on Ollama | ❌ **MISSING** |
| `ollama-boilerplate.md` | Code scaffold/template generation (local) | ❌ **MISSING** |
| `ollama-bridge.md` 
... [+10502 chars truncated]
