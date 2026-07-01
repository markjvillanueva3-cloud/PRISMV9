---
name: reference-wedm-phase-a1-parser-blank-line-bug-2026-05-22
description: SECOND pre-existing DXFGeometryParserEngine bug found while shipping U-PARSER-POLYLINE (iter 32). parseDXFGroups() pre-filters blank lines via `lines.filter(l => l.trim() !== "")` BEFORE pairing — when the source DXF has blank lines (AF102-05 has 57 of them), parity shifts and ~9% of all (code, value) pairs are silently dropped. The (2, "ENTITIES") group is among those dropped, so extractEntities() never sees the section start and the parser returns 0 entities + 0 contours on a real 363KB DXF that has 1 POLYLINE + 2 CIRCLE entities. U-PARSER-POLYLINE alone doesn't fix this — need a separate U-PARSER-BLANK-LINES unit (~10-line change) to skip blanks in-place rather than pre-filter.
aliases: reference_wedm_phase_a1_parser_blank_line_bug_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.254Z
---


**2026-05-22 charlie /loop iter 32.** Shipped U-PARSER-POLYLINE (commit pending — POLYLINE/VERTEX/SEQEND handler + 10 tests all green) and tried to verify against the real AF102-05.dxf via wedm-phase-a1-demo.mjs. Still got 0 contours. Tracked down to a SECOND, pre-existing bug.

## The bug

`DXFGeometryParserEngine.parseDXFGroups()`:

```ts
function parseDXFGroups(content: string): Array<[number, string]> {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonBlank = lines.filter((l) => l.trim() !== "");        // ← BUG HERE
  const groups: Array<[number, string]> = [];
  for (let i = 0; i + 1 < nonBlank.length; i += 2) {
    const code = parseInt(nonBlank[i].trim(), 10);
    const value = nonBlank[i + 1].trim();
    if (!isNaN(code)) groups.push([code, value]);
  }
  return groups;
}
```

`Array.filter(...)` removes blank lines unconditionally **before** pairing. DXF format strictly alternates (code-line, value-line). If a blank line falls **between** a code and its value, OR between two pairs, the pre-filter collapses lines together and shifts the entire downstream parity by one. The `parseInt` guard silently drops any pair whose code-position lands on a string (e.g. `"$DIMASO"`), but the inner loop still advances `i += 2`, leaving the misalignment uncorrected for the rest of the file.

## The proof

AF102-05.dxf:
- raw lines: 24,821
- nonBlank lines: 24,764  → **57 blank lines stripped**
- expected pairs: 12,382
- actual pairs in `groups[]`: 11,311  → **1,071 pairs silently dropped** (~9%)
- `(2, "ENTITIES")` group index: **-1 (NOT FOUND)** — even though the file's ENTITIES section header is structurally present at file-line 4541

→ extractEntities() never enters `inEntities = true`, never reads any entity, returns entity_count: 0.

→ Reproduced after wiring U-PARSER-POLYLINE → still 0 contours from AF102-05.

## The fix (clean follow-on unit U-PARSER-BLANK-LINES)

Replace parseDXFGroups with a blank-skipping pair-reader:

```ts
function parseDXFGroups(content: string): Array<[number, string]> {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const groups: Array<[number, string]> = [];
  let i = 0;
  while (i < lines.length) {
    // skip blanks before the next code line
    while (i < lines.length && lines[i].trim() === "") i++;
    if (i >= lines.length) break;
    const codeStr = lines[i].trim();
    i++;
    // skip blanks before the value line of the SAME pair
    while (i < lines.length && lines[i].trim() === "") i++;
    if (i >= lines.length) break;
    const value = lines[i].trim();
    i++;
    const code = parseInt(codeStr, 10);
    if (!isNaN(code)) {
      if (groups.length >= MAX_DXF_GROUPS) {
        throw new Error(`DXF entity limit exceeded: ${MAX_DXF_GROUPS} pairs`);
      }
      groups.push([code, value]);
    }
  }
  return groups;
}
```

10 lines longer, preserves pair alignment through any blank-line distribution.

## Test cases for U-PARSER-BLANK-LINES

1. Reference fixture with 0 blanks → identical groups[] as before (baseline).
2. Single blank between two pairs → no parity shift, all pairs preserved.
3. Single blank between code and value of one pair → that pair still parsed correctly.
4. Multiple blanks in a row → all skipped.
5. Blank lines at start/end of file → tolerated.
6. AF102-05 regression: file should now produce ≥3 entities and ≥3 contours (1 closed polyline + 2 circles).

## Phase-A.1 unblock condition

POLYLINE handler is SHIPPED. Blank-line fix is the **last** P0 between current state and a working Phase-A.1 demo on AF102-05. Together they will produce real contours from the AF102-05 DXF → first real wizard run from a JM Die training pair → first real deviation report (after McxProgramParserEngine wires in for the .mcx-8 side).

Order of operations:
1. ✅ U-PAIR-V4-STOPWORDS — walker (commit dc257bb827, iter 31)
2. ✅ U-PARSER-POLYLINE — DXF parser (this iter 32)
3. ⏳ U-PARSER-BLANK-LINES — parseDXFGroups fix (~30min, NEXT)
4. ⏳ McxProgramParserEngine wiring for .mcx-8 binary read (already-built per [[reference_u_ppl_d5_already_built]])
5. ⏳ Phase-A.1 sweep across the 98 v4 pairs → training corpus persisted

Related: [[reference_wedm_phase_a1_parser_gap_2026_05_22]] (the iter-30 finding that named POLYLINE as a gap) · [[reference_wedm_phase_a_walker_v3_yield_2026_05_22]] · [[reference_u_ppl_d5_already_built]].
