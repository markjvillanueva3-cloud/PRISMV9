---
type: "chat-session"
source: "claude-code-cli"
session_id: "7e379b1d-d716-46f2-8850-28bcd0a929a9"
title: "Confirm P0/P1 fixes are correctly closed in PRISM (H:/prism), and that the fixes"
date: "2026-06-19"
first_ts: "2026-06-19T14:59:53.868Z"
last_ts: "2026-06-19T15:01:12.732Z"
cwd: "H:\\prism\\mcp-server"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/7e379b1d-d716-46f2-8850-28bcd0a929a9/subagents/agent-a2fd585587ee1b139.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Confirm P0/P1 fixes are correctly closed in PRISM (H:/prism), and that the fixes

> **claude-code-cli** | 2026-06-19 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/7e379b1d-d716-46f2-8850-28bcd0a929a9/subagents/agent-a2fd585587ee1b139.jsonl`

## Transcript

### User | 2026-06-19T14:59:53.868Z

Confirm P0/P1 fixes are correctly closed in PRISM (H:/prism), and that the fixes introduced no new issue. Grade PASS/FAIL.

A prior review FAILed because:
- P0: the test stub's doc_get / doc_delete shapes did NOT match the real dispatcher handlers (it returned {document_id,status,file_path} / {status:"deleted"} but the real handleDocGet returns {document,knowledge} and handleDocDelete returns {deleted,message}) -> the test was green against fiction (R9).
- P1: docDispatchError marker set was brittle; relay() typed `any`; the 422 dropped the `blocker` field.

FIXES APPLIED:
1. H:/prism/mcp-server/src/__tests__/doc-learn-route.test.ts (now 10 tests) -- stub doc_get returns { document:{id,title,format,status,created_at,file_path}, knowledge } and doc_delete returns { deleted, message }; assertions use json.document.id / json.deleted; added doc_get + doc_delete not-found -> 400 cases.
2. H:/prism/mcp-server/src/routes/docLearn.ts -- docDispatchError marker set is now {document_id, documents, count, document, deleted} (dropped status, added document+deleted); 422 body includes blocker; relay typed with express Response/NextFunction; returns {status, body}.

VERIFY against the REAL dispatcher (mcp-server/src/tools/dispatchers/documentLearningDispatcher.ts) + SPA types (mcp-server/web/src/types/docLearn.ts):
1. Do the stub's doc_get/doc_delete shapes now EXACTLY match the real handleDocGet (line ~263) / handleDocDelete (line ~296) returns AND the SPA DocGetResult/DocDeleteResult types? (i.e. the test now reflects reality.)
2. Is the new marker set correct for ALL 5 success shapes (upload->document_id, extract->document_id, list->count/documents, get->document, delete->deleted) AND does it still correctly 400 a dispatcher {error,action} envelope AND still pass-through a doc_extract {document_id,status:"failed",error} as 200?
3. Any new bug from the {status,body} restructure or the express typing?
4. Are the not-found cases (doc_get/doc_delete returning {error:"Document not 
... [+56 chars truncated]

### Assistant | 2026-06-19T14:59:59.778Z

I'll read all the relevant files end to end before forming any judgment.

### Assistant | 2026-06-19T15:00:00.007Z

[tool_use: Read]

### Assistant | 2026-06-19T15:00:00.219Z

[tool_use: Read]

### User | 2026-06-19T15:00:01.428Z

[tool_result] 1	/**
2	 * U-FE-DOC-LEARN-MOUNT route guard (slot:bravo 2026-06-19).
3	 *
4	 * Proves /api/v1/doc-learn/{upload,extract,list,:id} serves the SPA's docLearn client (raw-body
5	 * contract) by relaying to the REAL prism_doc_learn action names, replacing the 404 the SPA hit.
6	 * The dispatcher is integration-tested separately (document-learning-dispatcher.test.ts); this
7	 * verifies the route adapt
... [+8472 chars truncated]

### User | 2026-06-19T15:00:01.837Z

[tool_result] 1	import { Router } from "express";
2	import type { Response, NextFunction } from "express";
3	import type { CallToolFn } from "./index.js";
4	
5	/**
6	 * Document-Learning REST bridge for the SPA (CC-EXT-MS0 U07).
7	 *
8	 * U-FE-DOC-LEARN-MOUNT (slot:bravo 2026-06-19). The SPA's web/src/api/docLearn.ts posts to
9	 * /api/v1/doc-learn/{upload,extract,list,:id} and casts the WHOLE response body to 
... [+3808 chars truncated]

### Assistant | 2026-06-19T15:00:06.034Z

Now I need to read the real dispatcher to verify the stub shapes match.

### Assistant | 2026-06-19T15:00:06.425Z

[tool_use: Read]

### User | 2026-06-19T15:00:06.912Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\tools\dispatchers\documentLearningDispatcher.ts' was already read 7m ago in this session and is unchanged (mtime 1781795344081). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: 
... [+19 chars truncated]

### Assistant | 2026-06-19T15:00:12.591Z

The hook says the dispatcher was already read earlier in session. Let me locate it fresh since I don't have it in this context window.

### Assistant | 2026-06-19T15:00:13.459Z

[tool_use: Bash]

### User | 2026-06-19T15:00:18.543Z

[tool_result] /**
 * Document Learning Dispatcher — CC-EXT-MS0 U06
 *
 * MCP tool for extracting knowledge from text documents (PDFs, notes, articles,
 * academic papers). Wraps the Python cad-engine document extraction pipeline.
 *
 * Actions:
 *   - doc_upload:   Register a document for extraction
 *   - doc_extract:  Run extraction on a registered document
 *   - doc_list:     List extracted documen
... [+11600 chars truncated]

### Assistant | 2026-06-19T15:00:20.948Z

I have enough of the dispatcher. Now let me read the SPA types.

### Assistant | 2026-06-19T15:00:22.585Z

[tool_use: Bash]

### Assistant | 2026-06-19T15:00:23.367Z

[tool_use: Bash]

### User | 2026-06-19T15:00:26.046Z

[tool_result] /**
 * Document Learning types — CC-EXT-MS0 U07
 *
 * Typed request/response interfaces for the document learning API.
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export interface DocLearnApiResponse<T> {
  data?: T;
  error?: string;
}

export interface 
... [+2107 chars truncated]

### User | 2026-06-19T15:00:30.168Z

[tool_result] /**
 * Document Learning API Client — CC-EXT-MS0 U07
 *
 * Typed functions for the 5 document learning endpoints.
 * Mirrors the ERP/PPG client pattern, targets /api/v1/doc-learn.
 */
import type {
  DocUploadRequest,
  DocUploadResult,
  DocExtractRequest,
  DocExtractResult,
  DocListResult,
  DocGetRequest,
  DocGetResult,
  DocDeleteRequest,
  DocDeleteResult,
} from "../types/docLearn";
impor
... [+3390 chars truncated]

### Assistant | 2026-06-19T15:00:32.286Z

I have all the material needed. Let me now do the complete cross-check.

### Assistant | 2026-06-19T15:00:33.047Z

[tool_use: Bash]

### User | 2026-06-19T15:00:38.115Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
PASS (10) FAIL (0)

### Assistant | 2026-06-19T15:01:12.732Z

All 10 tests pass. Now I have everything needed to form the verdict.

---

**Verification matrix:**

**Q1 — Do stub shapes now exactly match real handleDocGet / handleDocDelete AND the SPA types?**

Real `handleDocGet` (dispatcher line ~263):
```
{ document: { id, title, format, status, created_at, file_path }, knowledge }
| { error: "Document not found: <id>" }
```
Stub (`doc-learn-route.test.ts:47-49`): returns exactly `{ document: { id, title, format, status, created_at, file_path }, knowledge: { tips: 5 } }` on hit; `{ error: "Document not found: <id>" }` on miss. Assertions check `json.document.id`, `json.document.file_path`, `json.knowledge.tips`. Matches `DocGetResult` (`document: DocumentDetail, knowledge: Record<string,unknown>|null`). EXACT match.

Real `handleDocDelete` (dispatcher line ~296):
```
{ deleted: docId, message: "Document knowledge deleted successfully" }
| { error: "Document not found: <id>" }
```
Stub (`test.ts:51-54`): returns exactly `{ deleted: p.document_id, message: "Document knowledge deleted successfully" }` on hit; `{ error: ... }` on miss. Assertions check `json.deleted` and `json.message`. Matches `DocDeleteResult` (`deleted: string, message: string`). EXACT match.

**Q2 — Is the new `docDispatchError` marker set correct for all 5 success shapes, and do the pass-through / error cases work?**

Markers in `docLearn.ts:33-35`: `document_id || documents || count || document || deleted`

- `doc_upload` returns `{ document_id, status, format, message }` → marker `document_id` present → 200. Correct.
- `doc_extract` (success) returns `{ document_id, status:"complete", ... }` → marker `document_id` present → 200. Correct.
- `doc_extract` (failed) returns `{ document_id:"fail-doc", status:"failed", error:"..." }` → marker `document_id` present → `hasDomainMarker=true` → the `error` string check does NOT fire → 200 pass-through. This is the critical distinction. Correct.
- `doc_list` returns `{ count, documents }` → markers `count` and `docu
... [+3619 chars truncated]
