---
name: DNC Program Comparator
description: Compare two CNC programs showing line-by-line differences
---

## When To Use
- When comparing two versions of a CNC program for changes
- When verifying edits to an existing program
- When auditing program modifications before production
- NOT for program verification/checksum — use mfg-dnc-verify instead
- NOT for post-processor output comparison — use mfg-post-compare instead

## How To Use
```
prism_intelligence action=dnc_compare params={
  program_a: "O1001_v1",
  program_b: "O1001_v2",
  ignore_comments: false,
  ignore_whitespace: true,
  highlight_safety: true
}
```

## What It Returns
- Line-by-line diff with added/removed/changed markers
- Summary of changes (lines added, removed, modified)
- Safety-critical change flags (speed, feed, rapid moves, tool calls)
- Parameter change summary (which values changed and by how much)
- Compatibility assessment for the target controller

## Examples
- Input: `dnc_compare params={program_a: "O1001_rev1", program_b: "O1001_rev2"}`
- Output: 12 lines changed — 3 feed rate increases, 1 new tool path added, 1 safety retract height modified (flagged). No breaking changes

- Input: `dnc_compare params={program_a: "O2001_fanuc", program_b: "O2001_fanuc_edited", highlight_safety: true}`
- Output: 4 changes — G0 rapid added without Z retract (SAFETY FLAG), spindle speed increased 15%, 2 comment updates
