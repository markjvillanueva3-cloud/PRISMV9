---
name: mfg-tap-drill
description: Calculate tap drill size and recommended drill diameter for any thread standard
---

## When To Use
- User needs the correct drill size before tapping a hole
- Calculating tap drill diameter for metric, UN, or BSP threads
- Determining drill size for a specific thread engagement percentage
- NOT for thread milling parameters (use mfg-thread-mill)
- NOT for full thread specifications (use mfg-thread-specs)

## How To Use
### Calculate Tap Drill Size
```
prism_thread action=calculate_tap_drill params={
  thread: "M10x1.5",
  engagement_percent: 75
}
```

### Calculate Tap Drill for UN Threads
```
prism_thread action=calculate_tap_drill params={
  thread: "3/8-16 UNC",
  engagement_percent: 75
}
```

### Calculate Tap Drill for Pipe Threads
```
prism_thread action=calculate_tap_drill params={
  thread: "G1/2 BSP",
  engagement_percent: 70
}
```

## What It Returns
```json
{
  "thread": "M10x1.5",
  "tap_drill_diameter_mm": 8.5,
  "recommended_drill_size": "8.5mm",
  "engagement_percent": 75,
  "minor_diameter": 8.376,
  "pitch_mm": 1.5,
  "standard": "ISO_metric",
  "notes": "Standard 75% engagement for general purpose tapping"
}
```

## Examples
### Standard Metric Tap Drill
- Input: `prism_thread action=calculate_tap_drill params={thread: "M10x1.5", engagement_percent: 75}`
- Output: 8.5mm tap drill for 75% engagement in M10x1.5
- Edge case: Fine pitch M10x1.25 yields 8.75mm drill — always verify pitch

### High Engagement for Critical Fastening
- Input: `prism_thread action=calculate_tap_drill params={thread: "M8x1.25", engagement_percent: 85}`
- Output: Smaller drill (6.65mm) for higher engagement, harder to tap but stronger threads
- Edge case: Engagement above 83% in hardened steel increases tap breakage risk

### UN Thread in Imperial Shop
- Input: `prism_thread action=calculate_tap_drill params={thread: "1/2-13 UNC", engagement_percent: 75}`
- Output: 27/64" (0.4219") drill for 75% engagement
- Edge case: For aluminum, reduce engagement to 65% to prevent galling
