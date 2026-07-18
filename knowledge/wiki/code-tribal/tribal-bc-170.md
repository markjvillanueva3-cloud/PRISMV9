---
name: tribal-bc-170
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["swiss-type", "sub-spindle", "back-working", "facing", "concentricity"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-170.md
promoted_at: 2026-06-09T22:31:15.973Z
---

# BobCAD Swiss-Type Sub-Spindle Back-Working Operations

After part-off, the sub-spindle grips the part for back-working operations: facing, boring, chamfering, and threading the back end. BobCAD programs back-working in a separate setup with the Z-axis reversed (tool approaches from the sub-spindle side). Define the sub-spindle grip length (typically 3-8mm of the part body) and the maximum extension from the guide bushing. Minimize the grip length to maximize the machinable area on the back end. For parts requiring tight concentricity between front and back features, the sub-spindle grip must be concentric to within 0.005mm.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** turning

## Related
- [[camworks-cam-tips-cw-167|Swiss-Type Sub-Spindle Operations — Back-Working and Part-Off]]
- [[topsolid-cam-tips-ts-166|TopSolid Swiss-Type Sub-Spindle Back-Working — Second-Op Programming]]
- [[sprutcam-cam-tips-spr-047|Back-Working Operations on Sub-Spindle]]
- [[esprit-cam-tips-esp-043|Sub-Spindle Transfer Sequence Critical for Part Quality]]
- [[esprit-cam-tips-esp-131|Swiss-Type Sub-Spindle Pickup and Cutoff Sequencing]]
