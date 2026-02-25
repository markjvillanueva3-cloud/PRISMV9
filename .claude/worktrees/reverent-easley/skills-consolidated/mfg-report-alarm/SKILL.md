---
name: Alarm Analysis Report
description: Generate alarm analysis report with timeline, root cause, and corrective actions.
---

## When To Use
- When documenting a machine alarm event for maintenance records
- When performing root cause analysis on recurring alarm patterns
- When creating incident reports for downtime tracking
- When sharing alarm diagnosis with maintenance or engineering teams

## How To Use
```
prism_calc action=render_report params={
  type: "alarm_report",
  job_id: "JOB-001",
  format: "markdown"
}
```

Required: `type`, `job_id` or `alarm_code` + `machine_id`. Optional: `format` (markdown, html, pdf), `time_range` (hours).

## What It Returns
- Alarm event timeline with timestamps and sequence of events
- Root cause analysis with contributing factors identified
- Machine state at time of alarm (axis positions, spindle load, active program)
- Corrective actions taken and recommended preventive measures
- Related historical alarm occurrences and frequency analysis

## Examples
- Input: `render_report params={ type: "alarm_report", alarm_code: "SV0401", machine_id: "FANUC-01" }`
- Output: Alarm report identifying servo overload on X-axis, timeline showing load spike at line N4520, root cause as excessive DOC in titanium, corrective feed reduction

- Input: `render_report params={ type: "alarm_report", machine_id: "HAAS-VF2", time_range: 72, format: "html" }`
- Output: 72-hour alarm history report with 4 events categorized by severity, Pareto chart of alarm types, and maintenance action items
