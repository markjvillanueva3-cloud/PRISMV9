---
type: "chat-session"
source: "claude-code-cli"
session_id: "c478f3f9-9fa6-48e9-9521-b5ea8123f8fe"
title: "Ship `U-PSN-MULTI-PROVIDER-ROUTER-2026-05-24` for PRISM at H:/prism. Closes Brij"
date: "2026-05-25"
first_ts: "2026-05-25T03:03:15.463Z"
last_ts: "2026-05-25T03:10:07.013Z"
cwd: "H:\\prism"
messages: 55
user_msgs: 21
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/c478f3f9-9fa6-48e9-9521-b5ea8123f8fe/subagents/agent-a1fba242b8c9cef26.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Ship `U-PSN-MULTI-PROVIDER-ROUTER-2026-05-24` for PRISM at H:/prism. Closes Brij

> **claude-code-cli** | 2026-05-25 | 55 msgs (21 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c478f3f9-9fa6-48e9-9521-b5ea8123f8fe/subagents/agent-a1fba242b8c9cef26.jsonl`

## Transcript

### User | 2026-05-25T03:03:15.463Z

Ship `U-PSN-MULTI-PROVIDER-ROUTER-2026-05-24` for PRISM at H:/prism. Closes Brij "AI Infrastructure Master Tree" layer 02 gap (Frontier Models). Today `aiSystemRouterEngine` routes Claude+Ollama only; needs Claude/Gemini/GPT-4.1/DeepSeek/Ollama classification + Bash-shellable CLI surface. Today's MCP server is DOWN so dispatcher build is off-limits — ship as a PURE LIBRARY + CLI like today's `prism-graphiti.mjs`.

WHY: per `H:/prism/state/shared/specs/PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23.md` and today's Brij map, multi-provider fallback is the #1 leverage point when Claude rate-limits. The router is classification logic (which provider for which task) — no actual provider calls needed today, just the routing decision + telemetry.

WHAT TO SHIP (4 deliverables, all at H:/prism):
1. `scripts/lib/multi-provider-router.mjs` (~150 LOC, pure functions) — classification logic:
   - PROVIDERS const: array of `{id, tier, strengths:[], costPerToken, contextLimit, availability:"online|offline"}` for claude, gemini, gpt-4-1, deepseek-r1, ollama-qwen, ollama-deepseek
   - `classifyTask(prompt, context)` → returns `{primaryProvider, fallbackChain:[], reasoning, taskCategory}` — keyword-driven: "reasoning"→claude/gpt-4-1, "code"→claude/deepseek-r1, "summarize"→ollama-qwen, "physics"→prism_calc, etc.
   - `recordOutcome({provider, taskCategory, success, latencyMs})` → appends to `state/shared/multi-provider-outcomes.jsonl` (mirror `episodes.jsonl` shape)
   - `loadOutcomes(opts)` → returns array, defensive on malformed lines
   - `recommendProviderFromHistory(taskCategory, n=10)` → reads recent outcomes, returns provider with best (success_rate × inverse_latency) for that category
2. `scripts/lib/multi-provider-router.test.mjs` — node:test, ≥12 cases (classification edge cases + outcome-history recommendation math + defensive loaders).
3. `scripts/prism-route.mjs` CLI — 4 verbs `--classify "task description"`, `--record --provider X --category Y --success true`, `--recommend --ca
... [+964 chars truncated]

### Assistant | 2026-05-25T03:03:21.898Z

I'll start by reading CLAUDE.md and the relevant source files to understand conventions before building anything.

### Assistant | 2026-05-25T03:03:22.274Z

[tool_use: Read]

### User | 2026-05-25T03:03:28.316Z

[tool_result] 1	# PRISM — Manufacturing Intelligence Platform
2	
3	## EXPERT ROLE (ALWAYS ACTIVE)
4	<!-- DUPLICATE-CANDIDATE 2026-05-17 OBSOLESCENCE-CLEANUP-MS0/U-OBS-C2: parallel section in C:/Users/wompu/.claude/CLAUDE.md §EXPERT ROLE. Proposed canonical owner: GLOBAL. Collapse this body to pointer after 2026-05-24. Advisory: state/shared/specs/CLAUDE-MD-DUPLICATION-CANDIDATES-2026-05-17.md -->
5	You are the 
... [+8113 chars truncated]

### Assistant | 2026-05-25T03:03:30.071Z

Now let me read the reference files to understand conventions:

### Assistant | 2026-05-25T03:03:31.067Z

[tool_use: Read]

### Assistant | 2026-05-25T03:03:31.314Z

[tool_use: Read]

### User | 2026-05-25T03:03:32.710Z

[tool_result] read-once-guard: 'H:\prism\scripts\prism-graphiti.mjs' was already read 9s ago in this session and is unchanged (mtime 1779663327979). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-25T03:03:34.493Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\episode-store.mjs' was already read 10s ago in this session and is unchanged (mtime 1779661840063). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-25T03:03:37.382Z

The read-once guard suggests these were pre-loaded. Let me read them directly with PRISM_READ_CACHE=0:

### Assistant | 2026-05-25T03:03:38.426Z

[tool_use: Bash]

### Assistant | 2026-05-25T03:03:38.794Z

[tool_use: Bash]

### User | 2026-05-25T03:03:50.255Z

[tool_result]   1 │ #!/usr/bin/env node
  2 │ // PSN-ENHANCE-MS0/U-PSN-GRAPHITI-WIRE — CLI surface for the graphiti-lite
  3 │ // episode store (lib at scripts/lib/episode-store.mjs from iter 11).
  4 │ //
  5 │ // Exposes the 5 core verbs operators + MCP clients call via Bash:
  6 │ //   --summary              Print store stats (totalEpisodes, validNow,
  7 │ //                          superseded, bySource, s
... [+4879 chars truncated]

### User | 2026-05-25T03:03:52.367Z

[tool_result]   1 │ #!/usr/bin/env node
  2 │ // PSN-ENHANCE-MS0/U-PSN-GRAPHITI-LITE - pure-Node episode store mirroring
  3 │ // the getzep/graphiti data model (episode + entity + relationship + temporal
  4 │ // validity window + provenance traceback) WITHOUT requiring Kuzu / Neo4j /
  5 │ // FalkorDB. Backing store: JSONL append-only at state/shared/episodes.jsonl.
  6 │ // Matches the existing ledger patter
... [+3476 chars truncated]

### Assistant | 2026-05-25T03:03:54.932Z

Good, I have the episode-store and graphiti patterns. Let me read the rest of graphiti and the graphiti skill, plus the AISystemRouterEngine:

### Assistant | 2026-05-25T03:03:56.361Z

[tool_use: Bash]

### Assistant | 2026-05-25T03:03:56.959Z

[tool_use: Bash]

### Assistant | 2026-05-25T03:03:58.210Z

[tool_use: Bash]

### User | 2026-05-25T03:04:07.559Z

[tool_result]  1 │ ---
 2 │ description: Query and append to the PRISM graphiti-lite episode store (PSN leg 12 candidate). Temporal validity + provenance traceback over commits, scrutiny entries, and operator notes via the iter-11 episode-store lib.
 3 │ keywords: [graphiti, episode, traceback, temporal, provenance, episodes, what was true at]
 4 │ ---
 5 │ 
 6 │ # /graphiti — graphiti-lite episode store CLI
 7
... [+2753 chars truncated]

### User | 2026-05-25T03:04:11.604Z

[tool_result]  50 │ 
 51 │ function parseEntity(spec) {
 52 │   if (typeof spec !== "string" || spec.length === 0) return null;
 53 │   const idx = spec.indexOf(":");
 54 │   if (idx < 0) return { name: spec };
 55 │   return { name: spec.slice(0, idx), type: spec.slice(idx + 1) };
 56 │ }
 57 │ 
 58 │ function actionSummary(args) {
 59 │   const stats = statsFromPath();
 60 │   if (args.json) { process.stdout.
... [+5410 chars truncated]

### User | 2026-05-25T03:04:11.967Z

[tool_result] AISystemRouterEngine.ts  11.5K
AISystemSynchronizerEngine.ts  13.6K
AdaptiveToolpathRouterEngine.ts  34.8K
BackendRouterEngine.ts  15.0K
CADAutomationRouter.ts  14.5K
CADSystemRouterEngine.ts  21.9K
CAMFunctionRouterEngine.ts  10.2K
CameraIntakeRouterEngine.ts  11.0K
ComplexityAwareRouterEngine.ts  4.3K
CostAwareRouterEngine.ts  7.2K
CrossProcessTierRouterEngine.ts  12.9K
EmbeddingRouterEngine.ts 
... [+503 chars truncated]

### Assistant | 2026-05-25T03:04:14.077Z

Good. Now let me read the AISystemRouterEngine to understand its existing classification logic:

### Assistant | 2026-05-25T03:04:14.462Z

[tool_use: Read]

### User | 2026-05-25T03:04:18.790Z

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
... [+3961 chars truncated]

### Assistant | 2026-05-25T03:04:21.698Z

Good. Now I have the full picture of conventions. Let me also read the rest of AISystemRouterEngine's `route()` method and check the PSN spec mentioned in the task:

### Assistant | 2026-05-25T03:04:22.800Z

[tool_use: Read]

### Assistant | 2026-05-25T03:04:24.015Z

[tool_use: Bash]

### User | 2026-05-25T03:04:33.578Z

[tool_result] 118	    switch (taskClass) {
119	      case "physics_validation":
120	        primary = "docker-physics-agent";
121	        fallback = ["claude-opus", "local-mcp"];
122	        reason = "Physics validation runs in Docker for isolation + repeatable env";
123	        estimatedCost = "low";
124	        break;
125	      case "engine_building":
126	        primary = "claude-opus";
127	        fallback 
... [+5031 chars truncated]

### User | 2026-05-25T03:04:57.328Z

[tool_result] psn-incorp/
HAGI-MS0-COMPLETION-PSN-SYNERGY-2026-05-24.md  7.3K
HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.html  41.5K
HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md  26.0K
HIGH-ROI-AI-PSN-SCOPE-2026-05-23.md  18.4K
KILO-QUEUE-PSN-SYNERGY-2026-05-23.md  9.8K
PSN-AUTONOMY-RESEARCH-R4-2026-05-23.md  12.0K
PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23.html  24.0K
PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23.md  13
... [+460 chars truncated]

### Assistant | 2026-05-25T03:04:59.999Z

Good, I have everything I need. Let me read the PSN spec briefly for context on the Brij "layer 02" gap, then plan and implement:

### Assistant | 2026-05-25T03:05:01.921Z

[tool_use: Bash]

### User | 2026-05-25T03:05:13.404Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2 matches in 1 files:

H:/.../specs/PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23.md:55:| **Goose / Gemini CLI / Codex / OpenHands / Devin** | CLI-tier (Goose/Gemini...
H:/.../specs/PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23.md:119:15 Plugin-Marketplace (skill export + engine export + MCP manifest for Cline/...

### Assistant | 2026-05-25T03:05:33.490Z

I have enough context. The spec confirms the multi-provider frontier layer. Now I have a complete picture. Let me state the plan before writing (>50 lines of new code):

**Plan — U-PSN-MULTI-PROVIDER-ROUTER-2026-05-24**

4 files, ~300 total LOC:

**File 1: `scripts/lib/multi-provider-router.mjs`** (~160 LOC)
- `PROVIDERS` const: 6 provider descriptors (id, tier, strengths, costPerToken, contextLimit, availability)
- `classifyTask(prompt, context?)` — keyword-driven, returns `{primaryProvider, fallbackChain, reasoning, taskCategory}`. Categories: `reasoning`, `code`, `summarize`, `physics`, `classify`, `search`, `batch`, `unknown`. Rules aligned with (but not duplicating) `AISystemRouterEngine.classify()` — the TS engine owns backend routing; this lib owns multi-provider selection within the online tier.
- `recordOutcome({provider, taskCategory, success, latencyMs})` — appends to `state/shared/multi-provider-outcomes.jsonl`, same append-line shape as `episode-store.mjs`
- `loadOutcomes(opts)` — reads/parses JSONL, skips malformed, returns array
- `recommendProviderFromHistory(taskCategory, n=10)` — scoring: `success_rate × (1 / mean_latency_ms) × 1000`

**File 2: `scripts/lib/multi-provider-router.test.mjs`** (~120 LOC)
- node:test, ≥12 cases covering: all task categories, unknown fallback, outcome append shape, malformed-line skip in `loadOutcomes`, recommendation math correctness, zero-history fallback

**File 3: `scripts/prism-route.mjs`** (~80 LOC)
- 4 verbs: `--classify "desc"`, `--record --provider X --category Y --success bool --latency N`, `--recommend --category Y`, `--summary`
- Mirrors graphiti CLI shape: `parseArgs` → `actionXxx` → `main(argv)` → direct-invoke guard

**File 4: `.claude/commands/route.md`** (~30 LOC)
- Mirrors graphiti.md frontmatter + verb table + library API cross-ref

This is a STANDARD classification (no physics constants, no dispatcher mutations). Self-review sufficient per FILE CLASSIFICATION rules.

Proceeding to implement file 1:

### Assistant | 2026-05-25T03:06:37.058Z

[tool_use: Write]

### User | 2026-05-25T03:06:53.926Z

[tool_result] File created successfully at: H:/prism/scripts/lib/multi-provider-router.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T03:06:58.282Z

The hook flagged magic numbers and a potential unreachable-after-return. Let me self-review the file carefully before writing the test:

The "commented-out code block" warning is about the JSDoc `@typedef` blocks — those are doc comments, not dead code. The magic numbers `10`, `200_000`, `128_000`, `64_000`, `32_000` need named constants. The unreachable-after-return warning needs investigation. Let me fix the lib first:

### Assistant | 2026-05-25T03:07:04.367Z

[tool_use: Edit]

### User | 2026-05-25T03:07:33.230Z

[tool_result] The file H:/prism/scripts/lib/multi-provider-router.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T03:07:38.557Z

The hook is flagging the numeric literals in the `const` declarations themselves. I need to replace all remaining bare numbers in the PROVIDERS array and the default parameter too:

### Assistant | 2026-05-25T03:07:47.796Z

[tool_use: Edit]

### User | 2026-05-25T03:08:07.477Z

[tool_result] The file H:/prism/scripts/lib/multi-provider-router.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T03:08:10.291Z

Now fix the `recommendProviderFromHistory` signature to use the named constant instead of a default parameter literal, and fix the score formula to use named constants:

### Assistant | 2026-05-25T03:08:12.489Z

[tool_use: Edit]

### User | 2026-05-25T03:08:24.078Z

[tool_result] The file H:/prism/scripts/lib/multi-provider-router.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T03:08:27.394Z

[tool_use: Edit]

### User | 2026-05-25T03:08:38.463Z

[tool_result] The file H:/prism/scripts/lib/multi-provider-router.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T03:08:40.918Z

Now fix the `slice(-Math.max(1, Math.floor(n)))` — the `1` there is a minimum guard, extract it:

### Assistant | 2026-05-25T03:08:42.916Z

[tool_use: Edit]

### User | 2026-05-25T03:08:52.740Z

[tool_result] The file H:/prism/scripts/lib/multi-provider-router.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T03:08:55.067Z

Good. Now write the test file (file 2):

### Assistant | 2026-05-25T03:09:46.187Z

[tool_use: Write]

### User | 2026-05-25T03:09:56.822Z

[tool_result] File created successfully at: H:/prism/scripts/lib/multi-provider-router.test.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T03:10:01.876Z

The Ollama advisory flags a missing return statement in a loop. Let me scan the test file — the `for` loops in tests are fine (they use `assert`, no return needed). The warning likely refers to the lib file's `for...of` loop in `recommendProviderFromHistory`. Let me check that logic — the loop sets `bestProvider` and `bestScore` but returns after the loop. That is correct. The advisory may be a false positive on the test's `for` loops.

Let me run the tests now to verify correctness before writing files 3 and 4:

### Assistant | 2026-05-25T03:10:02.187Z

[tool_use: Bash]

### User | 2026-05-25T03:10:07.013Z

[tool_result] Exit code 1
TAP version 13
# Subtest: PROVIDERS registry
    # Subtest: contains exactly 6 providers
    ok 1 - contains exactly 6 providers
      ---
      duration_ms: 1.6559
      ...
    # Subtest: every provider has required fields with correct types
    ok 2 - every provider has required fields with correct types
      ---
      duration_ms: 0.2719
      ...
    # Subtest: local providers ha
... [+6736 chars truncated]
