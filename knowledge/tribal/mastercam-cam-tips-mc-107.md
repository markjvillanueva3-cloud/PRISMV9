---
id: "mc-107"
title: "FBM Drill automatically identifies and programs all hole features from solid model"
source: "web:mastercam-docs"
confidence: 85
category: "automation"
tags: ["mastercam", "fbm-drill", "feature-recognition", "automatic", "hole-features", "solid-model"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.192Z
---

# FBM Drill automatically identifies and programs all hole features from solid model

Feature Based Machining (FBM) Drill scans a solid model and automatically identifies all hole features (through holes, blind holes, counterbores, countersinks, tapped holes) with their dimensions and depths. It then selects appropriate drill cycles (spot, drill, tap, ream, bore) from the tool library and generates complete operations. FBM Drill handles 80-90% of hole features correctly on prismatic parts. Review the auto-generated operations for non-standard holes (interrupted, angled, or intersecting) which may need manual adjustment.

**Category:** automation
**Confidence:** 85
**Source:** web:mastercam-docs
**Operations:** drilling, automation

## Related
- [[mastercam-cam-tips-mc-214|FBM Drill automatically recognizes and programs all hole features from a solid model]]
- [[esprit-cam-tips-esp-089|Automatic Feature Recognition from Solid Models]]
- [[mastercam-cam-tips-mc-215|FBM Mill detects 2.5D pocket and boss features and auto-generates milling toolpaths]]
- [[mastercam-cam-tips-mc-233|5-axis deburring follows complex 3D edges that are inaccessible from a single tool orientation]]
- [[mastercam-cam-tips-mc-234|Edge-following deburr toolpath with automatic edge detection eliminates manual edge selection]]
