---
name: tribal-f360-012
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["3+2", "5-axis", "positional", "surface-quality"]
confidence: 88
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-f360-012.md
promoted_at: 2026-06-09T22:31:16.303Z
---

# Prefer 3+2 Over Simultaneous 5-Axis When Possible

Use 3+2 positional machining instead of simultaneous 5-axis whenever the geometry allows. Simultaneous 5-axis movement increases the likelihood of surface imperfections — witness lines, dig-ins, and force variations — because all axes move at once. 3+2 locks the rotary axes and runs a standard 3-axis program at an angle, giving better surface finish and tighter tolerances.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:fusion360-docs
**Operations:** multiaxis_3plus2

## Related
- [[catia-cam-tips-cat-031|3+2 Positional Machining Simplifies Complex Access Angles]]
- [[topsolid-cam-tips-ts-163|5-Axis Positional vs Continuous — When to Use 3+2 vs Full 5-Axis]]
- [[camworks-cam-tips-cw-046|3+2 Indexed Machining — Fixed Orientation for Rigidity and Accuracy]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
- [[controller-knowledge-tips-ctrl-101|Hurco Transform Plane for 3+2 and 5-axis positioning]]
