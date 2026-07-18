---
name: tribal-esp-152
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["mill-turn", "workplane", "b-axis", "tcpm", "coordinate-transformation"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-152.md
promoted_at: 2026-06-09T22:31:16.248Z
---

# Mill-Turn Workplane Management for Complex Angles

ESPRIT's workplane system manages the coordinate transformations required for mill-turn operations at arbitrary angles. Define workplanes for: B-axis tilted operations (angled holes, chamfers), compound-angle features (simultaneous B and C rotation), and wrapped surface operations. Each workplane stores the rotation angles, origin shift, and active axis mapping. The post processor outputs the correct TCPM/RPCP commands (G43.4/G43.5 on Fanuc, TRAORI on Siemens) for each workplane transition. Always verify workplane transitions in simulation — incorrect B-axis angles cause catastrophic collisions.

**Category:** setup
**Confidence:** 0.88
**Source:** web:esprit-docs
**Operations:** 5axis_contouring, drilling, milling

## Related
- [[esprit-cam-tips-esp-166|B-Axis TCPM for Mill-Turn Compound Angles]]
- [[edgecam-cam-tips-ec-047|Live Tooling Strategy for Mill-Turn Machines]]
- [[mastercam-cam-tips-mc-253|Mastercam 2025 B-axis contour turning enables complex profile turning with live tooling on mill-turn]]
- [[sprutcam-cam-tips-spr-043|B-Axis Milling on Mill-Turn Centers]]
- [[bobcad-cam-tips-bc-053|C-Axis Milling on Turning Centers]]
