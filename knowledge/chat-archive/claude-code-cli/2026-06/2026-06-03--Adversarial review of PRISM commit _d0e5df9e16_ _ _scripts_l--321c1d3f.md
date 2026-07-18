---
type: "chat-session"
source: "claude-code-cli"
session_id: "321c1d3f-573b-4b70-b640-f87f9336e18a"
title: "Adversarial review of PRISM commit `d0e5df9e16` — `scripts/lib/nc-dialect-masks."
date: "2026-06-03"
first_ts: "2026-06-03T01:51:34.538Z"
last_ts: "2026-06-03T02:02:38.610Z"
cwd: "H:\\prism"
messages: 47
user_msgs: 17
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/agent-a11cbe082664ab6a2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Adversarial review of PRISM commit `d0e5df9e16` — `scripts/lib/nc-dialect-masks.

> **claude-code-cli** | 2026-06-03 | 47 msgs (17 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/agent-a11cbe082664ab6a2.jsonl`

## Transcript

### User | 2026-06-03T01:51:34.538Z

Adversarial review of PRISM commit `d0e5df9e16` — `scripts/lib/nc-dialect-masks.mjs` (per-dialect volatileCommentMask profiles + `roundTrip` golden round-trip classifier). This is a SAFETY-GATE primitive for proving CNC post processors: `roundTrip(golden, candidate)` classifies a difference as byte-identical / volatile-header-only (SAFE — same program, header churn) / semantic-drift. It masks "volatile" header comments (dates/times/file paths) before comparing, then re-uses `compareNC` from `scripts/lib/nc-normalize.mjs`.

Run `git -C H:/prism show d0e5df9e16` and read the file + its test.

PRIMARY (fail-OPEN) question: **Can a volatile mask regex EVER match and neutralize SEMANTIC G-code content** (a motion line, tool/material/offset/coordinate/O-number), such that two genuinely-different programs get classified `volatile-header-only` (SAFE) when they should be `semantic-drift`? Probe each pattern:
- `DATE=[^)\n]*`, `TIME=[^)\n]*` — could a real program line legitimately contain `DATE=`/`TIME=` that carries meaning?
- `\b(?:MCX|MCAM|NC)\s*FILE\s*-\s*[^)\n]*` — could `NC FILE` (or the `[^)\n]*` greedy tail) swallow a semantic token, especially on a line with no closing paren?
- `\(\s*\d{2}/\d{2}/\d{2}\s*\)` (Mitsubishi paren-date) — could it match a semantic coordinate/parameter that happens to look like dd/dd/dd?
- `\(\s*source:\s*[^)\n]*\)` (PRISM) — safe?
- The `allMask()` UNION is the fallback for `dialect:'unknown'` — does applying ALL dialect masks at once to a program of a DIFFERENT dialect risk over-masking?
Also: does `detectDialect` ever misroute such that the wrong (over-broad) mask is applied? And is the `safe` flag (`masked.equal`) the right semantics?

Construct concrete adversarial NC inputs and actually reason them through the regexes. Output a concise verdict ending with exactly `GRADE: PASS` or `GRADE: FAIL`, P0/P1 first. Only PASS if you cannot construct a realistic case where a mask hides a semantic difference.

### Assistant | 2026-06-03T01:51:44.012Z

I'll start by examining the commit and its contents.

### Assistant | 2026-06-03T01:51:44.830Z

[tool_use: Bash]

### User | 2026-06-03T01:51:49.464Z

[tool_result] commit d0e5df9e161ac3b2b3588aaa130fe75124712772
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 2 20:44:41 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-NC-DIALECT-MASKS (slot:echo): per-dialect volatileCommentMask profiles + golden round-trip classifier (scripts/lib/nc-dialect-masks.mjs). roundTrip(golden,candidate) → byte-identical | volati
... [+838 chars truncated]

### Assistant | 2026-06-03T01:51:52.380Z

I'll read the full file and its test.

### Assistant | 2026-06-03T01:51:53.346Z

[tool_use: Bash]

### Assistant | 2026-06-03T01:51:53.939Z

[tool_use: Bash]

### User | 2026-06-03T01:52:02.479Z

[tool_result] // nc-dialect-masks.mjs — per-dialect volatile-comment masks + golden round-trip classifier.
//
// The arm of CIMCO post-proof that is provable OFFLINE today: given a golden NC program and a
// candidate (re-emitted, or a re-saved sibling), classify the difference as
//   - byte-identical        : equal even raw
//   - volatile-header-only  : equal AFTER masking volatile header comments (dates/tim
... [+6246 chars truncated]

### User | 2026-06-03T01:52:09.172Z

[tool_result] // nc-dialect-masks.test.mjs — real-behavior tests for per-dialect volatile masks + round-trip classifier.
// Run: node --test scripts/lib/nc-dialect-masks.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { DIALECT_MASKS, allMask, maskFor, detectDialect, roundTrip, normalizeNC } from "./nc-dialect-masks.mjs";

// ─── detectDialect (real header fixtures, co
... [+5184 chars truncated]

### Assistant | 2026-06-03T01:52:13.897Z

Now I need to read the dependency `compareNC`/`normalizeNC` to understand exactly how masks are applied and how comparison works. This is critical — the masks are regex strings, and the real risk depends on application order (per-line? before/after structural collapse?) and whether `compareNC` treats comments specially.

### Assistant | 2026-06-03T01:52:15.025Z

[tool_use: Bash]

### User | 2026-06-03T01:52:20.178Z

[tool_result] // nc-normalize.mjs — strict NC/G-code normalizer + byte-equivalence comparator.
//
// The shared CORE of the Haas golden round-trip / byte-equivalence harness (echo's
// refuse-clause: "shipping-post-without-byte-equivalence-vs-golden") AND the CIMCO
// File-Compare consumer of SPINE-1 (`prism_cimco`). CIMCO File Compare is too lenient
// (it silently ignores block renumber + spacing); PRISM does
... [+6793 chars truncated]

### Assistant | 2026-06-03T01:52:31.479Z

Now I have the full picture. The masks are applied **per line, via raw regex substitution, before any structural collapse** and crucially **without any requirement that the line be a comment** — `s.replace(m.re, m.rep)` runs on every line. The masks are NOT anchored to being inside `(...)`. Let me reason through each pattern with concrete adversarial NC.

The most important property: `normalizeNC` applies masks to *every line regardless of whether it is a comment*. So the only protection against masking semantic G-code is whatever the regex itself anchors to. Let me empirically test the dangerous candidates rather than reason in the abstract.

### Assistant | 2026-06-03T01:52:52.686Z

[tool_use: Bash]

### User | 2026-06-03T01:53:01.298Z

[tool_result] Exit code 1
node:internal/modules/run_main:122
    triggerUncaughtException(
    ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\scripts\lib\nc-dialect-masks.mjs' imported from C:\Users\wompu\AppData\Local\Temp\probe.mjs
Did you mean to import "../../../../../../H:/prism/scripts/lib/nc-dialect-masks.mjs"?
    at finalizeResolution (node:internal/modules
... [+671 chars truncated]

### Assistant | 2026-06-03T01:53:05.656Z

The temp dir resolved relative paths wrong. Let me write the probe into the repo lib dir so relative imports resolve, then clean up.

### Assistant | 2026-06-03T01:53:27.192Z

[tool_use: Write]

### User | 2026-06-03T01:53:32.724Z

[tool_result] File created successfully at: H:/prism/scripts/lib/_probe_nc_masks_TMP.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-03T01:53:35.091Z

These are pre-existing tasks unrelated to my review (I'm a read-only analysis agent). I'll ignore the task list and run my probes.

### Assistant | 2026-06-03T01:53:35.776Z

[tool_use: Bash]

### User | 2026-06-03T01:53:40.721Z

[tool_result] === P1b: 'NC FILE -' line, NO paren, trailing motion X10 vs X99 ===
dialect=mastercam class=volatile-header-only safe=true rawEqual=false maskedEqual=true

=== P2: line w/ DATE= token, value 5 vs 9, no paren ===
dialect=mastercam class=volatile-header-only safe=true rawEqual=false maskedEqual=true

=== P3a: distinct (dd/dd/dd) parens both masked to (DATE) ===
dialect=mitsubishi-edm class=volatile-
... [+965 chars truncated]

### Assistant | 2026-06-03T01:53:46.663Z

Confirmed multiple real over-masking findings. Let me probe the two most production-realistic cases more precisely: the greedy `[^)\n]*` tail eating semantic tokens *inside a real header comment* (P5/P6 — the realistic ones), and confirm what a genuine Mastercam/Okuma `(NC FILE - ...)` line actually looks like in JM goldens (does the file-path comment ever carry a trailing semantic token in real JM output?). Let me also test the `prismSource` pattern and confirm the `safe` semantics on the byte-identical-but-only-differs-in-comment-not-covered case.

### Assistant | 2026-06-03T01:54:04.950Z

[tool_use: Bash]

### User | 2026-06-03T01:54:13.452Z

[tool_result] file:///H:/prism/scripts/lib/_probe_nc_masks_TMP.mjs:74
const g12 = `%\nO1234\n(PROGRAM NAME - 9007405)\n(NC FILE - C:\USERS\A\9007405.MIN)\n(MATERIAL - STEEL INCH - 1030)\nG0 X20. Z30.\nM30\n%`;
                                                                      ^

SyntaxError: \8 and \9 are not allowed in template strings.
    at compileSourceTextModule (node:internal/modules/esm/utils:33
... [+325 chars truncated]

### Assistant | 2026-06-03T01:54:23.553Z

The backslash path broke the template literal. Let me fix those two lines to use escaped backslashes.

### Assistant | 2026-06-03T01:54:38.892Z

[tool_use: Edit]

### User | 2026-06-03T01:54:42.378Z

[tool_result] The file H:/prism/scripts/lib/_probe_nc_masks_TMP.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-03T01:54:44.934Z

[tool_use: Bash]

### User | 2026-06-03T01:54:50.417Z

[tool_result] firstDiff L3: a="(SYNC FILE - A)" b="(SYNC FILE - B)"

=== P8: ratio-looking (50/60/00) vs (50/60/99) under mitsubishi mask ===
dialect=mitsubishi-edm class=volatile-header-only safe=true rawEqual=false maskedEqual=true


##### ROUND 2: realism + prismSource + line-deletion blindspot #####

=== P9: PRISM (source: .. partNumber=1234) vs (.. partNumber=9999) — source tail eats partNumber ===
dialect
... [+779 chars truncated]

### Assistant | 2026-06-03T01:55:02.252Z

Now I have a precise picture. Let me summarize what is real vs theoretical:

**Confirmed over-masking (mask hides a semantic difference → false SAFE):**
- **P5/P6/P9/P13(comment)**: The `[^)\n]*` greedy tail. When a *real header comment* contains `DATE=`/`TIME=`/`NC FILE -`/`source:` followed by **additional content in the same parens**, the greedy tail swallows that trailing content. P5 `(DATE=.. SETUP=A)` vs `(DATE=.. SETUP=B)` → falsely SAFE. P6 `(NC FILE - .. TOOL=T1)` vs `TOOL=T9` → falsely SAFE. P9 PRISM `(source: .. partNumber=1234)` vs `9999` → falsely SAFE.
- **P3a/P8**: Mitsubishi `\(\s*\d{2}/\d{2}/\d{2}\s*\)` collapses **any** parenthesized dd/dd/dd triple to `(DATE)`, regardless of whether it's a real date. Two *different* paren-triples become equal.
- **P1b/P2**: the non-paren-anchored patterns (`DATE=`, `TIME=`, `NC FILE -`) match on lines that are **not comments at all** (greedy to EOL), neutralizing trailing semantic content. These are the most dangerous because the mask designer's stated invariant ("anchored to a header-comment token that cannot appear in real motion") is literally false for these three patterns — they have no `(` anchor.

The critical thing now: are these **realistic** for JM's actual goldens, or contrived? P11 shows the benign real shape (path on its own paren line, material on its own line) is handled correctly. The realism question hinges on whether semantic tokens ever share a paren with `DATE=`/`TIME=`/`NC FILE -`/`source:`. Let me check the real JM golden headers and whether `S` (spindle) appears on Okuma `(TIME=...)` lines, plus check whether any real JM `.MIN`/`.nc`/PRISM file has multi-token volatile parens.

### Assistant | 2026-06-03T01:55:04.279Z

[tool_use: Bash]

### User | 2026-06-03T01:55:08.707Z

[tool_result] ---- direct corpus search ----
Automated Program_Corrected 5-25.xlsm
BASEBALL PARTS/
CNC LATHE/
CNC MILL HAAS/
CNC OKUMA MULTUS/
CONTROLLERS/
FUSION CAD AND CAM FILES/
GENERAL BANDAGES/
HAAS-HURCO/
HURCO CNC PROGRAMS/

### Assistant | 2026-06-03T01:55:13.286Z

The volatile tokens aren't tracked in git (goldens live in the corpus dir). Let me look at a real Mastercam-posted header and a real Okuma `.MIN` from the corpus to confirm the actual shape of these volatile lines — specifically whether `DATE=`/`TIME=` and the file-path line ever carry additional semantic tokens in the same parens.

### Assistant | 2026-06-03T01:55:14.546Z

[tool_use: Bash]

### User | 2026-06-03T02:00:21.204Z

[tool_result] Command running in background with ID: b8vwir6gy. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\67157468-c33e-4c73-bff0-9fe799a08370\tasks\b8vwir6gy.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-03T02:00:24.601Z

The grep is running in the background over a large corpus. Let me wait for it and check the output.

### Assistant | 2026-06-03T02:00:25.777Z

[tool_use: Bash]

### User | 2026-06-03T02:00:59.090Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-03T02:01:03.587Z

[tool_use: Read]

### User | 2026-06-03T02:01:05.909Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### Assistant | 2026-06-03T02:01:12.923Z

The output file is empty — the grep found no matches (or the corpus tokens differ). The exact JM golden header shape is not on disk in a form I can quickly grep, but the commit message itself documents the real header shape it validated against: `(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40)` and `(NC FILE - C:\...)`. That is the realism anchor I need. Let me reason it through precisely and also verify the key sub-question: in that **real** combined line `(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40)`, the `DATE=` mask's greedy `[^)\n]*` tail swallows the `TIME=` token too — confirming masks already chain within one paren. Let me verify the actual test fixture behavior and one final realism check on whether the combined DATE/TIME line is the documented real shape.

### Assistant | 2026-06-03T02:01:26.621Z

[tool_use: Bash]

### User | 2026-06-03T02:01:39.336Z

[tool_result] ##### ROUND 3: documented-real combined DATE/TIME line #####

=== R3a documented real line, date+time churn ===
dialect=mastercam class=volatile-header-only safe=true rawEqual=false maskedEqual=true

=== R3b same paren carries trailing note OP1 vs OP9 — eaten by DATE tail ===
dialect=mastercam class=volatile-header-only safe=true rawEqual=false maskedEqual=true

=== R3c uncovered comment REV A vs 
... [+168 chars truncated]

### Assistant | 2026-06-03T02:01:44.175Z

I have everything I need. The key realism finding from R3a: the documented real JM golden line `(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40)` is a **single paren carrying multiple tokens**, and the `DATE=[^)\n]*` greedy tail already swallows the entire paren to `)`. This proves multi-token volatile parens are the *real documented shape*, not a contrivance — so the over-mask risk is grounded in real data, not just synthetic inputs.

Let me clean up my temp probe file before finishing.

### Assistant | 2026-06-03T02:01:45.206Z

[tool_use: Bash]

### User | 2026-06-03T02:01:54.220Z

[tool_result] removed
 M scripts/lib/chat-token-watch.mjs
 M scripts/lib/claude-account-lib.mjs
 M scripts/lib/graph-node-embedding-bridge.mjs
 M scripts/lib/graph-node-embedding-bridge.test.mjs
 M scripts/lib/graphsage-predictor.mjs
 M scripts/lib/graphsage-train-pipeline.test.mjs
 M scripts/lib/hybrid-retrieval.mjs
 M scripts/lib/hybrid-retrieval.test.mjs
 M scripts/lib/memory-namespace-classifier.mjs
 M scri
... [+25 chars truncated]

### Assistant | 2026-06-03T02:02:38.610Z

Temp file removed (the other `M` entries are pre-existing, unrelated to my review). My probe file is gone — clean.

---

## Adversarial Review: `scripts/lib/nc-dialect-masks.mjs` (commit `d0e5df9e16`)

**Verdict: the fail-OPEN hazard is REAL and reproducible.** Multiple mask regexes can match and neutralize semantic G-code content, classifying genuinely-different programs as `volatile-header-only` (SAFE). The file's own load-bearing safety claim — *"Every pattern below is anchored to a header-comment token… that cannot appear in real motion"* — is **factually false** for three of its five patterns. I confirmed every finding by executing the actual code (`roundTrip`) against concrete NC inputs, including the commit's own documented real JM header shape.

The root cause is structural in the dependency: `nc-normalize.mjs` applies every mask via `line.replace(re, rep)` on **every line unconditionally** — there is no "is this a comment?" gate. The mask regex *is* the only safety boundary, so any regex that isn't truly comment-anchored leaks onto semantic lines.

### P0 — Three patterns are NOT paren-anchored; they match bare semantic lines and run greedily to EOL
`mastercamDate` (`DATE=[^)\n]*`), `mastercamTime` (`TIME=[^)\n]*`), and `mastercamFile` (`\b(?:MCX|MCAM|NC)\s*FILE\s*-\s*[^)\n]*`) have **no `(` in them**. The `[^)\n]*` tail does not require a closing paren — on a line with no `)`, it consumes to end-of-line.

- **P1b** — `mastercam` dialect, golden line `NC FILE - C:\A G1 X10.` vs candidate `NC FILE - C:\B G1 X99.` → classified `volatile-header-only`, `safe=true`. The `G1 X99.` motion was swallowed by the greedy file-tail. A real coordinate change is hidden.
- **P2** — line `#100=DATE=5` vs `#100=DATE=9` (a macro/parameter assignment containing the literal token `DATE=`) → `safe=true`. The parameter value difference is masked.

The comment header asserts these tokens "cannot appear in real motion." `DATE=`, `TIME=`, and the `NC`/`FILE` words can appear outside
... [+5438 chars truncated]
