---
id: "bc-083"
title: "Stock Model Tracking Across Operations"
source: "web:bobcad-stock-model"
confidence: 89
category: "setup"
tags: ["stock-model", "in-process", "auto-regeneration", "multi-setup"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.521Z
---

# Stock Model Tracking Across Operations

BobCAD maintains an in-process stock model updated after each operation. This is essential for rest machining accuracy and collision detection with partially-machined parts. Operations must be in correct order in the CAM Tree. If operations are reordered or deleted, the stock model auto-regenerates from that point forward. For multi-setup parts, the stock model carries across setups — the Setup 2 starting stock reflects all Setup 1 material removal.

**Category:** setup
**Confidence:** 89
**Source:** web:bobcad-stock-model
**Operations:** verification, setup

## Related
- [[cimatron-cam-tips-cim-037|IPW Transfer Between NC Setups]]
- [[mastercam-cam-tips-mc-178|Stock model generation from previous operations provides accurate rest material boundaries]]
- [[surfcam-cam-tips-sc2-065|Stock Model Tracking Across Multiple Operations]]
- [[surfcam-cam-tips-sc2-132|SURFCAM 2023 Stock Model Carries Accurate In-Process Geometry]]
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
