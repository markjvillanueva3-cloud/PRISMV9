---
name: scheduling-guide
description: 'Job scheduling and capacity planning guide. Use when the user needs to schedule jobs across machines, balance workloads, manage due dates, or optimize shop floor throughput.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Scheduling
---

# Job Scheduling & Capacity Planning Guide

## When to Use
- Scheduling jobs across multiple machines with due-date constraints
- Balancing workloads across shifts and work centers
- Identifying bottlenecks in shop floor capacity
- Replanning after machine breakdown or rush order insertion

## How It Works
1. Define jobs with operations, durations, and due dates
2. Assign to machines via `prism_scheduling→job_schedule`
3. Check capacity via `prism_scheduling→capacity_check`
4. Optimize sequence via `prism_scheduling→schedule_optimize` (minimize makespan or tardiness)
5. Generate Gantt chart via `prism_export→render_pdf`

## Returns
- Machine-level Gantt with setup times, run times, and idle gaps
- Capacity utilization per machine (target: 75-85%)
- Critical path and bottleneck identification
- Due-date risk flags (green/yellow/red)

## Example
**Input:** "Schedule 12 jobs across 3 VMCs and 2 lathes, minimize tardiness"
**Output:** Optimized schedule: VMC-1 (87% util), VMC-2 (82%), VMC-3 (79%), Lathe-1 (91%), Lathe-2 (74%). 11/12 jobs on-time, Job J-0047 late by 4h (recommend overtime or move drill op to VMC-3). Critical path: J-0039 → J-0041 chain.
