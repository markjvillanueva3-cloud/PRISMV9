---
id: "ec-142"
title: "Fixture Plate Part Presence Probing Before Machining"
source: "web:edgecam-forum"
confidence: 0.83
category: "cam_strategy"
tags: ["fixture-plate", "probing", "part-presence", "macro"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.377Z
---

# Fixture Plate Part Presence Probing Before Machining

Add probe routines before machining each fixture plate position to verify part presence. Program a single-point probe touch at a known Z-height — if the probe triggers, the part is present and machining proceeds; if it doesn't trigger within the expected travel, skip that position via macro branching (#variable and GOTO). This handles partially loaded fixture plates without operator intervention.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:edgecam-forum
**Operations:** probing

## Related
- [[controller-knowledge-tips-ctrl-023|Haas macro variables and probing]]
- [[controller-knowledge-tips-ctrl-050|Universal probing compatibility across controllers]]
- [[controller-knowledge-tips-ctrl-090|Haas macro look-ahead gotcha — G103 P1 for variable reads]]
- [[topsolid-cam-tips-ts-072|Custom Macro Support for Probing and Special Cycles]]
- [[worknc-cam-tips-wnc-064|Custom Macro Support for Probing and Special Cycles]]
