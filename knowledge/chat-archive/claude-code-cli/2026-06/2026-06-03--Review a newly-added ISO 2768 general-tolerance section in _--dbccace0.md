---
type: "chat-session"
source: "claude-code-cli"
session_id: "dbccace0-26c8-4332-b683-bce3366332ac"
title: "Review a newly-added ISO 2768 general-tolerance section in `H:/prism/mcp-server/"
date: "2026-06-03"
first_ts: "2026-06-03T05:39:37.624Z"
last_ts: "2026-06-03T05:41:20.471Z"
cwd: "H:\\prism"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/dbccace0-26c8-4332-b683-bce3366332ac/subagents/agent-a0f9d6ee14b8b0f68.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Review a newly-added ISO 2768 general-tolerance section in `H:/prism/mcp-server/

> **claude-code-cli** | 2026-06-03 | 8 msgs (3 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/dbccace0-26c8-4332-b683-bce3366332ac/subagents/agent-a0f9d6ee14b8b0f68.jsonl`

## Transcript

### User | 2026-06-03T05:39:37.624Z

Review a newly-added ISO 2768 general-tolerance section in `H:/prism/mcp-server/src/engines/ToleranceEngine.ts` (appended after the existing ISO 286 code — read the file from ~line 555 to EOF; the new section is headed "ISO 2768 GENERAL TOLERANCES").

YOUR JOB: verify EVERY numeric value against the published standards — this data feeds CAD/quality/CMM/quoting consumers, so a wrong cell is a real defect (R12).

Verify against your knowledge of:
- ISO 2768-1:1989 Table 1 (linear permissible deviations f/m/c/v by size band)
- ISO 2768-1:1989 Table 2 (external radius & chamfer-height deviations, f&m / c&v)
- ISO 2768-1:1989 Table 3 (angular deviations f/m/c/v by shorter-side length; the code stores DECIMAL DEGREES with the degrees-minutes source in a trailing comment, e.g. 1/3 = 0°20′)
- ISO 2768-2:1989 Tables 1-4 (straightness/flatness, perpendicularity, symmetry, circular run-out; classes H/K/L)

For each table report: are the size-band breakpoints (up_to values) correct? Is every f/m/c/v or H/K/L cell the correct published value? Are the angular decimal-degree values the correct conversion of the annotated degrees-minutes (and are the annotations themselves correct)? Is circular run-out correctly size-independent (H=0.1, K=0.2, L=0.5)?

Also sanity-check the lookup logic: `pickIso2768Row` returns the first row with value ≤ up_to (correct "up to and including" semantics?), the non-null assertions only used on tables ending in Infinity, `degToDMS` rounding, and the throw-on-out-of-range behavior.

Output: a table of any INCORRECT cells (cite the correct published value), plus PASS or FAIL overall. List P0 (wrong safety/inspection value) and P1 (lookup-logic bug) findings explicitly. Do NOT rewrite the file — just report.

### Assistant | 2026-06-03T05:39:48.530Z

I'll start by reading the new ISO 2768 section in the ToleranceEngine file.

### Assistant | 2026-06-03T05:39:49.687Z

[tool_use: Read]

### User | 2026-06-03T05:40:10.478Z

[tool_result] 550	    }
551	  }
552	
553	  // Deflection too large even for IT14
554	  return calculateITGrade(nominal_mm, 14);
555	}
556	
557	// ============================================================================
558	// ISO 2768 GENERAL TOLERANCES (for un-toleranced / general dimensions)
559	// ----------------------------------------------------------------------------
560	// Canonical single source 
... [+13246 chars truncated]

### Assistant | 2026-06-03T05:40:14.425Z

I have the full ISO 2768 section. Now let me verify every numeric value against the published standards. Let me check the lookup logic against the existing ISO 286 code patterns and examine the helper functions carefully.

Let me cross-check the existing usage to understand how `pickIso2768Row` interacts with the linear table that lacks an `Infinity` terminal row.

### Assistant | 2026-06-03T05:40:15.474Z

[tool_use: Grep]

### User | 2026-06-03T05:40:23.810Z

[tool_result] mcp-server\src\engines\ToleranceEngine.ts:585:export const ISO2768_LINEAR: Array<{ up_to: number; f: number; m: number; c: number; v: number }> = [
mcp-server\src\engines\ToleranceEngine.ts:685:function pickIso2768Row<T extends { up_to: number }>(rows: T[], value: number): T | null {
mcp-server\src\engines\ToleranceEngine.ts:709: * e.g. `generalToleranceLinear(30, "m")` → ±0.2 mm.
mcp-server\src\e
... [+1281 chars truncated]

### Assistant | 2026-06-03T05:41:20.471Z

Now I have everything I need. Let me work through every table cell against the published ISO 2768 standards.

## Verification against ISO 2768-1:1989 and ISO 2768-2:1989

### Table 1 — Linear deviations (lines 585-594)

Published ISO 2768-1 Table 1 (±mm). Note the standard's first band is **0.5 up to 3** — dimensions below 0.5 mm require explicit tolerances. The code has split this into a `0.5` row and a `3` row.

| Band | f | m | c | v | Code f/m/c/v | Verdict |
|------|---|---|---|---|---|---|
| 0.5–3 | 0.05 | 0.1 | 0.2 | — (no v) | code row up_to:3 → 0.05/0.10/0.20/0.50 | v WRONG (see below) |
| 3–6 | 0.05 | 0.1 | 0.3 | 0.5 | 0.05/0.10/0.30/0.50 | PASS |
| 6–30 | 0.1 | 0.2 | 0.5 | 1.0 | 0.10/0.20/0.50/1.00 | PASS |
| 30–120 | 0.15 | 0.3 | 0.8 | 1.5 | 0.15/0.30/0.80/1.50 | PASS |
| 120–400 | 0.2 | 0.5 | 1.2 | 2.5 | 0.20/0.50/1.20/2.50 | PASS |
| 400–1000 | 0.3 | 0.8 | 2.0 | 4.0 | 0.30/0.80/2.00/4.00 | PASS |
| 1000–2000 | 0.5 | 1.2 | 3.0 | 6.0 | 0.50/1.20/3.00/6.00 | PASS |

**Finding L-1 (P0):** Row `up_to: 0.5` (line 586) is fabricated. ISO 2768-1 Table 1 has **no band below 0.5 mm**; the first row is "0.5 up to and including 3" with values f=0.05, m=0.1, c=0.2, and the **v (very coarse) column does not apply to the 0.5–3 band** (the standard leaves it blank). The code instead invents a `≤0.5` band (f/m/c/v = 0.05/0.05/0.10/0.10) that exists in no standard, and gives the real 0.5–3 band a v=0.50 value that the standard does not publish. A 0.4 mm dimension that should require an explicit tolerance instead silently returns ±0.05.

### Table 2 — External radius & chamfer (lines 600-605)

Published ISO 2768-1 Table 2 (±mm), **only three bands**: 0.5–3, 3–6, over 6.

| Band | f&m | c&v | Code fm/cv | Verdict |
|------|-----|-----|---|---|
| 0.5–3 | 0.2 | 0.2 | 0.2 / 0.4 | **cv WRONG** |
| 3–6 | 0.5 | 1.0 | 0.5 / 1.0 | PASS |
| over 6 | 1.0 | 2.0 | row up_to:30 → 1.0/2.0 then up_to:∞ → 2.0/4.0 | **WRONG structure** |

**Finding RC-1 (P0):** For the **0.5–3** band, ISO
... [+7988 chars truncated]
