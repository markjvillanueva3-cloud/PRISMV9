---
name: Tool List Report
description: Generate tool list report with catalog numbers, parameters, and holder assemblies.
---

## When To Use
- When preparing a tool list for the tool crib before job setup
- When ordering tools for a new job and need catalog numbers and quantities
- When documenting tool assemblies for a specific program or machine
- When auditing tool inventory against active job requirements

## How To Use
```
prism_calc action=render_report params={
  type: "tool_list",
  job_id: "JOB-001",
  format: "markdown"
}
```

Required: `type`, `job_id`. Optional: `format` (markdown, html, pdf), `group_by` (operation, type, station).

## What It Returns
- Complete tool list with T-numbers, descriptions, and catalog numbers
- Tool dimensions: diameter, flute length, overall length, corner radius
- Holder and collet specifications per tool assembly
- Recommended cutting parameters per tool (speed, feed, DOC)
- Tool life expectancy and replacement notes

## Examples
- Input: `render_report params={ type: "tool_list", job_id: "JOB-001", format: "markdown" }`
- Output: 8-tool list with T1-T8 assignments, Kennametal/Sandvik catalog numbers, holder specs, and cutting data

- Input: `render_report params={ type: "tool_list", job_id: "JOB-001", group_by: "operation" }`
- Output: Tool list organized by operation showing which tools are used in each op with change points noted
