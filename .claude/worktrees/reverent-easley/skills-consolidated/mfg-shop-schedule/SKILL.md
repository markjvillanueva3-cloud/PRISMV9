---
name: Shop Floor Scheduler
description: Shop floor scheduling with machine utilization optimization
---

## When To Use
- When assigning jobs to machines for the week or day
- When optimizing machine utilization across the shop
- When resolving scheduling conflicts between competing jobs
- When rebalancing after a machine goes down or a rush job arrives
- NOT for individual job planning — use mfg-job-plan instead

## How To Use
```
prism_intelligence action=shop_schedule params={
  jobs: ["JOB-001", "JOB-002", "JOB-003"],
  machines: ["Haas VF-2", "Haas VF-4", "DMG Mori NLX"],
  horizon: "1 week",
  priority: "due_date",
  constraints: { max_overtime_hrs: 10 }
}

prism_intelligence action=machine_utilization params={
  machine: "Haas VF-2",
  period: "last_month"
}
```

## What It Returns
- Machine-to-job assignment schedule with start/end times
- Utilization percentage per machine
- Bottleneck identification and suggested mitigation
- Due date compliance forecast (on-time vs late)
- Overtime requirements and cost impact

## Examples
- Input: `shop_schedule params={jobs: ["JOB-100", "JOB-101", "JOB-102"], machines: ["VMC-1", "VMC-2"], priority: "due_date"}`
- Output: VMC-1 gets JOB-100+102 (85% util), VMC-2 gets JOB-101 (72% util), all on-time

- Input: `machine_utilization params={machine: "Haas VF-4", period: "last_quarter"}`
- Output: 68% utilization, 12% setup, 8% maintenance, 12% idle — recommend batching small jobs
