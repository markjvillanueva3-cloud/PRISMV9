---
type: "chat-session"
source: "claude-code-cli"
session_id: "acb396a1-5d83-43f6-9cec-7c65bf98418f"
title: "PRISM (manufacturing-intelligence platform) routes mechanical text/code tasks (e"
date: "2026-06-12"
first_ts: "2026-06-12T16:06:31.272Z"
last_ts: "2026-06-12T16:13:27.574Z"
cwd: "H:\\prism-slot-alpha"
messages: 93
user_msgs: 38
assistant_msgs: 55
raw_file: "H:/.claude/projects/H--prism-slot-alpha/acb396a1-5d83-43f6-9cec-7c65bf98418f/subagents/workflows/wf_f922ebe7-9e9/agent-ae9c132f413690ce8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# PRISM (manufacturing-intelligence platform) routes mechanical text/code tasks (e

> **claude-code-cli** | 2026-06-12 | 93 msgs (38 user / 55 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/acb396a1-5d83-43f6-9cec-7c65bf98418f/subagents/workflows/wf_f922ebe7-9e9/agent-ae9c132f413690ce8.jsonl`

## Transcript

### User | 2026-06-12T16:06:31.272Z

PRISM (manufacturing-intelligence platform) routes mechanical text/code tasks (explain/summarize/classify/lint/docstring/diff/triage) to LOCAL Ollama to save Claude tokens. Canonical tree H:/prism (slot worktrees may be stale -- verify against H:/prism). LIVE STATE scouted 2026-06-12:
- Offload rate 10.2% (13 offloaded / 114 kept; target >=30%). Telemetry: mcp-server/data/state/ollama-offload-stats.json (schemaVersion 2.0.0; top-level tokensSaved:0 is a SCHEMA-READ BUG -- byHook shows ~14.8K real saved).
- byHook: ollama-task-offloader (148 fired/11 offloaded/114 kept/23 suggested/14479 saved) WORKS but low; ollama-route-pretooluse (118 fired/0 offloaded/0 saved) DEAD; ollama-engine-api-extractor (2/2) works.
- byCategory caught: cache-hit, summary, documentation, prism_inventory, summarize (only ~5 narrow classes).
- Hardware: Ollama daemon UP, 12 models (qwen2.5-coder:32b/:1.5b, qwen3-coder:30b, gpt-oss:120b/:20b, deepseek-r1:32b, qwen3-vl vision, nomic-embed). GPU = RTX PRO 6000 Blackwell 96GB: 75.5GB resident (gpt-oss:120b loaded, 64GB vram) but **1% utilization** -- resident-but-idle.
- Prior art to RECONCILE (read + confirm still-true, do not blindly trust): memory [[reference_blackwell_ollama_utilization_optimize_2026_06_03]], [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]] ("mostly dead-code-on-disk"); CLAUDE.md OLLAMA OFFLOAD DASHBOARD + AI SYSTEM ROUTING + fallback-ladder.
Cite REAL file:line. Verify each lever is NOT already-built (a recent session shipped a 'new' thing a peer already had). For each lever set alreadyBuilt = the existing asset OR "novel". current month June 2026.

DIMENSION: MODEL-SELECTION + ROUTING OPTIMALITY. 12 models available. Read the model-pick logic (scripts/lib/claude-tier-router.mjs resolveExecutor, ollama-cost-router pickModel, the /smart executor contract, the 9 /ollama-* skills). Are the right models routed for the right tasks (qwen2.5-coder:32b heavy-code default, :1.5b trivial, gpt-oss:120b deep-reason, nomic-embed
... [+403 chars truncated]

### Assistant | 2026-06-12T16:06:34.871Z

I'll analyze the model-selection and routing optimality by reading the relevant files.

### Assistant | 2026-06-12T16:06:36.297Z

[tool_use: Bash]

### Assistant | 2026-06-12T16:06:36.805Z

[tool_use: Bash]

### User | 2026-06-12T16:06:52.032Z

[tool_result] H:/prism/.claude/hooks/ollama-task-offloader.mjs
H:/prism/scripts/lib/claude-tier-router.mjs

### User | 2026-06-12T16:06:52.835Z

[tool_result] H:/prism/.claude/commands/ollama-architecture-plan.md
H:/prism/.claude/commands/ollama-boilerplate.md
H:/prism/.claude/commands/ollama-bridge.md
H:/prism/.claude/commands/ollama-classify.md
H:/prism/.claude/commands/ollama-diff-summary.md
H:/prism/.claude/commands/ollama-docstring.md
H:/prism/.claude/commands/ollama-error-triage.md
H:/prism/.claude/commands/ollama-explain.md
H:/prism/.claude/comma
... [+161 chars truncated]

### Assistant | 2026-06-12T16:06:55.218Z

[tool_use: Read]

### Assistant | 2026-06-12T16:06:55.609Z

[tool_use: Read]

### User | 2026-06-12T16:06:57.964Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\ollama-task-offloader.mjs' was already read 3s ago in this session and is unchanged (mtime 1781277074335). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-12T16:06:59.775Z

[tool_result] 1	/**
2	 * claude-tier-router.mjs -- pure: decide WHICH CLAUDE TIER (fable/opus/sonnet/haiku) a Claude-bound
3	 * task uses (U-CLAUDE-TIER-ROUTE, slot:india 2026-06-11). The MISSING LAYER above the canonical
4	 * executor contract.
5	 *
6	 * WHAT ALREADY EXISTS (reused here, NOT re-derived -- R7/R8):
7	 *   - [[local-llm-task-router]] classifyTaskClass(task) -> {taskClass, category} + isSafetyCrit
... [+4969 chars truncated]

### Assistant | 2026-06-12T16:07:01.810Z

Let me read the key routing files now.

### Assistant | 2026-06-12T16:07:02.334Z

[tool_use: Read]

### Assistant | 2026-06-12T16:07:02.910Z

[tool_use: Read]

### User | 2026-06-12T16:07:04.597Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\lib\ollama-cost-router.mjs' was already read 10s ago in this session and is unchanged (mtime 1781205197196). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-12T16:07:08.871Z

[tool_result] 1	// tier: T4
2	// HERMES-EFFICIENCY-ROUTER / U1 (keystone) — Local-LLM task-routing brain.
3	//
4	// composes: ollama-cost-router (routeModelForTask) + host-aware-synthesis-model
5	//   (fetchInstalledModels) + host-class (detectHostClass). It is a COMPOSER, not a
6	//   new policy — model-tier selection is DELEGATED to routeModelForTask (the
7	//   canonical, Blackwell-tuned, install-truthful pi
... [+13405 chars truncated]

### Assistant | 2026-06-12T16:07:11.374Z

Good, I have local-llm-task-router.mjs in context. Now let me read the ollama-cost-router and the smart skill canonical.

### Assistant | 2026-06-12T16:07:12.758Z

[tool_use: Bash]

### Assistant | 2026-06-12T16:07:12.887Z

[tool_use: Read]

### User | 2026-06-12T16:07:15.457Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-alpha.

### User | 2026-06-12T16:07:21.220Z

[tool_result] // tier: T4
// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
//
// Replaces hardcoded "first-of-preference-list" model selection with a
// category → tier → model decision. Smaller / faster models for trivial
// tasks (classify, format-convert, prism-inventory); larger / more
// capable models for complex codegen / multi-step reasoning.
//
// Cost proxy: VRAM fo
... [+20183 chars truncated]

### Assistant | 2026-06-12T16:07:24.592Z

Now let me check the actual smart skill and the ollama-route-pretooluse hook (the dead one), plus the offloader categorization patterns.

### Assistant | 2026-06-12T16:07:25.654Z

[tool_use: Bash]

### Assistant | 2026-06-12T16:07:26.598Z

[tool_use: Bash]

### User | 2026-06-12T16:07:36.131Z

[tool_result] H:/prism/.claude/commands/smart.md

### User | 2026-06-12T16:07:38.458Z

[tool_result] H:/prism/.claude/hooks/ollama-engine-api-extractor.mjs*
H:/prism/.claude/hooks/ollama-route-pretooluse.mjs*

### Assistant | 2026-06-12T16:07:40.725Z

Good. Now read the dead hook, the offloader patterns, and check the nomic-embed usage.

### Assistant | 2026-06-12T16:07:41.150Z

[tool_use: Read]

### Assistant | 2026-06-12T16:07:42.692Z

[tool_use: Grep]

### User | 2026-06-12T16:07:44.017Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\ollama-route-pretooluse.mjs' was already read 46s ago in this session and is unchanged (mtime 1781104904738). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-12T16:07:47.690Z

[tool_result] 18: * TOKEN SAVINGS: 80-95% for offloadable tasks
84:const OFFLOADABLE_PATTERNS = [
86:  // category="unknown" because the catalog patterns matched none of the
116:  // (runs BEFORE OFFLOADABLE_PATTERNS). No keep-list entry needed here —
166:    byCategory: {},
336:    return { offloadable: false, category: "safety_physics", savings: 0 };
342:  for (const { pattern, category, savings } of OFFLOADA
... [+331 chars truncated]

### Assistant | 2026-06-12T16:07:50.020Z

Let me read the full OFFLOADABLE_PATTERNS section and check nomic-embed usage.

### Assistant | 2026-06-12T16:07:50.782Z

[tool_use: Read]

### Assistant | 2026-06-12T16:07:51.836Z

[tool_use: Grep]

### User | 2026-06-12T16:07:56.504Z

[tool_result] 84	const OFFLOADABLE_PATTERNS = [
85	  // PRISM-specific (added 2026-04-30 after audit found 26/27 keeps were
86	  // category="unknown" because the catalog patterns matched none of the
87	  // user's actual orchestration prompts). Higher confidence — catch first.
88	  { pattern: /\b(list|show|enumerate)\s+.*(engines?|dispatchers?|hooks?|skills?|actions?)\b/i, category: "prism_inventory", savings:
... [+7081 chars truncated]

### User | 2026-06-12T16:07:57.429Z

[tool_result] Found 20 files limit: 20
H:\prism\scripts\ask-ollama.mjs
H:\prism\scripts\lib\local-llm-task-router.test.mjs
H:\prism\.claude\hooks\ollama-prewarm-on-pipeline.mjs
H:\prism\.claude\hooks\ollama-pipeline-injector.mjs
H:\prism\mcp-server\src\tools\dispatchers\sessionHybridSearchAction.ts
H:\prism\mcp-server\src\schemas\sessionActionSchemas.ts
H:\prism\mcp-server\src\data\academy\course-0c-blueprint-r
... [+702 chars truncated]

### Assistant | 2026-06-12T16:08:00.512Z

Now let me check nomic-embed actual usage in the key files, check where the ollama-route-pretooluse hook is wired (or not), and verify the settings.json wiring for all offload hooks.

### Assistant | 2026-06-12T16:08:02.115Z

[tool_use: Grep]

### Assistant | 2026-06-12T16:08:03.130Z

[tool_use: Grep]

### Assistant | 2026-06-12T16:08:04.326Z

[tool_use: Grep]

### User | 2026-06-12T16:08:06.597Z

[tool_result] No matches found

### system

... [13 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-12T16:08:44.094Z

[tool_use: Read]

### Assistant | 2026-06-12T16:08:44.603Z

[tool_use: Read]

### User | 2026-06-12T16:08:49.189Z

[tool_result] 1	// tier: T4
2	// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-HW-DETECT — detect THIS host's GPU class
3	// for hardware-aware local-model routing.
4	//
5	// Bridges golf's hostname-keyed `fleet-reaper-host-presets.json`
6	// (label: "blackwell" | "home" | "work") to the ModelRoutingEngine
7	// HardwareProfile vocabulary ("home_blackwell" | "home_4080" | "work_3080" |
8	// "cloud_only") so any offload hook 
... [+2693 chars truncated]

### User | 2026-06-12T16:08:49.210Z

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
... [+3346 chars truncated]

### Assistant | 2026-06-12T16:08:53.244Z

Now let me check the fleet-reaper-host-presets to confirm Blackwell label is set, check what the read-bundle actually wires for pretooluse, and check the CATEGORY_TIER gap for gpt-oss:120b.

### Assistant | 2026-06-12T16:08:55.104Z

[tool_use: Bash]

### Assistant | 2026-06-12T16:08:55.992Z

[tool_use: Bash]

### User | 2026-06-12T16:09:10.688Z

[tool_result] 34:// of truth for the three PC classes PRISM is tuned for (home 16GB · work 8GB · blackwell 96GB); per-host file is the
49:  blackwell: Object.freeze({
50:    label: "blackwell",

### User | 2026-06-12T16:09:16.912Z

[tool_result] 694:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/bundles/read-bundle.mjs",

### Assistant | 2026-06-12T16:09:19.908Z

Let me check the read-bundle to see if pretooluse hook is actually in it, check the host-preset JSON file for the hostname registration, and verify the CATEGORY_TIER gap for gpt-oss tasks.

### Assistant | 2026-06-12T16:09:20.794Z

[tool_use: Bash]

### Assistant | 2026-06-12T16:09:21.982Z

[tool_use: Bash]

### User | 2026-06-12T16:09:34.088Z

[tool_result] 16:  { path: `${HOOK_BASE}/ollama-route-pretooluse.mjs`,        timeout: 2500 }, // nudge bulk-data reads at local qwen (auto-substitute is opt-in) — HOOKS-AUTOMATION-V2 U-HKA04

### User | 2026-06-12T16:09:34.589Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-12T16:09:38.176Z

The pretooluse hook IS in the read-bundle (wired), but fires 118 times with 0 offloads - it's in suggest-only mode by default. Hostname not in presets JSON. Let me verify the Blackwell preset file location and check if the host detection actually resolves.

### Assistant | 2026-06-12T16:09:40.512Z

[tool_use: Bash]

### Assistant | 2026-06-12T16:09:41.314Z

[tool_use: Bash]

### User | 2026-06-12T16:09:48.914Z

[tool_result] (node:42076) ExperimentalWarning: CommonJS module H:\prism-slot-alpha\[eval] is loading ES Module H:\prism\.claude\hooks\lib\host-class.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
FILE NOT FOUND

### User | 2026-06-12T16:09:59.121Z

[tool_result] H:/prism/.claude/helpers/.compaction-survival-Agent-DESKTOP-N7MI1VB-pid-11388.md:6:- Machine: DESKTOP-N7MI1VB
H:/prism/.claude/helpers/.compaction-survival-Agent-DESKTOP-N7MI1VB-pid-11388.md:7:- Instance: Agent@DESKTOP-N7MI1VB/pid-11388
H:/prism/.claude/helpers/.compaction-survival-Agent-DESKTOP-N7MI1VB-pid-13268.md:6:- Machine: DESKTOP-N7MI1VB
H:/prism/.claude/helpers/.compaction-survival-Agent-D
... [+784 chars truncated]

### Assistant | 2026-06-12T16:10:02.910Z

Critical finding: `fleet-reaper-host-presets.json` does NOT exist at the data/state path - so `detectHostClass()` returns null for DESKTOP-N7MI1VB, meaning the Blackwell promotion in `routeModelForTask` NEVER fires. Let me verify this and check the actual presets storage location.

### Assistant | 2026-06-12T16:10:03.416Z

[tool_use: Bash]

### Assistant | 2026-06-12T16:10:04.862Z

[tool_use: Grep]

### User | 2026-06-12T16:10:08.888Z

[tool_result] 12://   state/shared/dashboards/fleet-reaper-host-presets.json
28:export const PRESETS_PATH = "H:/prism/state/shared/dashboards/fleet-reaper-host-presets.json";

### User | 2026-06-12T16:10:37.221Z

[tool_result] H:/prism/state/shared/dashboards/fleet-reaper-host-presets.json

### Assistant | 2026-06-12T16:10:39.811Z

Good - found it at `state/shared/dashboards/fleet-reaper-host-presets.json`. Let me check if DESKTOP-N7MI1VB is registered there.

### Assistant | 2026-06-12T16:10:41.188Z

[tool_use: Bash]

### Assistant | 2026-06-12T16:10:42.709Z

[tool_use: Grep]

### User | 2026-06-12T16:10:50.269Z

[tool_result] 5-// category → tier → model decision. Smaller / faster models for trivial
6-// tasks (classify, format-convert, prism-inventory); larger / more
7:// capable models for complex codegen / multi-step reasoning.
8-//
9-\ Cost proxy: VRAM footprint (≈ proxy for latency + GPU pressure + watt).
--
19-//   cheap     <4B params      Trivial classify / format / inventory dump
20-//   balanced  4-8B params 
... [+2073 chars truncated]

### User | 2026-06-12T16:11:00.698Z

[tool_result] 17:    "DESKTOP-N7MI1VB": {
18:      "label": "blackwell",

### Assistant | 2026-06-12T16:11:06.337Z

DESKTOP-N7MI1VB IS registered as "blackwell" in the presets file. So `detectHostClass()` DOES resolve to `"home_blackwell"` - the Blackwell promotion path is active. Now I have enough data. Let me check one more thing: whether `codegen` and `reason` task classes (which map to `search_synthesis` in CLASS_TO_CATEGORY) actually get the `gpt-oss:120b` via the Blackwell ceiling, vs the offloader which classifies them as KEEP_ON_CLAUDE.

### Assistant | 2026-06-12T16:11:07.858Z

[tool_use: Bash]

### Assistant | 2026-06-12T16:11:09.299Z

[tool_use: Bash]

### User | 2026-06-12T16:11:26.378Z

[tool_result] 34:import { routeModelForTask, claudeFallbackModel } from "./lib/ollama-cost-router.mjs";
454:// claudeFallbackModel() (the single source of truth in ollama-cost-router.mjs).
538:    const fallbackClaudeModel = claudeFallbackModel(classification.category);

### User | 2026-06-12T16:11:26.840Z

[tool_result] 92:    "qwen3-coder:30b",      // BLACKWELL-MODEL-EXPAND 2026-06-10: Qwen3-Coder 30B-A3B MoE, 18GB, INSTALLED -- newer/faster local coder, preferred over qwen2.5-coder:32b

### Assistant | 2026-06-12T16:11:31.768Z

I have enough data. Let me do one final check: the offloader does NOT use `resolveExecutor` - it only uses `routeModelForTask` + `claudeFallbackModel`. And `qwen3-coder:30b` is listed in `best` tier (position 8 of 10) AFTER `deepseek-r1:32b`. Let me verify the actual installed model list against tier preferences to understand which model wins for a `search_synthesis` task.

### Assistant | 2026-06-12T16:11:47.834Z

[tool_use: Bash]

### User | 2026-06-12T16:11:56.537Z

[tool_result] summary              -> gpt-oss:20b [strong] target tier [blackwell:balanced->strong]
explanation          -> gpt-oss:20b [strong] target tier [blackwell:balanced->strong]
search_synthesis     -> gpt-oss:120b [best] target tier [blackwell:balanced->best]
classification       -> qwen2.5-coder:1.5b [cheap] target tier
format_convert       -> qwen2.5-coder:1.5b [cheap] target tier
git_summary        
... [+676 chars truncated]

### Assistant | 2026-06-12T16:12:23.435Z

Excellent — that's the key routing simulation. Now I have a complete picture. Let me compile the final assessment.

Key findings from the code audit:

1. **Blackwell promotion IS active** — DESKTOP-N7MI1VB resolves to `home_blackwell` via `state/shared/dashboards/fleet-reaper-host-presets.json:17`. `search_synthesis` correctly lands on `gpt-oss:120b`; all other `balanced` categories escalate to `gpt-oss:20b` (strong tier, 185 tok/s).

2. **`ollama-route-pretooluse` is wired** (read-bundle line 16) but fires 118×/0 offloads — it's in suggest-only mode (default `PRISM_OLLAMA_ROUTE_AUTO` unset), so every bulk-data Read call gets a nudge that's ignored.

3. **`resolveExecutor` / `claude-tier-router` are NOT wired** — these are built but have zero hook entries in either `settings.json`. The `/smart` skill body references them but they don't fire automatically.

4. **`gpt-oss:120b` is correctly reserved for `search_synthesis`** on Blackwell — but `search_synthesis` is only triggered by the pattern `search (for|results?)|find (files?|code)` in the offloader. Tasks phrased as "synthesize", "consolidate", or "analyze" were previously mis-classified (the U-CLASSIFY-STEM-FIX-2 fix on 2026-06-12 in `local-llm-task-router.mjs` fixed `synthesize` but the offloader's own `OFFLOADABLE_PATTERNS` has no `synthesize` entry — so the offloader would still classify those as `category:"unknown"` and keep on Claude).

5. **`qwen3-coder:30b` position issue** — listed at position 8 of 10 in `best` tier AFTER `gpt-oss:120b`, `gemma4:31b`, `qwen3:32b`, `qwen2.5:72b`, `llama3.3:70b`, `deepseek-r1:32b`, `deepseek-r1:70b`. Since `gpt-oss:120b` is installed, `qwen3-coder:30b` is never reached for `search_synthesis`. For code tasks specifically, the offloader classifies `codegen` as `search_synthesis` (CLASS_TO_CATEGORY line 83) which routes to `gpt-oss:120b` — the right call for deep synthesis, but a 120B model for a simple code-gen task is over-powered vs the dedicated `qwen3-coder:30b` (18GB, fa
... [+779 chars truncated]

### Assistant | 2026-06-12T16:13:26.506Z

[tool_use: StructuredOutput]

### User | 2026-06-12T16:13:27.574Z

[tool_result] Structured output provided successfully
