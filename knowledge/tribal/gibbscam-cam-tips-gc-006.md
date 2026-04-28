---
id: "gc-006"
title: "Contour operations require lead-in/lead-out arcs to avoid witness marks"
source: "web:gibbscam-docs"
confidence: 88
category: "cam_strategy"
tags: ["gibbscam", "contouring", "2.5d", "lead-in", "lead-out", "witness-mark"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.836Z
---

# Contour operations require lead-in/lead-out arcs to avoid witness marks

Always define tangential arc lead-in and lead-out moves for contour operations. In GibbsCAM, set the lead-in radius to 25-50% of the cutter diameter and use an arc angle of 90°. This ensures the cutter is at full cutting speed before contacting the finished surface. Without lead-in arcs, the tool plunges directly onto the part wall, creating a witness mark or dwell burn. For finish contours, overlap the entry/exit point by 5° of arc to blend the seam.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[gibbscam-cam-tips-gc-063|2-axis wire EDM uses automatic lead-in to prevent witness marks on part]]
- [[mastercam-cam-tips-mc-115|Lead-in/lead-out arcs prevent tool marks at entry and exit points]]
- [[gibbscam-cam-tips-gc-001|Use Solid Face Selection for profiling to avoid manual geometry creation]]
- [[gibbscam-cam-tips-gc-002|Set pocket corner radius larger than cutter radius for smoother engagement]]
