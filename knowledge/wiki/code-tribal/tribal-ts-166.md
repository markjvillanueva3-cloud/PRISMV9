---
name: tribal-ts-166
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "swiss-type", "sub-spindle", "back-working", "part-off"]
confidence: 90
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-166.md
promoted_at: 2026-05-26T16:07:21.187Z
---

# TopSolid Swiss-Type Sub-Spindle Back-Working — Second-Op Programming

After main spindle operations and part-off, TopSolid programs the sub-spindle back-working sequence: (1) sub-spindle advance and grip, (2) synchronized part-off (both spindles rotating), (3) sub-spindle retract with part, (4) back-working operations (face, chamfer, drill, thread the parted-off end). TopSolid automatically reverses the Z-axis direction for sub-spindle operations. Set the sub-spindle grip overlap to 2-3x the part-off blade width plus 0.5mm facing stock. The post processor generates the brand-specific sync codes (Citizen, Star, Tornos, Tsugami).

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-docs
**Operations:** turning

## Related
- [[camworks-cam-tips-cw-167|Swiss-Type Sub-Spindle Operations — Back-Working and Part-Off]]
- [[bobcad-cam-tips-bc-170|BobCAD Swiss-Type Sub-Spindle Back-Working Operations]]
- [[surfcam-cam-tips-sc2-160|SURFCAM Swiss-Type Part-Off Optimization with Overlap]]
- [[topsolid-cam-tips-ts-164|TopSolid Swiss-Type Lathe Programming — Complete Multi-Axis Workflow]]
- [[topsolid-cam-tips-ts-165|TopSolid Swiss-Type Synchronization — Gang Tool Overlapping]]
