---
name: tribal-ec-129
category: code-tribal
subdomain: automation
domain: tribal-knowledge
tags: ["afr", "threads", "tapping", "hole-recognition"]
confidence: 0
source: "web:edgecam-forum"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-129.md
promoted_at: 2026-06-09T22:31:16.191Z
---

# AFR Thread Detection and Automatic Tapping Assignment

AFR detects threaded holes by recognizing cosmetic thread features in imported solid models (STEP/Parasolid). Ensure the CAD model includes thread annotations or cosmetic thread representations. Configure the thread table in Edgecam's tool library mapping thread designations (M6x1.0, M8x1.25, etc.) to specific taps and pre-drill diameters. AFR then generates the complete drill-chamfer-tap sequence automatically for each detected thread.

**Category:** automation
**Confidence:** 0.84
**Source:** web:edgecam-forum
**Operations:** drilling, tapping

## Related
- [[edgecam-cam-tips-ec-128|AFR Hole Recognition Diameter Banding]]
- [[bobcad-cam-tips-bc-131|BobCAD V37 Automatic Feature Recognition for Hole Patterns]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
