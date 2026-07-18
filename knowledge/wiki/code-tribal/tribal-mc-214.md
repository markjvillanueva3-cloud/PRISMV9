---
name: tribal-mc-214
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "fbm-drill", "feature-recognition", "solid-hole", "auto-programming", "hole-wizard"]
confidence: 86
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-214.md
promoted_at: 2026-06-09T22:31:16.448Z
---

# FBM Drill automatically recognizes and programs all hole features from a solid model

Mastercam's FBM Drill scans a solid model and identifies all hole features: through-holes, blind holes, counterbores, countersinks, tapped holes, and stepped holes. For each recognized hole, FBM automatically assigns the appropriate drill cycle (spot drill, twist drill, peck drill, tap, counterbore, ream) based on hole dimensions and tolerances stored in the feature data. This eliminates manual hole-by-hole programming — on a plate with 200 holes, FBM Drill creates the complete drilling sequence in seconds. The quality of FBM recognition depends on the solid model quality: native CAD models with feature history (SolidWorks, Inventor) produce better recognition than imported STEP/IGES files. For imported solids, use Mastercam's Solid Hole Recognition tool to manually assign feature properties (diameter, depth, thread spec) to holes that FBM cannot automatically identify.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** drilling, hole_making, automation

## Related
- [[mastercam-cam-tips-mc-107|FBM Drill automatically identifies and programs all hole features from solid model]]
- [[mastercam-cam-tips-mc-215|FBM Mill detects 2.5D pocket and boss features and auto-generates milling toolpaths]]
- [[mastercam-cam-tips-mc-219|Solid hole feature modification corrects imported holes that lack machining specifications]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
