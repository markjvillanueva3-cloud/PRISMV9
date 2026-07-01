---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Audit Ollama TOOL-CALL + HOOK-INJECTION routing in PRISM (repo H:/prism). Inspec"
date: "2026-06-09"
first_ts: "2026-06-09T15:42:36.998Z"
last_ts: "2026-06-09T15:51:27.766Z"
cwd: "H:\\prism"
messages: 64
user_msgs: 26
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_7f974777-bf2/agent-af5833d3d217b4265.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Audit Ollama TOOL-CALL + HOOK-INJECTION routing in PRISM (repo H:/prism). Inspec

> **claude-code-cli** | 2026-06-09 | 64 msgs (26 user / 38 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_7f974777-bf2/agent-af5833d3d217b4265.jsonl`

## Transcript

### User | 2026-06-09T15:42:36.998Z

Audit Ollama TOOL-CALL + HOOK-INJECTION routing in PRISM (repo H:/prism). Inspect: scripts/lib/local-llm-task-router.mjs (WORK_CLASS_PATTERNS), scripts/lib/multi-provider-router.mjs, scripts/lib/host-aware-synthesis-model.mjs, .claude/hooks/ollama-route-pretooluse.mjs (and any ollama-*route* hook), OllamaHookBridgeEngine, claudemd-ollama-enforcer.mjs, .claude/hooks/ollama-pipeline-injector.mjs, ollama-prewarm-on-pipeline.mjs. Question: which tool calls / hook injections are relevance-gated through Ollama TODAY vs Claude-only, and is the model-resolution correct (32b on Blackwell vs hardcoded 7b)? LIVE Ollama models loaded NOW on the 96GB RTX PRO 6000 Blackwell (verified this session): qwen2.5-coder:1.5b, qwen2.5-coder:7b, qwen2.5-coder:32b, gpt-oss:20b, gpt-oss:120b, qwen3-vl:8b(-instruct), qwen2.5vl:7b, moondream:1.8b, llama3.2-vision:11b, nomic-embed-text. So a heavy local tier (32b coder / 120b general / vision / embeddings) is AVAILABLE — recommend the SMALLEST model that does each job well.

ALREADY-VERIFIED-NON-VIABLE (alpha, 2026-06-09, reference_obsidian_tokensavings_premise_falsified):
(a) WIDENING the local-llm-task-router WORK_CLASS_PATTERNS to push offload toward 30% is a FALSE PREMISE — live dashboard: fired=53, offload=3, keep=44, where the 44 keeps are CORRECT (orchestration 34, operator_directive 5, safety 1, deep_reasoning 1 — all judgment tasks that MUST stay on Claude per R5). The low ~5-6% offload rate is an orchestration-heavy SESSION SHAPE, not a misrouting bug. Do NOT propose widening the classifier to offload orchestration/directives/reasoning — that is a REGRESSION.
(b) session-end-goal-synthesis LLM pass is DORMANT (unwired in both settings.json) and reads month-stale data — do NOT propose wiring an LLM pass onto dead data.
The real lever is NOT a classifier code-fix; it is (1) BEHAVIORAL adoption of existing offload suggestions, and (2) routing the HEAVY CREATION/SYNTHESIS work that ALREADY goes to Ollama onto the bigger local model (32b/1
... [+1604 chars truncated]

### Assistant | 2026-06-09T15:42:51.149Z

I'll audit the Ollama tool-call and hook-injection routing in PRISM. Let me start by reading the canonical files cited in the task.

### Assistant | 2026-06-09T15:42:52.372Z

[tool_use: Read]

### Assistant | 2026-06-09T15:42:53.322Z

[tool_use: Read]

### Assistant | 2026-06-09T15:42:53.327Z

[tool_use: Read]

### User | 2026-06-09T15:43:24.385Z

[tool_result] 1	// tier: T4
2	// HERMES-EFFICIENCY-ROUTER / U1 (keystone) — Local-LLM task-routing brain.
3	//
4	// composes: ollama-cost-router (routeModelForTask) + host-aware-synthesis-model
5	//   (fetchInstalledModels) + host-class (detectHostClass). It is a COMPOSER, not a
6	//   new policy — model-tier selection is DELEGATED to routeModelForTask (the
7	//   canonical, Blackwell-tuned, install-truthful pi
... [+12355 chars truncated]

### User | 2026-06-09T15:43:24.388Z

[tool_result] 1	// tier: T4
2	// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE — host-aware default model
3	// for local synthesis scripts (galaxy roll-ups, system-viz roost summaries,
4	// Obsidian memory consolidation, ask-ollama heavy modes).
5	//
6	// PROBLEM the work order names: every synthesis script hardcodes
7	// `qwen2.5-coder:7b` (or `:3b`). On the 96GB RTX PRO 6000 Blackwell that
8	// throttl
... [+5022 chars truncated]

### User | 2026-06-09T15:43:24.425Z

[tool_result] 1	#!/usr/bin/env node
2	// U-PSN-MULTI-PROVIDER-ROUTER-2026-05-24 — classification + telemetry library
3	// for PRISM's multi-provider AI routing layer (Brij "AI Infrastructure Master
4	// Tree" layer 02 — Frontier Models).
5	//
6	// PURPOSE: When Claude rate-limits, the operator or any automation layer needs
7	// a deterministic answer to "which provider should handle THIS task?" without
8	// mak
... [+27646 chars truncated]

### Assistant | 2026-06-09T15:43:34.518Z

I have these three files cached. Now let me read the hook files and the other surfaces in parallel.

### Assistant | 2026-06-09T15:43:35.762Z

[tool_use: Read]

### Assistant | 2026-06-09T15:43:35.988Z

[tool_use: Read]

### Assistant | 2026-06-09T15:43:36.460Z

[tool_use: Read]

### Assistant | 2026-06-09T15:43:36.557Z

[tool_use: Read]

### User | 2026-06-09T15:44:29.664Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * ollama-pipeline-injector.mjs — UserPromptSubmit hook
5	 *
6	 * Fires when the user invokes /forge, /forge-audit, /rgs, /scrutinize, /dedup,
7	 * /precompact, /handoff or any pipeline that historically did NOT route work
8	 * to Ollama even though the local models were loaded and idle.
9	 *
10	 * Injects an additionalContext block listing CONCRETE Olla
... [+14855 chars truncated]

### User | 2026-06-09T15:44:29.667Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * ollama-prewarm-on-pipeline.mjs — UserPromptSubmit hook
5	 *
6	 * When a pipeline trigger fires (/forge*, /rgs, /scrutinize, /dedup,
7	 * /deep-search, /pdf-learn, /close-out-audit, /precompact) AND the
8	 * required Ollama model is NOT yet warm in VRAM, fire a tiny
9	 * background /api/generate request to pre-load it. Returns instantly;
10	 * the mode
... [+5933 chars truncated]

### User | 2026-06-09T15:44:29.685Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+12705 chars truncated]

### User | 2026-06-09T15:44:29.749Z

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

### Assistant | 2026-06-09T15:44:54.251Z

I have all the cited files. Now I need to verify wiring status in settings.json and check the OllamaHookBridgeEngine, claudemd-ollama-enforcer, and the 6 hardcoded-7b synthesis scripts (alpha punch-list #5). Let me do these in parallel.

### Assistant | 2026-06-09T15:44:56.035Z

[tool_use: Grep]

### Assistant | 2026-06-09T15:44:56.542Z

[tool_use: Glob]

### Assistant | 2026-06-09T15:44:56.994Z

[tool_use: Glob]

### Assistant | 2026-06-09T15:44:58.187Z

[tool_use: Grep]

### User | 2026-06-09T15:45:26.217Z

[tool_result] No matches found

### User | 2026-06-09T15:45:29.300Z

[tool_result] Found 33 files
scripts\no-retired-llm-refs.test.mjs
scripts\ask-ollama.test.mjs
scripts\ask-ollama.mjs
scripts\fill-galaxy-memory-sections.test.mjs
scripts\extend-intel-envelope-v3.mjs
scripts\lib\multi-provider-router.test.mjs
scripts\lib\local-llm-task-router.test.mjs
scripts\galaxy-reflection-synthesis.test.mjs
scripts\summarize-all-scripts-via-ollama.test.mjs
scripts\lib\host-aware-synthesis-m
... [+838 chars truncated]

### User | 2026-06-09T15:45:35.986Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-09T15:45:35.987Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-09T15:45:44.412Z

The settings.json grep found no matches — the three Ollama hooks may be wired under different settings files or paths. Let me check the actual settings files and locate the engine/enforcer. Let me narrow the searches.

### Assistant | 2026-06-09T15:45:46.232Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:45:48.369Z

[tool_use: Bash]

### User | 2026-06-09T15:46:38.650Z

[tool_result] === /c/Users/wompu/.claude/settings.json ===
=== H:/.claude/settings.json ===
=== .claude/settings.json ===
      1 claudemd-ollama-enforcer
      1 ollama-auto-router
      1 ollama-task-offloader

### User | 2026-06-09T15:47:00.122Z

[tool_result] .claude/hooks/claudemd-ollama-enforcer.mjs*
.claude/hooks/ollama-auto-router.mjs*
.claude/hooks/ollama-task-offloader.mjs
---ENGINE---
mcp-server/src/engines/OllamaHookBridgeEngine.ts

### Assistant | 2026-06-09T15:47:18.898Z

Key finding: the three pipeline hooks (`ollama-route-pretooluse`, `ollama-pipeline-injector`, `ollama-prewarm-on-pipeline`) have **zero refs in any of the 3 settings.json files** — they are UNWIRED. Only `claudemd-ollama-enforcer`, `ollama-auto-router`, `ollama-task-offloader` are wired (in `.claude/settings.json`). This contradicts the CLAUDE.md claim that the pipeline injector is wired. Let me verify the exact wiring context and read the enforcer + bridge engine resolution.

### Assistant | 2026-06-09T15:47:20.639Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:47:20.648Z

[tool_use: Read]

### User | 2026-06-09T15:47:25.579Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * claudemd-ollama-enforcer.mjs — UserPromptSubmit hook
5	 *
6	 * REVOLUTIONARY APPROACH: Instead of injecting 2000+ tokens of static
7	 * CLAUDE.md rules, Ollama reads the FULL ruleset locally and outputs
8	 * ONLY the 3-5 most relevant rules for THIS specific prompt.
9	 *
10	 * Token savings: 85-90% (2000 → 150-300 tokens)
11	 * Enforcement quality: BE
... [+12278 chars truncated]

### User | 2026-06-09T15:47:36.927Z

[tool_result] 765:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/ollama-auto-router.mjs",
795:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/ollama-task-offloader.mjs",
845:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/claudemd-ollama-enforcer.mjs",

### Assistant | 2026-06-09T15:47:50.090Z

`claudemd-ollama-enforcer` correctly uses `qwen2.5-coder:32b` (line 32). Now let me read the two WIRED prompt-level offloaders (`ollama-auto-router`, `ollama-task-offloader`) to verify their model resolution, and the bridge engine. Let me also check the 6 punch-list synthesis scripts for which still hardcode 7b vs use resolveSynthesisModel.

### Assistant | 2026-06-09T15:47:50.663Z

[tool_use: Read]

### Assistant | 2026-06-09T15:47:52.261Z

[tool_use: Bash]

### User | 2026-06-09T15:47:54.521Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+32363 chars truncated]

### User | 2026-06-09T15:48:01.500Z

[tool_result] 130:      model: 'qwen2.5-coder:32b',
133:      options: { num_predict: maxPredict }

### Assistant | 2026-06-09T15:48:10.098Z

Both wired prompt-level offloaders resolve models correctly (`ollama-task-offloader` via `routeModelForTask` + `detectHostClass`, line 513-518; `ollama-auto-router` hardcodes `qwen2.5-coder:32b` at line 130). Now the critical check: the 6 punch-list synthesis scripts (#5). Let me check each for whether it uses `resolveSynthesisModel` (SHIPPED) or still hardcodes 7b/3b (GAP), plus the bridge engine and WeeklySynthesisEngine.

### Assistant | 2026-06-09T15:48:12.504Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:48:15.176Z

[tool_use: Bash]

### User | 2026-06-09T15:48:26.769Z

[tool_result] === scripts/galaxy-synthesis-refresh.mjs ===
61:import { resolveSynthesisModel } from "./lib/host-aware-synthesis-model.mjs";
65:const DEFAULT_MODEL = "qwen2.5-coder:32b";
109:    else if (t === "--model") a.model = argv[++i];
132:// FALLBACK; on a Blackwell host with the 32B held this lifts synthesis to qwen2.5-coder:32b
135:// An EXPLICIT --model flag is operator intent and always wins. We detec
... [+4290 chars truncated]

### User | 2026-06-09T15:48:39.884Z

[tool_result] === WeeklySynthesisEngine ===
15: * Default summarizer is Ollama qwen2.5-coder:32b (token-economy compliant).
117:export const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:32b";
300: * POST to Ollama `/api/generate` with qwen2.5-coder:32b. Returns ok=false on
303: *   PRISM_WEEKLY_SYNTHESIS_OLLAMA_MODEL (default qwen2.5-coder:32b)
=== OllamaHookBridgeEngine model resolution ===
33:  defaultModel: string;
... [+1262 chars truncated]

### Assistant | 2026-06-09T15:48:58.209Z

Strong finding: all 5 punch-list scripts + WeeklySynthesisEngine + OllamaHookBridgeEngine are already migrated to `qwen2.5-coder:32b` / `resolveSynthesisModel`. Punch-list #5 is SHIPPED. Now let me verify multi-provider-router.mjs:214 (the task claimed it inlines 7b) and check the wiring of the `claudemd-ollama-enforcer` plus whether the pipeline-injector wiring claim in CLAUDE.md is genuinely false. Let me also confirm `ollama-auto-router` line 130 context and grep settings for any verb-injector references under different names.

### Assistant | 2026-06-09T15:48:59.382Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:49:04.285Z

[tool_use: Bash]

### User | 2026-06-09T15:49:06.968Z

[tool_result] === multi-provider-router line 210-218 (claimed :214 inlines 7b) ===
/**
 * Classify a task and return the recommended provider chain.
 * Pure function — no I/O.
 *
 * @param {string} prompt - Task description or prompt text
 * @param {{ preferOffline?: boolean, excludeProviders?: string[],
 *           hostProfile?: ("home_blackwell"|"home_4080"|"work_3080"|"cloud_only"|null),
 *           detect
... [+790 chars truncated]

### User | 2026-06-09T15:49:11.894Z

[tool_result] === any pipeline/prewarm/route-pretooluse refs ANYWHERE in settings files ===
.claude/settings.json
(empty above = none wired)
=== ALL ollama refs in active settings ===
claudemd-ollama-enforcer.mjs
ollama-auto-router.mjs
ollama-autostart.mjs
ollama-task-offloader.mjs
ollama-terminal-watcher.mjs
prompt-rewriter-ollama.mjs

### Assistant | 2026-06-09T15:49:20.673Z

The grep returned `.claude/settings.json` as matching the pipeline/prewarm pattern — but that may be a false positive from `prompt-rewriter-ollama`. Let me verify precisely which of the three pipeline hooks (if any) is wired, and confirm the `multi-provider-router.mjs:214` 7b claim by reading the exact LOCAL_MODEL constants region (already cached: lines 75-81 show all profiles → `qwen2.5-coder:32b`, DEFAULT also 32b — so the task's ":214 inlines 7b" claim is STALE/already-fixed). Let me pin the pipeline-hook wiring precisely.

### Assistant | 2026-06-09T15:49:24.949Z

[tool_use: Bash]

### User | 2026-06-09T15:49:36.233Z

[tool_result] === precise per-hook wiring count in active settings ===
ollama-pipeline-injector: 0
ollama-prewarm-on-pipeline: 0
ollama-route-pretooluse: 0
prompt-rewriter-ollama: 1
ollama-autostart: 1
ollama-terminal-watcher: 1
=== read-bundle wiring (route-pretooluse claims to be in read-bundle) ===
.claude/hooks/bundles/read-bundle.mjs:16:  { path: `${HOOK_BASE}/ollama-route-pretooluse.mjs`,        timeout: 
... [+104 chars truncated]

### Assistant | 2026-06-09T15:49:46.550Z

Critical correction: `ollama-route-pretooluse` IS wired — via `read-bundle.mjs:16`, not directly in settings.json. The bundle is the consumer. So it fires on PreToolUse:Read. The two genuinely unwired ones are `ollama-pipeline-injector` and `ollama-prewarm-on-pipeline`. Let me confirm the read-bundle itself is wired in settings, and check `prompt-rewriter-ollama` model resolution (it's wired, mentioned in offloader as the handler).

### Assistant | 2026-06-09T15:49:49.525Z

[tool_use: Bash]

### User | 2026-06-09T15:49:56.492Z

[tool_result] === is read-bundle wired in settings? ===
694:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/bundles/read-bundle.mjs",
=== prompt-rewriter-ollama model ===
34: *   OLLAMA_REWRITE_MODEL    override auto-detect (e.g. "qwen2.5-coder:7b")
53:const MODEL_OVERRIDE = process.env.OLLAMA_REWRITE_MODEL || null;
59:// latency. Cold-load fallback handled by LOADED_MODEL_ONLY (
... [+691 chars truncated]

### Assistant | 2026-06-09T15:50:07.055Z

All wiring is now confirmed. `read-bundle.mjs` is wired at settings.json:694, so `ollama-route-pretooluse` fires. `prompt-rewriter-ollama` uses `qwen2.5-coder:32b` as preference floor (line 84). The two unwired hooks (`ollama-pipeline-injector`, `ollama-prewarm-on-pipeline`) are not in settings OR any bundle. 

I have all evidence needed. Let me do one final check on the live offload dashboard data to ground the falsified-premise claims and confirm the offload stats hook entry for the route-pretooluse hook.

### Assistant | 2026-06-09T15:50:09.649Z

[tool_use: Bash]

### User | 2026-06-09T15:50:23.867Z

[tool_result] === offload dashboard live totals ===
offloaded: 6 kept: 91 tokensSaved: 12309
byHook keys: [
  'ollama-task-offloader',
  'grep-index-first',
  'ollama-route-pretooluse',
  'fleet-reaper-coordinator'
]
route-pretooluse: {"fired":1705,"offloaded":2,"kept":1696,"suggested":7,"tokensSaved":34500}
byCategory: {"prism_audit":2,"summary":4}

### Assistant | 2026-06-09T15:50:28.614Z

I have complete evidence. Let me mark the task complete and deliver the audit.

### Assistant | 2026-06-09T15:50:29.095Z

[tool_use: TaskUpdate]

### User | 2026-06-09T15:50:29.696Z

[tool_result] Task not found

### Assistant | 2026-06-09T15:51:27.766Z

# OLLAMA ROUTING AUDIT — tool-call + hook-injection surfaces (HEAD, cad-fusion-live-ms0, 2026-06-09)

All claims cite file:line. Live offload dashboard (`mcp-server/data/state/ollama-offload-stats.json`): `offloaded:6 kept:91` this session; per-hook `ollama-route-pretooluse {fired:1705, offloaded:2, kept:1696, suggested:7}` — corroborates the FALSIFIED-(a) take-rate premise.

## Model-resolution verdict: CORRECT. The 7b→32b migration is SHIPPED everywhere I checked.
The repo has **no live `qwen2.5-coder:7b` model reference** in any routing/injection surface. Every surface resolves to `qwen2.5-coder:32b` (coder floor) or escalates to the Blackwell `best` tier (`gpt-oss:120b` for `search_synthesis`). The cost-router's `home_blackwell` down-walk (`ollama-cost-router.mjs:182-197`) is the canonical picker; `BLACKWELL_CEILING.search_synthesis="best"` (`:123-125`) reaches `gpt-oss:120b` (`:78`).

---

## BUCKET 1 — ALREADY Ollama-wired + correct model (no action)

**INJECTION (relevance-gating before Claude):**
- `claudemd-ollama-enforcer.mjs` — WIRED `.claude/settings.json:845` (UserPromptSubmit). Model `qwen2.5-coder:32b` (`:32`). Semantic-vault-first (`prism_memory:semantic_search`, `:151-178`) then 32b whole-doc rule-select fallback (`:194-234`). Correct smallest-adequate (rule-selection is a 32b-class task; 120b would be latency waste).
- `ollama-route-pretooluse.mjs` — **WIRED via `bundles/read-bundle.mjs:16`** (NOT settings.json directly; read-bundle itself wired `settings.json:694`). PreToolUse:Read bulk-data gist nudge; auto-substitute model `qwen2.5-coder:32b` (`:30,:427`). Correct — gist-of-a-log is a 32b/coder job, not 120b.

**ROUTING (deciding what goes where):**
- `ollama-task-offloader.mjs` — WIRED `settings.json:795`. Model via `routeModelForTask({category, available, hardware: detectHostClass()})` (`:513-518`) — host-aware, no hardcode. SAFETY_PRE gate (`:288`) + KEEP_ON_CLAUDE orchestration/directive labels (`:107-153`) are the CORRECT keeps the FALSIFIE
... [+6354 chars truncated]
