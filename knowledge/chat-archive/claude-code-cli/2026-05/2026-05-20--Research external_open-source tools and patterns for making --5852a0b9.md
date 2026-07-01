---
type: "chat-session"
source: "claude-code-cli"
session_id: "5852a0b9-b93f-42e3-a8f0-deab5898423c"
title: "Research external/open-source tools and patterns for making Claude Code self-awa"
date: "2026-05-20"
first_ts: "2026-05-20T03:46:56.457Z"
last_ts: "2026-05-20T03:51:21.931Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 12
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/5852a0b9-b93f-42e3-a8f0-deab5898423c/subagents/agent-a5f49a78178af9390.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Research external/open-source tools and patterns for making Claude Code self-awa

> **claude-code-cli** | 2026-05-20 | 26 msgs (12 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5852a0b9-b93f-42e3-a8f0-deab5898423c/subagents/agent-a5f49a78178af9390.jsonl`

## Transcript

### User | 2026-05-20T03:46:56.457Z

Research external/open-source tools and patterns for making Claude Code self-aware of its own token / quota / context usage so it can decide when to `/compact` autonomously. This feeds a decision about whether PRISM should install, fork, or build.

Constraints — these doctrine pieces are fixed and shape the answer:
- The user is on a Claude Code subscription (NOT direct API). They run up to 13 concurrent chats (NATO slots alpha..mike + golf).
- Anthropic ToS is a GREY AREA for any proxy that sits between Claude Code and `api.anthropic.com` (Reddit thread r/ClaudeAI/comments/1t9ayg8 shows conflicting Anthropic support answers — some users report account-ban risk for proxy approaches).
- The repo already has: precompact handoffs that auto-write on `/compact`, terminal-pin + auto-resume across `/compact`, an Ollama offload router, a context-pressure estimator, MCP dispatcher actions for token-economy + session-budget, a fleet-memory-monitor.
- Goal: truly autonomous /loop building where the chat knows when to compact BEFORE the harness's hard limit, and ideally knows quota state (5h / 7d unified pool) to pace work.

Survey 4 categories — for each, evaluate against ToS risk, implementation effort, and integration fit with the constraints above. Under 1000 words total.

1. **`--output-format stream-json --verbose` + reading the per-message usage block** (mrgulabull/claude-conductor approach https://github.com/ScottBull/claude-conductor). This is what Claude Code itself emits — no proxy, no header sniffing. What fields are in the `usage` block (input_tokens, output_tokens, cache_creation, cache_read)? What's the operational cost to wrap claude in this mode? Can you wrap it AND keep interactive Claude Code (the user runs interactive chats, not headless)? What does a session-cumulative token counter look like built on top?

2. **The proxy approach** (InertiaUK/claude-quota-proxy, https://github.com/InertiaUK/claude-quota-proxy). Reads `anthropic-ratelimit-unified-5h-utiliza
... [+1650 chars truncated]

### Assistant | 2026-05-20T03:47:21.366Z

I'll research these four approaches for Claude Code token/quota self-awareness. Let me gather current information on each.

### Assistant | 2026-05-20T03:47:21.897Z

[tool_use: WebSearch]

### Assistant | 2026-05-20T03:47:22.818Z

[tool_use: WebSearch]

### User | 2026-05-20T03:47:51.380Z

[tool_result] Web search results for query: "ccusage claude-code token tracker JSONL transcript real-time GitHub 2026"

I'll search for that query for you.

Links: [{"title":"GitHub - junhoyeo/tokscale: 🛰️ A CLI tool for tracking token usage from OpenCode, Claude Code, 🦞OpenClaw (Clawdbot/Moltbot), Pi, Codex, Gemini, Cursor, AmpCode, Factory Droid, Kimi, and more! • 🏅Global Leaderboard + 2D/3D Contributions Gra
... [+6017 chars truncated]

### User | 2026-05-20T03:47:56.679Z

[tool_result] Web search results for query: "Claude Code stream-json output format usage tokens cache_creation cache_read fields"

Links: [{"title":"Claude Code's JSONL Logs Undercount Tokens by 100x","url":"https://gille.ai/en/blog/claude-code-jsonl-logs-undercount-tokens/"},{"title":"Structured outputs - Claude API Docs","url":"https://platform.claude.com/docs/en/build-with-claude/structured-outputs"},{"title
... [+6469 chars truncated]

### Assistant | 2026-05-20T03:48:00.902Z

[tool_use: WebSearch]

### Assistant | 2026-05-20T03:48:01.957Z

[tool_use: WebSearch]

### Assistant | 2026-05-20T03:48:02.236Z

[tool_use: WebSearch]

### User | 2026-05-20T03:48:24.729Z

[tool_result] Web search results for query: "claude-quota-proxy InertiaUK anthropic-ratelimit-unified-5h-utilization ToS terms of service"

I'll search for information about this query.

Links: [{"title":"Anthropic is doubling Claude Code's hourly rate limits, removing peak hours, and working with SpaceX for some reason","url":"https://www.xda-developers.com/anthropic-is-doubling-claude-codes-hourly-rate-limits
... [+4367 chars truncated]

### User | 2026-05-20T03:48:33.286Z

[tool_result] Web search results for query: "ANTHROPIC_BASE_URL official documentation proxy LiteLLM allowed terms"

Links: [{"title":"Anthropic | liteLLM","url":"https://docs.litellm.ai/docs/providers/anthropic"},{"title":"Claude Code Quickstart | liteLLM","url":"https://docs.litellm.ai/docs/tutorials/claude_responses_api"},{"title":"/v1/messages | liteLLM","url":"https://docs.litellm.ai/docs/anthropic_unified
... [+5859 chars truncated]

### User | 2026-05-20T03:48:40.454Z

[tool_result] Web search results for query: "Claude Code statusLine settings.json hook command spec configuration 2026"

I'll search for information about Claude Code's statusLine configuration.

Links: [{"title":"Customize your status line - Claude Code Docs","url":"https://code.claude.com/docs/en/statusline"},{"title":"Building a Custom Claude Code Statusline to Track Worktrees and Usage | Dan Does Code","url
... [+7712 chars truncated]

### Assistant | 2026-05-20T03:48:45.160Z

[tool_use: WebSearch]

### Assistant | 2026-05-20T03:48:46.833Z

[tool_use: WebFetch]

### User | 2026-05-20T03:48:56.765Z

[tool_result] # Claude Quota Proxy Overview

## What It Does
The proxy intercepts API traffic between Claude Code and Anthropic's servers to capture rate-limit information. It writes usage data to `~/.claude/usage-status.md` so Claude can access its quota state during conversations.

## Headers It Reads
The proxy captures seven rate-limit headers including:
- `anthropic-ratelimit-unified-5h-utilization` and `7d
... [+771 chars truncated]

### User | 2026-05-20T03:49:20.408Z

[tool_result] Web search results for query: ""claude-quota-proxy" OR "claude-code proxy" account ban anthropic reddit r/ClaudeAI"

I'll search for information about that query.

No links found.

It looks like the search didn't return any results. Let me try a broader search to find relevant information.

No links found.

Links: [{"title":"Ultimate Guide to Avoiding Claude Account Bans: 8 Pitfall-Avoidance Strat
... [+5202 chars truncated]

### Assistant | 2026-05-20T03:49:27.027Z

[tool_use: WebSearch]

### Assistant | 2026-05-20T03:49:28.568Z

[tool_use: WebFetch]

### User | 2026-05-20T03:49:34.042Z

[tool_result] # ccusage JSONL and Real-Time Capabilities

Based on the provided documentation, **the page does not specify how ccusage reads JSONL transcripts or explain its underlying data processing mechanisms**.

Regarding real-time monitoring, the documentation mentions limited functionality:

- **Statusline Integration**: The tool offers `ccusage statusline` described as "Compact usage display for Claude C
... [+679 chars truncated]

### User | 2026-05-20T03:49:49.698Z

[tool_result] Web search results for query: ""claude conductor" ScottBull stream-json wrapper interactive headless"

I'll search for that specific query about Claude Conductor.

Links: [{"title":"Run Claude Code programmatically - Claude Code Docs","url":"https://code.claude.com/docs/en/headless"},{"title":"Wrapping Claude CLI for Agentic Applications | Avasdream Blog & Streams","url":"https://avasdream.com/blo
... [+3927 chars truncated]

### Assistant | 2026-05-20T03:49:57.363Z

Task tracking isn't needed for this research task. I have enough information to deliver the analysis. Let me do one more targeted check on the precompact-handoff fit.

### Assistant | 2026-05-20T03:50:01.118Z

[tool_use: WebFetch]

### Assistant | 2026-05-20T03:50:01.378Z

[tool_use: WebSearch]

### User | 2026-05-20T03:50:09.383Z

[tool_result] # Claude Code Usage Monitor - Technical Architecture

Based on the documentation, here's how it works technically:

## Data Source
The monitor reads **local configuration files** rather than using a proxy. It accesses Claude's local session data stored at `~/.config/claude` (configurable via `CLAUDE_CONFIG_DIR`).

## Non-Interfering Operation
The tool is **read-only** and operates alongside Claude
... [+1105 chars truncated]

### User | 2026-05-20T03:50:12.290Z

[tool_result] Web search results for query: ""cccost" badlogic claude-code fetch hook interception inject monkeypatch usage"

I'll search for that query for you.

Links: [{"title":"GitHub - badlogic/cccost: Instrument Claude Code to track actual token usage and cost · GitHub","url":"https://github.com/badlogic/cccost"}]

Here are the search results for "cccost" by badlogic:

**cccost - GitHub Repository by badl
... [+1194 chars truncated]

### Assistant | 2026-05-20T03:51:21.931Z

I have enough research. Delivering the analysis now.

---

# Claude Code Token/Quota Self-Awareness — 4-Approach Survey

## 1. `--output-format stream-json --verbose` (claude-conductor pattern)

Claude Code's headless mode emits newline-delimited JSON events to stdout. Each assistant event carries a `usage` block:

```json
"usage": { "input_tokens": …, "output_tokens": …, "cache_creation_input_tokens": …, "cache_read_input_tokens": …, "service_tier": "standard" }
```

Plus `rate_limits.five_hour.{used_percentage,resets_at}` since Claude Code v1.2.80 (statusLine spec — see #4).

**Critical caveat for our use case:** `input_tokens` is written during streaming as a placeholder (`1`) and never updated to the final value. `output_tokens` excludes extended-thinking tokens (off by 10-17x). Only the two `cache_*` fields are reliable. ([Gille.ai investigation](https://gille.ai/en/blog/claude-code-jsonl-logs-undercount-tokens/))

**Interactive compatibility:** Stream-json requires `-p` (headless) mode with `--input-format stream-json`. **You cannot wrap an interactive `claude` session** the way you'd wrap headless — interactive renders TUI to stdout, not JSON. A wrapper either makes Claude Code headless (loses interactive REPL, `/commit`, built-in skills) or watches transcripts post-hoc. claude-conductor and similar wrappers are headless-only. For 13 interactive chats this is a non-starter as the primary surface; useful only for spawned subagents already running headless. ([backgroundclaude.com](https://backgroundclaude.com/blog/stream-json))

**Effort:** 4-8h to wrap headless subagents only; high if you try interactive (you'd build a pty multiplexer).
**ToS:** None — official format.

## 2. `claude-quota-proxy` (header-sniffer proxy)

Sets `ANTHROPIC_BASE_URL=http://127.0.0.1:4080`, intercepts the seven `anthropic-ratelimit-unified-*` headers, writes `~/.claude/usage-status.md` for the model to see. Repo has **no ToS warnings** but doesn't address the elephant. ([github.com/
... [+8026 chars truncated]
