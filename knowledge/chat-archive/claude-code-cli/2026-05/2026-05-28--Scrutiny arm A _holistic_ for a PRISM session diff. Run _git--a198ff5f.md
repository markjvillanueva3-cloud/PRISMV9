---
type: "chat-session"
source: "claude-code-cli"
session_id: "a198ff5f-9c3d-44ad-a040-50b918b0a91a"
title: "Scrutiny arm A (holistic) for a PRISM session diff. Run `git -C H:/prism diff --"
date: "2026-05-28"
first_ts: "2026-05-28T23:37:14.025Z"
last_ts: "2026-05-28T23:38:56.199Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 9
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/agent-afbf252b5d22f86e3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Scrutiny arm A (holistic) for a PRISM session diff. Run `git -C H:/prism diff --

> **claude-code-cli** | 2026-05-28 | 24 msgs (9 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/agent-afbf252b5d22f86e3.jsonl`

## Transcript

### User | 2026-05-28T23:37:14.025Z

Scrutiny arm A (holistic) for a PRISM session diff. Run `git -C H:/prism diff --cached` (4 files: mcp-tool-domains.mjs [new], mcp-tool-domains.test.mjs [new], mcp-http-bridge.mjs [edited], slot-context-bundle-inject.mjs [1-line]).

CONTEXT: This is Tier-1 of an MCP consolidation. We dropped `prism_safe` (per-chat stdio monolith) in a prior commit, so `mcp-http-bridge.mjs` is now the SOLE PRISM tool surface for the whole 26-chat fleet — a bug that drops tools = fleet-wide tool loss. The change adds a domain FILTER: each chat can set MCP_TOOL_DOMAINS env to narrow tools/list to its galaxy's dispatchers. It MUST fail-open (no env → all 90 tools, unchanged). Already proven live: unfiltered=90 tools, MCP_TOOL_DOMAINS=compute=48 tools (session/ALWAYS kept, quoting/ai excluded); 15/15 unit tests pass.

VERIFY and grade PASS/FAIL with P0/P1:
1. Is the fail-open guarantee real end-to-end? Trace: empty TOOL_DOMAINS → bridge skips filter entirely (line ~381 guard)? buildAllowSet returns null on empty/unknown-only → filterToolList returns input unchanged? Any path where a filter MISS drops a tool instead of keeping it?
2. Is the filter at the correct chokepoint (the single tools/list response site) without touching the queue/retry/forward logic?
3. Is the domain map (DOMAIN_DISPATCHERS + ALWAYS) sensible — are session/handoff/build/scrutiny/memory universal tools in ALWAYS so no chat loses them?
4. Does the try/catch around the filter guarantee an exception leaves the response untouched (not dropped)?
Report concisely. End with "VERDICT: PASS" or "VERDICT: FAIL".

### Assistant | 2026-05-28T23:37:26.048Z

I'll review the staged diff against the four verification points. Let me start by reading all four files.

### Assistant | 2026-05-28T23:37:26.590Z

[tool_use: Bash]

### User | 2026-05-28T23:37:30.514Z

[tool_result] .claude/helpers/mcp-http-bridge.mjs          |  33 +++++
 .claude/helpers/mcp-tool-domains.mjs         | 173 +++++++++++++++++++++++++++
 .claude/helpers/mcp-tool-domains.test.mjs    | 126 +++++++++++++++++++
 .claude/hooks/slot-context-bundle-inject.mjs |   2 +-
 4 files changed, 333 insertions(+), 1 deletion(-)

### Assistant | 2026-05-28T23:37:34.951Z

I'll read all four files in full.

### Assistant | 2026-05-28T23:37:35.434Z

[tool_use: Read]

### Assistant | 2026-05-28T23:37:35.915Z

[tool_use: Read]

### User | 2026-05-28T23:37:38.323Z

[tool_result] 1	/**
2	 * mcp-tool-domains.mjs — Tier-1 MCP tool-domain filter map
3	 * (MCP-CONSOLIDATION-MS0 / U-MCP-TOOL-DOMAINS, slot:alpha 2026-05-28)
4	 *
5	 * The operator's "4-5 MCP servers split between the primary chats" idea, realized as a
6	 * FILTER on the one shared :3100 backend instead of N separate server processes. The
7	 * mcp-http-bridge narrows its tools/list to the chat's galaxy domains via
... [+8016 chars truncated]

### User | 2026-05-28T23:37:38.646Z

[tool_result] 1	/**
2	 * Tests for mcp-tool-domains.mjs — the Tier-1 MCP tool-domain filter.
3	 * Run: node --test H:/prism/.claude/helpers/mcp-tool-domains.test.mjs
4	 *
5	 * These tests encode the load-bearing INTENT (R9): the filter must FAIL OPEN.
6	 * The bridge is the sole PRISM surface (prism_safe was dropped 2026-05-28), so an
7	 * over-aggressive filter = fleet-wide tool loss. Every test below would FA
... [+6167 chars truncated]

### Assistant | 2026-05-28T23:37:42.365Z

Now the bridge edit and the 1-line hook change.

### Assistant | 2026-05-28T23:37:43.611Z

[tool_use: Bash]

### User | 2026-05-28T23:37:48.497Z

[tool_result] .claude/helpers/mcp-http-bridge.mjs          | 33 ++++++++++++++++++++++++++++
 .claude/hooks/slot-context-bundle-inject.mjs |  2 +-
 2 files changed, 34 insertions(+), 1 deletion(-)

--- Changes ---

.claude/helpers/mcp-http-bridge.mjs
  @@ -41,6 +41,7 @@ import { randomUUID } from "crypto";
  +import { filterToolList, resolveDomainsFromEnv } from "./mcp-tool-domains.mjs";
   
   // Configuration
... [+2691 chars truncated]

### Assistant | 2026-05-28T23:37:53.514Z

I have the full picture. Let me verify the integration points against the bridge file — specifically the exact context surrounding the filter insertion (the guard, and whether `tools/list` responses flow through this single chokepoint) and confirm there isn't a second tools/list response path that bypasses the filter.

### Assistant | 2026-05-28T23:37:54.401Z

[tool_use: Bash]

### User | 2026-05-28T23:38:01.232Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
12 matches in 3 files:

376:0:narrow tools/list to this chat's galaxy domains so a chat
392:0:response.result.tools.length,
H:/prism/.claude/helpers/mcp-http-bridge.mjs:351:async function handleStdioMessage(line) {
H:/prism/.claude/helpers/mcp-http-bridge.mjs:382:request.method === "tools/list" &&
H:/p
... [+834 chars truncated]

### Assistant | 2026-05-28T23:38:05.993Z

Let me read the full `handleStdioMessage` function (351-410) and check whether there's a separate HTTP/SSE response path that emits tools/list outside this stdio handler.

### Assistant | 2026-05-28T23:38:06.915Z

[tool_use: Read]

### Assistant | 2026-05-28T23:38:08.112Z

[tool_use: Bash]

### User | 2026-05-28T23:38:09.615Z

[tool_result] 345	  });
346	}
347	
348	/**
349	 * Handle incoming stdio messages (JSON-RPC from Claude)
350	 */
351	async function handleStdioMessage(line) {
352	  let request;
353	  try {
354	    request = JSON.parse(line);
355	  } catch (e) {
356	    log("error", "Invalid JSON from stdin", { line: line.slice(0, 100) });
357	    return;
358	  }
359	
360	  // Handle JSON-RPC request or notification.
361	  // Sp
... [+2252 chars truncated]

### User | 2026-05-28T23:38:16.215Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
8 matches in 2 files:

392:0:response.result.tools.length,
H:/prism/.claude/helpers/mcp-http-bridge.mjs:179:async function forwardToHttp(jsonRpcRequest) {
H:/prism/.claude/helpers/mcp-http-bridge.mjs:248:return await forwardToHttp(request);
H:/prism/.claude/helpers/mcp-http-bridge.mjs:382:request.metho
... [+454 chars truncated]

### Assistant | 2026-05-28T23:38:21.596Z

I now have everything needed. Let me confirm the single forwarding chokepoint — verify that `queueRequest` ultimately routes through `forwardToHttp` (so all responses, including tools/list, return through the one `handleStdioMessage` site that now hosts the filter), and that there's no parallel response emitter.

### Assistant | 2026-05-28T23:38:22.651Z

[tool_use: Read]

### User | 2026-05-28T23:38:25.581Z

[tool_result] 230	}
231	
232	/**
233	 * Forward with retry. Connection-class failures trigger: self-heal spawn +
234	 * backoff + retry, until the per-method budget is exhausted. `initialize`
235	 * gets a long budget so the MCP handshake outlasts a server cold start.
236	 */
237	async function forwardWithRetry(request) {
238	  const isInit = request.method === "initialize";
239	  const budget = isInit ? INIT_R
... [+780 chars truncated]

### Assistant | 2026-05-28T23:38:56.199Z

I have a complete trace of all four verification points. The single response chokepoint is confirmed: `handleStdioMessage` → `queueRequest` → `forwardWithRetry` → `forwardToHttp`, with exactly one `process.stdout.write` site at line 403, and the filter sits between the await and that write. Notifications return early (line 373) before the filter and never write a response, so they're untouched. No parallel tools/list emitter exists.

Findings against the four points:

**1. Fail-open end-to-end — REAL.** Two independent layers both default to keep:
- Startup: `TOOL_DOMAINS = resolveDomainsFromEnv()` returns `""` when neither env var is set. The bridge guard at line 381 (`if (TOOL_DOMAINS && ...)`) short-circuits on the falsy `""`, so the filter block never runs — `before`/`after` are never computed and the response is written verbatim. Today (no env set) this is a literal no-op.
- Filter layer: `filterToolList` returns the input array on non-array (line 169) and `buildAllowSet` returns `null` on empty/blank CSV (135), empty-after-split (140), and unknown-only domains (142). On `null` ctx, `filterToolList` returns the same array reference (171) — the test at line 79 asserts reference identity, which is the strongest possible fail-open proof.
- `isToolAllowed` keep-order is correct: `!ctx`→true, `!name`→true, `allow.has`→true, non-`prism_`→true, unmapped→true, and only a *mapped* prism tool in a non-requested domain returns false. There is no path where a filter *miss* drops a tool — every uncertainty resolves to keep. A tool with `name === undefined` (line 157 `!name`) is kept, so a malformed descriptor can't be silently dropped.

**2. Correct chokepoint — YES.** The filter is inserted after `await queueRequest(request)` and before the sole `process.stdout.write`, touching only `response.result.tools`. It does not touch `queueRequest`, `forwardWithRetry`, `forwardToHttp`, the retry/backoff, or the notification path (which returns at line 373 before reaching the filter
... [+2992 chars truncated]
