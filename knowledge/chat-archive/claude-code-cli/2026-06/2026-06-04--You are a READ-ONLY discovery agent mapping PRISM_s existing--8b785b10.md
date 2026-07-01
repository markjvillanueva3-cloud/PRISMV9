---
type: "chat-session"
source: "claude-code-cli"
session_id: "8b785b10-fc31-4613-8c28-594f7533b4f2"
title: "You are a READ-ONLY discovery agent mapping PRISM's existing infrastructure (rep"
date: "2026-06-04"
first_ts: "2026-06-04T16:35:07.195Z"
last_ts: "2026-06-04T16:39:23.927Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 13
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/workflows/wf_c89ffb0e-9fc/agent-aef9841e984d43217.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# You are a READ-ONLY discovery agent mapping PRISM's existing infrastructure (rep

> **claude-code-cli** | 2026-06-04 | 32 msgs (13 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/workflows/wf_c89ffb0e-9fc/agent-aef9841e984d43217.jsonl`

## Transcript

### User | 2026-06-04T16:35:07.195Z

You are a READ-ONLY discovery agent mapping PRISM's existing infrastructure (repo root H:/prism, Windows). Use Grep/Glob/Read and the master-index. Do NOT edit, write, or commit anything. Be concrete: name exact files (absolute paths), exported functions/APIs, dispatcher actions, env knobs, and current behavior. Flag what is BUILT-and-WORKING vs BUILT-but-DEAD vs MISSING. Return PLAIN TEXT (no JSON), tight and factual — this feeds a synthesis agent that will write a build plan.

LENS B — OLLAMA / LOCAL-LLM OFFLOAD SURFACE + DEAD-OFFLOADER DIAGNOSIS. Map: .claude/hooks/lib/ollama-cost-router.mjs (routeModelForTask tiers), scripts/lib/multi-provider-router.mjs, scripts/lib/host-aware-synthesis-model.mjs (resolveSynthesisModel), .claude/hooks/lib/ollama-hook-bridge.mjs (OllamaHookBridge), scripts/ask-ollama.mjs, .claude/hooks/ollama-pipeline-injector.mjs, ollama-task-offloader, and the OllamaHookBridgeEngine. CRITICAL: read .claude/hooks/ollama-route-pretooluse.mjs decideRoute() + runRoute() and explain EXACTLY why it returns action 'suggest' instead of 'reroute' in auto mode (the dead offloader — "4732 fires / 0 offloads" per ZULU brief U-BW-OFFLOAD-HOOK-WIRE). Is there an env gate (PRISM_OLLAMA_ROUTE_AUTO) or a logic bug? What is the minimal fix to make auto-mode actually reroute Read→Ollama-summary? Note current offload take-rate telemetry (ollama-offload-stats.json ~11-12%).

### Assistant | 2026-06-04T16:35:32.598Z

[tool_use: Bash]

### Assistant | 2026-06-04T16:35:32.603Z

[tool_use: Glob]

### Assistant | 2026-06-04T16:35:29.675Z

I'll map the Ollama/local-LLM offload surface and diagnose the dead offloader. Let me start by reading the critical files in parallel.

### User | 2026-06-04T16:36:00.574Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T16:36:04.052Z

[tool_result] -rw-r--r-- 1 wompu 197611 11566 Jun  4 10:31 H:/prism/.claude/hooks/lib/ollama-cost-router.mjs
-rw-r--r-- 1 wompu 197611  6603 Jun  4 10:28 H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs
-rwxr-xr-x 1 wompu 197611 14326 Jun  4 10:32 H:/prism/.claude/hooks/ollama-pipeline-injector.mjs*
-rwxr-xr-x 1 wompu 197611 23818 Jun  4 10:29 H:/prism/.claude/hooks/ollama-route-pretooluse.mjs*
-rwxr-xr-x 1 wo
... [+252 chars truncated]

### Assistant | 2026-06-04T16:36:09.733Z

Let me read the critical files directly.

### Assistant | 2026-06-04T16:36:09.734Z

[tool_use: Read]

### Assistant | 2026-06-04T16:36:09.738Z

[tool_use: Read]

### User | 2026-06-04T16:36:14.554Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+11864 chars truncated]

### User | 2026-06-04T16:36:14.567Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * ollama-route-pretooluse.mjs — PreToolUse:Read — route trivial bulk reads at the local LLM.
5	 *
6	 * U-HKA04 of HOOKS-AUTOMATION-V2-MS0. Tool-level complement to the prompt-level
7	 * offloaders (ollama-auto-router.mjs / ollama-task-offloader.mjs) and to
8	 * mcp-server/src/engines/OllamaHookBridgeEngine.ts.
9	 *
10	 * WHY: a 50 KB .log / .jsonl / gen
... [+25259 chars truncated]

### Assistant | 2026-06-04T16:36:28.697Z

Now I have the core diagnosis. The key finding: `decideRoute()` in auto mode requires `isGistSafe(filePath)` to return `true` for a `reroute` — and `isGistSafe` excludes ALL structured data (`.json/.jsonl/.csv/.md/.yaml`) and only passes `.log/.txt/.out` or files under `logs/archive` paths. Let me read the remaining files to complete the map.

### Assistant | 2026-06-04T16:36:28.710Z

[tool_use: Read]

### Assistant | 2026-06-04T16:36:28.714Z

[tool_use: Read]

### Assistant | 2026-06-04T16:36:28.716Z

[tool_use: Read]

### User | 2026-06-04T16:36:35.900Z

[tool_result] 1	#!/usr/bin/env node
2	// U-PSN-MULTI-PROVIDER-ROUTER-2026-05-24 — classification + telemetry library
3	// for PRISM's multi-provider AI routing layer (Brij "AI Infrastructure Master
4	// Tree" layer 02 — Frontier Models).
5	//
6	// PURPOSE: When Claude rate-limits, the operator or any automation layer needs
7	// a deterministic answer to "which provider should handle THIS task?" without
8	// mak
... [+21261 chars truncated]

### User | 2026-06-04T16:36:36.037Z

[tool_result] 1	// tier: T4
2	/**
3	 * ollama-hook-bridge.mjs
4	 * Shared helper for hooks to call local Ollama with fast timeout and graceful fallback.
5	 *
6	 * Usage:
7	 *   import { queryOllama, isOllamaAvailable } from './lib/ollama-hook-bridge.mjs';
8	 *   const result = await queryOllama(prompt, { hookType: 'grep_index', timeoutMs: 300 });
9	 *   if (result.success) { use result.response } else { use reg
... [+6883 chars truncated]

### User | 2026-06-04T16:36:36.040Z

[tool_result] 1	// tier: T4
2	// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE — host-aware default model
3	// for local synthesis scripts (galaxy roll-ups, system-viz roost summaries,
4	// Obsidian memory consolidation, ask-ollama heavy modes).
5	//
6	// PROBLEM the work order names: every synthesis script hardcodes
7	// `qwen2.5-coder:7b` (or `:3b`). On the 96GB RTX PRO 6000 Blackwell that
8	// throttl
... [+5022 chars truncated]

### Assistant | 2026-06-04T16:36:45.674Z

Now let me check the offload telemetry stats, the wiring in settings.json, and whether `PRISM_OLLAMA_ROUTE_AUTO` is set anywhere. Let me also look at the route config file and the offloader/pipeline-injector.

### Assistant | 2026-06-04T16:36:47.372Z

[tool_use: Bash]

### Assistant | 2026-06-04T16:36:50.347Z

[tool_use: Bash]

### User | 2026-06-04T16:37:10.475Z

[tool_result] === ollama-offload-stats.json ===
{
  "schemaVersion": "2.0.0",
  "lastUpdated": "2026-06-04T16:36:43.241Z",
  "lastReset": "2026-04-28T00:11:42.432Z",
  "offloaded": 379,
  "keptOnClaude": 2859,
  "estimatedTokensSaved": 348229,
  "silentSuggestions": 498,
  "injectedSuggestions": 375,
  "byCategory": {
    "cache-hit": 2,
    "summary": 162,
    "explanation": 13,
    "prism_audit": 35,
    "doc
... [+3095 chars truncated]

### User | 2026-06-04T16:37:12.178Z

[tool_result] === PRISM_OLLAMA_ROUTE_AUTO in settings.json (C and H) ===

=== ollama-route-pretooluse wired in settings/bundles? ===
H:/prism/.claude/hooks/bundles/read-bundle.mjs

### Assistant | 2026-06-04T16:37:19.776Z

This is the smoking gun. The stats show `ollama-route-pretooluse`: **fired 5491, offloaded 0, kept 5449, suggested 42** — confirming the dead-offloader symptom. And the config is set to `mode: "auto"` with `model: "qwen2.5-coder:7b"`. Let me verify the two compounding root causes: (1) the gist-safe gate, and (2) the model mismatch (config says `7b`, but per the cost-router comments `7b` was RETIRED/deleted from the host). Let me check what's actually installed and confirm the model allowlist failure.

### Assistant | 2026-06-04T16:37:22.467Z

[tool_use: Bash]

### Assistant | 2026-06-04T16:37:24.020Z

[tool_use: Bash]

### User | 2026-06-04T16:37:31.019Z

[tool_result] === Live /api/tags models ===
qwen3-vl:8b-instruct
qwen3-vl:8b
qwen2.5vl:7b
moondream:1.8b
llama3.2-vision:11b
nomic-embed-text:latest
qwen2.5-coder:32b

### User | 2026-06-04T16:37:50.525Z

[tool_result] === recent cascade_model_missing / summarize_failed in hook-telemetry ===
{"hook":"ollama-route-pretooluse","t":"2026-06-04T16:36:31.300Z","event":"cascade_model_missing","file":"H:\\prism\\.claude\\hooks\\lib\\ollama-hook-bridge.mjs","model":"qwen2.5-coder:7b","available":7}
{"hook":"ollama-route-pretooluse","t":"2026-06-04T16:36:31.300Z","event":"cascade_model_missing","file":"H:\\prism\\scripts
... [+2797 chars truncated]

### Assistant | 2026-06-04T16:37:56.722Z

Both root causes now confirmed with live evidence. Let me quickly check the pipeline-injector and ask-ollama briefly, plus confirm there's no `PRISM_OLLAMA_ROUTE_MODEL` env override, to complete the map.

### Assistant | 2026-06-04T16:37:58.486Z

[tool_use: Bash]

### User | 2026-06-04T16:38:15.548Z

[tool_result] === Any PRISM_OLLAMA_ROUTE_MODEL / OLLAMA env in settings ===

=== ollama-pipeline-injector head (purpose/wiring) ===
#!/usr/bin/env node
// tier: T2
/**
 * ollama-pipeline-injector.mjs — UserPromptSubmit hook
 *
 * Fires when the user invokes /forge, /forge-audit, /rgs, /scrutinize, /dedup,
 * /precompact, /handoff or any pipeline that historically did NOT route work
 * to Ollama even though the 
... [+1650 chars truncated]

### Assistant | 2026-06-04T16:39:23.927Z

I have everything needed. No env overrides exist; the config file drives mode/model. The diagnosis is complete and double-confirmed with live telemetry. Here is the map.

---

# LENS B — OLLAMA / LOCAL-LLM OFFLOAD SURFACE + DEAD-OFFLOADER DIAGNOSIS

## THE DEAD OFFLOADER — ROOT CAUSE (the "5491 fires / 0 offloads")

Live telemetry confirms the symptom exactly. `mcp-server/data/state/ollama-offload-stats.json` → `byHook["ollama-route-pretooluse"]`:
```
fired: 5491, offloaded: 0, kept: 5449, suggested: 42, tokensSaved: 0
```
(ZULU brief said "4732/0"; the real current number is 5491/0 — same disease, more fires.)

There are **TWO compounding root causes**. The first is the active blocker right now; the second would still block even if the first were fixed.

### Root cause #1 (ACTIVE BLOCKER) — config model `qwen2.5-coder:7b` is NOT installed → cascade short-circuit to `pass`
- `mcp-server/data/state/ollama-route-config.json` is `{ "mode":"auto", "minKb":24, "model":"qwen2.5-coder:7b" }`. So auto mode IS turned on (the GPU-OFFLOAD-MAXIMIZE-MS0/U2 flip on 2026-05-22 stuck).
- But `7b` was **deleted from the Blackwell host** (BLACKWELL-MODEL-UPGRADE-PLAN, 2026-06-04). Live `/api/tags` returns only: `qwen3-vl:8b-instruct, qwen3-vl:8b, qwen2.5vl:7b, moondream:1.8b, llama3.2-vision:11b, nomic-embed-text:latest, qwen2.5-coder:32b`. No `qwen2.5-coder:7b`.
- In `ollama-route-pretooluse.mjs` `runRoute()` (line 433-439): auto mode fetches `/api/tags`, sets `modelOk = tagsOk && tags.models.includes("qwen2.5-coder:7b")` → **false**, emits `cascade_model_missing`, then `decideRoute()` (line 245-247) returns `action:"pass"` ("configured model not in /api/tags allowlist — cascade short-circuit to raw Read").
- **Live proof** in `.claude/cache/hook-telemetry.jsonl` — dozens of fresh `cascade_model_missing` events today: `{"event":"cascade_model_missing","model":"qwen2.5-coder:7b","available":7}`. Every single auto-mode read short-circuits here. This is why offloaded=0.
- Note: env var
... [+9117 chars truncated]
