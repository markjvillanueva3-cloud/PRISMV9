---
type: "chat-session"
source: "claude-code-cli"
session_id: "dbccace0-26c8-4332-b683-bce3366332ac"
title: "Independent code review of a newly-added ISO 2768 general-tolerance section appe"
date: "2026-06-03"
first_ts: "2026-06-03T05:40:00.195Z"
last_ts: "2026-06-03T05:42:25.521Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/dbccace0-26c8-4332-b683-bce3366332ac/subagents/agent-aea3476e87d8fd7aa.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Independent code review of a newly-added ISO 2768 general-tolerance section appe

> **claude-code-cli** | 2026-06-03 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/dbccace0-26c8-4332-b683-bce3366332ac/subagents/agent-aea3476e87d8fd7aa.jsonl`

## Transcript

### User | 2026-06-03T05:40:00.195Z

Independent code review of a newly-added ISO 2768 general-tolerance section appended to `H:/prism/mcp-server/src/engines/ToleranceEngine.ts` (read from ~line 555 to EOF — the section headed "ISO 2768 GENERAL TOLERANCES"). This is part of JULIETT-DB-COVERAGE-MS0: making ToleranceEngine the CANONICAL single source for ISO 2768 so the duplicate private `ISO_2768_LINEAR` in `mcp-server/src/engines/AmbiguityResolutionEngine.ts` (around line 137) can import it instead.

Review weighted toward what a value-checker won't catch:
1. TYPESCRIPT correctness — will this compile? Check: `pickIso2768Row` generic, the non-null assertions (`!`) on `ISO2768_RADIUS_CHAMFER`/`ISO2768_ANGULAR` lookups (both end in `up_to: Infinity` so a match is guaranteed — confirm), the `switch` exhaustiveness in `generalToleranceGeometric`, exported type/interface/const name collisions with the rest of ToleranceEngine.ts (grep the file for pre-existing `GeneralLinearToleranceResult`, `ISO2768_*`, etc.), and NodeNext `.js` import suffixes (none added here, but confirm).
2. DE-DUP INTEGRITY — open `AmbiguityResolutionEngine.ts` lines ~130-200. The new canonical `ISO2768_LINEAR` MUST be byte-identical in shape (`Array<{up_to,f,m,c,v}>`) and VALUES to the existing private `ISO_2768_LINEAR` so that changing AmbiguityResolution to `import { ISO2768_LINEAR as ISO_2768_LINEAR } from "./ToleranceEngine.js"` is a drop-in with ZERO behavior change. Confirm the 8 rows match exactly, and confirm there is no import cycle (does ToleranceEngine import AmbiguityResolution? does AmbiguityResolution's other code import ToleranceEngine already?).
3. EDGE CASES — NaN/Infinity/negative/zero/oversize inputs: are they all handled (throw with a clear message)? Is `Number.isFinite` used before comparisons? Any path that returns undefined or NaN?
4. CONVENTION CONFORMANCE — does it match ToleranceEngine's existing style (exported module functions, `[ToleranceEngine] ...` throw messages, JSDoc with @param/@throws)? 
5. A memory
... [+363 chars truncated]

### Assistant | 2026-06-03T05:40:15.993Z

I'll review the ISO 2768 section. Let me start by reading the relevant files in parallel.

### Assistant | 2026-06-03T05:40:19.515Z

[tool_use: Read]

### Assistant | 2026-06-03T05:40:19.643Z

[tool_use: Read]

### User | 2026-06-03T05:40:23.156Z

[tool_result] 540	export function findAchievableGrade(nominal_mm: number, deflection_mm: number): ITGradeResult | null {
541	  if (nominal_mm < 1 || nominal_mm > 500) return null;
542	
543	  const required_um = deflection_mm * 1000 * 2; // 2× safety margin
544	
545	  // Search from IT5 (tightest practical machining) to IT14
546	  for (let grade = 5; grade <= 14; grade++) {
547	    const result = calculateITGrad
... [+13743 chars truncated]

### User | 2026-06-03T05:40:23.178Z

[tool_result] 120	  /** Defaults that were applied (for audit trail) */
121	  defaults_applied: Array<{
122	    feature_id: string;
123	    field: string;
124	    value: string;
125	    reference: string;
126	  }>;
127	  /** Summary suitable for display to user */
128	  user_summary: string;
129	}
130	
131	// ============================================================================
132	// ISO 2768-1 GENERAL 
... [+3567 chars truncated]

### Assistant | 2026-06-03T05:40:26.427Z

Both files are read. Now let me verify a few things the review depends on: name collisions across the rest of ToleranceEngine.ts, whether an import cycle exists between the two engines, and the exact existing exports.

### Assistant | 2026-06-03T05:40:28.390Z

[tool_use: Grep]

### Assistant | 2026-06-03T05:40:29.741Z

[tool_use: Grep]

### Assistant | 2026-06-03T05:40:31.084Z

[tool_use: Grep]

### User | 2026-06-03T05:40:49.938Z

[tool_result] 565:// lived as a private `ISO_2768_LINEAR` copy inside AmbiguityResolutionEngine.
573:export type ISO2768LinearClass = "f" | "m" | "c" | "v";
575:export type ISO2768GeometricClass = "H" | "K" | "L";
577:export type ISO2768GeometricType =
585:export const ISO2768_LINEAR: Array<{ up_to: number; f: number; m: number; c: number; v: number }> = [
600:export const ISO2768_RADIUS_CHAMFER: Array<{ up_to:
... [+2952 chars truncated]

### User | 2026-06-03T05:40:54.415Z

[tool_result] 21:import { log } from "../utils/Logger.js";
567:// lives here (byte-identical values) and AmbiguityResolutionEngine imports it.

### User | 2026-06-03T05:40:59.555Z

[tool_result] 27:import { log } from "../utils/Logger.js";
28:import type {

### Assistant | 2026-06-03T05:41:03.736Z

Confirmed: the new identifiers appear only in the new section (no pre-existing collisions in ToleranceEngine.ts). Now let me verify the import-cycle question and the existing module structure. Let me check the ToleranceEngine.ts file header and the AmbiguityResolutionEngine imports more fully, plus confirm whether ToleranceEngine uses `export function` module style elsewhere.

### Assistant | 2026-06-03T05:41:04.678Z

[tool_use: Read]

### Assistant | 2026-06-03T05:41:05.256Z

[tool_use: Read]

### User | 2026-06-03T05:41:31.498Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Tolerance Engine (R3-P2)
3	 *
4	 * ISO 286-1:2010 tolerance analysis:
5	 *   - IT grade lookup (tolerance width for nominal size + grade)
6	 *   - Shaft/hole fit analysis (clearance / transition / interference)
7	 *   - Tolerance stack-up (worst case + RSS)
8	 *   - Process capability (Cpk/Cp)
9	 *
10	 * All data from ISO 286-1:2010 Tables 1-5.
11	 * Reference: "ISO s
... [+1638 chars truncated]

### User | 2026-06-03T05:41:31.522Z

[tool_result] 1	/**
2	 * AmbiguityResolutionEngine — Missing Data Detection + Default Application + User Prompting
3	 *
4	 * Analyzes extracted blueprint/CAD data for ambiguities and gaps:
5	 *   - Missing dimensions (no OD, no length, no material)
6	 *   - Unclear tolerances (general tolerance class missing)
7	 *   - Conflicting dimensions (overlapping features, impossible geometry)
8	 *   - Incomplete thread 
... [+1451 chars truncated]

### Assistant | 2026-06-03T05:42:25.521Z

I now have everything I need. Let me verify the import-cycle direction conclusively: ToleranceEngine imports only `Logger` (no AmbiguityResolution import), and AmbiguityResolution currently imports only `Logger` + a type from `TurningPrintToProgramEngine`. So the proposed `import { ISO2768_LINEAR } from "./ToleranceEngine.js"` into AmbiguityResolution would be a one-directional edge — no cycle. Let me confirm ToleranceEngine is purely module-function style (no class) and verify the exact byte values once more against the table I already have.

The data is all in front of me. Both tables are confirmed below.

## Code Review — ISO 2768 section of ToleranceEngine.ts (lines 557–821)

### 1. TYPESCRIPT correctness — PASS

- **`pickIso2768Row<T extends { up_to: number }>`** (line 685): generic constraint is correct; returns `T | null`, and the array element types all satisfy `{ up_to: number }`. Compiles.
- **Non-null assertions** on `ISO2768_RADIUS_CHAMFER` (line 741) and `ISO2768_ANGULAR` (line 762): **confirmed safe**. Both tables' last row ends in `up_to: Infinity`, and `pickIso2768Row` matches on `value <= r.up_to`. Any finite positive `value` satisfies `value <= Infinity`, and the callers already throw on non-finite/≤0 input *before* the lookup, so a match is guaranteed. The `!` is justified and the inline comments say so.
- **`switch` exhaustiveness** in `generalToleranceGeometric` (lines 803–810): `circular_runout` is handled by an early return before the switch; the remaining 4 union members (`straightness`/`flatness`/`perpendicularity`/`symmetry`) are all cased, with a `default` that throws. `table`/`std` are definitely-assigned on every reachable path. Compiles under `strict`. (Minor note in P2 below re: the unreachable default.)
- **Name collisions**: grep of the whole file confirms every new identifier (`ISO2768LinearClass`, `ISO2768GeometricClass`, `ISO2768GeometricType`, all 8 `ISO2768_*` consts, the 3 `General*ToleranceResult` interfaces, `pickIso2768Row`,
... [+8074 chars truncated]
