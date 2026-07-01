---
name: tribal-mc-097
category: code-tribal
subdomain: tooling
domain: tribal-knowledge
tags: ["mastercam", "tool-assembly", "holder", "extension", "collision-envelope", "step-import"]
confidence: 87
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-097.md
promoted_at: 2026-06-09T22:31:16.419Z
---

# Tool Assembly definition combines cutter, holder, and extension for accurate collision checking

Mastercam Tool Assembly stacks the cutting tool, any extensions/reducers, and the holder into a single assembly with accurate geometry for simulation. Define each component's length, diameter, and taper precisely — the assembly envelope is used for all collision and clearance checking. Import 3D models of holders from manufacturer websites (Haimer, BIG DAISHOWA, Schunk) in STEP format for exact geometry. Approximate holder definitions with simple cylinders underestimate the collision envelope by 15-30%.

**Category:** tooling
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** setup, tooling

## Related
- [[mastercam-cam-tips-mc-267|Simulator tool-to-holder collision detection catches pull-out and shank interference before machine proves]]
- [[mastercam-cam-tips-mc-274|Custom tool holders in Tool Manager prevent false collision reports with non-standard holder geometries]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[bobcad-cam-tips-bc-094|Tool Assembly Definitions for Collision Accuracy]]
