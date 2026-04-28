---
id: "teb-045"
title: "Approach and Retract Moves Control Tool Entry and Exit Quality"
source: "web:tebis-docs"
confidence: 90
category: "finishing"
tags: ["approach", "retract", "entry", "exit", "linking"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.255Z
---

# Approach and Retract Moves Control Tool Entry and Exit Quality

Configure approach and retract moves carefully in Tebis finishing. Use arc approach tangential to the surface (radius 0.5-2x tool diameter). Avoid normal (perpendicular) approach which leaves dig-in marks. For Z-constant finishing, approach along the contour direction. For 3D finishing, approach from outside the machining region. Set retract to mirror the approach. Link between passes with arcs rather than straight rapids to maintain smooth motion and avoid jerk marks.

**Category:** finishing
**Confidence:** 90
**Source:** web:tebis-docs
**Operations:** finishing

## Related
- [[sprutcam-cam-tips-spr-023|Approach/Retract Strategy for Clean Entry/Exit]]
- [[mastercam-cam-tips-mc-206|Feed plane position controls where the tool transitions from rapid to feed rate on approach]]
- [[camworks-cam-tips-cw-092|Linking Strategy — Optimize Retract and Transition Moves]]
- [[edgecam-cam-tips-ec-092|Linking Strategy Reduces Non-Cutting Travel]]
- [[esprit-cam-tips-esp-104|Linking Strategy Optimization Reduces Non-Cutting Time]]
