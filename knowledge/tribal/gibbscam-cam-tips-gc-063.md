---
id: "gc-063"
title: "2-axis wire EDM uses automatic lead-in to prevent witness marks on part"
source: "web:gibbscam-docs"
confidence: 87
category: "cam_strategy"
tags: ["gibbscam", "wire-edm", "2-axis", "lead-in", "witness-mark"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.881Z
---

# 2-axis wire EDM uses automatic lead-in to prevent witness marks on part

In GibbsCAM Wire EDM, always define a lead-in approach on the scrap side of the cut. Set the lead-in as a tangent arc (90° arc, radius 1-3mm) from the pierce point to the profile start. This ensures the wire is at full cutting conditions before contacting the finished surface. Without a lead-in, the wire start point leaves a witness mark from the initial rough cut. For external profiles, the lead-in should approach from outside the part. For internal profiles (die openings), lead in from the scrap slug side.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
- [[gibbscam-cam-tips-gc-006|Contour operations require lead-in/lead-out arcs to avoid witness marks]]
- [[bobcad-cam-tips-bc-153|BobCAD Wire EDM 2-Axis Profile Cutting Fundamentals]]
- [[esprit-cam-tips-esp-051|Wire EDM 2-Axis Profile with Automatic Lead Placement]]
