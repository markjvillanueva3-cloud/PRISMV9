---
id: "sc2-176"
title: "SURFCAM Composite Ply-by-Ply Machining for Stepped Features"
source: "web:surfcam-docs"
confidence: 0.84
category: "cam_strategy"
tags: ["composite", "ply-drop", "stepped", "rest-machining", "ply-edge"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.187Z
---

# SURFCAM Composite Ply-by-Ply Machining for Stepped Features

For composite parts with ply drop-offs or stepped features, SURFCAM can machine each ply layer individually using rest-machining logic. Define each ply thickness (0.125-0.25mm for prepreg) and the drop-off locations. Program light finishing passes at each step to avoid delaminating the exposed ply edges. Use a small ball-nose (3-6mm) with 30,000+ RPM for ply-edge finishing. The step height equals the number of dropped plies × ply thickness. Keep radial engagement below 20% of cutter diameter to minimize cutting force on the delicate ply edges.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:surfcam-docs
**Operations:** finishing

## Related
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[bobcad-cam-tips-bc-037|5-Axis Trimming for Composite and Sheet Parts]]
- [[bobcad-cam-tips-bc-187|BobCAD CFRP Composite Trim Cutting with Compression Routers]]
- [[bobcad-cam-tips-bc-188|BobCAD Composite Drilling with Delamination Prevention]]
- [[bobcad-cam-tips-bc-189|BobCAD CFRP/Metal Stack Drilling Parameters]]
