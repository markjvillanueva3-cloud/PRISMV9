---
name: tribal-ts-163
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "5-axis", "positional", "continuous", "3+2"]
confidence: 91
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-163.md
promoted_at: 2026-05-26T16:07:21.184Z
---

# 5-Axis Positional vs Continuous — When to Use 3+2 vs Full 5-Axis

TopSolid supports both positional (3+2) and continuous 5-axis machining. Use 3+2 when: the surfaces can be reached from a fixed orientation, the machine has limited rotary axis speed, or the controller doesn't support RTCP/TCPM. Use continuous 5-axis when: surfaces are doubly curved and require smooth tool axis variation, or when tool access requires continuous adjustment. 3+2 is more rigid (shorter effective tool overhang), easier to verify, and compatible with 3-axis post processors. TopSolid's automatic setup finder identifies the minimum number of 3+2 orientations needed to reach all surfaces.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-docs
**Operations:** 5_axis, milling

## Related
- [[catia-cam-tips-cat-031|3+2 Positional Machining Simplifies Complex Access Angles]]
- [[fusion360-cam-tips-f360-012|Prefer 3+2 Over Simultaneous 5-Axis When Possible]]
- [[topsolid-cam-tips-ts-156|Barrel Cutter Toolpaths — 10x Larger Effective Radius for Surface Finish]]
- [[topsolid-cam-tips-ts-158|5-Axis Swarf Cutting — Wall Finishing with the Tool Flank]]
- [[topsolid-cam-tips-ts-159|5-Axis Collision Avoidance — Automatic Tool Axis Adjustment]]
