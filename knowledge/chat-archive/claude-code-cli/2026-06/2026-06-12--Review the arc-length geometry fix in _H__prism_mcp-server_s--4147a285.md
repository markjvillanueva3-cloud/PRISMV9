---
type: "chat-session"
source: "claude-code-cli"
session_id: "4147a285-7a5a-42b1-a446-db6c05dfba3e"
title: "Review the arc-length geometry fix in `H:\\prism\\mcp-server\\src\\engines\\GCodeTime"
date: "2026-06-12"
first_ts: "2026-06-12T17:30:56.629Z"
last_ts: "2026-06-12T17:32:40.381Z"
cwd: "H:\\prism-slot-charlie"
messages: 25
user_msgs: 9
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism-slot-charlie/4147a285-7a5a-42b1-a446-db6c05dfba3e/subagents/agent-a57e77151a292f4f0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:40"
---

# Review the arc-length geometry fix in `H:\prism\mcp-server\src\engines\GCodeTime

> **claude-code-cli** | 2026-06-12 | 25 msgs (9 user / 16 assistant) | cwd: H:\prism-slot-charlie
> Raw: `H:/.claude/projects/H--prism-slot-charlie/4147a285-7a5a-42b1-a446-db6c05dfba3e/subagents/agent-a57e77151a292f4f0.jsonl`

## Transcript

### User | 2026-06-12T17:30:56.629Z

Review the arc-length geometry fix in `H:\prism\mcp-server\src\engines\GCodeTimeEstimatorEngine.ts` (slot charlie, unit U-QP-TIME-BUGS). Read the WHOLE file end-to-end.

CONTEXT: This engine estimates CNC G-code cycle time and is LIVE (wired into the print-to-quote PipelineSummary). Bug G7 was that G02/G03 circular-arc moves summed the straight-line CHORD distance instead of the true arc length, undercounting cut time. The fix added two functions `arcLengthFromR` and `arcLengthMm` (after the `distance` helper, ~line 70-135) and split the cutting branch so G01 uses chord (correct) while G02/G03 use `arcLengthMm` with I/J/K/R offsets converted inch->mm.

VERIFY RIGOROUSLY (this is physics/geometry — check the MATH):
1. IJK plane detection: I&J -> G17 XY, I&K -> G18 XZ, J&K -> G19 YZ. Is the center computed correctly (center = start + offset)? Is the out-of-plane (helical) axis added correctly as sqrt(arc^2 + off^2)?
2. Sweep angle: th0/th1 via atan2 from center; CW (G2) = th0-th1, CCW (G3) = th1-th0; normalized into (0, 2pi]. Walk a concrete quarter-arc CW and CCW and confirm the sweep direction + magnitude are right. Confirm a full circle (start==end) yields 2pi not 0.
3. R-form: minor arc (R>0) sweep = 2*asin((chord/2)/r); major arc (R<0) = 2pi - that. Degenerate guard chord>2r -> fallback. Correct?
4. Units: I/J/K/R are converted to mm via the same unitsMm flag as X/Y/Z BEFORE being passed in. Endpoints are already mm. Any unit inconsistency?
5. Fallback safety: when no usable arc params, returns the chord (prior behavior) — so the fix can only ADD length, never make a value worse. Confirm there's no path that returns a SHORTER-than-chord or NaN/Infinity value for a real arc.
6. Edge cases: radius 0, chord 0 (full circle with omitted endpoint — note line ~142 `continue` skips moves with all X/Y/Z null), I=J=K=R all null, negative offsets.

Report P0 (wrong math / NaN / regression) and P1 (incorrect edge case) findings with line numbers. Grade PASS or FAIL. Be adver
... [+61 chars truncated]

### Assistant | 2026-06-12T17:30:59.755Z

I'll read the entire file end-to-end to verify the arc-length geometry fix rigorously.

### Assistant | 2026-06-12T17:30:59.852Z

[tool_use: Read]

### User | 2026-06-12T17:31:00.758Z

[tool_result] 1	/**
2	 * GCodeTimeEstimatorEngine — JM-DIE-PROGRAM-ANALYSIS-MS0 / U-JP01
3	 *
4	 * Parses CNC G-code programs (.nc / .min / .mpf / .eia / .iso / .pim) and
5	 * estimates: time-in-cut, op count, tool changes, block count, rapid count,
6	 * cutting feed count. Supports mill/lathe/WEDM dialects.
7	 *
8	 * Time model (MS0 simple): for each cutting motion (G01/G02/G03), compute
9	 * dt = path_length_
... [+11290 chars truncated]

### Assistant | 2026-06-12T17:31:04.623Z

I've read the whole file. Now let me verify the math rigorously by walking through concrete examples and checking each claim. Let me also check how the engine is wired and how `parseNumber` interacts with the I/J/K offsets, since there's a subtle parsing concern.

### Assistant | 2026-06-12T17:31:06.040Z

[tool_use: Grep]

### Assistant | 2026-06-12T17:31:06.734Z

[tool_use: Grep]

### User | 2026-06-12T17:31:10.079Z

[tool_result] Found 12 files
H:\prism\mcp-server\src\__tests__\GCodeTimeEstimatorArc.test.ts
H:\prism\mcp-server\src\engines\GCodeTimeEstimatorEngine.ts
H:\prism\mcp-server\src\tools\dispatchers\quotingDispatcher.ts
H:\prism\mcp-server\src\schemas\quotingActionSchemas.ts
H:\prism\mcp-server\src\engines\quoting\PATHS.md
H:\prism\mcp-server\src\engines\post-processor\CLAUDE.md
H:\prism\mcp-server\src\engines\quot
... [+388 chars truncated]

### User | 2026-06-12T17:31:10.149Z

[tool_result] 226:        const iMm = toMm(parseNumber(line, "I"));
227:        const jMm = toMm(parseNumber(line, "J"));
228:        const kMm = toMm(parseNumber(line, "K"));
229:        const rMm = toMm(parseNumber(line, "R"));

### Assistant | 2026-06-12T17:31:13.576Z

Let me check the existing arc test file to understand the expected behavior, and verify the `parseNumber` regex behavior for a critical edge case (the `R` vs other words, and whether `K` could match inside other tokens).

### Assistant | 2026-06-12T17:31:13.692Z

[tool_use: Read]

### User | 2026-06-12T17:31:14.223Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\GCodeTimeEstimatorArc.test.ts' was already read 1s ago in this session and is unchanged (mtime 1781285380709). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### Assistant | 2026-06-12T17:31:16.066Z

The guard says it's in context, but I don't actually have it. Let me use Grep to view it.

### Assistant | 2026-06-12T17:31:17.254Z

[tool_use: Grep]

### User | 2026-06-12T17:31:18.327Z

[tool_result] 1:/**
2: * U-QP-TIME-BUGS (charlie 2026-06-12) — fail-on-revert guard for the
3: * GCodeTimeEstimatorEngine arc-as-chord undercount (G7). This engine is LIVE
4: * (wired into the print-to-quote PipelineSummary via U-GCODE-TO-CYCLE-FOR-PRINT-
5: * PIPELINE), so the undercount directly biased quoted cycle time low on any part
6: * with arcs.
7: *
8: * The old code summed the straight-line chord for 
... [+3575 chars truncated]

### Assistant | 2026-06-12T17:31:24.473Z

Now let me verify the math carefully. Let me walk through the concrete examples in the IJK center-offset path and the sweep normalization. First, let me check the critical concern about `parseNumber` and the `K` word — whether it could accidentally match. Let me trace the regex.

The `parseNumber(line, "I")` builds regex `/I(-?\d+(\.\d+)?)/i`. A concern: in a line like `G3 X0 Y10 I-10 J0`, does `I` match correctly? Yes. But there's a subtler issue — does `parseNumber(line, "K")` accidentally match nothing problematic, and could `R` match inside a word? Let me check whether any G-code address letters collide. Let me verify the math by reasoning through each verification point now.

Let me check one more thing — how `dist` (chord) is computed vs what's passed, and whether the integration test exercises real JM Die programs with arcs.

### Assistant | 2026-06-12T17:31:26.394Z

[tool_use: Grep]

### User | 2026-06-12T17:31:28.140Z

[tool_result] 22:G02 X100 Y50 I25 J0
56:  it("Fanuc mill program → ok=true, block_count > 0, time_in_cut_s > 0", () => {
62:    expect(r.time_in_cut_s).toBeGreaterThan(0);
79:    expect(r.time_in_cut_s).toBeCloseTo(6.0, 1);
116:  it("counts G02/G03 as cutting blocks", () => {
117:    const text = "G21 G90\nG01 X10 Y0 F500\nG02 X20 Y10 I5 J5\nG03 X10 Y20 I0 J5\nM30";
141:    expect(r.time_in_cut_s).toBeCloseTo(0
... [+7 chars truncated]

### Assistant | 2026-06-12T17:31:51.879Z

Now I have enough context. Let me do the rigorous mathematical verification by walking through each verification point with concrete numbers.

## Verification walkthrough

**Point 1 & 2 — IJK center, plane, sweep (quarter arc CCW G3):**

Test case: `G0 X10 Y0` then `G3 X0 Y10 I-10 J0`. So start=(10,0), end=(0,10), I=-10, J=0, cw=false.
- I&J → G17 XY: a0=10, a1=0, b0=0, b1=10, ca=x0+I=10+(-10)=0, cb=y0+J=0+0=0. Center=(0,0). ✓ Correct.
- radius = sqrt((10-0)²+(0-0)²) = 10. ✓
- th0 = atan2(b0-cb, a0-ca) = atan2(0, 10) = 0.
- th1 = atan2(b1-cb, a1-ca) = atan2(10, 0) = π/2.
- CCW: sweep = th1-th0 = π/2 - 0 = π/2 (≈1.5708). In (0, 2π]. ✓
- arc = 10·π/2 = 15.708 mm. off = z1-z0 = 0. moveLen = 15.708. ✓ Matches test (0.9425s).

**CW version** (G2, same geometry): cw=true, sweep = th0-th1 = 0 - π/2 = -π/2. Normalize: `while (sweep <= ARC_EPS) sweep += TWO_PI` → -π/2 + 2π = 3π/2 (≈4.712). arc = 10·3π/2 = 47.12 mm. That's the major (270°) arc — **correct**, because going CW from (10,0) to (0,10) around center (0,0) is the long way around. ✓ Sweep direction logic is right.

**Full circle** (start==end, e.g. `G3 X10 Y0 I-10 J0` from (10,0)): th0=atan2(0,10)=0, th1=atan2(0,10)=0, sweep=0-0... wait CCW: th1-th0=0. Normalize: `while (sweep <= ARC_EPS) sweep += TWO_PI` → 0 ≤ 1e-9 true → sweep=2π. ✓ Yields 2π, not 0. Correct.

**Point 3 — R-form:** Quarter R10: chordXY=sqrt(10²+10²)=14.142, half=asin((14.142/2)/10)=asin(0.7071)=π/4. R>0 → sweep=2·π/4=π/2. arc=10·π/2=15.708. ✓ Major arc (R<0): sweep=2π-π/2=3π/2. ✓ Degenerate guard `chordXY > 2*r` → returns chord. ✓

Now let me check the out-of-plane (helical) component logic for the R-form, since the function signature passes `dz` but the comment says "G17 XY plane assumed" — and check a subtle G18/G19 helical axis issue.

For **R-form helical**: `arcLengthMm` line 118 calls `arcLengthFromR(x0, y0, x1, y1, z1 - z0, R, chord)`. This hard-codes XY plane and Z as out-of-plane. If an R-form arc were on the G18/G19 plane, this would be w
... [+1880 chars truncated]

### Assistant | 2026-06-12T17:31:52.634Z

[tool_use: Read]

### User | 2026-06-12T17:31:53.499Z

[tool_result] 122	
123	  const radius = Math.sqrt((a0 - ca) * (a0 - ca) + (b0 - cb) * (b0 - cb));
124	  if (!(radius > 0)) return chord;
125	  const th0 = Math.atan2(b0 - cb, a0 - ca);
126	  const th1 = Math.atan2(b1 - cb, a1 - ca);
127	  let sweep = cw ? th0 - th1 : th1 - th0;
128	  // Normalize sweep into (0, 2pi]. A specified-endpoint arc whose start==end is a full circle.
129	  while (sweep <= ARC_EPS) swee
... [+155 chars truncated]

### Assistant | 2026-06-12T17:32:07.542Z

I've confirmed the implementation. Now let me reason through the inconsistent-endpoint adversarial case rigorously.

**Adversarial case: IJK inconsistent with endpoint.** Consider a near-degenerate sweep. Suppose start=(10,0), center=(0,0) so radius=10, but endpoint is placed at (9.9, 0.1) with a tiny intended sweep. th0=atan2(0,10)=0, th1=atan2(0.1, 9.9)≈0.0101 rad. CCW sweep≈0.0101. arc=10·0.0101=0.101 mm. The actual chord between (10,0) and (9.9,0.1)=sqrt(0.01+0.01)=0.1414 mm. Here **arc (0.101) < chord (0.1414)!** 

Wait — but is this a *real* arc? The endpoint (9.9, 0.1) is at radius sqrt(9.9²+0.1²)=9.9005, not 10. So I/J are inconsistent with the endpoint. The chord uses the true endpoint; the arc uses radius-from-start × sweep-of-actual-angles. When endpoint radius < start radius, arc can dip below chord. This means the "fix can only ADD length" invariant **can be violated for malformed/over-specified arcs** — but this requires inconsistent G-code, which real posted programs don't emit (the controller would alarm). Let me verify whether this is reachable in practice and whether it produces a *worse-than-prior* result. Since prior behavior was always chord, and this path can return < chord, it's a **theoretical regression** for malformed input only. I'll note it as P1 (edge case), not P0, since well-formed G-code (the live pipeline's input from real JM Die posts) satisfies endpoint-on-circle.

Now let me check one more genuinely concerning thing — the **parseNumber regex for `R`** and whether a fallback NaN can occur, plus the `continue` interaction at line 207.

**NaN/Infinity check:** All inputs (I/J/K/R) come from `parseNumber` → `parseFloat` of a matched numeric, or null. No NaN from parsing. radius guard catches NaN. asin in R-form: guarded by `chordXY > 2*r` → fallback before asin domain error. `Math.asin` of value in [-1,1] is finite. sweep is finite. **No NaN/Infinity path for real arcs.** ✓

Let me verify the integration wiring point — confirm this is
... [+64 chars truncated]

### Assistant | 2026-06-12T17:32:09.043Z

[tool_use: Grep]

### User | 2026-06-12T17:32:12.843Z

[tool_result] 82:    time_in_cut_min?: number;
124:        const { gCodeTimeEstimatorEngine } = await import("./GCodeTimeEstimatorEngine.js");
125:        const analysis = gCodeTimeEstimatorEngine.analyze(pipeline.gcode_text, {
131:          const autoCycleMin = analysis.total_time_s / 60;
152:            time_in_cut_min: round2(analysis.time_in_cut_s / 60),

### Assistant | 2026-06-12T17:32:40.381Z

Confirmed LIVE: the bridge imports the engine and feeds `total_time_s` / `time_in_cut_s` directly into the quote `autoCycleMin` and `time_in_cut_min`. The undercount bias is real-money relevant (quoted cycle time biased low → underquoting on arc-heavy parts).

I have completed the rigorous end-to-end review. Here are my findings.

---

## Review: Arc-Length Geometry Fix (U-QP-TIME-BUGS, G7)

File: `H:\prism\mcp-server\src\engines\GCodeTimeEstimatorEngine.ts`

### Math verification (all PASS)

**Point 1 — IJK plane + center + helical axis:** Center = start + offset is correct in all three planes (lines 112/114/116: `ca = x0 + I`, etc.). Plane detection (I&J→G17, I&K→G18, J&K→G19) is correct. Out-of-plane axis added as `sqrt(arc² + off²)` (line 132) with `off` = the correct third-axis delta per plane (z for G17, y for G18, x for G19). Verified correct.

**Point 2 — Sweep angle:** Walked a quarter-arc both directions concretely. CCW G3 (10,0)→(0,10) center (0,0): th0=0, th1=π/2, sweep=π/2=15.708mm — matches the test's hand-computed 0.9425s. CW G2 same endpoints: sweep normalizes to 3π/2 (the 270° long-way arc) — geometrically correct for CW. Full circle (start==end): sweep normalizes `0 → 2π` via line 129, not 0. Verified correct.

**Point 3 — R-form:** Minor (R>0): `2·asin((chord/2)/r)`; major (R<0): `2π − that`. Degenerate guard `chordXY > 2*r → chord` (line 84) fires before any `asin` domain error. Verified correct.

**Point 4 — Units:** I/J/K/R converted via the same `state.unitsMm` flag as X/Y/Z (lines 225-229, `toMm`), endpoints already mm, offsets mm before entering `arcLengthMm`. Feed `F` also converts in G20 (line 201). The inch test (radius 2in→50.8mm, F50→1270mm/min, 3.77s) confirms consistency. Verified correct — no unit mismatch.

**Point 5 — Fallback safety:** `radius>0` guard (line 124, also catches NaN), `chordXY<=0 || >2r` guard (line 84), the `R===0` and all-null fallbacks (lines 117-120) all return `chord`. No NaN/Infinity path for well-formed arcs. 
... [+2933 chars truncated]
