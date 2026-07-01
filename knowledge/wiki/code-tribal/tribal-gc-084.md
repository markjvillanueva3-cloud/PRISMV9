---
name: tribal-gc-084
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "simulation", "collision", "tool-holder", "spindle-nose", "safety-margin"]
confidence: 88
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-084.md
promoted_at: 2026-06-09T22:31:16.333Z
---

# Collision detection settings must include tool holder and spindle nose geometry

Many collisions occur not from the cutting tool but from the tool holder or spindle nose contacting the workpiece or fixture. In GibbsCAM, define tool holders as solid bodies in the tool library and enable 'Full Assembly' collision checking. Model the holder taper, collet nut, and any protrusions. Set the collision check to include: tool-to-part, holder-to-part, holder-to-fixture, spindle-to-part, and spindle-to-fixture. For 5-axis work where the spindle head swings close to the part, also include the head geometry. A 5mm safety margin around the holder accounts for real-world tolerance and vibration.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-083|Machine simulation verifies clearances between all moving components]]
- [[gibbscam-cam-tips-gc-082|Cut Part rendering reveals gouges and remaining stock with color coding]]
- [[gibbscam-cam-tips-gc-085|Stock comparison overlay quantifies material deviation from design intent]]
- [[gibbscam-cam-tips-gc-086|Gouge detection sensitivity should match surface tolerance requirements]]
- [[gibbscam-cam-tips-gc-087|Toolpath verification with backplot reveals rapid moves and feed transitions]]
