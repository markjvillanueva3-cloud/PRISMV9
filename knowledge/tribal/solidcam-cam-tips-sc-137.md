---
id: "sc-137"
title: "Wire EDM Start Hole and Approach Strategy — Minimize Witness Marks"
source: "web:solidcam-docs"
confidence: 87
category: "cam_strategy"
tags: ["solidcam", "wire-edm", "start-hole", "approach", "lead-in"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.769Z
---

# Wire EDM Start Hole and Approach Strategy — Minimize Witness Marks

The wire threading start hole and approach path leave a witness mark on the cut surface. SolidCAM allows configuring the approach: lead-in angle (tangential, perpendicular, or at a specified angle), lead-in length (typically 2-5mm), and lead-in shape (linear or arc). For die and mold work, position the start hole on the scrap side and use an arc lead-in tangent to the profile — this eliminates any directional change at the profile entry point. For punch work where the start hole is inside the slug, use a straight lead-in with the start hole at least 3mm from the profile. The approach path is also used for skim passes that trim the rough-cut surface.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:solidcam-docs
**Operations:** wire_edm, setup

## Related
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-kb-024|Start hole positioning: 2-3mm from contour, never inside radius]]
- [[solidcam-cam-tips-sc-130|Wire EDM Profile Cutting — 2-Axis Contour with Multiple Skim Passes]]
- [[solidcam-cam-tips-sc-131|Wire EDM Taper Cutting — Constant and Variable Angle Profiles]]
- [[solidcam-cam-tips-sc-132|Wire EDM 4-Axis — Independent Upper and Lower Contour Programming]]
