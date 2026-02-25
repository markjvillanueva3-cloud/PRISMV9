---
name: mfg-thread-diameters
description: Calculate pitch, minor, and major diameters for internal and external threads
---

## When To Use
- Need specific thread diameter values for programming or inspection
- Calculating pitch diameter for thread measurement with wires
- Determining minor diameter for stress area calculations
- NOT for full thread specifications with tolerances (use mfg-thread-specs)
- NOT for Go/No-Go gauge dimensions (use mfg-thread-gauges)

## How To Use
### Calculate Pitch Diameter
```
prism_thread action=calculate_pitch_diameter params={
  thread: "M10x1.5"
}
```

### Calculate Minor and Major Diameters
```
prism_thread action=calculate_minor_major_diameter params={
  thread: "M10x1.5",
  internal: true
}
```

### External Thread Diameters
```
prism_thread action=calculate_minor_major_diameter params={
  thread: "3/4-10 UNC",
  internal: false
}
```

## What It Returns
```json
{
  "thread": "M10x1.5",
  "pitch_mm": 1.5,
  "pitch_diameter_mm": 9.026,
  "major_diameter_mm": 10.0,
  "minor_diameter_mm": 8.376,
  "internal": true,
  "thread_height_mm": 0.812,
  "stress_area_mm2": 57.99,
  "wire_size_for_measurement_mm": 0.866,
  "measurement_over_wires_mm": 10.552,
  "notes": "Internal thread minor diameter defines tap drill size"
}
```

## Examples
### Metric Thread Pitch Diameter
- Input: `prism_thread action=calculate_pitch_diameter params={thread: "M10x1.5"}`
- Output: Pitch diameter 9.026mm, used for functional thread gauging
- Edge case: Pitch diameter is the most critical dimension for thread fit

### Internal Thread for Bore Sizing
- Input: `prism_thread action=calculate_minor_major_diameter params={thread: "M16x2.0", internal: true}`
- Output: Minor 13.835mm (tap drill reference), major 16.0mm, pitch 14.701mm
- Edge case: Internal major diameter has allowance above nominal for clearance

### Measurement Over Wires
- Input: `prism_thread action=calculate_pitch_diameter params={thread: "1/2-13 UNC"}`
- Output: Pitch diameter 0.4500", best wire size 0.04440", measurement over wires 0.5152"
- Edge case: Three-wire measurement assumes perfect thread form — worn threads give false readings
