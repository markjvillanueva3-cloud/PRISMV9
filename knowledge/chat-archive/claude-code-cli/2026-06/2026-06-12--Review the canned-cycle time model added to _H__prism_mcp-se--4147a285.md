---
type: "chat-session"
source: "claude-code-cli"
session_id: "4147a285-7a5a-42b1-a446-db6c05dfba3e"
title: "Review the canned-cycle time model added to `H:\\prism\\mcp-server\\src\\engines\\Cyc"
date: "2026-06-12"
first_ts: "2026-06-12T17:55:33.920Z"
last_ts: "2026-06-12T17:57:14.052Z"
cwd: "H:\\prism-slot-charlie"
messages: 17
user_msgs: 6
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism-slot-charlie/4147a285-7a5a-42b1-a446-db6c05dfba3e/subagents/agent-a33bece4b09490be6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:40"
---

# Review the canned-cycle time model added to `H:\prism\mcp-server\src\engines\Cyc

> **claude-code-cli** | 2026-06-12 | 17 msgs (6 user / 11 assistant) | cwd: H:\prism-slot-charlie
> Raw: `H:/.claude/projects/H--prism-slot-charlie/4147a285-7a5a-42b1-a446-db6c05dfba3e/subagents/agent-a33bece4b09490be6.jsonl`

## Transcript

### User | 2026-06-12T17:55:33.920Z

Review the canned-cycle time model added to `H:\prism\mcp-server\src\engines\CycleTimeEstimatorEngine.ts` (slot charlie, unit U-QP-CANNED-CYCLES). Read the relevant parts end-to-end: the new `emitCannedDrill` function (just before `parseGCode`), the canned-cycle state vars + the canned-cycle handling block inside `parseGCode` (after the motion-mode detection, before the `// Dwell` block), and how the timing pass (the big `switch(move.type)` ~line 920-1050) consumes "rapid"/"linear"/"dwell" moves.

CONTEXT: G81-G89 drilling/boring/tapping canned cycles previously fell through as a single mis-typed motion (the drill feed time, peck retracts, dwell, and every modal-repeat hole were lost), undercounting quoted cycle time. The fix emits a synthetic move sequence per hole: (1) rapid XY to hole, (2) rapid Z to R clearance plane, (3) FEED Z from R to depth (peck overhead for G83), (4) dwell (G82/G88/G89), (5) retract rapid to R (G99) or initial level (G98); tap (G84) retracts at feed.

VERIFY THE TIME MODEL:
1. Drill feed distance = |R - Z_depth|; is that the correct drilled depth (R is the clearance/start plane, Z is final depth)? For a hole drilled from R=2 to Z=-10, depth = 12mm — correct?
2. G83 peck model: peckCount = ceil(depth/Q), drillPath = depth + peckCount*Q*0.5. Is the 0.5*Q-per-peck retract overhead physically reasonable (each peck retracts partway and re-feeds)? Compare to the sibling model in GCodeRuntimePredictorEngine.ts (~line 263-268).
3. G84 tap: retract at FEED (not rapid) — correct for tapping (down and up both at thread-lead feed)? Does the down-feed + feed-retract double the cutting distance vs a drill of the same depth?
4. G98 vs G99 retract: G98 retracts to the initial Z level (captured at cycle establish), G99 to the R plane. Is the initial-level capture correct (captured once when the cycle is established, persists across modal repeats)?
5. Rate selection: the XY-position move sets x/y only (-> XY rapid rate); the Z plunge/retract sets z only (->
... [+400 chars truncated]

### Assistant | 2026-06-12T17:55:36.860Z

I'll review the canned-cycle time model end-to-end. Let me start by reading the relevant parts of the file.

### Assistant | 2026-06-12T17:55:36.960Z

[tool_use: Read]

### User | 2026-06-12T17:55:38.641Z

[tool_result] 1	/**
2	 * CycleTimeEstimatorEngine — Physics-Based Cycle Time Estimation
3	 *
4	 * Models actual machine kinematics (acceleration, jerk, servo settling,
5	 * corner deceleration, block processing overhead) to produce accurate
6	 * cycle time estimates from G-code. Goes far beyond naive distance/feed
7	 * calculations used by CAM systems.
8	 *
9	 * Key physics modeled:
10	 * - S-curve / trapezoida
... [+63235 chars truncated]

### Assistant | 2026-06-12T17:55:40.960Z

I've read the full engine. Now let me compare against the sibling peck model in `GCodeRuntimePredictorEngine.ts` as the prompt directs.

### Assistant | 2026-06-12T17:55:41.678Z

[tool_use: Read]

### User | 2026-06-12T17:55:42.685Z

[tool_result] 220	
221	    // Modal state — carries across blocks
222	    let modalMotion: ParsedBlock["motion"] = null;
223	    let modalFeed = 0;
224	    let modalRpm = 0;
225	    let modalTool = 0;
226	    let x = 0, y = 0, z = 0;
227	    let prevExitVelocity = 0; // mm/sec
228	
229	    const breakdowns: BlockTimeBreakdown[] = [];
230	
231	    for (const b of blocks) {
232	      // Modal carries
233	      if
... [+5540 chars truncated]

### Assistant | 2026-06-12T17:55:47.671Z

The sibling peck model confirms the `depth + peckCount*peckQ*0.5` formula is the established convention in this codebase. Now let me carefully trace the canned-cycle handling for the modal-repeat edge cases. Let me examine the key sections more closely.

The critical issue I need to verify is the **modal-repeat case**: after the first hole is drilled, `curZ` is set to `end.z` (the retract level). Let me trace the second hole carefully.

Let me look at the dwell P-unit handling and how the canned-cycle dwell is consumed in the timing switch.

### Assistant | 2026-06-12T17:55:48.810Z

[tool_use: Read]

### User | 2026-06-12T17:55:49.868Z

[tool_result] 600	  // 4. Dwell at depth (G82 spot, G88 bore-dwell, G89 bore-dwell-feed-out).
601	  if ((type === "G82" || type === "G88" || type === "G89") && p > 0) {
602	    moves.push({ line_number: lineNum, raw, type: "dwell", p, distance_mm: 0, angle_change_deg: 0 });
603	  }
604	  // 5. Retract: rapid to R (G99) or initial level (G98); tap (G84) retracts at feed.
605	  const retractZ = retractToInitial ?
... [+792 chars truncated]

### Assistant | 2026-06-12T17:55:55.679Z

Now I have a complete picture. Let me trace through the adversarial cases carefully and verify each of the 6 verification points.

Let me work through the critical **dwell P-unit double-interpretation** issue. In `emitCannedDrill`, the dwell move is pushed with `p` raw. Then in the timing switch (line 1132-1138), `dwell_sec = p >= 100 ? p / 1000.0 : p`. This applies the Fanuc G04 heuristic (P>=100 = milliseconds) to canned-cycle dwell P. Let me verify that's the same convention canned-cycle P uses — and check the G84 down-feed analysis and the **G98 initial-Z modal-repeat persistence** bug.

Let me re-trace the modal-repeat G98 case precisely by re-reading the establishing logic.

### Assistant | 2026-06-12T17:55:56.664Z

[tool_use: Read]

### User | 2026-06-12T17:55:57.719Z

[tool_result] 662	    // ---- Canned cycles (G73/G74/G76/G81-G89). U-QP-CANNED-CYCLES ----------
663	    // Retract mode: G98 = retract to initial level, G99 = retract to R plane.
664	    if (/G98\b/i.test(code)) retractToInitial = true;
665	    if (/G99\b/i.test(code)) retractToInitial = false;
666	
667	    // G80 cancels any active canned cycle.
668	    if (/G80\b/i.test(code)) {
669	      cannedActive = fals
... [+2651 chars truncated]

### Assistant | 2026-06-12T17:56:23.271Z

I now have a complete understanding. Let me work through the adversarial analysis with concrete numeric traces.

## Analysis of the 6 verification points + adversarial cases

**Point 1 (drill depth):** `drillDepth = Math.abs(rPlane - zDepth)`. R=2, Z=-10 → |2-(-10)| = 12mm. Correct. ✓

**Point 2 (G83 peck):** `drillPath = depth + peckCount*peckQ*0.5`, matching the sibling `GCodeRuntimePredictorEngine.ts:268` exactly. Reasonable convention. ✓ (one edge issue below)

**Point 3 (G84 tap):** retract at `"linear"` with `f=feed`. Down-feed (path 3, `"linear"`, distance=drillDepth) + feed-retract (path 5, `"linear"`, distance=dRetract). Both at feed → double cutting distance. Correct for tapping. ✓

**Point 5 (rate selection):** Let me verify the modal-repeat hole carefully — this is where I find the first real bug.

Let me trace a **two-hole G99 G81** program (the most common case):

```
G90 G99 G81 X10 Y0 Z-10 R2 F100   (hole 1)
X20 Y0                              (hole 2, modal repeat)
G80
```

Hole 1: `curZ`=0 (initial). emitCannedDrill: rapid XY to (10,0); rapid Z 0→2 (`z:2`); feed Z 2→-10 (`z:-10`); rapid retract to R=2 (`z:2`). Returns z=2. So `curZ`=2.

Hole 2: `curZ`=2. emitCannedDrill(fromZ=2): step 2 `dToR = |2 - 2| = 0` → **no rapid-Z-down move emitted** (correct, already at R). Step 3 feed 2→-10. Step 5 retract to 2. Correct. ✓ Rate selection works: XY-only moves → XY rapid; Z-only → Z rapid; feed → linear. ✓

Now let me trace the **G98 modal-repeat** case, which is the critical bug:

```
G90 G98 G81 X10 Y0 Z-10 R2 F100   (initialZ captured = curZ = 0)
X20 Y0                              (hole 2)
G80
```

Hole 1: `cannedInitialZ`=0. emitCannedDrill(fromZ=0, retractToInitial=true, initialZ=0): rapid XY; step 2 `dToR=|2-0|=2` rapid down to R=2; feed to -10; step 5 retract to initialZ=**0**. Returns z=0. ✓ Correct: G98 retracts to initial level 0.

Hole 2: `curZ`=0. emitCannedDrill(fromZ=0): step 2 `dToR=|2-0|=2` rapid down to R=2 again; feed to -10; retract to 0
... [+1973 chars truncated]

### Assistant | 2026-06-12T17:56:24.913Z

[tool_use: Grep]

### User | 2026-06-12T17:56:26.329Z

[tool_result] 1133:          // G04 P value: if < 100, it's seconds; if >= 100, it's milliseconds (Fanuc convention)
1135:          const dwell_sec = p >= 100 ? p / 1000.0 : p;
1136:          dwell_time += dwell_sec;
1365:          time += p >= 100 ? p / 1000.0 : p;

### Assistant | 2026-06-12T17:57:14.052Z

Confirmed. The dwell move emitted by `emitCannedDrill` carries the raw `p` value (e.g. from `P500`), and the timing switch (line 1135) applies the **G04 P-unit heuristic** (`p >= 100 → ms`) to it. This is a genuine semantic problem for canned-cycle dwell, which I'll detail in the findings.

Let me also verify one more adversarial path — the **G85/G86/G89 feed-out retract** and whether the missing-R case is handled. Let me check the default `cannedR` value and what happens with no R word.

The key facts from the code:
- `cannedR` initializes to `0` (line 628), never reset on a new cycle establish (only `cannedInitialZ` is captured fresh).
- If a G81 is programmed with no R word, `cannedR` retains its value from a *prior cycle* or stays 0.

Let me trace the **missing-R adversarial case** and the **G85 feed-out retract semantics** to finalize.

For G85/G89 (bore, feed-out): real machines retract at **feed rate**, not rapid. The code only special-cases G84 for feed retract (line 608: `type === "G84" ? "linear" : "rapid"`). G85, G86, G89 all retract at rapid in this model. That's a physics inaccuracy for G85/G89 (bore cycles that feed out for surface finish), but it's a P2 magnitude issue, not a P0.

I now have everything needed. Let me write up the findings.

---

## Review: Canned-Cycle Time Model (U-QP-CANNED-CYCLES)

**File:** `H:\prism\mcp-server\src\engines\CycleTimeEstimatorEngine.ts`
**Functions reviewed:** `emitCannedDrill` (lines 572-612), canned-cycle block in `parseGCode` (lines 625-722), timing switch (lines 1045-1170).
**Sibling cross-check:** `H:\prism\mcp-server\src\engines\GCodeRuntimePredictorEngine.ts:260-272` (peck/tap models match).

### Verification of the 6 points

1. **Drill depth `|R - Z_depth|`** — CORRECT. R=2, Z=-10 → 12mm. `drillDepth = Math.abs(rPlane - zDepth)` (line 590). ✓
2. **G83 peck `depth + peckCount*Q*0.5`** — CORRECT and consistent with the sibling at `GCodeRuntimePredictorEngine.ts:268`. The 0.5·Q-per-peck retract overhead is a re
... [+5439 chars truncated]
