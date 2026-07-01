---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "I run Claude Code CLI on Windows and frequently hit \"server is temporarily limit"
date: "2026-05-29"
first_ts: "2026-05-29T04:23:13.691Z"
last_ts: "2026-05-29T04:25:01.603Z"
cwd: "H:\\prism-slot-golf"
messages: 35
user_msgs: 16
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-ae1b5ffeb45f9034d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# I run Claude Code CLI on Windows and frequently hit "server is temporarily limit

> **claude-code-cli** | 2026-05-29 | 35 msgs (16 user / 19 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-ae1b5ffeb45f9034d.jsonl`

## Transcript

### User | 2026-05-29T04:23:13.691Z

I run Claude Code CLI on Windows and frequently hit "server is temporarily limiting requests" (HTTP 429) when running ~22 concurrent sessions on Opus 4.8 with the 1M-context beta enabled. Today is 2026-05-28. Research the LIVE Anthropic docs + Claude Code release notes/changelog and answer concretely. Use WebFetch/WebSearch against docs.anthropic.com and the Claude Code changelog.

1. What changed in the MOST RECENT Claude Code CLI releases (May 2026, especially anything dated ~2026-05-26/27/28)? List any NEW settings.json keys or environment variables, especially ones touching: rate-limit / 429 handling, request retries/backoff, max concurrent API requests, spend/usage caps, context window, autocompact, model selection, or token budgets.

2. Is there a Claude Code setting to pin a DEFAULT model fleet-wide (force all sessions to Sonnet instead of Opus) via settings.json or env? Give the EXACT key (e.g. a top-level "model" key in settings.json, or env var like ANTHROPIC_MODEL / ANTHROPIC_DEFAULT_SONNET_MODEL / ANTHROPIC_SMALL_FAST_MODEL). 

3. Anthropic API rate limits: per-organization or per-key? Do they differ by model (Opus vs Sonnet vs Haiku) and usage tier (1-4)? Roughly what are ITPM / OTPM / RPM ceilings per tier for Opus vs Sonnet? Does the 1M-context (>200K input) beta have SEPARATE, lower rate limits? Do prompt-cache-READ tokens count toward the input-tokens-per-minute (ITPM) limit?

4. Confirm these env vars / keys are real and current, and tell me which DIRECTION to set each to MINIMIZE 429s across a large concurrent fleet (flag any wrong/deprecated): CLAUDE_CODE_DISABLE_1M_CONTEXT, CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, autoCompactWindow, CLAUDE_CODE_MAX_OUTPUT_TOKENS, CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY, ENABLE_PROMPT_CACHING_1H, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC.

Return concrete setting names + recommended values + file/location, plus the console.anthropic.com org-side levers (where to see current tier + limits, how to raise them). Cite the doc URL
... [+89 chars truncated]

### Assistant | 2026-05-29T04:23:22.901Z

I'll research the current Claude Code CLI releases and Anthropic API rate-limit docs to give you precise, actionable answers.

### Assistant | 2026-05-29T04:23:23.544Z

[tool_use: WebFetch]

### Assistant | 2026-05-29T04:23:24.432Z

[tool_use: WebFetch]

### Assistant | 2026-05-29T04:23:25.299Z

[tool_use: WebFetch]

### Assistant | 2026-05-29T04:23:32.089Z

[tool_use: WebSearch]

### Assistant | 2026-05-29T04:23:32.097Z

[tool_use: WebFetch]

### Assistant | 2026-05-29T04:23:32.101Z

[tool_use: WebSearch]

### Assistant | 2026-05-29T04:23:32.106Z

[tool_use: WebFetch]

### Assistant | 2026-05-29T04:23:32.110Z

[tool_use: WebSearch]

### User | 2026-05-29T04:23:34.973Z

[tool_result] REDIRECT DETECTED: The URL redirects to a different host.

Original URL: https://docs.anthropic.com/en/api/models/latest
Redirect URL: https://platform.claude.com/docs/en/api/models/latest
Status: 301 Moved Permanently

To complete your request, I need to fetch content from the redirected URL. Please use WebFetch again with these parameters:
- url: "https://platform.claude.com/docs/en/api/models/l
... [+183 chars truncated]

### User | 2026-05-29T04:23:34.981Z

[tool_result] REDIRECT DETECTED: The URL redirects to a different host.

Original URL: https://docs.anthropic.com/en/api/rate-limits
Redirect URL: https://platform.claude.com/docs/en/api/rate-limits
Status: 301 Moved Permanently

To complete your request, I need to fetch content from the redirected URL. Please use WebFetch again with these parameters:
- url: "https://platform.claude.com/docs/en/api/rate-limits"
... [+274 chars truncated]

### User | 2026-05-29T04:23:36.512Z

[tool_result] REDIRECT DETECTED: The URL redirects to a different host.

Original URL: https://docs.anthropic.com/en/docs/resources/getting-started-with-the-api
Redirect URL: https://platform.claude.com/docs/en/docs/resources/getting-started-with-the-api
Status: 301 Moved Permanently

To complete your request, I need to fetch content from the redirected URL. Please use WebFetch again with these parameters:
- ur
... [+260 chars truncated]

### User | 2026-05-29T04:23:36.716Z

[tool_result] # Recent Releases (May 26-28, 2026)

Based on the GitHub releases page content provided, there is **one release** in the requested timeframe:

## v0.105.0 (2026-05-28)

**Full Changelog:** [v0.104.1...v0.105.0](https://github.com/anthropics/anthropic-sdk-python/compare/v0.104.1...v0.105.0)

### Features
- **api:** Add support for `claude-opus-4-8`, mid-conversation system blocks, and `usage.output
... [+619 chars truncated]

### User | 2026-05-29T04:23:36.761Z

[tool_result] <persisted-output>
Output too large (86KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-golf\3d26f925-fe80-4be2-a165-049a54f0dc23\tool-results\toolu_013aHKzBNCU7yueR5tnGwKP2.txt

Preview (first 2KB):
> ## Documentation Index
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring fur
... [+1836 chars truncated]

### User | 2026-05-29T04:23:44.632Z

[tool_result] Web search results for query: "Claude Code CLI changelog May 2026 rate limit 429 retries concurrency"

Links: [{"title":"Rate limits - Claude API Docs","url":"https://platform.claude.com/docs/en/api/rate-limits"},{"title":"Claude Code Rate Limits Explained 2026 | Developer Guide","url":"https://www.sitepoint.com/claude-code-rate-limits-explained/"},{"title":"Claude Code Rate Limit Reached: Current
... [+2736 chars truncated]

### User | 2026-05-29T04:23:46.622Z

[tool_result] Web search results for query: "Anthropic console.anthropic.com usage tier rate limits organization settings 2026"

Links: [{"title":"Claude API Quota Tiers and Limits Explained: Complete Guide 2026 - Understanding Anthropic's Usage Tiers, Rate Limits, and Spend Limits | AI Free API","url":"https://www.aifreeapi.com/en/posts/claude-api-quota-tiers-limits"},{"title":"Rate limits - Claude API Docs","
... [+2804 chars truncated]

### User | 2026-05-29T04:23:46.828Z

[tool_result] Web search results for query: "site:code.claude.com settings.json environment variables model default autocompact token budget"

I appreciate you wanting me to search, but I should note that the search query you've provided includes special search operators (the `site:` prefix) that may not work as intended with the web search tool I have available. 

Additionally, your query appears to be looking
... [+3277 chars truncated]

### Assistant | 2026-05-29T04:23:49.227Z

Now let me fetch the actual rate-limits and models docs from the redirected URLs:

### Assistant | 2026-05-29T04:23:50.760Z

[tool_use: WebFetch]

### Assistant | 2026-05-29T04:23:51.845Z

[tool_use: WebFetch]

### Assistant | 2026-05-29T04:23:52.474Z

[tool_use: WebFetch]

### Assistant | 2026-05-29T04:23:53.347Z

[tool_use: WebFetch]

### Assistant | 2026-05-29T04:23:53.968Z

[tool_use: WebFetch]

### Assistant | 2026-05-29T04:23:54.637Z

[tool_use: WebFetch]

### User | 2026-05-29T04:23:55.648Z

[tool_result] # Rate limits

To mitigate misuse and manage capacity on the API, limits are in place on how much an organization can use the Claude API.

---

<Note>
**[Claude Platform on AWS](/docs/en/build-with-claude/claude-platform-on-aws):** The rate limits on this page apply. Billing and spend limits differ: spend limits are not available, and billing is through AWS Marketplace (not Anthropic credit purcha
... [+25513 chars truncated]

### User | 2026-05-29T04:23:58.034Z

[tool_result] I cannot provide the information you're requesting based on the web page content provided. The page shows only a "Not Found - Loading..." message, which means the Claude API documentation page failed to load or doesn't exist at that URL.

To get the current information you're looking for, I recommend:

1. **Visit the official Anthropic documentation**: https://docs.anthropic.com
2. **Check the mod
... [+1012 chars truncated]

### User | 2026-05-29T04:23:58.068Z

[tool_result] # Service tiers

Different tiers of service allow you to balance availability, performance, and predictable costs based on your application's needs.

---

Anthropic offers three service tiers:
- **Priority Tier:** Best for workflows deployed in production where time, availability, and predictable pricing are important
- **Standard:** Default tier for both piloting and scaling everyday use cases
- 
... [+5272 chars truncated]

### User | 2026-05-29T04:24:03.014Z

[tool_result] # Model and Performance-Related Settings in settings.json

Based on the documentation provided, here are the settings.json keys related to model selection and related configurations:

## Model Selection

| Key | Description |
|-----|-------------|
| `model` | Override the default model to use for Claude Code. `--model` and `ANTHROPIC_MODEL` override this for one session. Example: `"claude-sonnet-4
... [+1186 chars truncated]

### User | 2026-05-29T04:24:06.748Z

[tool_result] # Claude Code Changes in May 2026 (May 26 onward)

Based on the changelog, there are **no updates listed after May 29, 2026**. The latest version shown is **2.1.156** (May 29, 2026).

## Notable May 2026 Changes (Full Month)

### Rate Limiting & Retries
- **2.1.126**: Improved auto-updater to retry transient network failures with specific error reporting
- **2.1.141**: Fixed background side-querie
... [+1143 chars truncated]

### User | 2026-05-29T04:24:08.830Z

[tool_result] # Claude Code Environment Variables: Model, Performance & Context

## Model Configuration

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_MODEL` | Name of the model setting to use |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Override default Sonnet-class model |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Override default Opus-class model |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Override default Haiku-c
... [+3621 chars truncated]

### Assistant | 2026-05-29T04:24:11.353Z

Excellent. Now let me search for the exact latest Claude Code release notes to confirm v2.1.156 and any 2026-05-28 specifics:

### Assistant | 2026-05-29T04:24:12.247Z

[tool_use: WebFetch]

### User | 2026-05-29T04:24:24.393Z

[tool_result] # Claude Code Releases (May 26-28, 2026)

## Version Numbers and Dates

1. **v2.1.156** - May 29, 01:42 (within your range)
2. **v2.1.154** - May 28, 18:00
3. **v2.1.153** - May 28, 00:52

## What Changed

### Rate Limits & Retries
- **v2.1.154**: "Fast mode on Opus 4.8 is now available at a fraction of its previous cost: 2x the standard rate for 2.5x the speed"
- **v2.1.153**: Improved auto-updat
... [+929 chars truncated]

### Assistant | 2026-05-29T04:25:01.603Z

Perfect. Now I have the concrete data. Let me compile the comprehensive answer:

---

## Answers to Your Questions

### 1. **Most Recent Claude Code Releases (May 2026, especially 2026-05-26/27/28)**

**Latest versions:**
- **v2.1.156** (2026-05-29) — Fixed Opus 4.8 thinking blocks being modified
- **v2.1.154** (2026-05-28) — **MAJOR: Opus 4.8 is now the default model** + fast mode (2x rate, 2.5x speed)
- **v2.1.153** (2026-05-28) — Fixed 1M-context completion-notification premature-OOC bug

**Key changes touching your 429 pain points:**

| Setting/Variable | What Changed | Recommendation |
|---|---|---|
| `model` (settings.json) | **NEW DEFAULT: `claude-opus-4-8`** (v2.1.154) | Your fleet likely auto-upgraded to Opus 4.8; verify with `claude --model` |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | Improved reactive compaction (v2.1.152): now seeds summary from original request overflow size, avoiding wasted near-full retries | **Set to 75–80** (not 95) to compact *earlier* and leave breathing room |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | No direct change, but interacts with lean system prompt (v2.1.154) | Your config has `85000` — confirm it's not consuming excess context |
| `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` | No change (still default `10`); your config set to `20` | **Leave at 20** for YOLO fleet; monitor actual concurrent requests |
| `ENABLE_PROMPT_CACHING_1H` | No change to the knob; caching now auto-optimizes (v2.1.154) | Ensure it's **enabled (`1`)** — critical for ITPM efficiency |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` | **Not mentioned in May releases**; 1M beta is live | Confirm your setting: `"0"` = 1M enabled (current). If `1`, set to `0` to get 1M |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | No change | Keep enabled (`1`) for fleet stability |

---

### 2. **Model Default Fleet-Wide: YES, EXACT SETTINGS**

**Goal:** Force all 22 sessions to Sonnet instead of Opus 4.8.

#### **Option A: settings.json (Recommended for fleet-wide pin)**

```json
{
  "env": {
 
... [+7845 chars truncated]
