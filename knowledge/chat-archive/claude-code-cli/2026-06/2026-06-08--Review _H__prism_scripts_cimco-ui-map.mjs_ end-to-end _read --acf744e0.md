---
type: "chat-session"
source: "claude-code-cli"
session_id: "acf744e0-dffd-4f18-a0c0-bff8081088a4"
title: "Review `H:/prism/scripts/cimco-ui-map.mjs` end-to-end (read the WHOLE file) + it"
date: "2026-06-08"
first_ts: "2026-06-08T18:06:32.352Z"
last_ts: "2026-06-08T18:09:15.318Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 10
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/acf744e0-dffd-4f18-a0c0-bff8081088a4/subagents/agent-a9f2b65876c143e25.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Review `H:/prism/scripts/cimco-ui-map.mjs` end-to-end (read the WHOLE file) + it

> **claude-code-cli** | 2026-06-08 | 24 msgs (10 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/acf744e0-dffd-4f18-a0c0-bff8081088a4/subagents/agent-a9f2b65876c143e25.jsonl`

## Transcript

### User | 2026-06-08T18:06:32.352Z

Review `H:/prism/scripts/cimco-ui-map.mjs` end-to-end (read the WHOLE file) + its seed `H:/prism/state/shared/cimco/cimco-ui-map.json`. It's a Node ESM navigation FSM (U-CIMCO-SIM-3) that models the CIMCO Edit 2026 ribbon as a graph and drives it via the C# helper `PrismCimcoUI.exe`, with per-step verification, for CNC post-processor sim verification. SAFETY-CRITICAL (gates whether a program is cleared for live metal).

Verified-real contracts (confirm the code matches):
1. `PrismCimcoUI.exe --op map` emits `{ok, op, frame, controls:[{name, role, da, cid, path}], count, walked}`. `--op invoke --name <X> --allow-actions` emits `{ok, invoked, da, path, effectUnverified, blocked?}` or `{ok:false, error}`. Exit 0/1/2/3.
2. Clone precedent `scripts/winmax-ui-map.mjs` (same pure-core/live-helper split, BFS shortestPath, tail-JSON driver, argv guard). cimco's signature adapts to MSAA NAMED controls (presence of distinctive control names) instead of winmax's Edit AutomationIds.
3. The screen "signature" = set of distinctive named controls present in a `--op map` read; "discriminator" = the subset that identifies a screen; a screen matches when all its discriminator names are present (subset containment).

GRADE EACH, report P0/P1/P2 with file:line:
- CORRECTNESS: does signatureOf/screenMatches/matchScreen/shortestPath/navigateLive logic match the contracts? Does signatureOf read the right keys (controls[].name, count)? Is the realization floor (REALIZATION_FLOOR=50) judged on the RAW count or the chrome-filtered set, and is that correct? Does matchScreen's specificity tiebreak (largest discriminator wins) actually disambiguate correctly, or can it pick wrong?
- SAFETY (the crux — CNC tool): can navigateLive EVER return ok:true from an unrealized/drifted/blocked landing? Is the per-step-verify loop airtight (invoke → re-probe → confirm now.match===hop.to → else STOP)? Is the unrealized-halt correct (whereami unrealized → needsRealization, no invoke fired)? Is `--allow-action
... [+778 chars truncated]

### Assistant | 2026-06-08T18:06:41.600Z

I'll review the CIMCO UI map FSM thoroughly. Let me start by reading both files completely, plus the precedent it clones for comparison.

### Assistant | 2026-06-08T18:06:42.053Z

[tool_use: Read]

### Assistant | 2026-06-08T18:06:42.760Z

[tool_use: Read]

### Assistant | 2026-06-08T18:06:43.214Z

[tool_use: Read]

### User | 2026-06-08T18:06:44.899Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * cimco-ui-map.mjs — CIMCO Edit 2026 ribbon as a navigable finite state machine. slot:echo.
4	 * U-CIMCO-SIM-3 (CIMCO-INTEGRATION-MS0).
5	 *
6	 * WHY: driving the CIMCO Machine-Simulation ribbon by "invoke -> hope -> invoke" is the exact
7	 * brittleness spec §A2 caught live ("tab-invoke intermittently fails when the ribbon isn't built
8	 * yet"). This turns the ribb
... [+19855 chars truncated]

### User | 2026-06-08T18:06:45.446Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "controller": "cimco-edit-2026",
4	  "generatedBy": "U-CIMCO-SIM-3 (cimco-ui-map.mjs seed)",
5	  "note": "CIMCO Edit 2026 Machine-Simulation navigation FSM. Screens are fingerprinted by the set of distinctive NAMED ribbon controls present in a `PrismCimcoUI.exe --op map` read (MSAA accName; the exe walks only controls present in the current ribbon state). Tran
... [+3824 chars truncated]

### User | 2026-06-08T18:06:45.490Z

[tool_result] read-once-guard: 'H:\prism\scripts\winmax-ui-map.mjs' was already read 13m ago in this session and is unchanged (mtime 1780362415659). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-08T18:06:58.539Z

I have both target files fully read, plus the winmax precedent is in my context from earlier this session. Let me verify three things the review hinges on: (1) the winmax precedent's `matchScreen`/`driver` shape to confirm the clone fidelity claim, (2) the actual `PrismCimcoUI.exe` C# contract to confirm the verified-real claims, and (3) the test file to see what's actually exercised.

### Assistant | 2026-06-08T18:06:58.603Z

[tool_use: Grep]

### Assistant | 2026-06-08T18:06:59.113Z

[tool_use: Glob]

### Assistant | 2026-06-08T18:06:59.846Z

[tool_use: Glob]

### User | 2026-06-08T18:07:00.898Z

[tool_result] 18- * labels (vision, recorded once in the map). This is NOT a duplicate of hurco-winmax-knowledge (a
19- * knowledge doc) or route-map/api-route-map (HTTP routes) — it is the WinMax UI navigation FSM.
20- *
21: * Pure core (signatureOf/fingerprint/matchScreen/shortestPath/renderMap) is exported + unit-tested
22: * with fixture probes; only the *Live helpers spawn the PrismWinMaxUI driver.
23- */

... [+4981 chars truncated]

### User | 2026-06-08T18:07:10.612Z

[tool_result] mcp-server\data\posts\prism-base\cimco-bridge\ui-driver\Program.cs

### User | 2026-06-08T18:07:10.659Z

[tool_result] No files found

### Assistant | 2026-06-08T18:07:17.787Z

Two important findings already: there's NO test file for cimco-ui-map (the header claims "exported + unit-tested with fixture probes" — a potential R12/R9 gap), and the C# helper is `Program.cs`, not a `.cs` glob miss. Let me read the C# helper to verify the three contracts, and confirm no test exists anywhere.

### Assistant | 2026-06-08T18:07:17.788Z

[tool_use: Read]

### User | 2026-06-08T18:07:18.801Z

[tool_result] 1	// PrismCimcoUI - drive CIMCO Edit 2026 Machine Simulation via MSAA / IAccessible (oleacc). slot:echo, 2026-06-04.
2	//
3	// WHY MSAA, not UIA: CIMCO's Codejock XTP ribbon ships an MSAA (IAccessible) provider but NO UI-Automation
4	// provider, so System.Windows.Automation sees an empty 15-21 node tree (0 buttons) while oleacc
5	// AccessibleObjectFromWindow on the XTPToolBar exposes ~213 childr
... [+22868 chars truncated]

### Assistant | 2026-06-08T18:07:18.830Z

[tool_use: Grep]

### User | 2026-06-08T18:07:22.523Z

[tool_result] No files found

### Assistant | 2026-06-08T18:07:37.664Z

I now have all the contracts verified against the actual C# source. The task list confirms the critical finding: task #9 "Write cimco-ui-map.test.mjs" is **pending** — the module header claims "exported + unit-tested with fixture probes" but no test file exists. Let me verify one detail on the C# `count` field semantics and the `find` op behavior to nail down the realization-floor correctness, then I have everything.

The C# `MapJson` (line 269) is now confirmed: `"count":n` = the deduplicated, filtered count of emitted controls; `"walked":ctls.Count` = the raw pre-dedup walk count. This is the crux of one finding. Let me cross-check the winmax test to see what "unit-tested" means in the precedent and confirm the floating-promise/unreachable hook flags.

### Assistant | 2026-06-08T18:07:38.669Z

[tool_use: Grep]

### User | 2026-06-08T18:07:40.776Z

[tool_result] 396-  } else {
397-    console.log("usage: winmax-ui-map.mjs whereami|path <from> <to>|navigate <to> [--plan]|record-screen <NAME> [--softkeys 'F1=..,F2=..']|record-transition <from> <key> <to> [label]|render|list");
398:    process.exit(cmd ? 1 : 0);
399-  }
400-}
--
404-const _argv1 = process.argv[1];
405-if ((_argv1 && import.meta.url === `file://${_argv1.replace(/\\/g, "/")}`) || _argv1?.endsW
... [+121 chars truncated]

### Assistant | 2026-06-08T18:09:15.318Z

I now have everything needed to grade this end-to-end. Let me work through the crux analysis carefully — particularly the realization-floor interaction with the C# `count` semantics, the per-step verify loop airtightness, and the driver timeout guard.

Let me trace the most safety-critical path one more time with the exact C# contract in hand:

**The realization-floor question (the crux of CORRECTNESS):**
- C# `MapJson` emits `"count":n` where `n` = deduplicated + chrome-NOT-filtered but **filter-applied** emitted control count (line 264-269). For `--op map`, `filter==null`, so `count` = deduped count of all named controls (dedup key = name+path+role).
- `"walked":ctls.Count` = raw pre-dedup count.
- `signatureOf` (line 79-82) reads `mapResult.count` and falls back to `controlsArr.length`. So it reads the **deduped** count, NOT `walked`. The comment at line 76-78 says the floor is "judged on the RAW walked control count" — but the code reads `count` (deduped/filtered), not `walked`. This is a **documentation-vs-code mismatch**, though both are well above the chrome floor (~15-21) and below 1530, so the 50 floor still functions. I'll flag this as P2 (comment lie, not a safety break) — but let me confirm it's not worse: could `count` ever drop below 50 on a realized ribbon when `walked` is above 50? Yes, theoretically, if dedup collapses many controls — but the realized ribbon walks 1530 and dedup won't collapse a realized XTP ribbon below 50. Real-world safe, comment inaccurate.

Now let me finalize. I have all five grading axes covered with concrete evidence.

## PASS or FAIL

**FAIL** — the module ships with a header claiming "Pure core … is exported **+ unit-tested with fixture probes**" (line 27-28) while **no test file exists** (task #9 is `pending`; glob + grep both find zero `cimco-ui-map*.test.*`). That is an R9/R12 violation on a SAFETY-CRITICAL CNC tool: the docstring asserts verification that was never performed. Two real correctness defects compound it. T
... [+13779 chars truncated]
