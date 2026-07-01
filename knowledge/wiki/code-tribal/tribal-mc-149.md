---
name: tribal-mc-149
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "swiss", "sub-spindle", "synchronization", "back-machining", "part-off"]
confidence: 84
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-149.md
promoted_at: 2026-06-09T22:31:16.431Z
---

# Sub-spindle synchronization in Mastercam enables back-side machining after part-off

Swiss machines with sub-spindles can pick off the part after cutoff and machine the back side (second operation) in the same cycle. In Mastercam, program the sub-spindle operations in a separate Toolpath Group within the same Machine Group. Use the Sync Manager to define synchronization points: the main spindle completes front-side operations, the sub-spindle advances and grips the part, cutoff occurs, then back-side operations run on the sub-spindle. Critical parameters: sub-spindle clamp pressure (lower for thin-wall parts to prevent distortion), Z-position accuracy of the pickup (±0.01 mm), and spindle speed matching during transfer to prevent torsional marks. Always program a facing operation as the first sub-spindle operation to clean up the cutoff pip.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:mastercam-docs
**Operations:** turning, swiss

## Related
- [[mastercam-cam-tips-mc-153|Part-off operations on Swiss machines require controlled feed reduction to prevent burrs]]
- [[gibbscam-cam-tips-gc-046|Sub-spindle transfer requires precise sync and clamp force control]]
- [[mastercam-cam-tips-mc-085|Sub-spindle transfer in Sync Manager requires precise handoff timing]]
- [[mastercam-cam-tips-mc-148|Guide bushing proximity in Swiss machining limits unsupported material length for rigidity]]
- [[mastercam-cam-tips-mc-150|Gang tooling layout in Swiss machining requires careful clearance planning for simultaneous cuts]]
