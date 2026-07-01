---
type: "chat-session"
source: "claude-code-cli"
session_id: "7e379b1d-d716-46f2-8850-28bcd0a929a9"
title: "Review a new backend-for-frontend router in PRISM (H:/prism). Grade PASS/FAIL + "
date: "2026-06-19"
first_ts: "2026-06-19T14:52:42.354Z"
last_ts: "2026-06-19T14:54:33.887Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/7e379b1d-d716-46f2-8850-28bcd0a929a9/subagents/agent-a0d900eebcf96dd7b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review a new backend-for-frontend router in PRISM (H:/prism). Grade PASS/FAIL + 

> **claude-code-cli** | 2026-06-19 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7e379b1d-d716-46f2-8850-28bcd0a929a9/subagents/agent-a0d900eebcf96dd7b.jsonl`

## Transcript

### User | 2026-06-19T14:52:42.354Z

Review a new backend-for-frontend router in PRISM (H:/prism). Grade PASS/FAIL + P0/P1/P2 with file:line. READ end-to-end.

FILES:
1. H:/prism/mcp-server/src/routes/docLearn.ts (NEW — createDocLearnRouter, mounts the SPA /api/v1/doc-learn/* endpoints onto the prism_doc_learn dispatcher)
2. H:/prism/mcp-server/src/__tests__/doc-learn-route.test.ts (NEW, 8 tests)
3. H:/prism/mcp-server/src/routes/index.ts (mount at /api/v1/doc-learn + import)

CONTEXT: SPA client web/src/api/docLearn.ts posts to /api/v1/doc-learn/{upload,extract,list,:id} and casts the RAW body to its result type (DocUploadResult etc., in web/src/types/docLearn.ts) — it does NOT expect an {ok,data} envelope. The prism_doc_learn dispatcher (mcp-server/src/tools/dispatchers/documentLearningDispatcher.ts, registered index.ts:819) returns: a raw domain object on success; {error, action} on validation/exec failure; {blocked, reason, action} on a safety block. The SPA does `if(!res.ok) throw ApiError(status, message)`.

CHECK SPECIFICALLY:
1. docDispatchError heuristic correctness: it returns a non-2xx ONLY when r.blocked===true OR (typeof r.error==="string" AND no domain marker {document_id/documents/count/status}). Is this CORRECT? Critically: a doc_extract result {document_id, status:"failed", error} must pass through as 200 (the SPA renders failed), while a dispatcher {error,action} (no domain marker) must be 400. Could any REAL prism_doc_learn success result be misclassified as an error (false 400/422)? Could any real dispatcher error slip through as 200 (false success -> SPA silent-undefined footgun)? Check the dispatcher's actual success shapes (handlers in documentLearningDispatcher.ts) for each of the 5 actions vs the markers.
2. Route ordering: GET /list registered before GET /:document_id — confirm Express won't match /list as doc_get id="list".
3. The SPA expects the raw body; confirm the route sends `res.json(r)` raw (not {ok,data}). Contrast with learning.ts which wraps — confirm this router do
... [+303 chars truncated]

### Assistant | 2026-06-19T14:52:48.147Z

I'll read all the relevant files end-to-end before making any judgments.

### Assistant | 2026-06-19T14:52:48.631Z

[tool_use: Read]

### Assistant | 2026-06-19T14:52:48.906Z

[tool_use: Read]

### Assistant | 2026-06-19T14:52:48.922Z

[tool_use: Read]

### User | 2026-06-19T14:52:49.741Z

[tool_result] 1	import { Router } from "express";
2	import type { CallToolFn } from "./index.js";
3	
4	/**
5	 * Document-Learning REST bridge for the SPA (CC-EXT-MS0 U07).
6	 *
7	 * U-FE-DOC-LEARN-MOUNT (slot:bravo 2026-06-19). The SPA's web/src/api/docLearn.ts posts to
8	 * /api/v1/doc-learn/{upload,extract,list,:id} and casts the WHOLE response body to its result
9	 * type (DocUploadResult / DocExtractResult 
... [+3144 chars truncated]

### User | 2026-06-19T14:52:50.159Z

[tool_result] 1	/**
2	 * U-FE-DOC-LEARN-MOUNT route guard (slot:bravo 2026-06-19).
3	 *
4	 * Proves /api/v1/doc-learn/{upload,extract,list,:id} serves the SPA's docLearn client (raw-body
5	 * contract) by relaying to the REAL prism_doc_learn action names, replacing the 404 the SPA hit.
6	 * The dispatcher is integration-tested separately (document-learning-dispatcher.test.ts); this
7	 * verifies the route adapt
... [+7093 chars truncated]

### User | 2026-06-19T14:52:50.277Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Route Registry
3	 * Central registration for all API route modules
4	 *
5	 * 41 route modules:
6	 * - SFC (7), SpeedFeed (8), CAD (5), CAM (4), Quality (4), Schedule (4), Cost (4)
7	 * - Export (5), Data (7), Safety (4), Auth (6), Admin (6), OpenAPI (1)
8	 * - PPG (8), Learning (10), ERP (10)
9	 * - EDM (7), Turning (6)
10	 * - Threads (12), Compliance (8), Telemetry 
... [+18070 chars truncated]

### Assistant | 2026-06-19T14:52:55.820Z

Now I need to read the actual dispatcher to verify the success shapes for all 5 actions against the heuristic.

### Assistant | 2026-06-19T14:52:56.057Z

[tool_use: Read]

### User | 2026-06-19T14:52:57.636Z

[tool_result] 1	/**
2	 * Document Learning Dispatcher — CC-EXT-MS0 U06
3	 *
4	 * MCP tool for extracting knowledge from text documents (PDFs, notes, articles,
5	 * academic papers). Wraps the Python cad-engine document extraction pipeline.
6	 *
7	 * Actions:
8	 *   - doc_upload:   Register a document for extraction
9	 *   - doc_extract:  Run extraction on a registered document
10	 *   - doc_list:     List extra
... [+15036 chars truncated]

### Assistant | 2026-06-19T14:53:00.770Z

Now I have everything I need. Let me analyze all five findings before writing the verdict.

### Assistant | 2026-06-19T14:53:02.415Z

[tool_use: Grep]

### User | 2026-06-19T14:53:04.010Z

[tool_result] No matches found

### Assistant | 2026-06-19T14:53:25.067Z

I have all the information needed. Let me now do the final analysis.

**Key facts established from end-to-end reads:**

**docDispatchError heuristic vs. actual dispatcher success shapes:**

- `doc_upload` success: `{ document_id, status, format, message }` -- has `document_id` + `status`. Safe.
- `doc_upload` validation failure path (line 91-93, 94-96): returns `{ error: "..." }` with NO domain marker. Correctly classified as 400.
- `doc_extract` success: `{ document_id, status:"complete", is_valid, stats, validation, errors, tribal_tips_ingested }` -- has `document_id` + `status`. Safe.
- `doc_extract` failure (line 222-226): returns `{ document_id, status:"failed", error }` -- has BOTH `document_id` AND `status`. The heuristic's `hasDomainMarker` is true, so `error` string is ignored. Correctly passes as 200. Critical distinction holds.
- `doc_list` success: `{ count, documents }` -- has `count` + `documents`. Safe.
- `doc_get` success: `{ document, knowledge }` -- has NEITHER `document_id`, `documents`, `count`, NOR `status` at the top level. The `document` sub-object has a `status` field but `r.status` (top-level) is undefined.
- `doc_get` not-found path (line 248-250): returns `{ error: "Document not found: <id>" }` with NO domain marker. Correctly 400.
- `doc_delete` success: `{ deleted, message }` -- has NEITHER `document_id`, `documents`, `count`, NOR `status` at top level. `deleted` is a string, not any of the four markers.
- `doc_delete` not-found (line 282-284): returns `{ error: "document_id is required" }` / `{ error: "Document not found: <id>" }` -- no domain marker. Correctly 400.

**P0 findings:**

1. `doc_get` success shape has NO top-level domain marker. `handleDocGet` returns `{ document: {...}, knowledge: ... }` (line 263-273). None of the four marker keys (`document_id`, `documents`, `count`, `status`) exist at the top level. So `hasDomainMarker` is false. The successful result has no `error` field either, so `typeof r.error === "string"` is fal
... [+1348 chars truncated]

### Assistant | 2026-06-19T14:53:26.094Z

[tool_use: Grep]

### User | 2026-06-19T14:53:28.205Z

[tool_result] No matches found

### Assistant | 2026-06-19T14:53:31.620Z

The graph nodes are irrelevant. I need to find where `callTool` is defined and passed to `registerRoutes` in the server entry point.

### Assistant | 2026-06-19T14:53:31.781Z

[tool_use: Glob]

### User | 2026-06-19T14:53:40.042Z

[tool_result] mcp-server\src\index.ts

### Assistant | 2026-06-19T14:53:43.227Z

[tool_use: Grep]

### User | 2026-06-19T14:53:44.734Z

[tool_result] 1384:  async function callTool(toolName: string, action: string, params: Record<string, any> = {}) {
1396:      // callTool backs ALL 42 REST routes; a dispatcher/engine throw here
1405:  const { registerRoutes } = await import("./routes/index.js");
1406:  registerRoutes(app, callTool);

### Assistant | 2026-06-19T14:53:47.036Z

[tool_use: Read]

### User | 2026-06-19T14:53:47.939Z

[tool_result] 1383	  // Helper: call an MCP tool handler and return result
1384	  async function callTool(toolName: string, action: string, params: Record<string, any> = {}) {
1385	    // _registeredTools is a plain Record<string, RegisteredTool>, not a Map
1386	    const registeredTools = (server as any)._registeredTools ?? {};
1387	    const tool = registeredTools[toolName];
1388	    if (!tool) return { error
... [+1429 chars truncated]

### Assistant | 2026-06-19T14:54:33.887Z

Now I have the complete picture. `callTool` at index.ts:1392-1394 calls the MCP handler and unwraps `result?.content?.[0]?.text` via `JSON.parse` -- so the route receives the raw domain object, NOT the MCP `{content:[...]}` wrapper. The `blocked` envelope from the dispatcher (line 386-389 in the dispatcher) emits `{ blocked: true, blocker, reason, action }` -- note the key is `blocker` not `reason` ... wait, let me recheck.

Looking at the dispatcher safety-block return (lines 385-389):
```
{ blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action }
```

Both `blocker` AND `reason` are present. The heuristic checks `r.reason` (line 24 of docLearn.ts). That is correct -- `reason` is present.

Now I have everything. Here is the complete verdict:

---

VERDICT: FAIL

summary: The router's `docDispatchError` heuristic contains one P0 false-negative that lets a real dispatcher error slip through as HTTP 200 to the SPA: the `doc_delete` and `doc_get` "not found / missing param" error returns from the handler carry `{ error: "..." }` with no domain marker and are correctly caught at 400 -- that part is fine. The real P0 is the `doc_delete` **success** shape `{ deleted, message }` (dispatcher line 296) which has no domain marker AND no `error` field, so it passes correctly as 200 -- that is fine too. However, `doc_get` success shape `{ document: {...}, knowledge }` (dispatcher lines 263-273) also has no top-level domain marker and no `error` field, so it passes as 200 -- correct. On close reading the heuristic logic itself is sound for all five actions, but the test file has an explicit P0 gap and a P1 wiring mismatch described below. The `doc_delete` action is entirely absent from the test suite. The test for `doc_get` uses the stub's invented shape `{ document_id, status, file_path }` (test line 46) but the real dispatcher returns `{ document, knowledge }` (dispatcher lines 263-273) -- the test's happy-path assertion `json.document_id` would fail ag
... [+4667 chars truncated]
