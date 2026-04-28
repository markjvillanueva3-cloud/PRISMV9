---
id: "mc-052"
title: "Rest roughing depth calculation must account for previous tool corner radius"
source: "web:community"
confidence: 85
category: "cam_strategy"
tags: ["mastercam", "rest-roughing", "corner-radius", "previous-tool", "material-calculation"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.147Z
---

# Rest roughing depth calculation must account for previous tool corner radius

When computing rest material for 3D roughing, Mastercam calculates where the previous tool's corner radius left material based on the defined tool geometry. If the previous tool corner radius is entered incorrectly (e.g., sharp corner entered instead of the actual 0.5 mm radius), the rest toolpath will either miss material or cut air. Always verify the previous tool's corner radius in the Rest Material settings matches the actual tool, especially after tool changes.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** roughing, rest_machining

## Related
- [[mastercam-cam-tips-mc-181|Minimum cutter diameter for rest machining determines the smallest accessible feature]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-041|Dynamic Mill approach distance controls initial engagement ramp length]]
