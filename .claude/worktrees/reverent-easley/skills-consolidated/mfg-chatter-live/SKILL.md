---
name: mfg-chatter-live
description: Detect chatter vibration in real-time from machine sensor data
---

# Real-Time Chatter Detection

## When To Use
- Monitoring vibration signatures during active machining operations
- Detecting onset of chatter before surface quality degrades
- Validating that spindle speed / depth-of-cut adjustments eliminated chatter
- Building vibration baselines for stability lobe analysis

## How To Use
```
prism_intelligence action=chatter_detect_live params={machine_id: "DMG-5X-01", window_ms: 500, threshold_rms: 3.0}
```

## What It Returns
- `chatter_detected` — boolean indicating if chatter signature is present
- `severity` — chatter severity level (none, mild, moderate, severe)
- `dominant_frequency` — dominant vibration frequency in Hz
- `rms_amplitude` — root-mean-square vibration amplitude
- `recommendation` — suggested corrective action (reduce DOC, shift RPM, etc.)

## Examples
- Monitor during roughing pass: `chatter_detect_live params={machine_id: "HAAS-VF2-03", window_ms: 1000}`
- Detect with custom threshold: `chatter_detect_live params={machine_id: "DMG-5X-01", threshold_rms: 2.5, sensitivity: "high"}`
- Check after parameter adjustment: `chatter_detect_live params={machine_id: "DMG-5X-01", compare_baseline: true}`
