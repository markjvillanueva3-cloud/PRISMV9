---
name: Setup Sheet Report
description: Generate formatted setup sheet report with part datum, tools, and operations.
---

## When To Use
- When preparing a job for the shop floor and operators need a setup reference
- When documenting part datum, fixture setup, tool list, and operation sequence
- When a machinist needs a printed or digital setup sheet before running a job
- When handing off a job between shifts or operators

## How To Use
```
prism_calc action=render_report params={
  type: "setup_sheet",
  job_id: "JOB-001",
  format: "markdown"
}
```

Required: `type`, `job_id`. Optional: `format` (markdown, html, pdf), `include_images` (boolean).

## What It Returns
- Formatted setup sheet with part identification and revision
- Datum and work coordinate system references
- Ordered tool list with holder, gauge length, and offset data
- Operation sequence with speeds, feeds, and cycle times
- Fixture notes and clamping instructions

## Examples
- Input: `render_report params={ type: "setup_sheet", job_id: "JOB-001", format: "markdown" }`
- Output: Full setup sheet document with part number, 6 tools listed, 4 operations sequenced, datum callouts, and estimated cycle time of 12.4 min

- Input: `render_report params={ type: "setup_sheet", job_id: "JOB-045", format: "html", include_images: true }`
- Output: HTML setup sheet with embedded fixture diagram and tool assembly images
