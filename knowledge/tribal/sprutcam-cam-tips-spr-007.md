---
id: "spr-007"
title: "Waterjet Cutting Path Optimization"
source: "web:sprutcam-tutorials"
confidence: 0.83
category: "cam_strategy"
tags: ["waterjet", "cutting", "corner-speed", "pierce"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.852Z
---

# Waterjet Cutting Path Optimization

SprutCAM's waterjet module supports abrasive and pure water modes. For abrasive cutting: reduce speed at corners (60% of straight-line speed for 90° corners, 40% for acute angles) to prevent taper and lag. Set 'Pierce Type' to 'Dynamic' for thick materials — this ramps pressure from low to operating pressure over 2-3 seconds, preventing blowout on the entry side.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:sprutcam-tutorials
**Operations:** specialty

## Related
- [[sprutcam-cam-tips-spr-015|Plasma Cutting with THC (Torch Height Control)]]
- [[bobcad-cam-tips-bc-192|BobCAD Composite Waterjet Trim Integration]]
- [[edgecam-cam-tips-ec-167|Composite Waterjet Trimming Toolpath from Edgecam]]
- [[surfcam-cam-tips-sc2-175|SURFCAM Composite Edge Trimming with Waterjet Integration]]
- [[sprutcam-cam-tips-spr-008|Laser Cutting with Kerf Compensation]]
