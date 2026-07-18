---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "Review a PRISM training-set curation tool. Read END TO END: 1. H:\\prism\\scripts\\"
date: "2026-06-02"
first_ts: "2026-06-02T02:01:59.532Z"
last_ts: "2026-06-02T02:04:37.070Z"
cwd: "H:\\prism-slot-xray"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a8de3997ff63fe4fc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# Review a PRISM training-set curation tool. Read END TO END: 1. H:\prism\scripts\

> **claude-code-cli** | 2026-06-02 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a8de3997ff63fe4fc.jsonl`

## Transcript

### User | 2026-06-02T02:01:59.532Z

Review a PRISM training-set curation tool. Read END TO END:
1. H:\prism\scripts\lib\blueprint-trainset-curate-lib.mjs (pure core)
2. H:\prism\scripts\lib\blueprint-trainset-curate-lib.test.mjs (11 tests pass)
3. H:\prism\scripts\blueprint-trainset-curate.mjs (streaming runner — just ran live over 76,205 real records: 3,941 clean, 72,264 excluded incl 236 poison)

PURPOSE: curate the supervised OCR/print→CAD training set from the existing pairing manifest blueprint-training-pairs.jsonl, EXCLUDING poison labels. The GIGO guard: a part is a clean training example ONLY if has_print AND match_confidence ∈ {exact,loose} AND label_source ∈ {program,cad,cad+program}. Records with match_confidence garbage/ambiguous (a real source paired to a WRONG answer-key) must be excluded; unlabeled (none/miss) excluded; everything fails toward exclusion.

VERIFY:
- LOGIC CORRECTNESS: curateRecord's branch order (no-print → unlabeled → poison → unknown-confidence → no-real-source → keep). Is the ordering correct so a garbage-confidence record with label_source="none" is counted "unlabeled" (not "poison-label:garbage")? (That ordering is WHY the live run showed poison=236 not 5,029 — confirm it's intentional + correct, i.e. poison = a record with a REAL source but bad confidence.)
- Does any path KEEP a record it shouldn't (train on a poison/unverified label)? Trace every return.
- subsets: roundtrip_b = has_cad (print already true), print_program = has_program, triple = both. Correct?
- accumulate/finalizeCuration tallies: clean_trainset, excluded, poison_excluded (only poison-label:* reasons), by_tier, trainable_subsets, clean_rate (divide-by-zero guarded).
- summarizeDrawingScore: min/max/mean null-safe.
- RUNNER: streaming (never JSON.parse the 51.8MB whole), crlfDelay, atomic write (tmp+rename), bad-line tolerance, honest exit (3 when parts>0 but clean=0). main().catch present.
- TEST INTEGRITY (R9): do tests encode WHY (poison excluded in BOTH directions — a garbage record excluded,
... [+135 chars truncated]

### Assistant | 2026-06-02T02:02:14.181Z

I'll review all three files end to end.

### Assistant | 2026-06-02T02:02:15.116Z

[tool_use: Read]

### Assistant | 2026-06-02T02:02:15.588Z

[tool_use: Read]

### Assistant | 2026-06-02T02:02:15.731Z

[tool_use: Read]

### User | 2026-06-02T02:02:50.502Z

[tool_result] 1	// scripts/lib/blueprint-trainset-curate-lib.mjs
2	//
3	// U-PSGB-XRAY-TRAINSET-CURATE — pure curation core for the OCR/print→CAD training set.
4	//
5	// THE PROBLEM (grounded in the real corpus, blueprint-training-pairs.jsonl, 76,205 parts):
6	// `train_eligible` (has_print && (has_program||has_cad)) OVERCOUNTS the trustworthy labels.
7	// The corpus' own `match_confidence` shows 5,029 "garbage
... [+6395 chars truncated]

### User | 2026-06-02T02:02:50.505Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/blueprint-trainset-curate.mjs
3	//
4	// U-PSGB-XRAY-TRAINSET-CURATE — curate the supervised OCR/print→CAD training set from the
5	// existing pairing manifest, EXCLUDING poison labels (garbage/ambiguous match_confidence).
6	//
7	// WHY: blueprint-training-pairs.jsonl marks 4,245 parts `train_eligible`, but the corpus'
8	// own match_confidence flags ~5,029 garbag
... [+4219 chars truncated]

### User | 2026-06-02T02:02:50.524Z

[tool_result] 1	// scripts/lib/blueprint-trainset-curate-lib.test.mjs
2	// Tests for the OCR/print→CAD trainset curation core (U-PSGB-XRAY-TRAINSET-CURATE).
3	// The load-bearing intent (R9): POISON labels (garbage/ambiguous match_confidence) must be
4	// EXCLUDED from the supervised set, and only TRUSTWORTHY labels (exact/loose + real source)
5	// kept — the garbage-in-garbage-out guard. Pure, no I/O. Run: nod
... [+7982 chars truncated]

### Assistant | 2026-06-02T02:03:02.925Z

All three files read end to end. Let me trace the critical logic concern — the branch ordering in `curateRecord` and whether the `import` set membership checks have any gap.

Let me verify one subtle point: the `unknown-confidence` branch (line 69) is logically reachable, and the `no-real-source` branch (line 70) ordering relative to the poison check.

### Assistant | 2026-06-02T02:03:03.586Z

[tool_use: Bash]

### User | 2026-06-02T02:03:51.380Z

[tool_result]   ...
# Subtest: finalizeCuration: empty corpus → zeros, no divide-by-zero
ok 10 - finalizeCuration: empty corpus → zeros, no divide-by-zero
  ---
  duration_ms: 0.881
  ...
# Subtest: curateRecord: unknown/missing confidence tiers are excluded, not silently kept
ok 11 - curateRecord: unknown/missing confidence tiers are excluded, not silently kept
  ---
  duration_ms: 0.3106
  ...
1..11
# tests 1
... [+88 chars truncated]

### Assistant | 2026-06-02T02:04:37.070Z

11/11 pass confirmed. Now let me trace each return path carefully for the load-bearing logic.

**Branch trace of `curateRecord` (lines 62-90):**

1. L63 `!rec||not object` → `not-an-object` ✓ (never keeps)
2. L66 `has_print !== true` → `no-print` ✓
3. L67 `src==="none" || conf==="miss" || src===""` → `unlabeled` ✓
4. L68 `EXCLUDED_CONFIDENCE.includes(conf)` (ambiguous/garbage) → `poison-label:${conf}` ✓
5. L69 `!TRUSTWORTHY.includes(conf)` → `unknown-confidence` ✓
6. L70 `!REAL_LABEL_SOURCES.includes(src)` → `no-real-source` ✓
7. L89 → `keep:true` only after surviving all 6 gates ✓

The ordering question the operator raised: a record with `match_confidence="garbage"` AND `label_source="none"`. Line 67 fires FIRST (`src==="none"`) → counted `unlabeled`, NOT `poison-label:garbage`. This is **correct and intentional**: poison = a record with a REAL source paired to a bad answer-key. A `label_source="none"` record has no answer-key at all, so it cannot be "poison" — it's simply unlabeled. This is exactly why the live run showed poison=236 (real source + bad confidence) not 5,029 (all garbage-confidence rows, most of which have no real source). Confirmed.

**Can any path KEEP a record it shouldn't?** The only `keep:true` is L89, gated behind 6 sequential early-returns. To reach it: must be an object, `has_print===true`, src not none/blank, conf not miss, conf NOT in {ambiguous,garbage}, conf IN {exact,loose} (L69 inverse), src IN {program,cad,cad+program} (L70 inverse). The kept set is exactly `TRUSTWORTHY ∩ REAL_SOURCE ∩ has_print`. No leak. Note L69 is technically redundant-but-correct after L68 (conf already passed not-excluded; L69 catches everything-not-trustworthy including unknown tiers) — defense-in-depth, not a bug.

**Subsets (L72-78):** `roundtrip_b=has_cad`, `print_program=has_program`, `triple=has_cad&&has_program`. At this point `has_print` is guaranteed true. So roundtrip_b correctly means print+CAD, print_program means print+program, triple means all thre
... [+4747 chars truncated]
