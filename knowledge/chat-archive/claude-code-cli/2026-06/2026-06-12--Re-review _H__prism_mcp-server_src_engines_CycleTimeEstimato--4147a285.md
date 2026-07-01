---
type: "chat-session"
source: "claude-code-cli"
session_id: "4147a285-7a5a-42b1-a446-db6c05dfba3e"
title: "Re-review `H:\\prism\\mcp-server\\src\\engines\\CycleTimeEstimatorEngine.ts` canned-c"
date: "2026-06-12"
first_ts: "2026-06-12T18:06:25.825Z"
last_ts: "2026-06-12T18:08:28.033Z"
cwd: "H:\\prism-slot-charlie"
messages: 29
user_msgs: 10
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism-slot-charlie/4147a285-7a5a-42b1-a446-db6c05dfba3e/subagents/agent-a336ea520aafebb7d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:40"
---

# Re-review `H:\prism\mcp-server\src\engines\CycleTimeEstimatorEngine.ts` canned-c

> **claude-code-cli** | 2026-06-12 | 29 msgs (10 user / 19 assistant) | cwd: H:\prism-slot-charlie
> Raw: `H:/.claude/projects/H--prism-slot-charlie/4147a285-7a5a-42b1-a446-db6c05dfba3e/subagents/agent-a336ea520aafebb7d.jsonl`

## Transcript

### User | 2026-06-12T18:06:25.825Z

Re-review `H:\prism\mcp-server\src\engines\CycleTimeEstimatorEngine.ts` canned-cycle code after fixes addressing your prior FAIL (you were agent a33bece4b09490be6 — prior findings: P1-a canned dwell P heuristic, P1-b G91 incremental R/Z, P2 G85/G89 rapid retract, P2 G83 peck over-Q, P3 stale state).

Changes made (re-read `emitCannedDrill` ~line 561-615 + the canned block in parseGCode):
1. **P1-a (dwell):** resolved as a documented-consistency decision — the canned dwell now carries an explicit comment that it reuses the engine-wide G04 `P>=100ms->seconds` heuristic, and a controller-aware dwell unit is named as a separate follow-up. The math is intentionally KEPT consistent with the existing G04 path (not forked into a canned-only convention that would itself be wrong for decimal-seconds controllers). Verify this is an honest, non-regressing resolution (the <100ms-reads-as-seconds edge is pre-existing + engine-wide, requires sub-100ms dwell which is not a real dwell).
2. **P1-b (G91):** re-derive the drill depth: `drillDepth = |rPlane - zDepth|`. Under G91, `cannedR = curZ + rc` and `cannedZ = curZ + zc`, so `|cannedR - cannedZ| = |rc - zc|` — the curZ cancels. CONFIRM the cutting time (depth-driven) is therefore CORRECT under both G90 and G91, and only the rapid positioning Z-travel for exotic per-hole-varying-depth G91 is approximate (now documented in the docstring). Is downgrading P1-b to a documented note justified by this difference-invariance?
3. **P2 (G85/G89):** retract now feeds out for G84 (tap), G85 + G89 (bore feed-out); others rapid. Correct?
4. **G73:** added to regex `/\bG(73|8[1-9])\b/i` + the peck branch (modeled like G83). Correct for high-speed peck?

Confirm no NEW errors introduced. Re-grade PASS or FAIL on the canned-cycle feature. If still FAIL, name the exact remaining P0/P1 with line numbers.

### Assistant | 2026-06-12T18:06:28.773Z

I'll re-read the canned-cycle code in CycleTimeEstimatorEngine.ts to verify the fixes.

### Assistant | 2026-06-12T18:06:29.284Z

[tool_use: Read]

### User | 2026-06-12T18:06:30.412Z

[tool_result] 540	  const overhead = (delta_v * delta_v) / (2.0 * max_accel_mm_s2 * feed_rate_mm_s);
541	  return overhead > 0 ? overhead : 0;
542	}
543	
544	// ============================================================================
545	// G-CODE PARSER
546	// ============================================================================
547	
548	/**
549	 * Extract a numeric value for a given letter address 
... [+5807 chars truncated]

### Assistant | 2026-06-12T18:06:33.388Z

I need to read the actual parseGCode canned block to verify the integration, not just the helper. Let me continue reading.

### Assistant | 2026-06-12T18:06:33.777Z

[tool_use: Read]

### User | 2026-06-12T18:06:35.262Z

[tool_result] 659	      continue;
660	    }
661	
662	    // Check for G90/G91
663	    if (/G90\b/i.test(code)) isAbsolute = true;
664	    if (/G91\b/i.test(code)) isAbsolute = false;
665	
666	    // Detect motion mode changes
667	    if (/G0+\b/i.test(code) && !/G0+[1-9]/i.test(code)) motionMode = "rapid";
668	    if (/G0*1\b/i.test(code)) motionMode = "linear";
669	    if (/G0*2\b/i.test(code)) motionMode = "c
... [+6298 chars truncated]

### Assistant | 2026-06-12T18:06:38.691Z

Now let me examine the dwell timing pass to verify the P1-a heuristic claim, and check how `f` is used on the dwell/retract moves to confirm no new errors.

### Assistant | 2026-06-12T18:06:40.132Z

[tool_use: Grep]

### User | 2026-06-12T18:06:42.724Z

[tool_result] 12: * - Servo settling time at position stops (G00 endpoints, G04 dwells)
89:  dwell_time: number;
147:  type: "rapid" | "linear" | "cw_arc" | "ccw_arc" | "dwell" | "tool_change" | "spindle" | "other";
299:      block_processing_time: 0.1,                  // verified 1000/10000
566: * (4) optional dwell (G82/G88/G89), (5) retract to R (G99) or the initial level
570: * peck travel, dwell, and ever
... [+2020 chars truncated]

### Assistant | 2026-06-12T18:06:50.943Z

I've confirmed the dwell timing pass at lines 1144-1148 and 1375-1377. Both use the identical `p >= 100 ? p / 1000.0 : p` heuristic. The canned-cycle dwell pushes a `type: "dwell"` move with `p`, so it flows through exactly the same path as G04. The P1-a claim is verified consistent.

Now let me verify the `f` field on the dwell and retract moves doesn't cause a problem in the timing pass. The canned dwell push includes no `f`, and the retract push includes `f: feed`. Let me check how `linear`/`rapid` moves consume `f` and whether a `rapid` move with an `f` value misbehaves.

### Assistant | 2026-06-12T18:06:51.913Z

[tool_use: Read]

### User | 2026-06-12T18:06:53.645Z

[tool_result] 1055	      block_overhead += kin.block_processing_time / 1000.0;
1056	
1057	      switch (move.type) {
1058	        case "rapid": {
1059	          if (move.distance_mm <= 0) break;
1060	
1061	          // Rapids use machine rapid rate — typically XY and Z are different
1062	          // Use the slower axis rate if Z is moving
1063	          const hasZ = move.z !== undefined;
1064	          const h
... [+6724 chars truncated]

### Assistant | 2026-06-12T18:07:02.178Z

The timing pass confirms several important things. Let me verify each:

**Rapid retract Z-rate selection (line 1063-1073):** The rapid retract move pushes `{ type: "rapid", z: retractZ, ... }` with `z` set but no `x`/`y`. So `hasZ && !hasXY` → uses `rapid_rate_z`. Correct. The `f: feed` on a rapid move is harmless (rapids ignore `f`).

**Feed retract (G84/G85/G89):** pushes `type: "linear"` with `f: feed` → consumed at line 1102. Correct.

**Rapid XY to hole (line 586):** pushes `{ type: "rapid", x: holeX, y: holeY }` with no `z` → `hasXY && !hasZ` → `rapid_rate_xy`. Correct.

**Rapid Z to R (line 591):** `{ type: "rapid", z: rPlane }` no x/y → `rapid_rate_z`. Correct.

Now let me check one potential issue: the canned-cycle drill move at line 603 pushes `type: "linear"` with no `angle_change_deg` issue, but I want to verify the G98/G99 default and the modal-state reset across multiple cycle establishments. Let me also verify there's no issue with the `cannedInitialZ` capture when a cycle is re-established without G80. Let me look at the broader test file to confirm behavior is tested.

### Assistant | 2026-06-12T18:07:03.570Z

[tool_use: Grep]

### User | 2026-06-12T18:07:05.125Z

[tool_result] Found 250 files limit: 250
H:\prism\mcp-server\src\__tests__\CycleTimeCannedCycles.test.ts
H:\prism\mcp-server\src\__tests__\ppDispatcher.controller-translate.test.ts
H:\prism\mcp-server\src\__tests__\ObsidianRestBridgeEngine.test.ts
H:\prism\mcp-server\src\__tests__\CimcoVerificationBridgeEngine.test.ts
H:\prism\mcp-server\src\__tests__\MINBatchExtractorEngine.test.ts
H:\prism\mcp-server\src\__te
... [+17185 chars truncated]

### Assistant | 2026-06-12T18:07:08.057Z

There's a dedicated test file `CycleTimeCannedCycles.test.ts`. Let me read it to confirm the fixes are tested with real reference values and that the G91/G73/G85 behaviors are exercised.

### Assistant | 2026-06-12T18:07:08.363Z

[tool_use: Read]

### User | 2026-06-12T18:07:12.025Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\CycleTimeCannedCycles.test.ts' was already read 32s ago in this session and is unchanged (mtime 1781287554854). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### Assistant | 2026-06-12T18:07:18.485Z

The guard indicates I've already seen this file in-session. Let me search for the specific G91, G73, and feed-retract test cases to confirm coverage of the fixed paths.

### Assistant | 2026-06-12T18:07:19.891Z

[tool_use: Grep]

### User | 2026-06-12T18:07:22.237Z

[tool_result] 3: * models drilling/boring/tapping canned cycles (G73/G74/G76/G81-G89) instead of
5: * through as one rapid/linear move (or "other"), so the feed-drill time, peck
6: * retracts, dwell, and every MODAL REPEAT hole were silently lost -> cycle time
65:  it("G83 peck adds retract overhead -> more drill distance/time than plain G81 (same depth)", () => {
73:    const PECK = `%
81:    const peck = cycl
... [+1341 chars truncated]

### Assistant | 2026-06-12T18:07:25.708Z

Now let me check whether there's a G91 incremental test case and verify the multi-hole modal repeat test, since the G91 path is the explicit P1-b concern.

### Assistant | 2026-06-12T18:07:27.261Z

[tool_use: Grep]

### User | 2026-06-12T18:07:28.896Z

[tool_result] 6: * retracts, dwell, and every MODAL REPEAT hole were silently lost -> cycle time
9: * Reference values: a G81 R2 Z-10 F100 hole feeds R->Z = |2-(-10)| = 12 mm at
23:G21 G90 G98
34:    expect(r.cutting_time).toBeGreaterThan(7.0);
35:    expect(r.cutting_time).toBeLessThan(8.5); // 7.2s + small S-curve overhead, one hole only
36:    expect(r.total_seconds).toBeGreaterThan(7.2);
39:  it("modal repe
... [+1386 chars truncated]

### Assistant | 2026-06-12T18:07:45.550Z

I now have a complete picture. Let me verify my analysis of each fix point by tracing the logic carefully.

## Verification of each fix

**P1-b (G91 difference-invariance) — CONFIRMED CORRECT.**
At lines 713-714: `cannedZ = curZ + zc`, `cannedR = curZ + rc` under G91. The drill depth at line 595 is `Math.abs(rPlane - zDepth)` = `|（curZ+rc) - (curZ+zc)|` = `|rc - zc|` — `curZ` cancels exactly. So cutting time (depth-driven, the dominant term) is identical under G90 and G91. Only the rapid Z-to-R positioning (`dToR = |rPlane - fromZ|` at line 589) differs across per-hole-varying-depth incremental patterns, and that's a rapid (small) term, now documented in the docstring (lines 571-573). Downgrade to documented-note is justified. The math is sound.

**P1-a (dwell heuristic) — CONFIRMED HONEST/NON-REGRESSING.**
The canned dwell at line 610 pushes `type: "dwell"` with `p`, flowing through the identical `p >= 100 ? p/1000 : p` heuristic used by G04 at lines 1147 and 1377. It does NOT fork a canned-only convention. The `<100ms-reads-as-seconds` edge is genuinely pre-existing + engine-wide and requires a sub-100ms dwell (not a real dwell). Comment at 605-608 is accurate. Acceptable resolution.

**P2 (G85/G89 feed-out retract) — CORRECT.**
Line 617: `feedRetract = type === "G84" || type === "G85" || type === "G89"`. G84 tap (thread-lead), G85 + G89 bore feed-out (surface finish) retract at feed; all others rapid. Matches Fanuc semantics. Test at line 136-154 verifies G85 feeds out (~2x cutting). Correct.

**G73 (high-speed peck) — CORRECT.**
Regex `/\bG(73|8[1-9])\b/i` at line 692 captures G73. The peck branch at line 597 (`type === "G83" || type === "G73"`) applies the same peck-retract overhead model. Test at line 115-133 confirms G73 now models pecking. Correct for the purpose (high-speed peck differs from G83 only in retract distance, which the depth-driven cutting model doesn't distinguish — an acceptable simplification, consistent with the rest of the model's fidelity)
... [+631 chars truncated]

### Assistant | 2026-06-12T18:07:47.005Z

[tool_use: Read]

### User | 2026-06-12T18:07:58.540Z

[tool_result] 1	/**
2	 * U-QP-CANNED-CYCLES (charlie 2026-06-12) — verify CycleTimeEstimatorEngine now
3	 * models drilling/boring/tapping canned cycles (G73/G74/G76/G81-G89) instead of
4	 * mis-typing them as a single motion. Before this unit, a canned-cycle line fed
5	 * through as one rapid/linear move (or "other"), so the feed-drill time, peck
6	 * retracts, dwell, and every MODAL REPEAT hole were silently 
... [+2144 chars truncated]

### Assistant | 2026-06-12T18:08:28.033Z

I now have complete verification. The docstring header (line 3) mentions `G74/G76` as canned cycles, but the actual regex `/\bG(73|8[1-9])\b/i` correctly EXCLUDES them (G74/G76 are lathe semantics, per the in-code comment at lines 688-690). This is a minor docstring-vs-code mismatch in the test header comment, but the code behavior is correct and intentional — it's a P3 cosmetic note, not a defect.

Let me do a final check on whether the G73 reference comment math in the test matches the implementation, and verify the establishing-line double-emit guard is sound by re-confirming line 722's condition.

The condition at line 722: `if (cannedMatch || px !== undefined || py !== undefined)`. On the establishing line (e.g. `G81 X10 Y10 Z-10 R2 F100`), `cannedMatch` is truthy → drills ONE hole. On a subsequent modal line (e.g. `X20 Y0`), `cannedMatch` is falsy but `px !== undefined` → drills one hole. A bare `G80` is handled earlier (line 678) with `continue`. No double-emit. The 3-hole test (ratio 2.7-3.3) at lines 60-62 directly validates exactly-one-hole-per-line. Confirmed correct.

I have everything needed to grade.

---

## RE-GRADE: **PASS** — canned-cycle feature

All prior findings are resolved correctly, and no new errors were introduced.

### Prior findings — verdicts

**P1-a (canned dwell P heuristic) — RESOLVED (honest, non-regressing).**
The canned dwell (`CycleTimeEstimatorEngine.ts:609-610`) pushes `type:"dwell"` with `p` and flows through the *identical* `p >= 100 ? p/1000 : p` heuristic used by G04 at lines `1147` and `1377`. It does not fork a canned-only convention. The `<100ms-reads-as-seconds` edge is genuinely pre-existing + engine-wide and requires a sub-100ms (non-real) dwell. Comment at `605-608` accurately names the shared heuristic and the controller-aware-unit follow-up. Acceptable.

**P1-b (G91 incremental R/Z) — RESOLVED (math verified, downgrade justified).**
Under G91, `cannedR = curZ + rc` and `cannedZ = curZ + zc` (lines `713-714`), so `d
... [+3222 chars truncated]
