---
id: "ec-126"
title: "AFR Sensitivity Tuning for Complex Castings"
source: "web:edgecam-docs"
confidence: 0.82
category: "cam_strategy"
tags: ["afr", "feature-recognition", "castings", "sensitivity"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.364Z
---

# AFR Sensitivity Tuning for Complex Castings

Edgecam's Automatic Feature Recognition (AFR) sensitivity can be tuned per feature type. For castings with draft angles, reduce pocket recognition tolerance to 3-5° (default 1°) to detect drafted pockets as machinable features. Enable 'partial feature recognition' to detect features that don't fully conform to standard shapes — critical for castings where parting lines intersect feature boundaries.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[bobcad-cam-tips-bc-131|BobCAD V37 Automatic Feature Recognition for Hole Patterns]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[edgecam-cam-tips-ec-055|Feature Recognition Feeds Strategy Manager]]
- [[edgecam-cam-tips-ec-127|AFR Custom Feature Templates for Recurring Geometries]]
- [[esprit-cam-tips-esp-175|ESPRIT Knowledge Base Rules for Automated Feature Recognition]]
