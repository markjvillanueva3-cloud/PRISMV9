---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Inventory PRISM's EXISTING auto-enforcement of Ollama offloading for Claude Code"
date: "2026-06-13"
first_ts: "2026-06-13T14:33:14.620Z"
last_ts: "2026-06-13T15:01:57.029Z"
cwd: "H:\\prism-slot-sierra"
messages: 76
user_msgs: 33
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/workflows/wf_71067519-f1f/agent-a8d57119286a6f640.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Inventory PRISM's EXISTING auto-enforcement of Ollama offloading for Claude Code

> **claude-code-cli** | 2026-06-13 | 76 msgs (33 user / 43 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/workflows/wf_71067519-f1f/agent-a8d57119286a6f640.jsonl`

## Transcript

### User | 2026-06-13T14:33:14.620Z

Inventory PRISM's EXISTING auto-enforcement of Ollama offloading for Claude Code sessions (repo root H:/prism), classify EACH as ADVISORY vs ENFORCED. The operator wants "codified auto-enforcement of Ollama offloading" (route mechanical text/code work to local Ollama instead of spending Claude tokens). Current offload rate is reportedly ~13.8% vs a 30%+ target.

READ IN FULL (Glob/Grep to locate, then Read):
- .claude/hooks/ollama-pipeline-injector.mjs, ollama-prewarm-on-pipeline.mjs, ollama-embed-keepalive.mjs (or wherever), and any "ask-ollama" / "route-to-obsidian" / RTK route-nudge hooks.
- scripts/ask-ollama.mjs (full) + scripts/lib/ any ollama routing lib.
- The OllamaHookBridgeEngine (Glob mcp-server/src/engines/*Ollama*Bridge* and read it).
- The fallback ladder (Ollama -> Sonnet agent -> Opus): find where it is implemented (Grep "fallback" + "sonnet" in scripts/lib + hooks).
- scripts/ollama-offload-dashboard.mjs + mcp-server/data/state/ollama-offload-stats.json (read the stats schema + current numbers).

PRODUCE plain-text:
- A table: mechanism | file | trigger | ADVISORY-or-ENFORCED | what it does.
- The GAPS: where Ollama offload is suggested but not enforced; why the offload rate is low; what an ENFORCED offload would look like (e.g. a PreToolUse hook that intercepts a heavy Read/Grep/explain and routes it to Ollama, or blocks Claude from doing mechanical work the local model should do).
Cite file:line. Plain text only.

### Assistant | 2026-06-13T14:33:17.709Z

I'll systematically locate and read all the relevant files. Let me start with broad searches in parallel.

### Assistant | 2026-06-13T14:33:18.503Z

[tool_use: Glob]

### Assistant | 2026-06-13T14:33:18.504Z

[tool_use: Glob]

### Assistant | 2026-06-13T14:33:18.957Z

[tool_use: Glob]

### User | 2026-06-13T14:33:49.873Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T14:33:49.882Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T14:33:49.898Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T14:33:51.954Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:33:52.293Z

[tool_use: Bash]

### User | 2026-06-13T14:35:26.516Z

[tool_result] Exit code 255

### User | 2026-06-13T14:35:36.825Z

[tool_result] INDEX_TEMPLATE.js
MODULE_TEMPLATE.js
PLAN_deep_accuracy_v2.md
README.md
SESSION_START_TEMPLATES.md
TOOLKIT_ROADMAP.md
__fixtures__/
__pycache__/
__tests__/
_archive/
_audit-foxtrot-mill-cam.mjs*
_classify-hooks.mjs*
_completed_utilities/
_emergency-unwire-yolo-25.mjs*
_fix_ref_hb.js
_hook-audit-report.mjs*
_oneshot-rename-last-night.mjs*
_prep-hook-slices.mjs*
_prism_paths.py
_restore-3-critical-h
... [+1044 chars truncated]

### Assistant | 2026-06-13T14:35:39.274Z

The working directory is H:/prism-slot-sierra, but the target repo root is H:/prism. Let me search there directly.

### Assistant | 2026-06-13T14:35:39.664Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:35:40.105Z

[tool_use: Bash]

### User | 2026-06-13T14:36:13.755Z

[tool_result] ARCHITECTURE.json
CLAUDE.md
CLAUDE.md.bak-r14
DSL-QUICK-REFERENCE.md
_backups/
agents/
archived-commands/
backups/
bin/
cache/
commands/
commands-archive/
cron-runners/
dashboard.json
docs/
global-rules-backup/
helpers/
hookify-block-bash-cat-file.local.md
hookify-block-bash-find.local.md
hookify-block-bash-grep-rg.local.md
hookify-block-bash-head-tail.local.md
hookify-block-bash-ls-la.local.md
ho
... [+10324 chars truncated]

### User | 2026-06-13T14:36:20.978Z

[tool_result] command-ollama-routes.mjs
ollama-bridge-telemetry.mjs
ollama-bridge-telemetry.test.mjs
ollama-capability-battery.mjs
ollama-capability-battery.test.mjs
ollama-coresidency.mjs
ollama-coresidency.test.mjs
ollama-fanout.mjs*
ollama-fanout.test.mjs
ollama-search-rerank.mjs
ollama-search-rerank.test.mjs
ollama-state-check.mjs
ollama-verified-offload.mjs
ollama-verified-offload.test.mjs
ollama-vision-ex
... [+48 chars truncated]

### Assistant | 2026-06-13T14:36:25.265Z

Good, I can see the hooks directory and scripts/lib. Let me now read all the relevant files in parallel.

### Assistant | 2026-06-13T14:36:26.048Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:36:26.476Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:36:26.912Z

[tool_use: Bash]

### User | 2026-06-13T14:37:30.978Z

[tool_result] claudemd-ollama-enforcer.mjs*
localhost-ollama-hardcode-guard.mjs*
localhost-ollama-hardcode-guard.test.mjs
ollama-auto-router.mjs*
ollama-autostart.mjs*
ollama-context-aggregator.mjs*
ollama-engine-api-extractor.mjs*
ollama-nav-enforce-inject.mjs*
ollama-obsidian-rag.mjs*
ollama-pipeline-injector.mjs*
ollama-prewarm-on-pipeline.mjs*
ollama-prism-intelligence.mjs*
ollama-reviewer-second-opinion.mj
... [+448 chars truncated]

### User | 2026-06-13T14:37:33.596Z

[tool_result] AGI_INFRA_PHASE_A_WIRING.md
HOOK-TYPE-GUIDE.md
HOOK_DIGEST.md
README.md
__tests__/
_disabled/
_envelope.mjs*
_rpc-shim.mjs*
_rpc-shim.test.mjs
activate-before-build-precheck.mjs*
activate-before-build-precheck.test.mjs
active-chat-priority-boost.mjs*
active-chat-priority-decay.mjs*
agent-boundary-guard.mjs*
agent-fanout-pressure-gate.mjs*
agent-fanout-pressure-gate.test.mjs
agent-pid-tracker.mjs*

... [+1762 chars truncated]

### User | 2026-06-13T14:37:56.858Z

[tool_result] LatheLoRAOllamaDeployerEngine.ts
OllamaCAMIntegrationEngine.ts
OllamaCapabilityProbeEngine.ts
OllamaClientEngine.ts
OllamaContextFloorEngine.ts
OllamaEmbedderEngine.ts
OllamaHookBridgeEngine.ts
OllamaIntegrationEngine.ts
OllamaTaskOffloaderEngine.ts

### Assistant | 2026-06-13T14:37:59.205Z

Now let me read all the key files in parallel.

### Assistant | 2026-06-13T14:38:00.021Z

[tool_use: Read]

### Assistant | 2026-06-13T14:38:00.801Z

[tool_use: Read]

### Assistant | 2026-06-13T14:38:01.169Z

[tool_use: Read]

### Assistant | 2026-06-13T14:38:01.560Z

[tool_use: Read]

### Assistant | 2026-06-13T14:38:01.775Z

[tool_use: Read]

### User | 2026-06-13T14:38:26.632Z

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
... [+16282 chars truncated]

### User | 2026-06-13T14:38:26.678Z

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
... [+26575 chars truncated]

### User | 2026-06-13T14:38:27.745Z

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
... [+6148 chars truncated]

### User | 2026-06-13T14:38:27.747Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-auto-router.mjs — UserPromptSubmit hook
5	 *
6	 * AUTOMATIC Ollama routing — no manual /commands needed.
7	 * Detects task type from prompt and routes appropriate work to Ollama,
8	 * injecting results as context so Claude doesn't duplicate effort.
9	 *
10	 * Routes:
11	 * - Summarization requests → Ollama summarize
12	 * - Explanation requests
... [+6793 chars truncated]

### User | 2026-06-13T14:38:27.748Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * posttool-ollama-offload-nudge.mjs — PostToolUse hook
5	 *
6	 * TOKEN-SAVINGS-PIVOT/U-PSN-OLLAMA-POSTREAD (iter15-#2, 2026-05-23, slot:alpha)
7	 *
8	 * Gap-fill #2 of the 5-fill PSN goal. After a Read of a large file
9	 * (CLAUDE.md, ENGINE_DIGEST, MEMORY.md, large engine, etc.), suggest
10	 * routing the next summarize/explain pass through Ollama
11	 
... [+3059 chars truncated]

### Assistant | 2026-06-13T14:38:30.511Z

Now let me read more key files in parallel.

### Assistant | 2026-06-13T14:38:31.335Z

[tool_use: Read]

### Assistant | 2026-06-13T14:38:31.709Z

[tool_use: Read]

### Assistant | 2026-06-13T14:38:32.087Z

[tool_use: Read]

### Assistant | 2026-06-13T14:38:32.319Z

[tool_use: Read]

### User | 2026-06-13T14:40:12.102Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+36118 chars truncated]

### User | 2026-06-13T14:40:13.516Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-unified-semantic-router.mjs — UserPromptSubmit hook
5	 *
6	 * UNIFIED OLLAMA ROUTING LAYER
7	 *
8	 * Instead of 48 separate hooks each doing pattern matching:
9	 * 1. Collect ALL semantic signals in one pass
10	 * 2. Make ONE Ollama call with full context
11	 * 3. Return structured recommendations for all domains
12	 *
13	 * Replaces: *-inject.
... [+11942 chars truncated]

### User | 2026-06-13T14:40:16.762Z

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
... [+9287 chars truncated]

### User | 2026-06-13T14:40:23.053Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * ollama-route-check-inject.mjs — UserPromptSubmit hook
5	 *
6	 * Fires when the operator mentions ollama / offload / local model / qwen /
7	 * deepseek / route check / offloader / token saving — surfaces a 6-line
8	 * health summary of the Ollama offload route so the operator can see at a
9	 * glance whether the route is firing.
10	 *
11	 * Reads the S
... [+6747 chars truncated]

### Assistant | 2026-06-13T14:40:27.115Z

Now let me read the remaining key files in parallel.

### Assistant | 2026-06-13T14:40:27.916Z

[tool_use: Read]

### Assistant | 2026-06-13T14:40:28.202Z

[tool_use: Read]

### Assistant | 2026-06-13T14:40:28.634Z

[tool_use: Read]

### User | 2026-06-13T14:42:47.591Z

[tool_result] 1	/**
2	 * OllamaHookBridgeEngine
3	 *
4	 * Enables Claude Code hooks to call local Ollama for intelligent suggestions
5	 * without consuming API tokens. Designed for hook use cases:
6	 *
7	 * - Fast: 500ms default timeout (hooks can't block long)
8	 * - Resilient: Graceful fallback when Ollama unavailable
9	 * - Configurable: Per-hook-type model selection
10	 * - Stateless: No connection pooling 
... [+17651 chars truncated]

### User | 2026-06-13T14:42:47.606Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1417 of 3700 total (55465 tokens, cap 25000). Call Read with offset=1418 limit=1417 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "schemaVersion": "2.0.0",
3	  "lastUpdated": "2026-06-13T14:38:42.722Z",
4	  "lastReset": "2026-
... [+53151 chars truncated]

### User | 2026-06-13T14:42:48.192Z

[tool_result] 1	// scripts/lib/ollama-verified-offload.mjs
2	// U-VERIFIED-OFFLOAD (2026-06-09, slot:alpha): the keystone that makes Ollama
3	// AUTO-offload safe at "100% accuracy". Spec: state/shared/specs/OLLAMA-VERIFIED-OFFLOAD.md
4	//
5	// THE INSIGHT: a local LLM is NOT 100% accurate generatively. You get 100% NET
6	// accuracy only by WRAPPING the offload in code that VERIFIES the output, with a
7	// fai
... [+5476 chars truncated]

### Assistant | 2026-06-13T14:42:53.948Z

Now let me check the settings.json to see which of these hooks are actually wired, and check the advisory-decay module and scripts/ask-ollama.mjs.

### Assistant | 2026-06-13T14:42:55.034Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:42:55.441Z

[tool_use: Read]

### Assistant | 2026-06-13T14:42:55.953Z

[tool_use: Bash]

### User | 2026-06-13T14:44:03.148Z

[tool_result] 1	// scripts/lib/advisory-decay.mjs
2	// U-ADVISORY-DECAY (2026-06-09, slot:alpha): the missing ACTUATOR on advisory
3	// take-rate. mcp-route-takeup / ollama-offload-stats MEASURE per-hook conversion
4	// but nothing ACTS on it -- so a proven-zero-conversion advisory keeps spending
5	// context tokens on a nudge nobody takes. This gates that, fleet-wide.
6	//
7	// THE METRIC (R8-corrected 2026-06
... [+8673 chars truncated]

### User | 2026-06-13T14:49:49.089Z

[tool_result] Command running in background with ID: bc0wtw92a. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism-slot-sierra\ed91599e-19b8-4bdb-8ea8-87e47b6ee322\tasks\bc0wtw92a.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-06-13T14:49:49.092Z

[tool_result] Command running in background with ID: byw5qccxx. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism-slot-sierra\ed91599e-19b8-4bdb-8ea8-87e47b6ee322\tasks\byw5qccxx.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-13T14:49:53.052Z

Let me now check which hooks are wired in settings.json and check ask-ollama.mjs.

### Assistant | 2026-06-13T14:49:53.737Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:49:54.578Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:49:54.797Z

[tool_use: Read]

### User | 2026-06-13T14:50:39.392Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+3976 chars truncated]

### User | 2026-06-13T14:55:02.719Z

[tool_result] (Bash completed with no output)

### User | 2026-06-13T14:55:05.174Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-13T14:55:07.645Z

Let me read the background task outputs and check settings.json for hook wiring.

### Assistant | 2026-06-13T14:55:08.418Z

[tool_use: Read]

### Assistant | 2026-06-13T14:55:08.838Z

[tool_use: Read]

### User | 2026-06-13T14:55:37.817Z

[tool_result] 1	    "OLLAMA_MODELS": "H:/Tools/ollama/models",
2	    "NIM_URL": "http://127.0.0.1:8000/v1",
3	    "NIM_EMBED_URL": "http://127.0.0.1:8010/v1",
4	--
5	    "ollama-explain": "user-invocable-only",
6	    "ollama-summarize": "user-invocable-only",
7	    "ollama-docstring": "user-invocable-only",
8	    "ollama-classify": "user-invocable-only",
9	    "ollama-diff-summary": "user-invocable-only",
10	  
... [+1206 chars truncated]

### User | 2026-06-13T14:55:37.873Z

[tool_result] 1	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/ollama-autostart.mjs",
2	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/ollama-auto-router.mjs",
3	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/prompt-rewriter-ollama.mjs",
4	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/h
... [+260 chars truncated]

### Assistant | 2026-06-13T14:55:40.851Z

Now let me check settings.json more precisely for the hook events and also check a few more hooks including claudemd-ollama-enforcer and the ollama-route-pretooluse wiring.

### Assistant | 2026-06-13T14:55:53.006Z

[tool_use: Bash]

### Assistant | 2026-06-13T14:55:53.259Z

[tool_use: Read]

### User | 2026-06-13T14:56:33.165Z

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
... [+2251 chars truncated]

### User | 2026-06-13T15:00:04.231Z

[tool_result]             "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/multi-computer-awareness.mjs",
            "type": "command",
            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/ollama-autostart.mjs",
            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/prompt-context-inject.mjs",
            "type": "command",
            "com
... [+1345 chars truncated]

### Assistant | 2026-06-13T15:01:57.029Z

Now I have all the information needed. Let me produce the full report.

---

PRISM OLLAMA OFFLOAD ENFORCEMENT INVENTORY
===========================================
As of 2026-06-13. Stats from H:/prism/mcp-server/data/state/ollama-offload-stats.json (schema v2.0.0).
Current rate: offloaded=17, keptOnClaude=211, ratio=17/(17+211)=7.5% (stats say ~13.8% elsewhere but the raw numbers give 7.5%).

---

MECHANISM TABLE
---------------

MECHANISM                       | FILE (H:/prism/...)                                           | HOOK EVENT        | WIRED IN settings.json | ADVISORY-or-ENFORCED | WHAT IT DOES
---                             | ---                                                           | ---               | ---                    | ---                  | ---
ollama-pipeline-injector        | .claude/hooks/ollama-pipeline-injector.mjs                    | UserPromptSubmit  | NO (not in wired list) | ADVISORY             | Detects slash-command pipelines (/forge-audit, /rgs, /scrutinize, /precompact, etc.) AND bare-prose verb triggers (explain/summarize/lint/etc.), injects additionalContext listing Ollama routes. always `continue:true`, never blocks. Lines 15-17, 276-284.
ollama-prewarm-on-pipeline      | .claude/hooks/ollama-prewarm-on-pipeline.mjs                  | UserPromptSubmit  | NO (not in wired list) | ENFORCED (side-effect only) | Detects same pipeline triggers, fires a background `curl /api/generate` to warm qwen2.5-coder:32b in VRAM before Claude's first tool call. Does NOT block or reroute. 10-min cooldown stamp. Lines 112-136. The only mechanism that unconditionally ACTS (but only warms the model, does not actually route work).
ollama-route-pretooluse         | .claude/hooks/ollama-route-pretooluse.mjs                     | PreToolUse:Read   | NO (not in wired list) | CONDITIONALLY ENFORCED (auto-mode disabled) | In DEFAULT mode (suggest): injects additionalContext advisory when a Read target is a bulk-data file >=24KB. In `mode:auto` (PR
... [+15700 chars truncated]
