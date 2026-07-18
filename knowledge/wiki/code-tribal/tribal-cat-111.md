---
name: tribal-cat-111
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "center-drill", "spot-drill", "selection", "drilling"]
confidence: 87
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-111.md
promoted_at: 2026-06-09T22:31:16.056Z
---

# Center Drilling vs Spot Drilling Selection Criteria

In CATIA, select center drills (combined drill/countersink) for parts that require a 60-degree center for subsequent lathe operations. Use spot drills (single-angle, no pilot tip) for CNC milling hole centering — spot drills are stiffer and produce a more accurate pilot cone. Never use a center drill as a spot drill substitute in CATIA milling programs: the thin pilot tip deflects on inclined surfaces and breaks easily. Define both tool types in the CATIA tool catalog with distinct names and icons to prevent operator confusion.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:catia-docs
**Operations:** drilling

## Related
- [[catia-cam-tips-cat-110|Spot Drilling Depth Controls Subsequent Drill Centering]]
- [[catia-cam-tips-cat-042|Axial Operations Center Drill Before Deep Hole Drilling]]
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
- [[catia-cam-tips-cat-112|Peck Drilling Cycle Configuration for Deep Holes]]
- [[catia-cam-tips-cat-113|Chip-Break Drilling for Medium-Depth Holes]]
