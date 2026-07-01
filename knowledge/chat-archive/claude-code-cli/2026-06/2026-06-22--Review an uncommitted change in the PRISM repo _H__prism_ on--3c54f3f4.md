---
type: "chat-session"
source: "claude-code-cli"
session_id: "3c54f3f4-6786-4c39-84d6-62b0a0db8cad"
title: "Review an uncommitted change in the PRISM repo (H:/prism) on slot xray (blueprin"
date: "2026-06-22"
first_ts: "2026-06-22T12:55:09.220Z"
last_ts: "2026-06-22T13:02:04.576Z"
cwd: "H:\\prism"
messages: 78
user_msgs: 27
assistant_msgs: 51
raw_file: "H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-a735c6a4e5b7bb24b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review an uncommitted change in the PRISM repo (H:/prism) on slot xray (blueprin

> **claude-code-cli** | 2026-06-22 | 78 msgs (27 user / 51 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-a735c6a4e5b7bb24b.jsonl`

## Transcript

### User | 2026-06-22T12:55:09.220Z

Review an uncommitted change in the PRISM repo (H:/prism) on slot xray (blueprint-vision). It adds MILL-program ground-truth extraction to the OCR closed-loop measurement (previously lathe-only).

Files changed (read each fully):
1. H:/prism/scripts/lib/cnc-program-gt-lib.mjs — NEW functions appended near the end: fractionToDecimal, extractDiameterToken, parseToolComment, extractMillHoleDiameters, extractMillBoreDiameters, extractMillProgramGT (+ consts DIAMETER_MAX_IN, DECIMAL_IN_RE, FRACTION_IN_RE, XYZ_COORD_RE, BORE_EPS_IN, MILL_HOLE_KINDS). The EXISTING lathe functions (extractProgramGT etc.) must be byte-unchanged.
2. H:/prism/scripts/lib/cnc-program-gt-lib.test.mjs — added 8 mill test cases (real JM G-code fixtures).
3. H:/prism/scripts/validate-perfect-parts.mjs — routes gt.axis==='mill' to extractMillProgramGT; mill parts with hole/bore features now SCORE (previously skipped as program-non-lathe); mill parts with no feature skip as 'program-mill-no-gt'. Added agg.prog_mill_no_gt counter + report skipped fields + note.

Use `git -C H:/prism diff` to see exactly what changed.

Verify with file:line citations and grade PASS/FAIL with P0/P1/P2 findings:
- CORRECTNESS of the GT: mill X/Y are positions not diameters. Hole diameters come from tool-change comments (DRILL/REAM/BORE/CBORE/CSK/SPOTFACE). Tap-drill diameters (thread context) and end-mill/ball/face/chamfer cutter diameters MUST be excluded (they are not print callouts). Bore diameters come ONLY from FULL-CIRCLE G2/G3 arcs (endpoint==start within eps; diameter=2*sqrt(I^2+J^2)). Is the exclusion logic sound? Any false-positive class (a tool comment that would wrongly mint a feature dia)? Any false-negative that drops a legitimate hole callout?
- The fractionToDecimal / extractDiameterToken math: spot-check 27/64=0.421875, 1-1/4=1.25, the DIAMETER_MAX_IN<6 bound, lookbehind/lookahead boundaries.
- The full-circle detection: is "endpoint within BORE_EPS_IN of modal start" a correct closed-circle test? Does a
... [+935 chars truncated]

### Assistant | 2026-06-22T12:55:12.698Z

I'll review this change systematically. Let me start by examining the diff and reading the changed files end-to-end.

### Assistant | 2026-06-22T12:55:13.884Z

[tool_use: Bash]

### Assistant | 2026-06-22T12:55:14.476Z

[tool_use: Bash]

### User | 2026-06-22T12:55:19.104Z

[tool_result] <persisted-output>
Output too large (265.3KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\3c54f3f4-6786-4c39-84d6-62b0a0db8cad\tool-results\bcrbx4y6e.txt

Preview (first 2KB):
warning: in the working copy of 'knowledge/memories/reference/plugin_architecture.md', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'knowledge/memories/referenc
... [+1673 chars truncated]

### User | 2026-06-22T12:55:22.803Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-22T12:55:27.595Z

The first diff command's stat got mixed with other repo noise. Let me get the targeted diff for just the three files.

### Assistant | 2026-06-22T12:55:29.604Z

[tool_use: Bash]

### User | 2026-06-22T12:55:35.000Z

[tool_result] 0 /tmp/diff1.txt
---STAT---
 scripts/validate-perfect-parts.mjs | 30 ++++++++++++++++++++++++------
 1 file changed, 24 insertions(+), 6 deletions(-)

### Assistant | 2026-06-22T12:55:39.650Z

Interesting — the diff stat only shows `validate-perfect-parts.mjs` as changed. The `cnc-program-gt-lib.mjs` and its test file show no diff. This suggests the new functions may be untracked/new files, or the changes were already committed, or the files are new. Let me check git status for these specific files.

### Assistant | 2026-06-22T12:55:41.486Z

[tool_use: Bash]

### User | 2026-06-22T12:55:52.266Z

[tool_result]  M scripts/validate-perfect-parts.mjs
?? scripts/lib/cnc-program-gt-lib.mjs
?? scripts/lib/cnc-program-gt-lib.test.mjs
---LOG for lib---
---LOG for test---

### Assistant | 2026-06-22T12:55:56.276Z

Both `cnc-program-gt-lib.mjs` and `cnc-program-gt-lib.test.mjs` are entirely NEW (untracked) files — they have never been committed. This means the "EXISTING lathe functions must be byte-unchanged" backward-compat concern is about logical consistency within a new file, not a diff against a committed baseline. Let me read all three files fully.

### Assistant | 2026-06-22T12:55:56.787Z

[tool_use: Read]

### User | 2026-06-22T12:55:57.480Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cnc-program-gt-lib.mjs' was already read 7s ago in this session and is unchanged (mtime 1782132790231). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T12:56:00.910Z

The guard says it's already in context, but it isn't (the empty diff returned nothing). Let me read with explicit offset to bypass the cache.

### Assistant | 2026-06-22T12:56:01.663Z

[tool_use: Read]

### User | 2026-06-22T12:56:03.106Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.mjs
2	//
3	// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
4	// validate what the OCR pipeline reads off the matching blueprint. The program is the STRONGEST GT
5	// available: it encodes the ACTUAL machined coordinates (what the part is literally cut to), in plain
6	// text, no STEP kernel / GPU / MCP needed. 
... [+34846 chars truncated]

### Assistant | 2026-06-22T12:56:05.811Z

I have the full library file. Now let me read the test file and the validate-perfect-parts.mjs changes.

### Assistant | 2026-06-22T12:56:05.987Z

[tool_use: Read]

### User | 2026-06-22T12:56:07.385Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cnc-program-gt-lib.test.mjs' was already read 11s ago in this session and is unchanged (mtime 1782132800912). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T12:56:09.898Z

The guard is blocking again but the content isn't actually in my context. Let me use offset to read it.

### Assistant | 2026-06-22T12:56:10.775Z

[tool_use: Read]

### User | 2026-06-22T12:56:12.163Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.test.mjs
2	// Tests the CNC-program ground-truth extractor that validates the OCR pipeline against real machined
3	// geometry. The program is the answer key for the 91-perfect-parts true-test, so a wrong GT here =
4	// either passing a broken OCR (false confidence before the full-corpus run) or failing a correct one.
5	// Fixtures are REAL G-code excerpts (T-11
... [+23579 chars truncated]

### Assistant | 2026-06-22T12:56:14.786Z

I have the full test file. Now let me read the validate-perfect-parts.mjs changes — both the diff and the surrounding consumer context.

### Assistant | 2026-06-22T12:56:15.496Z

[tool_use: Bash]

### User | 2026-06-22T12:56:19.249Z

[tool_result] diff --git a/scripts/validate-perfect-parts.mjs b/scripts/validate-perfect-parts.mjs
index 4f0c4818ec..b66a41d2ea 100644
--- a/scripts/validate-perfect-parts.mjs
+++ b/scripts/validate-perfect-parts.mjs
@@ -26,7 +26,7 @@ import { argv, exit, env } from "node:process";
 
 import { runEnsembleOverImage } from "./lib/vision-ensemble-fuse.mjs";
 import { dimToMm } from "./lib/dimension-set-score.mjs";
... [+7265 chars truncated]

### Assistant | 2026-06-22T12:56:23.510Z

Now let me read the full surrounding context in validate-perfect-parts.mjs to verify the wiring logic — especially the `let gt` block, the skip handling, and how the `gt.gtClass`/`gtReliable` fields flow.

### Assistant | 2026-06-22T12:56:24.436Z

[tool_use: Read]

### User | 2026-06-22T12:56:25.943Z

[tool_result] 120	  const partKeys = parts.map((p) => p.part_number);
121	  const { todo: todoKeys } = partitionByResumeCursor(partKeys, done);
122	  const todoSet = new Set(todoKeys);
123	  const todo = parts.filter((p) => todoSet.has(p.part_number));
124	
125	  console.log(`\n🧪 TRUE-TEST — ${parts.length} perfect parts · ${todo.length} todo · ${parts.length - todo.length} resumed · models ${models.join(",")}`
... [+10092 chars truncated]

### Assistant | 2026-06-22T12:56:30.028Z

I now have all three files in full. Let me run the tests to confirm they pass, then do detailed correctness analysis on the edge cases the task flagged.

### Assistant | 2026-06-22T12:56:31.015Z

[tool_use: Bash]

### User | 2026-06-22T12:56:36.023Z

[tool_result]   ...
# Subtest: extractMillBoreDiameters: a FULL-CIRCLE G3 yields 2*radius; a partial arc does NOT
ok 23 - extractMillBoreDiameters: a FULL-CIRCLE G3 yields 2*radius; a partial arc does NOT
  ---
  duration_ms: 0.5586
  ...
# Subtest: extractMillProgramGT: mill GT = hole+bore dia, mirrors extractProgramGT shape, gtReliable when found
ok 24 - extractMillProgramGT: mill GT = hole+bore dia, mirrors 
... [+588 chars truncated]

### Assistant | 2026-06-22T12:56:39.921Z

All 26 tests pass. Now let me probe the specific correctness edge cases the task flagged. First, the regex math and boundary behaviors that aren't directly tested.

### Assistant | 2026-06-22T12:56:52.643Z

[tool_use: Bash]

### User | 2026-06-22T12:56:57.904Z

[tool_result] === DECIMAL boundary / token-slicing ===
1.375 BORE       -> 1.375
X1.5 in coord?   -> null
.201 in 1/4-20   -> 0.201
Z-.5 (neg)       -> 0.5
R.1 RAD          -> null
word3.5end       -> null

=== tool-number / qty misreads ===
T1.5 DRILL       -> null
H12 D.25 DRILL   -> null
DIA .25 DRILL    -> 0.25

=== realistic comment forms ===
(T3 D.250 DRILL) -> { kind: 'drill', diameterIn: null }
(.250 DR
... [+160 chars truncated]

### Assistant | 2026-06-22T12:57:06.493Z

This surfaces an important false-NEGATIVE class. Two findings here:

1. **`Z-.5 DRILL` → 0.5** (line `X1.5 -> null` but `Z-.5 -> 0.5`). The lookbehind `(?<![\w.])` blocks `1.5` after `X1` (digit `1` is `\w`), but in `Z-.5` the char before `.5` is `-`, which is NOT in `[\w.]`, so `.5` matches. So a coordinate-like token with a leading minus inside a comment WOULD parse. But coordinates aren't normally in comments — low risk.

2. **`D.250 DRILL` → null** (the `D` diameter-prefix form). Many shops write `(T3 D.250 DRILL)` or `(D.531 C'BORE)` where `D` denotes "diameter". The lookbehind `(?<![\w.])` treats `D` as `\w` and blocks the decimal, yielding `null`. This is a **false-negative that drops a legitimate hole callout**.

Let me verify how common the `D.xxx` form is in the actual JM corpus before weighting this.

### Assistant | 2026-06-22T12:57:09.261Z

[tool_use: Bash]

### User | 2026-06-22T12:57:23.923Z

[tool_result] 1 /tmp/onefile.txt
--- total NC text files ---
154456

### Assistant | 2026-06-22T12:57:27.499Z

154,456 NC text files. Let me sample how common the `D.xxx` diameter-prefix form and `Ø`/`DIA` forms are in real mill tool comments, to weight the false-negative finding empirically.

### Assistant | 2026-06-22T12:57:33.515Z

[tool_use: Bash]

### User | 2026-06-22T12:57:52.664Z

[tool_result] === Comments with (D.<num> ... DRILL/REAM/BORE/CSK/CBORE) form ===
400 /tmp/toolfiles.txt
=== count of 'D.<digits>' inside parenthesized comments across those files ===
=== count of plain '.<digits> DRILL' (leading-dot, space/paren before) form ===

### Assistant | 2026-06-22T12:57:56.757Z

The grep over the first 400 files returned nothing for both forms — those files may be lathe or use different comment conventions. Let me broaden: look at what tool comments actually look like in mill programs that drill, to characterize the real comment grammar.

### Assistant | 2026-06-22T12:57:58.117Z

[tool_use: Bash]

### User | 2026-06-22T12:58:09.774Z

[tool_result] === sample actual parenthesized DRILL comments (any form) ===
(.500-DRILL)
(CENTER DRILL 1/2)
(CENTER DRILL)
(CENTER DRILL1/2)
(CENTRER DRILL)
(DRILL - .59)
(DRILL - .6299)
(DRILL - .708)
(DRILL - .787)
(DRILL - .921)
(DRILL - .937)
(DRILL - .944)
(DRILL - .953)
(DRILL - .954)
(DRILL - .968)
(DRILL - .9688)
(DRILL - .984)
(DRILL - 1.)
(DRILL - 1.220)
(DRILL - 1.290)
(DRILL - 1.968)
(DRILL - INSERT
... [+258 chars truncated]

### Assistant | 2026-06-22T12:58:13.607Z

This is the real comment grammar. The dominant forms are `(DRILL - .59)`, `(DRILL .375)`, `(.500-DRILL)`, `(DRILL .375 DIA)`. Now I can test these real forms against the parser. Notably `(DRILL - 1.)` (trailing-dot decimal) and `(DRILL - INSERT.9449)` are interesting edge cases. Let me run all these real forms through.

### Assistant | 2026-06-22T12:58:16.693Z

[tool_use: Bash]

### User | 2026-06-22T12:58:22.010Z

[tool_result] ".500-DRILL"               -> {"kind":"drill","diameterIn":0.5}
"DRILL - .59"              -> {"kind":"drill","diameterIn":0.59}
"DRILL - .6299"            -> {"kind":"drill","diameterIn":0.6299}
"DRILL - 1."               -> {"kind":"drill","diameterIn":null}
"DRILL - 1.220"            -> {"kind":"drill","diameterIn":1.22}
"DRILL - INSERT.9449"      -> {"kind":"drill","diameterIn":null}
"DRILL .2
... [+444 chars truncated]

### Assistant | 2026-06-22T12:58:33.703Z

Important findings from real corpus forms:

1. **`DRILL - 1.` → null** — trailing-dot decimal `1.` (a valid shop form meaning 1.000") is not matched by `DECIMAL_IN_RE = /\d*\.\d+/` (requires digits AFTER the dot). This is a false-negative, but `1.` is rare and the value loss is bounded (a 1" drill).

2. **`CENTER DRILL 1/2` → kind:drill, dia:0.5** — this is a **FALSE-POSITIVE**. A CENTER drill is a spotting/centering tool (creates a center mark / chamfer start for a subsequent drill), NOT a through-hole the print dimensions by diameter `1/2`. The `1/2` here is the center-drill body size, not a print callout. The parser mints `0.5` as a hole diameter. This is the same class the code explicitly guards against for `SPOT` (bare spot = center mark, excluded) — but `CENTER DRILL` falls through to the generic `\bDRILL\b` → "drill" branch and emits its size.

3. **`INSERT.9449` → null** — the `.9449` is blocked because `T` of `INSERT` ... actually `INSERT.9449`: the char before `.9449` is `T` (`\w`), so lookbehind blocks it. The real diameter `.9449` is dropped. False-negative.

Let me confirm the CENTER DRILL false-positive is real and characterize its prevalence, since center-drill comments are extremely common in mill programs.

### Assistant | 2026-06-22T12:58:36.854Z

[tool_use: Bash]

### User | 2026-06-22T12:58:55.212Z

[tool_result] === CENTER DRILL comment forms with a size token (false-positive candidates) ===
(CENTER DRILL 1/2)
(CENTER DRILL)
(CENTER DRILL1/2)
(T11 - CENTER DRILL)

=== SPOT DRILL forms (the code excludes bare SPOT; does CENTER also need it?) ===
(SPOT DRILL)

### Assistant | 2026-06-22T12:59:02.728Z

Confirmed. `CENTER DRILL 1/2` and `CENTER DRILL1/2` carry a size token that the parser would mint as a `0.5` hole diameter when only a `1/2` is present — but a center drill is a center-mark tool, not a print-dimensioned hole. This is the **same false-positive class** the code already deliberately guards for `SPOT` (the comment at lines 426-429 explicitly says "a bare SPOT is a spot DRILL ... NOT a print-dimensioned diameter"). `CENTER DRILL` is the exact analog and is NOT excluded.

Note: in `CENTER DRILL 1/2` the only diameter token is `1/2` (a fraction). The decimal regex finds nothing, so `extractDiameterToken` falls to the fraction → `0.5`. For `CENTER DRILL` (no size) → null, harmless. The risk is specifically when a center-drill comment carries a size.

Now let me verify the full-circle bore detection logic and the modal-start tracking carefully — particularly the helical case and whether a bore arc on the SAME line as a coordinate-less prior state works.

### Assistant | 2026-06-22T12:59:13.947Z

[tool_use: Bash]

### User | 2026-06-22T12:59:18.882Z

[tool_result] === full-circle detection edge cases ===
G3 with no X/Y endpoint (I/J only): [0.75]
two half-arcs (each open): []
quarter-arc fillet: []
arc with no prior pos: []
modal G3 across lines: [0.75]

### Assistant | 2026-06-22T12:59:26.988Z

The full-circle bore detection is sound:
- `G3 I-.375 J0` with no X/Y endpoint → modal endpoint = start → closed → `[0.75]` (correct; this is the most common full-circle form).
- Two half-arcs → each open → `[]` (no false bore).
- Quarter-arc fillet → `[]` (correct exclusion).
- Arc with no prior position (`cx===null`) → `[]` (no crash, no mint — the `cx !== null && cy !== null` guard works).
- Modal G3 second-line circle is missed (line 3 has no explicit G3) — a known partial-modal limitation, but conservative (drops, never mints). Acceptable.

One concern: a bore arc that omits X/Y endpoint AND the I/J denote a NON-full circle would be wrongly closed. But by ISO 6983, if the endpoint equals the start (which omitting X/Y guarantees), it IS a full circle by definition. So that's correct.

Now let me verify the `27/64=0.421875` and `DIAMETER_MAX_IN<6` boundary math, and check the backward-compat claim — that the existing lathe functions are byte-unchanged. Since the file is new (untracked), "byte-unchanged" means consistent within. Let me verify the lathe path still produces the documented contract by checking the key math values.

### Assistant | 2026-06-22T12:59:37.187Z

[tool_use: Bash]

### User | 2026-06-22T12:59:41.669Z

[tool_result] 27/64 = 0.421875 (expect 0.421875)
1-1/4 = 1.25 (expect 1.25)
1 1/4 = 1.25 (expect 1.25)
5.999 DRILL -> 5.999 (< 6 ok)
6.0 DRILL   -> null (>= 6 reject -> null)
6.001 DRILL -> null (reject)
0.0 DRILL   -> null (v>0 -> null)
--- backward-compat: confirm lathe extractProgramGT return keys vs mill (shape parity) ---
lathe keys: ["axis","calloutDimsIn","clusteredDiametersIn","contourFraction","feature
... [+395 chars truncated]

### Assistant | 2026-06-22T12:59:50.720Z

Math is exact: `27/64=0.421875`, `1-1/4=1.25`, `DIAMETER_MAX_IN<6` bound correct (5.999 ok, 6.0 rejected), `v>0` enforced. Shape parity is complete — mill returns a superset of the lathe keys (adds `holeDiametersIn`/`boreDiametersIn` for transparency); every key `scorePartAgainstProgram` and the validate runner consume is present.

Now let me verify the critical exclusion logic for the thread/tap-drill and the cbore-keeps-dia rules with adversarial cases, plus check whether a tap-drill that uses REAM/BORE keyword (not DRILL) in a thread context is correctly kept vs suppressed.

### Assistant | 2026-06-22T13:00:02.460Z

[tool_use: Bash]

### User | 2026-06-22T13:00:05.752Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 28: syntax error near unexpected token `('
/usr/bin/bash: eval: line 28: `// c'bore + thread -> KEEP (the c bore is a real dimensioned dia)'

### Assistant | 2026-06-22T13:00:08.761Z

The apostrophe in `c'bore` broke the heredoc. Let me write to a temp file instead.

### Assistant | 2026-06-22T13:00:11.691Z

[tool_use: Bash]

### User | 2026-06-22T13:00:16.806Z

[tool_result] Exit code 1
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\h\prism\scripts\lib\cnc-program-gt-lib.mjs' imported from C:\Users\wompu\AppData\Local\Temp\probe.mjs
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:932:10)
    at
... [+557 chars truncated]

### Assistant | 2026-06-22T13:00:20.854Z

The `/h/prism` path got Windows-mangled to `C:\h\prism`. Let me use the proper Windows-style absolute path with file:// URL.

### Assistant | 2026-06-22T13:00:23.931Z

[tool_use: Bash]

### User | 2026-06-22T13:00:28.089Z

[tool_result] "1/4-20 TAP DRILL .201"        -> {"kind":"tap","diameterIn":null}
".531 C BORE 1/4-20"           -> {"kind":"cbore","diameterIn":0.531}
".201 REAM FOR 1/4-20"         -> {"kind":"ream","diameterIn":0.201}
"1/4-20 TAP"                   -> {"kind":null,"diameterIn":null}
"M6X1.0 TAP DRILL .200"        -> {"kind":"tap","diameterIn":null}
"8-32 TAP DRILL .159"          -> {"kind":"tap","diameterIn":
... [+278 chars truncated]

### Assistant | 2026-06-22T13:00:36.968Z

The thread/tap exclusion logic is sound:
- `1/4-20 TAP DRILL .201` → tap, suppressed (correct).
- `.531 C BORE 1/4-20` → cbore, **kept** at 0.531 (correct — the c'bore IS dimensioned even in a thread context).
- `8-32 TAP DRILL .159` → tap, suppressed (correct).
- `DRILL .438 FOR 1-12 UNF` → tap, suppressed — a drill comment naming a thread (`1-12`) is correctly treated as a tap-drill, suppressed (correct).

One subtle observation: `.201 REAM FOR 1/4-20` → ream, kept at 0.201. A ream in a thread context — is that a tap-drill? No, a reamed hole that's also tapped is unusual; if `1/4-20` is the thread and `.201` the ream, this would be ambiguous. But reaming-before-tapping is not standard practice (you tap-DRILL, not tap-ream), so keeping the ream dia is defensible. Low risk.

Now let me verify the one genuine false-positive thread-context concern: the `\d+\s*-\s*\d+` thread regex. Could a plain `(DRILL - .59)` form's `- .59` or a part number like `(P/N 12-34 DRILL .25)` trigger a false thread suppression on a legitimate drill?

### Assistant | 2026-06-22T13:00:40.681Z

[tool_use: Bash]

### User | 2026-06-22T13:00:44.096Z

[tool_result] "DRILL .250 P/N 12-34"       -> {"kind":"tap","diameterIn":null}
"OP 2-5 DRILL .375"          -> {"kind":"tap","diameterIn":null}
"DRILL .25 (REV 2-3)"        -> {"kind":"tap","diameterIn":null}
"T12-3 DRILL .500"           -> {"kind":"drill","diameterIn":0.5}
"DRILL .375 X 2 PLACES"      -> {"kind":"drill","diameterIn":0.375}
"DRILL .375 2X"              -> {"kind":"drill","diameterIn":0.375}

### Assistant | 2026-06-22T13:00:54.495Z

This surfaces a real **false-negative class via the broad thread regex** `\b\d+\s*-\s*\d+\b`:

- `DRILL .250 P/N 12-34` → **tap, suppressed** — a part number `12-34` falsely matches the thread pattern, dropping a legitimate `.250` drill callout.
- `OP 2-5 DRILL .375` → **tap, suppressed** — an operation/step number `2-5` falsely matches.
- `DRILL .25 (REV 2-3)` → **tap, suppressed** — a revision `2-3` falsely matches.

So any drill comment that also contains *any* `<digits>-<digits>` token (part number, revision, operation, drawing zone, date) is misclassified as a tap-drill and its real diameter is dropped. This is a false-negative that drops legitimate hole callouts. The impact direction is safe-ish for OCR validation (a dropped GT lowers the recall denominator, doesn't mint false GT), but it silently shrinks the answer key and could mask real OCR misses or, conversely, make a part skip as `mill-no-features` if ALL its drills get suppressed this way. Note `T12-3 DRILL .500` was NOT suppressed because `T12-3` — the `\b` before `12` fails since `T` is a word char adjacent to `12`... actually `\b\d+` requires a word boundary before the digit; `T12` has no boundary between `T` and `12`, so it correctly doesn't match. But `P/N 12-34` has a space before `12`, creating the boundary.

Let me check how prevalent dash-number tokens are alongside DRILL in the actual corpus to weight this finding.

### Assistant | 2026-06-22T13:00:57.920Z

[tool_use: Bash]

### User | 2026-06-22T13:01:08.738Z

[tool_result] === DRILL/REAM/BORE comments containing a bare digits-dash-digits token (potential false thread) ===
(  source: H:\PRISM\JM DIE\CNC LATHE\ACME\PRISM_UPGRADED\Okuma_LB-3000EX-BigBore\11-10715-0-A.nc)
(  source: H:\PRISM\JM DIE\CNC LATHE\ACME\PRISM_UPGRADED\Okuma_LB-3000EX-BigBore\11-10715-0-B.nc)
(  source: H:\PRISM\JM DIE\CNC LATHE\ACME\PRISM_UPGRADED\Okuma_LB-3000EX-BigBore\A-11-10049-0.nc)
(  so
... [+2232 chars truncated]

### Assistant | 2026-06-22T13:01:21.657Z

These matches are `(  source: H:\PRISM\JM DIE\...11-10715-0-A.nc)` — comments that embed a SOURCE PATH containing part numbers like `11-10715`. These are PRISM-injected provenance comments (note the leading-double-space). The dash-numbers come from filenames/part-numbers. These are lathe files (`CNC LATHE`), so they won't route to the mill GT, but it confirms the `\d+-\d+` pattern collides with part-number conventions that are pervasive at JM. The point stands: a mill program with a `(  source: ...11-10715...)` provenance comment OR a part-number-bearing tool comment would have drills near such tokens at risk — though the thread check is per-comment, so only drills in the *same parenthesized comment* as the dash-number are affected. The provenance is a separate comment, so the risk is narrower than I first feared. Let me confirm the per-comment scoping reduces this to only same-comment dash-numbers.

The `parseToolComment` operates on ONE `( ... )` comment at a time (called per-match in `extractMillHoleDiameters` via `matchAll(/\(([^)]*)\)/g)`). So a separate `(  source: ...)` comment does NOT contaminate a `(.250 DRILL)` comment. The false-positive only fires when the dash-number is *inside the same comment* as the DRILL keyword (e.g. `(DRILL .250 P/N 12-34)`). That's a narrower but real class. I've verified the mechanism; the prevalence of same-comment part-numbers is lower than the provenance-comment case. I'll weight this as P2 (real, but narrow and safe-direction — it shrinks GT, never mints false GT).

Now let me verify the validate-wiring control flow for the `unknown` axis edge case and confirm there's no fall-through bug where a mill-no-features or unknown part gets double-counted or scored incorrectly.

### Assistant | 2026-06-22T13:01:31.412Z

[tool_use: Bash]

### User | 2026-06-22T13:01:37.422Z

[tool_result] unknown:         skip:program-non-lathe axis=unknown
mill+holes:      SCORE axis=mill gtClass=mill-holes calloutGT=[0.25]
mill no feat:    skip:program-mill-no-gt
lathe stepped:   SCORE axis=lathe gtClass=stepped calloutGT=[0.375,0.5,1.25]
unknown gt.axis=unknown gtReliable=true gtClass=insufficient (else-if guarded by axis check first)

### Assistant | 2026-06-22T13:01:50.016Z

The validate-wiring control flow is correct:
- `unknown` axis → skipped as `program-non-lathe` (the `gt.axis !== "lathe" && gt.axis !== "mill"` check fires first; the `else if (!gt.gtReliable)` is correctly guarded behind it via `if/else if/else` chain, so the unknown-axis `gtReliable=true/gtClass=insufficient` never causes a mis-route).
- `mill+holes` → SCORE; `mill no feat` → `program-mill-no-gt`; `lathe stepped` → SCORE. All correct.
- The counters are mutually exclusive (each part hits exactly one branch).

One important subtlety I should verify: the `if/else if/else` structure. Looking at lines 158-170, the structure is:
```js
if (gt.axis !== "lathe" && gt.axis !== "mill") { ... non-lathe ... }
else if (!gt.gtReliable) { ... contour/mill-no-gt ... }
else { ... OCR + score ... }
```
This is a proper exclusive chain — confirmed by the simulation. No double-count, no fall-through.

Now let me verify one final thing the task explicitly flagged: that a `tap-drill` in a thread context for a mill program does NOT mint a feature, and confirm `MILL_HOLE_KINDS` correctly excludes `tap`/`mill-tool`/`null` kinds (so a suppressed-dia kind can't leak). Also confirm the helical and the `clusteredDiametersIn` parity for mill.

### Assistant | 2026-06-22T13:02:00.235Z

[tool_use: Bash]

### User | 2026-06-22T13:02:04.576Z

[tool_result] hole dias: [0.25,0.5,0.531]
tap kind: {"kind":"tap","diameterIn":null}
mill-tool kind: {"kind":"mill-tool","diameterIn":null}
calloutDimsIn: [0.25,0.75] clusteredDiametersIn: [0.25,0.75] equal? true
maxDiameterIn: 0.75 lengthIn: null contourFraction: 0
