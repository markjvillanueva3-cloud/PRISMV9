---
name: Playwright for online sources
description: When the user gives any online source (URL, X/Twitter link, web page), use the Playwright MCP server to fetch it — not WebFetch or WebSearch
type: feedback
originSessionId: 2570c8f5-c265-4815-ad1d-a3c4e3a5863b
---
When the user provides ANY online source — a URL, an X/Twitter post, a GitHub page, a docs page, an article — fetch it with the Playwright MCP tools (`mcp__playwright__*`), not WebFetch and not WebSearch.

**Why:** WebFetch returns HTTP 402/403 on auth-walled sites (X.com, many SPAs) and WebSearch only returns snippets. Playwright drives a real browser so it can render JS, get past soft paywalls, and return the actual page content.

**How to apply:** First reach for `mcp__playwright__browser_navigate` + `browser_snapshot` (or screenshot/extract) when handed a link. Fall back to WebFetch only if Playwright is genuinely unavailable, and say so explicitly rather than silently degrading. If the Playwright MCP server is not in the loaded tool set, tell the user it needs enabling in `enabledMcpjsonServers` (settings.json) before this preference can be honored.
