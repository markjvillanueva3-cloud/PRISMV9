---
type: "chat-session"
source: "claude-code-cli"
session_id: "0f3a0c22-434c-4b12-9967-54ebbcb52788"
title: "Review this NEW engine end-to-end for correctness and edge-case soundness: `H:/p"
date: "2026-06-01"
first_ts: "2026-06-01T14:35:20.444Z"
last_ts: "2026-06-01T14:42:09.491Z"
cwd: "H:\\prism-slot-foxtrot\\mcp-server"
messages: 28
user_msgs: 10
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-ae86ad54fda55ef33.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:45"
---

# Review this NEW engine end-to-end for correctness and edge-case soundness: `H:/p

> **claude-code-cli** | 2026-06-01 | 28 msgs (10 user / 18 assistant) | cwd: H:\prism-slot-foxtrot\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-ae86ad54fda55ef33.jsonl`

## Transcript

### User | 2026-06-01T14:35:20.444Z

Review this NEW engine end-to-end for correctness and edge-case soundness: `H:/prism-slot-foxtrot/mcp-server/src/engines/MillCorpusTriageEngine.ts` (and its test `H:/prism-slot-foxtrot/mcp-server/src/__tests__/mill-corpus-triage.test.ts`).

CONTEXT: It triages JM CNC program text into three decisions, codifying defect classes a prior assessment found by hand:
1. DOMAIN mill-vs-lathe — heuristic: G43 (tool-length comp) ⇒ mill; (no G43 && G50/G96/NTURN) ⇒ lathe.
2. PROPERNESS proper/fragment/quarantine — 0-byte/binary/sub-200-byte/no-program-end ⇒ not proper.
3. UNITS LANDMINE — header comment declares metric (mm/min) but body has no G20/G21 (or G20 inch) + inch/rev feeds ⇒ the P0 25.4× mislabel class.

It is pure deterministic text analysis (NO physics constants — correct, it must not have any). It explicitly delegates deep dialect/structure validation to GCodeValidationEngine + PostValidationSuiteEngine (must NOT re-implement those).

Scrutinize the REGEX heuristics hard for false positives/negatives:
- Do the G-code word-boundary regexes (`G43`, `G50`, `G17`, `G20/G21`, `M30/M02/M99`, axis-letter extraction, F-word feed parsing) correctly avoid matching coordinate values, line numbers (N-words), or substrings (e.g. G430, X43.0)?
- Is the units-landmine logic sound and free of false-positives that would wrongly REJECT a valid metric program (e.g. a real mm program WITH G21)?
- Is the feed-style heuristic (all F<1 ⇒ ipr) defensible?
- Any way a genuinely proper mill program gets misclassified, or a lathe/landmine slips through?
- Determinism / no side effects / no throw on adversarial input (empty, binary, undefined)?

Report ONLY P0/P1 findings with the specific line/regex and a concrete failing input. Grade PASS or FAIL. Do not nitpick style.

### Assistant | 2026-06-01T14:35:35.072Z

I'll start by reading both files end-to-end.

### Assistant | 2026-06-01T14:35:36.095Z

[tool_use: Read]

### Assistant | 2026-06-01T14:35:36.420Z

[tool_use: Read]

### User | 2026-06-01T14:35:44.008Z

[tool_result] 1	/**
2	 * MillCorpusTriageEngine — U-MILL-CORPUS-TRIAGE (rec #4 from the 2026-06-01
3	 * "enhanced JM mill programs" assessment, workflow wc7dfjak5).
4	 *
5	 * The assessment surfaced three defect classes BY HAND that no engine codifies:
6	 *   1. DOMAIN MISCLASSIFICATION — 2,734/2,888 files in the "mill" corpus are
7	 *      actually Okuma LATHE programs (deterministic tell: 0/2,734 carry G43;
8
... [+11937 chars truncated]

### User | 2026-06-01T14:35:44.476Z

[tool_result] 1	/**
2	 * mill-corpus-triage.test.ts — U-MILL-CORPUS-TRIAGE
3	 *
4	 * Codifies the three triage decisions the 2026-06-01 enhanced-mill-programs
5	 * assessment made by hand: mill-vs-lathe domain, structural properness, and the
6	 * header-vs-body units landmine. Real G-code fixtures (no toBeDefined stubs).
7	 */
8	import { describe, it, expect } from "vitest";
9	import { registerMillDispatcher } 
... [+7472 chars truncated]

### Assistant | 2026-06-01T14:35:50.827Z

Now let me verify a few of the regexes against concrete adversarial inputs by running them directly in Node, to avoid theory-only claims.

### Assistant | 2026-06-01T14:36:01.503Z

[tool_use: Bash]

### User | 2026-06-01T14:36:37.690Z

[tool_result] G43 in G430: false (want false)
G43 normal: true (want true)
G50 in G500: false (want false)
G50 normal: true (want true)
M30 normal: true (want true)
M300 matches end?: false (want false)
M02: true (want true)
M2: true (want true)
M99: true (want true)
M990: false (want false?)

### Assistant | 2026-06-01T14:36:42.988Z

Good — the basic word-boundary regexes hold. Now let me probe the more suspicious cases: the M-end regex with the `M0?` prefix capturing odd forms, the units-landmine false-positive risk on a real metric program WITH G21, and the feed-style heuristic edge cases.

### Assistant | 2026-06-01T14:36:52.068Z

[tool_use: Bash]

### User | 2026-06-01T14:37:02.676Z

[tool_result] M020: false (want false - that is M-code 20 not 2)
M2 in middle of line: true (want true)
M030 (=M30 with leading zero): true (want true, valid)
header declares mm: true
bodyG21: true bodyG20: false => body_mode mm, NO landmine (good)

### Assistant | 2026-06-01T14:37:10.715Z

Core regexes are sound. Now the most important false-positive vector: a **genuinely metric program WITH G21** whose header also says metric is correctly NOT a landmine. But let me check the inverse and the feed-style heuristic that I'm most suspicious of — a real **inch program** that has small finishing feeds (G code uses F values <1 in IPM are rare, but a fine slow feed could be <1 IPM) and whether the landmine logic depends on it.

Let me also check the critical false-NEGATIVE: the landmine class the assessment found is "metric header + no G2x + inch body". The detector requires `feedStyle === "ipr"` for the no-G2x branch. Let me test whether a metric-header/no-G2x program with **IPM-style inch feeds** (e.g. F5.0) — which is still an inch body mislabeled metric — slips through.

### Assistant | 2026-06-01T14:37:25.243Z

[tool_use: Bash]

### User | 2026-06-01T14:37:45.271Z

[tool_result] hdrMM: true bodyG20: false bodyG21: false feeds: [ 10, 5 ] feedStyle: ipm_or_mmpm
=> landmine? false (detector says false -> verdict only review)
comment FINISH feed matches: [ ' F5.0' ] (FINISH has no digit after F so no match; only F5.0)
F.5 parsed: [ 0.5 ]

### Assistant | 2026-06-01T14:37:52.449Z

Now let me check the two remaining high-value vectors: (1) the `has_nturn` regex which looks over-built and may have a catastrophic-backtracking shape, and (2) whether a proper mill program with a metric-sounding word in a comment (e.g. customer name "MILLIMETRIK" or a note) gets a false metric header. Also the axis-letter false positive from N-words and the `body_feed_style` interaction with the landmine on the actual LANDMINE fixture which is a *lathe* (G18, NTURN-ish, F0.005 ipr).

### Assistant | 2026-06-01T14:38:09.484Z

[tool_use: Bash]

### User | 2026-06-01T14:39:08.506Z

[tool_result] NTURN: true TURN: true NAT: false
subsumption: alt1 already matches NTURN: true
hdrMM (false alarm from comment): true bodyG20: true
=> landmine on valid inch mill w/ stray mm comment + G20: true (want false; this is FALSE POSITIVE)
axes from N10 G00 X1.0 Z2.0: XZ (want XZ)

### Assistant | 2026-06-01T14:39:19.166Z

I found a confirmed false-positive class. Let me verify one critical mitigating detail before grading: when header declares mm AND body has G20 (inch), the engine flags landmine — but I want to confirm the `\bMETRIC\b` and `MM/MIN` triggers are the realistic false-positive surface, and check whether the `header_declared` precedence (mm checked before inch) could mask an explicit `(UNITS: INCH)` header that also contains an incidental "MM".

### Assistant | 2026-06-01T14:39:28.614Z

[tool_use: Bash]

### User | 2026-06-01T14:40:35.009Z

[tool_result] Exit code 1
[eval]:15
# rarer hand-edited case. Still a real reject of a valid inch program.
^

SyntaxError: Invalid or unexpected token
    at makeContextifyScript (node:internal/vm:185:14)
    at node:internal/process/execution:107:22
    at [eval]-wrapper:6:24
    at runScript (node:internal/process/execution:101:62)
    at evalScript (node:internal/process/execution:136:3)
    at nod
... [+52 chars truncated]

### Assistant | 2026-06-01T14:40:41.277Z

A stray `#` in my JS comment caused the syntax error, but the first console.log already printed nothing because the parse failed entirely. Let me re-run the header-precedence check cleanly.

### Assistant | 2026-06-01T14:40:45.971Z

[tool_use: Bash]

### User | 2026-06-01T14:40:56.462Z

[tool_result] header has BOTH INCH and MM/MIN => mm (mm wins via else-if order; real INCH masked)
MILL_PROPER header_declared: inch (want inch, no landmine)

### Assistant | 2026-06-01T14:41:03.031Z

I have enough verified evidence. Let me do a final check on one structural concern: the LANDMINE test fixture itself is a lathe program (G18, F0.005 ipr, no G43, no G50/G96 — has G97). Let me confirm what domain it classifies as, because the test only asserts `verdict: reject` (which landmine satisfies regardless), but the `mill_corpus_fit`/domain interaction matters for whether the reason is coherent.

### Assistant | 2026-06-01T14:41:09.684Z

[tool_use: Bash]

### User | 2026-06-01T14:41:19.761Z

[tool_result] g43: false g50: false g96: false nturn: false g17: false axes: XZ
domain => lathe

### Assistant | 2026-06-01T14:42:09.491Z

I have all the evidence I need. The verdict-priority ordering means the LANDMINE fixture rejects on landmine before domain is consulted, so the lathe classification is benign there. My analysis is complete.

## Code Quality Analysis Report — MillCorpusTriageEngine

### Summary
- Files analyzed: 2 (`MillCorpusTriageEngine.ts`, `mill-corpus-triage.test.ts`)
- The G-code word-boundary regexes are sound — I verified `G43`/`G50`/`G17`/`G20`/`G21`/`G7[0-6]` and the `M0?(30|2|99)` end-matcher against substring adversaries (`G430`, `G500`, `M300`, `M020`, `M990`, `M030`) and all classify correctly. Axis extraction correctly excludes `N`-words. Determinism holds (no module-level `/g` regex reused with `.test()`; `matchAll` is fresh each call; no I/O, no throw on empty/binary/undefined).
- The structural framing (pure text, delegates to `GCodeValidationEngine` + `PostValidationSuiteEngine`, no physics constants) is correct and matches the stated contract.
- I found **one P1 false-positive** and **two P1 false-negatives** in the units-landmine and domain heuristics. No P0.

---

### P1 — False POSITIVE: stray "mm" token in a comment rejects a valid INCH program

File: `H:/prism-slot-foxtrot/mcp-server/src/engines/MillCorpusTriageEngine.ts:214` and `:230`

The header scanner sets `headerDeclared = "mm"` on any of `MM/MIN|MM/REV|MILLIMET|\bMETRIC\b|\bG21\b` appearing in the first 20 lines. Combined with the landmine rule at line 230 (`headerDeclared === "mm" && bodyMode === "inch"`), a **valid inch mill program** that merely mentions "mm" in a comment AND has a real `G20` body is hard-**rejected** as a P0 landmine.

Concrete failing input (verified):
```
%
O1001 (POCKET - 0.5 MM/MIN TEST NOTE LEFTOVER)
G20 G17 G90
G43 H01 Z1.
G01 X1. F5.0
M30
%
```
Verified result: `header_declared="mm"`, `body_mode="inch"` → `landmine=true` → `verdict="reject"`. This is a correct, units-consistent inch program (explicit `G20`) being thrown out. JM enhanced-program comments routinely carry `mm/m
... [+5729 chars truncated]
