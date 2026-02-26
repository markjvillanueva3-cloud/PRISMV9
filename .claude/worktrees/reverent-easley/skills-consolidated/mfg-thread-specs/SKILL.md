---
name: mfg-thread-specs
description: Retrieve full thread specifications including diameters, tolerances, and class for any standard
---

## When To Use
- Looking up complete thread specifications for ISO metric, UN, or BSP threads
- Need major, minor, and pitch diameter values with tolerances
- Verifying thread class and fit information
- NOT for calculating tap drill size (use mfg-tap-drill)
- NOT for Go/No-Go gauge dimensions (use mfg-thread-gauges)

## How To Use
### Get Metric Thread Specifications
```
prism_thread action=get_thread_specifications params={
  thread: "M10x1.5"
}
```

### Get UN Thread Specifications
```
prism_thread action=get_thread_specifications params={
  thread: "3/8-16 UNC"
}
```

### Get BSP Thread Specifications
```
prism_thread action=get_thread_specifications params={
  thread: "G3/4 BSP"
}
```

## What It Returns
```json
{
  "thread": "M10x1.5",
  "standard": "ISO_metric",
  "pitch_mm": 1.5,
  "tpi": 16.93,
  "external": {
    "major_diameter": { "nominal": 10.0, "max": 10.0, "min": 9.732 },
    "pitch_diameter": { "nominal": 9.026, "max": 9.026, "min": 8.862 },
    "minor_diameter": { "nominal": 8.376, "max": 8.376, "min": 8.160 }
  },
  "internal": {
    "major_diameter": { "nominal": 10.0, "min": 10.0, "max": 10.280 },
    "pitch_diameter": { "nominal": 9.026, "min": 9.026, "max": 9.206 },
    "minor_diameter": { "nominal": 8.376, "min": 8.376, "max": 8.676 }
  },
  "class": "6g/6H",
  "thread_angle_deg": 60,
  "thread_height_mm": 0.812,
  "notes": "ISO 261 standard metric coarse thread"
}
```

## Examples
### Metric Coarse Thread Lookup
- Input: `prism_thread action=get_thread_specifications params={thread: "M10x1.5"}`
- Output: Full specs with 6g external / 6H internal tolerances, 60-degree thread angle
- Edge case: M10x1.0 (fine pitch) has tighter tolerances and shallower thread depth

### Unified National Thread
- Input: `prism_thread action=get_thread_specifications params={thread: "1/2-13 UNC"}`
- Output: UN thread specs with class 2A/2B tolerances, 60-degree included angle
- Edge case: UNF (fine) vs UNC (coarse) — always verify pitch, not just diameter

### Pipe Thread for Sealing
- Input: `prism_thread action=get_thread_specifications params={thread: "1/4-18 NPT"}`
- Output: Tapered pipe thread specs with 1:16 taper rate per side
- Edge case: NPT (tapered) vs NPTF (dryseal) have different crest/root requirements
