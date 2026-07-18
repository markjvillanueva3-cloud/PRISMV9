---
type: "chat-session"
source: "claude-code-cli"
session_id: "2f55d9ce-0749-4227-94f1-5aa3fc0d94a0"
title: "Review this file END-TO-END for correctness, silent failures, and parsing bugs: "
date: "2026-06-03"
first_ts: "2026-06-03T20:34:24.135Z"
last_ts: "2026-06-03T20:39:38.719Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 11
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/2f55d9ce-0749-4227-94f1-5aa3fc0d94a0/subagents/agent-a10d1a97dbb16cf57.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review this file END-TO-END for correctness, silent failures, and parsing bugs: 

> **claude-code-cli** | 2026-06-03 | 32 msgs (11 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2f55d9ce-0749-4227-94f1-5aa3fc0d94a0/subagents/agent-a10d1a97dbb16cf57.jsonl`

## Transcript

### User | 2026-06-03T20:34:24.135Z

Review this file END-TO-END for correctness, silent failures, and parsing bugs:

FILE: H:/prism/mcp-server/scripts/mill-print-to-program-roundtrip-accuracy.ts

CONTEXT / CONTRACT it must satisfy:
- It is the MILL analog of the proven lathe harness mcp-server/scripts/lathe-print-to-program-roundtrip-accuracy.ts.
- Purpose: read JM Die master mill G-code programs (Haas/Hurco/Roku-Roku .NC, Okuma .MIN), parse ground-truth params (spindle RPM, feed, op categories), derive a MillingInput, regenerate a program via `millingPrintToProgramEngine.runFullPipeline()` (imported dynamically after a __dirname shim), then diff regenerated params vs the master and emit state/shared/dashboards/mill-roundtrip-accuracy.{json,md}.
- The engine API is authoritative: MillingInput { part_number?, material{material_name, iso_group, hardness_hrc?, is_hardened?}, stock_size{x,y,z}, features: MillingFeature[], controller?, machine?, machine_brand?, optimization_target? }. MillingFeature requires `depth_mm`. MillingProgramResult.operations[].cutting_params has { spindle_rpm, feed_mm_min, feed_per_tooth_mm, cutting_speed_m_min, depth_of_cut_mm, width_of_cut_mm }.
- R12 DISCIPLINE (critical): the harness must NOT fabricate a 100% accuracy claim. It must report the REAL measured number with honest limitations. Verify it does this and that no axis is silently inflated.

FOCUS YOUR REVIEW ON:
1. The G-code ground-truth parser (parseGroundTruth): are the regexes for S (RPM), F (feed), canned cycles (G81/82/83/73 drill, G84/74 tap, G85-89/76 bore, G80 cancel), units (G20/G21), and feed mode (G94/G95) correct? Any case where a value is captured wrong or a rapid move is mistaken for a cut?
2. Feed normalization (feedMmMin): G94 ipm vs G95 ipr→mm/min via RPM. Any NaN/unit-scaling escape? The Okuma .MIN feed exclusion (feedReliable=!isOkuma) — is it actually wired so .MIN feeds never enter feedByCat while RPM still does?
3. Scoring (scoreParam, withinBand, systematic-bias geomean ratios): any divide-by-ze
... [+710 chars truncated]

### Assistant | 2026-06-03T20:34:36.173Z

I'll review this file end-to-end. Let me start by reading the target file and the proven lathe analog it's based on.

### Assistant | 2026-06-03T20:34:36.174Z

[tool_use: Read]

### User | 2026-06-03T20:34:53.881Z

[tool_result] 1	#!/usr/bin/env npx tsx
2	/**
3	 * mill-print-to-program-roundtrip-accuracy.ts — slot:foxtrot (Milling Wizard)
4	 * ===========================================================================
5	 * The MILL analog of whiskey's lathe-print-to-program-roundtrip-accuracy.ts —
6	 * the TRUE print→program→post roundtrip accuracy measurement the work order
7	 * asks for ("read print, write program, post
... [+42286 chars truncated]

### Assistant | 2026-06-03T20:34:57.260Z

Let me read the proven lathe analog to compare against the contract.

### Assistant | 2026-06-03T20:34:58.052Z

[tool_use: Read]

### User | 2026-06-03T20:35:10.657Z

[tool_result] 1	#!/usr/bin/env npx tsx
2	/**
3	 * lathe-print-to-program-roundtrip-accuracy.ts — slot:whiskey (Lathe Wizard)
4	 * ==========================================================================
5	 * RUNG B of WHISKEY-LATHE-ACCURACY — the TRUE print→program→post roundtrip
6	 * accuracy measurement ("read print, write program, post g-code, compare to
7	 * existing programs"). One-shot scorer. Shares it
... [+11984 chars truncated]

### Assistant | 2026-06-03T20:35:16.650Z

Now let me verify the engine API contract to confirm field names and the result shape the harness reads.

### Assistant | 2026-06-03T20:35:17.040Z

[tool_use: Grep]

### User | 2026-06-03T20:35:25.145Z

[tool_result] 194:  spindle_rpm: number;
195:  feed_mm_min: number;
196:  feed_per_tooth_mm: number;
219:  operation_type: MillingOpType;
221:  cutting_params: MillingCuttingParams;
264:  max_spindle_rpm?: number;
292:export interface MillingProgramResult {
293:  success: boolean;
311:  total_tool_changes: number;
640:  const feedDrill = Math.round(params.feed_mm_min);
678:  const feedCut = Math.round(params.fe
... [+3484 chars truncated]

### Assistant | 2026-06-03T20:35:29.475Z

Let me verify the key engine details: the `runFullPipeline` entry point, `MillingOpType` values (to validate `regenCatOf`), the `MillingFeature` type (to confirm required `depth_mm`), and `MillingController` values.

### Assistant | 2026-06-03T20:35:30.172Z

[tool_use: Read]

### User | 2026-06-03T20:35:40.850Z

[tool_result] 180	    | "chamfer_mill" | "thread_mill" | "boring_bar" | "slot_drill";
181	  diameter_mm: number;
182	  corner_radius_mm: number;
183	  flutes: number;
184	  flute_length_mm: number;
185	  stick_out_mm: number;
186	  holder_type: string;
187	  taper: MillingTaper;
188	  material: "carbide" | "HSS" | "ceramic" | "CBN" | "PCD";
189	  coating: string;
190	}
191	
192	/** Milling cutting parameters. *
... [+5251 chars truncated]

### Assistant | 2026-06-03T20:35:45.427Z

Now let me check the `MillingOpType` definition (line ~178) and `runFullPipeline` signature/behavior to validate `regenCatOf` mapping and confirm the entry point name.

### Assistant | 2026-06-03T20:35:46.504Z

[tool_use: Read]

### User | 2026-06-03T20:36:01.534Z

[tool_result] 155	  material_name: string;
156	  iso_group: ISOGroup;
157	  hardness_hrc?: number;
158	  /** True when working hardened die steel (H13/D2/M2 at HRC > 50) */
159	  is_hardened?: boolean;
160	}
161	
162	/** Tool holder taper types at JM Die. */
163	export type MillingTaper = "CAT40" | "BBT40" | "HSK_A63" | "R8";
164	
165	/** Milling machine controller dialects. */
166	export type MillingController
... [+458 chars truncated]

### Assistant | 2026-06-03T20:36:09.579Z

Now let me find the `MillingOpType` definition to validate `regenCatOf`, and confirm `runFullPipeline` exists as a method.

### Assistant | 2026-06-03T20:36:10.989Z

[tool_use: Grep]

### User | 2026-06-03T20:36:21.990Z

[tool_result] 140:export type MillingOpType =
141-  | "face_rough" | "face_finish"
142-  | "pocket_rough" | "pocket_semi_finish" | "pocket_finish"
143-  | "slot_rough" | "slot_finish"
144-  | "adaptive_rough" | "trochoidal_slot"
145-  | "contour_rough" | "contour_finish"
146-  | "drill_center" | "drill_peck" | "drill_through"
147-  | "ream" | "bore_semi" | "bore_finish"
148-  | "tap_rigid" | "thread_mill"
149- 
... [+1444 chars truncated]

### Assistant | 2026-06-03T20:36:31.117Z

Now I have everything I need to validate the regenCatOf mapping. Let me analyze the critical `regenCatOf` against the actual `MillingOpType` values. This is a key finding.

The `MillingOpType` values include `drill_center`, `drill_peck`, `drill_through`, `bore_semi`, `bore_finish`, `tap_rigid`, `ream`, `thread_mill`, etc. Let me trace `regenCatOf` ordering carefully:

```js
function regenCatOf(opType: string): OpCat {
  if (/tap/.test(opType)) return "tap";
  if (/ream/.test(opType)) return "ream";
  if (/bore/.test(opType)) return "bore";
  if (/thread/.test(opType)) return "thread";
  if (/drill/.test(opType)) return "drill";
  return "mill_cut";
}
```

I notice a potential issue: `thread_mill` matches `/thread/` → "thread". But the master GT never produces a "thread" category — `parseGroundTruth` only produces `tap` for G84/G74. Let me verify the scoring implications and check the OpCat type. Let me also examine the systematic-bias accumulator duplication concern and the `nSkipped` reconciliation. Let me re-examine specific lines.

### Assistant | 2026-06-03T20:36:31.888Z

[tool_use: Read]

### User | 2026-06-03T20:36:49.815Z

[tool_result] 304	  for (const raw of text.split(/\r?\n/)) {
305	    const line = raw.trim();
306	    if (!line || line.startsWith("(") || line.startsWith(";")) continue;
307	    const u = line.toUpperCase();
308	
309	    // Tool count: T-word and its M06 are often on separate lines (N50 T1 / M06),
310	    // so track the most-recent T-word and bank it whenever an M06 fires.
311	    const mT = u.match(RE_TOOL);
... [+3149 chars truncated]

### Assistant | 2026-06-03T20:37:05.548Z

Now I have a complete picture. Let me work through each focus area carefully and check the most subtle issues.

**Critical check 1 — the `RE_F` feed regex capturing rapid-move issue and a G-word collision.** The `RE_S` regex is `/\bS(\d+(?:\.\d+)?)/i`. The word-boundary `\b` before `S`. Consider an O-number or N-line. Let me check whether `RE_S` could match the `S` inside other tokens — `\b` handles that. 

**Critical check 2 — feed `F` false-capture from `G` words or coordinates.** `RE_F = /\bF(\d*\.\d+|\d+\.?\d*)\b/i`. Consider a line like `G01 X1.0 F5.0`. `\bF5.0\b` matches. But also consider whether `F` appears in a comment or coordinate. Comments are stripped at line start only (`startsWith("(")`), not inline. Let me check the systematic-bias double-computation and the more subtle scoring issues. Let me look at the bias accumulator region once more and the `RE_GMOVE` for arcs.

I have all I need. Let me also verify one concern about the `RE_S` regex matching `S` in tool/spindle and a key edge: does `feedMmMin`'s ipr branch produce a NaN escape. Let me re-read the relevant scoring/bias block.

### Assistant | 2026-06-03T20:37:05.549Z

[tool_use: Read]

### User | 2026-06-03T20:37:11.788Z

[tool_result] 519	
520	    // op coverage: of the categories the master used, how many did PRISM plan?
521	    let opM = 0, opC = 0;
522	    for (const cat of gt.cats) { opC++; if (rp.cats.has(cat)) opM++; else (missByCat[cat] ??= { rpm: 0, feed: 0, op: 0 }).op++; }
523	
524	    const rpm = scoreParam(gt.rpmByCat, rp.rpmByCat, args.band);
525	    const feed = scoreParam(gt.feedByCat, rp.feedByCat, args.band);
5
... [+3057 chars truncated]

### Assistant | 2026-06-03T20:37:27.280Z

I now have a thorough understanding. Let me verify one final concern: the `RE_BORE` regex `/\bG8([5-9])\b|\bG76\b/` — does it correctly handle the G89 boundary, and is there a collision between the drill `G73` regex and any G-move. Also confirm `mZ` triggering canned-cycle param sampling for a rapid retract. Let me check the corpus dir buckets and `bucketOf` edge.

I have enough to render the full review. Let me do a final trace of the most consequential measurement-integrity issue I've spotted: the canned-cycle sampling guard at line 336 includes `mZ` as a trigger, which means a rapid Z retract (`G00 Z...`) inside an active canned cycle window would sample modalS/modalF. But canned cycles in G-code don't use G00 retracts mid-cycle — the cycle is modal until G80. This is acceptable. 

Let me confirm the more serious issue: the `parseGroundTruth` extents and a degenerate case in `deriveInput`, plus whether the `tap` category produces a `thread`-typed regen op that never matches.

The regen op for `tap` feature is `thread_internal` → produces `tap_rigid` op type (per engine line 1803). `regenCatOf("tap_rigid")` → `/tap/` matches → "tap". Good, that aligns. The `thread_mill` op type would map to "thread", but the GT never has a "thread" category (only "tap"), so no mismatch there. 

Now let me verify the actual concern around `RE_F` and a number like `F.005` vs feed mode, and the IPR NaN. Let me confirm `feedMmMin` clamp catches NaN: `clampNum(NaN, 1, 50000)` → `Number.isFinite(NaN)` is false → returns false → returns null. Good, NaN escape is handled.

Let me check one real correctness bug candidate: line 316 `RE_S` clamp `clampNum(s, 30, 60000)`. A spindle of e.g. S2000 is fine. But what about a line `G54 S0 M05`? S0 rejected. Fine.

Let me verify the genuine bug I suspect in the `feed` regex capturing the wrong token. Let me check a concrete pathological line and the `RE_GMOVE` arc handling for measurement.

### Assistant | 2026-06-03T20:37:38.380Z

[tool_use: Bash]

### User | 2026-06-03T20:37:54.733Z

[tool_result] {"l":"G01 X1.5 Y2.0 F12.5","F":"12.5","move":"1"}
{"l":"N100 G83 Z-0.5 R0.1 Q0.1 F5.0","F":"5.0"}
{"l":"G00 X0 Y0","move":"0"}
{"l":"S5000 M03","S":"5000"}
{"l":"X1.234 F.005","F":".005"}
{"l":"G43 H1 Z1.0","gmove":null}
{"l":"G02 X1 Y1 I0.5 J0","gmove":"2"}
{"l":"G03 X2 Y2 R1","gmove":"3"}
{"l":"G28 X0","gmove":null}
{"l":"G01 X1 F10 (FEED F50 RAPID)","F":"10"}
{"l":"(TOOL 1 F100)","F":"100"}
{"l
... [+140 chars truncated]

### Assistant | 2026-06-03T20:38:05.277Z

The regexes behave well: arc moves (G2/G3) correctly counted as cuts, G43/G28 correctly ignored, NaN/unit handling solid. But the test confirms two real bugs I suspected:

1. **`G00` rapid moves are counted as cuts** — wait, no: `isCut` checks `mMove[1] === "1"|"2"|"3"`, so G00 returns "0" and is excluded. Good.

2. **Inline comment F-word leak confirmed**: line `(TOOL 1 F100)` is a full-line comment (stripped at line start). But `G01 X1 F10 (FEED F50 RAPID)` correctly captured F10 (first match wins, F50 in comment ignored). The full-line comment `(TOOL 1 F100)` — wait, that starts with `(` so it's stripped at line 306 before regex runs. Confirmed no leak there.

Let me confirm one more important measurement-integrity issue: the bias loops (lines 526-543) call `median()` **four times per category per file** redundantly, but more importantly — there's a subtle asymmetry between the miss-counting loop and the bias loop. Let me also double-check the `nSkipped` reconciliation accounting and confirm there are no actual P0 crashes. Let me do a final focused check on `deriveInput` degenerate extents and the `walk`/`bucketOf` correctness.

### Assistant | 2026-06-03T20:38:14.170Z

[tool_use: Bash]

### User | 2026-06-03T20:39:00.930Z

[tool_result] degenerate (0,0,0): {"sx":100,"sy":100,"depth":10,"sz":25}
tiny (0.5,0.5,0.3): {"sx":100,"sy":100,"depth":10,"sz":25}
normal (200,150,30): {"sx":220.00000000000003,"sy":165,"depth":30,"sz":36}
huge depth (10,10,800): {"sx":25,"sy":25,"depth":800,"sz":806}
hole dia @depth 2: 3
hole dia @depth 10: 10
hole dia @depth 800: 20
bucket nested: ROKU-ROKU/CUST
bucket flat: ROKU-ROKU

### Assistant | 2026-06-03T20:39:38.719Z

The derive-input floors and stock are all finite and non-degenerate — no NaN/zero stock can crash the engine. The huge-depth case (Z-800mm from a malformed coordinate) produces sz=806mm stock, which is clamped at extents-level by `clampNum(z, -1000, 1000)`, so it's bounded.

I now have a complete picture. Let me write up the findings.

## Review Complete

I reviewed `H:/prism/mcp-server/scripts/mill-print-to-program-roundtrip-accuracy.ts` end-to-end against the engine API (`MillingPrintToProgramEngine.ts`), validated all the ground-truth regexes against representative G-code with executable tests, and confirmed the `deriveInput` stock floors and `bucketOf` path logic. Findings below.

---

### P0 findings (correctness / crash / silent-wrong-result)

**None.** I specifically chased every crash and silent-wrong vector in the focus list and could not produce one:
- Engine API contract is correct: `runFullPipeline(MillingInput)` exists (line 2007), returns `success`/`operations[]`/`total_tool_changes`, and `cutting_params` carries `spindle_rpm`/`feed_mm_min`/`feed_per_tooth_mm` (lines 193-201) exactly as the harness reads at lines 435/441-443.
- `regenCatOf` (lines 417-423) maps every real `MillingOpType` correctly: `tap_rigid`→tap, `ream`→ream, `bore_semi`/`bore_finish`→bore, `drill_*`→drill, `thread_mill`→thread, everything else→mill_cut. Order is correct (tap before thread, so `tap_rigid` isn't stolen by a `thread` rule — it has no "thread" substring anyway).
- Feed NaN/unit escape is closed: `feedMmMin` (lines 297-302) routes the G95 ipr-without-rpm case to `NaN`, and `clampNum(NaN,…)` returns false → `null`. No NaN reaches `feedByCat`.
- Okuma `.MIN` feed exclusion is correctly wired (line 271 `feedReliable=!isOkuma`; gated at the two push sites lines 339/350) — `.MIN` RPM still enters `rpmByCat` (lines 337/348, ungated), feed never does. Correct.
- BLOCK_EXT + NC-signature gate (lines 113, 359-362): `.mcx-8`-style binaries are blocked by `BLOCK_EXT`; anything slip
... [+3959 chars truncated]
