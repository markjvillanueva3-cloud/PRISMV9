---
type: "chat-session"
source: "claude-code-cli"
session_id: "4b1bbdf2-c878-441d-93bc-88ca59603734"
title: "Review HMEMV02 explainable-retrieval changes (additive metadata on the live memo"
date: "2026-06-10"
first_ts: "2026-06-10T19:44:23.466Z"
last_ts: "2026-06-10T19:47:06.412Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 9
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-a39ac759d0fcf6f2f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review HMEMV02 explainable-retrieval changes (additive metadata on the live memo

> **claude-code-cli** | 2026-06-10 | 24 msgs (9 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-a39ac759d0fcf6f2f.jsonl`

## Transcript

### User | 2026-06-10T19:44:23.466Z

Review HMEMV02 explainable-retrieval changes (additive metadata on the live memory-recall path). Read end-to-end:
- H:/prism/scripts/lib/memory-index-search-lib.mjs (focus: new matchedTokens(); tryHybridFuse now sets denseArm + attaches _explain per fused record; runMemoryIndexSearch toHit now adds an `explanation` field; the live-scan path was routed through toHit)
- H:/prism/scripts/lib/memory-index-search-lib.test.mjs (73 tests, all pass)
- H:/prism/.claude/hooks/memory-index-precheck-inject.mjs (new explainTag gated by PRISM_MEMORY_INDEX_EXPLAIN, default OFF)

This lib fires from a UserPromptSubmit hook across all 26 slots, so the contract is: the change must be ADDITIVE only -- it must NOT alter hit ranking, ordering, the `source` field, fusion math, or the hot-path behavior. It only adds explanation metadata.

Verify:
1. ADDITIVE: does attaching _explain / explanation change the fused `score` (must stay = rrf), the sort order, the topK slice, or the `source` value on any path (hybrid/sidecar/live)? Confirm the RRF fusion and dense ranking are untouched.
2. denseArm correctness: "qdrant" only when the Qdrant arm produced dense; "scan" only when the linear-scan fallback produced it; null for a BM25-only key inside a fused result. Trace the denseByKey/bm25ByKey maps -- is denseArm attached only to keys actually in the dense set (d ? denseArm : null)?
3. matchedTokens: pure, fail-soft (null rec / empty tokens -> []), mirrors scoreMemoryRecord's blob fields. Any token that scores but isn't reported, or vice versa?
4. toHit on the BM25-only paths (sidecar + live): explanation.bm25Score must equal s.score (no _explain), denseArm null. The live path was switched from an inline mapper to toHit -- confirm toHit is in lexical scope there and the output shape is unchanged except the added field.
5. Hook: explainTag returns "" when knob OFF (so fleet output is byte-identical) and a bracketed tag when ON. No throw on a hit lacking .explanation. ASCII-only in the new lines.

... [+167 chars truncated]

### Assistant | 2026-06-10T19:44:31.176Z

I'll review the HMEMV02 explainable-retrieval changes. Let me read all three files end-to-end.

### Assistant | 2026-06-10T19:44:31.778Z

[tool_use: Read]

### Assistant | 2026-06-10T19:44:31.965Z

[tool_use: Read]

### User | 2026-06-10T19:44:36.089Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// memory-index-precheck-inject.mjs — UserPromptSubmit injector (T2, advisory).
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: surfaces top-K direct hits over
6	// the Obsidian memory vault (~492 files at audit time) when a user prompt
7	// has 2+ content tokens. Closes the gap left by master-index-precheck-inject
8	// (system-graph node search; only fin
... [+6552 chars truncated]

### User | 2026-06-10T19:44:36.107Z

[tool_result] 1	#!/usr/bin/env node
2	// Pure-core search over the Obsidian memory vault for free-floating memories
3	// not pre-joined to system-graph.json nodes.
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: master-index-search-lib only finds
6	// memories that some system-graph node has linked via knowledge.memoryEntries[].
7	// The ~492 memory .md files in H:/prism/knowledge/memories/{feedback,refere
... [+47895 chars truncated]

### Assistant | 2026-06-10T19:44:44.169Z

Now let me read the test file to verify the assertions genuinely test the new structure (R9).

### Assistant | 2026-06-10T19:44:44.513Z

[tool_use: Read]

### User | 2026-06-10T19:44:47.808Z

[tool_result] 1	// Hermetic node:test suite for memory-index-search-lib.mjs (H7 of
2	// SYSTEM-SYNERGY-AUDIT). 28 cases. Pure-core only — fs reads are mocked via
3	// injected readImpl/readdirImpl/statImpl/existsImpl.
4	
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	import {
8	  tokenize,
9	  buildMemoryRecord,
10	  scoreMemoryRecord,
11	  enumerateMemoryFiles,
12	  runMemoryI
... [+42339 chars truncated]

### Assistant | 2026-06-10T19:45:09.681Z

I've read all three files end-to-end. Let me verify the `denseArm` correctness claim and the `bm25ByKey`/`denseByKey` map construction precisely, since that's the most subtle part of the contract.

Let me trace the critical path. In `tryHybridFuse`, `denseArm` is a single string ("qdrant" or "scan") for the whole batch — the arm that produced the dense candidates. Then per-fused-key, `_explain.denseArm = d ? denseArm : null` where `d = denseByKey.get(key)`. So a key in the dense set gets the batch arm; a BM25-only key gets null. Correct. Let me verify the maps are built from the right sources.

The `denseByKey` is built from `dense` (the actual dense result array), `bm25ByKey` from `bm25Arr`. A fused key present only in BM25 → `d` undefined → `denseArm: null, denseSim: null`. A fused key present in dense → `d` truthy → `denseArm: <batch arm>, denseSim: d.sim`. This is exactly the contract claim.

Now let me confirm there is no ranking/source/score regression by tracing the three return paths and the `toHit` lexical scope.

The review is complete. Let me trace the remaining verification points carefully.

**Path 1 (hybrid):** `runMemoryIndexSearch` builds `scoredSc` (BM25-scored, sorted), passes to `tryHybridFuse`. Fused records have `score: rrf`. `toHit` reads `s.score` (= rrf) and `s._explain` (present). Returns `source: "hybrid"`. The fusion math (`reciprocalRankFusion`, `denseRankAll`, `denseRankViaQdrant`) is byte-identical to before — only the `_explain` object is *added* to each `out.push({...rec, score: rrf, _explain:{...}})`. The `score` is still `rrf`, the `fusedRanked` order is untouched (RRF sort unchanged), and the `.slice(0, topK)` is applied identically. No regression.

**Path 2 (sidecar BM25):** `scoredSc.sort(...)` then `.slice(0, topK).map(toHit)`. `toHit` on these records: `s._explain` is undefined → `ex = null` → `denseArm: null, bm25Score: s.score, rrf: null`. `source: "sidecar"`. Score and sort unchanged.

**Path 3 (live):** Was switched from in
... [+1904 chars truncated]

### Assistant | 2026-06-10T19:45:12.664Z

[tool_use: Bash]

### User | 2026-06-10T19:45:18.741Z

[tool_result] non-ascii lines in hook: 13
3:36 U+2014 "eck-inject.mjs — UserPromptSub"
17:25 U+2014 "e (default 60s — re-asking the"
22:39 U+2014 "INJECT=0       — off entirely"
23:39 U+2014 "K=N            — top-K hits (d"
24:39 U+2014 "MIN_TOKENS=N   — min content t"
25:39 U+2014 "THROTTLE_MS=N  — same-prompt r"
26:39 U+2014 "_BOOST=0       — disable per-g"
47:30 U+2014 "ted in the lib — never suppres"
98:35 
... [+217 chars truncated]

### Assistant | 2026-06-10T19:45:29.515Z

The non-ASCII characters are all in PRE-EXISTING lines (em-dashes in comments, the `•` bullet, the 🧠 emoji in `renderBlock`, the `·` in the disable hint). The HMEMV02-added lines are the `explainTag` block (77-94) and its call site at line 99. Let me confirm the new lines specifically are ASCII-only.

The new `explainTag` function (lines 84-94) and its insertion `${explainTag(h)}` (line 99). Line 99 also contains the pre-existing `•` bullet (U+2022 at col 14) and `—` (em-dash, the description separator) — both pre-existing. The `explainTag(h)` insertion itself adds no non-ASCII. The function body lines 77-94: line 77 comment has em-dashes? Let me check the specific new-line range, since the requirement was "ASCII-only in the new lines."

### Assistant | 2026-06-10T19:45:31.689Z

[tool_use: Bash]

### User | 2026-06-10T19:45:37.443Z

[tool_result] --- checked lines 77-94 (explainTag block + comment) ---

### Assistant | 2026-06-10T19:45:43.285Z

Confirmed: the new `explainTag` block (lines 77-94) is entirely ASCII. The only non-ASCII on line 99 (the call site) is the pre-existing `•` bullet and `—` separator already in that template literal — the `${explainTag(h)}` insertion adds nothing non-ASCII.

Now let me run the test suite to confirm the 73 tests actually pass and verify the R9 claim (tests would fail if `_explain`/`explanation` weren't attached).

### Assistant | 2026-06-10T19:45:43.941Z

[tool_use: Bash]

### User | 2026-06-10T19:45:51.527Z

[tool_result]   ...
# Subtest: denseRankViaQdrant: duplicate node_id points are deduped (first/highest-score wins)
ok 72 - denseRankViaQdrant: duplicate node_id points are deduped (first/highest-score wins)
  ---
  duration_ms: 0.2047
  ...
# Subtest: runMemoryIndexSearch: a throwing dense arm degrades to BM25-only, never propagates (P1)
ok 73 - runMemoryIndexSearch: a throwing dense arm degrades to BM25-only, 
... [+159 chars truncated]

### Assistant | 2026-06-10T19:45:57.235Z

73/73 pass. Now let me verify the R9 claim by checking the specific assertions that would break if `_explain`/`explanation` weren't attached. Let me confirm by mutating the lib to NOT attach the explanation and re-running, to prove the tests are not vacuous.

### Assistant | 2026-06-10T19:46:01.235Z

[tool_use: Bash]

### User | 2026-06-10T19:46:07.482Z

[tool_result] mutated

### Assistant | 2026-06-10T19:46:16.086Z

[tool_use: Bash]

### User | 2026-06-10T19:46:25.900Z

[tool_result] # tests 73
# pass 71
# fail 2
---restoring---
# pass 73
# fail 0

### Assistant | 2026-06-10T19:47:06.412Z

Stripping the explanation breaks exactly 2 tests (the two HMEMV02 structural tests: `tryHybridFuse: each fused record carries _explain` and `runMemoryIndexSearch: BM25-only hits carry explanation`), and restoring brings it back to 73/73. This proves the tests are genuine R9 assertions, not vacuous — they fail precisely when the metadata isn't attached. The lib is restored byte-for-byte.

Let me do a final check on the additive guarantee: confirm that on the BM25-only sidecar path, the records pushed into `scoredSc` never carry a `_explain` (so `toHit`'s `ex` is correctly null), and that `toHit` does not mutate `s`.

`scoredSc.push({ ...rec, score: ... })` — `rec` comes from sidecar records (plain objects, no `_explain`). `toHit` reads `s._explain` (undefined → `ex = null`) and constructs a NEW object — it never mutates `s`. The fused path's records DO carry `_explain` (added in `tryHybridFuse`'s `out.push`). Both correct.

One last trace: confirm `source` field value is unchanged on all three paths. Hybrid → `"hybrid"`, sidecar → `"sidecar"`, live → `"live"`. These were the pre-existing values (the live path already returned `source: "live"` at line 885 and 912; the empty-token early return at line 805 has no `source` key — but that was true before HMEMV02 too, unchanged). Additive only.

---

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 9.5/10
- Files Analyzed: 3 (lib, test, hook)
- Issues Found: 1 (P3 documentation drift)
- Verification: 73/73 tests pass; mutation test proves R9 non-vacuity; ASCII confirmed on new hook lines

### Verification Results (each requested point)

**1. ADDITIVE — PASS.** The change touches three return paths and alters none of the load-bearing semantics:
- Hybrid path (`memory-index-search-lib.mjs:782-799`): `out.push({...rec, score: rrf, _explain:{...}})` — `score` stays `rrf`; `fusedRanked` order (from `reciprocalRankFusion`, `memory-index-search-lib.mjs:489-503`) is untouched; `_explain` is purely additive. `s
... [+5196 chars truncated]
