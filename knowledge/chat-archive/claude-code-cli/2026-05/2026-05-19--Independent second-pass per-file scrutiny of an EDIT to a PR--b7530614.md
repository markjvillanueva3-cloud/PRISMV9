---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "Independent second-pass per-file scrutiny of an EDIT to a PRISM file. Read the W"
date: "2026-05-19"
first_ts: "2026-05-19T02:55:09.575Z"
last_ts: "2026-05-19T02:58:08.441Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 7
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-acf2ec786954756bc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Independent second-pass per-file scrutiny of an EDIT to a PRISM file. Read the W

> **claude-code-cli** | 2026-05-19 | 16 msgs (7 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-acf2ec786954756bc.jsonl`

## Transcript

### User | 2026-05-19T02:55:09.575Z

Independent second-pass per-file scrutiny of an EDIT to a PRISM file. Read the WHOLE file end-to-end. Grade PASS or FAIL.

FILE: H:/prism/scripts/lib/master-index-search-lib.mjs — File 3 of 5 (U-MASTER-INDEX-SIDECAR). This lib's `loadGraph` is imported by `master-index-precheck-inject.mjs` (a UserPromptSubmit hook firing on EVERY prompt, 2-5 s timeout) and `spawned-agent-context-lib.mjs` (SubagentStart). Correctness here affects every chat in the fleet.
SPEC: H:/prism/state/shared/specs/UNITS/U-MASTER-INDEX-SIDECAR.md

THE EDIT added a sidecar fast-path: a new `tryLoadSidecar()` + `SIDECAR_SCHEMA_VERSION` const, the process-cache check moved to the top of `loadGraph`, and an old cache block deleted.

Arm A is checking cache-move correctness and the staleness gate. You are the INDEPENDENT pass — weight toward:

1. REGRESSION RISK: this is the highest-traffic search path in the fleet. The 43 existing tests in `scripts/lib/master-index-search-lib.test.mjs` pass. Read those tests — is there a behavior the old code had that the new code subtly breaks but no test covers? Specifically: did the cache-check MOVE change WHEN `_graphCache` gets populated for an oversized graph (>200MB)? Before the edit, did an oversized graph ever populate `_graphCache` under its own path? After?
2. CORRECTNESS-vs-SECURITY: `tryLoadSidecar` reads `system-graph-index.json` and trusts it (it is consumed by a per-prompt hook). The sidecar's `nodes[]` become `graph.nodes` and `searchGraphHits` does `graph.nodes.map(n => [n.id, n])`. Could a malformed/hostile sidecar (e.g. `nodes` containing non-objects, `inverted` postings pointing out of range, a node with no `id`) crash `searchGraphHits` or `runMasterIndexSearch`? Trace from `tryLoadSidecar`'s return value INTO `searchGraphHits` (~line 237) and confirm every field it touches is safe.
3. STALENESS EDGE: the gate is `Number(sc.sourceMtimeMs) >= graphStat.mtimeMs`. `mtimeMs` is a float. Is exact equality (`>=`) safe? If `build-graph-index` runs, th
... [+858 chars truncated]

### Assistant | 2026-05-19T02:56:02.573Z

I'll read the file end-to-end, the spec, and the test file to perform this independent scrutiny pass.

### Assistant | 2026-05-19T02:56:03.042Z

[tool_use: Read]

### Assistant | 2026-05-19T02:56:03.462Z

[tool_use: Read]

### Assistant | 2026-05-19T02:56:03.832Z

[tool_use: Read]

### User | 2026-05-19T02:56:08.535Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\master-index-search-lib.mjs' was already read 5s ago in this session and is unchanged (mtime 1779159174889). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T02:56:10.351Z

[tool_result] 1	---
2	unit_id: U-MASTER-INDEX-SIDECAR
3	milestone: DEV-TOOL-CONFLICT-AUDIT-2026-05-17
4	owner_slot: alpha
5	wave: DEV-INFRA
6	cost: M
7	status: pending
8	depends_on: []
9	unblocks: [U-ACTIVATE-BEFORE-BUILD-PRECHECK, full-graph-master-index-recall]
10	roi_score: 9.0
11	generated_at: 2026-05-18
12	generator_version: alpha-investigation-b7530614
13	---
14	
15	# U-MASTER-INDEX-SIDECAR — pre-built in
... [+6787 chars truncated]

### User | 2026-05-19T02:56:10.372Z

[tool_result] 1	/**
2	 * master-index-search-lib.test.mjs
3	 *
4	 * Real-value coverage for the shared keyword search lib used by both
5	 * master-index-precheck-inject.mjs and spawned-agent-context-lib.mjs.
6	 *
7	 * Uses node:test (matches the rest of .claude/helpers/ test pattern) so it
8	 * works under the portable node runner without vitest harness setup.
9	 *
10	 * Coverage:
11	 *   - tokenize: stopwords,
... [+27495 chars truncated]

### Assistant | 2026-05-19T02:56:14.564Z

The file content wasn't returned (read-once guard). I need to read it to perform the scrutiny. Let me use Grep to pull the relevant sections.

### Assistant | 2026-05-19T02:56:15.946Z

[tool_use: Bash]

### User | 2026-05-19T02:56:23.779Z

[tool_result] 557

### Assistant | 2026-05-19T02:56:26.418Z

[tool_use: Read]

### User | 2026-05-19T02:56:28.984Z

[tool_result] 1	/**
2	 * master-index-search-lib.mjs
3	 *
4	 * Shared keyword search over PRISM's two large knowledge corpora:
5	 *
6	 *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
7	 *      with pre-joined wiki + memory entry names. BM25-lite weighted scoring.
8	 *
9	 *   2. tribal-embed-index.json — every tribal-knowledge tip (title + text +
10	 *      domain). Keyword-only path (s
... [+13511 chars truncated]

### Assistant | 2026-05-19T02:56:31.916Z

[tool_use: Read]

### User | 2026-05-19T02:56:35.120Z

[tool_result] 280	  for (const n of nodes) {
281	    if (!n || typeof n.id !== "string") continue;
282	    try {
283	      // Defensive: knowledge.* MUST be arrays. Schema drift / partial-write
284	      // bugs upstream have produced object or null values here — without
285	      // the Array.isArray guard, .map() throws and the entire 92K-node
286	      // load aborts (Reviewer C P0 finding).
287	      const 
... [+11450 chars truncated]

### Assistant | 2026-05-19T02:58:08.441Z

I now have the full file. Let me trace each scrutiny axis carefully.

## Analysis

### Axis 1 — Regression risk: cache-check MOVE and oversized-graph cache population

I need to compare the OLD code path against the NEW. The spec File-3 description says "the process-cache check moved to the top of `loadGraph`, and an old cache block deleted." Let me trace the NEW flow:

1. `loadGraph` — `existsSync` → `statSync` → **cache check (lines 223-229)** keyed on `(graphPath, stat.mtimeMs)`.
2. `tryLoadSidecar` → on hit, cache + return.
3. Oversized-graph branch (lines 240-272): if `stat.size > maxBytes` → either recurse into fallback OR `return null`. **Critically: no cache write here.**
4. Legacy parse (lines 273-306): parse → build inverted → `wrapper` → **cache write (line 305)** → return.

**The reviewer's specific question:** "Before the edit, did an oversized graph ever populate `_graphCache` under its own path? After?"

Trace the oversized path. When `stat.size > maxBytes`:
- If fallback eligible: `return loadGraph(fallbackPath)` — the recursive call caches under the **fallback** path's key (`fallbackPath, fbStat.mtimeMs`), NOT the oversized primary's key. The oversized primary path is **never** cached.
- If fallback ineligible / fails: `return null` — no cache write.

Both before and after the edit, an oversized graph's *own path* never populates `_graphCache` — the legacy code's cache write was also at the bottom (line 305), past the `return null` for oversize. **No behavior change.** This is *correct and intended*: if the oversized primary were cached as a null/fallback wrapper under its own key, a subsequent shrink of the graph would be masked. Since the cache key is `(path, mtimeMs)` and oversize never writes, the next call re-stats and re-evaluates. ✓ No regression.

One subtle consequence worth noting (not a defect): on an oversized primary, every `loadGraph(primary)` call re-pays `existsSync + statSync` on the primary AND the full recursion + cache-lookup on 
... [+15004 chars truncated]
