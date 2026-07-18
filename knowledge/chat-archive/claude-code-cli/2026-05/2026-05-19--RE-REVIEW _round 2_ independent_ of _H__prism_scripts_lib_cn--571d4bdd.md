---
type: "chat-session"
source: "claude-code-cli"
session_id: "571d4bdd-5118-4307-b29c-fa75fed32e14"
title: "RE-REVIEW (round 2, independent) of `H:\\prism\\scripts\\lib\\cnc-ground-truth-lib.m"
date: "2026-05-19"
first_ts: "2026-05-19T00:46:57.004Z"
last_ts: "2026-05-19T00:48:06.270Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-a2c5c41ef260b577d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# RE-REVIEW (round 2, independent) of `H:\prism\scripts\lib\cnc-ground-truth-lib.m

> **claude-code-cli** | 2026-05-19 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-a2c5c41ef260b577d.jsonl`

## Transcript

### User | 2026-05-19T00:46:57.004Z

RE-REVIEW (round 2, independent) of `H:\prism\scripts\lib\cnc-ground-truth-lib.mjs` — read the WHOLE file fresh; do NOT assume the other reviewer or the author caught everything. Round 1 returned FAIL; the file was fully rewritten to a **presence-only** design (no `nominal_mm`/`nominal` emitted — every dimension is `{kind, presence_only:true}`, matching the proven CAD half and the benchmark's `allGtPresenceOnly` grading path in `H:\prism\scripts\lib\ocr-benchmark-lib.mjs`).

Weight your pass toward:
- **Did the presence-only rewrite actually remove every false-data path?** Grep the file for any numeric value that escapes into a record/derivation that could be misread as a dimension. Confirm `dimensions[]` entries are ALWAYS `{kind, presence_only:true}` with no nominal key, on every code path.
- **Integration:** record shape + `groupRecordsByPartClass` output must stay byte-compatible with the cad sibling and consumable by `ocr-benchmark-lib.mjs`. Confirm the benchmark's presence-only branch handles these records and that nothing makes `allGtPresenceOnly` false.
- **State-machine correctness** of the `activeDrillCycle` latch: trace G81→bare-XY→bare-XY→G80, G83→G0-rapid, cycle with intervening comment-only lines, two cycles back-to-back, a bare XY with no preceding cycle. Can `drillCount` be wrong enough to wrongly trip or miss the `>=3 → cross_drilled_relief_holes` threshold?
- **New regressions from the rewrite:** dead variables, unreachable branches, `op.hasGWord` correctness (is it true for lines with only coordinate words? only M-words?), `Math.trunc` on negative/NaN G-numbers, the `detectUnits` regex `/(^|[^.\d])G21($|[^.\d])/` (does it match `G21` at end-of-string / inside `G210` / after a decimal?).
- **Domain truthfulness** of the final 3-kind vocabulary and the G96-only lathe gate. Over/under-trigger.
- Adversarial input: binary, >512-char lines, unterminated parens, M98-only body, `G` with no digits, CRLF.

Report PASS/FAIL with precise line numbers and any
... [+17 chars truncated]

### Assistant | 2026-05-19T00:47:11.241Z

I'll perform a fresh, independent review of the file.

### Assistant | 2026-05-19T00:47:11.668Z

[tool_use: Read]

### User | 2026-05-19T00:47:23.192Z

[tool_result] 1	// scripts/lib/cnc-ground-truth-lib.mjs
2	//
3	// U-TDP06 - CNC-derived Ground Truth (pure core).
4	//
5	// Converts a CNC program's G/M-code content into BlueprintExtraction-shape
6	// ground-truth records for the U-TDP04 OCR-extraction benchmark. This is the
7	// CNC half of the user directive "you can also compare to cad files and cnc
8	// programs to determine if you extracted the correct da
... [+12381 chars truncated]

### Assistant | 2026-05-19T00:48:06.270Z

I have the file fresh in context. Performing the independent round-2 review.

## Presence-only rewrite verification

Traced every numeric path:

- **`dimensions[]` construction (line 205):** `kinds.map((k) => ({ kind: k, presence_only: true }))` — the ONLY emitter. No `nominal_mm`/`nominal`/`value`/`size` key on any path. `kinds` is `string[]` from `evidenceFromNcOps`. Confirmed: every dimension entry is exactly `{kind, presence_only:true}`.
- **No numeric escape into records:** The only numbers that survive tokenization (`op.words[letter] = num`) are consumed transiently inside `evidenceFromNcOps` for state-machine predicates (`Number.isFinite(op.words.X)` etc.). None are written into the returned record. `derivation` carries `units` (string), `op_count` (int count), `subprogram_calls` (int count) — operational metadata, not dimensions; the benchmark does not read these as dims. **No false-data path remains.**

## Integration with cad sibling + ocr-benchmark-lib

- Record shape (`pdf_path`, `cnc_source`, `part_class`, `dimensions[]`, `derivation`) and `groupRecordsByPartClass` output (`{schemaVersion:1, part_class, prints, source}`) match the cad sibling's contract. Every dimension has `presence_only:true` and no `nominal`, so the benchmark's `allGtPresenceOnly` cannot be made false by any CNC record — confirmed against the grading path described.

## State machine — `activeDrillCycle` latch

Traced the requested sequences:
- **G81→bareXY→bareXY→G80:** drill=1 (G81), +1, +1 (bare XY, `!hasGWord`), G80 clears. drill=3 → trips `cross_drilled_relief_holes`. Correct (3 physical holes).
- **G83→G0-rapid:** drill=1, then `op.hasGWord && hasG(op,0) && activeDrillCycle` → latch cleared. Correct.
- **Comment-only intervening line:** stripped to empty at line 97–98, `continue` — no op pushed, latch survives. Correct.
- **Two cycles back-to-back (G81 X.. / G81 X..):** each hits the first branch (drill+1 each, latch stays true). drill=2. Correct.
- **Bare XY, no preceding cycl
... [+4577 chars truncated]
