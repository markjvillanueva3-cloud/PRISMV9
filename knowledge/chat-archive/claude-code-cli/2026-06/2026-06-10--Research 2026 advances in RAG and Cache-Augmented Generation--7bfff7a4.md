---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Research 2026 advances in RAG and Cache-Augmented Generation (CAG): when CAG (pr"
date: "2026-06-10"
first_ts: "2026-06-10T15:03:55.068Z"
last_ts: "2026-06-10T15:06:47.438Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-a282f12ab37e511f4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Research 2026 advances in RAG and Cache-Augmented Generation (CAG): when CAG (pr

> **claude-code-cli** | 2026-06-10 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-a282f12ab37e511f4.jsonl`

## Transcript

### User | 2026-06-10T15:03:55.068Z

Research 2026 advances in RAG and Cache-Augmented Generation (CAG): when CAG (preloaded KV-cache context) beats retrieval, hybrid dense+BM25 rerank, long-context vs retrieval tradeoffs, and reranking best-practices. Applicable to a markdown-vault-backed knowledge system.

Return <=350 words of CONCRETE, CITED findings (URLs/paper names). Lead with the 2-3 highest-leverage actionable techniques. The current month is June 2026 -- prefer recent sources. End with a 'Sources:' list.

### Assistant | 2026-06-10T15:04:09.528Z

I'll research this directly using web search, prioritizing recent (2025-2026) sources.

### Assistant | 2026-06-10T15:04:10.442Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T15:04:10.810Z

[tool_use: WebSearch]

### User | 2026-06-10T15:04:40.900Z

[tool_result] Web search results for query: "Cache-Augmented Generation CAG vs RAG preloaded KV cache when CAG beats retrieval 2025"

I'll search for information about Cache-Augmented Generation (CAG) versus RAG and when CAG outperforms retrieval methods.

Links: [{"title":"Cache-Augmented Generation (CAG): Is It Better Than RAG?","url":"https://www.analyticsvidhya.com/blog/2025/03/cache-augmented-generation-ca
... [+7260 chars truncated]

### User | 2026-06-10T15:05:11.267Z

[tool_result] Web search results for query: "hybrid dense BM25 retrieval reranking best practices 2025 2026 long context vs RAG tradeoff"

I'll search for information on hybrid retrieval, reranking best practices, and the long context vs RAG tradeoff.

Links: [{"title":"Hybrid BM25 Retrieval","url":"https://www.emergentmind.com/topics/hybrid-bm25-retrieval"},{"title":"BM25 Retrieval: Methods and Applications","
... [+12912 chars truncated]

### Assistant | 2026-06-10T15:05:23.962Z

I have enough for a focused, cited answer. Let me get one more recent source on CAG KV-cache specifics for vault systems.

### Assistant | 2026-06-10T15:05:25.208Z

[tool_use: WebSearch]

### User | 2026-06-10T15:06:21.489Z

[tool_result] Web search results for query: "cache-augmented generation KV cache reuse markdown knowledge base 2026 prompt caching cost preload context window size limit"

I'll search for information on this topic for you.

Links: [{"title":"Cache-Craft: Managing Chunk-Caches for Efficient Retrieval-Augmented Generation","url":"https://skejriwal44.github.io/docs/CacheCraft_SIGMOD_2025.pdf"},{"title":"RAGCache: 
... [+11839 chars truncated]

### Assistant | 2026-06-10T15:06:47.438Z

**Highest-leverage techniques (apply first):**

1. **Preload the stable vault as a cached prefix, not a retrieval index, when it fits the window.** CAG = prompt caching: process the corpus once into a KV cache, reuse at ~10% input cost on Claude (Anthropic 90% read discount vs OpenAI 50%). Break-even needs hit ratio >~30%; below that the +25% write premium is a tax. Gemini's 32K-token min floor suits large vaults; Claude Sonnet/Opus 4.5 need only 4,096 tokens/checkpoint, 1-hr TTL. Keep the cached prefix byte-identical and place it before the changing query block ([CAG paper, WWW 2025](https://arxiv.org/html/2412.15605v1); [Claude prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching); [aicostcheck 2026](https://aicostcheck.com/blog/ai-prompt-caching-cost-savings)).

2. **Route per query, don't pick one architecture.** Self-Route (EMNLP 2024): let the model decide — simple/bounded lookups → CAG/long-context; large/fresh corpus or attribution → RAG; multi-hop (3+ reasoning hops, HotpotQA-style) → hybrid retrieve-then-reason. LaRA (ICML 2025, 2,326 cases/11 LLMs): neither is a silver bullet; long-context is 8–82× costlier at scale ([LaRA via open-techstack 2026](https://open-techstack.com/blog/rag-vs-long-context-2026/); [TianPan 2026](https://tianpan.co/blog/2026-04-09-long-context-vs-rag-production-decision-framework)).

3. **Staged hybrid: BM25 + dense → RRF fusion → cross-encoder rerank top-K.** Failure modes are complementary (BM25 nails rare tokens/SKUs/error codes; dense covers synonyms). Hybrid lifts DPR recall 48.7%→53.4%, nDCG@10 43.4→52.6 (BEIR). Fuse on **ranks (RRF)** not raw scores; inject BM25 as a *feature* into the reranker rather than weighted score-sum. New 2025: instruction-following rerankers (Voyage rerank-2.5) ([Digital Applied 2026](https://www.digitalapplied.com/blog/hybrid-search-bm25-vector-reranking-reference-2026); [DEV/negitamaai](https://dev.to/negitamaai/integrating-bm25-in-hybrid-search-and-reranking-pipel
... [+1160 chars truncated]
