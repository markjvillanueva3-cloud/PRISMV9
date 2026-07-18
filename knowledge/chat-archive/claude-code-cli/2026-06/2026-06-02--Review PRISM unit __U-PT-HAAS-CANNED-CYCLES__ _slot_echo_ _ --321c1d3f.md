---
type: "chat-session"
source: "claude-code-cli"
session_id: "321c1d3f-573b-4b70-b640-f87f9336e18a"
title: "Review PRISM unit **U-PT-HAAS-CANNED-CYCLES** (slot:echo) — adds drilling canned"
date: "2026-06-02"
first_ts: "2026-06-02T02:47:19.198Z"
last_ts: "2026-06-02T02:53:07.132Z"
cwd: "H:\\prism"
messages: 29
user_msgs: 11
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/agent-a8b68bd21d0459382.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review PRISM unit **U-PT-HAAS-CANNED-CYCLES** (slot:echo) — adds drilling canned

> **claude-code-cli** | 2026-06-02 | 29 msgs (11 user / 18 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/agent-a8b68bd21d0459382.jsonl`

## Transcript

### User | 2026-06-02T02:47:19.198Z

Review PRISM unit **U-PT-HAAS-CANNED-CYCLES** (slot:echo) — adds drilling canned-cycle emission to the Haas mill master post. Read these files END-TO-END:

1. `H:/prism/mcp-server/src/engines/HaasNGCMillMasterPostEngine.ts` — CHANGED: new `HaasDrillCycle` interface + optional `cycle?` field on `HaasMillOperation`; new static `CYCLE_GCODE` map + new `emitCannedCycle()` method; the per-op loop now branches `if (op.cycle) emitCannedCycle else emitToolpath`.
2. `H:/prism/mcp-server/src/__tests__/HaasNGCMillMasterPostEngine.test.ts` — +16 tests in a "drilling canned cycles" describe.

GROUND TRUTH (the exact output format): `SAMPLE-PRISM-Base-Hurco-RICH.nc`:
```
(DRILL 4X .25 - G83 PECK CANNED CYCLE)
G98 G83 X1 Y1 Z-0.5 R0.1 Q0.15 F58.929
X3 Y1
X3 Y2
X1 Y2
G80
```
i.e. modal Fanuc/Haas canned cycle — first hole = full def `{G98|G99} G8x X Y Z R [Q/P] F`, subsequent holes = modal `X Y` only, then `G80`. The XYs come from `coordinates[]`.

VERIFY (flag P0/P1 with file:line):
- **Cycle-code correctness**: drill→G81, dwell→G82(+P), peck→G83(+Q), chip_break→G73(+Q), tap→G84, bore→G85. Q (peck) and P (dwell) only on the cycles that take them. G98/G99 retract mode correct.
- **Units/scale (CRITICAL — 25.4× class bug)**: depth_mm/retract_mm/peck_mm go through `fmt` (which scales mm→inch for inch jobs). Confirm an inch job emits scaled values (e.g. -12.7mm→Z-0.5000), NEVER raw mm. The test asserts this — verify the engine actually does it.
- **Fail-loud (R12)**: 0 holes → warn + emit nothing; non-finite depth/retract → fall back to move-list + warn; peck/dwell cycle missing Q/P → downgrade to G81 + warn (never a Q-less G83 that Haas alarms on); bad feed → flagged F token (never "FInfinity"/"FNaN").
- **Rigid tap**: G84 is preceded by `M29 S<rpm>` (Haas NGC rigid tapping) — is the ordering correct (M29 immediately before G84)?
- **Additive/no-regression**: an op WITHOUT `cycle` must emit the EXACT existing long-hand move list (the per-op branch). The existing 27 tests + the 3/3 ha
... [+873 chars truncated]

### Assistant | 2026-06-02T02:47:34.697Z

I'll review this unit thoroughly. Let me start by reading both files end-to-end and the ground truth sample.

### Assistant | 2026-06-02T02:47:35.639Z

[tool_use: Read]

### Assistant | 2026-06-02T02:47:35.791Z

[tool_use: Read]

### User | 2026-06-02T02:47:43.886Z

[tool_result] 1	// Tests for HaasNGCMillMasterPostEngine — real-value (R9), grounded in the real JM Haas NC structure
2	// (JM DIE/CNC MILL HAAS/ALL STAR/ALL STAR.NC) + the post-training corpus pocket-2op job.
3	import { describe, it, expect } from "vitest";
4	import { haasNGCMillMasterPostEngine, HaasNGCMillMasterPostEngine, type HaasMillOperation } from "../engines/HaasNGCMillMasterPostEngine.js";
5	
6	/** Co
... [+21315 chars truncated]

### User | 2026-06-02T02:47:43.934Z

[tool_result] 1	/**
2	 * HaasNGCMillMasterPostEngine — full PRISM master post for Haas mill controls
3	 * (Next-Gen-Control + classic). slot:echo, POST-TRAIN-MS0/U-PT-HAAS-ENGINE (2026-06-01).
4	 *
5	 * WHY: closes condition-2's full-post-coverage GAP for Haas. JM Die VMC-03/04 (Haas mills)
6	 * had CHEAP `.cps` coverage only (proven 15/15 dialect-clean via cheap-cps-validate) and NO
7	 * PRISM full post — `mas
... [+24690 chars truncated]

### Assistant | 2026-06-02T02:47:50.874Z

Both files are read end-to-end. Let me verify the ground-truth sample and a couple of adversarial facts before grading. Let me check the sample NC file and confirm the canonical physics constants the test asserts.

### Assistant | 2026-06-02T02:47:52.291Z

[tool_use: Bash]

### Assistant | 2026-06-02T02:47:53.581Z

[tool_use: Grep]

### User | 2026-06-02T02:47:59.593Z

[tool_result] 26: *   Fc = kc1.1 * ap * fz^(1-mc)
29: *   kc1.1 = specific cutting force at h=1mm [N/mm²]
34:export const CANONICAL_KIENZLE: Record<ISOGroup, { kc1_1: number; mc: number }> = {
35:  P: { kc1_1: 1800, mc: 0.25 },  // Carbon/alloy steel, cast steel
36:  M: { kc1_1: 2100, mc: 0.25 },  // Austenitic, duplex, precipitation hardening SS
37:  K: { kc1_1: 1100, mc: 0.28 },  // Gray iron, nodular iron, C
... [+1011 chars truncated]

### User | 2026-06-02T02:49:11.646Z

[tool_result] /h/prism/mcp-server/data/posts/prism-base/SAMPLE-PRISM-Base-Hurco-RICH.nc
/h/PRISM/mcp-server/data/posts/prism-base/SAMPLE-PRISM-Base-Hurco-RICH.nc

### Assistant | 2026-06-02T02:49:14.774Z

Canonical kc1_1 P=1800 confirmed (matches the test assertion `kc1_1=1800`). Let me read the ground-truth sample to verify the exact canned-cycle output format the engine claims to mirror.

### Assistant | 2026-06-02T02:49:16.251Z

[tool_use: Bash]

### User | 2026-06-02T02:49:33.191Z

[tool_result] 127:(DRILL 4X .25 - G83 PECK CANNED CYCLE)
128:G98 G83 X1 Y1 Z-0.5 R0.1 Q0.15 F58.929
129:X3 Y1
130:X3 Y2
131:X1 Y2
132:G80

### Assistant | 2026-06-02T02:49:38.854Z

Ground truth confirmed exactly. The engine's modal canned-cycle structure matches: `G98 G83 X.. Y.. Z.. R.. Q.. F..` first line, modal `X.. Y..` subsequent, `G80` cancel.

Now let me verify the test pass claim and a couple of adversarial points. Let me run the test file and check the Haas P-dwell convention and M29 ordering against an authoritative source.

### Assistant | 2026-06-02T02:49:40.323Z

[tool_use: Bash]

### User | 2026-06-02T02:50:26.685Z

[tool_result] PASS (43) FAIL (0)

### Assistant | 2026-06-02T02:50:29.619Z

43/43 pass confirmed. Let me verify the Haas P-dwell unit convention (seconds vs ms) — the most likely subtle correctness issue — against authoritative Haas documentation.

### Assistant | 2026-06-02T02:50:30.074Z

[tool_use: WebSearch]

### User | 2026-06-02T02:51:09.427Z

[tool_result] Web search results for query: "Haas G82 G84 canned cycle P dwell seconds rigid tapping M29 next-gen control"

I'll search for information about Haas G82/G84 canned cycles, dwell parameters, and rigid tapping.

Links: [{"title":"G84 Tapping Canned Cycle (Group 09)","url":"https://www.haascnc.com/service/codes-settings.type=gcode.machine=mill.value=G84.html"},{"title":"AP-602 X1, April 2016 G84 Tapp
... [+8785 chars truncated]

### Assistant | 2026-06-02T02:51:14.123Z

This surfaces two real findings. Let me dig deeper on the two adversarial points the operator flagged: (1) the Haas P-dwell unit ambiguity (ms vs seconds — Haas accepts decimal seconds, so `P0.50` is valid, but worth confirming the engine's claim of "seconds, 2dp"), and (2) the M29-before-G84 claim, which my search just contradicted ("M29 not needed on Haas; it's a Fanuc command").

Let me confirm the M29 question specifically for Haas Next-Gen Control, since the engine's whole `tap` path hinges on it.

### Assistant | 2026-06-02T02:51:16.605Z

[tool_use: WebFetch]

### User | 2026-06-02T02:51:18.787Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-02T02:51:21.275Z

[tool_use: WebSearch]

### User | 2026-06-02T02:51:53.773Z

[tool_result] Web search results for query: "Haas mill M29 code recognized rigid tap "alarm" OR "invalid" Fanuc G84 difference Next Gen Control"

I'll search for information about this Haas mill M29 code and rigid tapping issue.

Links: [{"title":"Rigid tapping with M29","url":"https://www.practicalmachinist.com/vb/cnc-machining/rigid-tapping-m29-119198/"},{"title":"CNC Machining | Rigid tapping with M29 | Prac
... [+7208 chars truncated]

### Assistant | 2026-06-02T02:52:03.958Z

This is a P0 finding with strong authoritative backing. The engine emits `M29 S<rpm>` before `G84` claiming it is "Haas NGC rigid tapping," but **M29 on Haas is not a rigid-tapping code at all** — per the Haas Mill operator's manual, M29 = "Set output relay with M-FIN," an output-relay/M-FIN interface code. M29 is the *Fanuc* rigid-tap activator. On a Haas the rigid-tapping option is always-on; G84 alone taps rigidly. Emitting M29 to a Haas would fire the output relay and the control would hang waiting for an M-FIN signal.

There is one subtlety I must check before finalizing severity: the engine name is "HaasNGCMillMasterPostEngine" and the JSDoc repeatedly claims Haas natively uses these Fanuc-family codes. Let me also verify there is no other plausible reading — and check the additive-branch and modal-correctness mechanics one more time, plus the G84 feed semantics (the engine emits feed-per-minute F, which for tapping is also a known issue but is the existing engine's convention).

Let me also confirm the F-token on the tap line: the engine emits `F{feed_mm_min scaled}` which for a tap should be pitch-synchronized, but that is an upstream feed concern, not introduced by this unit. Let me re-examine the exact tap line construction and verify no parameter leaks.

### Assistant | 2026-06-02T02:52:04.983Z

[tool_use: Read]

### User | 2026-06-02T02:52:12.958Z

[tool_result] 399	    // emit a Q-less G83 / P-less G82, which Haas would alarm on).
400	    let type: HaasDrillCycle["type"] = cyc.type;
401	    const hasPeck = Number.isFinite(cyc.peck_mm) && (cyc.peck_mm as number) > 0;
402	    const hasDwell = Number.isFinite(cyc.dwell_s) && (cyc.dwell_s as number) > 0;
403	    if ((type === "peck" || type === "chip_break") && !hasPeck) {
404	      warn(`${type} cycle needs
... [+1498 chars truncated]

### Assistant | 2026-06-02T02:53:07.132Z

I have everything I need. The verification is complete. Let me also confirm the dwell-P units finding precisely: the engine emits `P{dwell_s.toFixed(2)}` (decimal seconds). Per Haas, P accepts decimal seconds (P.08 = 0.08 s) OR integer milliseconds (P80). Since the engine emits a decimal-format value (`P0.50`), Haas reads it as 0.50 seconds — which is correct and unambiguous (the decimal point disambiguates from the millisecond integer form). So the dwell-P is actually correct. The real bug is M29.

Here is my final review.

---

# Code Quality Analysis Report — U-PT-HAAS-CANNED-CYCLES (slot:echo)

## Summary
- **Overall Quality Score: 7.5/10** — engineering is genuinely strong (modal correctness, units-scaling, fail-loud all verified correct), but there is **one P0 dialect-correctness bug** that would hang a real Haas control.
- Files Analyzed: 2 (engine + test) + ground-truth sample + physics constants
- Tests: **43/43 PASS** (verified by run), corpus proof reported 3/3 PERFECT
- **Grade: FAIL** — gated solely on the P0 below. Everything else is PASS-quality.

## Critical Issues

### P0 — `M29 S<rpm>` before G84 is a Fanuc code, WRONG for Haas; it will hang the control
- **File:** `H:/prism/mcp-server/src/engines/HaasNGCMillMasterPostEngine.ts:417` (+ JSDoc claims at lines 40, 379, 416; test asserts it at `HaasNGCMillMasterPostEngine.test.ts:265-272`)
- **Severity: High (P0)** — this is the exact class of dialect error this engine exists to prevent, and it's on the safety-adjacent tapping path.
- **The bug:** The engine emits `M29 S1200 (RIGID TAP)` immediately before the `G84` line, with the comment "Haas NGC needs M29 S<rpm> immediately before G84." This is incorrect. **M29 is the Fanuc rigid-tap activator, not a Haas code.** On a Haas mill (Pre-NGC *and* Next-Gen Control), M29 is a *different, valid* code — per the Haas Mill Operator's Manual, **`M29 = Set output relay with M-FIN`**. Haas machines with the rigid-tapping option are *always* in rigid-tap mode; a 
... [+7236 chars truncated]
