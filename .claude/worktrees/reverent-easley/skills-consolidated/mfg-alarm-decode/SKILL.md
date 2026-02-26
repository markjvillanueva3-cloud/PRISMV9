---
name: mfg-alarm-decode
description: Decode CNC alarm codes — returns meaning, severity, and common causes from AlarmRegistry (10,033 codes)
---

## When To Use
- Machine displays an alarm code and user needs to know what it means
- Need severity level to determine urgency (critical vs. warning vs. informational)
- Want common causes for a specific alarm before troubleshooting
- Decoding alarms from Fanuc, Siemens, Haas, Mazak, Okuma, or Heidenhain controllers
- NOT for step-by-step fix procedures (use mfg-alarm-fix)
- NOT for searching alarms by symptom description (use mfg-alarm-search)

## How To Use
### Decode a specific alarm code
```
prism_data action=alarm_decode params={
  code: "1020",
  controller: "fanuc"
}
```

### Decode with machine context
```
prism_data action=alarm_decode params={
  code: "108",
  controller: "haas",
  machine: "haas_vf2"
}
```

## What It Returns
```json
{
  "code": "1020",
  "controller": "fanuc",
  "category": "servo",
  "title": "SERVO ALARM: EXCESS ERROR (X-AXIS)",
  "severity": "critical",
  "description": "Position error of the X-axis servo motor has exceeded the threshold during cutting feed. The axis has deviated from its commanded position beyond acceptable limits.",
  "common_causes": [
    "Mechanical binding or obstruction on X-axis",
    "Servo motor or encoder failure",
    "Ball screw wear or damage",
    "Excessive cutting load causing axis stall",
    "Servo amplifier fault or parameter drift"
  ],
  "immediate_action": "Machine will stop all axis motion. Do NOT reset without checking for mechanical issues.",
  "related_alarms": ["1021", "1022", "401"]
}
```

## Examples
### Decode a Fanuc servo alarm
- Input: `prism_data action=alarm_decode params={code: "1020", controller: "fanuc"}`
- Output: Critical servo excess error on X-axis, 5 common causes listed, immediate stop action
- Edge case: Fanuc alarm numbers can overlap between alarm types (servo vs. system); controller version may disambiguate

### Decode a Haas alarm
- Input: `prism_data action=alarm_decode params={code: "108", controller: "haas"}`
- Output: Spindle drive fault, severity critical, common causes include drive overtemp and phase loss
- Edge case: Haas uses different numbering scheme than Fanuc; same number means different things on each controller
