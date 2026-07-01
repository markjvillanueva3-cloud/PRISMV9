---
type: "chat-session"
source: "claude-code-cli"
session_id: "321c1d3f-573b-4b70-b640-f87f9336e18a"
title: "A prior adversarial review of `scripts/lib/nc-dialect-masks.mjs` found a P0 fail"
date: "2026-06-03"
first_ts: "2026-06-03T02:37:35.972Z"
last_ts: "2026-06-03T02:49:34.342Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 15
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/agent-ad37e6a1d3de32db3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# A prior adversarial review of `scripts/lib/nc-dialect-masks.mjs` found a P0 fail

> **claude-code-cli** | 2026-06-03 | 40 msgs (15 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/agent-ad37e6a1d3de32db3.jsonl`

## Transcript

### User | 2026-06-03T02:37:35.972Z

A prior adversarial review of `scripts/lib/nc-dialect-masks.mjs` found a P0 fail-OPEN: volatile-comment masks were unanchored/greedy and could neutralize SEMANTIC G-code, so `roundTrip` could classify two genuinely-different NC programs as `volatile-header-only` (SAFE). Specific leaks found:
1. `DATE=[^)]*` / `TIME=` / `NC FILE -` had no `(` requirement → on a paren-less line the greedy tail swallowed motion (e.g. `#100=DATE=5`, `NC FILE - C:\A G1 X10.`).
2. Greedy `[^)]*` ate a semantic sibling token inside a shared paren (`(DATE=... SETUP=A)`, `(NC FILE - ... TOOL=T1)`).
3. `(dd/dd/dd)` Mitsubishi collapse + `unknown→allMask` union over-masked.

A fix commit `7a14bf0def` was made. Run `git -C H:/prism show 7a14bf0def` and read the current `scripts/lib/nc-dialect-masks.mjs` + `scripts/lib/nc-dialect-masks.test.mjs`.

VERIFY the fix actually closes the fail-open:
1. Are ALL volatile patterns now paren-anchored (require `(`…`)`) AND do they fail CLOSED when a non-volatile `=token` is appended inside the comment? Construct the same adversarial inputs (sibling token in a date/file paren; a bare paren-less `DATE=`/`NC FILE -` line) and trace them through the NEW regexes — confirm they are NOT masked now (→ `semantic-drift`).
2. Is `maskFor('unknown')` now `[]` (fail-closed, masks nothing) rather than the over-broad union? Is `allMask` removed?
3. Does `detectDialect` no longer route a Haas/Hurco file with a stray date-shaped comment onto the Mitsubishi date-collapse mask?
4. Do the 4 new adversarial regression-lock tests actually exercise the divergent paths (would they FAIL under the old unanchored regexes)?
5. CRITICAL: does the fix preserve the TRUE-positive behavior — a real Mastercam header `(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40)` + `(NC FILE - C:\path)` still correctly masks to `volatile-header-only` for a header-only re-save? (It must not have over-corrected into masking nothing useful.)

Output a concise verdict ending with exactly `GRADE: PASS` or `GRADE
... [+104 chars truncated]

### Assistant | 2026-06-03T02:37:54.350Z

I'll verify the fix. Let me start by examining the commit and the current state of both files.

### Assistant | 2026-06-03T02:37:55.193Z

[tool_use: Bash]

### User | 2026-06-03T02:40:10.673Z

[tool_result] commit 7a14bf0defa8fb4e612270b8252b6bfe5585ccde
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 2 21:35:57 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-DIALECT-MASK-FAILOPEN-FIX (slot:echo): fix P0 fail-OPEN in nc-dialect-masks (adversarial-review-caught). Volatile masks were unanchored/greedy: DATE=[^)]* / NC FILE - [^)]* had NO '(' require
... [+10640 chars truncated]

### Assistant | 2026-06-03T02:40:15.207Z

Let me read the current full state of both files to trace the regexes carefully.

### Assistant | 2026-06-03T02:40:16.142Z

[tool_use: Read]

### Assistant | 2026-06-03T02:40:16.151Z

[tool_use: Read]

### User | 2026-06-03T02:40:38.247Z

[tool_result] 1	// nc-dialect-masks.mjs — per-dialect volatile-comment masks + golden round-trip classifier.
2	//
3	// The arm of CIMCO post-proof that is provable OFFLINE today: given a golden NC program and a
4	// candidate (re-emitted, or a re-saved sibling), classify the difference as
5	//   - byte-identical        : equal even raw
6	//   - volatile-header-only  : equal AFTER masking volatile header comment
... [+7662 chars truncated]

### User | 2026-06-03T02:40:38.584Z

[tool_result] 1	// nc-dialect-masks.test.mjs — real-behavior tests for per-dialect volatile masks + round-trip classifier.
2	// Run: node --test scripts/lib/nc-dialect-masks.test.mjs
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import { DIALECT_MASKS, maskFor, detectDialect, roundTrip, normalizeNC } from "./nc-dialect-masks.mjs";
6	
7	// ─── detectDialect (real header fixture
... [+7380 chars truncated]

### Assistant | 2026-06-03T02:40:43.131Z

Now I need to understand how `normalizeNC` / `compareNC` apply the masks, since the masks are regex strings applied per-line. The critical question is the value class behavior. Let me read `nc-normalize.mjs`.

### Assistant | 2026-06-03T02:40:43.466Z

[tool_use: Read]

### User | 2026-06-03T02:40:57.143Z

[tool_result] 1	// nc-normalize.mjs — strict NC/G-code normalizer + byte-equivalence comparator.
2	//
3	// The shared CORE of the Haas golden round-trip / byte-equivalence harness (echo's
4	// refuse-clause: "shipping-post-without-byte-equivalence-vs-golden") AND the CIMCO
5	// File-Compare consumer of SPINE-1 (`prism_cimco`). CIMCO File Compare is too lenient
6	// (it silently ignores block renumber + spacing)
... [+7374 chars truncated]

### Assistant | 2026-06-03T02:41:00.714Z

Now I understand the full mechanism. The masks are regex applied per-line with `.replace()`, no comment gate. Let me trace each adversarial input through the NEW regexes carefully, then run the tests to confirm. Let me write the analysis but first empirically verify by running the test suite and a few hand-crafted probes.

### Assistant | 2026-06-03T02:41:01.736Z

[tool_use: Bash]

### User | 2026-06-03T02:43:04.828Z

[tool_result]   ...
# Subtest: roundTrip: identical programs → byte-identical
ok 11 - roundTrip: identical programs → byte-identical
  ---
  duration_ms: 0.2135
  ...
# Subtest: roundTrip: auto-detects dialect from the golden header when not supplied
ok 12 - roundTrip: auto-detects dialect from the golden header when not supplied
  ---
  duration_ms: 0.157
  ...
# Subtest: roundTrip: Mitsubishi EDM bare paren-d
... [+467 chars truncated]

### Assistant | 2026-06-03T02:43:10.577Z

14/14 pass. Now let me do the critical adversarial work: try to CONSTRUCT a remaining fail-open. The key worry is the value classes. Let me write probes that attack each regex's value class boundaries — particularly the `mastercamFile` `[^)=\n]*` class (which allows backslashes, spaces, digits) and the `mastercamDate` `[\w:\- ]*` class.

### Assistant | 2026-06-03T02:43:29.249Z

[tool_use: Bash]

### User | 2026-06-03T02:44:32.016Z

[tool_result] Exit code 1
file:///C:/Users/wompu/AppData/Local/Temp/probe-failopen.mjs:27
  "%\nO1\n(NC FILE - C:\A\x.NC OP3)\nG0 X1\nM30\n%",
                         ^^^^

SyntaxError: Invalid hexadecimal escape sequence
    at compileSourceTextModule (node:internal/modules/esm/utils:338:16)
    at ModuleLoader.moduleStrategy (node:internal/modules/esm/translators:102:18)
    at #translate (node:intern
... [+205 chars truncated]

### Assistant | 2026-06-03T02:44:35.958Z

The backslashes in the file paths are being interpreted as JS escapes. Let me fix the escaping by reading from raw strings properly — I'll use a different approach with escaped backslashes in the source.

### Assistant | 2026-06-03T02:44:53.229Z

[tool_use: Write]

### User | 2026-06-03T02:45:11.347Z

[tool_result] File created successfully at: H:/prism/scripts/lib/_probe_failopen_tmp.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-03T02:45:14.309Z

[tool_use: Bash]

### User | 2026-06-03T02:45:51.952Z

[tool_result] !!! FAIL-OPEN [volatile-header-only] word-token after DATE value (no '=', \w-classed)
!!! FAIL-OPEN [volatile-header-only] word-token after TIME value (no '=')
!!! FAIL-OPEN [volatile-header-only] NC FILE paren + appended OP-token without '='
!!! FAIL-OPEN [volatile-header-only] source paren + appended token without '='
ok safe      [semantic-drift] bare paren-less DATE= macro var
ok safe      [se
... [+395 chars truncated]

### Assistant | 2026-06-03T02:46:00.134Z

I found 4 remaining fail-opens. The fix only hardened against the `=`-token case (which is what the 4 new tests exercise) but the value classes still allow **space-separated word tokens without `=`** to be swallowed. Let me confirm the leak is genuinely semantic by checking what these tokens represent — they are sibling tokens inside the volatile paren that genuinely differ between the two programs, and the mask collapses them so the programs read as identical.

Let me verify the exact masking behavior to be 100% certain this is a real divergence-hiding leak, not a false alarm.

### Assistant | 2026-06-03T02:46:06.398Z

[tool_use: Write]

### User | 2026-06-03T02:46:20.488Z

[tool_result] File created successfully at: H:/prism/scripts/lib/_probe_trace_tmp.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-03T02:46:23.636Z

[tool_use: Bash]

### User | 2026-06-03T02:47:12.168Z

[tool_result] DATE paren w/ STG1 (mastercam)
   IN : "(DATE=16-11-21 STG1)"
   OUT: "(DATE)"

DATE paren w/ STG9 (mastercam)
   IN : "(DATE=16-11-21 STG9)"
   OUT: "(DATE)"

DATE+TIME paren w/ Z5 (mastercam)
   IN : "(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40 Z5)"
   OUT: "(DATE)"

DATE+TIME paren w/ Z9 (mastercam)
   IN : "(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40 Z9)"
   OUT: "(DATE)"

NC FILE paren w/ O
... [+334 chars truncated]

### Assistant | 2026-06-03T02:47:23.215Z

Confirmed and unambiguous. The mask collapses `(DATE=16-11-21 STG1)` and `(DATE=16-11-21 STG9)` both to `(DATE)` — a genuinely different sibling token (`STG1` vs `STG9`) is silently erased, so two different programs read as identical → `volatile-header-only` (SAFE). This is exactly the same class of fail-OPEN the review flagged (greedy tail eating a sibling token in a shared paren), just with a **space-separated, `=`-free token** instead of an `=`-bearing one.

The root cause: the fix only excluded `=` from the value classes. But the value classes are still permissive of whitespace + word characters:
- `mastercamDate`: `[\w:\- ]*` — includes space and `\w`, so it eats ` STG1`.
- `mastercamFile`/`prismSource`: `[^)=\n]*` — excludes only `=`, `)`, newline; still allows spaces + word chars, so it eats ` OP3` / ` REV3`.

The 4 new tests all happen to use `=`-bearing tokens (`SETUP=A`, `TOOL=T1`, `#100=DATE=`), which is the one sub-case the `=` exclusion catches. They do not exercise the space-separated `=`-free sibling token, which is just as semantically real (an operation suffix, a setup ID, a stage marker — all common in real header comments).

Let me verify items 2-5 of the review checklist are otherwise correct, then clean up.

### Assistant | 2026-06-03T02:47:24.374Z

[tool_use: Bash]

### User | 2026-06-03T02:47:39.761Z

[tool_result] # skipped 0
# todo 0
# duration_ms 19.9178
cleaned

### Assistant | 2026-06-03T02:47:45.023Z

Let me confirm whether the old (pre-fix) regexes would actually fail the 4 new tests — to validate item 4 — and double-check the true-positive (item 5) by re-confirming the legit Mastercam header masks correctly. I already saw test #1 (`roundTrip: header-only churn`) passes, and the post-proof test uses real `(DATE=DD-MM-YY...TIME=HH:MM...)` headers. Let me verify the 4 new tests would fail under the OLD regexes.

### Assistant | 2026-06-03T02:47:56.061Z

[tool_use: Write]

### User | 2026-06-03T02:48:04.739Z

[tool_result] File created successfully at: H:/prism/scripts/lib/_probe_oldregex_tmp.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-03T02:48:08.002Z

[tool_use: Bash]

### User | 2026-06-03T02:48:51.667Z

[tool_result] T1 SETUP= sibling (old): volatile-header-only (test expects semantic-drift; FAIL means old=volatile → test would catch it)
T2 bare #100=DATE= (old): volatile-header-only (test expects semantic-drift)
T3 NC FILE + TOOL= (old): volatile-header-only (test expects semantic-drift)

### Assistant | 2026-06-03T02:48:57.151Z

Confirmed. Under the OLD regexes, all 3 `=`-bearing adversarial cases classify as `volatile-header-only`, but the new tests assert `semantic-drift` — so the 4 new tests DO genuinely exercise divergent paths and would have FAILED against the old code (item 4 = good, the tests are real regression locks, not stubs). The Mitsubishi-scoping test (#4) similarly exercises a real divergence.

I have everything I need. Let me confirm the temp file is gone and finalize.

### Assistant | 2026-06-03T02:48:57.905Z

[tool_use: Bash]

### User | 2026-06-03T02:49:10.861Z

[tool_result]  M scripts/lib/chat-token-watch.mjs
 M scripts/lib/claude-account-lib.mjs
 M scripts/lib/graph-node-embedding-bridge.mjs
 M scripts/lib/graph-node-embedding-bridge.test.mjs
 M scripts/lib/graphsage-predictor.mjs
 M scripts/lib/graphsage-train-pipeline.test.mjs
 M scripts/lib/hybrid-retrieval.mjs
 M scripts/lib/hybrid-retrieval.test.mjs
 M scripts/lib/memory-namespace-classifier.mjs
 M scripts/lib/
... [+17 chars truncated]

### Assistant | 2026-06-03T02:49:34.342Z

My temp probe files (`_probe_*_tmp.mjs`) are gone (not listed) — clean. The listed modifications are pre-existing working-tree changes unrelated to my probes.

## Verdict

The fix commit `7a14bf0def` **partially** closes the fail-OPEN but leaves a **remaining fail-OPEN of the exact same class the review flagged** (greedy tail swallowing a genuinely-different sibling token in a shared paren).

**Checklist results:**

1. **Paren-anchored + fail-closed on appended token — PARTIAL.** All five patterns are now paren-anchored (`\(...\)`), which correctly closes the two paren-less leaks (`#100=DATE=5`, bare `NC FILE -`). But "fail closed when a non-volatile `=token` is appended" only holds for tokens that **contain `=`**. The value classes still permit whitespace + word characters:
   - `mastercamDate`: `[\w:\- ]*` eats a space-separated trailing word token.
   - `mastercamFile` / `prismSource`: `[^)=\n]*` excludes only `=`, so a space-separated `=`-free token is swallowed.

   **Constructed remaining fail-OPENs (traced + empirically confirmed):**
   - `(DATE=16-11-21 STG1)` vs `(DATE=16-11-21 STG9)` → both mask to `(DATE)` → `volatile-header-only` (SAFE). `STG1`≠`STG9` is erased.
   - `(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40 Z5)` vs `... Z9)` → both → `(DATE)`.
   - `(NC FILE - C:\A\x.NC OP3)` vs `(... OP7)` → both → `(FILE)`. `OP3`≠`OP7` (an operation suffix) erased.
   - `(  source: H:\A\x.nc REV3)` vs `(... REV7)` → both → `(source)`. `REV3`≠`REV7` erased.

   These are real, common header shapes (operation/setup/revision suffixes are routinely space-separated, not `=`-delimited). The fix patched only the `=`-token sub-case.

2. **`maskFor('unknown')` → `[]`, `allMask` removed — PASS.** `maskFor` returns `[]` for any unrecognized key; `allMask()` is deleted and its import removed. Fail-closed for unknown dialect is correct.

3. **`detectDialect` Mitsubishi misroute closed — PASS.** Now requires a strong signal (`M9x (Adaptive Control` OR `L###` label + `H#=` bank)
... [+1899 chars truncated]
