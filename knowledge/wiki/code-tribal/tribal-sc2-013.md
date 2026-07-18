---
name: tribal-sc2-013
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["facing", "overlap", "bidirectional", "surface-finish"]
confidence: 89
source: "web:surfcam-2axis-facing"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-013.md
promoted_at: 2026-06-09T22:31:16.664Z
---

# Facing Operations with Overlap and Bidirectional Cutting

SURFCAM facing uses a zigzag (bidirectional) pattern with configurable overlap percentage. Set overlap to 5-10% of tool diameter to prevent ridges between passes. For large face mills (50mm+), use unidirectional climb milling at 70% stepover for better surface finish. Set the facing boundary 5mm beyond the stock edge to ensure full cleanup. Enable 'Extend passes' to prevent scallop marks at the stock boundary edges.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:surfcam-2axis-facing
**Operations:** facing

## Related
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[edgecam-cam-tips-ec-013|Face Milling with Optimized Cutter Overlap]]
- [[gibbscam-cam-tips-gc-057|Face turning with spiral path eliminates the center dwell mark]]
- [[bobcad-cam-tips-bc-013|Facing with Minimize Retracts for Continuous Cutting]]
- [[bobcad-cam-tips-bc-047|Face Turning with CSS and Max RPM Control]]
