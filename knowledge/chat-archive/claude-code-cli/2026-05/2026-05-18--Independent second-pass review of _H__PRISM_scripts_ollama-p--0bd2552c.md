---
type: "chat-session"
source: "claude-code-cli"
session_id: "0bd2552c-f488-4919-a1de-61b8dee1f055"
title: "Independent second-pass review of `H:\\PRISM\\scripts\\ollama-prism-bridge.mjs` (re"
date: "2026-05-18"
first_ts: "2026-05-18T03:04:26.032Z"
last_ts: "2026-05-18T03:07:20.966Z"
cwd: "H:\\prism"
messages: 27
user_msgs: 10
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/0bd2552c-f488-4919-a1de-61b8dee1f055/subagents/agent-af47c1031bf2f7570.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Independent second-pass review of `H:\PRISM\scripts\ollama-prism-bridge.mjs` (re

> **claude-code-cli** | 2026-05-18 | 27 msgs (10 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0bd2552c-f488-4919-a1de-61b8dee1f055/subagents/agent-af47c1031bf2f7570.jsonl`

## Transcript

### User | 2026-05-18T03:04:26.032Z

Independent second-pass review of `H:\PRISM\scripts\ollama-prism-bridge.mjs` (read the WHOLE file end-to-end). This is U-OE-BRIDGE-L2 — an Ollama agentic harness that lets a local Ollama model autonomously chain 3 read-only PRISM knowledge tools (viz_search, wiki_lookup, read_excerpt) via the Ollama `/api/chat` `tools` API.

Do NOT assume a parallel reviewer caught everything. Weight your review toward what a correctness-focused reviewer is likely to MISS:

1. INTEGRATION with already-built code: it imports `loadGraph, searchGraph, renderHits, readFileCapped, truncate, savingsFooter` from sibling `H:\PRISM\scripts\ask-ollama.mjs`. Read ask-ollama.mjs. Verify: (a) every imported name is actually exported, (b) the call sites in this file pass the argument shapes those functions expect (e.g. `loadGraph({root})`, `readFileCapped(path,{root})`, `searchGraph(query,graph,maxHits)`, `savingsFooter(inChars,outChars)`), (c) importing ask-ollama.mjs runs no top-level side effects.
2. CONVENTION conformance: does this file match ask-ollama.mjs's style (docblock format, named-constant discipline, exit-code scheme 0/2/3, fail-loud error strings, `INVOKED_DIRECTLY` guard)? Flag silent style forks.
3. The Ollama `/api/chat` HTTP contract: is the request body shape correct (model, messages, tools, stream:false, keep_alive, options)? Is the response parsed defensively (`json.message`, `message.tool_calls`, `message.content`)? Tool-result messages — is the `{role:"tool", ...}` shape one Ollama accepts?
4. ERROR BUDGET completeness: timeout / AbortController cleanup; Ollama down; HTTP non-2xx; malformed JSON response; a tool that returns a huge string (is TOOL_RESULT_MAX_BYTES enforced on EVERY path including the error path?).
5. SECURITY: `read_excerpt` lets the model choose a path. Confirm `confinePath` cannot be bypassed. Also: could a crafted tool result inject fake instructions back into the loop (prompt injection) — is that acceptable for a local read-only dev tool, or a real con
... [+346 chars truncated]

### Assistant | 2026-05-18T03:04:33.121Z

I'll review this file thoroughly. Let me start by reading both files.

### Assistant | 2026-05-18T03:04:33.508Z

[tool_use: Read]

### Assistant | 2026-05-18T03:04:33.771Z

[tool_use: Read]

### User | 2026-05-18T03:04:35.001Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\ollama-prism-bridge.mjs' was already read 12s ago in this session and is unchanged (mtime 1779073413948). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-18T03:04:35.689Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\ask-ollama.mjs' was already read 6m ago in this session and is unchanged (mtime 1779071845620). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T03:04:47.000Z

The read-once guard says both files are already in my context, but I need to actually verify their contents. Let me bypass the cache to get the current content of both files.

### Assistant | 2026-05-18T03:04:47.802Z

[tool_use: Bash]

### User | 2026-05-18T03:04:55.355Z

[tool_result] 658 ollama-prism-bridge.mjs
509 ask-ollama.mjs
Σ 1167

### Assistant | 2026-05-18T03:04:57.192Z

I need the actual file contents. Let me disable the cache and read them.

### Assistant | 2026-05-18T03:04:58.078Z

[tool_use: Bash]

### User | 2026-05-18T03:05:03.381Z

[tool_result]   1 │ #!/usr/bin/env node
  2 │ /**
  3 │  * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
  4 │  *
  5 │  * Routes token-heavy work to a LOCAL Ollama model so it never enters the
  6 │  * Claude context window. Claude invokes this via Bash; only the compact
  7 │  * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
  8 │  * files, build-error dumps 
... [+23574 chars truncated]

### Assistant | 2026-05-18T03:05:05.698Z

That hook context is a false positive — the `cat` command succeeded. Now let me read the bridge file itself.

### Assistant | 2026-05-18T03:05:06.735Z

[tool_use: Bash]

### User | 2026-05-18T03:05:15.172Z

[tool_result] <persisted-output>
Output too large (31.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--PRISM\0bd2552c-f488-4919-a1de-61b8dee1f055\tool-results\b6sb88tkh.txt

Preview (first 2KB):
  1 │ #!/usr/bin/env node
  2 │ /**
  3 │  * ollama-prism-bridge.mjs — Ollama → PRISM agentic harness (OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2)
  4 │  *
  5 │  * Layer 2 of the OLLAMA→PRISM-MCP bridge ladder (Lay
... [+1744 chars truncated]

### Assistant | 2026-05-18T03:05:18.150Z

[tool_use: Read]

### User | 2026-05-18T03:05:20.214Z

[tool_result] 1	  1 │ #!/usr/bin/env node
2	  2 │ /**
3	  3 │  * ollama-prism-bridge.mjs — Ollama → PRISM agentic harness (OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2)
4	  4 │  *
5	  5 │  * Layer 2 of the OLLAMA→PRISM-MCP bridge ladder (Layer 1 = ask-ollama.mjs).
6	  6 │  *
7	  7 │  * Ollama is a model server, NOT an MCP client — it cannot "connect to MCP".
8	  8 │  * This script is the missing harness: it acts as the age
... [+31521 chars truncated]

### Assistant | 2026-05-18T03:05:24.373Z

I have both files in full. Now let me verify a few specific concerns before finalizing my review.

**Concern 1 — `WIKI_INDEX_REL` path correctness.** The bridge reads `knowledge/wiki/architecture/index.md`. But CLAUDE.md repeatedly references `wiki/index.md` (722-entry catalog) at `H:/prism/knowledge/wiki/index.md`, NOT under `architecture/`. Let me verify which path actually exists.

### Assistant | 2026-05-18T03:05:25.808Z

[tool_use: Bash]

### User | 2026-05-18T03:05:31.786Z

[tool_result] MISSING: H:/prism/knowledge/wiki/architecture/index.md
EXISTS: H:/prism/knowledge/wiki/index.md (206734 bytes, 1360 lines)

### Assistant | 2026-05-18T03:05:35.508Z

Confirmed — that's a real P1 bug. The `wiki_lookup` tool will always fail. Let me check the `architecture/` directory to be thorough, and verify the test file exists.

### Assistant | 2026-05-18T03:05:36.837Z

[tool_use: Bash]

### User | 2026-05-18T03:05:41.623Z

[tool_result] H:/prism/knowledge/wiki/architecture/_disconnected-graph-nodes.md
H:/prism/knowledge/wiki/architecture/_orphans-rescue.md
H:/prism/knowledge/wiki/architecture/_stats.md
H:/prism/knowledge/wiki/architecture/action-trace-engine.md
H:/prism/knowledge/wiki/architecture/agent-status-overlay.md
---count---
322
---test file---
-rwxr-xr-x 1 wompu 197611 26703 May 17 22:03 H:/prism/scripts/ollama-prism-bri
... [+7 chars truncated]

### Assistant | 2026-05-18T03:05:48.707Z

`knowledge/wiki/architecture/` exists with 322 wiki leaf files but **no `index.md`**. The catalog index is at `knowledge/wiki/index.md`. Also confirmed: **no test file exists** for `ollama-prism-bridge.mjs` — no `*.test.mjs` sibling.

Now let me verify the Ollama `/api/chat` tool-result message contract — specifically whether `{role:"tool", content:...}` without `tool_call_id` is what Ollama expects, and check the `searchGraph` arg order issue.

The `searchGraph` signature in ask-ollama.mjs is `searchGraph(query, graph, maxHits)`. The bridge calls `searchGraph(query, graphCache.graph, maxHits)` at line 369 — correct order. `loadGraph({root})` at line 367 — correct. `readFileCapped(path, {root})` at lines 377/399 — correct. `savingsFooter(inChars, outChars)` at line 349 — correct.

Let me check one more thing — whether ask-ollama.mjs has top-level side effects on import (the `INVOKED_DIRECTLY` guard) and confirm the `confinePath` symlink concern.

### Assistant | 2026-05-18T03:05:50.147Z

[tool_use: Bash]

### User | 2026-05-18T03:05:58.808Z

[tool_result] import OK, exports: ALL_MODES,FILE_MODES,MAX_FILE_BYTES,TEXT_MODES,buildAskPrompt,buildFilePrompt,buildVizPrompt,callOllama,estimateTokens,loadGraph,parseArgs,pickModel,readFileCapped,renderHits,runRequest,savingsFooter,scoreNode,searchGraph,tokenizeQuery,truncate

### Assistant | 2026-05-18T03:07:20.966Z

All six imported names (`loadGraph, searchGraph, renderHits, readFileCapped, truncate, savingsFooter`) are present in the export list — confirmed. Import runs no top-level side effects (the `INVOKED_DIRECTLY` guard works). Now I have everything needed for the review.

---

# Independent Second-Pass Review — `ollama-prism-bridge.mjs`

**Grade: FAIL** — one P1 functional break (`wiki_lookup` will always error in production) plus several P1/P2 integration and contract issues. The pure-helper architecture and security confinement are sound, but a reviewer who only checked logic-correctness would have missed the most important defect: a real-data integration failure that hermetic tests cannot catch.

---

## P0 — none

No crash-on-load, no security bypass, no data-loss path.

---

## P1 findings

### P1-1 — `wiki_lookup` reads a non-existent file; the tool is dead in production (line 92, used 377)
```js
const WIKI_INDEX_REL = join("knowledge", "wiki", "architecture", "index.md");
```
**Verified against disk:** `H:/prism/knowledge/wiki/architecture/index.md` **does not exist.** The `architecture/` directory holds 322 individual wiki leaf files but no `index.md`. The actual catalog index is at `knowledge/wiki/index.md` (206 KB, 1360 lines) — CLAUDE.md's WIKI PROTOCOL section explicitly names `wiki/index.md` as the "722-entry catalog."

Consequence: every `wiki_lookup` call returns `ERROR: file not found: knowledge/wiki/architecture/index.md`. One of the three advertised tools is non-functional. The model will see the error, possibly retry, burn agent-loop iterations, and the docblock claim "Tool surface ... wiki_lookup keyword search of the architecture wiki index" is false (R12 — "feature works" is a lie if the path is wrong).

This is exactly the class of bug a correctness-focused reviewer misses: the *logic* of `wiki_lookup` is fine; the *integration constant* is wrong. **Fix:** change to `join("knowledge", "wiki", "index.md")`. This must be verified against the actual 
... [+12051 chars truncated]
