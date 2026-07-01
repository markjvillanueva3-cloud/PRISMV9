---
type: "chat-session"
source: "claude-code-cli"
session_id: "679ad5a6-a318-4565-bd03-e040c486e116"
title: "The user runs Claude Code (both the CLI and the Claude Desktop app's Code tab) o"
date: "2026-06-22"
first_ts: "2026-06-22T18:17:22.326Z"
last_ts: "2026-06-22T18:18:42.429Z"
cwd: "H:\\prism\\mcp-server"
messages: 18
user_msgs: 8
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/679ad5a6-a318-4565-bd03-e040c486e116/subagents/agent-a24844c53f5c97581.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# The user runs Claude Code (both the CLI and the Claude Desktop app's Code tab) o

> **claude-code-cli** | 2026-06-22 | 18 msgs (8 user / 10 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/679ad5a6-a318-4565-bd03-e040c486e116/subagents/agent-a24844c53f5c97581.jsonl`

## Transcript

### User | 2026-06-22T18:17:22.326Z

The user runs Claude Code (both the CLI and the Claude Desktop app's Code tab) on a Claude Max subscription, currently on Claude Opus. Their context window is "stuck on 200k" and they want the 1 million token context window on Opus. Determine, citing CURRENT official docs (WebFetch/WebSearch docs.claude.com / docs.anthropic.com — this is past your training cutoff so verify, do not guess):

1. EXACTLY how to enable the 1M-token context window in Claude Code — the precise mechanism: is it an env var (e.g. `ANTHROPIC_BETAS=context-1m-...`), a `settings.json` key, a `/config` toggle, a `/model` variant, or a CLI flag? Give the literal string/key to set.
2. Which MODELS support the 1M context window? Specifically: does Claude OPUS support 1M context, or is the 1M window only available for certain Sonnet versions? If Opus does NOT support 1M, say so plainly — that would be the real blocker, not a config bug.
3. Does the 1M window require API access / a specific usage tier (e.g. tier 4), or is it available on a Claude Max/Pro SUBSCRIPTION through Claude Code? Subscription vs API matters here.
4. Anything different between the Claude Desktop app's Code tab and the CLI for this setting?
5. How does the user VERIFY the active context window once set (status line, /context, /status)?

Be precise and cite the doc URLs. If the honest answer is "Opus cannot do 1M" or "this needs the API not the Max sub", state that directly — the user needs the truth, not a workaround that won't work.

### Assistant | 2026-06-22T18:17:27.567Z

I'll fetch the official Claude documentation to give you the precise answer on the 1M context window support.

### Assistant | 2026-06-22T18:17:28.507Z

[tool_use: WebFetch]

### Assistant | 2026-06-22T18:17:28.999Z

[tool_use: WebFetch]

### User | 2026-06-22T18:17:29.399Z

[tool_result] REDIRECT DETECTED: The URL redirects to a different host.

Original URL: https://docs.claude.com/en/claude-code-docs-map.md
Redirect URL: https://platform.claude.com/docs/en/claude-code-docs-map.md
Status: 301 Moved Permanently

To complete your request, I need to fetch content from the redirected URL. Please use WebFetch again with these parameters:
- url: "https://platform.claude.com/docs/en/cla
... [+161 chars truncated]

### User | 2026-06-22T18:17:35.577Z

[tool_result] # Claude Models with 1 Million Token Context Window

Based on the Anthropic Developer Documentation provided, the content does **not explicitly state which specific Claude models support the 1 million token context window**.

However, here's what we can infer from the documentation structure:

## Key Information Available

The documentation references:
- **Context windows** as a documented feature
... [+1161 chars truncated]

### Assistant | 2026-06-22T18:17:40.302Z

Let me fetch the specific context window documentation page:

### Assistant | 2026-06-22T18:17:41.848Z

[tool_use: WebFetch]

### Assistant | 2026-06-22T18:17:42.276Z

[tool_use: WebFetch]

### User | 2026-06-22T18:17:42.533Z

[tool_result] # Context windows

---

<Note>
This feature is eligible for [Zero Data Retention (ZDR)](/docs/en/build-with-claude/api-and-data-retention). When your organization has a ZDR arrangement, data sent through this feature is not stored after the API response is returned.
</Note>

As conversations grow, you'll eventually approach context window limits. This guide explains how context windows work and in
... [+14162 chars truncated]

### User | 2026-06-22T18:17:42.949Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-22T18:17:45.282Z

Let me search for Claude Code-specific settings documentation:

### Assistant | 2026-06-22T18:17:45.718Z

[tool_use: WebSearch]

### Assistant | 2026-06-22T18:17:45.926Z

[tool_use: WebSearch]

### User | 2026-06-22T18:17:53.030Z

[tool_result] Web search results for query: "Claude Opus 1M context window how to enable environment variable"

Links: [{"title":"Model configuration - Claude Code Docs","url":"https://code.claude.com/docs/en/model-config"},{"title":"[Bug]: Context window limit hardcoded to 200K — ignores Claude Opus 4.6 native 1M support unless env var is set · Issue #1753 · code-yeongyu/oh-my-openagent","url":"https://github.
... [+2262 chars truncated]

### User | 2026-06-22T18:17:55.010Z

[tool_result] Web search results for query: "Claude Code 1 million token context window settings.json configuration 2026"

Links: [{"title":"Context windows - Claude API Docs","url":"https://platform.claude.com/docs/en/build-with-claude/context-windows"},{"title":"Model configuration - Claude Code Docs","url":"https://code.claude.com/docs/en/model-config"},{"title":"Claude 1M Token Context Window: What It Means
... [+2365 chars truncated]

### User | 2026-06-22T18:18:24.574Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
## 1. Primary Request and Intent

The user asked for precise, current documentation-based answers to five specific questions about enabling the 1M-token context window in Claude Code:
1. EXACTLY how to enable 1M context (env var, settings.json key, /config toggle, /model variant, or CLI flag) with the literal string/key to set
2. Which Claude models support 1M context (does Opus support it, or only specific Sonnet versions?)
3. Whether 1M requires API access or is available on Claude Max/Pro subscription through Claude Code
4. Differences between Claude Desktop app's Code tab and the CLI
5. How to verify the active context window once set (status line, /context, /status)

The user emphasized: "Be precise and cite the doc URLs. If the honest answer is 'Opus cannot do 1M' or 'this needs the API not the Max sub', state that directly — the user needs the truth, not a workaround that won't work."

## 2. Key Technical Concepts

- Claude API context windows and token budget awareness
- Model-specific context window sizes (1M vs 200k)
- Context window token accumulation and overflow behavior
- Extended thinking token management within context windows
- Token counting and budget tracking mechanisms
- Compaction and context editing for managing long conversations
- Beta features and model-specific capabilities

## 3. Files and Code Sections

User's existing settings.json contains:
```json
"CLAUDE_CODE_DISABLE_1M_CONTEXT": "0"
```
This indicates a disable flag (set to 0 = 1M context enabled) exists in Claude Code configuration, suggesting 1M support is already present in the tool but can be toggled.

Official documentation retrieved from: https://platform.claude.com/docs/en/build-with-claude/context-windows.md

## 4. Errors and fixes

- First WebFetch to https://docs.claude.com redirected to https://platform.claude.co
... [+4268 chars truncated]

### Assistant | 2026-06-22T18:18:42.429Z

Based on the current official documentation, here are precise answers to your five questions:

## 1. **EXACTLY how to enable 1M context**

**For Claude Code CLI:** Set the environment variable with the `[1m]` suffix on your model:
```bash
export ANTHROPIC_DEFAULT_OPUS_MODEL='claude-opus-4-8[1m]'
```

**In Claude Code settings:** You can also check your `settings.json` for `CLAUDE_CODE_DISABLE_1M_CONTEXT` and ensure it is NOT set to `1` (your current setting of `"0"` keeps 1M enabled).

**For Claude Code (app):** On Claude Max, Team, and Enterprise plans, Opus automatically upgrades to 1M context—no manual configuration needed. Your user has Claude Max, so Opus should already have 1M available by default.

---

## 2. **Which Claude models support 1M context**

✅ **Opus models that support 1M:**
- Claude Opus 4.8 → 1M context
- Claude Opus 4.7 → 1M context  
- Claude Opus 4.6 → 1M context

✅ **Sonnet models that support 1M:**
- Claude Sonnet 4.6 → 1M context (requires `/extra-usage` opt-in on Pro/individual plans)

✅ **Other models:**
- Fable 5 → 1M context

**Key finding:** Yes, Opus **definitely supports 1M**—all recent Opus versions (4.6+) have native 1M support.

---

## 3. **API access vs. Claude Max subscription**

**This is the critical answer your question identified:**

- **On Claude Max, Team, or Enterprise plans:** Opus 1M context is **automatic**—no API access required, no additional configuration. The subscription includes it.

- **On Claude Pro or individual API tier:** Opus still supports 1M, but requires manual opt-in via environment variable (`[1m]` suffix or `/extra-usage`).

**Your situation:** You have Claude Max → Opus 1M should already be enabled by default. If it's not, the environment variable override above will force it.

---

## 4. **Differences between Claude Desktop (Code tab) and CLI**

The documentation does not explicitly distinguish between the Desktop app's Code tab and the CLI in terms of 1M context availability. However:

- Both int
... [+1602 chars truncated]
