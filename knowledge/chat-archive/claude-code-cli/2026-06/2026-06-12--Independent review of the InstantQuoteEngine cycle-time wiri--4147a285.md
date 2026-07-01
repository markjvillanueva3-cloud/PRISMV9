---
type: "chat-session"
source: "claude-code-cli"
session_id: "4147a285-7a5a-42b1-a446-db6c05dfba3e"
title: "Independent review of the InstantQuoteEngine cycle-time wiring change for unit U"
date: "2026-06-12"
first_ts: "2026-06-12T18:18:57.503Z"
last_ts: "2026-06-12T18:21:04.254Z"
cwd: "H:\\prism-slot-charlie"
messages: 35
user_msgs: 13
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism-slot-charlie/4147a285-7a5a-42b1-a446-db6c05dfba3e/subagents/agent-a224bb31bacedf002.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:40"
---

# Independent review of the InstantQuoteEngine cycle-time wiring change for unit U

> **claude-code-cli** | 2026-06-12 | 35 msgs (13 user / 22 assistant) | cwd: H:\prism-slot-charlie
> Raw: `H:/.claude/projects/H--prism-slot-charlie/4147a285-7a5a-42b1-a446-db6c05dfba3e/subagents/agent-a224bb31bacedf002.jsonl`

## Transcript

### User | 2026-06-12T18:18:57.503Z

Independent review of the InstantQuoteEngine cycle-time wiring change for unit U-QP-GCODE-TIME-WIRE (slot charlie). Read `H:\prism\mcp-server\src\engines\InstantQuoteEngine.ts` Step 3 (the cycle-time computation, search for "Step 3a" / "gcode_precise") and the test `H:\prism\mcp-server\src\__tests__\GCodeTimeWire.test.ts`.

CONTEXT: Previously cycle_time priority was SpeedFeed-MRR -> parametric. The change adds a G-code-precise path as the HIGHEST priority: when `input.gcode_program` is present, cycle_time comes from cycleTimeEstimatorEngine.estimateFromGCode (deterministic, from real toolpaths). The SpeedFeed block was wrapped in `if (cycleTimeMin <= 0)` so it only runs when no G-code time was produced.

VERIFY (weight toward regression + integration + silent failure):
1. REGRESSION — the most important: when NO gcode_program is supplied, is the behavior IDENTICAL to before? The SpeedFeed MRR block + parametric fallback must run exactly as they did. Confirm the `if (cycleTimeMin <= 0)` guard correctly preserves the old path (the SpeedFeed try/catch body is unchanged, just indented one level).
2. PRIORITY CORRECTNESS — gcode > MRR > parametric. If gcode produces a valid time (>0, finite), MRR/parametric are skipped. If gcode FAILS (throws / returns 0 / non-finite), it must fall through to MRR (the catch + the >0/isFinite guards). Trace a gcode that throws -> does it cleanly fall back, or leave cycleTimeMin in a bad state?
3. SILENT FAILURE — `cycle_time_source` is set to "gcode_precise" only when the engine returns a valid time. A failed/empty gcode must NOT report gcode_precise (the test asserts this). Confirm.
4. The cycleTimeMin (minutes) = total_seconds/60 conversion is correct (engine returns seconds).
5. Does cycleTimeMin flow correctly into the QuoteEstimator operations[].cycle_time_min downstream (Step 4)? Any unit confusion (sec vs min)?
6. TEST QUALITY: the E2E test asserts gcode_precise is selected AND cycle_time_min matches the engine value AND differs f
... [+361 chars truncated]

### Assistant | 2026-06-12T18:19:01.404Z

I'll review the InstantQuoteEngine cycle-time wiring change. Let me read both files end-to-end.

### Assistant | 2026-06-12T18:19:01.878Z

[tool_use: Read]

### Assistant | 2026-06-12T18:19:02.133Z

[tool_use: Read]

### User | 2026-06-12T18:19:03.063Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\GCodeTimeWire.test.ts' was already read 10s ago in this session and is unchanged (mtime 1781288262844). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-06-12T18:19:03.653Z

[tool_result] 1	/**
2	 * InstantQuoteEngine — Xometry-killer instant pricing pipeline
3	 *
4	 * Orchestrates: feature extraction → DFM analysis → SpeedFeedOrchestrator cycle time →
5	 * QuoteEstimator cost aggregation → Wright's law qty breaks → lead time multipliers →
6	 * PartSimilarity sanity check.
7	 *
8	 * Output includes CI95 confidence bounds, quantity breaks (1–100), lead time options
9	 * (standard/ex
... [+44777 chars truncated]

### Assistant | 2026-06-12T18:19:06.879Z

The engine file is read. The test file read was guarded as already-read, but I don't actually see its content in my context. Let me read it with the cache bypass since I need to verify the test.

### Assistant | 2026-06-12T18:19:07.996Z

[tool_use: Bash]

### User | 2026-06-12T18:19:10.969Z

[tool_result] /**
 * U-QP-GCODE-TIME-WIRE (charlie 2026-06-12) -- wire the precise S-curve
 * CycleTimeEstimatorEngine into the quote path. Two seams:
 *   1. prism_quoting:gcode_cycle_time dispatcher action (precise engine exposed).
 *   2. InstantQuoteEngine: when input.gcode_program is present, cycle_time comes
 *      from the real G-code (deterministic) instead of the MRR/parametric estimate.
 *
 * Verifie
... [+5808 chars truncated]

### Assistant | 2026-06-12T18:19:14.301Z

I have both files. Let me verify the key dependencies the change relies on: the `CycleTimeEstimatorEngine.estimateFromGCode` return contract (does it return `total_seconds`?), the `QuoteEstimator` operations handling, and the dispatcher action wiring referenced by the test.

### Assistant | 2026-06-12T18:19:15.762Z

[tool_use: Grep]

### Assistant | 2026-06-12T18:19:17.174Z

[tool_use: Grep]

### User | 2026-06-12T18:19:18.179Z

[tool_result] 45:  tool_change_time: number;
59:  machine_profile?: string;
74:  cutting_time_sec: number;
75:  rapid_time_sec: number;
84:  total_seconds: number;
86:  cutting_time: number;
87:  rapid_time: number;
88:  tool_change_time: number;
99:  machine_profile: string;
107:  total_seconds: number;
109:  cutting_time: number;
110:  rapid_time: number;
138:  total_seconds: number;
181:      tool_change_tim
... [+3002 chars truncated]

### User | 2026-06-12T18:19:18.982Z

[tool_result] 264:          case "gcode_cycle_time": {
267:            result = cycleTimeEstimatorEngine.estimateFromGCode(d.gcode, { controller: d.controller ?? "fanuc", machine_profile: d.machine_profile });
603:            result = await speedFeedToQuoteBridgeEngine.enrich(p.operations);

### Assistant | 2026-06-12T18:19:22.750Z

The `estimateFromGCode` return contract is confirmed: `total_seconds` (line 84, rounded line 1193), `cutting_time`, `rapid_time`, `tool_change_time` all numeric, `machine_profile` string. The dispatcher action `gcode_cycle_time` is wired (line 264-267). Now let me verify the QuoteEstimator consumes `operations[].cycle_time_min` correctly (the downstream flow, Step 5 of the review), and check the enum registration.

### Assistant | 2026-06-12T18:19:24.630Z

[tool_use: Grep]

### Assistant | 2026-06-12T18:19:25.562Z

[tool_use: Grep]

### User | 2026-06-12T18:19:26.020Z

[tool_result] 66:  operations?: Array<{
69:    cycle_time_min?: number;    // CAM-derived or estimated
83:  // Secondary operations
121:      cycle_time_min: number;
150:      operations: Array<{ type: string; per_part: number; total: number; lead_time_days: number }>;
595:    // Priority 1: CAM-derived cycle times from operations
596:    const ops = input.operations ?? [];
597:    const camTimes = ops.filter(o
... [+428 chars truncated]

### User | 2026-06-12T18:19:26.931Z

[tool_result] 35:  "gcode_cycle_time",                // U-QP-GCODE-TIME-WIRE -- precise S-curve cycle time (CycleTimeEstimatorEngine: canned cycles + per-machine kinematics)
673:  gcode_cycle_time: gcodeCycleTimeSchema,

### Assistant | 2026-06-12T18:19:38.564Z

I now have everything needed to verify all 7 points. The downstream contract is confirmed: QuoteEstimator Priority 1 (line 595-599) reads `operations[].cycle_time_min`, sums them when non-null. Since InstantQuoteEngine passes exactly one operation with `cycle_time_min: cycleTimeMin` (minutes), the unit is consistent. Let me do final verification on two things: the ASCII-only convention on the new code, and confirm the SpeedFeed block was truly only indented (no logic change).

### Assistant | 2026-06-12T18:19:46.410Z

[tool_use: Bash]

### User | 2026-06-12T18:19:49.256Z

[tool_result] === non-ASCII bytes in Step 3 region (lines 328-390) of InstantQuoteEngine.ts ===
CLEAN: no non-ASCII in lines 328-390

=== non-ASCII in new gcode input-type block (lines 84-91) ===
1:  // ── G-code program (U-QP-GCODE-TIME-WIRE): when a real NC program is
4:  // estimate. controller/profile select the machine kinematics. ──
(matches above contain non-ASCII)

=== non-ASCII in test file ===
CLEAN: 
... [+87 chars truncated]

### Assistant | 2026-06-12T18:19:52.827Z

Found a non-ASCII issue. Lines 84 and 87 in the new gcode input-type block contain `──` (U+2500 box-drawing characters). The review prompt explicitly flags that the file has an ascii-guard that blocks non-ASCII. Let me check whether this is genuinely new code from this change or pre-existing convention, and confirm the exact characters.

### Assistant | 2026-06-12T18:19:56.924Z

[tool_use: Bash]

### User | 2026-06-12T18:19:59.321Z

[tool_result] === Show the non-ASCII chars on lines 84-91 with hex ===
84:   // ── G-code program (U-QP-GCODE-TIME-WIRE): when a real NC program is
87:   // estimate. controller/profile select the machine kinematics. ──

=== count of these box-drawing/em-dash chars across WHOLE file (pre-existing convention check) ===
33

=== sample of OTHER pre-existing lines using the same chars (Step markers) ===
84:  // ── 
... [+584 chars truncated]

### Assistant | 2026-06-12T18:20:05.403Z

This is the key finding to assess carefully. The new code at lines 84/87 uses `──` (U+2500 box-drawing) — but this is the *pre-existing convention throughout the entire file* (33 occurrences: Step 1, Step 2, Step 4, Step 5, etc. all use the exact same `// ── ... ──` comment delimiter). The new gcode block at lines 84-87 matches the surrounding style exactly (R11 — match conventions). 

The crucial question for a P0/P1: would the `ascii-guard.mjs` hook actually *block* this? If the entire file already commits 33 of these characters and the file is in the repo, the guard either doesn't apply to `.ts` comments or is advisory. Let me confirm the guard's actual behavior on this file rather than assume.

### Assistant | 2026-06-12T18:20:08.771Z

[tool_use: Bash]

### User | 2026-06-12T18:20:10.932Z

[tool_result] === ascii-guard.mjs: what does it block? (head) ===
4: * ascii-guard.mjs - PreToolUse hook (Edit|Write|MultiEdit). ENFORCED, not advisory.
11: * advisory-only). This hook is the missing root-cause enforcement: a hard BLOCK
16: * WHY a block and not advisory: an advisory the fleet already ignores is the
18: * source - it is always an auto-substitution mistake, so a deterministic block
22: *   - Onl
... [+1523 chars truncated]

### Assistant | 2026-06-12T18:20:17.657Z

This resolves the ASCII finding definitively. The `ascii-guard.mjs` blocks ONLY the "smart-substitution set" (smart quotes, em-dashes auto-substituted by editors), NOT all non-ASCII. Critically:
- Line 154: `if (!smart && !allNonAscii) continue;` — non-smart unicode is allowed by default.
- Line 147: `if (oldLines && oldLines.has(lineText)) continue;` — unchanged/re-included lines are skipped (only *newly introduced* offenders count).

The `──` (U+2500 box-drawing) is **not** in the smart-substitution set (smart chars are em-dash U+2014, smart quotes, etc. — box-drawing U+2500 is a deliberate decorative char, the established file convention with 33 occurrences). The em-dash `—` does appear elsewhere but the guard only flags *newly introduced* smart chars on changed lines. The new comment block uses U+2500 matching the file's pervasive Step-marker style, so it would pass the guard.

Let me do one final confirmation that U+2500 is not in the smart set and that the em-dash usage in the new code (if any) is on pre-existing-style lines.

### Assistant | 2026-06-12T18:20:23.236Z

[tool_use: Bash]

### User | 2026-06-12T18:20:26.056Z

[tool_result] === smart-substitution set in ascii-guard (the ONLY blocked chars) ===
22: *   - Only the SMART-SUBSTITUTION set (below) is blocked - NOT all non-ASCII, so
48:const SMART = new Map([
49:  [0x2014, { name: "em dash", ascii: "--" }],
50:  [0x2013, { name: "en dash", ascii: "-" }],
51:  [0x2012, { name: "figure dash", ascii: "-" }],
52:  [0x2015, { name: "horizontal bar", ascii: "--" }],
53:  [0x2018
... [+600 chars truncated]

### Assistant | 2026-06-12T18:20:30.306Z

Fully confirmed. The SMART set (the only blocked chars) is em/en/figure dash, horizontal bar, smart quotes, ellipsis — `0x2014, 0x2013, 0x2012, 0x2015, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026`. U+2500 (the `──` box-drawing used in the new block and 33 other places in the file) is NOT in the set. The new gcode comment block uses only U+2500, no em-dash. The ascii-guard would NOT block it. The ASCII convention concern is fully resolved — no finding.

I now have complete verification of all 7 review axes. Let me update the task tracker and deliver the verdict.

### Assistant | 2026-06-12T18:20:30.760Z

[tool_use: TaskUpdate]

### User | 2026-06-12T18:20:31.371Z

[tool_result] Updated task #3 

### Assistant | 2026-06-12T18:21:04.254Z

## Independent Review — U-QP-GCODE-TIME-WIRE (InstantQuoteEngine cycle-time wiring)

**GRADE: PASS**

Reviewed `InstantQuoteEngine.ts` Step 3 (lines 328-390), `GCodeTimeWire.test.ts`, and verified the contracts of all dependencies (`CycleTimeEstimatorEngine.estimateFromGCode`, `QuoteEstimatorEngine`, `quotingDispatcher`, `quotingActionSchemas`, `ascii-guard.mjs`).

### 1. REGRESSION (highest weight) — PASS
When no `gcode_program` is supplied, behavior is **identical** to before. `cycleTimeMin` starts at 0 (line 330); the Step 3a gcode block is gated on `input.gcode_program && input.gcode_program.trim().length > 0` (line 336), so it's a complete no-op when absent. The SpeedFeed MRR block now runs under `if (cycleTimeMin <= 0)` (line 354) — which is `0 <= 0 → true` in the no-gcode case, so it executes exactly as before. The try/catch body (lines 355-383) is **unchanged, only indented one level** — same `compute()` call, same `mrr_cm3min > 0` guard, same roughing+finishing math, same `physics_calculated` source. Parametric fallback (lines 387-390) unchanged. The "WITHOUT gcode" and "G-code changes cycle time vs estimate" tests lock this regression in.

### 2. PRIORITY CORRECTNESS (gcode > MRR > parametric) — PASS
- Valid gcode (`Number.isFinite && total_seconds > 0`, line 342) sets `cycleTimeMin > 0` → both downstream `if (cycleTimeMin <= 0)` guards are false → MRR and parametric correctly skipped.
- **gcode throws** → caught at line 347, logged, `cycleTimeMin` stays 0 (never partially assigned — assignment at 343 is after the guard passes, atomic) → falls cleanly through to MRR. No bad state.
- **gcode returns 0 / non-finite** → the `if (gc && Number.isFinite(...) && > 0)` guard at 342 is false → `cycleTimeMin` stays 0 → falls through to MRR. Correct.

### 3. SILENT FAILURE — PASS
`cycleTimeSource` is set to `"gcode_precise"` (line 344) **only inside** the success guard, after `cycleTimeMin` is assigned. A failed/empty/zero gcode never sets it. The "empty gcode_progra
... [+3615 chars truncated]
