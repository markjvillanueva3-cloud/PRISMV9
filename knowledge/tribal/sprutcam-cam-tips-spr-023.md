---
id: "spr-023"
title: "Approach/Retract Strategy for Clean Entry/Exit"
source: "web:sprutcam-tutorials"
confidence: 0.87
category: "cam_strategy"
tags: ["approach", "retract", "linking", "tangential"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.864Z
---

# Approach/Retract Strategy for Clean Entry/Exit

Configure approach and retract moves to prevent tool marks: use tangential arc approach (radius = tool radius) for finishing, helical/ramp entry for roughing (max 3° ramp angle in steel). Set 'Retract' to normal direction with 0.5mm lift before rapid. Enable 'Smooth Linking' between passes — this connects adjacent passes with arcs instead of rapid-retract-rapid sequences, saving 10-15% cycle time.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:sprutcam-tutorials
**Operations:** roughing, finishing

## Related
- [[tebis-cam-tips-teb-045|Approach and Retract Moves Control Tool Entry and Exit Quality]]
- [[mastercam-cam-tips-mc-206|Feed plane position controls where the tool transitions from rapid to feed rate on approach]]
- [[camworks-cam-tips-cw-092|Linking Strategy — Optimize Retract and Transition Moves]]
- [[edgecam-cam-tips-ec-092|Linking Strategy Reduces Non-Cutting Travel]]
- [[esprit-cam-tips-esp-104|Linking Strategy Optimization Reduces Non-Cutting Time]]
