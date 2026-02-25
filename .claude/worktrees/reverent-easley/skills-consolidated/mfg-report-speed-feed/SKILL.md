---
name: Speed/Feed Reference Card
description: Generate speed/feed reference card for shop floor posting near the machine.
---

## When To Use
- When operators need a quick-reference card posted at the machine
- When standardizing cutting parameters across shifts for a specific job
- When creating pocket cards for common material/tool combinations
- When training new operators on recommended parameters for the shop

## How To Use
```
prism_calc action=render_report params={
  type: "speed_feed_card",
  job_id: "JOB-001",
  format: "markdown"
}
```

Required: `type`, `job_id` or `material` + `tools` array. Optional: `format` (markdown, html, pdf), `include_adjustments` (boolean).

## What It Returns
- Compact table of tools with RPM, feed rate, and depth of cut
- Material-specific notes and surface speed references
- Roughing vs finishing parameter columns
- Coolant type and pressure recommendations per tool
- Adjustment factors for tool wear and machine condition

## Examples
- Input: `render_report params={ type: "speed_feed_card", job_id: "JOB-001", format: "markdown" }`
- Output: Single-page reference card with 6 tools, RPM/feed/DOC for rough and finish, coolant notes, posted for 6061-T6 aluminum job

- Input: `render_report params={ type: "speed_feed_card", material: "Ti-6Al-4V", tools: ["12mm_endmill", "8mm_drill", "M8_tap"], include_adjustments: true }`
- Output: Titanium speed/feed card with conservative starting parameters, wear adjustment percentages, and maximum chip load warnings
