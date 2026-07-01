---
type: "chat-session"
source: "claude-code-cli"
session_id: "3c54f3f4-6786-4c39-84d6-62b0a0db8cad"
title: "Independent second-pass review (do NOT assume another reviewer caught everything"
date: "2026-06-22"
first_ts: "2026-06-22T12:55:23.663Z"
last_ts: "2026-06-22T13:03:47.115Z"
cwd: "H:\\prism"
messages: 74
user_msgs: 25
assistant_msgs: 49
raw_file: "H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-afbc7023331114d23.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Independent second-pass review (do NOT assume another reviewer caught everything

> **claude-code-cli** | 2026-06-22 | 74 msgs (25 user / 49 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-afbc7023331114d23.jsonl`

## Transcript

### User | 2026-06-22T12:55:23.663Z

Independent second-pass review (do NOT assume another reviewer caught everything) of an uncommitted PRISM change (H:/prism, slot xray) that adds MILL-program ground-truth extraction to a CNC-program ground-truth library used to measure OCR/blueprint-reading recall against real machined parts.

Run `git -C H:/prism diff` to see the change across:
- scripts/lib/cnc-program-gt-lib.mjs (new mill GT functions)
- scripts/lib/cnc-program-gt-lib.test.mjs (new tests)
- scripts/validate-perfect-parts.mjs (wiring: route axis==='mill' to extractMillProgramGT)

Weight your review toward what a correctness reviewer might MISS:
- Regex robustness in parseToolComment / extractDiameterToken / extractMillBoreDiameters: catastrophic backtracking risk? Unicode/CRLF handling? A comment with multiple decimals (e.g. "82 DEG CSK .375" or "(.531 C'BORE FOR 1/4-20 SHCS)") — does it pick the RIGHT value? Apostrophe variants in C'BORE / C'SINK? Case sensitivity?
- The thread/tap exclusion regex `\b\d+\s*-\s*\d+\b` — does it over-match (e.g. a part number "100-RC-932" or a date inside a comment) and wrongly suppress a legitimate DRILL diameter? Is suppressing only when holeKind==='drill' the right scope (c'bore/ream still emit even in thread context)?
- extractMillBoreDiameters modal tracking: a line with I/J but no X/Y; a G2/G3 spanning where cx/cy is null (header); arcs using R instead of I/J (currently ignored — is that a silent gap worth flagging?); could a NON-bore arc accidentally close and mint a fake diameter?
- Number/letter drills (#7, F drill) are intentionally NOT in the table — is that documented honestly, and does it silently drop GT or correctly yield nothing?
- Integer-overflow / NaN / Infinity / empty / null inputs to every new function — any throw? (these run over a 350-part corpus + arbitrary real G-code text).
- The validate runner: does `let gt = extractProgramGT(...)` then reassign for mill cause any issue with the downstream gtReliable gate, the OCR block, or the record f
... [+529 chars truncated]

### Assistant | 2026-06-22T12:55:28.605Z

I'll review this change thoroughly. Let me start by examining the diff and reading the full files end-to-end.

### Assistant | 2026-06-22T12:55:28.918Z

[tool_use: Bash]

### User | 2026-06-22T12:55:35.246Z

[tool_result] <persisted-output>
Output too large (265KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\3c54f3f4-6786-4c39-84d6-62b0a0db8cad\tool-results\bhmuntbqy.txt

Preview (first 2KB):
warning: in the working copy of 'knowledge/memories/reference/plugin_architecture.md', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'knowledge/memories/reference/
... [+1671 chars truncated]

### Assistant | 2026-06-22T12:55:37.392Z

The full diff is huge. Let me scope it to just the three relevant files.

### Assistant | 2026-06-22T12:55:39.354Z

[tool_use: Bash]

### User | 2026-06-22T12:55:43.144Z

[tool_result] diff --git a/scripts/validate-perfect-parts.mjs b/scripts/validate-perfect-parts.mjs
index 4f0c4818ec..b66a41d2ea 100644
--- a/scripts/validate-perfect-parts.mjs
+++ b/scripts/validate-perfect-parts.mjs
@@ -26,7 +26,7 @@ import { argv, exit, env } from "node:process";
 
 import { runEnsembleOverImage } from "./lib/vision-ensemble-fuse.mjs";
 import { dimToMm } from "./lib/dimension-set-score.mjs";
... [+7265 chars truncated]

### Assistant | 2026-06-22T12:55:48.052Z

The diff shows the validate runner. Now I need the full content of the new library functions. Let me read the entire library file end-to-end.

### Assistant | 2026-06-22T12:55:48.361Z

[tool_use: Read]

### User | 2026-06-22T12:55:51.374Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.mjs
2	//
3	// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
4	// validate what the OCR pipeline reads off the matching blueprint. The program is the STRONGEST GT
5	// available: it encodes the ACTUAL machined coordinates (what the part is literally cut to), in plain
6	// text, no STEP kernel / GPU / MCP needed. 
... [+34846 chars truncated]

### Assistant | 2026-06-22T12:55:55.286Z

I've read the full library. Now let me read the test file end-to-end and the relevant part of the validate runner.

### Assistant | 2026-06-22T12:55:55.563Z

[tool_use: Read]

### User | 2026-06-22T12:55:56.683Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.test.mjs
2	// Tests the CNC-program ground-truth extractor that validates the OCR pipeline against real machined
3	// geometry. The program is the answer key for the 91-perfect-parts true-test, so a wrong GT here =
4	// either passing a broken OCR (false confidence before the full-corpus run) or failing a correct one.
5	// Fixtures are REAL G-code excerpts (T-11
... [+23579 chars truncated]

### Assistant | 2026-06-22T12:55:59.808Z

Now let me read the relevant section of the validate runner end-to-end to understand the downstream consumption — the gtReliable gate, OCR block, and record fields.

### Assistant | 2026-06-22T12:56:00.150Z

[tool_use: Read]

### User | 2026-06-22T12:56:01.192Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/validate-perfect-parts.mjs
3	//
4	// U-XRAY-PERFECT-PARTS-TRUETEST — the TRUE end-to-end test of the OCR/blueprint-reading system on the
5	// 91 perfect parts (print + CAD + CNC program) BEFORE scaling to the full corpus. For each part: OCR
6	// the blueprint → extract dims (mm), parse the matching CNC program → objective machined-dim GT, and
7	// score recall (d
... [+17701 chars truncated]

### Assistant | 2026-06-22T12:56:04.522Z

I've read all three files end-to-end. Now let me run the tests to verify the suite passes, then probe specific edge cases the prompt asked about.

### Assistant | 2026-06-22T12:56:05.630Z

[tool_use: Bash]

### User | 2026-06-22T12:56:10.795Z

[tool_result]   ...
# Subtest: extractMillBoreDiameters: a FULL-CIRCLE G3 yields 2*radius; a partial arc does NOT
ok 23 - extractMillBoreDiameters: a FULL-CIRCLE G3 yields 2*radius; a partial arc does NOT
  ---
  duration_ms: 0.4492
  ...
# Subtest: extractMillProgramGT: mill GT = hole+bore dia, mirrors extractProgramGT shape, gtReliable when found
ok 24 - extractMillProgramGT: mill GT = hole+bore dia, mirrors 
... [+589 chars truncated]

### Assistant | 2026-06-22T12:56:14.340Z

All 26 tests pass. Now let me probe the specific edge cases the prompt flagged. First, the apostrophe variants and the thread/tap exclusion regex over-matching concern, plus the multiple-decimals "pick the right value" question.

### Assistant | 2026-06-22T12:56:22.905Z

[tool_use: Bash]

### User | 2026-06-22T12:56:28.381Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 36: syntax error near unexpected token `('
/usr/bin/bash: eval: line 36: `console.log("90.0 DEG CSK .375 (angle has decimal!):", extractDiameterToken("90.0 DEG CSK .375"));'

### Assistant | 2026-06-22T12:56:30.966Z

The inline shell quoting is choking on parens. Let me write a probe file via a heredoc instead.

### Assistant | 2026-06-22T12:56:37.662Z

[tool_use: Bash]

### User | 2026-06-22T12:56:41.688Z

[tool_result] Exit code 1
node:internal/modules/run_main:122
    triggerUncaughtException(
    ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\scripts\lib\cnc-program-gt-lib.mjs' imported from C:\Users\wompu\AppData\Local\Temp\probe1.mjs
Did you mean to import "../../../../../../H:/prism/scripts/lib/cnc-program-gt-lib.mjs"?
    at finalizeResolution (node:internal/mo
... [+678 chars truncated]

### Assistant | 2026-06-22T12:56:45.402Z

The relative import resolves against the temp dir. Let me use an absolute import path.

### Assistant | 2026-06-22T12:56:52.548Z

[tool_use: Bash]

### User | 2026-06-22T12:56:57.964Z

[tool_result] === apostrophe variants in C BORE / C SINK ===
C-smartquote BORE U+2019: {"kind":"bore","diameterIn":0.531}
C-backtick BORE: {"kind":"cbore","diameterIn":0.531}
C-space BORE: {"kind":"cbore","diameterIn":0.531}
CBORE no sep: {"kind":"cbore","diameterIn":0.531}
C-smartquote SINK: {"kind":null,"diameterIn":null}
=== multiple decimals: pick RIGHT value ===
82 DEG CSK .375: 0.375
90.0 DEG CSK .375 ang
... [+407 chars truncated]

### Assistant | 2026-06-22T12:57:08.740Z

This surfaces several real findings. Let me note:

1. **Smart-quote (U+2019) apostrophe in C'BORE breaks classification** — `C’BORE` (the typographic apostrophe VLMs/Windows commonly emit) classifies as `bore` instead of `cbore`, and `C’SINK` classifies as `null` (completely dropped). The regex character class `C['` ]?` only handles straight-quote `'`, backtick `` ` ``, and space — NOT U+2019.

2. **Thread/tap exclusion over-matches a date** — `.250 DRILL 12-15-2020` is suppressed as `tap` because `12-15` matches `\b\d+\s*-\s*\d+\b`. A legitimate drill diameter is silently dropped if a date appears in the comment. (Part number `100-RC-932` did NOT trigger it because there's a letter between, but `3-2` in "REV 3-2" did.)

The multi-decimal angle case (90.0 DEG) correctly picks .375 here because DEG... wait, actually it picked the LAST .375, but with `90.0 DEG CSK .375` the decimals are `90.0` and `.375` — the loop returns the FIRST in-bound value. `90.0` is < 6? No, 90.0 > 6 (DIAMETER_MAX_IN), so it's rejected, and `.375` wins. Good. But let me verify the ordering risk when the first in-bound decimal is the WRONG one. Let me probe deeper on the decimal-ordering and the part-number/date suppression scope, plus CRLF and catastrophic-backtracking.

### Assistant | 2026-06-22T12:57:20.507Z

[tool_use: Bash]

### User | 2026-06-22T12:57:28.219Z

[tool_result] === decimal ordering: first in-bound wins -- is it the RIGHT one? ===
C'BORE .250 DEEP .531 DIA: 0.25
.5 DEEP .531 CBORE: {"kind":"cbore","diameterIn":0.5}
DRILL .272 X .500 DP: 0.272
=== date/partnum suppression scope: only when holeKind===drill ===
ream + date: {"kind":"ream","diameterIn":0.5}
cbore + thread word: {"kind":"cbore","diameterIn":0.531}
drill + qty 6-32: {"kind":"tap","diameterIn":n
... [+238 chars truncated]

### Assistant | 2026-06-22T12:57:38.656Z

Important findings here:

1. **Decimal ordering picks the WRONG value when the diameter is not first** — `C'BORE .250 DEEP .531 DIA` returns `0.25` (the depth), not `.531` (the diameter). `extractDiameterToken` returns the FIRST in-bound decimal, which in "diameter-second" comment layouts (`.5 DEEP .531 CBORE`, `DRILL .272 X .500 DP`) is the wrong value. This is the exact "multiple decimals — does it pick the RIGHT one?" concern the prompt raised. It does NOT always pick right. This produces wrong GT for those comment forms.

2. **Performance: ~2.5 seconds on a 50000-char digit run.** That's not catastrophic backtracking (it's linear-ish — `Number()` on a 50k-digit string plus regex scan), and real comments are ≤~80 chars so it won't bite the corpus. But the date-suppression `\b\d+\s*-\s*\d+\b` with `\s*` could be a place to check — let me verify there's no true polynomial blowup. Actually the 2.5s is mostly `Number()` on the giant string and the `DECIMAL_IN_RE` global scan; not a P-issue for real input. Let me confirm the date suppression scoping and whether c'bore/ream correctly bypass it (they do — good, only `drill` is suppressed).

Now let me probe the modal-tracking concerns in `extractMillBoreDiameters`: I/J with no X/Y, G2/G3 in header where cx/cy null, R-arcs, and a non-bore arc accidentally closing.

### Assistant | 2026-06-22T12:57:52.302Z

[tool_use: Bash]

### User | 2026-06-22T12:57:57.106Z

[tool_result] === arc in HEADER: cx/cy null -> guarded? ===
G3 first line, no prior pos: []
=== arc line with I/J but NO X/Y (full circle restated by modal) ===
modal-closed arc (I/J only): [0.75]
=== R-arc (no I/J) -> silently ignored? ===
G2 with R, no I/J: []
=== NON-bore arc that accidentally closes (start==end but it's a contour loop, not a hole) ===
contour returning to start: [4]
=== an arc whose modal s
... [+331 chars truncated]

### Assistant | 2026-06-22T12:58:10.621Z

More findings:

1. **Header arc (cx/cy null) correctly guarded** — returns `[]`. Good.
2. **Modal-closed arc (I/J only, no X/Y) correctly mints the bore** — `[0.75]`. Good (this is the realistic full-circle form where the controller restates nothing).
3. **R-arc silently ignored** — `G2 X1 Y1 R.375` yields `[]`. The prompt flagged this. A full-circle isn't expressible with a single R (R-form can't encode 360°), so a closed circle is virtually always I/J — this is an acceptable gap, but it IS undocumented in the function body relative to how confidently other gaps are called out. Worth a P2 note since the docstring says "arcs using R instead of I/J... is that a silent gap worth flagging" — the code comment doesn't mention R at all.
4. **`I9e9999` → Infinity → produces `18`** — Wait: `Number("9e9999")` = Infinity, `sqrt(Inf^2)=Inf`, `2*Inf=Inf`, `(Inf).toFixed(4)` = "Infinity", `+"Infinity"` = Infinity, then `.filter(v => v>0)` keeps Infinity... but output shows `18`? Let me recheck — actually the regex `[+-]?(?:\d+\.?\d*|\.\d+)` matched `9` (the `e9999` is not part of the numeric token since there's no exponent handling). So `I9` → radius from I=9... but bound is <6 in hole extractor only; **bore extractor has NO upper bound at all**. `I9` gives radius 9, dia 18. This is the real issue: **`extractMillBoreDiameters` has no DIAMETER_MAX_IN sanity bound** while `extractDiameterToken` does. A garbage/huge arc (or a coordinate misparse) mints an 18-inch "bore diameter." Let me confirm Infinity handling specifically and the no-bound issue.

### Assistant | 2026-06-22T12:58:18.647Z

[tool_use: Bash]

### User | 2026-06-22T12:58:23.595Z

[tool_result] huge integer I (I999999): [1999998]
modest junk I=9 -> dia 18 (no upper bound): [18]
I with trailing dot 'I3.': [6]
G3 line, I/J next line: []
lowercase g3: []

### Assistant | 2026-06-22T12:58:33.451Z

Confirmed findings:

1. **`extractMillBoreDiameters` has NO upper sanity bound** — `I999999` mints a `1999998`-inch bore diameter into the GT. `extractMillHoleDiameters`/`extractDiameterToken` correctly bound to `< DIAMETER_MAX_IN (6)`, but the bore path does not. A coordinate misparse, a packed/odd-format line, or a legitimately large arc-center offset (e.g. a fixture move) that happens to "close" injects a junk diameter into `calloutDimsIn`. Since these are deduped distinct values, this inflates the recall denominator with a value OCR can never match → depresses recall. This is asymmetric with the hole path and undefended. **P1** (it can corrupt the very metric this tool exists to produce).

2. **Lowercase `g3` not matched** — `ARC_RE = /\bG0?[23]\b/` (no `i` flag) misses lowercase. Most JM posts are uppercase, so likely benign, but worth a P2 note since `classifyProgramAxis`/other regexes are inconsistent about case (some use `i`, some don't).

Now let me verify the critical validate-runner concern: the `let gt` reassignment for mill, the `gtReliable` gate flow, and whether the LATHE path is untouched. Specifically, I want to confirm there's no fall-through bug where a mill part that IS reliable still gets correctly OCR'd, and that `program_length_in=null` for mill doesn't break anything downstream.

### Assistant | 2026-06-22T12:58:45.857Z

[tool_use: Bash]

### User | 2026-06-22T12:58:50.938Z

[tool_result] MILL reliable: {"scored":true,"axis":"mill","calloutDimsIn":[0.25],"lengthIn":null,"gtClass":"mill-holes"}
MILL no-feat : {"skip":"program-mill-no-gt","gtClass":"mill-no-features"}
LATHE stepped: {"scored":true,"axis":"lathe","calloutDimsIn":[0.375,0.5,1.25],"lengthIn":1.25,"gtClass":"stepped"}
UNKNOWN      : {"skip":"program-non-lathe","axis":"unknown"}
mill score (lengthIn null path): {"gtCount"
... [+64 chars truncated]

### Assistant | 2026-06-22T12:58:58.968Z

The branch logic is correct: mill-reliable scores, mill-no-features skips, lathe is untouched, unknown skips. The mill GT flows through the scorer cleanly with `lengthIn=null`. Now let me confirm the critical "LATHE measurement must not change" requirement by verifying the lathe path with a real fixture, and check the unknown-axis path more carefully — there's a subtle ordering issue I want to verify in the runner's `if/else if/else` chain.

Looking at validate-perfect-parts.mjs:158-171: the structure is `if (non-lathe-non-mill) skip` ... `else if (!gtReliable) skip` ... `else OCR`. But note line 158 uses `if`, and 165 uses `else if`. Let me trace: for an `unknown` axis, line 158 sets `rec.skip` AND `agg.prog_non_lathe++` — then the `else if` at 165 is skipped (because 158's `if` was true). Good, no double-count. But there's one concern — does the `gt` for unknown axis have `gtReliable`? It's the lathe extractor output, which always has `gtReliable`. That's fine since 158's branch catches it first. Let me verify the lathe regression explicitly and double-check the `else if !gtReliable` only fires for lathe-contour or mill-no-features.

### Assistant | 2026-06-22T12:59:05.659Z

[tool_use: Bash]

### User | 2026-06-22T12:59:10.963Z

[tool_result] LATHE axis: lathe
featureDiametersIn: [0.375,0.5]
calloutDimsIn: [0.375,0.5,1.25]
lengthIn: 1.25
gtClass: stepped gtReliable: true
maxDiameterIn: 0.5

=> lathe path identical: axis stays 'lathe', mill branch never taken, all fields present.

### Assistant | 2026-06-22T12:59:15.944Z

Lathe is fully preserved. Now let me verify the git history to confirm the lathe-extractor functions weren't touched by this diff (purely additive), and check the number/letter drill documentation honesty (the prompt asked whether #7 / F drill exclusion is documented honestly).

### Assistant | 2026-06-22T12:59:26.795Z

[tool_use: Bash]

### User | 2026-06-22T12:59:31.191Z

[tool_result] === number/letter drills: #7, F drill -- silently dropped or correctly nothing? ===
#7 DRILL: {"kind":"drill","diameterIn":null}
F DRILL: {"kind":"drill","diameterIn":null}
NO. 7 DRILL: {"kind":"drill","diameterIn":null}
extractDiameterToken('#7'): null
=== A number-drill in a hole list: does it emit a wrong dia or correctly nothing? ===
hole dias (only .250 should appear): [0.25]
=== #7 with a co
... [+99 chars truncated]

### Assistant | 2026-06-22T12:59:37.618Z

Number/letter drills correctly yield `diameterIn: null` and are dropped from the hole-diameter set (because `extractMillHoleDiameters` filters `diameterIn != null`). This is honest — a `#7 DRILL` with no decimal mints nothing rather than a fake value. Good.

One subtle note: `NO. 7 DRILL` → the `NO.` has a period but no digits after the dot in a decimal pattern, so it correctly returns null. And `#7 DRILL .201` would emit `.201` — but that's a contrived case; a real `#7` comment wouldn't also carry its decimal equivalent unless the shop wrote it, in which case `.201` IS likely the print-relevant value. Acceptable.

Now let me check the docstring honesty about number/letter drills — the prompt asked if it's "documented honestly." Let me grep the file for any mention.

### Assistant | 2026-06-22T12:59:38.660Z

[tool_use: Grep]

### User | 2026-06-22T12:59:40.405Z

[tool_result] 129: * @param {{contourThreshold?:number, minFeedMoves?:number}} [opts]
130: * @returns {{feedMoves:number, landMoves:number, faceMoves:number, contourMoves:number,
131: *            arcMoves:number, contourFraction:number, gtClass:('stepped'|'contour'|'insufficient'),
136:  const threshold = Number.isFinite(opts.contourThreshold) ? opts.contourThreshold : CONTOUR_FRACTION_THRESHOLD;
137:  const m
... [+3357 chars truncated]

### Assistant | 2026-06-22T12:59:51.209Z

The number/letter-drill exclusion is NOT explicitly documented as a known gap (the docstrings mention angle/qty/tool-number, not number/letter drills like `#7`/`F`). But the behavior is honest — it drops them rather than minting fake GT. This is a P2 documentation completeness note, not a correctness issue: a `#7 DRILL` (.201") silently contributes nothing to GT, which slightly under-counts the GT denominator for prints that DO callout that hole by its decimal-equivalent diameter. The honest direction (under-count, not fabricate) is acceptable, but it's undocumented unlike the deliberately-documented tap-drill/end-mill exclusions.

Let me do a final check on one concern the prompt raised: whether a comment with the C'BORE smart-quote appearing in a REAL JM program is likely. Let me check actual JM mill programs for apostrophe usage in c'bore comments to assess severity.

### Assistant | 2026-06-22T12:59:53.307Z

[tool_use: Bash]

### User | 2026-06-22T13:00:03.903Z

[tool_result] JM DIE/CNC LATHE/CFC/PRISM_UPGRADED/Okuma_GENOS_L200E-M/HOLDER2519-ENDMILL-B.nc
JM DIE/CNC LATHE/CFC/PRISM_UPGRADED/Okuma_GENOS_L300-M/HOLDER2519-ENDMILL-B.nc
JM DIE/CNC LATHE/CFC/PRISM_UPGRADED/Okuma_LB-3000EX/HOLDER2519-ENDMILL-B.nc
---grep for C'BORE variants in a sample of mill programs---
JM DIE/CNC LATHE/ACME/PRISM_UPGRADED/Okuma_GENOS_L200E-M/11-10715-0-A.nc
JM DIE/CNC LATHE/ACME/PRISM_UPGR
... [+274 chars truncated]

### Assistant | 2026-06-22T13:00:06.723Z

Let me look at how counterbore comments are actually written in real JM programs to assess how often the smart-quote (vs straight-quote) apostrophe appears, which determines the severity of the smart-quote finding.

### Assistant | 2026-06-22T13:00:08.355Z

[tool_use: Bash]

### User | 2026-06-22T13:00:13.797Z

[tool_result] (  source: H:\PRISM\JM DIE\CNC LATHE\ACME\PRISM_UPGRADED\Okuma_LB-3000EX-BigBore\11-10715-0-A.nc)
(  machineModel: Okuma_LB-3000EX-BigBore)
G85 NBORE D.060 U.005 W.001 F.003
NBORE G81
G87 NBORE
(  source: H:\PRISM\JM DIE\CNC LATHE\ACME\PRISM_UPGRADED\Okuma_LB-3000EX-BigBore\11-10715-0-B.nc)
(  machineModel: Okuma_LB-3000EX-BigBore)
G85 NBORE D.060 U.005 W.001 F.003
NBORE G81
G87 NBORE
(  source: H
... [+1062 chars truncated]

### Assistant | 2026-06-22T13:00:26.843Z

This is a very important real-data finding. Look at the actual lathe bore comment:

```
NAT07  (ID RGH.BORE 1/2 - INSERT.015R)
NAT09  (ID FIN.BORE 1/2 - INSERT R.007)
```

This is a **lathe** program (these go through `extractProgramGT`, not the mill path), so `parseToolComment` doesn't run on it. But it reveals the comment dialect: `BORE 1/2 - INSERT.015R`. Note these are lathe, so unaffected. But it confirms two things relevant to the mill path:

1. The `- ` pattern (`1/2 - INSERT`) — if a comment like this appeared in a MILL program, the thread regex `\b\d+\s*-\s*\d+\b` would NOT match (`1/2 - INSERT` has a letter after the dash), so no false tap-suppression there. But `INSERT.015R` shows decimals embedded in words — `extractDiameterToken`'s `DECIMAL_IN_RE` has `(?<![\w.])` lookbehind so `.015` preceded by `T` (letter) in `INSERT.015` would be blocked. Good defensive design.

Now let me confirm whether real MILL programs at JM use straight or smart quotes for c'bore. The lathe samples don't use the c'bore apostrophe form. Let me check mill-specific directories and the broader corpus for the apostrophe form to gauge smart-quote severity.

### Assistant | 2026-06-22T13:00:29.481Z

[tool_use: Bash]

### User | 2026-06-22T13:01:18.832Z

[tool_result] === search ALL .nc for c-apostrophe-bore patterns, show the literal bytes ===
     14 CSINK

### Assistant | 2026-06-22T13:01:23.372Z

Interesting and decisive. Across the entire `.nc` corpus, the c'bore/csink apostrophe form appears as **`CSINK`** (14 occurrences) — no apostrophe at all. Let me verify that `CSINK` (no separator, no apostrophe) is correctly classified, because the csk regex is `C['` ]?\s*SINK` — the `?` makes the separator optional, so `CSINK` should match. Let me confirm, and also check for `CBORE`/`C BORE` forms and whether these even appear in mill (vs lathe) contexts.

### Assistant | 2026-06-22T13:01:28.292Z

[tool_use: Bash]

### User | 2026-06-22T13:01:48.438Z

[tool_result] CSINK (the actual corpus form, 14x): {"kind":"csk","diameterIn":0.375}
.375 90 CSINK: {"kind":"csk","diameterIn":0.375}
CBORE (no sep): {"kind":"cbore","diameterIn":0.531}
COUNTERSINK word: {"kind":"csk","diameterIn":0.375}
COUNTERBORE word: {"kind":"cbore","diameterIn":0.531}
=== are any CSINK comments in MILL programs (vs lathe)? ===

### Assistant | 2026-06-22T13:01:56.413Z

Decisive real-data result: the actual corpus form `CSINK` (the only counterbore/sink form present, 14 occurrences) classifies **correctly** as `csk`. The smart-quote `C'SINK` variant that failed in my earlier probe does NOT appear in the real JM corpus. This significantly downgrades the smart-quote finding — it's a theoretical robustness gap (VLM-emitted apostrophes could appear if comments were ever OCR-sourced, but these are program text read directly from disk, not OCR'd), not a live data-loss bug. I'll record it as P2 rather than P1.

Note: none of the CSINK comments are in mill-path files, but the `extractMillProgramGT` path is reached for any program `classifyProgramAxis` returns `mill` for, regardless of directory. The classification correctness is what matters.

Let me do a final verification of two remaining concerns: (1) the date over-match severity — does any real mill program comment carry a `\d+-\d+` date/pattern alongside a DRILL that would wrongly suppress it; and (2) confirm the `agg.prog_mill_no_gt` is both initialized and surfaced in the report (the prompt explicitly asked).

### Assistant | 2026-06-22T13:01:57.732Z

[tool_use: Bash]

### User | 2026-06-22T13:02:01.884Z

[tool_result] === agg.prog_mill_no_gt: initialized AND surfaced? ===
129:  const agg = { scored: 0, passed: 0, print_unresolved: 0, prog_unresolved: 0, prog_not_nc: 0, prog_non_lathe: 0, prog_contour_gt: 0, prog_mill_no_gt: 0, raster_failed: 0, ocr_failed: 0, sumRecall: 0, sumPrecision: 0 };
169:            if (gt.gtClass === "mill-no-features") agg.prog_mill_no_gt++; else agg.prog_contour_gt++;
222:    skipped
... [+302 chars truncated]

### Assistant | 2026-06-22T13:02:05.599Z

Confirmed: `prog_mill_no_gt` and `prog_contour_gt` are both initialized (line 129), incremented (line 169), and surfaced in the report's `skipped` object (line 222). Fully wired.

Now let me check the real severity of the date over-match — do JM drill comments actually carry bare `\d+-\d+` patterns that aren't threads?

### Assistant | 2026-06-22T13:02:08.525Z

[tool_use: Bash]

### User | 2026-06-22T13:02:25.586Z

[tool_result] === drill comments with a bare digit-dash-digit that is NOT a thread (date/partnum/rev) ===
(FLAT DRILL SANDVIC A881-D0812LX25-02)
(FLAT DRILL SANDVIC A881-D0812LX25-02)
(FLAT DRILL SANDVIC A881-D0812LX25-02)
(FLAT DRILL SANDVIC A881-D0812LX25-02)
(FLAT DRILL SANDVIC A881-D0812LX25-02)
(FLAT DRILL SANDVIC A881-D0812LX25-02)
(FLAT DRILL SANDVIC A881-D0812LX25-02)
(1-15/32 DRILL  1.468)
(1-15/32 DRI
... [+148 chars truncated]

### Assistant | 2026-06-22T13:02:41.860Z

This is a **real, live data-loss finding**. Two genuine corpus cases where the date/thread over-match `\b\d+\s*-\s*\d+\b` wrongly suppresses a legitimate drill diameter:

1. **`(DRILL - .787 - 20mm)`** — `20mm` → wait, that's `- 20` with space; the pattern `\b\d+\s*-\s*\d+\b` needs digit-dash-digit. `.787 - 20` → `7 - 20`? No, `.787` ends in `7`, then ` - 20` → the regex `\b\d+\s*-\s*\d+\b` would match `787 - 20`? Let me check: `787` is `\d+`, ` - `, `20` is `\d+`. Yes, that matches → suppressed as tap. The `.787` drill diameter (a real callout) is dropped.

2. **`(1-15/32 DRILL 1.468)`** — `1-15` matches `\d+\s*-\s*\d+` → suppressed as tap. But `1-15/32` is actually a MIXED FRACTION (1 and 15/32 = 1.469"), the drill diameter itself! And `1.468` is the decimal equivalent. So this drill's diameter would be wrongly suppressed entirely.

3. **`A881-D0812LX25-02`** (Sandvik tool part number in a FLAT DRILL comment) — `812LX25` no... `D0812` then `LX25-02` → `25-02` matches `\d+-\d+`? `25`,`-`,`02` yes → suppressed. But "FLAT DRILL" — is this a hole the print dimensions? A flat drill makes a flat-bottom hole, dimensioned by diameter. If the comment carried a decimal diameter it would be dropped.

Let me confirm these specific cases programmatically.

### Assistant | 2026-06-22T13:02:46.917Z

[tool_use: Bash]

### User | 2026-06-22T13:02:51.318Z

[tool_result] DRILL - .787 - 20mm: {"kind":"drill","diameterIn":0.787}
1-15/32 DRILL 1.468: {"kind":"tap","diameterIn":null}
FLAT DRILL SANDVIC A881-D0812LX25-02: {"kind":"drill","diameterIn":null}
--- what each SHOULD yield (the real callout dia) ---
  DRILL - .787  -> should be drill .787
  1-15/32 DRILL 1.468 -> should be drill ~1.468

### Assistant | 2026-06-22T13:03:05.172Z

Confirmed with real corpus data:

- **`(DRILL - .787 - 20mm)`** → actually emits `.787` correctly. The over-match suppression only fires for `holeKind==='drill' && isThread`, and here... wait it returned `drill, .787`. So `787 - 20` did NOT trigger isThread? Let me re-examine: the `isThread` regex includes `\b\d+\s*-\s*\d+\b`. In `DRILL - .787  - 20mm`, the dashes are ` - ` (space-dash-space) and the digits around them: `DRILL -` (no digit before first dash), `.787  - 20` → `787` then `  - ` (two spaces) then `20`. `\b\d+\s*-\s*\d+\b` → `787\s*-\s*20`? There ARE two spaces. `\s*` allows them. But `787` is preceded by `.` so `\b` boundary is between `.` and `7`? `.` is non-word, `7` is word → boundary exists. So it SHOULD match... yet it returned drill. The reason: `.787` — the `\b` before `787`... actually the match `787 - 20` requires `\b` after `20` too; `20mm` → `20` followed by `m` (word char), so NO word boundary after `20`. `\b\d+\b` fails because `20mm` has no boundary between `20` and `mm`. So it escaped suppression by luck. Good for this case.

- **`(1-15/32 DRILL 1.468)`** → **WRONGLY suppressed as tap** (`diameterIn: null`). `1-15` matches `\b1\s*-\s*15\b` (boundary after `15` because `/` follows). This is a real **1-15/32" (1.469") drill** whose diameter is silently dropped from GT. **Live data loss.**

- **`(FLAT DRILL SANDVIC A881-D0812LX25-02)`** → returns `drill, null` (no decimal diameter in comment anyway, so no GT to lose here — the `25-02` triggers isThread but there's no diameter token regardless).

So the **`1-15/32 DRILL` mixed-fraction case is a confirmed live false-suppression**: a drill whose diameter is expressed as a mixed fraction (`1-15/32`) is read as a thread `1-15` and suppressed. This is doubly wrong because the mixed-fraction dash is the SAME `[- ]` separator `fractionToDecimal` uses to PARSE a mixed number — the thread heuristic and the fraction parser collide on the same syntax.

I have enough to render a thorough verdict. Let me
... [+26 chars truncated]

### Assistant | 2026-06-22T13:03:06.271Z

[tool_use: Bash]

### User | 2026-06-22T13:03:09.546Z

[tool_result] cleaned

### Assistant | 2026-06-22T13:03:47.115Z

I have completed an independent end-to-end review of all three files, run the 26-test suite (all pass), and validated the new functions against real JM corpus G-code. Here is my verdict.

---

VERDICT: FAIL

summary: The change is well-structured, purely additive (the lathe path is byte-for-byte preserved — verified), correctly wired into the runner (the `gtReliable`/skip gate, `agg.prog_mill_no_gt` init+increment+report-surfacing, and `let gt` mill reassignment all flow cleanly), and honest about empty GT (`gtReliable=false` → runner skips rather than scoring a fake recall=0). However, two real correctness defects survive: a thread/tap exclusion regex that wrongly suppresses a legitimate mixed-fraction drill diameter present in the live corpus, and an unbounded bore-diameter path that can mint junk diameters into the recall denominator. Both corrupt the very metric this tool exists to produce.

findings:

- [P1] `scripts/lib/cnc-program-gt-lib.mjs:419` — The thread-context regex `\b\d+\s*-\s*\d+\b` collides with the mixed-fraction drill syntax. A real corpus comment `(1-15/32 DRILL 1.468)` (a 1.469" drill) classifies as `tap` with `diameterIn:null` — its diameter is silently dropped from GT. This is the SAME `[- ]` separator `fractionToDecimal` (line 381) uses to PARSE a mixed number, so the thread heuristic and the fraction parser fight over identical syntax. Verified live against `JM DIE` (`grep` found the comment; `parseToolComment("1-15/32 DRILL  1.468")` → `{kind:"tap",diameterIn:null}`). Under-counting GT here depresses recall for any mill print with a fractional-inch drill ≥1". Fix: before the thread test, strip/guard recognized fraction tokens (e.g. run `FRACTION_IN_RE` first and exclude its span), or tighten the thread pattern to require a known thread context (a preceding/following thread keyword or a `/`-free dash) so `N-NN/DD` mixed fractions don't read as a thread series.

- [P1] `scripts/lib/cnc-program-gt-lib.mjs:483` — `extractMillBoreDiameters` has
... [+4304 chars truncated]
