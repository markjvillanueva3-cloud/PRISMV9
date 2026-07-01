---
type: "chat-session"
source: "claude-code-cli"
session_id: "571d4bdd-5118-4307-b29c-fa75fed32e14"
title: "Review the test suite `H:\\prism\\scripts\\lib\\cnc-ground-truth-lib.test.mjs` (read"
date: "2026-05-19"
first_ts: "2026-05-19T00:52:18.456Z"
last_ts: "2026-05-19T00:53:24.569Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-a03bb6b6a2a5145e6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Review the test suite `H:\prism\scripts\lib\cnc-ground-truth-lib.test.mjs` (read

> **claude-code-cli** | 2026-05-19 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-a03bb6b6a2a5145e6.jsonl`

## Transcript

### User | 2026-05-19T00:52:18.456Z

Review the test suite `H:\prism\scripts\lib\cnc-ground-truth-lib.test.mjs` (read it whole) against the unit under test `H:\prism\scripts\lib\cnc-ground-truth-lib.mjs` (read it whole). Unit U-TDP06, BLUEPRINT-OCR-TRAINING-MS2: a PURE presence-only ground-truth-derivation lib that turns CNC G-code into `{kind, presence_only:true}` records consumed by the U-TDP04 benchmark `H:\prism\scripts\lib\ocr-benchmark-lib.mjs`.

Verify (Karpathy R9 — tests must verify intent, fail when business logic breaks, no placeholder/tautological asserts):
- Coverage of every exported function (detectUnits, tokenizeNc, evidenceFromNcOps, inferPartClassFromNcPath, buildGtRecordFromNc, groupRecordsByPartClass, summarizeBatch) including edge/adversarial paths.
- The reference values are REAL/correct (the REAL_LATHE constant mirrors actual JM Die 9007405.MIN structure; the "MM in HH:MM timestamp" regression test; the G96-gated stepped_revolved_axis; the mill-G73-peck-is-not-a-lathe test; the modal canned-cycle latch G80/G0 termination).
- The 2 integration tests genuinely exercise the real `compareExtractionToGroundTruth` seam (the round-1 P0) and would FAIL if the record shape regressed (e.g. if a nominal key returned, or presence_only dropped).
- Any test that would still pass if the corresponding logic were deleted/inverted (weak assertion) — flag it.
- Missing high-value cases: what realistic CNC input or contract regression is NOT covered that should be?

Grade PASS/FAIL with a concise P0/P1 list.

### Assistant | 2026-05-19T00:52:31.266Z

I'll read both files and conduct a thorough test coverage review against the unit under test.

### Assistant | 2026-05-19T00:52:31.490Z

[tool_use: Read]

### Assistant | 2026-05-19T00:52:31.732Z

[tool_use: Read]

### User | 2026-05-19T00:52:41.099Z

[tool_result] 1	// scripts/lib/cnc-ground-truth-lib.mjs
2	//
3	// U-TDP06 - CNC-derived Ground Truth (pure core).
4	//
5	// Converts a CNC program's G/M-code content into BlueprintExtraction-shape
6	// ground-truth records for the U-TDP04 OCR-extraction benchmark. This is the
7	// CNC half of the user directive "you can also compare to cad files and cnc
8	// programs to determine if you extracted the correct da
... [+12401 chars truncated]

### User | 2026-05-19T00:52:41.156Z

[tool_result] 1	// scripts/lib/cnc-ground-truth-lib.test.mjs
2	//
3	// U-TDP06 — tests for the CNC-derived ground-truth pure core.
4	// Reference values are derived from real JM Die .MIN structure and from
5	// hand-verified canonical G-code patterns. The final test proves a CNC GT
6	// record grades correctly through the actual U-TDP04 benchmark presence path
7	// (the integration seam that round-1 scrutiny fl
... [+12952 chars truncated]

### Assistant | 2026-05-19T00:53:24.569Z

## Test Coverage Review: cnc-ground-truth-lib.test.mjs

I've read both the unit under test and its test suite. Here is my detailed analysis:

---

### **Coverage Audit**

#### **Exported Functions Tested**
All 7 exported functions have test coverage:
- ✅ `detectUnits` — 5 tests
- ✅ `tokenizeNc` — 5 tests
- ✅ `evidenceFromNcOps` — 10 tests
- ✅ `inferPartClassFromNcPath` — 2 tests
- ✅ `buildGtRecordFromNc` — 3 tests
- ✅ `groupRecordsByPartClass` — 2 tests
- ✅ `summarizeBatch` — 2 tests
- ✅ `CNC_FILENAME_HEURISTICS` constant — tested via loop in line 181

**Total: 29 test cases**

---

### **Reference Value Verification — PASS**

**Real JM Die data integrity:**
- `REAL_LATHE` (lines 25–38) faithfully mirrors the 9007405.MIN structure:
  - Contains `G96 S200` (unambiguous lathe constant-surface-speed, lines 33)
  - Has feed cut `G95 G1 X-.0313 F.005` (lines 35)
  - Header comments `TIME=HH:MM` (line 28) — correctly tested as a "MM" false-positive trap
  - Result assertion (line 197–198): correctly identifies `stepped_revolved_axis` + `inch` units
  - This proves the lib correctly distinguishes lathe-only features from mill features

**Critical regression tests present:**
1. **G96 G73 lathe vs. mill G73 discrimination (lines 155–161)**: A mill peck-drilling G73 does NOT trigger `stepped_revolved_axis` (R12 fail-loud property — the test WILL fail if someone removes the `isLathe = G96-only` logic)
2. **Modal canned-cycle latch/termination (lines 130–141)**: 
   - Line 130–135: G80 cancels the repeat run; post-G80 XY bare lines are NOT drilled holes
   - Line 137–141: Explicit G0 rapid also terminates the repeat
   - These tests catch the `activeDrillCycle` latch logic; deletion of the latch would cause FAILURE
3. **"MM" in timestamp (line 50–53)**: Specific 9007405 regression test — the comment contains `TIME=HH:MM` (line 28) and the test ASSERTS inch units. If someone naively added `/\bMM\b/` detection, this test FAILS. ✓ Load-bearing.
4. **Boundary guard G21x (line 46–48
... [+8275 chars truncated]
