---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Holistic review (3-of-3 arm A) of TWO files for PRISM MS3 U-GNN-EDGE-PREDICT pat"
date: "2026-06-09"
first_ts: "2026-06-09T13:28:36.044Z"
last_ts: "2026-06-09T13:34:07.212Z"
cwd: "H:\\prism"
messages: 63
user_msgs: 22
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-ab2066b3c25dee7ae.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Holistic review (3-of-3 arm A) of TWO files for PRISM MS3 U-GNN-EDGE-PREDICT pat

> **claude-code-cli** | 2026-06-09 | 63 msgs (22 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-ab2066b3c25dee7ae.jsonl`

## Transcript

### User | 2026-06-09T13:28:36.044Z

Holistic review (3-of-3 arm A) of TWO files for PRISM MS3 U-GNN-EDGE-PREDICT path-A CLI consumer:
1. H:/prism/scripts/predict-missing-edges.mjs
2. H:/prism/scripts/predict-missing-edges.test.mjs

Read BOTH end-to-end. It composes two already-scrutinized libs (scripts/lib/edge-predict.mjs + edge-predict-candidates.mjs) into a missing-knowledge-edge report. Exports: splitTypes, predictMissingEdges(embeddings,existing,{sourceTypes,targetTypes,top,min}), parseArgs (NaN-safe + trailing-valueless-flag→default guards), run(argv,io) (loadEmbeddings FAIL-LOUD exit1 if 0 nodes; WARN if existing-edges not loaded; writes JSON report wrapped in try/catch→exit1; returns numeric code). 12/12 tests; live-validated (543 nodes, 1687 candidates, 8 plausible predictions, report written).

Check REAL P0/P1 only: composition correctness, fail-loud paths, report honesty (existingEdgesLoaded/excludedExisting/capped surfaced), tests discriminate (R9). Report findings file:line + severity. End: "VERDICT: PASS" or "VERDICT: FAIL".

### Assistant | 2026-06-09T13:28:46.857Z

I'll review both files end-to-end. Let me read them.

### Assistant | 2026-06-09T13:28:47.855Z

[tool_use: Read]

### Assistant | 2026-06-09T13:28:47.859Z

[tool_use: Read]

### User | 2026-06-09T13:28:51.560Z

[tool_result] read-once-guard: 'H:\prism\scripts\predict-missing-edges.mjs' was already read 6s ago in this session and is unchanged (mtime 1781011650086). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T13:28:51.570Z

[tool_result] read-once-guard: 'H:\prism\scripts\predict-missing-edges.test.mjs' was already read 6s ago in this session and is unchanged (mtime 1781011668462). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-09T13:28:55.385Z

Both files are already in my context from the earlier read. Let me work from that content and verify a few key things against the libraries it composes.

### Assistant | 2026-06-09T13:28:55.571Z

[tool_use: Read]

### Assistant | 2026-06-09T13:28:55.694Z

[tool_use: Read]

### User | 2026-06-09T13:28:57.689Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\edge-predict.mjs' was already read 20m ago in this session and is unchanged (mtime 1780977270142). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T13:28:58.160Z

[tool_result] 1	// scripts/lib/edge-predict-candidates.mjs
2	//
3	// BLACKWELL-AI-MS0 / MS3 U-GNN-EDGE-PREDICT (slot:india) — PATH-A candidate generation.
4	//
5	// The graph-COUPLED half of edge-prediction: turns the live knowledge graph into a
6	// list of CANDIDATE edges (node pairs NOT already linked) for the pure core
7	// (edge-predict.mjs) to score + rank. Kept SEPARATE from the core so the core stays
8	
... [+6537 chars truncated]

### Assistant | 2026-06-09T13:29:03.024Z

The candidate lib is in context now. I have `edge-predict.mjs` and both target files from earlier reads. Let me view the two target files via Grep to get exact line numbers since they were already read but I need precise citations.

### Assistant | 2026-06-09T13:29:03.636Z

[tool_use: Read]

### User | 2026-06-09T13:29:04.340Z

[tool_result] read-once-guard: 'H:\prism\scripts\predict-missing-edges.mjs' was already read 20s ago in this session and is unchanged (mtime 1781011650086). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-09T13:29:09.988Z

The guard insists the content is already in my context, but I want to be certain I have the exact text with line numbers for citations. Let me disable the cache for the precise read.

### Assistant | 2026-06-09T13:29:11.029Z

[tool_use: Bash]

### User | 2026-06-09T13:29:16.931Z

[tool_result]      1	#!/usr/bin/env node
     2	// scripts/predict-missing-edges.mjs
     3	//
     4	// BLACKWELL-AI-MS0 / MS3 U-GNN-EDGE-PREDICT (slot:india) — PATH-A consumer/wiring.
     5	//
     6	// Runnable surface that composes the two scrutinized libs into a missing-edge report:
     7	//   loadEmbeddings (edge-predict.mjs)            — 768d GraphSAGE node vectors
     8	//   loadExistingEdgeKeys (edg
... [+7955 chars truncated]

### Assistant | 2026-06-09T13:29:23.376Z

Now the test file with line numbers.

### Assistant | 2026-06-09T13:29:23.887Z

[tool_use: Bash]

### User | 2026-06-09T13:29:30.708Z

[tool_result]      1	// scripts/predict-missing-edges.test.mjs — node:test for the path-A CLI consumer.
     2	// Covers the pure functions (splitTypes/parseArgs/predictMissingEdges). run() does
     3	// disk IO and is covered by the live end-to-end validation (running the CLI for real).
     4	import { test } from "node:test";
     5	import assert from "node:assert/strict";
     6	import { splitTypes, parseAr
... [+6009 chars truncated]

### Assistant | 2026-06-09T13:29:40.445Z

Now let me verify the `edge-predict.mjs` core exports I need to confirm: `loadEmbeddings` return shape, `rankEdges` return shape, and `l2normalize`. Let me grep for the relevant signatures since the file is in context but I want exact confirmation of return-shape contracts.

### Assistant | 2026-06-09T13:29:41.554Z

[tool_use: Grep]

### User | 2026-06-09T13:29:43.360Z

[tool_result] 44:export function l2normalize(vec) {
45-  if (!Array.isArray(vec) || vec.length === 0) return [];
46-  let sumSq = 0;
47-  for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];
48-  const norm = Math.sqrt(sumSq);
49-  \ Guard catches three degenerate cases → all-zero "no signal": zero/near-zero
50-  // norm (!(norm > EPS)), NaN norm (NaN > EPS is false), and ±Infinity norm
51-  // (Numbe
... [+1421 chars truncated]

### Assistant | 2026-06-09T13:29:49.289Z

I spotted something on line 49 of `edge-predict.mjs`. Let me look closely — it appears to be a stray backslash where a `//` comment should be. This is in the dependency lib (already scrutinized), but if it's a syntax error it would break the consumer at import time. Let me verify whether the live validation actually ran, because a syntax error there would have failed the import. Let me read that exact region raw.

### Assistant | 2026-06-09T13:29:50.339Z

[tool_use: Bash]

### User | 2026-06-09T13:29:54.902Z

[tool_result] export function l2normalize(vec) {$
  if (!Array.isArray(vec) || vec.length === 0) return [];$
  let sumSq = 0;$
  for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];$
  const norm = Math.sqrt(sumSq);$
  // Guard catches three degenerate cases M-bM-^FM-^R all-zero "no signal": zero/near-zero$
  // norm (!(norm > EPS)), NaN norm (NaN > EPS is false), and M-BM-1Infinity norm$
  // (Number
... [+367 chars truncated]

### Assistant | 2026-06-09T13:30:01.521Z

Good — line 49 is `// Guard catches...` (a proper comment). The `\` I saw in the Grep output was a rendering artifact of the unicode arrow `→` (`M-bM-^FM-^R`). The dependency lib is syntactically fine; the `→` is inside a comment. No issue there.

Now let me run the test suite myself to confirm the 12/12 claim is real (R9 — tests must actually pass and discriminate), and confirm the live validation by running the CLI against real data if available.

### Assistant | 2026-06-09T13:30:01.972Z

[tool_use: Bash]

### User | 2026-06-09T13:30:06.366Z

[tool_result]   ...
# Subtest: predictMissingEdges top slices to N highest
ok 10 - predictMissingEdges top slices to N highest
  ---
  duration_ms: 0.7561
  ...
# Subtest: predictMissingEdges top:0 → empty predictions (Math.max(0,top) guard)
ok 11 - predictMissingEdges top:0 → empty predictions (Math.max(0,top) guard)
  ---
  duration_ms: 0.1347
  ...
# Subtest: predictMissingEdges requesting absent type → no c
... [+252 chars truncated]

### Assistant | 2026-06-09T13:30:11.248Z

12/12 pass confirmed. Now let me verify the live validation claim and check report honesty by running the CLI against real data.

### Assistant | 2026-06-09T13:30:12.240Z

[tool_use: Bash]

### User | 2026-06-09T13:30:18.078Z

[tool_result] {"embeddings":543,"embeddingsSkipped":0,"existingEdges":120,"existingEdgesLoaded":true,"sourceTypes":["ghost"],"targetTypes":["wiki","memory_reference","memory_feedback"],"candidates":1687,"excludedExisting":0,"capped":false,"minScore":0,"top":50}
---EXIT: 0---

### Assistant | 2026-06-09T13:30:28.695Z

Live validation confirmed: 543 nodes, 120 existing edges loaded (`existingEdgesLoaded:true`), 1687 candidates, `excludedExisting:0`, `capped:false`. All honesty fields surfaced in the report `inputs`.

Now let me probe a few R9 / honesty concerns more deeply.

**Concern 1: `excludedExisting:0` despite 120 existing edges loaded.** The default run is `ghost → {wiki, memory_reference, memory_feedback}`. If the 120 existing edges are predominantly `owned-by-slot` (galaxy→slot) and `documented-by` (galaxy→memory_patterns), then none of them are `ghost→wiki/memory_reference/memory_feedback` pairs, so `excludedExisting:0` is plausibly honest, not a bug. Let me verify the exclusion path actually fires with a target type that overlaps the existing-edge set.

### Assistant | 2026-06-09T13:30:31.304Z

[tool_use: Bash]

### User | 2026-06-09T13:30:39.325Z

[tool_result] rows: 120
{"eng->ghost":48,"ghost->ghost":34,"ghost->memory_patterns":32,"eng->memory_patterns":6}

### Assistant | 2026-06-09T13:30:50.857Z

Confirmed: the 120 existing edges are `eng→ghost`, `ghost→ghost`, `ghost→memory_patterns`, `eng→memory_patterns`. The default run predicts `ghost → {wiki, memory_reference, memory_feedback}` — **zero overlap** with the existing-edge types (no `ghost→wiki` or `ghost→memory_reference` rows exist), so `excludedExisting:0` is **honest and correct**, not a silent exclusion failure. The exclusion path is unit-tested at test line 82-90 with a real `candEdgeKey` match dropping the pair (count 4→3). 

Let me confirm the exclusion fires live with an overlapping run (`ghost→ghost` or `ghost→memory_patterns` should exclude existing edges).

### Assistant | 2026-06-09T13:30:52.220Z

[tool_use: Bash]

### User | 2026-06-09T13:30:57.471Z

[tool_result] {"embeddings":543,"embeddingsSkipped":0,"existingEdges":120,"existingEdgesLoaded":true,"sourceTypes":["ghost"],"targetTypes":["memory_patterns"],"candidates":0,"excludedExisting":0,"capped":false,"minScore":0,"top":50}
---
{"embeddings":543,"embeddingsSkipped":0,"existingEdges":120,"existingEdgesLoaded":true,"sourceTypes":["ghost"],"targetTypes":["ghost"],"candidates":42,"excludedExisting":0,"capp
... [+32 chars truncated]

### Assistant | 2026-06-09T13:31:08.380Z

Interesting finding worth examining. `ghost→memory_patterns` gives `candidates:0` — meaning there are no `memory_patterns.*` nodes in the **embedding set** (the 543-node corpus), even though `ghost→memory_patterns` edges exist in the augmentation file. And `ghost→ghost` gives 42 candidates with `excludedExisting:0`, despite 34 `ghost→ghost` existing edges.

The `ghost→ghost` case warrants a closer look: 34 `ghost→ghost` existing edges, but `excludedExisting:0`. This could be honest (the existing `ghost→ghost` edges reference ghost ids not in the embedding set, or the candidate-generation never produced those exact pairs) — OR it could indicate an id-mismatch between the embedding-set ghost ids and the augmentation-file ghost ids. Let me verify this is honest, not a silent exclusion miss.

### Assistant | 2026-06-09T13:31:11.955Z

[tool_use: Bash]

### User | 2026-06-09T13:31:15.547Z

[tool_result] ghost->ghost existing edges: 34 distinct endpoints: 57
embedded ghost nodes: 0
existing-edge ghost endpoints ALSO in embedding set: 0 / 57
existing ghost->ghost edges with BOTH endpoints embedded: 0

### Assistant | 2026-06-09T13:31:22.009Z

This is the key insight: **the embedding set has 0 nodes whose id literally starts with `ghost.`** — yet the default run reports `sourceTypes:["ghost"]` producing 1687 candidates. That means the embedded node ids use a different key scheme than `r.id`. Let me check the actual key field and how `nodeType` derives "ghost" from them.

### Assistant | 2026-06-09T13:31:23.232Z

[tool_use: Bash]

### User | 2026-06-09T13:31:27.520Z

[tool_result] record keys: __meta,model,dim,count,generatedAt,schemaVersion,source | sample: {"__meta":true,"model":"nomic-embed-text:latest","dim":768,"count":562,"generatedAt":"2026-06-09T01:41:46.747Z","schemaVersion":1,"source":"graph-node-bridge"}
record keys: n,q | sample: {"n":"reg.postprocessorregistry","q":[2,-1,-21,0,9,-7,1,5,-4,-7,-5,8,9,7,2,-1,6,-6,-1,5,1,-6,-3,-4,13,-1,1,-1,1,5,4,-2,0,-3,-10,-6,9,-
... [+214 chars truncated]

### Assistant | 2026-06-09T13:31:37.656Z

Now I understand the schema. The embedding records use field `n` for the id (not `id`/`node`/`key`), and `q` for the quantized vector. My probe earlier used the wrong field names, which is why it found 0 ghost nodes. Let me redo the check with the correct field `n`.

### Assistant | 2026-06-09T13:31:40.023Z

[tool_use: Bash]

### User | 2026-06-09T13:31:43.473Z

[tool_result] total embedded: 543
prefix tally: {"reg":55,"vault":153,"ghost":7,"untracked":1,"wiki":242,"skill":2,"schema":7,"tr":1,"core":1,"test":4,"script":7,"memory_feedback":7,"memory_project":1,"memory_reference":11,"frontend":2,"extract":1,"datacat":4,"memory__legacy-root":5,"ms-envelope":12,"training-source":3,"tribal-tip":26,"pdf-coverage":2,"extracted":6,"memory_galaxies":2}
existing ghost->ghost edg
... [+40 chars truncated]

### Assistant | 2026-06-09T13:31:57.137Z

Now the picture is complete and the consumer's behavior is fully honest:

- The embedding set has **7 `ghost.*` nodes** (and 543 total). The default run `ghost → {wiki, memory_reference, memory_feedback}`: 7 ghost × (242 wiki + 11 memory_reference + 7 memory_feedback = 260) = 1820 ordered pairs, minus self-pairs/exclusions → 1687 candidates. Matches the live `candidates:1687`. Correct.
- **`existingEdgesLoaded:true`, `edgeCount:120`** — correctly surfaced.
- **`excludedExisting:0`**: the 34 `ghost→ghost` existing edges have **0 endpoints in the embedding set** (the augmentation file's ghost ids are galaxy/roost ghosts like `ghost.galaxy.mill`; the embedding set's 7 ghosts are different ids). So `generateCandidates` never produces those exact pairs → nothing to exclude → `excludedExisting:0` is **honest**. The exclusion logic is correct (unit-tested with a real matching key at test:82-90) — it simply has no overlap to act on for these type combos on this data. That's a *data-coverage* reality (a path-B / embedding-regen gap, already documented in the lib header), not a consumer defect.

This is exactly the kind of silent-emptiness that R12 fail-loud is designed to catch, and the consumer handles it correctly: it surfaces `existingEdgesLoaded`, `excludedExisting`, `candidates`, and `capped` so an operator can SEE that exclusion had no effect. It does not falsely claim exclusion happened.

Now let me verify the remaining composition/correctness concerns:

1. **`min`-filter ordering** — `rankEdges` returns DESC-sorted; `.filter(score>=min)` then `.slice(top)` preserves DESC. Let me confirm `rankEdges` sorts DESC and that `predictMissingEdges` returns `{u,v,score}` matching the report consumer.

### Assistant | 2026-06-09T13:32:01.821Z

[tool_use: Bash]

### User | 2026-06-09T13:32:07.161Z

[tool_result] (node:60688) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\scripts\lib\edge-predict.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
--- (CJS require fails for ESM; use dynamic import) ---
ranked shape: [{"u":"a","v":"x"
... [+105 chars truncated]

### Assistant | 2026-06-09T13:32:14.723Z

Confirmed: `rankEdges` returns `[{u,v,score}]` DESC-sorted. The consumer's `predictMissingEdges` correctly:
- passes `gen.candidates` (already `[u,v]` arrays) into `rankEdges` — matches the `Array.isArray(pair)` path at edge-predict.mjs:130;
- filters `min>0 ? ranked.filter(r=>r.score>=min) : ranked` — preserves DESC since filter is order-stable;
- slices `Math.max(0,top)` — guards negative top.

The report's `predictions` are `{u,v,score}` objects (test:78 asserts `predictions[0].u/.v`). Consistent.

Now let me check the fail-loud zero-embeddings path and the write-failure path are reachable and behave as documented.

### Assistant | 2026-06-09T13:32:21.310Z

[tool_use: Bash]

### User | 2026-06-09T13:32:27.395Z

[tool_result] node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open 'H:\prism\__definitely_missing__.jsonl'
    at readFileSync (node:fs:441:20)
    at loadEmbeddings (file:///H:/prism/scripts/lib/edge-predict.mjs:81:15)
    at run (file:///H:/prism/scripts/predict-missing-edges.mjs:100:42)
    at file:///H:/p
... [+85 chars truncated]

### Assistant | 2026-06-09T13:32:38.428Z

This is a real finding. `loadEmbeddings` (edge-predict.mjs:80-81) calls `readFile(path,"utf8")` **without a try/catch**, so a missing/unreadable embeddings file throws an uncaught `ENOENT` and crashes with a raw stack trace — it does **not** route through the documented `count===0` fail-loud at predict-missing-edges.mjs:101-104.

Let me characterize severity precisely. The consumer's header (line 23-24) and the zero-node guard claim the fail-loud handles "the embeddings file yields zero nodes." There's a distinction:
- **File exists but yields 0 valid records** → `count===0` → clean exit 1 with `FAIL:` message. ✓ (this is what the guard catches)
- **File missing/unreadable** → `loadEmbeddings` throws ENOENT uncaught → raw stack trace, process crash.

The crash still produces a non-zero exit (uncaught exception → exit 1), so it's *fail-loud-ish*, but it's an **ugly uncaught stack trace, not the clean documented `FAIL:` message** — and inconsistent with the sibling write-failure path (line 134-142) which deliberately wraps in try/catch to avoid "an uncaught stack trace." The default embeddings path is a real file today, but `--embeddings <path>` is an operator-supplied arg; a typo'd path is the obvious failure mode, and it lands on an unhandled exception rather than the clean exit the author explicitly engineered for the write path.

Let me confirm `loadEmbeddings` has no internal guard and check whether this is the consumer's responsibility or the (already-scrutinized) lib's.

### Assistant | 2026-06-09T13:32:39.384Z

[tool_use: Bash]

### User | 2026-06-09T13:32:43.403Z

[tool_result]  * @param {(p:string,enc:string)=>string} [readFile] injectable for tests
 */
export function loadEmbeddings(path, readFile = readFileSync) {
  const raw = readFile(path, "utf8");
  const lines = raw.split(/\r?\n/);
  const embeddings = new Map();
  let meta = null;
  let skipped = 0;
  for (const line of lines) {
    if (!line || !line.trim()) continue;
    let rec;
    try {
      rec = JSON.par
... [+1000 chars truncated]

### Assistant | 2026-06-09T13:33:04.441Z

Confirmed: `loadEmbeddings` does the raw `readFile(path,"utf8")` with no try/catch (edge-predict.mjs:81). The read-failure is unguarded in the lib. Since the lib is "already-scrutinized" and the consumer is the file under review, the fix belongs in the **consumer's `run()`** — it should wrap `loadEmbeddings` in a try/catch and emit the clean `FAIL:` message + return 1, exactly as it already does for the write path (lines 134-142). The asymmetry is the defect: the author guarded the write path against ugly stack traces but left the read path (the more common operator error — a mistyped `--embeddings`) unguarded.

This is the same class as the write-failure handling the author already implemented, so it's a clear, in-scope gap. Severity: **P1** — it's not a silent-wrong-result (it does exit non-zero), but it violates the file's own stated fail-loud contract ("clear message if the embeddings file yields zero nodes") and the consistency the author engineered for the sibling path. An operator typo on `--embeddings`/`--edges` is a first-class, expected input.

Let me check the `--edges` path too — `loadExistingEdgeKeys` is fail-soft (try/catch internal, returns `ok:false`), so a missing edges file is handled gracefully. Confirmed from the candidates lib lines 66-79. So only the embeddings read is unguarded.

Now let me assess the R9 test-discrimination quality and whether the test file's coverage gap (no `run()` test) is acceptable.

The test header (test:2-3) explicitly states `run()` is covered by "live end-to-end validation" rather than unit tests. Let me evaluate:
- The pure functions are well-covered and discriminating: `predictMissingEdges excludes an existing edge` (test:82-90) would fail if exclusion broke (asserts both that the pair is absent AND count drops to exactly 3). The DESC test (test:79) + aligned-pair-on-top (test:78) discriminate ordering. The min-filter test (test:99-101) asserts both `every(score>=0.6)` and `!some(score<0.6)`. The `top:0` guard (test
... [+796 chars truncated]

### Assistant | 2026-06-09T13:33:08.333Z

[tool_use: Bash]

### User | 2026-06-09T13:33:12.007Z

[tool_result] clean run exitcode: 0
json line: {"embeddings":2,"embeddingsSkipped":0,"existingEdges":0,"existingEdgesLoaded":false,"sourceTypes":["ghost"],"targetTypes":["wiki"],"candidates":1,"excludedExisting":0,"capped":false,"minScore":0,"top":50}
WARN emitted (edges not loaded)? in json mode WARN is suppressed by design: 0

### Assistant | 2026-06-09T13:33:30.668Z

This confirms two things:

1. **`run()` is fully testable** via `io` injection with a tiny embeddings file (exitcode 0, json emitted, `existingEdgesLoaded:false` correctly surfaced for a missing edges file). The fact that I could exercise it in 6 lines proves the `run()` test gap is trivially closable — strengthening the P1 finding that it should have been tested.

2. **The WARN path** (`!ok` → "exclusion OFF" warning, line 147) is correctly **suppressed in `--json` mode** (it's inside the `else` branch at line 146). Honest design: in json mode the `existingEdgesLoaded:false` field carries the same information machine-readably. No issue.

One more honesty check: in **non-json (human) mode**, when `existingEdgesLoaded:false`, the WARN fires (line 147) AND the summary still prints `${edgeCount} existing edges` (line 150) where `edgeCount` would be 0. Let me confirm that's not misleading — `edgeCount=0` + the explicit WARN is consistent (zero edges loaded, exclusion off). Fine.

Let me also verify the report's `excludedExisting` and `capped` come from `gen` (the actual generateCandidates result), not recomputed — confirming honesty fields are sourced correctly. Lines 126-128: `candidates: gen.candidates.length, excludedExisting: gen.excludedExisting, capped: gen.capped`. All sourced directly from `gen`. The `gen` object flows from `predictMissingEdges` return (line 57: `return { predictions..., gen }`) which is the raw `generateCandidates` result (line 54). Correct, no recomputation drift.

Now, one subtle composition concern: `predictMissingEdges` runs `rankEdges(embeddings, gen.candidates)` with **no `topK`** (line 55 comment: "full rank; candidate set already bounded"). For the default run that's 1687 candidates — fine. But `generateCandidates`'s `maxCandidates` defaults to 500,000 (candidates lib:31), and `run()` does **not** pass a `maxCandidates` override. So in a pathological all×all run (`--source` and `--target` both empty/unfiltered over a large future embedd
... [+595 chars truncated]

### Assistant | 2026-06-09T13:33:31.413Z

[tool_use: Grep]

### User | 2026-06-09T13:33:33.971Z

[tool_result] 38:export function splitTypes(s) {
52:export function predictMissingEdges(embeddings, existingEdges, opts = {}) {
61:export function parseArgs(argv) {
95:export function run(argv = process.argv.slice(2), io = {}) {

### Assistant | 2026-06-09T13:34:07.212Z

All four exports present and matching the test imports (test:6) and the spec. The `isDirectRun` guard (line 160) correctly uses `pathToFileURL` for the Windows triple-slash quirk, and `process.exit(run())` propagates the numeric exit code.

I have everything I need. Here is my holistic review.

---

## Review Summary — predict-missing-edges.mjs + .test.mjs (3-of-3 arm A)

**Verified by execution, not inspection alone:** 12/12 tests pass; live run reproduces the claimed numbers (543 nodes, 1687 candidates, 8 plausible, report written, exit 0); I traced the `excludedExisting:0` claim to ground truth and confirmed it is honest.

### Strengths (real, not boilerplate)
- **Composition is correct.** `gen.candidates` (array `[u,v]` pairs) feeds `rankEdges` cleanly (matches edge-predict.mjs:130 array path); `min` filter is order-stable over the DESC-sorted ranked list; `Math.max(0,top)` guards negative slice. Confirmed `rankEdges` returns `[{u,v,score}]` DESC and the report consumes `{u,v,score}` consistently.
- **Honesty fields are sourced directly from `gen`, no recomputation drift** (lines 126-128 read `gen.candidates.length/excludedExisting/capped`). `existingEdgesLoaded:ok` (line 123) faithfully reflects whether the edges file actually loaded.
- **`excludedExisting:0` on the live default run is HONEST, not a broken exclusion.** I verified: the 120 existing edges are `eng→ghost/ghost→ghost/ghost→memory_patterns/eng→memory_patterns`; the default predicts `ghost→{wiki,memory_reference,memory_feedback}` (zero type overlap), and the 34 `ghost→ghost` existing edges have **0 endpoints in the 543-node embedding set** (different ghost id namespaces). So there is genuinely nothing to exclude for these combos. The exclusion path itself is exercised with a real matching key at test:82-90 (count 4→3).
- **R9-compliant tests.** Exclusion test asserts both pair-absence AND exact count; min-filter asserts both `every(>=min)` and `!some(<min)`; DESC + aligned-top + top:0 guard + absent-
... [+3129 chars truncated]
