---
id: "gc-057"
title: "Face turning with spiral path eliminates the center dwell mark"
source: "web:community"
confidence: 85
category: "cam_strategy"
tags: ["gibbscam", "turning", "facing", "spiral", "center-mark", "surface-finish"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.877Z
---

# Face turning with spiral path eliminates the center dwell mark

Standard face turning in GibbsCAM produces a witness mark at the center where the tool decelerates to zero surface speed. Use the spiral facing option to generate a continuous spiral from OD to center (or center to OD), maintaining constant chip load throughout. The tool never dwells at center because it continuously feeds radially while rotating. This produces a superior face finish (Ra < 0.8 μm) especially on parts where the face is a sealing surface. Set the spiral pitch equal to the per-revolution feed rate for consistent scallop height.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community

## Related
- [[gibbscam-cam-tips-gc-003|Facing operations benefit from climb milling with 65-75% stepover]]
- [[gibbscam-cam-tips-gc-016|Spiral machining eliminates retract moves for continuous engagement]]
- [[gibbscam-cam-tips-gc-053|Rough turning with constant chip load adapts feed to varying diameter]]
- [[gibbscam-cam-tips-gc-054|Finish turning spring pass removes deflection error from the first pass]]
- [[gibbscam-cam-tips-gc-055|Grooving with peck cycle prevents chip packing in narrow grooves]]
