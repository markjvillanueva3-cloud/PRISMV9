---
type: "chat-session"
source: "claude-code-cli"
session_id: "da9aacf5-7d0a-4de6-899e-d8a50c78583a"
title: "PRISM repo root H:/prism. QUESTION (anti-duplication, R8 + duplicationGuard spir"
date: "2026-06-01"
first_ts: "2026-06-01T00:25:44.408Z"
last_ts: "2026-06-01T00:31:50.744Z"
cwd: "H:\\prism-slot-alpha"
messages: 66
user_msgs: 29
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/workflows/wf_1c718934-afa/agent-ae762e4e684d4c4c8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:36"
---

# PRISM repo root H:/prism. QUESTION (anti-duplication, R8 + duplicationGuard spir

> **claude-code-cli** | 2026-06-01 | 66 msgs (29 user / 37 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/workflows/wf_1c718934-afa/agent-ae762e4e684d4c4c8.jsonl`

## Transcript

### User | 2026-06-01T00:25:44.408Z

PRISM repo root H:/prism. QUESTION (anti-duplication, R8 + duplicationGuard spirit): does a SALIENCE / recency-decay / ranking scorer ALREADY exist that U-GCF-SALIENCE should EXTEND instead of re-create?
Check: H:/prism/scripts/lib/ for files mentioning salience|recency|decay|rank|score (galaxy-context-card.mjs has scoreLine — that's the one being enhanced, not a dup; look for OTHERS). Also master-index-search-lib.mjs (BM25 weights), lexical-rerank.mjs, edge-order.mjs, any *salience*/*relevance*/*priority* lib. Also check mcp-server/src/engines for a SalienceEngine / RelevanceEngine / PriorityEngine.
For each candidate: absolute path, what it scores, and whether it's reusable as the salience core or genuinely distinct. verdict EXISTS (name what to extend) or ABSENT (build-new justified). recommendation = build-new vs extend-<name>, with one-line why.

### Assistant | 2026-06-01T00:26:01.699Z

I'll help you find if a salience/recency-decay/ranking scorer already exists in the PRISM repo. Let me search systematically through the codebase.

### Assistant | 2026-06-01T00:26:01.958Z

[tool_use: Glob]

### Assistant | 2026-06-01T00:26:02.120Z

[tool_use: Glob]

### Assistant | 2026-06-01T00:26:02.174Z

[tool_use: Glob]

### Assistant | 2026-06-01T00:26:02.335Z

[tool_use: Glob]

### Assistant | 2026-06-01T00:26:02.540Z

[tool_use: Glob]

### Assistant | 2026-06-01T00:26:02.761Z

[tool_use: Glob]

### Assistant | 2026-06-01T00:26:02.961Z

[tool_use: Glob]

### Assistant | 2026-06-01T00:26:03.041Z

[tool_use: Glob]

### User | 2026-06-01T00:26:34.117Z

[tool_result] No files found

### User | 2026-06-01T00:26:34.707Z

[tool_result] No files found

### User | 2026-06-01T00:26:34.788Z

[tool_result] No files found

### User | 2026-06-01T00:26:38.497Z

[tool_result] H:/prism/scripts/lib\namespace-churn-ranker.mjs
H:/prism/scripts/lib\namespace-churn-ranker.test.mjs
H:/prism/scripts/lib\lexical-rerank.mjs
H:/prism/scripts/lib\lexical-rerank.test.mjs
H:/prism/scripts/lib\rag-llm-rerank.test.mjs
H:/prism/scripts/lib\rag-llm-rerank.mjs
H:/prism/scripts/lib\training-difficulty-ranker.mjs
H:/prism/scripts/lib\training-difficulty-ranker.test.mjs

### User | 2026-06-01T00:26:42.871Z

[tool_result] H:/prism/scripts/lib\reaper-self-io-priority.mjs
H:/prism/scripts/lib\zulu-bd-priority.mjs
H:/prism/scripts/lib\zulu-bd-priority.test.mjs

### User | 2026-06-01T00:26:44.796Z

[tool_result] No files found

### User | 2026-06-01T00:26:45.210Z

[tool_result] No files found

### User | 2026-06-01T00:26:46.341Z

[tool_result] H:/prism/mcp-server/src/engines\ContextPriorityEngine.ts

### Assistant | 2026-06-01T00:26:48.156Z

Good! I found ranking/priority-related files. Let me also search for `decay`, `score`, and check the mentioned files like `galaxy-context-card.mjs`, `master-index-search-lib.mjs`, and `edge-order.mjs`.

### Assistant | 2026-06-01T00:26:48.570Z

[tool_use: Grep]

### Assistant | 2026-06-01T00:26:48.818Z

[tool_use: Glob]

### Assistant | 2026-06-01T00:26:48.996Z

[tool_use: Glob]

### Assistant | 2026-06-01T00:26:49.204Z

[tool_use: Glob]

### Assistant | 2026-06-01T00:26:49.544Z

[tool_use: Bash]

### User | 2026-06-01T00:27:12.385Z

[tool_result] Found 8 files
H:\prism\scripts\lib\octopus-weekly-synthesis-loader.mjs
H:\prism\scripts\lib\graphsage-train-pipeline.mjs
H:\prism\scripts\lib\graphsage-trainer.mjs
H:\prism\scripts\lib\alpha-backlog-extract.mjs
H:\prism\scripts\lib\chat-orchestrator-decisions.test.mjs
H:\prism\scripts\lib\chat-orchestrator-decisions.mjs
H:\prism\scripts\lib\node2vec-embedder.test.mjs
H:\prism\scripts\lib\node2vec-
... [+12 chars truncated]

### User | 2026-06-01T00:27:12.429Z

[tool_result] H:/prism/scripts/lib\galaxy-context-card.mjs

### User | 2026-06-01T00:27:12.581Z

[tool_result] H:/prism/scripts/lib\master-index-search-lib.mjs

### User | 2026-06-01T00:27:12.670Z

[tool_result] H:/prism/scripts/lib\edge-order.mjs

### User | 2026-06-01T00:27:40.655Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-01T00:27:42.581Z

Excellent! The pre-grep graph shows `active-chat-priority-decay` is already built. Let me now read the key candidate files to understand what scoring/ranking infrastructure exists.

### Assistant | 2026-06-01T00:27:42.882Z

[tool_use: Read]

### Assistant | 2026-06-01T00:27:43.062Z

[tool_use: Read]

### Assistant | 2026-06-01T00:27:43.190Z

[tool_use: Read]

### Assistant | 2026-06-01T00:27:43.370Z

[tool_use: Read]

### User | 2026-06-01T00:27:53.530Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/galaxy-context-card.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-CARD (alpha, 2026-05-31).
3	//
4	// Per-galaxy CONTEXT-CARD generator — the cheap inject unit of the federation.
5	// A galaxy's brain lives in mcp-server/src/engines/<g>/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md (often many KB).
6	// Injecting / re-reading a whole MEMORY.md per prompt is the token waste
... [+13640 chars truncated]

### User | 2026-06-01T00:27:53.672Z

[tool_result] 1	/**
2	 * master-index-search-lib.mjs
3	 *
4	 * Shared keyword search over PRISM's two large knowledge corpora:
5	 *
6	 *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
7	 *      with pre-joined wiki + memory entry names. BM25-lite weighted scoring.
8	 *
9	 *   2. tribal-embed-index.json — every tribal-knowledge tip (title + text +
10	 *      domain). Keyword-only path (s
... [+27618 chars truncated]

### User | 2026-06-01T00:27:54.234Z

[tool_result] 1	/**
2	 * edge-order.mjs — RAG-UPGRADE-MS0 / U-RAG-4 (2026-05-22, slot golf).
3	 *
4	 * "Lost in the middle": LLMs attend most strongly to the START and END of
5	 * their context window and skim the middle (Liu et al. 2023; echoed in the
6	 * 2026 RAG research and concept #7 of the source thread). When a retrieval
7	 * inject hook emits a score-ranked top-K block, dumping it in plain
8	 * best→wo
... [+2163 chars truncated]

### User | 2026-06-01T00:27:54.511Z

[tool_result] 1	/**
2	 * ContextPriorityEngine — Intelligent context injection prioritization.
3	 *
4	 * Classifies a task prompt by domain (machining/cad/ai/infrastructure/physics/general),
5	 * task type (build/debug/analyze/optimize/wire/other), urgency, and complexity.
6	 * Scores candidate context items relative to the classification, applies a per-turn
7	 * decay so recently-injected items are deprioritis
... [+10550 chars truncated]

### Assistant | 2026-06-01T00:27:56.236Z

Let me now check the ranker and priority files to complete the picture, and look for any decay-related code.

### Assistant | 2026-06-01T00:27:56.469Z

[tool_use: Read]

### Assistant | 2026-06-01T00:27:56.890Z

[tool_use: Read]

### Assistant | 2026-06-01T00:27:57.222Z

[tool_use: Grep]

### User | 2026-06-01T00:28:06.017Z

[tool_result] 1	/**
2	 * lexical-rerank.mjs — RAG-UPGRADE-MS0 / U-RAG-2 (2026-05-22, slot golf).
3	 *
4	 * Stage-2 reranker for PRISM's retrieval inject hooks. The 2026 RAG research
5	 * prescribes two-stage retrieval — a fast recall-oriented first stage
6	 * (BM25-lite, here) then a more careful reranker that lifts answer quality
7	 * 15-30%.
8	 *
9	 * A neural cross-encoder is the textbook stage 2 — but PRISM
... [+5597 chars truncated]

### User | 2026-06-01T00:28:06.721Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * namespace-churn-ranker.mjs — SYSTEM-VIZ-FS-COVERAGE-MS1/U-MS1-CHURN-RANKER
4	 *
5	 * Pure helper for ranking system-viz namespaces by churn rate — how much
6	 * filesystem activity has happened since each namespace was last walked. The
7	 * cron re-walker reads the ranked list and picks top-N to refresh; namespaces
8	 * that haven't changed since their last walk ar
... [+12127 chars truncated]

### User | 2026-06-01T00:28:28.424Z

[tool_result] Found 9 files
H:\prism\knowledge\wiki\architecture\hooks\runtime\active-chat-priority-decay.md
H:\prism\knowledge\wiki\architecture\layer-l6.md
H:\prism\.claude\hooks\HOOK_DIGEST.md
H:\prism\.cache-hook-audit-disk.txt
H:\prism\.cache-hook-audit-user.txt
H:\prism\knowledge\wiki\architecture\fleet-reaper-ms3.md
H:\prism\knowledge\wiki\code-tribal\learnings\dev-tools-u-dva01.md
H:\prism\.claude\hooks
... [+94 chars truncated]

### Assistant | 2026-06-01T00:28:30.093Z

Perfect! Let me read the actual hook implementation to see what decay mechanism exists.

### Assistant | 2026-06-01T00:28:30.540Z

[tool_use: Read]

### Assistant | 2026-06-01T00:28:30.544Z

[tool_use: Read]

### User | 2026-06-01T00:28:43.850Z

[tool_result] 1	---
2	title: Hook — active-chat-priority-decay
3	type: hook
4	hook_name: active-chat-priority-decay
5	hook_source: runtime
6	source_path: H:/prism/.claude/hooks/active-chat-priority-decay.mjs
7	events: [Stop]
8	generated_by: scripts/generate-hook-wiki.mjs
9	last_verified: 2026-05-22
10	tags: [hook, source-runtime, event-stop]
11	related:
12	  - knowledge/wiki/architecture/layer-l6.md
13	---
14	

... [+927 chars truncated]

### User | 2026-06-01T00:28:43.863Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3 (observer — never blocks Stop; scans expired stamps + reverts priority)
3	/**
4	 * active-chat-priority-decay.mjs — Stop hook for FLEET-REAPER-MS3/U-FR-MS3-A.
5	 *
6	 * Scans `state/shared/.active-chat-boost/*.json` for stamps past their
7	 * `expiresAt` and reverts those PIDs to Normal priority. Idempotent —
8	 * missing PIDs are a no-op, and the stamp is remov
... [+4984 chars truncated]

### Assistant | 2026-06-01T00:28:45.514Z

Perfect! Now let me check if there are any other scoring/salience engines and look at what U-GCF-SALIENCE should integrate with.

### Assistant | 2026-06-01T00:28:45.981Z

[tool_use: Bash]

### Assistant | 2026-06-01T00:28:47.061Z

[tool_use: Grep]

### Assistant | 2026-06-01T00:28:47.161Z

[tool_use: Read]

### User | 2026-06-01T00:30:44.110Z

[tool_result] ./.cache/npm/_npx/09002f125df728b2/node_modules/onnx-proto/node_modules/protobufjs/cli/node_modules/jsdoc/plugins/test/fixtures/underscore.js
./.cache/npm/_npx/09002f125df728b2/node_modules/onnx-proto/node_modules/protobufjs/cli/node_modules/jsdoc/plugins/test/specs/underscore.js
./.cache/npm/_npx/09002f125df728b2/node_modules/onnx-proto/node_modules/protobufjs/cli/node_modules/jsdoc/plugins/under
... [+1956 chars truncated]

### User | 2026-06-01T00:30:59.858Z

[tool_result] No files found

### User | 2026-06-01T00:31:00.637Z

[tool_result] 1	// ZULU-ORCHESTRATOR-MS0 / U-ZULU05 — backend-dev high-ROI priority payload
2	// for the SendKeys post-compact /checkin-<slot> directive.
3	//
4	// Standing doctrine [[feedback_prioritize_devtools_backend]] +
5	// [[feedback_high_roi_backend_first_slot_queue]]: dev-tooling + backend-infra
6	// units are P0 ahead of app/revenue/CAD-CAM/docs. On a post-compact pickup,
7	// zulu appends a priority-
... [+6636 chars truncated]

### Assistant | 2026-06-01T00:31:03.114Z

Now let me look at the hooks that deal with relevance and memory injection to understand the full context:

### Assistant | 2026-06-01T00:31:03.518Z

[tool_use: Read]

### Assistant | 2026-06-01T00:31:03.813Z

[tool_use: Read]

### User | 2026-06-01T00:31:18.039Z

[tool_result] 1	// tier: T3
2	/**
3	 * rag-relevance-guard.mjs — PostToolUse hook
4	 * CADCAM-DAGI-MS0/U-DAGI06
5	 *
6	 * Monitors RAG retrieval quality and warns on issues:
7	 * - Empty retrieval results (no similar parts found)
8	 * - Low similarity scores (potential poor matches)
9	 * - Customer mismatch warnings (cross-customer retrieval)
10	 * - High retrieval latency (> 500ms)
11	 */
12	
13	const MIN_SIMI
... [+2985 chars truncated]

### User | 2026-06-01T00:31:18.040Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * memory-relevance-inject.mjs — PreToolUse hook for Edit/Write/MultiEdit.
5	 *
6	 * Before the user edits a file, scan their auto-memory directory for
7	 * any feedback memo that mentions the file path, basename, or symbol
8	 * derived from it. Inject the top-3 matches as PreToolUse context.
9	 *
10	 * Goal: "no repeated mistakes." If past feedback says
... [+13194 chars truncated]

### Assistant | 2026-06-01T00:31:19.724Z

Perfect! Now I have a complete picture. Let me compile my findings and provide the structured output.

### Assistant | 2026-06-01T00:31:42.684Z

[tool_use: StructuredOutput]

### User | 2026-06-01T00:31:43.728Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-01T00:31:50.744Z

## Summary

I found **4 reusable salience/scoring/decay mechanisms** already in the codebase:

1. **galaxy-context-card.mjs** (`scoreLine`, `headerWeight`) — **PRIMARY CANDIDATE TO EXTEND**
   - Pure heuristic-based fact scorer keyed on section header domain + per-line signals (active-status +3, dates +2, paths +1, etc.)
   - Already designed for MEMORY.md extraction and salience ranking
   - Load-bearing: the exact function U-GCF-CARD uses to rank facts before selecting top-N

2. **ContextPriorityEngine.ts** (decay formula + history)
   - Recency-decay pattern: `decay = Math.min(1, age / 5)` (linear recovery over 5 turns)
   - Stored in `injectionHistory: Map<id, turn>`
   - Multiplicative composition: `score = base * domainBoost * decayFactor`
   - Pattern is reusable; domain differs (context injection vs. fact ranking)

3. **namespace-churn-ranker.mjs** (age-ratio + staleness boost)
   - Base score: `deltaMs / lastWalkAgeMs` (activity per age)
   - Staleness boost (+1.0) if age > 24h threshold
   - Designed for filesystem prioritization; pattern applies to fact freshness

4. **lexical-rerank.mjs** (two-stage, but NO decay)
   - Stage-2 reranker with weighted features (coverage/phrase/labelHit/density)
   - Complementary but not a replacement — no temporal signal

**Verdict:** `scoreLine` from `galaxy-context-card.mjs` is the RIGHT place to extend. It's already the salience scorer for that module. U-GCF-SALIENCE should inherit its heuristics, layer on ContextPriorityEngine's decay mechanics, and optionally add namespace-churn-ranker's activity-based boost for facts that change frequently.
