---
name: Job Lifecycle Manager
description: Manage manufacturing jobs through their full lifecycle — start, track, update, and complete
---

## When To Use
- When starting a new job on the shop floor
- When updating job status or recording progress
- When searching for existing jobs by part, material, or status
- When resuming a paused or interrupted job
- When closing out a completed job with final metrics
- NOT for initial job planning — use mfg-job-plan instead

## How To Use
```
prism_intelligence action=job_start params={
  job_id: "JOB-2024-0142",
  part: "bracket-001",
  quantity: 500
}

prism_intelligence action=job_update params={
  job_id: "JOB-2024-0142",
  status: "in_progress",
  op_complete: 3,
  scrap: 2
}

prism_intelligence action=job_find params={ part: "bracket", status: "active" }
prism_intelligence action=job_resume params={ job_id: "JOB-2024-0142" }
prism_intelligence action=job_complete params={ job_id: "JOB-2024-0142", final_count: 498 }
prism_intelligence action=job_list_recent params={ limit: 10 }
```

## What It Returns
- Job record with current status, progress, and timestamps
- Search results matching filter criteria
- Completion summary with yield, scrap rate, and actual vs estimated time

## Examples
- Input: `job_start params={part: "housing", quantity: 200}`
- Output: Job JOB-2024-0143 created, status=pending, estimated completion 2024-03-15

- Input: `job_find params={status: "active", material: "titanium"}`
- Output: 3 active titanium jobs found with IDs, progress percentages, and due dates
