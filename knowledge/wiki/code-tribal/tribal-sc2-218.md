---
name: tribal-sc2-218
category: code-tribal
subdomain: verification
domain: tribal-knowledge
tags: ["rapid-move", "collision-detection", "retract-height", "g00", "safety"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-218.md
promoted_at: 2026-06-09T22:31:16.707Z
---

# SURFCAM Rapid Move Collision Detection in Simulation

SURFCAM machine simulation checks rapid traverse moves (G00) for collisions with the workpiece, fixture, and machine structure. Rapid moves are the most dangerous because the machine moves at maximum speed without cutting. Verify that retract heights clear all clamps and fixture protrusions. Common collision scenarios: tool retracting into a clamp after machining a pocket, tool traveling between features at insufficient Z-clearance, and rotary axis rapid moves swinging the tool/part into the machine column. Set rapid collision check resolution to 1mm — finer than cutting moves because the consequence of a rapid collision is severe.

**Category:** verification
**Confidence:** 0.89
**Source:** web:surfcam-docs
**Operations:** roughing, finishing, drilling

## Related
- [[edgecam-cam-tips-ec-069|Collision Detection Between All Components]]
- [[fusion360-cam-tips-f360-023|Stop on Collision for Real-Time Simulation Debugging]]
- [[gibbscam-cam-tips-gc-087|Toolpath verification with backplot reveals rapid moves and feed transitions]]
- [[bobcad-cam-tips-bc-082|Collision Detection for Tool Assembly and Fixtures]]
- [[controller-knowledge-tips-ctrl-121|Index/Traub virtual machine for collision-free multi-spindle setup]]
