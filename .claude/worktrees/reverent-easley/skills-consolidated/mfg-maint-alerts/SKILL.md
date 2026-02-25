---
name: mfg-maint-alerts
description: Manage maintenance alerts and status tracking
---

# Maintenance Alert Manager

## When To Use
- Reviewing active maintenance alerts across the shop floor
- Checking the maintenance status of a specific machine
- Acknowledging or escalating maintenance notifications
- Filtering alerts by severity to prioritize response

## How To Use
```
prism_intelligence action=maint_alerts params={machine_id: "DMG-5X-01", severity: "warning", status: "active"}
prism_intelligence action=maint_status params={machine_id: "DMG-5X-01"}
```

## What It Returns
- `alerts` — list of active maintenance alerts with severity, timestamp, and description
- `machine_status` — current maintenance state (operational/degraded/down/scheduled)
- `alert_count` — count of alerts by severity level (critical/warning/info)
- `last_maintenance` — date and type of most recent maintenance performed
- `next_scheduled` — next planned maintenance event with date and scope

## Examples
- View all critical alerts: `maint_alerts params={severity: "critical", status: "active"}` — returns 2 active critical alerts: DMG-5X-01 spindle temperature 15C above normal, HAAS-VF2-03 X-axis servo error count rising
- Check machine status: `maint_status params={machine_id: "MORI-NLX-02"}` — returns operational status, last maintenance Feb 1 (coolant change), next scheduled Mar 15 (spindle service)
- View warning-level alerts for one machine: `maint_alerts params={machine_id: "HAAS-VF2-03", severity: "warning"}` — returns 3 warnings: coolant concentration low, way lube reservoir at 20%, air filter pressure drop elevated
