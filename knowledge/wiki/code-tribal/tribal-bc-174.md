---
name: tribal-bc-174
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["swiss-type", "bar-end", "remnant", "material-optimization", "cycle-summary"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-174.md
promoted_at: 2026-06-09T22:31:15.975Z
---

# BobCAD Swiss-Type Bar End Detection and Remnant Management

BobCAD programs bar-end detection routines in the post processor to stop the machine when the bar stock runs out. Calculate the number of parts per bar: (bar_length - grip_length - remnant) / (part_length + cutoff_width). BobCAD reports this in the cycle summary. For expensive materials, optimize cutoff blade width and part spacing to maximize parts per bar — switching from 1.5mm to 1.0mm cutoff saves one part per 3m bar on 10mm-long parts. Program a bar-end sensing routine that probes the bar position and compares to the minimum required length for one more part.

**Category:** setup
**Confidence:** 0.84
**Source:** web:bobcad-docs
**Operations:** turning

## Related
- [[camworks-cam-tips-cw-170|Swiss-Type Bar Remnant Management — Material Yield Optimization]]
- [[esprit-cam-tips-esp-135|Swiss-Type Bar Feed and Remnant Management]]
- [[solidcam-cam-tips-sc-085|Swiss-Type Bar Feeder — Automatic Remnant Length Calculation]]
- [[surfcam-cam-tips-sc2-162|SURFCAM Swiss-Type Bar Stock Remnant Optimization]]
- [[bobcad-cam-tips-bc-167|BobCAD Swiss-Type Lathe Programming with Guide Bushing]]
