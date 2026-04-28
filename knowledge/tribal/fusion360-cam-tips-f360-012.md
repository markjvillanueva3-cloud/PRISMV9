---
id: "f360-012"
title: "Prefer 3+2 Over Simultaneous 5-Axis When Possible"
source: "web:fusion360-docs"
confidence: 88
category: "cam_strategy"
tags: ["3+2", "5-axis", "positional", "surface-quality"]
_source: "fusion360-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.796Z
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
