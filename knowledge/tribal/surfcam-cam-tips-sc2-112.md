---
id: "sc2-112"
title: "Part Alignment with Best-Fit and Datum Features"
source: "web:surfcam-alignment"
confidence: 86
category: "setup"
tags: ["alignment", "best-fit", "datum", "castings", "work-offset"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.131Z
---

# Part Alignment with Best-Fit and Datum Features

When the stock is not perfectly aligned to the machine axes, use SURFCAM's alignment tools to orient the part model to match the physical setup. Define the primary datum (flat face for Z-perpendicular), secondary datum (straight edge for X-alignment), and origin point. For castings with no flat references, use a best-fit alignment that minimizes the maximum stock allowance across all features. Output the alignment offsets as G-code work offset adjustments.

**Category:** setup
**Confidence:** 86
**Source:** web:surfcam-alignment
**Operations:** setup

## Related
- [[camworks-cam-tips-cw-118|Part Alignment Probing — Compensate for Misaligned Raw Stock]]
- [[catia-cam-tips-cat-096|Machine Setup Origin Alignment with Part Datum]]
- [[cimatron-cam-tips-cim-092|Workplane Management for Multi-Setup Molds]]
- [[powermill-cam-tips-pm-071|Multi-Setup Coordinate System Alignment]]
- [[powermill-cam-tips-pm-139|Multi-Setup Alignment with Probing]]
