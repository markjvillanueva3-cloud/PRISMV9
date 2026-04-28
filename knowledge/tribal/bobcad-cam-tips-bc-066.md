---
id: "bc-066"
title: "Wire Threading and Glue Stop Programming"
source: "web:bobcad-wire-threading"
confidence: 87
category: "cam_strategy"
tags: ["wire-edm", "wire-threading", "glue-stop", "awt", "unattended"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.508Z
---

# Wire Threading and Glue Stop Programming

BobCAD Wire EDM programs automatic wire threading (AWT) sequences and glue stops. Glue stops temporarily bond the slug to the workpiece, preventing it from dropping during unattended cutting. After all profiles are cut, return to each glue stop for removal. BobCAD supports programmable glue stop positions and sizes. AWT sequences include: wire cut, guide retract, wire feed through start hole, guide close, tension apply, test cut. Start holes should be 0.3-0.5mm larger than wire diameter.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:bobcad-wire-threading
**Operations:** wire_edm

## Related
- [[esprit-cam-tips-esp-157|Wire EDM Glue Stop Strategy for Slug Retention]]
- [[gibbscam-cam-tips-gc-068|Glue stop technique uses adhesive to hold slugs for unattended operation]]
- [[gibbscam-cam-tips-gc-069|Automatic wire threading enables multi-opening unattended production]]
- [[surfcam-cam-tips-sc2-168|SURFCAM Wire EDM Wire Threading and Re-Threading Sequences]]
- [[bobcad-cam-tips-bc-160|BobCAD Wire EDM Automatic Wire Threading Point Optimization]]
