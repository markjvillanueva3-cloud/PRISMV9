---
name: tribal-mc-219
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "solid-hole", "feature-modification", "imported", "thread", "tolerance"]
confidence: 85
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-219.md
promoted_at: 2026-06-09T22:31:16.449Z
---

# Solid hole feature modification corrects imported holes that lack machining specifications

Holes imported from STEP, IGES, or Parasolid files often lack the manufacturing details (thread spec, tolerance class, counterbore depth) that FBM needs to assign the correct machining sequence. Mastercam's Solid Hole Feature modification tool lets you select imported holes and assign these properties: set the hole type (plain, threaded, counterbored, countersunk), specify the tolerance (H7 reamed, H9 drilled), assign thread parameters (M8×1.25, 1/4-20), and define the full depth stack (spot depth, drill depth, thread depth, chamfer). Once modified, FBM recognizes these holes and auto-assigns the correct cycle sequence. For files with many identical holes, modify one hole and use 'Apply to Similar Features' to propagate the properties to all matching holes. This correction step typically adds 5–10 minutes but saves 30–60 minutes of manual drill operation programming.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:mastercam-docs
**Operations:** drilling, hole_making, setup

## Related
- [[mastercam-cam-tips-mc-071|3+2 positioning uses indexed tilts instead of simultaneous 5-axis for rigidity]]
- [[mastercam-cam-tips-mc-074|Arc Fit Tolerance controls the smoothness vs accuracy tradeoff in HSM toolpaths]]
- [[mastercam-cam-tips-mc-146|Shut-off surface machining demands tight tolerances to prevent plastic flash at mold contact zones]]
- [[mastercam-cam-tips-mc-175|Spring passes in micro finishing remove deflection-induced oversize material]]
- [[mastercam-cam-tips-mc-214|FBM Drill automatically recognizes and programs all hole features from a solid model]]
