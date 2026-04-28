---
id: "spr-047"
title: "Back-Working Operations on Sub-Spindle"
source: "web:sprutcam-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["back-working", "sub-spindle", "part-transfer", "facing"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.882Z
---

# Back-Working Operations on Sub-Spindle

After part transfer to the sub-spindle, program back-working operations: face the cut-off nub, bore internal features, and finish the back face. In SprutCAM, define a separate coordinate system for the sub-spindle with reversed Z-direction. Set 'Part Transfer' synchronization to ensure the sub-spindle grips before the main spindle releases. Verify clearance between collet and tool holder.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:sprutcam-docs
**Operations:** turning

## Related
- [[bobcad-cam-tips-bc-170|BobCAD Swiss-Type Sub-Spindle Back-Working Operations]]
- [[fusion360-cam-tips-ext-f360-133|Sub-Spindle Transfer and Back Working]]
- [[camworks-cam-tips-cw-167|Swiss-Type Sub-Spindle Operations — Back-Working and Part-Off]]
- [[sprutcam-cam-tips-spr-185|Back-Working Sub-Spindle Coordination]]
- [[topsolid-cam-tips-ts-166|TopSolid Swiss-Type Sub-Spindle Back-Working — Second-Op Programming]]
