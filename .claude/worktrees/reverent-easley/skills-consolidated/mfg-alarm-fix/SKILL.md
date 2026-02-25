---
name: mfg-alarm-fix
description: Get step-by-step fix procedure for a CNC alarm code including required tools and estimated time
---

## When To Use
- Machine has a known alarm code and user needs the fix procedure
- Need a prioritized troubleshooting checklist to resolve an alarm
- Want to know what tools, parts, or resources are needed before starting repair
- Estimating downtime for a specific alarm condition
- NOT for decoding what an alarm means (use mfg-alarm-decode)
- NOT for searching alarms by symptom (use mfg-alarm-search)

## How To Use
### Get fix procedure for a specific alarm
```
prism_data action=alarm_fix params={
  code: "1020",
  controller: "fanuc"
}
```

### Get fix with machine context for tailored steps
```
prism_data action=alarm_fix params={
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
  "title": "SERVO ALARM: EXCESS ERROR (X-AXIS)",
  "fix_procedure": {
    "estimated_time_min": 30,
    "difficulty": "intermediate",
    "steps": [
      {
        "step": 1,
        "action": "Power off machine and engage E-stop",
        "detail": "Ensure all axes are stationary before inspection",
        "safety": "Lock out/tag out per OSHA 1910.147"
      },
      {
        "step": 2,
        "action": "Check X-axis for mechanical binding",
        "detail": "Manually push the table in X direction. It should move freely with consistent resistance.",
        "tools": ["Way lube applicator", "Dial indicator"]
      },
      {
        "step": 3,
        "action": "Inspect X-axis ball screw and coupling",
        "detail": "Check for visible damage, debris, or excessive backlash. Measure backlash with dial indicator.",
        "threshold": "Backlash > 0.020mm indicates ball screw replacement needed"
      },
      {
        "step": 4,
        "action": "Check servo motor encoder cable",
        "detail": "Inspect cable for damage, loose connectors. Reseat encoder connector at motor and amplifier.",
        "tools": ["Multimeter", "Connector cleaning spray"]
      },
      {
        "step": 5,
        "action": "Review servo parameters and diagnostic screen",
        "detail": "Check parameter 2049 (position error limit). Check servo diagnostic page for following error history.",
        "parameters": ["2049 (pos error limit)", "2003 (servo gain)"]
      }
    ],
    "required_tools": ["Dial indicator", "Multimeter", "Way lube applicator", "Connector cleaning spray"],
    "possible_parts": ["Encoder cable", "Ball screw assembly", "Servo motor", "Servo amplifier"]
  }
}
```

## Examples
### Fix a Fanuc servo excess error
- Input: `prism_data action=alarm_fix params={code: "1020", controller: "fanuc"}`
- Output: 5-step procedure, 30 min estimated, intermediate difficulty, 4 tools required
- Edge case: If alarm recurs after Step 5, escalation to servo amplifier replacement may be needed (not covered in basic fix)

### Fix a Haas spindle drive fault
- Input: `prism_data action=alarm_fix params={code: "108", controller: "haas", machine: "haas_vf2"}`
- Output: Machine-specific steps for VF-2 spindle drive, includes Haas-specific parameter numbers
- Edge case: Some fixes require Haas service login credentials for parameter access
