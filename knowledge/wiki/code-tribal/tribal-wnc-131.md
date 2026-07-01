---
name: tribal-wnc-131
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["auto-5", "cusp-height", "quality", "verification", "analysis"]
confidence: 89
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-131.md
promoted_at: 2026-06-09T22:31:16.818Z
---

# Auto5 Toolpath Quality Assessment — Cusp Height Verification

After Auto5 conversion, verify that the cusp height remains within specification across the entire part surface. Auto5 may increase cusp height in regions where the tool tilt changes the effective cutting radius (especially with ball-nose tools). WorkNC's analysis tools show cusp height as a color map on the part surface. If cusp height exceeds the target in Auto5 transition zones, reduce the stepover in those regions or add a separate finishing pass with tighter parameters. The cusp height map is essential for quality-critical surfaces.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:worknc-docs
**Operations:** 5_axis, finishing

## Related
- [[worknc-cam-tips-wnc-005|3-to-5 Axis Conversion Preserves Original Toolpath Quality]]
- [[worknc-cam-tips-wnc-133|Auto5 Machine Compatibility Check — Verify Before Programming]]
- [[cimatron-cam-tips-cim-026|Surface Quality Optimization via Scallop Control]]
- [[gibbscam-cam-tips-gc-107|Cusp height analysis identifies regions needing additional finishing passes]]
- [[topsolid-cam-tips-ts-091|Scallop Control Sets Maximum Cusp Height]]
