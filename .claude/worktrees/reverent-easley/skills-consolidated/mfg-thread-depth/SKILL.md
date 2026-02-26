---
name: mfg-thread-depth
description: Calculate thread depth and engagement percentage for tapped or milled threads
---

## When To Use
- Determining required thread depth for a given engagement percentage
- Verifying engagement percentage from a known thread depth
- Checking if a blind hole is deep enough for required thread engagement
- NOT for tap drill sizing (use mfg-tap-drill)
- NOT for full thread geometry (use mfg-thread-diameters)

## How To Use
### Calculate Thread Depth from Engagement
```
prism_thread action=calculate_thread_depth params={
  thread: "M10x1.5",
  engagement_percent: 75
}
```

### Calculate Engagement from Known Depth
```
prism_thread action=calculate_engagement_percent params={
  thread: "M10x1.5",
  depth: 8
}
```

### Blind Hole Thread Depth Check
```
prism_thread action=calculate_thread_depth params={
  thread: "1/4-20 UNC",
  engagement_percent: 65,
  blind_hole: true,
  hole_depth: 12
}
```

## What It Returns
```json
{
  "thread": "M10x1.5",
  "pitch_mm": 1.5,
  "thread_depth_mm": 10.0,
  "number_of_full_threads": 6.67,
  "engagement_percent": 75,
  "min_depth_for_engagement": 10.0,
  "recommended_drill_depth": 13.5,
  "notes": "Add 2-3 pitches to thread depth for tap lead in blind holes"
}
```

## Examples
### Standard Engagement Depth
- Input: `prism_thread action=calculate_thread_depth params={thread: "M10x1.5", engagement_percent: 75}`
- Output: 10.0mm thread depth (6.67 full threads) for 75% engagement
- Edge case: In cast iron, 65% engagement is sufficient — saves depth and tap life

### Verify Existing Hole Engagement
- Input: `prism_thread action=calculate_engagement_percent params={thread: "M10x1.5", depth: 8}`
- Output: 8mm depth gives ~60% engagement (5.33 threads) — may be insufficient for steel
- Edge case: First 1-2 threads are incomplete from tap chamfer and do not contribute to engagement

### Blind Hole Depth Planning
- Input: `prism_thread action=calculate_thread_depth params={thread: "M12x1.75", engagement_percent: 75, blind_hole: true, hole_depth: 18}`
- Output: 13.1mm thread depth needed, 18mm hole depth provides 4.9mm chip clearance
- Edge case: Spiral flute taps need less clearance than spiral point (gun) taps
