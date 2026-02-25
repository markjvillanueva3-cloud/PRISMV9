---
name: mfg-adaptive-chatter
description: Real-time chatter detection and spindle speed adaptation
---

# Adaptive Chatter Suppression

## When To Use
- Detecting onset of regenerative chatter during milling or turning
- Automatically adjusting spindle speed to stable lobes
- Monitoring vibration signatures for early chatter warning
- Recovering from chatter without stopping the machine

## How To Use
```
prism_intelligence action=adaptive_chatter params={spindle_rpm: 8000, tool_diameter: 16, flutes: 4, depth_of_cut: 3.0}
```

## What It Returns
- `chatter_detected` — boolean flag for active chatter condition
- `severity` — chatter severity level (none, onset, moderate, severe)
- `recommended_rpm` — nearest stable spindle speed from SLD
- `frequency` — dominant chatter frequency in Hz
- `action` — recommended action (continue, adjust_rpm, reduce_depth, stop)

## Examples
- `adaptive_chatter params={spindle_rpm: 8000, tool_diameter: 16, flutes: 4, depth_of_cut: 3.0}` — check chatter state for current cut
- `adaptive_chatter params={vibration_rms: 4.2, spindle_rpm: 6000, flutes: 3}` — diagnose from vibration reading
- `adaptive_chatter params={mode: "find_stable", rpm_range: [4000, 12000], flutes: 4}` — find stable RPM in range
