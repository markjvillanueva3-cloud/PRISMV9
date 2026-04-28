---
id: "gc-123"
title: "GibbsCAM 14 Part Compare detects model changes and highlights affected toolpaths"
source: "web:gibbscam-docs"
confidence: 81
category: "cam_strategy"
tags: ["gibbscam", "v14", "part-compare", "eco", "model-update"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.928Z
---

# GibbsCAM 14 Part Compare detects model changes and highlights affected toolpaths

When an updated CAD model is reimported, GibbsCAM 14's Part Compare function overlays the old and new geometry, color-coding unchanged regions (green), removed material (red), and added material (blue). Toolpaths associated with changed regions are automatically flagged for regeneration, while unchanged toolpaths remain valid. This dramatically reduces reprogramming time for engineering change orders (ECOs). Set the comparison tolerance to your machining tolerance (typically 0.01-0.025 mm) to filter insignificant model changes from actionable ones.

**Category:** cam_strategy
**Confidence:** 81
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-121|GibbsCAM 14 Solid Machining uses B-rep kernels for direct solid feature recognition]]
- [[gibbscam-cam-tips-gc-122|GibbsCAM 14 multi-body part management simplifies tombstone and multi-part programming]]
- [[gibbscam-cam-tips-gc-124|GibbsCAM 14 High-Efficiency Roughing with morphing stepover reduces radial engagement spikes]]
- [[gibbscam-cam-tips-gc-125|GibbsCAM 14 Tool Holder Visualization in simulation prevents costly collisions]]
- [[gibbscam-cam-tips-gc-126|GibbsCAM 14 supports direct PDF-based setup sheet generation with embedded screenshots]]
