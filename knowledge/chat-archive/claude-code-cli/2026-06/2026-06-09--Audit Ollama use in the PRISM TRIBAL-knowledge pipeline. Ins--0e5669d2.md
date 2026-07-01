---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Audit Ollama use in the PRISM TRIBAL-knowledge pipeline. Inspect: .claude/script"
date: "2026-06-09"
first_ts: "2026-06-09T15:42:37.002Z"
last_ts: "2026-06-09T15:48:30.674Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 17
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_7f974777-bf2/agent-a66f89bb3c40b16dc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Audit Ollama use in the PRISM TRIBAL-knowledge pipeline. Inspect: .claude/script

> **claude-code-cli** | 2026-06-09 | 40 msgs (17 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_7f974777-bf2/agent-a66f89bb3c40b16dc.jsonl`

## Transcript

### User | 2026-06-09T15:42:37.002Z

Audit Ollama use in the PRISM TRIBAL-knowledge pipeline. Inspect: .claude/scripts/tribal-rerank.mjs, .claude/scripts/tribal-embed-index.mjs, scripts/lib/load-tribal-index.mjs, .claude/hooks/tribal-by-domain-inject.mjs, the /distill-tribal + /shop-knowledge skills, any tribal CREATION path (extracting tips from transcripts/PDFs). Question: is tribal CREATION (distilling a tip) and INJECTION (rerank/select top-3) Ollama-powered or BM25/Claude? Could the rerank or distillation move to a local 32b/embeddings model? Note: tribal-embed-index hit V8 512MiB string cap recently — is embedding done locally (nomic-embed-text) already? file:line + token evidence. LIVE Ollama models loaded NOW on the 96GB RTX PRO 6000 Blackwell (verified this session): qwen2.5-coder:1.5b, qwen2.5-coder:7b, qwen2.5-coder:32b, gpt-oss:20b, gpt-oss:120b, qwen3-vl:8b(-instruct), qwen2.5vl:7b, moondream:1.8b, llama3.2-vision:11b, nomic-embed-text. So a heavy local tier (32b coder / 120b general / vision / embeddings) is AVAILABLE — recommend the SMALLEST model that does each job well.

ALREADY-VERIFIED-NON-VIABLE (alpha, 2026-06-09, reference_obsidian_tokensavings_premise_falsified):
(a) WIDENING the local-llm-task-router WORK_CLASS_PATTERNS to push offload toward 30% is a FALSE PREMISE — live dashboard: fired=53, offload=3, keep=44, where the 44 keeps are CORRECT (orchestration 34, operator_directive 5, safety 1, deep_reasoning 1 — all judgment tasks that MUST stay on Claude per R5). The low ~5-6% offload rate is an orchestration-heavy SESSION SHAPE, not a misrouting bug. Do NOT propose widening the classifier to offload orchestration/directives/reasoning — that is a REGRESSION.
(b) session-end-goal-synthesis LLM pass is DORMANT (unwired in both settings.json) and reads month-stale data — do NOT propose wiring an LLM pass onto dead data.
The real lever is NOT a classifier code-fix; it is (1) BEHAVIORAL adoption of existing offload suggestions, and (2) routing the HEAVY CREATION/SYNTHESIS work that A
... [+806 chars truncated]

### Assistant | 2026-06-09T15:42:58.278Z

I'll audit the Ollama usage in the PRISM tribal-knowledge pipeline. Let me read the actual files cited.

### Assistant | 2026-06-09T15:42:59.692Z

[tool_use: Read]

### Assistant | 2026-06-09T15:42:59.698Z

[tool_use: Read]

### Assistant | 2026-06-09T15:43:00.002Z

[tool_use: Read]

### User | 2026-06-09T15:43:24.853Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * tribal-rerank.mjs — L2 of TRIBAL × AI
4	 *
5	 * Reads `state/shared/tribal-embed-index.json` (L1), embeds the
6	 * incoming query via Ollama nomic-embed-text, returns top-N hits
7	 * with optional domain weighting.
8	 *
9	 * Differs from L1 --query in three ways:
10	 *   1. Domain-aware: --domain <mill|lathe|wedm|cad|cam|backend-dev|general>
11	 *      doubles the 
... [+7571 chars truncated]

### User | 2026-06-09T15:43:24.856Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * load-tribal-index.mjs — cap-safe loader for state/shared/tribal-embed-index.json
4	 *
5	 * ## The blocker this closes (2026-06-08, slot golf, gap #5 root cause)
6	 *
7	 * The tribal index grew past **V8's hard maximum string length**
8	 * (`0x1fffffe8` = 536,870,888 bytes ≈ 512 MiB). Every consumer that did
9	 * `JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"))` — t
... [+7464 chars truncated]

### User | 2026-06-09T15:43:24.858Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// tribal-by-domain-inject.mjs — UserPromptSubmit
4	//
5	// SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT.
6	//
7	// Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN: the wiki-precheck-inject hook
8	// already biases wiki-entry ranking toward the active chat-slot's milestone
9	// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
10	// knowledge — 
... [+18697 chars truncated]

### Assistant | 2026-06-09T15:43:39.571Z

I have the three core read files. Now let me read the embed-index creation path, the spawn lib, lexical reranker, and the two skills, plus check for tribal creation/distillation paths.

### Assistant | 2026-06-09T15:43:39.989Z

[tool_use: Read]

### Assistant | 2026-06-09T15:43:41.402Z

[tool_use: Read]

### Assistant | 2026-06-09T15:43:41.407Z

[tool_use: Read]

### User | 2026-06-09T15:44:29.698Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * tribal-embed-index.mjs — L1 of TRIBAL × AI stack
4	 *
5	 * Unified vector index across the four tribal corpora:
6	 *   1. knowledge/wiki/**\/*.md
7	 *   2. knowledge/memories/**\/*.md
8	 *   3. mcp-server/data/state/extraction-log.json
9	 *   4. (optional) Obsidian vault — registered via tribal-obsidian-mirror.mjs
10	 *
11	 * Embedding:  Ollama nomic-embed-text:lat
... [+15072 chars truncated]

### User | 2026-06-09T15:44:29.803Z

[tool_result] 1	// scripts/lib/tribal-rerank-spawn.mjs
2	// -------------------------------------
3	// OBSIDIAN-VAULT-SYNERGY/U-OBS-TRIBAL-HEAP-SPAWN (slot:alpha, 2026-06-09)
4	//
5	// Single source of truth for SPAWNING the tribal reranker (.claude/scripts/
6	// tribal-rerank.mjs, PSN leg #5). The spawn POLICY — heap ceiling, timeout,
7	// stdio, windowsHide, env — lives here so it can never drift between call
... [+3045 chars truncated]

### User | 2026-06-09T15:44:30.303Z

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

### Assistant | 2026-06-09T15:44:53.162Z

Now let me find the tribal CREATION/distillation paths and the skills. Let me search for the distill-tribal and shop-knowledge skills, plus any tip-extraction-from-transcripts/PDFs path.

### Assistant | 2026-06-09T15:44:55.878Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:44:57.647Z

[tool_use: Grep]

### User | 2026-06-09T15:45:26.731Z

[tool_result] 3:description: Cluster near-duplicate tribal tips by TF-IDF cosine and emit canonical IdeaBlocks (Q-A markdown) to knowledge/wiki/code-tribal/canonical/. Implements the IdeaBlock pattern (Akshay Pachaar / Iternal Blockify) for PRISM's tribal-tip corpus. No Ollama required (heuristic Q-A); upgrades to LLM-rewrite when models are loaded.
63:<heuristic-derived; rewrite via Ollama when models loaded>

... [+211 chars truncated]

### User | 2026-06-09T15:45:55.441Z

[tool_result] H:/prism/.claude/commands/distill-tribal.md
H:/prism/.claude/commands/shop-knowledge.md
---SKILL FILES---
H:/prism/.claude/commands/distill-tribal.md
---SCRIPTS WITH tribal/distill---
tribal-density-router-bridge.mjs*
tribal-embed-index.mjs*
tribal-embed-index.test.mjs*
tribal-obsidian-mirror.mjs*
tribal-rerank.mjs*
tribal-tier2-precontext.mjs*
tribal-utilization-audit.mjs*
---scripts dir tribal--
... [+2154 chars truncated]

### Assistant | 2026-06-09T15:46:00.820Z

Now let me read the creation paths: distill-tribal.mjs, distill-session-learnings.mjs, the PDF/transcript extraction paths, and check the two skills + Ollama wiring in creation scripts.

### Assistant | 2026-06-09T15:46:01.170Z

[tool_use: Read]

### Assistant | 2026-06-09T15:46:01.598Z

[tool_use: Read]

### User | 2026-06-09T15:46:10.084Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * distill-tribal.mjs — IdeaBlock canonicalization for tribal-tip corpus
4	 * ========================================================================
5	 *
6	 * Implements the Akshay Pachaar / Iternal "IdeaBlock" pattern for PRISM's
7	 * tribal-tip corpus. Reads `mcp-server/data/state/TRIBAL_TIP_INDEX.json`,
8	 * clusters near-duplicate tips by TF-IDF cosine similarit
... [+15392 chars truncated]

### User | 2026-06-09T15:46:11.346Z

[tool_result] 1	#!/usr/bin/env node
2	// distill-session-learnings.mjs
3	// SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL
4	//
5	// Extract session-end learnings from a chat session (most-recent commit
6	// metadata, scrutiny ledger notes, file-touch list, decision-log diffs)
7	// and write a single dedup'd entry to BOTH:
8	//   - knowledge/wiki/code-tribal/learnings/<unit-id>.md (project-lifetime, git-tracked)
9
... [+9823 chars truncated]

### Assistant | 2026-06-09T15:46:22.318Z

Both creation paths are LLM-free (TF-IDF + git-metadata templating). Now let me check the transcript/PDF tip-extraction paths and the shop-knowledge skill to complete the CREATION bucket, and check whether the index embedding is actually nomic (it is, per code). Let me verify the live index model + the transcript/PDF extraction scripts.

### Assistant | 2026-06-09T15:46:24.517Z

[tool_use: Grep]

### Assistant | 2026-06-09T15:46:26.717Z

[tool_use: Grep]

### Assistant | 2026-06-09T15:46:28.305Z

[tool_use: Grep]

### Assistant | 2026-06-09T15:46:31.274Z

[tool_use: Bash]

### User | 2026-06-09T15:46:31.746Z

[tool_result] No matches found

### User | 2026-06-09T15:46:35.122Z

[tool_result] 71:// NOTE: `\b` does NOT break on `_` (underscore is a regex word char), so a

### User | 2026-06-09T15:46:35.246Z

[tool_result] 9:// requires Ollama (currently offline per fleet banner). Pointer tips name the

### User | 2026-06-09T15:46:57.990Z

[tool_result] === live ollama models ===
{"models":[{"name":"qwen2.5-coder:1.5b"
{"name":"gpt-oss:120b"
{"name":"qwen2.5-coder:32b"
{"name":"gpt-oss:20b"
{"name":"qwen3-vl:8b-instruct"
{"name":"qwen3-vl:8b"
{"name":"qwen2.5vl:7b"
{"name":"moondream:1.8b"
{"name":"llama3.2-vision:11b"
{"name":"nomic-embed-text:latest"
=== index head (model/dim/counts) ===
{"schemaVersion":"1.0.0","model":"nomic-embed-text:latest
... [+431 chars truncated]

### Assistant | 2026-06-09T15:47:22.906Z

Key facts confirmed. The live index head shows `model: nomic-embed-text:latest`, dim 768, generated 2026-06-09 (today) — **embedding IS done locally via nomic-embed-text, and the index is currently 167MB** (NOT over the 512MiB string cap right now — the cap event was at 537MB; current is 167MB, the post-restore baseline). Let me verify the monolith/course creation paths' actual logic (regex vs LLM) and confirm the index live size hasn't crossed the cap.

### Assistant | 2026-06-09T15:47:24.653Z

[tool_use: Read]

### Assistant | 2026-06-09T15:47:24.728Z

[tool_use: Read]

### User | 2026-06-09T15:47:29.458Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * monolith-to-tribal-tips — Lane A direct-wire converter
4	 * KNOWLEDGE-CONVERSION-MS0 / U-KC-B2
5	 *
6	 * Reads state/shared/specs/monolith-port-ledger.json, filters to the data-lane
7	 * subset (laneHint starts with "A/B2"), and emits a KnowledgeTip[] envelope
8	 * into DOC_KNOWLEDGE_DIR (cad-engine/knowledge_store/) that
9	 * TribalKnowledgeEngine.loadDocumentLear
... [+4813 chars truncated]

### User | 2026-06-09T15:47:29.462Z

[tool_result] 1	#!/usr/bin/env node
2	// KNOWLEDGE-CONVERSION-MS0 / U-KC-B1 — Lane A direct-wire converter.
3	//
4	// Reads `state/shared/tribal-graph/course-content-candidates.jsonl` (advisory
5	// review queue from TRIBAL-GRAPH-MS0/U-CONTENT-MINE) and emits one
6	// `KnowledgeTip` per `candidateAsset` into `DOC_KNOWLEDGE_DIR` so
7	// `TribalKnowledgeEngine.loadDocumentLearnedTips()` picks them up on next init
... [+3146 chars truncated]

### Assistant | 2026-06-09T15:48:30.674Z

I have enough evidence. The creation paths are all deterministic (regex/category-map/TF-IDF/git-template) and explicitly "no LLM" by design, with documented upgrade hooks gated on "Ollama models loaded." I have the full picture. Let me write the audit.

---

# OLLAMA AUDIT — PRISM TRIBAL-KNOWLEDGE PIPELINE

## Pipeline shape (verified)
CREATION (distill tip) → EMBED (index) → INJECTION (rerank/select top-3). Embedding is the ONLY LLM-touching stage today; CREATION is 100% deterministic, INJECTION is embeddings + pure-lexical (no Claude in the loop at all).

---

## BUCKET 1 — ALREADY OLLAMA-WIRED

**Embedding (both index build + query embed) — `nomic-embed-text:latest`, 768-dim, live.**
- `tribal-embed-index.mjs:39-41` `OLLAMA_URL="http://127.0.0.1:11434"`, `MODEL="nomic-embed-text:latest"`, `DIM=768`; embed call `:159-171` `POST /api/embeddings`.
- `tribal-rerank.mjs:39-40` same URL + model; query-embed `:57-67` `POST /api/embeddings`.
- LIVE PROOF: index head reads `"model":"nomic-embed-text:latest","dim":768,"generatedAt":"2026-06-09T05:09:09Z"` and `nomic-embed-text:latest` is in the loaded set. **Embedding is already local — nomic is the smallest correct model for this job; do NOT move it to a bigger model.**

**V8-cap status (the user's question): currently SAFE, not over-cap right now.** Live `tribal-embed-index.json` = **167,637,848 bytes (167MB)** — well under V8's 536,870,888 cap. The 537MB cap event (2026-06-08) was followed by a restore to the ~4,162-entry baseline; current is the post-restore index. The cap-safe loader (`load-tribal-index.mjs`, `V8_MAX_STRING=0x1fffffe8:48`) is wired into both readers (`tribal-rerank.mjs:86`, `tribal-embed-index.mjs:197`) as defense-in-depth and takes the byte-identical fast path under cap (`load-tribal-index.mjs:154-156`). **The WRITE side still has no sharding** — `writeIndex` does `JSON.stringify(idx)` (`tribal-embed-index.mjs:228`), which throws if the object re-crosses the cap. That is a SHARDING gap, not an Ollama
... [+7378 chars truncated]
