---
id: "f360-199"
title: "Thermal Growth Compensation for Long Production Runs"
source: "web:autodesk-forum"
confidence: 0.85
category: "quality"
tags: ["fusion360", "thermal-growth", "compensation", "probing", "long-run"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.786Z
---

# Thermal Growth Compensation for Long Production Runs

During long production runs (4+ hours), machine thermal growth shifts the WCS by 0.01-0.05mm as the spindle, ballscrews, and structure heat up. In Fusion, program periodic probing cycles (every 10-20 parts) that measure a fixed reference point (a gauge block bolted to the table) and update the WCS offset. Add this to the post processor as a subroutine call at the beginning of each part cycle. The probing cycle measures X, Y, Z shifts and writes corrections via G10 L2. For machines with thermal compensation built into the control (Okuma Thermo-Friendly, DMG MORI TCC), verify that the machine's compensation is active and sufficient before adding CAM-level corrections — double compensation causes oscillating errors.

**Category:** quality
**Confidence:** 0.85
**Source:** web:autodesk-forum
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-091|WCS Probing to Establish Part Zero Automatically]]
- [[fusion360-cam-tips-ext-f360-092|Part Alignment Probing for Castings and Forgings]]
- [[fusion360-cam-tips-ext-f360-093|Geometry Inspection with Tolerance Bands]]
- [[fusion360-cam-tips-ext-f360-095|Live Connection Probing for Real-Time Results]]
- [[fusion360-cam-tips-ext-f360-120|Surface Inspection with In-Process Probing]]
