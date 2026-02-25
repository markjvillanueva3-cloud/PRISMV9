---
name: mfg-alarm-diagnose
description: Root cause analysis combining machine context, alarm code, and symptoms for prioritized diagnosis and fix
---

## When To Use
- Have both an alarm code AND additional symptom information to narrow diagnosis
- Need root cause analysis that considers the specific machine model and its known issues
- Alarm code alone is ambiguous and symptoms provide critical context
- Want prioritized fix actions ranked by likelihood of resolving the issue
- NOT for simple alarm code lookup without symptoms (use mfg-alarm-decode)
- NOT for finding fix procedures without diagnosis (use mfg-alarm-fix)

## How To Use
### Diagnose with machine, code, and symptoms
```
prism_data action=alarm_diagnose params={
  machine: "haas_vf2",
  code: "108",
  symptoms: "spindle stops during heavy cut"
}
```

### Diagnose with extended context
```
prism_data action=alarm_diagnose params={
  machine: "dmg_dmu50",
  code: "25010",
  symptoms: "Y-axis jerks during circular interpolation at feed > 5000mm/min",
  recent_maintenance: "ball screw replaced 2 weeks ago",
  frequency: "intermittent"
}
```

## What It Returns
```json
{
  "machine": "haas_vf2",
  "code": "108",
  "diagnosis": {
    "root_cause_ranked": [
      {
        "rank": 1,
        "cause": "Spindle drive thermal overload due to excessive cutting load",
        "probability": 0.65,
        "evidence": "Heavy cut + spindle stop pattern matches thermal protection trip",
        "fix": "Reduce radial depth of cut by 30% or increase coolant flow",
        "fix_time_min": 5,
        "priority": "high"
      },
      {
        "rank": 2,
        "cause": "Spindle belt slippage under high torque demand",
        "probability": 0.20,
        "evidence": "VF-2 belt-driven spindle prone to slip above 80% torque load",
        "fix": "Check belt tension, replace if glazed or stretched",
        "fix_time_min": 45,
        "priority": "medium"
      },
      {
        "rank": 3,
        "cause": "Spindle drive amplifier fault",
        "probability": 0.15,
        "evidence": "Less likely given symptom correlation with heavy cutting load",
        "fix": "Check drive error logs, inspect DC bus voltage",
        "fix_time_min": 60,
        "priority": "low"
      }
    ],
    "recommended_action": "Start with Rank 1: reduce cutting parameters to verify thermal cause before mechanical inspection",
    "machine_known_issues": ["VF-2 spindle belt tension spec: 4.5 lbs at midpoint", "Coolant nozzle blockage common on this model"]
  }
}
```

## Examples
### Diagnose spindle alarm during heavy roughing
- Input: `prism_data action=alarm_diagnose params={machine: "haas_vf2", code: "108", symptoms: "spindle stops during heavy cut"}`
- Output: 3 ranked causes (65% thermal overload, 20% belt slip, 15% amplifier), recommended action starts with cutting param reduction
- Edge case: If symptoms include "cold start" context, thermal expansion diagnosis is added to ranking

### Diagnose axis alarm with recent maintenance history
- Input: `prism_data action=alarm_diagnose params={machine: "dmg_dmu50", code: "25010", symptoms: "Y-axis jerks during circular interpolation", recent_maintenance: "ball screw replaced 2 weeks ago"}`
- Output: Top cause becomes ball screw preload or encoder alignment issue from recent work, not wear
- Edge case: Recent maintenance history dramatically shifts root cause probabilities
