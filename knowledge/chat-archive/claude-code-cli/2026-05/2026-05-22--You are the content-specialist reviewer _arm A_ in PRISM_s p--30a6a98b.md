---
type: "chat-session"
source: "claude-code-cli"
session_id: "30a6a98b-2fb0-450b-8b01-9188a6778938"
title: "You are the content-specialist reviewer (arm A) in PRISM's per-file scrutiny gat"
date: "2026-05-22"
first_ts: "2026-05-22T21:41:42.311Z"
last_ts: "2026-05-22T21:42:21.612Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/30a6a98b-2fb0-450b-8b01-9188a6778938/subagents/agent-ae02beeec91cb69ca.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# You are the content-specialist reviewer (arm A) in PRISM's per-file scrutiny gat

> **claude-code-cli** | 2026-05-22 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/30a6a98b-2fb0-450b-8b01-9188a6778938/subagents/agent-ae02beeec91cb69ca.jsonl`

## Transcript

### User | 2026-05-22T21:41:42.311Z

You are the content-specialist reviewer (arm A) in PRISM's per-file scrutiny gate. Review a 2-file change end-to-end and grade PASS or FAIL.

## Files to review (read both, whole file)
1. `H:/prism/.claude/hooks/wiki-precheck-inject.mjs` — modified hook.
2. `H:/prism/.claude/hooks/wiki-precheck-inject.test.mjs` — modified test suite (existing `node:test` suite, 10 new tests added).

## What this change is
RAG-UPGRADE-MS0 unit U-RAG-2: wire a stage-2 lexical reranker into `wiki-precheck-inject` — a UserPromptSubmit hook that surfaces top-3 wiki entries matching the user's prompt (BM25 over index.md + _leaf-index.jsonl, plus a `boost_keywords` curated layer and a domain-bias layer).

Before: `candidates` array was `.sort()`-ed by `s`, deduped, `.slice(0, TOP_K=3)`.
After: stage-1 widened to `.slice(0, STAGE1_K=15)`, then a new `applyLexicalRerank(prompt, items, topK)` reranks via `scripts/lib/lexical-rerank.mjs` and narrows to TOP_K.

## The CRITICAL wiki-specific design decision
This hook has a `boost_keywords` curation layer: a wiki entry can carry curated keywords that surface it with a synthetic high score (`BOOST_BASE_SCORE=12`) even when BM25 token overlap is weak — by design, for multi-word phrases / filenames / globs BM25 misses. The file's comments state the boost score is "sized so a deliberate curation reliably surfaces."

A naive lexical rerank would DEMOTE such a boosted entry (its name/desc may not lexically match the prompt — that's the whole point). So `applyLexicalRerank` PINS `boosted` candidates at the head and only reranks the non-boosted pool. **Verify this invariant is correct and complete** — a boosted entry must never be demoted below a non-boosted one.

## Reference (already PASSED scrutiny)
Same two-stage pattern shipped into 3 sibling hooks: `tribal-by-domain-inject.mjs` (commit `6df057e098`, 3-of-3 PASS), `master-index-precheck-inject.mjs` (`c8acc5accd`), `memory-relevance-inject.mjs` (`52b1fe91e8`).

## Reranker contract (`scripts/lib/lexi
... [+2033 chars truncated]

### Assistant | 2026-05-22T21:42:00.858Z

I'll review both files end-to-end.

### Assistant | 2026-05-22T21:42:01.304Z

[tool_use: Read]

### Assistant | 2026-05-22T21:42:01.594Z

[tool_use: Read]

### Assistant | 2026-05-22T21:42:01.976Z

[tool_use: Read]

### User | 2026-05-22T21:42:18.447Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * wiki-precheck-inject.test.mjs — node:test suite for wiki-precheck-inject.mjs.
4	 *
5	 * Primary coverage: the WIKI-INJECT-MS0 embeddings-staleness guard
6	 * (embeddingStaleness / staleFooterNote / the embStale wiring through
7	 * semanticFallback → main → logMiss). Also pins the BM25/boost matched path so
8	 * the guard edits can't silently break the happy path.
9
... [+21324 chars truncated]

### User | 2026-05-22T21:42:18.496Z

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

### User | 2026-05-22T21:42:18.531Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+32536 chars truncated]

### Assistant | 2026-05-22T21:42:21.612Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
