---
type: "chat-session"
source: "claude-code-cli"
session_id: "321c1d3f-573b-4b70-b640-f87f9336e18a"
title: "Review a NEW safety-critical CNC post-processor engine that emits REAL Haas mill"
date: "2026-06-01"
first_ts: "2026-06-01T17:14:29.595Z"
last_ts: "2026-06-01T17:16:39.551Z"
cwd: "H:\\prism\\mcp-server"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/agent-a7818ff99f015f728.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review a NEW safety-critical CNC post-processor engine that emits REAL Haas mill

> **claude-code-cli** | 2026-06-01 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/agent-a7818ff99f015f728.jsonl`

## Transcript

### User | 2026-06-01T17:14:29.595Z

Review a NEW safety-critical CNC post-processor engine that emits REAL Haas mill G-code. Read END TO END:
- H:/prism/mcp-server/src/engines/HaasNGCMillMasterPostEngine.ts (the engine)
- H:/prism/mcp-server/src/__tests__/HaasNGCMillMasterPostEngine.test.ts (its tests)
- The router branch in H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts (search for `haasNGCMillMasterPostEngine` / `U-PT-HAAS-ENGINE`)

GROUND TRUTH: the engine structure was mirrored from a REAL JM Die Haas mill program at `H:/prism/JM DIE/CNC MILL HAAS/ALL STAR/ALL STAR.NC` — read that file too and compare. The real structure: `%` / `O#` / `(comments)` / `(tool list)` / `N# G20|G21` / `N# G0 G17 G40 G49 G80 G90` / per-op `T# M6` | `G0 G90 G54 X.. Y.. S.. M3` | `G43 H# Z..` | `M8` | moves | `M5` | `G91 G28 Z0. [M9]` | `M01` / footer `M5`/`G91 G28 Z0.`/`G28 X0. Y0.`/`M30`/`%`.

CONFORMANCE: it was proven via `scripts/haas-post-proof.ts` → all 3 corpus jobs 0 dialect-ERR + structural-100% (same bar the Hurco/Okuma posts met). 25/25 unit tests pass.

Verify (flag P0/P1 — a wrong G-code emit could CRASH a real machine):
1. DIALECT CORRECTNESS vs real Haas: () comments (not Okuma []), G20/G21 units, G54-G59 work offsets, M8/M9 coolant ordering, M3 spindle, G43 H# tool-length, G0/G1/G2/G3 moves, M30 end. Any code that would parse-error or mis-execute on a real Haas VF-2?
2. G187 high-speed smoothing: correct that it's OFF by default + opt-in (real older JM programs have none), and P1 rough/P3 finish mapping sane for Haas NGC?
3. PHYSICS: Kienzle Fc + Taylor life imported from canonical constants (NOT inlined)? Any inlined material/Kienzle/Taylor constant? Machine limits (8100 RPM, force) reasonable for VF-2?
4. UNITS-FIRST safety: does a units mismatch get handled (G20 inch vs G21 mm)? Any 25.4× scale hazard?
5. EDGE/FAILURE: empty ops → structured error (not throw)? NaN/Infinity feed? unknown move type fail-soft? coordinate with missing z?
6. Tests real (reference values, not stubs)? Do they asse
... [+163 chars truncated]

### Assistant | 2026-06-01T17:14:48.123Z

I'll review the engine end-to-end. Let me read all four files in parallel.

### Assistant | 2026-06-01T17:14:48.659Z

[tool_use: Read]

### Assistant | 2026-06-01T17:14:49.673Z

[tool_use: Read]

### Assistant | 2026-06-01T17:14:49.975Z

[tool_use: Read]

### User | 2026-06-01T17:15:06.908Z

[tool_result] 1	/**
2	 * HaasNGCMillMasterPostEngine — full PRISM master post for Haas mill controls
3	 * (Next-Gen-Control + classic). slot:echo, POST-TRAIN-MS0/U-PT-HAAS-ENGINE (2026-06-01).
4	 *
5	 * WHY: closes condition-2's full-post-coverage GAP for Haas. JM Die VMC-03/04 (Haas mills)
6	 * had CHEAP `.cps` coverage only (proven 15/15 dialect-clean via cheap-cps-validate) and NO
7	 * PRISM full post — `mas
... [+16829 chars truncated]

### User | 2026-06-01T17:15:12.406Z

[tool_result] 1	%
2	O1
3	(ALL STAR)
4	(DATE=DD-MM-YY - 16-07-20 TIME=HH:MM - 10:42)
5	(MCX FILE - C:\USERS\CNC MILL HAAS\BOX SYNC\CNC MILL HAAS\ALL STAR\ALL STAR .25)
6	(NC FILE - C:\USERS\CNC MILL HAAS\BOX SYNC\CNC MILL HAAS\ALL STAR\ALL STAR.NC)
7	(MATERIAL - STEEL INCH - S2 - 200 BHN)
8	(T1|.25 SPOT|H1|D1|TOOL DIA. - .25)
9	(T2|3/16|H2|D2|TOOL DIA. - .1875)
10	(T17|STANDARD DRILL - 0.16|H17|D17|TOOL DIA. - .
... [+1332 chars truncated]

### User | 2026-06-01T17:15:12.906Z

[tool_result] 1	// Tests for HaasNGCMillMasterPostEngine — real-value (R9), grounded in the real JM Haas NC structure
2	// (JM DIE/CNC MILL HAAS/ALL STAR/ALL STAR.NC) + the post-training corpus pocket-2op job.
3	import { describe, it, expect } from "vitest";
4	import { haasNGCMillMasterPostEngine, HaasNGCMillMasterPostEngine, type HaasMillOperation } from "../engines/HaasNGCMillMasterPostEngine.js";
5	
6	/** Co
... [+11455 chars truncated]

### Assistant | 2026-06-01T17:15:17.696Z

Now let me read the constants file and the router branch to verify physics imports and wiring.

### Assistant | 2026-06-01T17:15:19.761Z

[tool_use: Grep]

### Assistant | 2026-06-01T17:15:21.428Z

[tool_use: Grep]

### User | 2026-06-01T17:15:24.720Z

[tool_result] 34:export const CANONICAL_KIENZLE: Record<ISOGroup, { kc1_1: number; mc: number }> = {
35-  P: { kc1_1: 1800, mc: 0.25 },  // Carbon/alloy steel, cast steel
36-  M: { kc1_1: 2100, mc: 0.25 },  // Austenitic, duplex, precipitation hardening SS
37-  K: { kc1_1: 1100, mc: 0.28 },  // Gray iron, nodular iron, CGI
38-  N: { kc1_1: 700, mc: 0.22 },   // Aluminum, copper, brass
39-  S: { kc1_1: 2800, mc:
... [+7822 chars truncated]

### User | 2026-06-01T17:15:26.829Z

[tool_result] 7008-              model.includes("HURCO") || model.includes("VMX24") || model.includes("VM30I") || model.includes("V11") ||
7009-              // U-PPGW11 — Hurco alias-expand: catches VMX42/VMX60i/VM10/VM20i,
7010-              // legacy ULTIMAX, and explicit ULTIMOTION/MAX31i identifiers.
7011-              // All route through HurcoV11MillMasterPostEngine.
7012-              model.includes("VM
... [+4027 chars truncated]

### Assistant | 2026-06-01T17:16:39.551Z

I have everything I need. Let me verify two specific concerns: the G187 ordering claim (engine emits it AFTER spindle, before G43) and the router's order-of-checks for the Hurco-vs-Haas branch (the comment claims VM10/VM20 are caught above — let me confirm the VF- substring doesn't collide).

Let me check the real ALL STAR.NC for arc/contour structure (op T16 chamfer) one more time against the engine's arc emission — that's the load-bearing comparison.

The files are fully read. Here is my analysis.

## Code Quality Analysis Report — HaasNGCMillMasterPostEngine

### Summary
- Files analyzed: 4 (engine, test, real ground-truth NC, constants + router branch)
- Overall: clean dialect, correct physics imports, real tests. A small number of real-Haas divergences and one units-correctness hazard.

### P0 findings (could crash / mis-execute on a real Haas VF-2)

**P0-1 — Feed value is emitted with no units conversion and no `F` formatting guard → NaN/Infinity feed reaches the machine.** `HaasNGCMillMasterPostEngine.ts:292,300,306` emit `F${op.feed_mm_min}` as a raw template literal. The field is `feed_mm_min`, but when `units:"inch"` (the JM Haas default and `defaultConfig.units`) **no conversion happens** — a 200 mm/min feed is emitted as `F200` which a Haas in G20 reads as **200 inch/min ≈ 5080 mm/min, a 25.4× over-feed**. The coordinates have the same bug: `c.x.toFixed(3)` is emitted directly with no mm→inch scaling, yet the tool-list comment at line 183-184 *does* convert (`op.tool_diameter_mm / 25.4`). So in inch mode the program mixes inch tool-list comments with millimeter-magnitude coordinates/feeds. This is exactly the §UNITS-FIRST 25.4× hazard the header claims to defend against. The test suite only ever exercises `units:"metric"` for geometry (the one `units:"inch"` test, line 114-118, asserts the *comment* conversion only, never a coordinate or feed) so it passes while the inch path is wrong. Fix: convert all geometry+feed to output units once at entry (`const 
... [+5906 chars truncated]
