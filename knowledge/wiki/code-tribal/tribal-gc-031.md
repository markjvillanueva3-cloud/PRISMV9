---
name: tribal-gc-031
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "5-axis", "swarf", "ruled-surface", "flank-milling"]
confidence: 88
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-031.md
promoted_at: 2026-06-09T22:31:16.319Z
---

# Swarf milling uses the side of the cutter for ruled surface finishing

GibbsCAM's 5-axis swarf milling engages the side (flank) of a flat or tapered end mill against a ruled surface, producing a single-pass finish. Set 'Calculation Based On' to 'Swarf Machining' and select the drive surface and two guiding edges. The tool tilts to keep its flank tangent to the ruled surface throughout the pass. Ideal for turbine blade sides, airfoil surfaces, and impeller channels. Ensure the surface is truly ruled (straight lines connect top/bottom edges) — attempting swarf on a double-curved surface causes gouging.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[esprit-cam-tips-esp-183|FreeForm 5-Axis Swarf Cutting for Ruled Surfaces]]
- [[mastercam-cam-tips-mc-064|Swarf cutting uses the tool's side to machine ruled surfaces in one pass]]
- [[gibbscam-cam-tips-gc-173|GibbsCAM 5-axis flank milling of gear teeth achieves superior surface finish]]
- [[gibbscam-cam-tips-gc-176|GibbsCAM 5-axis swarf cutting aligns cutter flank to ruled surfaces for single-pass finishing]]
- [[camworks-cam-tips-cw-047|Swarf Cutting — Side-of-Tool Machining for Ruled Surfaces]]
