---
id: "spr-015"
title: "Plasma Cutting with THC (Torch Height Control)"
source: "web:sprutcam-tutorials"
confidence: 0.81
category: "cam_strategy"
tags: ["plasma", "thc", "cutting", "pierce"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.858Z
---

# Plasma Cutting with THC (Torch Height Control)

SprutCAM's plasma module integrates with THC systems. Set initial pierce height (2× cut height), cut height (3-5mm for most materials), and transfer height. Program 'Arc OK' wait states after pierce before starting motion. For thick plate (>12mm), use edge start when possible to avoid pierce splatter. Set corner deceleration to maintain cut quality — 50% speed reduction at 90° corners.

**Category:** cam_strategy
**Confidence:** 0.81
**Source:** web:sprutcam-tutorials
**Operations:** specialty

## Related
- [[sprutcam-cam-tips-spr-007|Waterjet Cutting Path Optimization]]
- [[bobcad-cam-tips-bc-177|BobCAD Nesting with Common-Line Cutting]]
- [[sprutcam-cam-tips-spr-008|Laser Cutting with Kerf Compensation]]
