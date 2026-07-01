---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Audit Ollama use in the PRISM WIKI pipeline (knowledge/wiki, WIKI_SCHEMA.md clai"
date: "2026-06-09"
first_ts: "2026-06-09T15:42:37.001Z"
last_ts: "2026-06-09T15:55:34.476Z"
cwd: "H:\\prism"
messages: 56
user_msgs: 22
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_7f974777-bf2/agent-a799114387c80e5ae.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Audit Ollama use in the PRISM WIKI pipeline (knowledge/wiki, WIKI_SCHEMA.md clai

> **claude-code-cli** | 2026-06-09 | 56 msgs (22 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_7f974777-bf2/agent-a799114387c80e5ae.jsonl`

## Transcript

### User | 2026-06-09T15:42:37.001Z

Audit Ollama use in the PRISM WIKI pipeline (knowledge/wiki, WIKI_SCHEMA.md claims >=70% Ollama-maintained). Inspect: WIKI_SCHEMA.md, WikiIndexMaintainerEngine, scripts for wiki ingest/lint/embed/summarize/cross-ref (scripts/*wiki*.mjs), the /wiki-* skills, .claude/hooks/wiki-precheck-inject.mjs + wiki-read-offload-advisory.mjs. Question: which wiki ops are ACTUALLY Ollama-executed vs aspirational/Claude/manual? Verify the >=70% claim against code. Gaps where a local model should do creation (entry summarize, lint, cross-ref suggest, embed) with file:line + which model. LIVE Ollama models loaded NOW on the 96GB RTX PRO 6000 Blackwell (verified this session): qwen2.5-coder:1.5b, qwen2.5-coder:7b, qwen2.5-coder:32b, gpt-oss:20b, gpt-oss:120b, qwen3-vl:8b(-instruct), qwen2.5vl:7b, moondream:1.8b, llama3.2-vision:11b, nomic-embed-text. So a heavy local tier (32b coder / 120b general / vision / embeddings) is AVAILABLE — recommend the SMALLEST model that does each job well.

ALREADY-VERIFIED-NON-VIABLE (alpha, 2026-06-09, reference_obsidian_tokensavings_premise_falsified):
(a) WIDENING the local-llm-task-router WORK_CLASS_PATTERNS to push offload toward 30% is a FALSE PREMISE — live dashboard: fired=53, offload=3, keep=44, where the 44 keeps are CORRECT (orchestration 34, operator_directive 5, safety 1, deep_reasoning 1 — all judgment tasks that MUST stay on Claude per R5). The low ~5-6% offload rate is an orchestration-heavy SESSION SHAPE, not a misrouting bug. Do NOT propose widening the classifier to offload orchestration/directives/reasoning — that is a REGRESSION.
(b) session-end-goal-synthesis LLM pass is DORMANT (unwired in both settings.json) and reads month-stale data — do NOT propose wiring an LLM pass onto dead data.
The real lever is NOT a classifier code-fix; it is (1) BEHAVIORAL adoption of existing offload suggestions, and (2) routing the HEAVY CREATION/SYNTHESIS work that ALREADY goes to Ollama onto the bigger local model (32b/120b) instead of the small 7
... [+723 chars truncated]

### Assistant | 2026-06-09T15:42:50.682Z

I'll audit the Ollama usage across the PRISM WIKI pipeline. Let me start by reading the canonical claim source and inventorying the relevant files.

### Assistant | 2026-06-09T15:42:50.820Z

[tool_use: Read]

### Assistant | 2026-06-09T15:42:51.152Z

[tool_use: Glob]

### Assistant | 2026-06-09T15:42:51.502Z

[tool_use: Glob]

### Assistant | 2026-06-09T15:42:51.890Z

[tool_use: Glob]

### User | 2026-06-09T15:43:24.006Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-09T15:43:24.239Z

[tool_result] 1	# PRISM Wiki Schema — Karpathy LLM-Wiki Pattern Adapted to PRISM
2	
3	> **Source:** Andrej Karpathy's LLM-Wiki document (popularized by [@defileo](https://x.com/defileo/status/2042241063612502162)).
4	> **Adopted:** 2026-04-27 in milestone `KNOWLEDGE-WIKI-MS0` / `U-WIKI01`.
5	> **Vault location:** `H:/prism/knowledge/` (existing — extends OBSIDIAN-MS0 wiring).
6	
7	This document codifies the wik
... [+12706 chars truncated]

### User | 2026-06-09T15:43:24.248Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-09T15:43:27.548Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-09T15:43:39.153Z

The glob patterns timed out from repo root. Let me narrow to specific paths.

### Assistant | 2026-06-09T15:43:40.147Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:43:41.412Z

[tool_use: Bash]

### User | 2026-06-09T15:44:52.722Z

[tool_result] .claude/commands/wiki-bootstrap.md
.claude/commands/wiki-harvest.md
.claude/commands/wiki-ingest.md
.claude/commands/wiki-lint.md
.claude/commands/wiki-morning.md
.claude/commands/wiki-page.md
.claude/commands/wiki-query.md
.claude/commands/wiki-sync.md
---HOOKS---
.claude/hooks/wiki-link-suggest.mjs*
.claude/hooks/wiki-precheck-inject.mjs*
.claude/hooks/wiki-precheck-inject.test.mjs*
.claude/hook
... [+3222 chars truncated]

### User | 2026-06-09T15:44:53.811Z

[tool_result] scripts/lib/jm-die-tribal-wiki-classifier.mjs
scripts/lib/jm-die-tribal-wiki-classifier.test.mjs
scripts/lib/wiki-domain-classifier.mjs
scripts/lib/wiki-domain-classifier.test.mjs
scripts/lib/wiki-promo-rerank.mjs*
scripts/lib/wiki-promo-rerank.test.mjs
scripts/lib/wikilink-parser.mjs
scripts/lib/wikilink-parser.test.mjs
---ENGINES---
mcp-server/src/engines/WikiIndexMaintainerEngine.ts
mcp-server/
... [+223 chars truncated]

### Assistant | 2026-06-09T15:44:59.037Z

Now let me search for actual Ollama invocation across these wiki files. Let me grep for the key signals: ollama calls, model names, and how the ingest router works.

### Assistant | 2026-06-09T15:45:01.451Z

[tool_use: Grep]

### Assistant | 2026-06-09T15:45:02.789Z

[tool_use: Grep]

### User | 2026-06-09T15:45:29.346Z

[tool_result] scripts\audit-wiki-coverage.mjs:123:  "tier3_specialist", "tier3_bridge", "ollama", "wiki_kind", "memory_kind", "memory__index",
scripts\build-wiki-embeddings.mjs:13: *     int8-quantized 768-d nomic-embed-text vectors → ~3.5 MB for ~4.5K entries.
scripts\build-wiki-embeddings.mjs:18: * Ollama model (tight timeout — if Ollama is down the fallback just no-ops).
scripts\build-wiki-embeddings.mjs:20:
... [+15236 chars truncated]

### User | 2026-06-09T15:45:29.582Z

[tool_result] .claude\hooks\wiki-propagation-watchdog-stop.mjs:62: *  — regen-wiki-from-viz is ~8 min and build-wiki-embeddings hits Ollama; never
.claude\hooks\wiki-precheck-inject.test.mjs:42:// 768-d nomic-embed-text query vector, so cosineAgainstCorpus yields zero hits
.claude\hooks\wiki-precheck-inject.test.mjs:43:// regardless of whether Ollama is reachable → the semantic path is a clean miss.
.claude\hoo
... [+5296 chars truncated]

### Assistant | 2026-06-09T15:45:38.034Z

Strong signal so far. Let me read the key creation/synthesis surfaces in detail. The CREATION surfaces (ingest, lint, cross-ref, summarize) are the high-value offload targets per the schema's 70% claim. Let me read the ingest router engine, the generate-wiki-entries / cross-refs scripts, the wiki-link-suggest hook, and the embed/summarize scripts.

### Assistant | 2026-06-09T15:45:39.101Z

[tool_use: Read]

### Assistant | 2026-06-09T15:45:39.183Z

[tool_use: Read]

### User | 2026-06-09T15:45:44.164Z

[tool_result] 1	// WIRE-EXEMPT: prism_wiki dispatcher ships in U-WIKI06; engine is consumed
2	// by the /wiki-ingest command (U-WIKI06) and the U-WIKI04B harvest cron until then.
3	/**
4	 * WikiIngestRouterEngine — KNOWLEDGE-WIKI-MS0 / U-WIKI04
5	 *
6	 * Routes raw-source ingest through the 5-stage Ollama-then-Claude pipeline
7	 * defined in WIKI_SCHEMA.md §3.1:
8	 *
9	 *   1  Read raw source                   
... [+17583 chars truncated]

### User | 2026-06-09T15:45:44.197Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * wiki-link-suggest.mjs — PostToolUse hook for memory/wiki writes
5	 *
6	 * Closes the "no connection layer" gap surfaced by the cyrilXBT audit
7	 * and quantitatively measured in U-VIZ-VAULT (781 broken [[refs]] / 124
8	 * resolved = 84% of all wiki-links don't connect to a real entry).
9	 *
10	 * Flow:
11	 *   1. Detect Write/Edit on a memory or wiki 
... [+11816 chars truncated]

### Assistant | 2026-06-09T15:45:53.287Z

Critical finding emerging: the WikiIngestRouterEngine is the canonical 70% surface but is `WIRE-EXEMPT` (line 1) — it's unwired, the dispatcher "ships in U-WIKI06". Let me check whether prism_wiki dispatcher actually exists, and read the key creation scripts (generate-wiki-entries, generate-wiki-cross-refs, lint-wiki-orphans) and the embed scripts to see what's actually executed vs aspirational.

### Assistant | 2026-06-09T15:45:57.707Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:45:57.720Z

[tool_use: Read]

### User | 2026-06-09T15:46:09.218Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-wiki-cross-refs.mjs — walk knowledge/wiki/ and emit:
4	 *
5	 * 1) Per-category atomic nodes for the KNOWLEDGE wiki categories only
6	 *    (concepts/, decisions/, patterns/, lessons/, trajectories/,
7	 *     code-tribal/, software-engineering/, ux-design/, entities/).
8	 *    Auto-generated action/dispatcher/engine wiki entries are SKIPPED
9	 *    because 
... [+2147 chars truncated]

### User | 2026-06-09T15:46:49.074Z

[tool_result] === prism_wiki dispatcher exists? ===
=== refs to WikiIngestRouterEngine in dispatchers/server ===
=== prism_wiki action refs anywhere in src ===
mcp-server/src/engines/WikiIndexMaintainerEngine.ts:1:// WIRE-EXEMPT: prism_wiki dispatcher ships in U-WIKI06; engine is consumed
mcp-server/src/engines/WikiIngestRouterEngine.ts:1:// WIRE-EXEMPT: prism_wiki dispatcher ships in U-WIKI06; engine is consum
... [+578 chars truncated]

### Assistant | 2026-06-09T15:47:18.819Z

Confirmed: the entire WikiIngest/WikiLint/WikiIndexMaintainer/WikiLogAppender engine quartet is WIRE-EXEMPT/dormant (prism_wiki dispatcher never shipped — U-WIKI06 vaporware). `generate-wiki-cross-refs.mjs` is pure regex frontmatter parsing — no LLM at all. Let me confirm the cross-ref/entries/lint generators are deterministic (no Ollama) and read the wiki-precheck-inject semantic path + embed-all-wiki blurb generation to nail the model used.

### Assistant | 2026-06-09T15:47:23.458Z

[tool_use: Bash]

### User | 2026-06-09T15:47:42.359Z

[tool_result] === generate-wiki-entries: any ollama/llm? ===
=== generate-wiki-cross-refs: any ollama? ===
=== lint-wiki-orphans: any ollama? ===
92:    sections[section] = sections[section] || { total: 0, orphans: 0, orphanList: [] };
98:      if (sections[section].orphanList.length < SAMPLE_ORPHANS) sections[section].orphanList.push(rel);
=== WikiLintEngine: any ollama? ===
7: * categories (the WIKI_SCHEMA §3
... [+188 chars truncated]

### Assistant | 2026-06-09T15:47:57.600Z

Confirmed. The CREATION/generation scripts (generate-wiki-entries, generate-wiki-cross-refs, lint-wiki-orphans, WikiLintEngine, promote-memory-to-wiki, promote-tribal-to-wiki) use ZERO Ollama — all pure deterministic regex/frontmatter parsing. WikiLintEngine line 7-8 explicitly says NLI + missing-concept checks are "deferred... routed through Ollama in U-WIKI04" (the dormant engine). Now let me confirm the embed/blurb model details and check promote-memory uses the nomic rerank lib I saw, plus verify which scripts are actually scheduled/wired (cron/hooks) vs just on-disk.

### Assistant | 2026-06-09T15:48:01.322Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:48:04.725Z

[tool_use: Bash]

### User | 2026-06-09T15:48:11.590Z

[tool_result] === promote-memory-to-wiki uses wiki-promo-rerank (nomic)? ===
=== embed-all-wiki generateBlurb model ===
45: * 1-2 sentence context blurb is generated via Ollama (qwen2.5-coder:7b) and
63:  generateBlurb, prependBlurb, BLURB_VERSION,
84: * generations fail (Ollama down, qwen unloaded, model name typo), the success
116:      `Check Ollama health (qwen2.5-coder loaded? daemon responding?) and rerun
... [+1749 chars truncated]

### User | 2026-06-09T15:48:26.461Z

[tool_result] === wiki-* hooks wired in settings.json? ===
wiki-precheck-inject : 0 refs (H: settings)
wiki-link-suggest : 0 refs (H: settings)
wiki-read-offload-advisory : 1 refs (H: settings)
wiki-recall-on-read : 0 refs (H: settings)
wiki-recall-on-write : 1 refs (H: settings)
wiki-tribal-coverage-inject : 1 refs (H: settings)
wiki-propagation-watchdog-stop : 1 refs (H: settings)
wiki-tribal-coverage-per-dom
... [+96 chars truncated]

### Assistant | 2026-06-09T15:48:50.845Z

Important new findings:
1. `wiki-precheck-inject` and `wiki-link-suggest` show **0 refs in H: settings.json** — the two most important hooks (one is the canonical injection-gate, one is the only LLM creation hook). Let me verify against the C: settings.json (canonical source) since the mirror is C→H and grep might have a path/JSON-structure issue.
2. `ask-ollama` default is `qwen2.5-coder:32b` with host-aware resolver → gpt-oss:120b/32b. The 3b/7b were retired per BLACKWELL-MODEL-UPGRADE.

Let me verify the hook wiring against C: settings (authoritative) and check the wiki-link-suggest model is a retired/valid tag, plus confirm promote-memory-to-wiki's actual rerank usage.

### Assistant | 2026-06-09T15:48:50.848Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:48:50.856Z

[tool_use: Bash]

### User | 2026-06-09T15:48:56.142Z

[tool_result] === C: settings.json wiki hook refs (authoritative) ===
wiki-precheck-inject : 0 refs (C: settings)
wiki-link-suggest : 0 refs (C: settings)
wiki-read-offload-advisory : 1 refs (C: settings)
wiki-recall-on-write : 1 refs (C: settings)
=== which settings file actually has wiki-precheck-inject wired? ===
H:/prism/.claude/settings.json
=== sessionstart-bundle reference? ===

### User | 2026-06-09T15:49:02.110Z

[tool_result] === promote-memory-to-wiki: how is rerank actually invoked? ===
28:import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
29:import { join, basename } from "node:path";
365:    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
=== is qwen2.5-coder:32b actually loaded now? (user says yes 7b too) ===
user-provid
... [+897 chars truncated]

### Assistant | 2026-06-09T15:49:14.231Z

Key findings now firm:
- `wiki-precheck-inject` + `wiki-link-suggest` are wired ONLY in `H:/prism/.claude/settings.json` (project-level), NOT in C: or H:/.claude (user-level, which is the canonical execution settings per CLAUDE.md). This needs verification — does Claude Code actually load project-level `.claude/settings.json`? It does. So these ARE wired, just at project scope. Let me confirm and also resolve the `promote-memory-to-wiki` rerank question (does it actually call the nomic lib, or is the lib orphaned?).

### Assistant | 2026-06-09T15:49:17.811Z

[tool_use: Bash]

### User | 2026-06-09T15:52:57.491Z

[tool_result] === does promote-memory-to-wiki import wiki-promo-rerank? full import scan ===
--- who imports wiki-promo-rerank.mjs? ---
scripts/lib/wiki-promo-rerank.mjs
.claude/cache/hook-telemetry.jsonl
.claude/cache/session-write-set.json
.claude/hooks/stop-memory-to-wiki-suggest.mjs
=== confirm wiki-precheck-inject wired in project settings hook event ===
820:            "command": "\"H:/.claude/bin/portabl
... [+214 chars truncated]

### Assistant | 2026-06-09T15:53:07.625Z

Now I have the full picture. `wiki-promo-rerank.mjs` (the nomic rerank for memory→wiki promotion) is consumed by `stop-memory-to-wiki-suggest.mjs` (a Stop hook), NOT by the `promote-memory-to-wiki.mjs` batch script. Let me do two final verifications: (1) confirm `stop-memory-to-wiki-suggest.mjs` is wired and uses the rerank, and (2) check the `wiki-recall-on-write`/`wiki-tribal-coverage-inject` hooks to classify them (injection vs creation), then I have enough to synthesize.

### Assistant | 2026-06-09T15:53:16.192Z

[tool_use: Bash]

### User | 2026-06-09T15:53:25.107Z

[tool_result] === stop-memory-to-wiki-suggest wired? + uses nomic rerank? ===
C:/Users/wompu/.claude/settings.json:1
H:/.claude/settings.json:1
H:/prism/.claude/settings.json:0
254:  // U-OBS-MEMWIKI-RERANK (slot:alpha, 2026-06-09): inject a local-LLM nomic
260:  // summaries embed each fire. $0 Claude tokens (Ollama nomic on Blackwell).
263:  // Disable: PRISM_MEM_TO_WIKI_NOMIC=0.
266:  if (process.env.PRISM_M
... [+779 chars truncated]

### Assistant | 2026-06-09T15:53:44.313Z

I have all the evidence I need. Let me do one final confirmation on the embed pipeline wiring (is `embed-wiki-into-tribal-index` actually run, since the tribal-rerank PSN leg #5 depends on it) and the offload-advisory model, then synthesize.

### Assistant | 2026-06-09T15:53:47.849Z

[tool_use: Bash]

### User | 2026-06-09T15:53:58.694Z

[tool_result] === wiki-read-offload-advisory: which ask-ollama mode/model? ===
7:// to scripts/ask-ollama.mjs summarize so the 5-50KB wiki body is processed in
11:// large wiki entry COULD be summarized via /route-to-obsidian. The token
72:  // (Same heuristic as ask-ollama.mjs `estimateTokens`.)
82:    suggestion: `📚 wiki entry "${classification.relPath}" is ${lineCount} lines (~${rawTokens} tokens). Consider 
... [+3177 chars truncated]

### Assistant | 2026-06-09T15:54:08.143Z

I now have complete, evidence-dense coverage. Let me update the task status and write the final audit.

### Assistant | 2026-06-09T15:54:08.329Z

[tool_use: TaskUpdate]

### User | 2026-06-09T15:54:10.836Z

[tool_result] Task not found

### Assistant | 2026-06-09T15:55:34.476Z

# OLLAMA AUDIT — PRISM WIKI PIPELINE

The WIKI_SCHEMA.md ">=70% Ollama-maintained" claim is **ASPIRATIONAL, not implemented**. The 70% figure is a `TOKEN_SHARE_FLOOR` constant in a dormant engine. Reality: the production wiki pipeline is **deterministic-regex creation + Ollama embeddings/recall**. The two LLM-creation surfaces the schema names (summarize, cross-ref-suggest, lint-NLI) are dead code or never built.

---

## BUCKET 1 — ALREADY OLLAMA-WIRED (live, with model)

| Surface | file:line | Model | Op class |
|---|---|---|---|
| **Wiki concept embeddings** (HNSW semantic index) | `scripts/build-wiki-embeddings.mjs:47,72-73,186,219` | `nomic-embed-text` (768-d int8) | EMBED — real, fail-soft if Ollama down |
| **Wiki→tribal embed** (feeds PSN leg #5 recall) | `scripts/embed-wiki-into-tribal-index.mjs:122-123,283` | `nomic-embed-text:latest` @ `/api/embeddings` | EMBED — fail-LOUD exit 3 |
| **Contextual blurb** for each embedded entry | `scripts/lib/contextual-blurb.mjs:25,77,88` (called by `embed-all-wiki.mjs:266`) | `qwen2.5-coder:32b` (`DEFAULT_MODEL`) | CREATION — 1-2 sentence retrieval blurb |
| **Wiki precheck semantic fallback** (query-time relevance gate) | `.claude/hooks/wiki-precheck-inject.mjs:66,83,361-365,430` + prewarm `:379-397` | `nomic-embed-text` (1500ms timeout) | INJECTION — embeds query, cosine vs corpus; BM25-first, semantic only on 0 hits |
| **Memory→wiki promotion rerank** | `.claude/hooks/stop-memory-to-wiki-suggest.mjs:266-272` → `scripts/lib/wiki-promo-rerank.mjs:42,45` | `nomic-embed-text` cosine | INJECTION/ROUTING — ranks which memos to promote, $0 Claude |
| **Wiki-link suggestion** (only true LLM creation hook) | `.claude/hooks/wiki-link-suggest.mjs:39,139-148` | `qwen2.5-coder:32b` (`OLLAMA_LINK_MODEL`, 5s timeout, heuristic fallback) | CREATION — picks 3-5 `[[related]]` links per memory/wiki write |
| **Wiki-read offload advisory** | `.claude/hooks/wiki-read-offload-advisory.mjs:7,82` → `scripts/ask-ollama.mjs:65` + `/route-to
... [+6221 chars truncated]
