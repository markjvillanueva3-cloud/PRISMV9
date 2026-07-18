---
type: "chat-session"
source: "claude-code-cli"
session_id: "2f55d9ce-0749-4227-94f1-5aa3fc0d94a0"
title: "RE-REVIEW (round 2) of a measurement harness after fixes. Read END-TO-END: FILE:"
date: "2026-06-03"
first_ts: "2026-06-03T20:52:58.981Z"
last_ts: "2026-06-03T20:54:17.419Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/2f55d9ce-0749-4227-94f1-5aa3fc0d94a0/subagents/agent-a2017f2ba17633350.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# RE-REVIEW (round 2) of a measurement harness after fixes. Read END-TO-END: FILE:

> **claude-code-cli** | 2026-06-03 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2f55d9ce-0749-4227-94f1-5aa3fc0d94a0/subagents/agent-a2017f2ba17633350.jsonl`

## Transcript

### User | 2026-06-03T20:52:58.981Z

RE-REVIEW (round 2) of a measurement harness after fixes. Read END-TO-END:

FILE: H:/prism/mcp-server/scripts/mill-print-to-program-roundtrip-accuracy.ts

Round-1 review returned PASS with two low-severity P1 interpretation notes. A sibling independent reviewer returned FAIL citing two measurement-integrity P1s. Four fixes were then applied — verify each is correct and complete, and that no NEW P0/P1 was introduced:

FIX 1 (op-coverage no longer inflates headline): per-program `acc` is now `(rpm.matched + feed.matched) / (rpm.compared + feed.compared)` — op-coverage (opM/opC) is EXCLUDED from acc but still tallied into the op_coverage axis report. Verify op-coverage is truly out of the headline mean and still reported as its own diagnostic.

FIX 2 (decouple): `scoreParam` now `continue`s when the regen median is null (PRISM didn't plan that category) instead of counting it as a miss — so a coverage gap isn't double-penalized across rpm+feed. Verify `compared` only advances when BOTH master and regen medians exist, and that this can't make `axesCompared` negative or NaN.

FIX 3 (critical regens excluded): after `regenParams`, `if (!rp.ok) { nRegenCritical++; continue; }`. Verify success=false regens are skipped from ALL scoring (op-coverage, rpm, feed, bias, fz, perProgram) and counted in corpus.regen_critical + reconciliation.

FIX 4 (corpus coverage): `.hnc` (Hurco WinMax NC) added to NC_EXT — the HURCO dirs are ~100% .hnc and were being silently dropped. Verify the regex is correct and BLOCK_EXT still excludes CAD/CAM source.

Also confirm: nRegenCritical is declared; the headline/axes/limitations text now matches the new behavior; no divide-by-zero when a program yields op-coverage but zero param comparisons (acc should be null and NOT pushed). 

Report ONLY P0/P1 with file:line + fix. End with "VERDICT: PASS" or "VERDICT: FAIL".

### Assistant | 2026-06-03T20:53:07.975Z

I'll review this measurement harness end-to-end, verifying each of the four fixes and checking for new regressions.

### Assistant | 2026-06-03T20:53:09.549Z

[tool_use: Read]

### User | 2026-06-03T20:53:48.869Z

[tool_result] 1	#!/usr/bin/env npx tsx
2	/**
3	 * mill-print-to-program-roundtrip-accuracy.ts — slot:foxtrot (Milling Wizard)
4	 * ===========================================================================
5	 * The MILL analog of whiskey's lathe-print-to-program-roundtrip-accuracy.ts —
6	 * the TRUE print→program→post roundtrip accuracy measurement the work order
7	 * asks for ("read print, write program, post
... [+45378 chars truncated]

### Assistant | 2026-06-03T20:54:17.419Z

Now let me verify each fix against the specific claims. Let me trace the critical scoring paths carefully.

I've read the file end-to-end. Let me verify each of the four fixes and the additional checks.

**FIX 1 — op-coverage excluded from headline:**
- Line 566-568: `axesCompared = rpm.compared + feed.compared`; `axesMatched = rpm.matched + feed.matched`; `acc = axesCompared > 0 ? axesMatched / axesCompared : null`. op-coverage (`opM`/`opC`) is genuinely absent from the headline `acc`. CONFIRMED.
- Op-coverage still tallied: line 534-535 compute `opM`/`opC`, line 558 accumulates into `opMatched`/`opCompared`, line 670 reports `op_coverage_pct` as its own axis. CONFIRMED — out of headline mean, still its own diagnostic.

**FIX 2 — `scoreParam` continues on null regen median:**
- Lines 464-474: iterates `Object.keys(origBy)`; line 468 `if (o == null) continue` (master median missing); line 470 `if (r == null) continue` (regen median missing — the decouple). `compared++` (line 471) only fires after BOTH null-guards pass, so `compared` advances iff both medians exist. CONFIRMED.
- `compared` is a non-negative integer counter only ever `++`'d; `matched ≤ compared`. `axesCompared` = sum of two such counters, cannot go negative or NaN. CONFIRMED.

**FIX 3 — critical regens excluded from ALL scoring:**
- Line 531: `if (!rp.ok) { nRegenCritical++; continue; }` sits immediately after `regenParams` (line 527) and BEFORE op-coverage (534), rpm/feed scoring (537-538), miss tallies (539-546), fz corpus (547), bias (549-556), and the `perProgram.push` (584). The `continue` skips the entire remainder of the loop body. CONFIRMED excluded from every scoring path.
- `nRegenCritical` counted (line 531) and surfaced in `corpus.regen_critical` (line 658) and the reconciliation string (line 660). CONFIRMED.

**FIX 4 — `.hnc` added, BLOCK_EXT integrity:**
- Line 113 `NC_EXT`: `/\.(nc|hnc|min|...)$/i` — `hnc` present, regex well-formed, anchored, case-insensitive. CONFIRMED.
- Line 117 `BL
... [+2402 chars truncated]
