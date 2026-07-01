---
title: "Playwright for online sources"
name: playwright-for-online-sources
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_playwright_for_online_sources.md
promoted_at: 2026-06-06T04:55:50.511Z
source_refs: 13
---

# Playwright for online sources

When the user provides ANY online source — a URL, an X/Twitter post, a GitHub page, a docs page, an article — fetch it with the Playwright MCP tools (`mcp__playwright__*`), not WebFetch and not WebSearch.

**Why:** WebFetch returns HTTP 402/403 on auth-walled sites (X.com, many SPAs) and WebSearch only returns snippets. Playwright drives a real browser so it can render JS, get past soft paywalls, and return the actual page content.

**How to apply:** First reach for `mcp__playwright__browser_navigate` + `browser_snapshot` (or screenshot/extract) when handed a link. Fall back to WebFetch only if Playwright is genuinely unavailable, and say so explicitly rather than silently degrading. If the Playwright MCP server is not in the loaded tool set, tell the user it needs enabling in `enabledMcpjsonServers` (settings.json) before this preference can be honored.

## Source

Promoted from memory [[feedback_playwright_for_online_sources]] (referenced 13x across the vault). The memory remains the editable source of truth.
