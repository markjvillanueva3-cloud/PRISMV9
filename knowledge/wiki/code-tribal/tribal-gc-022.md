---
name: tribal-gc-022
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "volumill", "minimum-radius", "corner", "feed-optimization"]
confidence: 88
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-022.md
promoted_at: 2026-06-09T22:31:16.317Z
---

# VoluMill minimum toolpath radius controls feed rate potential in corners

The 'Minimum Toolpath Radius' parameter in VoluMill determines the tightest arc the tool will follow. Setting it larger (e.g., 50-80% of tool diameter) produces wider arcs in corners, allowing higher feed rates but leaving more material for a finish pass. Setting it smaller (minimum 5% of tool diameter) follows tighter corners but forces feed reduction. For initial roughing, use a larger minimum radius with a bigger tool, then follow with a smaller tool at tighter radius to clean corners. This two-pass approach often beats a single-tool strategy by 20-30% on cycle time.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-023|VoluMill feed optimization uses min/max feed limits for stable cutting]]
- [[gibbscam-cam-tips-gc-026|VoluMill corner approach uses smooth arc transitions instead of sharp turns]]
- [[gibbscam-cam-tips-gc-136|VoluMill feed optimization uses machine acceleration limits for realistic cycle times]]
- [[gibbscam-cam-tips-gc-021|VoluMill maintains constant engagement angle for maximum feed rates]]
- [[gibbscam-cam-tips-gc-024|VoluMill trochoidal motion in narrow channels prevents tool overload]]
