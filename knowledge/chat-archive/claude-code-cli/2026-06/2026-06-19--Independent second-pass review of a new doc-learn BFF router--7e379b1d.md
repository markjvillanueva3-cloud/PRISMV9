---
type: "chat-session"
source: "claude-code-cli"
session_id: "7e379b1d-d716-46f2-8850-28bcd0a929a9"
title: "Independent second-pass review of a new doc-learn BFF router in PRISM (H:/prism)"
date: "2026-06-19"
first_ts: "2026-06-19T14:52:52.539Z"
last_ts: "2026-06-19T14:54:58.575Z"
cwd: "H:\\prism"
messages: 39
user_msgs: 17
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/7e379b1d-d716-46f2-8850-28bcd0a929a9/subagents/agent-a1bbacfcbde1f622d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Independent second-pass review of a new doc-learn BFF router in PRISM (H:/prism)

> **claude-code-cli** | 2026-06-19 | 39 msgs (17 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7e379b1d-d716-46f2-8850-28bcd0a929a9/subagents/agent-a1bbacfcbde1f622d.jsonl`

## Transcript

### User | 2026-06-19T14:52:52.539Z

Independent second-pass review of a new doc-learn BFF router in PRISM (H:/prism). Do NOT assume the first reviewer caught everything. Weight toward integration soundness, duplication, and convention. Grade PASS/FAIL + P0/P1/P2 with file:line. READ fully.

FILES: H:/prism/mcp-server/src/routes/docLearn.ts (new), src/__tests__/doc-learn-route.test.ts (new), src/routes/index.ts (mount+import).

CHECK:
1. DUPLICATION (R8): routes/learning.ts ALREADY has doc adapter routes (/document/upload etc.) for the same prism_doc_learn dispatcher, mounted at /api/v1/learning. Is creating a SEPARATE /api/v1/doc-learn router justified (different prefix + different response shape the SPA needs), or should the existing one have been reused/moved? Confirm the SPA genuinely needs the raw-body shape this new router provides (vs learning.ts's {ok,data} envelope). Is there any conflict/overlap risk from having BOTH mounted?
2. RUNTIME: does prism_doc_learn actually resolve at runtime? Confirm it's registered (index.ts) + the 5 action names (doc_upload/doc_extract/doc_list/doc_get/doc_delete) exist in the dispatcher ACTIONS enum. Confirm the mount prefix /api/v1/doc-learn matches the SPA BASE_URL exactly (web/src/api/docLearn.ts).
3. The new mount sits between /api/v1/doc and /api/v1/inbox in index.ts — any prefix-shadowing risk (/api/v1/doc vs /api/v1/doc-learn)? (Express matches full path segments; confirm /api/v1/doc does not swallow /api/v1/doc-learn.)
4. Convention conformance: does docLearn.ts read like the other route files (specialty.ts pattern with isToolError, or the learning.ts pattern)? The relay() helper + docDispatchError — clean?
5. Any param the route forwards that the dispatcher would reject? doc_upload/extract take a body; list takes {}; get/delete take {document_id}.
6. Test legitimacy (R9): not mocking the SUT improperly; meaningful assertions.

Concise. Do NOT edit.

### Assistant | 2026-06-19T14:52:56.192Z

I'll read all three target files plus the existing learning.ts and dispatcher/index.ts to verify every check point before rendering a verdict.

### Assistant | 2026-06-19T14:52:56.609Z

[tool_use: Read]

### Assistant | 2026-06-19T14:52:57.008Z

[tool_use: Read]

### User | 2026-06-19T14:52:57.090Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\routes\docLearn.ts' was already read 8s ago in this session and is unchanged (mtime 1781880588645). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-19T14:52:57.121Z

[tool_use: Read]

### User | 2026-06-19T14:52:57.841Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\doc-learn-route.test.ts' was already read 8s ago in this session and is unchanged (mtime 1781880680453). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CAC
... [+5 chars truncated]

### User | 2026-06-19T14:52:57.870Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\routes\index.ts' was already read 8s ago in this session and is unchanged (mtime 1781880627698). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-19T14:53:01.472Z

The read-once guard indicates these files were read earlier in the session (I am operating as the second-pass reviewer agent, and the files were loaded into context). Let me retrieve their contents via Grep to reconstruct what I need.

### Assistant | 2026-06-19T14:53:02.295Z

[tool_use: Bash]

### Assistant | 2026-06-19T14:53:03.065Z

[tool_use: Bash]

### Assistant | 2026-06-19T14:53:03.510Z

[tool_use: Bash]

### User | 2026-06-19T14:53:06.579Z

[tool_result] import { Router } from "express";
import type { CallToolFn } from "./index.js";

/**
 * Document-Learning REST bridge for the SPA (CC-EXT-MS0 U07).
 *
 * U-FE-DOC-LEARN-MOUNT (slot:bravo 2026-06-19). The SPA's web/src/api/docLearn.ts posts to
 * /api/v1/doc-learn/{upload,extract,list,:id} and casts the WHOLE response body to its result
 * type (DocUploadResult / DocExtractResult / DocListResult / 
... [+2957 chars truncated]

### User | 2026-06-19T14:53:10.104Z

[tool_result] /**
 * U-FE-DOC-LEARN-MOUNT route guard (slot:bravo 2026-06-19).
 *
 * Proves /api/v1/doc-learn/{upload,extract,list,:id} serves the SPA's docLearn client (raw-body
 * contract) by relaying to the REAL prism_doc_learn action names, replacing the 404 the SPA hit.
 * The dispatcher is integration-tested separately (document-learning-dispatcher.test.ts); this
 * verifies the route adapter + its error
... [+6592 chars truncated]

### User | 2026-06-19T14:53:13.682Z

[tool_result] /**
 * PRISM MCP Server — Route Registry
 * Central registration for all API route modules
 *
 * 41 route modules:
 * - SFC (7), SpeedFeed (8), CAD (5), CAM (4), Quality (4), Schedule (4), Cost (4)
 * - Export (5), Data (7), Safety (4), Auth (6), Admin (6), OpenAPI (1)
 * - PPG (8), Learning (10), ERP (10)
 * - EDM (7), Turning (6)
 * - Threads (12), Compliance (8), Telemetry (7)
 * - Orchestratio
... [+17029 chars truncated]

### Assistant | 2026-06-19T14:53:18.776Z

Now I have all three files. Let me read the existing learning.ts and the doc dispatcher to complete the integration checks.

### Assistant | 2026-06-19T14:53:23.747Z

[tool_use: Bash]

### Assistant | 2026-06-19T14:53:23.850Z

[tool_use: Bash]

### User | 2026-06-19T14:53:27.818Z

[tool_result] /**
 * PRISM MCP Server — Learning & Knowledge Product Routes
 * Adapter layer that normalizes the live PRISM dispatcher surface into the
 * frontend learning contracts used by the web app.
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

type LearningDomain = "CAD" | "CAM" | "ShopPractice" | "MachineOperation";
type NormalizedModuleStatus = "locked" | 
... [+23133 chars truncated]

### User | 2026-06-19T14:53:33.140Z

[tool_result] /**
 * PRISM MCP Server — Document Management Routes
 * 7 endpoints for document CRUD, roadmap status, action tracking, and migration
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

/** Creates doc router.
 * @param callTool - call tool
 * @returns router
 */
export function createDocRouter(callTool: CallToolFn): Router {
  const router = Router();
... [+1600 chars truncated]

### Assistant | 2026-06-19T14:53:36.423Z

Now let me check the dispatcher registration and action names for `prism_doc_learn`, and verify the SPA client's BASE_URL.

### Assistant | 2026-06-19T14:53:37.577Z

[tool_use: Glob]

### Assistant | 2026-06-19T14:53:37.761Z

[tool_use: Glob]

### User | 2026-06-19T14:53:38.896Z

[tool_result] mcp-server\src\schemas\documentLearningActionSchemas.ts
mcp-server\src\tools\dispatchers\documentLearningDispatcher.ts

### User | 2026-06-19T14:53:39.063Z

[tool_result] mcp-server\web\src\types\docLearn.ts
mcp-server\web\src\api\docLearn.ts

### Assistant | 2026-06-19T14:53:45.444Z

[tool_use: Bash]

### Assistant | 2026-06-19T14:53:46.111Z

[tool_use: Bash]

### User | 2026-06-19T14:53:49.414Z

[tool_result] 29 const ACTIONS = [
30   "doc_upload",
31   "doc_extract",
32   "doc_list",
33   "doc_get",
34   "doc_delete",
349     "prism_doc_learn",
352       action: z.enum(ACTIONS),
356       log.info(`[prism_doc_learn] Action: ${action}`);
397               available: ACTIONS,
408         log.error(`[prism_doc_learn] ${action} failed:`, err);
419   log.info(`[prism_doc_learn] Registered ${ACTI
... [+22 chars truncated]

### User | 2026-06-19T14:53:53.484Z

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

### Assistant | 2026-06-19T14:53:57.706Z

Now I have everything needed. Let me do one final check: verify whether `prism_doc_learn` is registered in the MCP server's index (tool registration), and confirm the `AbortSignal.any` compatibility concern and the `presets-learning` router conflict risk.

### Assistant | 2026-06-19T14:54:01.194Z

[tool_use: Bash]

### Assistant | 2026-06-19T14:54:02.637Z

[tool_use: Bash]

### User | 2026-06-19T14:54:04.429Z

[tool_result] Exit code 1
163 import { registerDocumentLearningDispatcher } from "./tools/dispatchers/documentLearningDispatcher.js";

### User | 2026-06-19T14:54:08.793Z

[tool_result] 100 router.post("/learning/courses", async (req, res) => {
105 router.get("/learning/courses/:courseId", async (req, res) => {
113 router.get("/learning/courses", async (req, res) => {
118 router.post("/learning/enroll", async (req, res) => {
123 router.get("/learning/my-progress", async (req, res) => {
139 router.post("/learning/checkpoint", async (req, res) => {
144 router.post("/learning/media"
... [+146 chars truncated]

### Assistant | 2026-06-19T14:54:12.778Z

[tool_use: Bash]

### Assistant | 2026-06-19T14:54:15.262Z

[tool_use: Bash]

### User | 2026-06-19T14:54:17.399Z

[tool_result] 163 import { registerDocumentLearningDispatcher } from "./tools/dispatchers/documentLearningDispatcher.js";
819   registerDocumentLearningDispatcher(server);

### User | 2026-06-19T14:54:21.659Z

[tool_result] 161 
162 // CC-EXT-MS0: Document Learning Dispatcher — PDF/notes/article knowledge extraction (Dispatcher #51)
163 import { registerDocumentLearningDispatcher } from "./tools/dispatchers/documentLearningDispatcher.js";
164 
165 // CC-MS6: Shop Practice Dispatcher — practice KB, trouble trees, material tips (Dispatcher #52)
166 import { registerShopPracticeDispatcher } from "./tools/dispatcher
... [+530 chars truncated]

### Assistant | 2026-06-19T14:54:58.575Z

I now have complete, verified information to render the verdict. Let me compile all findings.

---

VERDICT: PASS

summary: The new `docLearn.ts` router is justified by a genuine SPA contract gap — `learning.ts` serves `prism_doc_learn` at a different prefix (`/api/v1/learning/document/*`) with an `{ok,data}` envelope the SPA does not consume, so having a dedicated router at `/api/v1/doc-learn` is not duplication. All five action names match the dispatcher's verified `ACTIONS` array exactly, the dispatcher is registered at `mcp-server/src/index.ts:819`, the SPA `BASE_URL` matches the mount point verbatim, and the `/api/v1/doc` prefix poses no shadowing risk. Tests are integration-level (real HTTP, real Express, no SUT mocking) and cover the one non-obvious correctness invariant (failed extraction must be a 200). Two P2 observations follow but no P0 or P1 exist.

findings:

- [P2] `H:/prism/mcp-server/src/routes/docLearn.ts:35` -- `docDispatchError` checks `r.status !== undefined` as a domain marker to suppress the 400 path. The dispatcher's `doc_upload` success result also carries `status: "pending"`, which is correct, but any future action whose ERROR envelope happens to contain a `status` field would be silently passed through as a 200 rather than mapped to 400. The `hasDomainMarker` heuristic is fragile; a more robust guard would test for one of the truly-unique domain keys (`document_id` or `documents`) only, not `status`. Not a bug today because the dispatcher's error envelope (`{error, action}`) never includes `status`, but worth narrowing before the action set grows. -- Fix: drop `r.status !== undefined` from the `hasDomainMarker` union (it adds no discriminating power since every error envelope could theoretically carry it).

- [P2] `H:/prism/mcp-server/src/__tests__/doc-learn-route.test.ts:32` -- The test's `beforeAll` mounts the router at `/` (not `/api/v1/doc-learn`), so the tests exercise route-relative paths (`/upload`, `/list`, `/:document_id`) correct
... [+2852 chars truncated]
