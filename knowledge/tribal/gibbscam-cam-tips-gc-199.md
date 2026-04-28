---
id: "gc-199"
title: "GibbsCAM simulation playback speed and step mode isolate problematic G-code blocks"
source: "web:gibbscam-docs"
confidence: 84
category: "cam_strategy"
tags: ["gibbscam", "simulation", "step-mode", "playback", "debugging"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.988Z
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
