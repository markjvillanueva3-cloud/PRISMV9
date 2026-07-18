---
type: "chat-session"
source: "claude-code-cli"
session_id: "ca9b9050-43d7-4390-93f4-e31f19be4b82"
title: "I'm auditing a security exposure in the PRISM quoting app (a TypeScript MCP serv"
date: "2026-06-24"
first_ts: "2026-06-24T02:33:44.636Z"
last_ts: "2026-06-24T02:33:45.736Z"
cwd: "H:\\prism\\mcp-server"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-a9355f42a8f627fe4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:49"
---

# I'm auditing a security exposure in the PRISM quoting app (a TypeScript MCP serv

> **claude-code-cli** | 2026-06-24 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-a9355f42a8f627fe4.jsonl`

## Transcript

### User | 2026-06-24T02:33:44.636Z

I'm auditing a security exposure in the PRISM quoting app (a TypeScript MCP server). I need you to trace EXACTLY how the frontend reaches the `quote.ts` route's actions, and whether those calls carry an auth token.

CONTEXT — the route file `H:/prism/mcp-server/src/routes/quote.ts` defines `createQuoteRouter` mounted at `/api/v1/quote`. It has ~30 named routes like `router.post("/generate", quotePost(callTool, "quoting_generate"))` that each call `callTool("prism_business", action, req.body)` with NO `verifyToken` middleware — they are mounted under `/api` which only has `optionalToken` (attaches a user if a Bearer is present but NEVER rejects anonymous). So these routes are UNAUTHENTICATED-reachable. A sibling route file `H:/prism/mcp-server/src/routes/erp.ts` mounts `/api/v1/erp/quote/generate` behind `verifyToken` → the SAME `quoting_generate` action (so there's an authenticated duplicate path).

The sensitive actions on quote.ts are: `quoting_generate`, `quote_estimate`, `quote_what_if`, `quoting_price_breaks` (these return the full margin/cost quote via QuoteEstimatorEngine.estimate) and the lower-sensitivity `material_price_lookup`/`material_price_compare`/`material_surcharge` (public commodity-market prices).

YOUR TASKS — report findings with exact file:line citations:

1. In `H:/prism/mcp-server/web/src/`, find EVERY frontend caller of the quote.ts routes. The frontend uses a `request('POST', '/quote/generate', ...)` style wrapper. Key files to read: `web/src/api/client.ts` (around lines 1340-1420 and 1980-1990), `web/src/api/shop.ts` (around 370-455), `web/src/api/erp.ts` (around 72-80), `web/src/api/wedmErp.ts`. For each caller, report: which route path it hits (`/quote/...` = unauthed quote.ts vs `/erp/quote/...` = authed erp.ts vs `/wedm-erp/quote/...`), and whether the `request`/`post` wrapper it uses attaches a Bearer/Authorization token.

2. Read the `request` function definition in `web/src/api/client.ts` (and any `post`/`erpPost`/`apiFetch` helpers
... [+989 chars truncated]

### Assistant | 2026-06-24T02:33:45.736Z

Prompt is too long · the request is ~207129 tokens (limit 200000) but this conversation is only ~6680 tokens — the rest is system prompt, tool definitions, and attachment content. A single-exchange conversation cannot be compacted; reduce attached files/tools or start with less context.
