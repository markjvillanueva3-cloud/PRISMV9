---
id: "nx-121"
title: "Electrode Machining Workflow with NX"
source: "web:siemens-nx-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["electrode", "mold", "graphite", "erowa"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.421Z
---

# Electrode Machining Workflow with NX

Machine electrodes using NX's mold manufacturing workflow: extract electrode geometry from cavity, define blank and holder, program roughing (offset area clear, 0.1mm stock) and finishing (3D contour, 0.02mm step-over). Apply different undersizes for roughing electrodes (0.3mm) vs finishing (0.05mm). No coolant for graphite — use vacuum extraction. Program datum pads for CMM qualification on the EROWA/3R pallet.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:siemens-nx-docs
**Operations:** specialty

## Related
- [[tebis-cam-tips-teb-067|Electrode Design and Machining Workflow]]
- [[catia-cam-tips-cat-192|Electrode Design and Machining Integration in CATIA]]
- [[cimatron-cam-tips-cim-002|Electrode Extraction from Mold Cavity]]
- [[cimatron-cam-tips-cim-015|Graphite Electrode Machining Parameters]]
- [[cimatron-cam-tips-cim-046|Uncertainty Budget for EDM Electrode Positioning]]
