---
name: mfg-thread-gcode
description: Generate complete G-code for threading operations including rigid tap, single-point, and helical
---

## When To Use
- Need ready-to-post G-code for a threading cycle
- Programming rigid tapping (G84), single-point threading (G76), or helical interpolation
- Generating controller-specific threading code for Fanuc, Siemens, Haas, or Mazak
- NOT for thread insert selection (use mfg-thread-insert)
- NOT for tap drill sizing (use mfg-tap-drill)

## How To Use
### Rigid Tapping G-code
```
prism_thread action=generate_thread_gcode params={
  thread: "M10x1.5",
  hole_depth: 20,
  controller: "fanuc",
  method: "rigid_tap"
}
```

### Single-Point Threading on Lathe
```
prism_thread action=generate_thread_gcode params={
  thread: "M20x2.5",
  thread_length: 30,
  controller: "fanuc",
  method: "single_point",
  infeed: "modified_flank"
}
```

### Thread Milling Helical G-code
```
prism_thread action=generate_thread_gcode params={
  thread: "M16x2.0",
  hole_depth: 18,
  controller: "haas",
  method: "thread_mill",
  tool_diameter: 12,
  climb: true
}
```

## What It Returns
```json
{
  "thread": "M10x1.5",
  "controller": "fanuc",
  "method": "rigid_tap",
  "gcode": [
    "( M10x1.5 RIGID TAP - DEPTH 20.0MM )",
    "G90 G54",
    "T04 M06 ( M10x1.5 TAP )",
    "G00 X0. Y0.",
    "G43 H04 Z5.0 M08",
    "S500 M03",
    "G84 Z-20.0 R2.0 F750. ( PITCH 1.5 x RPM 500 )",
    "G80",
    "G00 Z50.0 M09",
    "M01"
  ],
  "parameters": {
    "rpm": 500,
    "feed_mm_min": 750,
    "pitch_mm": 1.5,
    "retract_plane": 2.0,
    "peck": false
  },
  "notes": "Feed = RPM x Pitch. Synchronize spindle encoder before rigid tapping."
}
```

## Examples
### Fanuc Rigid Tapping
- Input: `prism_thread action=generate_thread_gcode params={thread: "M10x1.5", hole_depth: 20, controller: "fanuc", method: "rigid_tap"}`
- Output: G84 cycle at 500 RPM, F750 (500 x 1.5), includes safe retract and coolant
- Edge case: Feed override MUST be locked to 100% during rigid tapping

### Fanuc G76 Single-Point Threading
- Input: `prism_thread action=generate_thread_gcode params={thread: "M24x3.0", thread_length: 35, controller: "fanuc", method: "single_point"}`
- Output: G76 compound cycle with multi-pass infeed, spring passes, 29.5-degree flank angle
- Edge case: G76 P/Q values are controller-specific — Fanuc uses microns, Haas uses decimals

### Haas Thread Milling
- Input: `prism_thread action=generate_thread_gcode params={thread: "M16x2.0", hole_depth: 18, controller: "haas", method: "thread_mill", tool_diameter: 12}`
- Output: Helical interpolation with G02/G03 and Z-axis feed, arc entry and exit moves
- Edge case: Verify cutter compensation direction — G41 for climb, G42 for conventional
