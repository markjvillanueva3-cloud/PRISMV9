---
name: tribal-sc2-112
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["alignment", "best-fit", "datum", "castings", "work-offset"]
confidence: 86
source: "web:surfcam-alignment"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-112.md
promoted_at: 2026-06-09T22:31:16.684Z
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
