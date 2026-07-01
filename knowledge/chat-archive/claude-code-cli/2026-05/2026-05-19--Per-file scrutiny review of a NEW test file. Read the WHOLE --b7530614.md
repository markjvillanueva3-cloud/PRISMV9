---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "Per-file scrutiny review of a NEW test file. Read the WHOLE file end-to-end and "
date: "2026-05-19"
first_ts: "2026-05-19T02:44:29.160Z"
last_ts: "2026-05-19T02:45:52.623Z"
cwd: "H:\\prism"
messages: 18
user_msgs: 7
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-ab9a2df935beb9549.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Per-file scrutiny review of a NEW test file. Read the WHOLE file end-to-end and 

> **claude-code-cli** | 2026-05-19 | 18 msgs (7 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-ab9a2df935beb9549.jsonl`

## Transcript

### User | 2026-05-19T02:44:29.160Z

Per-file scrutiny review of a NEW test file. Read the WHOLE file end-to-end and grade PASS or FAIL.

FILE: H:/prism/scripts/build-graph-index.test.mjs — node:test suite (File 2 of a 5-file build).
TESTS: H:/prism/scripts/build-graph-index.mjs — read it to verify the tests actually exercise the real contract.
SPEC: H:/prism/state/shared/specs/UNITS/U-MASTER-INDEX-SIDECAR.md — File 2 section lists required coverage.

The suite currently passes 22/22. Your job is to judge whether the tests VERIFY INTENT (Karpathy R9 — a test must fail when the business logic breaks), not just whether they're green.

VERIFY:
1. The "gold parity" test (`parity: sidecar inverted is identical to loadGraph's index`) — does it genuinely prove the sidecar's token→node index matches what `loadGraph` builds today? This is the load-bearing correctness claim of the whole unit. Would this test FAIL if build-graph-index's blob construction drifted from loadGraph's?
2. The tokenize-parity test — the `oracleBlob`/`oracleEntryName` helpers are an independent re-implementation. Are they actually independent (not importing the thing under test), and do they faithfully mirror loadGraph's blob formula `${n.id} ${n.label ?? ""} ${n.info ?? ""} ${wikiNames} ${memNames}`?
3. Fail-loud coverage — are there real assertions that `generate()` THROWS on missing-graph / no-nodes / 0-nodes / mass-skip? Are the regex matchers specific enough to not pass on the wrong error?
4. Skip-behavior — does a test prove null / id-less / non-string-id nodes are skipped AND that postings remain valid after the skip?
5. The mass-skip floor test + the MIN_RATIO=0 knob test — do they restore process.env afterward (no test pollution)?
6. The CLI tests — do they assert exit codes (0 / non-zero) AND the actual file output, or just one? Is the heap-re-exec path genuinely exercised?
7. Are there any weak assertions (`toBeDefined`-style, `assert.ok(true)`, asserting a value against itself, hardcoded-pass) that would not catch a real regr
... [+291 chars truncated]

### Assistant | 2026-05-19T02:45:07.102Z

I'll read the test file and the source file to verify whether the tests actually exercise the real contract.

### Assistant | 2026-05-19T02:45:07.351Z

[tool_use: Read]

### Assistant | 2026-05-19T02:45:07.561Z

[tool_use: Read]

### Assistant | 2026-05-19T02:45:07.622Z

[tool_use: Read]

### User | 2026-05-19T02:45:10.640Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-graph-index.mjs' was already read 8m ago in this session and is unchanged (mtime 1779158103332). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T02:45:12.665Z

[tool_result] 1	/**
2	 * build-graph-index.test.mjs — node:test suite for the master-index sidecar
3	 * generator (U-MASTER-INDEX-SIDECAR, File 2 of 5).
4	 *
5	 * Coverage:
6	 *  - sidecar shape + schemaVersion
7	 *  - posting integrity (every index valid; no duplicates)
8	 *  - tokenize parity — sidecar `inverted` === what loadGraph builds (gold check)
9	 *  - compact node shape (searchGraphHits-consumed: know
... [+15332 chars truncated]

### User | 2026-05-19T02:45:12.681Z

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

### Assistant | 2026-05-19T02:45:14.647Z

Now let me read the source file to verify the tests against the actual implementation:

### Assistant | 2026-05-19T02:45:15.316Z

[tool_use: Read]

### User | 2026-05-19T02:45:20.592Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-graph-index.mjs — offline inverted-index sidecar generator for
4	 * PRISM master-index search.
5	 *
6	 * UNIT: U-MASTER-INDEX-SIDECAR (DEV-TOOL-CONFLICT-AUDIT-2026-05-17)
7	 *
8	 * WHY: `master-index-search-lib.mjs` `loadGraph()` caps graph loads at 200 MB.
9	 * The merged `system-graph.json` is 372 MB / 243,687 nodes, so every
10	 * master-index search silen
... [+8809 chars truncated]

### Assistant | 2026-05-19T02:45:22.113Z

Let me continue reading the source to see the full implementation:

### Assistant | 2026-05-19T02:45:22.327Z

[tool_use: Read]

### User | 2026-05-19T02:45:27.021Z

[tool_result] 200	/** Resolve the mass-skip floor ratio (knob: PRISM_BUILD_GRAPH_INDEX_MIN_RATIO). */
201	function minIndexedRatio() {
202	  const raw = process.env.PRISM_BUILD_GRAPH_INDEX_MIN_RATIO;
203	  if (raw != null && raw !== "" && Number.isFinite(Number(raw))) return Number(raw);
204	  return 0.5;
205	}
206	
207	/**
208	 * Read the graph, build the sidecar, write it. Returns a summary object.
209	 * Thr
... [+4888 chars truncated]

### Assistant | 2026-05-19T02:45:29.009Z

Now let me verify the master-index-search-lib to confirm the parity claims:

### Assistant | 2026-05-19T02:45:29.837Z

[tool_use: Grep]

### User | 2026-05-19T02:45:32.119Z

[tool_result] 83- * @param {object} [opts]
84- * @param {number} [opts.maxLen=4000]      — trim text past this length
85- * @param {number} [opts.maxTokens=8]      — cap returned tokens
86- * @returns {string[]}
87- */
88:export function tokenize(text, opts = {}) {
89-  if (!text || typeof text !== "string") return [];
90-  const maxLen = opts.maxLen ?? DEFAULT_MAX_PROMPT_LEN;
91-  const maxTokens = opts.maxTok
... [+2193 chars truncated]

### Assistant | 2026-05-19T02:45:52.623Z

Now I have enough information to conduct the review. Let me analyze the test file against the source code and spec:

## REVIEW: build-graph-index.test.mjs

### Analysis

**1. Gold Parity Test (lines 185-204) — LOAD-BEARING CORRECTNESS CLAIM**

✓ **PASS** — The test genuinely verifies the sidecar inverted index matches `loadGraph`'s:
- Loads the fixture graph through `loadGraph()` (real invocation, not mock)
- Rebuilds the sidecar's index by mapping indices → ids: `sidecar.get(tok) = Set(idxs.map(i => s.nodes[i].id))`
- Compares **two independently-built inverted indexes** (one from `buildGraphIndex`, one from `loadGraph`)
- This WILL fail if either `tokenize()`, `entryName()`, or blob construction drifts

**2. Tokenize Parity Test (lines 161-172) — ORACLE INDEPENDENCE**

✓ **PASS** — The oracle functions are genuinely independent:
- `oracleEntryName()` (lines 77-84) and `oracleBlob()` (lines 85-90) do NOT import the source code
- They replicate the blob formula `${id} ${label} ${info} ${wikiNames} ${memNames}` verbatim
- They mirror `entryName()` logic: string-passthrough, then `.name`, then `.path`, then empty
- **Regression guard:** If blob construction changes in the source, this test will catch it

**3. Fail-Loud Coverage (lines 135-267) — THROWS ON SCHEMA VIOLATIONS**

✓ **PASS** — All required fail cases are tested:
- Line 136-138: `no nodes[]` → throws `/no nodes/`
- Line 247-248: missing graph → throws `/not found/`
- Line 251-253: 0-node graph → throws `/0 nodes|no nodes/`
- Line 261-266: mass-skip (1/10 = 10% < 50% floor) → throws `/1\/10 nodes indexed|floor/`

All error matchers are **specific enough** (not generic `/error/`). **Would fail on real breaks.**

**4. Skip Behavior (lines 106-113) — VALIDATES NULL/IDLESS/NON-STRING-ID SKIP**

✓ **PASS** — Test verifies:
- 5 of 8 fixture nodes are indexed (null, no-id, numeric-id skipped — confirmed line 112)
- Every indexed node has `typeof n.id === "string"` (line 111)
- Postings remain valid after skip: line
... [+3115 chars truncated]
