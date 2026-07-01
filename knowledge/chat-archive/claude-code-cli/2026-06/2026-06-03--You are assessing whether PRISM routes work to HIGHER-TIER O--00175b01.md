---
type: "chat-session"
source: "claude-code-cli"
session_id: "00175b01-57de-45eb-953e-d6b540d69477"
title: "You are assessing whether PRISM routes work to HIGHER-TIER Ollama LLMs now that "
date: "2026-06-03"
first_ts: "2026-06-03T17:54:26.038Z"
last_ts: "2026-06-03T18:00:52.647Z"
cwd: "H:\\prism"
messages: 80
user_msgs: 34
assistant_msgs: 46
raw_file: "H:/.claude/projects/H--prism/00175b01-57de-45eb-953e-d6b540d69477/subagents/workflows/wf_b5b2319b-0cb/agent-a0ffcac8c69879f56.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:02"
---

# You are assessing whether PRISM routes work to HIGHER-TIER Ollama LLMs now that 

> **claude-code-cli** | 2026-06-03 | 80 msgs (34 user / 46 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/00175b01-57de-45eb-953e-d6b540d69477/subagents/workflows/wf_b5b2319b-0cb/agent-a0ffcac8c69879f56.jsonl`

## Transcript

### User | 2026-06-03T17:54:26.038Z

You are assessing whether PRISM routes work to HIGHER-TIER Ollama LLMs now that GPU VRAM expanded (the fleet just swapped to an RTX PRO 6000 96GB 'blackwell' host preset with qwen2.5-coder:32b prewarm). Repo root: H:/prism.

Available local models (confirmed live via /api/tags): qwen2.5-coder:32b (19.9GB), deepseek-r1:14b (9.0GB), qwen2.5-coder:14b (9.0GB), qwen3-vl:8b, qwen2.5vl:7b, qwen2.5-coder:7b (4.7GB), qwen2.5-coder:3b (1.9GB), llama3.2-vision:11b, nomic-embed-text.

Investigate (read-only):
1. Model selection: read the routing logic in OllamaHookBridgeEngine / aiSystemRouterEngine / scripts/ask-ollama.mjs / .claude/hooks/ollama-*.mjs. Does it HARDCODE qwen2.5-coder:7b or :3b for everything, or does it scale model tier by task complexity? With 96GB VRAM, heavy reasoning/synthesis/scrutiny SHOULD route to 14b/32b/deepseek-r1.
2. Octopus consensus: read MultiModelConsensusEngine + scripts/octopus-with-hermes-rag.mjs. Which models are the 5 voices? Are they all small, or is at least one a 32b/14b/deepseek-r1 heavy voice?
3. Offload rate: read state/shared/dashboards via scripts/ollama-offload-dashboard.mjs --json (or the stats json). Target >=30%. Current SessionStart telemetry shows ~13.8-38% — confirm.
4. Prewarm: does the blackwell preset / ollama-prewarm-on-pipeline.mjs prewarm the BIG model (32b) or only small ones?
5. Scrutiny/wiki/synthesis offload: which heavy local-LLM consumers (deepseek-r1:14b advisory scrutiny arm, wiki maintenance, weekly synthesis) exist and are they pointed at the right (bigger) model now?

Return PLAIN TEXT: utilization 0-100%, what WORKS, what is DORMANT (hardcoded-small-model decisions that should be upgraded), TOP 3 high-ROI upgrades with effort + exact file:line/flag to change. Name the specific model-string constants to bump.

### Assistant | 2026-06-03T17:54:38.387Z

I'll conduct a systematic read-only investigation of the PRISM routing logic to assess whether it's utilizing the new 96GB VRAM capacity effectively. Let me search the codebase systematically.

### Assistant | 2026-06-03T17:54:39.097Z

[tool_use: Glob]

### Assistant | 2026-06-03T17:54:39.098Z

[tool_use: Glob]

### Assistant | 2026-06-03T17:54:39.274Z

[tool_use: Glob]

### User | 2026-06-03T17:55:07.365Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-03T17:55:07.484Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-03T17:55:08.085Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-03T17:55:11.696Z

Let me refine the search with more specific paths:

### Assistant | 2026-06-03T17:55:12.102Z

[tool_use: Bash]

### User | 2026-06-03T17:55:23.800Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-06-03T17:55:26.190Z

Let me search more carefully with proper bash syntax:

### Assistant | 2026-06-03T17:55:27.105Z

[tool_use: Bash]

### Assistant | 2026-06-03T17:55:27.114Z

[tool_use: Bash]

### Assistant | 2026-06-03T17:55:27.116Z

[tool_use: Bash]

### User | 2026-06-03T17:56:05.143Z

[tool_result] H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/agentic-flow/dist/router/providers/ollama.js
H:/prism/.claude/hooks/bundles/lib/ollama-fuse.mjs
H:/prism/.claude/hooks/claudemd-ollama-enforcer.mjs
H:/prism/.claude/hooks/lib/ollama-cost-router.mjs
H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs
H:/prism/.claude/hooks/lib/ollama-stats.mjs
H:/prism/.claude/hooks/lib/__tests__/ollama-hook-brid
... [+1937 chars truncated]

### User | 2026-06-03T17:56:42.045Z

[tool_result] <persisted-output>
Output too large (33.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\00175b01-57de-45eb-953e-d6b540d69477\tool-results\buuk6d6lk.txt

Preview (first 2KB):
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/mcp/.claude/helpers/router.js
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/neural/dist/moe-router.js
H:/prism/.cac
... [+1800 chars truncated]

### User | 2026-06-03T17:57:18.086Z

[tool_result] H:/prism/.claude/hooks/octopus-provider-probe.mjs
H:/prism/.claude/hooks/octopus-provider-probe.test.mjs
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/.claude/hooks/octopus-provider-probe.mjs
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/scripts/bench-octopus-overhead.mjs
H:/prism/.claude/worktrees/agent-a0310b5d699214970/.claude/hooks/octopus-provider-probe.mjs
H:/prism/.claude/worktree
... [+4286 chars truncated]

### Assistant | 2026-06-03T17:57:20.854Z

Let me now examine the critical routing files directly:

### Assistant | 2026-06-03T17:57:21.179Z

[tool_use: Read]

### Assistant | 2026-06-03T17:57:21.315Z

[tool_use: Read]

### Assistant | 2026-06-03T17:57:21.997Z

[tool_use: Read]

### Assistant | 2026-06-03T17:57:22.120Z

[tool_use: Read]

### User | 2026-06-03T17:57:25.126Z

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
... [+6792 chars truncated]

### User | 2026-06-03T17:57:25.608Z

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
... [+11941 chars truncated]

### User | 2026-06-03T17:57:25.902Z

[tool_result] 1	// tier: T4
2	/**
3	 * ollama-hook-bridge.mjs
4	 * Shared helper for hooks to call local Ollama with fast timeout and graceful fallback.
5	 *
6	 * Usage:
7	 *   import { queryOllama, isOllamaAvailable } from './lib/ollama-hook-bridge.mjs';
8	 *   const result = await queryOllama(prompt, { hookType: 'grep_index', timeoutMs: 300 });
9	 *   if (result.success) { use result.response } else { use reg
... [+6877 chars truncated]

### User | 2026-06-03T17:57:25.994Z

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
... [+5922 chars truncated]

### Assistant | 2026-06-03T17:57:29.849Z

Let me continue examining the Octopus consensus engine and offload dashboards:

### Assistant | 2026-06-03T17:57:31.221Z

[tool_use: Read]

### Assistant | 2026-06-03T17:57:31.224Z

[tool_use: Read]

### Assistant | 2026-06-03T17:57:31.227Z

[tool_use: Read]

### User | 2026-06-03T17:57:35.133Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/octopus-with-hermes-rag.mjs
3	//
4	// HERMES×OCTOPUS coordinator — wires U-HOC01 (input curator) + U-HOC02
5	// (output ledger) + U-HOC03 (route policy) into one operator-callable
6	// surface. Takes a prompt, decides via route policy whether to invoke
7	// octopus, enriches the voice context via the curator, records the
8	// outcome to the ledger.
9	//
10	// Usa
... [+11517 chars truncated]

### User | 2026-06-03T17:57:35.240Z

[tool_result] 1	// scripts/lib/octopus-route-policy.mjs
2	//
3	// U-HOC03 — invocation policy: decides whether to fire octopus vs single-claude
4	// vs ollama-only vs skip-ai for a given prompt. Pure-core; opts.rerank +
5	// opts.historicalRuns injected (the latter from U-HOC02 ledger).
6	//
7	// The policy is a learned classifier: given a prompt's similarity to past
8	// octopus-success / octopus-overkill case
... [+4518 chars truncated]

### User | 2026-06-03T17:57:35.270Z

[tool_result] 1	// scripts/lib/octopus-dispatch.mjs
2	//
3	// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P0 — the real 5-voice dispatch bridge.
4	//
5	// octopus-with-hermes-rag.mjs §3 was a STUB: it recorded five
6	// "pending-real-dispatch" voices and a `consensus:'stub-not-yet-merged'`
7	// verdict, so the ledger never reflected a real fan-out. This bridge invokes
8	// PRISM's real consensus orchestrator (MultiModelCon
... [+8255 chars truncated]

### Assistant | 2026-06-03T17:57:38.118Z

Now let me examine task offloading, scrutiny routing, and the offload dashboard:

### Assistant | 2026-06-03T17:57:38.771Z

[tool_use: Read]

### Assistant | 2026-06-03T17:57:39.171Z

[tool_use: Read]

### Assistant | 2026-06-03T17:57:39.416Z

[tool_use: Bash]

### Assistant | 2026-06-03T17:57:39.621Z

[tool_use: Bash]

### User | 2026-06-03T17:57:42.789Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+12470 chars truncated]

### User | 2026-06-03T17:57:43.335Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * ollama-reviewer-second-opinion — PreToolUse hook on Bash for `git commit`.
5	 *
6	 * Before every autonomous-mode commit, runs `git diff --staged` and asks
7	 * Ollama (qwen2.5-coder:7b by default) for a one-shot second-opinion review.
8	 * Ollama returns JSON of shape:
9	 *
10	 *   { "verdict": "PASS" | "CONCERN" | "FAIL",
11	 *     "reason":  string
... [+5227 chars truncated]

### User | 2026-06-03T17:57:49.908Z

[tool_result] H:/prism/scripts/ollama-offload-dashboard.mjs
H:/prism/scripts/__tests__/ollama-offload-dashboard.test.mjs

### User | 2026-06-03T17:58:13.427Z

[tool_result] H:/prism/.claude/hooks/posttool-ollama-offload-nudge.mjs
H:/prism/.claude/hooks/__tests__/posttool-ollama-offload-nudge.test.mjs
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/data/state/ollama-offload-stats.json
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/scripts/ollama-offload-dashboard.mjs
H:/prism/.claude/worktrees/agent-a0310b5d699214970/mcp-server/data/state/ollama-offl
... [+476 chars truncated]

### Assistant | 2026-06-03T17:58:16.559Z

Let me check the offload dashboard and stats:

### Assistant | 2026-06-03T17:58:16.794Z

[tool_use: Read]

### Assistant | 2026-06-03T17:58:17.425Z

[tool_use: Bash]

### Assistant | 2026-06-03T17:58:17.431Z

[tool_use: Bash]

### User | 2026-06-03T17:58:19.582Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-offload-dashboard.mjs — print last-24h Ollama offload stats
4	 *
5	 * INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03.
6	 *
7	 * Reads mcp-server/data/state/ollama-offload-stats.json (schemaVersion 2.0.0)
8	 * and prints:
9	 *   1. Top-line totals (since last reset)
10	 *   2. Per-hook fire counts (which hooks are doing the routing)
11	 *   3. Last 24h activity from the ro
... [+6081 chars truncated]

### User | 2026-06-03T17:58:25.265Z

[tool_result] H:/prism/mcp-server/data/state/ollama-offload-stats.json
H:/prism/mcp-server/data/state/ollama-offload-stats.json.tmp.38488
H:/prism/mcp-server/data/state/ollama-rate-limits.json
H:/prism/mcp-server/data/state/ollama-route-config.json

### User | 2026-06-03T17:58:25.896Z

[tool_result] {
  "schemaVersion": "2.0.0",
  "lastUpdated": "2026-06-03T17:58:17.090Z",
  "lastReset": "2026-04-28T00:11:42.432Z",
  "offloaded": 345,
  "keptOnClaude": 2777,
  "estimatedTokensSaved": 318697,
  "silentSuggestions": 484,
  "injectedSuggestions": 341,
  "byCategory": {
    "cache-hit": 2,
    "summary": 152,
    "explanation": 13,
    "prism_audit": 20,
    "documentation": 132,
    "prism_inven
... [+2105 chars truncated]

### Assistant | 2026-06-03T17:58:30.171Z

Now let me check scrutiny/wiki routing and any deepseek-r1 configuration:

### Assistant | 2026-06-03T17:58:31.075Z

[tool_use: Grep]

### Assistant | 2026-06-03T17:58:31.759Z

[tool_use: Grep]

### User | 2026-06-03T17:58:35.005Z

[tool_result] No files found

### User | 2026-06-03T17:58:35.547Z

[tool_result] No matches found

### Assistant | 2026-06-03T17:58:38.352Z

Let me search more specifically for hardcoded model strings:

### Assistant | 2026-06-03T17:58:38.815Z

[tool_use: Bash]

### Assistant | 2026-06-03T17:58:39.201Z

[tool_use: Bash]

### Assistant | 2026-06-03T17:58:39.628Z

[tool_use: Bash]

### User | 2026-06-03T17:58:46.982Z

[tool_result] H:/prism/.claude/hooks/claudemd-ollama-enforcer.mjs:const MODEL = process.env.CLAUDEMD_ENFORCER_MODEL || "qwen2.5-coder:7b";
H:/prism/.claude/hooks/commit-draft-suggest.mjs:const OLLAMA_MODEL = process.env.OLLAMA_COMMIT_MODEL ?? "qwen2.5-coder:7b";
H:/prism/.claude/hooks/memory-mirror-to-vault.mjs:const OLLAMA_CLASSIFY_MODEL = process.env.OLLAMA_CLASSIFY_MODEL ?? "qwen2.5-coder:7b";
H:/prism/.clau
... [+3735 chars truncated]

### User | 2026-06-03T17:58:47.215Z

[tool_result] H:/prism/.claude/hooks/lib/ollama-cost-router.mjs:    "deepseek-r1:14b", // reasoning / error-triage workhorse — installed on this host
H:/prism/.claude/hooks/ollama-pipeline-injector.mjs:    "**Phase 1** (parallel domain audit) — add `deepseek-r1:14b` as a 4th reviewer role for cross-domain reasoning. Local, free, parallel to Claude agents A/B/C.",
H:/prism/.claude/hooks/ollama-pipeline-injector.
... [+2965 chars truncated]

### User | 2026-06-03T17:58:48.505Z

[tool_result]  * @returns {{ model: string|null, tier: string, reason: string }}
    return { model: null, tier: "none", reason: "no models available" };
    return { model: null, tier: "none", reason: "no string-typed models" };
    return { model: av[0], tier: "fallback", reason: `unknown tier "${requestedTier}"` };
          model: pref,
  return { model: av[0], tier: "fallback", reason: "no preferred model 
... [+15 chars truncated]

### Assistant | 2026-06-03T17:58:51.716Z

Let me read the cost-router to understand tiering:

### Assistant | 2026-06-03T17:58:51.984Z

[tool_use: Read]

### Assistant | 2026-06-03T17:58:52.408Z

[tool_use: Bash]

### User | 2026-06-03T17:58:55.342Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+4932 chars truncated]

### User | 2026-06-03T17:59:00.839Z

[tool_result] H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs:const HOOK_MODELS = {
H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs-  grep_index: 'qwen2.5-coder:7b',
H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs-  mcp_route: 'qwen2.5-coder:7b',
H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs-  ai_feature: 'qwen2.5-coder:14b',
H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs-  code_explain: 'qwen2.5-c
... [+4946 chars truncated]

### Assistant | 2026-06-03T17:59:03.923Z

Let me check for scrutiny and wiki-specific routing:

### Assistant | 2026-06-03T17:59:04.566Z

[tool_use: Bash]

### Assistant | 2026-06-03T17:59:04.986Z

[tool_use: Bash]

### Assistant | 2026-06-03T17:59:05.244Z

[tool_use: Bash]

### User | 2026-06-03T17:59:12.945Z

[tool_result]   "scrutiny-3way": "qwen2.5-coder:7b",
  "dedup": "nomic-embed-text",
  "precompact": "qwen2.5-coder:14b",
  "deep-search": "qwen2.5-coder:7b",
  "pdf-learn": "qwen2.5-coder:7b",
  "video-learn": "qwen2.5-coder:7b",

### User | 2026-06-03T17:59:13.079Z

[tool_result] H:/prism/.claude/hooks/ai-auto-command-router.mjs:  { patterns: [/scrutin|deep.*review|audit.*code/i], cmd: "/scrutinize", priority: 2 },
H:/prism/.claude/hooks/cag-router-inject.test.mjs:// Per CLAUDE.md per-file scrutiny + the comprehensive-build-enforce
H:/prism/.claude/hooks/cag-router-inject.test.mjs:      stdin: { prompt: "what does CLAUDE.md say about the scrutiny gate doctrine?", session_i
... [+2399 chars truncated]

### User | 2026-06-03T17:59:48.718Z

[tool_result] H:/prism/.cache/extract-scrutiny-prompts.mjs
H:/prism/.claude/helpers/scrutiny-ledger.mjs
H:/prism/.claude/helpers/scrutiny-ledger.test.mjs
H:/prism/.claude/helpers/wiki-domain-bias.mjs
H:/prism/.claude/helpers/wiki-domain-bias.test.mjs
H:/prism/.claude/hooks/scrutiny-verdict-persist.mjs
H:/prism/.claude/hooks/stop-bug-finding-wiki-gate.mjs
H:/prism/.claude/hooks/stop-bug-finding-wiki-gate.test.mj
... [+117 chars truncated]

### Assistant | 2026-06-03T18:00:02.491Z

Let me check the current offload rate calculation from the stats:

### Assistant | 2026-06-03T18:00:04.076Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:00:04.589Z

[tool_use: Bash]

### User | 2026-06-03T18:00:10.966Z

[tool_result] Offload rate: 11.1% (346 offloaded, 2777 kept)
Tokens saved: 318,873
Infra suggests (noise): 485
Injected suggests (signal): 342

### User | 2026-06-03T18:00:17.868Z

[tool_result] 36

### Assistant | 2026-06-03T18:00:52.647Z

Perfect. Now I have all the data I need. Let me compile the comprehensive assessment:

---

## PRISM OLLAMA ROUTING ASSESSMENT — 96GB RTX PRO 6000 BLACKWELL HOST

**UTILIZATION: 11.1%** (346 offloaded, 2,777 kept on Claude; 318.9K tokens saved)

### FINDINGS: WHAT WORKS

1. **Cost-router tier system EXISTS** — `/hooks/lib/ollama-cost-router.mjs` implements 4-tier scaling (cheap/balanced/strong/best) with escalation logic. Capable of routing to qwen2.5-coder:32b and deepseek-r1:14b when task category warrants.

2. **Offload infrastructure ACTIVE** — ollama-task-offloader.mjs fires 3,763 times, correctly categorizes tasks (summary, explanation, documentation, prism_inventory, audit), rate-limits per-category at 60s (was 5min), and injects suggestions when confidence ≥0.80.

3. **Prewarm pipeline EXISTS** — ollama-prewarm-on-pipeline.mjs detects /forge, /rgs, /scrutinize, /precompact triggers and preloads models with 10-min cooldown to hide cold-start latency.

4. **Octopus 5-voice consensus STAGED** — octopus-with-hermes-rag.mjs + octopus-dispatch.mjs wire the MultiModelConsensusEngine (anthropic + codex + ollama + xai + google), but LIVE_DISPATCH is OFF by default (set PRISM_OCTOPUS_LIVE_DISPATCH=1 to activate).

### WHAT IS DORMANT — HARDCODED SMALL MODELS (THE PROBLEM)

**The 96GB VRAM is UNDERUTILIZED because routing still defaults to 7b/3b tiers even for complex tasks:**

1. **ollama-auto-router.mjs:130** — ALL task types hardcoded to `qwen2.5-coder:7b`:
   - Summarization → 7b (should be: balanced)
   - Explanation → 7b (should be: balanced)
   - Error triage → 7b (should be: strong/deepseek-r1:14b for reasoning)
   - Boilerplate/scaffold → 7b (should be: best/32b for multi-step codegen)
   - **FIX:** Pass `category` to `queryOllama(..., { hookType: 'code_explain' })` to leverage HOOK_MODELS table

2. **ollama-unified-semantic-router.mjs:196** — Same hardcoding:
   - Line 196: `model: 'qwen2.5-coder:7b'` for ALL domains (mcp_route, formulas, ai_features, safety,
... [+6226 chars truncated]
