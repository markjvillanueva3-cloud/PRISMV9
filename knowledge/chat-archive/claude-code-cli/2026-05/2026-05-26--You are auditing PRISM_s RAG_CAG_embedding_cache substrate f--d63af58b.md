---
type: "chat-session"
source: "claude-code-cli"
session_id: "d63af58b-aaae-45fd-bf3d-c0a2aec5aca0"
title: "You are auditing PRISM's RAG/CAG/embedding/cache substrate for slot india. Outpu"
date: "2026-05-26"
first_ts: "2026-05-26T14:37:26.532Z"
last_ts: "2026-05-26T15:02:10.197Z"
cwd: "H:\\prism"
messages: 56
user_msgs: 24
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/d63af58b-aaae-45fd-bf3d-c0a2aec5aca0/subagents/agent-a9f9f998b7b70020e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# You are auditing PRISM's RAG/CAG/embedding/cache substrate for slot india. Outpu

> **claude-code-cli** | 2026-05-26 | 56 msgs (24 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d63af58b-aaae-45fd-bf3d-c0a2aec5aca0/subagents/agent-a9f9f998b7b70020e.jsonl`

## Transcript

### User | 2026-05-26T14:37:26.532Z

You are auditing PRISM's RAG/CAG/embedding/cache substrate for slot india. Output a TIGHT findings report to disk + return a ≤200-word summary.

## Scope

PRISM's vector retrieval + prompt-cache + per-prompt injection stack:
- `PromptCachingEngine` — `mcp-server/src/engines/PromptCachingEngine.ts` if it exists, plus its test `mcp-server/src/__tests__/PromptCachingEngine.test.ts` (28 tests, AGENT-MS5 U-AGT19)
- Qdrant (`qdrant_capacity_plan`, `qdrant_vector_search`, `qdrant_vector_upsert`)
- Embedding stack — `embeddings_*` dispatcher (init, generate, search, hyperbolic, RaBitQ quantization)
- Per-prompt injectors (8 documented, per AUDIT-2026-05-16 F1):
  - `master-index-precheck-inject.mjs`
  - `wiki-precheck-inject.mjs`
  - `memory-relevance-inject.mjs`
  - `tribal-by-domain-inject.mjs`
  - `psn-leg-state-inject.mjs`
  - `slot-context-bundle-inject.mjs`
  - `slot-soul-inject.mjs`
  - `subagent-start-context.mjs` (SubagentStart)
- AUDIT-2026-05-16 F1 (P1, open) — *"8 per-turn injectors re-emit static doctrine every turn, churning the message-level prompt cache. Move static→SessionStart."*
- AUDIT-2026-05-16 F6 (P1, open) — *"no context-utilization telemetry"*

## Goal — 5 concrete answers

1. Does `PromptCachingEngine.buildCachedSystem()` actually get called anywhere in `.claude/hooks/`? Grep it.
2. What's the actual per-prompt token cost of the 8 injectors? Read `state/shared/AUDIT-HOOK-STACK-COST-BASELINE.json` if it exists.
3. Which of those 8 injectors emit STATIC content (same across sessions) vs DYNAMIC (changes per session)? Classify each — cold vs hot per akshay_pachaar's framing.
4. RaBitQ quantization — is it built? Active? `embeddings_rabitq_status`.
5. Memory-relevance + tribal-by-domain — are they hitting Qdrant or a local index? Read the hook code briefly.

## Inspect

- `.claude/hooks/master-index-precheck-inject.mjs`, `wiki-precheck-inject.mjs`, `memory-relevance-inject.mjs`, `tribal-by-domain-inject.mjs` (head -50 each)
- `mcp-server/src/engines/Pr
... [+751 chars truncated]

### Assistant | 2026-05-26T14:37:50.373Z

I'll audit PRISM's RAG/CAG/embedding/cache substrate systematically. Let me start by examining the key files in parallel.

### Assistant | 2026-05-26T14:37:51.345Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:37:53.364Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:37:54.163Z

[tool_use: Grep]

### User | 2026-05-26T14:38:35.589Z

[tool_result] No files found

### User | 2026-05-26T14:39:34.090Z

[tool_result] H:/prism/mcp-server/src/__tests__/PromptCachingEngine.test.ts  10.4K
H:/prism/mcp-server/src/engines/PromptCachingEngine.ts  8.7K
H:/prism/scripts/audit-hook-stack-cost.mjs  4.8K
H:/prism/state/shared/AUDIT-HOOK-STACK-COST-BASELINE.json  33.8K

### User | 2026-05-26T14:39:34.618Z

[tool_result] (empty)

### Assistant | 2026-05-26T14:39:38.848Z

I'll continue the audit, noting the graph hints. Let me read the key files in parallel.

### Assistant | 2026-05-26T14:39:39.237Z

[tool_use: Read]

### Assistant | 2026-05-26T14:39:40.241Z

[tool_use: Read]

### Assistant | 2026-05-26T14:39:40.401Z

[tool_use: Read]

### User | 2026-05-26T14:39:59.837Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * audit-hook-stack-cost.mjs — META artifact for /forge-audit-v2 token-saving audit
4	 * (2026-05-16, slot juliett).
5	 *
6	 * Re-runnable measurement tool. Reads C:/Users/wompu/.claude/settings.json
7	 * (canonical hook source), enumerates UserPromptSubmit + SessionStart + PreToolUse
8	 * + Stop chains, scores each by per-event token-cost potential, and emits a
9	 * 
... [+4939 chars truncated]

### User | 2026-05-26T14:39:59.864Z

[tool_result] 1	/**
2	 * PromptCachingEngine
3	 * ====================
4	 *
5	 * AGENT-MS5 U-AGT19 — Wraps system prompts and common context chunks with
6	 * Anthropic prompt caching markers (cache_control) so LLMEngine can pass
7	 * them directly to the SDK without each caller knowing the marker format.
8	 *
9	 * Anthropic prompt caching spec (condensed):
10	 *   - system prompt blocks may be marked { type:"ep
... [+8922 chars truncated]

### User | 2026-05-26T14:39:59.894Z

[tool_result] 1	{
2	  "generatedAt": "2026-05-16T21:13:19.607Z",
3	  "byEvent": [
4	    {
5	      "event": "SessionStart",
6	      "count": 39,
7	      "total_est_tokens": 3590,
8	      "hooks": [
9	        {
10	          "event": "SessionStart",
11	          "matcher": "*",
12	          "name": "stress-harness-emit.mjs\"",
13	          "role": "guard",
14	          "timeout_ms": 2000,
15	          "est_tokens_
... [+38105 chars truncated]

### Assistant | 2026-05-26T14:40:10.489Z

Critical finding so far: `PromptCachingEngine.ts` exists and is wired into MCP layer, but NOT used in any `.claude/hooks/*.mjs` file. Let me verify by checking the WIRE-UNWIRED-MS0/U-WIRE-PC commit context + the 8 injectors + RaBitQ status.

### Assistant | 2026-05-26T14:40:12.492Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:40:13.445Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:40:16.519Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:40:17.304Z

[tool_use: Read]

### User | 2026-05-26T14:40:29.089Z

[tool_result] 1	---
2	name: article-synthesis-memory-cag-2026-05-26
3	type: architecture
4	status: synthesis
5	shipped: 2026-05-26
6	slot: india
7	schemaVersion: 1.0.0
8	sources:
9	  - https://x.com/dunik_7/status/2058905748579418615
10	  - https://x.com/akshay_pachaar/status/2056714042455343160
11	related:
12	  - audit-token-context-memory-2026-05-16
13	  - backend-dev-token-efficiency
14	  - promptcachingengi
... [+7038 chars truncated]

### User | 2026-05-26T14:41:15.857Z

[tool_result] H:/prism/.claude/hooks/master-index-precheck-inject.mjs  9.8K
H:/prism/.claude/hooks/memory-relevance-inject.mjs  10.7K
H:/prism/.claude/hooks/psn-leg-state-inject.mjs  11.1K
H:/prism/.claude/hooks/slot-context-bundle-inject.mjs  6.3K
H:/prism/.claude/hooks/slot-soul-inject.mjs  4.6K
H:/prism/.claude/hooks/subagent-start-context.mjs  2.7K
H:/prism/.claude/hooks/tribal-by-domain-inject.mjs  14.0K
H
... [+53 chars truncated]

### User | 2026-05-26T14:41:17.449Z

[tool_result] H:/prism/mcp-server/src/engines/PromptCachingEngine.ts
H:/prism/mcp-server/src/schemas/devActionSchemas.ts
H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts
H:/prism/mcp-server/src/__tests__/dispatcher.promptCaching.test.ts
H:/prism/mcp-server/src/__tests__/PromptCachingEngine.test.ts

### User | 2026-05-26T14:44:49.413Z

[tool_result] H:/prism/.claude/cache/hook-telemetry.jsonl
H:/prism/.claude/cache/read-once-registry
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/data/state/ACTION_RESOLUTION_INDEX.json
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/data/state/ALIAS_TABLE_INDEX.json
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/data/state/ENGINE_USAGE_INDEX.json
H:/prism/.claude/wo
... [+1475 chars truncated]

### Assistant | 2026-05-26T14:44:55.313Z

Critical confirmation: `PromptCachingEngine` is wired only to `devDispatcher` (MCP tool layer), NOT to any of the 8 `.claude/hooks/*.mjs` injectors. Let me read injector heads + the dispatcher wire to classify cold/hot + check RaBitQ status.

### Assistant | 2026-05-26T14:44:56.340Z

[tool_use: Read]

### Assistant | 2026-05-26T14:44:57.350Z

[tool_use: Read]

### Assistant | 2026-05-26T14:44:57.856Z

[tool_use: Read]

### Assistant | 2026-05-26T14:44:58.623Z

[tool_use: Read]

### User | 2026-05-26T14:45:11.303Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+2844 chars truncated]

### User | 2026-05-26T14:45:11.345Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// tribal-by-domain-inject.mjs — UserPromptSubmit
4	//
5	// SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT.
6	//
7	// Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN: the wiki-precheck-inject hook
8	// already biases wiki-entry ranking toward the active chat-slot's milestone
9	// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
10	// knowledge — 
... [+3149 chars truncated]

### User | 2026-05-26T14:45:11.405Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * memory-relevance-inject.mjs — PreToolUse hook for Edit/Write/MultiEdit.
5	 *
6	 * Before the user edits a file, scan their auto-memory directory for
7	 * any feedback memo that mentions the file path, basename, or symbol
8	 * derived from it. Inject the top-3 matches as PreToolUse context.
9	 *
10	 * Goal: "no repeated mistakes." If past feedback says
... [+2458 chars truncated]

### User | 2026-05-26T14:45:11.437Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+3519 chars truncated]

### Assistant | 2026-05-26T14:45:19.140Z

I have enough to write the findings. Let me check the remaining 4 injectors briefly + RaBitQ + then commit findings.

### Assistant | 2026-05-26T14:45:20.104Z

[tool_use: Read]

### Assistant | 2026-05-26T14:45:20.623Z

[tool_use: Read]

### Assistant | 2026-05-26T14:45:21.642Z

[tool_use: Read]

### Assistant | 2026-05-26T14:45:22.128Z

[tool_use: Read]

### Assistant | 2026-05-26T14:45:23.713Z

[tool_use: Bash]

### User | 2026-05-26T14:45:41.097Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-FLEET-PRECHECK — per-slot context-bundle precheck.
4	//
5	// UserPromptSubmit hook. For the slot bound to this chat, calls loadSlotContext
6	// from scripts/lib/zebra-context-bundle.mjs and injects a COMPACT summary of
7	// the slot's MS0 read-side state (soul refuse_list / loop running / token zone
8	// / bridge units availabl
... [+1426 chars truncated]

### User | 2026-05-26T14:45:41.172Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * subagent-start-context.mjs — SubagentStart hook
5	 *
6	 * Injects the PRISM spawned-agent context bundle into every spawned
7	 * subagent's first turn so it operates with the same awareness as
8	 * the primary Claude session.
9	 *
10	 * Reads stdin JSON: { subagent_type, prompt?, session_id?, ... }
11	 * Emits stdout JSON: { continue: true, additional
... [+2576 chars truncated]

### User | 2026-05-26T14:45:41.351Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3 (advisory)
3	/**
4	 * psn-leg-state-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Companion to psn-prompt-checklist-inject.mjs (U-PSN-PROMPT-CHECKLIST-INJECT).
7	 * The CHECKLIST hook tells the model "consult the substrate"; this hook IS
8	 * one of the substrates it should consult — a compact per-PSN-leg health
9	 * digest that surfaces ONLY legs in a concer
... [+1597 chars truncated]

### User | 2026-05-26T14:45:41.413Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// HERMES-MS0 / U-HERMES02 — slot-soul-inject UserPromptSubmit hook.
4	// Reads state/shared/slot-souls/<slot>.md for the current slot, injects the
5	// frontmatter + voice/behavior sections as additionalContext on every prompt.
6	// Keeps each slot's "Hermes personality" consistent across /compact + reload.
7	//
8	// Safety: never throws (UserPromptSubmit mus
... [+1604 chars truncated]

### User | 2026-05-26T14:46:56.826Z

[tool_result] ---
H:/prism/mcp-server/src/engines/QuantizationProfileEngine.ts
H:/prism/mcp-server/src/tools/dispatchers/sessionDispatcher.ts

### Assistant | 2026-05-26T14:47:02.870Z

I have enough data. Let me check RaBitQ + mkdir + write the findings.

### Assistant | 2026-05-26T14:47:04.900Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:47:05.584Z

[tool_use: Bash]

### User | 2026-05-26T14:49:30.490Z

[tool_result] H:/prism/mcp-server/src/engines/QuantizationProfileEngine.ts
---DISPATCHER---
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'embeddings_rabitq'

### User | 2026-05-26T14:54:46.034Z

[tool_result] Command running in background with ID: brek7m6y8. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\d63af58b-aaae-45fd-bf3d-c0a2aec5aca0\tasks\brek7m6y8.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-26T14:54:51.360Z

CRITICAL R12 finding: `embeddings_rabitq_*` actions are documented in MCP tool descriptions but **NOT IN ANY DISPATCHER** (0 matches). The `QuantizationProfileEngine.ts` exists but the dispatcher action is unwired. Let me verify + check sessionDispatcher.

### Assistant | 2026-05-26T14:54:53.160Z

[tool_use: Bash]

### User | 2026-05-26T14:59:37.054Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2 matches in 1 files:

H:/.../dispatchers/sessionDispatcher.ts:352:// HMEMV11 QuantizationProfileEngine — RaBitQ profile selector.
H:/.../dispatchers/sessionDispatcher.ts:2968:// HMEMV11 QuantizationProfileEngine — RaBitQ profile selector.
---

### Assistant | 2026-05-26T14:59:42.080Z

Confirmed — RaBitQ is profile-selection logic only, NOT a wired `embeddings_rabitq_*` dispatcher. The MCP `embeddings_*` tool description advertises actions that don't exist in any dispatcher. R12 fail-loud applies. Let me write the findings.

### Assistant | 2026-05-26T15:00:46.913Z

[tool_use: Write]

### User | 2026-05-26T15:01:55.339Z

[tool_result] File created successfully at: H:/prism/state/shared/audit-2026-05-26-india/03-rag-cag-embeddings.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-26T15:02:10.197Z

Findings file written. Returning summary.

---

# RAG/CAG/Embeddings Audit — slot india, 2026-05-26

**Findings file:** `H:/prism/state/shared/audit-2026-05-26-india/03-rag-cag-embeddings.md`

**Core gap (R12 fail-loud):** `PromptCachingEngine` (8.7 KB, 28 tests, AGENT-MS5 U-AGT19) is wired to the `prism_dev` MCP dispatcher but to **zero `.claude/hooks/*.mjs` files**. The 8 per-turn injectors documented in AUDIT-2026-05-16 F1 do NOT call `buildCachedSystem()`. F1's static-doctrine churn is exactly the unbridged gap between the built engine and the live hook chain.

**8 injectors classified:** 1 pure-cold (`slot-soul-inject`), 5 mixed (master-index, wiki-precheck, tribal-by-domain, psn-leg-state, subagent-start-context), 2 pure-hot (`memory-relevance`, `slot-context-bundle`). RaBitQ is a P1 R12 violation — `embeddings_rabitq_{build,search,status}` advertised in tool descriptions but zero matches in any dispatcher; only `QuantizationProfileEngine.ts` (profile selector) exists. None of the per-prompt injectors hit Qdrant — all use local JSON + on-demand Ollama embeds.

**Top-3 highest-ROI cold-cache candidates:**

1. **U-CAG-01-soul-to-sessionstart** — `slot-soul-inject` is frozen per slot, currently ~400 tok × every prompt. Move to SessionStart cached block via `promptCachingEngine.wrapSystemPrompt()`. Cheapest first win.
2. **U-CAG-02-telemetry-channel** — closes F6. `getStats()` already tracks hit_rate; surface to `state/shared/dashboards/prompt-cache-stats.jsonl` via Stop hook. Required calibration before F1 numbers are commitable.
3. **U-CAG-03-static-slice-extract** — closes F1 mid-slice. Carve cold portions (graph dump, BM25 vocab, leaf-index head) of `master-index-precheck` + `wiki-precheck` to SessionStart cached blocks; keep per-prompt rerank hot. ~800→~80 tok/prompt.
