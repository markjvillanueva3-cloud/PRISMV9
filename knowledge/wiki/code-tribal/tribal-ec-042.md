---
name: tribal-ec-042
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["drilling", "lathe", "center-drill", "peck"]
confidence: 87
source: "web:edgecam-turning"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-042.md
promoted_at: 2026-06-09T22:31:16.169Z
---

# Drilling on Lathe with Center Support

For lathe drilling in Edgecam, always program a center drill first to create a pilot cone that prevents drill wander. Use G83 (peck drilling) for depths beyond 3x diameter. For through-holes, program the drill depth to break through by the drill point length plus 2mm. Enable CSS mode for drilling (unlike milling where RPM is fixed) to maintain optimal surface speed as the drill engages at the center of the rotating workpiece.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:edgecam-turning
**Operations:** drilling

## Related
- [[surfcam-cam-tips-sc2-051|Turning Center Drilling with Configurable Canned Cycles]]
- [[bobcad-cam-tips-bc-049|Center Drilling and Canned Cycle Mapping]]
- [[camworks-cam-tips-cw-069|Turning Drill Operations — Center, Peck, and Deep Hole on Lathe]]
- [[camworks-cam-tips-cw-098|Center Drilling — Short Rigid Pilot for Deep Holes]]
- [[camworks-cam-tips-cw-099|Peck Drilling — Deep Hole Chip Evacuation with Full Retract]]
