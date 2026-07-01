# /schedule — Job Scheduling

Schedule manufacturing jobs with capacity planning, due date optimization, and resource allocation.

## Usage
```
/schedule [job-id] [--mode optimize|manual|auto]
```

## MCP Action
```
prism_scheduling:schedule_job
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (drives scheduling pipeline)
- **Advisor**: Opus 4.6, `max_uses: 2`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Load job requirements (due date, operations, machine needs)
2. Check machine availability via CapacityPlanningEngine
3. Identify scheduling conflicts
4. Optimize job sequence via SchedulingOptimizationEngine
5. Allocate resources (machines, tooling, operators)
6. Generate schedule with Gantt view
7. Update shop floor schedule

## Scheduling Modes
- **optimize**: Auto-optimize for on-time delivery + utilization
- **manual**: User specifies machine/time slots
- **auto**: Fully autonomous scheduling with AI

## Output
- Job schedule with start/end times
- Machine assignments
- Resource requirements
- Conflict warnings
- Lead time estimate

## Related
- `/shop-schedule` — View full shop schedule
- `/capacity` — Capacity planning
- `/quote` — Include scheduling in quotes
