---
type: "chat-session"
source: "claude-code-cli"
session_id: "3a1c1c68-a4cf-4705-a813-b80ec43b26fa"
title: "Research the most current (2025-2026) reputable-source guidance on TOKEN ECONOMY"
date: "2026-05-16"
first_ts: "2026-05-16T21:14:30.415Z"
last_ts: "2026-05-16T21:16:59.635Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 10
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/3a1c1c68-a4cf-4705-a813-b80ec43b26fa/subagents/agent-a216edc853fdc0b21.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Research the most current (2025-2026) reputable-source guidance on TOKEN ECONOMY

> **claude-code-cli** | 2026-05-16 | 22 msgs (10 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3a1c1c68-a4cf-4705-a813-b80ec43b26fa/subagents/agent-a216edc853fdc0b21.jsonl`

## Transcript

### User | 2026-05-16T21:14:30.415Z

Research the most current (2025-2026) reputable-source guidance on TOKEN ECONOMY for long-running coding agents using Claude (Anthropic) — the goal is to inform a system-wide audit of the PRISM Manufacturing Intelligence Platform.

Specifically look for:

1. **Anthropic prompt caching** — official docs on cache_control breakpoints, TTL (5min default, 1h beta), how to maximize cache hit rate for system-prompt + tool definitions + RAG context. URL hints: docs.anthropic.com/en/docs/build-with-claude/prompt-caching. Find: minimum cache size, breakpoint count limit, what invalidates a cache, cost ratio (cache write vs read vs uncached).

2. **Context engineering / context distillation** — Anthropic's "context engineering" doctrine, Karpathy's "LLM Wiki" pattern, recent (2025+) techniques for sub-agent context bundling that doesn't bloat parent context. Find: actual recommended structure for multi-turn agent systems with tool use.

3. **Sub-agent and tool isolation** — Claude Code docs on subagents (`Task` tool / `Agent`), isolation modes, the cost model of spawning a sub-agent vs handling in-context.

4. **RAG patterns for code intelligence** — hybrid BM25+cosine retrieval, when to inject vs let the agent retrieve via tool call, embedding model recommendations (nomic-embed-text vs alternatives) for code.

5. **Hook overhead in CI/agent loops** — any reputable benchmarks on how many pre/post-tool hooks an agent loop can tolerate before becoming budget-bound.

For EACH source, return: (a) URL, (b) the specific actionable claim, (c) whether it directly applies to PRISM's situation (architecture summary below).

PRISM architecture (relevant slice):
- 147 wired hooks total: 39 SessionStart, 24 UserPromptSubmit, 20 PreToolUse, 14 PostToolUse, 40 Stop
- 8 of 24 UserPromptSubmit hooks are "inject" type — they add ~400 tokens each, ~3,200 tokens per user message minimum overhead
- 23% Ollama offload rate currently (63 offloaded / 207 kept on Claude); target 30%
- Has a local Olla
... [+875 chars truncated]

### Assistant | 2026-05-16T21:14:35.125Z

I'll research current Anthropic and reputable-source guidance on token economy for long-running Claude coding agents. Let me parallelize the searches.

### Assistant | 2026-05-16T21:14:36.175Z

[tool_use: WebSearch]

### Assistant | 2026-05-16T21:14:36.706Z

[tool_use: WebSearch]

### Assistant | 2026-05-16T21:14:37.747Z

[tool_use: WebSearch]

### Assistant | 2026-05-16T21:14:38.176Z

[tool_use: WebSearch]

### User | 2026-05-16T21:15:12.557Z

[tool_result] Web search results for query: "Anthropic prompt caching 2025 cache_control breakpoints TTL 1 hour beta minimum cache size"

Links: [{"title":"Prompt caching - Claude API Docs","url":"https://platform.claude.com/docs/en/build-with-claude/prompt-caching"},{"title":"Prompt Caching Support in Spring AI with Anthropic Claude","url":"https://spring.io/blog/2025/10/27/spring-ai-anthropic-prompt-caching-b
... [+2913 chars truncated]

### User | 2026-05-16T21:15:12.682Z

[tool_result] Web search results for query: "hybrid BM25 cosine RAG code intelligence nomic-embed-text vs voyage 2025"

Links: [{"title":"Optimizing RAG with Hybrid Search & Reranking | VectorHub by Superlinked","url":"https://superlinked.com/vectorhub/articles/optimizing-rag-with-hybrid-search-reranking"},{"title":"Feature: Knowledgebase RAG System — User-Configured Document Directory with Local Embedding, Hyb
... [+3230 chars truncated]

### User | 2026-05-16T21:15:12.873Z

[tool_result] Web search results for query: "Anthropic context engineering 2025 doctrine sub-agent context bundling multi-turn"

Links: [{"title":"Effective context engineering for AI agents","url":"https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents"},{"title":"Claude's Context Engineering Secrets: Best Practices Learned from Anthropic | Bojie Li","url":"https://01.me/en/2025/12/c
... [+3674 chars truncated]

### User | 2026-05-16T21:15:13.053Z

[tool_result] Web search results for query: "Claude Code subagents Task tool isolation cost model 2025 token budget"

Links: [{"title":"AI Agent Token Budget Management: How Claude Code Prevents Runaway API Costs | MindStudio","url":"https://www.mindstudio.ai/blog/ai-agent-token-budget-management-claude-code"},{"title":"Manage costs effectively - Claude Code Docs","url":"https://code.claude.com/docs/en/costs"},
... [+3077 chars truncated]

### Assistant | 2026-05-16T21:15:17.080Z

[tool_use: WebSearch]

### Assistant | 2026-05-16T21:15:17.637Z

[tool_use: WebSearch]

### Assistant | 2026-05-16T21:15:18.673Z

[tool_use: WebSearch]

### Assistant | 2026-05-16T21:15:19.261Z

[tool_use: WebSearch]

### User | 2026-05-16T21:15:24.264Z

[tool_result] Web search results for query: "Claude Code hook overhead PreToolUse PostToolUse performance benchmark 2025"

Links: [{"title":"Claude Code Hooks: PreToolUse, PostToolUse & Stop (SDK) | Pixelmojo","url":"https://www.pixelmojo.io/blogs/claude-code-hooks-production-quality-ci-cd-patterns"},{"title":"GitHub - Chachamaru127/claude-code-harness: Claude Code Dedicated Development Harness - Achieving High
... [+2852 chars truncated]

### User | 2026-05-16T21:15:25.453Z

[tool_result] Web search results for query: "Anthropic "tool use" token cost cache_control 1024 token minimum Sonnet 2025"

Links: [{"title":"Anthropic API Pricing in 2026: Complete Guide — Models, Caching, Batch & Optimization","url":"https://www.finout.io/blog/anthropic-api-pricing"},{"title":"Token-saving updates on the Anthropic API | Claude","url":"https://www.anthropic.com/news/token-saving-updates"},{"ti
... [+2456 chars truncated]

### User | 2026-05-16T21:15:26.350Z

[tool_result] Web search results for query: ""just-in-time" context loading agent skills progressive disclosure Anthropic 2025"

Links: [{"title":"Equipping agents for the real world with Agent Skills","url":"https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills"},{"title":"Agent Skills: Progressive Disclosure as a System Design Pattern","url":"https://www.newsletter.swirla
... [+3741 chars truncated]

### User | 2026-05-16T21:15:27.003Z

[tool_result] Web search results for query: ""voyage-code-3" vs nomic-embed-code embeddings benchmark MTEB 2025"

Links: [{"title":"Best Embedding Models 2025: MTEB Scores & Leaderboard (Cohere, OpenAI, BGE) | Ailog RAG","url":"https://app.ailog.fr/en/blog/guides/choosing-embedding-models"},{"title":"Best Embedding Models 2026: MTEB Benchmarks + Pricing","url":"https://pecollective.com/tools/best-embedding-mode
... [+2710 chars truncated]

### Assistant | 2026-05-16T21:15:29.704Z

I have enough data. Let me do one targeted final search on cache invalidation specifics, then synthesize.

### Assistant | 2026-05-16T21:15:30.331Z

[tool_use: WebSearch]

### User | 2026-05-16T21:15:37.773Z

[tool_result] Web search results for query: "Anthropic prompt cache invalidation tool definitions system prompt order longest TTL first"

Links: [{"title":"Prompt caching - Claude API Docs","url":"https://platform.claude.com/docs/en/build-with-claude/prompt-caching"},{"title":"Prompt caching - Anthropic","url":"https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching?s=09"},{"title":"Prompt Caching W
... [+2629 chars truncated]

### Assistant | 2026-05-16T21:16:59.635Z

I have sufficient research. The task list reminder is not directly applicable to a pure research subagent task — I'll deliver the findings directly as instructed.

---

# Token Economy Research for PRISM — 9 Actionable Findings

## 1. Cache breakpoint scarcity is the #1 latent win
- **URL:** https://docs.claude.com/en/docs/build-with-claude/prompt-caching
- **Claim:** Only **4 cache_control breakpoints per request**; cache hierarchy is strictly `tools → system → messages`, and **any change at level N invalidates all downstream levels**. Cache reads cost **0.1×** base input; 5-min cache writes cost **1.25×**; 1-hour writes cost **2.0×**. The Anthropic engine auto-checks up to **20 prior content-block boundaries** and uses the longest matching prefix.
- **Applicability to PRISM:** HIGH — PRISM's 8 inject-type UserPromptSubmit hooks each append fresh content to the message history every turn, which means the message-level cache prefix gets a new tail every prompt. Even if Claude Code default-caches the system + tools, the inject content is invalidating message-level cache constantly. Tool-definition cache is fine; system cache is fine; **message cache is being torched ~24× per turn**.
- **Suggested PRISM artifact:** New hook `inject-stable-tail-group.mjs` (UserPromptSubmit T0, runs BEFORE the 8 injectors) — concatenates all 8 inject outputs, sorts by mutation-frequency (rarely-changing first), and emits ONE consolidated block tagged so the model writes the cache breakpoint AFTER the stable portion only. Pairs with a new doctrine memory `feedback_cache_breakpoint_discipline.md`.

## 2. 1-hour cache TTL on slot worktrees
- **URL:** https://docs.claude.com/en/docs/build-with-claude/prompt-caching
- **Claim:** 1-hour TTL costs 2.0× write but pays back if the same prefix is hit ≥2× within the hour (vs 5-min default which dies fast in long agent loops). Beta header: `extended-cache-ttl-2025-04-11`. Constraint: longer TTLs must appear before shorter TTLs in the breakpoint lis
... [+10175 chars truncated]
