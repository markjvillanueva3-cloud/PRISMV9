---
type: "chat-session"
source: "claude-code-cli"
session_id: "9aab2d98-78ae-4a9b-9dd7-d941b46c3453"
title: "Review the full file at H:\\prism\\mcp-server\\scripts\\train-cnc-controller-from-co"
date: "2026-05-19"
first_ts: "2026-05-19T15:28:17.777Z"
last_ts: "2026-05-19T15:32:09.958Z"
cwd: "H:\\PRISM"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/9aab2d98-78ae-4a9b-9dd7-d941b46c3453/subagents/agent-a133c61ea20874361.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Review the full file at H:\prism\mcp-server\scripts\train-cnc-controller-from-co

> **claude-code-cli** | 2026-05-19 | 20 msgs (8 user / 12 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/9aab2d98-78ae-4a9b-9dd7-d941b46c3453/subagents/agent-a133c61ea20874361.jsonl`

## Transcript

### User | 2026-05-19T15:28:17.777Z

Review the full file at H:\prism\mcp-server\scripts\train-cnc-controller-from-corpus.mjs end-to-end. This is part of AI-TRAINING-FIRST-MS0 / U-AITRAIN-POST-CNC-CONTROLLER-DEEP-LEARNING — a CNC corpus extractor that mines real Okuma OSP .MIN/.min programs from JM Die's MACRO PROGRAMS directory and emits a learned-patterns JSON for CNCControllerDeepLearningEngine.ingestLearnedPatterns() to consume.

Specifically check:
1. **Regex correctness** — does `extractToolSlotConventions` correctly match `(T010101 - OD ROUGH TURNING)` style comments? Does `extractVVariableIdioms` correctly match Okuma `VC100 = 1.32   (STOCK DIAMETER)` AND formula RHS like `VC130 = [VC111 * 3.82] / VC110   (SPOT DRILL RPM)`? Does `extractMacroLabels` correctly skip pure-numeric labels (N1, N100) and accept alphanumeric (NAT1)?
2. **Pure-core boundary** — exports are unit-testable without process.argv/stdin/stdout? main() is the only one that mutates process state?
3. **R12 fail-loud** — buildLedger throws on empty corpus AND on "files found but no controller detected" (the silent-empty-ledger failure mode)?
4. **Determinism** — does aggregateLedger emit stable JSON across runs (sorting by frequency then identity)?
5. **Windows path handling** — does the isMain detection at the bottom work on Windows with paths containing spaces (e.g. "H:/prism/JM DIE/MACRO PROGRAMS")?
6. **Schema reasonableness** — would CNCControllerDeepLearningEngine.ingestLearnedPatterns() (not yet written) be able to consume the emitted ledger.tool_slot_conventions / v_variable_idioms / macro_labels arrays without further transform?

Sample input file content (paste into a regex tester mentally):
- Tool comment: `(T010101 - OD ROUGH TURNING)`
- V-var simple: `VC100 = 1.32        (STOCK DIAMETER)`
- V-var formula: `VC130 = [VC111 * 3.82] / VC110                 (SPOT DRILL RPM)`
- Macro label: `NAT1 G81`
- Skip: `N1 T010101` (numeric label — should NOT match)

The acceptance criterion for the parent unit is "Engine produces a
... [+312 chars truncated]

### Assistant | 2026-05-19T15:28:39.100Z

I'll review the file end-to-end against your specific criteria.

### Assistant | 2026-05-19T15:28:39.720Z

[tool_use: Read]

### User | 2026-05-19T15:28:50.923Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * train-cnc-controller-from-corpus.mjs
4	 *
5	 * AI-TRAINING-FIRST-MS0 / U-AITRAIN-POST-CNC-CONTROLLER-DEEP-LEARNING — Step 1+2:
6	 * Mine real CNC programs to produce a non-stub LearnedControllerPatterns ledger
7	 * that CNCControllerDeepLearningEngine can ingest at runtime.
8	 *
9	 * SCOPE — deterministic, pure-core mining (no LLM, no GPU). For every .MIN/.min
10	 
... [+14939 chars truncated]

### Assistant | 2026-05-19T15:29:07.995Z

Now let me verify the corpus shape against the file's regex expectations.

### Assistant | 2026-05-19T15:29:09.223Z

[tool_use: Bash]

### User | 2026-05-19T15:29:47.376Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
10:31 ./
10:31 ../
11:41 BASE WAFER INSERT MACRO.min  193.0K
15:51 BASIC CASING WITH SINGLE COUNTERBORE.min  193.0K
11:10 BASIC TOP HAT CASING WITH SINGLE COUNTERBORE.min  193.0K
08:43 BASIC-CASING.MIN  193.0K

### Assistant | 2026-05-19T15:29:50.419Z

Acknowledged — using Glob and targeted file reads going forward.

### Assistant | 2026-05-19T15:29:50.565Z

[tool_use: Glob]

### User | 2026-05-19T15:29:55.999Z

[tool_result] JM DIE\MACRO PROGRAMS\BASIC TOP HAT CASING WITH SINGLE COUNTERBORE.min
JM DIE\MACRO PROGRAMS\BASE WAFER INSERT MACRO.min
JM DIE\MACRO PROGRAMS\BASIC CASING WITH SINGLE COUNTERBORE.min
JM DIE\MACRO PROGRAMS\BASIC-CASING.MIN

### Assistant | 2026-05-19T15:29:59.201Z

[tool_use: Read]

### User | 2026-05-19T15:30:14.749Z

[tool_result] 1	NSTRT
2	M1
3	NBAR
4	CLEAR
5	DEF WORK
6	PS LC,[-400,0],[400,19]
7	END
8	DRAW
9	/CALL OBAR
10	M1
11	(T010101 - GENERAL TURNING)
12	(T020202 - GENERAL TURNING)
13	(T030303 - SPOT DRILL)
14	(T050505 - DRILL)
15	(T070707 - BORING TURNING)
16	(T080808 - BORING TURNING)
17	(T111111 - GROOVE TURNING)
18	
19	(========== MACRO VARIABLES ==========)
20	(STOCK AND MODEL)
21	V1 = 1.9            (STOCK DIAMET
... [+2221 chars truncated]

### Assistant | 2026-05-19T15:30:21.052Z

[tool_use: Grep]

### User | 2026-05-19T15:30:28.202Z

[tool_result] 1:NSTRT
3:NBAR
156:NAT1 G81
184:NAT1 G81
207:NAT1 G81
313:NAT6 G81
337:NAT6 G81

### Assistant | 2026-05-19T15:30:31.554Z

[tool_use: Grep]

### User | 2026-05-19T15:30:38.880Z

[tool_result] JM DIE\MACRO PROGRAMS\BASIC-CASING.MIN:60

Found 60 total occurrences across 1 file.

### Assistant | 2026-05-19T15:30:42.342Z

Good, confirmed corpus is exactly as the file's regex expectations. Now let me do a quick mental regex trace on the edge cases.

### Assistant | 2026-05-19T15:30:50.289Z

[tool_use: Bash]

### User | 2026-05-19T15:31:05.759Z

[tool_result] TOOLS:
  010101 -> GENERAL TURNING
  020202 -> GENERAL TURNING
VARS:
  V1 = 1.9 ( STOCK DIAMETER )
  VC100 = 1.32 ( STOCK DIAMETER )
  VC130 = [VC111 * 3.82] / VC110 ( SPOT DRILL RPM )
LABELS (pre-filter):
  NSTRT M1 
  NAT1 G81 
  N100 X[VC101] [SKIP]
  N1 T010101 [SKIP]

### Assistant | 2026-05-19T15:32:09.958Z

All three regexes behave correctly on the sample. Now I have full understanding — let me finalize the review.

---

## Code Quality Analysis Report — `H:\prism\mcp-server\scripts\train-cnc-controller-from-corpus.mjs`

### Summary
- **Overall Quality Score:** 8.5/10
- **Files Analyzed:** 1
- **Issues Found:** 7 (0 P0, 2 P1, 3 P2, 2 P3)
- **Verdict: PASS (with P1 fixes recommended before next file ships)**

The extractor is well-structured, deterministic, pure-core-correct, and lives up to its R12 fail-loud claim. Live regex verification against synthetic samples mirroring the real `BASIC-CASING.MIN` corpus passed all six acceptance probes. Two P1 issues should be fixed before declaring `ingestLearnedPatterns` is feedable.

---

### Acceptance criteria verdicts (your 6 questions)

| # | Question | Verdict |
|---|----------|---------|
| 1 | Regex correctness on tool/V-var/macro-label | **PASS** — see trace below (caveat: P1-1) |
| 2 | Pure-core boundary | **PASS** — `detectControllerFamily`, `extract*`, `aggregateLedger`, `mineFile`, `listCorpusFiles`, `buildLedger` are all importable; only `main()` touches `process.std*`/`process.exit` |
| 3 | R12 fail-loud | **PASS** — `buildLedger` throws on empty corpus (line 287-292) AND on "files found, controller none" (line 302-307) |
| 4 | Determinism | **PASS** — `listCorpusFiles` returns sorted; `aggregateLedger` sorts by freq desc then identity asc (line 204-218); `JSON.stringify(_, null, 2)` deterministic |
| 5 | Windows path handling at `isMain` | **PASS** — `pathToFileURL(resolve(process.argv[1] || ""))` correctly handles `H:/prism/JM DIE/...` style paths with spaces and Windows drive letters. Empty fallback `""` prevents `argv[1]=undefined` crash in REPL/test imports |
| 6 | Schema reasonableness for downstream ingestion | **PASS (with P1-2)** — top-level `schemaVersion`/`generatedAt`/`sourceCorpus`/`fileCount`/`controllerCounts` + nested `ledger.{tool_slot_conventions,v_variable_idioms,macro_labels}` arrays each carry 
... [+7018 chars truncated]
