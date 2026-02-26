---
name: Process Plan Report
description: Generate formatted process plan document with operation sequence and parameters.
---

## When To Use
- When creating a formal process plan for a new part or revision
- When documenting the complete manufacturing sequence for quality audits
- When sharing operation details with programming, quality, or production teams
- When archiving process documentation for AS9100 or ISO compliance

## How To Use
```
prism_calc action=render_report params={
  type: "process_plan",
  job_id: "JOB-001",
  format: "markdown"
}
```

Required: `type`, `job_id`. Optional: `format` (markdown, html, pdf), `detail_level` (summary, standard, detailed).

## What It Returns
- Sequential operation list with op numbers and descriptions
- Machine assignment per operation
- Tooling requirements per operation with speeds and feeds
- Quality checkpoints and in-process inspection gates
- Estimated cycle time per operation and total job time

## Examples
- Input: `render_report params={ type: "process_plan", job_id: "JOB-001", format: "markdown" }`
- Output: 8-operation process plan covering rough mill, finish mill, drill, tap, deburr with full parameter tables and quality gates

- Input: `render_report params={ type: "process_plan", job_id: "JOB-022", detail_level: "detailed" }`
- Output: Detailed process plan with sub-operations, tool change notes, and coolant specifications per step
