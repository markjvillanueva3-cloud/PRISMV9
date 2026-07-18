---
type: "chat-session"
source: "claude-code-cli"
session_id: "be5e37e8-9aa8-4749-b02f-a97fde0830dd"
title: "RE-REVIEW (round 2) of `H:/prism-slot-mike/scripts/lib/pdf-text-extract-lib.mjs`"
date: "2026-05-19"
first_ts: "2026-05-19T00:59:31.413Z"
last_ts: "2026-05-19T01:01:20.719Z"
cwd: "H:\\PRISM"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-a13d8383f9b13bc91.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# RE-REVIEW (round 2) of `H:/prism-slot-mike/scripts/lib/pdf-text-extract-lib.mjs`

> **claude-code-cli** | 2026-05-19 | 5 msgs (2 user / 3 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-a13d8383f9b13bc91.jsonl`

## Transcript

### User | 2026-05-19T00:59:31.413Z

RE-REVIEW (round 2) of `H:/prism-slot-mike/scripts/lib/pdf-text-extract-lib.mjs` — read the WHOLE file again. You previously returned FAIL with 3 P0 + 3 P1 findings. Verify each is correctly closed AND that the fixes introduced no new defect. This output feeds AI training data (U-TDP07); a wrong dimension is worse than a missing one (R12).

The fixes applied:
- **P0-1 (integer-tol 100× rewrite):** INLINE_PM_RE tolerance group changed from `\.?(\d+(?:\.\d+)?)` to `(\.?\d+(?:\.\d+)?)` (dot now INSIDE the capture); `tolValue` rewritten to `t.startsWith(".") ? Number("0"+t) : Number(t)`. Same fix applied to OUT_OF_ROUND_RE and TIR_RE (their `\.?` was outside the group too) — both now route through tolValue.
- **P0-2 (Unicode minus):** INLINE_PM_RE prefix now `([-−‐–]?R?[-−‐–]?)` via `INLINE_DASH = "[-\\u2212\\u2010\\u2013]"`, built with `new RegExp`.
- **P0-3 (chained ±):** post-match window check — `INLINE_CHAIN_WINDOW_CHARS=6`, skip if `≥2 ±` in `[m.index, m.index+len+6]` or if `/±\s*$/` in the 6 chars before.
- **P1-1 (kind-blind dedup):** `haveNominal(n)` → `haveNominalKind(n, kind)` — dedup only when an existing dim of the SAME canonical kind shares the nominal; check moved to AFTER classifyKind.
- **P1-2 (geometric deflation):** new CONF_GEOMETRIC_ONLY=0.70 tier when tolCount==0 but ≥1 circularity/runout_tir.
- **P1-3 (±0 false-tol):** tol ≤ INLINE_MIN_MEANINGFUL_TOL_MM(0) → dim pushed WITHOUT a tolerance.
- **P1-4 (magic numbers):** confidence ladder + thresholds extracted to CONF_* constants.
- **P2:** feature label backward-scanned into meta.label; comment "labeled diameter" corrected.

VERIFY by tracing exact inputs:
1. P0-1 truly closed: trace `±25`, `±.25`, `±1.5`, `±0.0002`, `±.0002` through the new regex group + tolValue. Does any still collapse? Does `1.5` survive as 1.5? Is there a NEW input the dot-significance breaks (e.g. `±0` → tolValue 0 → P1-3 path; `±00.5`; `±.` with no digits)?
2. P0-3: can the chained-± window check itself be defeated (`a±b` whe
... [+1159 chars truncated]

### Assistant | 2026-05-19T00:59:43.512Z

I'll re-review the file by tracing the exact inputs you specified.

### Assistant | 2026-05-19T00:59:43.748Z

[tool_use: Read]

### User | 2026-05-19T00:59:45.571Z

[tool_result] 1	// scripts/lib/pdf-text-extract-lib.mjs
2	//
3	// U-TDP07 — Deterministic engineering-print text extractor (pure core).
4	//
5	// CAD-exported PDFs (SolidWorks, Fusion, Inventor) emit dimension callouts as
6	// embedded text strings in a canonical multi-token form. Example from a real
7	// JM Die carbide-tip print:
8	//
9	//   '5.00'      ← nominal
10	//   'n'         ← Ø glyph (PyMuPDF maps Ø c
... [+24280 chars truncated]

### Assistant | 2026-05-19T01:01:20.719Z

Now let me trace each finding precisely.

## P0-1: Integer-tolerance 100× collapse

Regex tolerance group: `(\.?\d+(?:\.\d+)?)` — dot is now INSIDE the capture group.

`tolValue`: `t.startsWith(".") ? Number("0" + t) : Number(t)`

Tracing each input (the captured group m[3]):

| Input after `±` | m[3] captured | tolValue | Correct? |
|---|---|---|---|
| `±25` | `25` | `Number("25")` = **25** | ✓ (was 0.25 — bug fixed) |
| `±.25` | `.25` | `Number("0.25")` = **0.25** | ✓ |
| `±1.5` | `1.5` | `Number("1.5")` = **1.5** | ✓ survives as 1.5 |
| `±0.0002` | `0.0002` | `Number("0.0002")` = **0.0002** | ✓ |
| `±.0002` | `.0002` | `Number("0.0002")` = **0.0002** | ✓ |

P0-1 is genuinely closed. The dot is significant; integer tolerances no longer collapse.

**New-input probing for the dot-significance change:**

- `±0` → m[3]=`0` → tolValue=`0` → `meaningful = 0 > 0` is **false** → P1-3 path, dim recorded WITHOUT tolerance. ✓ Correct.
- `±00.5` → m[3]=`00.5` → tolValue=`Number("00.5")`=**0.5**. ✓ JS parses leading zeros fine. Acceptable.
- `±.` (no digits) → regex group `(\.?\d+(?:\.\d+)?)` requires `\d+` after optional dot → **no match**. ✓ Safe.
- `±.5.5` → group matches `.5` (then `.5` is `(?:\.\d+)?`… actually `\.?\d+(?:\.\d+)?` on `.5.5`: `\.?`=`.`, `\d+`=`5`, `(?:\.\d+)?`=`.5` → captures `.5.5`) → tolValue=`Number("0.5.5")`=`NaN` → `tol == null` → **continue/skip**. ✓ Fail-safe (a missed dim beats a fabricated one — R12).

P0-1: **closed, no new defect introduced.**

## P0-2: Unicode minus prefix

`INLINE_DASH = "[-\\u2212\\u2010\\u2013]"` → in the regex string this becomes character class `[-−‐–]` (ASCII hyphen, U+2212 MINUS, U+2010 HYPHEN, U+2013 EN DASH). Prefix group: `(${INLINE_DASH}?R?${INLINE_DASH}?)`.

Trace `−R1.476±.005` (U+2212 minus): prefix matches `−R` (first `${INLINE_DASH}?`=`−`, `R?`=`R`, second optional empty), m[2]=`1.476`, m[3]=`.005` → tolValue=0.005, isRadius via `/R/i.test("−R")`=true → radius 1.476 ±0.005. ✓

The escaping is correct: `\\u2212` i
... [+12553 chars truncated]
