---
name: mfg-thread-gauges
description: Get Go/No-Go gauge dimensions and validate thread fit class for quality inspection
---

## When To Use
- Need Go/No-Go gauge dimensions for thread inspection
- Validating that a thread fit class is correct for an application
- Setting up incoming inspection criteria for threaded parts
- NOT for calculating thread geometry (use mfg-thread-diameters)
- NOT for thread cutting parameters (use mfg-thread-insert)

## How To Use
### Get Go/No-Go Gauge Dimensions
```
prism_thread action=get_go_nogo_gauges params={
  thread: "M10x1.5",
  class: "6H"
}
```

### Validate Thread Fit Class
```
prism_thread action=validate_thread_fit_class params={
  thread: "M10x1.5",
  internal_class: "6H",
  external_class: "6g",
  application: "general_purpose"
}
```

### External Thread Gauge (Ring Gauge)
```
prism_thread action=get_go_nogo_gauges params={
  thread: "3/8-16 UNC",
  class: "2A",
  gauge_type: "ring"
}
```

## What It Returns
```json
{
  "thread": "M10x1.5",
  "class": "6H",
  "gauge_type": "plug",
  "go_gauge": {
    "pitch_diameter_mm": 9.026,
    "major_diameter_mm": 10.0,
    "tolerance": "+0.000/-0.010"
  },
  "nogo_gauge": {
    "pitch_diameter_mm": 9.206,
    "tolerance": "+0.000/-0.010"
  },
  "acceptance_criteria": "GO must enter fully, NO-GO must not engage more than 2 turns",
  "gauge_wear_limit_mm": 0.013,
  "calibration_interval_months": 12,
  "notes": "6H is standard internal thread tolerance for general purpose"
}
```

## Examples
### Internal Thread Plug Gauge
- Input: `prism_thread action=get_go_nogo_gauges params={thread: "M10x1.5", class: "6H"}`
- Output: GO pitch diameter 9.026mm, NO-GO pitch diameter 9.206mm
- Edge case: Worn GO gauges accept oversized threads — check gauge calibration dates

### Fit Class Validation
- Input: `prism_thread action=validate_thread_fit_class params={thread: "M12x1.75", internal_class: "6H", external_class: "6g", application: "general_purpose"}`
- Output: Valid fit class combination, 0.032-0.212mm allowance range, suitable for general use
- Edge case: 5H/4h for precision fits, 7H/8g for coated or plated threads

### High-Strength Aerospace Thread
- Input: `prism_thread action=get_go_nogo_gauges params={thread: "3/8-24 UNJF", class: "3A"}`
- Output: Tighter gauge tolerances for class 3A, controlled root radius per UNJF
- Edge case: UNJF threads require controlled root radius gauges in addition to standard Go/No-Go
