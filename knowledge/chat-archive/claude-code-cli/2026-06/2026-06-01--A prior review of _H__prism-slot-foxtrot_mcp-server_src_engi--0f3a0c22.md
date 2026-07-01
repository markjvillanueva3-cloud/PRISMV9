---
type: "chat-session"
source: "claude-code-cli"
session_id: "0f3a0c22-434c-4b12-9967-54ebbcb52788"
title: "A prior review of `H:/prism-slot-foxtrot/mcp-server/src/engines/MillCorpusTriage"
date: "2026-06-01"
first_ts: "2026-06-01T14:54:50.057Z"
last_ts: "2026-06-01T14:55:55.081Z"
cwd: "H:\\prism-slot-foxtrot\\mcp-server"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-af3cd363266a8fbec.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:45"
---

# A prior review of `H:/prism-slot-foxtrot/mcp-server/src/engines/MillCorpusTriage

> **claude-code-cli** | 2026-06-01 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism-slot-foxtrot\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-af3cd363266a8fbec.jsonl`

## Transcript

### User | 2026-06-01T14:54:50.057Z

A prior review of `H:/prism-slot-foxtrot/mcp-server/src/engines/MillCorpusTriageEngine.ts` FAILED with three P1 findings in the units-landmine logic. The code was changed. RE-VERIFY each is resolved, and check no NEW correctness/false-positive issue was introduced. Read the updated `MillCorpusTriageEngine.ts` (focus on the `assessUnits` method + the verdict chain in `triageProgram`) and the test `H:/prism-slot-foxtrot/mcp-server/src/__tests__/mill-corpus-triage.test.ts`.

The three prior P1s were:
1. FALSE-POSITIVE: a valid INCH program that merely mentions "mm/min" in a comment but sets explicit G20 was being REJECTED as a landmine.
2. FALSE-NEGATIVE: a metric-header + no-G20/G21 + IPM-feed (F5.0/F10.0) inch MILL body slipped through (the ipr-only feed gate missed it).
3. The "all F<1 ⇒ ipr" feed heuristic drove a reject decision (too fragile).

The intended fix: (a) a header signaling BOTH systems → `header_declared = null` (trust nothing); (b) explicit body G20/G21 is authoritative → contradiction with header is `header_body_mismatch` (verdict=review, NOT reject — controller runs deterministically); (c) LANDMINE now fires only on `header=mm && body has no explicit G20/G21` (independent of feed magnitude — catches both IPM and ipr); feed style is advisory only.

Verify by tracing these inputs against the current code:
- INCH_MM_COMMENT (mm comment + explicit G20 inch body) → expect landmine=false, verdict=accept.
- LANDMINE_MILL_IPM (mm header, no G2x, F5/F10 feeds) → expect landmine=true, verdict=reject.
- HEADER_MISMATCH (mm header, explicit G20 body) → expect header_body_mismatch=true, landmine=false, verdict=review.

Also probe for NEW false-positives the narrowed/broadened logic might create (e.g. a legit metric program WITH G21; an inch program with no G20 and no mm mention). Report any remaining P0/P1 with file:line + a concrete failing input. Grade PASS or FAIL.

### Assistant | 2026-06-01T14:55:09.399Z

I'll re-verify the three P1 findings against the updated code. Let me read both files.

### Assistant | 2026-06-01T14:55:10.708Z

[tool_use: Read]

### Assistant | 2026-06-01T14:55:10.865Z

[tool_use: Read]

### User | 2026-06-01T14:55:12.876Z

[tool_result] 1	/**
2	 * MillCorpusTriageEngine — U-MILL-CORPUS-TRIAGE (rec #4 from the 2026-06-01
3	 * "enhanced JM mill programs" assessment, workflow wc7dfjak5).
4	 *
5	 * The assessment surfaced three defect classes BY HAND that no engine codifies:
6	 *   1. DOMAIN MISCLASSIFICATION — 2,734/2,888 files in the "mill" corpus are
7	 *      actually Okuma LATHE programs (deterministic tell: 0/2,734 carry G43;
8
... [+13590 chars truncated]

### User | 2026-06-01T14:55:14.589Z

[tool_result] 1	/**
2	 * mill-corpus-triage.test.ts — U-MILL-CORPUS-TRIAGE
3	 *
4	 * Codifies the three triage decisions the 2026-06-01 enhanced-mill-programs
5	 * assessment made by hand: mill-vs-lathe domain, structural properness, and the
6	 * header-vs-body units landmine. Real G-code fixtures (no toBeDefined stubs).
7	 */
8	import { describe, it, expect } from "vitest";
9	import { registerMillDispatcher } 
... [+10660 chars truncated]

### Assistant | 2026-06-01T14:55:55.081Z

Now let me trace each input carefully against the current `assessUnits` logic and the verdict chain.

Let me verify the three required traces and probe for new false-positives.

## Trace 1: INCH_MM_COMMENT (P1 #1 — was false-positive reject)

Header window (first 20 lines) contains: `(POCKET - NOTE: ROUGH AT 0.5 MM/MIN EQUIV)`, `G20 G17 G40 G49 G80 G90`, etc.

- `headerMm` = test for `MM\/MIN|...|\bG21\b` → the comment has `MM/MIN` → **true**.
- `headerInch` = test for `\bINCH\b|\bIPR\b|\bIPM\b|IN\/MIN|IMPERIAL|\bG20\b` → header has `G20` → **true**.
- `headerDeclared` = `mm && !inch ? ... : inch && !mm ? ... : null` → both true → **null**. ✓ (test expects null)
- `bodyMode`: `G20` present in body → **inch**. ✓
- Landmine branch: `headerDeclared === "mm"` is false (it's null) → landmine = **false**. ✓
- Mismatch branch: `headerDeclared !== null` is false → headerBodyMismatch = **false**. ✓
- Verdict chain: not quarantine, not landmine, not fragment (has %/O + M30, >200B), not mismatch, domain = mill (has G43), body_mode = inch (not null) → **accept**. ✓

**Resolved.** P1 #1 fixed.

## Trace 2: LANDMINE_MILL_IPM (P1 #2 — was false-negative slip-through)

Header: `O3100 (PRISM_UPGRADED MILL)`, `(feedrate: 178.75 mm/min  depthOfCut: 1.5 mm  RPM: 1375)`, `G17 G40 G49 G80 G90`...

- `headerMm`: `mm/min` matches `MM\/MIN` → **true**.
- `headerInch`: no INCH/IPR/IPM/IN/MIN/IMPERIAL/G20 in header → **false**. (Note: "mm" alone doesn't match IPM since regex is `\bIPM\b`.)
- `headerDeclared` = mm && !inch → **mm**. ✓
- `bodyMode`: no G20, no G21 anywhere → **null**. ✓
- `feedStyle`: feeds F5.0, F10.0 → not all <1 → **ipm_or_mmpm**. ✓
- Landmine branch: `headerDeclared === "mm" && bodyMode === null` → **true**. ✓ (independent of feed magnitude — the key fix)
- Verdict: landmine → **reject**. ✓
- Domain: has G43 → **mill**. ✓

**Resolved.** P1 #2 fixed — landmine now fires on IPM feeds, no longer gated on ipr.

## Trace 3: HEADER_MISMATCH (intended fix verification)

Header win
... [+4290 chars truncated]
