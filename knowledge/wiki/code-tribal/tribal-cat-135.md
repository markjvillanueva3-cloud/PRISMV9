---
name: tribal-cat-135
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "prismatic", "zlevel", "helical-entry", "roughing"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-135.md
promoted_at: 2026-06-09T22:31:16.062Z
---

# Prismatic ZLevel Roughing with Helical Entry Strategy

For deep prismatic pockets in CATIA, combine Z-Level roughing with helical entry to eliminate plunge cutting. In the Roughing operation, set Approach Mode to 'Helical' with a helix diameter of 1.5-2x the tool diameter and a ramp angle of 2-5 degrees. This prevents full-width tool engagement at entry and reduces axial shock. Set the 'Max Plunge Depth' equal to 1 Ap (axial depth of cut) so the helix ramps only one level before transitioning to the spiral/zigzag roughing pattern. For materials like stainless steel, reduce helix feed to 50% of cutting feed.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:catia-docs
**Operations:** roughing

## Related
- [[catia-cam-tips-cat-048|Z-Level Roughing With Helical Entry for Hard Materials]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
- [[catia-cam-tips-cat-004|T-Slot Machining Requires Two-Stage Approach]]
