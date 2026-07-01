---
name: tribal-gc-148
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "swiss", "overlap", "simultaneous", "cycle-time"]
confidence: 85
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-148.md
promoted_at: 2026-06-09T22:31:16.350Z
---

# Swiss-type overlap machining runs main and sub-spindle operations simultaneously

In GibbsCAM Swiss programming, overlap the main-spindle operations of the next part with the sub-spindle backworking of the current part. While the sub-spindle drills and chamfers the back end of part N, the main spindle begins turning the OD of part N+1. GibbsCAM's sync chart shows both channels in parallel. The key constraint is that overlapped operations must use tools on different slides (e.g., main spindle uses gang slide tools, sub-spindle uses back-tool station). Typical overlap savings: 15-40% of total cycle time, depending on the ratio of first-operation to second-operation work content.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:gibbscam-docs

## Related
- [[mastercam-cam-tips-mc-154|Overlapping operations in Swiss Sync Manager maximize spindle utilization]]
- [[esprit-cam-tips-esp-149|Mill-Turn Simultaneous Milling and Turning]]
- [[gibbscam-cam-tips-gc-038|Simultaneous 5-axis tool axis control uses smooth interpolation between orientations]]
- [[gibbscam-cam-tips-gc-052|Gang tooling layout minimizes tool change time on Swiss machines]]
- [[gibbscam-cam-tips-gc-136|VoluMill feed optimization uses machine acceleration limits for realistic cycle times]]
