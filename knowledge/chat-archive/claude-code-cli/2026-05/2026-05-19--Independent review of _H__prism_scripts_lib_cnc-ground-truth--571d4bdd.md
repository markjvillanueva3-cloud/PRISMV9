---
type: "chat-session"
source: "claude-code-cli"
session_id: "571d4bdd-5118-4307-b29c-fa75fed32e14"
title: "Independent review of `H:\\prism\\scripts\\lib\\cnc-ground-truth-lib.test.mjs` (read"
date: "2026-05-19"
first_ts: "2026-05-19T00:52:25.375Z"
last_ts: "2026-05-19T00:55:45.350Z"
cwd: "H:\\prism"
messages: 38
user_msgs: 15
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-af5952da063f52bc5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent review of `H:\prism\scripts\lib\cnc-ground-truth-lib.test.mjs` (read

> **claude-code-cli** | 2026-05-19 | 38 msgs (15 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-af5952da063f52bc5.jsonl`

## Transcript

### User | 2026-05-19T00:52:25.375Z

Independent review of `H:\prism\scripts\lib\cnc-ground-truth-lib.test.mjs` (read whole) plus the unit `H:\prism\scripts\lib\cnc-ground-truth-lib.mjs` and consumer `H:\prism\scripts\lib\ocr-benchmark-lib.mjs` (read whole). This is U-TDP06: a presence-only CNC→ground-truth lib feeding the U-TDP04 OCR-extraction benchmark.

Do NOT assume the test-specialist caught everything. Weight toward:
- **Test integrity:** are any assertions tautological, or would they pass against a broken/stubbed implementation? Does each test encode WHY the behavior matters? Is the integration test a real end-to-end through `compareExtractionToGroundTruth`, or does it merely re-assert the lib's own output?
- **False confidence:** the lib was rewritten to presence-only after a round-1 P0 (it emitted `nominal_mm` which the benchmark — reading `.nominal` — silently scored as malformed FN). Is there a regression test that would FAIL the instant any nominal-bearing dimension is reintroduced? If not, that is a P1 (the exact defect that shipped before).
- **Domain correctness of the reference values:** are the asserted feature-kinds machinist-defensible for the given G-code? Any test that bakes in a WRONG expectation (making future correct code fail)?
- **Coverage gaps:** subprogram-only body, unterminated paren, CRLF, >512-char line, decimal sub-cycle, G96-gate negative case, the modal-latch termination paths — present and meaningful?
- Convention/consistency with the sibling test `H:\prism\scripts\lib\cad-ground-truth-lib.test.mjs` (read it) and node:test idioms.

Report PASS/FAIL with prioritized P0/P1 and exact line numbers.

### Assistant | 2026-05-19T00:52:39.855Z

I'll review these files systematically. Let me read all of them.

### Assistant | 2026-05-19T00:52:40.397Z

[tool_use: Read]

### Assistant | 2026-05-19T00:52:40.664Z

[tool_use: Read]

### Assistant | 2026-05-19T00:52:41.860Z

[tool_use: Read]

### Assistant | 2026-05-19T00:52:43.067Z

[tool_use: Read]

### User | 2026-05-19T00:52:47.078Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cnc-ground-truth-lib.mjs' was already read 12s ago in this session and is unchanged (mtime 1779151747856). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T00:52:47.088Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cnc-ground-truth-lib.test.mjs' was already read 11s ago in this session and is unchanged (mtime 1779151876075). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T00:52:48.207Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ocr-benchmark-lib.mjs' was already read 21m ago in this session and is unchanged (mtime 1779124814219). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T00:52:55.365Z

[tool_result] 1	// scripts/lib/cad-ground-truth-lib.test.mjs
2	// Tests for U-TDP05 CAD-derived ground truth pure core.
3	
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	
7	import {
8	  evidenceForFeatureKinds,
9	  inferPartClassFromCadPath,
10	  buildGtRecordFromStep,
11	  groupRecordsByPartClass,
12	  summarizeBatch,
13	  CAD_FILENAME_HEURISTICS,
14	} from "./cad-ground-truth
... [+10176 chars truncated]

### Assistant | 2026-05-19T00:52:59.001Z

The cached content is in my context. Let me verify a few load-bearing details in the unit and consumer to ground the review.

### Assistant | 2026-05-19T00:53:00.264Z

[tool_use: Grep]

### Assistant | 2026-05-19T00:53:01.276Z

[tool_use: Grep]

### User | 2026-05-19T00:53:17.000Z

[tool_result] 13://   nominal from raw text requires modal G90/G91 absolute/incremental state,
17://   Emitting such a value as a nominal would poison the U-TDP04 dim benchmark
72:// on the JM Die corpus). Units are derivation traceability only — no nominal
124:// Returns { kinds: string[] }. No nominals by design (see header).

### User | 2026-05-19T00:53:18.361Z

[tool_result] 36:/** Tolerance for nominal-match comparison. Values within ±tol are considered same. */
77: *   2. For each (kind), use greedy nearest-nominal pairing (sort both lists by
78: *      nominal, walk linearly, pair within DIM_MATCH_TOLERANCE_MM).
82: * @param {{dimensions?: Array<{kind: string, nominal?: number}>}} extracted
83: * @param {{dimensions: Array<{kind: string, nominal: number}>}} groundT
... [+1071 chars truncated]

### Assistant | 2026-05-19T00:53:21.581Z

Now let me see the exact ground-truth comparison logic and the malformed-FN path that the round-1 P0 hinged on.

### Assistant | 2026-05-19T00:53:22.974Z

[tool_use: Read]

### Assistant | 2026-05-19T00:53:24.274Z

[tool_use: Grep]

### User | 2026-05-19T00:53:29.335Z

[tool_result] 110	  let tp = 0, fp = 0, fn = 0;
111	  const dimErrors = [];
112	
113	  for (const kind of allKinds) {
114	    const eList = (byKindE.get(kind) || []).slice().sort((a, b) => (Number(a.nominal) || 0) - (Number(b.nominal) || 0));
115	    const gList = (byKindG.get(kind) || []).slice().sort((a, b) => (Number(a.nominal) || 0) - (Number(b.nominal) || 0));
116	
117	    let k_tp = 0, k_fp = 0, k_fn = 0;
... [+3221 chars truncated]

### User | 2026-05-19T00:53:30.192Z

[tool_result] 13://   nominal from raw text requires modal G90/G91 absolute/incremental state,
14-//   canned-cycle R-plane pairing, lathe diameter/radius mode, and the work
15-//   datum — none of which are reliably present in the text. An absolute drill
--
17://   Emitting such a value as a nominal would poison the U-TDP04 dim benchmark
18-//   (graded at p95 <= 0.05 mm). So this lib emits feature-KIND presen
... [+2773 chars truncated]

### Assistant | 2026-05-19T00:53:33.768Z

I need to see the full unit body to verify reference values against actual G-code tokenization. Let me read the parts of the lib not yet in context.

### Assistant | 2026-05-19T00:53:34.700Z

[tool_use: Read]

### User | 2026-05-19T00:53:42.093Z

[tool_result] 36	const MAX_LINE = 512; // ReDoS guard — NC lines are short; truncate pathological input
37	const CROSS_DRILL_MIN = 3; // 3+ drilled holes => cross-drilled relief pattern
38	
39	// Part-class filename heuristics — kept value-identical to the cad sibling
40	// (cad-ground-truth-lib.mjs heuristics) so a part lands in the SAME stratified
41	// bucket whether its GT came from a STEP file or an NC fil
... [+8641 chars truncated]

### Assistant | 2026-05-19T00:53:45.655Z

Now I have the full picture. Let me see the remaining part of the lib (header lines 1-35 and summarizeBatch lines 215+) and the test file's full content to cross-check.

### Assistant | 2026-05-19T00:53:46.467Z

[tool_use: Read]

### Assistant | 2026-05-19T00:53:46.984Z

[tool_use: Read]

### User | 2026-05-19T00:53:52.962Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cnc-ground-truth-lib.test.mjs' was already read 77s ago in this session and is unchanged (mtime 1779151876075). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T00:54:03.484Z

[tool_result] 215	}
216	
217	export function groupRecordsByPartClass(records) {
218	  const grouped = new Map();
219	  for (const r of Array.isArray(records) ? records : []) {
220	    if (!r || typeof r.part_class !== "string") continue;
221	    if (!grouped.has(r.part_class)) grouped.set(r.part_class, []);
222	    grouped.get(r.part_class).push({
223	      pdf_path: r.pdf_path,
224	      cnc_source: r.cnc_sour
... [+1228 chars truncated]

### Assistant | 2026-05-19T00:54:10.524Z

I have the lib fully. The test file content was returned by the read-once guard but it actually returned the **CAD sibling** test, not the CNC test. I need the actual CNC test file content. Let me grep it to get its real content.

### Assistant | 2026-05-19T00:54:12.079Z

[tool_use: Bash]

### User | 2026-05-19T00:54:18.851Z

[tool_result] // scripts/lib/cnc-ground-truth-lib.test.mjs
//
// U-TDP06 — tests for the CNC-derived ground-truth pure core.
// Reference values are derived from real JM Die .MIN structure and from
// hand-verified canonical G-code patterns. The final test proves a CNC GT
// record grades correctly through the actual U-TDP04 benchmark presence path
// (the integration seam that round-1 scrutiny flagged as a P0)
... [+11919 chars truncated]

### Assistant | 2026-05-19T00:54:30.466Z

I now have all four files fully. Let me verify the two most critical correctness claims against the lib's actual logic.

**1. The `REAL_LATHE` integration assertion** — does `G95 G1 X-.0313 F.005` actually produce `stepped_revolved_axis`?

Trace `evidenceFromNcOps`:
- `G96 S200` → `isLathe = true`
- `G95 G1 X-.0313 F.005` → tokenized: `G95`, `G1`, words `X=-0.0313`, `F=0.005`. `hasG(op,1)` true, `op.words.X` finite → `hasFeedCut = true`
- Final: `isLathe && hasFeedCut` → `stepped_revolved_axis` added. ✓ Correct.

No drill cycle present → only `stepped_revolved_axis`. Assertion `deepEqual(r.dimensions, [{ kind: "stepped_revolved_axis", presence_only: true }])` is machinist-defensible and exact. ✓

**2. The `detectUnits(REAL_LATHE) === "inch"` regression test** — header has `TIME=HH:MM` and `STEEL INCH`. `detectUnits`: no G21/G20 word (the program has `G140`, `G50`, `G96`, `G97`, `G95` — none match the `G21`/`G20` boundary regex). Then `\bINCH\b` matches `STEEL INCH`. Returns `"inch"`. ✓ And critically, the regex `/(^|[^.\d])G21($|[^.\d])/` — does any token in REAL_LATHE spuriously match? `G140` no, `G95` no. The `MM` in `TIME=HH:MM` is never consulted because `\bINCH\b` wins first and bare `MM` isn't a signal anyway. This is a **genuine, well-targeted regression test**. ✓

Let me check one domain edge: the `G73` family membership and the mill-vs-lathe negative case.

### Assistant | 2026-05-19T00:54:31.479Z

[tool_use: Bash]

### User | 2026-05-19T00:54:49.202Z

[tool_result]   ...
# Subtest: summarizeBatch: non-array safe
ok 30 - summarizeBatch: non-array safe
  ---
  duration_ms: 0.1496
  ...
# Subtest: integration: a CNC presence GT record scores tp>0 via ocr-benchmark presence path
ok 31 - integration: a CNC presence GT record scores tp>0 via ocr-benchmark presence path
  ---
  duration_ms: 0.5068
  ...
# Subtest: integration: CNC GT with a MISSED kind scores as a 
... [+271 chars truncated]

### Assistant | 2026-05-19T00:54:54.321Z

32/32 pass. Now the critical scrutiny question — the round-1 P0 was that the lib emitted `nominal_mm` which the benchmark (reading `.nominal`) silently scored as a malformed FN. Let me verify the regression guard would actually FAIL if a nominal were reintroduced, by mutating the lib and re-running the integration test.

### Assistant | 2026-05-19T00:54:58.006Z

[tool_use: Bash]

### User | 2026-05-19T00:55:02.994Z

[tool_result] tp= 0 fn= 1 fp= 1

### Assistant | 2026-05-19T00:55:45.350Z

Confirmed: the round-1 P0 signature is `tp=0, fn=1` when a dimension carries `nominal_mm` instead of `presence_only`/`.nominal`. The integration test asserts `cmp.tp >= 1` and `cmp.fn === 0` — so it **would** fail the instant any nominal-bearing (non-presence) dimension is reintroduced through `buildGtRecordFromNc`. That is a real regression guard, not a tautology. The `buildGtRecordFromNc` presence-key test (`!("nominal" in d) && !("nominal_mm" in d)`) is a second, direct guard at the unit boundary.

One gap to probe: the integration test only exercises GT built from `REAL_LATHE`. If a future edit reintroduced a nominal **only on the drill-cycle path** (not the lathe path), would a test catch it? Let me check the second presence-key test's coverage.

The test `buildGtRecordFromNc: EVERY dimension is presence_only:true with no nominal key` uses `G83...` content producing `central_oil_hole` + `cross_drilled_relief_holes` and asserts every dimension has no nominal key. So both code paths (lathe `stepped_revolved_axis` and drill `central_oil_hole`/`cross_drilled`) are nominal-guarded. Coverage is adequate.

Let me verify the final domain-correctness concern: the `G50 S800` line in `REAL_LATHE`. `G50` on a lathe is a spindle-speed clamp (or coordinate set); the lib comment says G50 is "dialect-overloaded ... deliberately NOT used as lathe discriminators." It correctly does not set `isLathe`. Only `G96 S200` does. The reference expectation is machinist-correct.

I have enough to render a verdict.

---

## VERDICT: PASS

`H:\prism\scripts\lib\cnc-ground-truth-lib.test.mjs` — 32/32 passing, real-value assertions, the round-1 P0 is genuinely guarded at both the unit boundary and the integration seam. No P0. No P1. Findings are P2/P3 only.

### Test integrity — verified sound

- **Integration test is a real end-to-end**, not a re-assertion of lib output. `integration: a CNC presence GT record scores tp>0` builds GT via `buildGtRecordFromNc` then pipes it through the *actual*
... [+4765 chars truncated]
