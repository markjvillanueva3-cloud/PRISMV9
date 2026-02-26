---
name: mfg-mobile-alarm
description: Receive and manage alarm notifications on mobile devices
---

# Mobile Alarm Notifications

## When To Use
- Receiving push notifications when a machine alarm triggers
- Reviewing and acknowledging alarms remotely from a mobile device
- Getting alarm context and recommended fixes while away from the machine
- Filtering alarm notifications by severity or machine

## How To Use
```
prism_intelligence action=mobile_alarm params={action: "list", machine_id: "DMG-5X-01", severity: "critical"}
```

## What It Returns
- `alarms` — list of active alarms matching the filter
- `alarm_code` — machine-specific alarm code
- `severity` — alarm severity (info, warning, critical, emergency)
- `message` — human-readable alarm description
- `recommendation` — suggested corrective action
- `acknowledged` — whether the alarm has been acknowledged

## Examples
- List all active alarms: `mobile_alarm params={action: "list"}`
- Get critical alarms only: `mobile_alarm params={action: "list", severity: "critical"}`
- Acknowledge an alarm: `mobile_alarm params={action: "acknowledge", alarm_id: "ALM-2026-0342", note: "Operator notified, investigating"}`
