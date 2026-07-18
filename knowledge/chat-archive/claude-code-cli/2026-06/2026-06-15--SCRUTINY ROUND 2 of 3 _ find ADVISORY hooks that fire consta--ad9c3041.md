---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "SCRUTINY ROUND 2 of 3 — find ADVISORY hooks that fire constantly but produce ~ZE"
date: "2026-06-15"
first_ts: "2026-06-15T14:03:00.975Z"
last_ts: "2026-06-15T14:06:04.572Z"
cwd: "H:\\prism"
messages: 52
user_msgs: 23
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a6bb8aa740c4ae462.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# SCRUTINY ROUND 2 of 3 — find ADVISORY hooks that fire constantly but produce ~ZE

> **claude-code-cli** | 2026-06-15 | 52 msgs (23 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a6bb8aa740c4ae462.jsonl`

## Transcript

### User | 2026-06-15T14:03:00.975Z

SCRUTINY ROUND 2 of 3 — find ADVISORY hooks that fire constantly but produce ~ZERO forced action (the biggest dormant token savings). Goal: identify which advisories should become FORCED auto-actions without quality loss.

SMOKING-GUN DATA (from mcp-server/data/state/ollama-offload-stats.json byHook, already verified):
- large-read-digest-advisory: SUGGESTED 702x, offloaded 0
- fleet-reaper-coordinator: 244x suggested, 0 (not token-relevant, skip)
- grep-index-first: 76x suggested, 0 offloaded
- ollama-route-pretooluse: 75x suggested, 0 offloaded
- nav-rerank-advisory: 14x suggested, 0 offloaded
- ollama-task-offloader: 27 offloaded / 44 suggested (PARTIAL — best performer)
There are ~48 advisory/suggest injectors in .claude/hooks/*inject*.mjs.

Investigate the high-suggest/zero-action advisories:
1. READ .claude/hooks/large-read-digest-advisory.mjs — what does it suggest (a digest/Ollama path instead of a big Read?), and WHY is its action-rate 0 (advisory text the model ignores)? What would FORCING it look like (PreToolUse:Read that auto-routes a >N-line read to a digest/Ollama summary, with a quality guard so full-read is still available when needed)?
2. Same for grep-index-first.mjs (force master-index/grep-cache before raw Grep?) and ollama-route-pretooluse.mjs (force Ollama for mechanical PreToolUse work?).
3. Scan the other ~48 advisory injectors: which are HIGH-VALUE-IF-FORCED token savers vs pure-noise? List the top force-worthy ones.

For EACH return: hook, fires (count if known), actionRate (~0 etc), whatItSuggests, whyIgnored, forceMechanism (the concrete advisory->mandatory change), qualityGuard (how forcing it can't degrade quality — the escape hatch).

Return ONLY a fenced ```json block:
{"round":2,"ignoredAdvisories":[{"hook":"","fires":"","actionRate":"","whatItSuggests":"","whyIgnored":"","forceMechanism":"","qualityGuard":""}],"topForceCandidates":["hook", ...]}
Verify hook existence with Glob/Read (R12).

### Assistant | 2026-06-15T14:03:05.173Z

[tool_use: Glob]

### Assistant | 2026-06-15T14:03:05.665Z

[tool_use: Glob]

### Assistant | 2026-06-15T14:03:05.682Z

[tool_use: Glob]

### User | 2026-06-15T14:03:13.687Z

[tool_result] .claude\hooks\agent-rules-inject.mjs
.claude\hooks\ai-reasoning-inject.mjs
.claude\hooks\ai-system-router-inject.mjs
.claude\hooks\embedder-inject-qdrant.mjs
.claude\hooks\expert-role-inject.mjs
.claude\hooks\goal-stack-inject.mjs
.claude\hooks\gsd-inject.mjs
.claude\hooks\karpathy-discipline-inject.mjs
.claude\hooks\output-cache-inject.mjs
.claude\hooks\quality-dashboard-inject.mjs
.claude\hooks\
... [+4208 chars truncated]

### User | 2026-06-15T14:03:13.959Z

[tool_result] .claude\hooks\large-read-digest-advisory.mjs

### User | 2026-06-15T14:03:14.191Z

[tool_result] .claude\hooks\grep-index-first.mjs

### Assistant | 2026-06-15T14:03:22.254Z

[tool_use: Read]

### Assistant | 2026-06-15T14:03:22.263Z

[tool_use: Read]

### Assistant | 2026-06-15T14:03:22.270Z

[tool_use: Glob]

### User | 2026-06-15T14:03:29.235Z

[tool_result] .claude\hooks\ollama-route-pretooluse.mjs

### User | 2026-06-15T14:03:31.169Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// large-read-digest-advisory.mjs -- PreToolUse:Read advisory hook
4	//
5	// When Claude is about to Read a LARGE source file (>600 lines by default), inject an
6	// advisory pointing at scripts/ollama-file-digest.mjs -- the verified line-anchored
7	// digest (commit 1175a6f26b): a local-Ollama digest where every claim is checked
8	// against its cited source 
... [+10959 chars truncated]

### User | 2026-06-15T14:03:31.173Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * grep-index-first.mjs - PreToolUse Grep
5	 * Suggests checking MASTER_INDEX before expensive grep searches.
6	 * Uses local Ollama for intelligent suggestions (zero Claude API tokens).
7	 * Falls back to regex-based suggestions when Ollama unavailable.
8	 *
9	 * Token savings: 50-80% on known patterns.
10	 *
11	 * PSN-SYNERGIZE/U-GREP-GRAPH-WIRE (2026-
... [+20651 chars truncated]

### Assistant | 2026-06-15T14:03:35.629Z

Now let me read the ollama-route-pretooluse hook and scan the other advisory injectors in parallel:

### Assistant | 2026-06-15T14:03:35.867Z

[tool_use: Read]

### Assistant | 2026-06-15T14:03:36.740Z

[tool_use: Glob]

### Assistant | 2026-06-15T14:03:36.953Z

[tool_use: Glob]

### User | 2026-06-15T14:03:39.996Z

[tool_result] .claude\hooks\nav-rerank-advisory.mjs

### User | 2026-06-15T14:03:40.177Z

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

### User | 2026-06-15T14:03:40.430Z

[tool_result] .claude\hooks\wiki-read-offload-advisory.mjs

### Assistant | 2026-06-15T14:03:42.890Z

Now let me read the nav-rerank and wiki-read-offload hooks, plus scan the key advisory injectors in parallel:

### Assistant | 2026-06-15T14:03:43.998Z

[tool_use: Read]

### Assistant | 2026-06-15T14:03:44.003Z

[tool_use: Read]

### Assistant | 2026-06-15T14:03:44.413Z

[tool_use: Read]

### User | 2026-06-15T14:03:53.204Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// wiki-read-offload-advisory.mjs — PreToolUse:Read advisory hook
4	//
5	// When Claude is about to Read a large wiki entry (>500 lines by default),
6	// inject an advisory pointing at /route-to-obsidian — a slash that delegates
7	// to scripts/ask-ollama.mjs summarize so the 5-50KB wiki body is processed in
8	// a local Ollama subprocess instead of streaming 
... [+10375 chars truncated]

### User | 2026-06-15T14:03:53.394Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// nav-rerank-advisory.mjs -- PreToolUse:Bash advisory hook
4	//
5	// When Claude is about to run a `system-viz-query ... find <query>` (the codebase
6	// navigation search), inject an advisory pointing at scripts/ollama-nav-rerank.mjs
7	// (commit 127234e940) -- the VERIFIED ollama re-rank of the find candidates: a
8	// local model re-ranks the hits by query 
... [+9778 chars truncated]

### User | 2026-06-15T14:03:54.313Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// TOKEN-AWARENESS-MS0 / U-TA05 — model-visible inject hook.
4	//
5	// UserPromptSubmit hook. Reads the per-slot sidecar written by
6	// token-awareness-sidecar.mjs and emits a 3-line `additionalContext` block so
7	// the model SEES its current ctx/quota state and can self-pace.
8	//
9	// Wording is STATE not INSTRUCTION (per the Reddit r/ClaudeAI thread's
10	
... [+6909 chars truncated]

### Assistant | 2026-06-15T14:03:58.890Z

Now let me scan the remaining high-volume advisory injectors to assess their force-worthiness:

### Assistant | 2026-06-15T14:03:59.830Z

[tool_use: Read]

### Assistant | 2026-06-15T14:04:00.044Z

[tool_use: Read]

### Assistant | 2026-06-15T14:04:00.553Z

[tool_use: Read]

### User | 2026-06-15T14:04:08.139Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * search-thoroughness-inject.mjs — UserPromptSubmit advisory hook.
5	 *
6	 * Fires on search / inventory / "check the X folder" intent and injects the
7	 * full-recursive + parallel-agent search discipline BEFORE the search happens.
8	 * Codifies [[feedback_full_recursive_parallel_search]] (operator directive
9	 * 2026-05-29) after two shallow-discovery
... [+4274 chars truncated]

### User | 2026-06-15T14:04:08.405Z

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
... [+2889 chars truncated]

### User | 2026-06-15T14:04:08.489Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * orchestrator-advisory-inject.mjs — UserPromptSubmit hook that injects
5	 * golf-orchestrator advisories into THIS chat's prompt context when the
6	 * orchestrator has a fresh per-slot directive targeted at this chat's slot.
7	 *
8	 * The advisory injection channel is the OPT-IN, FAIL-SOFT path for the
9	 * chat-orchestrator's REACHING actions. The UI 
... [+2823 chars truncated]

### Assistant | 2026-06-15T14:04:12.139Z

Now let me scan the remaining high-volume advisory injectors quickly in parallel:

### Assistant | 2026-06-15T14:04:13.192Z

[tool_use: Read]

### Assistant | 2026-06-15T14:04:14.817Z

[tool_use: Read]

### Assistant | 2026-06-15T14:04:14.821Z

[tool_use: Read]

### User | 2026-06-15T14:04:24.670Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// audit-viz-first-inject.mjs — UserPromptSubmit T2 hook.
4	// When an audit/discovery intent is detected, auto-run
5	// `node scripts/system-viz-query.mjs find <noun>` and inject the top-K hits
6	// so the chat sees the answer BEFORE reaching for Grep/Glob.
7	//
8	// Knobs: PRISM_AUDIT_VIZ_FIRST_DISABLE=1 · PRISM_AUDIT_VIZ_FIRST_K=N (1..20, def 5)
9	//       
... [+2672 chars truncated]

### User | 2026-06-15T14:04:24.700Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * Optimal Context Inject — UserPromptSubmit Hook
5	 *
6	 * Maximizes reasoning potential by:
7	 * 1. Detecting task complexity (simple/medium/complex/critical)
8	 * 2. Querying Qdrant for semantically relevant engines (if available)
9	 * 3. Surfacing relevant agent-memory entries
10	 * 4. Suggesting appropriate reasoning mode
11	 *
12	 * Runs fast (<2s)
... [+1913 chars truncated]

### User | 2026-06-15T14:04:24.914Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * master-index-precheck-inject.test.mjs — hermetic tests for the U-RAG-2
4	 * stage-2 lexical rerank wiring (RAG-UPGRADE-MS0).
5	 *
6	 * Focus: the exported `applyLexicalRerank` helper. The hook's `main()` reads
7	 * disk (system-graph.json + CODE_SYSTEM_INDEX.json) so an end-to-end test
8	 * isn't hermetic — these cover the integration helper in isolation, which
9	 
... [+49 chars truncated]

### Assistant | 2026-06-15T14:04:27.641Z

Now let me check the advisory-decay library to understand the forcing mechanism, and scan a few more key injectors:

### Assistant | 2026-06-15T14:04:28.534Z

[tool_use: Read]

### Assistant | 2026-06-15T14:04:29.041Z

[tool_use: Read]

### Assistant | 2026-06-15T14:04:29.399Z

[tool_use: Read]

### User | 2026-06-15T14:04:34.764Z

[tool_result] 1	// scripts/lib/advisory-decay.mjs
2	// U-ADVISORY-DECAY (2026-06-09, slot:alpha): the missing ACTUATOR on advisory
3	// take-rate. mcp-route-takeup / ollama-offload-stats MEASURE per-hook conversion
4	// but nothing ACTS on it -- so a proven-zero-conversion advisory keeps spending
5	// context tokens on a nudge nobody takes. This gates that, fleet-wide.
6	//
7	// THE METRIC (R8-corrected 2026-06
... [+3710 chars truncated]

### User | 2026-06-15T14:04:38.775Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * karpathy-discipline-inject.mjs — SessionStart hook
5	 *
6	 * Injects the canonical Karpathy 4 rules into the main thread at the start
7	 * of every session. Subagents already inherit these via agent-rules-inject.mjs;
8	 * this hook closes the gap on the main thread so the discipline survives
9	 * compactions and is reinforced once per session without 
... [+2263 chars truncated]

### User | 2026-06-15T14:04:40.709Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	import fs from "node:fs";
4	
5	
6	function readStdinSafe() {
7	  try {
8	    if (process.stdin.isTTY) return "";
9	    return fs.readFileSync(0, "utf-8");
10	  } catch {
11	    return "";
12	  }
13	}
14	// DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass.
15	// Remove the next 2 lines to re-enable. See .claude/helpers/appl
... [+1920 chars truncated]

### Assistant | 2026-06-15T14:04:44.248Z

I have enough data. Let me now check the offload-stats file directly for the current state of all hooks, then synthesize:

### Assistant | 2026-06-15T14:04:44.631Z

[tool_use: Read]

### User | 2026-06-15T14:04:46.219Z

[tool_result] 1	{
2	  "schemaVersion": "2.0.0",
3	  "lastUpdated": "2026-06-15T14:04:45.132Z",
4	  "lastReset": "2026-04-28T00:11:42.432Z",
5	  "offloaded": 29,
6	  "keptOnClaude": 443,
7	  "estimatedTokensSaved": 29927,
8	  "silentSuggestions": 980,
9	  "injectedSuggestions": 27,
10	  "byCategory": {
11	    "cache-hit": 2,
12	    "summary": 14,
13	    "prism_audit": 1,
14	    "documentation": 8,
15	    "error_
... [+1532 chars truncated]

### Assistant | 2026-06-15T14:06:04.572Z

I have all the data needed. Here is the complete analysis:

```json
{
  "round": 2,
  "ignoredAdvisories": [
    {
      "hook": "large-read-digest-advisory",
      "fires": "705 fired / 705 suggested",
      "actionRate": "0/705 = 0%",
      "whatItSuggests": "When about to Read a source file >600 lines (~.mjs/.ts/.py etc), suggests running `node scripts/ollama-file-digest.mjs <path>` — a verified line-anchored Ollama digest (~300 tokens vs ~3000+ tokens raw), every claim cited to a source line number.",
      "whyIgnored": "Pure advisory text injected as additionalContext. The model sees the nudge AFTER already deciding to Read; switching mid-turn to a CLI digest requires a voluntary tool-call substitution the model never makes. No denial, no redirect, no structural forcing. Advisory-decay is wired (U-LARGE-READ-DECAY-WIRE) but the decay threshold (50 injections at <5% conversion) has been hit — 705 injections at 0% — so the hook is now self-muting with 1-in-20 probes. The muting reduces noise but does not convert any token saving.",
      "forceMechanism": "Promote to PreToolUse:Read hard-intercept for source files >600 lines: instead of additionalContext, emit `permissionDecision:deny` + substitute the Ollama digest output as the tool result (same pattern as `ollama-route-pretooluse` auto/reroute path). Call `scripts/ollama-file-digest.mjs` inline in the hook with a 30s timeout; fail-open (permit the raw Read) if Ollama is unreachable or the digest script errors. Gate: check `PRISM_LARGE_READ_DIGEST_FORCE=1` env flag or a `mode:force` in a config JSON analogous to `ollama-route-config.json`.",
      "qualityGuard": "Fail-open: any Ollama timeout/error falls through to the original Read. Add an escape hatch env `PRISM_LARGE_READ_DIGEST_DISABLE=1` (already exists). Exempt files in EXEMPT_BASENAMES (already in sibling ollama-route-pretooluse). The digest script already provides line-anchored citations so the model can request `Read offset=X limit=Y` for any specifi
... [+9623 chars truncated]
