---
id: "gc-037"
title: "Indexed 5-axis (3+2) avoids simultaneous motion for simpler programming"
source: "web:gibbscam-docs"
confidence: 88
category: "cam_strategy"
tags: ["gibbscam", "5-axis", "indexed", "3+2", "rotary-position", "coordinate-system"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.860Z
---

# Indexed 5-axis (3+2) avoids simultaneous motion for simpler programming

When simultaneous 5-axis is not required, use GibbsCAM's indexed (3+2) approach: lock the rotary axes at a fixed orientation, then machine with 3-axis strategies. This is simpler to program, easier to verify, and produces more rigid cutting because the rotary axes are clamped. Define multiple coordinate systems at the desired rotary positions and assign operations to each CS. GibbsCAM automatically outputs the rotary positioning moves between operations. Use 3+2 for features like angled holes, chamfers on tilted faces, and flat surfaces that are not accessible from the primary axis orientation.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[camworks-cam-tips-cw-046|3+2 Indexed Machining — Fixed Orientation for Rigidity and Accuracy]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
- [[gibbscam-cam-tips-gc-031|Swarf milling uses the side of the cutter for ruled surface finishing]]
- [[gibbscam-cam-tips-gc-032|Multi-surface 5-axis machining handles complex blended geometry transitions]]
- [[gibbscam-cam-tips-gc-033|Port machining strategy programs internal passages with collision avoidance]]
