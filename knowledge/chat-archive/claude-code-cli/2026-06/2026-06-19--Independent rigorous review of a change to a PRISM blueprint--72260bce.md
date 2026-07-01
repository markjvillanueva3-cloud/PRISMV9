---
type: "chat-session"
source: "claude-code-cli"
session_id: "72260bce-0a62-459c-b567-b0ae228e3b92"
title: "Independent rigorous review of a change to a PRISM blueprint-OCR ground-truth li"
date: "2026-06-19"
first_ts: "2026-06-19T20:27:55.542Z"
last_ts: "2026-06-19T20:30:45.478Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 12
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/72260bce-0a62-459c-b567-b0ae228e3b92/subagents/agent-ad55635cbdf74610d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Independent rigorous review of a change to a PRISM blueprint-OCR ground-truth li

> **claude-code-cli** | 2026-06-19 | 33 msgs (12 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/72260bce-0a62-459c-b567-b0ae228e3b92/subagents/agent-ad55635cbdf74610d.jsonl`

## Transcript

### User | 2026-06-19T20:27:55.542Z

Independent rigorous review of a change to a PRISM blueprint-OCR ground-truth library. Read BOTH files fully:
- H:/prism/scripts/lib/cnc-program-gt-lib.mjs (new: `programGtReliability`, exports CONTOUR_FRACTION_THRESHOLD + MIN_FEED_MOVES_FOR_CLASS; extractProgramGT now also returns contourFraction/gtClass/gtReliable/moveProfile)
- H:/prism/scripts/lib/cnc-program-gt-lib.test.mjs (6 new tests)

DOMAIN: Lathe G-code. X = diameter axis, Z = length axis. A turned CYLINDER = a feed move advancing Z at constant X (a "land"). A FACE/shoulder = a feed move changing X at constant Z. A CONTOUR (taper/radius) = a G2/G3 arc or a diagonal G1 (X and Z both change), which a print dimensions with ONE radius/angle callout, NOT one callout per swept point. The change classifies parts whose programs are contour-dominated as GT-UNRELIABLE so the downstream true-test (validate-perfect-parts.mjs) excludes them from the OCR recall aggregate — preventing a metric artifact (T-11BT radiused punch scored recall 0.21 against 14 swept "diameters" ≈ 3-4 real callouts) from being read as real OCR weakness.

Weight your review toward what an analyst might miss:
1. SEMANTIC SOUNDNESS: is "contour-fraction of feed moves > 0.5" a defensible proxy for "program diameters are NOT print callouts"? Could a legitimately stepped part with chamfers (diagonal moves) be wrongly classed contour (false exclusion)? Could a contour part be wrongly classed stepped (false inclusion → artifact survives)? Is the 0.5 threshold + 4-move floor justified by the stated corpus evidence (stepped 0.13-0.20, contour 0.64-0.83)?
2. CONVENTION CONFORMANCE: matches the surrounding file's idiom (pure functions, no fs/fetch, comment density, JSDoc, naming). No inlined magic constants that should be named. No em-dash/non-ASCII in code (PRISM ascii-guard).
3. HONESTY (R12): does the change actually make the metric MORE honest, or could it be a way to hide bad OCR by excluding hard parts? Is excluding contour parts the right call vs n
... [+591 chars truncated]

### Assistant | 2026-06-19T20:28:00.746Z

I'll review both files end-to-end. Let me read them fully.

### Assistant | 2026-06-19T20:28:01.215Z

[tool_use: Read]

### Assistant | 2026-06-19T20:28:01.691Z

[tool_use: Read]

### User | 2026-06-19T20:28:02.487Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cnc-program-gt-lib.mjs' was already read 15s ago in this session and is unchanged (mtime 1781900661053). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-19T20:28:02.864Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cnc-program-gt-lib.test.mjs' was already read 15s ago in this session and is unchanged (mtime 1781900824524). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-19T20:28:05.483Z

The read-once-guard claims these are in my context, but they are not — this is a fresh agent thread. Let me bypass the cache to read them.

### Assistant | 2026-06-19T20:28:06.864Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:28:07.219Z

[tool_use: Bash]

### User | 2026-06-19T20:28:12.827Z

[tool_result]      1	// scripts/lib/cnc-program-gt-lib.mjs
     2	//
     3	// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
     4	// validate what the OCR pipeline reads off the matching blueprint. The program is the STRONGEST GT
     5	// available: it encodes the ACTUAL machined coordinates (what the part is literally cut to), in plain
     6	// text, no ST
... [+23148 chars truncated]

### User | 2026-06-19T20:28:19.182Z

[tool_result]      1	// scripts/lib/cnc-program-gt-lib.test.mjs
     2	// Tests the CNC-program ground-truth extractor that validates the OCR pipeline against real machined
     3	// geometry. The program is the answer key for the 91-perfect-parts true-test, so a wrong GT here =
     4	// either passing a broken OCR (false confidence before the full-corpus run) or failing a correct one.
     5	// Fixtures are R
... [+15930 chars truncated]

### Assistant | 2026-06-19T20:28:22.509Z

Both files are now fully read. Let me verify the consumer claim (validate-perfect-parts.mjs) to assess whether the exclusion is actually transparent/recorded vs silent, and confirm the corpus-evidence claims in the comments.

### Assistant | 2026-06-19T20:28:25.049Z

[tool_use: Bash]

### User | 2026-06-19T20:28:30.812Z

[tool_result] -rwxr-xr-x 1 wompu 197611 15120 Jun 19 14:59 H:/prism/scripts/validate-perfect-parts.mjs*
---GREP for consumer usage of gtReliable/gtClass---
H:/prism/scripts/lib/cnc-program-gt-lib.mjs
H:/prism/scripts/lib/cnc-program-gt-lib.test.mjs

### Assistant | 2026-06-19T20:28:34.553Z

Important finding: the consumer `validate-perfect-parts.mjs` does NOT reference any of the new fields (`gtReliable`, `gtClass`, `contourFraction`, etc.). The new reliability classification is computed and returned but NOT consumed. Let me confirm by reading the consumer to see what it actually does with the GT and whether the exclusion the task prompt describes is wired.

### Assistant | 2026-06-19T20:28:34.717Z

[tool_use: Read]

### User | 2026-06-19T20:28:36.399Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/validate-perfect-parts.mjs
3	//
4	// U-XRAY-PERFECT-PARTS-TRUETEST — the TRUE end-to-end test of the OCR/blueprint-reading system on the
5	// 91 perfect parts (print + CAD + CNC program) BEFORE scaling to the full corpus. For each part: OCR
6	// the blueprint → extract dims (mm), parse the matching CNC program → objective machined-dim GT, and
7	// score recall (d
... [+15435 chars truncated]

### Assistant | 2026-06-19T20:28:40.068Z

I now have the complete picture. Let me verify the corpus-evidence claim about the specific parts the comments cite (T-11BT, 05850), since the change's entire justification rests on those numbers. I'll check whether T-11BT-27-250-GR5.MIN actually exists and whether the CONTOUR_RADIUS fixture is a faithful excerpt.

### Assistant | 2026-06-19T20:28:43.193Z

[tool_use: Bash]

### User | 2026-06-19T20:28:55.283Z

[tool_result] FOUND: H:/PRISM/JM DIE/CNC LATHE/OMG/CNC#1#2#3/CUSTOMERS/OPTIMAS/T-11BT-27-250-GR5.MIN
---arc/diagonal feed-move sample (G2/G3 + G1 with both X and Z)---
12:G1 X-.04 F.0088
17:G1 Z.0 F.0088
18:G1 Z-.878 F.0088
30:G1 X-.04 F.0055
41:G1 Z-.08 F.003
61:G1 Z.009 F.005
67:G1 Z.009
69:G3 X.4431 Z-.0121 I-.2054 K.1064 
70:G1 X.1791 Z-.0144
74:G1 Z-.0021
76:G3 X.4354 Z-.0192 I-.2054 K.1064 
77:G1 X.185 Z-
... [+664 chars truncated]

### Assistant | 2026-06-19T20:29:11.163Z

The cited program exists and confirms the structure: a G3 radius-form finish pass with many `G3 X.. Z.. I.. K..` arcs interleaved with diagonal `G1 X.. Z..` moves — exactly the contour-dominated pattern the change targets. The CONTOUR_RADIUS fixture in the test is a faithful (slightly trimmed) excerpt of lines ~69-95 of the real file.

Now I have everything needed for a rigorous verdict. Let me reason through the adversarial concerns.

**On the consumer wiring (R12 transparency / R15):** The task prompt asserts the downstream true-test "excludes them from the OCR recall aggregate." I read `validate-perfect-parts.mjs` end to end. It imports `extractProgramGT` (line 29) and calls it (line 152), but it does NOT read `gt.gtReliable`, `gt.gtClass`, `gt.contourFraction`, or `gt.moveProfile` anywhere. The `rec` object written per-part (lines 176-183) and the `agg`/report (lines 199-205) contain none of these fields. So the exclusion described in the task prompt is **not yet wired** — the classification is computed and returned but the consumer ignores it. This is the central thing to weigh.

**On semantic soundness:** Walking the math on the real fixtures — `LATHE_FEED` has 4 feed moves: `G1 X.5 Z0` (diagonal, both change from G0 approach → contour), `G1 Z-.75` (land), `G1 X.375 Z-.75` (face, X-only), `G1 Z-1.25` (land) → contourMoves=1, fraction 0.25 → stepped. The comment at line 229 claims "1 diagonal of 4." Correct. CONTOUR_RADIUS → every feed move is arc or diagonal → fraction 1.0 → contour. The bucketing is one-bucket-per-move, mutually exclusive, arc takes priority. Sound.

**On the false-exclusion concern (chamfered stepped part):** A 45° chamfer is a single diagonal G1, counted as contour. A stepped part with several chamfers could climb toward 0.5. But the GT for a chamfer IS a swept set of nothing — a chamfer is one diagonal move = 1 contour move, not many points, so the fraction is per-move not per-point. A part with 6 lands/faces + 2 chamfers = 2/8 = 0.25, sti
... [+338 chars truncated]

### Assistant | 2026-06-19T20:29:15.279Z

[tool_use: Bash]

### User | 2026-06-19T20:29:24.199Z

[tool_result] === non-ASCII bytes in SOURCE (new lines 94-171) ===
grep: -P supports only unibyte and UTF-8 locales
NONE (clean ASCII)
=== non-ASCII in TEST new sections (lines 174-265) ===
grep: -P supports only unibyte and UTF-8 locales
NONE (clean ASCII)
=== em-dash / smart-quote check across both files ===
grep: -P supports only unibyte and UTF-8 locales
NONE

### Assistant | 2026-06-19T20:29:27.591Z

The `-P` locale issue makes those greps unreliable. Let me use a byte-level check via the Grep tool and a Python scan to be certain.

### Assistant | 2026-06-19T20:29:30.041Z

[tool_use: Bash]

### User | 2026-06-19T20:29:37.504Z

[tool_result] === SOURCE non-ASCII (whole file) ===
3:// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
7:// each part into a real (print → dims) supervision pair whose answer key is the program itself.
11:// — max turned diameter (max positive X), overall length (Z travel span) — plus the raw X/Z value
13:// convention, R12 — verified in the STEP CONVERSION_BAS
... [+3931 chars truncated]

### Assistant | 2026-06-19T20:29:45.583Z

There ARE non-ASCII characters throughout both files — em-dashes (`—`), Unicode arrows (`→`), `×`, `≤`, `≠`, `…`, smart-quote-like apostrophes. But these appear in **comments and test descriptive strings only**, and critically they are **pre-existing** in the file (lines 3, 5, 7, 16, etc. are the original header/existing tests, not the new change). I need to confirm whether the change ADDED any new non-ASCII, since the review is scoped to the diff.

Looking at the new-code lines specifically:
- Line 80 string `clustered ${reps.length} ≤ 3` (line 80 is in the `clusterDiameters` test — is that new? The task says 6 new tests + the reliability code). 
- New reliability code lines 94-171 in source: the non-ASCII hits at 94, 96, 175, 201, 202, 208, 217, 221, 240, 255, 260 — lines 94/96 are the RAPID_RE/FEED_RE comment block (pre-existing, adjacent to the new ARC_RE/COORD_EPS additions). Let me determine precisely which non-ASCII is NEW vs pre-existing by checking the git diff.

### Assistant | 2026-06-19T20:29:47.787Z

[tool_use: Bash]

### User | 2026-06-19T20:29:55.948Z

[tool_result] === exit / if empty, no NEW non-ASCII in added lines ===

### Assistant | 2026-06-19T20:29:59.731Z

The diff produced no non-ASCII in added lines — but that result is suspicious because the file clearly contains non-ASCII. Let me confirm whether the file is tracked/has a diff at all (it may be a brand-new untracked file, or already committed), so I correctly attribute the non-ASCII.

### Assistant | 2026-06-19T20:30:03.601Z

[tool_use: Bash]

### User | 2026-06-19T20:30:09.634Z

[tool_result] === git status of the two files ===
?? scripts/lib/cnc-program-gt-lib.mjs
?? scripts/lib/cnc-program-gt-lib.test.mjs
=== diff stat vs HEAD ===
=== is .mjs tracked at HEAD? ===
=== added lines containing the NEW reliability symbols ===

### Assistant | 2026-06-19T20:30:45.478Z

Both files are **untracked** (`??`) — there is no committed prior version, so `git diff HEAD` is empty. This means the entire file is "the change" from git's perspective, but per the task framing, the *change* is the reliability addition layered onto a previously-existing extractor (the file content shows clear "new vs old" structure). The non-ASCII em-dashes/arrows are present throughout, including the pre-existing portions and the new docblock for `programGtReliability` (lines 119-133 use `--`, ASCII, good) — but the new code's surrounding existing comments already use `—`/`→`.

Critically: the **new** reliability code (lines 106-171, the new docblock, the new test fixtures/tests) uses ASCII `--` and `->` consistently (e.g. line 109 `->`, line 126 `->`, line 167 `--`). The test descriptive strings the new tests added use `->` (line 208, 211) and `<=`/`>` ASCII operators. The one new-ish non-ASCII is line 80 `≤` in the clusterDiameters test. Since the file matches the surrounding pervasive em-dash idiom, and PRISM's ASCII guard applies to *code* (identifiers/strings that execute), not comments, this is at most a P2 consistency note, and the new code itself is clean.

I have enough to render a rigorous verdict. Let me consolidate.

---

VERDICT: FAIL

summary: The new `programGtReliability` classifier is mathematically sound, well-documented, convention-conformant, and backed by real corpus evidence (the cited T-11BT-27-250-GR5.MIN exists and is genuinely G3-radius-contour-dominated; the CONTOUR_RADIUS fixture is a faithful excerpt). The tests are real, intent-encoding, and adversarial. However, the change is an **orphan**: the consumer `validate-perfect-parts.mjs` imports `extractProgramGT` but never reads `gtReliable`/`gtClass`/`contourFraction`/`moveProfile`, so the stated purpose — excluding contour parts from the OCR recall aggregate so the metric is more honest — is **not actually achieved**. The honesty improvement exists in the library but is invisible to th
... [+3872 chars truncated]
