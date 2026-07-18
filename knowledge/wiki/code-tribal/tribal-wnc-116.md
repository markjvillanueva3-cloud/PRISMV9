---
name: tribal-wnc-116
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["pencil-rest", "intersection", "efficient", "progressive"]
confidence: 90
source: "web:worknc-pencilrest"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-116.md
promoted_at: 2026-05-26T16:07:21.569Z
---

# Pencil Rest Machining for Intersection Line Cleanup

WorkNC's pencil rest machining combines rest material detection with pencil trace logic to clean only the intersection lines between surfaces where the previous tool left material. This produces the most efficient corner cleanup with minimal air cutting. Use sequential passes with decreasing stock allowance (0.05, 0.02, 0.0 mm) for progressive refinement of corner quality.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-pencilrest
**Operations:** rest_machining, finishing

## Related
- [[surfcam-cam-tips-sc2-123|Pencil Rest for Fillet and Groove Cleanup]]
- [[fusion360-cam-tips-ext-f360-154|Cross-Hole Drilling Strategy to Prevent Drill Deflection]]
- [[mastercam-cam-tips-mc-184|Rest pencil toolpath traces fillet intersections left by the larger previous tool]]
- [[powermill-cam-tips-pm-173|Cooling Channel Intersection Cleanup]]
- [[cimatron-cam-tips-cim-136|Latin Hypercube Sampling for Efficient Screening]]
