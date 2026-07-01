---
type: "chat-session"
source: "claude-code-cli"
session_id: "c478f3f9-9fa6-48e9-9521-b5ea8123f8fe"
title: "Ship `U-PSN-OBSERVABILITY-LEG-2026-05-24` for PRISM at H:/prism. This formalizes"
date: "2026-05-25"
first_ts: "2026-05-25T03:03:15.419Z"
last_ts: "2026-05-25T03:08:47.552Z"
cwd: "H:\\prism"
messages: 49
user_msgs: 20
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/c478f3f9-9fa6-48e9-9521-b5ea8123f8fe/subagents/agent-a37ed8c8c8a8d68c4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Ship `U-PSN-OBSERVABILITY-LEG-2026-05-24` for PRISM at H:/prism. This formalizes

> **claude-code-cli** | 2026-05-25 | 49 msgs (20 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c478f3f9-9fa6-48e9-9521-b5ea8123f8fe/subagents/agent-a37ed8c8c8a8d68c4.jsonl`

## Transcript

### User | 2026-05-25T03:03:15.419Z

Ship `U-PSN-OBSERVABILITY-LEG-2026-05-24` for PRISM at H:/prism. This formalizes the 13th PSN leg "Observability" — closes Brij Pandey's "AI Infrastructure Master Tree" layer 07 gap (Logs/Traces/Evals/Hallucination/Latency/Cost) per `H:/prism/state/shared/specs/PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23.md` §2C. Today these surfaces are scattered across scrutiny-ledger + error-pattern-promote + token-economy + route-savings + ollama-offload-stats with no unified query surface or hallucination/eval signals.

WHY: PSN has 11 canonical legs (per `H:/prism/knowledge/memories/feedback/feedback_psn_definition.md`). The synthesis spec yesterday named "audit-provenance ledger leg 13" as a candidate; today's Brij mapping confirmed Observability is the right framing. Need unified query lib + hallucination detector + retrieval-eval scaffold. THIS IS NOT a partial ship — deliver lib + tests + CLI + skill atomically.

WHAT TO SHIP (5 deliverables, all at H:/prism):
1. `scripts/lib/observability-leg.mjs` (~200 LOC, pure functions, fail-soft) — aggregates the 5 existing scattered surfaces into one query API:
   - `loadObservabilityState({roots})` reads scrutiny-ledger + error-pattern-promote + token-economy + route-savings + ollama-offload-stats JSON files
   - `summarizeObservability(state)` → unified counts/percentages by category
   - `detectHallucination(text, opts)` → naive heuristic detector (citation-required, no-source-claims). Pure function operating on text. Returns `{score:0-1, signals:[]}`.
   - `evaluateRetrieval(queries, hits, opts)` → RAGAS-style precision@k + recall@k + MRR. Pure function over query→expected-hits.
   - All readers: defensive (file-missing = empty, malformed-JSON = skip). Never throw. Same shape as `H:/prism/scripts/lib/episode-store.mjs` (study it first).
2. `scripts/lib/observability-leg.test.mjs` — node:test, ≥15 cases (state-load defensive + hallucination edge cases + RAGAS metric math).
3. `scripts/prism-observability.mjs` CLI — 4 verbs `--summary`
... [+1311 chars truncated]

### Assistant | 2026-05-25T03:03:21.812Z

I'll read the named files first to match conventions, then plan and implement the 5 deliverables.

### Assistant | 2026-05-25T03:03:21.814Z

[tool_use: Read]

### Assistant | 2026-05-25T03:03:22.219Z

[tool_use: Read]

### User | 2026-05-25T03:03:28.073Z

[tool_result] 1	#!/usr/bin/env node
2	// PSN-ENHANCE-MS0/U-PSN-GRAPHITI-WIRE — CLI surface for the graphiti-lite
3	// episode store (lib at scripts/lib/episode-store.mjs from iter 11).
4	//
5	// Exposes the 5 core verbs operators + MCP clients call via Bash:
6	//   --summary              Print store stats (totalEpisodes, validNow,
7	//                          superseded, bySource, sizeBytes).
8	//   --add-epis
... [+7842 chars truncated]

### User | 2026-05-25T03:03:28.516Z

[tool_result] 1	#!/usr/bin/env node
2	// PSN-ENHANCE-MS0/U-PSN-GRAPHITI-LITE - pure-Node episode store mirroring
3	// the getzep/graphiti data model (episode + entity + relationship + temporal
4	// validity window + provenance traceback) WITHOUT requiring Kuzu / Neo4j /
5	// FalkorDB. Backing store: JSONL append-only at state/shared/episodes.jsonl.
6	// Matches the existing ledger pattern (scrutiny-ledger, erro
... [+7263 chars truncated]

### Assistant | 2026-05-25T03:03:33.168Z

Now read the graphiti skill and PSN definition:

### Assistant | 2026-05-25T03:03:33.691Z

[tool_use: Read]

### Assistant | 2026-05-25T03:03:34.138Z

[tool_use: Read]

### User | 2026-05-25T03:03:43.126Z

[tool_result] 1	---
2	description: Query and append to the PRISM graphiti-lite episode store (PSN leg 12 candidate). Temporal validity + provenance traceback over commits, scrutiny entries, and operator notes via the iter-11 episode-store lib.
3	keywords: [graphiti, episode, traceback, temporal, provenance, episodes, what was true at]
4	---
5	
6	# /graphiti — graphiti-lite episode store CLI
7	
8	PSN-ENHANCE-MS0
... [+2600 chars truncated]

### User | 2026-05-25T03:03:43.131Z

[tool_result] 1	---
2	name: psn-definition
3	description: The PRISM Synergy Network — canonical 11-leg taxonomy. Every PSN-aware tool/hook/skill refers here for the leg list. Fixes the broken pointer referenced in MEMORY.md since at least 2026-05-19.
4	aliases: feedback_psn_definition
5	type: feedback
6	source: prism-memory
7	synced: 2026-05-25T02:48:25.824Z
8	---
9	
10	
11	# PSN — PRISM Synergy Network (canoni
... [+4779 chars truncated]

### Assistant | 2026-05-25T03:03:46.032Z

Now read the synthesis spec and check the existing scattered surfaces:

### Assistant | 2026-05-25T03:03:46.487Z

[tool_use: Read]

### Assistant | 2026-05-25T03:03:47.185Z

[tool_use: Glob]

### User | 2026-05-25T03:03:55.515Z

[tool_result] No files found

### User | 2026-05-25T03:03:56.094Z

[tool_result] 1	# PSN Deep-Research Synthesis Index (2026-05-23)
2	
3	**Author:** claude-c478f3f9 slot:sierra · **Unit:** PSN-ENHANCE-MS0::U-PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23
4	**Status:** advisory · mustHumanVerify · zero runtime code
5	**Doctrine:** /dedup — this document is a *pointer index* over 7 sibling PSN/Hermes research specs shipped earlier today + names what they collectively do NOT cover. Do NO
... [+13661 chars truncated]

### Assistant | 2026-05-25T03:03:58.821Z

Now let me find the actual scattered data files to understand their shapes:

### Assistant | 2026-05-25T03:03:59.323Z

[tool_use: Glob]

### Assistant | 2026-05-25T03:04:00.248Z

[tool_use: Glob]

### Assistant | 2026-05-25T03:04:00.598Z

[tool_use: Glob]

### User | 2026-05-25T03:04:05.180Z

[tool_result] No files found

### User | 2026-05-25T03:04:05.211Z

[tool_result] mcp-server\data\state\SCRUTINY_LEDGER.json

### User | 2026-05-25T03:04:07.661Z

[tool_result] No files found

### Assistant | 2026-05-25T03:04:09.758Z

Let me read the scrutiny ledger shape and find the other scattered surfaces:

### Assistant | 2026-05-25T03:04:10.447Z

[tool_use: Read]

### Assistant | 2026-05-25T03:04:11.023Z

[tool_use: Bash]

### User | 2026-05-25T03:04:17.957Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "_lastBackfillTs": "2026-05-08T16:41:54.025Z",
4	  "entries": {
5	    "test-block-path": {
6	      "sessionId": "test-block-path",
7	      "recordedAt": "2026-04-27T13:57:03.624Z",
8	      "selfReviewed": false,
9	      "agentReviewed": false,
10	      "blockCount": 2,
11	      "notes": ""
12	    },
13	    "ce425dcc-47be-43b5-9f72-d92263f1385d": {
14	      "se
... [+942 chars truncated]

### User | 2026-05-25T03:04:48.385Z

[tool_result] ollama-offload-stats.json  110.5K
ollama-offload-stats.json.124036.1779507867082.tmp  39.9K
ollama-offload-stats.json.127272.1779511804232.tmp  44.9K
ollama-offload-stats.json.127928.1779512422075.tmp  46.0K
ollama-offload-stats.json.135564.1779507867242.tmp  39.9K
ollama-offload-stats.json.13920.1779670778995.tmp  96.7K
ollama-offload-stats.json.143524.1779507843809.tmp  39.4K
ollama-offload-stat
... [+10453 chars truncated]

### Assistant | 2026-05-25T03:04:51.300Z

Now I have enough context. Let me read the ollama-offload-stats shape and the route-savings/token-economy files:

### Assistant | 2026-05-25T03:04:53.677Z

[tool_use: Bash]

### Assistant | 2026-05-25T03:04:54.579Z

[tool_use: Bash]

### User | 2026-05-25T03:05:05.248Z

[tool_result] top-level keys: schemaVersion, lastUpdated, lastReset, offloaded, keptOnClaude, estimatedTokensSaved, silentSuggestions, injectedSuggestions, byCategory, byHook, events
schema: 2.0.0

### User | 2026-05-25T03:07:15.580Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-25T03:07:17.953Z

Good. Let me find the token-economy and route-savings files and also check for error-pattern-promote:

### Assistant | 2026-05-25T03:07:19.154Z

[tool_use: Bash]

### Assistant | 2026-05-25T03:07:19.917Z

[tool_use: Bash]

### User | 2026-05-25T03:07:53.039Z

[tool_result] (Bash completed with no output)

### User | 2026-05-25T03:08:10.018Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-25T03:08:12.182Z

Let me search for the actual file paths using Grep:

### Assistant | 2026-05-25T03:08:12.876Z

[tool_use: Grep]

### User | 2026-05-25T03:08:23.908Z

[tool_result] .claude\hooks\error-pattern-promote.mjs:4: * error-pattern-promote.mjs — Stop hook.
.claude\hooks\error-pattern-promote.mjs:27:const MEMO = "H:/prism/.claude/cache/error-pattern-promote-last.json";
.claude\hooks\error-pattern-promote.mjs:50:  try { appendFileSync(TELEMETRY, JSON.stringify({ ts: new Date().toISOString(), hook: "error-pattern-promote", decision, ...extra }) + "\n", "utf8"); } catch 
... [+1457 chars truncated]

### Assistant | 2026-05-25T03:08:27.268Z

Now I have all the shapes I need. Let me also quickly check the token-savings-summary hook to understand the exact file paths and structures:

### Assistant | 2026-05-25T03:08:27.269Z

[tool_use: Read]

### Assistant | 2026-05-25T03:08:28.192Z

[tool_use: Grep]

### User | 2026-05-25T03:08:37.491Z

[tool_result] No matches found

### User | 2026-05-25T03:08:38.320Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-token-savings-summary.mjs — Stop hook
5	 *
6	 * TOKEN-SAVINGS-SUMMARY/U-TSS01 (2026-05-24, slot:alpha)
7	 *
8	 * Tails the 5 token-savings telemetry ledgers at every session Stop and emits
9	 * a human-readable one-line summary of estimated savings + top-3 nudge reasons
10	 * as `additionalContext`. Strictly advisory — never blocks Stop.
11	 *
12
... [+2895 chars truncated]

### Assistant | 2026-05-25T03:08:41.047Z

Good. I have enough context now. Let me also quickly check the error-pattern-promote ledger path:

### Assistant | 2026-05-25T03:08:41.397Z

[tool_use: Read]

### User | 2026-05-25T03:08:47.552Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * error-pattern-promote.mjs — Stop hook.
5	 *
6	 * Watches ERROR_LEARN_LEDGER.jsonl. When the same error fingerprint appears
7	 * ≥THRESHOLD times within ROLLING_DAYS, drafts a lesson stub at
8	 * knowledge/wiki/lessons/auto-{fingerprint}.md so the failure mode gets
9	 * captured into wiki and a hook/skill can be designed to prevent recurrence.
10	 *
11
... [+1591 chars truncated]
