---
type: "chat-session"
source: "claude-code-cli"
session_id: "571d4bdd-5118-4307-b29c-fa75fed32e14"
title: "RE-REVIEW (round 2) of `H:\\prism\\scripts\\lib\\cnc-ground-truth-lib.mjs` — read th"
date: "2026-05-19"
first_ts: "2026-05-19T00:46:40.485Z"
last_ts: "2026-05-19T00:48:49.833Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-acefd2cdabacca701.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# RE-REVIEW (round 2) of `H:\prism\scripts\lib\cnc-ground-truth-lib.mjs` — read th

> **claude-code-cli** | 2026-05-19 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-acefd2cdabacca701.jsonl`

## Transcript

### User | 2026-05-19T00:46:40.485Z

RE-REVIEW (round 2) of `H:\prism\scripts\lib\cnc-ground-truth-lib.mjs` — read the WHOLE file fresh. Your round-1 review returned FAIL with these findings, which were addressed by a full rewrite:

- P0 `nominal_mm` vs `nominal` seam break → RESOLVED by making the lib **presence-only** (no nominals emitted at all; matches the proven CAD-half contract; the benchmark's `allGtPresenceOnly` path grades it).
- P0 decimal sub-cycles `G84.2`/`G83.1` not matched by `hasG` → FIXED: tokenizer now `Math.trunc`s G/M numbers to the integer family.
- P0 G85/86/76/89 bore-X false nominal + P0 G81/82/83 abs-Z false nominal → ELIMINATED (presence-only).
- P1 `detectUnits` malformed regex + INCH/METRIC order → FIXED (bare "MM" dropped — it false-matched "TIME=HH:MM"; explicit G20/G21 first, then INCH, then METRIC).
- P1 lathe X-span radius/diameter ambiguity → ELIMINATED (presence-only).
- P1 G50/G70/G73 mill over-trigger → FIXED: `isLathe` is now set ONLY by G96 (unambiguous CSS); G73 removed from turning cycles (it's mill peck-drill) and added to DRILL_CYCLES; `stepped_revolved_axis` requires `isLathe && (hasFeedCut || sawLatheTurnCycle)`.
- P1 C-word→chamfer / G2-G3→fillet / X+Z→taper noise → REMOVED (vocabulary tightened to exactly 3 defensible kinds: central_oil_hole, cross_drilled_relief_holes, stepped_revolved_axis).
- P1 false "modal G persists" docstring → FIXED (honest docstring + explicit active-drill-cycle latch for canned-cycle repeat lines).
- P1 M98 silent drop → mitigated (`derivation.subprogram_calls` surfaces unexpanded-subprogram coverage caveat).
- P1 part-class vocab divergence → FIXED (heuristic values unified with the cad sibling).

Verify the rewrite ACTUALLY resolves each, and hunt for NEW defects introduced by the rewrite. Re-read the sibling `H:\prism\scripts\lib\cad-ground-truth-lib.mjs` and consumer `H:\prism\scripts\lib\ocr-benchmark-lib.mjs` to confirm contract compatibility (record shape, `groupRecordsByPartClass` output, presence-only path). Domain-chec
... [+213 chars truncated]

### Assistant | 2026-05-19T00:46:59.852Z

I'll review the rewritten file fresh and verify it against the siblings and consumer.

### Assistant | 2026-05-19T00:47:00.237Z

[tool_use: Read]

### Assistant | 2026-05-19T00:47:01.129Z

[tool_use: Read]

### Assistant | 2026-05-19T00:47:01.134Z

[tool_use: Read]

### User | 2026-05-19T00:47:09.391Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cad-ground-truth-lib.mjs' was already read 23m ago in this session and is unchanged (mtime 1779124930840). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T00:47:09.403Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ocr-benchmark-lib.mjs' was already read 15m ago in this session and is unchanged (mtime 1779124814219). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T00:47:15.004Z

[tool_result] 1	// scripts/lib/cnc-ground-truth-lib.mjs
2	//
3	// U-TDP06 - CNC-derived Ground Truth (pure core).
4	//
5	// Converts a CNC program's G/M-code content into BlueprintExtraction-shape
6	// ground-truth records for the U-TDP04 OCR-extraction benchmark. This is the
7	// CNC half of the user directive "you can also compare to cad files and cnc
8	// programs to determine if you extracted the correct da
... [+12381 chars truncated]

### Assistant | 2026-05-19T00:47:18.822Z

The siblings are already in my context from earlier in the session. Let me work from those. Let me grep the consumer for the exact presence-only grading path and record-shape contract to verify compatibility precisely.

### Assistant | 2026-05-19T00:47:20.521Z

[tool_use: Grep]

### Assistant | 2026-05-19T00:47:21.412Z

[tool_use: Grep]

### User | 2026-05-19T00:47:24.502Z

[tool_result] 121:    // presence_only AND there's ≥1 extracted entry, treat as match without
124:    const gPresenceOnlyCount = gList.filter((d) => d?.presence_only === true).length;
125:    const allGtPresenceOnly = gList.length > 0 && gPresenceOnlyCount === gList.length;
127:    if (allGtPresenceOnly) {
141:        if (g?.presence_only === true) {
154:          // Malformed GT entry (no presence_only flag AN
... [+47 chars truncated]

### User | 2026-05-19T00:47:25.875Z

[tool_result] 7:// so emitted GT entries use presence_only: true.
16:  { token: "punch",    part_class: "extrude_punch" },
17:  { token: "die",      part_class: "die" },
18:  { token: "shaft",    part_class: "shaft" },
19:  { token: "bushing",  part_class: "bushing" },
20:  { token: "bracket",  part_class: "bracket" },
21:  { token: "casing",   part_class: "casing" },
22:  { token: "plate",    part_class: "plat
... [+1607 chars truncated]

### Assistant | 2026-05-19T00:47:28.747Z

Let me see the full grading path in the consumer and the cad sibling's groupRecordsByPartClass output shape to confirm exact contract parity.

### Assistant | 2026-05-19T00:47:33.655Z

[tool_use: Read]

### Assistant | 2026-05-19T00:47:33.801Z

[tool_use: Read]

### User | 2026-05-19T00:47:43.919Z

[tool_result] 100	    byKindE.get(k).push(d);
101	  }
102	  for (const d of gDims) {
103	    const k = typeof d?.kind === "string" ? d.kind : "unspecified";
104	    if (!byKindG.has(k)) byKindG.set(k, []);
105	    byKindG.get(k).push(d);
106	  }
107	
108	  const allKinds = new Set([...byKindE.keys(), ...byKindG.keys()]);
109	  const byKind = {};
110	  let tp = 0, fp = 0, fn = 0;
111	  const dimErrors = [];
112	
... [+2779 chars truncated]

### User | 2026-05-19T00:47:44.192Z

[tool_result] 92	export function groupRecordsByPartClass(records) {
93	  const grouped = new Map();
94	  for (const r of Array.isArray(records) ? records : []) {
95	    if (!r || typeof r.part_class !== "string") continue;
96	    if (!grouped.has(r.part_class)) grouped.set(r.part_class, []);
97	    grouped.get(r.part_class).push({
98	      pdf_path: r.pdf_path,
99	      cad_source: r.cad_source,
100	      dimen
... [+389 chars truncated]

### Assistant | 2026-05-19T00:48:49.833Z

I have everything needed. Let me verify the round-1 findings and hunt for new defects.

## Round-1 finding verification

**P0 `nominal_mm` vs `nominal` seam break → RESOLVED.** The lib now emits `dimensions: kinds.map((k) => ({ kind: k, presence_only: true }))` (line 205) — byte-identical to the cad sibling (cad line 81). The consumer's `allGtPresenceOnly` path (lines 124-133) keys exclusively on `d?.presence_only === true`; no `nominal`/`nominal_mm` field is read for presence GT. Seam closed. ✓

**P0 decimal sub-cycles `G84.2`/`G83.1` → FIXED.** Tokenizer regex `/[A-Z][-+]?\d*\.?\d*/g` captures `G84.2` whole; `Number("84.2")=84.2`; `Math.trunc(84.2)=84` (line 107). `hasAnyG` against `DRILL_CYCLES` (incl. 84, 83) now matches. ✓

**P0 G85/86/76/89 + G81/82/83 false nominals → ELIMINATED.** No nominal emission anywhere; presence-only. ✓ (Note: G76 is not in `DRILL_CYCLES` — it's a thread cycle; correct to omit. Boring G85/86/89 present.)

**P1 `detectUnits` regex + order → FIXED.** Lines 78-82: explicit `G21`→metric, `G20`→inch (boundary-guarded `(^|[^.\d])` so `G210` won't false-match), then `\bINCH\b`, then `\bMETRIC\b`. Bare "MM" dropped. The `[^.\d]` guard correctly prevents `G2` matching `G20`/`G21` and decimal `G20.1`. ✓

**P1 lathe X-span radius/diameter → ELIMINATED** (presence-only). ✓

**P1 G50/G70/G73 mill over-trigger → FIXED.** `isLathe` set ONLY by `hasG(op, 96)` (line 143). G73 moved to `DRILL_CYCLES` (line 60), removed from `LATHE_TURN_CYCLES` (line 66). `stepped_revolved_axis` gated on `isLathe && (hasFeedCut || sawLatheTurnCycle)` (line 177). ✓

**P1 C-word/G2-G3/X+Z noise → REMOVED.** Vocabulary is exactly 3 kinds (lines 147, 172, 177), strict subset of cad's 9. ✓

**P1 docstring honesty → FIXED.** Lines 86-90 honestly state per-line, no modal carry, latch handled separately. ✓

**P1 M98 → mitigated.** `subprogramCalls` counted (line 138), surfaced in `derivation.subprogram_calls` (line 212) with R12 caveat. ✓

**P1 part-class vocab divergence → FIX
... [+8037 chars truncated]
