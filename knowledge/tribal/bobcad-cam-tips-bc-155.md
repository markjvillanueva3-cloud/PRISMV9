---
id: "bc-155"
title: "BobCAD Wire EDM No-Core Cutting Strategy"
source: "web:bobcad-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["wire-edm", "no-core", "coreless", "edge-approach", "start-hole"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.578Z
---

# BobCAD Wire EDM No-Core Cutting Strategy

BobCAD's no-core (coreless) wire EDM strategy cuts without a start hole by approaching from the workpiece edge. Program the wire approach along the workpiece edge, then transition to the cutting profile. This eliminates the need for EDM hole drilling or conventional drilling of start holes. Use no-core cutting for thin workpieces (<10mm) and open profiles. The approach path must be long enough for the wire to establish stable cutting — minimum 5mm approach at reduced power. Set the approach feed to 50% of the normal cutting feed to prevent wire breakage at the edge transition.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:bobcad-docs
**Operations:** wire_edm

## Related
- [[esprit-cam-tips-esp-155|Wire EDM No-Core (Coreless) Cutting Strategy]]
- [[gibbscam-cam-tips-gc-066|No-core cutting eliminates slug dropping for small internal features]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[bobcad-cam-tips-bc-064|No-Core Wire EDM for Non-Droppable Slugs]]
- [[bobcad-cam-tips-bc-159|BobCAD Wire EDM Open Profile and Partial Cut Strategies]]
