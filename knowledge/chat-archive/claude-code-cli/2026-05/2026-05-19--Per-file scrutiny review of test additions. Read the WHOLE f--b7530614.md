---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "Per-file scrutiny review of test additions. Read the WHOLE file end-to-end and g"
date: "2026-05-19"
first_ts: "2026-05-19T03:17:40.407Z"
last_ts: "2026-05-19T03:18:54.931Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 8
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-a701e24a4b3577b60.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Per-file scrutiny review of test additions. Read the WHOLE file end-to-end and g

> **claude-code-cli** | 2026-05-19 | 22 msgs (8 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-a701e24a4b3577b60.jsonl`

## Transcript

### User | 2026-05-19T03:17:40.407Z

Per-file scrutiny review of test additions. Read the WHOLE file end-to-end and grade PASS or FAIL.

FILE: H:/prism/scripts/lib/master-index-search-lib.test.mjs — File 5 of a 5-file build (U-MASTER-INDEX-SIDECAR).
SPEC: H:/prism/state/shared/specs/UNITS/U-MASTER-INDEX-SIDECAR.md — File 5 section lists the required sidecar test cases.
UNDER TEST: H:/prism/scripts/lib/master-index-search-lib.mjs (`loadGraph` + `tryLoadSidecar` + `searchGraphHits`).

THE EDIT added: (a) a `readFileSync` import + a `generate as generateSidecar` import from `../build-graph-index.mjs`; (b) a NEW `describe("loadGraph: sidecar fast-path", ...)` block with 9 `it()` tests. Focus your review on that new block (the other 43 tests are pre-existing and pass).

The suite currently passes 52/52. Judge whether the 9 new tests VERIFY INTENT (Karpathy R9 — a test must FAIL if the sidecar logic breaks):

1. The spec's File 5 required cases: fresh-sidecar-used / stale / schema-mismatch / disable-knob / no-sidecar-regression. Are ALL FIVE covered by a real test?
2. The DISCRIMINATOR — the tests use `g.nodes[0].x === undefined` to mean "sidecar path" and `=== 99` to mean "legacy path". Is this discriminator sound? (The graph node has `x:99`; the compact sidecar node drops `x`.) Would a test that claims "sidecar used" actually FAIL if loadGraph silently fell back to the legacy parse?
3. The parity test (`sidecar-path search result is identical to the legacy-path result`) — does it genuinely prove the sidecar path and legacy path return the same ranked hits? Is it non-vacuous (does it assert hits actually exist)?
4. The malformed-sidecar test — does it actually exercise the crash path (null / non-object node elements reaching `searchGraphHits`) and prove no throw?
5. Test isolation — each test uses `makeSidecarFixture()` (own temp dir). Are temp dirs cleaned up (rmSync in finally)? Are env-var mutations (`PRISM_GRAPH_SIDECAR_DISABLE`) restored in finally? Is `_resetCachesForTests()` called so the loadGraph m
... [+466 chars truncated]

### Assistant | 2026-05-19T03:17:46.445Z

I'll review the test file comprehensively. Let me start by reading the spec and the test file.

### Assistant | 2026-05-19T03:17:46.664Z

[tool_use: Read]

### Assistant | 2026-05-19T03:17:46.800Z

[tool_use: Read]

### User | 2026-05-19T03:17:51.183Z

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
... [+36021 chars truncated]

### User | 2026-05-19T03:17:51.241Z

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
... [+7761 chars truncated]

### Assistant | 2026-05-19T03:17:53.765Z

Now let me read the implementation file to understand what the tests are actually testing:

### Assistant | 2026-05-19T03:17:53.953Z

[tool_use: Read]

### User | 2026-05-19T03:17:58.780Z

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
... [+12086 chars truncated]

### Assistant | 2026-05-19T03:18:00.590Z

Let me continue reading the implementation:

### Assistant | 2026-05-19T03:18:01.109Z

[tool_use: Read]

### User | 2026-05-19T03:18:05.200Z

[tool_result] 250	  ) {
251	    return _graphCache.wrapper;
252	  }
253	
254	  // Sidecar fast-path — pre-built inverted index, skips the ~138 s full-graph
255	  // parse with FULL node coverage. Returns null (→ legacy path below) when the
256	  // sidecar is absent / stale / schema-mismatched / knob-disabled.
257	  const sidecar = tryLoadSidecar(graphPath, stat);
258	  if (sidecar) {
259	    _graphCache = { pa
... [+7306 chars truncated]

### Assistant | 2026-05-19T03:18:07.654Z

Now let me check the `build-graph-index.mjs` file to verify the import safety:

### Assistant | 2026-05-19T03:18:08.033Z

[tool_use: Read]

### User | 2026-05-19T03:18:15.040Z

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
... [+4095 chars truncated]

### Assistant | 2026-05-19T03:18:17.362Z

Good. Now let me check if there's a main() function that would execute on import:

### Assistant | 2026-05-19T03:18:18.880Z

[tool_use: Grep]

### User | 2026-05-19T03:18:22.321Z

[tool_result] 302:function main() {

### Assistant | 2026-05-19T03:18:23.929Z

Let me check the end of the file to see if main() is auto-executed:

### Assistant | 2026-05-19T03:18:24.093Z

[tool_use: Read]

### User | 2026-05-19T03:18:29.435Z

[tool_result] 300	}
301	
302	function main() {
303	  reExecWithHeapIfNeeded();
304	  const args = parseArgs(process.argv.slice(2));
305	  try {
306	    const r = generate(args);
307	    process.stdout.write(
308	      `[build-graph-index] ✓ ${r.nodeCount}/${r.rawNodeCount} nodes indexed `
309	      + `(${r.skipped} skipped) · ${r.tokenCount} tokens · `
310	      + `${(r.sidecarBytes / 1048576).toFixed(1)} MB · 
... [+499 chars truncated]

### Assistant | 2026-05-19T03:18:54.931Z

Perfect. Now I have all the information I need to conduct the review. Let me analyze the 9 new test cases in the "loadGraph: sidecar fast-path" block (lines 453-618).

## SCRUTINY REVIEW: master-index-search-lib.test.mjs (File 5 of 5)

### Spec Coverage Check (Requirement: ALL FIVE required cases)

**Spec File 5 required cases:**
1. Fresh sidecar present → loadGraph uses it, full node count, fast
2. Stale sidecar (sourceMtimeMs < graph mtime) → ignored, legacy path
3. schemaVersion mismatch → ignored
4. `PRISM_GRAPH_SIDECAR_DISABLE=1` → legacy path
5. Regression: no sidecar → byte-identical to today (arch fallback still fires)

**Tests mapping to spec:**
- Line 484-497: ✓ Fresh sidecar
- Line 499-509: ✓ Stale sidecar
- Line 511-520: ✓ schemaVersion mismatch
- Line 522-535: ✓ PRISM_GRAPH_SIDECAR_DISABLE=1
- Line 537-549: ✓ No sidecar (regression)
- Line 551-561: Unparseable sidecar (bonus, reasonable)
- Line 563-577: Malformed sidecar nodes (bonus, tests `null / non-object`)
- Line 579-593: `constructor`-named token edge case (bonus, real correctness)
- Line 595-617: Sidecar-vs-legacy parity test (bonus, cross-path verification)

**VERDICT on spec coverage: PASS** — All 5 required cases covered + 4 bonus tests.

---

### Discriminator Soundness (Assertion: `g.nodes[0].x === undefined` means sidecar, `=== 99` means legacy)

**Analysis:**
- Line 464-465: Fixture graph has `x: 99` on all nodes
- Line 474: `generateSidecar()` is called (this compacts the nodes via build-graph-index logic)
- Line 493: Asserts `g.nodes[0].x === undefined` ("compact sidecar nodes used")
- Line 505, 516, 529, 544: Asserts `g.nodes[0].x === 99` ("legacy parse")

**Critical check:** Does `build-graph-index.mjs` actually DROP the `x` field when compacting?
- Line 100-120 of build-graph-index.mjs (not shown, but the spec line 61 shows compact shape: `{ "id", "label"?, "layer"?, "status"?, "info"?, "knowledge"?:{...} }`)
- The `x` field is NOT in that schema
- So yes, the sidecar nodes will have 
... [+5654 chars truncated]
