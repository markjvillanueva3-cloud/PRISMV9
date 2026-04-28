---
id: "mc-115"
title: "Lead-in/lead-out arcs prevent tool marks at entry and exit points"
source: "web:community"
confidence: 87
category: "cam_strategy"
tags: ["mastercam", "lead-in", "lead-out", "arc-entry", "witness-mark", "surface-finish"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.199Z
---

# Lead-in/lead-out arcs prevent tool marks at entry and exit points

Always use arc lead-in and lead-out moves for finishing contours and walls. A perpendicular plunge into the material leaves a visible witness mark; a tangential arc entry (90-degree sweep, radius 0.5-2.0 mm) blends smoothly into the cut with no mark. For lead-out, mirror the lead-in geometry to prevent the tool from dwelling at the exit point. On critical surfaces, use a full 180-degree arc lead-out that lifts the tool gradually. Match lead-in direction to climb/conventional milling direction for consistent entry loads.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:community
**Operations:** finishing, contouring

## Related
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[mastercam-cam-tips-mc-213|Lead-in and lead-out geometry should be material-specific to balance tool life and surface quality]]
- [[mastercam-cam-tips-mc-114|Toolpath linking parameters control retract height, lead-in, and lead-out strategy]]
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
- [[fusion360-cam-tips-ext-f360-068|2D Contour Linking with Lead-In Arc for Clean Entry]]
