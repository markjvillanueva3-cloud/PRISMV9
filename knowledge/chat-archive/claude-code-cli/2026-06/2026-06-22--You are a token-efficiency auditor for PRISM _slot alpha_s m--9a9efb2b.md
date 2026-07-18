---
type: "chat-session"
source: "claude-code-cli"
session_id: "9a9efb2b-f8dc-4bb1-83a2-9a2785dec826"
title: "You are a token-efficiency auditor for PRISM (slot alpha's mandate). Scope: H:/p"
date: "2026-06-22"
first_ts: "2026-06-22T02:13:25.001Z"
last_ts: "2026-06-22T02:20:05.942Z"
cwd: "H:\\prism"
messages: 100
user_msgs: 42
assistant_msgs: 58
raw_file: "H:/.claude/projects/H--prism/9a9efb2b-f8dc-4bb1-83a2-9a2785dec826/subagents/workflows/wf_0465dcef-659/agent-ad182dbb5a1273d5d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# You are a token-efficiency auditor for PRISM (slot alpha's mandate). Scope: H:/p

> **claude-code-cli** | 2026-06-22 | 100 msgs (42 user / 58 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9a9efb2b-f8dc-4bb1-83a2-9a2785dec826/subagents/workflows/wf_0465dcef-659/agent-ad182dbb5a1273d5d.jsonl`

## Transcript

### User | 2026-06-22T02:13:25.001Z

You are a token-efficiency auditor for PRISM (slot alpha's mandate). Scope: H:/prism/scripts/ + H:/prism/.claude/hooks/ + H:/prism/scripts/lib/ ONLY. READ-ONLY. Rigor (R12): flag ONLY findings where you cite the EXACT file:line + the actual code/number as evidence AND the fix is unambiguously SAFE (no behavior/quality change, only token reduction). DO NOT flag intentional design (a script that genuinely needs a full read, an already-present cap, a keyword-gated ~0-cost hook). Few REAL findings beat many speculative ones -- a clean result is the honest outcome (alpha has tuned this surface heavily). Mark safety honestly: "safe" only if the fix cannot change behavior.

DIMENSION: mechanical work left for Claude that a bridge could do for $0. Find places in scripts/hooks where a MECHANICAL text op (summarize/explain/classify/lint/diff-summary/error-triage of a large blob) is left inline for Claude when ask-ollama.mjs / ask-hermes.mjs / OllamaHookBridge already exist to route it locally (Ollama healthy, gpt-oss:120b/32b GPU-resident). Cite the site + op. Propose routing via the existing bridge. SKIP safety-critical content (NC/G-code, physics) -- those MUST stay on Claude.

### Assistant | 2026-06-22T02:13:29.248Z

I'll systematically audit the target directories for mechanical text operations that could be routed to Ollama instead of Claude. Let me read the relevant files to find real, citable evidence.

### Assistant | 2026-06-22T02:13:30.040Z

[tool_use: Bash]

### Assistant | 2026-06-22T02:13:30.604Z

[tool_use: Bash]

### User | 2026-06-22T02:13:36.657Z

[tool_result] H:/prism/scripts/lib/advisory-decay.mjs
H:/prism/scripts/lib/advisory-decay.test.mjs
H:/prism/scripts/lib/agent-overlay.mjs
H:/prism/scripts/lib/ai-synergy-audit-lib.mjs
H:/prism/scripts/lib/ai-synergy-audit-lib.test.mjs
H:/prism/scripts/lib/alpha-backlog-extract.mjs*
H:/prism/scripts/lib/atomic-json.mjs
H:/prism/scripts/lib/atomic-json.test.mjs
H:/prism/scripts/lib/autostart-bus.mjs
H:/prism/scri
... [+2596 chars truncated]

### User | 2026-06-22T02:13:36.745Z

[tool_result] H:/prism/.claude/hooks/_envelope.mjs*
H:/prism/.claude/hooks/_rpc-shim.mjs*
H:/prism/.claude/hooks/_rpc-shim.test.mjs
H:/prism/.claude/hooks/activate-before-build-precheck.mjs*
H:/prism/.claude/hooks/activate-before-build-precheck.test.mjs
H:/prism/.claude/hooks/active-chat-priority-boost.mjs*
H:/prism/.claude/hooks/active-chat-priority-decay.mjs*
H:/prism/.claude/hooks/agent-boundary-guard.mjs*
H
... [+2678 chars truncated]

### Assistant | 2026-06-22T02:13:40.944Z

Let me focus on finding hooks and scripts that pass large text blobs to Claude (via `systemMessage`/`additionalContext`) where the mechanical summarization/classification/triage work could instead be routed through `ask-ollama.mjs`.

### Assistant | 2026-06-22T02:13:41.968Z

[tool_use: Bash]

### Assistant | 2026-06-22T02:13:43.051Z

[tool_use: Bash]

### User | 2026-06-22T02:13:46.148Z

[tool_result] Exit code 2
H:/prism/scripts/ask-hermes.mjs*
H:/prism/scripts/ask-ollama.mjs*

### User | 2026-06-22T02:13:46.511Z

[tool_result] H:/prism/.claude/hooks/.deprecated/awareness-2026-05-13/ai-command-awareness.mjs
H:/prism/.claude/hooks/.deprecated/awareness-2026-05-13/awareness-snapshot.mjs
H:/prism/.claude/hooks/.deprecated/awareness-2026-05-13/cross-session-awareness.mjs
H:/prism/.claude/hooks/.deprecated/awareness-2026-05-13/prism-awareness-v2.mjs
H:/prism/.claude/hooks/.deprecated/awareness-2026-05-13/working-set-awareness
... [+1782 chars truncated]

### Assistant | 2026-06-22T02:13:49.572Z

Good — `ask-ollama.mjs` and `ask-hermes.mjs` exist at `H:/prism/scripts/`. Now let me find hooks that do inline large-blob injection (potential Ollama-routable work) versus hooks that already use the bridge.

### Assistant | 2026-06-22T02:13:50.662Z

[tool_use: Read]

### Assistant | 2026-06-22T02:13:51.469Z

[tool_use: Bash]

### User | 2026-06-22T02:13:51.756Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+2743 chars truncated]

### User | 2026-06-22T02:13:57.164Z

[tool_result] 496

### Assistant | 2026-06-22T02:14:01.330Z

496 hooks emit injection context. I need to find the ones doing mechanical large-blob summarization/classification inline. Let me target the highest-signal hooks — those that read large files and inject the raw content rather than a pre-digested summary.

### Assistant | 2026-06-22T02:14:02.719Z

[tool_use: Bash]

### Assistant | 2026-06-22T02:14:03.940Z

[tool_use: Bash]

### User | 2026-06-22T02:14:08.798Z

[tool_result] H:/prism/.claude/hooks/activate-before-build-precheck.mjs
H:/prism/.claude/hooks/active-chat-priority-boost.mjs
H:/prism/.claude/hooks/active-chat-priority-decay.mjs
H:/prism/.claude/hooks/agent-boundary-guard.mjs
H:/prism/.claude/hooks/agent-fanout-pressure-gate.mjs
H:/prism/.claude/hooks/agent-handoff-canonicalize.mjs
H:/prism/.claude/hooks/agent-pid-tracker.mjs
H:/prism/.claude/hooks/agent-regi
... [+1595 chars truncated]

### User | 2026-06-22T02:14:10.662Z

[tool_result] H:/prism/.claude/hooks/big-data-read-enforce.mjs
H:/prism/.claude/hooks/goal-prereq-inject.mjs
H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs
H:/prism/.claude/hooks/lib/ollama-stats.mjs
H:/prism/.claude/hooks/mcp-route-takeup.mjs
H:/prism/.claude/hooks/model-tier-advisor.mjs
H:/prism/.claude/hooks/ollama-context-aggregator.mjs
H:/prism/.claude/hooks/ollama-engine-api-extractor.mjs
H:/prism/.cla
... [+470 chars truncated]

### Assistant | 2026-06-22T02:14:15.360Z

Good — `ollama-hook-bridge.mjs` exists at `.claude/hooks/lib/`. Now let me find hooks that inject large raw file content but do NOT use the bridge. I'll look specifically at hooks that read substantial files and emit them raw into `additionalContext`.

### Assistant | 2026-06-22T02:14:16.635Z

[tool_use: Bash]

### Assistant | 2026-06-22T02:14:16.793Z

[tool_use: Read]

### User | 2026-06-22T02:14:31.245Z

[tool_result] H:/prism/.claude/hooks/activate-before-build-precheck.mjs
H:/prism/.claude/hooks/active-chat-priority-boost.mjs
H:/prism/.claude/hooks/active-chat-priority-decay.mjs
H:/prism/.claude/hooks/agent-fanout-pressure-gate.mjs
H:/prism/.claude/hooks/agent-handoff-canonicalize.mjs
H:/prism/.claude/hooks/agent-pid-tracker.mjs
H:/prism/.claude/hooks/agent-rules-inject.mjs
H:/prism/.claude/hooks/agent-vs-dir
... [+22161 chars truncated]

### User | 2026-06-22T02:14:32.696Z

[tool_result] 1	// tier: T4
2	/**
3	 * ollama-hook-bridge.mjs
4	 * Shared helper for hooks to call local Ollama with fast timeout and graceful fallback.
5	 *
6	 * Usage:
7	 *   import { queryOllama, isOllamaAvailable } from './lib/ollama-hook-bridge.mjs';
8	 *   const result = await queryOllama(prompt, { hookType: 'grep_index', timeoutMs: 300 });
9	 *   if (result.success) { use result.response } else { use reg
... [+1854 chars truncated]

### Assistant | 2026-06-22T02:14:35.472Z

Now let me read the specific high-signal hooks that are most likely to inject large raw blobs — the ones that read substantial state files and inject their full content.

### Assistant | 2026-06-22T02:14:35.945Z

[tool_use: Read]

### Assistant | 2026-06-22T02:14:36.307Z

[tool_use: Read]

### User | 2026-06-22T02:14:37.517Z

[tool_result] 1	// tier: T2
2	/**
3	 * model-tier-advisor.mjs -- UserPromptSubmit hook (U-MODEL-TIER-ADVISOR, slot:india 2026-06-11).
4	 *
5	 * THE OPERATOR GOAL (2026-06-11, "fable demolished session limits"): auto-enforced model switching --
6	 * fable for deep planning/reasoning, opus for building/coding, ollama for verified-100% mechanical,
7	 * sonnet/haiku for capable tasks. The main-loop model CANNOT be 
... [+6641 chars truncated]

### User | 2026-06-22T02:14:37.830Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * read-auto-limit.mjs - PreToolUse Read
5	 * Auto-suggests a `limit` parameter for large files to save tokens (70-90%).
6	 *
7	 * U-READ-AUTO-LIMIT-LEDGER (slot:alpha 2026-06-20): re-light the dark token-
8	 * efficiency ledger. The advisory message is purely a NUDGE; the WRITE path
9	 * that recorded each nudge fire had been removed, so
10	 * state/sha
... [+5841 chars truncated]

### Assistant | 2026-06-22T02:14:40.773Z

Good — those two are already well-structured (no raw blob injection). Now let me target the highest-value candidates: hooks that read large state files and inject raw content.

### Assistant | 2026-06-22T02:14:41.352Z

[tool_use: Read]

### Assistant | 2026-06-22T02:14:41.831Z

[tool_use: Read]

### User | 2026-06-22T02:14:42.805Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * loop-iteration-inject.mjs — UserPromptSubmit hook for /loop awareness.
5	 *
6	 * Fires when the user types `/loop` (with or without interval). Surfaces:
7	 *   - any paused/active loop state for this session (sessionId from stdin)
8	 *   - global list of running loops (so a chat doesn't accidentally start a 2nd)
9	 *   - reminder of Karpathy R10 (chec
... [+9560 chars truncated]

### User | 2026-06-22T02:14:43.225Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * auto-consensus-userprompt.mjs — UserPromptSubmit hook.
5	 *
6	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AUTO-FIRE.
7	 *
8	 * What this hook does
9	 * -------------------
10	 * 1. Reads the user's prompt from stdin.
11	 * 2. Detects "dev intent" keywords (build, plan, refactor, decide, review, etc).
12	 * 3. CACHE-FIRST: hashes the prompt, look
... [+10458 chars truncated]

### Assistant | 2026-06-22T02:14:46.475Z

Those two are clean. Now let me target the highest-signal candidates: hooks that read and inject large state/transcript content verbatim.

### Assistant | 2026-06-22T02:14:47.473Z

[tool_use: Read]

### Assistant | 2026-06-22T02:14:47.539Z

[tool_use: Read]

### User | 2026-06-22T02:14:49.540Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * mcp-bridge-enforce-pretool.mjs -- PreToolUse ENFORCEMENT gate for a dead prism
5	 * MCP bridge (MCP-CLIENT-ENFORCE-MS1, 2026-06-16, slot bravo).
6	 *
7	 * WHY (operator 2026-06-16): "chats still losing connection and enforcements in
8	 * place for chats to check to see if they're connected don't work -- find a way to
9	 * automate and enforce it." MS0
... [+14824 chars truncated]

### system

... [20 middle messages omitted -- see raw_file] ...

### User | 2026-06-22T02:16:54.814Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * awareness-snapshot-inject.mjs — SessionStart injector
5	 *
6	 * OBSIDIAN-PRISM-OS-MS0/U-AWARENESS-INJECT.
7	 *
8	 * Reads state/shared/AWARENESS-SNAPSHOT.md (generated by
9	 * scripts/awareness-snapshot.mjs — companion to /awareness-snapshot
10	 * skill) and emits a compact ~10-line digest as SessionStart
11	 * additionalContext so every fresh chat kn
... [+10517 chars truncated]

### User | 2026-06-22T02:16:55.669Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * build-state-inject.mjs — UserPromptSubmit + SessionStart hook.
5	 *
6	 * Permanent-memory anchor for "what's already built / what needs wiring /
7	 * what's still pending / what's awaiting frontend merge". Reads the
8	 * compact BUILD_STATE.json snapshot generated by
9	 * scripts/build-state-snapshot.mjs and injects a token-bounded summary
10	 * (≤500
... [+8260 chars truncated]

### Assistant | 2026-06-22T02:17:00.217Z

Both are clean. `awareness-snapshot-inject` runs `compact()` — a pure structural extraction (no LLM). `build-state-inject` reads structured JSON and formats a bounded 1.8KB summary from known fields. Neither involves a mechanical text-blob-to-summary op that would benefit from Ollama.

Let me check the remaining high-signal candidates in parallel.

### Assistant | 2026-06-22T02:17:00.864Z

[tool_use: Read]

### Assistant | 2026-06-22T02:17:01.116Z

[tool_use: Read]

### User | 2026-06-22T02:17:04.995Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * audit-awareness-inject.mjs — UserPromptSubmit hook
5	 *
6	 * SYSTEM-AUDIT-AWARENESS/U-AUDIT-INJECT (slot:papa 2026-05-26)
7	 *
8	 * Surfaces relevant audits to chats based on prompt-keyword → domain match.
9	 * Reads state/shared/AUDIT-REGISTRY.json (generated by scripts/build-audit-registry.mjs).
10	 *
11	 * Goal directive: "make all other chats auto
... [+6047 chars truncated]

### User | 2026-06-22T02:17:05.286Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2 — slot:india custom domain-awareness inject (U-PSGB-INDIA-AUDIT 2026-05-28).
3	//
4	// UserPromptSubmit hook. SLOT-GATED: a NO-OP for every slot except india
5	// (returns {continue:true} instantly for all others — zero blast radius).
6	// Surfaces LIVE ai-training domain state (NN-GRAPH deploy-gate verdict, checkpoint
7	// promotion state, retrain-lifecycle sta
... [+2598 chars truncated]

### User | 2026-06-22T02:17:06.855Z

[Your previous response had no visible output. Please continue and produce a user-visible response.]

### Assistant | 2026-06-22T02:17:15.847Z

Both are clean. `audit-awareness-inject` does regex keyword matching on structured registry data. `india-awareness-inject` calls `renderBlock()` from a pre-built renderer — no blob ingestion.

Let me now check the remaining candidates that could have inline classification: `foxtrot-mill-awareness-inject`, `precompact-dossier` area, and a few scripts/lib files that might do inline NL ops.

### Assistant | 2026-06-22T02:17:16.418Z

[tool_use: Read]

### Assistant | 2026-06-22T02:17:16.516Z

[tool_use: Glob]

### User | 2026-06-22T02:17:17.757Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// foxtrot-mill-awareness-inject.mjs — UserPromptSubmit
4	//
5	// FOXTROT-MILL-GALAXY-SYNERGY (operator ask 2026-05-28/29): "make a custom one
6	// tailored to your domain so you always have context on your domain" + "generate
7	// skills, scripts and hooks for your domain". The custom mill-domain awareness
8	// surface for slot:foxtrot — the per-PROMPT siblin
... [+9367 chars truncated]

### User | 2026-06-22T02:17:17.913Z

[tool_result] scripts\lib\namespace-churn-ranker.test.mjs
scripts\lib\html-report-render.test.mjs
scripts\lib\tribal-graph-clusters.mjs
scripts\lib\tribal-graph-clusters.test.mjs
scripts\lib\wired-engine-mapper.mjs
scripts\lib\course-mapper-lib.test.mjs
scripts\lib\course-mapper-lib.mjs
scripts\lib\edge-typology-normalizer.test.mjs
scripts\lib\node-kind-ontology.mjs
scripts\lib\engine-node-extractor.mjs
scripts
... [+3619 chars truncated]

### Assistant | 2026-06-22T02:17:21.388Z

`foxtrot-mill-awareness-inject` is clean — static hardcoded string block with a regex gate, no LLM op. Now let me look specifically at `scripts/lib/domain-classifier.mjs` (that name is a classic inline-classification candidate) and check a few more hooks:

### Assistant | 2026-06-22T02:17:21.947Z

[tool_use: Read]

### Assistant | 2026-06-22T02:17:22.503Z

[tool_use: Read]

### User | 2026-06-22T02:17:23.438Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/domain-classifier.mjs
3	//
4	// Single source of truth for slot↔domain mapping + unit→domain classification.
5	//
6	// Background: PRISM runs 13 NATO-named chat slots, each assigned a PRISM system
7	// domain (alpha=mill, bravo=lathe, charlie=wire-EDM, etc. per JULIETT-12CHAT-
8	// ALLOCATION-MS0). The slot-task queue allocator (scripts/allocate-domains-to-
9
... [+5624 chars truncated]

### User | 2026-06-22T02:17:23.630Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * precompact-dossier.mjs — U-CTX03 Rich PreCompact Dossier
5	 *
6	 * Creates comprehensive snapshot before compaction for restoration.
7	 * Captures in-flight work, uncommitted changes, reasoning state,
8	 * and exploration/exploitation balance.
9	 *
10	 * Target: 100K token survival budget with prioritized content.
11	 */
12	
13	import * as fs from "fs
... [+9088 chars truncated]

### Assistant | 2026-06-22T02:17:29.551Z

Both clean. `domain-classifier.mjs` is pure regex rules — entirely deterministic. `precompact-dossier` reads structured JSON state files and formats a numbered summary — no NL blob summarization.

I have now read all the major candidates. Let me do a final targeted grep to check if any hook or script in the remaining unread files does an inline `callOllama` / `queryOllama` / `ask-ollama` call with a large injected text blob that could instead be pre-digested — versus the known-good pattern of routing to Ollama already:

### Assistant | 2026-06-22T02:17:31.400Z

[tool_use: Grep]

### Assistant | 2026-06-22T02:17:32.674Z

[tool_use: Grep]

### User | 2026-06-22T02:17:34.281Z

[tool_result] .claude\hooks\ai-duplication-guard.mjs:242:      description: typeof content === 'string' ? content.slice(0, 4000) : '',
.claude\hooks\all-means-all-inject.mjs:83:  const text = prompt.slice(0, 8192); // ReDoS / oversize guard.
.claude\hooks\auto-consensus-userprompt.mjs:158:      prompt: prompt.length > 8192 ? prompt.slice(0, 8192) + "...[truncated]" : prompt,
.claude\hooks\auto-consensus-critica
... [+2070 chars truncated]

### User | 2026-06-22T02:17:36.032Z

[tool_result] Found 40 files limit: 40
.claude\hooks\pre-write-graph-inject.mjs
.claude\hooks\pre-grep-graph-inject.mjs
.claude\hooks\pre-read-graph-inject.mjs
.claude\hooks\pre-bash-graph-inject.mjs
.claude\hooks\slot-soul-inject.mjs
.claude\hooks\slot-domain-awareness-inject.mjs
.claude\hooks\psn-prompt-checklist-inject.mjs
.claude\hooks\psn-leg-state-inject.mjs
.claude\hooks\galaxy-claudemd-inject.mjs
.claud
... [+1278 chars truncated]

### User | 2026-06-22T02:17:37.913Z

[Your previous response had no visible output. Please continue and produce a user-visible response.]

### Assistant | 2026-06-22T02:17:41.308Z

Two hooks from the grep results are worth examining closely: `commit-draft-suggest.mjs` (injects a raw staged diff slice into `additionalContext`) and `session-learning-feedback.mjs` (reads 50KB of transcript). Let me read both:

### Assistant | 2026-06-22T02:17:41.822Z

[tool_use: Read]

### Assistant | 2026-06-22T02:17:41.841Z

[tool_use: Read]

### User | 2026-06-22T02:17:43.295Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * session-learning-feedback.mjs — Stop Hook
5	 * ==========================================
6	 *
7	 * Captures session outcomes for the AI augmentation learning loop.
8	 * Feeds successful patterns and failed approaches to the learning engines.
9	 *
10	 * What it captures:
11	 * - Task success/failure signals from transcript
12	 * - Approaches used (MCP
... [+7608 chars truncated]

### User | 2026-06-22T02:17:43.435Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * commit-draft-suggest.mjs — OLLAMA-DEV-03
5	 *
6	 * PreToolUse hook on Bash that detects short/generic commit messages
7	 * (`git commit -m "wip"`, `-m "update"`, etc.) and asks the local
8	 * Ollama (via LocalCommitMessageEngine) for a richer draft. The
9	 * suggestion is injected as advisory context — never blocking — so
10	 * Claude can incorporate 
... [+7452 chars truncated]

### Assistant | 2026-06-22T02:17:49.519Z

Both clean. `commit-draft-suggest` already routes to Ollama locally (direct `/api/generate` call to qwen2.5-coder:32b). `session-learning-feedback` reads the transcript but runs pure regex pattern matching (`extractSessionSignals`) — no LLM call on the blob, outputs a structured JSONL record.

I have now exhaustively read all major hook candidates. The surface is heavily tuned. Let me do one final check on the one hook that injects raw content for Claude to read — `tier1-context-pack.mjs` (showed `.slice(0, 2000)` raw content reads multiple times, and emits `additionalContext`):

### Assistant | 2026-06-22T02:17:50.306Z

[tool_use: Read]

### User | 2026-06-22T02:17:53.524Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * tier1-context-pack.mjs — U-CTX01 Tier-1 Always-On Context Pack
5	 *
6	 * Injects ~80K tokens of high-value context at SessionStart.
7	 * Carefully curated for maximum utility per token.
8	 *
9	 * Budget breakdown:
10	 * - MASTER_INDEX_COMPACT.md (~30k)
11	 * - BASELINE_INVENTORY summary (~2k)
12	 * - Capability manifests (~15k combined)
13	 * - SVI br
... [+7863 chars truncated]

### Assistant | 2026-06-22T02:18:03.025Z

`tier1-context-pack` outputs only a `systemMessage` summary line (line 261: `summary = "[Tier1] N sources loaded..."`) — the assembled content is saved to disk but NOT injected into Claude's context. Clean.

I have now done a thorough read of all high-signal candidates. The audit result is honest: this surface has been heavily tuned. The hooks that do mechanical text ops (transcript analysis, tribal rerank, commit message gen, memory extraction) all already route to Ollama. The injectors that emit `additionalContext` to Claude all use pre-structured data (JSON fields, regex extraction, static blocks) — not raw text blobs that Claude must summarize.

The one genuine finding is in `scripts/lib/feature-gap-classifier.mjs` — let me verify this candidate before concluding:

### Assistant | 2026-06-22T02:18:03.982Z

[tool_use: Read]

### User | 2026-06-22T02:18:06.206Z

[tool_result] 1	/**
2	 * feature-gap-classifier.mjs — pure classifier for FEATURE-GAP-AUDIT-MS0 units
3	 * ============================================================================
4	 *
5	 * Unit: FEATURE-GAP-AUDIT-MS0::U-FEATURE-GAP-DEDUP-WIN-RECONCILER (slot india, 2026-05-19).
6	 *
7	 * The FEATURE-GAP-AUDIT-2026-05-17 audit (juliett /forge-audit-v2) produced 68
8	 * units across 13 domains. R8 inspection
... [+21327 chars truncated]

### User | 2026-06-22T02:19:37.355Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   A read-only token-efficiency audit subagent task scoped strictly to H:/prism/scripts/, H:/prism/.claude/hooks/, and H:/prism/scripts/lib/ ONLY. The mandate: find places where a MECHANICAL text operation (summarize/explain/classify/lint/diff-summary/error-triage of a large blob) is left inline for Claude when ask-ollama.mjs / ask-hermes.mjs / OllamaHookBridge already exist to route it locally at $0 cost (Ollama/gpt-oss:120b/32b GPU-resident). Rigor per R12: flag ONLY with EXACT file:line + actual code/number as evidence AND fix is unambiguously SAFE (no behavior change, only token reduction). DO NOT flag intentional design (an already-present cap, a keyword-gated ~0-cost hook). Safety-critical content (NC/G-code, physics) must be skipped. Must call StructuredOutput exactly once.

2. Key Technical Concepts:
   - ask-ollama.mjs (H:/prism/scripts/ask-ollama.mjs): subprocess bridge for summarize/explain/triage/viz/rerank/ask ops. Processes heavy input in a subprocess so nothing enters Claude context.
   - ask-hermes.mjs (H:/prism/scripts/ask-hermes.mjs): secondary bridge (verified exists).
   - H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs: in-hook bridge, exports queryOllama(prompt, {hookType, timeoutMs}) and isOllamaAvailable(). Default model qwen2.5-coder:32b, default timeout 500ms. Hook types mapped to models: grep_index, mcp_route, ai_feature, code_explain, pattern_match, validation, general.
   - PRISM hook injection pattern: hooks emit { hookSpecificOutput: { hookEventName: "...", additionalContext: "..." } } to inject context into Claude's context window.
   - 496 hooks emit additionalContext or systemMessage (confirmed by pre-compaction grep).
   - 17 hooks already use ask-ollama or OllamaHookBridge (confirmed pre-compaction, not re-audited).
   - The "mechanical-op
... [+8101 chars truncated]

### Assistant | 2026-06-22T02:19:53.216Z

`feature-gap-classifier.mjs` is purely deterministic (regex parsing + injected-fs bag). No LLM op, no blob injection. Clean.

The audit is complete. Every candidate has been verified. The result is honest: no confirmed violations of the "mechanical-text-op-left-for-Claude" anti-pattern were found in the scoped surface.

### Assistant | 2026-06-22T02:19:53.231Z

[tool_use: StructuredOutput]

### User | 2026-06-22T02:19:53.749Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-22T02:20:05.942Z

The audit surface (H:/prism/scripts/, H:/prism/.claude/hooks/, H:/prism/scripts/lib/) has no confirmed instances of mechanical text operations left for Claude where an Ollama bridge exists to handle them locally.

Files examined and confirmed clean:
- `stop-obsidian-memory-extract.mjs` — already routes extraction to Ollama (qwen2.5-coder:32b, 300-token cap)
- `tribal-by-domain-inject.mjs` — Ollama-backed embedding subprocess, compact injections
- `awareness-snapshot-inject.mjs` — pure structural extraction via regex, no LLM
- `build-state-inject.mjs` — structured JSON fields, 1800-char cap, no NL blob
- `audit-awareness-inject.mjs` — structured registry, per-audit status rows
- `india-awareness-inject.mjs` — pre-built renderer, no blob ingestion
- `foxtrot-mill-awareness-inject.mjs` — static hardcoded string, no file reads for content
- `precompact-dossier.mjs` — structured JSON state files, known schema fields
- `session-learning-feedback.mjs` — pure regex extraction on transcript, no LLM
- `commit-draft-suggest.mjs` — already routes to Ollama (qwen2.5-coder:32b, 3000-char diff cap, 6s timeout)
- `tier1-context-pack.mjs` — assembles 80K tokens but outputs only a one-line metadata summary to Claude
- `feature-gap-classifier.mjs` — pure deterministic regex classification, no LLM
- `domain-classifier.mjs` — pure regex DOMAIN_RULES array, no LLM

This surface has been heavily optimized. The 17 hooks already using Ollama bridges cover the main mechanical-op patterns. The remaining hooks that read large content either cap and structure their output deterministically, or route to Ollama already. No new findings to report.
