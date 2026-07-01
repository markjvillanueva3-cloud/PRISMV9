---
type: "chat-session"
source: "claude-code-cli"
session_id: "36cb00e1-ecc1-4886-b128-a112144308fc"
title: "You are auditing per-turn token-injection cost for the PRISM fleet (slot:alpha, "
date: "2026-06-11"
first_ts: "2026-06-11T19:19:14.360Z"
last_ts: "2026-06-11T19:22:02.414Z"
cwd: "H:\\prism-slot-alpha"
messages: 48
user_msgs: 21
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism-slot-alpha/36cb00e1-ecc1-4886-b128-a112144308fc/subagents/agent-a322f9536cba608bf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# You are auditing per-turn token-injection cost for the PRISM fleet (slot:alpha, 

> **claude-code-cli** | 2026-06-11 | 48 msgs (21 user / 27 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/36cb00e1-ecc1-4886-b128-a112144308fc/subagents/agent-a322f9536cba608bf.jsonl`

## Transcript

### User | 2026-06-11T19:19:14.360Z

You are auditing per-turn token-injection cost for the PRISM fleet (slot:alpha, token-optimization domain). GOAL: produce a ranked, evidence-backed trim list of the heaviest LOW-VALUE per-turn context injections so the orchestrator can make surgical cuts. Be precise and cite file paths + line numbers + the env knob that disables each.

CONTEXT: Every UserPromptSubmit in this fleet injects a large stack of "awareness" blocks (CAG-route, Obsidian vault precheck, slot soul, chat-slot domains, AI-synergy posture, slot context bundle, consensus-queued, PSN-leg-state, operating rules, wiki precheck, master-index pre-search, chat bus, memory vault pre-search, /goal pre-flight, /loop awareness, an OLLAMA PROMPT REWRITE that runs qwen2.5-coder:32b on EVERY prompt (~5s + a full restated prompt), local-compute autostart notice, quality dashboard, etc.). This is the operator's #1 concern: "we're wasting a ton of tokens each turn in each chat slot."

DO THIS:
1. Read `H:/.claude/settings.json` (the live wired hooks). Enumerate the `UserPromptSubmit` hook chain (and note `SessionStart` separately). For each hook entry, get its script path + timeout.
2. For each UserPromptSubmit hook, determine WHAT it injects every turn and estimate its per-turn token cost (read the hook's emitted-block shape / docstring; estimate chars/4). Note which have a dedup/throttle (cheap) vs which re-inject full blocks every turn (expensive).
3. Specifically assess these likely-high-cost items and whether they earn their cost:
   - the Ollama prompt-rewriter hook (runs an LLM every prompt; injects a full restatement marked "planning only, raw prompt authoritative") — is it load-bearing or removable/gateable?
   - chat-slot-domains (full 26-slot table every turn), slot-soul (full soul every turn), operating-rules, /goal-preflight, /loop-awareness, master-index pre-search, memory/wiki/obsidian prechecks, cross-galaxy cards, slot-context-bundle.
4. For EACH, classify: KEEP (load-bearing), THROTTLE (re-injec
... [+771 chars truncated]

### Assistant | 2026-06-11T19:19:21.534Z

[tool_use: Read]

### User | 2026-06-11T19:19:23.616Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1437 of 1911 total (28256 tokens, cap 25000). Call Read with offset=1438 limit=1437 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PRISM_FLEET_REAPER_DISABLE": "0",
5	    "PRISM_GOLF
... [+57058 chars truncated]

### Assistant | 2026-06-11T19:19:28.897Z

Let me read the rest of the UserPromptSubmit chain and then sample the key hook files.

### Assistant | 2026-06-11T19:19:29.387Z

[tool_use: Read]

### User | 2026-06-11T19:19:32.243Z

[tool_result] 1437	          },
1438	          {
1439	            "type": "command",
1440	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/token-awareness-inject.mjs",
1441	            "timeout": 2000
1442	          },
1443	          {
1444	            "type": "command",
1445	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/audit-viz-first-inject.mjs
... [+18261 chars truncated]

### Assistant | 2026-06-11T19:19:41.369Z

Now let me read the key expensive hooks to get their injection size:

### Assistant | 2026-06-11T19:19:42.320Z

[tool_use: Read]

### Assistant | 2026-06-11T19:19:42.619Z

[tool_use: Read]

### Assistant | 2026-06-11T19:19:42.752Z

[tool_use: Read]

### User | 2026-06-11T19:19:45.871Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// ZULU-OMNISCIENT-MS0/U-ZO-MS0-FLEET-PRECHECK — per-slot context-bundle precheck.
4	//
5	// UserPromptSubmit hook. For the slot bound to this chat, calls loadSlotContext
6	// from scripts/lib/zulu-context-bundle.mjs and injects a COMPACT summary of
7	// the slot's MS0 read-side state (soul refuse_list / loop running / token zone
8	// / bridge units available 
... [+14648 chars truncated]

### User | 2026-06-11T19:19:46.315Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// HERMES-MS0 / U-HERMES02 — slot-soul-inject UserPromptSubmit hook.
4	// Reads state/shared/slot-souls/<slot>.md for the current slot, injects the
5	// frontmatter + voice/behavior sections as additionalContext on every prompt.
6	// Keeps each slot's "Hermes personality" consistent across /compact + reload.
7	//
8	// Safety: never throws (UserPromptSubmit mus
... [+5295 chars truncated]

### User | 2026-06-11T19:19:46.361Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * slot-domain-awareness-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Reads `state/shared/CHAT-SLOT-DOMAINS.md` (operator-canonical slot-domain
7	 * designations) + this chat's current slot binding from `state/shared/chat-slots.json`,
8	 * emits a compact slot-domain table as `additionalContext` so every chat in the
9	 * fleet knows what every other cha
... [+7349 chars truncated]

### Assistant | 2026-06-11T19:19:54.213Z

Now let me read the remaining high-cost hooks in parallel:

### Assistant | 2026-06-11T19:19:55.330Z

[tool_use: Read]

### Assistant | 2026-06-11T19:19:56.104Z

[tool_use: Read]

### Assistant | 2026-06-11T19:19:56.497Z

[tool_use: Read]

### Assistant | 2026-06-11T19:19:56.946Z

[tool_use: Read]

### User | 2026-06-11T19:20:06.213Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+4725 chars truncated]

### User | 2026-06-11T19:20:06.321Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// memory-index-precheck-inject.mjs — UserPromptSubmit injector (T2, advisory).
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: surfaces top-K direct hits over
6	// the Obsidian memory vault (~492 files at audit time) when a user prompt
7	// has 2+ content tokens. Closes the gap left by master-index-precheck-inject
8	// (system-graph node search; only fin
... [+3754 chars truncated]

### User | 2026-06-11T19:20:06.489Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * obsidian-vault-precheck-inject.mjs — UserPromptSubmit
5	 *
6	 * HIGH-ROI-TS2/iter1 (audit-remainder loop, 2026-05-22). Closes Finding F2
7	 * from OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18.md.
8	 *
9	 * Surfaces user-written Obsidian vault notes (decisions/errors/research/
10	 * specs/claude-md/lint-reports/code-index/data-index/Materials) that match
1
... [+2891 chars truncated]

### User | 2026-06-11T19:20:06.526Z

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
... [+4780 chars truncated]

### Assistant | 2026-06-11T19:20:11.611Z

Now let me read the remaining key hooks:

### Assistant | 2026-06-11T19:20:12.426Z

[tool_use: Read]

### Assistant | 2026-06-11T19:20:13.190Z

[tool_use: Read]

### Assistant | 2026-06-11T19:20:13.960Z

[tool_use: Read]

### User | 2026-06-11T19:20:14.153Z

[tool_result] 1	// tier: T4
2	/**
3	 * local-compute-intent.mjs — UserPromptSubmit hook
4	 * RE-ENABLED: 2026-04-26 (LOCAL-LLM-MS0 U-LLMH02)
5	 *
6	 * Detects prompts that would benefit from the local compute stack
7	 * (Ollama for local LLM inference / embeddings, Docker for service
8	 * containers like Qdrant / postgres / prometheus).
9	 *
10	 * When intent is detected and the relevant stack is not already ru
... [+3173 chars truncated]

### Assistant | 2026-06-11T19:20:14.393Z

[tool_use: Read]

### User | 2026-06-11T19:20:20.117Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// .claude/hooks/cag-router-inject.mjs
4	//
5	// TOKEN-SAVINGS-PIVOT/U-CAG-HOOK-INJECT (sierra iter28 2026-05-26):
6	// UserPromptSubmit hook that classifies the operator's prompt as
7	// COLD / HOT / HYBRID via scripts/lib/cag-router.mjs and writes a route
8	// decision sidecar that downstream static-doctrine injectors
9	// (master-index-precheck-inject, memo
... [+2532 chars truncated]

### User | 2026-06-11T19:20:20.224Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3 (advisory)
3	/**
4	 * psn-leg-state-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Companion to psn-prompt-checklist-inject.mjs (U-PSN-PROMPT-CHECKLIST-INJECT).
7	 * The CHECKLIST hook tells the model "consult the substrate"; this hook IS
8	 * one of the substrates it should consult — a compact per-PSN-leg health
9	 * digest that surfaces ONLY legs in a concer
... [+4620 chars truncated]

### User | 2026-06-11T19:20:23.428Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// AI-SYNERGY-AUDIT-MS0/U-AISYN-AWARENESS (slot:charlie) -- per-galaxy AI-synergy
4	// awareness injector + the audit generator's auto-invoker (closes U-AISYN-CORE's
5	// R15 WIRE obligation).
6	//
7	// UserPromptSubmit hook. For the galaxy bound to THIS chat's slot, injects a
8	// COMPACT AI-synergy posture from state/shared/specs/AI-SYNERGY-AUDIT.json:
9	// 
... [+3281 chars truncated]

### Assistant | 2026-06-11T19:20:30.839Z

Now let me check a few more targeted hooks for their injection size and dedup behavior:

### Assistant | 2026-06-11T19:20:31.974Z

[tool_use: Read]

### Assistant | 2026-06-11T19:20:32.736Z

[tool_use: Read]

### Assistant | 2026-06-11T19:20:33.567Z

[tool_use: Read]

### Assistant | 2026-06-11T19:20:33.942Z

[tool_use: Read]

### User | 2026-06-11T19:20:39.390Z

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
... [+3582 chars truncated]

### User | 2026-06-11T19:20:39.510Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// HERMES-MASTER-ORCHESTRATOR / slot-brief-inject — UserPromptSubmit hook.
4	//
5	// THE targeted orchestrator->slot channel. The Hermes app (slot-less ZULU master)
6	// runs as a separate process and CANNOT inject into a Claude slot's context. So it
7	// writes a work-order / pointer-bundle to state/shared/slot-briefs/<slot>.md, and
8	// THIS hook surfaces it
... [+2770 chars truncated]

### User | 2026-06-11T19:20:40.615Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * memory-rag-inject.mjs — UserPromptSubmit hook
5	 *
6	 * When the user prompt contains memory-recall keywords (remember, recall,
7	 * previous, last time, earlier, prior, before, context from), surface the
8	 * most relevant entries from the H-drive vault (knowledge/memories/) and
9	 * inject them as additional context.
10	 *
11	 * INTEL-OLLAMA-OBSIDIA
... [+2912 chars truncated]

### User | 2026-06-11T19:20:40.677Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * node-card-prefetch-inject.mjs — UserPromptSubmit injector
5	 * (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-PREFETCH-HOOK, slot:sierra)
6	 *
7	 * When a prompt NAMES a system-viz node id (e.g. `eng.mill`, `ghost.galaxy.wedm`,
8	 * `formula.kienzle`), this hook SEEKS that node's compact card from the offset
9	 * index and injects it as additionalContext — so th
... [+2711 chars truncated]

### Assistant | 2026-06-11T19:20:44.949Z

Now I have enough data. Let me check a few final hooks quickly:

### Assistant | 2026-06-11T19:20:46.144Z

[tool_use: Read]

### Assistant | 2026-06-11T19:20:46.908Z

[tool_use: Read]

### Assistant | 2026-06-11T19:20:47.364Z

[tool_use: Read]

### User | 2026-06-11T19:20:50.860Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * prompt-context-inject.mjs — UserPromptSubmit hook (PRISM-STAB-MS0/U-C2).
5	 *
6	 * Reads the pre-aggregated bundle written by the context-bundle daemon
7	 * (prism-awareness-bundle.mjs --daemon) and emits ONE compact injection
8	 * block per prompt. Replaces the per-prompt fork storm of 24 individual
9	 * injectors that each computed the same context 
... [+1978 chars truncated]

### User | 2026-06-11T19:20:50.973Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3 (advisory, fires-last)
3	/**
4	 * psn-prompt-checklist-inject.mjs — UserPromptSubmit injector
5	 *
6	 * The fleet's UserPromptSubmit chain emits a rich context bundle on every
7	 * prompt: master-index hits, wiki precheck, memory pre-search, tribal
8	 * context, slot-soul, Obsidian vault precheck, chat-bus, route-suggest, etc.
9	 * The model nonetheless often sk
... [+2593 chars truncated]

### User | 2026-06-11T19:20:50.998Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2  (injector — additive UserPromptSubmit context)
3	// whiskey-lathe-context-inject.mjs  (WHISKEY-LATHE-GALAXY-SYNERGY, operator 2026-05-28, slot:whiskey)
4	// Slot-gated injector — gives the Lathe Wizard lathe-galaxy domain context. Fires on
5	// slot==whiskey OR a lathe-domain keyword in the prompt (mirrors DELTA-CAD-GALAXY-SYNERGY:
6	// "slot==delta OR cad-keyw
... [+3053 chars truncated]

### Assistant | 2026-06-11T19:22:02.414Z

I now have enough data to produce the full ranked table. Here it is:

---

## UserPromptSubmit Hook Chain — Per-Turn Token Injection Cost Audit

**Methodology:** token estimate = injection chars / 4. Dedup = content-hash TTL that suppresses re-injection within window; throttle = same-prompt hash suppression (60s default). "Every turn" = no dedup/throttle, fires on every UserPromptSubmit unconditionally.

| # | Hook (script path) | Est tokens/turn | Latency | Current dedup? | Value | Recommendation | Disable knob | File |
|---|---|---|---|---|---|---|---|---|
| 1 | **tribal-by-domain-inject.mjs** | ~600–900 | 2500ms + Ollama embed subprocess | Throttle 60s (same prompt); CAG cold-skip | HIGH (domain context) | GATE: already CAG-gated for COLD prompts; extend throttle to 5min; reduce TOP_K 3→2 | `PRISM_TRIBAL_DOMAIN_INJECT_DISABLE=1` / `PRISM_TRIBAL_DOMAIN_INJECT_THROTTLE_MS` | `H:/prism/.claude/hooks/tribal-by-domain-inject.mjs:59` |
| 2 | **master-index-precheck-inject.mjs** | ~500–800 | 3000ms | Throttle 60s (same prompt); CAG cold-skip | HIGH (search-first discipline) | THROTTLE: already has throttle; raise default 60s→300s; reduce TOP_K 5→3 | `PRISM_MASTER_INDEX_INJECT=0` / `PRISM_MASTER_INDEX_THROTTLE_MS` / `PRISM_MASTER_INDEX_K` | `H:/prism/.claude/hooks/master-index-precheck-inject.mjs:77` |
| 3 | **slot-context-bundle-inject.mjs** | ~400–600 | 3000ms | Content-hash dedup via `injection-dedup-emit.mjs` (session-keyed) | HIGH (slot state, loop, token zone, bridge units, cross-galaxy card) | THROTTLE: dedup already in place but cross-galaxy card (`xgalaxy-inject`) bypasses the dedup hash — changes every prompt on varied queries. Cap cross-galaxy inject to 1 card; raise TTL to 10min | `PRISM_SLOT_CONTEXT_INJECT_DISABLE=1` | `H:/prism/.claude/hooks/slot-context-bundle-inject.mjs:187` |
| 4 | **memory-index-precheck-inject.mjs** | ~400–600 | 5000ms | Throttle 60s (same prompt) | MEDIUM-HIGH (memory recall) | THROTTLE: already throttled; raise to 300s; reduce TOP_K 
... [+9147 chars truncated]
