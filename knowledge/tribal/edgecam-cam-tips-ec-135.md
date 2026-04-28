---
id: "ec-135"
title: "Edgecam Designer Offset Surface for Electrode Design"
source: "web:edgecam-docs"
confidence: 0.8
category: "cam_strategy"
tags: ["designer", "electrode", "edm", "surface-offset"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.371Z
---

# Edgecam Designer Offset Surface for Electrode Design

For EDM electrode design, use Designer's surface offset tool to create the electrode shape. Offset the cavity surface by the spark gap (typically 0.1-0.3mm for roughing, 0.02-0.05mm for finishing). Add the electrode body by extruding the offset surface. Use Boolean unite to merge multiple electrode faces into a single solid body ready for machining.

**Category:** cam_strategy
**Confidence:** 0.8
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[topsolid-cam-tips-ts-057|Spark Gap Management with Per-Surface Control]]
- [[catia-cam-tips-cat-192|Electrode Design and Machining Integration in CATIA]]
- [[cimatron-cam-tips-cim-002|Electrode Extraction from Mold Cavity]]
- [[cimatron-cam-tips-cim-148|Copper Electrode Machining Parameters]]
- [[gibbscam-cam-tips-gc-195|GibbsCAM micro-electrode EDM preparation machines graphite electrodes to micron precision]]
