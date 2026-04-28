---
id: "f360-092"
title: "Part Alignment Probing for Castings and Forgings"
source: "web:fusion360-docs"
confidence: 86
category: "quality"
tags: ["fusion360", "part-alignment", "probing", "casting", "best-fit"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.699Z
---

# Part Alignment Probing for Castings and Forgings

Use Fusion's Part Alignment probe cycle to align rough castings and forgings that are not precisely positioned in the fixture. The alignment cycle probes multiple points on the part surface, calculates the best-fit transformation (translation + rotation), and applies the offset to the WCS. This is critical for parts with minimal machining stock — a 1mm misalignment on a casting can result in broken tools or scrapped parts. Program at least 6 probe points distributed across the part for reliable alignment.

**Category:** quality
**Confidence:** 86
**Source:** web:fusion360-docs
**Operations:** probing

## Related
- [[fusion360-cam-tips-ext-f360-125|Part Alignment Probing for Multi-Setup Work]]
- [[surfcam-cam-tips-sc2-207|SURFCAM Best-Fit Alignment Probing for Castings]]
- [[fusion360-cam-tips-ext-f360-091|WCS Probing to Establish Part Zero Automatically]]
- [[fusion360-cam-tips-ext-f360-093|Geometry Inspection with Tolerance Bands]]
- [[fusion360-cam-tips-ext-f360-095|Live Connection Probing for Real-Time Results]]
