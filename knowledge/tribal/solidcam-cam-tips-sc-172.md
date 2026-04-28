---
id: "sc-172"
title: "Rest Roughing Reference Tool — Set Correct Previous Tool Diameter"
source: "web:solidcam-docs"
confidence: 90
category: "cam_strategy"
tags: ["solidcam", "rest-machining", "reference-tool", "roughing", "stock-model"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.796Z
---

# Rest Roughing Reference Tool — Set Correct Previous Tool Diameter

SolidCAM's Rest Roughing calculates remaining stock based on the Reference Tool diameter from the previous operation. Always verify the reference tool matches the actual tool used — if a 20mm end mill roughed and you enter 16mm as reference, the rest operation will re-cut already-machined areas, wasting time and risking tool breakage on unexpected full-width cuts. In the Rest Machining parameters, use 'From Previous Operation' mode when operations are in the same CAM Part, or manually specify the exact reference tool diameter and corner radius when referencing across CAM Parts.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:solidcam-docs
**Operations:** roughing, rest_machining

## Related
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
- [[solidcam-cam-tips-sc-175-2|Constant Scallop Height Finishing]]
- [[solidcam-cam-tips-sc-059|HSM Constant Z with Spiral Transition — Eliminate Z-Step Witness Lines]]
- [[solidcam-cam-tips-sc-060|HSM Linear Finishing — Optimal Angle for Surface Quality]]
- [[solidcam-cam-tips-sc-061|HSM Spiral Finishing — Center-Out for Convex, Outside-In for Concave]]
