---
type: "chat-session"
source: "claude-code-cli"
session_id: "db7a0592-d0c4-4ab7-be50-a016b8101712"
title: "Review the file H:/PRISM/state/shared/specs/DOCKER-MCP-CATALOG-AUDIT-2026-05-19."
date: "2026-05-19"
first_ts: "2026-05-19T15:25:01.567Z"
last_ts: "2026-05-19T15:27:42.227Z"
cwd: "H:\\PRISM"
messages: 31
user_msgs: 14
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/db7a0592-d0c4-4ab7-be50-a016b8101712/subagents/agent-a9bca6526f4282691.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Review the file H:/PRISM/state/shared/specs/DOCKER-MCP-CATALOG-AUDIT-2026-05-19.

> **claude-code-cli** | 2026-05-19 | 31 msgs (14 user / 17 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/db7a0592-d0c4-4ab7-be50-a016b8101712/subagents/agent-a9bca6526f4282691.jsonl`

## Transcript

### User | 2026-05-19T15:25:01.567Z

Review the file H:/PRISM/state/shared/specs/DOCKER-MCP-CATALOG-AUDIT-2026-05-19.md end-to-end (whole file, not split sections). It is a research/audit deliverable produced by slot juliett to answer: "of the 315 servers in Docker MCP Catalog, which should PRISM wire upstream and which stay custom?"

Verify against:
1. Factual correctness of catalog contents claimed — full catalog dump is cached at H:/prism/.cache/docker-mcp-catalog-2026-05-19.txt (2152 lines, ~315 servers). Spot-check 3 specific claims: (a) "no mastercam/hypermill/fusion/solidworks/inventor/esprit/hsm/autodesk/siemens-nx/catia" — grep the cache; (b) `prometheus`, `filesystem`, `git`, `github`, `obsidian`, `memory`, `time` ARE in the catalog; (c) `husqvarna-automower` IS the only manufacturing-adjacent entry.
2. PRISM-side claims — do the named PRISM dispatchers / engines actually exist? Spot-check 2: `prism_memory:store_memory` + `query_memory`, and `prism_session:read_file` + `file_claim`.
3. Doctrine alignment — R5/R7/R8/R12 references are appropriately scoped, not invented.
4. Operator clarity — can a fresh-context juliett chat in a future session act on the §4 Recommended Actions list without re-reading the cache?
5. R12 honesty — does it overclaim? Specifically the "ZERO CAM/CAD specialists" claim is load-bearing (R8-validates the entire PRISM-APP-QUEUE STAGE 8 CAM-bridge work).

Report:
- Verdict: PASS or FAIL
- P0 issues (factual error, broken doctrine, missing critical caveat) — list each
- P1 issues (overclaim, missing nuance) — list each
- P2/P3 deferrables (style, minor inaccuracy) — log briefly

Be terse. Under 400 words.

### Assistant | 2026-05-19T15:25:23.723Z

I'll review the audit file end-to-end and verify against the cache and PRISM codebase.

### Assistant | 2026-05-19T15:25:24.014Z

[tool_use: Read]

### User | 2026-05-19T15:25:32.208Z

[tool_result] 1	# Docker MCP Catalog — R8 Audit for PRISM
2	**Unit:** U-DOCKER-CATALOG-AUDIT
3	**Date:** 2026-05-19
4	**Slot:** juliett (claude-db7a0592)
5	**Source:** `docker mcp catalog server ls mcp/docker-mcp-catalog:latest` → 315 servers, cached at `.cache/docker-mcp-catalog-2026-05-19.txt`
6	
7	> **R8 (read before write) applied at the stack level.** Before PRISM builds any new dispatcher, ask: does an up
... [+8041 chars truncated]

### Assistant | 2026-05-19T15:25:38.329Z

Now let me verify the factual claims against the cache and codebase.

### Assistant | 2026-05-19T15:25:40.369Z

[tool_use: Grep]

### Assistant | 2026-05-19T15:25:42.486Z

[tool_use: Grep]

### Assistant | 2026-05-19T15:25:44.120Z

[tool_use: Grep]

### Assistant | 2026-05-19T15:25:46.023Z

[tool_use: Grep]

### Assistant | 2026-05-19T15:25:46.924Z

[tool_use: Grep]

### User | 2026-05-19T15:25:53.411Z

[tool_result] 89:[Omitted long matching line]
615:    Description: Brings context about device inventory, threats, risks and utilization powered by the Cylera Partner API into an LLM.

### User | 2026-05-19T15:25:54.306Z

[tool_result] No matches found

### User | 2026-05-19T15:25:55.091Z

[tool_result] 89:[Omitted long matching line]
440:  camunda
441:    Title: Camunda BPM Process Engine
442:    Description: Tools to interact with the Camunda 7 Community Edition Engine using the Model Context Protocol (MCP). Whether you're automating workflows, querying process instances, or integrating with external systems, Camunda MCP Server is your agentic solution for seamless interaction with Camunda.
444
... [+1224 chars truncated]

### User | 2026-05-19T15:25:57.499Z

[tool_result] Found 2 files
mcp-server\src\tools\dispatchers\sessionDispatcher.ts
mcp-server\src\tools\dispatchers\guardDispatcher.ts

### User | 2026-05-19T15:26:09.646Z

[tool_result] No files found

### Assistant | 2026-05-19T15:26:13.625Z

[tool_use: Grep]

### Assistant | 2026-05-19T15:26:14.929Z

[tool_use: Grep]

### User | 2026-05-19T15:26:22.112Z

[tool_result] 818:  filesystem
859:  git
866:  github
1264:  memory
1446:  obsidian
1666:  prometheus
2016:  time

### User | 2026-05-19T15:26:25.928Z

[tool_result] mcp-server\src\tools\dispatchers\guardDispatcher.ts:631:                reason: "File was NOT read this session. Read it first with DC:read_file or prism_file_read before editing.",
mcp-server\src\tools\dispatchers\sessionDispatcher.ts:172:  "cross_session_is_file_claimed",
mcp-server\src\tools\dispatchers\sessionDispatcher.ts:1796:          case "cross_session_is_file_claimed": {

### Assistant | 2026-05-19T15:26:29.750Z

[tool_use: Grep]

### Assistant | 2026-05-19T15:26:31.265Z

[tool_use: Grep]

### User | 2026-05-19T15:26:40.294Z

[tool_result] No matches found

### User | 2026-05-19T15:26:41.725Z

[tool_result] Found 4 files
mcp-server\src\tools\dispatchers\memoryDispatcher.ts
mcp-server\src\tools\dispatchers\guardDispatcher.ts
mcp-server\src\tools\dispatchers\orchestrationDispatcher.ts
mcp-server\src\tools\dispatchers\CLAUDE.md

### Assistant | 2026-05-19T15:26:45.324Z

I have enough verification. Let me check the actual action names in memoryDispatcher and sessionDispatcher to verify the audit's exact claims.

### Assistant | 2026-05-19T15:26:46.019Z

[tool_use: Grep]

### User | 2026-05-19T15:26:55.789Z

[tool_result] 138:          case "get_health": {
150:          case "trace_decision": {
185:          case "find_similar": {
209:          case "get_session": {
229:          case "get_node": {
239:          case "run_integrity": {
248:          case "consolidate": {
255:          case "consolidation_stats": {
261:          case "consolidation_patterns": {
268:          case "record_session_end": {
292:        
... [+243 chars truncated]

### Assistant | 2026-05-19T15:26:59.706Z

[tool_use: Grep]

### Assistant | 2026-05-19T15:27:00.618Z

[tool_use: Grep]

### User | 2026-05-19T15:27:19.627Z

[tool_result] No matches found

### User | 2026-05-19T15:27:21.495Z

[tool_result] No matches found

### Assistant | 2026-05-19T15:27:42.227Z

Confirmed: `prism_memory:store_memory` and `query_memory` do NOT exist as named actions (memoryDispatcher uses `remember`, `semantic_search`, `qdrant_vector_*`). `prism_session:read_file` / `write_file` also do not exist (the actual session actions reference `prism_file_read` / `DC:read_file` per guardDispatcher).

---

## Verdict: **FAIL** (P0 PRISM-side action names invented)

### P0 issues

1. **`prism_memory:store_memory` + `query_memory` do not exist.** memoryDispatcher.ts has no such cases. Real actions: `remember`, `semantic_search`, `qdrant_vector_search`, `qdrant_vector_upsert`, `agent_memory_remember`. R12 violation — the table cell "PRISM memory has... PRISM owns the vault" relies on naming a real dispatcher contract; the cited contract is wrong.

2. **`prism_session:read_file` + `write_file` do not exist** in sessionDispatcher.ts. The audit names them in rows 24 and 27. Real surfaces are `prism_file_read` (per guardDispatcher line 631) and `cross_session_is_file_claimed` (sessionDispatcher line 172). The "Keep PRISM — file-claim-guard semantics" recommendation stands directionally, but the named contract is fabricated.

3. **`prism_session:wiki_*` family** (row 28) — not verified in dispatcher; likely also misnamed. Audit's PRISM-side action-name claims are systematically invented, not grepped.

### P1 issues

1. **`github-official` not separately verified in cache** — cache shows `git` (line 859) + `github` (line 866); audit lists three entries (`git` + `github` + `github-official`) in row 25. Spot-check found only the first two on bare lines; `github-official` may exist deeper but wasn't confirmed. Minor.

2. **`fetch` MCP server not verified** — Action #3 wires `fetch` but cache grep only confirmed prometheus/filesystem/git/github/obsidian/memory/time/husqvarna-automower/markitdown/markdownify/playwright/semgrep/arxiv-mcp-server. `fetch` presence in catalog should be confirmed before queuing U-DOCKER-MCP-WIRE-FETCH.

### P2/P3

- Operator clarity §4 i
... [+723 chars truncated]
