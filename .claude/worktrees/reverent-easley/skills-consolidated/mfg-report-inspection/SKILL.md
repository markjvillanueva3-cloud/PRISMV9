---
name: Inspection Plan Report
description: Generate inspection plan with measurement points, tolerances, and gauge requirements.
---

## When To Use
- When creating a first-article inspection (FAI) plan for a new part
- When defining in-process and final inspection checkpoints
- When quality needs a formal inspection document tied to the drawing
- When setting up CMM programs and need measurement point definitions

## How To Use
```
prism_calc action=render_report params={
  type: "inspection_plan",
  job_id: "JOB-001",
  format: "markdown"
}
```

Required: `type`, `job_id`. Optional: `format` (markdown, html, pdf), `inspection_type` (fai, in_process, final).

## What It Returns
- Numbered measurement points with feature descriptions
- Nominal dimensions with upper and lower tolerance limits
- Required gauges and measurement instruments per checkpoint
- Inspection frequency (100%, sampling, SPC)
- Pass/fail criteria and disposition instructions

## Examples
- Input: `render_report params={ type: "inspection_plan", job_id: "JOB-001", format: "markdown" }`
- Output: 15-point inspection plan with bore diameters, surface finish checks, positional tolerances, and thread gauge requirements

- Input: `render_report params={ type: "inspection_plan", job_id: "JOB-001", inspection_type: "fai" }`
- Output: Full FAI plan with AS9102 balloon numbers mapped to drawing dimensions, CMM probe paths, and acceptance criteria
