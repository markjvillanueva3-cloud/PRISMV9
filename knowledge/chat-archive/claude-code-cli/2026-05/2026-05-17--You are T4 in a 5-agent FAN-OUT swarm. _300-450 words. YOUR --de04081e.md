---
type: "chat-session"
source: "claude-code-cli"
session_id: "de04081e-6889-4962-be91-a88a11910e43"
title: "You are T4 in a 5-agent FAN-OUT swarm. ~300-450 words. YOUR AXIS: **7 Ollama eng"
date: "2026-05-17"
first_ts: "2026-05-17T05:31:46.015Z"
last_ts: "2026-05-17T05:33:55.515Z"
cwd: "H:\\prism"
messages: 23
user_msgs: 10
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-aed9830a0e1ef71f1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# You are T4 in a 5-agent FAN-OUT swarm. ~300-450 words. YOUR AXIS: **7 Ollama eng

> **claude-code-cli** | 2026-05-17 | 23 msgs (10 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-aed9830a0e1ef71f1.jsonl`

## Transcript

### User | 2026-05-17T05:31:46.015Z

You are T4 in a 5-agent FAN-OUT swarm. ~300-450 words.

YOUR AXIS: **7 Ollama engines unwired (A8 finding — recurring theme)**

A8 (iter-2) named: ollama-route-recommender / ollama-skill-suggester / ollama-context-aggregator / ollama-obsidian-rag / ollama-unified-semantic-router / ollama-prism-intelligence / ollama-session-continuity. All shipped, none wired. CLAUDE.md says 17-21 ollama hooks; offload at 22.2% (target 30%).

PROTOCOL:
1. `Grep "ollama" H:/prism/.claude/hooks/ -l` — count + names
2. `Grep "<engine-name>" H:/prism/mcp-server/src/tools/dispatchers/` for each of the 7 named engines (verify zero-dispatcher)
3. Identify which dispatcher each WOULD wire to (`prism_ai`, `prism_memory`, `prism_session`, etc.)
4. Recommend a single bundle unit `U-WIRE-OLLAMA-7` (one commit) vs 7 separate units

Return:
```
## T4 — 7 Ollama engines wiring status
| engine | exists on disk | dispatcher hits | recommended dispatcher | size |
| ollama-route-recommender | ? | ? | prism_ai | ? |
| ... (7 rows)

## T4 — Bundle vs individual
- recommendation: <bundle|individual>
- justification

## T4 — Unit proposal
- name: U-WIRE-OLLAMA-7-BUNDLE
- owner-slot: <bravo — owns OLLAMA-PIPELINE-MS0; OR delta — owns ollama-embedder>
- cost: <M for bundle | 7×S individual>
```

### Assistant | 2026-05-17T05:31:54.211Z

I'll analyze the 7 Ollama engines wiring status across the codebase.

### Assistant | 2026-05-17T05:31:55.927Z

[tool_use: Grep]

### Assistant | 2026-05-17T05:31:56.300Z

[tool_use: Glob]

### Assistant | 2026-05-17T05:31:56.599Z

[tool_use: Glob]

### User | 2026-05-17T05:31:59.000Z

[tool_result] Found 84 files
.claude\hooks\mcp-route-suggest.mjs
.claude\hooks\ollama-task-offloader.mjs
.claude\hooks\ollama-auto-router.mjs
.claude\hooks\tribal-by-domain-inject.mjs
.claude\hooks\lib\ollama-hook-bridge.mjs
.claude\hooks\lib\__tests__\ollama-hook-bridge-format.test.mjs
.claude\hooks\scrutiny-verdict-persist.mjs
.claude\hooks\__tests__\ollama-task-offloader-classify.test.mjs
.claude\hooks\memor
... [+3137 chars truncated]

### User | 2026-05-17T05:31:59.282Z

[tool_result] mcp-server\src\engines\OllamaClientEngine.ts
mcp-server\src\engines\OllamaIntegrationEngine.ts
mcp-server\src\engines\OllamaTaskOffloaderEngine.ts
mcp-server\src\engines\OllamaContextFloorEngine.ts
mcp-server\src\engines\OllamaCAMIntegrationEngine.ts
mcp-server\src\engines\OllamaEmbedderEngine.ts
mcp-server\src\engines\OllamaHookBridgeEngine.ts

### User | 2026-05-17T05:31:59.634Z

[tool_result] mcp-server\src\engines\OllamaClientEngine.ts
mcp-server\src\engines\OllamaIntegrationEngine.ts
mcp-server\src\engines\LatheLoRAOllamaDeployerEngine.ts
mcp-server\src\engines\OllamaTaskOffloaderEngine.ts
mcp-server\src\engines\OllamaContextFloorEngine.ts
mcp-server\src\engines\OllamaCAMIntegrationEngine.ts
mcp-server\src\engines\OllamaEmbedderEngine.ts
mcp-server\src\engines\OllamaHookBridgeEngine.
... [+2 chars truncated]

### Assistant | 2026-05-17T05:32:03.459Z

Critical finding: A8 named 7 "engines" but they are HOOKS (`.mjs` in `.claude/hooks/`), NOT engines (`.ts` in `mcp-server/src/engines/`). Let me verify all 7 exist and check dispatcher integration.

### Assistant | 2026-05-17T05:32:06.565Z

[tool_use: Bash]

### Assistant | 2026-05-17T05:32:08.143Z

[tool_use: Grep]

### Assistant | 2026-05-17T05:32:09.321Z

[tool_use: Grep]

### User | 2026-05-17T05:32:18.997Z

[tool_result] ollama-route-recommender EXISTS 8683B
      0 [main] tr (26944) child_copy: cygheap read copy failed, 0x0..0x80000C390, done 0, windows pid 26944, Win32 error 299
ollama-skill-suggester EXISTS B
ollama-context-aggregator EXISTS 9043B
ollama-obsidian-rag EXISTS 7865B
ollama-unified-semantic-router EXISTS 11092B
ollama-prism-intelligence EXISTS 7948B
ollama-session-continuity EXISTS 4730B

### User | 2026-05-17T05:32:20.912Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### User | 2026-05-17T05:32:21.028Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### Assistant | 2026-05-17T05:32:23.851Z

Confirmed: all 7 hooks exist on disk, **zero are wired** in either settings.json. Let me check bundle inclusion and read frontmatter to determine intended trigger surfaces.

### Assistant | 2026-05-17T05:32:25.431Z

[tool_use: Grep]

### Assistant | 2026-05-17T05:32:26.515Z

[tool_use: Bash]

### User | 2026-05-17T05:32:27.363Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### Assistant | 2026-05-17T05:32:29.148Z

[tool_use: Bash]

### User | 2026-05-17T05:33:21.044Z

[tool_result] 8920 H:/prism/.claude/hooks/ollama-skill-suggester.mjs

### User | 2026-05-17T05:33:30.482Z

[tool_result] === ollama-route-recommender ===
 * ollama-route-recommender.mjs — UserPromptSubmit hook
 * Event: UserPromptSubmit

=== ollama-skill-suggester ===
 * ollama-skill-suggester.mjs — UserPromptSubmit hook

=== ollama-context-aggregator ===
 * ollama-context-aggregator.mjs — Single UserPromptSubmit injection point
 *  ollama-prism-intelligence) with one consolidated pattern matcher.

=== ollama-obsidi
... [+371 chars truncated]

### Assistant | 2026-05-17T05:33:55.515Z

Now I have the full picture. Note: `ollama-context-aggregator` self-documents as "consolidated pattern matcher" intended to REPLACE the others — a key wiring decision.

## T4 — 7 Ollama hooks wiring status

NOTE: A8 called these "engines" but they are HOOKS (`.mjs` in `.claude/hooks/`), not engines (`.ts`). Verified: 0/7 wired in either `settings.json`, 0/7 in any bundle.

| hook | exists | wired (settings/bundles) | intended event | size |
|------|--------|--------------------------|----------------|------|
| ollama-route-recommender | YES | 0 / 0 | UserPromptSubmit | 8683B |
| ollama-skill-suggester | YES | 0 / 0 | UserPromptSubmit | 8920B |
| ollama-context-aggregator | YES | 0 / 0 | UserPromptSubmit (consolidator) | 9043B |
| ollama-obsidian-rag | YES | 0 / 0 | UserPromptSubmit | 7865B |
| ollama-unified-semantic-router | YES | 0 / 0 | UserPromptSubmit | 11092B |
| ollama-prism-intelligence | YES | 0 / 0 | UserPromptSubmit | 7948B |
| ollama-session-continuity | YES | 0 / 0 | **PreCompact** | 4730B |

Total dead code: ~58KB across 7 files. CLAUDE.md "17-21 ollama hooks fire" claim is false-positive; only `ollama-pipeline-injector`, `ollama-prewarm-on-pipeline`, `ollama-task-offloader`, `ollama-auto-router`, `ollama-cost-router` (lib) are actually wired.

## T4 — Bundle vs individual

- **recommendation: BUNDLE — but only ollama-context-aggregator + ollama-session-continuity**
- justification:
  1. `ollama-context-aggregator.mjs` self-documents as "Single UserPromptSubmit injection point that **consolidates** ollama-route-recommender + ollama-skill-suggester + ollama-prism-intelligence" (verified line 2 of file header). Wiring all 5 UserPromptSubmit hooks simultaneously causes **duplicate-injection storm** + token bloat (5× same prompt expansion). Pick ONE consolidator.
  2. `ollama-session-continuity` is PreCompact (different event surface) — safe to wire independently.
  3. `ollama-obsidian-rag` + `ollama-unified-semantic-router` need triage: either fold into `
... [+1221 chars truncated]
