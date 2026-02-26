---
name: mfg-mobile-timer
description: Start, check, and manage shop floor timers for machining operations
---

# Shop Floor Timer

## When To Use
- Timing machining operations for cycle time validation
- Setting countdown timers for coolant changes, tool life intervals, or part soaking
- Tracking multiple concurrent timers across different machines or operations
- Resetting timers when restarting an operation or tool change

## How To Use
```
prism_intelligence action=mobile_timer_start params={name: "Tool T12 life", duration_min: 45, machine_id: "DMG-5X-01"}
prism_intelligence action=mobile_timer_check params={timer_id: "TMR-001"}
prism_intelligence action=mobile_timer_reset params={timer_id: "TMR-001"}
prism_intelligence action=mobile_timer_list params={machine_id: "DMG-5X-01"}
```

## What It Returns
- `timer_id` — unique timer identifier
- `name` — descriptive label for the timer
- `elapsed_min` — time elapsed since start
- `remaining_min` — time remaining (for countdown timers)
- `status` — timer state (running, paused, expired, reset)

## Examples
- Start a tool life timer: `mobile_timer_start params={name: "Endmill T05 life", duration_min: 40, alert_at: [35, 40]}`
- Check a running timer: `mobile_timer_check params={timer_id: "TMR-001"}`
- List all active timers: `mobile_timer_list params={status: "running"}`
