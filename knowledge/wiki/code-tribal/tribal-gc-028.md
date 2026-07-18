---
name: tribal-gc-028
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "volumill", "rest-roughing", "two-tool", "corner-cleanup"]
confidence: 87
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-028.md
promoted_at: 2026-06-09T22:31:16.319Z
---

# VoluMill rest roughing identifies and cleans residual stock from larger tool

After initial VoluMill roughing with a large tool, use VoluMill rest roughing with a smaller tool to clean corners and narrow features the first tool could not reach. GibbsCAM tracks the in-process workpiece and VoluMill generates paths only where material remains. Set the 'Min Toolpath Radius' bigger on the first rougher to maximize its feed rate, accepting that corners will need cleanup. The two-tool VoluMill strategy (rough + rest) typically achieves 15-25% better total cycle time than a single-tool approach sized for the smallest feature.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-021|VoluMill maintains constant engagement angle for maximum feed rates]]
- [[gibbscam-cam-tips-gc-022|VoluMill minimum toolpath radius controls feed rate potential in corners]]
- [[gibbscam-cam-tips-gc-023|VoluMill feed optimization uses min/max feed limits for stable cutting]]
- [[gibbscam-cam-tips-gc-024|VoluMill trochoidal motion in narrow channels prevents tool overload]]
- [[gibbscam-cam-tips-gc-025|Chip thinning compensation is built into VoluMill's feed calculation]]
