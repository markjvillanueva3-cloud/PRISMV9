---
name: tribal-gc-058
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "turning", "boring", "damped-bar", "deep-hole"]
confidence: 85
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-058.md
promoted_at: 2026-06-09T22:31:16.327Z
---

# Boring operations benefit from fine boring bar with damping for deep holes

For boring operations in GibbsCAM with depth-to-diameter ratios > 4:1, define a damped boring bar in the tool library with the actual bar diameter and overhang. Set the 'Min Bore Diameter' to prevent the system from selecting bars too close to the bore wall. GibbsCAM adjusts the toolpath clearance moves to account for the bar diameter. For rough boring, use 0.3-0.5mm depth of cut per side; for finish boring, use 0.05-0.15mm. Set the retract to the bore entrance (not above the part) to prevent the bar from catching the bore exit edge on retraction.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-053|Rough turning with constant chip load adapts feed to varying diameter]]
- [[gibbscam-cam-tips-gc-054|Finish turning spring pass removes deflection error from the first pass]]
- [[gibbscam-cam-tips-gc-055|Grooving with peck cycle prevents chip packing in narrow grooves]]
- [[gibbscam-cam-tips-gc-056|Threading with multiple passes uses decreasing infeed for surface quality]]
- [[gibbscam-cam-tips-gc-057|Face turning with spiral path eliminates the center dwell mark]]
