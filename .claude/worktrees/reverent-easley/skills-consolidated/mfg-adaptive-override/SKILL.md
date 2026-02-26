---
name: mfg-adaptive-override
description: Manage adaptive feed rate and spindle speed overrides
---

# Adaptive Override Controller

## When To Use
- Managing automatic feed and speed overrides based on process conditions
- Configuring override limits and ramp rates for adaptive control
- Monitoring current override state across all adaptive subsystems
- Coordinating multiple adaptive strategies (chipload + chatter + wear)

## How To Use
```
prism_intelligence action=adaptive_override params={feed_override_pct: 85, spindle_override_pct: 100, reason: "high_force"}
```

```
prism_intelligence action=adaptive_status params={subsystems: ["chipload", "chatter", "wear", "thermal"]}
```

```
prism_intelligence action=adaptive_config params={max_feed_override: 150, min_feed_override: 30, ramp_rate: 5}
```

## What It Returns
- `active_overrides` — current feed and spindle override percentages
- `override_source` — which subsystem is driving the current override
- `subsystem_status` — status of each adaptive subsystem (active, standby, disabled)
- `conflict_resolution` — how competing override requests are resolved
- `history` — recent override changes with timestamps and reasons

## Examples
- `adaptive_override params={feed_override_pct: 85, reason: "high_force"}` — apply a force-based feed reduction
- `adaptive_status params={subsystems: ["chipload", "chatter", "wear", "thermal"]}` — get status of all adaptive loops
- `adaptive_config params={max_feed_override: 150, min_feed_override: 30, ramp_rate: 5}` — set override limits and ramp rate
