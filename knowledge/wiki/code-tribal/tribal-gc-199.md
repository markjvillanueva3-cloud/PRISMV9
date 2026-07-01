---
name: tribal-gc-199
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "simulation", "step-mode", "playback", "debugging"]
confidence: 84
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-199.md
promoted_at: 2026-06-09T22:31:16.364Z
---

# GibbsCAM simulation playback speed and step mode isolate problematic G-code blocks

When GibbsCAM simulation flags a collision or gouge, use step mode to advance one G-code block at a time through the problem area. The simulation highlights the active block in the G-code listing and the corresponding toolpath segment in the 3D view. Use slow playback (10-25% speed) for approach and retract moves where collisions most commonly occur. For rapid traverse moves (G00), the simulation shows the actual path — if the machine rapids through the part between operations, you will see the collision. Fix by adding intermediate safe positions or changing the retract strategy from 'Direct' to 'Via Safe Z'. Record the block number and operation for targeted editing.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-082|Cut Part rendering reveals gouges and remaining stock with color coding]]
- [[gibbscam-cam-tips-gc-083|Machine simulation verifies clearances between all moving components]]
- [[gibbscam-cam-tips-gc-084|Collision detection settings must include tool holder and spindle nose geometry]]
- [[gibbscam-cam-tips-gc-085|Stock comparison overlay quantifies material deviation from design intent]]
- [[gibbscam-cam-tips-gc-086|Gouge detection sensitivity should match surface tolerance requirements]]
