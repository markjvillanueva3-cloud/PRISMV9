---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "I'm planning an upgrade to `H:/prism/scripts/fleet-reaper-sweep.mjs` that adds a"
date: "2026-05-14"
first_ts: "2026-05-14T17:50:09.167Z"
last_ts: "2026-05-14T18:07:32.813Z"
cwd: "H:\\prism"
messages: 126
user_msgs: 54
assistant_msgs: 72
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-aabae7fffc0708d0f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# I'm planning an upgrade to `H:/prism/scripts/fleet-reaper-sweep.mjs` that adds a

> **claude-code-cli** | 2026-05-14 | 126 msgs (54 user / 72 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-aabae7fffc0708d0f.jsonl`

## Transcript

### User | 2026-05-14T17:50:09.167Z

I'm planning an upgrade to `H:/prism/scripts/fleet-reaper-sweep.mjs` that adds a "GPU/Ollama coordinator" layer — when commit memory pressure is high, it should pre-warm an Ollama model on the GPU and signal Claude's hook layer to route more eligible work to Ollama. I need a complete picture of PRISM's existing Ollama integration so I extend it instead of duplicating.

Find and report:

1. **OllamaHookBridgeEngine** — where is it (likely `mcp-server/src/engines/`)? What's its public API? What hooks consume it? Does it have a way to signal "prefer-Ollama mode"?

2. **Ollama rate-limit / health surface** — CLAUDE.md mentions `.claude/cache/ollama-rate-limit.json`. Find every file that reads/writes it, every health probe, the URL/port used (likely `http://127.0.0.1:11434`).

3. **AISystemRouterEngine** — referenced in CLAUDE.md global rules ("ai-system-routing"). Where does it live, what's `route(task)` actually do, does it have an "offload preference" knob already?

4. **All `/ollama-*` skills** — list them (paths) and 1-line each on what they do. CLAUDE.md says there are 9.

5. **OllamaOffloadDashboard** — `mcp-server/data/state/ollama-offload-stats.json` (schemaVersion 2.0.0) — where is it written, what fields does it carry? Find `scripts/ollama-offload-dashboard.mjs` and its outputs.

6. **Model pre-warm / preload mechanism** — does PRISM already have any code that POST `/api/generate` or `/api/embeddings` with `keep_alive` to pre-load a model? Or a "Ollama warm-up" script? If so where.

7. **Routing hint / signal file pattern** — is there an existing on-disk signal that hooks read to flip routing decisions (e.g., `state/shared/.ollama-prefer.json` or similar)? Or do all hooks query a dispatcher? I need to know whether to write a new hint file or wire into existing infrastructure.

Return file paths, exported function/class names, knob names, and concrete code snippets where they reveal API shape (5-15 lines each). Prefer concrete to abstract. If a thing doesn't ex
... [+35 chars truncated]

### Assistant | 2026-05-14T17:50:15.463Z

I'll conduct a thorough search of the PRISM codebase to find all the Ollama integration components you've described.

### Assistant | 2026-05-14T17:50:15.562Z

[tool_use: Glob]

### Assistant | 2026-05-14T17:50:15.908Z

[tool_use: Glob]

### Assistant | 2026-05-14T17:50:15.950Z

[tool_use: Glob]

### User | 2026-05-14T17:50:36.771Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T17:50:37.883Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T17:50:40.220Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-14T17:50:41.065Z

Let me refine with more specific searches:

### Assistant | 2026-05-14T17:50:41.495Z

[tool_use: Bash]

### Assistant | 2026-05-14T17:50:41.914Z

[tool_use: Bash]

### Assistant | 2026-05-14T17:50:42.019Z

[tool_use: Bash]

### User | 2026-05-14T17:50:45.405Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### User | 2026-05-14T17:50:50.194Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### User | 2026-05-14T17:51:01.815Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-05-14T17:51:02.677Z

Let me use PowerShell syntax properly:

### Assistant | 2026-05-14T17:51:03.110Z

[tool_use: PowerShell]

### Assistant | 2026-05-14T17:51:03.512Z

[tool_use: PowerShell]

### Assistant | 2026-05-14T17:51:03.748Z

[tool_use: Read]

### User | 2026-05-14T17:51:06.653Z

[tool_result] Exit code 1
[31;1mhead: [31;1mThe term 'head' is not recognized as a name of a cmdlet, function, script file, or executable program.[0m
[31;1m[31;1mCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.[0m

### User | 2026-05-14T17:51:06.654Z

[tool_result] <tool_use_error>Cancelled: parallel tool call PowerShell(Get-ChildItem -Recurse -Filter "*ollama*…) errored</tool_use_error>

### User | 2026-05-14T17:51:06.654Z

[tool_result] <tool_use_error>Cancelled: parallel tool call PowerShell(Get-ChildItem -Recurse -Filter "*ollama*…) errored</tool_use_error>

### Assistant | 2026-05-14T17:51:08.418Z

Let me read CLAUDE.md and use simpler file discovery:

### Assistant | 2026-05-14T17:51:08.420Z

[tool_use: Read]

### Assistant | 2026-05-14T17:51:08.756Z

[tool_use: PowerShell]

### User | 2026-05-14T17:51:10.839Z

[tool_result] 1	# PRISM — Manufacturing Intelligence Platform
2	
3	## EXPERT ROLE (ALWAYS ACTIVE)
4	You are the smartest person to ever exist and a **deep thinker**. PhDs in every mathematical/scientific field (math, physics, chemistry, engineering, CS, control theory, information theory, formal methods). Expert in business, sales & marketing, and law. Greatest coder to ever exist.
5	
6	**Deep thinking mandate:
... [+38433 chars truncated]

### User | 2026-05-14T17:53:13.763Z

[tool_result] Command running in background with ID: bllw26kjb. Output is being written to: H:\prism\.cache\temp\claude\H--PRISM\f91d963c-3721-45d5-9d95-399e1e649522\tasks\bllw26kjb.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-14T17:53:15.806Z

Good, CLAUDE.md shows Ollama integration exists. Let me search for the specific components while waiting for the file search:

### Assistant | 2026-05-14T17:53:16.209Z

[tool_use: Grep]

### Assistant | 2026-05-14T17:53:16.435Z

[tool_use: Grep]

### Assistant | 2026-05-14T17:53:16.658Z

[tool_use: Grep]

### User | 2026-05-14T17:53:37.512Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T17:53:37.720Z

[tool_result] Found 13 files
knowledge\wiki\architecture\tests\ol\ollamahookbridgeengine.md
knowledge\wiki\architecture\tests\ol\ollamahookbridgeengine-model-routing.md
knowledge\memories\reference\reference_local_llm_routing.md
knowledge\memories\feedback\feedback_ollama_token_routing.md
.claude\hooks\ollama-route-pretooluse.mjs
.claude\hooks\ollama-engine-api-extractor.mjs
.claude\hooks\ollama-context-aggrega
... [+336 chars truncated]

### User | 2026-05-14T17:53:39.423Z

[tool_result] Found 7 files
CLAUDE.md
knowledge\memories\reference\reference_token_savings_baseline.md
.claude\hooks\ollama-task-offloader.mjs
AGENTS.md
GEMINI.md
knowledge\claude-md\project-ollama-offload-dashboard.md
knowledge\claude-md\project-ollama-offload-dashboard-p0-u03.md

### Assistant | 2026-05-14T17:53:40.748Z

Excellent! Let me gather the specific files and search more systematically:

### Assistant | 2026-05-14T17:53:40.978Z

[tool_use: Read]

### Assistant | 2026-05-14T17:53:41.201Z

[tool_use: Read]

### Assistant | 2026-05-14T17:53:41.428Z

[tool_use: Read]

### User | 2026-05-14T17:53:46.338Z

[tool_result] 1	# ENGINE DIGEST
2	## 3217 engines indexed
3	## Auto-generated: 2026-05-12 (manually appended 4 entries for TRAINING-LEARNING-MS0/U-TL-U5..U6)
4	
5	- **AbrasiveJetMachiningEngine**: Physics-Based Abrasive Waterjet Prediction
6	- **AbsorptionChillerEngine**: Absorption refrigeration cycle analysis
7	- **AbstractionHierarchyEngine**: Multi-level tip→principle→law generalization
8	- **AccessControlL
... [+14425 chars truncated]

### User | 2026-05-14T17:53:46.657Z

[tool_result] 1	// tier: T4
2	/**
3	 * ollama-hook-bridge.mjs
4	 * Shared helper for hooks to call local Ollama with fast timeout and graceful fallback.
5	 *
6	 * Usage:
7	 *   import { queryOllama, isOllamaAvailable } from './lib/ollama-hook-bridge.mjs';
8	 *   const result = await queryOllama(prompt, { hookType: 'grep_index', timeoutMs: 300 });
9	 *   if (result.success) { use result.response } else { use reg
... [+5562 chars truncated]

### system

... [46 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-14T17:59:08.812Z

[tool_use: Read]

### User | 2026-05-14T18:01:20.488Z

[tool_result] Command running in background with ID: bk1tmucoe. Output is being written to: H:\prism\.cache\temp\claude\H--PRISM\f91d963c-3721-45d5-9d95-399e1e649522\tasks\bk1tmucoe.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-05-14T18:01:23.999Z

[tool_result] EISDIR: illegal operation on a directory, read 'H:\prism\.claude\hooks\lib'

### User | 2026-05-14T18:01:44.115Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-14T18:01:45.339Z

Let me search for the remaining components more directly:

### Assistant | 2026-05-14T18:01:45.796Z

[tool_use: Bash]

### Assistant | 2026-05-14T18:01:46.307Z

[tool_use: Bash]

### Assistant | 2026-05-14T18:01:46.314Z

[tool_use: Read]

### User | 2026-05-14T18:01:57.631Z

[tool_result] 1	// tier: T4
2	/**
3	 * ollama-stats.mjs — shared stats writer for all Ollama-bridge hooks.
4	 *
5	 * Before this module existed, only ollama-task-offloader wrote to
6	 * `mcp-server/data/state/ollama-offload-stats.json`, so the offload-rate
7	 * dashboard reported a single hook's view (~7%) and missed savings from
8	 * ollama-context-aggregator, ollama-obsidian-rag, ollama-engine-api-extractor,

... [+6696 chars truncated]

### User | 2026-05-14T18:02:04.250Z

[tool_result] -rw-r--r-- 1 Mark V 197608  5382 May 12 21:15 H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs
-rw-r--r-- 1 Mark V 197608  6440 May 12 21:15 H:/prism/.claude/hooks/lib/ollama-stats.mjs

### User | 2026-05-14T18:03:55.907Z

[tool_result] Command running in background with ID: b045n6s6y. Output is being written to: H:\prism\.cache\temp\claude\H--PRISM\f91d963c-3721-45d5-9d95-399e1e649522\tasks\b045n6s6y.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-14T18:03:59.901Z

Let me continue searching for the remaining ollama files and check for any hint/signal files:

### Assistant | 2026-05-14T18:04:01.195Z

[tool_use: Read]

### Assistant | 2026-05-14T18:04:02.065Z

[tool_use: Grep]

### User | 2026-05-14T18:04:02.083Z

[tool_result] <tool_use_error>Path does not exist: H:/prism/mcp-server/src/engines/OllamaHookBridgeEngine.test.ts. Note: your current working directory is H:\prism.</tool_use_error>

### Assistant | 2026-05-14T18:04:02.302Z

[tool_use: Bash]

### User | 2026-05-14T18:04:06.616Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### User | 2026-05-14T18:04:12.242Z

[tool_result] H:/prism/mcp-server/data/state/ollama-offload-stats.json
H:/prism/mcp-server/data/state/ollama-rate-limits.json

### Assistant | 2026-05-14T18:04:14.068Z

Let me check the actual state files and look for any pre-warming or warm-up code:

### Assistant | 2026-05-14T18:04:14.593Z

[tool_use: Read]

### Assistant | 2026-05-14T18:04:14.598Z

[tool_use: Read]

### Assistant | 2026-05-14T18:04:15.027Z

[tool_use: Grep]

### User | 2026-05-14T18:04:18.038Z

[tool_result] No files found

### User | 2026-05-14T18:04:18.977Z

[tool_result] 1	{
2	  "lastSuggestion": {
3	    "summary": "2026-05-14T17:03:15.595Z",
4	    "explanation": "2026-05-13T03:13:55.434Z"
5	  }
6	}

### User | 2026-05-14T18:04:19.066Z

[tool_result] 1	{
2	  "schemaVersion": "2.0.0",
3	  "lastUpdated": "2026-05-14T17:58:23.352Z",
4	  "lastReset": "2026-04-28T00:11:42.432Z",
5	  "offloaded": 13,
6	  "keptOnClaude": 158,
7	  "estimatedTokensSaved": 4010,
8	  "silentSuggestions": 16,
9	  "injectedSuggestions": 0,
10	  "byCategory": {
11	    "cache-hit": 2,
12	    "summary": 11
13	  },
14	  "byHook": {
15	    "ollama-task-offloader": {
16	      "f
... [+44609 chars truncated]

### Assistant | 2026-05-14T18:04:21.533Z

Perfect. Now let me search for any signal/hint files and check the remaining hooks:

### Assistant | 2026-05-14T18:04:21.752Z

[tool_use: Bash]

### Assistant | 2026-05-14T18:04:22.176Z

[tool_use: Bash]

### Assistant | 2026-05-14T18:04:22.486Z

[tool_use: Read]

### User | 2026-05-14T18:04:27.912Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-context-aggregator.mjs — Single UserPromptSubmit injection point
5	 *
6	 * Designed for up to 8 concurrent chats — replaces 3 redundant routers
7	 * (ollama-route-recommender, ollama-unified-semantic-router,
8	 *  ollama-prism-intelligence) with one consolidated pattern matcher.
9	 *
10	 * Output blocks (only those that match are emitted):
11	 
... [+4256 chars truncated]

### User | 2026-05-14T18:04:32.955Z

[tool_result] H:/prism/.claude/hooks/ollama-auto-router.mjs
H:/prism/.claude/hooks/ollama-autostart.mjs
H:/prism/.claude/hooks/ollama-context-aggregator.mjs
H:/prism/.claude/hooks/ollama-engine-api-extractor.mjs
H:/prism/.claude/hooks/ollama-obsidian-rag.mjs
H:/prism/.claude/hooks/ollama-prism-intelligence.mjs
H:/prism/.claude/hooks/ollama-reviewer-second-opinion.mjs
H:/prism/.claude/hooks/ollama-route-pretoolu
... [+377 chars truncated]

### User | 2026-05-14T18:06:27.663Z

[tool_result] Command running in background with ID: b6yvwbn2i. Output is being written to: H:\prism\.cache\temp\claude\H--PRISM\f91d963c-3721-45d5-9d95-399e1e649522\tasks\b6yvwbn2i.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-14T18:06:30.091Z

Excellent. Let me now compile the comprehensive report based on what I've found. Let me do a final check for any signal/hint files and model pre-warming code:

### Assistant | 2026-05-14T18:06:30.775Z

[tool_use: Bash]

### Assistant | 2026-05-14T18:06:31.400Z

[tool_use: Grep]

### Assistant | 2026-05-14T18:06:31.798Z

[tool_use: Read]

### User | 2026-05-14T18:06:44.913Z

[tool_result] H:/prism/mcp-server/data/state/ACTIONS_INDEX.json
H:/prism/mcp-server/data/state/ACTION_RESOLUTION_INDEX.json
H:/prism/mcp-server/data/state/agent-memory.json
H:/prism/mcp-server/data/state/agent-profiles.json
H:/prism/mcp-server/data/state/ALIAS_TABLE_INDEX.json
H:/prism/mcp-server/data/state/CAM_TRIBAL_RAG_INDEX.json
H:/prism/mcp-server/data/state/CAM_UIX_RATELIMIT_REGISTRY.json
H:/prism/mcp-ser
... [+163 chars truncated]

### User | 2026-05-14T18:06:46.767Z

[tool_result] No files found

### User | 2026-05-14T18:06:50.448Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-autostart.mjs — SessionStart hook
5	 *
6	 * Checks if Ollama is running. If not, starts it in background.
7	 * Silent no-op if Ollama is already running or not installed.
8	 * Uses lock file to prevent 8 concurrent chats from all trying to start.
9	 *
10	 * FIRES ON: SessionStart
11	 * BLOCKING: never — always continues
12	 */
13	
14	import { s
... [+2316 chars truncated]

### Assistant | 2026-05-14T18:07:32.813Z

Perfect. I now have enough information to provide a comprehensive report. Let me compile the findings:

---

## PRISM Ollama Integration — Complete Inventory

### 1. **OllamaHookBridgeEngine** ✓ FOUND

**Location:** `H:/prism/mcp-server/src/engines/OllamaHookBridgeEngine.ts`

**Public API:**
```typescript
class OllamaHookBridgeEngine {
  async query(prompt: string, options: HookQueryOptions): Promise<HookQueryResult>
  async status(): Promise<OllamaStatusResult>
  configure(updates: Partial<OllamaHookConfig>): OllamaHookConfig
  getConfig(): OllamaHookConfig
  async isAvailable(): Promise<boolean>
  getModelForHook(hookType: HookType): string
  static getInstance(): OllamaHookBridgeEngine
  static resetInstance(): void
}
```

**Key exports:**
- `ollamaHookBridgeEngine` (singleton instance)
- `HookType` union: `"grep_index" | "mcp_route" | "ai_feature" | "code_explain" | "pattern_match" | "validation" | "general"`
- `OllamaHookConfig` interface with fields: `baseUrl`, `defaultModel`, `modelOverrides`, `timeoutMs`, `maxTokens`, `verbose`

**Hooks consuming it:**
- `.claude/hooks/ollama-context-aggregator.mjs` (imports via shim, calls for domain inference)
- `.claude/hooks/ollama-route-recommender.mjs` (MCP route selection)
- `.claude/hooks/ollama-skill-suggester.mjs` (skill recommendations)
- `.claude/hooks/ollama-unified-semantic-router.mjs` (semantic routing)
- `.claude/hooks/ollama-engine-api-extractor.mjs` (API exploration)

**"Prefer-Ollama" knob:** NOT FOUND in OllamaHookBridgeEngine itself. The engine is stateless; routing preference is determined entirely by caller logic in individual hooks (e.g., `OFFLOADABLE_PATTERNS` in `ollama-task-offloader.mjs` sets confidence thresholds).

---

### 2. **Ollama Rate-Limit / Health Surface** ✓ FOUND

**Rate-limit file:** `H:/prism/mcp-server/data/state/ollama-rate-limits.json`
```json
{
  "lastSuggestion": {
    "summary": "2026-05-14T17:03:15.595Z",
    "explanation": "2026-05-13T03:13:55.434Z"
  }
}
```

**Readers/Write
... [+11081 chars truncated]
