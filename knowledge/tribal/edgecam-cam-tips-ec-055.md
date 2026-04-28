---
id: "ec-055"
title: "Feature Recognition Feeds Strategy Manager"
source: "web:edgecam-strategy-manager"
confidence: 89
category: "automation"
tags: ["feature-recognition", "solid-model", "afr", "strategy-manager"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.294Z
---

# Feature Recognition Feeds Strategy Manager

Strategy Manager works best with solid models that have recognizable features. Edgecam's automatic feature recognition (AFR) identifies holes (through, blind, tapped, countersunk), pockets, slots, faces, and bosses from the solid model. Each feature includes geometric parameters (depth, diameter, radius) that Strategy Manager rules use to assign the correct machining operations. Ensure models have proper fillets and clean geometry for reliable feature recognition.

**Category:** automation
**Confidence:** 89
**Source:** web:edgecam-strategy-manager
**Operations:** all

## Related
- [[surfcam-cam-tips-sc2-134|SURFCAM 2023 Automatic Feature Recognition from Solid Models]]
- [[bobcad-cam-tips-bc-131|BobCAD V37 Automatic Feature Recognition for Hole Patterns]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[edgecam-cam-tips-ec-126|AFR Sensitivity Tuning for Complex Castings]]
- [[edgecam-cam-tips-ec-127|AFR Custom Feature Templates for Recurring Geometries]]
